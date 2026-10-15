import { SCENARIO_CHIP, scenarioTest, scenarioToHdl } from '../toHdl'
import type { ChipScenario, Scenario } from '../types'

export type AsChipScenarioResult = { ok: true; scenario: ChipScenario } | { ok: false; errors: string[] }

/** What a surface tests: a chip scenario as it is, or a recovered circuit as its NAND chip. */
export function asChipScenario(scenario: Scenario | ChipScenario): AsChipScenarioResult {
  if ('tst' in scenario) return { ok: true, scenario }
  const translated = scenarioToHdl(scenario)
  if (!translated.ok) return translated
  const { hdl } = translated.chip
  return { ok: true, scenario: { name: scenario.name, chip: SCENARIO_CHIP, hdl, ...scenarioTest(translated.chip) } }
}
