import type { GateActions, GateInstance, GateType, Pin, Position, CircuitStore } from '../../types'
import { snapToGrid } from '@/utils/grid'
import { useCircuitStore } from '../../circuitStore'
import { calculateWirePathFromConnection } from '@/utils/wiringScheme'
import { collectWireSegments } from '@/utils/wiringScheme/segments'

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
  },

  recalculateWiresForGate: (gateId: string) => {
    const state = get()
    const { gates, wires } = state
    const getPinWorldPosition = state.getPinWorldPosition
    const getPinOrientation = state.getPinOrientation
    const updateWireSegments = state.updateWireSegments

    // Find all wires connected to this gate
    const connectedWires = wires.filter(
      (w) => w.fromGateId === gateId || w.toGateId === gateId
    )

    if (connectedWires.length === 0) {
      return // No wires to recalculate
    }

    // Collect existing segments from other wires (for overlap avoidance)
    const allOtherWireSegments = collectWireSegments(wires, (wire) => 
      !connectedWires.some((cw) => cw.id === wire.id)
    )

    // Recalculate each connected wire
    for (const wire of connectedWires) {
      try {
        // Use helper function to calculate path from wire connection info
        const newPath = calculateWirePathFromConnection(
          wire.fromGateId,
          wire.fromPinId,
          wire.toGateId,
          wire.toPinId,
          {
            gates,
            getPinWorldPosition,
            getPinOrientation,
            existingSegments: allOtherWireSegments,
          }
        )

        if (!newPath) {
          console.warn(`[recalculateWiresForGate] Failed to calculate path for wire ${wire.id} - pins or gates not found`)
          continue
        }

        // Update wire segments
        updateWireSegments(wire.id, newPath.segments)
      } catch (error) {
        console.error(`[recalculateWiresForGate] Failed to recalculate wire ${wire.id}:`, error)
        // Keep old segments on error
      }
    }
  },
})
