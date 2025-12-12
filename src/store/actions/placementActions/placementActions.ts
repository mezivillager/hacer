import type { PlacementActions, GateType, Position, CircuitStore } from '../../types'

type SetState = (
  fn: (state: CircuitStore) => void,
  replace?: false,
  actionName?: string
) => void
type GetState = () => CircuitStore

export const createPlacementActions = (set: SetState, get: GetState): PlacementActions => ({
  startPlacement: (type: GateType) => {
    set((state) => {
      state.placementMode = type
      state.selectedGateId = null
    }, false, 'startPlacement')
  },

  cancelPlacement: () => {
    set((state) => {
      state.placementMode = null
    }, false, 'cancelPlacement')
  },

  placeGate: (position: Position) => {
    const state = get()
    if (state.placementMode) {
      // Call addGate action from the store
      state.addGate(state.placementMode, position)
      set((s) => {
        s.placementMode = null
      }, false, 'placeGate')
    }
  },
})
