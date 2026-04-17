import { Canvas } from '@react-three/fiber'
import { Suspense } from 'react'
import { SceneContent } from './SceneContent'
import { SceneReadyBridge } from './SceneReadyBridge'
import type { SceneProps } from './types'

// Reference --canvas-bg directly so the BROWSER resolves the OKLch value
// (correctly handles theme flips via the .dark class on <html>). Roundtripping
// through THREE.Color in JS was lossy and produced a near-white sRGB hex
// even when --canvas-bg resolved to dark.
const bgStyle = { background: 'var(--canvas-bg)' }

/**
 * Scene - Main 3D canvas component
 * Wraps the scene in a React Three Fiber Canvas. Background colour reads
 * from --canvas-bg so the 3D area flips with the active theme.
 */
export function Scene({ children }: SceneProps) {
  return (
    <Canvas
      shadows
      camera={{ position: [0, 6, 6], fov: 50 }}
      style={bgStyle}
      data-testid="scene-canvas"
    >
      <Suspense fallback={null}>
        <SceneReadyBridge />
        <SceneContent>{children}</SceneContent>
      </Suspense>
    </Canvas>
  )
}

