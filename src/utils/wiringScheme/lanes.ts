/**
 * Lane-level exclusivity / nudging (closes CASE1 and transit-vs-transit merges).
 *
 * No two distinct wires may share the same physical orthogonal track over an
 * overlapping range. The coarse grid forces an unrelated net's trunk to *transit*
 * a chip's approach backbone column when no alternative corner exists (the
 * `gateActions › arc segments lost after moving gate` transit test relies on
 * this). Previously such a transit rode the backbone's EXACT track and merged
 * with it visually (CASE1). This module **nudges** the transiting run onto its
 * own parallel lane — a small deterministic offset from the section line — so the
 * trunk physically coexists with the backbone instead of merging, while still
 * transiting (it is never blocked for lack of a corner; it gets a lane instead).
 *
 * A per-net hash gives each transit a well-spread *starting* lane index, but two
 * distinct nets can hash to the same index. To avoid re-introducing the silent
 * merge one lane over, the nudge **probes** outward from the starting index to
 * the first lane that is free of every other wire already on that track — both
 * foreign approach backbones AND already-placed transit runs (`existingSegments`
 * carries the prior wires at routing time). This is deterministic for a given
 * circuit state and order-dependent across the initial build order, which is the
 * accepted libavoid "ordering + nudging" trade-off (order-dependent separation
 * beats a silent merge).
 *
 * This is the libavoid *nudging* concept (research Finding 2) applied on top of
 * the existing coarse-grid + approach router — NOT the Stage-3 visibility-graph
 * rewrite. See docs/superpowers/specs/2026-06-21-wire-routing-lane-exclusivity-design.md
 * and docs/decisions/0007-wire-routing-engine-direction.md.
 */

import type { Position, WireSegment } from './types'
import {
  SECTION_SIZE,
  TRANSIT_LANE_PITCH,
  TRANSIT_LANE_SLOTS,
  MAX_TRANSIT_LANE_OFFSET,
} from './types'
import { coordinateRangesOverlap } from './overlap'

const TOLERANCE = 0.001

/** A segment that forms part of a confluence fan-in bus (an owned backbone). */
export function isApproachBackbone(seg: WireSegment): boolean {
  return seg.approach === true && seg.confluenceCoord !== undefined
}

/** True when `coord` lies on a coarse section line. */
function onSectionLine(coord: number): boolean {
  return Math.abs(coord - Math.round(coord / SECTION_SIZE) * SECTION_SIZE) < TOLERANCE
}

/**
 * Deterministic lane index for a net, derived purely from its intrinsic, stable
 * identity (source exit point + destination). Independent of routing order, so
 * the same circuit always yields the same lanes and re-routes are stable. Lane 0
 * is reserved for the backbone owner, so transit nets map into `1..SLOTS`.
 */
export function laneIndexForNet(start: Position, end: Position): number {
  // Quantize to 0.001u so floating noise can't flip the lane between re-routes.
  const q = (n: number) => Math.round(n * 1000)
  const parts = [q(start.x), q(start.z), q(end.x), q(end.z)]
  // FNV-1a style mix over the quantized coordinates (deterministic, well-spread).
  let h = 0x811c9dc5
  for (const p of parts) {
    // Fold both halves of the (possibly negative) integer in.
    h ^= p & 0xffff
    h = Math.imul(h, 0x01000193)
    h ^= (p >>> 16) & 0xffff
    h = Math.imul(h, 0x01000193)
  }
  // Final avalanche (Murmur3 fmix32) so structured, near-identical inputs (e.g.
  // pins one section apart) spread across lanes instead of collapsing — `% SLOTS`
  // otherwise samples only the poorly-mixed low bits and systematically collides.
  h ^= h >>> 16
  h = Math.imul(h, 0x85ebca6b)
  h ^= h >>> 13
  h = Math.imul(h, 0xc2b2ae35)
  h ^= h >>> 16
  h >>>= 0
  return 1 + (h % TRANSIT_LANE_SLOTS)
}

