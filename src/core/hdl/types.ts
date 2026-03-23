/** Declared IN/OUT pin with optional bus width (default width 1). */
export interface HDLPin {
  name: string
  width: number
}

/** Wire from a part pin to a chip pin, wire name, or `true`/`false`. */
export interface HDLConnection {
  internal: string
  external: string
  start?: number
  end?: number
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
