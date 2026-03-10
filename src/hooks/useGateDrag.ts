import { useState, useRef } from 'react'
import { ThreeEvent } from '@react-three/fiber'
import { useCircuitStore, circuitActions } from '@/store/circuitStore'
import { snapToGrid, worldToGrid, canPlaceGateAt } from '@/utils/grid'
import type { Position } from '@/store/types'

const DRAG_THRESHOLD = 0.1 // Minimum distance to consider it a drag vs click

// Helper to get canvas element from event
function getCanvasElement(event: ThreeEvent<PointerEvent>): HTMLElement | null {
  // In R3F, the native event target is usually the canvas
  const target = event.nativeEvent.target
  if (target instanceof HTMLElement) {
    // If it's already the canvas, return it
    if (target.tagName === 'CANVAS') {
      return target
    }
    // Otherwise, find the canvas parent
    const canvas = target.closest('canvas')
    return canvas
  }
  return null
}

export function useGateDrag(gateId: string) {
  const [isDragging, setIsDragging] = useState(false)
  const dragStartRef = useRef<Position | null>(null)
  const dragStartWorldRef = useRef<Position | null>(null)
  const hasMovedRef = useRef(false)
  const didDragRef = useRef(false) // Track if a drag actually occurred (for click prevention)
  const pointerIdRef = useRef<number | null>(null) // Track pointer ID for capture
  const allowNextClickRef = useRef(true) // Track if next click should be allowed
  const canvasElementRef = useRef<HTMLElement | null>(null) // Store canvas element
  const dragEndHandledRef = useRef(false)

  const handleDragStart = (event: ThreeEvent<PointerEvent>) => {
    event.stopPropagation()

    const gate = useCircuitStore.getState().gates.find((g) => g.id === gateId)
    if (!gate) return

    // Get and store canvas element for pointer capture
    const canvasElement = getCanvasElement(event)
    canvasElementRef.current = canvasElement
    pointerIdRef.current = event.nativeEvent.pointerId

    // Capture pointer on the canvas element to track movement outside the mesh
    if (canvasElement && canvasElement.setPointerCapture) {
      canvasElement.setPointerCapture(event.nativeEvent.pointerId)
    }

    // Store initial drag point and gate position
    dragStartRef.current = { x: event.point.x, y: event.point.y, z: event.point.z }
    dragStartWorldRef.current = { ...gate.position }
    hasMovedRef.current = false
    didDragRef.current = false
    allowNextClickRef.current = false // Prevent click during drag

    // Don't set drag state yet - wait until we've moved beyond threshold
    // This prevents preview from showing on simple clicks
    setIsDragging(false)
    dragEndHandledRef.current = false

    // Ensure cleanup when pointer released anywhere (e.g. over gate, wire, outside canvas)
    const onCaptureLost = () => {
      canvasElement?.removeEventListener('lostpointercapture', onCaptureLost)
      handleDragEnd()
    }
    canvasElement?.addEventListener('lostpointercapture', onCaptureLost)
  }

  const handleDrag = (event: ThreeEvent<PointerEvent>) => {
    if (!dragStartRef.current || !dragStartWorldRef.current) return

    event.stopPropagation() // Prevent event from bubbling to other handlers

    const currentPos = event.point
    const delta = {
      x: currentPos.x - dragStartRef.current.x,
      y: currentPos.y - dragStartRef.current.y,
      z: currentPos.z - dragStartRef.current.z,
    }

    // Check if we've moved beyond threshold
    const distance = Math.sqrt(delta.x * delta.x + delta.z * delta.z)

    // Only activate drag state after moving beyond threshold
    if (distance > DRAG_THRESHOLD) {
      if (!isDragging) {
        // First time crossing threshold - activate drag state
        const gate = useCircuitStore.getState().gates.find((g) => g.id === gateId)
        if (!gate) {
          handleDragCancel()
          return
        }

        // Ensure the gate being dragged is selected (needed for validation)
        // Only do this once when drag actually starts, not on every pointer down
        circuitActions.selectGate(gateId)

        setIsDragging(true)
        circuitActions.setDragActive(true)
      }

      hasMovedRef.current = true
      didDragRef.current = true

      // Calculate new position
      const gate = useCircuitStore.getState().gates.find((g) => g.id === gateId)
      if (!gate) {
        // Gate was deleted during drag
        handleDragCancel()
        return
      }

      const newWorldPos: Position = {
        x: dragStartWorldRef.current.x + delta.x,
        y: dragStartWorldRef.current.y, // Preserve Y (0.2 for flat gates)
        z: dragStartWorldRef.current.z + delta.z,
      }

      // Snap to grid (preserves Y coordinate)
      const snappedPos = snapToGrid(newWorldPos)

      // Update preview position for visual feedback
      circuitActions.updatePlacementPreviewPosition(snappedPos)
    }
    // If we haven't moved beyond threshold yet, don't do anything (waiting to see if it's a click)
  }

  const handleDragEnd = () => {
    if (dragEndHandledRef.current) return
    dragEndHandledRef.current = true

    // Release pointer capture from canvas element
    const canvasElement = canvasElementRef.current
    if (canvasElement && pointerIdRef.current !== null && canvasElement.releasePointerCapture) {
      canvasElement.releasePointerCapture(pointerIdRef.current)
    }
    pointerIdRef.current = null
    canvasElementRef.current = null

    // If we didn't move enough, treat it as a click (don't drag)
    if (!hasMovedRef.current || !isDragging) {
      // Allow the click to proceed - set this before canceling so onClick can check it
      allowNextClickRef.current = true
      handleDragCancel()
      // Reset after a short delay to allow onClick to fire
      setTimeout(() => {
        allowNextClickRef.current = false
      }, 50)
      return
    }

    // Set drag active to false first
    circuitActions.setDragActive(false)

    const previewPos = useCircuitStore.getState().placementPreviewPosition
    if (!previewPos) {
      handleDragCancel()
      return
    }

    // Validate final position
    const gate = useCircuitStore.getState().gates.find((g) => g.id === gateId)
    if (!gate) {
      handleDragCancel()
      return
    }

    const gridPos = worldToGrid(previewPos)
    const otherGates = useCircuitStore.getState().gates.filter((g) => g.id !== gateId)

    if (canPlaceGateAt(gridPos, otherGates, gateId)) {
      // Valid position - update gate
      circuitActions.updateGatePosition(gateId, previewPos)
    }
    // If invalid, gate stays at original position (no update)

    // Clean up all state and refs
    setIsDragging(false)
    dragStartRef.current = null
    dragStartWorldRef.current = null
    hasMovedRef.current = false
    didDragRef.current = false
    allowNextClickRef.current = false
    circuitActions.updatePlacementPreviewPosition(null)
  }

  const handleDragCancel = () => {
    dragEndHandledRef.current = true

    // Set drag active to false first
    circuitActions.setDragActive(false)

    // Release pointer capture from canvas element
    const canvasElement = canvasElementRef.current
    if (canvasElement && pointerIdRef.current !== null && canvasElement.releasePointerCapture) {
      canvasElement.releasePointerCapture(pointerIdRef.current)
    }
    pointerIdRef.current = null
    canvasElementRef.current = null

    // Clean up all state and refs
    setIsDragging(false)
    dragStartRef.current = null
    dragStartWorldRef.current = null
    hasMovedRef.current = false
    didDragRef.current = false
    allowNextClickRef.current = false
    circuitActions.updatePlacementPreviewPosition(null)
  }

  // Handle pointer leave to cancel drag
  const handlePointerLeave = () => {
    if (isDragging) {
      handleDragCancel()
    }
  }

  // Function to check if a click should be allowed (no drag occurred)
  // Only prevent click if a drag actually happened (moved beyond threshold)
  const shouldAllowClick = () => {
    // Use the ref which is set in onPointerUp when no drag occurred
    return allowNextClickRef.current || (!isDragging && !didDragRef.current)
  }

  return {
    isDragging,
    shouldAllowClick,
    onPointerDown: handleDragStart,
    onPointerMove: handleDrag,
    onPointerUp: handleDragEnd,
    onPointerLeave: handlePointerLeave,
  }
}
