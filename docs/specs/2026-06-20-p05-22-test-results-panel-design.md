# P05-22 — Test Results Panel ("Test Lab") — Design

- **Date:** 2026-06-20
- **Status:** Approved (brainstorming) — pending spec review
- **Ticket:** [`docs/plans/phase-0.5-tickets/P05-22.md`](../plans/phase-0.5-tickets/P05-22.md) (stale — revised to match this design per AGENTS.md §3 Step 1.0)
- **Phase:** 0.5
- **Depends:** P05-17 (test engine), P05-09 (StatusBar)
- **Guiding principle:** [`docs/decisions/0003`](../decisions/0003-design-for-longevity.md) — long-term arc over ease of shipping (AGENTS.md §2)

## Goal

Wrap the P05-17 test engine in a UI: a **Test Lab** panel where you pick a Project-1 chip and an
implementation source, click **Run**, and see the official nand2tetris `.tst` execute — output table with
red diff-cell highlighting and a pass/fail summary. Completes GAP-3D-4 (the full test pipeline now has a
UI) and GAP-UI-2.

## Non-goals

- User-authored chips as a test target → P05-18 (this design leaves a **source seam** they plug into).
- Testing the live canvas circuit → P05-26 (also a future source via the same seam).
- HDL authoring/editing UI → P05-21.
- A full chip-browser/curriculum tree → P05-19 (this panel ships its own chip dropdown).

## Background — verified current APIs (on `main`)

- `runTest(script: TSTScript, options: RunTestOptions) → TestResult`, where
  `RunTestOptions = { registry: ChipRegistry; chip?: ChipDefinition; cmpData?: CmpFile;
  loadCmpFile?: (filename) => CmpFile | null; maxDepth? }` and
  `TestResult = { passed; totalSteps; passedSteps; outputRows: {values: Record<string,number>}[];
  firstFailure: {row,column,expected,actual} | null; error: string | null }`.
  **The ticket's `runTest(script, resolver, options)` + `ChipResolver`/`ChipEvaluator` do not exist** —
  P05-17 deliberately chose a functional engine (ADR-0005).
- `parseTST(src) → {success, script}`, `parseCmp(src) → {success, file: CmpFile}`.
- Fixtures: `project1TstFixtures`, `project1CmpFixtures` (`Record<string,string>`, all 16 chips).
- Chips: `getBuiltinChipRegistry()` (16 builtins), `createChipRegistry`, `registerBuiltin`,
  `hdlChipDefinition(ast, src)`, `parseHDL`, `project1HdlSources` / `project1DependencyOrder` (15 composites).
- Store: one Zustand store; mutate only via `circuitActions.*`; `addStatus(level, message)` exists
  (statusActions). Selectors read narrow slices. **React Compiler on — no `useMemo`/`useCallback`/`memo`.**
- UI: `RightActionBar` toggles a 280px drawer keyed by an `activePanel` union; ui-kit primitives in
  `@/components/ui-kit/` (`button`, `card`, `scroll-area`, `separator`, `tabs`, …); feedback via
  `@/lib/notify`.

## Architecture

### 1. Pluggable implementation source (the future-proof seam)
`src/core/testing/implementationSources.ts` (pure logic, no React):
```ts
export interface ChipImplementationSource {
  id: string                  // 'builtin' | 'hdl-from-nand' | (future) 'user' | 'canvas'
  label: string
  /** Resolve the chip-under-test and the registry to evaluate it (sub-parts), or null. */
  resolve(chipName: string): { chip: ChipDefinition; registry: ChipRegistry } | null
}
export function getImplementationSources(): ChipImplementationSource[]
export function getImplementationSource(id: string): ChipImplementationSource | undefined
```
Ships two sources:
- **`builtin`** — `getBuiltinChipRegistry()`; `resolve(name)` → `{ chip: reg.get(name), registry: reg }`.
- **`hdl-from-nand`** — lazily builds (and caches) a registry: `Nand` builtin + each composite compiled
  from `project1HdlSources` via `hdlChipDefinition(parseHDL(src).chip, src)` in `project1DependencyOrder`.
  `resolve(name)` → `{ chip, registry }` (Nand resolves to the builtin in that registry).

Future sources (`user` → `getUserChipRegistry()`, `canvas` → live circuit) register here with **no panel
or action changes**. This is the §2 long-term-over-ease choice made concrete.

### 2. "Run a test" is a store action — AI-Agent Parity
`src/store/actions/testActions/` adds `runChipTest({ chipName, sourceId })` and `clearTestResult()`;
state in `store/types.ts`: `testResult: TestResult | null`, `testColumns: string[]`, `testRunning: boolean`,
`completedChips: string[]`. `runChipTest`:
1. `source = getImplementationSource(sourceId)`; `resolved = source?.resolve(chipName)`. If unavailable →
   set `testResult = { passed:false, …, error: 'No implementation for "chipName" from source "id"' }`.
2. Parse `project1TstFixtures[chipName]` / `project1CmpFixtures[chipName]`; on parse failure → `testResult.error`.
3. `runTest(script, { registry: resolved.registry, chip: resolved.chip, cmpData,
   loadCmpFile: (f) => parseCmp(project1CmpFixtures[f.replace(/\.cmp$/i,'')] ?? '').… })`.
