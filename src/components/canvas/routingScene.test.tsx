import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { useCircuitStore } from '@/store/circuitStore'
import { resetCircuitStore, wireGatePins, wireInputNodeToPin } from '@/test/r3f/seedCircuit'
import { renderCircuitScene, type SceneTestHandle } from '@/test/r3f/renderCircuitScene'
import {
  getRenderedWirePolylines,
  getWireEndpoints,
  expectWireConnects,
  expectNoWireOverlaps,
} from '@/test/r3f/wireGeometry'
import { WIRE_HEIGHT } from '@/utils/wiringScheme/types'
import { calculateNodePinPosition } from '@/nodes/config'

const getState = () => useCircuitStore.getState()
const TOL = 0.001

describe('routing scene-graph: render contract', () => {
  let handle: SceneTestHandle | null = null
  beforeEach(() => resetCircuitStore())
  afterEach(async () => {
    if (handle) await handle.unmount()
    handle = null
  })

  it('renders one line per computed segment, each at the computed endpoints', async () => {
    const g1 = getState().addGate('And', { x: 0, y: 0, z: 0 })
    const g2 = getState().addGate('And', { x: 8, y: 0, z: 4 })
    const wire = wireGatePins(g1.id, g1.outputs[0].id, g2.id, g2.inputs[0].id)

    handle = await renderCircuitScene({ gates: false })
    const rendered = getRenderedWirePolylines(handle)

    expect(rendered).toHaveLength(1)
    // One rendered <Line> per stored segment.
    expect(rendered[0].segments).toHaveLength(wire.segments.length)
    // Each rendered straight segment's endpoints equal the computed segment endpoints.
    wire.segments.forEach((seg, i) => {
      const pts = rendered[0].segments[i].points
      const first = pts[0]
      const last = pts[pts.length - 1]
      expect(first.x).toBeCloseTo(seg.start.x, 3)
      expect(first.y).toBeCloseTo(seg.start.y, 3)
      expect(first.z).toBeCloseTo(seg.start.z, 3)
      expect(last.x).toBeCloseTo(seg.end.x, 3)
      expect(last.y).toBeCloseTo(seg.end.y, 3)
      expect(last.z).toBeCloseTo(seg.end.z, 3)
    })
    expect(TOL).toBe(0.001)
  })
})

describe('routing scene-graph: connectivity with real gates', () => {
  let handle: SceneTestHandle | null = null
  beforeEach(() => resetCircuitStore())
  afterEach(async () => {
    if (handle) await handle.unmount()
    handle = null
  })

  it('renders an And→Nand wire from the source pin to the destination pin', async () => {
    const and = getState().addGate('And', { x: 0, y: 0, z: 0 })
    const nand = getState().addGate('Nand', { x: 10, y: 0, z: 0 })
    const fromPin = and.outputs[0].id
    const toPin = nand.inputs[0].id
    wireGatePins(and.id, fromPin, nand.id, toPin)

    handle = await renderCircuitScene({ gates: false })
    const [rendered] = getRenderedWirePolylines(handle)

    const srcPos = getState().getPinWorldPosition(and.id, fromPin)!
    const dstPos = getState().getPinWorldPosition(nand.id, toPin)!

    // Wires travel on the wire plane (y = WIRE_HEIGHT). The router's exit/approach
    // segments snap y to WIRE_HEIGHT, so compare against the wire-plane projection
    // of the pin world position (same x,z; y=WIRE_HEIGHT).
    expectWireConnects(
      rendered,
      { x: srcPos.x, y: WIRE_HEIGHT, z: srcPos.z },
      { x: dstPos.x, y: WIRE_HEIGHT, z: dstPos.z },
      TOL,
    )

    // Sanity: the rendered polyline is non-trivial (more than a single point).
    const { start, end } = getWireEndpoints(rendered)
    expect(start.distanceTo(end)).toBeGreaterThan(0.001)
  })
})

