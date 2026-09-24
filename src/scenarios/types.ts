/**
 * Recovered scenario shapes: placements, wires, and the vectors the old e2e
 * scenarios recorded. Layout fields are for later drivers.
 */
import type { Position3D } from './positions'

/** A placed gate. `rotate` is layout; the core driver ignores it. */
export interface GatePlacement {
  label: string
  position: Position3D
  rotate?: { direction: 'left' | 'right'; times: number }
}

/** A wire from one gate's output to another's input, by placement index. */
export interface WirePlan {
  fromGate: number
  fromPin: 'out-0'
  toGate: number
  toPin: 'in-0' | 'in-1'
}

/** Drive one unwired input for the scenario's vector. */
export interface TogglePlan {
  gate: number
  pin: 'in-0' | 'in-1'
  value: number
}

/** Three-NAND circuit and the vector its scenario recorded. */
export interface NandScenario {
  name: string
  placements: GatePlacement[]
  wires: WirePlan[]
  toggles: TogglePlan[]
  expectations: {
    gates: number
    wires: number
    outputs: { gate1: number; gate2: number; gate3: number; gate3Inputs: [number, number] }
  }
}

/** A build scenario: placements and a single wire, no vector. */
export interface CircuitBuildScenario {
  name: string
  placements: GatePlacement[]
  wire: WirePlan
}

/** A propagation vector over two or more gates. */
export interface SimulationScenario {
  name: string
  placements: GatePlacement[]
  wires: WirePlan[]
  toggles: TogglePlan[]
  expectations: {
    gates: number
    wires: number
    outputs: Array<{ gateIndex: number; outputIndex: number; value: number }>
    inputs?: Array<{ gateIndex: number; inputIndex: number; value: number }>
  }
}

/** Every recovered scenario the core driver runs. */
export type Scenario = NandScenario | CircuitBuildScenario | SimulationScenario
