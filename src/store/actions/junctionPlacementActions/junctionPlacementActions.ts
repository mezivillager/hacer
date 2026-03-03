/**
 * Junction Placement Actions
 *
 * Actions for placing junction nodes on wires to enable branching.
 */

import type {
  JunctionPlacementActions,
  JunctionNode,
  Position,
  CircuitStore,
  Wire,
} from '../../types'
import { calculatePositionOnWire, findSegmentContainingPosition, isAtSegmentCorner, findWireCorners } from '@/utils/wirePosition'

type SetState = (
  fn: (state: CircuitStore) => void,
  replace?: false,
  actionName?: string
) => void
type GetState = () => CircuitStore

/**
 * Generate a unique ID for a junction.
 *
 * @param prefix - Prefix for the ID
 * @returns Unique ID string
 */
function generateId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`
}

/**
 * Generate a signalId for a wire based on its source.
 *
 * @param wire - The wire to generate signalId for
 * @param get - Zustand get function to access state
 * @returns Generated signalId string
 */
function generateSignalIdForWire(wire: Wire, get: GetState): string {
  if (wire.signalId) {
    return wire.signalId
  }

  // Generate signalId based on source
  if (wire.from.type === 'gate' && wire.from.pinId) {
    return `sig-${wire.from.entityId}-${wire.from.pinId}`
  } else if (wire.from.type === 'input' || wire.from.type === 'constant') {
    return `sig-${wire.from.entityId}`
  } else if (wire.from.type === 'junction') {
    // If wire starts from junction, use junction's signalId
    const state = get()
    const junction = state.junctions.find((j) => j.id === wire.from.entityId)
    if (junction) {
      return junction.signalId
    }
  }

  // Fallback
  return `sig-${Date.now()}`
}

/**
 * Create junction placement actions.
 *
 * @param set - Zustand set function
 * @param get - Zustand get function
 * @returns JunctionPlacementActions object
 */
export const createJunctionPlacementActions = (
  set: SetState,
  get: GetState
): JunctionPlacementActions => ({
  startJunctionPlacement: () => {
    set((state) => {
      state.junctionPlacementMode = true
      state.selectedGateId = null
      state.selectedNodeId = null
      state.selectedNodeType = null
      state.selectedWireId = null
      // Cancel other placement modes
      state.placementMode = null
      state.nodePlacementMode = null
    }, false, 'startJunctionPlacement')
  },

  cancelJunctionPlacement: () => {
    set((state) => {
      state.junctionPlacementMode = null
      state.junctionPreviewPosition = null
    }, false, 'cancelJunctionPlacement')
  },

  updateJunctionPreviewPosition: (position: Position | null) => {
    set((state) => {
      state.junctionPreviewPosition = position
    }, false, 'updateJunctionPreviewPosition')
  },

  placeJunctionOnWire: (clickPoint: Position, wireId: string): JunctionNode => {
    const state = get()
    const wire = state.wires.find((w) => w.id === wireId)

    if (!wire) {
      throw new Error(`Wire ${wireId} not found`)
    }

    // Calculate position on wire from click point
    const junctionPosition = calculatePositionOnWire(clickPoint, wire)
    if (!junctionPosition) {
      throw new Error('Could not calculate position on wire')
    }

    // Snap to nearest corner if click is near a corner (matches preview behavior)
    const PREVIEW_THRESHOLD = 0.3
    const corners = findWireCorners(wire)
    let snappedPosition = junctionPosition
    let nearestCorner: Position | null = null
    let minCornerDistance = Infinity

    for (const corner of corners) {
      const dx = clickPoint.x - corner.x
      const dy = clickPoint.y - corner.y
      const dz = clickPoint.z - corner.z
      const distance = Math.sqrt(dx * dx + dy * dy + dz * dz)

      if (distance < minCornerDistance) {
        minCornerDistance = distance
        nearestCorner = corner
      }
    }

    if (nearestCorner && minCornerDistance < PREVIEW_THRESHOLD) {
      snappedPosition = nearestCorner
    }

    // Use snapped position for junction placement
    const finalJunctionPosition = snappedPosition

    // Find which segment contains the final junction position
    const segmentInfo = findSegmentContainingPosition(wire.segments, finalJunctionPosition)
    if (!segmentInfo) {
      throw new Error('Could not determine which segment contains the junction position')
    }

    const { segmentIndex } = segmentInfo
    const segment = wire.segments[segmentIndex]

    // Validate that junction is placed at a corner (segment endpoint where perpendicular segments meet)
    const isAtCorner = isAtSegmentCorner(finalJunctionPosition, segment, wire.segments, segmentIndex)

    if (!isAtCorner) {
      throw new Error(
        'Junction can only be placed at wire corners (section line intersections). Please click on a corner where segments meet.'
      )
    }

    // Get or generate signalId
    const signalId = generateSignalIdForWire(wire, get)

    // Create junction node
    const junction: JunctionNode = {
      id: generateId('junction'),
      signalId,
      position: finalJunctionPosition,
      wireIds: [wireId],
    }

    set((state) => {
      state.junctions.push(junction)
      const wireToUpdate = state.wires.find((w) => w.id === wireId)
      if (wireToUpdate && !wireToUpdate.signalId) {
        wireToUpdate.signalId = signalId
      }
      state.junctionPlacementMode = null
      state.junctionPreviewPosition = null
    }, false, 'placeJunctionOnWire')

    return junction
  },
})
