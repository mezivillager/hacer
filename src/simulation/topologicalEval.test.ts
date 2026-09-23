import { describe, it, expect, beforeEach } from 'vitest'
import { useCircuitStore } from '@/store/circuitStore'
import { getUserChipRegistry, resetAppRegistriesForTests } from '@/core/chips/appRegistry'
import {
  topologicalSort,
  evaluateCircuit,
  type EvaluateCircuitResult,
} from './topologicalEval'

const getState = () => useCircuitStore.getState()

beforeEach(() => {
  useCircuitStore.setState({
    gates: [],
    wires: [],
    selectedGateId: null,
    selectedWireId: null,
    simulationRunning: false,
    simulationSpeed: 100,
    placementMode: null,
    placementPreviewPosition: null,
    wiringFrom: null,
    isDragActive: false,
    hoveredGateId: null,
    showAxes: false,
    inputNodes: [],
    outputNodes: [],
    junctions: [],
    nodePlacementMode: null,
    selectedNodeId: null,
    selectedNodeType: null,
    junctionPlacementMode: null,
    junctionPreviewPosition: null,
    junctionPreviewWireId: null,
    lastSimulationError: null,
  })
})

describe('topologicalSort', () => {
  it('returns empty order for circuit with no gates', () => {
    const result = topologicalSort(getState())
    expect(result).toEqual({ type: 'success', order: [] })
  })

  it('returns single gate when one gate has no gate-to-gate dependencies', () => {
    const gate = getState().addGate('Nand', { x: 0, y: 0, z: 0 })
    const result = topologicalSort(getState())
    expect(result.type).toBe('success')
    if (result.type === 'success') {
      expect(result.order).toEqual([gate.id])
    }
  })

  it('sorts two-gate chain: gate1 → gate2', () => {
    const gate1 = getState().addGate('Nand', { x: 0, y: 0, z: 0 })
    const gate2 = getState().addGate('Nand', { x: 4, y: 0, z: 0 })

    getState().addWire(
      { type: 'gate', entityId: gate1.id, pinId: gate1.outputs[0].id },
      { type: 'gate', entityId: gate2.id, pinId: gate2.inputs[0].id },
      []
    )

    const result = topologicalSort(getState())
    expect(result.type).toBe('success')
    if (result.type === 'success') {
      expect(result.order.indexOf(gate1.id)).toBeLessThan(result.order.indexOf(gate2.id))
    }
  })

  it('sorts three-gate chain: gate1 → gate2 → gate3', () => {
    const gate1 = getState().addGate('Not', { x: 0, y: 0, z: 0 })
    const gate2 = getState().addGate('And', { x: 4, y: 0, z: 0 })
    const gate3 = getState().addGate('Or', { x: 8, y: 0, z: 0 })

    getState().addWire(
      { type: 'gate', entityId: gate1.id, pinId: gate1.outputs[0].id },
      { type: 'gate', entityId: gate2.id, pinId: gate2.inputs[0].id },
      []
    )
    getState().addWire(
      { type: 'gate', entityId: gate2.id, pinId: gate2.outputs[0].id },
      { type: 'gate', entityId: gate3.id, pinId: gate3.inputs[0].id },
      []
    )

    const result = topologicalSort(getState())
    expect(result.type).toBe('success')
    if (result.type === 'success') {
      expect(result.order.indexOf(gate1.id)).toBeLessThan(result.order.indexOf(gate2.id))
      expect(result.order.indexOf(gate2.id)).toBeLessThan(result.order.indexOf(gate3.id))
    }
  })

  it('handles fan-out: gate1 feeds gate2 AND gate3', () => {
    const gate1 = getState().addGate('Nand', { x: 0, y: 0, z: 0 })
    const gate2 = getState().addGate('Not', { x: 4, y: 0, z: -2 })
    const gate3 = getState().addGate('Not', { x: 4, y: 0, z: 2 })

    getState().addWire(
      { type: 'gate', entityId: gate1.id, pinId: gate1.outputs[0].id },
      { type: 'gate', entityId: gate2.id, pinId: gate2.inputs[0].id },
      []
    )
    getState().addWire(
      { type: 'gate', entityId: gate1.id, pinId: gate1.outputs[0].id },
      { type: 'gate', entityId: gate3.id, pinId: gate3.inputs[0].id },
      []
    )

    const result = topologicalSort(getState())
    expect(result.type).toBe('success')
    if (result.type === 'success') {
      expect(result.order.indexOf(gate1.id)).toBeLessThan(result.order.indexOf(gate2.id))
      expect(result.order.indexOf(gate1.id)).toBeLessThan(result.order.indexOf(gate3.id))
    }
  })

  it('handles fan-in: gate1 and gate2 both feed gate3', () => {
    const gate1 = getState().addGate('Not', { x: 0, y: 0, z: -2 })
    const gate2 = getState().addGate('Not', { x: 0, y: 0, z: 2 })
    const gate3 = getState().addGate('And', { x: 4, y: 0, z: 0 })

    getState().addWire(
      { type: 'gate', entityId: gate1.id, pinId: gate1.outputs[0].id },
      { type: 'gate', entityId: gate3.id, pinId: gate3.inputs[0].id },
      []
    )
    getState().addWire(
      { type: 'gate', entityId: gate2.id, pinId: gate2.outputs[0].id },
      { type: 'gate', entityId: gate3.id, pinId: gate3.inputs[1].id },
      []
    )

    const result = topologicalSort(getState())
    expect(result.type).toBe('success')
    if (result.type === 'success') {
      expect(result.order.indexOf(gate1.id)).toBeLessThan(result.order.indexOf(gate3.id))
      expect(result.order.indexOf(gate2.id)).toBeLessThan(result.order.indexOf(gate3.id))
    }
  })

  it('handles diamond: A→B, A→C, B→D, C→D', () => {
    const gateA = getState().addGate('Not', { x: 0, y: 0, z: 0 })
    const gateB = getState().addGate('Not', { x: 4, y: 0, z: -2 })
    const gateC = getState().addGate('Not', { x: 4, y: 0, z: 2 })
    const gateD = getState().addGate('And', { x: 8, y: 0, z: 0 })

    getState().addWire(
      { type: 'gate', entityId: gateA.id, pinId: gateA.outputs[0].id },
      { type: 'gate', entityId: gateB.id, pinId: gateB.inputs[0].id },
      []
    )
    getState().addWire(
      { type: 'gate', entityId: gateA.id, pinId: gateA.outputs[0].id },
      { type: 'gate', entityId: gateC.id, pinId: gateC.inputs[0].id },
      []
    )
    getState().addWire(
      { type: 'gate', entityId: gateB.id, pinId: gateB.outputs[0].id },
      { type: 'gate', entityId: gateD.id, pinId: gateD.inputs[0].id },
      []
    )
    getState().addWire(
      { type: 'gate', entityId: gateC.id, pinId: gateC.outputs[0].id },
      { type: 'gate', entityId: gateD.id, pinId: gateD.inputs[1].id },
      []
    )

    const result = topologicalSort(getState())
    expect(result.type).toBe('success')
    if (result.type === 'success') {
      const idxA = result.order.indexOf(gateA.id)
      const idxB = result.order.indexOf(gateB.id)
      const idxC = result.order.indexOf(gateC.id)
      const idxD = result.order.indexOf(gateD.id)
      expect(idxA).toBeLessThan(idxB)
      expect(idxA).toBeLessThan(idxC)
      expect(idxB).toBeLessThan(idxD)
      expect(idxC).toBeLessThan(idxD)
    }
  })

  it('handles isolated gates (no wires between them)', () => {
    const gate1 = getState().addGate('Nand', { x: 0, y: 0, z: 0 })
    const gate2 = getState().addGate('Not', { x: 4, y: 0, z: 0 })

    const result = topologicalSort(getState())
    expect(result.type).toBe('success')
    if (result.type === 'success') {
      expect(result.order).toHaveLength(2)
      expect(result.order).toContain(gate1.id)
      expect(result.order).toContain(gate2.id)
    }
  })

  it('detects a cycle: gate A → gate B → gate A', () => {
    const gateA = getState().addGate('Nand', { x: 0, y: 0, z: 0 })
    const gateB = getState().addGate('Nand', { x: 4, y: 0, z: 0 })

    getState().addWire(
      { type: 'gate', entityId: gateA.id, pinId: gateA.outputs[0].id },
      { type: 'gate', entityId: gateB.id, pinId: gateB.inputs[0].id },
      []
    )
    getState().addWire(
      { type: 'gate', entityId: gateB.id, pinId: gateB.outputs[0].id },
      { type: 'gate', entityId: gateA.id, pinId: gateA.inputs[0].id },
      []
    )

    const result = topologicalSort(getState())
    expect(result.type).toBe('cycle')
  })

  it('returns involved gate IDs in cycle result', () => {
    const gateA = getState().addGate('Nand', { x: 0, y: 0, z: 0 })
    const gateB = getState().addGate('Nand', { x: 4, y: 0, z: 0 })

    getState().addWire(
      { type: 'gate', entityId: gateA.id, pinId: gateA.outputs[0].id },
      { type: 'gate', entityId: gateB.id, pinId: gateB.inputs[0].id },
      []
    )
    getState().addWire(
      { type: 'gate', entityId: gateB.id, pinId: gateB.outputs[0].id },
      { type: 'gate', entityId: gateA.id, pinId: gateA.inputs[0].id },
      []
    )

    const result = topologicalSort(getState())
    expect(result.type).toBe('cycle')
    if (result.type === 'cycle') {
      expect(result.involvedGateIds).toContain(gateA.id)
      expect(result.involvedGateIds).toContain(gateB.id)
    }
  })

  it('detects a self-loop: gate output wired to its own input', () => {
    const gate = getState().addGate('Nand', { x: 0, y: 0, z: 0 })

    getState().addWire(
      { type: 'gate', entityId: gate.id, pinId: gate.outputs[0].id },
      { type: 'gate', entityId: gate.id, pinId: gate.inputs[0].id },
      []
    )

    const result = topologicalSort(getState())
    expect(result.type).toBe('cycle')
    if (result.type === 'cycle') {
      expect(result.involvedGateIds).toContain(gate.id)
    }
  })

  it('ignores junctions — traces through to actual source', () => {
    const inputNode = getState().addInputNode('a', { x: 0, y: 0, z: 0 })
    const gate1 = getState().addGate('Not', { x: 4, y: 0, z: 0 })
    const gate2 = getState().addGate('And', { x: 8, y: 0, z: 0 })
    const junction = getState().addJunction('sig-a', { x: 2, y: 0, z: 0 })

    // input → gate1 (original wire, junction sits on it)
    const wire1 = getState().addWire(
      { type: 'input', entityId: inputNode.id },
      { type: 'gate', entityId: gate1.id, pinId: gate1.inputs[0].id },
      []
    )

    // gate1 → gate2
    getState().addWire(
      { type: 'gate', entityId: gate1.id, pinId: gate1.outputs[0].id },
      { type: 'gate', entityId: gate2.id, pinId: gate2.inputs[0].id },
      []
    )

    // junction → gate2 (second input, via junction from the input signal)
    const wire3 = getState().addWire(
      { type: 'junction', entityId: junction.id },
      { type: 'gate', entityId: gate2.id, pinId: gate2.inputs[1].id },
      []
    )

    // Junction wireIds[0] points to the original wire from input
    useCircuitStore.setState((state) => {
      const j = state.junctions.find((jn) => jn.id === junction.id)
      if (j) j.wireIds = [wire1.id, wire3.id]
    })

    const result = topologicalSort(getState())
    expect(result.type).toBe('success')
    if (result.type === 'success') {
      // gate1 before gate2 (gate1 feeds gate2 directly)
      // junction doesn't add a false dependency
      expect(result.order.indexOf(gate1.id)).toBeLessThan(result.order.indexOf(gate2.id))
    }
  })

  it('handles input-node-only sources (gates with in-degree 0)', () => {
    const inputA = getState().addInputNode('a', { x: 0, y: 0, z: 0 })
    const inputB = getState().addInputNode('b', { x: 0, y: 2, z: 0 })
    const gate = getState().addGate('And', { x: 4, y: 0, z: 0 })

    getState().addWire(
      { type: 'input', entityId: inputA.id },
      { type: 'gate', entityId: gate.id, pinId: gate.inputs[0].id },
      []
    )
    getState().addWire(
      { type: 'input', entityId: inputB.id },
      { type: 'gate', entityId: gate.id, pinId: gate.inputs[1].id },
      []
    )

    const result = topologicalSort(getState())
    expect(result.type).toBe('success')
    if (result.type === 'success') {
      expect(result.order).toEqual([gate.id])
    }
  })
})

