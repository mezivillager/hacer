import { proxy, useSnapshot, subscribe } from 'valtio'
import { gateActions } from './actions/gateActions/gateActions'
import { wireActions } from './actions/wireActions/wireActions'
import { simulationActions } from './actions/simulationActions/simulationActions'
import { placementActions } from './actions/placementActions/placementActions'
import { wiringActions } from './actions/wiringActions/wiringActions'
import { getPinWorldPosition } from './actions/pinHelpers/pinHelpers'
import type { CircuitState } from './types'

// Re-export types for convenience
export type { CircuitState, GateInstance, GateType, Pin, Wire, WiringState } from './types'

// Initial state
export const circuitStore = proxy<CircuitState>({
  gates: [],
  wires: [],
  selectedGateId: null,
  simulationRunning: false,
  simulationSpeed: 100,
  placementMode: null,
  wiringFrom: null,
})

// Combined actions object
export const circuitActions = {
  // Gate actions
  ...gateActions,
  // Wire actions
  ...wireActions,
  // Simulation actions
  ...simulationActions,
  // Placement actions
  ...placementActions,
  // Wiring actions
  ...wiringActions,
  // Helper functions
  getPinWorldPosition,
}

// Simulation loop
let simulationInterval: ReturnType<typeof setInterval> | null = null

subscribe(circuitStore, () => {
  if (circuitStore.simulationRunning) {
    if (!simulationInterval) {
      simulationInterval = setInterval(() => {
        circuitActions.simulationTick()
      }, circuitStore.simulationSpeed)
    }
  } else {
    if (simulationInterval) {
      clearInterval(simulationInterval)
      simulationInterval = null
    }
  }
})

// Hook for reading state reactively
export const useCircuitStore = () => useSnapshot(circuitStore)
