import { message } from 'antd'
import type { GateActions, GateInstance, GateType, Pin, Position, CircuitStore } from '../../types'
import { snapToGrid } from '@/utils/grid'
import { useCircuitStore } from '../../circuitStore'
import { calculateWirePathFromConnection } from '@/utils/wiringScheme'
import { collectWireSegments, combineAdjacentSegments } from '@/utils/wiringScheme/segments'
import { resolveCrossings, removeOrphanedArcs } from '@/utils/wiringScheme/crossing'

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
    // Get state before removal to collect wire IDs
    const state = get()
    const wiresToRemove = state.wires.filter(
      (w) =>
        (w.from.type === 'gate' && w.from.entityId === gateId) ||
        (w.to.type === 'gate' && w.to.entityId === gateId)
    )
    const removedWireIds = wiresToRemove.map((w) => w.id)

    // Remove gate and wires
    set((state) => {
      const index = state.gates.findIndex((g) => g.id === gateId)
      if (index !== -1) {
        state.gates.splice(index, 1)
        // Remove associated wires (where gate is source or destination)
        state.wires = state.wires.filter(
          (w) =>
            !(w.from.type === 'gate' && w.from.entityId === gateId) &&
            !(w.to.type === 'gate' && w.to.entityId === gateId)
        )
      }
    }, false, 'removeGate')

    // After removal, find affected wires and smooth out orphaned arcs
    if (removedWireIds.length > 0) {
      const updatedState = get()

      // For each removed wire, find wires that had arcs over it
      for (const removedWireId of removedWireIds) {
        const affectedWireIds = updatedState.wires
          .filter((w) => (w.crossesWireIds ?? []).includes(removedWireId))
          .map((w) => w.id)

        // For each affected wire, remove orphaned arcs
        for (const affectedWireId of affectedWireIds) {
          const affectedWire = updatedState.wires.find((w) => w.id === affectedWireId)
          if (!affectedWire || !affectedWire.segments) {
            continue
          }

          // Remove orphaned arcs using direct ID matching
          const updatedSegments = removeOrphanedArcs(affectedWire.segments, removedWireId)

          if (updatedSegments !== null) {
            // Recalculate crossesWireIds from remaining arcs
            const remainingCrossedIds = updatedSegments
              .filter((s) => s.type === 'arc' && s.crossedWireId)
              .map((s) => s.crossedWireId!)

            set((state) => {
              const wire = state.wires.find((w) => w.id === affectedWireId)
              if (wire) {
                wire.segments = updatedSegments
                wire.crossesWireIds = remainingCrossedIds
              }
            }, false, 'removeGate/updateAffectedWire')
          } else {
            // No segments changed, but still need to remove the deleted wire from crossesWireIds
            set((state) => {
              const wire = state.wires.find((w) => w.id === affectedWireId)
              if (wire) {
                wire.crossesWireIds = (wire.crossesWireIds ?? []).filter((id) => id !== removedWireId)
              }
            }, false, 'removeGate/updateCrossesWireIds')
          }
        }
      }
    }
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
      // Deselect wire when selecting gate (mutually exclusive)
      state.selectedWireId = null
    }, false, 'selectGate')
  },

  selectWire: (wireId: string | null) => {
    // Check if selection actually changed before mutating (avoids unnecessary array reference changes)
    const currentState = useCircuitStore.getState()
    if (currentState.selectedWireId === wireId) {
      // Toggle off if clicking the same wire
      if (wireId !== null) {
        set((state) => {
          state.selectedWireId = null
        }, false, 'deselectWire')
      }
      return
    }

    set((state) => {
      state.selectedWireId = wireId
      // Deselect gate and node when selecting wire (mutually exclusive)
      if (wireId !== null) {
        state.selectedGateId = null
        state.selectedNodeId = null
        state.selectedNodeType = null
        state.gates.forEach((g) => {
          g.selected = false
        })
      }
    }, false, 'selectWire')
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

    // Find all gate-to-gate wires connected to this gate
    // Only wires where both endpoints are gates can be recalculated this way
    const connectedWires = wires.filter(
      (w) =>
        w.from.type === 'gate' &&
        w.to.type === 'gate' &&
        (w.from.entityId === gateId || w.to.entityId === gateId)
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

        // Extract gate and pin IDs from endpoints
        const fromGateId = wire.from.entityId
        const fromPinId = wire.from.pinId!
        const toGateId = wire.to.entityId
        const toPinId = wire.to.pinId!

        // Collect existing segments from other wires (for overlap avoidance in pathfinding)
        // Exclude the wire being recalculated
        // Note: This includes arc segments, but segmentsOverlap correctly excludes them
        // (arc segments are not on section lines, so they don't cause overlap)
        const allOtherWireSegments = collectWireSegments(freshWires, (w) => w.id !== wire.id)

        // Use helper function to calculate path from wire connection info
        const newPath = calculateWirePathFromConnection(
          fromGateId,
          fromPinId,
          toGateId,
          toPinId,
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
            fromGateId,
            fromPinId,
            toGateId,
            toPinId,
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
        let crossedWireIds: string[] = []

        try {
          const result = resolveCrossings(newPath.segments, allOtherWires)
          resolvedSegments = result.segments
          crossedWireIds = result.crossedWireIds
        } catch (error) {
          // Crossing resolution failed - log warning but don't fail wire recalculation
          // The wire will be created without crossing resolution (user can manually rewire if needed)
          const errorMessage = error instanceof Error ? error.message : 'Failed to resolve wire crossings'
          console.warn(`[recalculateWiresForGate] Failed to resolve crossings for wire ${wire.id}: ${errorMessage}`)
          // Continue with unresolved segments - wire will still be updated
        }

        // Combine adjacent segments of the same type after resolving crossings
        // This ensures segments are properly merged, similar to how extension works
        // This is important because resolveCrossings may create segments that should be combined
        const combinedSegments = combineAdjacentSegments(resolvedSegments)

        // Update wire segments with new crossed wire IDs
        updateWireSegments(wire.id, combinedSegments, crossedWireIds)
      } catch (error) {
        // Exception occurred - remove disconnected wire
        message.error('Failed to recalculate wire. Wire has been disconnected.')
        console.error(`[recalculateWiresForGate] Failed to recalculate wire ${wire.id}:`, error)
        console.error(`[recalculateWiresForGate] Wire context:`, {
          wireId: wire.id,
          from: wire.from,
          to: wire.to,
          gateId,
        })
        removeWire(wire.id)
      }
    }

    // After recalculating connected wires, check other wires for orphaned arcs
    // Wires that aren't connected to this gate may have arcs that are no longer needed
    // because the gate movement changed the paths of connected wires
    const updatedState = get()
    const allWires = updatedState.wires

    // Find wires that crossed over any of the connected wires (which were just recalculated)
    const connectedWireIds = connectedWires.map((w) => w.id)
    const wiresWithAffectedCrossings = allWires.filter(
      (w) =>
        !(w.from.type === 'gate' && w.from.entityId === gateId) &&
        !(w.to.type === 'gate' && w.to.entityId === gateId) &&
        (w.crossesWireIds ?? []).some((id) => connectedWireIds.includes(id))
    )

    // Get recalculated wires for geometric check against specific wires
    const recalculatedWires = allWires.filter((w) => connectedWireIds.includes(w.id))

    for (const wire of wiresWithAffectedCrossings) {
      if (!wire.segments || wire.segments.length === 0) {
        continue
      }

      // Pass recalculated wires for geometric check against specific wires only
      const updatedSegments = removeOrphanedArcs(wire.segments, undefined, recalculatedWires)

      if (updatedSegments !== null) {
        // Recalculate crossesWireIds from remaining arcs
        const remainingCrossedIds = updatedSegments
          .filter((s) => s.type === 'arc' && s.crossedWireId)
          .map((s) => s.crossedWireId!)

        // Update the wire segments
        updateWireSegments(wire.id, updatedSegments, remainingCrossedIds)
      }
    }
  },
})
