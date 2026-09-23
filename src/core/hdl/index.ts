/** Public API for HACK-style HDL: parse a source, compile the AST, print one back. */
export type {
  HDLChip,
  HDLPin,
  HDLPart,
  HDLConnection,
  HDLParseError,
  HDLParseResult,
  HDLSlice,
} from './types'
export { parseHDL } from './parser'
export { printHDL } from './printer'
export type {
  CompiledEvaluator,
  EvalContext,
  HDLCompileError,
  HDLCompileResult,
} from './compiler'
export { compileHDL, hdlChipDefinition } from './compiler'
