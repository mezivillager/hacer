import { describe, it, expect, beforeEach } from 'vitest'
import { useCircuitStore } from '@/store/circuitStore'
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
    const gate = getState().addGate('NAND', { x: 0, y: 0, z: 0 })
    const result = topologicalSort(getState())
    expect(result.type).toBe('success')
    if (result.type === 'success') {
      expect(result.order).toEqual([gate.id])
    }
  })

  it('sorts two-gate chain: gate1 → gate2', () => {
    const gate1 = getState().addGate('NAND', { x: 0, y: 0, z: 0 })
    const gate2 = getState().addGate('NAND', { x: 4, y: 0, z: 0 })

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
    const gate1 = getState().addGate('NOT', { x: 0, y: 0, z: 0 })
    const gate2 = getState().addGate('AND', { x: 4, y: 0, z: 0 })
    const gate3 = getState().addGate('OR', { x: 8, y: 0, z: 0 })

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
    const gate1 = getState().addGate('NAND', { x: 0, y: 0, z: 0 })
    const gate2 = getState().addGate('NOT', { x: 4, y: 0, z: -2 })
    const gate3 = getState().addGate('NOT', { x: 4, y: 0, z: 2 })

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
    const gate1 = getState().addGate('NOT', { x: 0, y: 0, z: -2 })
    const gate2 = getState().addGate('NOT', { x: 0, y: 0, z: 2 })
    const gate3 = getState().addGate('AND', { x: 4, y: 0, z: 0 })

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
    const gateA = getState().addGate('NOT', { x: 0, y: 0, z: 0 })
    const gateB = getState().addGate('NOT', { x: 4, y: 0, z: -2 })
    const gateC = getState().addGate('NOT', { x: 4, y: 0, z: 2 })
    const gateD = getState().addGate('AND', { x: 8, y: 0, z: 0 })

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
    const gate1 = getState().addGate('NAND', { x: 0, y: 0, z: 0 })
    const gate2 = getState().addGate('NOT', { x: 4, y: 0, z: 0 })

    const result = topologicalSort(getState())
    expect(result.type).toBe('success')
    if (result.type === 'success') {
      expect(result.order).toHaveLength(2)
      expect(result.order).toContain(gate1.id)
      expect(result.order).toContain(gate2.id)
    }
  })

  it('detects a cycle: gate A → gate B → gate A', () => {
    const gateA = getState().addGate('NAND', { x: 0, y: 0, z: 0 })
    const gateB = getState().addGate('NAND', { x: 4, y: 0, z: 0 })

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
    const gateA = getState().addGate('NAND', { x: 0, y: 0, z: 0 })
    const gateB = getState().addGate('NAND', { x: 4, y: 0, z: 0 })

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
    const gate = getState().addGate('NAND', { x: 0, y: 0, z: 0 })

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
    const gate1 = getState().addGate('NOT', { x: 4, y: 0, z: 0 })
    const gate2 = getState().addGate('AND', { x: 8, y: 0, z: 0 })
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
    const gate = getState().addGate('AND', { x: 4, y: 0, z: 0 })

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
    const gate = getState().addGate('NOT', { x: 4, y: 0, z: 0 })
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
    const gate = getState().addGate('NAND', { x: 4, y: 0, z: 0 })
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
    const notGate = getState().addGate('NOT', { x: 4, y: 0, z: 0 })
    const andGate = getState().addGate('AND', { x: 8, y: 0, z: 0 })
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
    const notGate = getState().addGate('NOT', { x: 4, y: 0, z: 0 })
    const andGate = getState().addGate('AND', { x: 8, y: 0, z: 0 })
    const orGate = getState().addGate('OR', { x: 12, y: 0, z: 0 })
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
    const gate1 = getState().addGate('NOT', { x: 4, y: 0, z: -2 })
    const gate2 = getState().addGate('NOT', { x: 4, y: 0, z: 2 })

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
    const gate = getState().addGate('AND', { x: 4, y: 0, z: 0 })

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
    const not1 = getState().addGate('NOT', { x: 4, y: 0, z: -2 })
    const not2 = getState().addGate('NOT', { x: 4, y: 0, z: 2 })
    const andGate = getState().addGate('AND', { x: 8, y: 0, z: 0 })
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
    const gate = getState().addGate('NOT', { x: 0, y: 0, z: 0 })
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
    const gateA = getState().addGate('NAND', { x: 0, y: 0, z: 0 })
    const gateB = getState().addGate('NAND', { x: 4, y: 0, z: 0 })

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
    getState().addGate('NOT', { x: 0, y: 0, z: 0 })
    let outcome: EvaluateCircuitResult | undefined
    useCircuitStore.setState((state) => {
      outcome = evaluateCircuit(state)
    })
    expect(outcome?.status).toBe('ok')
  })

  it('returns status cycle when graph has combinational feedback', () => {
    const gateA = getState().addGate('NAND', { x: 0, y: 0, z: 0 })
    const gateB = getState().addGate('NAND', { x: 4, y: 0, z: 0 })
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
    getState().addGate('NAND', { x: 0, y: 0, z: 0 })

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
    const gate1 = getState().addGate('NOT', { x: 4, y: 0, z: -2 })
    const gate2 = getState().addGate('NOT', { x: 4, y: 0, z: 2 })

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
