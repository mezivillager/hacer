import { describe, it, expect, beforeEach } from 'vitest'
import { useCircuitStore } from '@/store/circuitStore'
import { deriveWire3DProps } from './deriveWire3DProps'

const getState = () => useCircuitStore.getState()

describe('deriveWire3DProps', () => {
  beforeEach(() => {
    useCircuitStore.setState({ gates: [], wires: [], inputNodes: [], outputNodes: [], junctions: [] })
  })

  it('resolves gate→gate endpoints to the real pin world positions', () => {
    const g1 = getState().addGate('And', { x: 0, y: 0, z: 0 })
    const g2 = getState().addGate('And', { x: 6, y: 0, z: 0 })
    const fromPin = g1.outputs[0].id
    const toPin = g2.inputs[0].id

    const wire = getState().addWire(
      { type: 'gate', entityId: g1.id, pinId: fromPin },
      { type: 'gate', entityId: g2.id, pinId: toPin },
      [
        { start: { x: 1, y: 0.2, z: 0 }, end: { x: 5, y: 0.2, z: 0 }, type: 'horizontal' },
      ],
    )

    const { start, end, precomputedPath } = deriveWire3DProps(wire, getState())
    const expectedStart = getState().getPinWorldPosition(g1.id, fromPin)
    const expectedEnd = getState().getPinWorldPosition(g2.id, toPin)

    expect(start).toEqual(expectedStart)
    expect(end).toEqual(expectedEnd)
    expect(precomputedPath.segments).toBe(wire.segments)
    expect(precomputedPath.totalLength).toBeCloseTo(4, 3)
  })

  it('resolves an input-node source endpoint to the node pin offset', () => {
    const node = getState().addInputNode('a', { x: -6, y: 0, z: 0 })
    const g = getState().addGate('Not', { x: 0, y: 0, z: 0 })
    const wire = getState().addWire(
      { type: 'input', entityId: node.id },
      { type: 'gate', entityId: g.id, pinId: g.inputs[0].id },
      [{ start: { x: -5, y: 0.2, z: 0 }, end: { x: -1, y: 0.2, z: 0 }, type: 'horizontal' }],
    )
    const { start } = deriveWire3DProps(wire, getState())
    expect(start).not.toBeNull()
    expect(start!.y).toBeCloseTo(0.2, 3)
    // x is node.x + positive pin offset (input node pin is on the right)
    expect(start!.x).toBeGreaterThan(node.position.x)
  })

  it('resolves bus endpoints via getPinWorldPosition', () => {
    useCircuitStore.setState({ busComponents: [] })
    const splitter = getState().placeBusSplitter(4, { x: 5, y: 0, z: 0 })!
    const gate = getState().addGate('Not', { x: 0, y: 0, z: 0 })

    const wire = getState().addWire(
      { type: 'bus', entityId: splitter.id, pinId: 'out0' },
      { type: 'gate', entityId: gate.id, pinId: gate.inputs[0].id },
      [{ start: { x: 4, y: 0.2, z: 0 }, end: { x: 1, y: 0.2, z: 0 }, type: 'horizontal' }],
    )
    const { start, end } = deriveWire3DProps(wire, getState())

    const expectedStart = getState().getPinWorldPosition(splitter.id, 'out0')
    const expectedEnd = getState().getPinWorldPosition(gate.id, gate.inputs[0].id)

    expect(start).not.toBeNull()
    expect(end).not.toBeNull()
    expect(start!.x).toBeCloseTo(expectedStart!.x, 3)
    expect(start!.z).toBeCloseTo(expectedStart!.z, 3)
    expect(end!.x).toBeCloseTo(expectedEnd!.x, 3)
    expect(end!.z).toBeCloseTo(expectedEnd!.z, 3)
  })
})
