# P05-17 Test Execution Engine — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a pure-logic engine that runs a parsed `.tst` script against a chip, records output rows, and compares them to `.cmp` data — proving all 16 Project-1 chips pass the official nand2tetris tests (against builtins, and the 15 composites against HDL compiled bottom-up from a single NAND).

**Architecture:** One new module `src/core/testing/engine.ts` exporting `runTest(script, options) → TestResult`. It composes the existing `parseTST`/`parseCmp` parsers, the `compareCmpRow` comparator, the chip registries, and the functional `evaluateChip(def, inputs, registry)` seam (P05-16). The engine is a single pass over `script.commands` holding a mutable `inputs` accumulator; on each `eval` it calls `evaluateChip`, on each `output` it records a row and (when comparison data exists) checks it. No existing production code changes.

**Tech Stack:** TypeScript 5.9 (strict), Vitest. Pure logic — no React/browser imports in this layer.

## Global Constraints

- Package manager **pnpm@10.x**, **Node ≥ 22**. Run all commands from inside the worktree `hacer-wt-p05-17/`.
- **TDD is the iron law** — write the failing test first, watch it fail, then minimal implementation.
- **Definition of Done (all must exit 0):** `pnpm run lint` · `pnpm run test:run` · `pnpm run test:e2e:store` · `pnpm run build`.
- Tests are **colocated** (`engine.test.ts` beside `engine.ts`).
- This layer (`src/core/testing/`) imports **no React/browser** — pure logic only.
- Commit messages use conventional-commit format. **No AI attribution** (no `Co-Authored-By`, no "Generated with Claude").
- **Never commit to `main`.** Work on branch `feat/p05-17-test-execution-engine`. **Do not bypass git hooks** (no `--no-verify`).
- Single-file test run: `pnpm exec vitest run src/core/testing/engine.test.ts`.

---

### Task 1: Engine skeleton — execute and record rows (no comparison)

**Files:**
- Create: `src/core/testing/engine.ts`
- Create (test): `src/core/testing/engine.test.ts`
- Modify: `src/core/testing/index.ts` (export the new surface)

**Interfaces:**
- Consumes: `parseTST(source) → { success; script }` from `./tstParser`; `evaluateChip(chip, inputs, registry, opts?)` from `../chips/evaluateChip`; `createChipRegistry()`, `registerBuiltin(reg, name, inputs, outputs, fn)` from `../chips/registry`; `TSTScript` from `./types`; `CmpFile` from `./cmpParser`.
- Produces: `runTest(script: TSTScript, options: RunTestOptions): TestResult` and types `RunTestOptions`, `OutputRow`, `TestFailure`, `TestResult`.

- [ ] **Step 1: Write the failing test**

Create `src/core/testing/engine.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { runTest } from './engine'
import { parseTST } from './tstParser'
import { parseCmp } from './cmpParser'
import type { CmpFile } from './cmpParser'
import { createChipRegistry, registerBuiltin } from '../chips/registry'

function script(src: string) {
  const r = parseTST(src)
  if (!r.success) throw new Error('tst parse failed: ' + r.errors.map((e) => e.message).join('; '))
  return r.script
}
function cmp(src: string): CmpFile {
  const r = parseCmp(src)
  if (!r.success) throw new Error('cmp parse failed: ' + r.errors.map((e) => e.message).join('; '))
  return r.file
}

describe('runTest — execution', () => {
  it('records output rows when there is nothing to compare against', () => {
    const reg = createChipRegistry()
    registerBuiltin(reg, 'And', [{ name: 'a', width: 1 }, { name: 'b', width: 1 }], [{ name: 'out', width: 1 }], (i) => ({ out: i.a & i.b }))
    const s = script('load And.hdl, output-list a b out; set a 1, set b 0, eval, output; set a 1, set b 1, eval, output;')
    const result = runTest(s, { registry: reg })
    expect(result.passed).toBe(true)
    expect(result.outputRows).toHaveLength(2)
    expect(result.outputRows[0].values).toEqual({ a: 1, b: 0, out: 0 })
    expect(result.outputRows[1].values).toEqual({ a: 1, b: 1, out: 1 })
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm exec vitest run src/core/testing/engine.test.ts`
Expected: FAIL — `Failed to resolve import "./engine"` / `runTest is not a function`.

