import { create } from 'zustand'
import { devtools, subscribeWithSelector } from 'zustand/middleware'
import { immer } from 'zustand/middleware/immer'
import { createGateActions } from './actions/gateActions/gateActions'
import { createWireActions } from './actions/wireActions/wireActions'
import { createSimulationActions } from './actions/simulationActions/simulationActions'
import { createPlacementActions } from './actions/placementActions/placementActions'
import { createWiringActions } from './actions/wiringActions/wiringActions'
import { createPinHelpers } from './actions/pinHelpers/pinHelpers'
import { createViewActions } from './actions/viewActions/viewActions'
import { createNodeActions } from './actions/nodeActions/nodeActions'
import { createJunctionActions } from './actions/signalActions/signalActions'
import { createNodePlacementActions } from './actions/nodePlacementActions/nodePlacementActions'
import { createJunctionPlacementActions } from './actions/junctionPlacementActions/junctionPlacementActions'
import { createStatusActions } from './actions/statusActions/statusActions'
import { calculateWirePathFromConnection } from '@/utils/wiringScheme'
import { collectWireSegments } from '@/utils/wiringScheme/segments'
import type { WireSegment } from '@/utils/wiringScheme/types'
import type { CircuitStore } from './types'
import '../../e2e/types/globals' // Import for Window augmentation side-effect
import '@/utils/renderTracking' // Initialize render tracking

// Re-export types for convenience
export type {
  CircuitState,
  GateInstance,
  GateType,
  Pin,
  SimulationError,
  Wire,
  WiringState,
} from './types'

// Initial state values
const initialState = {
  gates: [] as import('./types').GateInstance[],
  wires: [] as import('./types').Wire[],
  selectedGateId: null as string | null,
  selectedWireId: null as string | null,
  simulationRunning: false,
  simulationSpeed: 100,
  lastSimulationError: null as import('./types').SimulationError | null,
  placementMode: null as import('./types').GateType | null,
  placementPreviewPosition: null as import('./types').Position | null,
  wiringFrom: null as import('./types').WiringState | null,
  isDragActive: false,
  hoveredGateId: null as string | null,
  showAxes: false,
  // HDL Support: Circuit I/O nodes and junctions
  inputNodes: [] as import('./types').InputNode[],
  outputNodes: [] as import('./types').OutputNode[],
  junctions: [] as import('./types').JunctionNode[],
  // Node placement and selection
  nodePlacementMode: null as import('./types').NodePlacementType | null,
  selectedNodeId: null as string | null,
  selectedNodeType: null as import('./types').NodeType | null,
  // Junction placement
  junctionPlacementMode: null as boolean | null,
  junctionPreviewPosition: null as import('./types').Position | null,
  junctionPreviewWireId: null as string | null,
  // Status bar feedback channel
  statusMessages: [] as import('./types').StatusMessage[],
}

