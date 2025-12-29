import { message } from 'antd'
import type { GateActions, GateInstance, GateType, Pin, Position, CircuitStore } from '../../types'
import { snapToGrid } from '@/utils/grid'
import { useCircuitStore } from '../../circuitStore'
import { calculateWirePathFromConnection } from '@/utils/wiringScheme'
import { collectWireSegments } from '@/utils/wiringScheme/segments'
import { resolveCrossings } from '@/utils/wiringScheme/crossing'

// Helper to create a gate instance - exported for use in atomic placement actions
export function createGateInstance(type: GateType, position: Position): GateInstance {
  const id = `gate-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`

  const inputCount = type === 'NOT' ? 1 : 2
  const inputs: Pin[] = Array.from({ length: inputCount }, (_, i) => ({
    id: `${id}-in-${i}`,
    name: `IN${i}`,
    type: 'input',
    value: false,
  }))

  const outputs: Pin[] = [
    {
      id: `${id}-out-0`,
      name: 'OUT',
      type: 'output',
      value: false,
    },
  ]

  return {
    id,
    type,
    position,
    rotation: { x: Math.PI / 2, y: 0, z: 0 }, // Default: gates lie flat (90° around X axis)
    inputs,
    outputs,
    selected: false,
  }
}

type SetState = (
  fn: (state: CircuitStore) => void,
  replace?: false,
  actionName?: string
) => void
type GetState = () => CircuitStore

