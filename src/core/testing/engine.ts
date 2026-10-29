// src/core/testing/engine.ts
import type { ChipDefinition } from '../chips/types'
import type { ChipRegistry } from '../chips/registry'
import { ChipCompileError, evaluateChip } from '../chips/evaluateChip'
import { parseHDL } from '../hdl/parser'
import type { TSTOutputColumn, TSTScript } from './types'
import type { CmpFile } from './cmpParser'
import { compareCmpRow } from './cmpParser'
import { headerCell } from './headerCell'

export interface RunTestOptions {
  registry: ChipRegistry
  chip?: ChipDefinition
  cmpData?: CmpFile
  loadCmpFile?: (filename: string) => CmpFile | null
  maxDepth?: number
}

export interface OutputRow {
  values: Record<string, number>
}

export interface TestFailure {
  /** The `.cmp`'s data row, counted from 0; its header line is `HEADER_ROW`. */
  row: number
  column: string
  expected: string
  actual: string
}

export interface TestResult {
  passed: boolean
  totalSteps: number
  passedSteps: number
  outputRows: OutputRow[]
  firstFailure: TestFailure | null
  error: string | null
}

/**
 * Chip name from a `.tst` `load` filename — strip the last extension (`Not.hdl` → `Not`).
 * A leading-dot name (dot at index 0) has no real extension, so it is returned unchanged.
 * Exported for unit testing; not part of the package's public surface (`index.ts`).
 */
export function stripExt(filename: string): string {
  const dot = filename.lastIndexOf('.')
  return dot > 0 ? filename.slice(0, dot) : filename
}

/** The commands a run executes: as the reference's run() does, it ends at the first `!`. */
export function commandsRun(script: TSTScript): TSTScript['commands'] {
  const end = script.commands.findIndex((cmd) => cmd.type === 'break')
  return end < 0 ? script.commands : script.commands.slice(0, end)
}

/**
 * Names a `.tst` may use for a chip: its input and output pins and, for an HDL chip, the wires
 * between its parts, which the reference IDE resolves as well. The evaluator returns only the
 * outputs, so an internal wire's column still prints 0.
 */
function knownNames(chip: ChipDefinition): Set<string> {
  const names = new Set([...chip.inputs, ...chip.outputs].map((p) => p.name))
  if (chip.implementation.type !== 'hdl') return names
  const parsed = parseHDL(chip.implementation.source)
  if (!parsed.success) return names
  for (const part of parsed.chip.parts) {
    for (const conn of part.connections) {
      if (conn.external !== 'true' && conn.external !== 'false') names.add(conn.external)
    }
  }
  return names
}

/** The reference's clock column: any `output-list` may name it (Project 3 onward). */
const TIME_COLUMN = 'time'

/** Each bare output-list name at its pin's width, as the reference IDE sizes it once it holds the chip. */
function resolveColumns(columns: readonly TSTOutputColumn[], chip: ChipDefinition): TSTOutputColumn[] {
  const widths = new Map([...chip.inputs, ...chip.outputs].map((pin) => [pin.name, pin.width]))
  return columns.map((column) => {
    const width = column.widthFromChip ? widths.get(column.name) : undefined
    return width === undefined ? column : { ...column, width }
  })
}

/** The script with each bare output-list name at its pin's width. */
export function resolveOutputColumns(script: TSTScript, chip: ChipDefinition): TSTScript {
  return { commands: script.commands.map((cmd) => (cmd.type === 'output-list' ? { ...cmd, columns: resolveColumns(cmd.columns, chip) } : cmd)) }
}

/** The row of a failure in a `.cmp`'s header line, which comes before its data row 0. */
export const HEADER_ROW = -1

/** The reference compares a `.cmp`'s header line as it prints it: the column count, then each cell against its entry's name cut to its column. */
function gradeHeader(cmp: CmpFile, columns: readonly TSTOutputColumn[]): string | TestFailure | null {
  if (cmp.columns.length !== columns.length) return `.cmp has ${cmp.columns.length} columns, but the output list has ${columns.length}`
  const cuts = columns.map((column) => headerCell(column).trim())
  const index = cuts.findIndex((cut, i) => cut !== cmp.columns[i].name)
  return index < 0 ? null : { row: HEADER_ROW, column: columns[index].name, expected: cmp.columns[index].name, actual: cuts[index] }
}

/** Column i of the `.cmp` is output-list entry i; before the `.cmp`'s first row, its header line is graded. */
function gradeRow(cmp: CmpFile, row: number, values: Record<string, number>, columns: readonly TSTOutputColumn[], chip: ChipDefinition | null): string | TestFailure | null {
  const header = row === 0 ? gradeHeader(cmp, chip ? resolveColumns(columns, chip) : columns) : null
  if (header !== null) return header
  const named = cmp.columns.map((c, i) => ({ ...c, name: i < columns.length ? columns[i].name : c.name }))
  const mismatch = compareCmpRow(named.map((c) => values[c.name] ?? 0), cmp.rows[row], named, row)
  return mismatch && { row, column: mismatch.column, expected: String(mismatch.expected), actual: String(mismatch.actual) }
}

