import { useEffect } from 'react'
import { useCircuitStore } from '@/store/circuitStore'

export function useKeyboardShortcuts() {
  // Use selectors for granular subscriptions
  const placementMode = useCircuitStore((s) => s.placementMode)
  const wiringFrom = useCircuitStore((s) => s.wiringFrom)
  const selectedGateId = useCircuitStore((s) => s.selectedGateId)

  // Get actions from store
  const cancelPlacement = useCircuitStore((s) => s.cancelPlacement)
  const cancelWiring = useCircuitStore((s) => s.cancelWiring)
  const selectGate = useCircuitStore((s) => s.selectGate)
  const rotateGate = useCircuitStore((s) => s.rotateGate)

  const isPlacing = placementMode !== null
  const isWiring = wiringFrom !== null

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

      // Arrow keys for rotating selected gate
      if (!selectedGateId) return

      const rotationStep = Math.PI / 4 // 45 degrees

      switch (e.key) {
        case 'ArrowLeft':
          e.preventDefault()
          rotateGate(selectedGateId, 'y', rotationStep)
          break
        case 'ArrowRight':
          e.preventDefault()
          rotateGate(selectedGateId, 'y', -rotationStep)
          break
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isPlacing, isWiring, selectedGateId, cancelPlacement, cancelWiring, selectGate, rotateGate])
}