export const createGateActions = (set: SetState, get: GetState): GateActions => ({
  addGate: (type: GateType, position: Position) => {
    const gate = createGateInstance(type, position)
    set((state) => {
      state.gates.push(gate)
    }, false, 'addGate')
    return gate
  },

  removeGate: (gateId: string) => {
    set((state) => {
      const index = state.gates.findIndex((g) => g.id === gateId)
      if (index !== -1) {
        state.gates.splice(index, 1)
        // Remove associated wires
        state.wires = state.wires.filter(
          (w) => w.fromGateId !== gateId && w.toGateId !== gateId
        )
      }
    }, false, 'removeGate')
  },

  selectGate: (gateId: string | null) => {
    // Check if selection actually changed before mutating (avoids unnecessary array reference changes)
    const currentState = useCircuitStore.getState()
    if (currentState.selectedGateId === gateId) {
      // Selection hasn't changed - check if gates are already in correct state
      const allCorrect = currentState.gates.every((g) => g.selected === (g.id === gateId))
      if (allCorrect) {
        // Nothing to update - early return to avoid Immer mutation
        return
      }
    }

    set((state) => {
      // Update selection state
      state.gates.forEach((g) => {
        g.selected = g.id === gateId
      })
      state.selectedGateId = gateId
    }, false, 'selectGate')
  },

  updateGatePosition: (gateId: string, position: Position) => {
    // Snap position to grid before updating
    const snappedPosition = snapToGrid(position)
    set((state) => {
      const gate = state.gates.find((g) => g.id === gateId)
      if (gate) {
        gate.position = snappedPosition
      }
    }, false, 'updateGatePosition')

    // Recalculate wires attached to this gate after position update
    // Use getState() to access the updated state and call the action
    const updatedState = get()
    updatedState.recalculateWiresForGate(gateId)
  },

  updateGateRotation: (gateId: string, rotation: Position) => {
    set((state) => {
      const gate = state.gates.find((g) => g.id === gateId)
      if (gate) {
        gate.rotation = rotation
      }
    }, false, 'updateGateRotation')

    // Recalculate wires attached to this gate after rotation update
    // Use getState() to access the updated state and call the action
    const updatedState = get()
    updatedState.recalculateWiresForGate(gateId)
  },

  rotateGate: (gateId: string, axis: 'x' | 'y' | 'z', angle: number) => {
    set((state) => {
      const gate = state.gates.find((g) => g.id === gateId)
      if (gate) {
        const current = gate.rotation
        gate.rotation = {
          ...current,
          [axis]: (current[axis] + angle) % (Math.PI * 2),
        }
      }
    }, false, 'rotateGate')

    // Recalculate wires attached to this gate after rotation update
    // Use getState() to access the updated state and call the action
    const updatedState = get()
    updatedState.recalculateWiresForGate(gateId)
  },

  recalculateWiresForGate: (gateId: string) => {
    const state = get()
    const { wires } = state
    const getPinWorldPosition = state.getPinWorldPosition
    const getPinOrientation = state.getPinOrientation
    const updateWireSegments = state.updateWireSegments
    const removeWire = state.removeWire

    // Find all wires connected to this gate
    const connectedWires = wires.filter(
      (w) => w.fromGateId === gateId || w.toGateId === gateId
    )

    if (connectedWires.length === 0) {
      return // No wires to recalculate
    }

    // Recalculate each connected wire
    // IMPORTANT: Process wires in order, and for each wire:
    // 1. Get fresh state (includes any wires updated in previous iterations)
    // 2. Calculate new path using fresh segments from other wires
    // 3. Resolve crossings using fresh wires (which may include arcs from previous iterations)
    // 4. Update wire segments
    // This ensures that when multiple wires are recalculated, each sees the latest state
    for (const wire of connectedWires) {
      try {
        // Get fresh state for each iteration to see updated wires from previous iterations
        // This is critical: if wire1 was updated with arcs in a previous iteration,
        // wire2 should see wire1's updated segments (including arcs) when calculating its path
        const freshState = get()
        const freshGates = freshState.gates
        const freshWires = freshState.wires

        // Collect existing segments from other wires (for overlap avoidance in pathfinding)
        // Exclude the wire being recalculated
        // Note: This includes arc segments, but segmentsOverlap correctly excludes them
        // (arc segments are not on section lines, so they don't cause overlap)
        const allOtherWireSegments = collectWireSegments(freshWires, (w) => w.id !== wire.id)

        // Use helper function to calculate path from wire connection info
        const newPath = calculateWirePathFromConnection(
          wire.fromGateId,
          wire.fromPinId,
          wire.toGateId,
          wire.toPinId,
          {
            gates: freshGates,
            getPinWorldPosition,
            getPinOrientation,
            existingSegments: allOtherWireSegments,
          }
        )

        if (!newPath) {
          // Path calculation failed - remove disconnected wire
          message.error('Unable to recalculate wire path. Wire has been disconnected.')
          console.error(`[recalculateWiresForGate] Failed to calculate path for wire ${wire.id} - pins or gates not found`, {
            wireId: wire.id,
            fromGateId: wire.fromGateId,
            fromPinId: wire.fromPinId,
            toGateId: wire.toGateId,
            toPinId: wire.toPinId,
            gateId,
          })
          removeWire(wire.id)
          continue
        }

        // Resolve crossings: recalculated wire hops over all other existing wires
        // Get all other wires (excluding the wire being recalculated)
        // IMPORTANT: Use freshWires which includes any wires updated in previous loop iterations
        // This ensures crossing detection sees the latest state of all wires
        const allOtherWires = freshWires.filter((w) => w.id !== wire.id)
        let resolvedSegments = newPath.segments

        try {
          resolvedSegments = resolveCrossings(newPath.segments, allOtherWires)
        } catch (error) {
          // Crossing resolution failed - log warning but don't fail wire recalculation
          // The wire will be created without crossing resolution (user can manually rewire if needed)
          const errorMessage = error instanceof Error ? error.message : 'Failed to resolve wire crossings'
          console.warn(`[recalculateWiresForGate] Failed to resolve crossings for wire ${wire.id}: ${errorMessage}`)
          // Continue with unresolved segments - wire will still be updated
        }

        // Update wire segments
        updateWireSegments(wire.id, resolvedSegments)
      } catch (error) {
        // Exception occurred - remove disconnected wire
        message.error('Failed to recalculate wire. Wire has been disconnected.')
        console.error(`[recalculateWiresForGate] Failed to recalculate wire ${wire.id}:`, error)
        console.error(`[recalculateWiresForGate] Wire context:`, {
          wireId: wire.id,
          fromGateId: wire.fromGateId,
          fromPinId: wire.fromPinId,
          toGateId: wire.toGateId,
          toPinId: wire.toPinId,
          gateId,
        })
        removeWire(wire.id)
      }
    }
  },
})
