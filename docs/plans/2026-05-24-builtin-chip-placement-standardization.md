# Builtin Chip Placement Standardization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace HACER's hardcoded 7-`GateType` placement system with a registry-driven system that exposes all 16 Project 1 builtin chips as the only placeable units, each rendered in a uniform 3D box with a name label and one bus pin per declared port.

**Architecture:** The `ChipRegistry` (already shipped by P05-01) becomes the runtime source of truth, accessed via two app-level singletons (`getBuiltinChipRegistry()` and `getUserChipRegistry()`). All 16 builtins are registered at module load. Every placeable unit on the canvas is a `GateInstance` whose `chipName: string` references a registry entry. A single generic `ChipBody3D` component renders any chip by reading its `ChipDefinition.inputs/outputs`. The toolbar selector lists chips from the registry, grouped by category. Simulation evaluates by calling `registry.get(chipName).implementation.evaluate(inputsByName)` instead of `gateLogic[type](inputsArray)`. NOR and XNOR are removed (not in Project 1); NAND/AND/OR/NOT/XOR survive as registry entries.

**Tech Stack:** React 19 + React Compiler (no manual memo), Zustand, React Three Fiber, Vitest, Playwright. Use `useCircuitStore(s => s.x)` for reads and `circuitActions.*()` for mutations. Never mutate the store directly. Use the `notify` helper at `@/lib/notify` for user-facing messages.

**Out of scope (do NOT pull in):**
- Composing user chips from parts (P05-16 HDL compiler, P05-18 hierarchy eval, P05-24 composite chip 3D rendering)
- Bus splitter/joiner 3D components (P05-12 stays separate)
- Test results panel (P05-22 stays separate)
- Builtin/user toggle UI (P05-23 — meaningless until user-defined chips exist; defer)
- HDL editor UI (P05-21)
- Bit-level pin breakouts on the chip body (industry standard: one socket per port, width labelled; bit access via P05-12 splitter)

---

## Overview of changes

| Area | Before | After |
|---|---|---|
| Placeable types | 7 `GateType` strings (`NAND`/`AND`/`OR`/`NOT`/`NOR`/`XOR`/`XNOR`), single-bit gate logic in `gateLogic.ts` | 16 builtins from `ChipRegistry` (`Nand`, `Not`, `And`, `Or`, `Xor`, `Mux`, `DMux`, `Not16`, `And16`, `Or16`, `Mux16`, `Or8Way`, `Mux4Way16`, `Mux8Way16`, `DMux4Way`, `DMux8Way`); evaluate functions live on each `ChipDefinition` |
| Store | `GateInstance.type: GateType`, `placementMode: GateType \| null`, `addGate(type)` | `GateInstance.chipName: string`, `placementMode: string \| null`, `addGate(chipName)` |
| 3D rendering | `GateRenderer` switch over 5 components (`NandGate`/`AndGate`/`OrGate`/`NotGate`/`XorGate`), per-gate configs in `src/gates/config/*` | One `ChipBody3D` component driven by `ChipDefinition`; uniform box body with chip-name label on top face; pins laid out from `chip.inputs`/`chip.outputs` |
| Selector | Hardcoded 7-gate array in `CompactToolbar.tsx` with 2D SVG icons | Reads from `getBuiltinChipRegistry().list()`, 16 entries grouped by category, 16 SVG icons in `ChipIcons.tsx` |
| Simulation | `gateLogic[type](inputs[], width)` lookup, positional inputs | `chip.implementation.evaluate(inputsByName)`, pin-name keyed inputs/outputs |
| Persistence | `SerializedGate.type: string` (already a string field) | Same field name; legacy migration maps `'NAND'→'Nand'`, etc.; `'NOR'`/`'XNOR'` saves are unloadable (warn) |
| `src/gates/` module | 5 components + 5 config files + helpers | Deleted; replaced by `ChipBody3D` and generic helpers |

---

## File Structure

### Files to Create

| Path | Responsibility |
|---|---|
| `src/core/chips/builtins/project01.ts` | Single `registerProject1Builtins(registry)` that registers all 16 chips with correct evaluate functions and pin definitions |
| `src/core/chips/builtins/project01.test.ts` | Vitest. Iterates `project1CmpFixtures` for full row-by-row coverage of every chip |
| `src/core/chips/appRegistry.ts` | Module-level singletons: `getBuiltinChipRegistry()` (immutable, populated by `registerProject1Builtins`) and `getUserChipRegistry()` (will hold compiled HDL/circuit chips later). Plus `resetAppRegistriesForTests()` for test isolation |
| `src/core/chips/appRegistry.test.ts` | Vitest. Singleton identity, populated builtins, reset helper |
| `src/components/scene/ChipBody3D.tsx` | Generic R3F mesh for any `ChipDefinition`. Computes box dimensions, lays out pins, renders width labels and chip name |
| `src/components/scene/ChipBody3D.test.tsx` | RTL + R3F render tests. Snapshot pin counts and dimensions for representative chips |
| `src/components/scene/chipBodyLayout.ts` | Pure function `computeChipLayout(chip)` → `{ width, depth, height, pinSlots: PinSlot[] }`. Separated for unit testing |
| `src/components/scene/chipBodyLayout.test.ts` | Vitest. Layout math correctness for 1-pin, 4-pin, 17-pin chips |
| `src/components/ui/icons/ChipIcons.tsx` | 16 SVG icon components (one per chip), exporting `CHIP_ICON_MAP: Record<string, ComponentType>` |
| `src/components/ui/icons/ChipIcons.test.tsx` | Smoke test that all 16 icons render |
| `e2e/specs/builtins/placement.store.spec.ts` | Playwright `@store` spec — place each of 16 chips, assert store state |

### Files to Modify

| Path | Change |
|---|---|
| `src/store/types.ts` | Delete `GateType` union; `GateInstance.type` → `GateInstance.chipName: string`; `placementMode: string \| null`; update action signatures (`addGate(chipName, ...)`, `startPlacement(chipName)`) |
| `src/store/actions/gateActions/gateActions.ts` | `createGateInstance(chipName, position, width?)` reads pin defs from `getBuiltinChipRegistry()` |
| `src/store/actions/placementActions/placementActions.ts` | `startPlacement(chipName: string)` accepts any registered chip name |
| `src/simulation/gateLogic.ts` | **DELETE** |
| `src/simulation/topologicalEval.ts` | Replace `gateLogic[type](inputs, width)` with `chip.implementation.evaluate(inputsByName)`; convert positional inputs to named record |
| `src/gates/GateRenderer.tsx` | Replace 6-case `switch` with single `<ChipBody3D chip={...} gate={gate} />` call |
| `src/gates/common/BaseGate.tsx` | Keep, but widen `gateType` prop to `string` and remove the (currently unused) prop entirely — `ChipBody3D` will consume `BaseGate` as the rendering primitive |
| `src/components/ui/CompactToolbar.tsx` | Replace hardcoded `gates` array with `getBuiltinChipRegistry().list()`; group by category; switch from `GateGlyphs` to `ChipIcons` |
| `src/components/ui/icons/GateGlyphs.tsx` | **DELETE** (replaced by ChipIcons) |
| `src/core/serialization/serialize.ts` | Write `chipName` instead of legacy `type` mapping (still under the `type` field — see migration plan in Phase 5) |
| `src/core/serialization/deserialize.ts` | Map legacy `'NAND'/'AND'/'OR'/'NOT'/'XOR'` → `'Nand'/'And'/'Or'/'Not'/'Xor'`; reject `'NOR'/'XNOR'` with `notify.warning` |
| `src/main.tsx` | Call `registerProject1Builtins(getBuiltinChipRegistry())` before `createRoot(...).render(<App />)` |
| `src/gates/components/{NandGate,AndGate,OrGate,NotGate,XorGate}.tsx` | **DELETE** (5 files) |
| `src/gates/components/{NandGate,AndGate,OrGate,NotGate,XorGate}.test.tsx` | **DELETE** (5 test files) |
| `src/gates/config/{nand,and,or,not,xor,common,logic}.ts` and `.tsx` | **DELETE** (~14 files; their roles consumed by `ChipBody3D` + registry) |
| `src/gates/icons/{Nand,And,Or,Not,Xor}Icon.tsx` and `src/gates/icons/index.ts` | **DELETE** (6 files; selector now uses `ChipIcons.tsx`) |
| `src/gates/index.ts` | Re-export only `GateRenderer`, `BaseGate`, `GatePin`, `WireStub`; drop deleted components |
| `e2e/types/globals.ts` | Update `GateType` references to `string`; expose `placementMode` typing as `string \| null` |
| `e2e/specs/gates/gate-types.store.spec.ts` | Update names: `NAND→Nand`, etc.; drop `NOR`/`XNOR` cases; add Project 1 chip cases |
| `e2e/specs/gates/gate-types.ui.spec.ts` | Same as above |
| `e2e/specs/wiring/wire-creation.store.spec.ts` | Update gate-name strings |
| `e2e/specs/wiring/wire-creation.ui.spec.ts` | Update gate-name strings |
| `e2e/helpers/actions/gate.actions.ts` | Update gate-name strings |
| `e2e/helpers/actions/toolbar.actions.ts` | Update gate-name strings |
| `e2e/selectors/ui.selectors.ts` | Update `data-testid` selectors from `gate-button-NAND` to `gate-button-Nand` |
| `e2e/config/constants.ts` | Update gate-name constants |
| `docs/plans/phase-0.5-tickets/P05-15.md` | Refresh per prior review findings (`appRegistry.ts` ownership, `.cmp` fixture tests, scope crossref to this plan) |
| `docs/plans/phase-0.5-tickets/P05-23.md` | Add deferral notice: blocked until user-defined chips ship (P05-16/18/24) |
| `docs/plans/phase-0.5-tickets-CHECKLIST.md` | Add this plan as a Layer 1.5 entry; mark P05-15 superseded by this plan |
| `docs/compatibility/nand2tetris/project1/gap-analysis.md` | Mark GAP-3D-8 requirement #1 as ✅; note requirements #2/#3 still pending (toggle UI deferred) |
| `REPO_MAP.md` | Delete `src/gates/components`, `src/gates/config`, `src/gates/icons` entries; add `src/core/chips/builtins/` and `src/components/scene/ChipBody3D.tsx` |

---

# Phase 0 — Branch setup

### Task 0.1: Create feature branch from main

**Files:** (none — git only)

- [ ] **Step 1: Verify clean working tree**

```bash
git status
```
Expected: `nothing to commit, working tree clean` on `main`.

- [ ] **Step 2: Pull latest main**

```bash
git fetch origin main && git rebase origin/main
```
Expected: `Current branch main is up to date.`

- [ ] **Step 3: Create branch (optionally worktree)**

```bash
git checkout -b feat/builtin-chip-placement
```
Expected: `Switched to a new branch 'feat/builtin-chip-placement'`.

- [ ] **Step 4: Verify branch**

```bash
git rev-parse --abbrev-ref HEAD
```
Expected: `feat/builtin-chip-placement`.

---

# Phase 1 — Builtin registry + appRegistry singleton

**Outcome of phase:** `getBuiltinChipRegistry()` returns a populated registry with all 16 Project 1 chips. Every chip evaluates correctly for every row in `project1CmpFixtures`. Registration happens once at module load. Tests cover singleton identity, fixture-driven correctness, and reset behavior.

### Task 1.1: Write fixture-driven builtin tests (RED)

**Files:**
- Create: `src/core/chips/builtins/project01.test.ts`

