// src/core/testing/engine.ts
import type { ChipDefinition } from '../chips/types'
import type { ChipRegistry } from '../chips/registry'
import { evaluateChip } from '../chips/evaluateChip'
import type { TSTScript } from './types'
import type { CmpFile } from './cmpParser'
import { compareCmpRow } from './cmpParser'

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

function stripExt(filename: string): string {
  const dot = filename.lastIndexOf('.')
  return dot > 0 ? filename.slice(0, dot) : filename
}

export function runTest(script: TSTScript, options: RunTestOptions): TestResult {
  const { registry, maxDepth } = options
  const inputs: Record<string, number> = {}
  let lastOutputs: Record<string, number> = {}
  let activeChip: ChipDefinition | null = options.chip ?? null
  let outputColumns: string[] = []
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

  for (const cmd of script.commands) {
    switch (cmd.type) {
      case 'load':
        activeChip = registry.get(stripExt(cmd.filename)) ?? activeChip
        break
      case 'compare-to':
        // Explicit cmpData wins; otherwise resolve the named .cmp via loadCmpFile.
        if (!cmpExplicit && options.loadCmpFile) {
          cmpData = options.loadCmpFile(cmd.filename) ?? cmpData
          cmpRowIndex = 0
        }
        break
      case 'output-list':
        outputColumns = cmd.columns.map((c) => c.name)
        break
      case 'set':
        inputs[cmd.pin] = cmd.value
        break
      case 'eval':
        if (activeChip) {
          lastOutputs = evaluateChip(activeChip, inputs, registry, maxDepth === undefined ? undefined : { maxDepth })
        }
        break
      case 'output': {
        const values: Record<string, number> = {}
        for (const col of outputColumns) {
          values[col] = lastOutputs[col] ?? inputs[col] ?? 0
        }
        outputRows.push({ values })
        if (cmpData && cmpRowIndex < cmpData.rows.length) {
          // Build the actual row in .cmp COLUMN order (the comparison's source of truth).
          const actualRow = cmpData.columns.map((c) => values[c.name] ?? 0)
          const mismatch = compareCmpRow(actualRow, cmpData.rows[cmpRowIndex], cmpData.columns, cmpRowIndex)
          if (mismatch) {
            return {
              passed: false,
              totalSteps: outputRows.length,
              passedSteps: cmpRowIndex,
              outputRows,
              firstFailure: {
                row: mismatch.row,
                column: mismatch.column,
                expected: String(mismatch.expected),
                actual: String(mismatch.actual),
              },
              error: null,
            }
          }
          cmpRowIndex++
        }
        break
      }
      case 'output-file':
        break
    }
  }

  if (cmpData && cmpRowIndex !== cmpData.rows.length) {
    return fail(`Output row count ${cmpRowIndex} does not match .cmp row count ${cmpData.rows.length}`)
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
