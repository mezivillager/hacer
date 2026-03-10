import { useState, useRef } from 'react'
import { ThreeEvent } from '@react-three/fiber'
import { useCircuitStore, circuitActions } from '@/store/circuitStore'
import { snapToGrid, worldToGrid, canPlaceGateAt } from '@/utils/grid'
import type { Position, NodeType } from '@/store/types'

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
 * Hook for dragging circuit I/O nodes, modeled after useGateDrag.
 * Handles pointer capture, threshold-based drag detection, snap-to-grid,
 * and position updates with wire recalculation.
 *
 * @param nodeId - The ID of the node to drag
 * @param nodeType - The type of node ('input' or 'output')
 * @returns Drag state and pointer event handlers
 */
export function useNodeDrag(nodeId: string, nodeType: NodeType) {
  const [isDragging, setIsDragging] = useState(false)
  const dragStartRef = useRef<Position | null>(null)
  const dragStartWorldRef = useRef<Position | null>(null)
  const hasMovedRef = useRef(false)
  const didDragRef = useRef(false)
  const pointerIdRef = useRef<number | null>(null)
  const allowNextClickRef = useRef(true)
  const canvasElementRef = useRef<HTMLElement | null>(null)
  const dragEndHandledRef = useRef(false)

  const getNode = () => {
    const state = useCircuitStore.getState()
    if (nodeType === 'input') return state.inputNodes.find(n => n.id === nodeId)
    if (nodeType === 'output') return state.outputNodes.find(n => n.id === nodeId)
    return undefined
  }

  const handleDragStart = (event: ThreeEvent<PointerEvent>) => {
    event.stopPropagation()

    const node = getNode()
    if (!node) return

    const canvasElement = getCanvasElement(event)
    canvasElementRef.current = canvasElement
    pointerIdRef.current = event.nativeEvent.pointerId

    if (canvasElement?.setPointerCapture) {
      canvasElement.setPointerCapture(event.nativeEvent.pointerId)
    }

    dragStartRef.current = { x: event.point.x, y: event.point.y, z: event.point.z }
    dragStartWorldRef.current = { ...node.position }
    hasMovedRef.current = false
    didDragRef.current = false
    allowNextClickRef.current = false
    dragEndHandledRef.current = false
    setIsDragging(false)
    circuitActions.setDragActive(true)
    circuitActions.selectNode(nodeId, nodeType)
    circuitActions.updatePlacementPreviewPosition(snapToGrid({ ...node.position }))

    const onCaptureLost = () => {
      canvasElement?.removeEventListener('lostpointercapture', onCaptureLost)
      handleDragEnd()
    }
    canvasElement?.addEventListener('lostpointercapture', onCaptureLost)
  }

  const handleDragCancel = () => {
    dragEndHandledRef.current = true
    circuitActions.setDragActive(false)

    const canvasElement = canvasElementRef.current
    if (canvasElement && pointerIdRef.current !== null && canvasElement.releasePointerCapture) {
      canvasElement.releasePointerCapture(pointerIdRef.current)
    }
    pointerIdRef.current = null
    canvasElementRef.current = null

    setIsDragging(false)
    dragStartRef.current = null
    dragStartWorldRef.current = null
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
        const node = getNode()
        if (!node) {
          handleDragCancel()
          return
        }
        circuitActions.selectNode(nodeId, nodeType)
        setIsDragging(true)
        circuitActions.setDragActive(true)
      }

      hasMovedRef.current = true
      didDragRef.current = true

      const node = getNode()
      if (!node) {
        handleDragCancel()
        return
      }

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
    pointerIdRef.current = null
    canvasElementRef.current = null

    if (!hasMovedRef.current || !isDragging) {
      allowNextClickRef.current = true
      handleDragCancel()
      setTimeout(() => {
        allowNextClickRef.current = false
      }, 50)
      return
    }

    circuitActions.setDragActive(false)

    const previewPos = useCircuitStore.getState().placementPreviewPosition
    if (!previewPos) {
      handleDragCancel()
      return
    }

    const state = useCircuitStore.getState()
    const gridPos = worldToGrid(previewPos)
    const canPlace = canPlaceGateAt(
      gridPos,
      state.gates,
      undefined,
      state.wires,
      circuitActions.getPinWorldPosition,
      circuitActions.getPinOrientation
    )
    if (canPlace) {
      if (nodeType === 'input') {
        circuitActions.updateInputNodePosition(nodeId, previewPos)
      } else if (nodeType === 'output') {
        circuitActions.updateOutputNodePosition(nodeId, previewPos)
      }
    }

    setIsDragging(false)
    dragStartRef.current = null
    dragStartWorldRef.current = null
    hasMovedRef.current = false
    didDragRef.current = false
    allowNextClickRef.current = false
    circuitActions.updatePlacementPreviewPosition(null)
  }

  const handlePointerLeave = () => {
    if (isDragging) {
      handleDragCancel()
    }
  }

  const shouldAllowClick = () => {
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
