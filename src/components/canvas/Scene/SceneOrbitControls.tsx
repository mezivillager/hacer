import { OrbitControls } from '@react-three/drei'

interface SceneOrbitControlsProps {
  isInteracting: boolean
}

/**
 * OrbitControls component - only re-renders when isInteracting changes.
 * Optimized automatically by React Compiler.
 */
export function SceneOrbitControls({ isInteracting }: SceneOrbitControlsProps) {
  return (
    <OrbitControls
      makeDefault
      enableDamping
      dampingFactor={0.05}
      minDistance={2}
      maxDistance={50}
      maxPolarAngle={Math.PI / 2}
      enableRotate={!isInteracting}
    />
  )
}
