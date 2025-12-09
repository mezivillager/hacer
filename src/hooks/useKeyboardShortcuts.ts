import { useEffect } from 'react'
import { circuitActions, useCircuitStore } from '@/store/circuitStore'

export function useKeyboardShortcuts() {
  const circuit = useCircuitStore()
  const isPlacing = circuit.placementMode !== null
  const isWiring = circuit.wiringFrom !== null

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Handle escape in placement/wiring mode
      if (isPlacing || isWiring) {
        if (e.key === 'Escape') {
          if (isPlacing) circuitActions.cancelPlacement()
          if (isWiring) circuitActions.cancelWiring()
        }
        return
      }

      // Escape key - deselect
      if (e.key === 'Escape') {
        circuitActions.selectGate(null)
        return
      }

      // Arrow keys for rotating selected gate
      if (!circuit.selectedGateId) return

      const rotationStep = Math.PI / 4 // 45 degrees

      switch (e.key) {
        case 'ArrowLeft':
          e.preventDefault()
          circuitActions.rotateGate(circuit.selectedGateId, 'y', rotationStep)
          break
        case 'ArrowRight':
          e.preventDefault()
          circuitActions.rotateGate(circuit.selectedGateId, 'y', -rotationStep)
          break
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isPlacing, isWiring, circuit.selectedGateId])
}