describe('evaluateCircuit', () => {
  it('single NOT gate: input 0 → output 1', () => {
    const inputNode = getState().addInputNode('a', { x: 0, y: 0, z: 0 })
    const gate = getState().addGate('Not', { x: 4, y: 0, z: 0 })
    const outputNode = getState().addOutputNode('out', { x: 8, y: 0, z: 0 })

    getState().addWire(
      { type: 'input', entityId: inputNode.id },
      { type: 'gate', entityId: gate.id, pinId: gate.inputs[0].id },
      []
    )
    getState().addWire(
      { type: 'gate', entityId: gate.id, pinId: gate.outputs[0].id },
      { type: 'output', entityId: outputNode.id },
      []
    )

    getState().updateInputNodeValue(inputNode.id, 0)
    useCircuitStore.setState((state) => { evaluateCircuit(state) })

    expect(getState().gates[0].outputs[0].value).toBe(1)
    expect(getState().outputNodes[0].value).toBe(1)
  })

  it('single NAND gate: inputs 1,1 → output 0', () => {
    const inputA = getState().addInputNode('a', { x: 0, y: 0, z: 0 })
    const inputB = getState().addInputNode('b', { x: 0, y: 2, z: 0 })
    const gate = getState().addGate('Nand', { x: 4, y: 0, z: 0 })
    const outputNode = getState().addOutputNode('out', { x: 8, y: 0, z: 0 })

    getState().addWire(
      { type: 'input', entityId: inputA.id },
      { type: 'gate', entityId: gate.id, pinId: gate.inputs[0].id },
      []
    )
    getState().addWire(
      { type: 'input', entityId: inputB.id },
      { type: 'gate', entityId: gate.id, pinId: gate.inputs[1].id },
      []
    )
    getState().addWire(
      { type: 'gate', entityId: gate.id, pinId: gate.outputs[0].id },
      { type: 'output', entityId: outputNode.id },
      []
    )

    getState().updateInputNodeValue(inputA.id, 1)
    getState().updateInputNodeValue(inputB.id, 1)
    useCircuitStore.setState((state) => { evaluateCircuit(state) })

    expect(getState().gates[0].outputs[0].value).toBe(0)
    expect(getState().outputNodes[0].value).toBe(0)
  })

  it('two-layer NOT→AND: evaluates correctly in single pass', () => {
    // NOT(1)=0, AND(0,1)=0
    const inputA = getState().addInputNode('a', { x: 0, y: 0, z: 0 })
    const inputB = getState().addInputNode('b', { x: 0, y: 2, z: 0 })
    const notGate = getState().addGate('Not', { x: 4, y: 0, z: 0 })
    const andGate = getState().addGate('And', { x: 8, y: 0, z: 0 })
    const outputNode = getState().addOutputNode('out', { x: 12, y: 0, z: 0 })

    // inputA → NOT
    getState().addWire(
      { type: 'input', entityId: inputA.id },
      { type: 'gate', entityId: notGate.id, pinId: notGate.inputs[0].id },
      []
    )
    // NOT → AND.in0
    getState().addWire(
      { type: 'gate', entityId: notGate.id, pinId: notGate.outputs[0].id },
      { type: 'gate', entityId: andGate.id, pinId: andGate.inputs[0].id },
      []
    )
    // inputB → AND.in1
    getState().addWire(
      { type: 'input', entityId: inputB.id },
      { type: 'gate', entityId: andGate.id, pinId: andGate.inputs[1].id },
      []
    )
    // AND → output
    getState().addWire(
      { type: 'gate', entityId: andGate.id, pinId: andGate.outputs[0].id },
      { type: 'output', entityId: outputNode.id },
      []
    )

    getState().updateInputNodeValue(inputA.id, 1)
    getState().updateInputNodeValue(inputB.id, 1)
    useCircuitStore.setState((state) => { evaluateCircuit(state) })

    // NOT(1)=0, AND(0,1)=0
    expect(getState().gates[0].outputs[0].value).toBe(0) // NOT output
    expect(getState().gates[1].outputs[0].value).toBe(0) // AND output
    expect(getState().outputNodes[0].value).toBe(0)
  })

  it('three-layer NOT→AND→OR: evaluates correctly in single pass', () => {
    // NOT(1)=0, AND(0,1)=0, OR(0,1)=1
    const inputA = getState().addInputNode('a', { x: 0, y: 0, z: 0 })
    const inputB = getState().addInputNode('b', { x: 0, y: 2, z: 0 })
    const inputC = getState().addInputNode('c', { x: 0, y: 4, z: 0 })
    const notGate = getState().addGate('Not', { x: 4, y: 0, z: 0 })
    const andGate = getState().addGate('And', { x: 8, y: 0, z: 0 })
    const orGate = getState().addGate('Or', { x: 12, y: 0, z: 0 })
    const outputNode = getState().addOutputNode('out', { x: 16, y: 0, z: 0 })

    // inputA → NOT
    getState().addWire(
      { type: 'input', entityId: inputA.id },
      { type: 'gate', entityId: notGate.id, pinId: notGate.inputs[0].id },
      []
    )
    // NOT → AND.in0
    getState().addWire(
      { type: 'gate', entityId: notGate.id, pinId: notGate.outputs[0].id },
      { type: 'gate', entityId: andGate.id, pinId: andGate.inputs[0].id },
      []
    )
    // inputB → AND.in1
    getState().addWire(
      { type: 'input', entityId: inputB.id },
      { type: 'gate', entityId: andGate.id, pinId: andGate.inputs[1].id },
      []
    )
    // AND → OR.in0
    getState().addWire(
      { type: 'gate', entityId: andGate.id, pinId: andGate.outputs[0].id },
      { type: 'gate', entityId: orGate.id, pinId: orGate.inputs[0].id },
      []
    )
    // inputC → OR.in1
    getState().addWire(
      { type: 'input', entityId: inputC.id },
      { type: 'gate', entityId: orGate.id, pinId: orGate.inputs[1].id },
      []
    )
    // OR → output
    getState().addWire(
      { type: 'gate', entityId: orGate.id, pinId: orGate.outputs[0].id },
      { type: 'output', entityId: outputNode.id },
      []
    )

    getState().updateInputNodeValue(inputA.id, 1)
    getState().updateInputNodeValue(inputB.id, 1)
    getState().updateInputNodeValue(inputC.id, 1)
    useCircuitStore.setState((state) => { evaluateCircuit(state) })

    expect(getState().gates[0].outputs[0].value).toBe(0) // NOT(1)=0
    expect(getState().gates[1].outputs[0].value).toBe(0) // AND(0,1)=0
    expect(getState().gates[2].outputs[0].value).toBe(1) // OR(0,1)=1
    expect(getState().outputNodes[0].value).toBe(1)
  })

  it('fan-out: one input drives two NOT gates', () => {
    const inputNode = getState().addInputNode('a', { x: 0, y: 0, z: 0 })
    const gate1 = getState().addGate('Not', { x: 4, y: 0, z: -2 })
    const gate2 = getState().addGate('Not', { x: 4, y: 0, z: 2 })

    getState().addWire(
      { type: 'input', entityId: inputNode.id },
      { type: 'gate', entityId: gate1.id, pinId: gate1.inputs[0].id },
      []
    )
    getState().addWire(
      { type: 'input', entityId: inputNode.id },
      { type: 'gate', entityId: gate2.id, pinId: gate2.inputs[0].id },
      []
    )

    getState().updateInputNodeValue(inputNode.id, 1)
    useCircuitStore.setState((state) => { evaluateCircuit(state) })

    expect(getState().gates[0].outputs[0].value).toBe(0) // NOT(1)=0
    expect(getState().gates[1].outputs[0].value).toBe(0) // NOT(1)=0
  })

  it('fan-in: two inputs drive one AND gate', () => {
    const inputA = getState().addInputNode('a', { x: 0, y: 0, z: 0 })
    const inputB = getState().addInputNode('b', { x: 0, y: 2, z: 0 })
    const gate = getState().addGate('And', { x: 4, y: 0, z: 0 })

    getState().addWire(
      { type: 'input', entityId: inputA.id },
      { type: 'gate', entityId: gate.id, pinId: gate.inputs[0].id },
      []
    )
    getState().addWire(
      { type: 'input', entityId: inputB.id },
      { type: 'gate', entityId: gate.id, pinId: gate.inputs[1].id },
      []
    )

    getState().updateInputNodeValue(inputA.id, 1)
    getState().updateInputNodeValue(inputB.id, 1)
    useCircuitStore.setState((state) => { evaluateCircuit(state) })

    expect(getState().gates[0].outputs[0].value).toBe(1) // AND(1,1)=1
  })

  it('diamond: A→NOT1, A→NOT2, NOT1→AND.in0, NOT2→AND.in1', () => {
    const inputNode = getState().addInputNode('a', { x: 0, y: 0, z: 0 })
    const not1 = getState().addGate('Not', { x: 4, y: 0, z: -2 })
    const not2 = getState().addGate('Not', { x: 4, y: 0, z: 2 })
    const andGate = getState().addGate('And', { x: 8, y: 0, z: 0 })
    const outputNode = getState().addOutputNode('out', { x: 12, y: 0, z: 0 })

    getState().addWire(
      { type: 'input', entityId: inputNode.id },
      { type: 'gate', entityId: not1.id, pinId: not1.inputs[0].id },
      []
    )
    getState().addWire(
      { type: 'input', entityId: inputNode.id },
      { type: 'gate', entityId: not2.id, pinId: not2.inputs[0].id },
      []
    )
    getState().addWire(
      { type: 'gate', entityId: not1.id, pinId: not1.outputs[0].id },
      { type: 'gate', entityId: andGate.id, pinId: andGate.inputs[0].id },
      []
    )
    getState().addWire(
      { type: 'gate', entityId: not2.id, pinId: not2.outputs[0].id },
      { type: 'gate', entityId: andGate.id, pinId: andGate.inputs[1].id },
      []
    )
    getState().addWire(
      { type: 'gate', entityId: andGate.id, pinId: andGate.outputs[0].id },
      { type: 'output', entityId: outputNode.id },
      []
    )

    // Input=1 → NOT1(1)=0, NOT2(1)=0, AND(0,0)=0
    getState().updateInputNodeValue(inputNode.id, 1)
    useCircuitStore.setState((state) => { evaluateCircuit(state) })

    expect(getState().gates[0].outputs[0].value).toBe(0)
    expect(getState().gates[1].outputs[0].value).toBe(0)
    expect(getState().gates[2].outputs[0].value).toBe(0)
    expect(getState().outputNodes[0].value).toBe(0)
  })

  it('propagates to output nodes via wires', () => {
    const gate = getState().addGate('Not', { x: 0, y: 0, z: 0 })
    const outputNode = getState().addOutputNode('out', { x: 4, y: 0, z: 0 })

    getState().addWire(
      { type: 'gate', entityId: gate.id, pinId: gate.outputs[0].id },
      { type: 'output', entityId: outputNode.id },
      []
    )

    // NOT gate input defaults to 0, NOT(0)=1
    useCircuitStore.setState((state) => { evaluateCircuit(state) })

    expect(getState().outputNodes[0].value).toBe(1)
  })

  it('does not modify state on cycle detection', () => {
    const gateA = getState().addGate('Nand', { x: 0, y: 0, z: 0 })
    const gateB = getState().addGate('Nand', { x: 4, y: 0, z: 0 })

    getState().addWire(
      { type: 'gate', entityId: gateA.id, pinId: gateA.outputs[0].id },
      { type: 'gate', entityId: gateB.id, pinId: gateB.inputs[0].id },
      []
    )
    getState().addWire(
      { type: 'gate', entityId: gateB.id, pinId: gateB.outputs[0].id },
      { type: 'gate', entityId: gateA.id, pinId: gateA.inputs[0].id },
      []
    )

    // Capture state before eval
    const beforeOutputA = getState().gates[0].outputs[0].value
    const beforeOutputB = getState().gates[1].outputs[0].value

    useCircuitStore.setState((state) => { evaluateCircuit(state) })

    // State should not change due to cycle
    expect(getState().gates[0].outputs[0].value).toBe(beforeOutputA)
    expect(getState().gates[1].outputs[0].value).toBe(beforeOutputB)
  })

  it('returns status ok when evaluation succeeds', () => {
    getState().addGate('Not', { x: 0, y: 0, z: 0 })
    let outcome: EvaluateCircuitResult | undefined
    useCircuitStore.setState((state) => {
      outcome = evaluateCircuit(state)
    })
    expect(outcome?.status).toBe('ok')
  })

  it('returns status cycle when graph has combinational feedback', () => {
    const gateA = getState().addGate('Nand', { x: 0, y: 0, z: 0 })
    const gateB = getState().addGate('Nand', { x: 4, y: 0, z: 0 })
    getState().addWire(
      { type: 'gate', entityId: gateA.id, pinId: gateA.outputs[0].id },
      { type: 'gate', entityId: gateB.id, pinId: gateB.inputs[0].id },
      []
    )
    getState().addWire(
      { type: 'gate', entityId: gateB.id, pinId: gateB.outputs[0].id },
      { type: 'gate', entityId: gateA.id, pinId: gateA.inputs[0].id },
      []
    )
    let outcome: EvaluateCircuitResult | undefined
    useCircuitStore.setState((state) => {
      outcome = evaluateCircuit(state)
    })
    expect(outcome?.status).toBe('cycle')
    if (outcome?.status === 'cycle') {
      expect(outcome.involvedGateIds).toContain(gateA.id)
      expect(outcome.involvedGateIds).toContain(gateB.id)
    }
  })

  it('handles empty circuit (no gates, no wires)', () => {
    useCircuitStore.setState((state) => { evaluateCircuit(state) })
    // Should not throw
    expect(getState().gates).toHaveLength(0)
  })

  it('handles circuit with no wires (isolated gates)', () => {
    getState().addGate('Nand', { x: 0, y: 0, z: 0 })

    useCircuitStore.setState((state) => { evaluateCircuit(state) })

    // NAND with default inputs (0,0) → 1
    expect(getState().gates[0].outputs[0].value).toBe(1)
  })

  it('handles circuit with only input and output nodes (no gates, no wires)', () => {
    getState().addInputNode('a', { x: 0, y: 0, z: 0 })
    getState().addOutputNode('out', { x: 4, y: 0, z: 0 })

    useCircuitStore.setState((state) => { evaluateCircuit(state) })

    // No crash, output stays at default
    expect(getState().outputNodes[0].value).toBe(0)
  })

  it('junction fan-out: input→junction→gate1, junction→gate2', () => {
    const inputNode = getState().addInputNode('a', { x: 0, y: 0, z: 0 })
    const junction = getState().addJunction('sig-a', { x: 2, y: 0, z: 0 })
    const gate1 = getState().addGate('Not', { x: 4, y: 0, z: -2 })
    const gate2 = getState().addGate('Not', { x: 4, y: 0, z: 2 })

    // Original wire: input → gate1 (junction sits on it)
    const wire1 = getState().addWire(
      { type: 'input', entityId: inputNode.id },
      { type: 'gate', entityId: gate1.id, pinId: gate1.inputs[0].id },
      []
    )
    // Branch wire: junction → gate2
    const wire2 = getState().addWire(
      { type: 'junction', entityId: junction.id },
      { type: 'gate', entityId: gate2.id, pinId: gate2.inputs[0].id },
      []
    )

    useCircuitStore.setState((state) => {
      const j = state.junctions.find((jn) => jn.id === junction.id)
      if (j) j.wireIds = [wire1.id, wire2.id]
    })

    getState().updateInputNodeValue(inputNode.id, 1)
    useCircuitStore.setState((state) => { evaluateCircuit(state) })

    // Both NOT gates should see input=1, output NOT(1)=0
    expect(getState().gates[0].outputs[0].value).toBe(0)
    expect(getState().gates[1].outputs[0].value).toBe(0)
  })
})