- [ ] **Step 1: Write the failing test file**

```typescript
import { describe, it, expect, beforeEach } from 'vitest'
import { createChipRegistry } from '../registry'
import { isBuiltinChip } from '../types'
import type { ChipRegistry } from '../registry'
import { registerProject1Builtins } from './project01'
import { parseCmp } from '@/core/testing/cmpParser'
import { project1CmpFixtures } from '@/core/testing/project1CmpFixtures'

const CHIP_NAMES = [
  'Nand', 'Not', 'And', 'Or', 'Xor', 'Mux', 'DMux',
  'Not16', 'And16', 'Or16', 'Mux16',
  'Or8Way', 'Mux4Way16', 'Mux8Way16', 'DMux4Way', 'DMux8Way',
] as const

/** Map chip name → (input pin names in cmp column order, output pin names in cmp column order). */
const PIN_SCHEMA: Record<typeof CHIP_NAMES[number], { inputs: string[]; outputs: string[] }> = {
  Nand:       { inputs: ['a', 'b'], outputs: ['out'] },
  Not:        { inputs: ['in'], outputs: ['out'] },
  And:        { inputs: ['a', 'b'], outputs: ['out'] },
  Or:         { inputs: ['a', 'b'], outputs: ['out'] },
  Xor:        { inputs: ['a', 'b'], outputs: ['out'] },
  Mux:        { inputs: ['a', 'b', 'sel'], outputs: ['out'] },
  DMux:       { inputs: ['in', 'sel'], outputs: ['a', 'b'] },
  Not16:      { inputs: ['in'], outputs: ['out'] },
  And16:      { inputs: ['a', 'b'], outputs: ['out'] },
  Or16:       { inputs: ['a', 'b'], outputs: ['out'] },
  Mux16:      { inputs: ['a', 'b', 'sel'], outputs: ['out'] },
  Or8Way:     { inputs: ['in'], outputs: ['out'] },
  Mux4Way16:  { inputs: ['a', 'b', 'c', 'd', 'sel'], outputs: ['out'] },
  Mux8Way16:  { inputs: ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'sel'], outputs: ['out'] },
  DMux4Way:   { inputs: ['in', 'sel'], outputs: ['a', 'b', 'c', 'd'] },
  DMux8Way:   { inputs: ['in', 'sel'], outputs: ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'] },
}

let registry: ChipRegistry

beforeEach(() => {
  registry = createChipRegistry()
  registerProject1Builtins(registry)
})

describe('registerProject1Builtins', () => {
  it('registers all 16 chips', () => {
    expect(registry.list()).toHaveLength(16)
  })

  for (const name of CHIP_NAMES) {
    it(`registers ${name}`, () => {
      expect(registry.has(name)).toBe(true)
    })
  }
})

describe('every builtin matches its .cmp fixture row-for-row', () => {
  for (const name of CHIP_NAMES) {
    it(`${name}: all rows match`, () => {
      const parsed = parseCmp(project1CmpFixtures[name])
      expect(parsed.success).toBe(true)
      if (!parsed.success) return

      const chip = registry.get(name)
      expect(chip).toBeDefined()
      if (!chip || !isBuiltinChip(chip)) {
        throw new Error(`${name} is not a registered builtin`)
      }

      const schema = PIN_SCHEMA[name]
      const colIndex = (colName: string): number =>
        parsed.file.columns.findIndex((c) => c.name === colName)

      for (let r = 0; r < parsed.file.rows.length; r++) {
        const row = parsed.file.rows[r]
        const inputs = Object.fromEntries(
          schema.inputs.map((p) => [p, row.values[colIndex(p)]])
        )
        const expected = Object.fromEntries(
          schema.outputs.map((p) => [p, row.values[colIndex(p)]])
        )
        expect(chip.implementation.evaluate(inputs)).toEqual(expected)
      }
    })
  }
})

describe('idempotency', () => {
  it('does not throw when called twice (guards all 16 names)', () => {
    expect(() => registerProject1Builtins(registry)).not.toThrow()
    expect(registry.list()).toHaveLength(16)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
pnpm run test:run -- --run src/core/chips/builtins/project01.test.ts
```
Expected: FAIL — module `./project01` not found.

- [ ] **Step 3: Commit**

```bash
git add src/core/chips/builtins/project01.test.ts
git commit -m "test(chips): fixture-driven coverage for 16 Project 1 builtins"
```

### Task 1.2: Implement `registerProject1Builtins` (GREEN)

**Files:**
- Create: `src/core/chips/builtins/project01.ts`

- [ ] **Step 1: Implement the registration function**

```typescript
import type { ChipRegistry } from '../registry'
import { registerBuiltin } from '../registry'
import type { ChipPin } from '../types'

const MASK16 = 0xFFFF

function pin(name: string, width = 1): ChipPin {
  return { name, width }
}

/**
 * Registers all 16 Project 1 chips into the given registry.
 * Idempotent: silently skips any chip already present.
 *
 * Caller contract:
 * - Inputs are integers in the declared pin width range; defensive masking is
 *   applied only to selectors (`sel`) and to outputs of multi-bit chips.
 * - Multi-bit values are packed integers (LSB at bit 0).
 */
export function registerProject1Builtins(registry: ChipRegistry): void {
  const safe = (
    name: string,
    inputs: ChipPin[],
    outputs: ChipPin[],
    evaluate: (i: Record<string, number>) => Record<string, number>,
  ): void => {
    if (registry.has(name)) return
    registerBuiltin(registry, name, inputs, outputs, evaluate)
  }

  safe('Nand', [pin('a'), pin('b')], [pin('out')],
    (i) => ({ out: (i.a & i.b) === 0 ? 1 : 0 }))

  safe('Not', [pin('in')], [pin('out')],
    (i) => ({ out: i.in === 0 ? 1 : 0 }))

  safe('And', [pin('a'), pin('b')], [pin('out')],
    (i) => ({ out: (i.a & i.b) & 1 }))

  safe('Or', [pin('a'), pin('b')], [pin('out')],
    (i) => ({ out: (i.a | i.b) & 1 }))

  safe('Xor', [pin('a'), pin('b')], [pin('out')],
    (i) => ({ out: (i.a ^ i.b) & 1 }))

  safe('Mux', [pin('a'), pin('b'), pin('sel')], [pin('out')],
    (i) => ({ out: (i.sel & 1) === 0 ? (i.a & 1) : (i.b & 1) }))

  safe('DMux', [pin('in'), pin('sel')], [pin('a'), pin('b')],
    (i) => ({
      a: (i.sel & 1) === 0 ? (i.in & 1) : 0,
      b: (i.sel & 1) === 1 ? (i.in & 1) : 0,
    }))

  safe('Not16', [pin('in', 16)], [pin('out', 16)],
    (i) => ({ out: (~i.in & MASK16) >>> 0 }))

  safe('And16', [pin('a', 16), pin('b', 16)], [pin('out', 16)],
    (i) => ({ out: (i.a & i.b & MASK16) >>> 0 }))

  safe('Or16', [pin('a', 16), pin('b', 16)], [pin('out', 16)],
    (i) => ({ out: ((i.a | i.b) & MASK16) >>> 0 }))

  safe('Mux16', [pin('a', 16), pin('b', 16), pin('sel')], [pin('out', 16)],
    (i) => ({ out: ((i.sel & 1) === 0 ? i.a : i.b) & MASK16 }))

  safe('Or8Way', [pin('in', 8)], [pin('out')],
    (i) => ({ out: (i.in & 0xFF) !== 0 ? 1 : 0 }))

  safe('Mux4Way16',
    [pin('a', 16), pin('b', 16), pin('c', 16), pin('d', 16), pin('sel', 2)],
    [pin('out', 16)],
    (i) => ({ out: ([i.a, i.b, i.c, i.d][i.sel & 0x3]) & MASK16 }))

  safe('Mux8Way16',
    [pin('a', 16), pin('b', 16), pin('c', 16), pin('d', 16),
     pin('e', 16), pin('f', 16), pin('g', 16), pin('h', 16), pin('sel', 3)],
    [pin('out', 16)],
    (i) => ({ out: ([i.a, i.b, i.c, i.d, i.e, i.f, i.g, i.h][i.sel & 0x7]) & MASK16 }))

  safe('DMux4Way',
    [pin('in'), pin('sel', 2)],
    [pin('a'), pin('b'), pin('c'), pin('d')],
    (i) => {
      const r = { a: 0, b: 0, c: 0, d: 0 }
      const keys = ['a', 'b', 'c', 'd'] as const
      r[keys[i.sel & 0x3]] = i.in & 1
      return r
    })

  safe('DMux8Way',
    [pin('in'), pin('sel', 3)],
    [pin('a'), pin('b'), pin('c'), pin('d'), pin('e'), pin('f'), pin('g'), pin('h')],
    (i) => {
      const r = { a: 0, b: 0, c: 0, d: 0, e: 0, f: 0, g: 0, h: 0 }
      const keys = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'] as const
      r[keys[i.sel & 0x7]] = i.in & 1
      return r
    })
}
```

- [ ] **Step 2: Run tests to verify they pass**

```bash
pnpm run test:run -- --run src/core/chips/builtins/project01.test.ts
```
Expected: All tests PASS (16 registers + 16 fixture × all rows + idempotency).

- [ ] **Step 3: Run lint and typecheck**

```bash
pnpm run lint
```
Expected: exit 0.

- [ ] **Step 4: Commit**

```bash
git add src/core/chips/builtins/project01.ts
git commit -m "feat(chips): register 16 Project 1 builtins with bit-correct evaluate fns"
```

### Task 1.3: Write `appRegistry` tests (RED)

**Files:**
- Create: `src/core/chips/appRegistry.test.ts`

- [ ] **Step 1: Write the failing test file**

```typescript
import { describe, it, expect, beforeEach } from 'vitest'
import {
  getBuiltinChipRegistry,
  getUserChipRegistry,
  resetAppRegistriesForTests,
} from './appRegistry'

beforeEach(() => {
  resetAppRegistriesForTests()
})

describe('appRegistry', () => {
  it('getBuiltinChipRegistry returns same instance across calls', () => {
    const a = getBuiltinChipRegistry()
    const b = getBuiltinChipRegistry()
    expect(a).toBe(b)
  })

  it('getUserChipRegistry returns same instance across calls', () => {
    const a = getUserChipRegistry()
    const b = getUserChipRegistry()
    expect(a).toBe(b)
  })

  it('getBuiltinChipRegistry is pre-populated with all 16 Project 1 chips', () => {
    const reg = getBuiltinChipRegistry()
    expect(reg.list()).toHaveLength(16)
    expect(reg.has('Nand')).toBe(true)
    expect(reg.has('DMux8Way')).toBe(true)
  })

  it('getUserChipRegistry starts empty', () => {
    expect(getUserChipRegistry().list()).toHaveLength(0)
  })

  it('builtin and user registries are distinct instances', () => {
    expect(getBuiltinChipRegistry()).not.toBe(getUserChipRegistry())
  })

  it('resetAppRegistriesForTests re-initializes both singletons', () => {
    const userReg1 = getUserChipRegistry()
    resetAppRegistriesForTests()
    const userReg2 = getUserChipRegistry()
    expect(userReg2).not.toBe(userReg1)
    expect(userReg2.list()).toHaveLength(0)
    expect(getBuiltinChipRegistry().list()).toHaveLength(16)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
pnpm run test:run -- --run src/core/chips/appRegistry.test.ts
```
Expected: FAIL — module `./appRegistry` not found.

- [ ] **Step 3: Commit**

