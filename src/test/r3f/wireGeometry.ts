import { Vector3 } from 'three'
import type { Object3D } from 'three'
import { isRenderedLine, readLinePoints } from './linePoints'
import type { SceneTestHandle } from './renderCircuitScene'
import { segmentsOverlap } from '@/utils/wiringScheme/overlap'
import type { WireSegment } from '@/utils/wiringScheme/types'
import { useCircuitStore } from '@/store/circuitStore'

/** Matches the router's TOLERANCE; segmentsOverlap is locked to this, so the oracle is too. */
const OVERLAP_TOLERANCE = 0.001

export interface RenderedWire {
  wireId: string
  /** One entry per rendered drei <Line> (i.e. per stored wire segment). */
  segments: { points: Vector3[] }[]
  /** Concatenated polyline across all segments, deduplicating shared corners. */
  polyline: Vector3[]
}

/** Walk the scene, grouping rendered line segments back to their wire by the
 *  wireId tag on each wire's wrapping <group>. */
export function getRenderedWirePolylines(handle: SceneTestHandle): RenderedWire[] {
  const wires: RenderedWire[] = []
  handle.scene.traverse((obj: Object3D) => {
    if (!obj.userData?.hacerWire) return
    const segments: { points: Vector3[] }[] = []
    obj.traverse((child: Object3D) => {
      if (isRenderedLine(child)) segments.push({ points: readLinePoints(child) })
    })
    const polyline = segments.flatMap((s, i) => (i === 0 ? s.points : s.points.slice(1)))
    wires.push({ wireId: obj.userData.wireId as string, segments, polyline })
  })
  return wires
}

export function getWireEndpoints(w: RenderedWire): { start: Vector3; end: Vector3 } {
  return { start: w.polyline[0], end: w.polyline[w.polyline.length - 1] }
}

/** Assert a rendered wire's endpoints reach `start` and `end` within tolerance. */
export function expectWireConnects(
  w: RenderedWire,
  start: { x: number; y: number; z: number },
  end: { x: number; y: number; z: number },
  tol = 0.001,
): void {
  const ends = getWireEndpoints(w)
  const startD = ends.start.distanceTo(new Vector3(start.x, start.y, start.z))
  const endD = ends.end.distanceTo(new Vector3(end.x, end.y, end.z))
  if (startD > tol || endD > tol) {
    throw new Error(
      `wire ${w.wireId} does not connect: ` +
        `start rendered (${fmt(ends.start)}) vs expected (${fmt(start)}) Δ=${startD.toFixed(4)}; ` +
        `end rendered (${fmt(ends.end)}) vs expected (${fmt(end)}) Δ=${endD.toFixed(4)} (tol=${tol})`,
    )
  }
}

function fmt(p: { x: number; y: number; z: number }): string {
  return `${p.x.toFixed(3)},${p.y.toFixed(3)},${p.z.toFixed(3)}`
}

interface EnrichedSegment {
  wireId: string
  seg: WireSegment
  /** Mirrors WireSegment.approach: true if this is a per-pin approach/confluence segment. */
  approach: boolean
  /** Mirrors WireSegment.confluenceCoord: the backbone coordinate if this is an approach segment. */
  confluenceCoord: number | undefined
}

/**
 * Find the stored WireSegment (from the Zustand store) that best matches a
 * rendered segment by its x,z endpoints. Only x and z are compared because the
 * router forces all segments to y = WIRE_HEIGHT (0.2), so the stored and rendered
 * y always agree — but using only x,z avoids any floating-point drift.
 */
function findStoredSegment(
  wireId: string,
  renderedSeg: WireSegment,
): WireSegment | undefined {
  const storeWire = useCircuitStore.getState().wires.find((w) => w.id === wireId)
  if (!storeWire) return undefined
  const { start: rs, end: re } = renderedSeg
  return storeWire.segments.find((s) => {
    const fwdMatch =
      Math.hypot(s.start.x - rs.x, s.start.z - rs.z) < OVERLAP_TOLERANCE &&
      Math.hypot(s.end.x - re.x, s.end.z - re.z) < OVERLAP_TOLERANCE
    const revMatch =
      Math.hypot(s.start.x - re.x, s.start.z - re.z) < OVERLAP_TOLERANCE &&
      Math.hypot(s.end.x - rs.x, s.end.z - rs.z) < OVERLAP_TOLERANCE
    return fwdMatch || revMatch
  })
}

