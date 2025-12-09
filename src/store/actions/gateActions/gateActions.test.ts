import { describe, it, expect, beforeEach } from 'vitest'
import { circuitStore } from '../../circuitStore'
import { gateActions } from './gateActions'
import { wireActions } from '../wireActions/wireActions'

describe('gateActions', () => {
  beforeEach(() => {
    // Reset store state before each test
    circuitStore.gates = []
    circuitStore.wires = []
    circuitStore.selectedGateId = null
  })

  describe('addGate', () => {
    it('adds a gate with correct type and position', () => {
      const gate = gateActions.addGate('NAND', { x: 1, y: 2, z: 3 })
      
      expect(circuitStore.gates).toHaveLength(1)
      expect(gate.type).toBe('NAND')
      expect(gate.position).toEqual({ x: 1, y: 2, z: 3 })
    })

    it('creates gate with unique id', () => {
      const gate1 = gateActions.addGate('NAND', { x: 0, y: 0, z: 0 })
      const gate2 = gateActions.addGate('NAND', { x: 1, y: 0, z: 0 })
      
      expect(gate1.id).not.toBe(gate2.id)
    })

    it('creates 2 inputs for NAND gate', () => {
      const gate = gateActions.addGate('NAND', { x: 0, y: 0, z: 0 })
      
      expect(gate.inputs).toHaveLength(2)
      expect(gate.inputs[0].type).toBe('input')
      expect(gate.inputs[1].type).toBe('input')
    })

    it('creates 1 input for NOT gate', () => {
      const gate = gateActions.addGate('NOT', { x: 0, y: 0, z: 0 })
      
      expect(gate.inputs).toHaveLength(1)
    })

    it('creates 1 output for all gates', () => {
      const nand = gateActions.addGate('NAND', { x: 0, y: 0, z: 0 })
      const not = gateActions.addGate('NOT', { x: 1, y: 0, z: 0 })
      
      expect(nand.outputs).toHaveLength(1)
      expect(not.outputs).toHaveLength(1)
    })

    it('initializes gate as not selected', () => {
      const gate = gateActions.addGate('NAND', { x: 0, y: 0, z: 0 })
      
      expect(gate.selected).toBe(false)
    })
  })

  describe('removeGate', () => {
    it('removes gate from store', () => {
      const gate = gateActions.addGate('NAND', { x: 0, y: 0, z: 0 })
      expect(circuitStore.gates).toHaveLength(1)
      
      gateActions.removeGate(gate.id)
      expect(circuitStore.gates).toHaveLength(0)
    })

    it('removes associated wires when gate is removed', () => {
      const gate1 = gateActions.addGate('NAND', { x: 0, y: 0, z: 0 })
      const gate2 = gateActions.addGate('NAND', { x: 2, y: 0, z: 0 })
      
      wireActions.addWire(
        gate1.id, gate1.outputs[0].id,
        gate2.id, gate2.inputs[0].id
      )
      expect(circuitStore.wires).toHaveLength(1)
      
      gateActions.removeGate(gate1.id)
      expect(circuitStore.wires).toHaveLength(0)
    })

    it('does nothing if gate does not exist', () => {
      gateActions.addGate('NAND', { x: 0, y: 0, z: 0 })
      expect(circuitStore.gates).toHaveLength(1)
      
      gateActions.removeGate('non-existent-id')
      expect(circuitStore.gates).toHaveLength(1)
    })
  })

  describe('selectGate', () => {
    it('selects a gate by id', () => {
      const gate = gateActions.addGate('NAND', { x: 0, y: 0, z: 0 })
      
      gateActions.selectGate(gate.id)
      
      expect(circuitStore.selectedGateId).toBe(gate.id)
      expect(circuitStore.gates[0].selected).toBe(true)
    })

    it('deselects previously selected gate', () => {
      const gate1 = gateActions.addGate('NAND', { x: 0, y: 0, z: 0 })
      const gate2 = gateActions.addGate('NAND', { x: 2, y: 0, z: 0 })
      
      gateActions.selectGate(gate1.id)
      gateActions.selectGate(gate2.id)
      
      expect(circuitStore.gates[0].selected).toBe(false)
      expect(circuitStore.gates[1].selected).toBe(true)
    })

    it('clears selection when null is passed', () => {
      const gate = gateActions.addGate('NAND', { x: 0, y: 0, z: 0 })
      gateActions.selectGate(gate.id)
      
      gateActions.selectGate(null)
      
      expect(circuitStore.selectedGateId).toBe(null)
      expect(circuitStore.gates[0].selected).toBe(false)
    })
  })

  describe('updateGatePosition', () => {
    it('updates gate position', () => {
      const gate = gateActions.addGate('NAND', { x: 0, y: 0, z: 0 })
      
      gateActions.updateGatePosition(gate.id, { x: 5, y: 10, z: 15 })
      
      expect(circuitStore.gates[0].position).toEqual({ x: 5, y: 10, z: 15 })
    })

    it('does nothing if gate does not exist', () => {
      gateActions.addGate('NAND', { x: 0, y: 0, z: 0 })
      
      gateActions.updateGatePosition('non-existent-id', { x: 5, y: 10, z: 15 })
      
      expect(circuitStore.gates[0].position).toEqual({ x: 0, y: 0, z: 0 })
    })
  })

  describe('updateGateRotation', () => {
    it('updates gate rotation', () => {
      const gate = gateActions.addGate('NAND', { x: 0, y: 0, z: 0 })
      
      gateActions.updateGateRotation(gate.id, { x: 0, y: Math.PI / 2, z: 0 })
      
      expect(circuitStore.gates[0].rotation).toEqual({ x: 0, y: Math.PI / 2, z: 0 })
    })
  })

  describe('rotateGate', () => {
    it('rotates gate by specified angle', () => {
      const gate = gateActions.addGate('NAND', { x: 0, y: 0, z: 0 })
      
      gateActions.rotateGate(gate.id, 'y', Math.PI / 2)
      
      expect(circuitStore.gates[0].rotation.y).toBeCloseTo(Math.PI / 2)
    })

    it('accumulates rotation', () => {
      const gate = gateActions.addGate('NAND', { x: 0, y: 0, z: 0 })
      
      gateActions.rotateGate(gate.id, 'y', Math.PI / 4)
      gateActions.rotateGate(gate.id, 'y', Math.PI / 4)
      
      expect(circuitStore.gates[0].rotation.y).toBeCloseTo(Math.PI / 2)
    })
  })
})
