// Types for the circuit simulation

export type Position = { x: number; y: number; z: number }
export type Rotation = { x: number; y: number; z: number }

export interface Pin {
  id: string
  name: string
  type: 'input' | 'output'
  value: boolean
}

import type { WireSegment } from '@/utils/wiringScheme/types'

export interface Wire {
  id: string
  fromGateId: string
  fromPinId: string
  toGateId: string
  toPinId: string
  segments: WireSegment[] // Path segments for this wire (calculated when wire is created)
}

export type GateType = 'NAND' | 'AND' | 'OR' | 'NOT' | 'NOR' | 'XOR' | 'XNOR'

export interface GateInstance {
  id: string
  type: GateType
  position: Position
  rotation: Rotation
  inputs: Pin[]
  outputs: Pin[]
  selected: boolean
}

export interface WiringState {
  fromGateId: string
  fromPinId: string
  fromPinType: 'input' | 'output'
  fromPosition: Position
  previewEndPosition: Position | null
  destinationGateId: string | null
  destinationPinId: string | null
  segments: WireSegment[] | null // Calculated path segments (stored when destination pin is set, used when completing wire)
}

export interface CircuitState {
  gates: GateInstance[]
  wires: Wire[]
  selectedGateId: string | null
  simulationRunning: boolean
  simulationSpeed: number // ms per tick
  placementMode: GateType | null
  placementPreviewPosition: Position | null
  wiringFrom: WiringState | null
  isDragActive: boolean
  hoveredGateId: string | null
}

// Action types for the Zustand store
export interface GateActions {
  addGate: (type: GateType, position: Position) => GateInstance
  removeGate: (gateId: string) => void
  selectGate: (gateId: string | null) => void
  updateGatePosition: (gateId: string, position: Position) => void
  updateGateRotation: (gateId: string, rotation: Rotation) => void
  rotateGate: (gateId: string, axis: 'x' | 'y' | 'z', angle: number) => void
}

export interface WireActions {
  addWire: (fromGateId: string, fromPinId: string, toGateId: string, toPinId: string, segments: WireSegment[]) => Wire
  removeWire: (wireId: string) => void
  setInputValue: (gateId: string, pinId: string, value: boolean) => void
}

export interface SimulationActions {
  toggleSimulation: () => void
  setSimulationSpeed: (speed: number) => void
  clearCircuit: () => void
  simulationTick: () => void
}

export interface PlacementActions {
  startPlacement: (type: GateType) => void
  cancelPlacement: () => void
  placeGate: (position: Position) => void
  updatePlacementPreviewPosition: (position: Position | null) => void
  setDragActive: (active: boolean) => void
  setHoveredGate: (gateId: string | null) => void
}

export interface WiringActions {
  startWiring: (gateId: string, pinId: string, pinType: 'input' | 'output', position: Position) => void
  updateWirePreviewPosition: (position: Position | null) => void
  setDestinationPin: (gateId: string | null, pinId: string | null) => void
  cancelWiring: () => void
  completeWiring: (toGateId: string, toPinId: string, toPinType: 'input' | 'output') => void
}

export interface PinHelpers {
  getPinWorldPosition: (gateId: string, pinId: string) => Position | null
  getPinOrientation: (gateId: string, pinId: string) => { x: number; y: number; z: number } | null
}

// Combined store type
export interface CircuitStore extends CircuitState, GateActions, WireActions, SimulationActions, PlacementActions, WiringActions, PinHelpers {}
