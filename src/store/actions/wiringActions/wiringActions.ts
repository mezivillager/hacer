import { message } from 'antd'
import { circuitStore } from '../../circuitStore'
import { wireActions } from '../wireActions/wireActions'

export const wiringActions = {
  startWiring: (
    gateId: string,
    pinId: string,
    pinType: 'input' | 'output',
    position: { x: number; y: number; z: number }
  ) => {
    circuitStore.wiringFrom = {
      fromGateId: gateId,
      fromPinId: pinId,
      fromPinType: pinType,
      fromPosition: position,
      previewEndPosition: null,
    }
    circuitStore.placementMode = null
  },

  updateWirePreviewPosition: (position: { x: number; y: number; z: number } | null) => {
    if (circuitStore.wiringFrom) {
      circuitStore.wiringFrom.previewEndPosition = position
    }
  },

  cancelWiring: () => {
    circuitStore.wiringFrom = null
  },

  completeWiring: (toGateId: string, toPinId: string, toPinType: 'input' | 'output') => {
    const from = circuitStore.wiringFrom
    if (!from) return

    // Validate: must connect output to input (or vice versa)
    if (from.fromPinType === toPinType) {
      message.warning('Cannot connect same pin types')
      circuitStore.wiringFrom = null
      return
    }

    // Validate: cannot connect to same gate
    if (from.fromGateId === toGateId) {
      message.warning('Cannot connect gate to itself')
      circuitStore.wiringFrom = null
      return
    }

    // Check if wire already exists
    const exists = circuitStore.wires.some(
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
      circuitStore.wiringFrom = null
      return
    }

    // Normalize: always store as output -> input
    if (from.fromPinType === 'output') {
      wireActions.addWire(from.fromGateId, from.fromPinId, toGateId, toPinId)
    } else {
      wireActions.addWire(toGateId, toPinId, from.fromGateId, from.fromPinId)
    }

    circuitStore.wiringFrom = null
  },
}
