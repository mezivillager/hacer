import { describe, it, expect, beforeEach } from 'vitest'
import { useCircuitStore } from '@/store/circuitStore'
import { evaluateCircuit } from './topologicalEval'

const getState = () => useCircuitStore.getState()

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
    lastSimulationError: null,
  })
})

describe('bus simulation', () => {
  it('splits each bit of the input bus onto the splitter outputs', () => {
    const inputNode = getState().addInputNode('a', { x: 0, y: 0, z: 0 }, 4)
    const splitter = getState().placeBusSplitter(4, { x: 4, y: 0, z: 0 })!

    getState().addWire(
      { type: 'input', entityId: inputNode.id },
      { type: 'bus', entityId: splitter.id, pinId: 'in' },
      [],
    )
    getState().updateInputNodeValue(inputNode.id, 0b1011)

    useCircuitStore.setState((state) => { evaluateCircuit(state) })

    const out = getState().busComponents[0].outputs
    expect(out.find((p) => p.id === 'out0')!.value).toBe(1)
    expect(out.find((p) => p.id === 'out1')!.value).toBe(1)
    expect(out.find((p) => p.id === 'out2')!.value).toBe(0)
    expect(out.find((p) => p.id === 'out3')!.value).toBe(1)
  })

  it('round-trips input bus -> splitter -> joiner -> output bus', () => {
    const inputNode = getState().addInputNode('a', { x: 0, y: 0, z: 0 }, 4)
    const splitter = getState().placeBusSplitter(4, { x: 4, y: 0, z: 0 })!
    const joiner = getState().placeBusJoiner(4, { x: 8, y: 0, z: 0 })!
    const outputNode = getState().addOutputNode('out', { x: 12, y: 0, z: 0 }, 4)

    getState().addWire(
      { type: 'input', entityId: inputNode.id },
      { type: 'bus', entityId: splitter.id, pinId: 'in' },
      [],
    )
    for (let i = 0; i < 4; i++) {
      getState().addWire(
        { type: 'bus', entityId: splitter.id, pinId: `out${i}` },
        { type: 'bus', entityId: joiner.id, pinId: `in${i}` },
        [],
      )
    }
    getState().addWire(
      { type: 'bus', entityId: joiner.id, pinId: 'out' },
      { type: 'output', entityId: outputNode.id },
      [],
    )

    getState().updateInputNodeValue(inputNode.id, 0b1011)
    useCircuitStore.setState((state) => { evaluateCircuit(state) })

    expect(getState().outputNodes[0].value).toBe(0b1011)
  })
})
