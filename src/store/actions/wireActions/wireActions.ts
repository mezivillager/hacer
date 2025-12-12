import type { WireActions, Wire, CircuitStore } from '../../types'

type SetState = (
  fn: (state: CircuitStore) => void,
  replace?: false,
  actionName?: string
) => void

export const createWireActions = (set: SetState): WireActions => ({
  addWire: (fromGateId: string, fromPinId: string, toGateId: string, toPinId: string) => {
    const wire: Wire = {
      id: `wire-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`,
      fromGateId,
      fromPinId,
      toGateId,
      toPinId,
    }
    set((state) => {
      state.wires.push(wire)
    }, false, 'addWire')
    return wire
  },

  removeWire: (wireId: string) => {
    set((state) => {
      const index = state.wires.findIndex((w) => w.id === wireId)
      if (index !== -1) {
        state.wires.splice(index, 1)
      }
    }, false, 'removeWire')
  },

  setInputValue: (gateId: string, pinId: string, value: boolean) => {
    set((state) => {
      const gate = state.gates.find((g) => g.id === gateId)
      if (gate) {
        const pin = gate.inputs.find((p) => p.id === pinId)
        if (pin) {
          pin.value = value
        }
      }
    }, false, 'setInputValue')
  },
})