/**
 * Probe for a FREE lane coordinate for a transit run on a given track.
 *
 * The per-net hash gives a well-spread *starting* lane index (good spread,
 * minimal probing). From there we walk indices outward — index, index+1,
 * index+2, … wrapping within the slot count — converting each to the candidate
 * coordinate `sectionCoord + sign·idx·PITCH` on the source-biased side, and
 * return the first candidate that is not already occupied (within TOLERANCE) by
 * another wire on this track over the overlapping range. Lane 0 (`sectionCoord`
 * exactly) is the backbone owner's and is never a probe target.
 *
 * If no candidate within {@link MAX_TRANSIT_LANE_OFFSET} is free (extreme
 * single-column transit density — a Stage-3 visibility-graph concern), we return
 * the last safe candidate rather than push the run far enough to reshape the
 * path. Keeping the offset tiny preserves perpendicular hops.
 *
 * @param occupied - coordinates already taken on this exact track over the run's
 *   overlapping range (foreign backbones + already-placed transit runs).
 */
function probeLaneCoord(
  start: Position,
  end: Position,
  sectionCoord: number,
  awayFromCoord: number,
  occupied: number[],
): number {
  const startIndex = laneIndexForNet(start, end)
  const sign = awayFromCoord >= sectionCoord ? 1 : -1
  const isFree = (coord: number) => !occupied.some((o) => Math.abs(o - coord) < TOLERANCE)

  let lastSafe = sectionCoord + sign * startIndex * TRANSIT_LANE_PITCH
  // Probe a bounded budget of indices starting at the hash index, walking up and
  // wrapping within the slot range, capped by the safe offset so hops survive.
  for (let step = 0; step < TRANSIT_LANE_SLOTS; step++) {
    const index = 1 + ((startIndex - 1 + step) % TRANSIT_LANE_SLOTS)
    const offset = index * TRANSIT_LANE_PITCH
    if (offset > MAX_TRANSIT_LANE_OFFSET + TOLERANCE) continue
    const candidate = sectionCoord + sign * offset
    lastSafe = candidate
    if (isFree(candidate)) return candidate
  }
  // No free lane within the cap: keep the last safe lane (documented residual).
  return lastSafe
}

/** A maximal run of consecutive routing segments on a single track. */
interface TrackRun {
  axis: 'x' | 'z'
  sectionCoord: number // the constant coordinate of the run (a section line)
  startIndex: number // index into routing segments
  endIndex: number // inclusive
  rangeMin: number // min along the varying axis
  rangeMax: number
}

/** Whether a routing segment is axis-aligned and non-degenerate. */
function segAxis(seg: WireSegment): 'x' | 'z' | null {
  const dx = Math.abs(seg.start.x - seg.end.x)
  const dz = Math.abs(seg.start.z - seg.end.z)
  if (dx < TOLERANCE && dz > TOLERANCE) return 'x' // vertical run, constant x
  if (dz < TOLERANCE && dx > TOLERANCE) return 'z' // horizontal run, constant z
  return null
}

/**
 * Coordinates already OCCUPIED on a run's exact track over its overlapping range,
 * gathered from ALL collinear existing segments — not just approach backbones.
 * A coordinate is occupied if some existing segment of the same axis lies within
 * the probe window (`±MAX_TRANSIT_LANE_OFFSET` of `sectionCoord`, so it can only
 * be a lane on this very track) and its range overlaps the run's range. This is
 * what lets the probe avoid both foreign backbones (lane 0) and already-placed
 * transit runs (off-grid lanes), preventing transit-vs-transit merges.
 */
