import { circuitActions } from '@/store/circuitStore'
import type { DestinationType } from '@/utils/wiringScheme/types'

export interface DestinationPinResult {
  destination: DestinationType
  destinationGateId: string | undefined
}

/**
 * Hook to resolve destination pin information from wiring state.
 * Returns a DestinationType for path calculation along with destination gate ID if available.
 * 
 * @param wiringFrom - Current wiring state (can be null)
 * @returns Object with destination and destinationGateId, or null if no destination
 * 
 * @example
 * const result = useDestinationPin(wiringFrom)
 * if (result?.destination.type === 'pin') {
 *   // Path to pin, result.destinationGateId is the gate ID
 * } else if (result?.destination.type === 'cursor') {
 *   // Path to cursor
 * }
 */
export function useDestinationPin(
  wiringFrom: { destinationGateId: string | null; destinationPinId: string | null; previewEndPosition: { x: number; y: number; z: number } | null } | null
): DestinationPinResult | null {
  // No wiring active - no destination
  if (!wiringFrom) {
    return null
  }

  // Use destination pin from store if available (set when pin is hovered via onPointerOver)
  if (wiringFrom.destinationGateId && wiringFrom.destinationPinId) {
    const destinationGateId: string = wiringFrom.destinationGateId
    const destinationPinId: string = wiringFrom.destinationPinId

    const pinCenter = circuitActions.getPinWorldPosition(destinationGateId, destinationPinId)
    const pinOrientation = circuitActions.getPinOrientation(destinationGateId, destinationPinId)

    if (pinCenter && pinOrientation) {
      return {
        destination: {
          type: 'pin',
          pin: pinCenter,
          orientation: { direction: pinOrientation },
        },
        destinationGateId,
      }
    }
  }

  // No destination pin - use cursor position
  if (wiringFrom.previewEndPosition) {
    return {
      destination: {
        type: 'cursor',
        pos: wiringFrom.previewEndPosition,
      },
      destinationGateId: undefined,
    }
  }

  return null
}

