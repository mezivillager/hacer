/** `hacer test` and `hacer run-tst` as a pure function: argv and a file reader in, exit code and text out. */
import { chipTestError, loadChipTest, runTest, testChip } from '@/core'
import type { TestReport, TestSource } from '@/core'
import { outTable } from './outTable'

/** What `--json` prints. */
export type { TestReport } from '@/core'

export interface CliOutcome {
  /** 0 pass, or run-tst ran · 1 the chip failed, or could not be tested or run · 2 usage error */
  exitCode: 0 | 1 | 2
  stdout: string
  stderr: string
}

const USAGE = 'usage: hacer test [--json] <chip.hdl> <chip.tst> <chip.cmp>\n       hacer run-tst <chip.hdl> <chip.tst>\n'
const EXTENSIONS = ['.hdl', '.tst', '.cmp']

function formatLine(report: TestReport): string {
  const { chip, rows, failure, error } = report
  if (report.status === 'pass' && rows) return `PASS ${chip} ${rows.passed}/${rows.expected} rows`
  if (failure) return `FAIL ${chip} row ${failure.row}: ${failure.column} expected ${failure.expected}, got ${failure.actual}`
  return chip === null ? `ERROR ${error}` : `ERROR ${chip}: ${error}`
}

/** Exit 2; under `--json` the usage comes as a report on stdout, like every other `--json` outcome. */
const usageError = (json: boolean): CliOutcome =>
  json
    ? { exitCode: 2, stdout: `${JSON.stringify(chipTestError(null, USAGE.trimEnd()))}\n`, stderr: '' }
    : { exitCode: 2, stdout: '', stderr: USAGE }

/** `hacer run-tst`: the `.out` table on stdout, compared with nothing; exit 1 only when the script fails to run. */
function runTst(hdlPath: string, tstPath: string, readFile: (path: string) => string): CliOutcome {
  const failed = (table: string, report: TestReport): CliOutcome => ({ exitCode: 1, stdout: table, stderr: `${formatLine(report)}\n` })
  let hdlFile: TestSource, tstFile: TestSource
  try {
    hdlFile = { path: hdlPath, source: readFile(hdlPath) }
    tstFile = { path: tstPath, source: readFile(tstPath) }
  } catch (e) {
    return failed('', chipTestError(null, e instanceof Error ? e.message : String(e)))
  }
  const loaded = loadChipTest(hdlFile, tstFile)
  if ('status' in loaded) return failed('', loaded)
  // Without its `compare-to`, the engine never looks for a `.cmp`.
  const script = { commands: loaded.script.commands.filter((cmd) => cmd.type !== 'compare-to') }
  const result = runTest(script, { registry: loaded.registry, chip: loaded.own })
  const table = outTable(script, result.outputRows)
  if (result.error !== null) return failed(table, chipTestError(loaded.chip, result.error))
  return { exitCode: 0, stdout: table, stderr: '' }
}

export function runCli(argv: readonly string[], readFile: (path: string) => string): CliOutcome {
  const json = argv.includes('--json')
  const [command, ...paths] = argv.filter((arg) => arg !== '--json')
  if (command === '--help' || command === '-h') return { exitCode: 0, stdout: USAGE, stderr: '' }
  if (command === 'run-tst' && !json && paths.length === 2 && paths.every((p, i) => p.endsWith(EXTENSIONS[i]))) {
    return runTst(paths[0], paths[1], readFile)
  }
  if (command !== 'test' || paths.length !== 3 || !paths.every((p, i) => p.endsWith(EXTENSIONS[i]))) {
    return usageError(json)
  }

  let report: TestReport
  try {
    const [hdl, tst, cmp] = paths.map((path) => ({ path, source: readFile(path) }))
    report = testChip(hdl, tst, cmp)
  } catch (e) {
    report = chipTestError(null, e instanceof Error ? e.message : String(e))
  }
  const stdout = json ? JSON.stringify(report) : formatLine(report)
  return { exitCode: report.status === 'pass' ? 0 : 1, stdout: `${stdout}\n`, stderr: '' }
}
