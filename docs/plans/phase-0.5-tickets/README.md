# Phase 0.5 — Ticket Index (Layers 0–4)

**Parent plan:** [`docs/plans/2026-03-22-phase-0.5-tickets.md`](../2026-03-22-phase-0.5-tickets.md)
**Gap analysis:** [`docs/compatibility/nand2tetris/project1/gap-analysis.md`](../../compatibility/nand2tetris/project1/gap-analysis.md)

Each ticket file below is **self-contained** — a fresh LLM session can implement it without reading other tickets.

---

## Verifiability

| Kind of ticket | Vitest | `test:e2e:store` | Manual / UI |
|----------------|--------|------------------|-------------|
| **Pure modules** (P05-01, P05-04–06, P05-15, P05-18) | Required (new tests) | **Regression only** — full suite must stay green | Optional unless UI ships |
| **Store / simulation refactor** (P05-02, P05-03, P05-08, P05-11) | Required | Regression + add/adjust specs if store contract changes | Smoke when behavior is user-visible |
| **UI features** (P05-09, P05-10, P05-12, P05-13, P05-19–24) | Component + store tests | **Add or extend** `@store` Playwright specs for visible behavior (`data-testid`s) | Required checklist in ticket |
| **Pipeline / engine** (P05-16, P05-17, P05-26) | Required (compile/run tests) | Regression | Optional until UI wrappers (P05-21, P05-22) |
| **Persistence** (P05-14) | Round-trip + store action tests | Regression + add save/load spec | Manual: save → refresh → load |
| **Integration** (P05-27) | Not applicable | **New** `@store` + `@ui` Playwright specs under `e2e/specs/phase-0.5/` | Full student workflow |
| **Documentation** (P05-28) | Not applicable | Regression only | REPO_MAP accuracy, guide readability |

**Parser corpus (P05-04–06):** Parsers are not on the React tree by default. If policy demands browser-level verification beyond Vitest, add a **dev-only** `window.__HACER_PARSE_SMOKE__` (or similar) in `main.tsx` guarded by `import.meta.env.DEV` and a thin `e2e/specs/**` file — optional for Layer 0; otherwise Vitest + green store E2E is sufficient.

---

## Tickets

### Layer 0 — No dependencies (can start day 1)

| ID | Title | Effort | Gap(s) | Status |
|----|-------|--------|--------|--------|
| [P05-01](P05-01.md) | ChipRegistry + Nand builtin | 8h | GAP-3D-1, GAP-UI-7 | TODO |
| [P05-02](P05-02.md) | Multi-bit data model (boolean to number) | 8h | GAP-3D-2 | TODO |
| [P05-03](P05-03.md) | Topological sort simulation | 10h | GAP-3D-5 | TODO |
| [P05-04](P05-04.md) | HDL parser | 14h | GAP-UI-1 | TODO |
| [P05-05](P05-05.md) | TST parser | 8h | GAP-3D-4 | TODO |
| [P05-06](P05-06.md) | CMP parser | 4h | GAP-3D-4 | TODO |
| [P05-08](P05-08.md) | Node rename + name display | 5h | GAP-3D-3 | TODO |
| [P05-09](P05-09.md) | StatusBar component | 4h | GAP-UI-5 | TODO |
| [P05-10](P05-10.md) | PinoutPanel component | 5h | GAP-UI-3 | TODO |

### Layer 1 — Depends on one Layer 0 item

| ID | Title | Effort | Depends | Gap(s) | Status |
|----|-------|--------|---------|--------|--------|
| [P05-11](P05-11.md) | Bus simulation + multi-bit wire propagation | 10h | P05-02 | GAP-3D-2 | TODO |
| [P05-12](P05-12.md) | Bus 3D components (splitter, joiner) | 8h | P05-02 | GAP-3D-2 | TODO |
| [P05-13](P05-13.md) | Multi-bit I/O UI (bit toggles, format selector) | 5h | P05-02 | GAP-UI-4, GAP-3D-2 | TODO |
| [P05-14](P05-14.md) | Circuit persistence (serialize + save/load + export/import) | 10h | P05-03 | GAP-3D-6 | TODO |
| [P05-15](P05-15.md) | Builtin chip implementations (16 Project 1 chips) | 8h | P05-01 | GAP-3D-8 | TODO |
| [P05-16](P05-16.md) | HDL compiler (HDL → evaluable chip) | 14h | P05-04, P05-01 | GAP-UI-1, GAP-3D-1 | TODO |

