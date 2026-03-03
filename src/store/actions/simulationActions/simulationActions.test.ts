import { describe, it, expect, beforeEach } from 'vitest'
import { useCircuitStore } from '../../circuitStore'
import { getSignalSourceValue } from './simulationActions'

// Helper to get store state
const getState = () => useCircuitStore.getState()

describe('simulationActions', () => {
  beforeEach(() => {
    // Reset store state before each test
    useCircuitStore.setState({
      gates: [],
      wires: [],
      selectedGateId: null,
      selectedWireId: null,
      simulationRunning: false,
      simulationSpeed: 100,
      placementMode: null,
      wiringFrom: null,
      // Node state fields
      inputNodes: [],
      outputNodes: [],
      constantNodes: [],
      junctions: [],
      nodePlacementMode: null,
      selectedNodeId: null,
      selectedNodeType: null,
    })
  })

  describe('toggleSimulation', () => {
    it('toggles simulation running state', () => {
      expect(getState().simulationRunning).toBe(false)

      getState().toggleSimulation()
      expect(getState().simulationRunning).toBe(true)

      getState().toggleSimulation()
      expect(getState().simulationRunning).toBe(false)
    })
  })

  describe('setSimulationSpeed', () => {
    it('sets simulation speed', () => {
      getState().setSimulationSpeed(200)

      expect(getState().simulationSpeed).toBe(200)
    })
  })

  describe('clearCircuit', () => {
    it('clears all gates and wires', () => {
      const gate1 = getState().addGate('NAND', { x: 0, y: 0, z: 0 })
      const gate2 = getState().addGate('NAND', { x: 2, y: 0, z: 0 })
      getState().addWire(
        { type: 'gate', entityId: gate1.id, pinId: gate1.outputs[0].id },
        { type: 'gate', entityId: gate2.id, pinId: gate2.inputs[0].id },
        []
      )
      getState().selectGate(gate1.id)

      getState().clearCircuit()

      expect(getState().gates).toHaveLength(0)
      expect(getState().wires).toHaveLength(0)
      expect(getState().selectedGateId).toBe(null)
    })

    it('clears placement mode', () => {
      useCircuitStore.setState({ placementMode: 'NAND' })

      getState().clearCircuit()

      expect(getState().placementMode).toBe(null)
    })

    it('clears all nodes and junctions', () => {
      // Add some nodes
      getState().addInputNode('a', { x: 0, y: 0, z: 0 })
      getState().addOutputNode('out', { x: 10, y: 0, z: 0 })
      getState().addConstantNode(true, { x: -2, y: 0, z: 0 })

      // Verify they exist
      expect(getState().inputNodes).toHaveLength(1)
      expect(getState().outputNodes).toHaveLength(1)
      expect(getState().constantNodes).toHaveLength(1)

      getState().clearCircuit()

      expect(getState().inputNodes).toHaveLength(0)
      expect(getState().outputNodes).toHaveLength(0)
      expect(getState().constantNodes).toHaveLength(0)
      expect(getState().junctions).toHaveLength(0)
      expect(getState().wires).toHaveLength(0)
    })

    it('clears node selection and node placement mode', () => {
      useCircuitStore.setState({
        selectedNodeId: 'some-node',
        selectedNodeType: 'input',
        nodePlacementMode: 'INPUT',
      })

      getState().clearCircuit()

      expect(getState().selectedNodeId).toBe(null)
      expect(getState().selectedNodeType).toBe(null)
      expect(getState().nodePlacementMode).toBe(null)
    })
  })

  describe('simulationTick', () => {
    it('propagates output values through wires to inputs', () => {
      const gate1 = getState().addGate('NAND', { x: 0, y: 0, z: 0 })
      const gate2 = getState().addGate('NAND', { x: 2, y: 0, z: 0 })

      getState().addWire(
        { type: 'gate', entityId: gate1.id, pinId: gate1.outputs[0].id },
        { type: 'gate', entityId: gate2.id, pinId: gate2.inputs[0].id },
        []
      )

      // Set gate1 inputs to true, true -> NAND output should be false
      getState().setInputValue(gate1.id, gate1.inputs[0].id, true)
      getState().setInputValue(gate1.id, gate1.inputs[1].id, true)

      // Run tick to calculate gate1 output
      getState().simulationTick()

      // Gate1 output should now be false (NAND(true, true) = false)
      expect(getState().gates[0].outputs[0].value).toBe(false)

      // Run another tick to propagate to gate2
      getState().simulationTick()

      // Gate2 input should receive gate1 output value
      expect(getState().gates[1].inputs[0].value).toBe(false)
    })

    it('calculates new output values for all gates', () => {
      const gate = getState().addGate('NAND', { x: 0, y: 0, z: 0 })

      // Set both inputs to true -> NAND output should be false
      getState().setInputValue(gate.id, gate.inputs[0].id, true)
      getState().setInputValue(gate.id, gate.inputs[1].id, true)

      getState().simulationTick()

      // Gate output should be calculated (NAND(true, true) = false)
      expect(getState().gates[0].outputs[0].value).toBe(false)
    })

    it('handles gates with no wires', () => {
      getState().addGate('NAND', { x: 0, y: 0, z: 0 })

      getState().simulationTick()

      // Should not throw, output should be calculated based on inputs
      expect(getState().gates[0].outputs[0].value).toBeDefined()
    })
  })

  describe('getSignalSourceValue', () => {
    it('returns input node value for input source type', () => {
      const inputNode = getState().addInputNode('a', { x: 0, y: 0, z: 0 })
      getState().updateInputNodeValue(inputNode.id, true)

      const value = getSignalSourceValue(
        { type: 'input', entityId: inputNode.id },
        getState()
      )

      expect(value).toBe(true)
    })

    it('returns false for non-existent input node', () => {
      const value = getSignalSourceValue(
        { type: 'input', entityId: 'non-existent' },
        getState()
      )

      expect(value).toBe(false)
    })

    it('returns constant node value for constant source type', () => {
      const constNode = getState().addConstantNode(true, { x: 0, y: 0, z: 0 })

      const value = getSignalSourceValue(
        { type: 'constant', entityId: constNode.id },
        getState()
      )

      expect(value).toBe(true)
    })

    it('returns false constant node value', () => {
      const constNode = getState().addConstantNode(false, { x: 0, y: 0, z: 0 })

      const value = getSignalSourceValue(
        { type: 'constant', entityId: constNode.id },
        getState()
      )

      expect(value).toBe(false)
    })

    it('returns gate output value for gate source type', () => {
      const gate = getState().addGate('NAND', { x: 0, y: 0, z: 0 })
      // Set inputs to false, false -> NAND output should be true
      getState().simulationTick()

      const value = getSignalSourceValue(
        { type: 'gate', entityId: gate.id, pinId: gate.outputs[0].id },
        getState()
      )

      expect(value).toBe(true) // NAND(false, false) = true
    })

    it('returns false for non-existent gate', () => {
      const value = getSignalSourceValue(
        { type: 'gate', entityId: 'non-existent', pinId: 'pin-1' },
        getState()
      )

      expect(value).toBe(false)
    })

    it('returns false for output source type (invalid)', () => {
      const outputNode = getState().addOutputNode('out', { x: 0, y: 0, z: 0 })

      const value = getSignalSourceValue(
        { type: 'output', entityId: outputNode.id },
        getState()
      )

      expect(value).toBe(false)
    })

    it('returns false and does not infinitely recurse on junction cycle', () => {
      // Create two junctions that feed each other (malformed circuit)
      const junction1 = getState().addJunction('sig-a', { x: 0, y: 0, z: 0 })
      const junction2 = getState().addJunction('sig-a', { x: 4, y: 0, z: 0 })

      // Junction1 -> Junction2
      getState().addWire(
        { type: 'junction', entityId: junction1.id },
        { type: 'junction', entityId: junction2.id },
        [],
        [],
        'sig-a'
      )

      // Junction2 -> Junction1 (creates a cycle)
      getState().addWire(
        { type: 'junction', entityId: junction2.id },
        { type: 'junction', entityId: junction1.id },
        [],
        [],
        'sig-a'
      )

      // Should not throw or hang, should return false
      const value = getSignalSourceValue(
        { type: 'junction', entityId: junction1.id },
        getState()
      )

      expect(value).toBe(false)
    })

    it('handles deeply nested junctions correctly', () => {
      // Chain: input -> wire1 (j1) -> wire2 (j2) -> wire3 (j3)
      // Each junction's wireIds[0] points to the wire that carries the signal
      const inputNode = getState().addInputNode('a', { x: 0, y: 0, z: 0 })
      const j1 = getState().addJunction('sig-a', { x: 2, y: 0, z: 0 })
      const j2 = getState().addJunction('sig-a', { x: 4, y: 0, z: 0 })
      const j3 = getState().addJunction('sig-a', { x: 6, y: 0, z: 0 })

      // Original wire from input (j1 sits on this wire)
      const wire1 = getState().addWire(
        { type: 'input', entityId: inputNode.id },
        { type: 'gate', entityId: 'gate-1', pinId: 'in' },
        [], [], 'sig-a'
      )
      // Branch wire from j1 (j2 sits on this wire)
      const wire2 = getState().addWire(
        { type: 'input', entityId: inputNode.id },
        { type: 'gate', entityId: 'gate-2', pinId: 'in' },
        [], [], 'sig-a'
      )
      // Branch wire from j2 (j3 sits on this wire)
      const wire3 = getState().addWire(
        { type: 'input', entityId: inputNode.id },
        { type: 'gate', entityId: 'gate-3', pinId: 'in' },
        [], [], 'sig-a'
      )

      // Update wireIds to set up the chain
      useCircuitStore.setState((state) => {
        const jn1 = state.junctions.find((j) => j.id === j1.id)
        if (jn1) jn1.wireIds = [wire1.id]
        const jn2 = state.junctions.find((j) => j.id === j2.id)
        if (jn2) jn2.wireIds = [wire2.id]
        const jn3 = state.junctions.find((j) => j.id === j3.id)
        if (jn3) jn3.wireIds = [wire3.id]
      })

      getState().updateInputNodeValue(inputNode.id, true)

      // j3 -> wireIds[0] = wire3 -> from = input node (value=true)
      const value = getSignalSourceValue(
        { type: 'junction', entityId: j3.id },
        getState()
      )

      expect(value).toBe(true)
    })
  })

  describe('getSignalSourceValue - junction', () => {
    it('resolves junction value through wireIds[0]', () => {
      const gate = getState().addGate('NAND', { x: 0, y: 0, z: 0 })

      // NAND(false, false) = true
      getState().simulationTick()

      const wire = getState().addWire(
        { type: 'gate', entityId: gate.id, pinId: gate.outputs[0].id },
        { type: 'gate', entityId: 'dest-gate', pinId: 'dest-pin' },
        []
      )

      // Create junction with wireIds[0] pointing to the wire from the gate output
      const junction = getState().addJunction('sig-test', { x: 2, y: 0, z: 0 })
      useCircuitStore.setState((state) => {
        const j = state.junctions.find((j) => j.id === junction.id)
        if (j) j.wireIds = [wire.id]
      })

      const value = getSignalSourceValue(
        { type: 'junction', entityId: junction.id },
        getState()
      )

      expect(value).toBe(true)
    })

    it('returns false for junction with no wireIds', () => {
      const junction = getState().addJunction('sig-test', { x: 0, y: 0, z: 0 })

      const value = getSignalSourceValue(
        { type: 'junction', entityId: junction.id },
        getState()
      )

      expect(value).toBe(false)
    })

    it('returns false for junction with non-existent wire', () => {
      const junction = getState().addJunction('sig-test', { x: 0, y: 0, z: 0 })
      useCircuitStore.setState((state) => {
        const j = state.junctions.find((j) => j.id === junction.id)
        if (j) j.wireIds = ['non-existent-wire']
      })

      const value = getSignalSourceValue(
        { type: 'junction', entityId: junction.id },
        getState()
      )

      expect(value).toBe(false)
    })

    it('handles cycle detection', () => {
      const junctionA = getState().addJunction('sig-a', { x: 0, y: 0, z: 0 })
      const junctionB = getState().addJunction('sig-a', { x: 4, y: 0, z: 0 })

      // Wire from junctionB -> junctionA
      const wireBA = getState().addWire(
        { type: 'junction', entityId: junctionB.id },
        { type: 'junction', entityId: junctionA.id },
        [],
        [],
        'sig-a'
      )

      // Wire from junctionA -> junctionB
      const wireAB = getState().addWire(
        { type: 'junction', entityId: junctionA.id },
        { type: 'junction', entityId: junctionB.id },
        [],
        [],
        'sig-a'
      )

      // Set wireIds so each junction traces to the other
      useCircuitStore.setState((state) => {
        const jA = state.junctions.find((j) => j.id === junctionA.id)
        const jB = state.junctions.find((j) => j.id === junctionB.id)
        if (jA) jA.wireIds = [wireBA.id]
        if (jB) jB.wireIds = [wireAB.id]
      })

      const value = getSignalSourceValue(
        { type: 'junction', entityId: junctionA.id },
        getState()
      )

      expect(value).toBe(false)
    })
  })

  describe('simulationTick with wires', () => {
    it('propagates input node value to gate input via wire', () => {
      // Create input node and gate
      const inputNode = getState().addInputNode('a', { x: 0, y: 0, z: 0 })
      const gate = getState().addGate('NOT', { x: 4, y: 0.2, z: 0 })

      // Create wire from input to gate input
      getState().addWire(
        { type: 'input', entityId: inputNode.id },
        { type: 'gate', entityId: gate.id, pinId: gate.inputs[0].id },
        [],
        [],
        'signal-a'
      )

      // Set input node to true
      getState().updateInputNodeValue(inputNode.id, true)

      // Run simulation tick
      getState().simulationTick()

      // Gate input should receive the input node value
      expect(getState().gates[0].inputs[0].value).toBe(true)
      // NOT gate output should be false (NOT(true) = false)
      expect(getState().gates[0].outputs[0].value).toBe(false)
    })

    it('propagates constant node value to gate input via wire', () => {
      // Create constant node (true) and gate
      const constNode = getState().addConstantNode(true, { x: 0, y: 0, z: 0 })
      const gate = getState().addGate('NOT', { x: 4, y: 0.2, z: 0 })

      // Create wire from constant to gate input
      getState().addWire(
        { type: 'constant', entityId: constNode.id },
        { type: 'gate', entityId: gate.id, pinId: gate.inputs[0].id },
        [],
        [],
        'signal-const'
      )

      // Run simulation tick
      getState().simulationTick()

      // Gate input should receive the constant value
      expect(getState().gates[0].inputs[0].value).toBe(true)
      // NOT gate output should be false
      expect(getState().gates[0].outputs[0].value).toBe(false)
    })

    it('propagates false constant to gate input', () => {
      const constNode = getState().addConstantNode(false, { x: 0, y: 0, z: 0 })
      const gate = getState().addGate('NOT', { x: 4, y: 0.2, z: 0 })

      getState().addWire(
        { type: 'constant', entityId: constNode.id },
        { type: 'gate', entityId: gate.id, pinId: gate.inputs[0].id },
        [],
        [],
        'signal-const'
      )

      getState().simulationTick()

      expect(getState().gates[0].inputs[0].value).toBe(false)
      // NOT gate output should be true (NOT(false) = true)
      expect(getState().gates[0].outputs[0].value).toBe(true)
    })

    it('propagates gate output to output node via wire', () => {
      // Create gate and output node
      const gate = getState().addGate('NOT', { x: 0, y: 0.2, z: 0 })
      const outputNode = getState().addOutputNode('out', { x: 4, y: 0, z: 0 })

      // Create wire from gate output to output node
      getState().addWire(
        { type: 'gate', entityId: gate.id, pinId: gate.outputs[0].id },
        { type: 'output', entityId: outputNode.id },
        [],
        [],
        'signal-out'
      )

      // Gate input is false by default, NOT(false) = true
      getState().simulationTick()

      // Output node should receive the gate output value
      expect(getState().outputNodes[0].value).toBe(true)
    })

    it('propagates input through gate to output node', () => {
      // Create input -> gate -> output chain
      const inputNode = getState().addInputNode('a', { x: 0, y: 0, z: 0 })
      const gate = getState().addGate('NOT', { x: 4, y: 0.2, z: 0 })
      const outputNode = getState().addOutputNode('out', { x: 8, y: 0, z: 0 })

      // Wire input to gate
      getState().addWire(
        { type: 'input', entityId: inputNode.id },
        { type: 'gate', entityId: gate.id, pinId: gate.inputs[0].id },
        [],
        [],
        'signal-a'
      )

      // Wire gate output to output node
      getState().addWire(
        { type: 'gate', entityId: gate.id, pinId: gate.outputs[0].id },
        { type: 'output', entityId: outputNode.id },
        [],
        [],
        'signal-out'
      )

      // Set input to true
      getState().updateInputNodeValue(inputNode.id, true)

      // Run simulation - should propagate through
      getState().simulationTick()

      // Input = true, NOT(true) = false, output should be false
      expect(getState().gates[0].inputs[0].value).toBe(true)
      expect(getState().gates[0].outputs[0].value).toBe(false)
      expect(getState().outputNodes[0].value).toBe(false)
    })

    it('propagates through junction for fan-out', () => {
      // Fan-out: input feeds two gates via shared segments through a junction
      // Both wires originate from input (junction just tracks which wires branch)
      const inputNode = getState().addInputNode('a', { x: 0, y: 0, z: 0 })
      const junction = getState().addJunction('signal-a', { x: 2, y: 0, z: 0 })
      const gate1 = getState().addGate('NOT', { x: 4, y: 0.2, z: -2 })
      const gate2 = getState().addGate('NOT', { x: 4, y: 0.2, z: 2 })

      // Original wire: input -> gate1
      const wire1 = getState().addWire(
        { type: 'input', entityId: inputNode.id },
        { type: 'gate', entityId: gate1.id, pinId: gate1.inputs[0].id },
        [],
        [],
        'signal-a'
      )
      // Branch wire: input -> gate2 (shares segments up to junction)
      const wire2 = getState().addWire(
        { type: 'input', entityId: inputNode.id },
        { type: 'gate', entityId: gate2.id, pinId: gate2.inputs[0].id },
        [],
        [],
        'signal-a'
      )

      // Junction tracks both wires
      useCircuitStore.setState((state) => {
        const j = state.junctions.find((jn) => jn.id === junction.id)
        if (j) j.wireIds = [wire1.id, wire2.id]
      })

      getState().updateInputNodeValue(inputNode.id, true)
      getState().simulationTick()

      expect(getState().gates[0].inputs[0].value).toBe(true)
      expect(getState().gates[1].inputs[0].value).toBe(true)
      expect(getState().gates[0].outputs[0].value).toBe(false)
      expect(getState().gates[1].outputs[0].value).toBe(false)
    })

    it('handles junction value when source is false', () => {
      const inputNode = getState().addInputNode('a', { x: 0, y: 0, z: 0 })
      const junction = getState().addJunction('signal-a', { x: 2, y: 0, z: 0 })
      const gate = getState().addGate('NOT', { x: 4, y: 0.2, z: 0 })

      getState().addWire(
        { type: 'input', entityId: inputNode.id },
        { type: 'junction', entityId: junction.id },
        [],
        [],
        'signal-a'
      )

      getState().addWire(
        { type: 'junction', entityId: junction.id },
        { type: 'gate', entityId: gate.id, pinId: gate.inputs[0].id },
        [],
        [],
        'signal-a'
      )

      // Input is false by default
      getState().simulationTick()

      expect(getState().gates[0].inputs[0].value).toBe(false)
      expect(getState().gates[0].outputs[0].value).toBe(true) // NOT(false) = true
    })

    it('simulates XOR circuit with input nodes', () => {
      // XOR(a, b) = OR(AND(a, NOT(b)), AND(NOT(a), b))

      const inputA = getState().addInputNode('a', { x: 0, y: 0, z: -2 })
      const inputB = getState().addInputNode('b', { x: 0, y: 0, z: 2 })
      const outputNode = getState().addOutputNode('out', { x: 20, y: 0, z: 0 })

      // Create NOT gates
      const notA = getState().addGate('NOT', { x: 4, y: 0.2, z: -4 })
      const notB = getState().addGate('NOT', { x: 4, y: 0.2, z: 4 })

      // Create AND gates
      const and1 = getState().addGate('AND', { x: 8, y: 0.2, z: -2 }) // a AND NOT(b)
      const and2 = getState().addGate('AND', { x: 8, y: 0.2, z: 2 })  // NOT(a) AND b

      // Create OR gate
      const orGate = getState().addGate('OR', { x: 12, y: 0.2, z: 0 })

      // Wire inputs to NOT gates
      getState().addWire({ type: 'input', entityId: inputA.id }, { type: 'gate', entityId: notA.id, pinId: notA.inputs[0].id }, [], [], 'sig-a-not')
      getState().addWire({ type: 'input', entityId: inputB.id }, { type: 'gate', entityId: notB.id, pinId: notB.inputs[0].id }, [], [], 'sig-b-not')

      // Wire to AND1: a, NOT(b)
      getState().addWire({ type: 'input', entityId: inputA.id }, { type: 'gate', entityId: and1.id, pinId: and1.inputs[0].id }, [], [], 'sig-a-and1')
      getState().addWire({ type: 'gate', entityId: notB.id, pinId: notB.outputs[0].id }, { type: 'gate', entityId: and1.id, pinId: and1.inputs[1].id }, [])

      // Wire to AND2: NOT(a), b
      getState().addWire({ type: 'gate', entityId: notA.id, pinId: notA.outputs[0].id }, { type: 'gate', entityId: and2.id, pinId: and2.inputs[0].id }, [])
      getState().addWire({ type: 'input', entityId: inputB.id }, { type: 'gate', entityId: and2.id, pinId: and2.inputs[1].id }, [], [], 'sig-b-and2')

      // Wire ANDs to OR
      getState().addWire({ type: 'gate', entityId: and1.id, pinId: and1.outputs[0].id }, { type: 'gate', entityId: orGate.id, pinId: orGate.inputs[0].id }, [])
      getState().addWire({ type: 'gate', entityId: and2.id, pinId: and2.outputs[0].id }, { type: 'gate', entityId: orGate.id, pinId: orGate.inputs[1].id }, [])

      // Wire OR to output
      getState().addWire({ type: 'gate', entityId: orGate.id, pinId: orGate.outputs[0].id }, { type: 'output', entityId: outputNode.id }, [], [], 'sig-out')

      // Test XOR truth table
      // a=0, b=0 -> 0
      getState().updateInputNodeValue(inputA.id, false)
      getState().updateInputNodeValue(inputB.id, false)
      for (let i = 0; i < 5; i++) getState().simulationTick()
      expect(getState().outputNodes[0].value).toBe(false)

      // a=0, b=1 -> 1
      getState().updateInputNodeValue(inputA.id, false)
      getState().updateInputNodeValue(inputB.id, true)
      for (let i = 0; i < 5; i++) getState().simulationTick()
      expect(getState().outputNodes[0].value).toBe(true)

      // a=1, b=0 -> 1
      getState().updateInputNodeValue(inputA.id, true)
      getState().updateInputNodeValue(inputB.id, false)
      for (let i = 0; i < 5; i++) getState().simulationTick()
      expect(getState().outputNodes[0].value).toBe(true)

      // a=1, b=1 -> 0
      getState().updateInputNodeValue(inputA.id, true)
      getState().updateInputNodeValue(inputB.id, true)
      for (let i = 0; i < 5; i++) getState().simulationTick()
      expect(getState().outputNodes[0].value).toBe(false)
    })
  })
})
