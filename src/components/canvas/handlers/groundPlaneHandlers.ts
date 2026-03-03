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
  cancelJunctionPlacement,
  updateJunctionPreviewPosition,
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
  const isPlacingJunction = state.junctionPlacementMode === true
  const isWiring = state.wiringFrom !== null
  const isDragging = state.isDragActive && state.placementPreviewPosition !== null && state.placementMode === null && state.selectedGateId !== null

  if (isPlacingGate || isPlacingNode) {
    const snappedPos = snapToGrid({ x: e.point.x, y: 0.2, z: e.point.z })
    updatePlacementPreviewPosition(snappedPos)
  } else if (isPlacingJunction) {
    const previewPos = {
      x: e.point.x,
      y: 0.2,
      z: e.point.z,
    }
    updateJunctionPreviewPosition(previewPos)
  } else if (isDragging) {
    const snappedPos = snapToGrid({ x: e.point.x, y: 0.2, z: e.point.z })
    updatePlacementPreviewPosition(snappedPos)
  } else if (isWiring) {
    const previewPos = {
      x: e.point.x,
      y: 0.2,
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
  const isPlacingJunction = state.junctionPlacementMode === true
  const isWiring = state.wiringFrom !== null

  if (isPlacingGate || isPlacingNode) {
    updatePlacementPreviewPosition(null)
  }
  if (isWiring) {
    updateWirePreviewPositionOriginal(null)
  }
  if (isPlacingJunction) {
    updateJunctionPreviewPosition(null)
  }
}

/**
 * Handle click on ground plane - place gate/node, cancel wiring, or deselect gate/node
 */
export function handleClick(e: ThreeEvent<MouseEvent>): void {
  const state = useCircuitStore.getState()
  const isPlacingGate = state.placementMode !== null
  const isPlacingNode = state.nodePlacementMode !== null
  const isPlacingJunction = state.junctionPlacementMode === true
  const isWiring = state.wiringFrom !== null
  const isDragging = state.placementPreviewPosition !== null && state.placementMode === null && state.selectedGateId !== null

  if (isPlacingGate) {
    e.stopPropagation()
    const snappedPos = snapToGrid({ x: e.point.x, y: 0.2, z: e.point.z })
    placeGate(snappedPos)
  } else if (isPlacingNode) {
    e.stopPropagation()
    const snappedPos = snapToGrid({ x: e.point.x, y: 0.2, z: e.point.z })
    placeNode(snappedPos)
  } else if (isPlacingJunction) {
    const wireId = handleWireClick(e)
    if (!wireId) {
      e.stopPropagation()
      cancelJunctionPlacement()
    } else {
      e.stopPropagation()
    }
  } else if (isWiring) {
    e.stopPropagation()
    cancelWiring()
  } else if (isDragging) {
    e.stopPropagation()
  } else {
    const wireId = handleWireClick(e)
    if (!wireId) {
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
  const isDragging = state.isDragActive && state.placementPreviewPosition !== null && state.placementMode === null && state.selectedGateId !== null

  if (isDragging) {
    setDragActive(false)

    const gate = state.gates.find(g => g.id === state.selectedGateId)
    const previewPos = state.placementPreviewPosition

    if (gate && previewPos && state.selectedGateId) {
      const gridPos = worldToGrid(previewPos)
      const otherGates = state.gates.filter(g => g.id !== state.selectedGateId)
      const selectedGateId = state.selectedGateId

      if (canPlaceGateAt(gridPos, otherGates, selectedGateId)) {
        updateGatePosition(selectedGateId, previewPos)
      }

      updatePlacementPreviewPosition(null)
    } else {
      updatePlacementPreviewPosition(null)
    }
  }
}
