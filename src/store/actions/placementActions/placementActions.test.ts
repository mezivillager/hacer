import { describe, it, expect, beforeEach } from 'vitest'
import { circuitStore } from '../../circuitStore'
import { placementActions } from './placementActions'
import { gateActions } from '../gateActions/gateActions'

describe('placementActions', () => {
  beforeEach(() => {
    // Reset store state before each test
    circuitStore.gates = []
    circuitStore.selectedGateId = null
    circuitStore.placementMode = null
  })

  describe('startPlacement', () => {
    it('sets placement mode', () => {
      placementActions.startPlacement('NAND')
      
      expect(circuitStore.placementMode).toBe('NAND')
    })

    it('clears selected gate', () => {
      const gate = gateActions.addGate('NAND', { x: 0, y: 0, z: 0 })
      gateActions.selectGate(gate.id)
      
      placementActions.startPlacement('AND')
      
      expect(circuitStore.selectedGateId).toBe(null)
    })
  })

  describe('cancelPlacement', () => {
    it('clears placement mode', () => {
      placementActions.startPlacement('NAND')
      expect(circuitStore.placementMode).toBe('NAND')
      
      placementActions.cancelPlacement()
      
      expect(circuitStore.placementMode).toBe(null)
    })
  })

  describe('placeGate', () => {
    it('places gate at position and clears placement mode', () => {
      placementActions.startPlacement('NAND')
      
      placementActions.placeGate({ x: 1, y: 2, z: 3 })
      
      expect(circuitStore.gates).toHaveLength(1)
      expect(circuitStore.gates[0].position).toEqual({ x: 1, y: 2, z: 3 })
      expect(circuitStore.gates[0].type).toBe('NAND')
      expect(circuitStore.placementMode).toBe(null)
    })

    it('does nothing if not in placement mode', () => {
      placementActions.placeGate({ x: 1, y: 2, z: 3 })
      
      expect(circuitStore.gates).toHaveLength(0)
    })
  })
})
