import { circuitStore } from '../../circuitStore'
import type { Wire } from '../../types'

export const wireActions = {
  addWire: (fromGateId: string, fromPinId: string, toGateId: string, toPinId: string) => {
    const wire: Wire = {
      id: `wire-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`,
      fromGateId,
      fromPinId,
      toGateId,
      toPinId,
    }
    circuitStore.wires.push(wire)
    return wire
  },

  removeWire: (wireId: string) => {
    const index = circuitStore.wires.findIndex((w) => w.id === wireId)
    if (index !== -1) {
      circuitStore.wires.splice(index, 1)
    }
  },

  setInputValue: (gateId: string, pinId: string, value: boolean) => {
    const gate = circuitStore.gates.find((g) => g.id === gateId)
    if (gate) {
      const pin = gate.inputs.find((p) => p.id === pinId)
      if (pin) {
        pin.value = value
      }
    }
  },
}
