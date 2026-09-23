/**
 * Junction Actions
 *
 * Actions for managing junction nodes (signal branch points).
 */

import type {
  JunctionActions,
  JunctionNode,
  Position,
  CircuitStore,
} from '../../types'
import { findJunctionFeedWire } from '@/simulation/topologicalEval'

type SetState = (
  fn: (state: CircuitStore) => void,
  replace?: false,
  actionName?: string
) => void
type GetState = () => CircuitStore

/**
 * Generate a unique ID for a junction.
 *
 * @param prefix - Prefix for the ID
 * @returns Unique ID string
 */
function generateId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`
}

/**
 * Create junction actions for managing signal branch points.
 *
 * @param set - Zustand set function
 * @param _get - Zustand get function (unused but available for future use)
 * @returns JunctionActions object
 */
export const createJunctionActions = (set: SetState, _get: GetState): JunctionActions => ({
  addJunction: (signalId: string, position: Position): JunctionNode => {
    const junction: JunctionNode = {
      id: generateId('junction'),
      signalId,
      position,
      wireIds: [],
    }

    set((state) => {
      state.junctions.push(junction)
    }, false, 'addJunction')

    return junction
  },

  removeJunction: (junctionId: string): void => {
    set((state) => {
      const junction = state.junctions.find((j) => j.id === junctionId)
      if (!junction) return

      // The wire that *feeds* the junction survives; every other wire the junction lists is a
      // branch that exists only because of it. `wireIds[0]` used to stand in for the feed wire,
      // but that array is bookkeeping order, not structure (#364): `removeWire` splices the trunk
      // out and re-attaching a redrawn wire appends it last, so a branch can sit first — and
      // `slice(1)` then deleted the user's trunk and kept a branch. The rule is shared with the
      // evaluator (#356/#365) rather than restated, so the two cannot disagree about a document.
      //
      // A junction with no feed wire is a malformed document, and it is read the way the evaluator
      // reads it: floating. Nothing is the trunk, so no listed wire is kept — each one starts at a
      // junction that is about to cease to exist.
      const feedWireId = findJunctionFeedWire(junction, state)?.id

      const wireIdsToRemove =
        junction.wireIds.length > 0
          ? junction.wireIds.filter((id) => id !== feedWireId)
          : state.wires
              .filter(
                (w) =>
                  (w.from.type === 'junction' && w.from.entityId === junctionId) ||
                  (w.to.type === 'junction' && w.to.entityId === junctionId)
              )
              .map((w) => w.id)

      state.wires = state.wires.filter((w) => !wireIdsToRemove.includes(w.id))

      for (const remainingJunction of state.junctions) {
        if (remainingJunction.id !== junctionId) {
          remainingJunction.wireIds = remainingJunction.wireIds.filter(
            (id) => !wireIdsToRemove.includes(id)
          )
        }
      }

      const index = state.junctions.findIndex((j) => j.id === junctionId)
      if (index !== -1) {
        state.junctions.splice(index, 1)
      }
    }, false, 'removeJunction')
  },

  updateJunctionPosition: (junctionId: string, position: Position): void => {
    set((state) => {
      const junction = state.junctions.find((j) => j.id === junctionId)
      if (junction) {
        junction.position = position
      }
    }, false, 'updateJunctionPosition')
  },
})