describe('multi-bit propagation', () => {
  it('propagates a 16-bit input directly to a 16-bit output', () => {
    const input = getState().addInputNode('in', { x: 0, y: 0, z: 0 }, 16)
    const output = getState().addOutputNode('out', { x: 4, y: 0, z: 0 }, 16)
    getState().updateInputNodeValue(input.id, 0x1234)
    getState().addWire(
      { type: 'input', entityId: input.id },
      { type: 'output', entityId: output.id },
      []
    )
    useCircuitStore.setState((state) => { evaluateCircuit(state) })
    expect(getState().outputNodes.find((n) => n.id === output.id)?.value).toBe(0x1234)
  })

  it('clamps oversized values to destination width', () => {
    const input = getState().addInputNode('in', { x: 0, y: 0, z: 0 }, 16)
    const output = getState().addOutputNode('out', { x: 4, y: 0, z: 0 }, 16)
    getState().updateInputNodeValue(input.id, 0x1FFFF)
    getState().addWire(
      { type: 'input', entityId: input.id },
      { type: 'output', entityId: output.id },
      []
    )
    useCircuitStore.setState((state) => { evaluateCircuit(state) })
    expect(getState().outputNodes.find((n) => n.id === output.id)?.value).toBe(0xFFFF)
  })

  it('widens a default-width-1 gate to match a wide source instead of clamping (P05-13)', () => {
    const input = getState().addInputNode('in', { x: 0, y: 0, z: 0 }, 16)
    const gate = getState().addGate('Not', { x: 4, y: 0, z: 0 })
    getState().updateInputNodeValue(input.id, 0x0002)
    getState().addWire(
      { type: 'input', entityId: input.id },
      { type: 'gate', entityId: gate.id, pinId: gate.inputs[0].id },
      []
    )
    useCircuitStore.setState((state) => { evaluateCircuit(state) })
    const g = getState().gates.find((g) => g.id === gate.id)!
    expect(g.width).toBe(16)
    expect(g.inputs[0].value).toBe(0x0002)
  })

  it('treats legacy wires with missing width as width 1', () => {
    const input = getState().addInputNode('in', { x: 0, y: 0, z: 0 }, 1)
    const output = getState().addOutputNode('out', { x: 4, y: 0, z: 0 }, 1)
    getState().updateInputNodeValue(input.id, 1)
    getState().addWire(
      { type: 'input', entityId: input.id },
      { type: 'output', entityId: output.id },
      []
    )
    useCircuitStore.setState((state) => {
      for (const wire of state.wires) {
        delete (wire as { width?: number }).width
      }
    })
    useCircuitStore.setState((state) => { evaluateCircuit(state) })
    expect(getState().outputNodes.find((n) => n.id === output.id)?.value).toBe(1)
  })
})

