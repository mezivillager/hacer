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
  WireEndpoint,
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

      // Only the wires that would dangle are deleted: those whose `from` or `to` IS this junction,
      // since that endpoint is about to name nothing (#403). Every wire with two real endpoints
      // stays, whatever `wireIds` lists. The live wiring gesture writes each branch as a complete
      // source-pin → sink wire (`wiringActions.ts`, `{ ...originalWire.from }`), so the old
      // "keep one listed wire, delete the rest" deleted wires the user drew — whichever one it kept.
      const endsHere = (e: WireEndpoint) => e.type === 'junction' && e.entityId === junctionId
      const wireIdsToRemove = state.wires
        .filter((w) => endsHere(w.from) || endsHere(w.to))
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
