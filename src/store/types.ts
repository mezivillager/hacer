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

// =============================================================================
// HDL Support: Circuit I/O Nodes
// =============================================================================

/**
 * Circuit input node - represents an external input pin of the chip.
 * In HDL: `IN a, b;` declares input nodes named 'a' and 'b'.
 */
export interface InputNode {
  id: string
  name: string           // e.g., 'a', 'b', 'sel'
  position: Position
  rotation: Rotation
  value: boolean         // current input value
  width: number          // bus width (1 for single bit, 16 for 16-bit bus)
}

/**
 * Circuit output node - represents an external output pin of the chip.
 * In HDL: `OUT out;` declares an output node named 'out'.
 */
export interface OutputNode {
  id: string
  name: string           // e.g., 'out'
  position: Position
  rotation: Rotation
  value: boolean         // current output value (computed from circuit)
  width: number          // bus width (1 for single bit)
}

/**
 * Constant value node - represents 'true' or 'false' constants.
 * In HDL: `a=true` or `a=false` wires a constant to a gate input.
 */
export interface ConstantNode {
  id: string
  value: boolean         // true or false
  position: Position
  rotation: Rotation
}

// =============================================================================
// Wire System (Unified)
// =============================================================================

/**
 * Type of entity that can be a wire endpoint.
 */
export type WireEndpointType = 'gate' | 'input' | 'output' | 'constant' | 'junction'

/**
 * Represents a connection point for a wire.
 * Can be a gate pin, circuit input/output node, constant, or junction.
 */
export interface WireEndpoint {
  /** Type of the endpoint entity */
  type: WireEndpointType
  /** ID of the entity (gate ID, input node ID, etc.) */
  entityId: string
  /** Pin ID for gates; undefined for other types */
  pinId?: string
}

/**
 * Junction node - visual branch point where a signal wire splits.
 * Used for fan-out where one signal source feeds multiple destinations.
 */
export interface JunctionNode {
  id: string
  position: Position
  signalId: string       // Which signal this junction belongs to
  wireIds: string[]      // IDs of wires that pass through this junction
}

/**
 * Unified wire type supporting all connection types.
 * Uses WireEndpoint for flexible connections between gates, nodes, and junctions.
 */
export interface Wire {
  id: string
  signalId?: string      // Optional reference to logical signal (for HDL-style grouping)
  from: WireEndpoint     // Source endpoint (gate output, input node, constant, junction)
  to: WireEndpoint       // Destination endpoint (gate input, output node, junction)
  segments: WireSegment[]
  crossesWireIds: string[]
}

export type GateType = 'NAND' | 'AND' | 'OR' | 'NOT' | 'NOR' | 'XOR' | 'XNOR'

/**
 * Node placement type for UI node placement mode.
 */
export type NodePlacementType = 'INPUT' | 'OUTPUT' | 'CONSTANT_TRUE' | 'CONSTANT_FALSE'

/**
 * Node type discriminator for selection state.
 */
export type NodeType = 'input' | 'output' | 'constant'

export interface GateInstance {
  id: string
  type: GateType
  position: Position
  rotation: Rotation
  inputs: Pin[]
  outputs: Pin[]
  selected: boolean
}

/**
 * Source of a wire being created.
 * Can be a gate pin or a node (input, output, constant).
 */
export type WiringSource =
  | { type: 'gate'; gateId: string; pinId: string; pinType: 'input' | 'output' }
  | { type: 'input'; nodeId: string }
  | { type: 'output'; nodeId: string }
  | { type: 'constant'; nodeId: string }
  | { type: 'junction'; junctionId: string }

/**
 * Destination of a wire being created.
 * Can be a gate pin or a node (output node for input wires).
 */
export type WiringDestination =
  | { type: 'gate'; gateId: string; pinId: string }
  | { type: 'output'; nodeId: string }
  | { type: 'junction'; junctionId: string; originalWireId: string; sharedSegments: import('@/utils/wiringScheme/types').WireSegment[] }

export interface WiringState {
  // Legacy gate-based wiring (for backward compatibility)
  fromGateId: string
  fromPinId: string
  fromPinType: 'input' | 'output'
  fromPosition: Position
  previewEndPosition: Position | null
  destinationGateId: string | null
  destinationPinId: string | null
  // Node destination tracking (for wiring to output nodes)
  destinationNodeId: string | null
  destinationNodeType: NodeType | null
  segments: WireSegment[] | null // Calculated path segments (stored when destination pin is set, used when completing wire)

  // Extended node-based wiring
  source?: WiringSource
  destination?: WiringDestination
}

export interface CircuitState {
  gates: GateInstance[]
  wires: Wire[]
  selectedGateId: string | null
  selectedWireId: string | null
  simulationRunning: boolean
  simulationSpeed: number // ms per tick
  placementMode: GateType | null
  placementPreviewPosition: Position | null
  wiringFrom: WiringState | null
  isDragActive: boolean
  hoveredGateId: string | null
  showAxes: boolean