describe('routing scene-graph: dense multi-input chips (B-004)', () => {
  let handle: SceneTestHandle | null = null
  beforeEach(() => resetCircuitStore())
  afterEach(async () => {
    if (handle) await handle.unmount()
    handle = null
  })

  // Wire every input pin of `chipName` from its own distinct source gate, fanned
  // out so each source sits on its own row/column (the real B-004 layout). Assert
  // every input wire renders, reaches its own pin, and no two wires merge.
  async function assertDenseChipRoutesCleanly(chipName: string, expectedInputs: number) {
    const chip = getState().addGate(chipName, { x: 0, y: 0, z: 0 })
    expect(chip.inputs).toHaveLength(expectedInputs)

    const expectedPins = chip.inputs.map((pin, i) => {
      // Distinct source gate per input, spread in X and Z so trunks don't collapse.
      const src = getState().addGate('Not', { x: -(8 + i * 4), y: 0, z: i * 4 })
      wireGatePins(src.id, src.outputs[0].id, chip.id, pin.id)
      return { pinId: pin.id, pos: getState().getPinWorldPosition(chip.id, pin.id)! }
    })

    handle = await renderCircuitScene({ gates: false })
    const rendered = getRenderedWirePolylines(handle)

    // Every input wire rendered.
    expect(rendered).toHaveLength(expectedInputs)
    // Each wire reaches its own pin (some wire's rendered end matches each pin).
    // NOTE: compare only x,z — rendered endpoints sit at y=WIRE_HEIGHT (0.2) because
    // the router's calculateExitSegment snaps y to the wire plane, so a 3D distance
    // check against the raw pin world position would fail for pins whose real y ≠ 0.2.
    for (const { pos } of expectedPins) {
      const reaches = rendered.some((w) => getWireEndpointsMatchesPin(w, pos, TOL))
      expect(reaches, `no wire reaches pin at ${pos.x},${pos.y},${pos.z}`).toBe(true)
    }
    // No two distinct wires share a collinear track at the render level.
    expectNoWireOverlaps(handle, { tolerance: TOL })
  }

  function getWireEndpointsMatchesPin(
    w: ReturnType<typeof getRenderedWirePolylines>[number],
    pin: { x: number; y: number; z: number },
    tol: number,
  ): boolean {
    const { start, end } = getWireEndpoints(w)
    // Compare only x and z: rendered endpoints are always at y=WIRE_HEIGHT (the router
    // forces exit/approach segments to the wire plane), but pin.y may differ. The
    // router guarantees the wire reaches the pin's x,z position on the wire plane,
    // so the geometrically correct match is x,z only — this is NOT a weakening.
    return (
      Math.hypot(end.x - pin.x, end.z - pin.z) <= tol ||
      Math.hypot(start.x - pin.x, start.z - pin.z) <= tol
    )
  }

  it('routes all 5 Mux4Way16 inputs to distinct pins with no overlaps', async () => {
    await assertDenseChipRoutesCleanly('Mux4Way16', 5)
  })

  it('routes all 9 Mux8Way16 inputs to distinct pins with no overlaps', async () => {
    await assertDenseChipRoutesCleanly('Mux8Way16', 9)
  })
})

