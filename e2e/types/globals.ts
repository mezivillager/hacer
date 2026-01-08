/**
 * E2E Testing Globals
 *
 * This file defines the window globals exposed for E2E testing
 * and augments the global Window interface so TypeScript recognizes them.
 *
 * This file is imported in production code for the side-effect of Window augmentation.
 */

import type { GateType } from '../../src/store/types'
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

export interface CircuitWire {
  id: string
  fromGateId: string
  fromPinId: string
  toGateId: string
  toPinId: string
}

export interface CircuitStoreSnapshot {
  gates: CircuitStoreGate[]
  wires: CircuitWire[]
  simulationRunning?: boolean
  selectedGateId?: string | null
  placementMode?: GateType | null
}

export interface CircuitActionsAPI {
  addGate: (
    type: GateType,
    position: { x: number; y: number; z: number }
  ) => { id: string; inputs: Array<{ id: string }>; outputs: Array<{ id: string }> }
  addWire: (
    fromGateId: string,
    fromPinId: string,
    toGateId: string,
    toPinId: string,
    segments: WireSegment[]
  ) => void
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