function occupiedLaneCoords(run: TrackRun, existingSegments: WireSegment[]): number[] {
  const coords: number[] = []
  for (const seg of existingSegments) {
    const axis = segAxis(seg)
    if (axis !== run.axis) continue
    const segCoord = axis === 'x' ? seg.start.x : seg.start.z
    // Only segments on (or within nudging distance of) this track can collide.
    if (Math.abs(segCoord - run.sectionCoord) > MAX_TRANSIT_LANE_OFFSET + TOLERANCE) continue
    const segMin = axis === 'x' ? Math.min(seg.start.z, seg.end.z) : Math.min(seg.start.x, seg.end.x)
    const segMax = axis === 'x' ? Math.max(seg.start.z, seg.end.z) : Math.max(seg.start.x, seg.end.x)
    if (!coordinateRangesOverlap(run.rangeMin, run.rangeMax, segMin, segMax)) continue
    coords.push(segCoord)
  }
  return coords
}

/**
 * Nudge any maximal run of the new path's routing segments that *transits* a
 * DIFFERENT confluence's approach backbone onto the net's own parallel lane.
 *
 * A run is nudged when, on its exact section track, it overlaps an existing
 * approach-backbone segment whose `confluenceCoord` differs from this run's own
 * (`ownConfluenceCoord`). The owner of a track (this net's own backbone, or a
 * run already off-grid) is never nudged, so confluence fan-in buses (B-003/B-004)
 * and same-confluence sharing (CASE2) are untouched.
 *
 * When a run IS nudged, the destination lane is chosen by {@link probeLaneCoord},
 * which starts at the per-net hash index and probes outward to the first lane
 * free of every other wire on that track over the overlapping range — both
 * foreign backbones (lane 0) and already-placed transit runs (off-grid lanes).
 * This prevents two distinct transit nets that hash to the same index from
 * silently merging onto the same offset lane.
 *
 * @param segments - the new wire's full segment list (exit + routing + approach)
 * @param existingSegments - segments of all other wires (backbones + prior transits)
 * @param netStart - this net's exit point (intrinsic identity, for the lane hash)
 * @param netEnd - this net's destination (intrinsic identity)
 * @param ownConfluenceCoord - this net's own confluence coord, if any (its owned track)
 */
