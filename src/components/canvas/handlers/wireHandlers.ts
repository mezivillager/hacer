import type { ThreeEvent } from '@react-three/fiber'
import { useCircuitStore, circuitActions } from '@/store/circuitStore'
import { findNearestWire } from '@/utils/wireHitTest'
import type { Position } from '@/store/types'

/**
 * Handle wire click detection - finds nearest wire to click point and selects it.
 * Only handles clicks when NOT in placement/wiring mode.
 *
 * @param e - Three.js mouse event with 3D point information
 * @returns Wire ID if wire was selected, null otherwise
 */
export function handleWireClick(e: ThreeEvent<MouseEvent>): string | null {
  const state = useCircuitStore.getState()
  const isPlacing = state.placementMode !== null
  const isWiring = state.wiringFrom !== null
  const isDragging = state.placementPreviewPosition !== null && state.placementMode === null && state.selectedGateId !== null

  // Don't handle wire clicks during placement, wiring, or dragging
  if (isPlacing || isWiring || isDragging) {
    return null
  }

  // Defensive check: ensure point exists (should always be present in R3F click events)
  if (!e.point) {
    return null
  }

  // Find nearest wire to click point
  const clickPoint: Position = {
    x: e.point.x,
    y: e.point.y,
    z: e.point.z,
  }

  const wireId = findNearestWire(clickPoint, state.wires, 0.5)

  if (wireId) {
    circuitActions.selectWire(wireId)
    return wireId
  }

  return null
}



