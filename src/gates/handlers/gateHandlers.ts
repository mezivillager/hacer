import { ThreeEvent } from '@react-three/fiber'
import { colors } from '@/theme'
import type { Position } from '@/store/types'

/**
 * Get pin color based on state (wiring hover, output/input, connected/disconnected, value)
 */
export function getPinColor(
  value: boolean,
  connected: boolean,
  pinName: string,
  isOutput: boolean,
  isWiring: boolean,
  hoveredPin: string | null
): string {
  if (isWiring && hoveredPin === pinName) return colors.primary
  if (isOutput) return value ? colors.pin.active : colors.pin.inactive
  if (connected) return value ? colors.pin.active : colors.pin.inactive
  return value ? colors.pin.active : colors.pin.disconnected
}

/**
 * Convert local pin offset to world position, using event point if available
 */
export function getWorldPosition(
  position: [number, number, number],
  localOffset: [number, number, number],
  eventPoint?: { x: number; y: number; z: number }
): Position {
  if (eventPoint) {
    return eventPoint
  }
  return {
    x: position[0] + localOffset[0],
    y: position[1] + localOffset[1],
    z: position[2] + localOffset[2],
  }
}

/**
 * Create a gate body click handler with drag detection delay
 */
export function createGateClickHandler(
  isWiring: boolean,
  shouldAllowClick: () => boolean,
  onClick?: () => void
): (e: ThreeEvent<MouseEvent>) => void {
  return (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation()
    // Check if click should be allowed (may need to wait for drag handlers to complete)
    // Use a small delay to ensure drag state has been updated
    setTimeout(() => {
      if (!isWiring && shouldAllowClick()) {
        onClick?.()
      }
    }, 10)
  }
}

/**
 * Create a pin pointer move handler for wiring mode
 */
export function createPinPointerMoveHandler(
  isWiring: boolean,
  getWorldPositionFn: (localOffset: [number, number, number], eventPoint?: { x: number; y: number; z: number }) => Position,
  updateWirePreviewPosition: (position: Position) => void
): (localOffset: [number, number, number]) => (e: ThreeEvent<PointerEvent>) => void {
  return (localOffset: [number, number, number]) => (e: ThreeEvent<PointerEvent>) => {
    if (isWiring) {
      e.stopPropagation()
      const worldPos = getWorldPositionFn(
        localOffset,
        e.point ? { x: e.point.x, y: e.point.y, z: e.point.z } : undefined
      )
      updateWirePreviewPosition(worldPos)
    }
  }
}

/**
 * Create a pin click handler (shift+click for toggle, normal click for wiring)
 */
export function createPinClickHandler(
  id: string,
  getWorldPositionFn: (localOffset: [number, number, number], eventPoint?: { x: number; y: number; z: number }) => Position,
  onInputToggle?: (gateId: string, pinId: string) => void,
  onPinClick?: (gateId: string, pinId: string, pinType: 'input' | 'output', worldPosition: Position) => void
): (pinId: string, pinType: 'input' | 'output', localOffset: [number, number, number], isConnected: boolean) => (e: ThreeEvent<MouseEvent>) => void {
  return (pinId: string, pinType: 'input' | 'output', localOffset: [number, number, number], isConnected: boolean) => (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation()

    if (e.shiftKey && pinType === 'input' && !isConnected) {
      onInputToggle?.(id, pinId)
      return
    }

    const worldPos = getWorldPositionFn(
      localOffset,
      e.point ? { x: e.point.x, y: e.point.y, z: e.point.z } : undefined
    )
    onPinClick?.(id, pinId, pinType, worldPos)
  }
}

/**
 * Handle pin pointer out (placeholder for clearing preview)
 */
export function handlePinPointerOut(): void {
  // Clear preview position when leaving pin
}