describe('evaluateCircuit — hdl chips', () => {
  beforeEach(() => resetAppRegistriesForTests())

  it('evaluates a placed hdl chip on the canvas via evaluateChip', () => {
    // Register an HDL "HdlNot" into the user registry.
    // We use a unique name (not "Not") so builtin lookup doesn't shadow it,
    // ensuring the HDL evaluation path is exercised.
    getUserChipRegistry().register({
      name: 'HdlNot',
      inputs: [{ name: 'in', width: 1 }],
      outputs: [{ name: 'out', width: 1 }],
      implementation: { type: 'hdl', source: 'CHIP HdlNot { IN in; OUT out; PARTS: Nand(a=in, b=in, out=out); }' },
    })

    // Mirror the existing single-NOT-gate test pattern (evaluateCircuit describe,
    // "single NOT gate: input 0 → output 1"), swapping 'Not' for 'HdlNot'.
    const inputNode = getState().addInputNode('a', { x: 0, y: 0, z: 0 })
    const gate = getState().addGate('HdlNot', { x: 4, y: 0, z: 0 })
    const outputNode = getState().addOutputNode('out', { x: 8, y: 0, z: 0 })

    getState().addWire(
      { type: 'input', entityId: inputNode.id },
      { type: 'gate', entityId: gate.id, pinId: gate.inputs[0].id },
      []
    )
    getState().addWire(
      { type: 'gate', entityId: gate.id, pinId: gate.outputs[0].id },
      { type: 'output', entityId: outputNode.id },
      []
    )

    getState().updateInputNodeValue(inputNode.id, 0)
    let outcome: EvaluateCircuitResult | undefined
    useCircuitStore.setState((state) => {
      outcome = evaluateCircuit(state)
    })

    expect(outcome?.status).toBe('ok')
    // HdlNot(0) = Nand(0,0) = 1
    expect(getState().gates[0].outputs[0].value).toBe(1)
    expect(getState().outputNodes[0].value).toBe(1)
  })
})

