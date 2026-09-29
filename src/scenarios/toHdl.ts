import type { Scenario } from './types'

export const SCENARIO_CHIP = 'Scenario'

export type ScenarioCheck = { label: string; signal: string; value: number }

export interface ScenarioChip {
  hdl: string
  inputs: Array<{ name: string; value: number }>
  outputs: string[]
  pins: Array<[string, string]>
  expected: ScenarioCheck[]
}

export type ScenarioChipResult = { ok: true; chip: ScenarioChip } | { ok: false; errors: string[] }

export function scenarioToHdl(_scenario: Scenario): ScenarioChipResult {
  throw new Error('not implemented')
}

export function scenarioTest(_chip: ScenarioChip): { tst: string; cmp: string } {
  throw new Error('not implemented')
}
