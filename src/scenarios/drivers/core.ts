/**
 * Core driver (#195). Each recovered circuit is a NAND chip: unwired inputs are
 * chip inputs (toggled, else 0), a wire is one shared signal, and every gate
 * output is a chip output. `compileHDL` and the Project 1 registry evaluate it.
 * No store driver — that drove `CircuitState`, removed at ADR-0020.
 */
import {
  compileHDL,
  createChipRegistry,
  DEFAULT_MAX_DEPTH,
  evaluateChipWithCtx,
  parseHDL,
  registerProject1Builtins,
  type EvalContext,
} from '@/core'
import { chainCircuitScenario, circuitBuildScenario } from '../circuitBuilding'
import { threeGateScenario } from '../nand3'
import { simulationTwoGateScenario } from '../simulation'
import { scenarioToHdl } from '../toHdl'
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

export const SCENARIOS: readonly Scenario[] = [
  threeGateScenario,
  circuitBuildScenario,
  chainCircuitScenario,
  simulationTwoGateScenario,
]

function mismatch(errors: string[], label: string, expected: number | undefined, got: number | undefined): void {
  if (expected !== got) errors.push(`${label}: expected ${String(expected)}, got ${String(got)}`)
}

/**
 * Run one scenario on the engine.
 * @param scenario - A recovered circuit plus, where recorded, its truth table
 * @returns Pass/fail and the vector the chip produced. Mismatches are `errors`, not throws.
 */
export function runScenario(scenario: Scenario): CoreScenarioResult {
  const name = scenario.name
  const errors: string[] = []
  const blank = (): CoreScenarioResult => ({ name, ok: false, errors, outputs: [], pins: [] })
  const translated = scenarioToHdl(scenario)
  if (!translated.ok) return { ...blank(), errors: translated.errors }
  const { chip } = translated

  const parsed = parseHDL(chip.hdl)
  if (!parsed.success) return { ...blank(), errors: parsed.errors.map((error) => error.message) }

  const registry = createChipRegistry()
  registerProject1Builtins(registry)
  const compiled = compileHDL(parsed.chip, registry)
  if (!compiled.success) return { ...blank(), errors: compiled.errors.map((error) => error.message) }

  const inputs = Object.fromEntries(chip.inputs.map((input) => [input.name, input.value]))
  const ctx: EvalContext = { registry, depth: 0, maxDepth: DEFAULT_MAX_DEPTH, evalChip: evaluateChipWithCtx }
  const signals: Record<string, number> = { ...inputs, ...compiled.evaluate(inputs, ctx) }
  const read = (signal: string): number => signals[signal] ?? 0
  const outputs = chip.outputs.map(read)
  const pins = chip.pins.map(([a, b]): [number, number] => [read(a), read(b)])
  for (const { label, signal, value } of chip.expected) mismatch(errors, label, value, read(signal))

  return { name, ok: errors.length === 0, errors, outputs, pins }
}

/** Run every recovered scenario. */
export function runAllScenarios(): CoreScenarioResult[] {
  return SCENARIOS.map(runScenario)
}
