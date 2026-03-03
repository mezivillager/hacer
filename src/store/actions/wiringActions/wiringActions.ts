import { message } from 'antd'
import type { WiringActions, Position, CircuitStore, NodeType, WireEndpoint } from '../../types'
import type { WireSegment } from '@/utils/wiringScheme/types'
import { resolveCrossings } from '@/utils/wiringScheme/crossing'
import { getSegmentsUpToPosition } from '@/utils/wirePosition'
import { calculateNodePinPosition } from '@/nodes/config/nodeConfig'

type SetState = (
  fn: (state: CircuitStore) => void,
  replace?: false,
  actionName?: string
) => void
type GetState = () => CircuitStore

export const createWiringActions = (set: SetState, get: GetState): WiringActions => ({
  startWiring: (
    gateId: string,
    pinId: string,
    pinType: 'input' | 'output',
    position: Position
  ) => {
    set((state) => {
      state.wiringFrom = {
        fromGateId: gateId,
        fromPinId: pinId,
        fromPinType: pinType,
        fromPosition: position,
        previewEndPosition: null,
        destinationGateId: null,
        destinationPinId: null,
        destinationNodeId: null,
        destinationNodeType: null,
        segments: null,
        source: { type: 'gate', gateId, pinId, pinType },
      }
      state.placementMode = null
    }, false, 'startWiring')
  },

  updateWirePreviewPosition: (position: Position | null) => {
    set((state) => {
      if (state.wiringFrom) {
        state.wiringFrom.previewEndPosition = position
      }
    }, false, 'updateWirePreviewPosition')
  },

  setDestinationPin: (gateId: string | null, pinId: string | null) => {
    set((state) => {
      if (state.wiringFrom) {
        state.wiringFrom.destinationGateId = gateId
        state.wiringFrom.destinationPinId = pinId
        state.wiringFrom.destinationNodeId = null
        state.wiringFrom.destinationNodeType = null
        state.wiringFrom.segments = null
      }
    }, false, 'setDestinationPin')
  },

  setDestinationNode: (nodeId: string | null, nodeType: NodeType | null) => {
    set((state) => {
      if (state.wiringFrom) {
        state.wiringFrom.destinationNodeId = nodeId
        state.wiringFrom.destinationNodeType = nodeType
        state.wiringFrom.destinationGateId = null
        state.wiringFrom.destinationPinId = null
        state.wiringFrom.segments = null
      }
    }, false, 'setDestinationNode')
  },

  cancelWiring: () => {
    set((state) => {
      state.wiringFrom = null
    }, false, 'cancelWiring')
  },

  completeWiring: (toGateId: string, toPinId: string, toPinType: 'input' | 'output') => {
    const state = get()
    const from = state.wiringFrom
    if (!from) {
      message.warning('No active wiring operation')
      return
    }

    if (from.fromPinType === toPinType) {
      message.warning('Cannot connect same pin types')
      set((s) => {
        s.wiringFrom = null
      }, false, 'completeWiring/invalidPinType')
      return
    }

    if (from.fromGateId === toGateId) {
      message.warning('Cannot connect gate to itself')
      set((s) => {
        s.wiringFrom = null
      }, false, 'completeWiring/sameGate')
      return
    }

    const exists = state.wires.some(
      (w) =>
        w.from.type === 'gate' &&
        w.to.type === 'gate' &&
        ((w.from.entityId === from.fromGateId &&
          w.from.pinId === from.fromPinId &&
          w.to.entityId === toGateId &&
          w.to.pinId === toPinId) ||
        (w.from.entityId === toGateId &&
          w.from.pinId === toPinId &&
          w.to.entityId === from.fromGateId &&
          w.to.pinId === from.fromPinId))
    )

    if (exists) {
      message.warning('Wire already exists')
      set((s) => {
        s.wiringFrom = null
      }, false, 'completeWiring/wireExists')
      return
    }

    const wireSegments: WireSegment[] | null = from.segments

    if (!wireSegments) {
      message.error('Wire path not available. Please try connecting again.')
      set((s) => {
        s.wiringFrom = null
      }, false, 'completeWiring/noSegments')
      return
    }

    let resolvedSegments: WireSegment[]
    let crossedWireIds: string[] = []
    try {
      const result = resolveCrossings(wireSegments, state.wires)
      resolvedSegments = result.segments
      crossedWireIds = result.crossedWireIds
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to resolve wire crossings'
      message.error(`Cannot complete wire: ${errorMessage}`)
      set((s) => {
        s.wiringFrom = null
      }, false, 'completeWiring/crossingResolutionFailed')
      return
    }

    let fromEndpoint: WireEndpoint
    let toEndpoint: WireEndpoint

    if (from.fromPinType === 'output') {
      fromEndpoint = { type: 'gate', entityId: from.fromGateId, pinId: from.fromPinId }
      toEndpoint = { type: 'gate', entityId: toGateId, pinId: toPinId }
    } else {
      fromEndpoint = { type: 'gate', entityId: toGateId, pinId: toPinId }
      toEndpoint = { type: 'gate', entityId: from.fromGateId, pinId: from.fromPinId }
    }

    state.addWire(fromEndpoint, toEndpoint, resolvedSegments, crossedWireIds)

    set((s) => {
      s.wiringFrom = null
    }, false, 'completeWiring')
  },

  /**
   * Complete wiring from a node (input or constant) to a gate pin.
   * Used when wiring from input/constant nodes to gate inputs.
   */
  completeWiringFromNodeToGate: (toGateId: string, toPinId: string, toPinType: 'input' | 'output') => {
    const state = get()
    const from = state.wiringFrom
    if (!from) {
      message.warning('No active wiring operation')
      return
    }

    const source = from.source
    if (!source) {
      message.warning('Invalid wiring source')
      set((s) => { s.wiringFrom = null }, false, 'completeWiringFromNodeToGate/noSource')
      return
    }

    if (source.type !== 'input' && source.type !== 'constant') {
      message.warning('Can only complete wiring from input or constant nodes')
      set((s) => { s.wiringFrom = null }, false, 'completeWiringFromNodeToGate/invalidSource')
      return
    }

    if (toPinType !== 'input') {
      message.warning('Can only connect nodes to gate input pins')
      set((s) => { s.wiringFrom = null }, false, 'completeWiringFromNodeToGate/invalidPinType')
      return
    }

    let fromEndpoint: WireEndpoint
    let signalId: string

    if (source.type === 'input') {
      fromEndpoint = { type: 'input', entityId: source.nodeId }
      signalId = `sig-${source.nodeId}`
    } else {
      fromEndpoint = { type: 'constant', entityId: source.nodeId }
      signalId = `sig-${source.nodeId}`
    }

    const toEndpoint: WireEndpoint = { type: 'gate', entityId: toGateId, pinId: toPinId }

    const exists = state.wires.some(
      (w) =>
        w.from.type === fromEndpoint.type &&
        w.from.entityId === fromEndpoint.entityId &&
        w.to.type === 'gate' &&
        w.to.entityId === toGateId &&
        w.to.pinId === toPinId
    )

    if (exists) {
      message.warning('Wire already exists')
      set((s) => {
        s.wiringFrom = null
      }, false, 'completeWiringFromNodeToGate/wireExists')
      return
    }

    const wireSegments: WireSegment[] | null = from.segments

    if (!wireSegments || wireSegments.length === 0) {
      message.error('Wire path not available. Please try connecting again.')
      set((s) => {
        s.wiringFrom = null
      }, false, 'completeWiringFromNodeToGate/noSegments')
      return
    }

    let resolvedSegments: WireSegment[]
    let crossedWireIds: string[] = []
    try {
      const result = resolveCrossings(wireSegments, state.wires)
      resolvedSegments = result.segments
      crossedWireIds = result.crossedWireIds
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to resolve wire crossings'
      message.error(`Cannot complete wire: ${errorMessage}`)
      set((s) => {
        s.wiringFrom = null
      }, false, 'completeWiringFromNodeToGate/crossingResolutionFailed')
      return
    }

    state.addWire(fromEndpoint, toEndpoint, resolvedSegments, crossedWireIds, signalId)

    set((s) => {
      s.wiringFrom = null
    }, false, 'completeWiringFromNodeToGate')
  },

  /**
   * Start wiring from a node (input or constant).
   * Used for HDL-style circuits where signals originate from input nodes.
   */
  startWiringFromNode: (nodeId: string, nodeType: NodeType, position: Position) => {
    if (nodeType !== 'input' && nodeType !== 'constant') {
      message.warning('Can only start wiring from input or constant nodes')
      return
    }

    set((state) => {
      state.wiringFrom = {
        fromGateId: '',
        fromPinId: '',
        fromPinType: 'output',
        fromPosition: position,
        previewEndPosition: null,
        destinationGateId: null,
        destinationPinId: null,
        destinationNodeId: null,
        destinationNodeType: null,
        segments: null,
        source: { type: nodeType, nodeId },
      }
      state.placementMode = null
      state.nodePlacementMode = null
    }, false, 'startWiringFromNode')
  },

  /**
   * Start wiring from a junction.
   * Branch wires start at the original wire's start point and share segments up to the junction.
   */
  startWiringFromJunction: (junctionId: string, _position: Position) => {
    const state = get()
    const junction = state.junctions.find((j) => j.id === junctionId)

    if (!junction) {
      message.warning('Junction not found')
      return
    }

    const originalWireId = junction.wireIds[0]
    if (!originalWireId) {
      message.warning('No wire passes through this junction')
      return
    }

    const originalWire = state.wires.find((w) => w.id === originalWireId)
    if (!originalWire) {
      message.warning('Original wire not found')
      return
    }

    const sharedSegments = getSegmentsUpToPosition(originalWire.segments, junction.position)

    let fromPosition: Position
    if (originalWire.from.type === 'gate' && originalWire.from.pinId) {
      const pinPos = get().getPinWorldPosition(originalWire.from.entityId, originalWire.from.pinId)
      if (!pinPos) {
        message.warning('Could not determine wire start position')
        return
      }
      fromPosition = pinPos
    } else if (originalWire.from.type === 'input' || originalWire.from.type === 'constant') {
      const node = originalWire.from.type === 'input'
        ? state.inputNodes.find((n) => n.id === originalWire.from.entityId)
        : state.constantNodes.find((n) => n.id === originalWire.from.entityId)
      if (!node) {
        message.warning('Could not find source node')
        return
      }
      const pinOffset = calculateNodePinPosition(originalWire.from.type)
      fromPosition = {
        x: node.position.x + pinOffset.x,
        y: node.position.y + pinOffset.y,
        z: node.position.z + pinOffset.z,
      }
    } else if (originalWire.from.type === 'junction') {
      let currentWire = originalWire
      let depth = 0
      const maxDepth = 100

      while (currentWire.from.type === 'junction' && depth < maxDepth) {
        const sourceJunction = state.junctions.find((j) => j.id === currentWire.from.entityId)
        if (!sourceJunction || sourceJunction.wireIds.length === 0) {
          message.warning('Could not trace back through junctions to find source')
          return
        }

        const sourceWireId = sourceJunction.wireIds[0]
        const sourceWire = state.wires.find((w) => w.id === sourceWireId)
        if (!sourceWire) {
          message.warning('Source wire not found when tracing through junctions')
          return
        }

        currentWire = sourceWire
        depth++
      }

      if (currentWire.from.type === 'gate' && currentWire.from.pinId) {
        const pinPos = get().getPinWorldPosition(currentWire.from.entityId, currentWire.from.pinId)
        if (!pinPos) {
          message.warning('Could not determine wire start position after tracing through junctions')
          return
        }
        fromPosition = pinPos
      } else if (currentWire.from.type === 'input' || currentWire.from.type === 'constant') {
        const node = currentWire.from.type === 'input'
          ? state.inputNodes.find((n) => n.id === currentWire.from.entityId)
          : state.constantNodes.find((n) => n.id === currentWire.from.entityId)
        if (!node) {
          message.warning('Could not find source node after tracing through junctions')
          return
        }
        const pinOffset = calculateNodePinPosition(currentWire.from.type)
        fromPosition = {
          x: node.position.x + pinOffset.x,
          y: node.position.y + pinOffset.y,
          z: node.position.z + pinOffset.z,
        }
      } else {
        message.warning('Unsupported wire source type after tracing through junctions')
        return
      }
    } else {
      message.warning('Unsupported wire source type for junction wiring')
      return
    }

    set((state) => {
      state.wiringFrom = {
        fromGateId: originalWire.from.type === 'gate' ? originalWire.from.entityId : '',
        fromPinId: originalWire.from.type === 'gate' ? originalWire.from.pinId || '' : '',
        fromPinType: 'output',
        fromPosition,
        previewEndPosition: null,
        destinationGateId: null,
        destinationPinId: null,
        destinationNodeId: null,
        destinationNodeType: null,
        segments: null,
        source: { type: 'junction', junctionId },
        destination: {
          type: 'junction',
          junctionId,
          originalWireId: originalWire.id,
          sharedSegments,
        },
      }
      state.placementMode = null
      state.nodePlacementMode = null
      state.junctionPlacementMode = null
    }, false, 'startWiringFromJunction')
  },

  /**
   * Complete wiring to a node (output node).
   * Used for HDL-style circuits where signals terminate at output nodes.
   */
  completeWiringToNode: (nodeId: string, nodeType: NodeType) => {
    const state = get()
    const from = state.wiringFrom
    if (!from) {
      message.warning('No active wiring operation')
      return
    }

    if (nodeType !== 'output') {
      message.warning('Can only complete wiring to output nodes')
      set((s) => { s.wiringFrom = null }, false, 'completeWiringToNode/invalidNodeType')
      return
    }

    const source = from.source
    if (!source) {
      message.warning('Invalid wiring source')
      set((s) => { s.wiringFrom = null }, false, 'completeWiringToNode/noSource')
      return
    }

    let fromEndpoint: WireEndpoint
    let signalId: string

    if (source.type === 'input') {
      fromEndpoint = { type: 'input', entityId: source.nodeId }
      signalId = `sig-${source.nodeId}`
    } else if (source.type === 'constant') {
      fromEndpoint = { type: 'constant', entityId: source.nodeId }
      signalId = `sig-${source.nodeId}`
    } else if (source.type === 'gate') {
      fromEndpoint = { type: 'gate', entityId: source.gateId, pinId: source.pinId }
      signalId = `sig-${source.gateId}-${source.pinId}`
    } else {
      message.warning('Invalid wiring source type')
      set((s) => { s.wiringFrom = null }, false, 'completeWiringToNode/invalidSourceType')
      return
    }

    const toEndpoint: WireEndpoint = { type: 'output', entityId: nodeId }

    const exists = state.wires.some(
      (w) =>
        w.from.type === fromEndpoint.type &&
        w.from.entityId === fromEndpoint.entityId &&
        (fromEndpoint.type === 'gate' ? w.from.pinId === fromEndpoint.pinId : true) &&
        w.to.type === 'output' &&
        w.to.entityId === nodeId
    )

    if (exists) {
      message.warning('Wire already exists')
      set((s) => {
        s.wiringFrom = null
      }, false, 'completeWiringToNode/wireExists')
      return
    }

    const segments = from.segments ?? []

    if (!segments || segments.length === 0) {
      message.error('Wire path not available. Please try connecting again.')
      set((s) => {
        s.wiringFrom = null
      }, false, 'completeWiringToNode/noSegments')
      return
    }

    let resolvedSegments: WireSegment[]
    let crossedWireIds: string[] = []
    try {
      const result = resolveCrossings(segments, state.wires)
      resolvedSegments = result.segments
      crossedWireIds = result.crossedWireIds
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to resolve wire crossings'
      message.error(`Cannot complete wire: ${errorMessage}`)
      set((s) => {
        s.wiringFrom = null
      }, false, 'completeWiringToNode/crossingResolutionFailed')
      return
    }

    get().addWire(fromEndpoint, toEndpoint, resolvedSegments, crossedWireIds, signalId)

    set((s) => {
      s.wiringFrom = null
    }, false, 'completeWiringToNode')
  },

  /**
   * Complete wiring from junction to a gate.
   * Creates a branch wire that starts at the original wire's start and shares segments up to the junction.
   */
  completeWiringFromJunction: (toGateId: string, toPinId: string, toPinType: 'input' | 'output') => {
    if (toPinType !== 'input') {
      message.warning('Can only connect to gate input pins')
      set((s) => { s.wiringFrom = null }, false, 'completeWiringFromJunction/invalidPinType')
      return
    }
    const toEndpoint: WireEndpoint = { type: 'gate', entityId: toGateId, pinId: toPinId }
    completeJunctionWiring(toEndpoint, 'completeWiringFromJunction', get, set)
  },

  /**
   * Complete wiring from junction to a node (output node).
   * Creates a branch wire that starts at the original wire's start and shares segments up to the junction.
   */
  completeWiringFromJunctionToNode: (nodeId: string, nodeType: NodeType) => {
    if (nodeType !== 'output') {
      message.warning('Can only complete wiring to output nodes')
      set((s) => { s.wiringFrom = null }, false, 'completeWiringFromJunctionToNode/invalidNodeType')
      return
    }
    const toEndpoint: WireEndpoint = { type: 'output', entityId: nodeId }
    completeJunctionWiring(toEndpoint, 'completeWiringFromJunctionToNode', get, set)
  },
})

