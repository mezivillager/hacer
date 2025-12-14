import { describe, it, expect, beforeEach } from 'vitest'
import { useCircuitStore } from '../../circuitStore'
import { GRID_SIZE } from '@/utils/grid'

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
      
      getState().placeGate({ x: 0, y: 0, z: 0 })
      
      expect(getState().gates).toHaveLength(1)
      expect(getState().gates[0].position).toEqual({ x: 0, y: 0, z: 0 })
      expect(getState().gates[0].type).toBe('NAND')
      expect(getState().placementMode).toBe(null)
    })

    it('does nothing if not in placement mode', () => {
      getState().placeGate({ x: 0, y: 0, z: 0 })
      
      expect(getState().gates).toHaveLength(0)
    })

    describe('grid snapping', () => {
      it('snaps position to grid center', () => {
        getState().startPlacement('NAND')
        
        // Position slightly off grid should snap to grid center
        getState().placeGate({ x: 0.9, y: 0, z: 0.9 })
        
        expect(getState().gates).toHaveLength(1)
        expect(getState().gates[0].position).toEqual({ x: 0, y: 0, z: 0 })
      })

      it('snaps to nearest grid cell', () => {
        getState().startPlacement('NAND')
        
        // Position between grid cells should snap to nearest
        getState().placeGate({ x: 1.1, y: 0, z: 1.1 })
        
        expect(getState().gates).toHaveLength(1)
        expect(getState().gates[0].position).toEqual({ x: 2, y: 0, z: 2 })
      })

      it('verifies gate is placed at grid center', () => {
        getState().startPlacement('AND')
        
        getState().placeGate({ x: GRID_SIZE * 2, y: 0, z: GRID_SIZE * 3 })
        
        expect(getState().gates).toHaveLength(1)
        expect(getState().gates[0].position).toEqual({ 
          x: GRID_SIZE * 2, 
          y: 0, 
          z: GRID_SIZE * 3 
        })
      })
    })

    describe('spacing validation', () => {
      it('prevents placement in same cell as existing gate', () => {
        const gate = getState().addGate('NAND', { x: 0, y: 0, z: 0 })
        getState().startPlacement('AND')
        
        getState().placeGate({ x: 0, y: 0, z: 0 })
        
        // Should still have only 1 gate (the original)
        expect(getState().gates).toHaveLength(1)
        expect(getState().gates[0].id).toBe(gate.id)
      })

      it('prevents placement in adjacent cell', () => {
        const gate = getState().addGate('NAND', { x: 0, y: 0, z: 0 })
        getState().startPlacement('AND')
        
        // Try to place in adjacent cells (same row, adjacent column)
        getState().placeGate({ x: GRID_SIZE, y: 0, z: 0 })
        expect(getState().gates).toHaveLength(1)
        
        // Try adjacent row, same column
        getState().placeGate({ x: 0, y: 0, z: GRID_SIZE })
        expect(getState().gates).toHaveLength(1)
        
        // Try diagonal adjacent
        getState().placeGate({ x: GRID_SIZE, y: 0, z: GRID_SIZE })
        expect(getState().gates).toHaveLength(1)
      })

      it('allows placement when spacing is sufficient', () => {
        const gate = getState().addGate('NAND', { x: 0, y: 0, z: 0 })
        getState().startPlacement('AND')
        
        // Place 2 cells away (spacing > 1)
        getState().placeGate({ x: GRID_SIZE * 2, y: 0, z: 0 })
        
        expect(getState().gates).toHaveLength(2)
        expect(getState().gates[0].id).toBe(gate.id)
        expect(getState().gates[1].position).toEqual({ x: GRID_SIZE * 2, y: 0, z: 0 })
      })

      it('does nothing when placement is invalid', () => {
        const gate = getState().addGate('NAND', { x: 0, y: 0, z: 0 })
        getState().startPlacement('AND')
        
        const initialGateCount = getState().gates.length
        
        // Try invalid placement
        getState().placeGate({ x: 0, y: 0, z: 0 })
        
        // Should still have same number of gates
        expect(getState().gates).toHaveLength(initialGateCount)
        // Placement mode should still be active (not cleared on invalid placement)
        expect(getState().placementMode).toBe('AND')
      })
    })
  })
})
