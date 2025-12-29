import { message } from 'antd'
import type { WiringActions, Position, CircuitStore } from '../../types'
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
        segments: null,
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
        // Clear segments when destination changes - WirePreview will recalculate and store them
        state.wiringFrom.segments = null
      }
    }, false, 'setDestinationPin')
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

    // Check if wire already exists
    const exists = state.wires.some(
      (w) =>
        (w.fromGateId === from.fromGateId &&
          w.fromPinId === from.fromPinId &&
          w.toGateId === toGateId &&
          w.toPinId === toPinId) ||
        (w.fromGateId === toGateId &&
          w.fromPinId === toPinId &&
          w.toGateId === from.fromGateId &&
          w.toPinId === from.fromPinId)
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
    try {
      resolvedSegments = resolveCrossings(wireSegments, state.wires)
    } catch (error) {
      // Crossing resolution failed - show error and cancel wiring
      const errorMessage = error instanceof Error ? error.message : 'Failed to resolve wire crossings'
      message.error(`Cannot complete wire: ${errorMessage}`)
      set((s) => {
        s.wiringFrom = null
      }, false, 'completeWiring/crossingResolutionFailed')
      return
    }

    // Normalize: always store as output -> input
    if (from.fromPinType === 'output') {
      console.debug('[wiringActions] Adding wire', {
        from: { gateId: from.fromGateId, pinId: from.fromPinId },
        to: { gateId: toGateId, pinId: toPinId },
      })
      state.addWire(from.fromGateId, from.fromPinId, toGateId, toPinId, resolvedSegments)
    } else {
      console.debug('[wiringActions] Adding wire (reversed)', {
        from: { gateId: toGateId, pinId: toPinId },
        to: { gateId: from.fromGateId, pinId: from.fromPinId },
      })
      // For reversed wires, segments are already normalized as output -> input from WirePreview calculation
      state.addWire(toGateId, toPinId, from.fromGateId, from.fromPinId, resolvedSegments)
    }

    set((s) => {
      s.wiringFrom = null
    }, false, 'completeWiring')
  },
})
