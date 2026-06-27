export const CIRCUIT_FORMAT_VERSION = 1 as const

export type SerializedPosition = { x: number; y: number; z: number }
export type SerializedRotation = { x: number; y: number; z: number }

export type SerializedEndpointType = 'gate' | 'input' | 'output' | 'junction' | 'bus'

export interface SerializedWireSegment {
  start: SerializedPosition
  end: SerializedPosition
  type: 'horizontal' | 'vertical' | 'entry' | 'exit' | 'arc'
  arcCenter?: SerializedPosition
  arcRadius?: number
  crossedWireId?: string
}

export interface SerializedGate {
  id: string
  type: string
  position: SerializedPosition
  rotation: SerializedRotation
  width: number
}

export interface SerializedWire {
  id: string
  signalId?: string
  from: { type: SerializedEndpointType; entityId: string; pinId?: string }
  to: { type: SerializedEndpointType; entityId: string; pinId?: string }
  segments: SerializedWireSegment[]
  crossesWireIds: string[]
  width?: number
}

export interface SerializedInputNode {
  id: string
  name: string
  position: SerializedPosition
  rotation: SerializedRotation
  value: number
  width: number
}

export interface SerializedOutputNode {
  id: string
  name: string
  position: SerializedPosition
  rotation: SerializedRotation
  value: number
  width: number
}

export interface SerializedJunction {
  id: string
  position: SerializedPosition
  signalId: string
  wireIds: string[]
}

export interface SerializedCircuit {
  version: typeof CIRCUIT_FORMAT_VERSION
  name: string
  savedAt: string
  gates: SerializedGate[]
  wires: SerializedWire[]
  inputNodes: SerializedInputNode[]
  outputNodes: SerializedOutputNode[]
  junctions: SerializedJunction[]
}
