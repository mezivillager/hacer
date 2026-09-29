/** `hacer test <hdl> <tst> <cmp>` as a pure function: argv and a file reader in, exit code and text out. */
import {
  combineRegistries,
  createChipRegistry,
  hdlChipDefinition,
  isBuiltinChip,
  parseCmp,
  parseHDL,
  parseTST,
  registerProject1Builtins,
  runTest,
} from '@/core'
import type { ChipDefinition, ChipRegistry, HDLChip } from '@/core'

export interface CliOutcome {
  /** 0 pass · 1 the chip failed or could not be tested · 2 usage error */
  exitCode: 0 | 1 | 2
  stdout: string
  stderr: string
}

/** What `--json` prints. */
export interface TestReport {
  status: 'pass' | 'fail' | 'error'
  /** The chip the `.hdl` defines; null when it did not parse. */
  chip: string | null
  /** `.cmp` rows matched before the run stopped, of how many; null when it never started. */
  rows: { passed: number; expected: number } | null
  /** The first mismatch. `row` counts the `.cmp`'s data rows from 1. */
  failure: { row: number; column: string; expected: string; actual: string } | null
  error: string | null
}

type SourceFile = { path: string; source: string }

const USAGE = 'usage: hacer test [--json] <chip.hdl> <chip.tst> <chip.cmp>\n'
const EXTENSIONS = ['.hdl', '.tst', '.cmp']

const errorReport = (chip: string | null, error: string): TestReport => ({
  status: 'error',
  chip,
  rows: null,
  failure: null,
  error,
})

const firstParseError = (file: SourceFile, errors: { line: number; column: number; message: string }[]): string =>
  `${file.path}:${errors[0].line}:${errors[0].column}: ${errors[0].message}`

/** `load Xor.hdl` names the chip `Xor`. */
const loadedChip = (filename: string): string => filename.replace(/\.[^.]*$/, '')

/**
 * The file's own chip. `BUILTIN Nand;` runs on the builtin directly: compiled, it would look
 * `Nand` up in a registry where the file's own `Nand` comes first, and find itself.
 */
function ownChip(ast: HDLChip, source: string, builtins: ChipRegistry): ChipDefinition | string {
  const def = hdlChipDefinition(ast, source)
  if (ast.builtin === undefined) return def
  const builtin = builtins.get(ast.builtin)
  if (!builtin || !isBuiltinChip(builtin)) return `BUILTIN ${ast.builtin}: no builtin chip of that name`
  return { ...def, implementation: builtin.implementation }
}

export function testChip(hdlFile: SourceFile, tstFile: SourceFile, cmpFile: SourceFile): TestReport {
  const hdl = parseHDL(hdlFile.source)
  if (!hdl.success) return errorReport(null, firstParseError(hdlFile, hdl.errors))
  const chip = hdl.chip.name
  const tst = parseTST(tstFile.source)
  if (!tst.success) return errorReport(chip, firstParseError(tstFile, tst.errors))
  const cmp = parseCmp(cmpFile.source)
  if (!cmp.success) return errorReport(chip, firstParseError(cmpFile, cmp.errors))

  // `load` swaps in whatever the registry holds under the name it gives, so a `.tst` naming
  // another chip would test that chip's builtin, not this file.
  for (const cmd of tst.script.commands) {
    if (cmd.type === 'load' && loadedChip(cmd.filename) !== chip) {
      return errorReport(chip, `${tstFile.path} loads ${cmd.filename}, but ${hdlFile.path} defines ${chip}`)
    }
  }

  const builtins = createChipRegistry()
  registerProject1Builtins(builtins)
  const own = ownChip(hdl.chip, hdlFile.source, builtins)
  if (typeof own === 'string') return errorReport(chip, own)
  const ownRegistry = createChipRegistry()
  ownRegistry.register(own)

  // The file's chip first, so `load` never reaches the builtin of the same name; its parts
  // still resolve to the builtins.
  const registry = combineRegistries(ownRegistry, builtins)
  const result = runTest(tst.script, { registry, chip: own, cmpData: cmp.file })
  const rows = { passed: result.passedSteps, expected: cmp.file.rows.length }
  if (result.passed) return { status: 'pass', chip, rows, failure: null, error: null }
  if (result.firstFailure) {
    const failure = { ...result.firstFailure, row: result.firstFailure.row + 1 }
    return { status: 'fail', chip, rows, failure, error: null }
  }
  return { status: 'error', chip, rows, failure: null, error: result.error ?? 'the test did not pass' }
}

function formatLine(report: TestReport): string {
  const { chip, rows, failure, error } = report
  if (report.status === 'pass' && rows) return `PASS ${chip} ${rows.passed}/${rows.expected} rows`
  if (failure) return `FAIL ${chip} row ${failure.row}: ${failure.column} expected ${failure.expected}, got ${failure.actual}`
  return chip === null ? `ERROR ${error}` : `ERROR ${chip}: ${error}`
}

export function runCli(argv: readonly string[], readFile: (path: string) => string): CliOutcome {
  const json = argv.includes('--json')
  const [command, ...paths] = argv.filter((arg) => arg !== '--json')
  if (command === '--help' || command === '-h') return { exitCode: 0, stdout: USAGE, stderr: '' }
  if (command !== 'test' || paths.length !== 3 || !paths.every((p, i) => p.endsWith(EXTENSIONS[i]))) {
    return { exitCode: 2, stdout: '', stderr: USAGE }
  }

  let report: TestReport
  try {
    const [hdl, tst, cmp] = paths.map((path) => ({ path, source: readFile(path) }))
    report = testChip(hdl, tst, cmp)
  } catch (e) {
    report = errorReport(null, e instanceof Error ? e.message : String(e))
  }
  const stdout = json ? JSON.stringify(report) : formatLine(report)
  return { exitCode: report.status === 'pass' ? 0 : 1, stdout: `${stdout}\n`, stderr: '' }
}
