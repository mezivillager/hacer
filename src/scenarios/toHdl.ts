/**
 * A scenario as a NAND chip, shared by every driver: unwired inputs are chip inputs (toggled, else
 * 0), a wire is one shared signal, and each gate's output is a chip output. The recorded vector
 * becomes checks on those signals; `scenarioTest` writes it as the `.tst`/`.cmp` pair a surface runs.
 */
import { outHeader, outRow } from '@/cli/outTable'
import type { TSTOutputColumn } from '@/core'
import type { NandScenario, Scenario, SimulationScenario, WirePlan } from './types'

/** The chip's name, and so the base name of its `.hdl`, `.tst` and `.cmp`. */
export const SCENARIO_CHIP = 'Scenario'

/** `signal` should carry `value`; `label` names it as the scenario does. */
export type ScenarioCheck = { label: string; signal: string; value: number }

export interface ScenarioChip {
  hdl: string
  /** In declaration order, each with the value the scenario drives it to. */
  inputs: Array<{ name: string; value: number }>
  outputs: string[]
  /** The signals each gate's `a` and `b` read. */
  pins: Array<[string, string]>
  expected: ScenarioCheck[]
}

export type ScenarioChipResult = { ok: true; chip: ScenarioChip } | { ok: false; errors: string[] }

const outName = (gate: number): string => `g${gate}out`
const PINS = [['in-0', 'a'], ['in-1', 'b']] as const

const isSimulation = (scenario: NandScenario | SimulationScenario): scenario is SimulationScenario =>
  Array.isArray(scenario.expectations.outputs)

function checksOf(scenario: Scenario, outputs: string[], pins: Array<[string, string]>, errors: string[]): ScenarioCheck[] {
  const expected: ScenarioCheck[] = []
  if (!('expectations' in scenario)) return expected
  const check = (label: string, value: number, signal: string | undefined): void => {
    if (signal === undefined) errors.push(`${label}: expected ${value}, got undefined`)
    else expected.push({ label, signal, value })
  }
  const { gates, wires } = scenario.expectations
  if (gates !== outputs.length) errors.push(`gates: expected ${gates}, got ${outputs.length}`)
  if (wires !== scenario.wires.length) errors.push(`wires: expected ${wires}, got ${scenario.wires.length}`)
  if (isSimulation(scenario)) {
    for (const { gateIndex, outputIndex, value } of scenario.expectations.outputs) {
      check(`gate ${gateIndex} out`, value, outputIndex === 0 ? outputs[gateIndex] : undefined)
    }
    for (const { gateIndex, inputIndex, value } of scenario.expectations.inputs ?? []) {
      check(`gate ${gateIndex} in ${inputIndex}`, value, pins[gateIndex]?.[inputIndex])
    }
  } else {
    const { gate1, gate2, gate3, gate3Inputs } = scenario.expectations.outputs
    ;[gate1, gate2, gate3].forEach((value, index) => check(`gate ${index + 1} out`, value, outputs[index]))
    gate3Inputs.forEach((value, index) => check(`gate 3 in ${index}`, value, pins[2]?.[index]))
  }
  return expected
}

/** Translate one scenario. One that is not a circuit, or records a pin it lacks, returns its errors. */
export function scenarioToHdl(scenario: Scenario): ScenarioChipResult {
  const wires: WirePlan[] = 'wire' in scenario ? [scenario.wire] : scenario.wires
  const toggles = 'wire' in scenario ? [] : scenario.toggles
  const gates = scenario.placements.map((_, gate) => gate)
  const outside = wires.filter((wire) => [wire.fromGate, wire.toGate].some((gate) => gate < 0 || gate >= gates.length))
  if (outside.length > 0) {
    return { ok: false, errors: outside.map((w) => `wire ${w.fromGate}→${w.toGate} is outside 0..${gates.length - 1}`) }
  }

  const errors: string[] = []
  const inputs: ScenarioChip['inputs'] = []
  const pins = gates.map((gate) =>
    PINS.map(([pin, suffix]) => {
      const drivers = wires.filter((wire) => wire.toGate === gate && wire.toPin === pin)
      if (drivers.length > 1) errors.push(`gate ${gate} pin ${pin} has ${drivers.length} drivers`)
      if (drivers[0]) return outName(drivers[0].fromGate)
      inputs.push({ name: `g${gate}${suffix}`, value: toggles.find((t) => t.gate === gate && t.pin === pin)?.value ?? 0 })
      return `g${gate}${suffix}`
    }) as [string, string],
  )
  if (errors.length > 0) return { ok: false, errors }
  const outputs = gates.map(outName)
  const expected = checksOf(scenario, outputs, pins, errors)
  if (errors.length > 0) return { ok: false, errors }

  const parts = pins.map(([a, b], gate) => `Nand(a=${a}, b=${b}, out=${outName(gate)});`)
  const ins = inputs.map((input) => input.name).join(', ')
  const hdl = [`CHIP ${SCENARIO_CHIP} {`, `IN ${ins};`, `OUT ${outputs.join(', ')};`, 'PARTS:', ...parts, '}'].join('\n')
  return { ok: true, chip: { hdl, inputs, outputs, pins, expected } }
}

/** A one-bit column just wide enough for its name, so the `.cmp` header never cuts it. */
function column(name: string): TSTOutputColumn {
  const pad = Math.ceil((name.length - 1) / 2)
  return { name, format: 'B', padLeft: pad, width: 1, padRight: pad }
}

/** The `.tst` that drives the inputs and outputs one row; the `.cmp` holds the inputs, then each check. */
export function scenarioTest(chip: ScenarioChip): { tst: string; cmp: string } {
  const cells = [...chip.inputs, ...chip.expected.map(({ signal, value }) => ({ name: signal, value }))]
  const columns = cells.map((cell) => column(cell.name))
  const list = columns.map((c) => `${c.name}%B${c.padLeft}.1.${c.padRight}`).join(' ')
  const sets = chip.inputs.map((input) => `set ${input.name} ${input.value},`)
  const head = [`load ${SCENARIO_CHIP}.hdl,`, `compare-to ${SCENARIO_CHIP}.cmp,`, `output-list ${list};`]
  const tst = [...head, ...sets, 'eval,', 'output;', ''].join('\n')
  return { tst, cmp: `${outHeader(columns)}\n${outRow(columns, cells.map((cell) => cell.value))}\n` }
}
