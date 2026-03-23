# Implementation Plan: P05-03 Topological Sort Simulation

## Overview

Replace HACER's 3-step single-pass `simulationTick` with Kahn's-algorithm topological-sort evaluation so that a single `evaluateCircuit()` call produces correct, fully-propagated results for any acyclic combinatorial circuit. Currently a NOT→AND chain (2 layers) requires 2 ticks; after this ticket it requires 1.

## Requirements

- `topologicalSort(state)` returns gate IDs in dependency order or reports a cycle
- `evaluateCircuit(state)` evaluates every gate in topological order in a single pass, mutating the Immer draft in place
- `simulationTick` delegates to `evaluateCircuit` instead of the current 3-step loop
- Cycle detection returns involved gate IDs instead of silently producing wrong results
- `getSignalSourceValue` remains exported (used by `CanvasArea.tsx` for wire/junction rendering)
- All existing tests pass (some updated from N-tick to 1-tick expectations)

## Architecture Changes

| Action | File | What |
|--------|------|------|
| Create | `src/simulation/topologicalEval.ts` | `topologicalSort()` + `evaluateCircuit()` pure functions |
| Create | `src/simulation/topologicalEval.test.ts` | Unit tests for sort + eval |
| Modify | `src/store/actions/simulationActions/simulationActions.ts` | Replace 3-step body with `evaluateCircuit()` call |
| Modify | `src/store/actions/simulationActions/simulationActions.test.ts` | Update multi-tick tests to single-tick |
| Modify | `e2e/specs/simulation/signal-propagation.store.spec.ts` | Remove extra `runSimulationTick` calls |

## Key Design Decisions

### Algorithm: Kahn's BFS (not DFS post-order)

Kahn's is simpler for HACER's data model: we build an in-degree map from wires, seed a queue with zero-in-degree gates, and process. It naturally produces the in-degree count needed for cycle detection (leftover gates = cycle). The web-ide uses DFS post-order, but Kahn's is cleaner when building the graph fresh from `WireEndpoint` records each tick.

### Junction transparency

Junctions are fan-out points, not nodes in the topological graph. When building the dependency graph, if a wire's `from.type === 'junction'`, trace through to find the actual gate or input source using the existing `getSignalSourceValue` resolution logic (follow `wireIds[0]`). Junctions never appear in the sort order.

### Input resolution strategy

During evaluation, use `getSignalSourceValue` to resolve each gate's input pin values. Since gates are visited in topological order, all upstream gate outputs are already computed. `getSignalSourceValue` reads gate output pins directly — this works correctly because upstream gates have already been evaluated.

### Immer compatibility

`evaluateCircuit` receives an Immer draft. It mutates `gate.inputs[i].value`, `gate.outputs[i].value`, and `outputNode.value` in place. No spreading or cloning.

---

## Implementation Steps

### Phase 1: `topologicalSort` — Tests then Implementation

