import { circuitStore } from '../../circuitStore'
import type { GateInstance, GateType, Pin } from '../../types'

export const gateActions = {
  addGate: (type: GateType, position: { x: number; y: number; z: number }) => {
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

    const gate: GateInstance = {
      id,
      type,
      position,
      rotation: { x: 0, y: 0, z: 0 },
      inputs,
      outputs,
      selected: false,
    }

    circuitStore.gates.push(gate)
    return gate
  },

  removeGate: (gateId: string) => {
    const index = circuitStore.gates.findIndex((g) => g.id === gateId)
    if (index !== -1) {
      circuitStore.gates.splice(index, 1)
      // Remove associated wires
      circuitStore.wires = circuitStore.wires.filter(
        (w) => w.fromGateId !== gateId && w.toGateId !== gateId
      )
    }
  },

  selectGate: (gateId: string | null) => {
    circuitStore.gates.forEach((g) => {
      g.selected = g.id === gateId
    })
    circuitStore.selectedGateId = gateId
  },

  updateGatePosition: (gateId: string, position: { x: number; y: number; z: number }) => {
    const gate = circuitStore.gates.find((g) => g.id === gateId)
    if (gate) {
      gate.position = position
    }
  },

  updateGateRotation: (gateId: string, rotation: { x: number; y: number; z: number }) => {
    const gate = circuitStore.gates.find((g) => g.id === gateId)
    if (gate) {
      gate.rotation = rotation
    }
  },

  rotateGate: (gateId: string, axis: 'x' | 'y' | 'z', angle: number) => {
    const gate = circuitStore.gates.find((g) => g.id === gateId)
    if (gate) {
      const current = gate.rotation
      gate.rotation = {
        ...current,
        [axis]: (current[axis] + angle) % (Math.PI * 2),
      }
    }
  },
}
