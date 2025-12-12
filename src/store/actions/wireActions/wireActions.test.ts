import { describe, it, expect, beforeEach } from 'vitest'
import { useCircuitStore } from '../../circuitStore'

// Helper to get store state
const getState = () => useCircuitStore.getState()

describe('wireActions', () => {
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

  describe('addWire', () => {
    it('adds a wire between two gates', () => {
      const gate1 = getState().addGate('NAND', { x: 0, y: 0, z: 0 })
      const gate2 = getState().addGate('NAND', { x: 2, y: 0, z: 0 })
      
      const wire = getState().addWire(
        gate1.id, gate1.outputs[0].id,
        gate2.id, gate2.inputs[0].id
      )
      
      expect(getState().wires).toHaveLength(1)
      expect(wire.fromGateId).toBe(gate1.id)
      expect(wire.toGateId).toBe(gate2.id)
    })

    it('creates wire with unique id', () => {
      const gate1 = getState().addGate('NAND', { x: 0, y: 0, z: 0 })
      const gate2 = getState().addGate('NAND', { x: 2, y: 0, z: 0 })
      
      const wire1 = getState().addWire(
        gate1.id, gate1.outputs[0].id,
        gate2.id, gate2.inputs[0].id
      )
      const wire2 = getState().addWire(
        gate1.id, gate1.outputs[0].id,
        gate2.id, gate2.inputs[1].id
      )
      
      expect(wire1.id).not.toBe(wire2.id)
    })
  })

  describe('removeWire', () => {
    it('removes wire from store', () => {
      const gate1 = getState().addGate('NAND', { x: 0, y: 0, z: 0 })
      const gate2 = getState().addGate('NAND', { x: 2, y: 0, z: 0 })
      
      const wire = getState().addWire(
        gate1.id, gate1.outputs[0].id,
        gate2.id, gate2.inputs[0].id
      )
      expect(getState().wires).toHaveLength(1)
      
      getState().removeWire(wire.id)
      expect(getState().wires).toHaveLength(0)
    })

    it('does nothing if wire does not exist', () => {
      const gate1 = getState().addGate('NAND', { x: 0, y: 0, z: 0 })
      const gate2 = getState().addGate('NAND', { x: 2, y: 0, z: 0 })
      
      getState().addWire(
        gate1.id, gate1.outputs[0].id,
        gate2.id, gate2.inputs[0].id
      )
      expect(getState().wires).toHaveLength(1)
      
      getState().removeWire('non-existent-id')
      expect(getState().wires).toHaveLength(1)
    })
  })

  describe('setInputValue', () => {
    it('sets input pin value', () => {
      const gate = getState().addGate('NAND', { x: 0, y: 0, z: 0 })
      
      getState().setInputValue(gate.id, gate.inputs[0].id, true)
      
      expect(getState().gates[0].inputs[0].value).toBe(true)
    })

    it('does nothing if gate does not exist', () => {
      getState().setInputValue('non-existent-id', 'pin-id', true)
      // Should not throw
    })

    it('does nothing if pin does not exist', () => {
      const gate = getState().addGate('NAND', { x: 0, y: 0, z: 0 })
      
      getState().setInputValue(gate.id, 'non-existent-pin', true)
      
      expect(getState().gates[0].inputs[0].value).toBe(false)
    })
  })
})
