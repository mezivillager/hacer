import { notify } from '@lib/toast'
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
      state.junctionPreviewWireId = null
      state.wiringFrom = null
      state.lastSimulationError = null
      state.statusMessages = []
    }, false, 'clearCircuit')
  },

  simulationTick: () => {
    let newCycle: string[] | undefined
    set((state) => {
      const hadCycleBefore = state.lastSimulationError !== null
      const outcome = evaluateCircuit(state)
      if (outcome.status === 'cycle') {
        if (!hadCycleBefore) {
          newCycle = outcome.involvedGateIds
        }
        state.lastSimulationError = {
          type: 'cycle',
          involvedGateIds: outcome.involvedGateIds,
        }
      } else {
        state.lastSimulationError = null
      }
    }, false, 'simulationTick')
    if (newCycle !== undefined) {
      const ids =
        newCycle.length > 0 ? newCycle.join(', ') : 'unknown gates'
      notify.error(
        `Combinational cycle detected. Gates involved: ${ids}. This simulation step had no effect.`
      )
    }
  },
})
