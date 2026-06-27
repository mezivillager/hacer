import { useState, useRef } from 'react'
import { ThreeEvent } from '@react-three/fiber'
import { useCircuitStore, circuitActions } from '@/store/circuitStore'
import { snapToGrid } from '@/utils/grid'
import type { Position } from '@/store/types'

const DRAG_THRESHOLD = 0.1

function getCanvasElement(event: ThreeEvent<PointerEvent>): HTMLElement | null {
  const target = event.nativeEvent.target
  if (target instanceof HTMLElement) {
    if (target.tagName === 'CANVAS') return target
    return target.closest('canvas')
  }
  return null
}

/**
 * Hook for dragging bus splitter/joiner components, modeled after useNodeDrag.
 * Handles pointer capture, threshold-based drag detection, snap-to-grid,
 * and position updates with wire re-routing (updateBusComponentPosition handles that).
 *
 * @param busId - The ID of the bus component to drag
 * @returns Drag state and pointer event handlers
 */
export function useBusDrag(busId: string) {
  const [isDragging, setIsDragging] = useState(false)
  const dragStartRef = useRef<Position | null>(null)
  const dragStartScreenRef = useRef<{ x: number; y: number } | null>(null)
  const canvasPointerMoveHandlerRef = useRef<((e: PointerEvent) => void) | null>(null)
  const dragStartWorldRef = useRef<Position | null>(null)
  const hasMovedRef = useRef(false)
  const didDragRef = useRef(false)
  const pointerIdRef = useRef<number | null>(null)
  const allowNextClickRef = useRef(true)
  const canvasElementRef = useRef<HTMLElement | null>(null)
  const dragEndHandledRef = useRef(false)
  const captureLostHandlerRef = useRef<(() => void) | null>(null)

  const getBusComponent = () =>
    useCircuitStore.getState().busComponents.find((c) => c.id === busId)

  const handleDragStart = (event: ThreeEvent<PointerEvent>) => {
    event.stopPropagation()

    const component = getBusComponent()
    if (!component) return

    const canvasElement = getCanvasElement(event)
    canvasElementRef.current = canvasElement
    pointerIdRef.current = event.nativeEvent.pointerId

    if (canvasElement?.setPointerCapture) {
      canvasElement.setPointerCapture(event.nativeEvent.pointerId)
    }

    dragStartRef.current = { x: event.point.x, y: event.point.y, z: event.point.z }
    dragStartWorldRef.current = { ...component.position }
    dragStartScreenRef.current = { x: event.nativeEvent.clientX, y: event.nativeEvent.clientY }
    hasMovedRef.current = false
    didDragRef.current = false
    allowNextClickRef.current = false
    dragEndHandledRef.current = false
    setIsDragging(false)

    circuitActions.selectBus(busId)

    const handleCanvasPointerMove = (e: PointerEvent) => {
      if (!dragStartScreenRef.current) return
      const dx = e.clientX - dragStartScreenRef.current.x
      const dy = e.clientY - dragStartScreenRef.current.y
      const distance = Math.sqrt(dx * dx + dy * dy)
      if (distance > 5) {
        if (!hasMovedRef.current) {
          circuitActions.setDragActive(true)
          const currentComponent = getBusComponent()
          if (currentComponent) {
            circuitActions.updatePlacementPreviewPosition(snapToGrid({ ...currentComponent.position }))
          }
        }
        hasMovedRef.current = true
        didDragRef.current = true
        setIsDragging((prev) => {
          if (!prev) return true
          return prev
        })
      }
    }

    canvasElement?.addEventListener('pointermove', handleCanvasPointerMove)
    canvasPointerMoveHandlerRef.current = handleCanvasPointerMove

    const onCaptureLost = () => {
      if (canvasElement && captureLostHandlerRef.current) {
        canvasElement.removeEventListener('lostpointercapture', captureLostHandlerRef.current)
      }
      handleDragEnd()
    }
    captureLostHandlerRef.current = onCaptureLost
    canvasElement?.addEventListener('lostpointercapture', onCaptureLost)
  }

  const handleDragCancel = () => {
    dragEndHandledRef.current = true
    circuitActions.setDragActive(false)

    const canvasElement = canvasElementRef.current
    if (canvasElement && pointerIdRef.current !== null && canvasElement.releasePointerCapture) {
      canvasElement.releasePointerCapture(pointerIdRef.current)
    }
    if (canvasElement && canvasPointerMoveHandlerRef.current) {
      canvasElement.removeEventListener('pointermove', canvasPointerMoveHandlerRef.current)
      canvasPointerMoveHandlerRef.current = null
    }
    if (canvasElement && captureLostHandlerRef.current) {
      canvasElement.removeEventListener('lostpointercapture', captureLostHandlerRef.current)
      captureLostHandlerRef.current = null
    }

    pointerIdRef.current = null
    canvasElementRef.current = null

    setIsDragging(false)
    dragStartRef.current = null
    dragStartWorldRef.current = null
    dragStartScreenRef.current = null
    hasMovedRef.current = false
    didDragRef.current = false
    allowNextClickRef.current = false
    circuitActions.updatePlacementPreviewPosition(null)
  }

  const handleDrag = (event: ThreeEvent<PointerEvent>) => {
    if (!dragStartRef.current || !dragStartWorldRef.current) return
    event.stopPropagation()

    const currentPos = event.point
    const delta = {
      x: currentPos.x - dragStartRef.current.x,
      z: currentPos.z - dragStartRef.current.z,
    }
    const distance = Math.sqrt(delta.x * delta.x + delta.z * delta.z)

    if (distance > DRAG_THRESHOLD) {
      if (!isDragging) {
        const component = getBusComponent()
        if (!component) { handleDragCancel(); return }
        circuitActions.selectBus(busId)
        setIsDragging(true)
        circuitActions.setDragActive(true)
      }

      hasMovedRef.current = true
      didDragRef.current = true

      const component = getBusComponent()
      if (!component) { handleDragCancel(); return }

      const newWorldPos: Position = {
        x: dragStartWorldRef.current.x + delta.x,
        y: dragStartWorldRef.current.y,
        z: dragStartWorldRef.current.z + delta.z,
      }
      const snappedPos = snapToGrid(newWorldPos)
      circuitActions.updatePlacementPreviewPosition(snappedPos)
    }
  }

  const handleDragEnd = () => {
    if (dragEndHandledRef.current) return
    dragEndHandledRef.current = true

    const canvasElement = canvasElementRef.current
    if (canvasElement && pointerIdRef.current !== null && canvasElement.releasePointerCapture) {
      canvasElement.releasePointerCapture(pointerIdRef.current)
    }
    if (canvasElement && canvasPointerMoveHandlerRef.current) {
      canvasElement.removeEventListener('pointermove', canvasPointerMoveHandlerRef.current)
      canvasPointerMoveHandlerRef.current = null
    }
    if (canvasElement && captureLostHandlerRef.current) {
      canvasElement.removeEventListener('lostpointercapture', captureLostHandlerRef.current)
      captureLostHandlerRef.current = null
    }

    pointerIdRef.current = null
    canvasElementRef.current = null

    if (!hasMovedRef.current) {
      allowNextClickRef.current = true
      handleDragCancel()
      setTimeout(() => { allowNextClickRef.current = false }, 50)
      return
    }

    circuitActions.setDragActive(false)

    const previewPos = useCircuitStore.getState().placementPreviewPosition
    if (!previewPos) { handleDragCancel(); return }

    circuitActions.updateBusComponentPosition(busId, previewPos)

    setIsDragging(false)
    dragStartRef.current = null
    dragStartWorldRef.current = null
    dragStartScreenRef.current = null
    hasMovedRef.current = false
    didDragRef.current = false
    allowNextClickRef.current = false
    circuitActions.updatePlacementPreviewPosition(null)
  }

  const handlePointerLeave = () => {
    if (isDragging) { handleDragCancel() }
  }

  const shouldAllowClick = () =>
    allowNextClickRef.current || (!isDragging && !didDragRef.current)

  return {
    isDragging,
    shouldAllowClick,
    onPointerDown: handleDragStart,
    onPointerMove: handleDrag,
    onPointerUp: handleDragEnd,
    onPointerLeave: handlePointerLeave,
  }
}