- [ ] **Step 3: Write minimal implementation**

Create `src/core/testing/engine.ts`:

```ts
// src/core/testing/engine.ts
import type { ChipDefinition } from '../chips/types'
import type { ChipRegistry } from '../chips/registry'
import { evaluateChip } from '../chips/evaluateChip'
import type { TSTScript } from './types'
import type { CmpFile } from './cmpParser'

export interface RunTestOptions {
  /** Resolves `load X` and sub-parts during HDL recursion. */
  registry: ChipRegistry
  /** Active chip when a script has no `load` (e.g. Nand.tst). */
  chip?: ChipDefinition
  /** Explicit expected data; takes precedence over `compare-to`. */
  cmpData?: CmpFile
  /** Resolves `compare-to X.cmp` to a CmpFile (used only when `cmpData` is unset). */
  loadCmpFile?: (filename: string) => CmpFile | null
  /** Forwarded to evaluateChip. */
  maxDepth?: number
}

export interface OutputRow {
  values: Record<string, number>
}

export interface TestFailure {
  row: number
  column: string
  expected: string
  actual: string
}

export interface TestResult {
  passed: boolean
  totalSteps: number
  passedSteps: number
  outputRows: OutputRow[]
  firstFailure: TestFailure | null
  error: string | null
}

function stripExt(filename: string): string {
  const dot = filename.lastIndexOf('.')
  return dot > 0 ? filename.slice(0, dot) : filename
}

export function runTest(script: TSTScript, options: RunTestOptions): TestResult {
  const { registry, maxDepth } = options
  const inputs: Record<string, number> = {}
  let lastOutputs: Record<string, number> = {}
  let activeChip: ChipDefinition | null = options.chip ?? null
  let outputColumns: string[] = []
  const outputRows: OutputRow[] = []

  for (const cmd of script.commands) {
    switch (cmd.type) {
      case 'load':
        activeChip = registry.get(stripExt(cmd.filename)) ?? activeChip
        break
      case 'output-list':
        outputColumns = cmd.columns.map((c) => c.name)
        break
      case 'set':
        inputs[cmd.pin] = cmd.value
        break
      case 'eval':
        if (activeChip) {
          lastOutputs = evaluateChip(activeChip, inputs, registry, maxDepth === undefined ? undefined : { maxDepth })
        }
        break
      case 'output': {
        const values: Record<string, number> = {}
        for (const col of outputColumns) {
          values[col] = lastOutputs[col] ?? inputs[col] ?? 0
        }
        outputRows.push({ values })
        break
      }
      case 'compare-to':
      case 'output-file':
        break
    }
  }

  return {
    passed: true,
    totalSteps: outputRows.length,
    passedSteps: 0,
    outputRows,
    firstFailure: null,
    error: null,
  }
}
```

- [ ] **Step 4: Export the surface from the testing barrel**

Add to `src/core/testing/index.ts` (append after the existing exports):

```ts
export { runTest } from './engine'
export type { RunTestOptions, OutputRow, TestFailure, TestResult } from './engine'
```

- [ ] **Step 5: Run test to verify it passes**

Run: `pnpm exec vitest run src/core/testing/engine.test.ts`
Expected: PASS (1 test).

- [ ] **Step 6: Commit**

```bash
git add src/core/testing/engine.ts src/core/testing/engine.test.ts src/core/testing/index.ts
git commit -m "feat(testing): test execution engine skeleton — run script, record rows"
```

---

### Task 2: Comparison against `.cmp` + failure reporting

**Files:**
- Modify: `src/core/testing/engine.ts` (add comparison path)
- Modify (test): `src/core/testing/engine.test.ts` (add comparison tests)

**Interfaces:**
- Consumes: `compareCmpRow(actual: number[], expected: CmpRow, columns: CmpColumn[], row?) → CmpMismatch | null` from `./cmpParser` (`CmpMismatch { row, column, expected: number, actual: number }`); `project1TstFixtures` / `project1CmpFixtures` (`Record<string,string>`) from `./project1TstFixtures` / `./project1CmpFixtures`.
- Produces: same `runTest` signature; now populates `firstFailure` and returns row-count `error`.

- [ ] **Step 1: Write the failing tests**