describe('multi-bit gates', () => {
  // Phase 4 contract: primitive chips have fixed pin widths from the chip
  // registry. The legacy "Not at width 4" tests broadcasted the gate-level
  // `width` parameter to pin widths; that behavior was removed (see plan
  // note in
  // docs/plans/2026-05-24-builtin-chip-placement-standardization.md).
  // Multi-bit semantics now live in dedicated 16-bit chips (`Not16`,
  // `And16`, …) and are exercised here.

  it('Not16: 0x0007 input → 0xFFF8 output node', () => {
    const inNode = getState().addInputNode('in', { x: 0, y: 0, z: 0 }, 16)
    const not = getState().addGate('Not16', { x: 4, y: 0, z: 0 })
    const outNode = getState().addOutputNode('out', { x: 8, y: 0, z: 0 }, 16)
    getState().addWire(
      { type: 'input', entityId: inNode.id },
      { type: 'gate', entityId: not.id, pinId: not.inputs[0].id },
      []
    )
    getState().addWire(
      { type: 'gate', entityId: not.id, pinId: not.outputs[0].id },
      { type: 'output', entityId: outNode.id },
      []
    )
    getState().updateInputNodeValue(inNode.id, 0x0007)

    useCircuitStore.setState((state) => { evaluateCircuit(state) })

    expect(getState().outputNodes.find((n) => n.id === outNode.id)?.value).toBe(0xFFF8)
  })

  it('And16: 0xF0F0 & 0x0F0F = 0x0000', () => {
    const a = getState().addInputNode('a', { x: 0, y: 0, z: 0 }, 16)
    const b = getState().addInputNode('b', { x: 0, y: 0, z: 4 }, 16)
    const g = getState().addGate('And16', { x: 4, y: 0, z: 0 })
    const o = getState().addOutputNode('o', { x: 8, y: 0, z: 0 }, 16)
    getState().addWire({ type: 'input', entityId: a.id }, { type: 'gate', entityId: g.id, pinId: g.inputs[0].id }, [])
    getState().addWire({ type: 'input', entityId: b.id }, { type: 'gate', entityId: g.id, pinId: g.inputs[1].id }, [])
    getState().addWire({ type: 'gate', entityId: g.id, pinId: g.outputs[0].id }, { type: 'output', entityId: o.id }, [])
    getState().updateInputNodeValue(a.id, 0xF0F0)
    getState().updateInputNodeValue(b.id, 0x0F0F)

    useCircuitStore.setState((state) => { evaluateCircuit(state) })

    expect(getState().outputNodes.find((n) => n.id === o.id)?.value).toBe(0x0000)
  })

  // User-reported (2026-05-22): width was set on the input node AFTER wiring.
  // The cascade from `updateInputNodeWidth` to wire widths is the regression
  // guard. We now route through `Not16` (fixed-16) so the gate's input pin
  // width is always 16; the assertion verifies the wire-side cascade still
  // delivers the full multi-bit value to the gate.
  it('width set on input node AFTER wiring: wire cascade still feeds Not16', () => {
    const inNode = getState().addInputNode('in', { x: 0, y: 0, z: 0 }, 1)
    const not = getState().addGate('Not16', { x: 4, y: 0, z: 0 })
    const outNode = getState().addOutputNode('out', { x: 8, y: 0, z: 0 }, 16)
    getState().addWire(
      { type: 'input', entityId: inNode.id },
      { type: 'gate', entityId: not.id, pinId: not.inputs[0].id },
      []
    )
    getState().addWire(
      { type: 'gate', entityId: not.id, pinId: not.outputs[0].id },
      { type: 'output', entityId: outNode.id },
      []
    )

    getState().updateInputNodeWidth(inNode.id, 16)
    getState().updateInputNodeValue(inNode.id, 0x000B)

    useCircuitStore.setState((state) => { evaluateCircuit(state) })

    expect(getState().outputNodes.find((n) => n.id === outNode.id)?.value).toBe(0xFFF4)
  })
})

