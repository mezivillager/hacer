import { create } from 'zustand'
import { devtools, subscribeWithSelector } from 'zustand/middleware'
import { immer } from 'zustand/middleware/immer'
import { createGateActions } from './actions/gateActions/gateActions'
import { createWireActions } from './actions/wireActions/wireActions'
import { createSimulationActions } from './actions/simulationActions/simulationActions'
import { createPlacementActions } from './actions/placementActions/placementActions'
import { createWiringActions } from './actions/wiringActions/wiringActions'
import { createPinHelpers } from './actions/pinHelpers/pinHelpers'
import type { CircuitStore } from './types'
import '@/types/testingGlobals' // Import for Window augmentation side-effect
import '@/utils/renderTracking' // Initialize render tracking

// Re-export types for convenience
export type { CircuitState, GateInstance, GateType, Pin, Wire, WiringState } from './types'

// Initial state values
const initialState = {
  gates: [] as import('./types').GateInstance[],
  wires: [] as import('./types').Wire[],
  selectedGateId: null as string | null,
  simulationRunning: false,
  simulationSpeed: 100,
  placementMode: null as import('./types').GateType | null,
  placementPreviewPosition: null as import('./types').Position | null,
  wiringFrom: null as import('./types').WiringState | null,
}

// Migration: Update existing gates to flat orientation (Phase 0.25.2)
// This function updates gates with old rotation (x: 0) to new flat orientation (x: Math.PI / 2)
function migrateGatesToFlatOrientation(state: CircuitStore) {
  for (const gate of state.gates) {
    // If gate has old rotation (x: 0), update to new default (x: Math.PI / 2)
    if (Math.abs(gate.rotation.x) < 0.001) { // Check for ~0 (accounting for floating point)
      gate.rotation.x = Math.PI / 2
      // Preserve any user Y rotation
      // Z rotation should remain 0
    }
  }
}

// Create the Zustand store with Immer, devtools, and subscribeWithSelector middleware
export const useCircuitStore = create<CircuitStore>()(
  devtools(
    subscribeWithSelector(
      immer((set, get) => ({
        // Initial state
        ...initialState,

        // Spread all action slices
        ...createGateActions(set),
        ...createWireActions(set),
        ...createSimulationActions(set),
        ...createPlacementActions(set, get),
        ...createWiringActions(set, get),
        ...createPinHelpers(get),
      }))
    ),
    { name: 'CircuitStore' }
  )
)

// Run migration once on store initialization if there are existing gates
// This handles cases where gates exist in persisted state or were created before migration
// Migration runs lazily - only when gates are accessed and have old rotation
if (typeof window !== 'undefined') {
  // Check and migrate on first access
  const state = useCircuitStore.getState()
  if (state.gates.length > 0) {
    useCircuitStore.setState((draft) => {
      migrateGatesToFlatOrientation(draft)
    })
  }
}

// Simulation loop subscription
let simulationInterval: ReturnType<typeof setInterval> | null = null

useCircuitStore.subscribe(
  (state) => state.simulationRunning,
  (running) => {
    if (running) {
      if (!simulationInterval) {
        simulationInterval = setInterval(() => {
          useCircuitStore.getState().simulationTick()
        }, useCircuitStore.getState().simulationSpeed)
      }
    } else {
      if (simulationInterval) {
        clearInterval(simulationInterval)
        simulationInterval = null
      }
    }
  }
)

// Also subscribe to speed changes to update interval
useCircuitStore.subscribe(
  (state) => state.simulationSpeed,
  (speed) => {
    const running = useCircuitStore.getState().simulationRunning
    if (running && simulationInterval) {
      clearInterval(simulationInterval)
      simulationInterval = setInterval(() => {
        useCircuitStore.getState().simulationTick()
      }, speed)
    }
  }
)

