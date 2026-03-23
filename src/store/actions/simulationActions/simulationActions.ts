import { message } from 'antd'
import { evaluateCircuit } from '@/simulation/topologicalEval'
import type { SimulationActions, CircuitStore } from '../../types'

export { getSignalSourceValue } from '@/simulation/topologicalEval'

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
      state.lastSimulationError = null
    }, false, 'clearCircuit')
  },

  simulationTick: () => {
    let cycleInvolved: string[] | undefined
    set((state) => {
      const outcome = evaluateCircuit(state)
      if (outcome.status === 'cycle') {
        cycleInvolved = outcome.involvedGateIds
        state.lastSimulationError = {
          type: 'cycle',
          involvedGateIds: outcome.involvedGateIds,
        }
      } else {
        state.lastSimulationError = null
      }
    }, false, 'simulationTick')
    if (cycleInvolved !== undefined) {
      const ids =
        cycleInvolved.length > 0 ? cycleInvolved.join(', ') : 'unknown gates'
      message.error(
        `Combinational cycle detected. Gates involved: ${ids}. This simulation step had no effect.`
      )
    }
  },
})