/**
 * Shared logic for completing wiring from a junction to any destination.
 * Validates junction state, builds segments, resolves crossings, creates wire, and updates junction.
 */
function completeJunctionWiring(
  toEndpoint: WireEndpoint,
  actionPrefix: string,
  get: GetState,
  set: SetState,
): void {
  const state = get()
  const from = state.wiringFrom
  if (!from) {
    message.warning('No active wiring operation')
    return
  }

  if (!from.source || from.source.type !== 'junction') {
    message.warning('Wiring source is not a junction')
    set((s) => { s.wiringFrom = null }, false, `${actionPrefix}/invalidSource`)
    return
  }

  const dest = from.destination
  if (!dest || dest.type !== 'junction') {
    message.warning('Junction wiring info not found')
    set((s) => { s.wiringFrom = null }, false, `${actionPrefix}/noJunctionInfo`)
    return
  }

  const originalWire = state.wires.find((w) => w.id === dest.originalWireId)
  if (!originalWire) {
    message.warning('Original wire not found')
    set((s) => { s.wiringFrom = null }, false, `${actionPrefix}/originalWireNotFound`)
    return
  }

  const fromEndpoint: WireEndpoint = { ...originalWire.from }

  const exists = state.wires.some(
    (w) =>
      w.from.type === fromEndpoint.type &&
      w.from.entityId === fromEndpoint.entityId &&
      (fromEndpoint.type === 'gate' ? w.from.pinId === fromEndpoint.pinId : true) &&
      w.to.type === toEndpoint.type &&
      w.to.entityId === toEndpoint.entityId &&
      (toEndpoint.type === 'gate' ? w.to.pinId === toEndpoint.pinId : true)
  )

  if (exists) {
    message.warning('Wire already exists')
    set((s) => { s.wiringFrom = null }, false, `${actionPrefix}/wireExists`)
    return
  }

  const sharedSegments = dest.sharedSegments
  const newSegments = from.segments ?? []

  if (sharedSegments.length === 0) {
    message.error('Cannot create branch wire: junction has no shared segments. Please place junction on a middle segment of the wire.')
    set((s) => { s.wiringFrom = null }, false, `${actionPrefix}/noSharedSegments`)
    return
  }

  if (newSegments.length === 0) {
    message.error('Cannot create branch wire: no path segments calculated. Please try connecting again.')
    set((s) => { s.wiringFrom = null }, false, `${actionPrefix}/noSegments`)
    return
  }

  // Validate segment connection at junction position
  const lastSharedSegment = sharedSegments[sharedSegments.length - 1]
  const firstNewSegment = newSegments[0]
  if (lastSharedSegment && firstNewSegment) {
    const sharedEnd = lastSharedSegment.end
    const newStart = firstNewSegment.start
    const distance = Math.sqrt(
      (sharedEnd.x - newStart.x) ** 2 +
      (sharedEnd.y - newStart.y) ** 2 +
      (sharedEnd.z - newStart.z) ** 2
    )
    if (distance > 0.1) {
      message.error('Shared segments do not connect to new segments at junction. Please try connecting again.')
      set((s) => { s.wiringFrom = null }, false, `${actionPrefix}/segmentMismatch`)
      return
    }

    const junction = state.junctions.find((j) => j.id === from.source!.junctionId)
    if (junction) {
      const junctionPos = junction.position
      const junctionToSharedEnd = Math.sqrt(
        (junctionPos.x - sharedEnd.x) ** 2 +
        (junctionPos.y - sharedEnd.y) ** 2 +
        (junctionPos.z - sharedEnd.z) ** 2
      )
      const junctionToNewStart = Math.sqrt(
        (junctionPos.x - newStart.x) ** 2 +
        (junctionPos.y - newStart.y) ** 2 +
        (junctionPos.z - newStart.z) ** 2
      )
      if (junctionToSharedEnd > 0.1 || junctionToNewStart > 0.1) {
        message.error('Junction position does not match segment connection point. Please try connecting again.')
        set((s) => { s.wiringFrom = null }, false, `${actionPrefix}/junctionPositionMismatch`)
        return
      }
    }
  }

  const allSegments = [...sharedSegments, ...newSegments]

  let resolvedSegments: WireSegment[]
  let crossedWireIds: string[] = []
  try {
    const result = resolveCrossings(allSegments, state.wires)
    resolvedSegments = result.segments
    crossedWireIds = result.crossedWireIds
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Failed to resolve wire crossings'
    message.error(`Cannot complete wire: ${errorMessage}`)
    set((s) => { s.wiringFrom = null }, false, `${actionPrefix}/crossingResolutionFailed`)
    return
  }

  const signalId = originalWire.signalId || `sig-${originalWire.from.entityId}`
  const newWire = get().addWire(fromEndpoint, toEndpoint, resolvedSegments, crossedWireIds, signalId)

  const junction = state.junctions.find((j) => j.id === from.source!.junctionId)
  if (junction) {
    set((s) => {
      const updatedJunction = s.junctions.find((j) => j.id === junction.id)
      if (updatedJunction && !updatedJunction.wireIds.includes(newWire.id)) {
        updatedJunction.wireIds.push(newWire.id)
      }
    }, false, `${actionPrefix}/updateJunction`)
  }

  set((s) => { s.wiringFrom = null }, false, `${actionPrefix}/complete`)
}
