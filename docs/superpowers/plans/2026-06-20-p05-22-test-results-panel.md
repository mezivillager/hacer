# P05-22 Test Results Panel Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A "Test Lab" panel that runs a Project-1 chip's official `.tst` against a selectable implementation source and renders the result (output table + red diff cell + pass/fail summary).

**Architecture:** A pluggable `ChipImplementationSource` registry in `src/core/testing/` (builtin / HDL-from-NAND now; user/canvas later). Test execution is a Zustand store action `runChipTest` (AI-Agent-Parity + clean `@store` E2E) that calls the P05-17 functional engine and writes `testResult`/`testColumns`/`completedChips` to the store. `TestResultsPanel` is a thin view in the `RightActionBar` `'tests'` drawer. Completion persists to `localStorage['hacer-completed-chips']`.

**Tech Stack:** React 19 + React Compiler, TypeScript 5.9 strict, Zustand (+Immer), Vitest + Testing Library, Playwright.

## Global Constraints

- Package manager **pnpm@10.x**, **Node ≥ 22**. Run all commands from inside `hacer-wt-p05-22/`.
- **TDD iron law** — failing test first, watch it fail, then minimal implementation.
- **Definition of Done (all exit 0):** `pnpm run lint` · `pnpm run test:run` · `pnpm run test:e2e:store` · `pnpm run build`.
- **React Compiler is ON — never add `useMemo`/`useCallback`/`React.memo`.** ESLint enforces this.
- **State:** read with narrow selectors `useCircuitStore(s => s.x)`; mutate ONLY via `circuitActions.*` / slice `set`. Never mutate the store directly; never use Valtio.
- **UI:** primitives from `@/components/ui-kit/`; one component per file. No `console.log`/`alert` — user feedback via `addStatus` / `@/lib/notify`.
- Tests colocated (`*.test.ts(x)`). `@/` maps to `src/`.
- Commits: conventional-commit format, **no AI attribution**. Never commit to `main`; do not bypass hooks (`--no-verify`).
- Single-file test: `pnpm exec vitest run <path>`.

---

### Task 1: Implementation-source registry (`implementationSources.ts`)

**Files:**
- Create: `src/core/testing/implementationSources.ts`
- Test: `src/core/testing/implementationSources.test.ts`

**Interfaces:**
- Consumes: `getBuiltinChipRegistry()` from `../chips/appRegistry`; `createChipRegistry`, `registerBuiltin` from `../chips/registry`; `hdlChipDefinition` from `../hdl/compiler`; `parseHDL` from `../hdl/parser`; `project1HdlSources`, `project1DependencyOrder` from `../hdl/project1HdlSources`; types `ChipDefinition` (`../chips/types`), `ChipRegistry` (`../chips/registry`).
- Produces: `interface ChipImplementationSource { id: string; label: string; resolve(chipName: string): { chip: ChipDefinition; registry: ChipRegistry } | null }`; `getImplementationSources(): ChipImplementationSource[]`; `getImplementationSource(id: string): ChipImplementationSource | undefined`; `registerImplementationSource(source): void`; `resetImplementationSourcesForTests(): void`.

- [ ] **Step 1: Write the failing test**

Create `src/core/testing/implementationSources.test.ts`:

```ts
import { describe, it, expect, beforeEach } from 'vitest'
import {
  getImplementationSources,
  getImplementationSource,
  registerImplementationSource,
  resetImplementationSourcesForTests,
} from './implementationSources'
import { isHDLChip, isBuiltinChip } from '../chips/types'

beforeEach(() => resetImplementationSourcesForTests())

describe('implementationSources', () => {
  it('ships builtin and hdl-from-nand sources', () => {
    expect(getImplementationSources().map((s) => s.id)).toEqual(['builtin', 'hdl-from-nand'])
    expect(getImplementationSource('builtin')).toBeDefined()
    expect(getImplementationSource('nope')).toBeUndefined()
  })

  it('builtin source resolves builtin chips', () => {
    const r = getImplementationSource('builtin')!.resolve('Mux16')
    expect(r).not.toBeNull()
    expect(isBuiltinChip(r!.chip)).toBe(true)
    expect(getImplementationSource('builtin')!.resolve('Nope')).toBeNull()
  })

  it('hdl-from-nand resolves composites as HDL chips built from a single NAND', () => {
    const src = getImplementationSource('hdl-from-nand')!
    const mux = src.resolve('Mux')
    expect(mux).not.toBeNull()
    expect(isHDLChip(mux!.chip)).toBe(true)
    // The registry it returns must also contain Nand (the base) so the chip can evaluate.
    expect(mux!.registry.get('Nand')).toBeDefined()
    expect(src.resolve('Nope')).toBeNull()
  })

  it('supports registering and resetting sources', () => {
    registerImplementationSource({ id: 'x', label: 'X', resolve: () => null })
    expect(getImplementationSource('x')).toBeDefined()
    resetImplementationSourcesForTests()
    expect(getImplementationSource('x')).toBeUndefined()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm exec vitest run src/core/testing/implementationSources.test.ts`
