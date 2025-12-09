import { describe, it, expect, beforeEach, vi } from 'vitest'
import { message } from 'antd'
import { circuitStore } from '../../circuitStore'
import { wiringActions } from './wiringActions'
import { gateActions } from '../gateActions/gateActions'

// Mock Ant Design message
vi.mock('antd', () => ({
  message: {
    warning: vi.fn(),
  },
}))

describe('wiringActions', () => {
  beforeEach(() => {
    // Reset store state before each test
    circuitStore.gates = []
    circuitStore.wires = []
    circuitStore.wiringFrom = null
    circuitStore.placementMode = null
    vi.clearAllMocks()
  })

  describe('startWiring', () => {
    it('sets wiringFrom state', () => {
      const gate = gateActions.addGate('NAND', { x: 0, y: 0, z: 0 })
      
      wiringActions.startWiring(
        gate.id, gate.outputs[0].id, 'output',
        { x: 0.7, y: 0, z: 0 }
      )
      
      expect(circuitStore.wiringFrom).toEqual({
        fromGateId: gate.id,
        fromPinId: gate.outputs[0].id,
        fromPinType: 'output',
        fromPosition: { x: 0.7, y: 0, z: 0 },
        previewEndPosition: null,
      })
    })

    it('clears placement mode', () => {
      circuitStore.placementMode = 'NAND'
      const gate = gateActions.addGate('NAND', { x: 0, y: 0, z: 0 })
      
      wiringActions.startWiring(
        gate.id, gate.outputs[0].id, 'output',
        { x: 0.7, y: 0, z: 0 }
      )
      
      expect(circuitStore.placementMode).toBe(null)
    })
  })

  describe('updateWirePreviewPosition', () => {
    it('updates preview position when wiring is active', () => {
      const gate = gateActions.addGate('NAND', { x: 0, y: 0, z: 0 })
      wiringActions.startWiring(
        gate.id, gate.outputs[0].id, 'output',
        { x: 0.7, y: 0, z: 0 }
      )
      
      wiringActions.updateWirePreviewPosition({ x: 1, y: 2, z: 3 })
      
      expect(circuitStore.wiringFrom?.previewEndPosition).toEqual({ x: 1, y: 2, z: 3 })
    })

    it('does nothing if wiring is not active', () => {
      wiringActions.updateWirePreviewPosition({ x: 1, y: 2, z: 3 })
      
      expect(circuitStore.wiringFrom).toBe(null)
    })
  })

  describe('cancelWiring', () => {
    it('clears wiringFrom state', () => {
      const gate = gateActions.addGate('NAND', { x: 0, y: 0, z: 0 })
      wiringActions.startWiring(
        gate.id, gate.outputs[0].id, 'output',
        { x: 0.7, y: 0, z: 0 }
      )
      
      wiringActions.cancelWiring()
      
      expect(circuitStore.wiringFrom).toBe(null)
    })
  })

  describe('completeWiring', () => {
    it('creates wire when connecting output to input', () => {
      const gate1 = gateActions.addGate('NAND', { x: 0, y: 0, z: 0 })
      const gate2 = gateActions.addGate('NAND', { x: 2, y: 0, z: 0 })
      
      wiringActions.startWiring(
        gate1.id, gate1.outputs[0].id, 'output',
        { x: 0.7, y: 0, z: 0 }
      )
      wiringActions.completeWiring(gate2.id, gate2.inputs[0].id, 'input')
      
      expect(circuitStore.wires).toHaveLength(1)
      expect(circuitStore.wires[0].fromGateId).toBe(gate1.id)
      expect(circuitStore.wires[0].toGateId).toBe(gate2.id)
      expect(circuitStore.wiringFrom).toBe(null)
    })

    it('rejects connection between same pin types', () => {
      const gate1 = gateActions.addGate('NAND', { x: 0, y: 0, z: 0 })
      const gate2 = gateActions.addGate('NAND', { x: 2, y: 0, z: 0 })
      
      wiringActions.startWiring(
        gate1.id, gate1.outputs[0].id, 'output',
        { x: 0.7, y: 0, z: 0 }
      )
      wiringActions.completeWiring(gate2.id, gate2.outputs[0].id, 'output')
      
      expect(circuitStore.wires).toHaveLength(0)
      expect(message.warning).toHaveBeenCalledWith('Cannot connect same pin types')
      expect(circuitStore.wiringFrom).toBe(null)
    })

    it('rejects connection to same gate', () => {
      const gate = gateActions.addGate('NAND', { x: 0, y: 0, z: 0 })
      
      wiringActions.startWiring(
        gate.id, gate.outputs[0].id, 'output',
        { x: 0.7, y: 0, z: 0 }
      )
      wiringActions.completeWiring(gate.id, gate.inputs[0].id, 'input')
      
      expect(circuitStore.wires).toHaveLength(0)
      expect(message.warning).toHaveBeenCalledWith('Cannot connect gate to itself')
      expect(circuitStore.wiringFrom).toBe(null)
    })

    it('rejects duplicate wire', () => {
      const gate1 = gateActions.addGate('NAND', { x: 0, y: 0, z: 0 })
      const gate2 = gateActions.addGate('NAND', { x: 2, y: 0, z: 0 })
      
      // Create first wire
      wiringActions.startWiring(
        gate1.id, gate1.outputs[0].id, 'output',
        { x: 0.7, y: 0, z: 0 }
      )
      wiringActions.completeWiring(gate2.id, gate2.inputs[0].id, 'input')
      expect(circuitStore.wires).toHaveLength(1)
      
      // Try to create duplicate
      wiringActions.startWiring(
        gate1.id, gate1.outputs[0].id, 'output',
        { x: 0.7, y: 0, z: 0 }
      )
      wiringActions.completeWiring(gate2.id, gate2.inputs[0].id, 'input')
      
      expect(circuitStore.wires).toHaveLength(1)
      expect(message.warning).toHaveBeenCalledWith('Wire already exists')
    })

    it('normalizes wire direction (input to output)', () => {
      const gate1 = gateActions.addGate('NAND', { x: 0, y: 0, z: 0 })
      const gate2 = gateActions.addGate('NAND', { x: 2, y: 0, z: 0 })
      
      wiringActions.startWiring(
        gate1.id, gate1.inputs[0].id, 'input',
        { x: -0.7, y: 0, z: 0 }
      )
      wiringActions.completeWiring(gate2.id, gate2.outputs[0].id, 'output')
      
      expect(circuitStore.wires).toHaveLength(1)
      // Should be normalized to output -> input
      expect(circuitStore.wires[0].fromGateId).toBe(gate2.id)
      expect(circuitStore.wires[0].toGateId).toBe(gate1.id)
    })

    it('does nothing if wiring is not active', () => {
      const gate2 = gateActions.addGate('NAND', { x: 2, y: 0, z: 0 })
      
      wiringActions.completeWiring(gate2.id, gate2.inputs[0].id, 'input')
      
      expect(circuitStore.wires).toHaveLength(0)
    })
  })
})
