import { Vector3 } from 'three'
import type { Object3D } from 'three'
import { isRenderedLine, readLinePoints } from './linePoints'
import type { SceneTestHandle } from './renderCircuitScene'
import { segmentsOverlap } from '@/utils/wiringScheme/overlap'
import type { WireSegment } from '@/utils/wiringScheme/types'
import { useCircuitStore } from '@/store/circuitStore'

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
  tol: number,
): WireSegment | undefined {
  const storeWire = useCircuitStore.getState().wires.find((w) => w.id === wireId)
  if (!storeWire) return undefined
  const { start: rs, end: re } = renderedSeg
  return storeWire.segments.find((s) => {
    const fwdMatch =
      Math.hypot(s.start.x - rs.x, s.start.z - rs.z) < tol &&
      Math.hypot(s.end.x - re.x, s.end.z - re.z) < tol
    const revMatch =
      Math.hypot(s.start.x - re.x, s.start.z - re.z) < tol &&
      Math.hypot(s.end.x - rs.x, s.end.z - rs.z) < tol
    return fwdMatch || revMatch
  })
}

/**
 * Mirror of the production `isShareableConfluence` in overlap.ts. Returns true
 * when an overlap between two enriched segments is NOT a routing bug:
 *   - Non-approach vs approach: the non-approach wire may transit the backbone.
 *   - Both approach with the SAME confluenceCoord: intentional shared backbone
 *     (multi-pin fan-in for the same chip side, Finding 2 / ADR-0007).
 * Any other case (two approach wires on different backbones, or two transit wires
 * on the same track) is a real bug and must NOT be suppressed.
 */
function isLegitimateApproachOverlap(a: EnrichedSegment, b: EnrichedSegment): boolean {
  // If neither is an approach segment, this is a transit-vs-transit overlap — a real bug.
  if (!a.approach && !b.approach) return false
  // Non-approach vs approach: the non-approach wire is allowed to traverse the backbone.
  if (!a.approach || !b.approach) return true
  // Both approach: only the same confluence backbone may share track.
  return (
    a.confluenceCoord !== undefined &&
    b.confluenceCoord !== undefined &&
    Math.abs(a.confluenceCoord - b.confluenceCoord) < 0.001
  )
}

/**
 * Assert no two DISTINCT rendered wires share a collinear straight track over an
 * overlapping range. Only straight rendered segments (exactly 2 points) are
 * considered — arc/hop lines (>2 points) intentionally cross over other wires in
 * Y and must be skipped. Reuses the production `segmentsOverlap` range math, which
 * infers horizontal/vertical from coordinates (not the `type` field). Perpendicular
 * crossings are not collinear, so they are correctly NOT flagged.
 *
 * Approach-confluence overlaps (multi-pin fan-in sharing a backbone) are
 * intentional by design and are skipped using the same exception logic as the
 * production `isShareableConfluence` / `wouldOverlapWithExisting` in overlap.ts.
 * This keeps the oracle correct for junction-free circuits without false-positives
 * on legitimate approach-backbone sharing.
 */
export function expectNoWireOverlaps(
  handle: SceneTestHandle,
  opts: { tolerance?: number } = {},
): void {
  const tol = opts.tolerance ?? 0.001
  const wires = getRenderedWirePolylines(handle)

  const straight: EnrichedSegment[] = []
  for (const w of wires) {
    for (const s of w.segments) {
      if (s.points.length !== 2) continue // skip arcs/hops
      const [a, b] = s.points
      const horizontal = Math.abs(a.z - b.z) < tol
      const seg: WireSegment = {
        start: { x: a.x, y: a.y, z: a.z },
        end: { x: b.x, y: b.y, z: b.z },
        type: horizontal ? 'horizontal' : 'vertical',
      }
      const stored = findStoredSegment(w.wireId, seg, tol)
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
