import { Environment } from '@react-three/drei'
import { useCircuitStore } from '@/store/circuitStore'
import { GroundPlane } from './GroundPlane'
import { PlacementPreview } from './PlacementPreview'
import { WirePreview } from './WirePreview'
import { SceneGrid } from './SceneGrid'
import { SceneOrbitControls } from './SceneOrbitControls'
import type { SceneProps } from './types'

/**
 * SceneContent - Main content container for the 3D scene
 * Orchestrates all scene components
 */
export function SceneContent({ children }: SceneProps) {
  // Use selectors for granular subscriptions
  const placementMode = useCircuitStore((s) => s.placementMode)
  const wiringFrom = useCircuitStore((s) => s.wiringFrom)

  const isPlacing = placementMode !== null
  const isWiring = wiringFrom !== null
  const isInteracting = isPlacing || isWiring
  
  return (
    <>
      <ambientLight intensity={0.5} />
      <directionalLight position={[10, 10, 5]} intensity={1} castShadow />
      <Environment preset="city" />
      <GroundPlane />
      <PlacementPreview />
      <WirePreview />
      <SceneGrid />
      <SceneOrbitControls isInteracting={isInteracting} />
      {children}
    </>
  )
}

