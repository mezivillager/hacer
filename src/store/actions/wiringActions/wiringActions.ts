import { message } from 'antd'
import type { WiringActions, Position, CircuitStore, NodeType, WireEndpoint } from '../../types'
import type { WireSegment } from '@/utils/wiringScheme/types'
import { resolveCrossings } from '@/utils/wiringScheme/crossing'

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
    console.debug('[wiringActions] startWiring', {
      gateId,
      pinId,
      pinType,
      position,
    })
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
        // Extended source info for unified wiring
        source: { type: 'gate', gateId, pinId, pinType },
      }
      state.placementMode = null
    }, false, 'startWiring')
  },

  updateWirePreviewPosition: (position: Position | null) => {
    console.debug('[wiringActions] updateWirePreviewPosition', {
      position,
      hasWiringFrom: !!get().wiringFrom,
    })
    set((state) => {
      if (state.wiringFrom) {
        state.wiringFrom.previewEndPosition = position
        // Note: destination pin is cleared by BaseGate's handlePinOut, not here
        // We don't clear it here because position can be null temporarily during transitions
      }
    }, false, 'updateWirePreviewPosition')
  },

  setDestinationPin: (gateId: string | null, pinId: string | null) => {
    set((state) => {
      if (state.wiringFrom) {
        state.wiringFrom.destinationGateId = gateId
        state.wiringFrom.destinationPinId = pinId
        // Clear node destination when setting gate destination
        state.wiringFrom.destinationNodeId = null
        state.wiringFrom.destinationNodeType = null
        // Clear segments when destination changes - WirePreview will recalculate and store them
        state.wiringFrom.segments = null
      }
    }, false, 'setDestinationPin')
  },

  setDestinationNode: (nodeId: string | null, nodeType: NodeType | null) => {
    set((state) => {
      if (state.wiringFrom) {
        state.wiringFrom.destinationNodeId = nodeId
        state.wiringFrom.destinationNodeType = nodeType
        // Clear gate destination when setting node destination
        state.wiringFrom.destinationGateId = null
        state.wiringFrom.destinationPinId = null
        // Clear segments when destination changes - WirePreview will recalculate and store them
        state.wiringFrom.segments = null
      }
    }, false, 'setDestinationNode')
  },

  cancelWiring: () => {
    console.debug('[wiringActions] cancelWiring')
    set((state) => {
      state.wiringFrom = null
    }, false, 'cancelWiring')
  },

  completeWiring: (toGateId: string, toPinId: string, toPinType: 'input' | 'output') => {
    console.debug('[wiringActions] completeWiring', {
      toGateId,
      toPinId,
      toPinType,
    })
    const state = get()
    const from = state.wiringFrom
    if (!from) {
      message.warning('No active wiring operation')
      console.warn('[wiringActions] completeWiring - no wiringFrom state')
      return
    }

    // Validate: must connect output to input (or vice versa)
    if (from.fromPinType === toPinType) {
      message.warning('Cannot connect same pin types')
      set((s) => {
        s.wiringFrom = null
      }, false, 'completeWiring/invalidPinType')
      return
    }

    // Validate: cannot connect to same gate
    if (from.fromGateId === toGateId) {
      message.warning('Cannot connect gate to itself')
      set((s) => {
        s.wiringFrom = null
      }, false, 'completeWiring/sameGate')
      return
    }

    // Check if wire already exists (using unified Wire format)
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

    // Use stored segments from WirePreview (calculated during preview when destination pin was set)
    const wireSegments: WireSegment[] | null = from.segments

    if (!wireSegments) {
      // This shouldn't happen in normal flow - segments should be calculated and stored by WirePreview
      message.error('Wire path not available. Please try connecting again.')
      set((s) => {
        s.wiringFrom = null
      }, false, 'completeWiring/noSegments')
      return
    }

    // Resolve crossings: newer wire hops over older wires
    let resolvedSegments: WireSegment[]
    let crossedWireIds: string[] = []
    try {
      const result = resolveCrossings(wireSegments, state.wires)
      resolvedSegments = result.segments
      crossedWireIds = result.crossedWireIds
    } catch (error) {
      // Crossing resolution failed - show error and cancel wiring
      const errorMessage = error instanceof Error ? error.message : 'Failed to resolve wire crossings'
      message.error(`Cannot complete wire: ${errorMessage}`)
      set((s) => {
        s.wiringFrom = null
      }, false, 'completeWiring/crossingResolutionFailed')
      return
    }

    // Create unified wire with WireEndpoint format
    // Normalize: always store as output -> input
    let fromEndpoint: WireEndpoint
    let toEndpoint: WireEndpoint

    if (from.fromPinType === 'output') {
      fromEndpoint = { type: 'gate', entityId: from.fromGateId, pinId: from.fromPinId }
      toEndpoint = { type: 'gate', entityId: toGateId, pinId: toPinId }
      console.debug('[wiringActions] Adding wire', {
        from: fromEndpoint,
        to: toEndpoint,
      })
    } else {
      // Reversed: input started wiring to output
      fromEndpoint = { type: 'gate', entityId: toGateId, pinId: toPinId }
      toEndpoint = { type: 'gate', entityId: from.fromGateId, pinId: from.fromPinId }
      console.debug('[wiringActions] Adding wire (reversed)', {
        from: fromEndpoint,
        to: toEndpoint,
      })
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
    console.debug('[wiringActions] completeWiringFromNodeToGate', {
      toGateId,
      toPinId,
      toPinType,
    })
    const state = get()
    const from = state.wiringFrom
    if (!from) {
      message.warning('No active wiring operation')
      console.warn('[wiringActions] completeWiringFromNodeToGate - no wiringFrom state')
      return
    }

    // Extract source information
    const source = from.source
    if (!source) {
      message.warning('Invalid wiring source')
      set((s) => { s.wiringFrom = null }, false, 'completeWiringFromNodeToGate/noSource')
      return
    }

    // Only input and constant nodes can be sources
    if (source.type !== 'input' && source.type !== 'constant') {
      message.warning('Can only complete wiring from input or constant nodes')
      set((s) => { s.wiringFrom = null }, false, 'completeWiringFromNodeToGate/invalidSource')
      return
    }

    // Can only connect to gate input pins (not outputs)
    if (toPinType !== 'input') {
      message.warning('Can only connect nodes to gate input pins')
      set((s) => { s.wiringFrom = null }, false, 'completeWiringFromNodeToGate/invalidPinType')
      return
    }

    // Build WireEndpoint from source node
    let fromEndpoint: WireEndpoint
    let signalId: string

    if (source.type === 'input') {
      fromEndpoint = { type: 'input', entityId: source.nodeId }
      signalId = `sig-${source.nodeId}`
    } else {
      // source.type === 'constant'
      fromEndpoint = { type: 'constant', entityId: source.nodeId }
      signalId = `sig-${source.nodeId}`
    }

    const toEndpoint: WireEndpoint = { type: 'gate', entityId: toGateId, pinId: toPinId }

    // Check if wire already exists
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

    // Use stored segments from WirePreview (calculated during preview when destination pin was set)
    const wireSegments: WireSegment[] | null = from.segments

    if (!wireSegments || wireSegments.length === 0) {
      // This shouldn't happen in normal flow - segments should be calculated and stored by WirePreview
      message.error('Wire path not available. Please try connecting again.')
      set((s) => {
        s.wiringFrom = null
      }, false, 'completeWiringFromNodeToGate/noSegments')
      return
    }

    // Resolve crossings: newer wire hops over older wires
    let resolvedSegments: WireSegment[]
    let crossedWireIds: string[] = []
    try {
      const result = resolveCrossings(wireSegments, state.wires)
      resolvedSegments = result.segments
      crossedWireIds = result.crossedWireIds
    } catch (error) {
      // Crossing resolution failed - show error and cancel wiring
      const errorMessage = error instanceof Error ? error.message : 'Failed to resolve wire crossings'
      message.error(`Cannot complete wire: ${errorMessage}`)
      set((s) => {
        s.wiringFrom = null
      }, false, 'completeWiringFromNodeToGate/crossingResolutionFailed')
      return
    }

    // Create unified wire with signal ID
    console.debug('[wiringActions] Adding wire from node to gate', {
      from: fromEndpoint,
      to: toEndpoint,
    })
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
    console.debug('[wiringActions] startWiringFromNode', { nodeId, nodeType, position })

    // Only input and constant nodes can be wire sources
    if (nodeType !== 'input' && nodeType !== 'constant') {
      message.warning('Can only start wiring from input or constant nodes')
      return
    }

    set((state) => {
      state.wiringFrom = {
        // Legacy fields - empty since this is node-based wiring
        fromGateId: '',
        fromPinId: '',
        fromPinType: 'output', // Nodes are always sources (like outputs)
        fromPosition: position,
        previewEndPosition: null,
        destinationGateId: null,
        destinationPinId: null,
        destinationNodeId: null,
        destinationNodeType: null,
        segments: null,
        // Extended source info
        source: { type: nodeType, nodeId },
      }
      state.placementMode = null
      state.nodePlacementMode = null
    }, false, 'startWiringFromNode')
  },

  /**
   * Complete wiring to a node (output node).
   * Used for HDL-style circuits where signals terminate at output nodes.
   */
  completeWiringToNode: (nodeId: string, nodeType: NodeType) => {
    console.debug('[wiringActions] completeWiringToNode', { nodeId, nodeType })
    const state = get()
    const from = state.wiringFrom
    if (!from) {
      message.warning('No active wiring operation')
      return
    }

    // Only output nodes can be wire destinations (for now)
    if (nodeType !== 'output') {
      message.warning('Can only complete wiring to output nodes')
      set((s) => { s.wiringFrom = null }, false, 'completeWiringToNode/invalidNodeType')
      return
    }

    // Extract source information
    const source = from.source
    if (!source) {
      message.warning('Invalid wiring source')
      set((s) => { s.wiringFrom = null }, false, 'completeWiringToNode/noSource')
      return
    }

    // Build WireEndpoint from source
    let fromEndpoint: WireEndpoint
    let signalId: string

    if (source.type === 'input') {
      fromEndpoint = { type: 'input', entityId: source.nodeId }
      signalId = `sig-${source.nodeId}`
    } else if (source.type === 'constant') {
      fromEndpoint = { type: 'constant', entityId: source.nodeId }
      signalId = `sig-${source.nodeId}`
    } else if (source.type === 'gate') {
      // Gate source - wiring from gate output to output node
      fromEndpoint = { type: 'gate', entityId: source.gateId, pinId: source.pinId }
      signalId = `sig-${source.gateId}-${source.pinId}`
    } else {
      message.warning('Invalid wiring source type')
      set((s) => { s.wiringFrom = null }, false, 'completeWiringToNode/invalidSourceType')
      return
    }

    const toEndpoint: WireEndpoint = { type: 'output', entityId: nodeId }

    // Check if wire already exists
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

    // Use segments from wire preview
    const segments = from.segments ?? []

    if (!segments || segments.length === 0) {
      // This shouldn't happen in normal flow - segments should be calculated and stored by WirePreview
      message.error('Wire path not available. Please try connecting again.')
      set((s) => {
        s.wiringFrom = null
      }, false, 'completeWiringToNode/noSegments')
      return
    }

    // Resolve crossings: newer wire hops over older wires
    let resolvedSegments: WireSegment[]
    let crossedWireIds: string[] = []
    try {
      const result = resolveCrossings(segments, state.wires)
      resolvedSegments = result.segments
      crossedWireIds = result.crossedWireIds
    } catch (error) {
      // Crossing resolution failed - show error and cancel wiring
      const errorMessage = error instanceof Error ? error.message : 'Failed to resolve wire crossings'
      message.error(`Cannot complete wire: ${errorMessage}`)
      set((s) => {
        s.wiringFrom = null
      }, false, 'completeWiringToNode/crossingResolutionFailed')
      return
    }

    // Create unified wire with signal ID and resolved segments
    get().addWire(fromEndpoint, toEndpoint, resolvedSegments, crossedWireIds, signalId)

    // Clear wiring state
    set((s) => {
      s.wiringFrom = null
    }, false, 'completeWiringToNode')
  },
})
