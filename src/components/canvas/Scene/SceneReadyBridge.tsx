import { useEffect, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { Vector3 } from 'three'
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
        // Get fresh domRect on each call to handle window resizes
        const domRect = gl.domElement.getBoundingClientRect()
        const vec = new Vector3(position.x, position.y, position.z)
        vec.project(camera)
        return {
          x: ((vec.x + 1) / 2) * domRect.width + domRect.left,
          y: ((-vec.y + 1) / 2) * domRect.height + domRect.top,
        }
      },
      canvasRect: () => gl.domElement.getBoundingClientRect(),
    }

    window.dispatchEvent(new Event('scene-ready'))
  })

  return null
}

