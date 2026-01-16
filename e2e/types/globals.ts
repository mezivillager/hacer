/**
 * E2E Testing Globals
 *
 * This file defines the window globals exposed for E2E testing
 * and augments the global Window interface so TypeScript recognizes them.
 *
 * This file is imported in production code for the side-effect of Window augmentation.
 */

import type { GateType, WiringState, NodeType, WireEndpointType } from '../../src/store/types'
import type { WireSegment } from '../../src/utils/wiringScheme/types'

export interface SceneHelpers {
  projectToScreen: (position: { x: number; y: number; z: number }) => { x: number; y: number }
  canvasRect: () => DOMRect
}

export interface CircuitStoreGate {
  id: string
  type: string
  position: { x: number; y: number; z: number }
  rotation?: { x: number; y: number; z: number }
  inputs: Array<{ id: string; value: boolean }>
  outputs: Array<{ id: string; value: boolean }>
  selected?: boolean
}

/**
 * Wire endpoint representing a connection point.
 * Mirrors the WireEndpoint type from store/types.ts.
 */
export interface E2EWireEndpoint {
  type: WireEndpointType
  entityId: string
  pinId?: string
}

/**
 * Unified wire structure using WireEndpoint format.
 */
export interface CircuitWire {
  id: string
  signalId?: string
  from: E2EWireEndpoint
  to: E2EWireEndpoint
  segments?: WireSegment[]
  crossesWireIds?: string[]
}

export interface CircuitStoreSnapshot {
  gates: CircuitStoreGate[]
  wires: CircuitWire[]
  simulationRunning?: boolean
  selectedGateId?: string | null
  placementMode?: GateType | null
  wiringFrom?: WiringState | null
}

export interface CircuitActionsAPI {
  addGate: (
    type: GateType,
    position: { x: number; y: number; z: number }
  ) => { id: string; inputs: Array<{ id: string }>; outputs: Array<{ id: string }> }
  // Unified wire API using WireEndpoint format
  addWire: (
    from: E2EWireEndpoint,
    to: E2EWireEndpoint,
    segments: WireSegment[],
    crossesWireIds?: string[],
    signalId?: string
  ) => CircuitWire
  setInputValue: (gateId: string, pinId: string, value: boolean) => void
  toggleSimulation: () => void
  clearCircuit: () => void
  simulationTick: () => void
  getPinWorldPosition: (gateId: string, pinId: string) => { x: number; y: number; z: number } | null
  selectGate: (gateId: string | null) => void
  removeGate: (gateId: string) => void
  rotateGate: (gateId: string, axis: 'x' | 'y' | 'z', angle: number) => void
  updateGatePosition: (gateId: string, position: { x: number; y: number; z: number }) => void
  removeWire: (wireId: string) => void
  // Placement actions
  startPlacement: (type: GateType) => void
  cancelPlacement: () => void
  placeGate: (position: { x: number; y: number; z: number }) => void
  // Wiring actions
  startWiring: (gateId: string, pinId: string, pinType: 'input' | 'output', position: { x: number; y: number; z: number }) => void
  updateWirePreviewPosition: (position: { x: number; y: number; z: number } | null) => void
  setDestinationPin: (gateId: string | null, pinId: string | null) => void
  cancelWiring: () => void
  completeWiring: (toGateId: string, toPinId: string, toPinType: 'input' | 'output') => void
  // Node-based wiring actions
  startWiringFromNode: (nodeId: string, nodeType: NodeType, position: { x: number; y: number; z: number }) => void
  completeWiringToNode: (nodeId: string, nodeType: NodeType) => void
  // Node management actions
  addInputNode: (name: string, position: { x: number; y: number; z: number }, width?: number) => { id: string; name: string; value: boolean }
  addOutputNode: (name: string, position: { x: number; y: number; z: number }, width?: number) => { id: string; name: string; value: boolean }
  addConstantNode: (value: boolean, position: { x: number; y: number; z: number }) => { id: string; value: boolean }
  removeInputNode: (nodeId: string) => void
  removeOutputNode: (nodeId: string) => void
  removeConstantNode: (nodeId: string) => void
  updateInputNodeValue: (nodeId: string, value: boolean) => void
  // Junction management actions
  addJunction: (signalId: string, position: { x: number; y: number; z: number }) => { id: string; signalId: string }
  removeJunction: (junctionId: string) => void
  // E2E helper for wire path calculation
  calculateWirePathSegments: (
    fromGateId: string,
    fromPinId: string,
    toGateId: string,
    toPinId: string
  ) => WireSegment[] | null
}

export interface RenderTrackerStats {
  count: number
  lastRenderTime: number
  reasons: string[]
}

export interface RenderTrackerSnapshot {
  stats: Record<string, RenderTrackerStats>
  totalRenders: number
  lastUpdateTime: number
  isStable: boolean
  reset: () => void
}

// Augment the global Window interface
declare global {
  interface Window {
    __SCENE_READY__?: boolean
    __SCENE_HELPERS__?: SceneHelpers
    __CIRCUIT_STORE__?: CircuitStoreSnapshot
    __CIRCUIT_ACTIONS__?: CircuitActionsAPI
    __RENDER_TRACKER__?: RenderTrackerSnapshot
  }
}
