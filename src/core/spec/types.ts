import type { HDLSlice } from '../hdl/types'

/** The spec format's version: read on every load, and moved only with a `migrate(n → n+1)`. */
export const SPEC_SCHEMA_VERSION = 2

export type PartId = `p${number}`
/** A part, or a chip I/O terminal named by its port. */
export type NodeId = PartId | `in:${string}` | `out:${string}`

export interface Port { name: string; width: number }
export interface Part { id: PartId; chip: string }

/**
 * One end of a net. `slice` is the pin's (or port's) own bits; the signal's are in the net id.
 * A `constant` is a literal's source: it has no pin, drives only the net its literal names, and is every bit of the connection it feeds.
 */
export type Ref =
  | { kind: 'part-pin'; partId: PartId; pin: string; slice?: HDLSlice }
  | { kind: 'chip-in' | 'chip-out'; pin: string; slice?: HDLSlice }
  | { kind: 'constant'; value: boolean }

/** The two literals, by the net id each one's constant drives. */
export const LITERALS: ReadonlyMap<string, boolean> = new Map([['true', true], ['false', false]])

/** `id` is the sliced signal reference the net carries: `t`, `out[0]`, `t[3..7]`, or a literal. */
export interface Net {
  id: string
  driver: Ref | null
  sinks: Ref[]
}

export interface CircuitSpec {
  schemaVersion: typeof SPEC_SCHEMA_VERSION
  name: string
  ins: Port[]
  outs: Port[]
  parts: Part[]
  nets: Net[]
}

export interface Hint {
  x: number
  y: number
  z: number
  rotation?: number
  origin: 'user' | 'tidy'
}

/** `tst` and `cmp` are inline text or a repo-relative path. */
export interface TestBinding {
  tst: string
  cmp: string
}

export interface ImportNote {
  kind: string
  partId?: PartId
  pin?: string
  detail: string
}

export interface Sidecar {
  schemaVersion: typeof SPEC_SCHEMA_VERSION
  hints: { '3d': Partial<Record<NodeId, Hint>>; '2d': Partial<Record<NodeId, Hint>> }
  meta: { title?: string; description?: string; tags?: string[] }
  tests: TestBinding[]
  notes: ImportNote[]
}

export type SpecDiagnosticCode =
  | 'syntax' | 'unknown-schema-version' | 'invalid-sidecar' | 'builtin-chip' | 'unknown-chip'
  | 'unknown-pin' | 'multiple-drivers' | 'undriven' | 'duplicate-part-id' | 'invalid-part-id' | 'part-id-assigned'
  | 'invalid-wire' | 'alias-cycle' | 'duplicate-net-id' | 'compile'

export interface SpecDiagnostic {
  code: SpecDiagnosticCode
  severity: 'error' | 'warning' | 'info'
  message: string
  line?: number
  column?: number
  partId?: PartId
  netId?: string
  /** An alias cycle's signals in order, first repeated last: `["x", "y", "x"]`. */
  members?: string[]
}

export type ParseSpecResult =
  | { doc: CircuitSpec; sidecar: Sidecar; diagnostics: SpecDiagnostic[] }
  | { doc: null; sidecar: null; diagnostics: SpecDiagnostic[] }