```bash
git add src/core/chips/appRegistry.test.ts
git commit -m "test(chips): appRegistry singleton + reset contract"
```

### Task 1.4: Implement `appRegistry` (GREEN)

**Files:**
- Create: `src/core/chips/appRegistry.ts`

- [ ] **Step 1: Implement the singleton module**

```typescript
import { createChipRegistry } from './registry'
import type { ChipRegistry } from './registry'
import { registerProject1Builtins } from './builtins/project01'

let builtinRegistry: ChipRegistry | null = null
let userRegistry: ChipRegistry | null = null

function initBuiltinRegistry(): ChipRegistry {
  const reg = createChipRegistry()
  registerProject1Builtins(reg)
  return reg
}

function initUserRegistry(): ChipRegistry {
  return createChipRegistry()
}

/**
 * Returns the app-wide builtin chip registry. Lazily initialized.
 * Pre-populated with all 16 Project 1 chips.
 */
export function getBuiltinChipRegistry(): ChipRegistry {
  if (!builtinRegistry) builtinRegistry = initBuiltinRegistry()
  return builtinRegistry
}

/**
 * Returns the app-wide user chip registry (compiled HDL + circuit chips).
 * Starts empty; populated by future tickets (P05-16, P05-24).
 */
export function getUserChipRegistry(): ChipRegistry {
  if (!userRegistry) userRegistry = initUserRegistry()
  return userRegistry
}

/**
 * TEST-ONLY: re-initialize both singletons. Use in `beforeEach` for isolation.
 * Never call from production code.
 */
export function resetAppRegistriesForTests(): void {
  builtinRegistry = null
  userRegistry = null
}
```

- [ ] **Step 2: Run tests**

```bash
pnpm run test:run -- --run src/core/chips/appRegistry.test.ts
```
Expected: All 6 tests PASS.

- [ ] **Step 3: Re-export from `src/core/chips/index.ts`**

Open `src/core/chips/index.ts` and add to the bottom:

```typescript
export { getBuiltinChipRegistry, getUserChipRegistry, resetAppRegistriesForTests } from './appRegistry'
export { registerProject1Builtins } from './builtins/project01'
```

- [ ] **Step 4: Run full test suite to confirm no regressions**

```bash
pnpm run test:run
pnpm run lint
```
Expected: both exit 0.

- [ ] **Step 5: Commit**

```bash
git add src/core/chips/appRegistry.ts src/core/chips/index.ts
git commit -m "feat(chips): app-level singleton registries (builtin + user)"
```

### Task 1.5: Wire registration in `main.tsx`

**Files:**
- Modify: `src/main.tsx`

- [ ] **Step 1: Add registration call**

Replace the contents with:

```typescript
import { createRoot } from 'react-dom/client'
import './styles/globals.css'
import App from './App'
import { getBuiltinChipRegistry } from '@/core/chips/appRegistry'

// Force singleton initialization on app boot so the builtin registry is
// populated before any component reads from it.
getBuiltinChipRegistry()

createRoot(document.getElementById('root')!).render(<App />)
```

- [ ] **Step 2: Verify build**

```bash
pnpm run build
```
Expected: build succeeds.

- [ ] **Step 3: Commit**

```bash
git add src/main.tsx
git commit -m "feat(app): initialize builtin chip registry at boot"
```

---

# Phase 2 — Generic `ChipBody3D` component

**Outcome of phase:** A single React component renders any chip from its `ChipDefinition`. Box dimensions auto-size based on pin count. Top face displays chip name. Each pin has a socket plus a width label (e.g., `[16]`). Existing `BaseGate` is reused as the rendering primitive.

### Task 2.1: Specify the layout math (RED)

**Files:**
- Create: `src/components/scene/chipBodyLayout.ts`
- Create: `src/components/scene/chipBodyLayout.test.ts`

- [ ] **Step 1: Write the failing layout test**

`src/components/scene/chipBodyLayout.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import { computeChipLayout } from './chipBodyLayout'
import type { ChipDefinition } from '@/core/chips/types'

function defOf(
  name: string,
  inputs: Array<[string, number]>,
  outputs: Array<[string, number]>,
): ChipDefinition {
  return {
    name,
    inputs: inputs.map(([n, w]) => ({ name: n, width: w })),
    outputs: outputs.map(([n, w]) => ({ name: n, width: w })),
    implementation: { type: 'builtin', evaluate: () => ({}) },
  }
}

describe('computeChipLayout', () => {
  it('Not (1 input, 1 output): minimum body size', () => {
    const layout = computeChipLayout(defOf('Not', [['in', 1]], [['out', 1]]))
    // Body sized for at most 1 pin per side along Z axis
    expect(layout.bodyDimensions.width).toBeGreaterThanOrEqual(2)
    expect(layout.pinSlots).toHaveLength(2)
    const inSlot = layout.pinSlots.find((p) => p.pinName === 'in')
    const outSlot = layout.pinSlots.find((p) => p.pinName === 'out')
    expect(inSlot?.side).toBe('input')
    expect(outSlot?.side).toBe('output')
    expect(inSlot?.width).toBe(1)
  })

  it('Mux (3 inputs, 1 output): inputs spaced along the input edge', () => {
    const layout = computeChipLayout(defOf('Mux',
      [['a', 1], ['b', 1], ['sel', 1]],
      [['out', 1]]))
    expect(layout.pinSlots).toHaveLength(4)
    const inputs = layout.pinSlots.filter((p) => p.side === 'input')
    expect(inputs).toHaveLength(3)
    // Inputs should be evenly distributed along Z (no two on same Z coord)
    const zs = inputs.map((p) => p.position[2]).sort()
    expect(new Set(zs).size).toBe(3)
  })

  it('Mux8Way16 (9 inputs, 1 output): body grows to accommodate', () => {
    const layout = computeChipLayout(defOf('Mux8Way16',
      [['a', 16], ['b', 16], ['c', 16], ['d', 16],
       ['e', 16], ['f', 16], ['g', 16], ['h', 16], ['sel', 3]],
      [['out', 16]]))
    expect(layout.pinSlots).toHaveLength(10)
    const inputs = layout.pinSlots.filter((p) => p.side === 'input')
    expect(inputs).toHaveLength(9)
    // Body must be wider than for Not
    const notLayout = computeChipLayout(defOf('Not', [['in', 1]], [['out', 1]]))
    expect(layout.bodyDimensions.depth).toBeGreaterThan(notLayout.bodyDimensions.depth)
  })

  it('width labels propagate to pin slots', () => {
    const layout = computeChipLayout(defOf('Not16', [['in', 16]], [['out', 16]]))
    expect(layout.pinSlots.find((p) => p.pinName === 'in')?.width).toBe(16)
    expect(layout.pinSlots.find((p) => p.pinName === 'out')?.width).toBe(16)
  })

  it('outputs are placed on opposite side from inputs', () => {
    const layout = computeChipLayout(defOf('And', [['a', 1], ['b', 1]], [['out', 1]]))
    const inX = layout.pinSlots.find((p) => p.side === 'input')!.position[0]
    const outX = layout.pinSlots.find((p) => p.side === 'output')!.position[0]
    expect(Math.sign(inX)).not.toBe(Math.sign(outX))
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
pnpm run test:run -- --run src/components/scene/chipBodyLayout.test.ts
```
Expected: FAIL — module `./chipBodyLayout` not found.

- [ ] **Step 3: Commit**

```bash
git add src/components/scene/chipBodyLayout.test.ts
git commit -m "test(scene): chip body layout math contract"
```

### Task 2.2: Implement `computeChipLayout` (GREEN)

**Files:**
- Create: `src/components/scene/chipBodyLayout.ts`

- [ ] **Step 1: Implement layout math**

```typescript
import type { ChipDefinition, ChipPin } from '@/core/chips/types'

export interface PinSlot {
  pinId: string
  pinName: string
  side: 'input' | 'output'
  /** Local-space position relative to the gate's center: [x, y, z]. */
  position: [number, number, number]
  width: number
  /** Index within its side (0-based, top-to-bottom along Z). */
  indexOnSide: number
}

export interface BodyDimensions {
  /** X-axis extent: input-to-output length. */
  width: number
  /** Y-axis extent: thickness above the ground plane. */
  height: number
  /** Z-axis extent: pin column length. */
  depth: number
}

export interface ChipLayout {
  bodyDimensions: BodyDimensions
  pinSlots: PinSlot[]
}

const MIN_WIDTH = 2.0   // x-axis
const HEIGHT = 0.4      // y-axis (thin body)
const MIN_DEPTH = 1.5   // z-axis
const PIN_SPACING = 0.5 // gap between adjacent pins along Z
const PIN_OFFSET_X = 0.05 // pin sticks out this far from body face along X
const EDGE_PADDING = 0.5  // space between outermost pin and body edge along Z

function pinSlotsForSide(
  pins: readonly ChipPin[],
  side: 'input' | 'output',
  halfBodyX: number,
  idPrefix: string,
): PinSlot[] {
  const count = pins.length
  if (count === 0) return []
  // Distribute pins evenly along Z, centered around 0.
  // For count=1 the pin is at z=0; for count>1 spread from -span/2 to +span/2.
  const span = (count - 1) * PIN_SPACING
  const startZ = -span / 2
  const xPos = side === 'input' ? -(halfBodyX + PIN_OFFSET_X) : (halfBodyX + PIN_OFFSET_X)
  return pins.map((p, i) => ({
    pinId: `${idPrefix}-${side === 'input' ? 'in' : 'out'}-${i}`,
    pinName: p.name,
    side,
    position: [xPos, 0, startZ + i * PIN_SPACING],
    width: p.width,
    indexOnSide: i,
  }))
}

/**
 * Computes the 3D layout for any chip definition.
 * Body grows along Z to accommodate the larger of input or output pin count.
 *
 * @param chip - The chip definition to lay out
 * @param idPrefix - Used to derive pin IDs; pass the gate instance id when rendering.
 *   Defaults to chip name for unit tests.
 */
export function computeChipLayout(
  chip: ChipDefinition,
  idPrefix: string = chip.name,
): ChipLayout {
  const maxPinsPerSide = Math.max(chip.inputs.length, chip.outputs.length, 1)
  const requiredDepth = 2 * EDGE_PADDING + Math.max(0, maxPinsPerSide - 1) * PIN_SPACING
  const depth = Math.max(MIN_DEPTH, requiredDepth)

  // Width scales modestly with pin count to keep chip-name label readable.
  const width = Math.max(MIN_WIDTH, MIN_WIDTH + 0.05 * maxPinsPerSide)

  const halfBodyX = width / 2
  const pinSlots: PinSlot[] = [
    ...pinSlotsForSide(chip.inputs, 'input', halfBodyX, idPrefix),
    ...pinSlotsForSide(chip.outputs, 'output', halfBodyX, idPrefix),
  ]

  return {
    bodyDimensions: { width, height: HEIGHT, depth },
    pinSlots,
  }
}
```

- [ ] **Step 2: Run layout tests**

```bash
pnpm run test:run -- --run src/components/scene/chipBodyLayout.test.ts
```
Expected: All 5 tests PASS.

- [ ] **Step 3: Commit**

```bash
git add src/components/scene/chipBodyLayout.ts
git commit -m "feat(scene): computeChipLayout — generic pin placement math"
```

### Task 2.3: Write `ChipBody3D` render tests (RED)

**Files:**
- Create: `src/components/scene/ChipBody3D.test.tsx`

- [ ] **Step 1: Write the failing render test**

