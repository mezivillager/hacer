import { describe, it, expect, beforeEach } from 'vitest'
import { circuitStore } from '../../circuitStore'
import { simulationActions } from './simulationActions'
import { gateActions } from '../gateActions/gateActions'
import { wireActions } from '../wireActions/wireActions'

describe('simulationActions', () => {
  beforeEach(() => {
    // Reset store state before each test
    circuitStore.gates = []
    circuitStore.wires = []
    circuitStore.simulationRunning = false
    circuitStore.simulationSpeed = 100
    circuitStore.selectedGateId = null
    circuitStore.placementMode = null
  })

  describe('toggleSimulation', () => {
    it('toggles simulation running state', () => {
      expect(circuitStore.simulationRunning).toBe(false)
      
      simulationActions.toggleSimulation()
      expect(circuitStore.simulationRunning).toBe(true)
      
      simulationActions.toggleSimulation()
      expect(circuitStore.simulationRunning).toBe(false)
    })
  })

  describe('setSimulationSpeed', () => {
    it('sets simulation speed', () => {
      simulationActions.setSimulationSpeed(200)
      
      expect(circuitStore.simulationSpeed).toBe(200)
    })
  })

  describe('clearCircuit', () => {
    it('clears all gates and wires', () => {
      const gate1 = gateActions.addGate('NAND', { x: 0, y: 0, z: 0 })
      const gate2 = gateActions.addGate('NAND', { x: 2, y: 0, z: 0 })
      wireActions.addWire(
        gate1.id, gate1.outputs[0].id,
        gate2.id, gate2.inputs[0].id
      )
      gateActions.selectGate(gate1.id)
      
      simulationActions.clearCircuit()
      
      expect(circuitStore.gates).toHaveLength(0)
      expect(circuitStore.wires).toHaveLength(0)
      expect(circuitStore.selectedGateId).toBe(null)
    })

    it('clears placement mode', () => {
      circuitStore.placementMode = 'NAND'
      
      simulationActions.clearCircuit()
      
      expect(circuitStore.placementMode).toBe(null)
    })
  })

  describe('simulationTick', () => {
    it('propagates output values through wires to inputs', () => {
      const gate1 = gateActions.addGate('NAND', { x: 0, y: 0, z: 0 })
      const gate2 = gateActions.addGate('NAND', { x: 2, y: 0, z: 0 })
      
      wireActions.addWire(
        gate1.id, gate1.outputs[0].id,
        gate2.id, gate2.inputs[0].id
      )
      
      // Set gate1 inputs to true, true -> NAND output should be false
      wireActions.setInputValue(gate1.id, gate1.inputs[0].id, true)
      wireActions.setInputValue(gate1.id, gate1.inputs[1].id, true)
      
      // Manually set gate1 output (simulating gate logic)
      gate1.outputs[0].value = false
      
      simulationActions.simulationTick()
      
      // Gate2 input should receive gate1 output value
      expect(gate2.inputs[0].value).toBe(false)
    })

    it('calculates new output values for all gates', () => {
      const gate = gateActions.addGate('NAND', { x: 0, y: 0, z: 0 })
      
      // Set both inputs to true -> NAND output should be false
      wireActions.setInputValue(gate.id, gate.inputs[0].id, true)
      wireActions.setInputValue(gate.id, gate.inputs[1].id, true)
      
      simulationActions.simulationTick()
      
      // Gate output should be calculated (NAND(true, true) = false)
      expect(gate.outputs[0].value).toBe(false)
    })

    it('handles gates with no wires', () => {
      const gate = gateActions.addGate('NAND', { x: 0, y: 0, z: 0 })
      
      simulationActions.simulationTick()
      
      // Should not throw, output should be calculated based on inputs
      expect(gate.outputs[0].value).toBeDefined()
    })
  })
})
