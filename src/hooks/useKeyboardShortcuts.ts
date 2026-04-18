import { useEffect } from 'react'
import { useCircuitStore } from '@/store/circuitStore'

export function useKeyboardShortcuts() {
  // Use selectors for granular subscriptions
  const placementMode = useCircuitStore((s) => s.placementMode)
  const wiringFrom = useCircuitStore((s) => s.wiringFrom)
  const selectedGateId = useCircuitStore((s) => s.selectedGateId)
  const selectedWireId = useCircuitStore((s) => s.selectedWireId)
  const placementPreviewPosition = useCircuitStore((s) => s.placementPreviewPosition)
  const selectedNodeId = useCircuitStore((s) => s.selectedNodeId)
  const selectedNodeType = useCircuitStore((s) => s.selectedNodeType)

  // Get actions from store
  const cancelPlacement = useCircuitStore((s) => s.cancelPlacement)
  const cancelWiring = useCircuitStore((s) => s.cancelWiring)
  const selectGate = useCircuitStore((s) => s.selectGate)
  const selectWire = useCircuitStore((s) => s.selectWire)
  const rotateGate = useCircuitStore((s) => s.rotateGate)
  const removeGate = useCircuitStore((s) => s.removeGate)
  const removeWire = useCircuitStore((s) => s.removeWire)
  const removeInputNode = useCircuitStore((s) => s.removeInputNode)
  const removeOutputNode = useCircuitStore((s) => s.removeOutputNode)
  const deselectNode = useCircuitStore((s) => s.deselectNode)
  const togglePropertiesPanel = useCircuitStore((s) => s.togglePropertiesPanel)

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

      // Escape key - deselect gate or wire
      if (e.key === 'Escape') {
        if (selectedWireId) {
          selectWire(null)
        } else {
          selectGate(null)
        }
        return
      }

      // I key - toggle PropertiesPanel for current selection (only when something is selected)
      if (e.key === 'i' || e.key === 'I') {
        const target = e.target as HTMLElement
        const isInputField =
          target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.isContentEditable
        if (isInputField) return
        const hasSelection =
          selectedGateId !== null ||
          selectedWireId !== null ||
          selectedNodeId !== null
        if (hasSelection) {
          e.preventDefault()
          togglePropertiesPanel()
        }
        return
      }

      // Delete/Backspace key - delete selected wire or gate
      if (e.key === 'Delete' || e.key === 'Backspace') {
        // Check if user is typing in an input field (for future-proofing)
        const target = e.target as HTMLElement
        const isInputField =
          target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.isContentEditable

        if (isInputField) {
          return
        }

        // Delete wire if selected, otherwise delete gate or node if selected
        if (selectedWireId && !isDragging) {
          e.preventDefault()
          removeWire(selectedWireId)
          // Clear selection after deletion
          selectWire(null)
        } else if (selectedGateId && !isDragging) {
          e.preventDefault()
          removeGate(selectedGateId)
          // Clear selection after deletion
          selectGate(null)
        } else if (selectedNodeId && selectedNodeType && !isDragging) {
          e.preventDefault()
          switch (selectedNodeType) {
            case 'input':
              removeInputNode(selectedNodeId)
              break
            case 'output':
              removeOutputNode(selectedNodeId)
              break
          }
          deselectNode()
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
  }, [isPlacing, isWiring, isDragging, selectedGateId, selectedWireId, selectedNodeId, selectedNodeType, cancelPlacement, cancelWiring, selectGate, selectWire, rotateGate, removeGate, removeWire, removeInputNode, removeOutputNode, deselectNode, togglePropertiesPanel])
}