// Legacy exports for backward compatibility during migration
// circuitStore gives direct access to the current state (readonly)
export const circuitStore = {
  get gates() { return useCircuitStore.getState().gates },
  get wires() { return useCircuitStore.getState().wires },
  get selectedGateId() { return useCircuitStore.getState().selectedGateId },
  get simulationRunning() { return useCircuitStore.getState().simulationRunning },
  get simulationSpeed() { return useCircuitStore.getState().simulationSpeed },
  get placementMode() { return useCircuitStore.getState().placementMode },
  get wiringFrom() { return useCircuitStore.getState().wiringFrom },
}

// circuitActions provides all actions for external use
export const circuitActions = {
  // Gate actions
  addGate: (...args: Parameters<CircuitStore['addGate']>) => useCircuitStore.getState().addGate(...args),
  removeGate: (...args: Parameters<CircuitStore['removeGate']>) => useCircuitStore.getState().removeGate(...args),
  selectGate: (...args: Parameters<CircuitStore['selectGate']>) => useCircuitStore.getState().selectGate(...args),
  updateGatePosition: (...args: Parameters<CircuitStore['updateGatePosition']>) => useCircuitStore.getState().updateGatePosition(...args),
  updateGateRotation: (...args: Parameters<CircuitStore['updateGateRotation']>) => useCircuitStore.getState().updateGateRotation(...args),
  rotateGate: (...args: Parameters<CircuitStore['rotateGate']>) => useCircuitStore.getState().rotateGate(...args),
  // Wire actions
  addWire: (...args: Parameters<CircuitStore['addWire']>) => useCircuitStore.getState().addWire(...args),
  removeWire: (...args: Parameters<CircuitStore['removeWire']>) => useCircuitStore.getState().removeWire(...args),
  setInputValue: (...args: Parameters<CircuitStore['setInputValue']>) => useCircuitStore.getState().setInputValue(...args),
  // Simulation actions
  toggleSimulation: () => useCircuitStore.getState().toggleSimulation(),
  setSimulationSpeed: (...args: Parameters<CircuitStore['setSimulationSpeed']>) => useCircuitStore.getState().setSimulationSpeed(...args),
  clearCircuit: () => useCircuitStore.getState().clearCircuit(),
  simulationTick: () => useCircuitStore.getState().simulationTick(),
  // Placement actions
  startPlacement: (...args: Parameters<CircuitStore['startPlacement']>) => useCircuitStore.getState().startPlacement(...args),
  cancelPlacement: () => useCircuitStore.getState().cancelPlacement(),
  placeGate: (...args: Parameters<CircuitStore['placeGate']>) => useCircuitStore.getState().placeGate(...args),
  updatePlacementPreviewPosition: (...args: Parameters<CircuitStore['updatePlacementPreviewPosition']>) => useCircuitStore.getState().updatePlacementPreviewPosition(...args),
  // Wiring actions
  startWiring: (...args: Parameters<CircuitStore['startWiring']>) => useCircuitStore.getState().startWiring(...args),
  updateWirePreviewPosition: (...args: Parameters<CircuitStore['updateWirePreviewPosition']>) => useCircuitStore.getState().updateWirePreviewPosition(...args),
  cancelWiring: () => useCircuitStore.getState().cancelWiring(),
  completeWiring: (...args: Parameters<CircuitStore['completeWiring']>) => useCircuitStore.getState().completeWiring(...args),
  // Helper functions
  getPinWorldPosition: (...args: Parameters<CircuitStore['getPinWorldPosition']>) => useCircuitStore.getState().getPinWorldPosition(...args),
}

// Expose store and actions for E2E testing
if (typeof window !== 'undefined') {
  // Expose the Zustand getState function directly - this allows E2E tests
  // to always access the current state
  window.__CIRCUIT_STORE__ = useCircuitStore.getState()
  window.__CIRCUIT_ACTIONS__ = circuitActions
  
  // Keep window.__CIRCUIT_STORE__ in sync with store changes
  useCircuitStore.subscribe((state) => {
    window.__CIRCUIT_STORE__ = state
  })
}
