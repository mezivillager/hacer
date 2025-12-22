import { message } from 'antd'
import type { WiringActions, Position, CircuitStore } from '../../types'

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

    // Normalize: always store as output -> input
    if (from.fromPinType === 'output') {
      console.debug('[wiringActions] Adding wire', {
        from: { gateId: from.fromGateId, pinId: from.fromPinId },
        to: { gateId: toGateId, pinId: toPinId },
      })
      state.addWire(from.fromGateId, from.fromPinId, toGateId, toPinId)
    } else {
      console.debug('[wiringActions] Adding wire (reversed)', {
        from: { gateId: toGateId, pinId: toPinId },
        to: { gateId: from.fromGateId, pinId: from.fromPinId },
      })
      state.addWire(toGateId, toPinId, from.fromGateId, from.fromPinId)
    }

    set((s) => {
      s.wiringFrom = null
    }, false, 'completeWiring')
  },
})