/**
 * Classify whether an overlap between two enriched rendered segments is an
 * INTENTIONAL shared track (return true) or a real routing defect (return false).
 *
 * A "backbone" segment is an approach segment that OWNS a confluence column
 * (`approach === true` AND `confluenceCoord !== undefined`). The router lets many
 * pins of one chip side fan in along a single backbone; everything else should
 * route on its own track or be nudged onto a free parallel lane.
 *
 * Legitimate (exempt):
 *   - Two backbone segments on the SAME confluence (multi-pin fan-in, B-003/B-004).
 *   - An overlap involving a NON-backbone approach segment (a per-pin lane
 *     connector / entry, confluenceCoord undefined) that is not two transits —
 *     these short shared connectors are an accepted artifact of dense fan-in
 *     (empirically present in the Mux4Way16/Mux8Way16 scenes).
 *
 * Real defect (flag):
 *   - Transit vs transit: two unrelated trunks merged onto one track.
 *   - Anything (a transit trunk OR a different net's approach) running ALONG a
 *     BACKBONE column — i.e. CASE1 (a foreign trunk merged onto a chip's approach
 *     backbone) and CASE2 (two different confluences sharing a backbone track).
 *
 * This is intentionally STRONGER than the production `isShareableConfluence`,
 * which is a routing-time *permissibility* check (it lets a transit traverse a
 * backbone so routing need not fail, expecting the later lane-nudging pass to move
 * it off). The oracle judges the FINAL geometry: in a nudged layout a transit must
 * not remain collinear with a backbone. Assumption: test circuits provide free
 * lanes so transits are nudged off; on a saturated single-column circuit a *forced*
 * transit-on-backbone would be flagged here — itself worth examining (the layer's
 * discovery role).
 */
function isLegitimateApproachOverlap(a: EnrichedSegment, b: EnrichedSegment): boolean {
  const aBackbone = a.approach && a.confluenceCoord !== undefined
  const bBackbone = b.approach && b.confluenceCoord !== undefined

  // Two backbones: legitimate only when they are the SAME confluence (fan-in);
  // two different confluences sharing a track is CASE2.
  if (aBackbone && bBackbone) {
    // Both confluenceCoord are defined (the backbone flags guarantee it); narrow
    // explicitly for the type checker without a non-null assertion.
    if (a.confluenceCoord === undefined || b.confluenceCoord === undefined) return false
    return Math.abs(a.confluenceCoord - b.confluenceCoord) < 0.001
  }
  // Exactly one backbone: nothing else may run ALONG a backbone column — this is
  // CASE1 (a foreign trunk merged onto the backbone). Flag it.
  if (aBackbone || bBackbone) return false
  // Neither is a backbone:
  //   - two transits sharing a track is a real merge -> flag
  //   - otherwise an overlap involving a non-backbone approach lane/entry -> accepted
  //     (relies on approach connectors being short by construction: LANE_BASE/LANE_PITCH,
  //     so a non-backbone approach can't span a long foreign-trunk merge)
  if (!a.approach && !b.approach) return false
  return true
}

/**
 * Assert no two DISTINCT rendered wires share a collinear straight track over an
 * overlapping range. Only straight rendered segments (exactly 2 points) are
 * considered — arc/hop lines (>2 points) intentionally cross over other wires in
 * Y and must be skipped. Reuses the production `segmentsOverlap` range math, which
 * infers horizontal/vertical from coordinates (not the `type` field). Perpendicular
 * crossings are not collinear, so they are correctly NOT flagged.
 *
 * Intentional shared tracks (multi-pin fan-in along one confluence backbone, plus
 * the short non-backbone approach lane/entry connectors of dense fan-in) are
 * exempted by {@link isLegitimateApproachOverlap}; a foreign trunk merged onto a
 * backbone (CASE1), two different confluences sharing a track (CASE2), and
 * transit-vs-transit merges are flagged. This keeps the oracle correct for
 * junction-free circuits without false-positives on legitimate fan-in.
 *
 * The oracle is locked to the router's 0.001 tolerance (OVERLAP_TOLERANCE); passing
 * a separate tolerance is not supported because `segmentsOverlap` hard-codes its own
 * TOLERANCE=0.001 and `findStoredSegment` must match it exactly.
 */
export function expectNoWireOverlaps(handle: SceneTestHandle): void {
  const wires = getRenderedWirePolylines(handle)

  const straight: EnrichedSegment[] = []
  for (const w of wires) {
    for (const s of w.segments) {
      if (s.points.length !== 2) continue // skip arcs/hops
      const [a, b] = s.points
      const horizontal = Math.abs(a.z - b.z) < OVERLAP_TOLERANCE
      const seg: WireSegment = {
        start: { x: a.x, y: a.y, z: a.z },
        end: { x: b.x, y: b.y, z: b.z },
        type: horizontal ? 'horizontal' : 'vertical',
      }
      const stored = findStoredSegment(w.wireId, seg)
      straight.push({
        wireId: w.wireId,
        seg,
        approach: stored?.approach ?? false,
        confluenceCoord: stored?.confluenceCoord,
      })
    }
  }

  const violations: string[] = []
  for (let i = 0; i < straight.length; i++) {
    for (let j = i + 1; j < straight.length; j++) {
      if (straight[i].wireId === straight[j].wireId) continue
      if (!segmentsOverlap(straight[i].seg, straight[j].seg)) continue
      if (isLegitimateApproachOverlap(straight[i], straight[j])) continue
      const a = straight[i]
      const b = straight[j]
      violations.push(
        `wires ${a.wireId} & ${b.wireId} overlap on a ${a.seg.type} track: ` +
          `${a.wireId}=[${fmt(a.seg.start)}→${fmt(a.seg.end)}] vs ` +
          `${b.wireId}=[${fmt(b.seg.start)}→${fmt(b.seg.end)}]`,
      )
    }
  }
  if (violations.length > 0) {
    throw new Error(`expectNoWireOverlaps: ${violations.length} overlap(s) found:\n${violations.join('\n')}`)
  }
}