Append to `src/core/testing/engine.test.ts` (add the two fixture imports at the top with the others):

```ts
import { project1TstFixtures } from './project1TstFixtures'
import { project1CmpFixtures } from './project1CmpFixtures'

describe('runTest — comparison', () => {
  function builtinNot() {
    const reg = createChipRegistry()
    registerBuiltin(reg, 'Not', [{ name: 'in', width: 1 }], [{ name: 'out', width: 1 }], (i) => ({ out: i.in === 0 ? 1 : 0 }))
    return reg
  }

  it('passes Not.tst against Not.cmp using the builtin Not', () => {
    const result = runTest(script(project1TstFixtures.Not), { registry: builtinNot(), cmpData: cmp(project1CmpFixtures.Not) })
    expect(result.error).toBeNull()
    expect(result.passed).toBe(true)
    expect(result.firstFailure).toBeNull()
  })

  it('reports firstFailure with row/column/expected/actual on a value mismatch', () => {
    const reg = createChipRegistry()
    // A broken Not that always returns 0 → wrong on input 0 (expects 1).
    registerBuiltin(reg, 'Not', [{ name: 'in', width: 1 }], [{ name: 'out', width: 1 }], () => ({ out: 0 }))
    const result = runTest(script(project1TstFixtures.Not), { registry: reg, cmpData: cmp(project1CmpFixtures.Not) })
    expect(result.passed).toBe(false)
    expect(result.firstFailure).toMatchObject({ row: 0, column: 'out', expected: '1', actual: '0' })
  })

  it('errors when output row count does not match the .cmp row count', () => {
    // The script emits one output row; Not.cmp expects two.
    const s = script('load Not.hdl, output-list in out; set in 0, eval, output;')
    const result = runTest(s, { registry: builtinNot(), cmpData: cmp(project1CmpFixtures.Not) })
    expect(result.passed).toBe(false)
    expect(result.error).toMatch(/row count/i)
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm exec vitest run src/core/testing/engine.test.ts`
Expected: FAIL — mismatch test sees `firstFailure: null` (no comparison yet); row-count test sees `passed: true`.

- [ ] **Step 3: Add the comparison path**

