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
      // Use valid position (both odd)
      const gate = getState().addGate('NAND', { x: 2, y: 0.2, z: 2 })
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
      
      // Use valid position (not on section line - both row and col must be odd)
      // Position (2, 0.2, 2) = grid (1, 1) - both odd ✓
      getState().placeGate({ x: 2, y: 0.2, z: 2 })
      
      expect(getState().gates).toHaveLength(1)
      expect(getState().gates[0].position).toEqual({ x: 2, y: 0.2, z: 2 })
      expect(getState().gates[0].type).toBe('NAND')
      expect(getState().placementMode).toBe(null)
    })

    it('does nothing if not in placement mode', () => {
      getState().placeGate({ x: 2, y: 0.2, z: 2 })
      
      expect(getState().gates).toHaveLength(0)
    })

    describe('grid snapping', () => {
      it('snaps position to grid center', () => {
        getState().startPlacement('NAND')
        
        // Position slightly off grid should snap to grid center (valid position)
        // (2.9, 0.2, 2.9) → grid (1, 1) - both odd ✓
        getState().placeGate({ x: 2.9, y: 0.2, z: 2.9 })
        
        expect(getState().gates).toHaveLength(1)
        expect(getState().gates[0].position).toEqual({ x: 2, y: 0.2, z: 2 })
      })

      it('snaps to nearest grid cell', () => {
        getState().startPlacement('NAND')
        
        // Position between grid cells should snap to nearest (valid position)
        // (3.1, 0.2, 3.1) → grid (2, 2) - but this is on section line!
        // Use position that snaps to valid cell: (3.1, 0.2, 2.9) → grid (1, 2) - section line
        // Better: (3.1, 0.2, 5.1) → grid (3, 2) - section line
        // Use: (2.9, 0.2, 5.1) → grid (3, 1) - both odd ✓
        getState().placeGate({ x: 2.9, y: 0.2, z: 5.1 })
        
        expect(getState().gates).toHaveLength(1)
        expect(getState().gates[0].position).toEqual({ x: 2, y: 0.2, z: 6 })
      })

      it('verifies gate is placed at grid center', () => {
        getState().startPlacement('AND')
        
        // Use valid position (both row and col odd)
        // GRID_SIZE * 2 = 4, GRID_SIZE * 3 = 6
        // grid (3, 2) - odd row, even col, section line ✗
        // Use: GRID_SIZE * 1 = 2, GRID_SIZE * 3 = 6
        // grid (3, 1) - both odd ✓
        getState().placeGate({ x: GRID_SIZE * 1, y: 0.2, z: GRID_SIZE * 3 })
        
        expect(getState().gates).toHaveLength(1)
        expect(getState().gates[0].position).toEqual({ 
          x: GRID_SIZE * 1, 
          y: 0.2, 
          z: GRID_SIZE * 3 
        })
      })
    })

    describe('spacing validation', () => {
      it('prevents placement in same cell as existing gate', () => {
        // Use valid position (both odd)
        const gate = getState().addGate('NAND', { x: 2, y: 0.2, z: 2 }) // grid (1, 1)
        getState().startPlacement('AND')
        
        getState().placeGate({ x: 2, y: 0.2, z: 2 })
        
        // Should still have only 1 gate (the original)
        expect(getState().gates).toHaveLength(1)
        expect(getState().gates[0].id).toBe(gate.id)
      })

      it('prevents placement in adjacent cell', () => {
        // Use valid position (both odd)
        getState().addGate('NAND', { x: 2, y: 0.2, z: 2 }) // grid (1, 1)
        getState().startPlacement('AND')
        
        // Note: With section line restrictions, adjacent valid positions don't exist
        // Adjacent positions would be on section lines (even row or col), which are invalid
        // So we test that:
        // 1. Same cell is prevented (tested above)
        // 2. Positions that would be adjacent but are on section lines are prevented by section line check
        // 3. Positions with spacing > 1 are allowed (tested below)
        
        // Test that attempting to place at adjacent positions (on section lines) is prevented
        // These would be adjacent but are invalid due to section line restriction
        getState().placeGate({ x: 4, y: 0.2, z: 2 }) // grid (1, 2) - section line (even col)
        expect(getState().gates).toHaveLength(1) // Prevented by section line check
        
        getState().placeGate({ x: 2, y: 0.2, z: 4 }) // grid (2, 1) - section line (even row)
        expect(getState().gates).toHaveLength(1) // Prevented by section line check
        
        getState().placeGate({ x: 4, y: 0.2, z: 4 }) // grid (2, 2) - section line (both even)
        expect(getState().gates).toHaveLength(1) // Prevented by section line check
      })

      it('allows placement when spacing is sufficient', () => {
        // Use valid position (both odd)
        const gate = getState().addGate('NAND', { x: 2, y: 0.2, z: 2 }) // grid (1, 1)
        getState().startPlacement('AND')
        
        // Place 2+ cells away (spacing > 1) at valid position
        // grid (1, 5) - both odd, far enough ✓
        getState().placeGate({ x: GRID_SIZE * 5, y: 0.2, z: GRID_SIZE * 1 })
        
        expect(getState().gates).toHaveLength(2)
        expect(getState().gates[0].id).toBe(gate.id)
        expect(getState().gates[1].position).toEqual({ x: GRID_SIZE * 5, y: 0.2, z: GRID_SIZE * 1 })
      })

      it('does nothing when placement is invalid', () => {
        // Use valid position (both odd)
        getState().addGate('NAND', { x: 2, y: 0.2, z: 2 }) // grid (1, 1)
        getState().startPlacement('AND')
        
        const initialGateCount = getState().gates.length
        
        // Try invalid placement (same cell)
        getState().placeGate({ x: 2, y: 0.2, z: 2 })
        
        // Should still have same number of gates
        expect(getState().gates).toHaveLength(initialGateCount)
        // Placement mode should still be active (not cleared on invalid placement)
        expect(getState().placementMode).toBe('AND')
      })
    })
  })
})