export function runTest(script: TSTScript, options: RunTestOptions): TestResult {
  const { registry, maxDepth } = options
  const inputs: Record<string, number> = {}
  let lastOutputs: Record<string, number> = {}
  let activeChip: ChipDefinition | null = options.chip ?? null
  let outputList: TSTOutputColumn[] = []
  const cmpExplicit = options.cmpData !== undefined
  let cmpData: CmpFile | undefined = options.cmpData
  let cmpRowIndex = 0
  const outputRows: OutputRow[] = []

  const fail = (error: string): TestResult => ({
    passed: false,
    totalSteps: outputRows.length,
    passedSteps: cmpRowIndex,
    outputRows,
    firstFailure: null,
    error,
  })

  const known = new Map<ChipDefinition, Set<string>>()
  const hasPin = (chip: ChipDefinition, name: string): boolean => {
    let names = known.get(chip)
    if (!names) {
      names = knownNames(chip)
      known.set(chip, names)
    }
    return names.has(name)
  }
  // The reference web IDE skips an unknown name without a word, so a typo in a script
  // passes unnoticed; here it fails the run instead.
  const unknownPin = (chip: ChipDefinition, command: 'set' | 'output-list', pin: string, line: number | undefined): TestResult =>
    fail(`${line === undefined ? '' : `line ${line}: `}${command} names pin "${pin}", but chip ${chip.name} has no such pin`)

  for (const cmd of commandsRun(script)) {
    switch (cmd.type) {
      case 'load': {
        const name = stripExt(cmd.filename)
        const def = registry.get(name)
        if (!def) return fail(`Chip "${name}" not found`)
        activeChip = def
        break
      }
      case 'compare-to': {
        // Explicit cmpData wins. Otherwise the script declared it wants comparison,
        // so a compare-to target we cannot resolve must FAIL the run — never skip
        // verification silently (that would let a broken chip report passed: true).
        if (!cmpExplicit) {
          const resolved = options.loadCmpFile?.(cmd.filename) ?? null
          if (!resolved) return fail(`compare-to "${cmd.filename}" could not be resolved`)
          cmpData = resolved
          cmpRowIndex = 0
        }
        break
      }
      case 'output-list': {
        // Builtin-state reads such as `DRegister[]` (Project 5 CPU.tst) do not parse yet; they
        // become known names with #207 and the Project 3–5 conformance work.
        const chip = activeChip
        const unknown = chip ? cmd.columns.find((c) => c.name !== TIME_COLUMN && !hasPin(chip, c.name)) : undefined
        if (chip && unknown) return unknownPin(chip, 'output-list', unknown.name, cmd.line)
        outputList = cmd.columns
        break
      }
      case 'set':
        if (activeChip && !hasPin(activeChip, cmd.pin)) return unknownPin(activeChip, 'set', cmd.pin, cmd.line)
        inputs[cmd.pin] = cmd.value
        break
      case 'eval':
        if (!activeChip) return fail('eval before a chip was loaded')
        try {
          lastOutputs = evaluateChip(activeChip, inputs, registry, maxDepth === undefined ? undefined : { maxDepth })
        } catch (e) {
          return fail(e instanceof ChipCompileError ? e.refusals.join('; ') : e instanceof Error ? e.message : String(e))
        }
        break
      case 'output': {
        const values: Record<string, number> = {}
        for (const { name } of outputList) {
          values[name] = lastOutputs[name] ?? inputs[name] ?? 0
        }
        outputRows.push({ values })
        if (cmpData) {
          if (cmpRowIndex >= cmpData.rows.length) {
            return fail(`Output row count ${outputRows.length} exceeds .cmp row count ${cmpData.rows.length}`)
          }
          const graded = gradeRow(cmpData, cmpRowIndex, values, outputList, activeChip)
          if (typeof graded === 'string') return fail(graded)
          if (graded) return { passed: false, totalSteps: outputRows.length, passedSteps: cmpRowIndex, outputRows, firstFailure: graded, error: null }
          cmpRowIndex++
        }
        break
      }
      case 'output-file':
        break
    }
  }

  if (cmpData && cmpRowIndex !== cmpData.rows.length) {
    // Parallel to the surplus-row guard above; both report emitted vs expected counts.
    return fail(`Output row count ${outputRows.length} is fewer than .cmp row count ${cmpData.rows.length}`)
  }

  return {
    passed: true,
    totalSteps: outputRows.length,
    passedSteps: cmpRowIndex,
    outputRows,
    firstFailure: null,
    error: null,
  }
}