```typescript
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render } from '@testing-library/react'
import { ChipBody3D } from './ChipBody3D'
import { getBuiltinChipRegistry, resetAppRegistriesForTests } from '@/core/chips/appRegistry'
import type { GateInstance } from '@/store/types'

beforeEach(() => {
  resetAppRegistriesForTests()
})

function makeGate(chipName: string): GateInstance {
  const reg = getBuiltinChipRegistry()
  const chip = reg.get(chipName)
  if (!chip) throw new Error(`chip ${chipName} not registered`)
  return {
    id: `g-${chipName}`,
    chipName,
    position: { x: 0, y: 0, z: 0 },
    rotation: { x: Math.PI / 2, y: 0, z: 0 },
    inputs: chip.inputs.map((p, i) => ({
      id: `g-${chipName}-in-${i}`, name: p.name, type: 'input' as const,
      value: 0, width: p.width,
    })),
    outputs: chip.outputs.map((p, i) => ({
      id: `g-${chipName}-out-${i}`, name: p.name, type: 'output' as const,
      value: 0, width: p.width,
    })),
    selected: false,
    width: 1,
  }
}

// R3F components require a Canvas context; use the standard R3F test harness
import { createRoot } from '@react-three/fiber'
import * as THREE from 'three'

function renderInThree(node: React.ReactNode) {
  const canvas = document.createElement('canvas')
  const root = createRoot(canvas)
  root.configure({
    frameloop: 'never',
    gl: new THREE.WebGLRenderer({ canvas }),
  })
  root.render(node)
  return root
}

describe('ChipBody3D', () => {
  it('renders without crashing for Not', () => {
    const gate = makeGate('Not')
    expect(() => renderInThree(
      <ChipBody3D gate={gate} isWiring={false}
        isPinConnected={() => false}
        onClick={() => {}} onPinClick={() => {}} onInputToggle={() => {}} />
    )).not.toThrow()
  })

  it('renders without crashing for Mux8Way16 (9 input pins)', () => {
    const gate = makeGate('Mux8Way16')
    expect(() => renderInThree(
      <ChipBody3D gate={gate} isWiring={false}
        isPinConnected={() => false}
        onClick={() => {}} onPinClick={() => {}} onInputToggle={() => {}} />
    )).not.toThrow()
  })

  it('throws a readable error for unknown chipName', () => {
    const gate = makeGate('Not')
    const badGate = { ...gate, chipName: 'TotallyNotARealChip' }
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    expect(() => renderInThree(
      <ChipBody3D gate={badGate} isWiring={false}
        isPinConnected={() => false}
        onClick={() => {}} onPinClick={() => {}} onInputToggle={() => {}} />
    )).toThrow(/TotallyNotARealChip/)
    spy.mockRestore()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
pnpm run test:run -- --run src/components/scene/ChipBody3D.test.tsx
```
Expected: FAIL — module not found.

- [ ] **Step 3: Commit**

```bash
git add src/components/scene/ChipBody3D.test.tsx
git commit -m "test(scene): ChipBody3D renders any chip definition"
```

### Task 2.4: Implement `ChipBody3D` (GREEN)

**Files:**
- Create: `src/components/scene/ChipBody3D.tsx`

- [ ] **Step 1: Implement the component**

```tsx
import { BaseGate } from '@/gates/common/BaseGate'
import type { PinConfig } from '@/gates/types'
import { computeChipLayout } from './chipBodyLayout'
import { getBuiltinChipRegistry, getUserChipRegistry } from '@/core/chips/appRegistry'
import type { GateInstance } from '@/store/types'

interface ChipBody3DProps {
  gate: GateInstance
  isWiring: boolean
  isPinConnected: (gateId: string, pinId: string) => boolean
  onClick: () => void
  onPinClick: (
    gateId: string,
    pinId: string,
    pinType: 'input' | 'output',
    worldPosition: { x: number; y: number; z: number }
  ) => void
  onInputToggle: (gateId: string, pinId: string) => void
}

const CHIP_BODY_COLOR = '#3b4252'
const CHIP_BODY_HOVER = '#434c5e'
const CHIP_BODY_SELECTED = '#5e81ac'

export function ChipBody3D({
  gate,
  isWiring,
  isPinConnected,
  onClick,
  onPinClick,
  onInputToggle,
}: ChipBody3DProps) {
  const chip =
    getBuiltinChipRegistry().get(gate.chipName) ??
    getUserChipRegistry().get(gate.chipName)
  if (!chip) {
    throw new Error(`ChipBody3D: chip "${gate.chipName}" not found in any registry`)
  }

  const layout = computeChipLayout(chip, gate.id)
  const { bodyDimensions, pinSlots } = layout

  const pinConfigs: PinConfig[] = pinSlots.map((slot, idx) => {
    const sourcePin = slot.side === 'input'
      ? gate.inputs[slot.indexOnSide]
      : gate.outputs[slot.indexOnSide]
    return {
      pinId: sourcePin?.id ?? slot.pinId,
      position: slot.position,
      value: sourcePin?.value ?? 0,
      connected: isPinConnected(gate.id, sourcePin?.id ?? slot.pinId),
      pinType: slot.side,
      pinName: slot.pinName + (slot.width > 1 ? `[${slot.width}]` : ''),
    }
  })

  // Wire stubs co-located with each pin (stub shown only when pin not connected — BaseGate handles).
  const wireStubPositions: [number, number, number][] = pinSlots.map((s) => s.position)

  return (
    <BaseGate
      id={gate.id}
      position={[gate.position.x, gate.position.y, gate.position.z]}
      rotation={[gate.rotation.x, gate.rotation.y, gate.rotation.z]}
      selected={gate.selected}
      isWiring={isWiring}
      bodyColor={CHIP_BODY_COLOR}
      bodyHoverColor={CHIP_BODY_HOVER}
      bodySelectedColor={CHIP_BODY_SELECTED}
      output={gate.outputs[0]?.value ?? 0}
      inputs={gate.inputs.map((p) => p.value)}
      pinConfigs={pinConfigs}
      wireStubPositions={wireStubPositions}
      bodyGeometry={
        <boxGeometry args={[bodyDimensions.width, bodyDimensions.height, bodyDimensions.depth]} />
      }
      textLabel={chip.name}
      onClick={onClick}
      onPinClick={onPinClick}
      onInputToggle={onInputToggle}
    />
  )
}
ChipBody3D.displayName = 'ChipBody3D'
```

- [ ] **Step 2: Update `BaseGate.tsx` to remove the unused `gateType` prop**

In `src/gates/common/BaseGate.tsx`:

1. Remove `import type { GateType } from '@/store/types'` (line 8).
2. Remove `gateType: GateType` from `BaseGateComponentProps` (around line 19).
3. Remove the destructuring of `gateType` in the function body.

- [ ] **Step 3: Update `src/gates/components/{NandGate,AndGate,OrGate,NotGate,XorGate}.tsx`**

For each of the 5 files, remove the `gateType="..."` prop from the `<BaseGate>` call. (These files will be DELETED later in Phase 4 — but the build must pass between now and then.)

- [ ] **Step 4: Run tests**

```bash
pnpm run test:run -- --run src/components/scene/ChipBody3D.test.tsx
pnpm run test:run -- --run src/gates/common/BaseGate.test.tsx
```
Expected: All pass. (BaseGate tests should not depend on `gateType`.)

- [ ] **Step 5: Run lint**

```bash
pnpm run lint
```
Expected: exit 0.

- [ ] **Step 6: Commit**

```bash
git add src/components/scene/ChipBody3D.tsx src/gates/common/BaseGate.tsx \
  src/gates/components/NandGate.tsx src/gates/components/AndGate.tsx \
  src/gates/components/OrGate.tsx src/gates/components/NotGate.tsx \
  src/gates/components/XorGate.tsx
git commit -m "feat(scene): ChipBody3D — generic R3F render for any chip definition"
```

---

# Phase 3 — Per-chip icons + selector overhaul

**Outcome of phase:** `src/components/ui/icons/ChipIcons.tsx` exports 16 SVG icons keyed by chip name. `CompactToolbar.tsx` reads its chip list from the builtin registry and groups it by category in the popover.

### Task 3.1: Create the 16-icon module (RED then GREEN combined — icons are visual stubs)

**Files:**
- Create: `src/components/ui/icons/ChipIcons.tsx`
- Create: `src/components/ui/icons/ChipIcons.test.tsx`

- [ ] **Step 1: Write the smoke test (RED)**

`src/components/ui/icons/ChipIcons.test.tsx`:

```typescript
import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import { CHIP_ICON_MAP, CHIP_ICON_FALLBACK } from './ChipIcons'

const REQUIRED_CHIPS = [
  'Nand', 'Not', 'And', 'Or', 'Xor', 'Mux', 'DMux',
  'Not16', 'And16', 'Or16', 'Mux16',
  'Or8Way', 'Mux4Way16', 'Mux8Way16', 'DMux4Way', 'DMux8Way',
]

describe('ChipIcons', () => {
  it('exports an icon for every Project 1 chip', () => {
    for (const name of REQUIRED_CHIPS) {
      expect(CHIP_ICON_MAP[name]).toBeDefined()
    }
  })

  it('every icon renders without crashing', () => {
    for (const name of REQUIRED_CHIPS) {
      const Icon = CHIP_ICON_MAP[name]
      const { container } = render(<Icon />)
      expect(container.querySelector('svg')).toBeTruthy()
    }
  })

  it('CHIP_ICON_FALLBACK renders for unknown names', () => {
    const { container } = render(<CHIP_ICON_FALLBACK />)
    expect(container.querySelector('svg')).toBeTruthy()
  })
})
```

- [ ] **Step 2: Run the test (expect FAIL)**

```bash
pnpm run test:run -- --run src/components/ui/icons/ChipIcons.test.tsx
```
Expected: FAIL — module not found.

- [ ] **Step 3: Implement icons**

`src/components/ui/icons/ChipIcons.tsx`:

