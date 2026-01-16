import { circuitActions, useCircuitStore } from '@/store/circuitStore'
import type { DestinationType } from '@/utils/wiringScheme/types'
import { calculateNodePinPosition } from '@/nodes/config/nodeConfig'

export interface DestinationPinResult {
  destination: DestinationType
  destinationGateId: string | undefined
}

/**
 * Hook to resolve destination pin information from wiring state.
 * Returns a DestinationType for path calculation along with destination gate ID if available.
 * Handles both gate pin destinations and node pin destinations.
 *
 * @param wiringFrom - Current wiring state (can be null)
 * @returns Object with destination and destinationGateId, or null if no destination
 *
 * @example
 * const result = useDestinationPin(wiringFrom)
 * if (result?.destination.type === 'pin') {
 *   // Path to pin, result.destinationGateId is the gate ID (or undefined for node destinations)
 * } else if (result?.destination.type === 'cursor') {
 *   // Path to cursor
 * }
 */
export function useDestinationPin(
  wiringFrom: {
    destinationGateId: string | null
    destinationPinId: string | null
    destinationNodeId: string | null
    destinationNodeType: 'input' | 'output' | 'constant' | null
    previewEndPosition: { x: number; y: number; z: number } | null
  } | null
): DestinationPinResult | null {
  // No wiring active - no destination
  if (!wiringFrom) {
    return null
  }

  // Check for node destination first (output nodes can be destinations)
  if (wiringFrom.destinationNodeId && wiringFrom.destinationNodeType === 'output') {
    const state = useCircuitStore.getState()
    const outputNode = state.outputNodes.find((n) => n.id === wiringFrom.destinationNodeId)
    if (outputNode) {
      // Calculate pin position (input pin on left side of output node)
      const pinOffset = calculateNodePinPosition('output')
      const pinCenter = {
        x: outputNode.position.x + pinOffset.x,
        y: outputNode.position.y + pinOffset.y,
        z: outputNode.position.z + pinOffset.z,
      }
      // Output node input pins point left (opposite of input/constant nodes)
      const pinOrientation = { x: -1, y: 0, z: 0 }

      return {
        destination: {
          type: 'pin',
          pin: pinCenter,
          orientation: { direction: pinOrientation },
        },
        destinationGateId: undefined, // Node destinations don't have gate IDs
      }
    }
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

