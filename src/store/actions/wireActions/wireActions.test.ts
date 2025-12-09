import { describe, it, expect, beforeEach } from 'vitest'
import { circuitStore } from '../../circuitStore'
import { wireActions } from './wireActions'
import { gateActions } from '../gateActions/gateActions'

describe('wireActions', () => {
  beforeEach(() => {
    // Reset store state before each test
    circuitStore.gates = []
    circuitStore.wires = []
  })

  describe('addWire', () => {
    it('adds a wire between two gates', () => {
      const gate1 = gateActions.addGate('NAND', { x: 0, y: 0, z: 0 })
      const gate2 = gateActions.addGate('NAND', { x: 2, y: 0, z: 0 })
      
      const wire = wireActions.addWire(
        gate1.id, gate1.outputs[0].id,
        gate2.id, gate2.inputs[0].id
      )
      
      expect(circuitStore.wires).toHaveLength(1)
      expect(wire.fromGateId).toBe(gate1.id)
      expect(wire.toGateId).toBe(gate2.id)
    })

    it('creates wire with unique id', () => {
      const gate1 = gateActions.addGate('NAND', { x: 0, y: 0, z: 0 })
      const gate2 = gateActions.addGate('NAND', { x: 2, y: 0, z: 0 })
      
      const wire1 = wireActions.addWire(
        gate1.id, gate1.outputs[0].id,
        gate2.id, gate2.inputs[0].id
      )
      const wire2 = wireActions.addWire(
        gate1.id, gate1.outputs[0].id,
        gate2.id, gate2.inputs[1].id
      )
      
      expect(wire1.id).not.toBe(wire2.id)
    })
  })

  describe('removeWire', () => {
    it('removes wire from store', () => {
      const gate1 = gateActions.addGate('NAND', { x: 0, y: 0, z: 0 })
      const gate2 = gateActions.addGate('NAND', { x: 2, y: 0, z: 0 })
      
      const wire = wireActions.addWire(
        gate1.id, gate1.outputs[0].id,
        gate2.id, gate2.inputs[0].id
      )
      expect(circuitStore.wires).toHaveLength(1)
      
      wireActions.removeWire(wire.id)
      expect(circuitStore.wires).toHaveLength(0)
    })

    it('does nothing if wire does not exist', () => {
      const gate1 = gateActions.addGate('NAND', { x: 0, y: 0, z: 0 })
      const gate2 = gateActions.addGate('NAND', { x: 2, y: 0, z: 0 })
      
      wireActions.addWire(
        gate1.id, gate1.outputs[0].id,
        gate2.id, gate2.inputs[0].id
      )
      expect(circuitStore.wires).toHaveLength(1)
      
      wireActions.removeWire('non-existent-id')
      expect(circuitStore.wires).toHaveLength(1)
    })
  })

  describe('setInputValue', () => {
    it('sets input pin value', () => {
      const gate = gateActions.addGate('NAND', { x: 0, y: 0, z: 0 })
      
      wireActions.setInputValue(gate.id, gate.inputs[0].id, true)
      
      expect(circuitStore.gates[0].inputs[0].value).toBe(true)
    })

    it('does nothing if gate does not exist', () => {
      wireActions.setInputValue('non-existent-id', 'pin-id', true)
      // Should not throw
    })

    it('does nothing if pin does not exist', () => {
      const gate = gateActions.addGate('NAND', { x: 0, y: 0, z: 0 })
      
      wireActions.setInputValue(gate.id, 'non-existent-pin', true)
      
      expect(circuitStore.gates[0].inputs[0].value).toBe(false)
    })
  })
})
