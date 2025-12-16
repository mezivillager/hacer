import { trackRender } from '@/utils/renderTracking'
import { handlePointerMove, handlePointerLeave, handleClick, handlePointerUp } from '../handlers/groundPlaneHandlers'

/**
 * Static ground plane for interactions - renders only once.
 * Uses handlers that call getState() internally to avoid store subscriptions.
 * Optimized automatically by React Compiler.
 */
export function GroundPlane() {
  trackRender('GroundPlane', 'static')
  
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
