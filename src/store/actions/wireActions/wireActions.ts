import type { WireActions, Wire, CircuitStore } from '../../types'
import type { WireSegment } from '@/utils/wiringScheme/types'
import { removeOrphanedArcs } from '@/utils/wiringScheme/crossing'

type SetState = (
  fn: (state: CircuitStore) => void,
  replace?: false,
  actionName?: string
) => void

type GetState = () => CircuitStore

export const createWireActions = (set: SetState, get: GetState): WireActions => ({
  addWire: (fromGateId: string, fromPinId: string, toGateId: string, toPinId: string, segments: WireSegment[], crossesWireIds: string[] = []) => {
    const wire: Wire = {
      id: `wire-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`,
      fromGateId,
      fromPinId,
      toGateId,
      toPinId,
      segments, // Store segments when wire is created
      crossesWireIds, // Store IDs of wires this wire crosses over
    }
    set((state) => {
      state.wires.push(wire)
    }, false, 'addWire')
    return wire
  },

  removeWire: (wireId: string) => {
    // Find wires that cross over the removed wire (they have arcs that may become orphaned)
    const state = get()

    // Find wires that have arcs hopping over the wire being removed
    // These wires have the removed wire's ID in their crossesWireIds
    const affectedWireIds = state.wires
      .filter((w) => (w.crossesWireIds ?? []).includes(wireId))
      .map((w) => w.id)

    // Remove the wire
    set((state) => {
      const index = state.wires.findIndex((w) => w.id === wireId)
      if (index !== -1) {
        state.wires.splice(index, 1)
      }
    }, false, 'removeWire')

    // Update affected wires that crossed over the removed wire
    if (affectedWireIds.length > 0) {
      const updatedState = get()

      // For each affected wire, remove orphaned arcs using direct ID matching
      for (const affectedWireId of affectedWireIds) {
        const affectedWire = updatedState.wires.find((w) => w.id === affectedWireId)
        if (!affectedWire || !affectedWire.segments) {
          continue
        }

        // Simplified - just pass the removed wire ID for direct matching
        const updatedSegments = removeOrphanedArcs(affectedWire.segments, wireId)

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
          }, false, 'removeWire/updateAffectedWire')
        } else {
          // No segments changed, but still need to remove the deleted wire from crossesWireIds
          set((state) => {
            const wire = state.wires.find((w) => w.id === affectedWireId)
            if (wire) {
              wire.crossesWireIds = (wire.crossesWireIds ?? []).filter((id) => id !== wireId)
            }
          }, false, 'removeWire/updateCrossesWireIds')
        }
      }
    }
  },

  setInputValue: (gateId: string, pinId: string, value: boolean) => {
    set((state) => {
      const gate = state.gates.find((g) => g.id === gateId)
      if (gate) {
        const pin = gate.inputs.find((p) => p.id === pinId)
        if (pin) {
          pin.value = value
        }
      }
    }, false, 'setInputValue')
  },

  updateWireSegments: (wireId: string, segments: WireSegment[], crossesWireIds?: string[]) => {
    set((state) => {
      const wire = state.wires.find((w) => w.id === wireId)
      if (wire) {
        wire.segments = segments
        if (crossesWireIds !== undefined) {
          wire.crossesWireIds = crossesWireIds
        }
      }
    }, false, 'updateWireSegments')
  },
})
