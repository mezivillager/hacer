import type { PlacementActions, GateType, Position, CircuitStore } from '../../types'
import { createGateInstance } from '../gateActions/gateActions'

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
    const currentState = get()
    if (!currentState.placementMode) return
    
    // Create gate instance outside of set() to avoid issues with Immer
    const newGate = createGateInstance(currentState.placementMode, position)
    
    // Single atomic state update - add gate, clear placement, select new gate
    set((state) => {
      // Add the new gate
      state.gates.push(newGate)
      // Clear placement mode
      state.placementMode = null
      // Deselect all gates and select the new one
      state.gates.forEach((g) => { g.selected = g.id === newGate.id })
      state.selectedGateId = newGate.id
    }, false, 'placeGate')
  },
})