```tsx
import type { ComponentType } from 'react'
import { cn } from '@/lib/utils'

type IconProps = { className?: string }
const cls = (extra?: string) => cn('w-4 h-4', extra)
const STROKE = 1.5

/**
 * Compact SVG glyphs for the 16 Project 1 builtin chips.
 * Designs are intentionally schematic — the chip name decal on the 3D body
 * is the authoritative identifier.  Icons use single-line strokes for clarity
 * at small sizes (16-24px).
 */

// Single-bit primitives (existing styles, re-namespaced)
export const NandIcon = ({ className }: IconProps) => (
  <svg viewBox="0 0 24 24" className={cls(className)} fill="none" stroke="currentColor" strokeWidth={STROKE}>
    <path d="M3 6h6c5 0 9 3 9 6s-4 6-9 6H3V6z" />
    <circle cx="19" cy="12" r="2" />
  </svg>
)
export const NotIcon = ({ className }: IconProps) => (
  <svg viewBox="0 0 24 24" className={cls(className)} fill="none" stroke="currentColor" strokeWidth={STROKE}>
    <path d="M3 6l12 6-12 6V6z" />
    <circle cx="17" cy="12" r="2" />
  </svg>
)
export const AndIcon = ({ className }: IconProps) => (
  <svg viewBox="0 0 24 24" className={cls(className)} fill="none" stroke="currentColor" strokeWidth={STROKE}>
    <path d="M3 6h6c5 0 9 3 9 6s-4 6-9 6H3V6z" />
  </svg>
)
export const OrIcon = ({ className }: IconProps) => (
  <svg viewBox="0 0 24 24" className={cls(className)} fill="none" stroke="currentColor" strokeWidth={STROKE}>
    <path d="M3 6c2 2 2 6 0 12h4c6 0 12-3 14-6-2-3-8-6-14-6H3z" />
  </svg>
)
export const XorIcon = ({ className }: IconProps) => (
  <svg viewBox="0 0 24 24" className={cls(className)} fill="none" stroke="currentColor" strokeWidth={STROKE}>
    <path d="M5 6c2 2 2 6 0 12h4c6 0 12-3 14-6-2-3-8-6-14-6H5z" />
    <path d="M3 6c2 3 2 9 0 12" />
  </svg>
)

// Multiplexers: trapezoid + 'M' or selector marker
export const MuxIcon = ({ className }: IconProps) => (
  <svg viewBox="0 0 24 24" className={cls(className)} fill="none" stroke="currentColor" strokeWidth={STROKE}>
    <path d="M5 4l12 4v8l-12 4V4z" />
    <path d="M9 11l2 2 2-2" />
  </svg>
)
export const DMuxIcon = ({ className }: IconProps) => (
  <svg viewBox="0 0 24 24" className={cls(className)} fill="none" stroke="currentColor" strokeWidth={STROKE}>
    <path d="M19 4L7 8v8l12 4V4z" />
    <path d="M11 11l2-2 2 2" />
  </svg>
)

// 16-bit variants: append a small '16' badge
function With16Badge({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={cls(className)} fill="none" stroke="currentColor" strokeWidth={STROKE}>
      {children}
      <text x="14" y="22" fontSize="6" fill="currentColor" stroke="none">16</text>
    </svg>
  )
}
export const Not16Icon = ({ className }: IconProps) => (
  <With16Badge className={className}>
    <path d="M3 4l10 5-10 5V4z" />
    <circle cx="15" cy="9" r="1.6" />
  </With16Badge>
)
export const And16Icon = ({ className }: IconProps) => (
  <With16Badge className={className}>
    <path d="M3 4h5c4 0 7 2.5 7 5s-3 5-7 5H3V4z" />
  </With16Badge>
)
export const Or16Icon = ({ className }: IconProps) => (
  <With16Badge className={className}>
    <path d="M3 4c1.5 1.5 1.5 5 0 10h3c5 0 10-2.5 11-5-1-2.5-6-5-11-5H3z" />
  </With16Badge>
)
export const Mux16Icon = ({ className }: IconProps) => (
  <With16Badge className={className}>
    <path d="M4 3l9 3v6l-9 3V3z" />
    <path d="M7 8l2 1.5L11 8" />
  </With16Badge>
)

// Multi-way variants: stacked layers + count badge
function NWayIcon({ count, className }: { count: 4 | 8; className?: string }) {
  const layers = count === 4 ? [2, 5, 8, 11] : [1, 3, 5, 7, 9, 11, 13, 15]
  return (
    <svg viewBox="0 0 24 24" className={cls(className)} fill="none" stroke="currentColor" strokeWidth={STROKE}>
      {layers.map((y) => <line key={y} x1="3" y1={y} x2="11" y2={y} />)}
      <path d="M12 1l8 4v14l-8 4V1z" />
      <text x="13" y="13" fontSize="5" fill="currentColor" stroke="none">{count}</text>
    </svg>
  )
}
export const Or8WayIcon = ({ className }: IconProps) => (
  <svg viewBox="0 0 24 24" className={cls(className)} fill="none" stroke="currentColor" strokeWidth={STROKE}>
    <path d="M3 4c1.5 1.5 1.5 5 0 10h3c5 0 10-2.5 11-5-1-2.5-6-5-11-5H3z" />
    <text x="13" y="22" fontSize="5.5" fill="currentColor" stroke="none">8w</text>
  </svg>
)
export const Mux4Way16Icon = ({ className }: IconProps) => <NWayIcon count={4} className={className} />
export const Mux8Way16Icon = ({ className }: IconProps) => <NWayIcon count={8} className={className} />
export const DMux4WayIcon = ({ className }: IconProps) => (
  <svg viewBox="0 0 24 24" className={cls(className)} fill="none" stroke="currentColor" strokeWidth={STROKE}>
    <path d="M12 1L4 5v14l8 4V1z" />
    {[2, 5, 8, 11].map((y) => <line key={y} x1="13" y1={y} x2="21" y2={y} />)}
    <text x="6" y="13" fontSize="5" fill="currentColor" stroke="none">4</text>
  </svg>
)
export const DMux8WayIcon = ({ className }: IconProps) => (
  <svg viewBox="0 0 24 24" className={cls(className)} fill="none" stroke="currentColor" strokeWidth={STROKE}>
    <path d="M12 1L4 5v14l8 4V1z" />
    {[1, 3, 5, 7, 9, 11, 13, 15].map((y) => <line key={y} x1="13" y1={y} x2="21" y2={y} />)}
    <text x="6" y="13" fontSize="5" fill="currentColor" stroke="none">8</text>
  </svg>
)

export const CHIP_ICON_FALLBACK = ({ className }: IconProps) => (
  <svg viewBox="0 0 24 24" className={cls(className)} fill="none" stroke="currentColor" strokeWidth={STROKE}>
    <rect x="4" y="4" width="16" height="16" rx="2" />
    <text x="7" y="16" fontSize="8" fill="currentColor" stroke="none">?</text>
  </svg>
)

export const CHIP_ICON_MAP: Record<string, ComponentType<IconProps>> = {
  Nand: NandIcon, Not: NotIcon, And: AndIcon, Or: OrIcon, Xor: XorIcon,
  Mux: MuxIcon, DMux: DMuxIcon,
  Not16: Not16Icon, And16: And16Icon, Or16: Or16Icon, Mux16: Mux16Icon,
  Or8Way: Or8WayIcon,
  Mux4Way16: Mux4Way16Icon, Mux8Way16: Mux8Way16Icon,
  DMux4Way: DMux4WayIcon, DMux8Way: DMux8WayIcon,
}
```

- [ ] **Step 4: Run the test (expect GREEN)**

```bash
pnpm run test:run -- --run src/components/ui/icons/ChipIcons.test.tsx
```
Expected: All 3 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/ui/icons/ChipIcons.tsx src/components/ui/icons/ChipIcons.test.tsx
git commit -m "feat(ui): SVG icons for 16 Project 1 chips + fallback"
```

### Task 3.2: Refactor `CompactToolbar` to read from registry

**Files:**
- Modify: `src/components/ui/CompactToolbar.tsx`
- Modify: `src/components/ui/CompactToolbar.test.tsx` (already exists)

- [ ] **Step 1: Update the toolbar test (RED)**

In `src/components/ui/CompactToolbar.test.tsx`, replace any test that checks for the 7-gate list with these assertions (add or modify existing tests):

```typescript
import { resetAppRegistriesForTests } from '@/core/chips/appRegistry'

beforeEach(() => {
  resetAppRegistriesForTests()
})

it('gate popover lists all 16 Project 1 chips with data-testid hooks', async () => {
  render(<CompactToolbar />)
  await userEvent.click(screen.getByTestId('toolbar-gates-trigger'))

  const expected = [
    'Nand', 'Not', 'And', 'Or', 'Xor', 'Mux', 'DMux',
    'Not16', 'And16', 'Or16', 'Mux16',
    'Or8Way', 'Mux4Way16', 'Mux8Way16', 'DMux4Way', 'DMux8Way',
  ]
  for (const name of expected) {
    expect(screen.getByTestId(`gate-button-${name}`)).toBeInTheDocument()
  }
})

it('does NOT list legacy NOR/XNOR/uppercase variants', () => {
  render(<CompactToolbar />)
  expect(screen.queryByTestId('gate-button-NOR')).toBeNull()
  expect(screen.queryByTestId('gate-button-XNOR')).toBeNull()
  expect(screen.queryByTestId('gate-button-NAND')).toBeNull()
})

it('clicking a chip button calls startPlacement(chipName)', async () => {
  render(<CompactToolbar />)
  await userEvent.click(screen.getByTestId('toolbar-gates-trigger'))
  await userEvent.click(screen.getByTestId('gate-button-Mux'))
  expect(useCircuitStore.getState().placementMode).toBe('Mux')
})
```

- [ ] **Step 2: Run test (expect FAIL)**

```bash
pnpm run test:run -- --run src/components/ui/CompactToolbar.test.tsx
```
Expected: FAIL — current toolbar uses `GateGlyphs` and hardcoded list.

- [ ] **Step 3: Implement registry-driven toolbar**

Update `src/components/ui/CompactToolbar.tsx` (showing only the parts that change):

1. **Replace imports** (lines 27-35) with:

```tsx
import { CHIP_ICON_MAP, CHIP_ICON_FALLBACK, NandIcon } from './icons/ChipIcons'
import { getBuiltinChipRegistry } from '@/core/chips/appRegistry'
```

(Delete the import block for `NandGateIcon, AndGateIcon, ...` from `GateGlyphs`.)

2. **Remove the line** `import type { GateType } from '@/store/types'` (line 38).

3. **Replace the `gates` const** (lines 40-48) with:

```tsx
type ChipCategory = 'single-bit' | '16-bit' | 'multi-way'
const CATEGORY_BY_CHIP: Record<string, ChipCategory> = {
  Nand: 'single-bit', Not: 'single-bit', And: 'single-bit',
  Or: 'single-bit', Xor: 'single-bit', Mux: 'single-bit', DMux: 'single-bit',
  Not16: '16-bit', And16: '16-bit', Or16: '16-bit', Mux16: '16-bit',
  Or8Way: 'multi-way', Mux4Way16: 'multi-way', Mux8Way16: 'multi-way',
  DMux4Way: 'multi-way', DMux8Way: 'multi-way',
}
const CATEGORY_ORDER: ChipCategory[] = ['single-bit', '16-bit', 'multi-way']
const CATEGORY_LABEL: Record<ChipCategory, string> = {
  'single-bit': 'Single-bit',
  '16-bit': '16-bit',
  'multi-way': 'Multi-way',
}
```

4. **Update `handleGateSelect` parameter type**:

```tsx
const handleGateSelect = (chipName: string) => {
  if (placementMode === chipName) {
    circuitActions.cancelPlacement()
  } else {
    circuitActions.startPlacement(chipName)
  }
  setGatesOpen(false)
}
```

5. **Replace the gate popover body** (the `<PopoverContent data-testid="gates-popover">...`) with:

```tsx
<PopoverContent
  data-testid="gates-popover"
  side="right"
  align="start"
  className="w-64 p-2"
>
  {(() => {
    const chips = getBuiltinChipRegistry().list()
    const byCategory = new Map<ChipCategory, typeof chips>()
    for (const c of CATEGORY_ORDER) byCategory.set(c, [])
    for (const chip of chips) {
      const cat = CATEGORY_BY_CHIP[chip.name] ?? 'single-bit'
      byCategory.get(cat)!.push(chip)
    }
    return CATEGORY_ORDER.map((cat) => {
      const items = byCategory.get(cat) ?? []
      if (items.length === 0) return null
      return (
        <div key={cat} className="mb-2 last:mb-0">
          <div className="text-xs font-medium text-muted-foreground mb-1 px-2">
            {CATEGORY_LABEL[cat]}
          </div>
          <div className="grid grid-cols-2 gap-1">
            {items.map((chip) => {
              const Icon = CHIP_ICON_MAP[chip.name] ?? CHIP_ICON_FALLBACK
              return (
                <Button
                  key={chip.name}
                  data-testid={`gate-button-${chip.name}`}
                  variant={placementMode === chip.name ? 'secondary' : 'ghost'}
                  size="sm"
                  className="justify-start gap-2 h-8"
                  onClick={() => handleGateSelect(chip.name)}
                >
                  <Icon className="w-4 h-4" />
                  <span className="text-xs truncate">{chip.name}</span>
                </Button>
              )
            })}
          </div>
        </div>
      )
    })
  })()}
