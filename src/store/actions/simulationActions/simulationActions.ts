import { gateLogic } from '@/simulation/gateLogic'
import type { SimulationActions, CircuitStore, CircuitState, WireEndpoint } from '../../types'

type SetState = (
  fn: (state: CircuitStore) => void,
  replace?: false,
  actionName?: string
) => void

/**
 * Gets the boolean value at a wire's source endpoint.
 *
 * Includes cycle detection to prevent infinite recursion when
 * junctions are incorrectly wired in a loop.
 *
 * @param from - The source endpoint of the wire
 * @param state - The current circuit state
 * @param visited - Set of visited junction IDs for cycle detection (internal use)
 * @returns The boolean value at the source
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
): boolean {
  switch (from.type) {
    case 'input': {
      const inputNode = state.inputNodes.find((n) => n.id === from.entityId)
      return inputNode?.value ?? false
    }
    case 'constant': {
      const constNode = state.constantNodes.find((n) => n.id === from.entityId)
      return constNode?.value ?? false
    }
    case 'gate': {
      const gate = state.gates.find((g) => g.id === from.entityId)
      const outputPin = gate?.outputs.find((p) => p.id === from.pinId)
      return outputPin?.value ?? false
    }
    case 'junction': {
      // Cycle detection: if we've already visited this junction, we have a loop
      if (visited.has(from.entityId)) {
        console.warn('[getSignalSourceValue] Cycle detected in junction wiring:', from.entityId)
        return false
      }
      visited.add(from.entityId)

      // Junction gets its value from the wire feeding into it
      const feedingWire = state.wires.find(
        (w) => w.to.type === 'junction' && w.to.entityId === from.entityId
      )
      if (feedingWire) {
        return getSignalSourceValue(feedingWire.from, state, visited)
      }
      return false
    }
    case 'output':
    default:
      // Output nodes are destinations, not sources
      return false
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
      // Clear HDL nodes
      state.inputNodes = []
      state.outputNodes = []
      state.constantNodes = []
      state.junctions = []
      state.selectedNodeId = null
      state.selectedNodeType = null
      state.nodePlacementMode = null
    }, false, 'clearCircuit')
  },

  // Simulation tick - propagate signals through circuit
  simulationTick: () => {
    set((state) => {
      // Step 1: Propagate wires to gate inputs
      // This handles all wire types: input nodes, constant nodes, junctions, and gate outputs
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
