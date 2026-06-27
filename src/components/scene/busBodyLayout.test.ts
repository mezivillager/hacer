import { describe, it, expect, beforeEach } from 'vitest'
import { useCircuitStore } from '@/store/circuitStore'
import { createBusPins } from '@/store/actions/busActions/busPins'
import type { BusComponent, BusComponentKind } from '@/store/types'
import { computeBusPinLayout, computeBusBodyDimensions } from './busBodyLayout'

function makeBus(kind: BusComponentKind, width: number, position = { x: 0, y: 0, z: 0 }): BusComponent {
  const { inputs, outputs } = createBusPins(kind, width)
  return { id: 'bus-test', kind, position, rotation: { x: 0, y: 0, z: 0 }, width, inputs, outputs, selected: false }
}

describe('computeBusPinLayout', () => {
  it('places 1 input on -x and N outputs on +x for a splitter', () => {
    const slots = computeBusPinLayout(makeBus('splitter', 4))
    const inputs = slots.filter((s) => s.side === 'input')
    const outputs = slots.filter((s) => s.side === 'output')
    expect(inputs).toHaveLength(1)
    expect(outputs).toHaveLength(4)
    expect(inputs[0].pinId).toBe('in')
    expect(outputs.map((s) => s.pinId)).toEqual(['out0', 'out1', 'out2', 'out3'])
    expect(inputs[0].position[0]).toBeLessThan(0)
    expect(outputs[0].position[0]).toBeGreaterThan(0)
  })

  it('spaces same-side pins evenly along z and centers them on 0', () => {
    const outputs = computeBusPinLayout(makeBus('splitter', 4)).filter((s) => s.side === 'output')
    expect(outputs[1].position[2] - outputs[0].position[2]).toBeCloseTo(0.4, 5)
    const zs = outputs.map((s) => s.position[2])
    expect((zs[0] + zs[zs.length - 1]) / 2).toBeCloseTo(0, 5)
  })

  it('grows body depth (sizeZ) with pin count', () => {
    const small = computeBusBodyDimensions(makeBus('splitter', 2)).sizeZ
    const large = computeBusBodyDimensions(makeBus('splitter', 16)).sizeZ
    expect(large).toBeGreaterThan(small)
  })
})

describe('getPinWorldPosition / getPinOrientation for bus components', () => {
  beforeEach(() => {
    useCircuitStore.setState({ gates: [], wires: [], busComponents: [] })
  })

  it('resolves a bus pin to component position + local slot offset', () => {
    const c = useCircuitStore.getState().placeBusSplitter(4, { x: 5, y: 0, z: 5 })!
    const slot = computeBusPinLayout(c).find((s) => s.pinId === 'out0')!
    const world = useCircuitStore.getState().getPinWorldPosition(c.id, 'out0')!
    expect(world.x).toBeCloseTo(5 + slot.position[0], 5)
    expect(world.z).toBeCloseTo(5 + slot.position[2], 5)
  })

  it('orients input pins -x and output pins +x', () => {
    const c = useCircuitStore.getState().placeBusSplitter(4, { x: 0, y: 0, z: 0 })!
    expect(useCircuitStore.getState().getPinOrientation(c.id, 'in')!.x).toBeCloseTo(-1, 5)
    expect(useCircuitStore.getState().getPinOrientation(c.id, 'out0')!.x).toBeCloseTo(1, 5)
  })
})
