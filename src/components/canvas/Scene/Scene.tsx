import { Canvas } from '@react-three/fiber'
import { Suspense } from 'react'
import { useThemeColor } from '../hooks/useThemeColor'
import { SceneContent } from './SceneContent'
import { SceneReadyBridge } from './SceneReadyBridge'
import type { SceneProps } from './types'

/**
 * Scene - Main 3D canvas component
 * Wraps the scene in a React Three Fiber Canvas. Background colour
 * reads from --canvas-bg so the 3D area flips with the active theme.
 */
export function Scene({ children }: SceneProps) {
  const bg = useThemeColor('--canvas-bg')
  const bgStyle = { background: `#${bg.getHexString()}` }
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

