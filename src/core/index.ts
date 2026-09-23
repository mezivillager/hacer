// src/core/index.ts — RED STUB (#336). The names exist so the spec compiles; nothing is wired
// through yet. Replaced by the real re-exports in the green commit.
import type * as chips from './chips'
import type * as compiler from './hdl/compiler'
import type * as hdl from './hdl'
import type * as testing from './testing'

const todo = (): never => {
  throw new Error('src/core/index.ts: the engine front door is not wired up yet (#336)')
}

export const DEFAULT_MAX_DEPTH: number = -1
export const combineRegistries: typeof chips.combineRegistries = todo
export const compareCmpRow: typeof testing.compareCmpRow = todo
export const compileHDL: typeof compiler.compileHDL = todo
export const createChipRegistry: typeof chips.createChipRegistry = todo
export const evaluateChip: typeof chips.evaluateChip = todo
export const evaluateChipWithCtx: typeof chips.evaluateChipWithCtx = todo
export const getBuiltinChipRegistry: typeof chips.getBuiltinChipRegistry = todo
export const getUserChipRegistry: typeof chips.getUserChipRegistry = todo
export const hdlChipDefinition: typeof compiler.hdlChipDefinition = todo
export const isBuiltinChip = todo as unknown as typeof chips.isBuiltinChip
export const isCircuitChip = todo as unknown as typeof chips.isCircuitChip
export const isHDLChip = todo as unknown as typeof chips.isHDLChip
export const parseCmp: typeof testing.parseCmp = todo
export const parseHDL: typeof hdl.parseHDL = todo
export const parseTST: typeof testing.parseTST = todo
export const printHDL: typeof hdl.printHDL = todo
export const registerBuiltin: typeof chips.registerBuiltin = todo
export const registerProject1Builtins: typeof chips.registerProject1Builtins = todo
export const runTest: typeof testing.runTest = todo
export const validateChipDefinition: typeof chips.validateChipDefinition = todo