  // HDL Support: Circuit I/O nodes and junctions
  inputNodes: InputNode[]
  outputNodes: OutputNode[]
  constantNodes: ConstantNode[]
  junctions: JunctionNode[]

  // Node placement and selection
  nodePlacementMode: NodePlacementType | null
  selectedNodeId: string | null
  selectedNodeType: NodeType | null

  // Junction placement
  junctionPlacementMode: boolean | null
  junctionPreviewPosition: Position | null
}

// Action types for the Zustand store
export interface GateActions {
  addGate: (type: GateType, position: Position) => GateInstance
  removeGate: (gateId: string) => void
  selectGate: (gateId: string | null) => void
  selectWire: (wireId: string | null) => void
  updateGatePosition: (gateId: string, position: Position) => void
  updateGateRotation: (gateId: string, rotation: Rotation) => void
  rotateGate: (gateId: string, axis: 'x' | 'y' | 'z', angle: number) => void
  recalculateWiresForGate: (gateId: string) => void
}

export interface WireActions {
  addWire: (
    from: WireEndpoint,
    to: WireEndpoint,
    segments: WireSegment[],
    crossesWireIds?: string[],
    signalId?: string
  ) => Wire
  removeWire: (wireId: string) => void
  setInputValue: (gateId: string, pinId: string, value: boolean) => void
  updateWireSegments: (wireId: string, segments: WireSegment[], crossesWireIds?: string[]) => void
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

/**
 * Actions for placing circuit I/O nodes on the canvas.
 */
export interface NodePlacementActions {
  startNodePlacement: (type: NodePlacementType) => void
  cancelNodePlacement: () => void
  placeNode: (position: Position) => void
  selectNode: (nodeId: string, nodeType: NodeType) => void
  deselectNode: () => void
}

export interface WiringActions {
  startWiring: (gateId: string, pinId: string, pinType: 'input' | 'output', position: Position) => void
  updateWirePreviewPosition: (position: Position | null) => void
  setDestinationPin: (gateId: string | null, pinId: string | null) => void
  setDestinationNode: (nodeId: string | null, nodeType: NodeType | null) => void
  cancelWiring: () => void
  completeWiring: (toGateId: string, toPinId: string, toPinType: 'input' | 'output') => void
  // Node-based wiring (for HDL support)
  startWiringFromNode: (nodeId: string, nodeType: NodeType, position: Position) => void
  startWiringFromJunction: (junctionId: string, position: Position) => void
  completeWiringFromNodeToGate: (toGateId: string, toPinId: string, toPinType: 'input' | 'output') => void
  completeWiringToNode: (nodeId: string, nodeType: NodeType) => void
  completeWiringFromJunction: (toGateId: string, toPinId: string, toPinType: 'input' | 'output') => void
  completeWiringFromJunctionToNode: (nodeId: string, nodeType: NodeType) => void
}

export interface PinHelpers {
  getPinWorldPosition: (gateId: string, pinId: string) => Position | null
  getPinOrientation: (gateId: string, pinId: string) => { x: number; y: number; z: number } | null
}

export interface ViewActions {
  toggleAxes: () => void
}

// =============================================================================
// HDL Support: Node and Junction Actions
// =============================================================================

/**
 * Actions for managing circuit I/O nodes (input, output, constant).
 */
export interface NodeActions {
  addInputNode: (name: string, position: Position, width?: number) => InputNode
  addOutputNode: (name: string, position: Position, width?: number) => OutputNode
  addConstantNode: (value: boolean, position: Position) => ConstantNode
  removeInputNode: (nodeId: string) => void
  removeOutputNode: (nodeId: string) => void
  removeConstantNode: (nodeId: string) => void
  updateInputNodeValue: (nodeId: string, value: boolean) => void
  updateInputNodePosition: (nodeId: string, position: Position) => void
  updateOutputNodePosition: (nodeId: string, position: Position) => void
}

/**
 * Actions for managing junctions (signal branch points).
 */
export interface JunctionActions {
  addJunction: (signalId: string, position: Position) => JunctionNode
  removeJunction: (junctionId: string) => void
  updateJunctionPosition: (junctionId: string, position: Position) => void
}

/**
 * Actions for placing junction nodes on wires.
 */
export interface JunctionPlacementActions {
  startJunctionPlacement: () => void
  cancelJunctionPlacement: () => void
  placeJunctionOnWire: (clickPoint: Position, wireId: string) => JunctionNode
  updateJunctionPreviewPosition: (position: Position | null) => void
}

// Combined store type
export interface CircuitStore extends CircuitState, GateActions, WireActions, SimulationActions, PlacementActions, NodePlacementActions, WiringActions, PinHelpers, ViewActions, NodeActions, JunctionActions, JunctionPlacementActions {}
