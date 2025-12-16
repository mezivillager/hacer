import { ThreeEvent } from '@react-three/fiber'
import { useCircuitStore, circuitActions } from '@/store/circuitStore'
import { trackRender } from '@/utils/renderTracking'
import { snapToGrid, worldToGrid, canPlaceGateAt } from '@/utils/grid'

const { 
  updateWirePreviewPosition, 
  updatePlacementPreviewPosition,
  updateGatePosition,
  setDragActive,
  placeGate, 
  cancelWiring, 
  selectGate: selectGateAction 
} = circuitActions

/**
 * Static ground plane for interactions - renders only once.
 * Uses getState() in event handlers to avoid store subscriptions.
 * Optimized automatically by React Compiler.
 */
export function GroundPlane() {
  trackRender('GroundPlane', 'static')
  
  const handlePointerMove = (e: ThreeEvent<PointerEvent>) => {
    const state = useCircuitStore.getState()
    const isPlacing = state.placementMode !== null
    const isWiring = state.wiringFrom !== null
    // Only handle drag if drag is actually active (pointer down + moving)
    const isDragging = state.isDragActive && state.placementPreviewPosition !== null && state.placementMode === null && state.selectedGateId !== null
    
    if (isPlacing) {
      // Gates are rotated 90° around X, so body extends from -BODY_DEPTH/2 to +BODY_DEPTH/2 in world Y
      // Place at y = BODY_DEPTH/2 = 0.2 so gate bottom sits on grid (y = 0)
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
      updateWirePreviewPosition({ 
        x: e.point.x, 
        y: e.point.y, 
        z: e.point.z 
      })
    }
  }
  
  const handlePointerLeave = () => {
    const state = useCircuitStore.getState()
    const isPlacing = state.placementMode !== null
    const isWiring = state.wiringFrom !== null
    
    if (isPlacing) {
      updatePlacementPreviewPosition(null)
    }
    if (isWiring) {
      updateWirePreviewPosition(null)
    }
  }
  
  const handleClick = (e: ThreeEvent<MouseEvent>) => {
    const state = useCircuitStore.getState()
    const isPlacing = state.placementMode !== null
    const isWiring = state.wiringFrom !== null
    const isDragging = state.placementPreviewPosition !== null && state.placementMode === null && state.selectedGateId !== null
    
    if (isPlacing) {
      e.stopPropagation()
      // Gates are rotated 90° around X, so body extends from -BODY_DEPTH/2 to +BODY_DEPTH/2 in world Y
      // Place at y = BODY_DEPTH/2 = 0.2 so gate bottom sits on grid (y = 0)
      const snappedPos = snapToGrid({ x: e.point.x, y: 0.2, z: e.point.z })
      placeGate(snappedPos)
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
      selectGateAction(null)
    }
  }
  
  const handlePointerUp = () => {
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
  
  return (
    <mesh
      rotation={[-Math.PI / 2, 0, 0]}
      position={[0, 0, 0]}
      onClick={handleClick}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerLeave}
      visible={false}
    >
      <planeGeometry args={[100, 100]} />
      <meshBasicMaterial transparent opacity={0} />
    </mesh>
  )
}