Expected: FAIL — `Failed to resolve import "./implementationSources"`.

- [ ] **Step 3: Write minimal implementation**

Create `src/core/testing/implementationSources.ts`:

```ts
// src/core/testing/implementationSources.ts
import type { ChipDefinition } from '../chips/types'
import type { ChipRegistry } from '../chips/registry'
import { createChipRegistry, registerBuiltin } from '../chips/registry'
import { getBuiltinChipRegistry } from '../chips/appRegistry'
import { hdlChipDefinition } from '../hdl/compiler'
import { parseHDL } from '../hdl/parser'
import { project1HdlSources, project1DependencyOrder } from '../hdl/project1HdlSources'

export interface ResolvedChip {
  chip: ChipDefinition
  registry: ChipRegistry
}

export interface ChipImplementationSource {
  id: string
  label: string
  /** Resolve the chip-under-test + the registry to evaluate it (sub-parts), or null. */
  resolve(chipName: string): ResolvedChip | null
}

const builtinSource: ChipImplementationSource = {
  id: 'builtin',
  label: 'Builtin reference',
  resolve(chipName) {
    const registry = getBuiltinChipRegistry()
    const chip = registry.get(chipName)
    return chip ? { chip, registry } : null
  },
}

let hdlRegistryCache: ChipRegistry | null = null
function buildHdlFromNandRegistry(): ChipRegistry {
  if (hdlRegistryCache) return hdlRegistryCache
  const reg = createChipRegistry()
  registerBuiltin(
    reg,
    'Nand',
    [{ name: 'a', width: 1 }, { name: 'b', width: 1 }],
    [{ name: 'out', width: 1 }],
    (i) => ({ out: ~(i.a & i.b) & 1 }),
  )
  for (const name of project1DependencyOrder) {
    const ast = parseHDL(project1HdlSources[name])
    if (!ast.success) {
      throw new Error(`HDL parse failed for ${name}: ${ast.errors.map((e) => e.message).join('; ')}`)
    }
    reg.register(hdlChipDefinition(ast.chip, project1HdlSources[name]))
  }
  hdlRegistryCache = reg
  return reg
}

const hdlFromNandSource: ChipImplementationSource = {
  id: 'hdl-from-nand',
  label: 'Built from NAND',
  resolve(chipName) {
    const registry = buildHdlFromNandRegistry()
    const chip = registry.get(chipName)
    return chip ? { chip, registry } : null
  },
}

const DEFAULT_SOURCES: ChipImplementationSource[] = [builtinSource, hdlFromNandSource]
let sources: ChipImplementationSource[] = [...DEFAULT_SOURCES]

export function getImplementationSources(): ChipImplementationSource[] {
  return sources
}

export function getImplementationSource(id: string): ChipImplementationSource | undefined {
  return sources.find((s) => s.id === id)
}

/** Register/replace a source by id (future: user chips P05-18, canvas P05-26). */
export function registerImplementationSource(source: ChipImplementationSource): void {
  sources = [...sources.filter((s) => s.id !== source.id), source]
}

/** TEST-ONLY: restore the default sources and clear the HDL registry cache. */
export function resetImplementationSourcesForTests(): void {
  sources = [...DEFAULT_SOURCES]
  hdlRegistryCache = null
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm exec vitest run src/core/testing/implementationSources.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add src/core/testing/implementationSources.ts src/core/testing/implementationSources.test.ts
git commit -m "feat(testing): pluggable chip implementation-source registry (builtin, hdl-from-nand)"
```

---

### Task 2: Completion persistence (`chipCompletion.ts`)

**Files:**
- Create: `src/core/testing/chipCompletion.ts`
- Test: `src/core/testing/chipCompletion.test.ts`

**Interfaces:**
- Produces: `readCompletedChips(): string[]`; `markChipCompleted(chipName: string): string[]` (returns the new list). Storage key `hacer-completed-chips`, value `JSON.stringify(string[])` — the contract P05-19 reuses.

- [ ] **Step 1: Write the failing test**

Create `src/core/testing/chipCompletion.test.ts`:

```ts
import { describe, it, expect, beforeEach } from 'vitest'
import { readCompletedChips, markChipCompleted } from './chipCompletion'

beforeEach(() => localStorage.clear())

describe('chipCompletion', () => {
  it('reads an empty list when nothing is stored', () => {
    expect(readCompletedChips()).toEqual([])
  })

  it('marks a chip completed and persists it', () => {
    expect(markChipCompleted('Not')).toEqual(['Not'])
    expect(readCompletedChips()).toEqual(['Not'])
    expect(JSON.parse(localStorage.getItem('hacer-completed-chips')!)).toEqual(['Not'])
  })

  it('does not duplicate an already-completed chip', () => {
    markChipCompleted('Not')
    expect(markChipCompleted('Not')).toEqual(['Not'])
  })

  it('returns an empty list on corrupt storage', () => {
    localStorage.setItem('hacer-completed-chips', 'not json{')
    expect(readCompletedChips()).toEqual([])
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm exec vitest run src/core/testing/chipCompletion.test.ts`
Expected: FAIL — `Failed to resolve import "./chipCompletion"`.

