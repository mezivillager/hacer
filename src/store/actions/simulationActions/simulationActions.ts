import { gateLogic } from '@/simulation/gateLogic'
import type { SimulationActions, CircuitStore } from '../../types'

type SetState = (
  fn: (state: CircuitStore) => void,
  replace?: false,
  actionName?: string
) => void

export const createSimulationActions = (set: SetState): SimulationActions => ({
  toggleSimulation: () => {
    set((state) => {
      state.simulationRunning = !state.simulationRunning
    }, false, 'toggleSimulation')
  },

  setSimulationSpeed: (speed: number) => {
    set((state) => {
      state.simulationSpeed = speed
    }, false, 'setSimulationSpeed')
  },

  clearCircuit: () => {
    set((state) => {
      state.gates = []
      state.wires = []
      state.selectedGateId = null
      state.placementMode = null
    }, false, 'clearCircuit')
  },

  // Simulation tick - propagate signals through circuit
  simulationTick: () => {
    set((state) => {
      // Step 1: Propagate output values through wires to connected inputs
      for (const wire of state.wires) {
        const fromGate = state.gates.find((g) => g.id === wire.fromGateId)
        const toGate = state.gates.find((g) => g.id === wire.toGateId)

        if (fromGate && toGate) {
          const outputPin = fromGate.outputs.find((p) => p.id === wire.fromPinId)
          const inputPin = toGate.inputs.find((p) => p.id === wire.toPinId)

          if (outputPin && inputPin) {
            inputPin.value = outputPin.value
          }
        }
      }

      // Step 2: Calculate new output values for all gates
      for (const gate of state.gates) {
        const inputValues = gate.inputs.map((p) => p.value)
        const logic = gateLogic[gate.type]
        if (logic) {
          const outputValue = logic(inputValues)
          for (const output of gate.outputs) {
            output.value = outputValue
          }
        }
      }
    }, false, 'simulationTick')
  },
})