</PopoverContent>
```

6. **Update the trigger icon** (around line 163). Replace `<NandGateIcon className="w-5 h-5" />` with `<NandIcon className="w-5 h-5" />`.

- [ ] **Step 4: Run toolbar tests**

```bash
pnpm run test:run -- --run src/components/ui/CompactToolbar.test.tsx
```
Expected: All tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/ui/CompactToolbar.tsx src/components/ui/CompactToolbar.test.tsx
git commit -m "feat(ui): registry-driven gate selector with 16 chips grouped by category"
```

---

# Phase 4 — Store + placement + simulation migration

**Outcome of phase:** `GateType` union is gone. Store, actions, simulation, and persistence consume `chipName: string` everywhere. `gateLogic.ts` is deleted. Simulation looks up evaluate functions via the registry.

This phase has the highest blast radius — break it into the smallest commits possible.

### Task 4.1: Replace `GateType` with `chipName: string` in store types (RED via existing tests)

**Files:**
- Modify: `src/store/types.ts`

- [ ] **Step 1: Apply the type changes**

In `src/store/types.ts`:

1. **Delete line 106**: `export type GateType = 'NAND' | 'AND' | 'OR' | 'NOT' | 'NOR' | 'XOR' | 'XNOR'`

2. **Update `GateInstance`** (around line 118):

```typescript
export interface GateInstance {
  id: string
  /** Name of the chip in the builtin registry (e.g., 'Nand', 'Mux16'). */
  chipName: string
  position: Position
  rotation: Rotation
  inputs: Pin[]
  outputs: Pin[]
  selected: boolean
  width: number
}
```

3. **Update `CircuitState.placementMode`** (around line 185):

```typescript
placementMode: string | null
```

4. **Update `GateActions.addGate`** (around line 219):

```typescript
addGate: (chipName: string, position: Position, width?: number) => GateInstance
```

5. **Update `PlacementActions.startPlacement`** (around line 252):

```typescript
startPlacement: (chipName: string) => void
```

- [ ] **Step 2: Run typecheck to discover all broken references**

```bash
pnpm run typecheck 2>&1 | head -100
```
Expected: dozens of errors referencing `GateType` and `gate.type`. Note them — they'll be fixed in subsequent tasks.

- [ ] **Step 3: Do NOT commit yet**

Wait until the build is green again in Task 4.5.

### Task 4.2: Update `createGateInstance` to read pin defs from registry

**Files:**
- Modify: `src/store/actions/gateActions/gateActions.ts`

- [ ] **Step 1: Replace `createGateInstance`**

In `src/store/actions/gateActions/gateActions.ts`, replace lines 1-43:

```typescript
import { notify } from '@/lib/notify'
import type { GateActions, GateInstance, Pin, Position, CircuitStore } from '../../types'
import { snapToGrid } from '@/utils/grid'
import { useCircuitStore } from '../../circuitStore'
import { calculateWirePathFromConnection } from '@/utils/wiringScheme'
import { collectWireSegments, combineAdjacentSegments } from '@/utils/wiringScheme/segments'
import { resolveCrossings, removeOrphanedArcs } from '@/utils/wiringScheme/crossing'
import { preserveJunctions } from '../junctionUtils'
import { getBuiltinChipRegistry, getUserChipRegistry } from '@/core/chips/appRegistry'

/**
 * Helper to create a gate instance for a registered chip name.
 * Reads pin definitions from the builtin registry (falling back to user registry).
 * Throws if the chip name is not registered.
 *
 * @param chipName - Name of a registered chip (e.g., 'Nand', 'Mux16')
 * @param position - World position to place the gate at
 * @param width - Multiplier on top of declared pin widths (default 1). Reserved for future
 *   parametric widths; for Project 1 builtins all widths are already fixed.
 */
export function createGateInstance(
  chipName: string,
  position: Position,
  width: number = 1,
): GateInstance {
  const chip =
    getBuiltinChipRegistry().get(chipName) ??
    getUserChipRegistry().get(chipName)
  if (!chip) {
    throw new Error(`createGateInstance: chip "${chipName}" not found in any registry`)
  }

  const id = `gate-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`

  const inputs: Pin[] = chip.inputs.map((p, i) => ({
    id: `${id}-in-${i}`,
    name: p.name,
    type: 'input',
    value: 0,
    width: p.width,
  }))

  const outputs: Pin[] = chip.outputs.map((p, i) => ({
    id: `${id}-out-${i}`,
    name: p.name,
    type: 'output',
    value: 0,
    width: p.width,
  }))

  return {
    id,
    chipName,
    position,
    rotation: { x: Math.PI / 2, y: 0, z: 0 },
    inputs,
    outputs,
    selected: false,
    width,
  }
}
```

- [ ] **Step 2: Update `addGate` action signature**

Replace the `addGate` action body (around line 53):

```typescript
addGate: (chipName: string, position: Position, width?: number) => {
  const gate = createGateInstance(chipName, position, width)
  set((state) => {
    state.gates.push(gate)
  }, false, 'addGate')
  return gate
},
```

### Task 4.3: Update `placementActions.ts`

**Files:**
- Modify: `src/store/actions/placementActions/placementActions.ts`

- [ ] **Step 1: Replace the signature and use of `placementMode`**

In `src/store/actions/placementActions/placementActions.ts`:

1. Remove the `import type { ... GateType ...}` (line 1). New import:

```typescript
import type { PlacementActions, Position, CircuitStore } from '../../types'
```

2. Replace `startPlacement` (lines 14-29):

```typescript
startPlacement: (chipName: string) => {
  set((state) => {
    state.selectedGateId = null
    state.selectedWireId = null
    state.selectedNodeId = null
    state.selectedNodeType = null
    state.gates.forEach((g) => {
      g.selected = false
    })

    state.placementMode = chipName
    state.nodePlacementMode = null
  }, false, 'startPlacement')
},
```

3. In `placeGate` (around line 64), the call `createGateInstance(currentState.placementMode, snappedPosition)` already works because `placementMode` is now a `string`. **No change needed there.**

### Task 4.4: Update `gateLogic.ts` → DELETE, and refactor `topologicalEval.ts`

**Files:**
- Delete: `src/simulation/gateLogic.ts`
- Delete: `src/simulation/gateLogic.test.ts` (if it exists)
- Modify: `src/simulation/topologicalEval.ts`

- [ ] **Step 1: Identify how `topologicalEval.ts` uses `gateLogic`**

```bash
pnpm exec rg -n 'gateLogic' src/simulation/
```

Note every call site.

- [ ] **Step 2: Refactor `topologicalEval.ts`**

At the top of `src/simulation/topologicalEval.ts`:

Remove: `import { gateLogic } from './gateLogic'`

Add:
```typescript
import { getBuiltinChipRegistry, getUserChipRegistry } from '@/core/chips/appRegistry'
import { isBuiltinChip } from '@/core/chips/types'
```

Find the gate-evaluation block (where `gateLogic[gate.type](inputs, width)` is called) and replace with:

```typescript
const chip =
  getBuiltinChipRegistry().get(gate.chipName) ??
  getUserChipRegistry().get(gate.chipName)
if (!chip || !isBuiltinChip(chip)) {
  // Unknown or non-builtin chip — skip evaluation (a future user/HDL chip
  // case will route through evaluateChip() in P05-18).
  continue
}
const inputsByName: Record<string, number> = {}
for (const inputPin of gate.inputs) {
  inputsByName[inputPin.name] = inputPin.value
}
const outputs = chip.implementation.evaluate(inputsByName)
for (const outputPin of gate.outputs) {
  const newValue = outputs[outputPin.name]
  if (typeof newValue === 'number') {
    outputPin.value = clampToWidth(newValue, outputPin.width ?? 1)
  }
}
```

(Read the existing eval block first to preserve cycle handling, error reporting, etc. — only the value-computation step changes.)

- [ ] **Step 3: Delete `gateLogic.ts` and its test**

```bash
rm src/simulation/gateLogic.ts
[ -f src/simulation/gateLogic.test.ts ] && rm src/simulation/gateLogic.test.ts || true
```

- [ ] **Step 4: Run simulation tests**

```bash
pnpm run test:run -- --run src/simulation/topologicalEval.test.ts
```
Expected: tests now exercise the registry path. Any that referenced `'NAND'` directly need name updates — fix in Task 4.6.

### Task 4.5: Update `GateRenderer.tsx` to use `ChipBody3D`

**Files:**
- Modify: `src/gates/GateRenderer.tsx`

- [ ] **Step 1: Replace the entire body**

```tsx
import type { GateInstance } from '@/store/types'
import { ChipBody3D } from '@/components/scene/ChipBody3D'

interface ReadonlyGate {
  readonly id: string
  readonly chipName: string
  readonly position: { readonly x: number; readonly y: number; readonly z: number }
  readonly rotation: { readonly x: number; readonly y: number; readonly z: number }
  readonly inputs: readonly { readonly id: string; readonly name: string; readonly value: number; readonly width?: number; readonly type: 'input' }[]
  readonly outputs: readonly { readonly id: string; readonly name: string; readonly value: number; readonly width?: number; readonly type: 'output' }[]
  readonly selected: boolean
  readonly width: number
}

interface GateRendererProps {
  gate: GateInstance | ReadonlyGate
  isWiring: boolean
  isPinConnected: (gateId: string, pinId: string) => boolean
  onClick: () => void
  onPinClick: (
    gateId: string,
    pinId: string,
    pinType: 'input' | 'output',
    worldPosition: { x: number; y: number; z: number }
  ) => void
  onInputToggle: (gateId: string, pinId: string) => void
}

export function GateRenderer({
  gate,
  isWiring,
  isPinConnected,
  onClick,
  onPinClick,
  onInputToggle,
}: GateRendererProps) {
  return (
    <ChipBody3D
      gate={gate as GateInstance}
      isWiring={isWiring}
      isPinConnected={isPinConnected}
      onClick={onClick}
      onPinClick={onPinClick}
      onInputToggle={onInputToggle}
    />
  )
}
GateRenderer.displayName = 'GateRenderer'
```

- [ ] **Step 2: Run the typecheck**

```bash
pnpm run typecheck 2>&1 | head -80
```

Address remaining errors:

- Any test file still typed against the old `Gate.type` field → update to `gate.chipName`.
- Any `e2e/` file referencing `GateType` → replace with `string`.
- `e2e/types/globals.ts` line 4 / wire tests / gate tests — replace the type import with `string`.

- [ ] **Step 3: Run lint to find string usages**

```bash
pnpm exec rg -n "'NAND'|'AND'|'OR'|'NOT'|'NOR'|'XOR'|'XNOR'" src/ e2e/
```

For each match, update to `'Nand'`/`'And'`/`'Or'`/`'Not'`/`'Xor'` or remove if `'NOR'`/`'XNOR'`.

### Task 4.6: Fix all broken tests and run the suite green

**Files:** (multiple; iterate)

- [ ] **Step 1: Fix `gateActions.test.ts`**

Any test calling `createGateInstance('NAND', ...)` or `circuitActions.addGate('NAND', ...)` → use `'Nand'`. Any assertion `gate.type === 'NAND'` → `gate.chipName === 'Nand'`.