export function nudgeTransitRun(
  segments: WireSegment[],
  existingSegments: WireSegment[],
  netStart: Position,
  netEnd: Position,
  ownConfluenceCoord: number | undefined,
): WireSegment[] {
  const backbones = existingSegments.filter(isApproachBackbone)
  if (backbones.length === 0) return segments

  // Routing segments are everything except entry/exit/arc/approach; only those
  // ride section-line tracks where transit collisions happen. Approach segments
  // are this net's own fan-out and stay put.
  const isRouting = (s: WireSegment) =>
    (s.type === 'horizontal' || s.type === 'vertical') && s.approach !== true

  // Build maximal runs over the routing slice (runs of same axis + same coord).
  const runs: TrackRun[] = []
  let i = 0
  while (i < segments.length) {
    if (!isRouting(segments[i])) {
      i++
      continue
    }
    const axis = segAxis(segments[i])
    if (axis === null) {
      i++
      continue
    }
    const coord = axis === 'x' ? segments[i].start.x : segments[i].start.z
    let j = i
    let rangeMin = Infinity
    let rangeMax = -Infinity
    while (
      j < segments.length &&
      isRouting(segments[j]) &&
      segAxis(segments[j]) === axis &&
      Math.abs((axis === 'x' ? segments[j].start.x : segments[j].start.z) - coord) < TOLERANCE
    ) {
      const a = axis === 'x' ? segments[j].start.z : segments[j].start.x
      const b = axis === 'x' ? segments[j].end.z : segments[j].end.x
      rangeMin = Math.min(rangeMin, a, b)
      rangeMax = Math.max(rangeMax, a, b)
      j++
    }
    runs.push({ axis, sectionCoord: coord, startIndex: i, endIndex: j - 1, rangeMin, rangeMax })
    i = j
  }

  // Decide a per-vertex coordinate shift. Routing segments form a polyline; a
  // nudged run shifts its constant coordinate, which also moves the corners it
  // shares with the adjoining perpendicular segments (keeping the path
  // orthogonal and connected).
  const result = segments.map((s) => ({
    ...s,
    start: { ...s.start },
    end: { ...s.end },
  }))

  for (const run of runs) {
    // Only nudge runs that sit on an actual section line (a backbone candidate).
    if (!onSectionLine(run.sectionCoord)) continue
    // Never nudge this net's OWN backbone track.
    if (ownConfluenceCoord !== undefined && Math.abs(run.sectionCoord - ownConfluenceCoord) < TOLERANCE) {
      continue
    }
    // Does this run transit a DIFFERENT confluence's backbone on this track?
    const collides = backbones.some((b) => {
      const bAxis = Math.abs(b.start.x - b.end.x) < TOLERANCE ? 'x' : 'z'
      if (bAxis !== run.axis) return false
      const bCoord = bAxis === 'x' ? b.start.x : b.start.z
      if (Math.abs(bCoord - run.sectionCoord) > TOLERANCE) return false
      if (b.confluenceCoord !== undefined && ownConfluenceCoord !== undefined &&
        Math.abs(b.confluenceCoord - ownConfluenceCoord) < TOLERANCE) {
        return false // same confluence — legitimate shared bus, not a transit
      }
      const bMin = bAxis === 'x' ? Math.min(b.start.z, b.end.z) : Math.min(b.start.x, b.end.x)
      const bMax = bAxis === 'x' ? Math.max(b.start.z, b.end.z) : Math.max(b.start.x, b.end.x)
      return coordinateRangesOverlap(run.rangeMin, run.rangeMax, bMin, bMax)
    })
    if (!collides) continue

    // Nudge: shift the run's constant coordinate to a FREE lane. Bias the side
    // toward the net's SOURCE so the adjoining perpendicular segment (which
    // continues toward the destination) still spans ACROSS the original section
    // line — preserving any perpendicular crossing/hop with the backbone rather
    // than degrading it to a no-touch. The probe starts at the per-net hash index
    // and walks outward to the first lane free of every other wire on this track
    // (foreign backbones AND already-placed transit runs) so two distinct transit
    // nets that hash to the same index never merge.
    const towardSource = run.axis === 'x' ? netStart.x : netStart.z
    const occupied = occupiedLaneCoords(run, existingSegments)
    const laneCoord = probeLaneCoord(netStart, netEnd, run.sectionCoord, towardSource, occupied)

    // Apply to every segment endpoint that currently sits on the run's track:
    // the run segments themselves AND the corner endpoints of the adjoining
    // perpendicular segments (which share those exact coordinates).
    for (let k = 0; k < result.length; k++) {
      const seg = result[k]
      if (run.axis === 'x') {
        if (Math.abs(seg.start.x - run.sectionCoord) < TOLERANCE && segmentTouchesRunRange(seg, run, 'z')) {
          seg.start.x = laneCoord
        }
        if (Math.abs(seg.end.x - run.sectionCoord) < TOLERANCE && segmentTouchesRunRange(seg, run, 'z')) {
          seg.end.x = laneCoord
        }
      } else {
        if (Math.abs(seg.start.z - run.sectionCoord) < TOLERANCE && segmentTouchesRunRange(seg, run, 'x')) {
          seg.start.z = laneCoord
        }
        if (Math.abs(seg.end.z - run.sectionCoord) < TOLERANCE && segmentTouchesRunRange(seg, run, 'x')) {
          seg.end.z = laneCoord
        }
      }
    }
  }

  return result
}

/**
 * Whether a segment endpoint participating in a nudged run is within (or at the
 * ends of) the run's varying-axis range — so we only move corners that belong to
 * this run, not a coincidental far-away point on the same section line.
 */
function segmentTouchesRunRange(seg: WireSegment, run: TrackRun, varyAxis: 'x' | 'z'): boolean {
  const pts = [seg.start, seg.end]
  return pts.some((p) => {
    const v = varyAxis === 'x' ? p.x : p.z
    return v >= run.rangeMin - TOLERANCE && v <= run.rangeMax + TOLERANCE
  })
}
