import type { ThreeEvent } from '@react-three/fiber'
import { notify } from '@lib/toast'
import { useCircuitStore, circuitActions } from '@/store/circuitStore'
import { findNearestWire } from '@/utils/wireHitTest'
import type { Position } from '@/store/types'

/**
 * Handle wire click detection - finds nearest wire to click point and selects it.
 * Only handles clicks when NOT in placement/wiring mode.
 *
 * Called from the ground plane click handler. Uses findNearestWire to detect
 * wires near the click point (wires are thin, so this approach is more reliable
 * than trying to click directly on the wire).
 *
 * @param e - Three.js mouse event with 3D point information
 * @returns Wire ID if wire was selected, null otherwise
 */
export function handleWireClick(e: ThreeEvent<MouseEvent>): string | null {
  const state = useCircuitStore.getState()
  const isPlacing = state.placementMode !== null
  const isWiring = state.wiringFrom !== null
  const isPlacingJunction = state.junctionPlacementMode === true
  const isDragging = state.placementPreviewPosition !== null && state.placementMode === null && state.selectedGateId !== null

  if (!e.point) {
    return null
  }

  // Don't handle wire clicks during placement, wiring, or dragging (except junction placement)
  if ((isPlacing || isWiring || isDragging) && !isPlacingJunction) {
    return null
  }

  const clickPoint: Position = {
    x: e.point.x,
    y: e.point.y,
    z: e.point.z,
  }

  // During junction placement, use the stored preview wireId and snapped corner position.
  // These are computed by updateJunctionPreviewPosition when the preview is visible,
  // so a non-null value means the preview was showing and the position is a valid corner.
  if (isPlacingJunction) {
    const previewPosition = state.junctionPreviewPosition
    const previewWireId = state.junctionPreviewWireId
    const previewWireExists = previewWireId !== null && state.wires.some((w) => w.id === previewWireId)

    if (previewPosition && previewWireId && previewWireExists) {
      try {
        circuitActions.placeJunctionOnWire(previewPosition, previewWireId)
        return previewWireId
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error)
        notify.warning(errorMsg)
        return null
      }
    }

    // No valid preview visible — try to detect wire at click point as fallback
    const targetWireId = findNearestWire(clickPoint, state.wires, 0.5)
    if (targetWireId) {
      try {
        circuitActions.placeJunctionOnWire(clickPoint, targetWireId)
        return targetWireId
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error)
        notify.warning(errorMsg)
        return targetWireId
      }
    }

    return null
  }

  // Normal wire selection
  const targetWireId = findNearestWire(clickPoint, state.wires, 0.5)
  if (!targetWireId) {
    return null
  }

  circuitActions.selectWire(targetWireId)
  return targetWireId
}
