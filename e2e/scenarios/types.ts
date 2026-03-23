/**
 * Scenario Type Definitions
 *
 * Types for defining test scenarios including gate placements,
 * wire plans, and expected outcomes.
 */

import type { Position3D } from '../config/constants'

/**
 * Describes a gate placement with optional rotation
 */
export interface GatePlacement {
  label: string
  position: Position3D
  rotate?: {
    direction: 'left' | 'right'
    times: number
  }
}

/**
 * Describes a wire connection between gates by index
 */
export interface WirePlan {
  fromGate: number
  fromPin: 'out-0'
  toGate: number
  toPin: 'in-0' | 'in-1'
}

/**
 * Describes an input toggle operation
 */
export interface TogglePlan {
  gate: number
  pin: 'in-0' | 'in-1'
  value: number
}

/**
 * Full NAND circuit scenario descriptor
 */
export interface NandScenario {
  name: string
  placements: GatePlacement[]
  wires: WirePlan[]
  toggles: TogglePlan[]
  expectations: {
    gates: number
    wires: number
    outputs: {
      gate1: number
      gate2: number
      gate3: number
      gate3Inputs: [number, number]
    }
  }
}

/**
 * Basic circuit building scenario descriptor
 */
export interface CircuitBuildScenario {
  name: string
  placements: GatePlacement[]
  wire: WirePlan
}

/**
 * Simulation scenario descriptor for 2+ gates
 */
export interface SimulationScenario {
  name: string
  placements: GatePlacement[]
  wires: WirePlan[]
  toggles: TogglePlan[]
  expectations: {
    gates: number
    wires: number
    outputs: Array<{
      gateIndex: number
      outputIndex: number
      value: number
    }>
    inputs?: Array<{
      gateIndex: number
      inputIndex: number
      value: number
    }>
  }
}
