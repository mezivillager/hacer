import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { useCircuitStore } from '@/store/circuitStore'
import { resetCircuitStore, wireGatePins } from '@/test/r3f/seedCircuit'
import { renderCircuitScene, type SceneTestHandle } from '@/test/r3f/renderCircuitScene'
import { getRenderedWirePolylines, getWireEndpoints, expectWireConnects } from '@/test/r3f/wireGeometry'
import { WIRE_HEIGHT } from '@/utils/wiringScheme/types'

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
