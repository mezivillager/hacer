import type { WireActions, Wire, WireEndpoint, CircuitStore } from '../../types'
import type { WireSegment } from '@/utils/wiringScheme/types'
import { removeOrphanedArcs } from '@/utils/wiringScheme/crossing'

type SetState = (
  fn: (state: CircuitStore) => void,
  replace?: false,
  actionName?: string
) => void

type GetState = () => CircuitStore

export const createWireActions = (set: SetState, get: GetState): WireActions => ({
  addWire: (
    from: WireEndpoint,
    to: WireEndpoint,
    segments: WireSegment[],
    crossesWireIds: string[] = [],
    signalId?: string
  ) => {
    if (from.type === 'input' && to.type === 'output') {
      throw new Error('Input nodes cannot connect directly to output nodes')
    }
    const wire: Wire = {
      id: `wire-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`,
      from,
      to,
      segments,
      crossesWireIds,
      ...(signalId && { signalId }),
    }
    set((state) => {
      state.wires.push(wire)
    }, false, 'addWire')
    return wire
  },

  removeWire: (wireId: string) => {
    // Find wires that cross over the removed wire (they have arcs that may become orphaned)
    const state = get()

    // Check if active wiring references this wire
    // If wiring from junction, the originalWireId might reference this wire
    if (state.wiringFrom?.destination?.type === 'junction' && state.wiringFrom.destination.originalWireId === wireId) {
      // Cancel active wiring since the wire being deleted is the original wire for junction wiring
      set((state) => {
        state.wiringFrom = null
      }, false, 'removeWire/cancelWiring')
    }

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

      // Remove wire ID from all junctions
      for (const junction of state.junctions) {
        const wireIndex = junction.wireIds.indexOf(wireId)
        if (wireIndex !== -1) {
          junction.wireIds.splice(wireIndex, 1)
        }
      }

      // Remove junctions that now have only 0 or 1 wire passing through them
      // (Junctions are only needed when multiple wires pass through them)
      for (let i = state.junctions.length - 1; i >= 0; i--) {
        const junction = state.junctions[i]
        if (junction.wireIds.length <= 1) {
          state.junctions.splice(i, 1)
        }
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

  setInputValue: (gateId: string, pinId: string, value: number) => {
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
