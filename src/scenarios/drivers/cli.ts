/**
 * CLI driver (#205). Writes each scenario's `.hdl`/`.tst`/`.cmp` (a recovered circuit's as
 * `Scenario.*`, from its recorded vector) and runs `hacer test --json` on them in a child process:
 * the verdict is the CLI's. `bin` is the built entry: `pnpm run build:cli`, or that build
 * redirected to any directory.
 */
import { spawnSync } from 'node:child_process'
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import type { TestReport } from '@/cli/runCli'
import type { ChipScenario, Scenario } from '../types'
import { asChipScenario } from './asChipScenario'
import type { CoreScenarioResult } from './core'
import { testReportErrors } from './report'

/** The verdict half of the core driver's result; `errors` holds the CLI's first mismatch or error. */
export type CliScenarioResult = Pick<CoreScenarioResult, 'name' | 'ok' | 'errors'>

/** The `--json` report on stdout, or null when there is none: a missing bin prints nothing. */
function readReport(stdout: string): TestReport | null {
  try {
    const parsed: unknown = JSON.parse(stdout)
    return typeof parsed === 'object' && parsed !== null && 'status' in parsed ? (parsed as TestReport) : null
  } catch {
    return null
  }
}

/** Run one scenario through the `hacer` bin. One that does not translate never spawns it. */
export function runCliScenario(scenario: Scenario | ChipScenario, bin: string): CliScenarioResult {
  const name = scenario.name
  const asChip = asChipScenario(scenario)
  if (!asChip.ok) return { name, ok: false, errors: asChip.errors }

  const files = asChip.scenario
  const dir = mkdtempSync(path.join(tmpdir(), 'hacer-scenario-'))
  try {
    const paths = (['hdl', 'tst', 'cmp'] as const).map((ext) => {
      const file = path.join(dir, `${files.chip}.${ext}`)
      writeFileSync(file, files[ext])
      return file
    })
    const run = spawnSync(process.execPath, [bin, 'test', '--json', ...paths], { encoding: 'utf8' })
    if (run.status !== 0 && run.status !== 1) {
      return { name, ok: false, errors: [`hacer exited ${String(run.status)}: ${run.stderr || String(run.error)}`] }
    }
    const report = readReport(run.stdout)
    if (!report) {
      const printed = (run.stderr || run.stdout).trim()
      return { name, ok: false, errors: [`hacer exited ${String(run.status)} with no JSON report: ${printed}`] }
    }
    return { name, ok: run.status === 0, errors: testReportErrors(report) }
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
}