- [ ] **Step 3: Write minimal implementation**

Create `src/core/testing/chipCompletion.ts`:

```ts
// src/core/testing/chipCompletion.ts
// Persisted "verified chips" contract — shared with the future P05-19 chip browser.
const KEY = 'hacer-completed-chips'

export function readCompletedChips(): string[] {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return []
    const parsed: unknown = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed.filter((x): x is string => typeof x === 'string') : []
  } catch {
    return []
  }
}

export function markChipCompleted(chipName: string): string[] {
  const current = readCompletedChips()
  if (current.includes(chipName)) return current
  const next = [...current, chipName]
  try {
    localStorage.setItem(KEY, JSON.stringify(next))
  } catch {
    /* storage unavailable — keep the in-memory list */
  }
  return next
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm exec vitest run src/core/testing/chipCompletion.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add src/core/testing/chipCompletion.ts src/core/testing/chipCompletion.test.ts
git commit -m "feat(testing): persist completed chips to localStorage (hacer-completed-chips)"
```

---

### Task 3: `runChipTest` store action + test state

**Files:**
- Create: `src/store/actions/testActions/testActions.ts`
- Test: `src/store/actions/testActions/testActions.test.ts`
- Modify: `src/store/types.ts` (add test state + `TestActions`), `src/store/circuitStore.ts` (initial state, spread slice, `circuitActions` thunks), `src/store/actions/index.ts` (export `createTestActions`)

**Interfaces:**
- Consumes: `runTest`, `TestResult` from `@/core/testing/engine`; `parseTST` (`@/core/testing/tstParser`); `parseCmp`, `CmpFile` (`@/core/testing/cmpParser`); `project1TstFixtures`, `project1CmpFixtures`; `getImplementationSource` (Task 1); `markChipCompleted` (Task 2); `CircuitStore` (`../../types`).
- Produces: `createTestActions(set, get)` ; `interface TestActions { runChipTest: (chipName: string, sourceId: string) => void; clearTestResult: () => void }`. New state on `CircuitState`: `testResult: TestResult | null`, `testColumns: string[]`, `completedChips: string[]`. `circuitActions.runChipTest(chipName, sourceId)` / `circuitActions.clearTestResult()`.

- [ ] **Step 1: Add state + action types to `src/store/types.ts`**

Add the import near the top (with the other type imports):

```ts
import type { TestResult } from '@/core/testing/engine'
```

Add these fields to the `CircuitState` interface (alongside the existing state fields):

```ts
  testResult: TestResult | null
  testColumns: string[]
  completedChips: string[]
```

Add a new interface (next to the other `*Actions` interfaces):

```ts
export interface TestActions {
  /** Run a chip's official .tst against the chosen implementation source; writes testResult/testColumns. */
  runChipTest: (chipName: string, sourceId: string) => void
  clearTestResult: () => void
}
```

Extend the combined store interface (append `TestActions` to the existing `extends` list):

```ts
export interface CircuitStore extends CircuitState, /* …existing… */ TestActions {}
```

- [ ] **Step 2: Write the failing test**

Create `src/store/actions/testActions/testActions.test.ts`:

```ts
import { describe, it, expect, beforeEach } from 'vitest'
import { useCircuitStore, circuitActions } from '@/store/circuitStore'
import {
  registerImplementationSource,
  resetImplementationSourcesForTests,
} from '@/core/testing/implementationSources'
import { createChipRegistry, registerBuiltin } from '@/core/chips/registry'

beforeEach(() => {
  localStorage.clear()
  resetImplementationSourcesForTests()
  useCircuitStore.setState({ testResult: null, testColumns: [], completedChips: [] })
})

describe('runChipTest', () => {
  it('passes Not against the builtin source and marks it completed', () => {
    circuitActions.runChipTest('Not', 'builtin')
    const s = useCircuitStore.getState()
    expect(s.testResult?.passed).toBe(true)
    expect(s.testColumns).toEqual(['in', 'out'])
    expect(s.completedChips).toContain('Not')
    expect(JSON.parse(localStorage.getItem('hacer-completed-chips') ?? '[]')).toContain('Not')
  })

  it('sets an error result for an unknown source', () => {
    circuitActions.runChipTest('Not', 'nope')
    expect(useCircuitStore.getState().testResult?.error).toMatch(/source/i)
  })

  it('reports firstFailure when the implementation is wrong', () => {
    const reg = createChipRegistry()
    registerBuiltin(reg, 'Not', [{ name: 'in', width: 1 }], [{ name: 'out', width: 1 }], () => ({ out: 0 }))
    registerImplementationSource({
      id: 'broken',
      label: 'Broken',
      resolve: (name) => (name === 'Not' ? { chip: reg.get('Not')!, registry: reg } : null),
    })
    circuitActions.runChipTest('Not', 'broken')
    const r = useCircuitStore.getState().testResult
    expect(r?.passed).toBe(false)
    expect(r?.firstFailure).toMatchObject({ row: 0, column: 'out' })
  })

  it('clearTestResult resets the result', () => {
    circuitActions.runChipTest('Not', 'builtin')
    circuitActions.clearTestResult()
    expect(useCircuitStore.getState().testResult).toBeNull()
  })
})
```

