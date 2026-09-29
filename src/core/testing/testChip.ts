/**
 * `hacer test`'s engine path, shared by every surface that tests a chip from its sources: the chip
 * under test is the `.hdl`'s own, never a builtin of the same name, and a failure reads as the
 * `.cmp` writes it.
 */
import { combineRegistries } from '../chips/combineRegistries'
import { registerProject1Builtins } from '../chips/builtins/project01'
import { createChipRegistry, type ChipRegistry } from '../chips/registry'
import { isBuiltinChip, type ChipDefinition } from '../chips/types'
import { hdlChipDefinition } from '../hdl/compiler'
import { parseHDL } from '../hdl/parser'
import type { HDLChip } from '../hdl/types'
import { parseCmp } from './cmpParser'
import { runTest } from './engine'
import { formatColumnValue } from './formatColumnValue'
import { parseTST } from './tstParser'
import type { TSTOutputColumn, TSTScript } from './types'

/** A chip test's verdict. */
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

/** A source file's text; `path` only names it in errors. */
export type TestSource = { path: string; source: string }

/** The `.hdl`'s own chip, the registry it runs in, and the parsed `.tst`. */
export type ChipTest = { chip: string; script: TSTScript; own: ChipDefinition; registry: ChipRegistry }

export const chipTestError = (chip: string | null, error: string): TestReport => ({
  status: 'error',
  chip,
  rows: null,
  failure: null,
  error,
})

const firstParseError = (file: TestSource, errors: { line: number; column: number; message: string }[]): string =>
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
  return column && Number.isInteger(number) ? formatColumnValue(number, column) : value
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

const isReport = (value: object): value is TestReport => 'status' in value

function parseSources(hdlFile: TestSource, tstFile: TestSource): Parsed | TestReport {
  const hdl = parseHDL(hdlFile.source)
  if (!hdl.success) return chipTestError(null, firstParseError(hdlFile, hdl.errors))
  const chip = hdl.chip.name
  const tst = parseTST(tstFile.source)
  if (!tst.success) return chipTestError(chip, firstParseError(tstFile, tst.errors))
  return { ast: hdl.chip, chip, script: tst.script }
}

function loadChip({ ast, chip, script }: Parsed, hdlFile: TestSource, tstFile: TestSource): ChipTest | TestReport {
  // `load` swaps in whatever the registry holds under the name it gives, so a `.tst` naming
  // another chip would test that chip's builtin, not this file.
  for (const cmd of script.commands) {
    if (cmd.type === 'load' && loadedChip(cmd.filename) !== chip) {
      return chipTestError(chip, `${tstFile.path} loads ${cmd.filename}, but ${hdlFile.path} defines ${chip}`)
    }
  }

  const builtins = createChipRegistry()
  registerProject1Builtins(builtins)
  const own = ownChip(ast, hdlFile.source, builtins)
  if (typeof own === 'string') return chipTestError(chip, own)
  const ownRegistry = createChipRegistry()
  ownRegistry.register(own)

  // The file's chip first, so `load` never reaches the builtin of the same name; its parts
  // still resolve to the builtins.
  return { chip, script, own, registry: combineRegistries(ownRegistry, builtins) }
}

/** The `.hdl`'s chip ready to run its `.tst` against, or the error report saying why not. */
export function loadChipTest(hdlFile: TestSource, tstFile: TestSource): ChipTest | TestReport {
  const parsed = parseSources(hdlFile, tstFile)
  return isReport(parsed) ? parsed : loadChip(parsed, hdlFile, tstFile)
}

/** Run the `.tst` on the `.hdl`'s own chip and compare it with the `.cmp`. */
export function testChip(hdlFile: TestSource, tstFile: TestSource, cmpFile: TestSource): TestReport {
  const parsed = parseSources(hdlFile, tstFile)
  if (isReport(parsed)) return parsed
  const { chip } = parsed
  const standIn = builtinStandIn(parsed.ast)
  if (standIn !== null) return chipTestError(chip, standIn)
  const cmp = parseCmp(cmpFile.source)
  if (!cmp.success) return chipTestError(chip, firstParseError(cmpFile, cmp.errors))
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
