/**
 * CLI driver (#205). Writes each scenario as `Scenario.hdl` plus the `.tst`/`.cmp` pair for its
 * recorded vector, and runs `hacer test --json` on them in a child process: the verdict is the
 * CLI's. `bin` is the built entry: `pnpm run build:cli`, or that build redirected to any directory.
 */
import { spawnSync } from 'node:child_process'
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import type { TestReport } from '@/cli/runCli'
import { SCENARIO_CHIP, scenarioTest, scenarioToHdl } from '../toHdl'
import type { Scenario } from '../types'
import type { CoreScenarioResult } from './core'

/** The verdict half of the core driver's result; `errors` holds the CLI's first mismatch or error. */
export type CliScenarioResult = Pick<CoreScenarioResult, 'name' | 'ok' | 'errors'>

/** Run one scenario through the `hacer` bin. One that does not translate never spawns it. */
export function runCliScenario(scenario: Scenario, bin: string): CliScenarioResult {
  const name = scenario.name
  const translated = scenarioToHdl(scenario)
  if (!translated.ok) return { name, ok: false, errors: translated.errors }

  const files = { hdl: translated.chip.hdl, ...scenarioTest(translated.chip) }
  const dir = mkdtempSync(path.join(tmpdir(), 'hacer-scenario-'))
  try {
    const paths = (['hdl', 'tst', 'cmp'] as const).map((ext) => {
      const file = path.join(dir, `${SCENARIO_CHIP}.${ext}`)
      writeFileSync(file, files[ext])
      return file
    })
    const run = spawnSync(process.execPath, [bin, 'test', '--json', ...paths], { encoding: 'utf8' })
    if (run.status !== 0 && run.status !== 1) {
      return { name, ok: false, errors: [`hacer exited ${String(run.status)}: ${run.stderr || String(run.error)}`] }
    }
    const { failure, error } = JSON.parse(run.stdout) as TestReport
    const found = failure ? `row ${failure.row}: ${failure.column} expected ${failure.expected}, got ${failure.actual}` : error
    return { name, ok: run.status === 0, errors: found === null ? [] : [found] }
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
}