- [ ] **Step 2: Fix `placementActions.test.ts`**

Same renames; remove any test exercising NOR/XNOR.

- [ ] **Step 3: Fix `topologicalEval.test.ts` and `busOps.test.ts`**

Same renames; assertions on `gateLogic` outputs replaced with assertions on `chip.implementation.evaluate(...)` or on the simulated `gate.outputs[i].value`.

- [ ] **Step 4: Fix any remaining test files**

```bash
pnpm exec rg -l "GateType|'NAND'|'AND'|'OR'|'NOT'|'NOR'|'XOR'|'XNOR'" src/ | xargs -I{} echo "REVIEW: {}"
```

Touch each file. Make the change.

- [ ] **Step 5: Run the full unit test suite**

```bash
pnpm run lint
pnpm run test:run
```
Expected: both exit 0.

- [ ] **Step 6: Commit Phase 4 as one cohesive change**

```bash
git add src/store/types.ts \
  src/store/actions/gateActions/ src/store/actions/placementActions/ \
  src/simulation/topologicalEval.ts \
  src/gates/GateRenderer.tsx
git rm src/simulation/gateLogic.ts
git add -A  # captures any other auto-fixed test files
git commit -m "refactor: migrate placement + simulation from GateType union to ChipRegistry

- Delete GateType union; GateInstance.chipName: string drives placement
- createGateInstance reads pin defs from getBuiltinChipRegistry()
- gateLogic.ts deleted; topologicalEval evaluates via chip.implementation.evaluate()
- GateRenderer reduces to a thin wrapper around ChipBody3D
- All tests updated to use Nand/And/Or/Not/Xor naming; NOR/XNOR removed"
```

---

# Phase 5 — Persistence migration

**Outcome of phase:** Saved circuits with legacy uppercase gate types (`NAND`, `AND`, …) load correctly. Saves containing `NOR`/`XNOR` produce a user-visible warning and skip the unsupported gates. New saves write the canonical chip names.

### Task 5.1: Add migration to deserialize (RED)

**Files:**
- Modify: `src/core/serialization/deserialize.ts`
- Modify: `src/core/serialization/serialization.test.ts`

- [ ] **Step 1: Add a test for legacy load**

In `src/core/serialization/serialization.test.ts`, add:

```typescript
import { describe, it, expect, vi } from 'vitest'
import { deserializeCircuit } from './deserialize'
import { notify } from '@/lib/notify'

describe('deserialize legacy GateType migration', () => {
  it('maps NAND/AND/OR/NOT/XOR to Nand/And/Or/Not/Xor', () => {
    const legacy = {
      version: 1,
      name: 'legacy', savedAt: new Date().toISOString(),
      gates: [
        { id: 'g1', type: 'NAND', position: { x: 0, y: 0, z: 0 }, rotation: { x: 0, y: 0, z: 0 }, width: 1 },
        { id: 'g2', type: 'AND', position: { x: 2, y: 0, z: 0 }, rotation: { x: 0, y: 0, z: 0 }, width: 1 },
        { id: 'g3', type: 'OR', position: { x: 4, y: 0, z: 0 }, rotation: { x: 0, y: 0, z: 0 }, width: 1 },
        { id: 'g4', type: 'NOT', position: { x: 6, y: 0, z: 0 }, rotation: { x: 0, y: 0, z: 0 }, width: 1 },
        { id: 'g5', type: 'XOR', position: { x: 8, y: 0, z: 0 }, rotation: { x: 0, y: 0, z: 0 }, width: 1 },
      ],
      wires: [], inputNodes: [], outputNodes: [], junctions: [],
    }
    const result = deserializeCircuit(legacy)
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.circuit.gates.map((g) => g.chipName)).toEqual(
      ['Nand', 'And', 'Or', 'Not', 'Xor']
    )
  })

  it('warns and skips NOR/XNOR gates', () => {
    const notifySpy = vi.spyOn(notify, 'warning').mockImplementation(() => {})
    const legacy = {
      version: 1,
      name: 'has-nor', savedAt: new Date().toISOString(),
      gates: [
        { id: 'g1', type: 'NOR', position: { x: 0, y: 0, z: 0 }, rotation: { x: 0, y: 0, z: 0 }, width: 1 },
        { id: 'g2', type: 'And', position: { x: 2, y: 0, z: 0 }, rotation: { x: 0, y: 0, z: 0 }, width: 1 },
      ],
      wires: [], inputNodes: [], outputNodes: [], junctions: [],
    }
    const result = deserializeCircuit(legacy)
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.circuit.gates).toHaveLength(1)
    expect(result.circuit.gates[0].chipName).toBe('And')
    expect(notifySpy).toHaveBeenCalledWith(expect.stringMatching(/NOR.*not supported/i))
    notifySpy.mockRestore()
  })

  it('accepts modern chip names verbatim', () => {
    const modern = {
      version: 1,
      name: 'modern', savedAt: new Date().toISOString(),
      gates: [
        { id: 'g1', type: 'Mux16', position: { x: 0, y: 0, z: 0 }, rotation: { x: 0, y: 0, z: 0 }, width: 1 },
      ],
      wires: [], inputNodes: [], outputNodes: [], junctions: [],
    }
    const result = deserializeCircuit(modern)
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.circuit.gates[0].chipName).toBe('Mux16')
  })
})
```

- [ ] **Step 2: Run test (expect FAIL — current deserialize sets `.type`, not `.chipName`)**

```bash
pnpm run test:run -- --run src/core/serialization/serialization.test.ts -t "migration"
```
Expected: FAIL.

### Task 5.2: Implement migration in deserialize

**Files:**
- Modify: `src/core/serialization/deserialize.ts`

- [ ] **Step 1: Add the mapping**

Find the place in `deserialize.ts` where gates are reconstructed. Add at the top:

```typescript
import { notify } from '@/lib/notify'

/** Canonical mapping from legacy uppercase types to chip-registry names. */
const LEGACY_GATE_TYPE_MAP: Record<string, string> = {
  NAND: 'Nand', AND: 'And', OR: 'Or', NOT: 'Not', XOR: 'Xor',
}

/** Legacy gate types that have no Project 1 equivalent. */
const UNSUPPORTED_LEGACY_TYPES = new Set(['NOR', 'XNOR'])

function migrateGateTypeName(raw: string): string | null {
  if (LEGACY_GATE_TYPE_MAP[raw]) return LEGACY_GATE_TYPE_MAP[raw]
  if (UNSUPPORTED_LEGACY_TYPES.has(raw)) return null
  return raw // already a modern chip name; pass through
}
```

In the gate reconstruction loop, where it currently builds a gate from `serializedGate`, replace `type: serializedGate.type` with:

```typescript
const migrated = migrateGateTypeName(serializedGate.type)
if (migrated === null) {
  notify.warning(`Skipped unsupported gate type "${serializedGate.type}" — NOR and XNOR are not supported in the builtin chip system.`)
  continue
}
// then construct the gate using `chipName: migrated`
```

Use `createGateInstance(migrated, position, width)` to build the gate so pins match the registered chip's pin definitions. Then override `id` and `position` from the serialized data:

```typescript
const newGate = createGateInstance(migrated, serializedGate.position, serializedGate.width)
newGate.id = serializedGate.id
newGate.rotation = serializedGate.rotation
gates.push(newGate)
```

- [ ] **Step 2: Update serialize.ts to write `chipName` under the `type` field**

In `src/core/serialization/serialize.ts`, find where it produces `SerializedGate`. Replace `type: gate.type` with `type: gate.chipName`. The wire format stays compatible; only the value space changes.

- [ ] **Step 3: Run serialization tests**

```bash
pnpm run test:run -- --run src/core/serialization/serialization.test.ts
```
Expected: all PASS.

- [ ] **Step 4: Commit**

```bash
git add src/core/serialization/serialize.ts src/core/serialization/deserialize.ts \
  src/core/serialization/serialization.test.ts
git commit -m "feat(persistence): migrate legacy GateType saves to chipName; warn on NOR/XNOR"
```

---

# Phase 6 — Cleanup, E2E, docs

**Outcome of phase:** Dead code deleted. E2E suite green. Documentation updated.

### Task 6.1: Delete legacy gate components and configs

**Files (DELETE):**
- `src/gates/components/NandGate.tsx`, `AndGate.tsx`, `OrGate.tsx`, `NotGate.tsx`, `XorGate.tsx`
- `src/gates/components/NandGate.test.tsx`, `AndGate.test.tsx`, `OrGate.test.tsx`, `NotGate.test.tsx`, `XorGate.test.tsx`
- `src/gates/config/nand.tsx`, `nand-constants.ts`, `nand-helpers.ts`
- `src/gates/config/not.tsx`, `not-constants.ts`, `not-helpers.ts`
- `src/gates/config/xor.tsx`, `xor-constants.ts`, `xor-helpers.ts`
- `src/gates/config/and.ts`, `or.ts`, `common.ts`, `common.test.ts`, `logic.ts`, `index.ts`
- `src/gates/icons/NandIcon.tsx`, `AndIcon.tsx`, `OrIcon.tsx`, `NotIcon.tsx`, `XorIcon.tsx`, `index.ts`
- `src/components/ui/icons/GateGlyphs.tsx`

- [ ] **Step 1: Delete legacy gate components and tests**

```bash
rm -f src/gates/components/{NandGate,AndGate,OrGate,NotGate,XorGate}.tsx \
       src/gates/components/{NandGate,AndGate,OrGate,NotGate,XorGate}.test.tsx
```

- [ ] **Step 2: Delete legacy gate configs**

```bash
rm -f src/gates/config/{nand,and,or,not,xor}.{ts,tsx} \
       src/gates/config/{nand,not,xor}-{constants,helpers}.ts \
       src/gates/config/{common,logic,index}.ts \
       src/gates/config/common.test.ts
```

- [ ] **Step 3: Delete legacy gate icons module**

```bash
rm -f src/gates/icons/{Nand,And,Or,Not,Xor}Icon.tsx src/gates/icons/index.ts
rm -f src/components/ui/icons/GateGlyphs.tsx
```

- [ ] **Step 4: Update `src/gates/components/index.ts`**

The file should now only export `BaseGate`, `GatePin`, `WireStub` — actually those live in `src/gates/common/`. Verify `src/gates/components/index.ts` is empty or delete it:

```bash
[ -f src/gates/components/index.ts ] && rm src/gates/components/index.ts
```

- [ ] **Step 5: Update `src/gates/index.ts`**

Replace its contents with:

```typescript
export { GateRenderer } from './GateRenderer'
export { BaseGate } from './common/BaseGate'
export { GatePin } from './common/GatePin'
export { WireStub } from './common/WireStub'
```

- [ ] **Step 6: Verify build still passes**

```bash
pnpm run lint
pnpm run test:run
pnpm run build
```

