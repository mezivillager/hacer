import { describe, it, expect, beforeEach } from 'vitest'
import { useCircuitStore } from '../../circuitStore'

// Helper to get store state
const getState = () => useCircuitStore.getState()

describe('placementActions', () => {
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

  describe('startPlacement', () => {
    it('sets placement mode', () => {
      getState().startPlacement('NAND')
      
      expect(getState().placementMode).toBe('NAND')
    })

    it('clears selected gate', () => {
      const gate = getState().addGate('NAND', { x: 0, y: 0, z: 0 })
      getState().selectGate(gate.id)
      
      getState().startPlacement('AND')
      
      expect(getState().selectedGateId).toBe(null)
    })
  })

  describe('cancelPlacement', () => {
    it('clears placement mode', () => {
      getState().startPlacement('NAND')
      expect(getState().placementMode).toBe('NAND')
      
      getState().cancelPlacement()
      
      expect(getState().placementMode).toBe(null)
    })
  })

  describe('placeGate', () => {
    it('places gate at position and clears placement mode', () => {
      getState().startPlacement('NAND')
      
      getState().placeGate({ x: 1, y: 2, z: 3 })
      
      expect(getState().gates).toHaveLength(1)
      expect(getState().gates[0].position).toEqual({ x: 1, y: 2, z: 3 })
      expect(getState().gates[0].type).toBe('NAND')
      expect(getState().placementMode).toBe(null)
    })

    it('does nothing if not in placement mode', () => {
      getState().placeGate({ x: 1, y: 2, z: 3 })
      
      expect(getState().gates).toHaveLength(0)
    })
  })
})