- [ ] **Step 3: Run test to verify it fails**

Run: `pnpm exec vitest run src/store/actions/testActions/testActions.test.ts`
Expected: FAIL — `runChipTest is not a function` (and/or unresolved import of `testActions`).

- [ ] **Step 4: Implement the slice**

Create `src/store/actions/testActions/testActions.ts`:

```ts
// src/store/actions/testActions/testActions.ts
import type { CircuitStore } from '../../types'
import type { TestResult } from '@/core/testing/engine'
import type { CmpFile } from '@/core/testing/cmpParser'
import { runTest } from '@/core/testing/engine'
import { parseTST } from '@/core/testing/tstParser'
import { parseCmp } from '@/core/testing/cmpParser'
import { project1TstFixtures } from '@/core/testing/project1TstFixtures'
import { project1CmpFixtures } from '@/core/testing/project1CmpFixtures'
import { getImplementationSource } from '@/core/testing/implementationSources'
import { markChipCompleted } from '@/core/testing/chipCompletion'

type SetState = (fn: (state: CircuitStore) => void, replace?: false, actionName?: string) => void
type GetState = () => CircuitStore

export interface TestActions {
  runChipTest: (chipName: string, sourceId: string) => void
  clearTestResult: () => void
}

function parseCmpFixture(name: string): CmpFile | null {
  const raw = project1CmpFixtures[name.replace(/\.cmp$/i, '')]
  if (!raw) return null
  const r = parseCmp(raw)
  return r.success ? r.file : null
}

export const createTestActions = (set: SetState, get: GetState): TestActions => ({
  runChipTest: (chipName, sourceId) => {
    const fail = (error: string) => {
      const result: TestResult = {
        passed: false, totalSteps: 0, passedSteps: 0, outputRows: [], firstFailure: null, error,
      }
      set((s) => { s.testResult = result; s.testColumns = [] }, false, 'runChipTest')
      get().addStatus('error', `${chipName}: ${error}`)
    }

    const source = getImplementationSource(sourceId)
    if (!source) return fail(`unknown implementation source "${sourceId}"`)
    const resolved = source.resolve(chipName)
    if (!resolved) return fail(`no "${chipName}" implementation from source "${sourceId}"`)
    const tstRaw = project1TstFixtures[chipName]
    if (!tstRaw) return fail(`no test fixture for "${chipName}"`)
    const tst = parseTST(tstRaw)
    if (!tst.success) return fail(`TST parse error: ${tst.errors[0]?.message ?? 'unknown'}`)

    const result = runTest(tst.script, {
      registry: resolved.registry,
      chip: resolved.chip,
      cmpData: parseCmpFixture(chipName) ?? undefined,
      loadCmpFile: (filename) => parseCmpFixture(filename),
    })
    const outputList = tst.script.commands.find((c) => c.type === 'output-list')
    const columns = outputList && outputList.type === 'output-list' ? outputList.columns.map((c) => c.name) : []
    const completed = result.passed ? markChipCompleted(chipName) : get().completedChips

    set((s) => {
      s.testResult = result
      s.testColumns = columns
      s.completedChips = completed
    }, false, 'runChipTest')

    if (result.passed) get().addStatus('info', `${chipName}: comparison ended successfully`)
    else if (result.error) get().addStatus('error', `${chipName}: ${result.error}`)
    else if (result.firstFailure) {
      get().addStatus('error', `${chipName}: failure at row ${result.firstFailure.row}, column '${result.firstFailure.column}'`)
    }
  },

  clearTestResult: () => {
    set((s) => { s.testResult = null; s.testColumns = [] }, false, 'clearTestResult')
  },
})
```

- [ ] **Step 5: Wire the slice into the store**

In `src/store/actions/index.ts`, add:

```ts
export { createTestActions } from './testActions/testActions'
```

In `src/store/circuitStore.ts`: import `createTestActions` (with the other slice imports) and `readCompletedChips` from `@/core/testing/chipCompletion`. Add the test fields to the initial-state object:

```ts
  testResult: null,
  testColumns: [],
  completedChips: readCompletedChips(),
```

Spread the slice inside the `immer((set, get) => ({ ... }))` object alongside the others:

```ts
        ...createTestActions(set, get),
```

Add the thunks to the exported `circuitActions` object:

```ts
  runChipTest: (chipName: string, sourceId: string) => useCircuitStore.getState().runChipTest(chipName, sourceId),
  clearTestResult: () => useCircuitStore.getState().clearTestResult(),
```

- [ ] **Step 6: Run test to verify it passes**

Run: `pnpm exec vitest run src/store/actions/testActions/testActions.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 7: Commit**

```bash
git add src/store/actions/testActions/ src/store/types.ts src/store/circuitStore.ts src/store/actions/index.ts
git commit -m "feat(store): runChipTest action + test state (testResult/testColumns/completedChips)"
```

---

### Task 4: `TestResultsPanel` component

**Files:**
- Create: `src/components/ui/TestResultsPanel.tsx`
- Test: `src/components/ui/TestResultsPanel.test.tsx`

**Interfaces:**
- Consumes: `useCircuitStore`, `circuitActions` (`@/store/circuitStore`); `Button` (`@/components/ui-kit/button`); `project1TstFixtures` (`@/core/testing/project1TstFixtures`); `getImplementationSources` (Task 1). Store fields `testResult`, `testColumns`, `completedChips`; action `runChipTest`.
- Produces: `export function TestResultsPanel()`. Test ids: `test-results-panel`, `test-chip-select`, `test-source-select`, `run-test-button`, `test-summary`, `output-table`, `output-row-<i>`, `fail-cell`.

- [ ] **Step 1: Write the failing test**

Create `src/components/ui/TestResultsPanel.test.tsx`:

```tsx
import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { TestResultsPanel } from './TestResultsPanel'
import { useCircuitStore } from '@/store/circuitStore'
import {
  registerImplementationSource,
  resetImplementationSourcesForTests,
} from '@/core/testing/implementationSources'
import { createChipRegistry, registerBuiltin } from '@/core/chips/registry'

beforeEach(() => {
  localStorage.clear()
  resetImplementationSourcesForTests()
  useCircuitStore.setState({ testResult: null, testColumns: [], completedChips: [] })
})