describe('undriven input pins (B-008)', () => {
  it('clears a gate input pin that no wire drives', () => {
    const gate = getState().addGate('Nand', { x: 0, y: 0, z: 0 })
    getState().setInputValue(gate.id, gate.inputs[0].id, 1)
    getState().setInputValue(gate.id, gate.inputs[1].id, 1)

    useCircuitStore.setState((state) => { evaluateCircuit(state) })

    expect(getState().gates[0].inputs.map((p) => p.value)).toEqual([0, 0])
    expect(getState().gates[0].outputs[0].value).toBe(1)
  })

  it('leaves a gate input pin that a wire still drives', () => {
    const a = getState().addInputNode('a', { x: 0, y: 0, z: 0 })
    const gate = getState().addGate('Nand', { x: 4, y: 0, z: 0 })
    getState().addWire(
      { type: 'input', entityId: a.id },
      { type: 'gate', entityId: gate.id, pinId: gate.inputs[0].id },
      []
    )
    getState().updateInputNodeValue(a.id, 1)

    useCircuitStore.setState((state) => { evaluateCircuit(state) })

    expect(getState().gates[0].inputs.map((p) => p.value)).toEqual([1, 0])
  })
})

// ── #356: a junction's feed wire is found by structure, not by `wireIds[0]` ────────────────────
//
// HACER's fan-out model: a junction sits *on* a trunk wire; branch wires start at the junction.
// `wireIds` records both, and nothing keeps the trunk first — `removeWire` splices the trunk out
// and re-attaching a wire appends it last, so a branch can end up at `wireIds[0]`.
describe('junction feed wire — structural trace (#356)', () => {
  /** `input a` → Not1 (trunk, junction sits on it); junction → Not2, Not3 (branches). */
  function buildFanOut() {
    const a = getState().addInputNode('a', { x: 0, y: 0, z: 0 })
    const not1 = getState().addGate('Not', { x: 6, y: 0, z: -2 })
    const not2 = getState().addGate('Not', { x: 6, y: 0, z: 0 })
    const not3 = getState().addGate('Not', { x: 6, y: 0, z: 2 })
    const junction = getState().addJunction('sig-a', { x: 3, y: 0, z: 0 })

    const trunk = getState().addWire(
      { type: 'input', entityId: a.id },
      { type: 'gate', entityId: not1.id, pinId: not1.inputs[0].id },
      []
    )
    const branch1 = getState().addWire(
      { type: 'junction', entityId: junction.id },
      { type: 'gate', entityId: not2.id, pinId: not2.inputs[0].id },
      []
    )
    const branch2 = getState().addWire(
      { type: 'junction', entityId: junction.id },
      { type: 'gate', entityId: not3.id, pinId: not3.inputs[0].id },
      []
    )
    return { a, not1, not2, not3, junction, trunk, branch1, branch2 }
  }

  function setWireIds(junctionId: string, wireIds: string[]) {
    useCircuitStore.setState((state) => {
      const j = state.junctions.find((x) => x.id === junctionId)
      if (j) j.wireIds = wireIds
    })
  }

  /** Every gate output for `a = 0` then `a = 1`, keyed by gate id — the circuit's truth table. */
  function truthTable(inputNodeId: string): Record<string, number[]> {
    const rows: Record<string, number[]> = {}
    for (const value of [0, 1]) {
      getState().updateInputNodeValue(inputNodeId, value)
      useCircuitStore.setState((state) => { evaluateCircuit(state) })
      for (const gate of getState().gates) {
        rows[gate.id] = [...(rows[gate.id] ?? []), gate.outputs[0].value]
      }
    }
    return rows
  }

  it('evaluates a junction whose wireIds[0] is a branch wire', () => {
    const c = buildFanOut()
    setWireIds(c.junction.id, [c.branch1.id, c.branch2.id, c.trunk.id])

    getState().updateInputNodeValue(c.a.id, 1)
    useCircuitStore.setState((state) => { evaluateCircuit(state) })

    // All three gates are Not(a); with a = 1 every one of them outputs 0.
    const byId = new Map(getState().gates.map((g) => [g.id, g.outputs[0].value]))
    expect(byId.get(c.not1.id)).toBe(0)
    expect(byId.get(c.not2.id)).toBe(0)
    expect(byId.get(c.not3.id)).toBe(0)
  })

  it('evaluates identically with wireIds reversed', () => {
    const forward = buildFanOut()
    setWireIds(forward.junction.id, [forward.trunk.id, forward.branch1.id, forward.branch2.id])
    const forwardRows = Object.values(truthTable(forward.a.id))

    useCircuitStore.setState({ gates: [], wires: [], inputNodes: [], outputNodes: [], junctions: [] })

    const reversed = buildFanOut()
    setWireIds(reversed.junction.id, [reversed.branch2.id, reversed.branch1.id, reversed.trunk.id])
    const reversedRows = Object.values(truthTable(reversed.a.id))

    expect(reversedRows).toEqual(forwardRows)
  })

  it('traces a junction chain whose junctions are both branch-first', () => {
    const c = buildFanOut()
    // A second junction sits on branch1 and feeds Not4.
    const not4 = getState().addGate('Not', { x: 9, y: 0, z: 0 })
    const junction2 = getState().addJunction('sig-a', { x: 5, y: 0, z: 0 })
    const branch3 = getState().addWire(
      { type: 'junction', entityId: junction2.id },
      { type: 'gate', entityId: not4.id, pinId: not4.inputs[0].id },
      []
    )
    setWireIds(c.junction.id, [c.branch1.id, c.branch2.id, c.trunk.id])
    setWireIds(junction2.id, [branch3.id, c.branch1.id])

    getState().updateInputNodeValue(c.a.id, 1)
    useCircuitStore.setState((state) => { evaluateCircuit(state) })

    const byId = new Map(getState().gates.map((g) => [g.id, g.outputs[0].value]))
    expect(byId.get(c.not2.id)).toBe(0)
    expect(byId.get(not4.id)).toBe(0)
  })

  it('follows a wire whose `to` endpoint is the junction', () => {
    const a = getState().addInputNode('a', { x: 0, y: 0, z: 0 })
    const not1 = getState().addGate('Not', { x: 6, y: 0, z: 0 })
    const junction = getState().addJunction('sig-a', { x: 3, y: 0, z: 0 })

    // The feed terminates at the junction; the branch leaves it and is listed first.
    const feed = getState().addWire(
      { type: 'input', entityId: a.id },
      { type: 'junction', entityId: junction.id },
      []
    )
    const branch = getState().addWire(
      { type: 'junction', entityId: junction.id },
      { type: 'gate', entityId: not1.id, pinId: not1.inputs[0].id },
      []
    )
    setWireIds(junction.id, [branch.id, feed.id])

    getState().updateInputNodeValue(a.id, 1)
    useCircuitStore.setState((state) => { evaluateCircuit(state) })

    expect(getState().gates[0].outputs[0].value).toBe(0)
  })

  it('orders gates through a branch-first junction', () => {
    // `sink` is created first on purpose: with no dependency edge it would be scheduled first.
    const sink = getState().addGate('Not', { x: 8, y: 0, z: 0 })
    const source = getState().addGate('Not', { x: 0, y: 0, z: 0 })
    const passThrough = getState().addGate('Not', { x: 4, y: 0, z: 4 })
    const junction = getState().addJunction('sig-src', { x: 2, y: 0, z: 0 })

    const trunk = getState().addWire(
      { type: 'gate', entityId: source.id, pinId: source.outputs[0].id },
      { type: 'gate', entityId: passThrough.id, pinId: passThrough.inputs[0].id },
      []
    )
    const branch = getState().addWire(
      { type: 'junction', entityId: junction.id },
      { type: 'gate', entityId: sink.id, pinId: sink.inputs[0].id },
      []
    )
    setWireIds(junction.id, [branch.id, trunk.id])

    const result = topologicalSort(getState())
    expect(result.type).toBe('success')
    if (result.type === 'success') {
      expect(result.order.indexOf(source.id)).toBeLessThan(result.order.indexOf(sink.id))
    }
  })

  it('reads a junction with no feed wire as floating (0) and still evaluates', () => {
    const c = buildFanOut()
    // Malformed document: the junction lists only wires that start at it.
    setWireIds(c.junction.id, [c.branch1.id, c.branch2.id])

    const result = topologicalSort(getState())
    expect(result.type).toBe('success')

    expect(truthTable(c.a.id)[c.not2.id]).toEqual([1, 1])
    expect(truthTable(c.a.id)[c.not1.id]).toEqual([1, 0])
  })

  // Delete-and-re-add is how `wireIds` ends up branch-first through ordinary use. It is NOT by
  // itself enough to make the evaluator read the wrong value: `completeJunctionWiring` copies the
  // trunk's source into every branch (`wiringActions.ts`), so the wires a junction lists share a
  // `from` and index 0 is harmless. The wrong values need a branch whose `from` IS the junction —
  // a shape serialization permits and no store action writes today. Both are covered here.
  it('survives the trunk being deleted and re-added (wireIds becomes branch-first)', () => {
    const c = buildFanOut()
    setWireIds(c.junction.id, [c.trunk.id, c.branch1.id, c.branch2.id])

    // `removeWire` splices the trunk out of `wireIds`; the junction survives on its two branches.
    getState().removeWire(c.trunk.id)
    expect(getState().junctions[0].wireIds).toEqual([c.branch1.id, c.branch2.id])

    // Re-drawing the wire and re-attaching it appends it *last*, as `completeWiringFromJunction` does.
    const trunk2 = getState().addWire(
      { type: 'input', entityId: c.a.id },
      { type: 'gate', entityId: c.not1.id, pinId: c.not1.inputs[0].id },
      []
    )
    useCircuitStore.setState((state) => {
      const j = state.junctions[0]
      if (j && !j.wireIds.includes(trunk2.id)) j.wireIds.push(trunk2.id)
    })
    expect(getState().junctions[0].wireIds[0]).toBe(c.branch1.id)

    const rows = truthTable(c.a.id)
    expect(rows[c.not2.id]).toEqual(rows[c.not1.id])
    expect(rows[c.not3.id]).toEqual(rows[c.not1.id])
  })
})
