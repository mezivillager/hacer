import { describe, it, expect, beforeEach, vi } from 'vitest'
import { message } from 'antd'
import { useCircuitStore } from '../../circuitStore'

// Helper to get store state
const getState = () => useCircuitStore.getState()

// Mock Ant Design message
vi.mock('antd', () => ({
  message: {
    warning: vi.fn(),
  },
}))

describe('wiringActions', () => {
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
    vi.clearAllMocks()
  })

  describe('startWiring', () => {
    it('sets wiringFrom state', () => {
      const gate = getState().addGate('NAND', { x: 0, y: 0, z: 0 })
      
      getState().startWiring(
        gate.id, gate.outputs[0].id, 'output',
        { x: 0.7, y: 0, z: 0 }
      )
      
      expect(getState().wiringFrom).toEqual({
        fromGateId: gate.id,
        fromPinId: gate.outputs[0].id,
        fromPinType: 'output',
        fromPosition: { x: 0.7, y: 0, z: 0 },
        previewEndPosition: null,
      })
    })

    it('clears placement mode', () => {
      useCircuitStore.setState({ placementMode: 'NAND' })
      const gate = getState().addGate('NAND', { x: 0, y: 0, z: 0 })
      
      getState().startWiring(
        gate.id, gate.outputs[0].id, 'output',
        { x: 0.7, y: 0, z: 0 }
      )
      
      expect(getState().placementMode).toBe(null)
    })
  })

  describe('updateWirePreviewPosition', () => {
    it('updates preview position when wiring is active', () => {
      const gate = getState().addGate('NAND', { x: 0, y: 0, z: 0 })
      getState().startWiring(
        gate.id, gate.outputs[0].id, 'output',
        { x: 0.7, y: 0, z: 0 }
      )
      
      getState().updateWirePreviewPosition({ x: 1, y: 2, z: 3 })
      
      expect(getState().wiringFrom?.previewEndPosition).toEqual({ x: 1, y: 2, z: 3 })
    })

    it('does nothing if wiring is not active', () => {
      getState().updateWirePreviewPosition({ x: 1, y: 2, z: 3 })
      
      expect(getState().wiringFrom).toBe(null)
    })
  })

  describe('cancelWiring', () => {
    it('clears wiringFrom state', () => {
      const gate = getState().addGate('NAND', { x: 0, y: 0, z: 0 })
      getState().startWiring(
        gate.id, gate.outputs[0].id, 'output',
        { x: 0.7, y: 0, z: 0 }
      )
      
      getState().cancelWiring()
      
      expect(getState().wiringFrom).toBe(null)
    })
  })

  describe('completeWiring', () => {
    it('creates wire when connecting output to input', () => {
      const gate1 = getState().addGate('NAND', { x: 0, y: 0, z: 0 })
      const gate2 = getState().addGate('NAND', { x: 2, y: 0, z: 0 })
      
      getState().startWiring(
        gate1.id, gate1.outputs[0].id, 'output',
        { x: 0.7, y: 0, z: 0 }
      )
      getState().completeWiring(gate2.id, gate2.inputs[0].id, 'input')
      
      expect(getState().wires).toHaveLength(1)
      expect(getState().wires[0].fromGateId).toBe(gate1.id)
      expect(getState().wires[0].toGateId).toBe(gate2.id)
      expect(getState().wiringFrom).toBe(null)
    })

    it('rejects connection between same pin types', () => {
      const gate1 = getState().addGate('NAND', { x: 0, y: 0, z: 0 })
      const gate2 = getState().addGate('NAND', { x: 2, y: 0, z: 0 })
      
      getState().startWiring(
        gate1.id, gate1.outputs[0].id, 'output',
        { x: 0.7, y: 0, z: 0 }
      )
      getState().completeWiring(gate2.id, gate2.outputs[0].id, 'output')
      
      expect(getState().wires).toHaveLength(0)
      expect(message.warning).toHaveBeenCalledWith('Cannot connect same pin types')
      expect(getState().wiringFrom).toBe(null)
    })

    it('rejects connection to same gate', () => {
      const gate = getState().addGate('NAND', { x: 0, y: 0, z: 0 })
      
      getState().startWiring(
        gate.id, gate.outputs[0].id, 'output',
        { x: 0.7, y: 0, z: 0 }
      )
      getState().completeWiring(gate.id, gate.inputs[0].id, 'input')
      
      expect(getState().wires).toHaveLength(0)
      expect(message.warning).toHaveBeenCalledWith('Cannot connect gate to itself')
      expect(getState().wiringFrom).toBe(null)
    })

    it('rejects duplicate wire', () => {
      const gate1 = getState().addGate('NAND', { x: 0, y: 0, z: 0 })
      const gate2 = getState().addGate('NAND', { x: 2, y: 0, z: 0 })
      
      // Create first wire
      getState().startWiring(
        gate1.id, gate1.outputs[0].id, 'output',
        { x: 0.7, y: 0, z: 0 }
      )
      getState().completeWiring(gate2.id, gate2.inputs[0].id, 'input')
      expect(getState().wires).toHaveLength(1)
      
      // Try to create duplicate
      getState().startWiring(
        gate1.id, gate1.outputs[0].id, 'output',
        { x: 0.7, y: 0, z: 0 }
      )
      getState().completeWiring(gate2.id, gate2.inputs[0].id, 'input')
      
      expect(getState().wires).toHaveLength(1)
      expect(message.warning).toHaveBeenCalledWith('Wire already exists')
    })

    it('normalizes wire direction (input to output)', () => {
      const gate1 = getState().addGate('NAND', { x: 0, y: 0, z: 0 })
      const gate2 = getState().addGate('NAND', { x: 2, y: 0, z: 0 })
      
      getState().startWiring(
        gate1.id, gate1.inputs[0].id, 'input',
        { x: -0.7, y: 0, z: 0 }
      )
      getState().completeWiring(gate2.id, gate2.outputs[0].id, 'output')
      
      expect(getState().wires).toHaveLength(1)
      // Should be normalized to output -> input
      expect(getState().wires[0].fromGateId).toBe(gate2.id)
      expect(getState().wires[0].toGateId).toBe(gate1.id)
    })

    it('does nothing if wiring is not active', () => {
      const gate2 = getState().addGate('NAND', { x: 2, y: 0, z: 0 })
      
      getState().completeWiring(gate2.id, gate2.inputs[0].id, 'input')
      
      expect(getState().wires).toHaveLength(0)
    })
  })
})
