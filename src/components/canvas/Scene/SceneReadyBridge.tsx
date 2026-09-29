import { useEffect, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { useCircuitStore } from '@/store/circuitStore'
import { describeCircuitScene, projectToCanvas } from './sceneDescribe'
import '../../../../e2e/types/globals' // Import for Window augmentation side-effect

/**
 * SceneReadyBridge - Sets up window globals for E2E testing
 * Runs once when the scene is ready
 */
export function SceneReadyBridge() {
  const { camera, gl } = useThree()
  const readyRef = useRef(false)

  useEffect(() => {
    return () => {
      if (typeof window !== 'undefined') {
        delete window.__SCENE_READY__
        delete window.__SCENE_HELPERS__
      }
    }
  }, [])

  useFrame(() => {
    if (readyRef.current) return
    readyRef.current = true

    if (typeof window === 'undefined') return

    window.__SCENE_READY__ = true
    window.__SCENE_HELPERS__ = {
      projectToScreen: (position: { x: number; y: number; z: number }) => {
        // Fresh rect on each call so window resizes are honoured
        const { x, y } = projectToCanvas(camera, gl.domElement.getBoundingClientRect(), position)
        return { x, y }
      },
      canvasRect: () => gl.domElement.getBoundingClientRect(),
      describe: () => {
        const rect = gl.domElement.getBoundingClientRect()
        return describeCircuitScene(useCircuitStore.getState(), (world) => projectToCanvas(camera, rect, world))
      },
    }

    window.dispatchEvent(new Event('scene-ready'))
  })

  return null
}