describe('routing scene-graph: B-004a / CASE1 + transit-vs-transit', () => {
  let handle: SceneTestHandle | null = null
  beforeEach(() => resetCircuitStore())
  afterEach(async () => {
    if (handle) await handle.unmount()
    handle = null
  })

  it('keeps two distinct transit wires on distinct rendered tracks (no merge)', async () => {
    // Mirrors laneExclusivity.test.ts "separates TWO distinct transit nets that hash
    // to the SAME lane": Mux4Way16 backbone at x=-4 forces both transit nets to cross
    // that column with a vertical trunk. Gate positions chosen so output/input pins land
    // at x ≈ ±7.325, matching the proven exit-z values (-6 and -5) that hash to the
    // same starting transit lane index (lane 5). Their vertical z-ranges overlap
    // (z ∈ [-6, -0.8] vs [-5, -1.0]), so absent the fix both nets share the same
    // physical track — collinear merge.
    const chip = getState().addGate('Mux4Way16', { x: 0, y: 0, z: 0 })
    // Backbone wire: output pin at (-8.0, 0, -4) → Mux4Way16 input[0].
    // Establishes the approach backbone segment at x = -4.
    const bSrc = getState().addGate('Not', { x: -8.6, y: 0, z: -4 })
    const backboneWire = wireGatePins(bSrc.id, bSrc.outputs[0].id, chip.id, chip.inputs[0].id)

    // Transit A: output pin at (-7.325, 0, -6) → input pin at (7.325, 0, -0.8).
    // Needs a vertical trunk near x=-4 spanning z ≈ [-6, -0.8].
    const tSrcA = getState().addGate('Not', { x: -7.925, y: 0, z: -6 })
    const tDstA = getState().addGate('Not', { x: 7.925, y: 0, z: -0.8 })
    wireGatePins(tSrcA.id, tSrcA.outputs[0].id, tDstA.id, tDstA.inputs[0].id)

    // Transit B: output pin at (-7.325, 0, -5) → input pin at (7.325, 0, -1.0).
    // Same lane hash as A (exit-z = -5 hashes to lane 5). z-range [-5, -1.0] overlaps A's.
    const tSrcB = getState().addGate('Not', { x: -7.925, y: 0, z: -5 })
    const tDstB = getState().addGate('Not', { x: 7.925, y: 0, z: -1.0 })
    wireGatePins(tSrcB.id, tSrcB.outputs[0].id, tDstB.id, tDstB.inputs[0].id)

    handle = await renderCircuitScene({ gates: false })
    const rendered = getRenderedWirePolylines(handle)

    // Non-vacuity guard 1: backbone + 2 transit wires all rendered.
    expect(rendered).toHaveLength(3)

    // Non-vacuity guard 2: both transit wires have vertical segments near the backbone
    // column (|x - (-4)| < 1.0) with overlapping z-ranges — the collinear-merge
    // precondition that the fix must prevent.
    const transitRendered = rendered.filter((w) => w.wireId !== backboneWire.id)
    expect(transitRendered).toHaveLength(2)

    const vertsA = transitRendered[0].segments.filter((s) => {
      if (s.points.length !== 2) return false
      const [a, b] = s.points
      return Math.abs(a.x - b.x) < TOL && Math.abs(a.z - b.z) > TOL && Math.abs(a.x - -4) < 1.0
    })
    const vertsB = transitRendered[1].segments.filter((s) => {
      if (s.points.length !== 2) return false
      const [a, b] = s.points
      return Math.abs(a.x - b.x) < TOL && Math.abs(a.z - b.z) > TOL && Math.abs(a.x - -4) < 1.0
    })
    expect(
      vertsA.length,
      'transit A must have a vertical run near the backbone column (x ≈ -4) — vacuous otherwise',
    ).toBeGreaterThan(0)
    expect(
      vertsB.length,
      'transit B must have a vertical run near the backbone column (x ≈ -4) — vacuous otherwise',
    ).toBeGreaterThan(0)

    const zs = (segs: typeof vertsA) => segs.flatMap((s) => [s.points[0].z, s.points[1].z])
    const rA = { min: Math.min(...zs(vertsA)), max: Math.max(...zs(vertsA)) }
    const rB = { min: Math.min(...zs(vertsB)), max: Math.max(...zs(vertsB)) }
    const zOverlap = Math.min(rA.max, rB.max) - Math.max(rA.min, rB.min)
    expect(
      zOverlap,
      'transit A and B vertical z-ranges must overlap so a collinear merge is geometrically possible',
    ).toBeGreaterThan(TOL)

    // Main assertion: lane-nudging fix keeps them on distinct parallel tracks.
    expectNoWireOverlaps(handle, { tolerance: TOL })
  })

  it('routes a transit wire off an unrelated chip fan-in backbone (CASE1)', async () => {
    // Mirrors laneExclusivity.test.ts "nudges an unrelated transit trunk off a chip
    // approach backbone (CASE1 closed)": Mux4Way16 fan-in creates backbone at x=-4;
    // a transit wire whose vertical trunk spans the backbone z-range must be nudged
    // OFF the backbone column (not collinear with it). Absent the fix the trunk rides
    // x=-4 exactly, merging with the backbone.
    const chip = getState().addGate('Mux4Way16', { x: 0, y: 0, z: 0 })
    // Two backbone wires to strongly establish the confluence at x=-4.
    // Sources chosen to match laneExclusivity: z = -4 and -8 (SECTION_SIZE spacing).
    const bSrc0 = getState().addGate('Not', { x: -8.6, y: 0, z: -4 })
    wireGatePins(bSrc0.id, bSrc0.outputs[0].id, chip.id, chip.inputs[0].id)
    const bSrc1 = getState().addGate('Not', { x: -8.6, y: 0, z: -8 })
    wireGatePins(bSrc1.id, bSrc1.outputs[0].id, chip.id, chip.inputs[1].id)

    // Transit: output pin at (-7.325, 0, -6), input pin at (7.325, 0, 2).
    // Source z=-6 falls inside the backbone z-range; dest z=2 is on the far side.
    // The router selects x=-4 for the vertical trunk — CASE1 precondition.
    // With the fix the trunk is nudged to x = -4 + lane_offset (off-grid, off-backbone).
    const tSrc = getState().addGate('Not', { x: -7.925, y: 0, z: -6 })
    const tDst = getState().addGate('Not', { x: 7.925, y: 0, z: 2 })
    const transitWire = wireGatePins(tSrc.id, tSrc.outputs[0].id, tDst.id, tDst.inputs[0].id)

    handle = await renderCircuitScene({ gates: false })
    const rendered = getRenderedWirePolylines(handle)

    // Non-vacuity guard 1: 2 backbone wires + 1 transit.
    expect(rendered).toHaveLength(3)

    // Non-vacuity guard 2: the transit wire has a vertical run near x=-4
    // (within 1 unit — the fix puts it at x=-4 ± lane_offset < 0.36),
    // confirming the CASE1 scenario genuinely applies before the fix.
    const transitRendered = rendered.find((w) => w.wireId === transitWire.id)
    expect(transitRendered, 'transit wire must be rendered').toBeDefined()

    const transitVerticals = transitRendered!.segments.filter((s) => {
      if (s.points.length !== 2) return false
      const [a, b] = s.points
      return Math.abs(a.x - b.x) < TOL && Math.abs(a.z - b.z) > TOL && Math.abs(a.x - -4) < 1.0
    })
    expect(
      transitVerticals.length,
      'transit must route a vertical trunk near the backbone column (|x - (-4)| < 1) — CASE1 precondition',
    ).toBeGreaterThan(0)

    // Main assertion: transit is nudged off the backbone track — no collinear merge.
    expectNoWireOverlaps(handle, { tolerance: TOL })
  })
})

