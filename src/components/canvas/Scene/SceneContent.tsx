import { Environment } from '@react-three/drei'
import { useCircuitStore } from '@/store/circuitStore'
import { GroundPlane } from './GroundPlane'
import { PlacementPreview } from './PlacementPreview'
import { WirePreview } from './WirePreview'
import { SceneGrid } from './SceneGrid'
import { SceneOrbitControls } from './SceneOrbitControls'
import { SceneKeyboardPan } from './SceneKeyboardPan'
import { SceneAxes } from './SceneAxes'
import type { SceneProps } from './types'

/**
 * SceneContent - Main content container for the 3D scene
 * Orchestrates all scene components
 */
export function SceneContent({ children }: SceneProps) {
  const showAxes = useCircuitStore((s) => s.showAxes)

  return (
    <>
      <ambientLight intensity={0.5} />
      <directionalLight position={[10, 10, 5]} intensity={1} castShadow />
      <Environment preset="city" />
      {showAxes && <SceneAxes />}
      <GroundPlane />
      <PlacementPreview />
      <WirePreview />
      <SceneGrid />
      <SceneOrbitControls />
      <SceneKeyboardPan />
      {children}
    </>
  )
}

