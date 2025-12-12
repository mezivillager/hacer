import { describe, it, expect, beforeEach } from 'vitest'
import { useCircuitStore } from '../../circuitStore'

// Helper to get store state
const getState = () => useCircuitStore.getState()

describe('simulationActions', () => {
  beforeEach(() => {
    // Reset store state before each test
    useCircuitStore.setState({
      gates: [],
      wires: [],
      selectedGateId: null,
      simulationRunning: false,
      simulationSpeed: 100,
      placementMode: null,
      wiringFrom: null,
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
        gate1.id, gate1.outputs[0].id,
        gate2.id, gate2.inputs[0].id
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
  })

  describe('simulationTick', () => {
    it('propagates output values through wires to inputs', () => {
      const gate1 = getState().addGate('NAND', { x: 0, y: 0, z: 0 })
      const gate2 = getState().addGate('NAND', { x: 2, y: 0, z: 0 })
      
      getState().addWire(
        gate1.id, gate1.outputs[0].id,
        gate2.id, gate2.inputs[0].id
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
})