### Layer 2 — Depends on multiple Layer 0/1 items

| ID | Title | Effort | Depends | Gap(s) | Status |
|----|-------|--------|---------|--------|--------|
| [P05-17](P05-17.md) | Test execution engine | 12h | P05-05, P05-06, P05-03 | GAP-3D-4 | TODO |
| [P05-18](P05-18.md) | Chip hierarchy evaluation (recursive) | 10h | P05-01, P05-16 | GAP-3D-1 | TODO |
| [P05-19](P05-19.md) | Chip workflow browser UI | 8h | P05-01 | GAP-3D-7 | TODO |
| [P05-20](P05-20.md) | ChipDefinitionPanel + auto-IO + validation | 8h | P05-01, P05-08 | GAP-3D-3 | TODO |

### Layer 3 — Full feature UI panels

| ID | Title | Effort | Depends | Gap(s) | Status |
|----|-------|--------|---------|--------|--------|
| [P05-21](P05-21.md) | HDL editor UI (CodeMirror, auto-compile, error markers) | 10h | P05-16, P05-09 | GAP-UI-1 | TODO |
| [P05-22](P05-22.md) | Test results panel (run button, output table, diff) | 6h | P05-17, P05-09 | GAP-UI-2, GAP-3D-4 | TODO |
| [P05-23](P05-23.md) | Builtin toggle UI (switch modes, fallback resolution) | 4h | P05-15, P05-01 | GAP-3D-8 | TODO |
| [P05-24](P05-24.md) | Composite chip 3D rendering (labeled box, dynamic pins) | 10h | P05-01, P05-18 | GAP-3D-1 | TODO |

### Layer 4 — Integration and polish

| ID | Title | Effort | Depends | Gap(s) | Status |
|----|-------|--------|---------|--------|--------|
| [P05-26](P05-26.md) | 3D/HDL interoperability (export, cross-mode composition) | 8h | P05-16, P05-14, P05-18, P05-24 | GAP-UI-6, GAP-UI-7 | TODO |
| [P05-27](P05-27.md) | End-to-end integration testing | 12h | P05-21, P05-22, P05-24, P05-26 | All (validation) | TODO |
| [P05-28](P05-28.md) | Documentation | 4h | P05-27 | — | TODO |

---

## Dependency Map

**Layer 0** tickets have **zero dependencies on each other** — can be worked in any order or in parallel.

**Layer 1** tickets depend on exactly one Layer 0 item (except P05-16 which needs P05-04 + P05-01).

**Layer 2** tickets depend on multiple Layer 0/1 items.

```
LAYER 0 (no deps)
  P05-01  ChipRegistry ──► P05-15 (builtins), P05-16 (compiler), P05-18 (hierarchy),
                           P05-19 (chip workflow UI), P05-20 (chip def panel)
  P05-02  boolean→number ─► P05-11 (bus sim), P05-12 (bus 3D), P05-13 (multi-bit UI)
  P05-03  Topo eval ──────► P05-14 (persistence), P05-17 (test engine)
  P05-04  HDL parser ─────► P05-16 (compiler)
  P05-05  TST parser ─────► P05-17 (test engine)
  P05-06  CMP parser ─────► P05-17 (test engine)
  P05-08  Node rename ────► P05-20 (chip def panel)
  P05-09  StatusBar        (consumed by later layers)
  P05-10  PinoutPanel      (consumed by later layers)

LAYER 1
  P05-11  Bus simulation      [P05-02]
  P05-12  Bus 3D components   [P05-02]
  P05-13  Multi-bit I/O UI    [P05-02]
  P05-14  Circuit persistence  [P05-03]
  P05-15  Builtin chips        [P05-01]
  P05-16  HDL compiler         [P05-04, P05-01]

LAYER 2
  P05-17  Test engine          [P05-05, P05-06, P05-03]
  P05-18  Hierarchy eval       [P05-01, P05-16]
  P05-19  Chip workflow UI     [P05-01]
  P05-20  ChipDefinitionPanel  [P05-01, P05-08]

LAYER 3 (full feature UI)
  P05-21  HDL editor UI        [P05-16, P05-09]
  P05-22  Test results panel   [P05-17, P05-09]
  P05-23  Builtin toggle UI    [P05-15, P05-01]
  P05-24  Composite chip 3D    [P05-01, P05-18]

LAYER 4 (integration + polish)
  P05-26  3D/HDL interop       [P05-16, P05-14, P05-18, P05-24]
  P05-27  E2E integration      [P05-21, P05-22, P05-24, P05-26]
  P05-28  Documentation        [P05-27]
```

