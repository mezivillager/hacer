import { describe, it, expect, beforeEach } from 'vitest'
import { useCircuitStore } from '../../circuitStore'

// Helper to get store state
const getState = () => useCircuitStore.getState()

describe('pinHelpers', () => {
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

  describe('getPinWorldPosition', () => {
    it('returns input pin world position for first input', () => {
      const gate = getState().addGate('NAND', { x: 0, y: 0, z: 0 })
      
      const position = getState().getPinWorldPosition(gate.id, gate.inputs[0].id)
      
      expect(position).not.toBeNull()
      expect(position?.x).toBeCloseTo(-0.7, 1)
      expect(position?.y).toBeCloseTo(0.2, 1)
      expect(position?.z).toBe(0)
    })

    it('returns input pin world position for second input', () => {
      const gate = getState().addGate('NAND', { x: 0, y: 0, z: 0 })
      
      const position = getState().getPinWorldPosition(gate.id, gate.inputs[1].id)
      
      expect(position).not.toBeNull()
      expect(position?.x).toBeCloseTo(-0.7, 1)
      expect(position?.y).toBeCloseTo(-0.2, 1)
      expect(position?.z).toBe(0)
    })

    it('returns output pin world position', () => {
      const gate = getState().addGate('NAND', { x: 0, y: 0, z: 0 })
      
      const position = getState().getPinWorldPosition(gate.id, gate.outputs[0].id)
      
      expect(position).not.toBeNull()
      expect(position?.x).toBeCloseTo(0.7, 1)
      expect(position?.y).toBe(0)
      expect(position?.z).toBe(0)
    })

    it('accounts for gate position', () => {
      const gate = getState().addGate('NAND', { x: 5, y: 10, z: 15 })
      
      const position = getState().getPinWorldPosition(gate.id, gate.outputs[0].id)
      
      expect(position).not.toBeNull()
      expect(position?.x).toBeCloseTo(5.7, 1)
      expect(position?.y).toBeCloseTo(10, 1)
      expect(position?.z).toBeCloseTo(15, 1)
    })

    it('accounts for gate rotation', () => {
      const gate = getState().addGate('NAND', { x: 0, y: 0, z: 0 })
      getState().rotateGate(gate.id, 'y', Math.PI)
      
      const position = getState().getPinWorldPosition(gate.id, gate.outputs[0].id)
      
      expect(position).not.toBeNull()
      // After 180° rotation, output should be on the opposite side
      expect(position?.x).toBeCloseTo(-0.7, 1)
    })

    it('returns null if gate does not exist', () => {
      const position = getState().getPinWorldPosition('non-existent-id', 'pin-id')
      
      expect(position).toBeNull()
    })

    it('returns null if pin does not exist', () => {
      const gate = getState().addGate('NAND', { x: 0, y: 0, z: 0 })
      
      const position = getState().getPinWorldPosition(gate.id, 'non-existent-pin')
      
      expect(position).toBeNull()
    })
  })
})