4. Store `testResult`, `testColumns` (from the `output-list` command), `testRunning=false`.
5. On pass → `addStatus('info', '<chip>: comparison ended successfully')` + `markChipCompleted(chipName)`;
   on fail → `addStatus('error', '<chip>: failure at row N, column …')`.

*Why a store action, not a click handler:* it makes test execution programmatically invokable — **every
action a human can take, an AI agent can take** (the documented AI-Agent-Parity pillar). It also gives the
DoD-required `@store` E2E a clean entry point and keeps the component presentational.

### 3. Thin panel — `src/components/ui/TestResultsPanel.tsx`
Presentational view over store state:
- **Chip dropdown** — the 16 `Object.keys(project1TstFixtures)`; completed chips show a `✓`.
- **Source dropdown** — `getImplementationSources()` (Builtin / Built from NAND).
- **Run** button → `circuitActions.runChipTest({ chipName, sourceId })`; disabled while `testRunning`.
- **Summary** — green "Comparison ended successfully", or red "failure at row N, column 'x': expected … got …",
  or the `error` string.
- **Output table** — header from `testColumns`; one row per `outputRows`; the `firstFailure` cell is red.
- **Steps** — `passedSteps/totalSteps`.
React-Compiler-clean; reads via narrow selectors; no business logic in the component.

### 4. Shell wiring — `RightActionBar.tsx`
Add `'tests'` to the `ActivePanel` union, a trigger button (lucide `FlaskConical`), a header label
("Tests"), and render `<TestResultsPanel />` in the drawer content.

### 5. Completion tracking (forward-compatible contract + immediate consumer)
`src/core/testing/chipCompletion.ts` (pure): read/write `localStorage['hacer-completed-chips']` as a
JSON `string[]` (the contract P05-19 will reuse). The store hydrates `completedChips` from it and
`markChipCompleted` appends+persists. Immediate consumer: the chip dropdown's `✓` marker (not dead state).

## Data flow
```
pick chip + source → circuitActions.runChipTest → source.resolve → runTest(script,{registry,chip,cmpData,loadCmpFile})
   → store.testResult/testColumns → TestResultsPanel renders table + diff + summary
   → pass: addStatus + markChipCompleted(localStorage)   fail: addStatus(error)
```

## Error model
No throw reaches the UI. `runChipTest` wraps resolution/parse/eval; any failure becomes
`testResult.error` (rendered red) — consistent with the engine's never-throw contract (ADR-0005). The Run
button is disabled when no chip is selected.

## Acceptance & testing (TDD)
- `implementationSources.test.ts` — `builtin` resolves all 16; `hdl-from-nand` resolves the 15 composites
  (built from NAND) + Nand; unknown chip → null.
- `testActions.test.ts` — `runChipTest` on `Not`+builtin → `testResult.passed`, `completedChips` includes
  `Not`, localStorage written; a deliberately-broken stub source → `passed:false` with `firstFailure`;
  unknown source → `error`.
- `TestResultsPanel.test.tsx` — Run disabled with no chip; run pass → success summary + table rows; run
  fail → red `fail-cell` + failure summary; completed chip shows `✓`. (Drives the store action; asserts on
  rendered state.)
- `e2e/specs/testing/test-results.store.spec.ts` (+ `e2e/types/globals.ts`) — `runChipTest('Not','builtin')`
  → assert `testResult.passed`; broken case → assert failure detail.
- Regression: `pnpm run lint` · `pnpm run test:run` · `pnpm run test:e2e:store` · `pnpm run build`.

## Staged build (drives the plan)
a. `implementationSources.ts` (+ builtin & hdl-from-nand) — pure, tested first.
b. `chipCompletion.ts` localStorage contract.
c. `testActions` slice + store state + `runChipTest`/`clearTestResult` (+ wire `addStatus`, completion).
d. `TestResultsPanel.tsx` presentational view.
e. `RightActionBar` integration (`'tests'` panel).
f. `@store` E2E + `globals.ts`.
g. Revise the stale `P05-22.md` ticket to match; tick the phase checklist.

## Files
- **Create:** `src/core/testing/implementationSources.ts` (+test), `src/core/testing/chipCompletion.ts`
  (+test), `src/store/actions/testActions/testActions.ts` (+test),
  `src/components/ui/TestResultsPanel.tsx` (+test), `e2e/specs/testing/test-results.store.spec.ts`.
- **Edit:** `src/store/types.ts` (test state), `src/store/circuitStore.ts` (surface testActions),
  `src/components/ui/RightActionBar.tsx` (`'tests'` panel), `e2e/types/globals.ts`,
  `docs/plans/phase-0.5-tickets/P05-22.md` (revise), `docs/plans/phase-0.5-tickets-CHECKLIST.md` (tick).

## Risks / open boundaries
- **Always-green today:** with only reference sources, every run passes; the red-diff path is covered by
  tests (broken stub source) and lights up automatically once a fallible source (user/canvas) registers.
  Surfaced honestly in the panel copy ("implementation source").
- **Store scope:** test state lives in the app store (alongside statuses) as a slice — consistent with the
  single-store architecture.
- **Asset provenance:** fixtures are in-repo; `loadCmpFile` already abstracts a future provider.
- **Ticket drift:** P05-22 ticket is stale; revised in this branch per the Ticket Freshness Protocol.
