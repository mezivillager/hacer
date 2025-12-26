import { useEffect } from 'react'
import { useCircuitStore } from '@/store/circuitStore'

export function useKeyboardShortcuts() {
  // Use selectors for granular subscriptions
  const placementMode = useCircuitStore((s) => s.placementMode)
  const wiringFrom = useCircuitStore((s) => s.wiringFrom)
  const selectedGateId = useCircuitStore((s) => s.selectedGateId)
  const placementPreviewPosition = useCircuitStore((s) => s.placementPreviewPosition)

  // Get actions from store
  const cancelPlacement = useCircuitStore((s) => s.cancelPlacement)
  const cancelWiring = useCircuitStore((s) => s.cancelWiring)
  const selectGate = useCircuitStore((s) => s.selectGate)
  const rotateGate = useCircuitStore((s) => s.rotateGate)
  const removeGate = useCircuitStore((s) => s.removeGate)

  const isPlacing = placementMode !== null
  const isWiring = wiringFrom !== null
  // Detect dragging: preview position set but not in placement mode
  const isDragging = placementPreviewPosition !== null && placementMode === null

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Handle escape in placement/wiring mode
      if (isPlacing || isWiring) {
        if (e.key === 'Escape') {
          if (isPlacing) cancelPlacement()
          if (isWiring) cancelWiring()
        }
        return
      }

      // Escape key - deselect
      if (e.key === 'Escape') {
        selectGate(null)
        return
      }

      // Delete/Backspace key - delete selected gate
      if (e.key === 'Delete' || e.key === 'Backspace') {
        // Only delete if a gate is selected and not during drag
        if (selectedGateId && !isDragging) {
          // Check if user is typing in an input field (for future-proofing)
          const target = e.target as HTMLElement
          const isInputField =
            target.tagName === 'INPUT' ||
            target.tagName === 'TEXTAREA' ||
            target.isContentEditable

          if (!isInputField) {
            e.preventDefault()
            removeGate(selectedGateId)
            // Clear selection after deletion
            selectGate(null)
          }
        }
        return
      }

      // Arrow keys for rotating selected gate
      // With gates rotated 90° around X, local Z maps to world -Y
      // To rotate around world Y (vertical), rotate around local Z with inverted angle
      // Disable rotation during drag
      // If no gate is selected, let SceneKeyboardPan handle arrow keys for camera panning
      if (!selectedGateId || isDragging) return

      const rotationStep = Math.PI / 2 // 90 degrees

      switch (e.key) {
        case 'ArrowLeft':
          e.preventDefault()
          // Rotate around local Z (world -Y), so use negative angle to rotate around world +Y
          rotateGate(selectedGateId, 'z', -rotationStep)
          break
        case 'ArrowRight':
          e.preventDefault()
          // Rotate around local Z (world -Y), so use positive angle to rotate around world -Y
          rotateGate(selectedGateId, 'z', rotationStep)
          break
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isPlacing, isWiring, isDragging, selectedGateId, cancelPlacement, cancelWiring, selectGate, rotateGate, removeGate])
}
