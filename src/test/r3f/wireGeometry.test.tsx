/**
 * Classification tests for the overlap oracle (`expectNoWireOverlaps`).
 *
 * These hand-craft wire segments (rendered verbatim by Wire3D) carrying the
 * routing metadata (`approach` / `confluenceCoord`) so the oracle's decision can
 * be exercised directly, WITHOUT depending on routing internals. They lock in the
 * distinction the oracle must make: a foreign trunk merged onto a chip's approach
 * backbone (CASE1) and two different confluences sharing a backbone (CASE2) are
 * defects, while genuine multi-pin fan-in along one confluence is intentional.
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { useCircuitStore } from '@/store/circuitStore'
import { resetCircuitStore } from './seedCircuit'
import { renderCircuitScene, type SceneTestHandle } from './renderCircuitScene'
import { expectNoWireOverlaps } from './wireGeometry'
import type { WireSegment } from '@/utils/wiringScheme/types'

const getState = () => useCircuitStore.getState()

/** A vertical segment at constant x over [z0, z1] on the wire plane. */
function vseg(x: number, z0: number, z1: number, extra: Partial<WireSegment> = {}): WireSegment {
  return { start: { x, y: 0.2, z: z0 }, end: { x, y: 0.2, z: z1 }, type: 'vertical', ...extra }
}

/**
 * Seed a wire with hand-crafted segments between two dummy gates. Wire3D renders
 * `precomputedPath.segments` verbatim, so the rendered geometry equals `segments`;
 * the dummy gates only provide valid endpoints (they are not rendered).
 */
function seedWireWithSegments(segments: WireSegment[], gateZ: number): void {
  const g1 = getState().addGate('Not', { x: 0, y: 0, z: gateZ })
  const g2 = getState().addGate('Not', { x: 0, y: 0, z: gateZ + 2 })
  getState().addWire(
    { type: 'gate', entityId: g1.id, pinId: g1.outputs[0].id },
    { type: 'gate', entityId: g2.id, pinId: g2.inputs[0].id },
    segments,
  )
}

describe('expectNoWireOverlaps classification', () => {
  let handle: SceneTestHandle | null = null
  beforeEach(() => resetCircuitStore())
  afterEach(async () => {
    if (handle) await handle.unmount()
    handle = null
  })

  it('FLAGS a foreign transit trunk merged onto a chip approach backbone (CASE1)', async () => {
    seedWireWithSegments([vseg(-4, 0, 4, { approach: true, confluenceCoord: -4 })], 10) // backbone
    seedWireWithSegments([vseg(-4, 1, 3)], 30) // transit on the same column, no approach metadata
    handle = await renderCircuitScene({ gates: false })
    expect(() => expectNoWireOverlaps(handle!)).toThrow(/overlap/i)
  })

  it('EXEMPTS two pins fanning into the SAME confluence backbone (B-004 fan-in)', async () => {
    seedWireWithSegments([vseg(-4, 0, 4, { approach: true, confluenceCoord: -4 })], 10)
    seedWireWithSegments([vseg(-4, 1, 3, { approach: true, confluenceCoord: -4 })], 30)
    handle = await renderCircuitScene({ gates: false })
    expect(() => expectNoWireOverlaps(handle!)).not.toThrow()
  })

  it('EXEMPTS an overlap with a non-backbone approach lane/entry (benign dense fan-in)', async () => {
    // A backbone-less approach lane (confluenceCoord undefined) shared with a transit
    // is the accepted artifact seen in the real Mux scenes — must NOT be flagged.
    seedWireWithSegments([vseg(-4, 0, 4, { approach: true })], 10) // approach, no confluenceCoord
    seedWireWithSegments([vseg(-4, 1, 3)], 30) // transit
    handle = await renderCircuitScene({ gates: false })
    expect(() => expectNoWireOverlaps(handle!)).not.toThrow()
  })

  it('FLAGS two unrelated transit trunks merged onto one track (transit-vs-transit)', async () => {
    seedWireWithSegments([vseg(-4, 0, 4)], 10)
    seedWireWithSegments([vseg(-4, 1, 3)], 30)
    handle = await renderCircuitScene({ gates: false })
    expect(() => expectNoWireOverlaps(handle!)).toThrow(/overlap/i)
  })

  it('FLAGS two different confluences sharing a backbone track (CASE2)', async () => {
    seedWireWithSegments([vseg(-4, 0, 4, { approach: true, confluenceCoord: -4 })], 10)
    seedWireWithSegments([vseg(-4, 1, 3, { approach: true, confluenceCoord: -8 })], 30)
    handle = await renderCircuitScene({ gates: false })
    expect(() => expectNoWireOverlaps(handle!)).toThrow(/overlap/i)
  })

  it('does not flag perpendicular crossings (different section lines)', async () => {
    seedWireWithSegments([vseg(-4, 0, 4)], 10) // vertical at x=-4
    seedWireWithSegments(
      [{ start: { x: -6, y: 0.2, z: 2 }, end: { x: -2, y: 0.2, z: 2 }, type: 'horizontal' }],
      30,
    ) // horizontal crossing at z=2
    handle = await renderCircuitScene({ gates: false })
    expect(() => expectNoWireOverlaps(handle!)).not.toThrow()
  })
})
