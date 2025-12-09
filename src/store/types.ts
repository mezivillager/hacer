// Types for the circuit simulation

export interface Pin {
  id: string
  name: string
  type: 'input' | 'output'
  value: boolean
}

export interface Wire {
  id: string
  fromGateId: string
  fromPinId: string
  toGateId: string
  toPinId: string
}

export type GateType = 'NAND' | 'AND' | 'OR' | 'NOT' | 'NOR' | 'XOR' | 'XNOR'

export interface GateInstance {
  id: string
  type: GateType
  position: { x: number; y: number; z: number }
  rotation: { x: number; y: number; z: number }
  inputs: Pin[]
  outputs: Pin[]
  selected: boolean
}

export interface WiringState {
  fromGateId: string
  fromPinId: string
  fromPinType: 'input' | 'output'
  fromPosition: { x: number; y: number; z: number }
  previewEndPosition: { x: number; y: number; z: number } | null
}

export interface CircuitState {
  gates: GateInstance[]
  wires: Wire[]
  selectedGateId: string | null
  simulationRunning: boolean
  simulationSpeed: number // ms per tick
  placementMode: GateType | null
  wiringFrom: WiringState | null
}
