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
    }

    set((state) => {
      state.junctions.push(junction)
    }, false, 'addJunction')

    return junction
  },

  removeJunction: (junctionId: string): void => {
    set((state) => {
      const index = state.junctions.findIndex((j) => j.id === junctionId)
      if (index !== -1) {
        state.junctions.splice(index, 1)
        // Remove wires connected to this junction (as source or destination)
        state.wires = state.wires.filter(
          (w) =>
            !(w.from.type === 'junction' && w.from.entityId === junctionId) &&
            !(w.to.type === 'junction' && w.to.entityId === junctionId)
        )
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
