import type { PlacementActions, GateType, Position, CircuitStore } from '../../types'
import { createGateInstance } from '../gateActions/gateActions'
import { snapToGrid, worldToGrid, canPlaceGateAt } from '@/utils/grid'

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
      state.placementPreviewPosition = null
    }, false, 'cancelPlacement')
  },

  placeGate: (position: Position) => {
    const currentState = get()
    if (!currentState.placementMode) return
    
    // Snap position to grid
    const snappedPosition = snapToGrid(position)
    
    // Convert to grid position and validate placement
    const gridPos = worldToGrid(snappedPosition)
    if (!canPlaceGateAt(gridPos, currentState.gates)) {
      // Invalid placement - do nothing
      return
    }
    
    // Create gate instance outside of set() to avoid issues with Immer
    const newGate = createGateInstance(currentState.placementMode, snappedPosition)
    
    // Single atomic state update - add gate, clear placement, select new gate
    set((state) => {
      // Add the new gate
      state.gates.push(newGate)
      // Clear placement mode and preview position
      state.placementMode = null
      state.placementPreviewPosition = null
      // Deselect all gates and select the new one
      state.gates.forEach((g) => { g.selected = g.id === newGate.id })
      state.selectedGateId = newGate.id
    }, false, 'placeGate')
  },

  updatePlacementPreviewPosition: (position: Position | null) => {
    set((state) => {
      state.placementPreviewPosition = position
    }, false, 'updatePlacementPreviewPosition')
  },
})
