# P05-17 — Test Execution Engine (`.tst` → run → compare `.cmp`) — Design

- **Date:** 2026-06-20
- **Status:** Approved (brainstorming) — pending spec review
- **Ticket:** [`docs/plans/phase-0.5-tickets/P05-17.md`](../plans/phase-0.5-tickets/P05-17.md)
- **Phase:** 0.5
- **Depends:** P05-05 (TST parser), P05-06 (CMP parser), P05-03 (single-pass eval) — **soft:** P05-16 (`evaluateChip`), P05-15 (Project-1 builtins)
- **Guiding principle:** [`docs/decisions/0003`](../decisions/0003-design-for-longevity.md) — design for long-term extensibility

## Goal

Run a parsed `.tst` script against a chip — record output rows, compare against `.cmp` data — closing the
last parsing-layer gap: P05-05/P05-06 parse `.tst`/`.cmp`, P05-16 makes chips evaluable, but nothing
*executes* a test. **Acceptance:** all 16 Project-1 `.tst` scripts pass (a) against the builtin references
**and** (b) for the 15 composites, against their HDL definitions compiled bottom-up from a single `Nand` —
the nand2tetris compatibility baseline made literal.

## Non-goals

- Test **results UI** (run button, output table, diff highlighting) → P05-22.
- `repeat` / `while` control flow → the real `parseTST` does not emit these and the Project-1 corpus does
  not use them; **explicitly out of scope** (the pre-P05-16 ticket's pseudocode for them is dead scope).
- Sequential / clocked test semantics (`tick`/`tock`) → Phase 0.6.
- Loading `.tst`/`.cmp` from disk or a curriculum bundle → assets come from the in-repo fixtures /
  caller-supplied resolvers; a provider abstraction is left as a seam, not built.

## Background — verified current APIs (on `main`)

- `parseTST(source) → { success: true; script: TSTScript } | { success: false; errors }`.
  `TSTScript { commands: TSTCommand[] }`;
  `TSTCommand = {type:'load'; filename} | {type:'output-file'; filename} | {type:'compare-to'; filename}
  | {type:'output-list'; columns: TSTOutputColumn[]} | {type:'set'; pin; value} | {type:'eval'} | {type:'output'}`.
  `TSTOutputColumn { name, format, padLeft, width, padRight }`. **No `repeat`/`while` variants exist.**
- `parseCmp(source) → { success: true; file: CmpFile } | { success: false; errors }`.
  `CmpFile { columns: CmpColumn[]; rows: CmpRow[] }`; `CmpRow { values: number[] }`.
- `compareCmpRow(actual: number[], expected: CmpRow, columns: CmpColumn[], row = 0) → CmpMismatch | null`;
  `CmpMismatch { row, column, expected: number, actual: number }`.
- `evaluateChip(chip, inputs, registry, opts?: { maxDepth }) → Record<string,number>` — **functional**,
  stateless; dispatches builtin / hdl (compile + cache) / circuit, with a depth guard. (P05-16.)
- Registries: `getBuiltinChipRegistry()` (all 16 Project-1 builtins), `createChipRegistry()`,
  `registry.get/register`, `isBuiltinChip`. `project1HdlSources` holds canonical HDL for the 15 composites
  in `project1DependencyOrder`.
- Fixtures: `project1TstFixtures: Record<string,string>` and `project1CmpFixtures: Record<string,string>` —
  **real and complete** for all 16 chips. Note `nandTst` has no `load`/`compare-to` (the base case).

## Architecture

### Deviations from the (pre-P05-16) ticket spec — and why
1. **Functional, not stateful.** The ticket sketched a `ChipResolver` + stateful `ChipEvaluator`
   (`setInput`/`evaluate`/`getOutput`/`getInput`). P05-16 shipped a functional `evaluateChip(def, inputs,
   registry)`, so that 4-method interface is now unnecessary indirection. The engine holds a plain `inputs`
   accumulator and calls `evaluateChip` on each `eval`.
2. **Registry *is* the resolver.** `load Foo.hdl` → strip extension → `registry.get('Foo')`. No separate
   resolver object; the same registry is threaded to `evaluateChip` for sub-part recursion.
3. **`repeat`/`while` dropped** (see Non-goals) — the parser never produces them.

### API
New `src/core/testing/engine.ts`:
```ts
export interface RunTestOptions {
  registry: ChipRegistry        // resolves `load X` + sub-parts during HDL recursion
  chip?: ChipDefinition         // active chip when a script has no `load` (e.g. Nand.tst)
  cmpData?: CmpFile             // explicit expected data (takes precedence over `compare-to`)
  loadCmpFile?: (filename: string) => CmpFile | null   // resolves `compare-to X.cmp`
  maxDepth?: number             // forwarded to evaluateChip
}
export interface OutputRow { values: Record<string, number> }
export interface TestFailure { row: number; column: string; expected: string; actual: string }
export interface TestResult {
  passed: boolean
  totalSteps: number            // = outputRows.length (rows recorded)
  passedSteps: number           // = rows that matched (cmpRowIndex reached)
  outputRows: OutputRow[]
  firstFailure: TestFailure | null
  error: string | null          // structural/runtime error (chip not found, eval threw, row-count mismatch)
}
export function runTest(script: TSTScript, options: RunTestOptions): TestResult
```

### Engine algorithm (single pass over `script.commands`)
State: `inputs: Record<string,number> = {}`, `lastOutputs: Record<string,number> = {}`,
`activeChip = options.chip ?? null`, `outputColumns: string[] = []`,
`cmpData = options.cmpData`, `cmpRowIndex = 0`.

- `load{filename}` → `name = stripExt(filename)`; `activeChip = registry.get(name)`; if missing →
  return `error: 'Chip "name" not found'`.
- `compare-to{filename}` → only when `options.cmpData` is **not** set: `cmpData = loadCmpFile?.(filename) ?? cmpData`; reset `cmpRowIndex = 0`. (Explicit `cmpData` wins, so single-chip callers stay simple.)
- `output-list{columns}` → `outputColumns = columns.map(c => c.name)`.
- `set{pin,value}` → `inputs[pin] = value`.
- `eval` → if no `activeChip` → `error`. Else `lastOutputs = evaluateChip(activeChip, inputs, registry,
  {maxDepth})`, wrapped in try/catch → any throw becomes `error` (never propagates).
- `output` → build `row[col] = lastOutputs[col] ?? inputs[col] ?? 0` for each `col` (so input columns echo,
  output columns report); push to `outputRows`. If `cmpData` and `cmpRowIndex < rows.length`:
  `actualRow = cmpData.columns.map(c => row[c.name] ?? 0)` (**`.cmp` column order**, not `output-list`
  order); `mismatch = compareCmpRow(actualRow, rows[cmpRowIndex], cmpData.columns, cmpRowIndex)`; on
  mismatch → return failure with `firstFailure = {row: cmpRowIndex, column, expected:String, actual:String}`;
  else `cmpRowIndex++`.
- `output-file` → informational; ignored.
- **End:** if `cmpData` and `cmpRowIndex !== rows.length` → `error: 'Output row count … does not match
  .cmp row count …'`. Otherwise `passed: true`.

The whole body is one internal `dispatch(cmd)` over shared state — no duplicated logic, ready for a future
`repeat` without restructure.

## Data flow
```
.tst string → parseTST → TSTScript ─┐
.cmp string → parseCmp  → CmpFile  ─┤→ runTest ─(per eval)→ evaluateChip(chip, inputs, registry) → outputs
chip from registry (builtin or HDL)─┘                       (per output)→ compareCmpRow → TestResult
```

## Error model
`TestResult.error` (never throws to the caller) covers: chip not found on `load`, `eval` with no active
chip, a throw inside `evaluateChip` (e.g. an HDL chip that fails to compile, or depth exceeded), and a
final row-count mismatch. Value mismatches are *not* errors — they populate `firstFailure` with
`passed:false`. This mirrors the parsers' `{success:false, errors}` discipline: structured results, no
exceptions across the boundary.

## Acceptance & testing (TDD — red first)
`src/core/testing/engine.test.ts`:
1. Records output rows for a no-compare script (`outputRows` populated, `passed:true`).
2. Passes `Not.tst` vs `Not.cmp` against the **builtin** Not.
3. A wrong expected value → `passed:false`, `firstFailure` has correct `row`/`column`/`expected`/`actual`.
4. `load Missing.hdl` → `error` mentions the chip name; `passed:false`.
5. `eval` before any `load` (and no `options.chip`) → `error`.
6. Row-count mismatch (`.cmp` has more/fewer rows than `output` steps) → `error`.
7. An `eval` that throws (HDL chip whose source fails to compile) → captured in `error`, not propagated.
8. **Gold standard A:** all 16 `project1TstFixtures` pass against `getBuiltinChipRegistry()` builtins,
   comparing with `project1CmpFixtures` (via `loadCmpFile` mapping `"X.cmp" → parseCmp(fixtures[X])`, or
   explicit `cmpData`; Nand supplied via `options.chip`).
9. **Gold standard B:** the 15 composites' `.tst` pass against chips **compiled from `project1HdlSources`
   bottom-up from Nand** — register each as an `hdl` `ChipDefinition` in dependency order, then run its
   `.tst`. Proves the official tests pass on chips built from a single NAND.

Regression: `pnpm run lint` · `pnpm run test:run` · `pnpm run test:e2e:store` · `pnpm run build`.

## Staged build (drives the implementation plan)
a. `runTest` skeleton + types; `load`/`output-list`/`set`/`eval`/`output` with no comparison (test 1).
b. Comparison path: `compare-to`/`cmpData`, `compareCmpRow`, `firstFailure`, row-count guard (tests 2,3,6).
c. Error paths: unknown chip, eval-before-load, eval-throws (tests 4,5,7).
d. Gold standard A — 16 builtins (test 8).
e. Gold standard B — 15 composites from NAND (test 9).
f. Export from `src/core/testing/index.ts`; polish error messages.

## Files
- **Create:** `src/core/testing/engine.ts` (+ `engine.test.ts`).
- **Edit:** `src/core/testing/index.ts` (export `runTest` + result types).
- **No production edits elsewhere** — the engine composes existing parsers, fixtures, registries, and
  `evaluateChip` without changing them.

## Risks / open boundaries
- **`output-list` vs `.cmp` column order:** actual rows are assembled in `.cmp` column order (the
  comparison's source of truth), not `output-list` iteration order — guards a silent column-misalignment
  pass. Covered by gold-standard tests with mixed input/output columns (Mux, DMux4Way).
- **P05-22 boundary:** this ticket is pure logic returning `TestResult`; the results panel consumes it
  later. Keep `TestResult` UI-agnostic and serializable.
- **Asset provenance:** fixtures are in-repo strings now; `loadCmpFile` is the seam for a future
  provider/disk source without changing the engine.