---

## Recommended Session Ordering

| Session | Tickets | Layer | Notes |
|---------|---------|-------|-------|
| 1 | P05-01 | 0 | Foundation for chip system |
| 2 | P05-02 | 0 | Wide refactor — needs full focus |
| 3 | P05-03 | 0 | Core simulation correctness fix |
| 4 | P05-04 | 0 | HDL parser — large, complex |
| 5 | P05-05, P05-06 | 0 | Both parsers, can pair |
| 6 | P05-08 | 0 | Node rename + visible labels |
| 7 | P05-09, P05-10 | 0 | UI components, can pair |
| 8 | P05-15 | 1 | All 16 builtins — needs P05-01 |
| 9 | P05-11, P05-12 | 1 | Bus sim + 3D — needs P05-02 |
| 10 | P05-13 | 1 | Multi-bit I/O — needs P05-02 |
| 11 | P05-16 | 1 | HDL compiler — needs P05-04 + P05-01 |
| 12 | P05-14 | 1 | Persistence — needs P05-03 |
| 13 | P05-17 | 2 | Test engine — needs P05-05 + P05-06 + P05-03 |
| 14 | P05-18 | 2 | Hierarchy eval — needs P05-01 + P05-16 |
| 15 | P05-19, P05-20 | 2 | Chip workflow UI + chip def panel |
| 16 | P05-21 | 3 | HDL editor UI — needs P05-16 |
| 17 | P05-22, P05-23 | 3 | Test results + builtin toggle, can pair |
| 18 | P05-24 | 3 | Composite chip 3D — needs P05-01 + P05-18 |
| 19 | P05-26 | 4 | 3D/HDL interop — needs P05-16 + P05-14 + P05-18 + P05-24 |
| 20 | P05-27 | 4 | Full E2E integration tests |
| 21 | P05-28 | 4 | Documentation + REPO_MAP update |

---

## Codebase Conventions (for all tickets)

**Imports:** Use `@/` path aliases (`@/store/types`, `@/simulation/gateLogic`).

**Store tests:** `useCircuitStore` has **no** `getInitialState()` — mirror `initialState` in `src/store/circuitStore.ts` (and any new slices, e.g. `statusMessages` after P05-09):

```typescript
import { useCircuitStore } from '@/store/circuitStore'

/** Keep in sync with `circuitStore.ts` `initialState` + new state fields from your ticket. */
function resetCircuitStoreState() {
  useCircuitStore.setState({
    gates: [],
    wires: [],
    selectedGateId: null,
    selectedWireId: null,
    simulationRunning: false,
    simulationSpeed: 100,
    placementMode: null,
    placementPreviewPosition: null,
    wiringFrom: null,
    isDragActive: false,
    hoveredGateId: null,
    showAxes: false,
    inputNodes: [],
    outputNodes: [],
    junctions: [],
    nodePlacementMode: null,
    selectedNodeId: null,
    selectedNodeType: null,
    junctionPlacementMode: null,
    junctionPreviewPosition: null,
    junctionPreviewWireId: null,
    // After P05-09: statusMessages: [],
  })
}

beforeEach(() => {
  resetCircuitStoreState()
})
```

**Recommended cleanup (optional):** Export a shared `circuitStoreInitialState` (or test helper) from `circuitStore.ts` in the same PR that adds new state so tests and tickets stay aligned.

**Test framework:** `import { describe, it, expect, beforeEach } from 'vitest'`

**New directories:** `src/core/` and `src/data/` do not exist yet — create them as needed. Layer 1/2 tickets may require `src/core/chips/builtins/`, `src/core/chips/`, `src/core/hdl/`, `src/core/testing/nand2tetris/`, `src/core/serialization/`.

**State management:**
- Read: `useCircuitStore(state => state.property)`
- Mutate: `circuitActions.methodName()`
- Never mutate store directly

**React:** React 19 + React Compiler. NO `useMemo`, `useCallback`, `React.memo`.

**Verification (every ticket):**
```bash
pnpm run lint          # Must exit 0
pnpm run test:run      # All tests pass
pnpm run build         # Build succeeds
pnpm run test:e2e:store  # E2E store tests pass (no regression)
```
