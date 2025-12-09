import { circuitStore } from '../../circuitStore'
import { gateLogic } from '@/simulation/gateLogic'

export const simulationActions = {
  toggleSimulation: () => {
    circuitStore.simulationRunning = !circuitStore.simulationRunning
  },

  setSimulationSpeed: (speed: number) => {
    circuitStore.simulationSpeed = speed
  },

  clearCircuit: () => {
    circuitStore.gates = []
    circuitStore.wires = []
    circuitStore.selectedGateId = null
    circuitStore.placementMode = null
  },

  // Simulation tick - propagate signals through circuit
  simulationTick: () => {
    // Step 1: Propagate output values through wires to connected inputs
    for (const wire of circuitStore.wires) {
      const fromGate = circuitStore.gates.find((g) => g.id === wire.fromGateId)
      const toGate = circuitStore.gates.find((g) => g.id === wire.toGateId)

      if (fromGate && toGate) {
        const outputPin = fromGate.outputs.find((p) => p.id === wire.fromPinId)
        const inputPin = toGate.inputs.find((p) => p.id === wire.toPinId)

        if (outputPin && inputPin) {
          inputPin.value = outputPin.value
        }
      }
    }

    // Step 2: Calculate new output values for all gates
    for (const gate of circuitStore.gates) {
      const inputValues = gate.inputs.map((p) => p.value)
      const logic = gateLogic[gate.type]
      if (logic) {
        const outputValue = logic(inputValues)
        for (const output of gate.outputs) {
          output.value = outputValue
        }
      }
    }
  },
}
