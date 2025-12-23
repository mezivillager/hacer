import { useEffect } from 'react'
import { useThree } from '@react-three/fiber'
import { Vector3 } from 'three'
import { useCircuitStore } from '@/store/circuitStore'
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib'

// Configurable pan distance (in world units)
const PAN_STEP = 1.0

/**
 * SceneKeyboardPan - Handles arrow key camera panning when no gate is selected.
 * Pans the camera view to bring out-of-view gates into view.
 * Only active when no gate is selected and not in placement/wiring mode.
 */
export function SceneKeyboardPan() {
  const { camera, controls } = useThree()
  
  // Subscribe to store state
  const selectedGateId = useCircuitStore((s) => s.selectedGateId)
  const placementMode = useCircuitStore((s) => s.placementMode)
  const wiringFrom = useCircuitStore((s) => s.wiringFrom)
  const isDragActive = useCircuitStore((s) => s.isDragActive)

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Only handle arrow keys when no gate is selected and not in interactive modes
      if (selectedGateId !== null) return
      if (placementMode !== null) return
      if (wiringFrom !== null) return
      if (isDragActive) return

      // Check if user is typing in an input field
      const target = e.target as HTMLElement
      const isInputField =
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable
      
      if (isInputField) return

      // Check if controls are available
      if (!controls || !('target' in controls)) return

      const controlsInstance = controls as OrbitControlsImpl

      // Calculate pan direction in world space
      // Left/Right: X axis, Up/Down: Z axis (Y is vertical)
      let panDelta: Vector3

      switch (e.key) {
        case 'ArrowLeft':
          e.preventDefault()
          panDelta = new Vector3(-PAN_STEP, 0, 0)
          break
        case 'ArrowRight':
          e.preventDefault()
          panDelta = new Vector3(PAN_STEP, 0, 0)
          break
        case 'ArrowUp':
          e.preventDefault()
          panDelta = new Vector3(0, 0, PAN_STEP)
          break
        case 'ArrowDown':
          e.preventDefault()
          panDelta = new Vector3(0, 0, -PAN_STEP)
          break
        default:
          return
      }

      // Apply pan to both camera position and target to maintain orbit behavior
      // This moves the viewport, bringing different parts of the scene into view
      camera.position.add(panDelta)
      controlsInstance.target.add(panDelta)
      controlsInstance.update()
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [selectedGateId, placementMode, wiringFrom, isDragActive, camera, controls])

  return null
}