describe('TestResultsPanel', () => {
  it('renders the run button and selectors', () => {
    render(<TestResultsPanel />)
    expect(screen.getByTestId('run-test-button')).toBeTruthy()
    expect(screen.getByTestId('test-chip-select')).toBeTruthy()
    expect(screen.getByTestId('test-source-select')).toBeTruthy()
  })

  it('runs Not against the builtin and shows success + a table', () => {
    render(<TestResultsPanel />)
    fireEvent.change(screen.getByTestId('test-chip-select'), { target: { value: 'Not' } })
    fireEvent.change(screen.getByTestId('test-source-select'), { target: { value: 'builtin' } })
    fireEvent.click(screen.getByTestId('run-test-button'))
    expect(screen.getByTestId('test-summary').textContent).toContain('Comparison ended successfully')
    expect(screen.getByTestId('output-table')).toBeTruthy()
    expect(screen.getByTestId('output-row-0')).toBeTruthy()
  })

  it('highlights the failing cell for a broken implementation', () => {
    const reg = createChipRegistry()
    registerBuiltin(reg, 'Not', [{ name: 'in', width: 1 }], [{ name: 'out', width: 1 }], () => ({ out: 0 }))
    registerImplementationSource({
      id: 'broken', label: 'Broken',
      resolve: (n) => (n === 'Not' ? { chip: reg.get('Not')!, registry: reg } : null),
    })
    render(<TestResultsPanel />)
    fireEvent.change(screen.getByTestId('test-chip-select'), { target: { value: 'Not' } })
    fireEvent.change(screen.getByTestId('test-source-select'), { target: { value: 'broken' } })
    fireEvent.click(screen.getByTestId('run-test-button'))
    expect(screen.getByTestId('fail-cell')).toBeTruthy()
    expect(screen.getByTestId('test-summary').textContent).toContain('Comparison failure')
  })

  it('marks a passed chip with a ✓ in the dropdown', () => {
    render(<TestResultsPanel />)
    fireEvent.change(screen.getByTestId('test-chip-select'), { target: { value: 'Not' } })
    fireEvent.click(screen.getByTestId('run-test-button'))
    expect(screen.getByTestId('test-chip-select').textContent).toContain('✓ Not')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm exec vitest run src/components/ui/TestResultsPanel.test.tsx`
Expected: FAIL — `Failed to resolve import "./TestResultsPanel"`.

- [ ] **Step 3: Write minimal implementation**

Create `src/components/ui/TestResultsPanel.tsx`:

```tsx
import { useState } from 'react'
import { Button } from '@/components/ui-kit/button'
import { useCircuitStore, circuitActions } from '@/store/circuitStore'
import { project1TstFixtures } from '@/core/testing/project1TstFixtures'
import { getImplementationSources } from '@/core/testing/implementationSources'

const CHIP_NAMES = Object.keys(project1TstFixtures)
const SELECT_CLASS = 'font-mono text-xs rounded border border-border bg-background px-2 py-1 cursor-pointer'

export function TestResultsPanel() {
  const sources = getImplementationSources()
  const [chipName, setChipName] = useState<string>(CHIP_NAMES[0] ?? '')
  const [sourceId, setSourceId] = useState<string>(sources[0]?.id ?? 'builtin')
  const testResult = useCircuitStore((s) => s.testResult)
  const testColumns = useCircuitStore((s) => s.testColumns)
  const completedChips = useCircuitStore((s) => s.completedChips)

  return (
    <div data-testid="test-results-panel" className="space-y-3">
      <div className="flex flex-col gap-1.5">
        <label className="text-xs text-muted-foreground">Chip</label>
        <select
          data-testid="test-chip-select"
          className={SELECT_CLASS}
          value={chipName}
          onChange={(e) => setChipName(e.target.value)}
        >
          {CHIP_NAMES.map((name) => (
            <option key={name} value={name}>{completedChips.includes(name) ? `✓ ${name}` : name}</option>
          ))}
        </select>
        <label className="text-xs text-muted-foreground">Implementation</label>
        <select
          data-testid="test-source-select"
          className={SELECT_CLASS}
          value={sourceId}
          onChange={(e) => setSourceId(e.target.value)}
        >
          {sources.map((s) => (<option key={s.id} value={s.id}>{s.label}</option>))}
        </select>
      </div>

      <Button
        data-testid="run-test-button"
        size="sm"
        onClick={() => circuitActions.runChipTest(chipName, sourceId)}
        disabled={!chipName}
      >
        Run Test
      </Button>

      {testResult && (
        <div className="space-y-2">
          <div data-testid="test-summary" className="text-xs">
            {testResult.error ? (
              <span className="text-destructive">{testResult.error}</span>
            ) : testResult.passed ? (
              <span className="text-green-500">Comparison ended successfully</span>
            ) : (
              <span className="text-destructive">
                Comparison failure at row {testResult.firstFailure?.row}, column &apos;{testResult.firstFailure?.column}&apos;:
                expected {testResult.firstFailure?.expected}, got {testResult.firstFailure?.actual}
              </span>
            )}
          </div>

          {testResult.outputRows.length > 0 && testColumns.length > 0 && (
            <div data-testid="output-table" className="overflow-x-auto">
              <table className="border-collapse font-mono text-[11px]">
                <thead>
                  <tr>
                    <th className="px-1.5 py-0.5 border-b border-border">#</th>
                    {testColumns.map((col) => (
                      <th key={col} className="px-1.5 py-0.5 border-b border-border">{col}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {testResult.outputRows.map((row, i) => {
                    const failing = !testResult.passed && testResult.firstFailure?.row === i
                    return (
                      <tr key={i} data-testid={`output-row-${i}`}>
                        <td className="px-1.5 py-0.5 text-muted-foreground">{i}</td>
                        {testColumns.map((col) => {
                          const failCol = failing && testResult.firstFailure?.column === col
                          return (
                            <td
                              key={col}
                              data-testid={failCol ? 'fail-cell' : undefined}
                              className={failCol ? 'px-1.5 py-0.5 bg-destructive/20 text-destructive' : 'px-1.5 py-0.5'}
                            >
                              {row.values[col] ?? '-'}
                            </td>
                          )
                        })}
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}

          <div className="text-[11px] text-muted-foreground">Steps: {testResult.passedSteps}/{testResult.totalSteps}</div>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm exec vitest run src/components/ui/TestResultsPanel.test.tsx`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add src/components/ui/TestResultsPanel.tsx src/components/ui/TestResultsPanel.test.tsx
git commit -m "feat(ui): TestResultsPanel — chip/source selectors, run, output table, diff highlight"
```

---

### Task 5: Mount the panel in `RightActionBar`

**Files:**
- Modify: `src/components/ui/RightActionBar.tsx`
- Test: `src/components/ui/RightActionBar.test.tsx`

**Interfaces:**
- Consumes: `TestResultsPanel` (Task 4). Adds `'tests'` to the `ActivePanel` union; trigger test id `right-bar-tests-trigger`.

- [ ] **Step 1: Write the failing test**

Append to `src/components/ui/RightActionBar.test.tsx` (inside the existing top-level `describe`; if the file lacks imports for `render`/`screen`/`fireEvent` from `@testing-library/react`, they are already present — reuse them):

```tsx
  it('opens the Tests panel when the tests trigger is clicked', () => {
    render(<RightActionBar />)
    fireEvent.click(screen.getByTestId('right-bar-tests-trigger'))
    expect(screen.getByTestId('test-results-panel')).toBeTruthy()
  })
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm exec vitest run src/components/ui/RightActionBar.test.tsx`
Expected: FAIL — `Unable to find an element by: [data-testid="right-bar-tests-trigger"]`.

- [ ] **Step 3: Implement**

In `src/components/ui/RightActionBar.tsx`:

1. Add the icon import (extend the existing `lucide-react` import): `FlaskConical`.
2. Import the panel near the other panel imports: `import { TestResultsPanel } from './TestResultsPanel'`.
3. Widen the union: `type ActivePanel = 'info' | 'history' | 'layers' | 'library' | 'tests' | null`.
4. Add a trigger button in the action-bar button column (mirror the existing `Tooltip`+`Button` blocks, e.g. right after the `history` trigger):

```tsx
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                data-testid="right-bar-tests-trigger"
                variant={activePanel === 'tests' ? 'secondary' : 'ghost'}
                size="icon"
                className="w-8 h-8"
                onClick={() => togglePanel('tests')}
              >
                <FlaskConical className="w-4 h-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="left">Tests</TooltipContent>
          </Tooltip>
```

5. Add the header label (in the panel-header `<h3>` block):

```tsx
              {activePanel === 'tests' && 'Tests'}
```

6. Render the panel content (in the panel-content block, alongside the other `activePanel === …` renders):

```tsx
            {activePanel === 'tests' && <TestResultsPanel />}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm exec vitest run src/components/ui/RightActionBar.test.tsx`
Expected: PASS (existing tests + the new one).

- [ ] **Step 5: Commit**

```bash
git add src/components/ui/RightActionBar.tsx src/components/ui/RightActionBar.test.tsx
git commit -m "feat(ui): add Tests panel to RightActionBar"
```

---

### Task 6: Test Lab shell-integration test (RTL — mandatory rigor)

**Files:**
- Create (test): `src/components/ui/TestResultsPanel.integration.test.tsx`

**Interfaces:**
- Consumes: `renderShell()` (`@/test/renderShell`) — mounts the full DOM shell with no Canvas; `circuitActions`/`useCircuitStore`; `resetImplementationSourcesForTests` (Task 1). Requires the `'tests'` trigger from Task 5.

Per AGENTS.md §3 Step 4.1, a non-3D UX feature ships an RTL **integration** test that captures the user scenario across the real shell (not just the isolated component). This renders the whole shell, opens the Tests panel from the action bar, runs a chip, and asserts the result — the end-to-end Test Lab flow in jsdom.

- [ ] **Step 1: Write the integration test**

Create `src/components/ui/TestResultsPanel.integration.test.tsx`:

```tsx
import { describe, it, expect, beforeEach } from 'vitest'
import { screen, fireEvent } from '@testing-library/react'
import { renderShell } from '@/test/renderShell'
import { useCircuitStore, circuitActions } from '@/store/circuitStore'
import { resetImplementationSourcesForTests } from '@/core/testing/implementationSources'

beforeEach(() => {
  localStorage.clear()
  resetImplementationSourcesForTests()
  circuitActions.clearCircuit()
  useCircuitStore.setState({ testResult: null, testColumns: [], completedChips: [] })
})

describe('Test Lab (shell integration)', () => {
  it('user opens the Tests panel from the action bar, runs a chip, and sees a passing result', () => {
    renderShell()
    // The panel is not visible until the user opens it from the RightActionBar.
    expect(screen.queryByTestId('test-results-panel')).toBeNull()
    fireEvent.click(screen.getByTestId('right-bar-tests-trigger'))
    expect(screen.getByTestId('test-results-panel')).toBeTruthy()

    fireEvent.change(screen.getByTestId('test-chip-select'), { target: { value: 'Not' } })
    fireEvent.change(screen.getByTestId('test-source-select'), { target: { value: 'builtin' } })
    fireEvent.click(screen.getByTestId('run-test-button'))

    expect(screen.getByTestId('test-summary').textContent).toContain('Comparison ended successfully')
    expect(screen.getByTestId('output-table')).toBeTruthy()
    expect(screen.getByTestId('output-row-0')).toBeTruthy()
  })
})
```

- [ ] **Step 2: Run it to verify it passes**

Run: `pnpm exec vitest run src/components/ui/TestResultsPanel.integration.test.tsx`
Expected: PASS. (The whole shell renders with no Canvas — `renderShell()` injects no scene.) If `right-bar-tests-trigger` isn't found, Task 5 isn't complete.

- [ ] **Step 3: Commit**

```bash
git add src/components/ui/TestResultsPanel.integration.test.tsx
git commit -m "test(ui): Test Lab shell-integration test (open panel -> run -> result)"
```

---

### Task 7: `@store` E2E + globals types

**Files:**
- Modify: `e2e/types/globals.ts`
- Create: `e2e/specs/testing/test-results.store.spec.ts`

**Interfaces:**
- Consumes: `window.__CIRCUIT_ACTIONS__.runChipTest`, `window.__CIRCUIT_STORE__.testResult` (wired automatically once Task 3 surfaces them on `circuitActions` and the store).

- [ ] **Step 1: Extend the E2E global types**

In `e2e/types/globals.ts`: add to the `CircuitStoreSnapshot` interface:

```ts
  testResult: { passed: boolean; error: string | null; firstFailure: { row: number; column: string; expected: string; actual: string } | null } | null
  testColumns: string[]
  completedChips: string[]
```

and add to the `CircuitActionsAPI` interface:

```ts
  runChipTest: (chipName: string, sourceId: string) => void
  clearTestResult: () => void
```

- [ ] **Step 2: Write the failing E2E spec**

Create `e2e/specs/testing/test-results.store.spec.ts`:

```ts
import { test, expect } from '@playwright/test'

test.describe('test execution @store', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await page.waitForFunction(() => window.__CIRCUIT_STORE__ !== undefined)
  })

  test('runChipTest Not/builtin passes', async ({ page }) => {
    await page.evaluate(() => window.__CIRCUIT_ACTIONS__?.runChipTest('Not', 'builtin'))
    const passed = await page.evaluate(() => window.__CIRCUIT_STORE__?.testResult?.passed)
    expect(passed).toBe(true)
  })

  test('runChipTest with an unknown source sets an error', async ({ page }) => {
    await page.evaluate(() => window.__CIRCUIT_ACTIONS__?.runChipTest('Not', 'nope'))
    const error = await page.evaluate(() => window.__CIRCUIT_STORE__?.testResult?.error)
    expect(error).toBeTruthy()
  })
})
```

- [ ] **Step 3: Run the spec to verify it passes**

Run: `pnpm exec playwright test -g "test execution @store"`
Expected: PASS (2 tests). If it fails to find the action, confirm Task 3 added `runChipTest` to `circuitActions` (the window object is populated from it).

- [ ] **Step 4: Commit**

```bash
git add e2e/types/globals.ts e2e/specs/testing/test-results.store.spec.ts
git commit -m "test(e2e): @store coverage for runChipTest (pass + unknown-source error)"
```

---

### Final verification (Definition of Done)

- [ ] **Step 1: Run all four DoD gates from the worktree root**

```bash
pnpm run lint
pnpm run test:run
pnpm run test:e2e:store
pnpm run build
```

Expected: each exits 0.

- [ ] **Step 2: Tick the phase checklist**

In `docs/plans/phase-0.5-tickets-CHECKLIST.md`, change the P05-22 row `- [ ]` → `- [x]`. Commit:

```bash
git add docs/plans/phase-0.5-tickets-CHECKLIST.md
git commit -m "docs(p05-22): mark test results panel done in phase-0.5 checklist"
```

- [ ] **Step 3: Hand off** to `requesting-code-review` (self-review) then `finishing-a-development-branch` (PR), and run `docs-sync` (ADR for the implementation-source seam + AI-parity store action; REPO_MAP for the new files).

---

## Self-Review

**Spec coverage:**
- Pluggable implementation source (builtin / hdl-from-nand; register/reset) → Task 1. ✅
- Completion contract `hacer-completed-chips` → Task 2. ✅
- `runChipTest` store action + state + `addStatus` + completion → Task 3. ✅ (sync, not Promise; `testRunning` dropped — sync execution can't surface it.)
- Thin panel: chip/source selectors, Run, summary, output table, red diff cell, ✓ marker, steps → Task 4. ✅
- RightActionBar `'tests'` drawer → Task 5. ✅
- RTL **integration** test (Test Lab flow via `renderShell`) per AGENTS.md §3 Step 4.1 rigor → Task 6. ✅
- `@store` E2E + globals → Task 7. ✅
- DoD + checklist tick → Final. ✅
- Ticket already revised + spec committed (rebased onto main with the test foundation).

**Placeholder scan:** none — every step has complete code or an exact command.

**Type consistency:** `runChipTest(chipName: string, sourceId: string): void` and `clearTestResult(): void` identical across types/slice/circuitActions/globals/tests; `ChipImplementationSource.resolve → { chip, registry } | null` consistent across Task 1/3/4 tests; `TestResult`/`firstFailure` shape matches the verified P05-17 engine; `addStatus(severity, text)` matches the verified statusActions; store fields `testResult`/`testColumns`/`completedChips` consistent across types, slice, initial state, component, and E2E globals.

**Note on "always green today":** with only reference sources, real runs pass; the fail/red-diff path is proven via the broken registered source in Tasks 3 & 4 and lights up when a fallible source (user/canvas) registers — by design.
