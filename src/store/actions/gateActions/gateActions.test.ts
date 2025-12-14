import { describe, it, expect, beforeEach } from 'vitest'
import { useCircuitStore } from '../../circuitStore'
import { GRID_SIZE } from '@/utils/grid'

// Helper to get store state
const getState = () => useCircuitStore.getState()

describe('gateActions', () => {
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

  describe('addGate', () => {
    it('adds a gate with correct type and position', () => {
      const gate = getState().addGate('NAND', { x: 1, y: 2, z: 3 })
      
      expect(getState().gates).toHaveLength(1)
      expect(gate.type).toBe('NAND')
      expect(gate.position).toEqual({ x: 1, y: 2, z: 3 })
    })

    it('creates gate with unique id', () => {
      const gate1 = getState().addGate('NAND', { x: 0, y: 0, z: 0 })
      const gate2 = getState().addGate('NAND', { x: 1, y: 0, z: 0 })
      
      expect(gate1.id).not.toBe(gate2.id)
    })

    it('creates 2 inputs for NAND gate', () => {
      const gate = getState().addGate('NAND', { x: 0, y: 0, z: 0 })
      
      expect(gate.inputs).toHaveLength(2)
      expect(gate.inputs[0].type).toBe('input')
      expect(gate.inputs[1].type).toBe('input')
    })

    it('creates 1 input for NOT gate', () => {
      const gate = getState().addGate('NOT', { x: 0, y: 0, z: 0 })
      
      expect(gate.inputs).toHaveLength(1)
    })

    it('creates 1 output for all gates', () => {
      const nand = getState().addGate('NAND', { x: 0, y: 0, z: 0 })
      const not = getState().addGate('NOT', { x: 1, y: 0, z: 0 })
      
      expect(nand.outputs).toHaveLength(1)
      expect(not.outputs).toHaveLength(1)
    })

    it('initializes gate as not selected', () => {
      const gate = getState().addGate('NAND', { x: 0, y: 0, z: 0 })
      
      expect(gate.selected).toBe(false)
    })
  })

  describe('removeGate', () => {
    it('removes gate from store', () => {
      const gate = getState().addGate('NAND', { x: 0, y: 0, z: 0 })
      expect(getState().gates).toHaveLength(1)
      
      getState().removeGate(gate.id)
      expect(getState().gates).toHaveLength(0)
    })

    it('removes associated wires when gate is removed', () => {
      const gate1 = getState().addGate('NAND', { x: 0, y: 0, z: 0 })
      const gate2 = getState().addGate('NAND', { x: 2, y: 0, z: 0 })
      
      getState().addWire(
        gate1.id, gate1.outputs[0].id,
        gate2.id, gate2.inputs[0].id
      )
      expect(getState().wires).toHaveLength(1)
      
      getState().removeGate(gate1.id)
      expect(getState().wires).toHaveLength(0)
    })

    it('does nothing if gate does not exist', () => {
      getState().addGate('NAND', { x: 0, y: 0, z: 0 })
      expect(getState().gates).toHaveLength(1)
      
      getState().removeGate('non-existent-id')
      expect(getState().gates).toHaveLength(1)
    })
  })

  describe('selectGate', () => {
    it('selects a gate by id', () => {
      const gate = getState().addGate('NAND', { x: 0, y: 0, z: 0 })
      
      getState().selectGate(gate.id)
      
      expect(getState().selectedGateId).toBe(gate.id)
      expect(getState().gates[0].selected).toBe(true)
    })

    it('deselects previously selected gate', () => {
      const gate1 = getState().addGate('NAND', { x: 0, y: 0, z: 0 })
      const gate2 = getState().addGate('NAND', { x: 2, y: 0, z: 0 })
      
      getState().selectGate(gate1.id)
      getState().selectGate(gate2.id)
      
      expect(getState().gates[0].selected).toBe(false)
      expect(getState().gates[1].selected).toBe(true)
    })

    it('clears selection when null is passed', () => {
      const gate = getState().addGate('NAND', { x: 0, y: 0, z: 0 })
      getState().selectGate(gate.id)
      
      getState().selectGate(null)
      
      expect(getState().selectedGateId).toBe(null)
      expect(getState().gates[0].selected).toBe(false)
    })
  })

  describe('updateGatePosition', () => {
    it('updates gate position', () => {
      const gate = getState().addGate('NAND', { x: 0, y: 0, z: 0 })
      
      getState().updateGatePosition(gate.id, { x: GRID_SIZE * 2, y: 0, z: GRID_SIZE * 3 })
      
      expect(getState().gates[0].position).toEqual({ x: GRID_SIZE * 2, y: 0, z: GRID_SIZE * 3 })
    })

    it('does nothing if gate does not exist', () => {
      getState().addGate('NAND', { x: 0, y: 0, z: 0 })
      
      getState().updateGatePosition('non-existent-id', { x: GRID_SIZE * 2, y: 0, z: GRID_SIZE * 2 })
      
      expect(getState().gates[0].position).toEqual({ x: 0, y: 0, z: 0 })
    })

    describe('grid snapping', () => {
      it('snaps position to grid center', () => {
        const gate = getState().addGate('NAND', { x: 0, y: 0, z: 0 })
        
        // Position slightly off grid should snap to grid center
        getState().updateGatePosition(gate.id, { x: 0.9, y: 0, z: 0.9 })
        
        expect(getState().gates[0].position).toEqual({ x: 0, y: 0, z: 0 })
      })

      it('snaps to nearest grid cell', () => {
        const gate = getState().addGate('NAND', { x: 0, y: 0, z: 0 })
        
        // Position between grid cells should snap to nearest
        getState().updateGatePosition(gate.id, { x: 1.1, y: 0, z: 1.1 })
        
        expect(getState().gates[0].position).toEqual({ x: 2, y: 0, z: 2 })
      })

      it('handles positions that are not on grid', () => {
        const gate = getState().addGate('NAND', { x: 0, y: 0, z: 0 })
        
        // Various off-grid positions should all snap correctly
        getState().updateGatePosition(gate.id, { x: 2.9, y: 0, z: 2.9 })
        expect(getState().gates[0].position).toEqual({ x: 2, y: 0, z: 2 })
        
        getState().updateGatePosition(gate.id, { x: 3.1, y: 0, z: 3.1 })
        expect(getState().gates[0].position).toEqual({ x: 4, y: 0, z: 4 })
        
        // -1.1 / 2.0 = -0.55, rounds to -1, so grid position is -1, world is -2
        getState().updateGatePosition(gate.id, { x: -1.1, y: 0, z: -1.1 })
        expect(getState().gates[0].position).toEqual({ x: -2, y: 0, z: -2 })
        
        // -0.4 / 2.0 = -0.2, rounds to 0 (normalized from -0), so grid position is 0, world is 0
        getState().updateGatePosition(gate.id, { x: -0.4, y: 0, z: -0.4 })
        expect(getState().gates[0].position).toEqual({ x: 0, y: 0, z: 0 })
      })
    })
  })

  describe('updateGateRotation', () => {
    it('updates gate rotation', () => {
      const gate = getState().addGate('NAND', { x: 0, y: 0, z: 0 })
      
      getState().updateGateRotation(gate.id, { x: 0, y: Math.PI / 2, z: 0 })
      
      expect(getState().gates[0].rotation).toEqual({ x: 0, y: Math.PI / 2, z: 0 })
    })
  })

  describe('rotateGate', () => {
    it('rotates gate by specified angle', () => {
      const gate = getState().addGate('NAND', { x: 0, y: 0, z: 0 })
      
      getState().rotateGate(gate.id, 'y', Math.PI / 2)
      
      expect(getState().gates[0].rotation.y).toBeCloseTo(Math.PI / 2)
    })

    it('accumulates rotation', () => {
      const gate = getState().addGate('NAND', { x: 0, y: 0, z: 0 })
      
      getState().rotateGate(gate.id, 'y', Math.PI / 4)
      getState().rotateGate(gate.id, 'y', Math.PI / 4)
      
      expect(getState().gates[0].rotation.y).toBeCloseTo(Math.PI / 2)
    })
  })
})
