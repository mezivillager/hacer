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
export type { ParseSpecOptions } from './parseSpec'
export { parseSpec } from './parseSpec'
export { normalizeSpec } from './normalizeSpec'
export { emptySidecar } from './sidecar'
