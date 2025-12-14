import { ThreeEvent } from '@react-three/fiber'
import { useCircuitStore, circuitActions } from '@/store/circuitStore'
import { trackRender } from '@/utils/renderTracking'
import { snapToGrid } from '@/utils/grid'

const { 
  updateWirePreviewPosition, 
  updatePlacementPreviewPosition,
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
    
    if (isPlacing) {
      const snappedPos = snapToGrid({ x: e.point.x, y: 0.4, z: e.point.z })
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
    
    if (isPlacing) {
      e.stopPropagation()
      const snappedPos = snapToGrid({ x: e.point.x, y: 0.4, z: e.point.z })
      placeGate(snappedPos)
    } else if (isWiring) {
      e.stopPropagation()
      cancelWiring()
    } else {
      selectGateAction(null)
    }
  }
  
  return (
    <mesh
      rotation={[-Math.PI / 2, 0, 0]}
      position={[0, 0, 0]}
      onClick={handleClick}
      onPointerMove={handlePointerMove}
      onPointerLeave={handlePointerLeave}
      visible={false}
    >
      <planeGeometry args={[100, 100]} />
      <meshBasicMaterial transparent opacity={0} />
    </mesh>
  )
}
