import { ThreeEvent } from '@react-three/fiber'
import { useCircuitStore, circuitActions } from '@/store/circuitStore'
import { snapToGrid, worldToGrid, canPlaceGateAt } from '@/utils/grid'
import { debounce } from '@/utils/debounce'
import { handleWireClick } from './wireHandlers'

const {
  updateWirePreviewPosition: updateWirePreviewPositionOriginal,
  updatePlacementPreviewPosition,
  updateGatePosition,
  setDragActive,
  placeGate,
  placeNode,
  cancelWiring,
  selectGate: selectGateAction,
  deselectNode,
} = circuitActions

// Debounce wire preview updates to reduce calculation frequency (100ms delay)
const updateWirePreviewPosition = debounce(
  updateWirePreviewPositionOriginal as (...args: unknown[]) => void,
  50
) as typeof updateWirePreviewPositionOriginal

/**
 * Handle pointer move on ground plane - update preview positions for placing, wiring, or dragging
 */
export function handlePointerMove(e: ThreeEvent<PointerEvent>): void {
  const state = useCircuitStore.getState()
  const isPlacingGate = state.placementMode !== null
  const isPlacingNode = state.nodePlacementMode !== null
  const isWiring = state.wiringFrom !== null
  // Only handle drag if drag is actually active (pointer down + moving)
  const isDragging = state.isDragActive && state.placementPreviewPosition !== null && state.placementMode === null && state.selectedGateId !== null

  if (isPlacingGate || isPlacingNode) {
    // Gates/Nodes are placed at y = 0.2 so their bottom sits on grid (y = 0)
    const snappedPos = snapToGrid({ x: e.point.x, y: 0.2, z: e.point.z })
    updatePlacementPreviewPosition(snappedPos)
  } else if (isDragging) {
    // During drag, update preview position based on pointer move on ground plane
    // This handles the case when pointer moves outside the gate mesh
    // Just use current pointer position snapped to grid - the drag hook will handle
    // the proper delta calculation when pointer is over the mesh
    const snappedPos = snapToGrid({ x: e.point.x, y: 0.2, z: e.point.z })
    updatePlacementPreviewPosition(snappedPos)
  } else if (isWiring) {
    // Wires are at WIRE_HEIGHT (0.2) above ground plane
    const previewPos = {
      x: e.point.x,
      y: 0.2, // Wire height matches pin center Y coordinate
      z: e.point.z,
    }
    updateWirePreviewPosition(previewPos)
  }
}

/**
 * Handle pointer leave from ground plane - clear preview positions
 */
export function handlePointerLeave(): void {
  const state = useCircuitStore.getState()
  const isPlacingGate = state.placementMode !== null
  const isPlacingNode = state.nodePlacementMode !== null
  const isWiring = state.wiringFrom !== null

  if (isPlacingGate || isPlacingNode) {
    updatePlacementPreviewPosition(null)
  }
  if (isWiring) {
    // Cancel debounce and immediately clear preview
    console.debug('[groundPlaneHandlers] Wiring - clearing preview (pointer leave)')
    updateWirePreviewPositionOriginal(null)
  }
}

/**
 * Handle click on ground plane - place gate/node, cancel wiring, or deselect gate/node
 */
export function handleClick(e: ThreeEvent<MouseEvent>): void {
  const state = useCircuitStore.getState()
  const isPlacingGate = state.placementMode !== null
  const isPlacingNode = state.nodePlacementMode !== null
  const isWiring = state.wiringFrom !== null
  const isDragging = state.placementPreviewPosition !== null && state.placementMode === null && state.selectedGateId !== null

  if (isPlacingGate) {
    e.stopPropagation()
    // Gates are rotated 90° around X, so body extends from -BODY_DEPTH/2 to +BODY_DEPTH/2 in world Y
    // Place at y = BODY_DEPTH/2 = 0.2 so gate bottom sits on grid (y = 0)
    const snappedPos = snapToGrid({ x: e.point.x, y: 0.2, z: e.point.z })
    placeGate(snappedPos)
  } else if (isPlacingNode) {
    e.stopPropagation()
    // Nodes are also placed at y = 0.2
    const snappedPos = snapToGrid({ x: e.point.x, y: 0.2, z: e.point.z })
    placeNode(snappedPos)
  } else if (isWiring) {
    e.stopPropagation()
    cancelWiring()
  } else if (isDragging) {
    // During drag, clicking on ground plane should complete the drag
    // The drag hook's onPointerUp should handle this, but if it doesn't fire,
    // we can complete it here
    e.stopPropagation()
    // Don't do anything here - let the drag hook handle it
  } else {
    // Check for wire click before deselecting gate/node
    const wireId = handleWireClick(e)
    if (!wireId) {
      // No wire clicked - deselect gate and node
      selectGateAction(null)
      deselectNode()
    }
  }
}

/**
 * Handle pointer up on ground plane - complete drag if active
 */
export function handlePointerUp(): void {
  const state = useCircuitStore.getState()
  // Only handle if drag is actually active (pointer down + moving)
  // This prevents handling if the hook already handled it
  const isDragging = state.isDragActive && state.placementPreviewPosition !== null && state.placementMode === null && state.selectedGateId !== null

  if (isDragging) {
    // Set drag active to false first
    setDragActive(false)

    // During drag, pointer up on ground plane should complete the drag
    // This handles the case when pointer up doesn't fire on the mesh
    const gate = state.gates.find(g => g.id === state.selectedGateId)
    const previewPos = state.placementPreviewPosition

    if (gate && previewPos && state.selectedGateId) {
      const gridPos = worldToGrid(previewPos)
      const otherGates = state.gates.filter(g => g.id !== state.selectedGateId)
      const selectedGateId = state.selectedGateId // TypeScript now knows this is string (not null)

      if (canPlaceGateAt(gridPos, otherGates, selectedGateId)) {
        // Valid position - update gate
        updateGatePosition(selectedGateId, previewPos)
      }

      // Clean up drag state - always clear preview position
      updatePlacementPreviewPosition(null)
    } else {
      // Even if gate or previewPos is missing, clean up state
      updatePlacementPreviewPosition(null)
    }
  }
}
