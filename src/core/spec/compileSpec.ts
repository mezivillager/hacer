import type { ChipRegistry } from '../chips/registry'
import type { CompiledEvaluator } from '../hdl/compiler'
import type { CircuitSpec, SpecDiagnostic } from './types'

export interface CompileSpecInput {
  doc: CircuitSpec | null
  diagnostics: readonly SpecDiagnostic[]
}

export type CompileSpecResult =
  | { success: true; evaluate: CompiledEvaluator }
  | { success: false; diagnostics: SpecDiagnostic[] }

export function compileSpec(_parsed: CompileSpecInput, _registry: ChipRegistry): CompileSpecResult {
  throw new Error('compileSpec: not implemented')
}
