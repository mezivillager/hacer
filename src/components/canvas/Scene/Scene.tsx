import { Canvas } from '@react-three/fiber'
import { Suspense } from 'react'
import { colors } from '@/theme'
import { SceneContent } from './SceneContent'
import { SceneReadyBridge } from './SceneReadyBridge'
import type { SceneProps } from './types'

const canvasStyle = { background: colors.background.main }

/**
 * Scene - Main 3D canvas component
 * Wraps the scene in a React Three Fiber Canvas
 */
export function Scene({ children }: SceneProps) {
  return (
    <Canvas
      shadows
      camera={{ position: [0, 6, 6], fov: 50 }}
      style={canvasStyle}
      data-testid="scene-canvas"
    >
      <Suspense fallback={null}>
        <SceneReadyBridge />
        <SceneContent>{children}</SceneContent>
      </Suspense>
    </Canvas>
  )
}

