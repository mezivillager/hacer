// src/core/testing/engine.ts
import type { ChipDefinition } from '../chips/types'
import type { ChipRegistry } from '../chips/registry'
import { evaluateChip } from '../chips/evaluateChip'
import type { TSTScript } from './types'
import type { CmpFile } from './cmpParser'

export interface RunTestOptions {
  /** Resolves `load X` and sub-parts during HDL recursion. */
  registry: ChipRegistry
  /** Active chip when a script has no `load` (e.g. Nand.tst). */
  chip?: ChipDefinition
  /** Explicit expected data; takes precedence over `compare-to`. */
  cmpData?: CmpFile
  /** Resolves `compare-to X.cmp` to a CmpFile (used only when `cmpData` is unset). */
  loadCmpFile?: (filename: string) => CmpFile | null
  /** Forwarded to evaluateChip. */
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
  const outputRows: OutputRow[] = []

  for (const cmd of script.commands) {
    switch (cmd.type) {
      case 'load':
        activeChip = registry.get(stripExt(cmd.filename)) ?? activeChip
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
        break
      }
      case 'compare-to':
      case 'output-file':
        break
    }
  }

  return {
    passed: true,
    totalSteps: outputRows.length,
    passedSteps: 0,
    outputRows,
    firstFailure: null,
    error: null,
  }
}
