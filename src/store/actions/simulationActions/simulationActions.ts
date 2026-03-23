import { gateLogic } from '@/simulation/gateLogic'
import type { SimulationActions, CircuitStore, CircuitState, WireEndpoint } from '../../types'

type SetState = (
  fn: (state: CircuitStore) => void,
  replace?: false,
  actionName?: string
) => void

/**
 * Gets the numeric signal value at a wire's source endpoint.
 *
 * Includes cycle detection to prevent infinite recursion when
 * junctions are incorrectly wired in a loop.
 *
 * @param from - The source endpoint of the wire
 * @param state - The current circuit state
 * @param visited - Set of visited junction IDs for cycle detection (internal use)
 * @returns The signal value at the source (0 when absent or cyclic)
 *
 * @example
 * ```ts
 * const value = getSignalSourceValue(
 *   { type: 'input', entityId: 'input-a' },
 *   circuitState
 * )
 * ```
 */
export function getSignalSourceValue(
  from: WireEndpoint,
  state: CircuitState,
  visited: Set<string> = new Set()
): number {
  switch (from.type) {
    case 'input': {
      const inputNode = state.inputNodes.find((n) => n.id === from.entityId)
      return inputNode?.value ?? 0
    }
    case 'gate': {
      const gate = state.gates.find((g) => g.id === from.entityId)
      const outputPin = gate?.outputs.find((p) => p.id === from.pinId)
      return outputPin?.value ?? 0
    }
    case 'junction': {
      if (visited.has(from.entityId)) {
        return 0
      }
      visited.add(from.entityId)

      // Resolve junction value by tracing through the original wire (wireIds[0])
      const junction = state.junctions.find((j) => j.id === from.entityId)
      if (junction && junction.wireIds.length > 0) {
        const originalWire = state.wires.find((w) => w.id === junction.wireIds[0])
        if (originalWire) {
          return getSignalSourceValue(originalWire.from, state, visited)
        }
      }
      return 0
    }
    case 'output':
    default:
      // Output nodes are destinations, not sources
      return 0
  }
}

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
      state.selectedWireId = null
      state.placementMode = null
      state.inputNodes = []
      state.outputNodes = []
      state.junctions = []
      state.selectedNodeId = null
      state.selectedNodeType = null
      state.nodePlacementMode = null
      state.junctionPlacementMode = null
      state.junctionPreviewPosition = null
      state.wiringFrom = null
    }, false, 'clearCircuit')
  },

  // Simulation tick - propagate signals through circuit
  simulationTick: () => {
    set((state) => {
      // Step 1: Propagate wires to gate inputs
      // This handles all wire types: input nodes, junctions, and gate outputs
      for (const wire of state.wires) {
        if (wire.to.type === 'gate' && wire.to.pinId) {
          const gate = state.gates.find((g) => g.id === wire.to.entityId)
          const inputPin = gate?.inputs.find((p) => p.id === wire.to.pinId)
          if (inputPin) {
            inputPin.value = getSignalSourceValue(wire.from, state)
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

      // Step 3: Propagate wires to output nodes
      for (const wire of state.wires) {
        if (wire.to.type === 'output') {
          const outputNode = state.outputNodes.find((n) => n.id === wire.to.entityId)
          if (outputNode) {
            outputNode.value = getSignalSourceValue(wire.from, state)
          }
        }
      }
    }, false, 'simulationTick')
  },
})
