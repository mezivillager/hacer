/**
 * Core scenario driver (#195). Compiles each recovered circuit with `compileHDL`
 * against the chip registry. The store driver is not rebuilt: it drove
 * `CircuitState`, removed at ADR-0020.
 */
import { chainCircuitScenario, circuitBuildScenario } from '../circuitBuilding'
import { threeGateScenario } from '../nand3'
import { simulationTwoGateScenario } from '../simulation'
import type { Scenario } from '../types'

/** One scenario after the core driver has run it. */
export interface CoreScenarioResult {
  name: string
  ok: boolean
  errors: string[]
  /** Nand `out` per gate, placement order. Empty when the circuit did not evaluate. */
  outputs: number[]
  /** Observed `[a, b]` per gate after wires and toggles. */
  pins: Array<[number, number]>
}

const SCENARIOS: readonly Scenario[] = [
  threeGateScenario,
  circuitBuildScenario,
  chainCircuitScenario,
  simulationTwoGateScenario,
]

/**
 * Run one scenario on the engine.
 * @param scenario - A recovered circuit plus, where recorded, its truth table
 * @returns Pass/fail and the vector the chip produced
 */
export function runScenario(scenario: Scenario): CoreScenarioResult {
  return { name: scenario.name, ok: false, errors: ['not implemented'], outputs: [], pins: [] }
}

/** Run every recovered scenario. */
export function runAllScenarios(): CoreScenarioResult[] {
  return SCENARIOS.map(runScenario)
}
