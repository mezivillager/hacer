/** Declared IN/OUT pin with optional bus width (default width 1). */
export interface HDLPin {
  name: string
  width: number
}

/** Inclusive bit range written `[n]` (one bit) or `[n..m]` in HDL. */
export interface HDLSlice {
  start: number
  end: number
}

/**
 * One `internal = external` wire inside a part's parentheses.
 *
 * The two sides are different things and are kept apart deliberately: `internal` names a pin of
 * the *part*, `external` names a signal of the *enclosing* chip (or the literal `true`/`false`).
 * Either side may carry its own slice, and both may on the same wire — in
 * `Not16(in[0..7]=bus[8..15])` bits 8..15 of the signal `bus` feed bits 0..7 of the part's `in`
 * pin. A missing slice means the whole pin / the whole signal.
 */
export interface HDLConnection {
  internal: string
  /** Slice of the part's own pin — the `[0]` in `Not16(in[0]=a)`. */
  internalSlice?: HDLSlice
  external: string
  /** Slice of the enclosing chip's signal — the `[0..7]` in `Not16(in=bus[0..7])`. */
  externalSlice?: HDLSlice
}

/** One chip instantiation inside `PARTS:`. */
export interface HDLPart {
  name: string
  connections: HDLConnection[]
}

/** Root AST for a single `CHIP Name { ... }` declaration. */
export interface HDLChip {
  name: string
  inputs: HDLPin[]
  outputs: HDLPin[]
  parts: HDLPart[]
  /** Set when body is `BUILTIN SomeChip;` instead of part list. */
  builtin?: string
  /** Reserved for sequential logic (Phase 0.6+). */
  clocked?: string[]
}

export interface HDLParseError {
  line: number
  column: number
  message: string
}

/** Discriminated union returned by `parseHDL` in `./parser`. */
export type HDLParseResult =
  | { success: true; chip: HDLChip }
  | { success: false; errors: HDLParseError[] }
