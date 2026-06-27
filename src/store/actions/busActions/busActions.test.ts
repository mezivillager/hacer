import { describe, it, expect, beforeEach, vi } from 'vitest'
import { notify } from '@/lib/notify'
import { useCircuitStore } from '../../circuitStore'

const getState = () => useCircuitStore.getState()

vi.mock('@/lib/notify', () => ({
  notify: { warning: vi.fn(), error: vi.fn(), info: vi.fn(), success: vi.fn() },
}))

describe('busActions', () => {
  beforeEach(() => {
    useCircuitStore.setState({
      gates: [],
      wires: [],
      inputNodes: [],
      outputNodes: [],
      junctions: [],
      busComponents: [],
      selectedGateId: null,
      selectedWireId: null,
      wiringFrom: null,
    })
    vi.clearAllMocks()
  })

  it('placeBusSplitter creates a splitter with 1 input and N 1-bit outputs', () => {
    const c = getState().placeBusSplitter(16, { x: 2, y: 0, z: 2 })
    expect(c).not.toBeNull()
    expect(c!.kind).toBe('splitter')
    expect(c!.width).toBe(16)
    expect(c!.inputs).toHaveLength(1)
    expect(c!.outputs).toHaveLength(16)
    expect(c!.inputs[0].width).toBe(16)
    expect(c!.outputs[0].width).toBe(1)
    expect(getState().busComponents).toHaveLength(1)
    expect(getState().busComponents[0].id).toBe(c!.id)
  })

  it('placeBusJoiner creates a joiner with N 1-bit inputs and 1 output', () => {
    const c = getState().placeBusJoiner(8, { x: 0, y: 0, z: 0 })
    expect(c!.kind).toBe('joiner')
    expect(c!.inputs).toHaveLength(8)
    expect(c!.outputs).toHaveLength(1)
    expect(c!.outputs[0].width).toBe(8)
  })

  it('rejects invalid widths as a no-op with a warning', () => {
    expect(getState().placeBusSplitter(1, { x: 0, y: 0, z: 0 })).toBeNull()
    expect(getState().placeBusJoiner(2.5, { x: 0, y: 0, z: 0 })).toBeNull()
    expect(getState().busComponents).toHaveLength(0)
    expect(notify.warning).toHaveBeenCalled()
  })

  it('updateBusComponentPosition moves the component', () => {
    const c = getState().placeBusSplitter(4, { x: 1, y: 0, z: 1 })!
    getState().updateBusComponentPosition(c.id, { x: 5, y: 0, z: 5 })
    expect(getState().busComponents[0].position).toEqual({ x: 5, y: 0, z: 5 })
  })

  it('removeBusComponent removes it and strips connected bus wires', () => {
    const c = getState().placeBusSplitter(4, { x: 1, y: 0, z: 1 })!
    const gate = getState().addGate('Not', { x: 6, y: 0, z: 0 })
    getState().addWire(
      { type: 'bus', entityId: c.id, pinId: 'out0' },
      { type: 'gate', entityId: gate.id, pinId: gate.inputs[0].id },
      [],
    )
    expect(getState().wires).toHaveLength(1)
    getState().removeBusComponent(c.id)
    expect(getState().busComponents).toHaveLength(0)
    expect(getState().wires).toHaveLength(0)
  })

  it('updateBusComponentPosition re-routes connected wires (non-empty, B-003)', () => {
    const inputNode = getState().addInputNode('a', { x: 0, y: 0, z: 0 }, 4)
    const splitter = getState().placeBusSplitter(4, { x: 6, y: 0, z: 2 })!
    const pin = getState().getPinWorldPosition(splitter.id, 'in')!
    getState().addWire(
      { type: 'input', entityId: inputNode.id },
      { type: 'bus', entityId: splitter.id, pinId: 'in' },
      [{ start: { x: 0.35, y: 0.2, z: 0 }, end: { x: pin.x, y: 0.2, z: pin.z }, type: 'horizontal' }],
    )
    const before = JSON.stringify(getState().wires[0].segments)

    getState().updateBusComponentPosition(splitter.id, { x: 6, y: 0, z: -4 })

    const after = getState().wires[0].segments
    expect(after.length).toBeGreaterThan(0)
    expect(JSON.stringify(after)).not.toBe(before)
  })
})