Replace the entire body of `src/core/testing/engine.ts` (keep the file's leading comment) so it reads:

```ts
// src/core/testing/engine.ts
import type { ChipDefinition } from '../chips/types'
import type { ChipRegistry } from '../chips/registry'
import { evaluateChip } from '../chips/evaluateChip'
import type { TSTScript } from './types'
import type { CmpFile } from './cmpParser'
import { compareCmpRow } from './cmpParser'

export interface RunTestOptions {
  registry: ChipRegistry
  chip?: ChipDefinition
  cmpData?: CmpFile
  loadCmpFile?: (filename: string) => CmpFile | null
  maxDepth?: number
}

export interface OutputRow {
  values: Record<string, number>
}

export interface TestFailure {
  row: number
  column: string
  expected: string
  actual: string
}

export interface TestResult {
  passed: boolean
  totalSteps: number
  passedSteps: number
  outputRows: OutputRow[]
  firstFailure: TestFailure | null
  error: string | null
}

function stripExt(filename: string): string {
  const dot = filename.lastIndexOf('.')
  return dot > 0 ? filename.slice(0, dot) : filename
}

export function runTest(script: TSTScript, options: RunTestOptions): TestResult {
  const { registry, maxDepth } = options
  const inputs: Record<string, number> = {}
  let lastOutputs: Record<string, number> = {}
  let activeChip: ChipDefinition | null = options.chip ?? null
  let outputColumns: string[] = []
  const cmpExplicit = options.cmpData !== undefined
  let cmpData: CmpFile | undefined = options.cmpData
  let cmpRowIndex = 0
  const outputRows: OutputRow[] = []

  const fail = (error: string): TestResult => ({
    passed: false,
    totalSteps: outputRows.length,
    passedSteps: cmpRowIndex,
    outputRows,
    firstFailure: null,
    error,
  })

  for (const cmd of script.commands) {
    switch (cmd.type) {
      case 'load':
        activeChip = registry.get(stripExt(cmd.filename)) ?? activeChip
        break
      case 'compare-to':
        // Explicit cmpData wins; otherwise resolve the named .cmp via loadCmpFile.
        if (!cmpExplicit && options.loadCmpFile) {
          cmpData = options.loadCmpFile(cmd.filename) ?? cmpData
          cmpRowIndex = 0
        }
        break
      case 'output-list':
        outputColumns = cmd.columns.map((c) => c.name)
        break
      case 'set':
        inputs[cmd.pin] = cmd.value
        break
      case 'eval':
        if (activeChip) {
          lastOutputs = evaluateChip(activeChip, inputs, registry, maxDepth === undefined ? undefined : { maxDepth })
        }
        break
      case 'output': {
        const values: Record<string, number> = {}
        for (const col of outputColumns) {
          values[col] = lastOutputs[col] ?? inputs[col] ?? 0
        }
        outputRows.push({ values })
        if (cmpData && cmpRowIndex < cmpData.rows.length) {
          // Build the actual row in .cmp COLUMN order (the comparison's source of truth).
          const actualRow = cmpData.columns.map((c) => values[c.name] ?? 0)
          const mismatch = compareCmpRow(actualRow, cmpData.rows[cmpRowIndex], cmpData.columns, cmpRowIndex)
          if (mismatch) {
            return {
              passed: false,
              totalSteps: outputRows.length,
              passedSteps: cmpRowIndex,
              outputRows,
              firstFailure: {
                row: mismatch.row,
                column: mismatch.column,
                expected: String(mismatch.expected),
                actual: String(mismatch.actual),
              },
              error: null,
            }
          }
          cmpRowIndex++
        }
        break
      }
      case 'output-file':
        break
    }
  }

  if (cmpData && cmpRowIndex !== cmpData.rows.length) {
    return fail(`Output row count ${cmpRowIndex} does not match .cmp row count ${cmpData.rows.length}`)
  }

  return {
    passed: true,
    totalSteps: outputRows.length,
    passedSteps: cmpRowIndex,
    outputRows,
    firstFailure: null,
    error: null,
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm exec vitest run src/core/testing/engine.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add src/core/testing/engine.ts src/core/testing/engine.test.ts
git commit -m "feat(testing): compare output rows against .cmp, report firstFailure + row-count mismatch"
```

---

### Task 3: Structural error paths (no throws across the boundary)

**Files:**
- Modify: `src/core/testing/engine.ts` (turn lenient cases into structured errors)
- Modify (test): `src/core/testing/engine.test.ts` (add error tests)

**Interfaces:**
- Consumes: same as Task 2.
- Produces: same `runTest` signature; `error` is now set on unknown `load`, `eval`-before-load, and a throw inside `evaluateChip`.

- [ ] **Step 1: Write the failing tests**

Append to `src/core/testing/engine.test.ts`:

```ts
describe('runTest — error paths', () => {
  it('errors when load names a chip not in the registry', () => {
    const s = script('load Missing.hdl, output-list a out; set a 0, eval, output;')
    const result = runTest(s, { registry: createChipRegistry() })
    expect(result.passed).toBe(false)
    expect(result.error).toContain('Missing')
  })

  it('errors when eval runs before any chip is loaded', () => {
    const s = script('output-list a out; set a 1, eval, output;')
    const result = runTest(s, { registry: createChipRegistry() })
    expect(result.passed).toBe(false)
    expect(result.error).toMatch(/load/i)
  })

  it('captures a runtime error when evaluating a chip that fails to compile', () => {
    const reg = createChipRegistry()
    // HDL referencing an unknown part → compileHDL fails → evaluateChip throws.
    reg.register({
      name: 'Broken',
      inputs: [{ name: 'in', width: 1 }],
      outputs: [{ name: 'out', width: 1 }],
      implementation: { type: 'hdl', source: 'CHIP Broken { IN in; OUT out; PARTS: Nope(a=in, out=out); }' },
    })
    const s = script('load Broken.hdl, output-list in out; set in 1, eval, output;')
    const result = runTest(s, { registry: reg })
    expect(result.passed).toBe(false)
    expect(result.error).not.toBeNull()
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm exec vitest run src/core/testing/engine.test.ts`
Expected: FAIL — unknown-chip test: `error` is null (load was lenient); eval-before-load: `error` null; broken-compile test: the exception propagates out of `runTest` (uncaught), failing the test.

- [ ] **Step 3: Make the three cases structured errors**

In `src/core/testing/engine.ts`, change the `load` case from the lenient form to:

```ts
      case 'load': {
        const name = stripExt(cmd.filename)
        const def = registry.get(name)
        if (!def) return fail(`Chip "${name}" not found`)
        activeChip = def
        break
      }
```

and change the `eval` case to:

```ts
      case 'eval':
        if (!activeChip) return fail('eval before a chip was loaded')
        try {
          lastOutputs = evaluateChip(activeChip, inputs, registry, maxDepth === undefined ? undefined : { maxDepth })
        } catch (e) {
          return fail(e instanceof Error ? e.message : String(e))
        }
        break
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm exec vitest run src/core/testing/engine.test.ts`
Expected: PASS (7 tests).

- [ ] **Step 5: Commit**

```bash
git add src/core/testing/engine.ts src/core/testing/engine.test.ts
git commit -m "feat(testing): structured errors for unknown chip, eval-before-load, eval throw"
```

---

### Task 4: Gold standard A — all 16 `.tst` pass against builtins

**Files:**
- Modify (test): `src/core/testing/engine.test.ts` (add the acceptance suite)

**Interfaces:**
- Consumes: `getBuiltinChipRegistry()`, `resetAppRegistriesForTests()` from `../chips/appRegistry`; `project1TstFixtures`, `project1CmpFixtures` (already imported in Task 2).

> Note: the engine is feature-complete after Task 3. This task adds an **acceptance** suite over the real corpus; it should pass immediately. If any chip fails, that is a genuine engine/parser bug to debug (use systematic-debugging), not an expected red.

- [ ] **Step 1: Write the acceptance test**

Add the import at the top of `src/core/testing/engine.test.ts`:

```ts
import { getBuiltinChipRegistry, resetAppRegistriesForTests } from '../chips/appRegistry'
```

Append the suite:

```ts
describe('gold standard A — all 16 Project-1 .tst pass against builtins', () => {
  beforeEach(() => resetAppRegistriesForTests())

  it.each(Object.keys(project1TstFixtures))('%s.tst passes against the builtin', (name) => {
    const reg = getBuiltinChipRegistry()
    const def = reg.get(name)
    expect(def, `builtin "${name}" should be registered`).toBeDefined()
    const result = runTest(script(project1TstFixtures[name]), {
      registry: reg,
      chip: def!,
      cmpData: cmp(project1CmpFixtures[name]),
    })
    expect(result.error).toBeNull()
    expect(result.passed, `${name}: ${JSON.stringify(result.firstFailure)}`).toBe(true)
  })
})
```

Add `beforeEach` to the vitest import line at the top of the file:

```ts
import { describe, it, expect, beforeEach } from 'vitest'
```

- [ ] **Step 2: Run the suite to verify it passes**

Run: `pnpm exec vitest run src/core/testing/engine.test.ts`
Expected: PASS — all 16 parametrized cases green (Nand uses `chip`; the rest also resolve via `load`).

- [ ] **Step 3: Commit**

```bash
git add src/core/testing/engine.test.ts
git commit -m "test(testing): all 16 Project-1 .tst pass against builtins"
```

---

### Task 5: Gold standard B — 15 composites pass against HDL compiled from NAND

**Files:**
- Modify (test): `src/core/testing/engine.test.ts` (add the bottom-up acceptance suite)

**Interfaces:**
- Consumes: `parseHDL(source) → { success; chip }` from `../hdl/parser`; `hdlChipDefinition(ast, source) → ChipDefinition` from `../hdl/compiler`; `project1HdlSources` (`Record<string,string>`) and `project1DependencyOrder` (`string[]`, the 15 composites in build order) from `../hdl/project1HdlSources`.

> Note: acceptance suite over already-complete code — expect green. A failure here is a real regression in the engine or the compile pipeline; debug with systematic-debugging.

- [ ] **Step 1: Write the acceptance test**

Add the imports at the top of `src/core/testing/engine.test.ts`:

```ts
import { parseHDL } from '../hdl/parser'
import { hdlChipDefinition } from '../hdl/compiler'
import { project1HdlSources, project1DependencyOrder } from '../hdl/project1HdlSources'
```

Append the suite:

```ts
describe('gold standard B — 15 composites pass against HDL compiled from NAND', () => {
  // Build a registry: Nand as the only builtin, every composite as an HDL ChipDefinition,
  // registered in dependency order so each chip's parts already exist.
  function buildFromNand() {
    const reg = createChipRegistry()
    registerBuiltin(reg, 'Nand', [{ name: 'a', width: 1 }, { name: 'b', width: 1 }], [{ name: 'out', width: 1 }], (i) => ({ out: ~(i.a & i.b) & 1 }))
    for (const name of project1DependencyOrder) {
      const ast = parseHDL(project1HdlSources[name])
      if (!ast.success) throw new Error(`HDL parse failed for ${name}: ${ast.errors.map((e) => e.message).join('; ')}`)
      reg.register(hdlChipDefinition(ast.chip, project1HdlSources[name]))
    }
    return reg
  }

  it.each(project1DependencyOrder)('%s (HDL from NAND) passes its official .tst', (name) => {
    const reg = buildFromNand()
    const def = reg.get(name)
    expect(def, `composite "${name}" should be registered`).toBeDefined()
    const result = runTest(script(project1TstFixtures[name]), {
      registry: reg,
      chip: def!,
      cmpData: cmp(project1CmpFixtures[name]),
    })
    expect(result.error).toBeNull()
    expect(result.passed, `${name}: ${JSON.stringify(result.firstFailure)}`).toBe(true)
  })
})
```

- [ ] **Step 2: Run the suite to verify it passes**

Run: `pnpm exec vitest run src/core/testing/engine.test.ts`
Expected: PASS — all 15 composites (Not … DMux8Way) green, each built from a single NAND.

- [ ] **Step 3: Commit**

```bash
git add src/core/testing/engine.test.ts
git commit -m "test(testing): 15 composites pass official .tst when compiled from a single NAND"
```

---

### Final verification (Definition of Done)

- [ ] **Step 1: Run the full DoD gates from the worktree root**

```bash
pnpm run lint
pnpm run test:run
pnpm run test:e2e:store
pnpm run build
```

Expected: each exits 0. (`test:run` includes the new `engine.test.ts` — 7 unit + 16 + 15 acceptance cases.)

- [ ] **Step 2: Update the Phase 0.5 checklist**

In `docs/plans/phase-0.5-tickets-CHECKLIST.md`, change the P05-17 row from `- [ ]` to `- [x]`. Commit:

```bash
git add docs/plans/phase-0.5-tickets-CHECKLIST.md
git commit -m "docs(p05-17): mark test execution engine done in phase-0.5 checklist"
```

- [ ] **Step 3: Hand off** to the `requesting-code-review` skill (self-review) and then `finishing-a-development-branch` (PR), per the HACER workflow.

---

## Self-Review

**Spec coverage:**
- Functional engine over `evaluateChip` → Task 1/2/3. ✅
- `RunTestOptions` (registry, chip, cmpData, loadCmpFile, maxDepth) → Task 1 types. ✅
- `compare-to` precedence (explicit `cmpData` wins) → Task 2 `cmpExplicit`. ✅
- `output` value resolution `lastOutputs ?? inputs ?? 0`, `.cmp` column order → Task 1 (resolution) + Task 2 (column order). ✅
- `firstFailure` + row-count guard → Task 2. ✅
- Error model (no throws; unknown chip / eval-before-load / eval-throws) → Task 3. ✅
- Gold standard A (16 builtins) → Task 4. ✅
- Gold standard B (15 composites from NAND) → Task 5. ✅
- `repeat`/`while` dropped → not implemented (correct; parser never emits them). ✅
- Export from `testing/index.ts` → Task 1 Step 4. ✅
- DoD gates + checklist tick → Final verification. ✅

**Placeholder scan:** none — every step has complete code or an exact command.

**Type consistency:** `RunTestOptions`/`TestResult`/`TestFailure`/`OutputRow` identical across tasks; `runTest(script, options)` signature stable from Task 1; `compareCmpRow(actual, expected, columns, row)` and `CmpMismatch {row,column,expected,actual}` match the verified `cmpParser` surface; `hdlChipDefinition(ast, source)` and `parseHDL` match the verified `hdl` surface; `evaluateChip(chip, inputs, registry, opts?)` matches the verified P05-16 seam.
