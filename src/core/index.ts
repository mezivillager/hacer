/**
 * The engine's front door (#336).
 *
 * Everything a surface outside `src/core` needs to compile, evaluate and conformance-test a chip
 * without a DOM: the CLI (#204), the MCP tool (#208), the differential harness (#338) and the
 * read-only renderers all import from here and never reach past it. `src/core/index.test.ts`
 * proves the closure below pulls in no store, no UI, no package and no browser global.
 *
 * Re-exports are named, never `export *`: each name here is a commitment the repo keeps, and a
 * wildcard would widen the public surface every time a sub-index grew. Exports come from the
 * module indexes (`./chips`, `./hdl`, `./testing`), so the front door never reaches past one either.
 *
 * Deliberately NOT exported, each for a reason:
 *   - `./serialization` — the canvas document's save format. `deserialize` imports the store, so
 *     exporting it would make this index non-headless on its own.
 *   - `testing/chipCompletion` — `localStorage`; it belongs behind a port, not in the engine's API.
 *   - `testing/implementationSources`, `testing/formatColumnValue` — the Test Lab's "what to test
 *     against" picker and its column formatting: app concerns built ON this surface.
 *   - the Project-1 `.hdl`/`.tst`/`.cmp` fixture corpora — test data, not API.
 *   - `resetAppRegistriesForTests`, `stripExt`, `printPinRef` — internal helpers.
 * Bus operations live in `@/simulation`, the other half of the engine's surface.
 */

// ── HDL: parse, compile, print ──────────────────────────────────────────────────────────────────
export type {
  CompiledEvaluator,
  EvalContext,
  HDLChip,
  HDLCompileError,
  HDLCompileResult,
  HDLConnection,
  HDLParseError,
  HDLParseResult,
  HDLPart,
  HDLPin,
  HDLSlice,
} from './hdl'
export { compileHDL, hdlChipDefinition, parseHDL, printHDL } from './hdl'

// ── The chip registry, and evaluation ───────────────────────────────────────────────────────────
export type {
  BuiltinEvalFn,
  ChipDefinition,
  ChipImplementation,
  ChipPin,
  ChipRegistry,
  ChipValidationError,
} from './chips'
export {
  combineRegistries,
  createChipRegistry,
  DEFAULT_MAX_DEPTH,
  evaluateChip,
  evaluateChipWithCtx,
  getBuiltinChipRegistry,
  getUserChipRegistry,
  isBuiltinChip,
  isCircuitChip,
  isHDLChip,
  registerBuiltin,
  registerProject1Builtins,
  validateChipDefinition,
} from './chips'

// ── The `.tst` / `.cmp` conformance runner ──────────────────────────────────────────────────────
export type {
  CmpColumn,
  CmpFile,
  CmpMismatch,
  CmpParseError,
  CmpParseResult,
  CmpRow,
  OutputRow,
  RunTestOptions,
  TestFailure,
  TestResult,
  TSTCommand,
  TSTOutputColumn,
  TSTParseError,
  TSTParseResult,
  TSTScript,
} from './testing'
export { compareCmpRow, parseCmp, parseTST, runTest } from './testing'
