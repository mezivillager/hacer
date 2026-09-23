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
// Imported rather than restated, so the store and the evaluator cannot disagree about which wire
// feeds a junction. The rule is a document-structure query and would read better in a small shared
// module — but there is nowhere to put it that the layer ratchet allows: it operates on
// `JunctionNode` / `CircuitDocument`, which live in `src/store/types.ts`, so an engine home
// (`src/core/document/junctions.ts`) is a new `engine-no-state` edge and a store home is a new
// `engine → state` edge from the evaluator. Both measured with `pnpm run lint:layers`: 1 new
// violation each, ratchet red. Here it is 0 new (`simulationActions.ts:2` is the precedent). The
// real fix is to move the document types below both layers — ADR-0020 / #318 work, not this one's.
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

      // The wire that *feeds* the junction survives; the others are deleted. `wireIds[0]` used to
      // stand in for the feed wire, but that array is bookkeeping order, not structure (#364):
      // `removeWire` splices the trunk out and re-attaching a redrawn wire appends it last, so a
      // branch can sit first — and `slice(1)` then deleted the user's trunk and kept a branch. The
      // rule is shared with the evaluator (#356/#365) rather than restated, so the two cannot
      // disagree about a document.
      //
      // A junction with no feed wire is a malformed document, and it is read the way the evaluator
      // reads it: floating. Nothing is the trunk, so no listed wire is kept — each one starts at a
      // junction that is about to cease to exist.
      //
      // SCOPE (#403, measured): this is structural only where the document carries junction
      // endpoints — serialized, hand-authored, or from the importer (#377). Where the live wiring
      // gesture wrote it, trunk and branches share one `from` (`wiringActions.ts:859`), so
      // `findJunctionFeedWire` falls through to the first listed wire in `state.wires` order and
      // the choice is still positional; the wires deleted there have two real endpoints and did
      // not need the junction to exist. #403 carries that, with the reproduction.
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
