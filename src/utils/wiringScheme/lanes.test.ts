/**
 * Unit tests for lane-level exclusivity / nudging (closes CASE1).
 */

import { describe, it, expect } from 'vitest'
import { laneIndexForNet, isApproachBackbone, nudgeTransitRun } from './lanes'
import type { WireSegment } from './types'
import { WIRE_HEIGHT, TRANSIT_LANE_SLOTS } from './types'

const pos = (x: number, z: number) => ({ x, y: WIRE_HEIGHT, z })

describe('laneIndexForNet', () => {
  it('is deterministic for the same net', () => {
    const a = laneIndexForNet(pos(-8, -2), pos(-4, -0.8))
    const b = laneIndexForNet(pos(-8, -2), pos(-4, -0.8))
    expect(a).toBe(b)
  })

  it('reserves lane 0 for the owner (transit indices are >= 1)', () => {
    for (const [s, e] of [
      [pos(-8, -2), pos(4, -0.8)],
      [pos(0, 0), pos(8, 8)],
      [pos(-5, -5), pos(5, 5)],
    ] as const) {
      const idx = laneIndexForNet(s, e)
      expect(idx).toBeGreaterThanOrEqual(1)
      expect(idx).toBeLessThanOrEqual(TRANSIT_LANE_SLOTS)
    }
  })

  it('usually maps distinct nets to distinct lanes', () => {
    const indices = new Set<number>()
    for (let i = 0; i < 6; i++) indices.add(laneIndexForNet(pos(-8, i), pos(8, i)))
    // Not a guarantee (hash), but distinct enough to avoid systematic collisions.
    expect(indices.size).toBeGreaterThan(1)
  })
})

describe('isApproachBackbone', () => {
  it('is true only for approach segments with a confluenceCoord', () => {
    expect(isApproachBackbone({ ...vert(-4, 0, -4), approach: true, confluenceCoord: -4 })).toBe(true)
    expect(isApproachBackbone({ ...vert(-4, 0, -4), approach: true })).toBe(false)
    expect(isApproachBackbone(vert(-4, 0, -4))).toBe(false)
  })
})

function vert(x: number, z1: number, z2: number): WireSegment {
  return { start: pos(x, z1), end: pos(x, z2), type: 'vertical' }
}
function horiz(x1: number, z: number, x2: number): WireSegment {
  return { start: pos(x1, z), end: pos(x2, z), type: 'horizontal' }
}

describe('nudgeTransitRun', () => {
  const backbone: WireSegment = { ...vert(-4, 0, -4), approach: true, confluenceCoord: -4 }

  it('nudges a transit run off a different confluence backbone (CASE1)', () => {
    // A net whose vertical run rides x=-4 collinearly with the backbone.
    const segs: WireSegment[] = [
      horiz(-8, -2, -4), // feed into the column
      vert(-4, -2, -3), // collinear transit on x=-4
      horiz(-4, -3, 0), // continue toward destination
    ]
    const out = nudgeTransitRun(segs, [backbone], pos(-8, -2), pos(0, -3), undefined)
    const transitVert = out.find((s) => Math.abs(s.start.z - s.end.z) > 0.001)!
    // The vertical transit is moved off the exact backbone line.
    expect(Math.abs(transitVert.start.x - -4)).toBeGreaterThan(0.001)
    // Corners stitched: the feeding/continuing horizontals meet the lane.
    expect(out[0].end.x).toBeCloseTo(transitVert.start.x, 6)
    expect(out[2].start.x).toBeCloseTo(transitVert.start.x, 6)
  })

  it('does NOT nudge the net that OWNS the backbone (same confluenceCoord)', () => {
    const segs: WireSegment[] = [
      { ...vert(-4, -2, -3), approach: true, confluenceCoord: -4 },
    ]
    const out = nudgeTransitRun(segs, [backbone], pos(-8, -2), pos(-4, -3), -4)
    expect(out[0].start.x).toBeCloseTo(-4, 6)
  })

  it('does NOT nudge a run that only crosses the backbone perpendicularly', () => {
    // A horizontal run crossing x=-4 perpendicularly is a crossing (hop), not a
    // collinear transit — it must NOT be nudged.
    const segs: WireSegment[] = [horiz(-8, -2, 0)] // crosses x=-4 at (-4,-2)
    const out = nudgeTransitRun(segs, [backbone], pos(-8, -2), pos(0, -2), undefined)
    expect(out[0].start.z).toBeCloseTo(-2, 6)
    expect(out[0].end.z).toBeCloseTo(-2, 6)
  })

  it('does nothing when there are no approach backbones present', () => {
    const segs: WireSegment[] = [vert(-4, -2, -3)]
    const out = nudgeTransitRun(segs, [], pos(-8, -2), pos(-4, -3), undefined)
    expect(out[0].start.x).toBeCloseTo(-4, 6)
  })

  it('probes a second transit to a free lane when it hashes to the SAME lane as the first', () => {
    // netA (-8,-2)->(0,-3) and netB (-8,1)->(0,-3) both hash to the same transit
    // lane index, and both transit x=-4 over an overlapping z-range. Without
    // probing they would land on the identical offset coordinate and merge.
    const runA = (z1: number, z2: number): WireSegment[] => [
      horiz(-8, z1, -4),
      vert(-4, z1, z2),
      horiz(-4, z2, 0),
    ]
    // Net A nudged against the backbone only.
    const outA = nudgeTransitRun(runA(-2, -6), [backbone], pos(-8, -2), pos(0, -3), undefined)
    const vertA = outA.find((s) => Math.abs(s.start.z - s.end.z) > 0.001)!
    expect(Math.abs(vertA.start.x - -4)).toBeGreaterThan(0.001) // nudged off the line

    // Net B sees the backbone AND net A's already-placed (nudged) segments. Its
    // z-range (1..-5) overlaps A's (−2..−6) around z∈[-5,-2], so a shared lane
    // would merge — the probe must move B to a different lane.
    const outB = nudgeTransitRun(
      runA(1, -5),
      [backbone, ...outA],
      pos(-8, 1),
      pos(0, -3),
      undefined,
    )
    const vertB = outB.find((s) => Math.abs(s.start.z - s.end.z) > 0.001)!
    expect(Math.abs(vertB.start.x - -4)).toBeGreaterThan(0.001) // also nudged off the line
    // The two distinct nets do NOT share the same physical lane.
    expect(Math.abs(vertB.start.x - vertA.start.x)).toBeGreaterThan(0.001)
  })
})
