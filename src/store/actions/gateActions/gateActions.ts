import type { GateActions, GateInstance, GateType, Pin, Position, CircuitStore } from '../../types'

// Helper to create a gate instance
function createGate(type: GateType, position: Position): GateInstance {
  const id = `gate-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`

  const inputCount = type === 'NOT' ? 1 : 2
  const inputs: Pin[] = Array.from({ length: inputCount }, (_, i) => ({
    id: `${id}-in-${i}`,
    name: `IN${i}`,
    type: 'input',
    value: false,
  }))

  const outputs: Pin[] = [
    {
      id: `${id}-out-0`,
      name: 'OUT',
      type: 'output',
      value: false,
    },
  ]

  return {
    id,
    type,
    position,
    rotation: { x: 0, y: 0, z: 0 },
    inputs,
    outputs,
    selected: false,
  }
}

type SetState = (
  fn: (state: CircuitStore) => void,
  replace?: false,
  actionName?: string
) => void

export const createGateActions = (set: SetState): GateActions => ({
  addGate: (type: GateType, position: Position) => {
    const gate = createGate(type, position)
    set((state) => {
      state.gates.push(gate)
    }, false, 'addGate')
    return gate
  },

  removeGate: (gateId: string) => {
    set((state) => {
      const index = state.gates.findIndex((g) => g.id === gateId)
      if (index !== -1) {
        state.gates.splice(index, 1)
        // Remove associated wires
        state.wires = state.wires.filter(
          (w) => w.fromGateId !== gateId && w.toGateId !== gateId
        )
      }
    }, false, 'removeGate')
  },

  selectGate: (gateId: string | null) => {
    set((state) => {
      state.gates.forEach((g) => {
        g.selected = g.id === gateId
      })
      state.selectedGateId = gateId
    }, false, 'selectGate')
  },

  updateGatePosition: (gateId: string, position: Position) => {
    set((state) => {
      const gate = state.gates.find((g) => g.id === gateId)
      if (gate) {
        gate.position = position
      }
    }, false, 'updateGatePosition')
  },

  updateGateRotation: (gateId: string, rotation: Position) => {
    set((state) => {
      const gate = state.gates.find((g) => g.id === gateId)
      if (gate) {
        gate.rotation = rotation
      }
    }, false, 'updateGateRotation')
  },

  rotateGate: (gateId: string, axis: 'x' | 'y' | 'z', angle: number) => {
    set((state) => {
      const gate = state.gates.find((g) => g.id === gateId)
      if (gate) {
        const current = gate.rotation
        gate.rotation = {
          ...current,
          [axis]: (current[axis] + angle) % (Math.PI * 2),
        }
      }
    }, false, 'rotateGate')
  },
})
