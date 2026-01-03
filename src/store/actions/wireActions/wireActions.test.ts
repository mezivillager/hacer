import { describe, it, expect, beforeEach } from 'vitest'
import { useCircuitStore } from '../../circuitStore'
import type { WireSegment } from '@/utils/wiringScheme/types'

// Helper to get store state
const getState = () => useCircuitStore.getState()

describe('wireActions', () => {
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

  describe('addWire', () => {
    it('adds a wire between two gates', () => {
      const gate1 = getState().addGate('NAND', { x: 0, y: 0, z: 0 })
      const gate2 = getState().addGate('NAND', { x: 2, y: 0, z: 0 })

      const wire = getState().addWire(
        gate1.id, gate1.outputs[0].id,
        gate2.id, gate2.inputs[0].id,
        []
      )

      expect(getState().wires).toHaveLength(1)
      expect(wire.fromGateId).toBe(gate1.id)
      expect(wire.toGateId).toBe(gate2.id)
    })

    it('creates wire with unique id', () => {
      const gate1 = getState().addGate('NAND', { x: 0, y: 0, z: 0 })
      const gate2 = getState().addGate('NAND', { x: 2, y: 0, z: 0 })

      const wire1 = getState().addWire(
        gate1.id, gate1.outputs[0].id,
        gate2.id, gate2.inputs[0].id,
        []
      )
      const wire2 = getState().addWire(
        gate1.id, gate1.outputs[0].id,
        gate2.id, gate2.inputs[1].id,
        []
      )

      expect(wire1.id).not.toBe(wire2.id)
    })
  })

  describe('removeWire', () => {
    it('removes wire from store', () => {
      const gate1 = getState().addGate('NAND', { x: 0, y: 0, z: 0 })
      const gate2 = getState().addGate('NAND', { x: 2, y: 0, z: 0 })

      const wire = getState().addWire(
        gate1.id, gate1.outputs[0].id,
        gate2.id, gate2.inputs[0].id,
        []
      )
      expect(getState().wires).toHaveLength(1)

      getState().removeWire(wire.id)
      expect(getState().wires).toHaveLength(0)
    })

    it('does nothing if wire does not exist', () => {
      const gate1 = getState().addGate('NAND', { x: 0, y: 0, z: 0 })
      const gate2 = getState().addGate('NAND', { x: 2, y: 0, z: 0 })

      getState().addWire(
        gate1.id, gate1.outputs[0].id,
        gate2.id, gate2.inputs[0].id,
        []
      )
      expect(getState().wires).toHaveLength(1)

      getState().removeWire('non-existent-id')
      expect(getState().wires).toHaveLength(1)
    })

    it('removes orphaned arcs from wires that crossed over the removed wire', () => {
      const gate1 = getState().addGate('NAND', { x: 0, y: 0, z: 0 })
      const gate2 = getState().addGate('NAND', { x: 2, y: 0, z: 0 })
      const gate3 = getState().addGate('NAND', { x: 4, y: 0, z: 0 })
      const gate4 = getState().addGate('NAND', { x: 6, y: 0, z: 0 })

      // Wire B: created first, no arcs (vertical segment)
      const wireB = getState().addWire(
        gate1.id, gate1.outputs[0].id,
        gate2.id, gate2.inputs[0].id,
        [{ start: { x: 5, y: 0.2, z: 0 }, end: { x: 5, y: 0.2, z: 10 }, type: 'vertical' }],
        []
      )

      // Wire A: created second, has arc hopping over Wire B
      const arcCenter = { x: 5, y: 0.2, z: 5 }
      const wireA = getState().addWire(
        gate3.id, gate3.outputs[0].id,
        gate4.id, gate4.inputs[0].id,
        [
          { start: { x: 0, y: 0.2, z: 5 }, end: { x: 4.9, y: 0.2, z: 5 }, type: 'horizontal' },
          { start: { x: 4.9, y: 0.2, z: 5 }, end: { x: 5.1, y: 0.2, z: 5 }, type: 'arc', arcCenter, arcRadius: 0.1, crossedWireId: wireB.id },
          { start: { x: 5.1, y: 0.2, z: 5 }, end: { x: 10, y: 0.2, z: 5 }, type: 'horizontal' },
        ],
        [wireB.id] // Wire A crosses over Wire B
      )

      expect(getState().wires).toHaveLength(2)

      // Verify Wire A has an arc before removal
      const wireABefore = getState().wires.find((w) => w.id === wireA.id)!
      expect(wireABefore.segments.some((s) => s.type === 'arc')).toBe(true)
      expect(wireABefore.crossesWireIds).toContain(wireB.id)

      // Remove Wire B (the wire WITHOUT the arc)
      getState().removeWire(wireB.id)

      expect(getState().wires).toHaveLength(1)

      // Wire A's arc should be removed and replaced with smooth segment
      const wireAAfter = getState().wires.find((w) => w.id === wireA.id)!
      expect(wireAAfter.segments.some((s) => s.type === 'arc')).toBe(false)
      expect(wireAAfter.crossesWireIds).not.toContain(wireB.id)
    })

    it('handles wires with undefined crossesWireIds gracefully', () => {
      const gate1 = getState().addGate('NAND', { x: 0, y: 0, z: 0 })
      const gate2 = getState().addGate('NAND', { x: 2, y: 0, z: 0 })

      // Create a wire and manually set crossesWireIds to undefined to simulate legacy data
      const wire = getState().addWire(
        gate1.id, gate1.outputs[0].id,
        gate2.id, gate2.inputs[0].id,
        []
      )

      // Simulate legacy wire without crossesWireIds
      useCircuitStore.setState((state) => {
        const w = state.wires.find((w) => w.id === wire.id)
        if (w) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (w as any).crossesWireIds = undefined
        }
      })

      // Removing a non-existent wire should not throw even with undefined crossesWireIds
      expect(() => getState().removeWire('some-other-wire-id')).not.toThrow()
    })
  })

  describe('setInputValue', () => {
    it('sets input pin value', () => {
      const gate = getState().addGate('NAND', { x: 0, y: 0, z: 0 })

      getState().setInputValue(gate.id, gate.inputs[0].id, true)

      expect(getState().gates[0].inputs[0].value).toBe(true)
    })

    it('does nothing if gate does not exist', () => {
      getState().setInputValue('non-existent-id', 'pin-id', true)
      // Should not throw
    })

    it('does nothing if pin does not exist', () => {
      const gate = getState().addGate('NAND', { x: 0, y: 0, z: 0 })

      getState().setInputValue(gate.id, 'non-existent-pin', true)

      expect(getState().gates[0].inputs[0].value).toBe(false)
    })
  })

  describe('updateWireSegments', () => {
    it('updates wire segments', () => {
      const gate1 = getState().addGate('NAND', { x: 0, y: 0, z: 0 })
      const gate2 = getState().addGate('NAND', { x: 2, y: 0, z: 0 })

      const wire = getState().addWire(
        gate1.id, gate1.outputs[0].id,
        gate2.id, gate2.inputs[0].id,
        [{ start: { x: 0, y: 0, z: 0 }, end: { x: 1, y: 0, z: 0 }, type: 'horizontal' }]
      )

      const newSegments: WireSegment[] = [
        { start: { x: 0, y: 0, z: 0 }, end: { x: 2, y: 0, z: 0 }, type: 'horizontal' },
        { start: { x: 2, y: 0, z: 0 }, end: { x: 2, y: 0, z: 1 }, type: 'vertical' },
      ]

      getState().updateWireSegments(wire.id, newSegments)

      expect(getState().wires[0].segments).toEqual(newSegments)
    })

    it('does nothing if wire does not exist', () => {
      const newSegments: WireSegment[] = [
        { start: { x: 0, y: 0, z: 0 }, end: { x: 1, y: 0, z: 0 }, type: 'horizontal' },
      ]

      getState().updateWireSegments('non-existent-id', newSegments)
      // Should not throw
      expect(getState().wires).toHaveLength(0)
    })
  })
})
