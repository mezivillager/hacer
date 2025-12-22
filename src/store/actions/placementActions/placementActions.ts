import type { PlacementActions, GateType, Position, CircuitStore } from '../../types'
import { createGateInstance } from '../gateActions/gateActions'
import { snapToGrid, worldToGrid, canPlaceGateAt } from '@/utils/grid'
import { useCircuitStore } from '../../circuitStore'

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
    // Check for gate spacing AND wire paths
    const gridPos = worldToGrid(snappedPosition)
    const circuitActions = useCircuitStore.getState()
    if (!canPlaceGateAt(
      gridPos,
      currentState.gates,
      undefined, // excludeGateId (not applicable for new placements)
      currentState.wires.length > 0 ? currentState.wires : undefined,
      circuitActions.getPinWorldPosition,
      circuitActions.getPinOrientation
    )) {
      // Invalid placement (would overlap gate or block wire path) - do nothing
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
    // Check if position actually changed to avoid unnecessary re-renders
    const currentState = get()
    const currentPos = currentState.placementPreviewPosition
    
    // If both are null, no change
    if (!position && !currentPos) return
    
    // If one is null and the other isn't, there's a change
    if (!position || !currentPos) {
      set((state) => {
        state.placementPreviewPosition = position
      }, false, 'updatePlacementPreviewPosition')
      return
    }
    
    // Compare positions - only update if actually different (within small epsilon for floating point)
    const epsilon = 0.001
    const xChanged = Math.abs(position.x - currentPos.x) > epsilon
    const yChanged = Math.abs(position.y - currentPos.y) > epsilon
    const zChanged = Math.abs(position.z - currentPos.z) > epsilon
    
    if (xChanged || yChanged || zChanged) {
      set((state) => {
        state.placementPreviewPosition = position
      }, false, 'updatePlacementPreviewPosition')
    }
    // If positions are the same, don't update (prevents unnecessary re-renders)
  },

  setDragActive: (active: boolean) => {
    set((state) => {
      state.isDragActive = active
    }, false, 'setDragActive')
  },

  setHoveredGate: (gateId: string | null) => {
    set((state) => {
      state.hoveredGateId = gateId
    }, false, 'setHoveredGate')
  },
})
