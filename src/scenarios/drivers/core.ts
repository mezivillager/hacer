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
import type { NandScenario, Scenario, SimulationScenario, TogglePlan, WirePlan } from '../types'

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

type InputPin = 'in-0' | 'in-1'
type Binding =
  | { driven: false; signal: string }
  | { driven: true; signal: string; fromGate: number }

const outName = (gate: number): string => `g${gate}out`
const extName = (gate: number, pin: InputPin): string => `g${gate}${pin === 'in-0' ? 'a' : 'b'}`

function wiresOf(scenario: Scenario): WirePlan[] {
  return 'wire' in scenario ? [scenario.wire] : scenario.wires
}

function togglesOf(scenario: Scenario): TogglePlan[] {
  return 'wire' in scenario ? [] : scenario.toggles
}

function bindInput(gate: number, pin: InputPin, wires: readonly WirePlan[]): Binding | string {
  const hits = wires.filter((wire) => wire.toGate === gate && wire.toPin === pin)
  const hit = hits[0]
  if (hits.length > 1) return `gate ${gate} pin ${pin} has ${hits.length} drivers`
  if (hit) return { driven: true, signal: outName(hit.fromGate), fromGate: hit.fromGate }
  return { driven: false, signal: extName(gate, pin) }
}

function readPin(binding: Binding, inputs: Record<string, number>, signals: Record<string, number>): number {
  return binding.driven ? (signals[outName(binding.fromGate)] ?? 0) : (inputs[binding.signal] ?? 0)
}

function isNandScenario(scenario: Scenario): scenario is NandScenario {
  return 'expectations' in scenario && !Array.isArray(scenario.expectations.outputs)
}

function isSimulationScenario(scenario: Scenario): scenario is SimulationScenario {
  return 'expectations' in scenario && Array.isArray(scenario.expectations.outputs)
}

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
  const gateCount = scenario.placements.length
  const wires = wiresOf(scenario)
  const toggles = togglesOf(scenario)
  const errors: string[] = []
  const blank = (): CoreScenarioResult => ({ name, ok: false, errors, outputs: [], pins: [] })

  for (const wire of wires) {
    if (wire.fromGate < 0 || wire.fromGate >= gateCount || wire.toGate < 0 || wire.toGate >= gateCount) {
      errors.push(`wire ${wire.fromGate}→${wire.toGate} is outside 0..${gateCount - 1}`)
    }
  }
  if (errors.length > 0) return blank()

  const bindings: Binding[][] = []
  for (let gate = 0; gate < gateCount; gate++) {
    const row: Binding[] = []
    for (const pin of ['in-0', 'in-1'] as const) {
      const bound = bindInput(gate, pin, wires)
      if (typeof bound === 'string') errors.push(bound)
      else row.push(bound)
    }
    bindings.push(row)
  }
  if (errors.length > 0) return blank()

  const inputs: Record<string, number> = {}
  const parts: string[] = []
  const chipIns: string[] = []
  for (let gate = 0; gate < gateCount; gate++) {
    const row = bindings[gate] ?? []
    ;(['in-0', 'in-1'] as const).forEach((pin, index) => {
      const binding = row[index]
      if (!binding || binding.driven) return
      const toggle = toggles.find((item) => item.gate === gate && item.pin === pin)
      chipIns.push(binding.signal)
      inputs[binding.signal] = toggle?.value ?? 0
    })
    parts.push(`Nand(a=${row[0]?.signal}, b=${row[1]?.signal}, out=${outName(gate)});`)
  }

  const parsed = parseHDL(
    ['CHIP Scenario {', `IN ${chipIns.join(', ')};`, `OUT ${Array.from(bindings, (_, gate) => outName(gate)).join(', ')};`, 'PARTS:', ...parts, '}'].join('\n'),
  )
  if (!parsed.success) return { ...blank(), errors: parsed.errors.map((error) => error.message) }

  const registry = createChipRegistry()
  registerProject1Builtins(registry)
  const compiled = compileHDL(parsed.chip, registry)
  if (!compiled.success) return { ...blank(), errors: compiled.errors.map((error) => error.message) }

  const ctx: EvalContext = { registry, depth: 0, maxDepth: DEFAULT_MAX_DEPTH, evalChip: evaluateChipWithCtx }
  const signals = compiled.evaluate(inputs, ctx)
  const outputs = bindings.map((_, gate) => signals[outName(gate)] ?? 0)
  const pins: Array<[number, number]> = bindings.map((row) => {
    const a = row[0]
    const b = row[1]
    return a && b ? [readPin(a, inputs, signals), readPin(b, inputs, signals)] : [0, 0]
  })

  if (isNandScenario(scenario) || isSimulationScenario(scenario)) {
    mismatch(errors, 'gates', scenario.expectations.gates, gateCount)
    mismatch(errors, 'wires', scenario.expectations.wires, wires.length)
  }
  if (isNandScenario(scenario)) {
    const { gate1, gate2, gate3, gate3Inputs } = scenario.expectations.outputs
    ;[gate1, gate2, gate3].forEach((value, index) => mismatch(errors, `gate ${index + 1} out`, value, outputs[index]))
    mismatch(errors, 'gate 3 in 0', gate3Inputs[0], pins[2]?.[0])
    mismatch(errors, 'gate 3 in 1', gate3Inputs[1], pins[2]?.[1])
  }
  if (isSimulationScenario(scenario)) {
    for (const output of scenario.expectations.outputs) {
      mismatch(errors, `gate ${output.gateIndex} out`, output.value, output.outputIndex === 0 ? outputs[output.gateIndex] : undefined)
    }
    for (const input of scenario.expectations.inputs ?? []) {
      const row = pins[input.gateIndex]
      const got = input.inputIndex === 0 ? row?.[0] : input.inputIndex === 1 ? row?.[1] : undefined
      mismatch(errors, `gate ${input.gateIndex} in ${input.inputIndex}`, input.value, got)
    }
  }

  return { name, ok: errors.length === 0, errors, outputs, pins }
}

/** Run every recovered scenario. */
export function runAllScenarios(): CoreScenarioResult[] {
  return SCENARIOS.map(runScenario)
}