Expected: all three exit 0. If any imports point at deleted files, fix them now.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "chore(gates): delete legacy per-gate components and configs"
```

### Task 6.2: Update E2E specs to use canonical chip names

**Files (modify all):**
- `e2e/specs/gates/gate-types.store.spec.ts`
- `e2e/specs/gates/gate-types.ui.spec.ts`
- `e2e/specs/wiring/wire-creation.store.spec.ts`
- `e2e/specs/wiring/wire-creation.ui.spec.ts`
- `e2e/helpers/actions/gate.actions.ts`
- `e2e/helpers/actions/toolbar.actions.ts`
- `e2e/selectors/ui.selectors.ts`
- `e2e/config/constants.ts`
- `e2e/types/globals.ts`

- [ ] **Step 1: Mass-update string literals**

```bash
pnpm exec rg -l "'NAND'|'AND'|'OR'|'NOT'|'XOR'" e2e/
```

For each file in the list, do the textual replace in your editor:
- `'NAND'` → `'Nand'`
- `'AND'` → `'And'`
- `'OR'` → `'Or'`
- `'NOT'` → `'Not'`
- `'XOR'` → `'Xor'`

(Order matters: do `NAND` before `AND` so you don't match within `NAND`.)

- [ ] **Step 2: Update `data-testid` selectors**

```bash
pnpm exec rg -l "gate-button-NAND|gate-button-AND|gate-button-OR|gate-button-NOT|gate-button-XOR" e2e/
```

For each match, replace the uppercase suffix accordingly.

- [ ] **Step 3: Remove NOR/XNOR-only test cases**

```bash
pnpm exec rg -l "'NOR'|'XNOR'" e2e/
```

For each match, delete the specific assertion / test case that exercises NOR or XNOR. (They no longer exist as placeable gates.)

- [ ] **Step 4: Update `e2e/types/globals.ts`**

Replace any `GateType` type reference with `string`. Update `placementMode` declaration:

```typescript
placementMode: string | null
```

- [ ] **Step 5: Add a new E2E spec for new chips**

Create `e2e/specs/builtins/placement.store.spec.ts`:

```typescript
import { test, expect } from '@playwright/test'
import { gotoAndWait } from '../../helpers/setup'

const NEW_CHIPS = ['Mux', 'DMux', 'Not16', 'And16', 'Or16', 'Mux16',
                   'Or8Way', 'Mux4Way16', 'Mux8Way16', 'DMux4Way', 'DMux8Way']

test.describe('@store placement of new Project 1 builtins', () => {
  for (const chipName of NEW_CHIPS) {
    test(`places ${chipName} via toolbar`, async ({ page }) => {
      await gotoAndWait(page)
      await page.getByTestId('toolbar-gates-trigger').click()
      await page.getByTestId(`gate-button-${chipName}`).click()
      // Click in the canvas center
      const canvas = page.locator('canvas').first()
      const box = await canvas.boundingBox()
      if (!box) throw new Error('Canvas not found')
      await canvas.click({ position: { x: box.width / 2, y: box.height / 2 } })

      const placed = await page.evaluate(() => {
        return (window as unknown as { __useCircuitStore?: { getState(): { gates: { chipName: string }[] } } })
          .__useCircuitStore?.getState().gates
      })
      expect(placed?.some((g) => g.chipName === chipName)).toBe(true)
    })
  }
})
```

(Adjust the `gotoAndWait` import path and store-window accessor to match the project's actual E2E setup — read `e2e/helpers/setup.ts` and `e2e/types/globals.ts` first.)

- [ ] **Step 6: Run the store E2E suite**

```bash
pnpm run test:e2e:store
```
Expected: all tests pass, including the new placement spec.

- [ ] **Step 7: Commit**

```bash
git add e2e/
git commit -m "test(e2e): update gate-name strings; add @store placement spec for new chips"
```

### Task 6.3: Update REPO_MAP and ticket documents

**Files:**
- Modify: `REPO_MAP.md`
- Modify: `docs/plans/phase-0.5-tickets/P05-15.md`
- Modify: `docs/plans/phase-0.5-tickets/P05-23.md`
- Modify: `docs/plans/phase-0.5-tickets-CHECKLIST.md`
- Modify: `docs/compatibility/nand2tetris/project1/gap-analysis.md`
- Modify: `.cursorrules` (Phase Tracking section if behavior moves forward)

- [ ] **Step 1: Update REPO_MAP**

In `REPO_MAP.md`, find the `src/gates/` section. Update entries:

- Remove: `src/gates/components/{Nand,And,Or,Not,Xor}Gate.tsx`
- Remove: `src/gates/config/*`
- Remove: `src/gates/icons/*`
- Add: `src/components/scene/ChipBody3D.tsx` — generic 3D body for any chip
- Add: `src/components/scene/chipBodyLayout.ts` — pin-layout math
- Add: `src/components/ui/icons/ChipIcons.tsx` — 16 SVG icons keyed by chip name
- Add: `src/core/chips/appRegistry.ts` — singleton builtin + user registries
- Add: `src/core/chips/builtins/project01.ts` — Project 1 builtin registration

- [ ] **Step 2: Update P05-15 ticket**

In `docs/plans/phase-0.5-tickets/P05-15.md`, at the top (after "Effort/Gap" line) insert:

```markdown
> **Superseded by:** `docs/plans/2026-05-24-builtin-chip-placement-standardization.md`
> The standalone P05-15 scope (just register the 16 builtins) is folded into the
> standardization plan along with `appRegistry.ts` ownership, fixture-driven
> tests, and the migration of HACER's placement system to be registry-driven.
```

- [ ] **Step 3: Update P05-23 ticket**

In `docs/plans/phase-0.5-tickets/P05-23.md`, at the top (after "Effort/Gap" line) insert:

```markdown
> **Deferred:** User-defined chips do not exist yet in HACER (composition via
> P05-16/P05-18/P05-24 is out of scope for the 2026-05-24 standardization plan).
> The builtin/user toggle is meaningless until at least one user chip-source ships.
> Revisit this ticket after composite chip work begins.
```

- [ ] **Step 4: Update phase-0.5 checklist**

In `docs/plans/phase-0.5-tickets-CHECKLIST.md`, under Layer 1, change the P05-15 line to:

```markdown
- [x] **P05-15** — Builtin chip implementations (16 chips) — needs P05-01 — **completed via** [2026-05-24-builtin-chip-placement-standardization.md](../2026-05-24-builtin-chip-placement-standardization.md)
```

Move P05-23 to a "Deferred" section at the bottom.

- [ ] **Step 5: Update gap-analysis**

In `docs/compatibility/nand2tetris/project1/gap-analysis.md`, locate the GAP-3D-8 section. After "Severity: Low — convenience feature" add:

```markdown
**Status (2026-05-24):** Requirement #1 (builtin chip implementations) is **CLOSED**
via `docs/plans/2026-05-24-builtin-chip-placement-standardization.md`. Requirements
#2 (toggle button) and #3 (interactive testing) are deferred until user-defined
chip composition lands (P05-16/P05-18/P05-24); until then, all 16 builtins are
the only placeable units in HACER and there is no user-implementation to toggle to.
```

- [ ] **Step 6: Run full DoD suite**

```bash
pnpm run lint
pnpm run test:run
pnpm run test:e2e:store
pnpm run build
```
Expected: all four exit 0.

- [ ] **Step 7: Commit**

```bash
git add REPO_MAP.md docs/plans/phase-0.5-tickets/P05-15.md \
  docs/plans/phase-0.5-tickets/P05-23.md \
  docs/plans/phase-0.5-tickets-CHECKLIST.md \
  docs/compatibility/nand2tetris/project1/gap-analysis.md
git commit -m "docs: REPO_MAP + ticket cross-refs for builtin chip placement standardization"
```

### Task 6.4: Manual smoke test

**Files:** (none — manual)

- [ ] **Step 1: Run dev server**

```bash
pnpm run dev
```

- [ ] **Step 2: Verify each chip places and renders**

For each of the 16 chips (Nand, Not, And, Or, Xor, Mux, DMux, Not16, And16, Or16, Mux16, Or8Way, Mux4Way16, Mux8Way16, DMux4Way, DMux8Way):
- Open the gate popover → click the chip button → click on the canvas
- Confirm a 3D box appears with the chip name label on top
- Confirm the correct number of input/output pins are visible
- For multi-bit chips, confirm width labels appear next to pins (e.g., `in[16]`)

- [ ] **Step 3: Verify legacy save migration**

Load any saved circuit from before this change (or craft a JSON with `'NAND'`/`'AND'` etc.). Confirm:
- Legacy gate types map to canonical names
- A `'NOR'` or `'XNOR'` save triggers a toast warning and skips the bad gates

- [ ] **Step 4: Verify wire creation between chips**

- Place a Not chip and a Not16 chip
- Wire Not.out → Not16.in (should fail or be ignored — width mismatch 1 vs 16)
- Place an InputNode of width 16, wire it to Not16.in (should succeed)
- Place an OutputNode of width 16, wire Not16.out to it
- Toggle the input value via PropertiesPanel; confirm Not16 output inverts

If any of these manual checks fail, return to the relevant phase and fix.

---

# Final verification

After all phases:

```bash
pnpm run lint
pnpm run test:run
pnpm run test:e2e:store
pnpm run build
```

All four must exit 0. This is HACER's definition of done per [`AGENTS.md`](../../AGENTS.md) §0.

---

# Pitfalls

- **`addGate` is called in many places.** Search for `addGate(` and audit every call site; ensure each passes a chip-registered name, not an uppercase legacy string.
- **The Wire type carries width (P05-11).** Width validation when creating wires already exists — see `wireActions.ts`. Single-bit input pins on builtins (e.g., `Mux.sel`) cannot accept a 16-bit wire; the existing P05-11 logic should already reject this. Verify in the manual smoke test.
- **`createGateInstance` width parameter is now a multiplier (default 1)** but for Project 1 builtins the per-pin widths are already fixed in the chip definition. The `width` argument is reserved for future parametric chips; do not let callers accidentally pass a different value expecting it to override pin widths.
- **React Compiler bans `useMemo`/`useCallback`/`React.memo`.** Layout computation in `ChipBody3D` is cheap — do not wrap it in `useMemo`.
- **`isBuiltinChip` narrows the type but bears no runtime cost beyond a discriminator check.** In tight loops (simulation), prefer doing the check once outside the hot path.
- **R3F test harness setup.** `ChipBody3D.test.tsx` needs a Canvas root. If the project already has a shared R3F test helper, prefer it over re-implementing `renderInThree`.
- **Persistence test isolation.** `deserialize` tests must call `resetAppRegistriesForTests()` in `beforeEach` so `createGateInstance` reads a fresh registry — otherwise repeated test runs may interact via the singleton.
- **Three.js renderer in jsdom.** R3F render tests need a `WebGLRenderer` shim — if jsdom fails to construct one, fall back to a minimal shim or move ChipBody3D rendering tests to an `e2e/specs/**.ui.spec.ts` Playwright run.
- **Don't reintroduce dead identifiers.** After Phase 4, `import type { GateType }` must NOT exist anywhere in the codebase. Search and confirm.

---

# Out-of-scope reminders

This plan deliberately does NOT:

- Add HDL compiler (P05-16) — `getUserChipRegistry()` exists but stays empty
- Add chip hierarchy / recursive evaluation (P05-18) — builtins are leaf evaluators only
- Add bus splitter / joiner 3D components ([P05-12](./phase-0.5-tickets/P05-12.md)) — bus pins remain whole; bit-level access is a future ticket, now tracked as the explicit P05-15 follow-up [P05-30](./phase-0.5-tickets/P05-30.md)
- Add composite chip 3D rendering (P05-24) — every placed chip uses the same generic body
- Add the builtin/user toggle UI (P05-23) — deferred; see Task 6.3 Step 3
- Add the chip workflow browser (P05-19) — the toolbar selector is the only chip-picker for now
- Add the chip definition panel (P05-20) — users cannot define their own chips yet
- Add the test results panel (P05-22) — testing builtins against `.cmp` happens in Vitest only
- Add starter HDL templates (P05-21) — no HDL editor in this plan