#### Step 1.1 — Create test file with `topologicalSort` tests (RED)
**File:** `src/simulation/topologicalEval.test.ts`
**Action:** Create the test file with tests for `topologicalSort`. Import from `./topologicalEval` (doesn't exist yet — tests will fail to compile).
**Tests to write:**

```typescript
import { describe, it, expect, beforeEach } from 'vitest'
import { useCircuitStore } from '@/store/circuitStore'
import { topologicalSort, evaluateCircuit } from './topologicalEval'
import type { TopologicalResult } from './topologicalEval'

const getState = () => useCircuitStore.getState()

// beforeEach: reset store to clean state (mirror simulationActions.test.ts pattern)

describe('topologicalSort', () => {
  it('returns empty order for circuit with no gates')
  it('returns single gate when one gate has no gate-to-gate dependencies')
  it('sorts two-gate chain: gate1 → gate2')
  it('sorts three-gate chain: gate1 → gate2 → gate3')
  it('handles fan-out: gate1 feeds gate2 AND gate3 (both appear after gate1)')
  it('handles fan-in: gate1 and gate2 both feed gate3')
  it('handles diamond: A→B, A→C, B→D, C→D')
  it('handles isolated gates (no wires between them)')
  it('detects a cycle: gate A → gate B → gate A')
  it('returns involved gate IDs in cycle result')
  it('ignores junctions — traces through to actual source')
  it('handles input-node-only sources (gates with in-degree 0)')
})
```

**Verify:** `pnpm run test:run -- --run src/simulation/topologicalEval.test.ts` — fails (module not found)
**Time:** ~5 min

#### Step 1.2 — Implement `topologicalSort` (GREEN)
**File:** `src/simulation/topologicalEval.ts`
**Action:** Create the module with types and `topologicalSort` using Kahn's algorithm.

**Type exports:**
```typescript
export type TopologicalResult =
  | { type: 'success'; order: string[] }   // gate IDs in eval order
  | { type: 'cycle'; involvedGateIds: string[] }
```

**Algorithm outline:**
1. Build `adjacency: Map<string, string[]>` — for each gate, which gates depend on it
2. Build `inDegree: Map<string, number>` — for each gate, how many upstream gates feed it
3. For each wire: resolve the true source (trace through junctions). If source is a gate and destination is a gate, add edge source→dest and increment dest's in-degree
4. Seed queue with gates that have in-degree 0
5. Process queue: dequeue gate, add to result, decrement in-degree of all downstream gates; if any hit 0, enqueue them
6. If result.length < total gates → cycle. Remaining gates form the cycle set.

**Junction resolution helper** (internal to this module):
```typescript
function resolveSourceGateId(
  endpoint: WireEndpoint,
  state: CircuitState
): string | null
```
Follows `junction → wireIds[0] → from` chain until it finds a gate or input. Returns gate entityId if source is a gate, null if source is an input node.

**Verify:** `pnpm run test:run -- --run src/simulation/topologicalEval.test.ts` — all `topologicalSort` tests pass
**Time:** ~5 min

#### Step 1.3 — Refactor `topologicalSort` if needed
**Action:** Review for clarity. Extract graph-building into a helper if the function exceeds ~40 lines. Ensure `resolveSourceGateId` handles:
- Direct gate→gate wires
- Input→gate wires (source is input node, not a gate — gate has 0 in-degree from this wire)
- Junction→gate wires (trace through junction chain)
- Gate→junction→gate wires (trace the junction's source back to a gate)

**Verify:** All tests still pass
**Time:** ~2 min

---

### Phase 2: `evaluateCircuit` — Tests then Implementation

#### Step 2.1 — Add `evaluateCircuit` tests (RED)
**File:** `src/simulation/topologicalEval.test.ts`
**Action:** Add a `describe('evaluateCircuit', ...)` block.

**Tests to write:**

```typescript
describe('evaluateCircuit', () => {
  it('single NOT gate: input 0 → output 1')
  it('single NAND gate: inputs 1,1 → output 0')
  it('two-layer NOT→AND: evaluates correctly in single pass')
    // NOT(1)=0, AND(0,1)=0 — OLD approach would need 2 ticks
  it('three-layer NOT→AND→OR: evaluates correctly in single pass')
    // NOT(1)=0, AND(0,1)=0, OR(0,1)=1
  it('fan-out: one input drives two NOT gates')
  it('fan-in: two inputs drive one AND gate')
  it('diamond: A→NOT1, A→NOT2, NOT1→AND.in0, NOT2→AND.in1')
  it('propagates to output nodes via wires')
  it('does not modify state on cycle detection')
  it('handles empty circuit (no gates, no wires)')
  it('handles circuit with no wires (isolated gates)')
  it('handles input→output direct wire (no gates)')
  it('junction fan-out: input→junction→gate1, junction→gate2')
})
```

**Important pattern — how to call `evaluateCircuit` in tests:**
Since `evaluateCircuit` mutates an Immer draft, tests must call it inside `useCircuitStore.setState()`:
```typescript
useCircuitStore.setState((state) => {
  evaluateCircuit(state)
})
```
Then read results from `getState()`.

**Verify:** Tests fail (function not implemented yet)
**Time:** ~5 min

#### Step 2.2 — Implement `evaluateCircuit` (GREEN)
**File:** `src/simulation/topologicalEval.ts`
**Action:** Implement `evaluateCircuit`.

**Algorithm:**
```typescript
export function evaluateCircuit(state: CircuitState): void {
  const result = topologicalSort(state)
  if (result.type === 'cycle') {
    // TODO (future): surface cycle error to UI
    return // don't modify state
  }

  // Step 1: Propagate input node values to gate input pins via wires
  for (const wire of state.wires) {
    if (wire.to.type === 'gate' && wire.to.pinId) {
      const sourceValue = getSignalSourceValue(wire.from, state)
      const gate = state.gates.find(g => g.id === wire.to.entityId)
      const inputPin = gate?.inputs.find(p => p.id === wire.to.pinId)
      if (inputPin) {
        inputPin.value = sourceValue
      }
    }
  }

  // Step 2: Evaluate gates in topological order
  for (const gateId of result.order) {
    const gate = state.gates.find(g => g.id === gateId)
    if (!gate) continue

    // Re-read input values from upstream wires (upstream gates already evaluated)
    for (const wire of state.wires) {
      if (wire.to.type === 'gate' && wire.to.entityId === gateId && wire.to.pinId) {
        const sourceValue = getSignalSourceValue(wire.from, state)
        const inputPin = gate.inputs.find(p => p.id === wire.to.pinId)
        if (inputPin) {
          inputPin.value = sourceValue
        }
      }
    }

    // Evaluate gate logic
    const inputValues = gate.inputs.map(p => p.value)
    const logic = gateLogic[gate.type]
    if (logic) {
      const outputValue = logic(inputValues)
      for (const output of gate.outputs) {
        output.value = outputValue
      }
    }
  }

  // Step 3: Propagate to output nodes
  for (const wire of state.wires) {
    if (wire.to.type === 'output') {
      const outputNode = state.outputNodes.find(n => n.id === wire.to.entityId)
      if (outputNode) {
        outputNode.value = getSignalSourceValue(wire.from, state)
      }
    }
  }
}
```

**Key insight:** In step 2, we re-read input pin values from wires before evaluating each gate. This is necessary because `getSignalSourceValue` reads gate output pin values — for upstream gates that have already been evaluated in this pass, those values are now correct.

**Verify:** `pnpm run test:run -- --run src/simulation/topologicalEval.test.ts` — all tests pass
**Time:** ~5 min

#### Step 2.3 — Refactor `evaluateCircuit`
**Action:** Review for performance and clarity.

Potential optimization: pre-build a `Map<string, Wire[]>` of wires grouped by destination gate ID to avoid scanning all wires for each gate. For Phase 0.5 circuits (< 50 gates), the O(gates × wires) scan is fine. Flag for future optimization if needed.

**Verify:** All tests still pass
**Time:** ~2 min

---

### Phase 3: Integration — Replace `simulationTick` body

#### Step 3.1 — Replace `simulationTick` implementation
**File:** `src/store/actions/simulationActions/simulationActions.ts`
**Action:**

1. Add import at top:
   ```typescript
   import { evaluateCircuit } from '@/simulation/topologicalEval'
   ```

2. Replace the `simulationTick` body (lines 100–136):
   ```typescript
   simulationTick: () => {
     set((state) => {
       evaluateCircuit(state)
     }, false, 'simulationTick')
   },
   ```

3. Keep `getSignalSourceValue` exported — it's still used by `CanvasArea.tsx` for rendering wire signal colors and by `evaluateCircuit` internally.

**Verify:** `pnpm run lint` — no errors
**Time:** ~2 min

---

### Phase 4: Update Existing Tests

#### Step 4.1 — Update `simulationActions.test.ts` multi-tick test
**File:** `src/store/actions/simulationActions/simulationActions.test.ts`
**Action:** Update the test at line 109 (`'propagates output values through wires to inputs'`).

**Current behavior (needs 2 ticks):**
```typescript
// Run tick to calculate gate1 output
getState().simulationTick()
expect(getState().gates[0].outputs[0].value).toBe(0)

// Run another tick to propagate to gate2
getState().simulationTick()
expect(getState().gates[1].inputs[0].value).toBe(0)
```

**New behavior (1 tick propagates fully):**
```typescript
// Single tick propagates through entire chain
getState().simulationTick()

// Gate1 output: NAND(1,1) = 0
expect(getState().gates[0].outputs[0].value).toBe(0)
// Gate2 input receives gate1 output in same tick
expect(getState().gates[1].inputs[0].value).toBe(0)
```

**Verify:** `pnpm run test:run -- --run src/store/actions/simulationActions/simulationActions.test.ts` — passes
**Time:** ~2 min

#### Step 4.2 — Update XOR circuit test from 5 ticks to 1
**File:** `src/store/actions/simulationActions/simulationActions.test.ts`
**Action:** In the XOR test (line 541), replace all four `for (let i = 0; i < 5; i++) getState().simulationTick()` loops with a single `getState().simulationTick()` call.

**Current:**
```typescript
for (let i = 0; i < 5; i++) getState().simulationTick()
expect(getState().outputNodes[0].value).toBe(0)
```

**New:**
```typescript
getState().simulationTick()
expect(getState().outputNodes[0].value).toBe(0)
```

Repeat for all four truth table entries (a=0,b=0), (a=0,b=1), (a=1,b=0), (a=1,b=1).

**Verify:** `pnpm run test:run -- --run src/store/actions/simulationActions/simulationActions.test.ts` — passes
**Time:** ~2 min

#### Step 4.3 — Update E2E `signal-propagation.store.spec.ts`
**File:** `e2e/specs/simulation/signal-propagation.store.spec.ts`
**Action:** Update tests that use multiple `runSimulationTick` calls for multi-layer propagation. With topological sort, 1 tick suffices.

**Changes:**

1. **Line 129–130** — `'NOT gate inverts signal'` test: Remove duplicate `runSimulationTick`. Change from:
   ```typescript
   await runSimulationTick(page)
   await runSimulationTick(page)
   ```
   To:
   ```typescript
   await runSimulationTick(page)
   ```

2. **Lines 181–183** — `'propagates through three-gate chain'` test: Remove extra ticks. Change from:
   ```typescript
   await runSimulationTick(page)
   await runSimulationTick(page)
   await runSimulationTick(page)
   ```
   To:
   ```typescript
   await runSimulationTick(page)
   ```

**Note:** The E2E tests that use `toggleSimulationViaStore` + `waitForTimeout` + single `runSimulationTick` (e.g., "NAND-NAND chain", "AND-OR chain") don't need changes — the toggle already ran ticks via the interval, and the extra `runSimulationTick` just confirms the final state. They'll still pass because topological sort is strictly better (works in 1 tick, extra ticks are idempotent for combinatorial circuits).

**Verify:** `pnpm run test:e2e:store` — all pass
**Time:** ~3 min

---

### Phase 5: Full Verification

#### Step 5.1 — Run all quality gates
**Action:** Run all mandatory checks.

```bash
pnpm run lint                          # TypeScript + ESLint
pnpm run test:run                      # All Vitest unit tests
pnpm run test:e2e:store                # All Playwright store tests
pnpm run build                         # Production build
```

**All must exit 0.** If any fail, debug and fix before proceeding.
**Time:** ~5 min

#### Step 5.2 — Verify behavior manually (optional smoke test)
**Action:** Open dev server, build a 2-layer circuit (Input → NOT → AND → Output), set inputs, run one simulation tick, verify output is correct immediately.

**Time:** ~3 min

---

## Testing Strategy

### Unit tests (`src/simulation/topologicalEval.test.ts`) — NEW

| Test | Circuit | Expected |
|------|---------|----------|
| Empty circuit | No gates | `{ type: 'success', order: [] }` |
| Single gate | Input → NAND | Order has 1 gate |
| Two-gate chain | NAND → NAND | gate1 before gate2 |
| Three-gate chain | NOT → AND → OR | NOT, AND, OR in order |
| Fan-out | A → B, A → C | A before B and C |
| Fan-in | A → C, B → C | A and B before C |
| Diamond | A→B, A→C, B→D, C→D | A first, D last |
| Cycle detection | A → B → A | `{ type: 'cycle' }` |
| Single NOT eval | Input(0) → NOT | Output = 1 |
| Two-layer eval | Input(1) → NOT → AND | Correct in 1 pass |
| Three-layer eval | NOT → AND → OR | Correct in 1 pass |
| XOR eval | Full XOR circuit | Truth table in 1 pass |
| Junction fan-out eval | Input → J → Gate1, Gate2 | Both gates see input |
| Output node propagation | Gate → OutputNode | OutputNode has correct value |
| Direct input→output | InputNode → OutputNode (no gates) | Value passes through |
| Cycle → no mutation | Cyclic circuit | State unchanged |

### Updated unit tests (`simulationActions.test.ts`)

| Test | Change |
|------|--------|
| `propagates output values through wires to inputs` (line 109) | 2 ticks → 1 tick |
| `simulates XOR circuit with input nodes` (line 541) | 5 ticks → 1 tick (×4 truth table entries) |

### Updated E2E tests (`signal-propagation.store.spec.ts`)

| Test | Change |
|------|--------|
| `NOT gate inverts signal` (line 100) | 2 `runSimulationTick` → 1 |
| `propagates through three-gate chain` (line 138) | 3 `runSimulationTick` → 1 |

### Tests that need NO changes

These tests already use 1 tick or use `toggleSimulation` + `waitForTimeout` (interval-based):

- `simulationActions.test.ts`: `toggleSimulation`, `setSimulationSpeed`, `clearCircuit`, `calculates new output values for all gates`, `handles gates with no wires`, all `getSignalSourceValue` tests, `propagates input node value to gate input via wire`, `propagates gate output to output node via wire`, `propagates input through gate to output node`, `propagates through junction for fan-out`, `handles junction value when source is false`
- `signal-propagation.store.spec.ts`: `NAND-NAND chain`, `AND-OR chain`, `fan-out`, `XOR gate in circuit`
- `simulation-control.store.spec.ts`: All tests (control flow, not propagation)

---

## Risks & Mitigations

### Risk: `getSignalSourceValue` reads stale gate output values during mid-evaluation

**Severity:** High
**Explanation:** During `evaluateCircuit`, when we call `getSignalSourceValue` for a gate's input pin, it reads the output pin of the upstream gate. If that gate hasn't been evaluated yet in this pass, it returns the old value.
**Mitigation:** Topological order guarantees all upstream gates are evaluated before downstream ones. The input resolution in step 2 re-reads values after upstream gates have been processed. This is the whole point of the topological sort.

### Risk: Junction chains create phantom gate dependencies

**Severity:** Medium
**Explanation:** A wire from junction→gate needs to be traced back to the original source gate to build the correct dependency edge.
**Mitigation:** `resolveSourceGateId` traces through junction chains (following `wireIds[0]` like `getSignalSourceValue` does) to find the true source gate or input node.

### Risk: Wires between junctions (no gate endpoints) confuse the graph builder

**Severity:** Low
**Explanation:** Some wires connect junction→junction or input→junction without touching a gate directly.
**Mitigation:** The graph builder only adds edges when both source and destination resolve to gates. Wires that don't connect gates are irrelevant to the topological sort (they're handled by `getSignalSourceValue` during value resolution).

### Risk: E2E tests that use `toggleSimulation` + `waitForTimeout` may behave differently

**Severity:** Low
**Explanation:** The interval-based simulation loop calls `simulationTick` repeatedly. With topological sort, each tick fully propagates, so the first tick gives the correct result. Extra ticks are harmless for combinatorial circuits.
**Mitigation:** No change needed. Extra ticks on a stable combinatorial circuit are idempotent.

### Risk: Immer draft passed to `evaluateCircuit` has different mutation semantics than plain objects

**Severity:** Low
**Explanation:** Immer drafts trap property assignments. Code that tries to spread or clone will create plain objects that bypass Immer tracking.
**Mitigation:** `evaluateCircuit` only does `pin.value = x` and `outputNode.value = x` assignments — standard Immer mutations. No spreading, no `Object.assign`, no cloning.

---

## File Dependency Graph

```
topologicalEval.ts
  ├── imports: CircuitState, WireEndpoint (from @/store/types)
  ├── imports: gateLogic (from ./gateLogic)
  ├── imports: getSignalSourceValue (from @/store/actions/simulationActions/simulationActions)
  └── exports: topologicalSort, evaluateCircuit, TopologicalResult

simulationActions.ts
  ├── imports: evaluateCircuit (from @/simulation/topologicalEval)  ← NEW
  ├── exports: getSignalSourceValue (unchanged — used by CanvasArea.tsx)
  └── exports: createSimulationActions (simulationTick body replaced)
```

**Circular dependency check:** `topologicalEval.ts` imports `getSignalSourceValue` from `simulationActions.ts`. `simulationActions.ts` imports `evaluateCircuit` from `topologicalEval.ts`. This is a **circular import**. 

**Resolution:** Move `getSignalSourceValue` to its own module or into `topologicalEval.ts`.

**Recommended approach:** Move `getSignalSourceValue` into `src/simulation/topologicalEval.ts` and re-export it from `simulationActions.ts` for backward compatibility:

```typescript
// simulationActions.ts
export { getSignalSourceValue } from '@/simulation/topologicalEval'
```

This way:
- `CanvasArea.tsx` import path doesn't change (still imports from `simulationActions`)
- No circular dependency
- `topologicalEval.ts` owns all signal resolution logic

**Alternative:** Create `src/simulation/signalSource.ts` for `getSignalSourceValue` and import from there in both files. This is cleaner but touches more import paths. Recommend the re-export approach for minimal diff.

---

## Updated Implementation Steps (accounting for circular dependency fix)

### Phase 1: Steps 1.1–1.3 (unchanged)

### Phase 2: Steps 2.1–2.3 (unchanged, but `evaluateCircuit` calls `getSignalSourceValue` locally)

### Phase 3: Integration (updated)

#### Step 3.1 — Move `getSignalSourceValue` to `topologicalEval.ts`
**File:** `src/simulation/topologicalEval.ts`
**Action:** Move the `getSignalSourceValue` function from `simulationActions.ts` into `topologicalEval.ts`. Export it.

#### Step 3.2 — Re-export from `simulationActions.ts`
**File:** `src/store/actions/simulationActions/simulationActions.ts`
**Action:**
1. Remove the `getSignalSourceValue` function body
2. Add: `export { getSignalSourceValue } from '@/simulation/topologicalEval'`
3. Add: `import { evaluateCircuit } from '@/simulation/topologicalEval'`
4. Replace `simulationTick` body with `evaluateCircuit(state)` call
5. Remove `gateLogic` import (no longer used directly)

#### Step 3.3 — Verify imports still work
**Verify:**
- `pnpm run lint` — no import errors
- `pnpm run build` — compiles clean

### Phase 4: Steps 4.1–4.3 (unchanged)

### Phase 5: Steps 5.1–5.2 (unchanged)

---

## Success Criteria

- [x] `topologicalSort` correctly orders gates for acyclic circuits
- [x] `topologicalSort` detects cycles and returns involved gate IDs
- [x] `evaluateCircuit` produces correct results for any acyclic combinatorial circuit in a single call
- [x] `simulationTick` delegates to `evaluateCircuit`
- [x] NOT→AND 2-layer circuit evaluates correctly in 1 tick (was 2)
- [x] XOR circuit (3 layers, 5 gates) evaluates correctly in 1 tick (was 5)
- [x] `getSignalSourceValue` still works for `CanvasArea.tsx` wire rendering
- [x] No circular imports
- [x] Cycle feedback: `lastSimulationError` + Ant Design `message.error` (follow-up to silent skip)
- [x] Public API JSDoc (`@param` / `@returns`) on `topologicalEval` exports
- [x] `pnpm run lint` exits 0
- [x] `pnpm run test:run` — all pass
- [x] `pnpm run test:e2e:store` — all pass
- [x] `pnpm run build` succeeds

---

## Summary Task List

| # | Phase | Task | File(s) | Type | ~Min |
|---|-------|------|---------|------|------|
| 1 | 1 | Write `topologicalSort` tests | `topologicalEval.test.ts` | RED | 5 |
| 2 | 1 | Implement `topologicalSort` | `topologicalEval.ts` | GREEN | 5 |
| 3 | 1 | Refactor sort if needed | `topologicalEval.ts` | REFACTOR | 2 |
| 4 | 2 | Write `evaluateCircuit` tests | `topologicalEval.test.ts` | RED | 5 |
| 5 | 2 | Implement `evaluateCircuit` | `topologicalEval.ts` | GREEN | 5 |
| 6 | 2 | Refactor eval if needed | `topologicalEval.ts` | REFACTOR | 2 |
| 7 | 3 | Move `getSignalSourceValue` to `topologicalEval.ts` | Both files | MOVE | 3 |
| 8 | 3 | Replace `simulationTick` body | `simulationActions.ts` | INTEGRATE | 2 |
| 9 | 4 | Update multi-tick unit test | `simulationActions.test.ts` | UPDATE | 2 |
| 10 | 4 | Update XOR test (5 ticks → 1) | `simulationActions.test.ts` | UPDATE | 2 |
| 11 | 4 | Update E2E multi-tick tests | `signal-propagation.store.spec.ts` | UPDATE | 3 |
| 12 | 5 | Run all quality gates | — | VERIFY | 5 |
| | | **Total** | | | **~41** |