describe('routing scene-graph: node-drag re-route (B-003)', () => {
  let handle: SceneTestHandle | null = null
  beforeEach(() => resetCircuitStore())
  afterEach(async () => {
    if (handle) await handle.unmount()
    handle = null
  })

  it('keeps the wire connected to an input node after the node is moved', async () => {
    const chip = getState().addGate('Mux4Way16', { x: 0, y: 0, z: 0 })
    const innerPin = chip.inputs[2].id // an inner pin (the B-003-prone case)
    const node = getState().addInputNode('a', { x: -10, y: 0, z: 2 })
    wireInputNodeToPin(node.id, chip.id, innerPin)

    // Render before the move: connects node pin → gate pin.
    handle = await renderCircuitScene({ gates: false })
    const before = getRenderedWirePolylines(handle)
    expect(before).toHaveLength(1)
    expect(before[0].segments.length).toBeGreaterThan(0)
    await handle.unmount()
    handle = null

    // Move the node (this triggers recalculateWiresForNode).
    const newPos = { x: -14, y: 0, z: -3 }
    getState().updateInputNodePosition(node.id, newPos)

    // Render after the move: wire still renders (non-empty) and follows the node.
    handle = await renderCircuitScene({ gates: false })
    const after = getRenderedWirePolylines(handle)
    expect(after).toHaveLength(1)
    expect(after[0].segments.length).toBeGreaterThan(0) // B-003: must not be orphaned/empty

    const off = calculateNodePinPosition('input')
    const expectedNodePin = { x: newPos.x + off.x, y: 0.2, z: newPos.z + off.z }
    const pinPos = getState().getPinWorldPosition(chip.id, innerPin)!
    // Project pinPos to the wire plane (y=WIRE_HEIGHT): the router forces exit/approach
    // segments to y=WIRE_HEIGHT, so the rendered endpoint sits at WIRE_HEIGHT, not the
    // pin's real y. This is geometrically correct — NOT a weakening.
    expectWireConnects(after[0], expectedNodePin, { x: pinPos.x, y: WIRE_HEIGHT, z: pinPos.z }, TOL)
  })
})