// Create the Zustand store with Immer, devtools, and subscribeWithSelector middleware
export const useCircuitStore = create<CircuitStore>()(
  devtools(
    subscribeWithSelector(
      immer((set, get) => ({
        // Initial state
        ...initialState,

        // Spread all action slices
        ...createGateActions(set, get),
        ...createWireActions(set, get),
        ...createSimulationActions(set),
        ...createPlacementActions(set, get),
        ...createWiringActions(set, get),
        ...createPinHelpers(get),
        ...createViewActions(set),
        ...createNodeActions(set, get),
        ...createJunctionActions(set, get),
        ...createNodePlacementActions(set, get),
        ...createJunctionPlacementActions(set, get),
        ...createStatusActions(set),
      }))
    ),
    { name: 'CircuitStore' }
  )
)

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
  selectWire: (...args: Parameters<CircuitStore['selectWire']>) => useCircuitStore.getState().selectWire(...args),
  updateGatePosition: (...args: Parameters<CircuitStore['updateGatePosition']>) => useCircuitStore.getState().updateGatePosition(...args),
  updateGateRotation: (...args: Parameters<CircuitStore['updateGateRotation']>) => useCircuitStore.getState().updateGateRotation(...args),
  rotateGate: (...args: Parameters<CircuitStore['rotateGate']>) => useCircuitStore.getState().rotateGate(...args),
  recalculateWiresForGate: (...args: Parameters<CircuitStore['recalculateWiresForGate']>) => useCircuitStore.getState().recalculateWiresForGate(...args),
  // Wire actions
  addWire: (...args: Parameters<CircuitStore['addWire']>) => useCircuitStore.getState().addWire(...args),
  removeWire: (...args: Parameters<CircuitStore['removeWire']>) => useCircuitStore.getState().removeWire(...args),
  setInputValue: (...args: Parameters<CircuitStore['setInputValue']>) => useCircuitStore.getState().setInputValue(...args),
  updateWireSegments: (...args: Parameters<CircuitStore['updateWireSegments']>) => useCircuitStore.getState().updateWireSegments(...args),
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
  setDragActive: (...args: Parameters<CircuitStore['setDragActive']>): void => {
    useCircuitStore.getState().setDragActive(...args)
  },
  setHoveredGate: (...args: Parameters<CircuitStore['setHoveredGate']>): void => {
    useCircuitStore.getState().setHoveredGate(...args)
  },
  // Wiring actions
  startWiring: (...args: Parameters<CircuitStore['startWiring']>) => useCircuitStore.getState().startWiring(...args),
  updateWirePreviewPosition: (...args: Parameters<CircuitStore['updateWirePreviewPosition']>) => useCircuitStore.getState().updateWirePreviewPosition(...args),
  setDestinationPin: (...args: Parameters<CircuitStore['setDestinationPin']>): void => {
    useCircuitStore.getState().setDestinationPin(...args)
  },
  setDestinationNode: (...args: Parameters<CircuitStore['setDestinationNode']>): void => {
    useCircuitStore.getState().setDestinationNode(...args)
  },
  cancelWiring: () => useCircuitStore.getState().cancelWiring(),
  completeWiring: (...args: Parameters<CircuitStore['completeWiring']>) => useCircuitStore.getState().completeWiring(...args),
  startWiringFromNode: (...args: Parameters<CircuitStore['startWiringFromNode']>) => useCircuitStore.getState().startWiringFromNode(...args),
  completeWiringFromNodeToGate: (...args: Parameters<CircuitStore['completeWiringFromNodeToGate']>) => useCircuitStore.getState().completeWiringFromNodeToGate(...args),
  completeWiringToNode: (...args: Parameters<CircuitStore['completeWiringToNode']>) => useCircuitStore.getState().completeWiringToNode(...args),
  // Helper functions
  getPinWorldPosition: (...args: Parameters<CircuitStore['getPinWorldPosition']>): ReturnType<CircuitStore['getPinWorldPosition']> => useCircuitStore.getState().getPinWorldPosition(...args),
  getPinOrientation: (...args: Parameters<CircuitStore['getPinOrientation']>): ReturnType<CircuitStore['getPinOrientation']> => useCircuitStore.getState().getPinOrientation(...args),
  // E2E helper: Calculate and store wire path segments manually (bypasses WirePreview component)
  calculateWirePathSegments: (
    fromGateId: string,
    fromPinId: string,
    toGateId: string,
    toPinId: string
  ): WireSegment[] | null => {
    const state = useCircuitStore.getState()
    const existingSegments = collectWireSegments(state.wires)
    const path = calculateWirePathFromConnection(
      fromGateId,
      fromPinId,
      toGateId,
      toPinId,
      {
        gates: state.gates,
        getPinWorldPosition: state.getPinWorldPosition,
        getPinOrientation: state.getPinOrientation,
        existingSegments,
      }
    )

    const segments = path?.segments ?? null

    // Store segments directly in wiringFrom state if wiring is active
    if (segments && segments.length > 0) {
      useCircuitStore.setState((s) => {
        if (s.wiringFrom) {
          s.wiringFrom.segments = segments
        }
      }, false, 'calculateWirePathSegments')
    }

    return segments
  },
  // View actions
  toggleAxes: () => useCircuitStore.getState().toggleAxes(),
  // Node placement actions
  startNodePlacement: (...args: Parameters<CircuitStore['startNodePlacement']>) => useCircuitStore.getState().startNodePlacement(...args),
  cancelNodePlacement: () => useCircuitStore.getState().cancelNodePlacement(),
  placeNode: (...args: Parameters<CircuitStore['placeNode']>) => useCircuitStore.getState().placeNode(...args),
  selectNode: (...args: Parameters<CircuitStore['selectNode']>) => useCircuitStore.getState().selectNode(...args),
  deselectNode: () => useCircuitStore.getState().deselectNode(),
  // Node CRUD actions (already in store, adding to circuitActions for convenience)
  addInputNode: (...args: Parameters<CircuitStore['addInputNode']>) => useCircuitStore.getState().addInputNode(...args),
  addOutputNode: (...args: Parameters<CircuitStore['addOutputNode']>) => useCircuitStore.getState().addOutputNode(...args),
  renameInputNode: (...args: Parameters<CircuitStore['renameInputNode']>) => useCircuitStore.getState().renameInputNode(...args),
  renameOutputNode: (...args: Parameters<CircuitStore['renameOutputNode']>) => useCircuitStore.getState().renameOutputNode(...args),
  removeInputNode: (...args: Parameters<CircuitStore['removeInputNode']>) => useCircuitStore.getState().removeInputNode(...args),
  removeOutputNode: (...args: Parameters<CircuitStore['removeOutputNode']>) => useCircuitStore.getState().removeOutputNode(...args),
  updateInputNodeValue: (...args: Parameters<CircuitStore['updateInputNodeValue']>) => useCircuitStore.getState().updateInputNodeValue(...args),
  updateInputNodePosition: (...args: Parameters<CircuitStore['updateInputNodePosition']>) => useCircuitStore.getState().updateInputNodePosition(...args),
  updateOutputNodePosition: (...args: Parameters<CircuitStore['updateOutputNodePosition']>) => useCircuitStore.getState().updateOutputNodePosition(...args),
  // Junction actions
  addJunction: (...args: Parameters<CircuitStore['addJunction']>) => useCircuitStore.getState().addJunction(...args),
  removeJunction: (...args: Parameters<CircuitStore['removeJunction']>) => useCircuitStore.getState().removeJunction(...args),
  updateJunctionPosition: (...args: Parameters<CircuitStore['updateJunctionPosition']>) => useCircuitStore.getState().updateJunctionPosition(...args),
  // Junction placement actions
  startJunctionPlacement: () => useCircuitStore.getState().startJunctionPlacement(),
  cancelJunctionPlacement: () => useCircuitStore.getState().cancelJunctionPlacement(),
  placeJunctionOnWire: (...args: Parameters<CircuitStore['placeJunctionOnWire']>) => useCircuitStore.getState().placeJunctionOnWire(...args),
  updateJunctionPreviewPosition: (...args: Parameters<CircuitStore['updateJunctionPreviewPosition']>) => useCircuitStore.getState().updateJunctionPreviewPosition(...args),
  // Junction wiring actions
  startWiringFromJunction: (...args: Parameters<CircuitStore['startWiringFromJunction']>) => useCircuitStore.getState().startWiringFromJunction(...args),
  completeWiringFromJunction: (...args: Parameters<CircuitStore['completeWiringFromJunction']>) => useCircuitStore.getState().completeWiringFromJunction(...args),
  completeWiringFromJunctionToNode: (...args: Parameters<CircuitStore['completeWiringFromJunctionToNode']>) => useCircuitStore.getState().completeWiringFromJunctionToNode(...args),
  // Status actions
  addStatus: (severity: import('./types').StatusMessage['severity'], text: string) =>
    useCircuitStore.getState().addStatus(severity, text),
  clearStatus: (id: string) => useCircuitStore.getState().clearStatus(id),
  clearAllStatus: () => useCircuitStore.getState().clearAllStatus(),
}

// Expose store and actions for E2E testing
if (typeof window !== 'undefined') {
  // Expose the Zustand getState function directly - this allows E2E tests
  // to always access the current state
  // Expose store and actions for E2E testing
  // Note: The full CircuitStore is assigned, but TypeScript sees it as CircuitStoreSnapshot
  // This is safe because E2E tests only access the state properties, not action methods
  window.__CIRCUIT_STORE__ = useCircuitStore.getState()
  window.__CIRCUIT_ACTIONS__ = circuitActions
  window.__CIRCUIT_STORE_SET_STATE__ = (fn: (draft: CircuitStore) => void) => {
    useCircuitStore.setState(fn)
  }

  // Keep window.__CIRCUIT_STORE__ in sync with store changes
  useCircuitStore.subscribe((state) => {
    window.__CIRCUIT_STORE__ = state
  })
}
