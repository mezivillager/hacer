/** `hacer test` and `hacer run-tst` as a pure function: argv and a file reader in, exit code and text out. */
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
import type { ChipDefinition, ChipRegistry, HDLChip, TSTOutputColumn, TSTScript } from '@/core'
import { outRow, outTable } from './outTable'

export interface CliOutcome {
  /** 0 pass, or run-tst ran · 1 the chip failed, or could not be tested or run · 2 usage error */
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
  /** The first mismatch. `row` counts the `.cmp`'s data rows from 1; values read as the `.cmp` writes them. */
  failure: { row: number; column: string; expected: string; actual: string } | null
  error: string | null
}

type SourceFile = { path: string; source: string }

const USAGE = 'usage: hacer test [--json] <chip.hdl> <chip.tst> <chip.cmp>\n       hacer run-tst <chip.hdl> <chip.tst>\n'
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

/**
 * The chips nand2tetris gives rather than asks for: the reference IDE ships each as a `BUILTIN`
 * `.hdl`. It ships RAM16K that way too, but Project 3 asks for it, so it is left out.
 */
const PRIMITIVES = new Set(['Nand', 'DFF', 'ARegister', 'DRegister', 'Screen', 'Keyboard', 'ROM32K'])

/** A green must come from the design under test, so only a primitive may be BUILTIN, and only as itself. */
function builtinStandIn({ name, builtin }: HDLChip): string | null {
  if (builtin === undefined || (builtin === name && PRIMITIVES.has(name))) return null
  return `BUILTIN ${builtin} in ${name}: hacer test needs ${name} built from parts; only a primitive (${[...PRIMITIVES].join(', ')}) may be BUILTIN, as itself`
}

/** The output-list column in force at the script's `row`-th `output`, counted from 0. */
function listedColumn(script: TSTScript, row: number, name: string): TSTOutputColumn | undefined {
  let columns: TSTOutputColumn[] = []
  let outputs = 0
  for (const cmd of script.commands) {
    if (cmd.type === 'output-list') columns = cmd.columns
    else if (cmd.type === 'output' && outputs++ === row) break
  }
  return columns.find((column) => column.name === name)
}

/** A value as the `.tst`'s output-list writes it, which is how its `.cmp` holds it. */
function asListed(column: TSTOutputColumn | undefined, value: string): string {
  const number = Number(value)
  return column && Number.isInteger(number) ? outRow([column], [number]).slice(1, -1).trim() : value
}

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

type Parsed = { ast: HDLChip; chip: string; script: TSTScript }
type Loaded = { own: ChipDefinition; registry: ChipRegistry }

const isReport = (value: object): value is TestReport => 'status' in value

function parseSources(hdlFile: SourceFile, tstFile: SourceFile): Parsed | TestReport {
  const hdl = parseHDL(hdlFile.source)
  if (!hdl.success) return errorReport(null, firstParseError(hdlFile, hdl.errors))
  const chip = hdl.chip.name
  const tst = parseTST(tstFile.source)
  if (!tst.success) return errorReport(chip, firstParseError(tstFile, tst.errors))
  return { ast: hdl.chip, chip, script: tst.script }
}

function loadChip({ ast, chip, script }: Parsed, hdlFile: SourceFile, tstFile: SourceFile): Loaded | TestReport {
  // `load` swaps in whatever the registry holds under the name it gives, so a `.tst` naming
  // another chip would test that chip's builtin, not this file.
  for (const cmd of script.commands) {
    if (cmd.type === 'load' && loadedChip(cmd.filename) !== chip) {
      return errorReport(chip, `${tstFile.path} loads ${cmd.filename}, but ${hdlFile.path} defines ${chip}`)
    }
  }

  const builtins = createChipRegistry()
  registerProject1Builtins(builtins)
  const own = ownChip(ast, hdlFile.source, builtins)
  if (typeof own === 'string') return errorReport(chip, own)
  const ownRegistry = createChipRegistry()
  ownRegistry.register(own)

  // The file's chip first, so `load` never reaches the builtin of the same name; its parts
  // still resolve to the builtins.
  return { own, registry: combineRegistries(ownRegistry, builtins) }
}

export function testChip(hdlFile: SourceFile, tstFile: SourceFile, cmpFile: SourceFile): TestReport {
  const parsed = parseSources(hdlFile, tstFile)
  if (isReport(parsed)) return parsed
  const { chip } = parsed
  const standIn = builtinStandIn(parsed.ast)
  if (standIn !== null) return errorReport(chip, standIn)
  const cmp = parseCmp(cmpFile.source)
  if (!cmp.success) return errorReport(chip, firstParseError(cmpFile, cmp.errors))
  const loaded = loadChip(parsed, hdlFile, tstFile)
  if (isReport(loaded)) return loaded

  const result = runTest(parsed.script, { registry: loaded.registry, chip: loaded.own, cmpData: cmp.file })
  const rows = { passed: result.passedSteps, expected: cmp.file.rows.length }
  if (result.passed) return { status: 'pass', chip, rows, failure: null, error: null }
  if (result.firstFailure) {
    const { row, column, expected, actual } = result.firstFailure
    const listed = listedColumn(parsed.script, row, column)
    const failure = { row: row + 1, column, expected: asListed(listed, expected), actual: asListed(listed, actual) }
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

/** Exit 2; under `--json` the usage comes as a report on stdout, like every other `--json` outcome. */
const usageError = (json: boolean): CliOutcome =>
  json
    ? { exitCode: 2, stdout: `${JSON.stringify(errorReport(null, USAGE.trimEnd()))}\n`, stderr: '' }
    : { exitCode: 2, stdout: '', stderr: USAGE }

/** `hacer run-tst`: the `.out` table on stdout, compared with nothing; exit 1 only when the script fails to run. */
function runTst(hdlPath: string, tstPath: string, readFile: (path: string) => string): CliOutcome {
  const failed = (table: string, report: TestReport): CliOutcome => ({ exitCode: 1, stdout: table, stderr: `${formatLine(report)}\n` })
  let hdlFile: SourceFile, tstFile: SourceFile
  try {
    hdlFile = { path: hdlPath, source: readFile(hdlPath) }
    tstFile = { path: tstPath, source: readFile(tstPath) }
  } catch (e) {
    return failed('', errorReport(null, e instanceof Error ? e.message : String(e)))
  }
  const parsed = parseSources(hdlFile, tstFile)
  if (isReport(parsed)) return failed('', parsed)
  const loaded = loadChip(parsed, hdlFile, tstFile)
  if (isReport(loaded)) return failed('', loaded)
  // Without its `compare-to`, the engine never looks for a `.cmp`.
  const script = { commands: parsed.script.commands.filter((cmd) => cmd.type !== 'compare-to') }
  const result = runTest(script, { registry: loaded.registry, chip: loaded.own })
  const table = outTable(script, result.outputRows)
  if (result.error !== null) return failed(table, errorReport(parsed.chip, result.error))
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
    report = errorReport(null, e instanceof Error ? e.message : String(e))
  }
  const stdout = json ? JSON.stringify(report) : formatLine(report)
  return { exitCode: report.status === 'pass' ? 0 : 1, stdout: `${stdout}\n`, stderr: '' }
}
