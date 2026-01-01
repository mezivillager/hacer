import { describe, it, expect, beforeEach, vi } from 'vitest'
import { message } from 'antd'
import { useCircuitStore } from '../../circuitStore'
import { GRID_SIZE } from '@/utils/grid'
import type { WireSegment } from '@/utils/wiringScheme/types'
import { calculateWirePathFromConnection } from '@/utils/wiringScheme'
import { collectWireSegments } from '@/utils/wiringScheme/segments'

// Mock Ant Design message
vi.mock('antd', () => ({
  message: {
    error: vi.fn(),
    warning: vi.fn(),
  },
}))

// Helper to get store state
const getState = () => useCircuitStore.getState()

describe('gateActions', () => {
  beforeEach(() => {
    // Reset store state before each test
    useCircuitStore.setState({
      gates: [],
      wires: [],
      selectedGateId: null,
      selectedWireId: null,
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

    it('initializes gate with flat orientation (90° around X axis)', () => {
      const gate = getState().addGate('NAND', { x: 0, y: 0, z: 0 })

      expect(gate.rotation.x).toBeCloseTo(Math.PI / 2)
      expect(gate.rotation.y).toBe(0)
      expect(gate.rotation.z).toBe(0)
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
        gate2.id, gate2.inputs[0].id,
        []
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

    it('deselects wire when selecting gate', () => {
      const gate1 = getState().addGate('NAND', { x: 0, y: 0, z: 0 })
      const gate2 = getState().addGate('NAND', { x: 2, y: 0, z: 0 })
      const wire = getState().addWire(
        gate1.id, gate1.outputs[0].id,
        gate2.id, gate2.inputs[0].id,
        []
      )

      getState().selectWire(wire.id)
      expect(getState().selectedWireId).toBe(wire.id)

      getState().selectGate(gate1.id)

      expect(getState().selectedGateId).toBe(gate1.id)
      expect(getState().selectedWireId).toBe(null)
    })
  })

  describe('selectWire', () => {
    it('selects a wire by id', () => {
      const gate1 = getState().addGate('NAND', { x: 0, y: 0, z: 0 })
      const gate2 = getState().addGate('NAND', { x: 2, y: 0, z: 0 })
      const wire = getState().addWire(
        gate1.id, gate1.outputs[0].id,
        gate2.id, gate2.inputs[0].id,
        []
      )

      getState().selectWire(wire.id)

      expect(getState().selectedWireId).toBe(wire.id)
    })

    it('deselects previously selected wire', () => {
      const gate1 = getState().addGate('NAND', { x: 0, y: 0, z: 0 })
      const gate2 = getState().addGate('NAND', { x: 2, y: 0, z: 0 })
      const gate3 = getState().addGate('NAND', { x: 4, y: 0, z: 0 })
      const wire1 = getState().addWire(
        gate1.id, gate1.outputs[0].id,
        gate2.id, gate2.inputs[0].id,
        []
      )
      const wire2 = getState().addWire(
        gate2.id, gate2.outputs[0].id,
        gate3.id, gate3.inputs[0].id,
        []
      )

      getState().selectWire(wire1.id)
      getState().selectWire(wire2.id)

      expect(getState().selectedWireId).toBe(wire2.id)
    })

    it('clears selection when null is passed', () => {
      const gate1 = getState().addGate('NAND', { x: 0, y: 0, z: 0 })
      const gate2 = getState().addGate('NAND', { x: 2, y: 0, z: 0 })
      const wire = getState().addWire(
        gate1.id, gate1.outputs[0].id,
        gate2.id, gate2.inputs[0].id,
        []
      )
      getState().selectWire(wire.id)

      getState().selectWire(null)

      expect(getState().selectedWireId).toBe(null)
    })

    it('deselects gate when selecting wire', () => {
      const gate1 = getState().addGate('NAND', { x: 0, y: 0, z: 0 })
      const gate2 = getState().addGate('NAND', { x: 2, y: 0, z: 0 })
      const wire = getState().addWire(
        gate1.id, gate1.outputs[0].id,
        gate2.id, gate2.inputs[0].id,
        []
      )

      getState().selectGate(gate1.id)
      expect(getState().selectedGateId).toBe(gate1.id)
      expect(getState().gates[0].selected).toBe(true)

      getState().selectWire(wire.id)

      expect(getState().selectedWireId).toBe(wire.id)
      expect(getState().selectedGateId).toBe(null)
      expect(getState().gates[0].selected).toBe(false)
    })

    it('does nothing if selection unchanged', () => {
      const gate1 = getState().addGate('NAND', { x: 0, y: 0, z: 0 })
      const gate2 = getState().addGate('NAND', { x: 2, y: 0, z: 0 })
      const wire = getState().addWire(
        gate1.id, gate1.outputs[0].id,
        gate2.id, gate2.inputs[0].id,
        []
      )

      getState().selectWire(wire.id)
      const state1 = getState()

      getState().selectWire(wire.id)
      const state2 = getState()

      // Should not cause unnecessary re-renders (state reference check would be in Immer)
      expect(state1.selectedWireId).toBe(wire.id)
      expect(state2.selectedWireId).toBe(wire.id)
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

    it('recalculates wires attached to moved gate', () => {
      const gate1 = getState().addGate('NAND', { x: 0, y: 0, z: 0 })
      const gate2 = getState().addGate('NAND', { x: GRID_SIZE * 2, y: 0, z: 0 })

      // Create wire with initial segments
      const initialSegments: WireSegment[] = [
        { start: { x: 0.84, y: 0.2, z: 0 }, end: { x: 4, y: 0.2, z: 0 }, type: 'exit' },
        { start: { x: 4, y: 0.2, z: 0 }, end: { x: 4, y: 0.2, z: 0 }, type: 'horizontal' },
        { start: { x: 4, y: 0.2, z: 0 }, end: { x: 2.6, y: 0.2, z: 0 }, type: 'entry' },
      ]
      const wire = getState().addWire(
        gate1.id, gate1.outputs[0].id,
        gate2.id, gate2.inputs[0].id,
        initialSegments
      )

      // Store initial segments
      const originalSegments = [...wire.segments]

      // Move gate1 to a new position
      getState().updateGatePosition(gate1.id, { x: GRID_SIZE * 4, y: 0, z: GRID_SIZE * 2 })

      // Wire segments should be recalculated (different from original)
      const updatedWire = getState().wires.find((w) => w.id === wire.id)
      expect(updatedWire).toBeDefined()
      expect(updatedWire!.segments).not.toEqual(originalSegments)
      expect(updatedWire!.segments.length).toBeGreaterThan(0)
    })

    it('recalculates multiple wires attached to moved gate', () => {
      const gate1 = getState().addGate('NAND', { x: 0, y: 0, z: 0 })
      const gate2 = getState().addGate('NAND', { x: GRID_SIZE * 2, y: 0, z: 0 })
      const gate3 = getState().addGate('NAND', { x: GRID_SIZE * 4, y: 0, z: 0 })

      // Create two wires from gate1
      const wire1 = getState().addWire(
        gate1.id, gate1.outputs[0].id,
        gate2.id, gate2.inputs[0].id,
        [{ start: { x: 0, y: 0, z: 0 }, end: { x: 1, y: 0, z: 0 }, type: 'horizontal' }]
      )
      const wire2 = getState().addWire(
        gate1.id, gate1.outputs[0].id,
        gate3.id, gate3.inputs[0].id,
        [{ start: { x: 0, y: 0, z: 0 }, end: { x: 1, y: 0, z: 0 }, type: 'horizontal' }]
      )

      const originalSegments1 = [...wire1.segments]
      const originalSegments2 = [...wire2.segments]

      // Move gate1
      getState().updateGatePosition(gate1.id, { x: GRID_SIZE * 6, y: 0, z: GRID_SIZE * 2 })

      // Both wires should be recalculated
      const updatedWire1 = getState().wires.find((w) => w.id === wire1.id)
      const updatedWire2 = getState().wires.find((w) => w.id === wire2.id)

      expect(updatedWire1!.segments).not.toEqual(originalSegments1)
      expect(updatedWire2!.segments).not.toEqual(originalSegments2)
    })

    it('does not recalculate wires not attached to moved gate', () => {
      const gate1 = getState().addGate('NAND', { x: 0, y: 0, z: 0 })
      const gate2 = getState().addGate('NAND', { x: GRID_SIZE * 2, y: 0, z: 0 })
      const gate3 = getState().addGate('NAND', { x: GRID_SIZE * 4, y: 0, z: 0 })

      // Create wire between gate2 and gate3 (not connected to gate1)
      const wire = getState().addWire(
        gate2.id, gate2.outputs[0].id,
        gate3.id, gate3.inputs[0].id,
        [{ start: { x: 0, y: 0, z: 0 }, end: { x: 1, y: 0, z: 0 }, type: 'horizontal' }]
      )

      const originalSegments = [...wire.segments]

      // Move gate1 (not connected to wire)
      getState().updateGatePosition(gate1.id, { x: GRID_SIZE * 6, y: 0, z: GRID_SIZE * 2 })

      // Wire segments should remain unchanged
      const updatedWire = getState().wires.find((w) => w.id === wire.id)
      expect(updatedWire!.segments).toEqual(originalSegments)
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

    it('recalculates wires when rotation changes', () => {
      const gate1 = getState().addGate('NAND', { x: 0, y: 0, z: 0 })
      const gate2 = getState().addGate('NAND', { x: GRID_SIZE * 2, y: 0, z: 0 })

      const wire = getState().addWire(
        gate1.id, gate1.outputs[0].id,
        gate2.id, gate2.inputs[0].id,
        [{ start: { x: 0, y: 0, z: 0 }, end: { x: 1, y: 0, z: 0 }, type: 'horizontal' }]
      )

      const originalSegments = [...wire.segments]

      // Update rotation - should trigger wire recalculation
      getState().updateGateRotation(gate1.id, { x: Math.PI / 2, y: 0, z: Math.PI / 2 })

      const updatedWire = getState().wires.find((w) => w.id === wire.id)
      expect(updatedWire).toBeDefined()
      expect(updatedWire!.segments).not.toEqual(originalSegments)
      expect(updatedWire!.segments.length).toBeGreaterThan(0)
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

    it('recalculates wires when gate rotates', () => {
      const gate1 = getState().addGate('NAND', { x: 0, y: 0, z: 0 })
      const gate2 = getState().addGate('NAND', { x: GRID_SIZE * 2, y: 0, z: 0 })

      const wire = getState().addWire(
        gate1.id, gate1.outputs[0].id,
        gate2.id, gate2.inputs[0].id,
        [{ start: { x: 0, y: 0, z: 0 }, end: { x: 1, y: 0, z: 0 }, type: 'horizontal' }]
      )

      const originalSegments = [...wire.segments]

      // Rotate gate - should trigger wire recalculation
      getState().rotateGate(gate1.id, 'z', Math.PI / 2)

      const updatedWire = getState().wires.find((w) => w.id === wire.id)
      expect(updatedWire).toBeDefined()
      expect(updatedWire!.segments).not.toEqual(originalSegments)
      expect(updatedWire!.segments.length).toBeGreaterThan(0)
    })
  })

  describe('recalculateWiresForGate', () => {
    it('recalculates wires connected to gate', () => {
      const gate1 = getState().addGate('NAND', { x: 0, y: 0, z: 0 })
      const gate2 = getState().addGate('NAND', { x: GRID_SIZE * 2, y: 0, z: 0 })

      const wire = getState().addWire(
        gate1.id, gate1.outputs[0].id,
        gate2.id, gate2.inputs[0].id,
        [{ start: { x: 0, y: 0, z: 0 }, end: { x: 1, y: 0, z: 0 }, type: 'horizontal' }]
      )

      const originalSegments = [...wire.segments]

      // Move gate using updateGatePosition (which triggers recalculation automatically)
      // But we want to test recalculateWiresForGate directly, so we'll use setState
      useCircuitStore.setState((state) => {
        const gate = state.gates.find((g) => g.id === gate1.id)
        if (gate) {
          gate.position = { x: GRID_SIZE * 4, y: 0, z: GRID_SIZE * 2 }
        }
      })

      // Recalculate wires
      getState().recalculateWiresForGate(gate1.id)

      const updatedWire = getState().wires.find((w) => w.id === wire.id)
      expect(updatedWire).toBeDefined()
      expect(updatedWire!.segments).not.toEqual(originalSegments)
      expect(updatedWire!.segments.length).toBeGreaterThan(0)
    })

    it('handles gate with no wires', () => {
      const gate = getState().addGate('NAND', { x: 0, y: 0, z: 0 })

      // Should not throw
      getState().recalculateWiresForGate(gate.id)
    })

    it('handles wire where gate is destination', () => {
      const gate1 = getState().addGate('NAND', { x: 0, y: 0, z: 0 })
      const gate2 = getState().addGate('NAND', { x: GRID_SIZE * 2, y: 0, z: 0 })

      // Wire from gate1 to gate2
      const wire = getState().addWire(
        gate1.id, gate1.outputs[0].id,
        gate2.id, gate2.inputs[0].id,
        [{ start: { x: 0, y: 0, z: 0 }, end: { x: 1, y: 0, z: 0 }, type: 'horizontal' }]
      )

      const originalSegments = [...wire.segments]

      // Move gate2 (destination gate) using setState
      useCircuitStore.setState((state) => {
        const gate = state.gates.find((g) => g.id === gate2.id)
        if (gate) {
          gate.position = { x: GRID_SIZE * 6, y: 0, z: GRID_SIZE * 2 }
        }
      })

      // Recalculate wires for gate2
      getState().recalculateWiresForGate(gate2.id)

      const updatedWire = getState().wires.find((w) => w.id === wire.id)
      expect(updatedWire!.segments).not.toEqual(originalSegments)
    })

    it('removes wire and shows error when path calculation returns null', () => {
      const gate1 = getState().addGate('NAND', { x: 0, y: 0, z: 0 })
      const gate2 = getState().addGate('NAND', { x: GRID_SIZE * 2, y: 0, z: 0 })

      getState().addWire(
        gate1.id, gate1.outputs[0].id,
        gate2.id, gate2.inputs[0].id,
        [{ start: { x: 0, y: 0, z: 0 }, end: { x: 1, y: 0, z: 0 }, type: 'horizontal' }]
      )

      expect(getState().wires).toHaveLength(1)

      // Mock getPinWorldPosition to return null (simulating missing pin)
      const originalGetPinWorldPosition = getState().getPinWorldPosition
      useCircuitStore.setState((state) => {
        // Replace getPinWorldPosition with a mock that returns null
        state.getPinWorldPosition = () => null
      })

      // Recalculate wires - should fail and remove wire
      getState().recalculateWiresForGate(gate1.id)

      // Wire should be removed
      expect(getState().wires).toHaveLength(0)

      // Error message should be shown
      expect(message.error).toHaveBeenCalledWith('Unable to recalculate wire path. Wire has been disconnected.')

      // Restore original function
      useCircuitStore.setState((state) => {
        state.getPinWorldPosition = originalGetPinWorldPosition
      })
    })

    it('removes wire and shows error when path calculation throws exception', () => {
      const gate1 = getState().addGate('NAND', { x: 0, y: 0, z: 0 })
      const gate2 = getState().addGate('NAND', { x: GRID_SIZE * 2, y: 0, z: 0 })

      getState().addWire(
        gate1.id, gate1.outputs[0].id,
        gate2.id, gate2.inputs[0].id,
        [{ start: { x: 0, y: 0, z: 0 }, end: { x: 1, y: 0, z: 0 }, type: 'horizontal' }]
      )

      expect(getState().wires).toHaveLength(1)

      // Mock getPinWorldPosition to throw an error
      const originalGetPinWorldPosition = getState().getPinWorldPosition
      const testError = new Error('Test error in getPinWorldPosition')
      useCircuitStore.setState((state) => {
        state.getPinWorldPosition = () => {
          throw testError
        }
      })

      // Mock console.error to verify it's called
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      // Recalculate wires - should throw and remove wire
      getState().recalculateWiresForGate(gate1.id)

      // Wire should be removed
      expect(getState().wires).toHaveLength(0)

      // Error message should be shown
      expect(message.error).toHaveBeenCalledWith('Failed to recalculate wire. Wire has been disconnected.')

      // Error should be logged
      expect(consoleErrorSpy).toHaveBeenCalled()

      consoleErrorSpy.mockRestore()

      // Restore original function
      useCircuitStore.setState((state) => {
        state.getPinWorldPosition = originalGetPinWorldPosition
      })
    })

    it('handles multiple wires where some fail and some succeed', () => {
      const gate1 = getState().addGate('NAND', { x: 0, y: 0, z: 0 })
      const gate2 = getState().addGate('NAND', { x: GRID_SIZE * 2, y: 0, z: 0 })
      const gate3 = getState().addGate('NAND', { x: GRID_SIZE * 4, y: 0, z: 0 })

      // Wire1: gate1 -> gate2 (will fail)
      getState().addWire(
        gate1.id, gate1.outputs[0].id,
        gate2.id, gate2.inputs[0].id,
        [{ start: { x: 0, y: 0, z: 0 }, end: { x: 1, y: 0, z: 0 }, type: 'horizontal' }]
      )

      // Wire2: gate2 -> gate3 (will succeed when recalculating gate2)
      const wire2 = getState().addWire(
        gate2.id, gate2.outputs[0].id,
        gate3.id, gate3.inputs[0].id,
        [{ start: { x: 0, y: 0, z: 0 }, end: { x: 1, y: 0, z: 0 }, type: 'horizontal' }]
      )

      expect(getState().wires).toHaveLength(2)

      // Mock getPinWorldPosition to return null for gate1 and gate2 pins, but work for gate3
      const originalGetPinWorldPosition = getState().getPinWorldPosition
      useCircuitStore.setState((state) => {
        state.getPinWorldPosition = (gateId: string, pinId: string) => {
          // Fail for gate1 and gate2 (wire1 will fail), succeed for gate3 (wire2 will succeed)
          if (gateId === gate1.id || gateId === gate2.id) {
            return null
          }
          return originalGetPinWorldPosition(gateId, pinId)
        }
      })

      // Recalculate wires for gate1 - wire1 should fail and be removed
      getState().recalculateWiresForGate(gate1.id)

      // wire1 should be removed, wire2 should remain
      const remainingWires = getState().wires
      expect(remainingWires).toHaveLength(1)
      expect(remainingWires[0].id).toBe(wire2.id)

      // Error message should be shown (once for wire1)
      expect(message.error).toHaveBeenCalledWith('Unable to recalculate wire path. Wire has been disconnected.')

      // Restore original function
      useCircuitStore.setState((state) => {
        state.getPinWorldPosition = originalGetPinWorldPosition
      })
    })
  })

  describe('recalculateWiresForGate', () => {
    it('reproduces bug: arc segments lost after moving gate (recalculation)', () => {
      // BUG REPRODUCTION TEST: This test should FAIL to prove the bug exists
      // The bug: When a gate with a crossing wire is moved/rotated, recalculation loses the arc segments
      //
      // Setup: Use exact gate positions from manual testing that create crossings
      // - Gate A: x=-2, z=2, output pin facing +x (right) - default rotation
      // - Gate B: x=-2, z=-6, output pin facing -z (down) - needs rotation
      // - Gate C: x=-6, z=-2, output pin facing +x (right) - default rotation
      // - Gate D: x=6, z=-2, output pin facing +x (right) initially, then rotate to -z
      const gateA = getState().addGate('AND', { x: -2, y: 0, z: 2 })
      const gateB = getState().addGate('AND', { x: -2, y: 0, z: -6 })
      const gateC = getState().addGate('AND', { x: -6, y: 0, z: -2 })
      const gateD = getState().addGate('AND', { x: 6, y: 0, z: -2 })

      // Rotate Gate B so output pin faces -z (down/backward)
      getState().updateGateRotation(gateB.id, { x: Math.PI / 2, y: Math.PI / 2, z: 0 })

      // Create first wire A->B using pathfinding
      getState().startWiring(gateA.id, gateA.outputs[0].id, 'output', { x: -1.3, y: 0, z: 2 })
      const state = getState()
      const pathAB = calculateWirePathFromConnection(
        gateA.id, gateA.outputs[0].id,
        gateB.id, gateB.inputs[0].id,
        {
          gates: state.gates,
          getPinWorldPosition: state.getPinWorldPosition,
          getPinOrientation: state.getPinOrientation,
          existingSegments: [],
        }
      )
      if (!pathAB) throw new Error('Failed to calculate path for wire A->B')
      useCircuitStore.setState((s) => {
        if (s.wiringFrom) s.wiringFrom.segments = pathAB.segments
      })
      getState().completeWiring(gateB.id, gateB.inputs[0].id, 'input')
      expect(getState().wires).toHaveLength(1)

      // Create second wire C->D using pathfinding
      getState().startWiring(gateC.id, gateC.outputs[0].id, 'output', { x: -5.3, y: 0, z: -2 })
      const state2 = getState()
      const existingSegments = collectWireSegments(state2.wires)
      const pathCD = calculateWirePathFromConnection(
        gateC.id, gateC.outputs[0].id,
        gateD.id, gateD.inputs[0].id,
        {
          gates: state2.gates,
          getPinWorldPosition: state2.getPinWorldPosition,
          getPinOrientation: state2.getPinOrientation,
          existingSegments,
        }
      )
      if (!pathCD) throw new Error('Failed to calculate path for wire C->D')
      useCircuitStore.setState((s) => {
        if (s.wiringFrom) s.wiringFrom.segments = pathCD.segments
      })
      getState().completeWiring(gateD.id, gateD.inputs[0].id, 'input')
      expect(getState().wires).toHaveLength(2)

      // Verify wires exist and check for crossings
      const wireAB = getState().wires.find((w) => w.fromGateId === gateA.id)
      const wireCD = getState().wires.find((w) => w.fromGateId === gateC.id)
      expect(wireAB).toBeDefined()
      expect(wireCD).toBeDefined()

      // Check if wires actually cross by examining segments
      // Wire A->B should have horizontal segments, Wire C->D should have vertical segments
      // They cross if there's a horizontal segment at some z and a vertical segment at some x
      // that intersect
      const abHorizontalSegments = wireAB?.segments.filter((s) =>
        s.type === 'horizontal'
      ) || []
      const cdVerticalSegments = wireCD?.segments.filter((s) =>
        s.type === 'vertical'
      ) || []
      const abVerticalSegments = wireAB?.segments.filter((s) =>
        s.type === 'vertical'
      ) || []
      const cdHorizontalSegments = wireCD?.segments.filter((s) =>
        s.type === 'horizontal'
      ) || []

      console.log('Wire A->B segments:', JSON.stringify(wireAB?.segments.map((s) => ({ type: s.type, start: { x: Math.round(s.start.x * 10) / 10, z: Math.round(s.start.z * 10) / 10 }, end: { x: Math.round(s.end.x * 10) / 10, z: Math.round(s.end.z * 10) / 10 } })), null, 2))
      console.log('Wire A->B horizontal segments:', abHorizontalSegments.length, 'vertical:', abVerticalSegments.length)
      console.log('Wire C->D horizontal segments:', cdHorizontalSegments.length, 'vertical:', cdVerticalSegments.length)
      console.log('Wire CD segments (first 20):', JSON.stringify(wireCD?.segments.slice(0, 20).map((s) => ({ type: s.type, start: { x: Math.round(s.start.x * 10) / 10, z: Math.round(s.start.z * 10) / 10 }, end: { x: Math.round(s.end.x * 10) / 10, z: Math.round(s.end.z * 10) / 10 } })), null, 2))

      // Check if segments actually cross (simplified check: look for perpendicular segments that intersect)
      // For a proper check, we'd need to use findSegmentCrossing, but for now just check if we have
      // both horizontal and vertical segments that could potentially cross
      const hasPotentialCrossing = abHorizontalSegments.length > 0 && cdVerticalSegments.length > 0

      const hasArcBefore = wireCD?.segments.some((s) => s.type === 'arc')
      console.log('Initial wire C->D - has arc before move/rotate:', hasArcBefore)
      console.log('Has potential crossing (horizontal + vertical segments):', hasPotentialCrossing)

      // BUG: If wires cross, arcs should exist
      // This assertion should FAIL to reproduce the bug - arcs are not created even when crossing exists
      if (hasPotentialCrossing) {
        expect(hasArcBefore).toBe(true) // BUG: This fails - arcs are not created even when crossing exists
      }

      // BUG REPRODUCTION: Move Gate C to x=-10, z=-2 (as per manual test)
      getState().updateGatePosition(gateC.id, { x: -10, y: 0, z: -2 })
      getState().recalculateWiresForGate(gateC.id)

      const wireCDAfter = getState().wires.find((w) => w.fromGateId === gateC.id)
      const hasArcAfter = wireCDAfter?.segments.some((s) => s.type === 'arc')
      console.log('After moving Gate C - has arc:', hasArcAfter)

      // BUG: If crossing exists, arcs should exist after recalculation too
      if (hasPotentialCrossing) {
        expect(hasArcAfter).toBe(true) // BUG: This fails - arcs are not created/maintained after recalculation
      }

      // Now test rotation scenario: Rotate Gate D so output pin faces -z
      getState().updateGatePosition(gateC.id, { x: -6, y: 0, z: -2 })
      getState().recalculateWiresForGate(gateC.id)
      getState().updateGateRotation(gateD.id, { x: Math.PI / 2, y: Math.PI / 2, z: 0 })
      getState().recalculateWiresForGate(gateD.id)

      const wireCDAfterRotate = getState().wires.find((w) => w.fromGateId === gateC.id)
      const hasArcAfterRotate = wireCDAfterRotate?.segments.some((s) => s.type === 'arc')
      console.log('After rotating Gate D - has arc:', hasArcAfterRotate)

      // BUG: If crossing exists, arcs should exist after rotation too
      if (hasPotentialCrossing) {
        expect(hasArcAfterRotate).toBe(true) // BUG: This fails - arcs are not created/maintained after rotation
      }
    })
  })
})
