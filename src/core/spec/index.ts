/** Public API for the spec document (ADR-0020 §1): HDL-shaped text plus a JSON sidecar. */
export type {
  CircuitSpec,
  Hint,
  Net,
  NodeId,
  ParseSpecResult,
  Part,
  PartId,
  Port,
  Ref,
  Sidecar,
  SpecDiagnostic,
} from './types'
export { SPEC_SCHEMA_VERSION } from './types'
export type { BindUnconnectedInputsResult, BoundInput } from './bindUnconnectedInputs'
export { bindUnconnectedInputs } from './bindUnconnectedInputs'
export type { CompileSpecInput, CompileSpecResult } from './compileSpec'
export { compileSpec } from './compileSpec'
export type { ParseSpecOptions } from './parseSpec'
export { parseSpec } from './parseSpec'
export type { PrintSpecOptions } from './printSpec'
export { printSpec } from './printSpec'
export { normalizeSpec } from './normalizeSpec'
export { emptySidecar } from './sidecar'
