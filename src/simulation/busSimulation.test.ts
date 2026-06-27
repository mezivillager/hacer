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

  it('[M4-cycle] detects a cycle through bus components and does not hang', () => {
    // splitter out0 (1-bit) → joiner in0 (1-bit)
    // joiner out (2-bit)    → splitter in (2-bit)
    // This creates a splitter ↔ joiner feedback loop that must be detected.
    const splitter = getState().placeBusSplitter(2, { x: 4, y: 0, z: 0 })!
    const joiner = getState().placeBusJoiner(2, { x: 0, y: 0, z: 0 })!

    getState().addWire(
      { type: 'bus', entityId: joiner.id, pinId: 'out' },
      { type: 'bus', entityId: splitter.id, pinId: 'in' },
      [],
    )
    getState().addWire(
      { type: 'bus', entityId: splitter.id, pinId: 'out0' },
      { type: 'bus', entityId: joiner.id, pinId: 'in0' },
      [],
    )

    const result = evaluateCircuit(getState())
    expect(result.status).toBe('cycle')
    if (result.status === 'cycle') {
      expect(result.involvedGateIds).toContain(splitter.id)
      expect(result.involvedGateIds).toContain(joiner.id)
    }
  })

  it('[M4-partial-joiner] packs only connected bits; unconnected inputs default to 0', () => {
    const inputNode0 = getState().addInputNode('b0', { x: 0, y: 0, z: 0 }, 1)
    const inputNode1 = getState().addInputNode('b1', { x: 0, y: 2, z: 0 }, 1)
    const joiner = getState().placeBusJoiner(4, { x: 4, y: 0, z: 0 })!

    // Only in0 and in1 are wired; in2 and in3 remain unconnected (value stays 0)
    getState().addWire(
      { type: 'input', entityId: inputNode0.id },
      { type: 'bus', entityId: joiner.id, pinId: 'in0' },
      [],
    )
    getState().addWire(
      { type: 'input', entityId: inputNode1.id },
      { type: 'bus', entityId: joiner.id, pinId: 'in1' },
      [],
    )

    // in0=1, in1=0 → packed = 0b0001 = 1
    getState().updateInputNodeValue(inputNode0.id, 1)
    getState().updateInputNodeValue(inputNode1.id, 0)
    useCircuitStore.setState((state) => { evaluateCircuit(state) })
    expect(getState().busComponents[0].outputs[0].value).toBe(1)

    // in0=0, in1=1 → packed = 0b0010 = 2
    getState().updateInputNodeValue(inputNode0.id, 0)
    getState().updateInputNodeValue(inputNode1.id, 1)
    useCircuitStore.setState((state) => { evaluateCircuit(state) })
    expect(getState().busComponents[0].outputs[0].value).toBe(2)
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
