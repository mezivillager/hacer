# Bus Splitter / Joiner Components (P05-12a) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add bus splitter (1 N-bit input → N 1-bit outputs) and bus joiner (N 1-bit inputs → 1 N-bit output) as a new first-class entity that can be placed, wired, rendered with width-dynamic pins, and evaluated live in the simulation.

**Architecture:** Mirror the existing node-entity pattern (`inputNodes`/`nodeActions`/`NodeRenderer`), NOT the gate/registry pattern. Bus components are a new `busComponents: BusComponent[]` array on `CircuitState` with their own slice factory (`busActions`), pure geometry (`busBodyLayout`), pure logic (`busLogic`), a new `'bus'` `WireEndpointType`, and `src/nodes/` renderers. Wiring generalizes the pin-based path rather than cloning the per-type method family.

**Tech Stack:** TypeScript, React 19 + React Compiler, React Three Fiber / three.js, Zustand (immer + subscribeWithSelector + devtools), Vitest (+ `@react-three/test-renderer` scene-graph layer, ADR-0008), Playwright (store E2E), pnpm.

## Global Constraints

These apply to **every** task. Copy verbatim from the brief:

- pnpm **10.x**, Node **≥ 22**; run every command from this worktree (`hacer-wt-bus-components`).
- **React Compiler is ON:** do NOT add `useMemo`/`useCallback`/`React.memo`. The only sanctioned `useMemo` is for Three.js geometry/material objects. ESLint enforces this (`react-compiler/react-compiler: error`).
- **State access:** production reads via narrow selectors `useCircuitStore(s => s.x)`; production mutates ONLY via `circuitActions.*`. TEST code MAY use `useCircuitStore.setState(...)` and `useCircuitStore.getState().<action>()`.
- `@/` resolves to `src/`. UI feedback via `notify` from `@/lib/notify` (never `console.log`/`alert`; `console.warn`/`console.error` are allowed for non-UI diagnostics only). One component per file.
- Float/geometry tolerance is **0.001**.
- **NEVER** `git commit --no-verify`. Husky runs lint-staged + `tsc -b` + commitlint; `tsc` can take a few minutes — let it finish.
- Commits are **Conventional Commits** with **NO AI attribution** (no `Co-Authored-By`, no "Generated with Claude").
- ESLint `@typescript-eslint/no-unused-vars` ignores args matching `^_` (use `_get`, `_pinType`, etc. for intentionally-unused params).
- **Definition of Done (all must exit 0):** `pnpm run lint` · `pnpm run test:run` · `pnpm run test:e2e:store` · `pnpm run build`.
- Scene-graph testing layer (`src/test/r3f/`, ADR-0008) is available and MUST be used for the render test (Task 7).

### Design decisions locked here (refinements over the spec's shorthand)

- `createBusPins(kind, width)` returns `{ inputs: Pin[]; outputs: Pin[] }` (the spec wrote `: Pin[]` as shorthand; the object shape maps 1:1 onto `BusComponent.inputs`/`.outputs` and avoids re-partitioning by `pin.type`).
- `placeBusSplitter`/`placeBusJoiner` return `BusComponent | null` (`null` on the invalid-width no-op; the spec wrote `=> BusComponent` but did not account for the no-op).
- Bus components use rotation `{0,0,0}` and lay pins out spreading along **local Z** (the ground plane), input side on `-x`, output side on `+x`. This DIVERGES from `chipBodyLayout`'s local-Y convention (gates compensate with a `[π/2,0,0]` render rotation) — but because bus components render like nodes (no extra render rotation), Z-spread keeps the rendered pin meshes, `getPinWorldPosition`, and `deriveWire3DProps` all on one identity-rotation transform, so they cannot drift.
- Pin IDs are component-local (`in`, `in0..in{N-1}`, `out`, `out0..out{N-1}`); uniqueness across the circuit is provided by the `entityId` on the wire endpoint, exactly as gate pins rely on their gate id.
- Bus wiring uses a small generalized surface: `startWiringFromBus` + `completeWiringToBus` + `completeWiringFromBusToGate` + `completeWiringFromBusToNode`, all thin wrappers over one shared `createWireFromActiveWiring` core that reads the source generically (`resolveSourceEndpoint`). No per-pair method explosion.

---

## File map

| Path | Responsibility | Task |
|------|----------------|------|
| `src/simulation/busLogic.ts` (+`.test.ts`) | Pure `evaluateSplitter`/`evaluateJoiner` | 1 |
| `src/store/actions/busActions/busPins.ts` (+`.test.ts`) | Pure `createBusPins` | 1 |
| `src/store/types.ts` | `BusComponentKind`, `BusComponent`, `busComponents`, `'bus'` endpoint, `BusActions`, `BusPlacementActions`, `WiringSource` bus variant, new wiring/placement methods | 2,5,8 |
| `src/store/actions/busActions/busActions.ts` (+`.test.ts`) | CRUD slice; re-route on move | 2,5 |
| `src/store/circuitStore.ts` | init state + wire slices + `circuitActions` exposure | 2,5,8 |
| `src/test/testUtils.ts` | `createMockStore` defaults + no-op actions | 2,5,8 |
| `src/simulation/topologicalEval.ts` | `'bus'` cases in `getSignalSourceValue`/`resolveSourceGateId`/`destinationWidth`; bus nodes in sort/eval | 2,4 |
| `src/store/actions/wireActions/wireActions.ts` | `'bus'` case in `getEndpointWidth` | 2 |
| `src/components/scene/busBodyLayout.ts` (+`.test.ts`) | Pure `computeBusPinLayout` + `computeBusBodyDimensions` | 3 |
| `src/store/actions/pinHelpers/pinHelpers.ts` | bus fallback in world-pos/orientation | 3 |
| `src/simulation/busSimulation.test.ts` | round-trip sim test | 4 |
| `src/store/actions/wiringActions/wiringActions.ts` | generalized bus wiring | 5 |
| `src/components/canvas/deriveWire3DProps.ts` | `'bus'` branch | 5 |
| `src/nodes/BusSplitter3D.tsx`, `BusJoiner3D.tsx`, `BusComponentRenderer.tsx` (+ tests) | renderers + dispatch | 6 |
| `src/nodes/index.ts` | export renderer | 6 |
| `src/components/canvas/CanvasArea.tsx` | map `busComponents` | 6 |
| `src/components/canvas/handlers/canvasHandlers.ts` | `handleBusPinClick` + bus-source branches | 6 |
| `src/test/r3f/busSplitterScene.test.tsx` | scene-graph render test | 7 |
| `src/test/r3f/seedCircuit.ts` | reset `busComponents` | 7 |
| `src/store/actions/busPlacementActions/busPlacementActions.ts` (+`.test.ts`) | placement flow | 8 |
| `src/components/ui/CompactToolbar.tsx` | toolbar entries | 8 |
| `e2e/types/globals.ts` | E2E typings | 8 |
| `e2e/specs/bus/bus-placement.store.spec.ts` | E2E placement | 8 |
| `docs/decisions/0009-bus-components-entity-and-wireendpoint-bus.md` | ADR | 9 |
| `REPO_MAP.md`, `HACER_LLM_GUIDE.md` | docs-sync | 9 |

---

## Task 1: Pure logic foundations (`busLogic` + `createBusPins`)

**Files:**
- Create: `src/simulation/busLogic.ts`
- Test: `src/simulation/busLogic.test.ts`
- Create: `src/store/actions/busActions/busPins.ts`
- Test: `src/store/actions/busActions/busPins.test.ts`

**Interfaces:**
- Consumes: `readSubBus`, `writeSubBus` from `@/simulation/busOps`; `Pin` from `@/store/types`.
- Produces:
  - `evaluateSplitter(inValue: number, width: number): number[]`
  - `evaluateJoiner(inValues: number[]): number`
  - `createBusPins(kind: 'splitter' | 'joiner', width: number): { inputs: Pin[]; outputs: Pin[] }`

- [ ] **Step 1: Write the failing `busLogic` test**

Create `src/simulation/busLogic.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { evaluateSplitter, evaluateJoiner } from './busLogic'

describe('evaluateSplitter', () => {
  it('splits each bit of the input into a 1-bit output (LSB first)', () => {
    expect(evaluateSplitter(0b1011, 4)).toEqual([1, 1, 0, 1])
  })

  it('returns one entry per bit of width', () => {
    expect(evaluateSplitter(0, 8)).toEqual([0, 0, 0, 0, 0, 0, 0, 0])
  })

  it('ignores bits above the requested width', () => {
    expect(evaluateSplitter(0xFF, 4)).toEqual([1, 1, 1, 1])
  })
})

describe('evaluateJoiner', () => {
  it('packs 1-bit inputs into an N-bit value (in_i << i)', () => {
    expect(evaluateJoiner([1, 1, 0, 1])).toBe(0b1011)
  })

  it('round-trips with evaluateSplitter', () => {
    expect(evaluateJoiner(evaluateSplitter(0b1011, 4))).toBe(0b1011)
  })

  it('uses only the low bit of each input', () => {
    expect(evaluateJoiner([3, 0, 2])).toBe(0b001)
  })
})
```

- [ ] **Step 2: Run it; expect FAIL**

Run: `pnpm exec vitest run src/simulation/busLogic.test.ts`
Expected: FAIL — `Failed to resolve import "./busLogic"` (file does not exist yet).

- [ ] **Step 3: Implement `busLogic.ts`**

Create `src/simulation/busLogic.ts`:

```ts
import { readSubBus, writeSubBus } from './busOps'

/**
 * Split an N-bit value into N single-bit outputs, LSB first.
 * `out[i]` is bit `i` of `inValue`. `evaluateSplitter(0b1011, 4) => [1,1,0,1]`.
 */
export function evaluateSplitter(inValue: number, width: number): number[] {
  const bits: number[] = []
  for (let i = 0; i < width; i++) {
    bits.push(readSubBus(inValue, i, 1))
  }
  return bits
}

/**
 * Join single-bit inputs into one value: `Σ (in_i << i)`.
 * Only the low bit of each input is used. `evaluateJoiner([1,1,0,1]) => 0b1011`.
 */
export function evaluateJoiner(inValues: number[]): number {
  return inValues.reduce((acc, value, i) => writeSubBus(acc, value, i, 1), 0)
}
```

- [ ] **Step 4: Run it; expect PASS**

Run: `pnpm exec vitest run src/simulation/busLogic.test.ts`
Expected: PASS — 6 tests pass.

- [ ] **Step 5: Write the failing `createBusPins` test**

Create `src/store/actions/busActions/busPins.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { createBusPins } from './busPins'

describe('createBusPins', () => {
  it('builds a splitter: one N-bit input "in" and N 1-bit outputs out0..out{N-1}', () => {
    const { inputs, outputs } = createBusPins('splitter', 4)
    expect(inputs).toEqual([{ id: 'in', name: 'in', type: 'input', value: 0, width: 4 }])
    expect(outputs).toHaveLength(4)
    expect(outputs.map((p) => p.id)).toEqual(['out0', 'out1', 'out2', 'out3'])
    expect(outputs.every((p) => p.type === 'output' && p.width === 1 && p.value === 0)).toBe(true)
  })

  it('builds a joiner: N 1-bit inputs in0..in{N-1} and one N-bit output "out"', () => {
    const { inputs, outputs } = createBusPins('joiner', 8)
    expect(inputs).toHaveLength(8)
    expect(inputs.map((p) => p.id)).toEqual(['in0', 'in1', 'in2', 'in3', 'in4', 'in5', 'in6', 'in7'])
    expect(inputs.every((p) => p.type === 'input' && p.width === 1)).toBe(true)
    expect(outputs).toEqual([{ id: 'out', name: 'out', type: 'output', value: 0, width: 8 }])
  })

  it('gives pins unique ids within the component', () => {
    const { inputs, outputs } = createBusPins('splitter', 3)
    const ids = [...inputs, ...outputs].map((p) => p.id)
    expect(new Set(ids).size).toBe(ids.length)
  })
})
```

- [ ] **Step 6: Run it; expect FAIL**

Run: `pnpm exec vitest run src/store/actions/busActions/busPins.test.ts`
Expected: FAIL — `Failed to resolve import "./busPins"`.

- [ ] **Step 7: Implement `busPins.ts`**

Create `src/store/actions/busActions/busPins.ts`:

```ts
import type { Pin } from '../../types'

/**
 * Generate the input/output pin arrays for a bus component from its kind+width.
 *
 * - splitter: input `in` (width N), outputs `out0..out{N-1}` (width 1 each).
 * - joiner:   inputs `in0..in{N-1}` (width 1 each), output `out` (width N).
 *
 * Pin ids are component-local; uniqueness across the circuit comes from the
 * wire endpoint's `entityId` (same contract gate pins rely on).
 *
 * NOTE: the `kind` literal `'splitter' | 'joiner'` is structurally identical to
 * the `BusComponentKind` union added in Task 2, so callers may pass either.
 */
export function createBusPins(
  kind: 'splitter' | 'joiner',
  width: number,
): { inputs: Pin[]; outputs: Pin[] } {
  if (kind === 'splitter') {
    const inputs: Pin[] = [{ id: 'in', name: 'in', type: 'input', value: 0, width }]
    const outputs: Pin[] = Array.from({ length: width }, (_unused, i) => ({
      id: `out${i}`,
      name: `out${i}`,
      type: 'output',
      value: 0,
      width: 1,
    }))
    return { inputs, outputs }
  }
  const inputs: Pin[] = Array.from({ length: width }, (_unused, i) => ({
    id: `in${i}`,
    name: `in${i}`,
    type: 'input',
    value: 0,
    width: 1,
  }))
  const outputs: Pin[] = [{ id: 'out', name: 'out', type: 'output', value: 0, width }]
  return { inputs, outputs }
}
```

- [ ] **Step 8: Run it; expect PASS**

Run: `pnpm exec vitest run src/store/actions/busActions/busPins.test.ts`
Expected: PASS — 3 tests pass.

- [ ] **Step 9: Commit**

```bash
git add src/simulation/busLogic.ts src/simulation/busLogic.test.ts src/store/actions/busActions/busPins.ts src/store/actions/busActions/busPins.test.ts
git commit -m "feat(simulation): add bus splitter/joiner logic and pin generation"
```

---

## Task 2: Entity type + store CRUD + `'bus'` WireEndpointType

**Files:**
- Modify: `src/store/types.ts`
- Create: `src/store/actions/busActions/busActions.ts`
- Test: `src/store/actions/busActions/busActions.test.ts`
- Modify: `src/store/circuitStore.ts`
- Modify: `src/test/testUtils.ts`
- Modify: `src/simulation/topologicalEval.ts` (`getSignalSourceValue`)
- Modify: `src/store/actions/wireActions/wireActions.ts` (`getEndpointWidth`)

**Interfaces:**
- Consumes: `createBusPins` (Task 1); `notify` from `@/lib/notify`.
- Produces:
  - Type `BusComponentKind = 'splitter' | 'joiner'`
  - Type `BusComponent { id, kind, position, rotation, width, inputs: Pin[], outputs: Pin[], selected }`
  - `WireEndpointType` includes `'bus'`
  - `CircuitState.busComponents: BusComponent[]`
  - `BusActions { placeBusSplitter, placeBusJoiner, updateBusComponentPosition, removeBusComponent }`
  - `createBusActions(set, get): BusActions`

- [ ] **Step 1: Write the failing store test**

Create `src/store/actions/busActions/busActions.test.ts`:

```ts
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { notify } from '@/lib/notify'
import { useCircuitStore } from '../../circuitStore'

const getState = () => useCircuitStore.getState()

vi.mock('@/lib/notify', () => ({
  notify: { warning: vi.fn(), error: vi.fn(), info: vi.fn(), success: vi.fn() },
}))

describe('busActions', () => {
  beforeEach(() => {
    useCircuitStore.setState({
      gates: [],
      wires: [],
      inputNodes: [],
      outputNodes: [],
      junctions: [],
      busComponents: [],
      selectedGateId: null,
      selectedWireId: null,
      wiringFrom: null,
    })
    vi.clearAllMocks()
  })

  it('placeBusSplitter creates a splitter with 1 input and N 1-bit outputs', () => {
    const c = getState().placeBusSplitter(16, { x: 2, y: 0, z: 2 })
    expect(c).not.toBeNull()
    expect(c!.kind).toBe('splitter')
    expect(c!.width).toBe(16)
    expect(c!.inputs).toHaveLength(1)
    expect(c!.outputs).toHaveLength(16)
    expect(c!.inputs[0].width).toBe(16)
    expect(c!.outputs[0].width).toBe(1)
    expect(getState().busComponents).toHaveLength(1)
    expect(getState().busComponents[0].id).toBe(c!.id)
  })

  it('placeBusJoiner creates a joiner with N 1-bit inputs and 1 output', () => {
    const c = getState().placeBusJoiner(8, { x: 0, y: 0, z: 0 })
    expect(c!.kind).toBe('joiner')
    expect(c!.inputs).toHaveLength(8)
    expect(c!.outputs).toHaveLength(1)
    expect(c!.outputs[0].width).toBe(8)
  })

  it('rejects invalid widths as a no-op with a warning', () => {
    expect(getState().placeBusSplitter(1, { x: 0, y: 0, z: 0 })).toBeNull()
    expect(getState().placeBusJoiner(2.5, { x: 0, y: 0, z: 0 })).toBeNull()
    expect(getState().busComponents).toHaveLength(0)
    expect(notify.warning).toHaveBeenCalled()
  })

  it('updateBusComponentPosition moves the component', () => {
    const c = getState().placeBusSplitter(4, { x: 1, y: 0, z: 1 })!
    getState().updateBusComponentPosition(c.id, { x: 5, y: 0, z: 5 })
    expect(getState().busComponents[0].position).toEqual({ x: 5, y: 0, z: 5 })
  })

  it('removeBusComponent removes it and strips connected bus wires', () => {
    const c = getState().placeBusSplitter(4, { x: 1, y: 0, z: 1 })!
    const gate = getState().addGate('Not', { x: 6, y: 0, z: 0 })
    getState().addWire(
      { type: 'bus', entityId: c.id, pinId: 'out0' },
      { type: 'gate', entityId: gate.id, pinId: gate.inputs[0].id },
      [],
    )
    expect(getState().wires).toHaveLength(1)
    getState().removeBusComponent(c.id)
    expect(getState().busComponents).toHaveLength(0)
    expect(getState().wires).toHaveLength(0)
  })
})
```

- [ ] **Step 2: Run it; expect FAIL**

Run: `pnpm exec vitest run src/store/actions/busActions/busActions.test.ts`
Expected: FAIL — `placeBusSplitter is not a function` (and TS errors on `busComponents`).

- [ ] **Step 3: Extend `src/store/types.ts`**

Replace the `WireEndpointType` definition (currently line 65):

```ts
export type WireEndpointType = 'gate' | 'input' | 'output' | 'junction'
```

with:

```ts
export type WireEndpointType = 'gate' | 'input' | 'output' | 'junction' | 'bus'
```

Add the bus entity types immediately after the `GateInstance` interface (after line 129):

```ts
/**
 * Kind discriminator for bus components.
 */
export type BusComponentKind = 'splitter' | 'joiner'

/**
 * Bus splitter/joiner entity. NOT a registry chip and NOT a GateInstance — a
 * separate entity (like InputNode/OutputNode) whose pins are derived from
 * kind+width via createBusPins.
 *  - splitter: input `in` (N-bit) → outputs `out0..out{N-1}` (1-bit each).
 *  - joiner:   inputs `in0..in{N-1}` (1-bit each) → output `out` (N-bit).
 */
export interface BusComponent {
  id: string
  kind: BusComponentKind
  position: Position
  rotation: Rotation
  /** Bus width N (>= 2). */
  width: number
  inputs: Pin[]
  outputs: Pin[]
  selected: boolean
}
```

In `CircuitState`, add `busComponents` next to `junctions` (after line 198 `junctions: JunctionNode[]`):

```ts
  busComponents: BusComponent[]
```

Add the `BusActions` interface after the `NodeActions` interface block (after line 333):

```ts
/**
 * Actions for managing bus splitter/joiner components.
 */
export interface BusActions {
  placeBusSplitter: (width: number, position: Position) => BusComponent | null
  placeBusJoiner: (width: number, position: Position) => BusComponent | null
  updateBusComponentPosition: (id: string, position: Position) => void
  removeBusComponent: (id: string) => void
}
```

Add `BusActions` to the combined `CircuitStore` extends list (line 381) — append `, BusActions`:

```ts
export interface CircuitStore extends CircuitState, GateActions, WireActions, SimulationActions, PlacementActions, NodePlacementActions, WiringActions, PinHelpers, ViewActions, NodeActions, JunctionActions, JunctionPlacementActions, StatusActions, PersistenceActions, TestActions, BusActions {}
```

- [ ] **Step 4: Implement `busActions.ts`**

Create `src/store/actions/busActions/busActions.ts`:

```ts
import { notify } from '@/lib/notify'
import type {
  BusActions,
  BusComponent,
  BusComponentKind,
  Position,
  CircuitStore,
} from '../../types'
import { createBusPins } from './busPins'

type SetState = (
  fn: (state: CircuitStore) => void,
  replace?: false,
  actionName?: string
) => void
type GetState = () => CircuitStore

function generateBusId(kind: BusComponentKind): string {
  return `bus-${kind}-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`
}

/** Bus width must be an integer >= 2 (a 1-bit "bus" is just a wire). */
function isValidBusWidth(width: number): boolean {
  return Number.isInteger(width) && width >= 2
}

function createBusComponent(
  kind: BusComponentKind,
  width: number,
  position: Position,
): BusComponent {
  const { inputs, outputs } = createBusPins(kind, width)
  return {
    id: generateBusId(kind),
    kind,
    position,
    rotation: { x: 0, y: 0, z: 0 },
    width,
    inputs,
    outputs,
    selected: false,
  }
}

// `_get` becomes `get` in Task 5 (wire re-route on move).
export const createBusActions = (set: SetState, _get: GetState): BusActions => ({
  placeBusSplitter: (width, position) => {
    if (!isValidBusWidth(width)) {
      notify.warning(`Invalid bus width ${width}: must be an integer >= 2`)
      return null
    }
    const component = createBusComponent('splitter', width, position)
    set((state) => {
      state.busComponents.push(component)
    }, false, 'placeBusSplitter')
    return component
  },

  placeBusJoiner: (width, position) => {
    if (!isValidBusWidth(width)) {
      notify.warning(`Invalid bus width ${width}: must be an integer >= 2`)
      return null
    }
    const component = createBusComponent('joiner', width, position)
    set((state) => {
      state.busComponents.push(component)
    }, false, 'placeBusJoiner')
    return component
  },

  updateBusComponentPosition: (id, position) => {
    set((state) => {
      const component = state.busComponents.find((c) => c.id === id)
      if (component) component.position = position
    }, false, 'updateBusComponentPosition')
  },

  removeBusComponent: (id) => {
    set((state) => {
      const index = state.busComponents.findIndex((c) => c.id === id)
      if (index === -1) return
      state.busComponents.splice(index, 1)
      state.wires = state.wires.filter(
        (w) =>
          !(w.from.type === 'bus' && w.from.entityId === id) &&
          !(w.to.type === 'bus' && w.to.entityId === id),
      )
    }, false, 'removeBusComponent')
  },
})
```

- [ ] **Step 5: Wire the slice into `circuitStore.ts`**

In `src/store/circuitStore.ts`, add the import after the other action imports (after line 17 `createTestActions`):

```ts
import { createBusActions } from './actions/busActions/busActions'
```

In `initialState`, add after `junctions` (line 58):

```ts
  busComponents: [] as import('./types').BusComponent[],
```

In the store factory, add after `...createTestActions(set, get),` (line 101):

```ts
        ...createBusActions(set, get),
```

In the `circuitActions` object, add after the Test actions block (after line 297 `clearTestResult`):

```ts
  // Bus actions
  placeBusSplitter: (...args: Parameters<CircuitStore['placeBusSplitter']>) => useCircuitStore.getState().placeBusSplitter(...args),
  placeBusJoiner: (...args: Parameters<CircuitStore['placeBusJoiner']>) => useCircuitStore.getState().placeBusJoiner(...args),
  updateBusComponentPosition: (...args: Parameters<CircuitStore['updateBusComponentPosition']>) => useCircuitStore.getState().updateBusComponentPosition(...args),
  removeBusComponent: (...args: Parameters<CircuitStore['removeBusComponent']>) => useCircuitStore.getState().removeBusComponent(...args),
```

- [ ] **Step 6: Update `createMockStore` in `testUtils.ts`**

In `src/test/testUtils.ts`, in `defaultState`, add after `junctions: [],` (line 44):

```ts
    busComponents: [],
```

In the returned no-op actions, add after `clearTestResult: () => {},` (line 156):

```ts
    // Bus actions
    placeBusSplitter: () => null,
    placeBusJoiner: () => null,
    updateBusComponentPosition: () => {},
    removeBusComponent: () => {},
```

- [ ] **Step 7: Add `'bus'` correctness cases to the endpoint switches**

In `src/simulation/topologicalEval.ts`, in `getSignalSourceValue`, add a `case 'bus'` before `case 'output':` (before line 168):

```ts
    case 'bus': {
      const component = state.busComponents.find((c) => c.id === from.entityId)
      const outputPin = component?.outputs.find((p) => p.id === from.pinId)
      return outputPin?.value ?? 0
    }
```

In `src/store/actions/wireActions/wireActions.ts`, in `getEndpointWidth`, add a `case 'bus'` before `case 'junction':` (before line 50):

```ts
    case 'bus': {
      const component = state.busComponents.find((c) => c.id === endpoint.entityId)
      const pin =
        component?.inputs.find((p) => p.id === endpoint.pinId) ??
        component?.outputs.find((p) => p.id === endpoint.pinId)
      return pin?.width ?? 1
    }
```

- [ ] **Step 8: Run the store test; expect PASS**

Run: `pnpm exec vitest run src/store/actions/busActions/busActions.test.ts`
Expected: PASS — 5 tests pass.

- [ ] **Step 9: Confirm typecheck/exhaustiveness via build**

Run: `pnpm run build`
Expected: exit 0. (All endpoint switches have `default` branches, so the `'bus'` extension introduces no compile error; this build confirms `busComponents` is wired into every `CircuitState` literal and the new actions typecheck.)

- [ ] **Step 10: Commit**

```bash
git add src/store/types.ts src/store/actions/busActions/busActions.ts src/store/actions/busActions/busActions.test.ts src/store/circuitStore.ts src/test/testUtils.ts src/simulation/topologicalEval.ts src/store/actions/wireActions/wireActions.ts
git commit -m "feat(store): add bus component entity, CRUD actions, and bus wire endpoint"
```

---

## Task 3: Geometry (`computeBusPinLayout`) + pin world-position resolution

**Files:**
- Create: `src/components/scene/busBodyLayout.ts`
- Test: `src/components/scene/busBodyLayout.test.ts`
- Modify: `src/store/actions/pinHelpers/pinHelpers.ts`

**Interfaces:**
- Consumes: `BusComponent` (Task 2); `createBusPins` (Task 1); `placeBusSplitter` (Task 2).
- Produces:
  - `interface BusPinSlot { pinId: string; side: 'input' | 'output'; position: [number, number, number] }`
  - `computeBusPinLayout(component: BusComponent): BusPinSlot[]`
  - `computeBusBodyDimensions(component: BusComponent): { sizeX: number; sizeY: number; sizeZ: number }`
  - `getPinWorldPosition`/`getPinOrientation` resolve bus components (fallback when the gate lookup misses).

- [ ] **Step 1: Write the failing layout test**

Create `src/components/scene/busBodyLayout.test.ts`:

```ts
import { describe, it, expect, beforeEach } from 'vitest'
import { useCircuitStore } from '@/store/circuitStore'
import { createBusPins } from '@/store/actions/busActions/busPins'
import type { BusComponent, BusComponentKind } from '@/store/types'
import { computeBusPinLayout, computeBusBodyDimensions } from './busBodyLayout'

function makeBus(kind: BusComponentKind, width: number, position = { x: 0, y: 0, z: 0 }): BusComponent {
  const { inputs, outputs } = createBusPins(kind, width)
  return { id: 'bus-test', kind, position, rotation: { x: 0, y: 0, z: 0 }, width, inputs, outputs, selected: false }
}

describe('computeBusPinLayout', () => {
  it('places 1 input on -x and N outputs on +x for a splitter', () => {
    const slots = computeBusPinLayout(makeBus('splitter', 4))
    const inputs = slots.filter((s) => s.side === 'input')
    const outputs = slots.filter((s) => s.side === 'output')
    expect(inputs).toHaveLength(1)
    expect(outputs).toHaveLength(4)
    expect(inputs[0].pinId).toBe('in')
    expect(outputs.map((s) => s.pinId)).toEqual(['out0', 'out1', 'out2', 'out3'])
    expect(inputs[0].position[0]).toBeLessThan(0)
    expect(outputs[0].position[0]).toBeGreaterThan(0)
  })

  it('spaces same-side pins evenly along z and centers them on 0', () => {
    const outputs = computeBusPinLayout(makeBus('splitter', 4)).filter((s) => s.side === 'output')
    expect(outputs[1].position[2] - outputs[0].position[2]).toBeCloseTo(0.4, 5)
    const zs = outputs.map((s) => s.position[2])
    expect((zs[0] + zs[zs.length - 1]) / 2).toBeCloseTo(0, 5)
  })

  it('grows body depth (sizeZ) with pin count', () => {
    const small = computeBusBodyDimensions(makeBus('splitter', 2)).sizeZ
    const large = computeBusBodyDimensions(makeBus('splitter', 16)).sizeZ
    expect(large).toBeGreaterThan(small)
  })
})

describe('getPinWorldPosition / getPinOrientation for bus components', () => {
  beforeEach(() => {
    useCircuitStore.setState({ gates: [], wires: [], busComponents: [] })
  })

  it('resolves a bus pin to component position + local slot offset', () => {
    const c = useCircuitStore.getState().placeBusSplitter(4, { x: 5, y: 0, z: 5 })!
    const slot = computeBusPinLayout(c).find((s) => s.pinId === 'out0')!
    const world = useCircuitStore.getState().getPinWorldPosition(c.id, 'out0')!
    expect(world.x).toBeCloseTo(5 + slot.position[0], 5)
    expect(world.z).toBeCloseTo(5 + slot.position[2], 5)
  })

  it('orients input pins -x and output pins +x', () => {
    const c = useCircuitStore.getState().placeBusSplitter(4, { x: 0, y: 0, z: 0 })!
    expect(useCircuitStore.getState().getPinOrientation(c.id, 'in')!.x).toBeCloseTo(-1, 5)
    expect(useCircuitStore.getState().getPinOrientation(c.id, 'out0')!.x).toBeCloseTo(1, 5)
  })
})
```

- [ ] **Step 2: Run it; expect FAIL**

Run: `pnpm exec vitest run src/components/scene/busBodyLayout.test.ts`
Expected: FAIL — `Failed to resolve import "./busBodyLayout"`.

- [ ] **Step 3: Implement `busBodyLayout.ts`**

Create `src/components/scene/busBodyLayout.ts`:

```ts
import type { BusComponent, Pin } from '@/store/types'

/**
 * One bus pin's local-space slot. Unlike chipBodyLayout (which spreads pins
 * along local Y and relies on the gate's [π/2,0,0] render rotation), bus
 * components render like nodes (no extra render rotation), so pins are spread
 * along local Z (the ground plane) directly: input side on -x, output side on
 * +x. Rendered pins, getPinWorldPosition, and deriveWire3DProps therefore all
 * share one identity-rotation transform and cannot drift.
 */
export interface BusPinSlot {
  pinId: string
  side: 'input' | 'output'
  /** Local position relative to component center: [x, y, z]. */
  position: [number, number, number]
}

const BUS_HALF_X = 0.4
const BUS_PIN_OFFSET_X = 0.05
const BUS_PIN_SPACING = 0.4
const BUS_THICKNESS_Y = 0.4
const BUS_MIN_DEPTH_Z = 0.5
const BUS_EDGE_PADDING_Z = 0.2

function sideSlots(pins: Pin[], side: 'input' | 'output'): BusPinSlot[] {
  const count = pins.length
  if (count === 0) return []
  const span = (count - 1) * BUS_PIN_SPACING
  const startZ = -span / 2
  const xPos = side === 'input' ? -(BUS_HALF_X + BUS_PIN_OFFSET_X) : BUS_HALF_X + BUS_PIN_OFFSET_X
  return pins.map((p, i) => ({
    pinId: p.id,
    side,
    position: [xPos, 0, startZ + i * BUS_PIN_SPACING] as [number, number, number],
  }))
}

/** Pin slots for a bus component: input side then output side. */
export function computeBusPinLayout(component: BusComponent): BusPinSlot[] {
  return [
    ...sideSlots(component.inputs, 'input'),
    ...sideSlots(component.outputs, 'output'),
  ]
}

/** Body box dimensions; depth (Z) grows with the larger pin count. */
export function computeBusBodyDimensions(
  component: BusComponent,
): { sizeX: number; sizeY: number; sizeZ: number } {
  const maxPins = Math.max(component.inputs.length, component.outputs.length, 1)
  const requiredDepth = 2 * BUS_EDGE_PADDING_Z + Math.max(0, maxPins - 1) * BUS_PIN_SPACING
  return {
    sizeX: 2 * BUS_HALF_X,
    sizeY: BUS_THICKNESS_Y,
    sizeZ: Math.max(BUS_MIN_DEPTH_Z, requiredDepth),
  }
}
```

- [ ] **Step 4: Add bus resolution to `pinHelpers.ts`**

In `src/store/actions/pinHelpers/pinHelpers.ts`, add the import after line 3:

```ts
import { computeBusPinLayout } from '@/components/scene/busBodyLayout'
import type { BusComponent } from '../../types'
```

Add two helper functions before `export const createPinHelpers` (before line 91):

```ts
/**
 * World-space position of a bus component's pin, computed from the SAME layout
 * function the renderer uses (computeBusPinLayout) so wire endpoints never
 * diverge from the rendered pins.
 */
function computeBusPinWorldPosition(
  busComponents: BusComponent[],
  entityId: string,
  pinId: string,
): Position | null {
  const component = busComponents.find((c) => c.id === entityId)
  if (!component) return null
  const slot = computeBusPinLayout(component).find((s) => s.pinId === pinId)
  if (!slot) return null
  const localOffset = new Vector3(slot.position[0], slot.position[1], slot.position[2])
  const euler = new Euler(component.rotation.x, component.rotation.y, component.rotation.z, 'XYZ')
  localOffset.applyEuler(euler)
  return {
    x: component.position.x + localOffset.x,
    y: component.position.y + localOffset.y,
    z: component.position.z + localOffset.z,
  }
}

function computeBusPinOrientation(
  busComponents: BusComponent[],
  entityId: string,
  pinId: string,
): { x: number; y: number; z: number } | null {
  const component = busComponents.find((c) => c.id === entityId)
  if (!component) return null
  const slot = computeBusPinLayout(component).find((s) => s.pinId === pinId)
  if (!slot) return null
  const localDirection = slot.side === 'input' ? new Vector3(-1, 0, 0) : new Vector3(1, 0, 0)
  const euler = new Euler(component.rotation.x, component.rotation.y, component.rotation.z, 'XYZ')
  localDirection.applyEuler(euler)
  return { x: localDirection.x, y: localDirection.y, z: localDirection.z }
}
```

Replace the `createPinHelpers` body (lines 91-100) so each helper falls back to bus resolution (the names take an `entityId`, so resolving a bus transparently avoids threading an entity-type through every caller):

```ts
export const createPinHelpers = (get: GetState): PinHelpers => ({
  getPinWorldPosition: (gateId: string, pinId: string) => {
    const state = get()
    return (
      computePinWorldPosition(state.gates, gateId, pinId) ??
      computeBusPinWorldPosition(state.busComponents, gateId, pinId)
    )
  },
  getPinOrientation: (gateId: string, pinId: string) => {
    const state = get()
    return (
      computePinOrientation(state.gates, gateId, pinId) ??
      computeBusPinOrientation(state.busComponents, gateId, pinId)
    )
  },
})
```

- [ ] **Step 5: Run it; expect PASS**

Run: `pnpm exec vitest run src/components/scene/busBodyLayout.test.ts`
Expected: PASS — 5 tests pass.

- [ ] **Step 6: Commit**

```bash
git add src/components/scene/busBodyLayout.ts src/components/scene/busBodyLayout.test.ts src/store/actions/pinHelpers/pinHelpers.ts
git commit -m "feat(scene): add bus pin layout and world-position resolution"
```

---

## Task 4: Simulation integration (topological sort + evaluate)

**Files:**
- Modify: `src/simulation/topologicalEval.ts`
- Test: `src/simulation/busSimulation.test.ts`

**Interfaces:**
- Consumes: `evaluateSplitter`/`evaluateJoiner` (Task 1); `getSignalSourceValue` bus case (Task 2); `getEndpointWidth` bus case (Task 2); bus CRUD (Task 2).
- Produces: bus components participate as ordered nodes in `topologicalSort` and are evaluated inside `evaluateCircuit`.

- [ ] **Step 1: Write the failing round-trip test**

Create `src/simulation/busSimulation.test.ts`:

```ts
import { describe, it, expect, beforeEach } from 'vitest'
import { useCircuitStore } from '@/store/circuitStore'
import { evaluateCircuit } from './topologicalEval'

const getState = () => useCircuitStore.getState()

beforeEach(() => {
  useCircuitStore.setState({
    gates: [],
    wires: [],
    inputNodes: [],
    outputNodes: [],
    junctions: [],
    busComponents: [],
    selectedGateId: null,
    selectedWireId: null,
    wiringFrom: null,
    lastSimulationError: null,
  })
})

describe('bus simulation', () => {
  it('splits each bit of the input bus onto the splitter outputs', () => {
    const inputNode = getState().addInputNode('a', { x: 0, y: 0, z: 0 }, 4)
    const splitter = getState().placeBusSplitter(4, { x: 4, y: 0, z: 0 })!

    getState().addWire(
      { type: 'input', entityId: inputNode.id },
      { type: 'bus', entityId: splitter.id, pinId: 'in' },
      [],
    )
    getState().updateInputNodeValue(inputNode.id, 0b1011)

    useCircuitStore.setState((state) => { evaluateCircuit(state) })

    const out = getState().busComponents[0].outputs
    expect(out.find((p) => p.id === 'out0')!.value).toBe(1)
    expect(out.find((p) => p.id === 'out1')!.value).toBe(1)
    expect(out.find((p) => p.id === 'out2')!.value).toBe(0)
    expect(out.find((p) => p.id === 'out3')!.value).toBe(1)
  })

  it('round-trips input bus -> splitter -> joiner -> output bus', () => {
    const inputNode = getState().addInputNode('a', { x: 0, y: 0, z: 0 }, 4)
    const splitter = getState().placeBusSplitter(4, { x: 4, y: 0, z: 0 })!
    const joiner = getState().placeBusJoiner(4, { x: 8, y: 0, z: 0 })!
    const outputNode = getState().addOutputNode('out', { x: 12, y: 0, z: 0 }, 4)

    getState().addWire(
      { type: 'input', entityId: inputNode.id },
      { type: 'bus', entityId: splitter.id, pinId: 'in' },
      [],
    )
    for (let i = 0; i < 4; i++) {
      getState().addWire(
        { type: 'bus', entityId: splitter.id, pinId: `out${i}` },
        { type: 'bus', entityId: joiner.id, pinId: `in${i}` },
        [],
      )
    }
    getState().addWire(
      { type: 'bus', entityId: joiner.id, pinId: 'out' },
      { type: 'output', entityId: outputNode.id },
      [],
    )

    getState().updateInputNodeValue(inputNode.id, 0b1011)
    useCircuitStore.setState((state) => { evaluateCircuit(state) })

    expect(getState().outputNodes[0].value).toBe(0b1011)
  })
})
```

- [ ] **Step 2: Run it; expect FAIL**

Run: `pnpm exec vitest run src/simulation/busSimulation.test.ts`
Expected: FAIL — splitter outputs stay `0` and the output node stays `0` (bus components are not yet evaluated).

- [ ] **Step 3: Add the `'bus'` case to `resolveSourceGateId`**

In `src/simulation/topologicalEval.ts`, in `resolveSourceGateId`, add a `case 'bus'` after `case 'gate':` (after line 36):

```ts
    case 'bus':
      return endpoint.entityId
```

- [ ] **Step 4: Include bus components as nodes in `topologicalSort`**

Replace the body of `topologicalSort` (lines 65-118) with:

```ts
export function topologicalSort(state: CircuitState): TopologicalResult {
  const nodeIds = [
    ...state.gates.map((g) => g.id),
    ...state.busComponents.map((c) => c.id),
  ]
  if (nodeIds.length === 0) {
    return { type: 'success', order: [] }
  }

  const adjacency = new Map<string, string[]>()
  const inDegree = new Map<string, number>()

  for (const id of nodeIds) {
    adjacency.set(id, [])
    inDegree.set(id, 0)
  }

  for (const wire of state.wires) {
    if (wire.to.type !== 'gate' && wire.to.type !== 'bus') continue

    const destId = wire.to.entityId
    if (!inDegree.has(destId)) continue

    const sourceId = resolveSourceGateId(wire.from, state)
    if (sourceId === null || !inDegree.has(sourceId)) continue

    adjacency.get(sourceId)!.push(destId)
    inDegree.set(destId, inDegree.get(destId)! + 1)
  }

  // Kahn's BFS — use a queue index instead of shift() to stay O(V+E)
  const queue: string[] = []
  for (const [id, degree] of inDegree) {
    if (degree === 0) queue.push(id)
  }

  const order: string[] = []
  let queueIdx = 0
  while (queueIdx < queue.length) {
    const current = queue[queueIdx++]
    order.push(current)

    for (const neighbor of adjacency.get(current)!) {
      const newDegree = inDegree.get(neighbor)! - 1
      inDegree.set(neighbor, newDegree)
      if (newDegree === 0) queue.push(neighbor)
    }
  }

  if (order.length < nodeIds.length) {
    const orderedSet = new Set(order)
    const involvedGateIds = nodeIds.filter((id) => !orderedSet.has(id))
    return { type: 'cycle', involvedGateIds }
  }

  return { type: 'success', order }
}
```

- [ ] **Step 5: Add a `'bus'` case to `destinationWidth`**

In `src/simulation/topologicalEval.ts`, in `destinationWidth`, add a `case 'bus'` after the `case 'gate'` block (after line 187, before `default:`):

```ts
    case 'bus': {
      const component = state.busComponents.find((c) => c.id === wire.to.entityId)
      const pin = component?.inputs.find((p) => p.id === wire.to.pinId)
      endpointWidth = pin?.width ?? 1
      break
    }
```

- [ ] **Step 6: Evaluate bus components inside `evaluateCircuit`**

In `src/simulation/topologicalEval.ts`, add the bus imports at the top (after line 1):

```ts
import { evaluateSplitter, evaluateJoiner } from './busLogic'
```

In `evaluateCircuit`, after the `wiresByDestGate` index loop (after line 221), add a bus-destination index and a bus-by-id map:

```ts
  const busById = new Map(state.busComponents.map((c) => [c.id, c]))
  const wiresByDestBus = new Map<string, typeof state.wires>()
  for (const wire of state.wires) {
    if (wire.to.type === 'bus' && wire.to.pinId) {
      let bucket = wiresByDestBus.get(wire.to.entityId)
      if (!bucket) {
        bucket = []
        wiresByDestBus.set(wire.to.entityId, bucket)
      }
      bucket.push(wire)
    }
  }
```

Then, at the very top of the `for (const gateId of result.order)` loop body (right after line 225 `for (const gateId of result.order) {`), insert the bus branch (it `continue`s so the gate path is skipped for bus ids):

```ts
    const busComponent = busById.get(gateId)
    if (busComponent) {
      const incoming = wiresByDestBus.get(gateId)
      if (incoming) {
        for (const wire of incoming) {
          const inputPin = busComponent.inputs.find((p) => p.id === wire.to.pinId)
          if (inputPin) {
            const raw = getSignalSourceValue(wire.from, state)
            inputPin.value = clampToWidth(raw, destinationWidth(wire, state))
          }
        }
      }
      if (busComponent.kind === 'splitter') {
        const bits = evaluateSplitter(busComponent.inputs[0]?.value ?? 0, busComponent.width)
        busComponent.outputs.forEach((pin, i) => {
          pin.value = bits[i] ?? 0
        })
      } else {
        const inValues = busComponent.inputs.map((p) => p.value)
        busComponent.outputs[0].value = clampToWidth(evaluateJoiner(inValues), busComponent.width)
      }
      continue
    }
```

- [ ] **Step 7: Run it; expect PASS**

Run: `pnpm exec vitest run src/simulation/busSimulation.test.ts`
Expected: PASS — 2 tests pass.

- [ ] **Step 8: Run the existing sim suite to confirm no regression**

Run: `pnpm exec vitest run src/simulation/topologicalEval.test.ts`
Expected: PASS — all existing tests still pass (the node-set rename is behavior-preserving when no bus components exist).

- [ ] **Step 9: Commit**

```bash
git add src/simulation/topologicalEval.ts src/simulation/busSimulation.test.ts
git commit -m "feat(simulation): evaluate bus components in topological order"
```

---

## Task 5: Wiring integration + drag re-route

**Files:**
- Modify: `src/store/types.ts` (`WiringSource` bus variant; `WiringActions` new methods)
- Modify: `src/store/actions/wiringActions/wiringActions.ts`
- Modify: `src/store/actions/busActions/busActions.ts` (re-route on move)
- Modify: `src/components/canvas/deriveWire3DProps.ts`
- Modify: `src/store/circuitStore.ts` (`circuitActions` exposure)
- Modify: `src/test/testUtils.ts` (no-op actions)
- Test: append to `src/store/actions/wiringActions/wiringActions.test.ts`
- Test: append to `src/store/actions/busActions/busActions.test.ts`

**Interfaces:**
- Consumes: bus pin world position/orientation (Task 3); `addWire` (existing); `resolveCrossings` (existing).
- Produces:
  - `WiringSource` adds `{ type: 'bus'; busId: string; pinId: string; pinType: 'input' | 'output' }`
  - `startWiringFromBus(busId, pinId, pinType, position): void`
  - `completeWiringToBus(busId, pinId): void`
  - `completeWiringFromBusToGate(gateId, pinId, pinType): void`
  - `completeWiringFromBusToNode(nodeId, nodeType): void`
  - `deriveWire3DProps` resolves `'bus'` endpoints
  - `updateBusComponentPosition` re-routes connected wires (B-003 guard)

- [ ] **Step 1: Write the failing wiring tests**

Append to `src/store/actions/wiringActions/wiringActions.test.ts` (inside the top-level `describe('wiringActions', ...)`, before its closing `})`):

```ts
  describe('bus wiring', () => {
    it('wires a gate output to a splitter input (bus destination)', () => {
      const gate = getState().addGate('Not', { x: 0, y: 0, z: 0 })
      const splitter = getState().placeBusSplitter(4, { x: 4, y: 0, z: 0 })!

      getState().startWiring(gate.id, gate.outputs[0].id, 'output', { x: 0.7, y: 0.2, z: 0 })
      useCircuitStore.setState((s) => {
        if (s.wiringFrom) {
          s.wiringFrom.segments = [
            { start: { x: 0.7, y: 0.2, z: 0 }, end: { x: 3.5, y: 0.2, z: 0 }, type: 'horizontal' },
          ]
        }
      })
      getState().completeWiringToBus(splitter.id, 'in')

      expect(getState().wires).toHaveLength(1)
      expect(getState().wires[0].from).toEqual({ type: 'gate', entityId: gate.id, pinId: gate.outputs[0].id })
      expect(getState().wires[0].to).toEqual({ type: 'bus', entityId: splitter.id, pinId: 'in' })
      expect(getState().wires[0].segments.length).toBeGreaterThan(0)
      expect(getState().wiringFrom).toBe(null)
    })

    it('wires a splitter output to a gate input (bus source)', () => {
      const splitter = getState().placeBusSplitter(4, { x: 0, y: 0, z: 0 })!
      const gate = getState().addGate('Not', { x: 6, y: 0, z: 0 })

      getState().startWiringFromBus(splitter.id, 'out0', 'output', { x: 0.5, y: 0.2, z: 0 })
      useCircuitStore.setState((s) => {
        if (s.wiringFrom) {
          s.wiringFrom.segments = [
            { start: { x: 0.5, y: 0.2, z: 0 }, end: { x: 5.5, y: 0.2, z: 0 }, type: 'horizontal' },
          ]
        }
      })
      getState().completeWiringFromBusToGate(gate.id, gate.inputs[0].id, 'input')

      expect(getState().wires).toHaveLength(1)
      expect(getState().wires[0].from).toEqual({ type: 'bus', entityId: splitter.id, pinId: 'out0' })
      expect(getState().wires[0].to).toEqual({ type: 'gate', entityId: gate.id, pinId: gate.inputs[0].id })
    })
  })
```

Append to `src/store/actions/busActions/busActions.test.ts` (inside `describe('busActions', ...)`, before its closing `})`):

```ts
  it('updateBusComponentPosition re-routes connected wires (non-empty, B-003)', () => {
    const inputNode = getState().addInputNode('a', { x: 0, y: 0, z: 0 }, 4)
    const splitter = getState().placeBusSplitter(4, { x: 6, y: 0, z: 2 })!
    const pin = getState().getPinWorldPosition(splitter.id, 'in')!
    getState().addWire(
      { type: 'input', entityId: inputNode.id },
      { type: 'bus', entityId: splitter.id, pinId: 'in' },
      [{ start: { x: 0.35, y: 0.2, z: 0 }, end: { x: pin.x, y: 0.2, z: pin.z }, type: 'horizontal' }],
    )
    const before = JSON.stringify(getState().wires[0].segments)

    getState().updateBusComponentPosition(splitter.id, { x: 6, y: 0, z: -4 })

    const after = getState().wires[0].segments
    expect(after.length).toBeGreaterThan(0)
    expect(JSON.stringify(after)).not.toBe(before)
  })
```

- [ ] **Step 2: Run them; expect FAIL**

Run: `pnpm exec vitest run src/store/actions/wiringActions/wiringActions.test.ts src/store/actions/busActions/busActions.test.ts`
Expected: FAIL — `completeWiringToBus is not a function` / re-route assertion fails (segments unchanged).

- [ ] **Step 3: Extend `WiringSource` and `WiringActions` in `types.ts`**

In `src/store/types.ts`, change the `WiringSource` union (lines 135-139) to add a bus variant:

```ts
export type WiringSource =
  | { type: 'gate'; gateId: string; pinId: string; pinType: 'input' | 'output' }
  | { type: 'input'; nodeId: string }
  | { type: 'output'; nodeId: string }
  | { type: 'junction'; junctionId: string }
  | { type: 'bus'; busId: string; pinId: string; pinType: 'input' | 'output' }
```

In the `WiringActions` interface, add after `completeWiringFromJunctionToNode` (after line 296):

```ts
  // Bus-based wiring (generalized pin path)
  startWiringFromBus: (busId: string, pinId: string, pinType: 'input' | 'output', position: Position) => void
  completeWiringToBus: (busId: string, pinId: string) => void
  completeWiringFromBusToGate: (gateId: string, pinId: string, pinType: 'input' | 'output') => void
  completeWiringFromBusToNode: (nodeId: string, nodeType: NodeType) => void
```

- [ ] **Step 4: Implement bus wiring in `wiringActions.ts`**

In `src/store/actions/wiringActions/wiringActions.ts`, add `WiringSource` to the type import (line 2):

```ts
import type { WiringActions, Position, CircuitStore, NodeType, WireEndpoint, WiringSource } from '../../types'
```

Add the shared helpers immediately before `export const createWiringActions` (before line 15):

```ts
/** Build a from-endpoint from a generic wiring source (gate/input/bus). */
function resolveSourceEndpoint(source: WiringSource): WireEndpoint | null {
  switch (source.type) {
    case 'gate':
      return { type: 'gate', entityId: source.gateId, pinId: source.pinId }
    case 'input':
      return { type: 'input', entityId: source.nodeId }
    case 'bus':
      return { type: 'bus', entityId: source.busId, pinId: source.pinId }
    case 'output':
    case 'junction':
    default:
      return null
  }
}

function endpointsEqual(a: WireEndpoint, b: WireEndpoint): boolean {
  return a.type === b.type && a.entityId === b.entityId && a.pinId === b.pinId
}

/**
 * Shared completion core: read the active wiring source generically, resolve
 * crossings, and create the wire to `toEndpoint`. Used by all bus wiring
 * actions so the logic is generalized rather than cloned per source/dest pair.
 */
function createWireFromActiveWiring(
  toEndpoint: WireEndpoint,
  get: GetState,
  set: SetState,
  actionName: string,
): void {
  const state = get()
  const from = state.wiringFrom
  if (!from?.source) {
    notify.warning('No active wiring operation')
    return
  }
  const fromEndpoint = resolveSourceEndpoint(from.source)
  if (!fromEndpoint) {
    notify.warning('Invalid wiring source')
    set((s) => { s.wiringFrom = null }, false, `${actionName}/invalidSource`)
    return
  }
  const exists = state.wires.some(
    (w) => endpointsEqual(w.from, fromEndpoint) && endpointsEqual(w.to, toEndpoint),
  )
  if (exists) {
    notify.warning('Wire already exists')
    set((s) => { s.wiringFrom = null }, false, `${actionName}/wireExists`)
    return
  }
  const segments = from.segments ?? []
  if (segments.length === 0) {
    notify.error('Wire path not available. Please try connecting again.')
    set((s) => { s.wiringFrom = null }, false, `${actionName}/noSegments`)
    return
  }
  let resolvedSegments: WireSegment[]
  let crossedWireIds: string[] = []
  try {
    const result = resolveCrossings(segments, state.wires)
    resolvedSegments = result.segments
    crossedWireIds = result.crossedWireIds
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Failed to resolve wire crossings'
    notify.error(`Cannot complete wire: ${msg}`)
    set((s) => { s.wiringFrom = null }, false, `${actionName}/crossingResolutionFailed`)
    return
  }
  try {
    state.addWire(fromEndpoint, toEndpoint, resolvedSegments, crossedWireIds)
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Failed to create wire'
    notify.error(`Cannot complete wire: ${msg}`)
    set((s) => { s.wiringFrom = null }, false, `${actionName}/addWireFailed`)
    return
  }
  set((s) => { s.wiringFrom = null }, false, actionName)
}
```

Add the four public actions inside the object returned by `createWiringActions`, immediately before its closing `})` (before line 536):

```ts
  startWiringFromBus: (busId, pinId, pinType, position) => {
    set((state) => {
      state.wiringFrom = {
        fromGateId: '',
        fromPinId: '',
        fromPinType: pinType,
        fromPosition: position,
        previewEndPosition: null,
        destinationGateId: null,
        destinationPinId: null,
        destinationNodeId: null,
        destinationNodeType: null,
        segments: null,
        source: { type: 'bus', busId, pinId, pinType },
      }
      state.placementMode = null
      state.nodePlacementMode = null
    }, false, 'startWiringFromBus')
  },

  completeWiringToBus: (busId, pinId) => {
    createWireFromActiveWiring({ type: 'bus', entityId: busId, pinId }, get, set, 'completeWiringToBus')
  },

  completeWiringFromBusToGate: (gateId, pinId, _pinType) => {
    createWireFromActiveWiring({ type: 'gate', entityId: gateId, pinId }, get, set, 'completeWiringFromBusToGate')
  },

  completeWiringFromBusToNode: (nodeId, _nodeType) => {
    createWireFromActiveWiring({ type: 'output', entityId: nodeId }, get, set, 'completeWiringFromBusToNode')
  },
```

- [ ] **Step 5: Add re-route to `busActions.ts`**

In `src/store/actions/busActions/busActions.ts`, add imports after line 8 (the `createBusPins` import):

```ts
import type { WireEndpoint, Position } from '../../types'
import { calculateWirePath } from '@/utils/wiringScheme/core'
import { collectWireSegments, combineAdjacentSegments } from '@/utils/wiringScheme/segments'
import { resolveCrossings } from '@/utils/wiringScheme/crossing'
import { calculateNodePinPosition } from '@/nodes/config'
```

(Note: `Position` is already imported in the existing type import; if so, drop the duplicate and import only `WireEndpoint`.)

Rename the factory's `_get` parameter to `get`:

```ts
export const createBusActions = (set: SetState, get: GetState): BusActions => ({
```

Add the endpoint resolvers and the re-route helper at the bottom of the file (after the closing `})` of `createBusActions`):

```ts
function endpointWorldPosition(endpoint: WireEndpoint, state: CircuitStore): Position | null {
  switch (endpoint.type) {
    case 'gate':
    case 'bus':
      return endpoint.pinId ? state.getPinWorldPosition(endpoint.entityId, endpoint.pinId) : null
    case 'input': {
      const node = state.inputNodes.find((n) => n.id === endpoint.entityId)
      if (!node) return null
      const off = calculateNodePinPosition('input')
      return { x: node.position.x + off.x, y: 0.2, z: node.position.z + off.z }
    }
    case 'output': {
      const node = state.outputNodes.find((n) => n.id === endpoint.entityId)
      if (!node) return null
      const off = calculateNodePinPosition('output')
      return { x: node.position.x + off.x, y: 0.2, z: node.position.z + off.z }
    }
    default:
      return null // junction endpoints are preserved (not re-routed here)
  }
}

function endpointOrientation(
  endpoint: WireEndpoint,
  state: CircuitStore,
): { x: number; y: number; z: number } | null {
  switch (endpoint.type) {
    case 'gate':
    case 'bus':
      return endpoint.pinId ? state.getPinOrientation(endpoint.entityId, endpoint.pinId) : null
    case 'input':
      return { x: 1, y: 0, z: 0 }
    case 'output':
      return { x: -1, y: 0, z: 0 }
    default:
      return null
  }
}

/**
 * Recompute segments for every wire touching a moved bus component so the wires
 * follow it. B-003 guard: an empty/failed re-route keeps existing segments
 * rather than orphaning the wire.
 */
function recalculateWiresForBusComponent(set: SetState, get: GetState, busId: string): void {
  const connectedWires = get().wires.filter(
    (w) =>
      (w.from.type === 'bus' && w.from.entityId === busId) ||
      (w.to.type === 'bus' && w.to.entityId === busId),
  )
  if (connectedWires.length === 0) return

  for (const wire of connectedWires) {
    try {
      const fresh = get()
      const fromPos = endpointWorldPosition(wire.from, fresh)
      const fromOri = endpointOrientation(wire.from, fresh)
      const toPos = endpointWorldPosition(wire.to, fresh)
      const toOri = endpointOrientation(wire.to, fresh)
      if (!fromPos || !fromOri || !toPos || !toOri) continue

      const existingSegments = collectWireSegments(fresh.wires, (w) => w.id !== wire.id)
      const newPath = calculateWirePath(
        fromPos,
        { type: 'pin', pin: toPos, orientation: { direction: toOri } },
        { direction: fromOri },
        fresh.gates,
        { existingSegments },
      )

      let resolvedSegments = newPath.segments
      let crossedWireIds: string[] = []
      try {
        const result = resolveCrossings(newPath.segments, fresh.wires.filter((w) => w.id !== wire.id))
        resolvedSegments = result.segments
        crossedWireIds = result.crossedWireIds
      } catch {
        // keep unresolved segments
      }

      const combined = combineAdjacentSegments(resolvedSegments)
      if (combined.length > 0) {
        fresh.updateWireSegments(wire.id, combined, crossedWireIds)
      } else {
        console.warn(
          `[recalculateWiresForBusComponent] Empty re-route for wire ${wire.id}; preserving existing segments.`,
        )
      }
    } catch (error) {
      console.error(
        `[recalculateWiresForBusComponent] Failed to recalculate wire ${wire.id}; preserving existing segments:`,
        error,
      )
    }
  }
}
```

Update `updateBusComponentPosition` to call the re-route after the position write:

```ts
  updateBusComponentPosition: (id, position) => {
    set((state) => {
      const component = state.busComponents.find((c) => c.id === id)
      if (component) component.position = position
    }, false, 'updateBusComponentPosition')
    recalculateWiresForBusComponent(set, get, id)
  },
```

- [ ] **Step 6: Add the `'bus'` branch to `deriveWire3DProps.ts`**

In `src/components/canvas/deriveWire3DProps.ts`, add a bus branch to the `start` resolution (after the gate branch, after line 30):

```ts
  } else if (wire.from.type === 'bus' && wire.from.pinId) {
    start = state.getPinWorldPosition(wire.from.entityId, wire.from.pinId)
```

and to the `end` resolution (after the gate branch, after line 44):

```ts
  } else if (wire.to.type === 'bus' && wire.to.pinId) {
    end = state.getPinWorldPosition(wire.to.entityId, wire.to.pinId)
```

- [ ] **Step 7: Expose new wiring actions on `circuitActions` + mock no-ops**

In `src/store/circuitStore.ts`, in `circuitActions`, add after `completeWiringToNode` (after line 205):

```ts
  startWiringFromBus: (...args: Parameters<CircuitStore['startWiringFromBus']>) => useCircuitStore.getState().startWiringFromBus(...args),
  completeWiringToBus: (...args: Parameters<CircuitStore['completeWiringToBus']>) => useCircuitStore.getState().completeWiringToBus(...args),
  completeWiringFromBusToGate: (...args: Parameters<CircuitStore['completeWiringFromBusToGate']>) => useCircuitStore.getState().completeWiringFromBusToGate(...args),
  completeWiringFromBusToNode: (...args: Parameters<CircuitStore['completeWiringFromBusToNode']>) => useCircuitStore.getState().completeWiringFromBusToNode(...args),
```

In `src/test/testUtils.ts`, add after `completeWiringToNode: () => {},` (line 99):

```ts
    startWiringFromBus: () => {},
    completeWiringToBus: () => {},
    completeWiringFromBusToGate: () => {},
    completeWiringFromBusToNode: () => {},
```

- [ ] **Step 8: Run the tests; expect PASS**

Run: `pnpm exec vitest run src/store/actions/wiringActions/wiringActions.test.ts src/store/actions/busActions/busActions.test.ts`
Expected: PASS — all wiring tests (including the two new bus tests) and all bus tests (including the re-route test) pass.

- [ ] **Step 9: Commit**

```bash
git add src/store/types.ts src/store/actions/wiringActions/wiringActions.ts src/store/actions/wiringActions/wiringActions.test.ts src/store/actions/busActions/busActions.ts src/store/actions/busActions/busActions.test.ts src/components/canvas/deriveWire3DProps.ts src/store/circuitStore.ts src/test/testUtils.ts
git commit -m "feat(wiring): wire bus pins to gates/nodes and re-route on move"
```

---

## Task 6: Rendering (`BusSplitter3D`, `BusJoiner3D`, dispatch, CanvasArea)

**Files:**
- Create: `src/nodes/BusSplitter3D.tsx`
- Create: `src/nodes/BusJoiner3D.tsx`
- Create: `src/nodes/BusComponentRenderer.tsx`
- Test: `src/nodes/BusSplitter3D.test.tsx`
- Test: `src/nodes/BusComponentRenderer.test.tsx`
- Modify: `src/nodes/index.ts`
- Modify: `src/components/canvas/CanvasArea.tsx`
- Modify: `src/components/canvas/handlers/canvasHandlers.ts`

**Interfaces:**
- Consumes: `computeBusPinLayout`/`computeBusBodyDimensions` (Task 3); `FloatingLabel` (existing); bus wiring actions (Task 5).
- Produces:
  - `BusSplitter3D` / `BusJoiner3D` (props `{ component: BusComponent; onPinClick?: BusPinClickHandler }`)
  - `BusComponentRenderer` dispatch component
  - `handleBusPinClick(busId, pinId, pinType, worldPosition)` + bus-source branches in `handlePinClick`/`handleNodePinClick`

- [ ] **Step 1: Write the failing renderer tests**

Create `src/nodes/BusSplitter3D.test.tsx`:

```ts
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { BusSplitter3D } from './BusSplitter3D'
import { createBusPins } from '@/store/actions/busActions/busPins'
import type { BusComponent } from '@/store/types'

vi.mock('@react-three/drei', () => ({
  Html: ({ children }: { children: React.ReactNode }) => <div data-testid="node-label">{children}</div>,
}))

function makeSplitter(width: number): BusComponent {
  const { inputs, outputs } = createBusPins('splitter', width)
  return { id: 'bus-1', kind: 'splitter', position: { x: 0, y: 0, z: 0 }, rotation: { x: 0, y: 0, z: 0 }, width, inputs, outputs, selected: false }
}

describe('BusSplitter3D', () => {
  it('exports a valid component with a displayName', () => {
    expect(typeof BusSplitter3D).toBe('function')
    expect(BusSplitter3D.displayName).toBe('BusSplitter3D')
  })

  it('renders a SPLIT xN label', () => {
    render(<BusSplitter3D component={makeSplitter(4)} />)
    const labels = screen.getAllByTestId('node-label').map((n) => n.textContent)
    expect(labels).toContain('SPLIT x4')
  })
})
```

Create `src/nodes/BusComponentRenderer.test.tsx`:

```ts
import { describe, it, expect } from 'vitest'
import { BusComponentRenderer } from './BusComponentRenderer'

describe('BusComponentRenderer', () => {
  it('exports a valid component with a displayName', () => {
    expect(typeof BusComponentRenderer).toBe('function')
    expect(BusComponentRenderer.displayName).toBe('BusComponentRenderer')
  })
})
```

- [ ] **Step 2: Run them; expect FAIL**

Run: `pnpm exec vitest run src/nodes/BusSplitter3D.test.tsx src/nodes/BusComponentRenderer.test.tsx`
Expected: FAIL — `Failed to resolve import "./BusSplitter3D"` / `"./BusComponentRenderer"`.

- [ ] **Step 3: Implement `BusSplitter3D.tsx`**

Create `src/nodes/BusSplitter3D.tsx`:

```tsx
// BusSplitter3D - 1 N-bit input fanned out to N 1-bit outputs
import type { BusComponent } from '@/store/types'
import { colors, materials } from '@/theme'
import { NODE_DIMENSIONS } from './config'
import { computeBusPinLayout, computeBusBodyDimensions } from '@/components/scene/busBodyLayout'
import { isSignalHigh } from '@/simulation/signalDisplay'
import { FloatingLabel } from '@/components/canvas/FloatingLabel'
import { LABEL_GEOMETRY } from '@/components/canvas/labelGeometry'

export type BusPinClickHandler = (
  componentId: string,
  pinId: string,
  pinType: 'input' | 'output',
  worldPosition: { x: number; y: number; z: number },
) => void

interface BusSplitter3DProps {
  component: BusComponent
  onPinClick?: BusPinClickHandler
}

/**
 * Renders a bus splitter: a flat board whose depth scales with width, a
 * `SPLIT xN` label, and dynamically laid-out pins (1 input on the left, N
 * outputs on the right) from computeBusPinLayout. React-Compiler clean: no
 * memo hooks; pin layout computed inline.
 */
export function BusSplitter3D({ component, onPinClick }: BusSplitter3DProps) {
  const { position, rotation, width } = component
  const dims = computeBusBodyDimensions(component)
  const slots = computeBusPinLayout(component)
  const pinValue = (pinId: string): number =>
    component.inputs.find((p) => p.id === pinId)?.value ??
    component.outputs.find((p) => p.id === pinId)?.value ??
    0

  return (
    <>
      <group position={[position.x, position.y, position.z]} rotation={[rotation.x, rotation.y, rotation.z]}>
        <mesh>
          <boxGeometry args={[dims.sizeX, dims.sizeY, dims.sizeZ]} />
          <meshStandardMaterial
            color={colors.gate.body}
            metalness={materials.gate.metalness}
            roughness={materials.gate.roughness}
          />
        </mesh>

        {slots.map((slot) => {
          const high = isSignalHigh(pinValue(slot.pinId))
          const pinColor = high ? colors.pin.active : colors.pin.inactive
          return (
            <mesh
              key={slot.pinId}
              position={slot.position}
              onClick={(e) => {
                e.stopPropagation()
                if (!onPinClick) return
                onPinClick(component.id, slot.pinId, slot.side, {
                  x: position.x + slot.position[0],
                  y: position.y + slot.position[1],
                  z: position.z + slot.position[2],
                })
              }}
            >
              <sphereGeometry args={[NODE_DIMENSIONS.PIN_RADIUS, 16, 16]} />
              <meshStandardMaterial
                color={pinColor}
                emissive={pinColor}
                emissiveIntensity={high ? 0.5 : 0.2}
                metalness={materials.pin.metalness}
                roughness={materials.pin.roughness}
              />
            </mesh>
          )
        })}
      </group>

      <FloatingLabel
        position={[position.x, position.y, position.z]}
        text={`SPLIT x${width}`}
        offsetY={LABEL_GEOMETRY.NODE.offsetY}
      />
    </>
  )
}
BusSplitter3D.displayName = 'BusSplitter3D'
```

- [ ] **Step 4: Implement `BusJoiner3D.tsx`**

Create `src/nodes/BusJoiner3D.tsx`:

```tsx
// BusJoiner3D - N 1-bit inputs joined into 1 N-bit output
import type { BusComponent } from '@/store/types'
import { colors, materials } from '@/theme'
import { NODE_DIMENSIONS } from './config'
import { computeBusPinLayout, computeBusBodyDimensions } from '@/components/scene/busBodyLayout'
import { isSignalHigh } from '@/simulation/signalDisplay'
import { FloatingLabel } from '@/components/canvas/FloatingLabel'
import { LABEL_GEOMETRY } from '@/components/canvas/labelGeometry'
import type { BusPinClickHandler } from './BusSplitter3D'

interface BusJoiner3DProps {
  component: BusComponent
  onPinClick?: BusPinClickHandler
}

/**
 * Renders a bus joiner: a flat board whose depth scales with width, a
 * `JOIN xN` label, and dynamically laid-out pins (N inputs on the left, 1
 * output on the right). React-Compiler clean: no memo hooks.
 */
export function BusJoiner3D({ component, onPinClick }: BusJoiner3DProps) {
  const { position, rotation, width } = component
  const dims = computeBusBodyDimensions(component)
  const slots = computeBusPinLayout(component)
  const pinValue = (pinId: string): number =>
    component.inputs.find((p) => p.id === pinId)?.value ??
    component.outputs.find((p) => p.id === pinId)?.value ??
    0

  return (
    <>
      <group position={[position.x, position.y, position.z]} rotation={[rotation.x, rotation.y, rotation.z]}>
        <mesh>
          <boxGeometry args={[dims.sizeX, dims.sizeY, dims.sizeZ]} />
          <meshStandardMaterial
            color={colors.gate.body}
            metalness={materials.gate.metalness}
            roughness={materials.gate.roughness}
          />
        </mesh>

        {slots.map((slot) => {
          const high = isSignalHigh(pinValue(slot.pinId))
          const pinColor = high ? colors.pin.active : colors.pin.inactive
          return (
            <mesh
              key={slot.pinId}
              position={slot.position}
              onClick={(e) => {
                e.stopPropagation()
                if (!onPinClick) return
                onPinClick(component.id, slot.pinId, slot.side, {
                  x: position.x + slot.position[0],
                  y: position.y + slot.position[1],
                  z: position.z + slot.position[2],
                })
              }}
            >
              <sphereGeometry args={[NODE_DIMENSIONS.PIN_RADIUS, 16, 16]} />
              <meshStandardMaterial
                color={pinColor}
                emissive={pinColor}
                emissiveIntensity={high ? 0.5 : 0.2}
                metalness={materials.pin.metalness}
                roughness={materials.pin.roughness}
              />
            </mesh>
          )
        })}
      </group>

      <FloatingLabel
        position={[position.x, position.y, position.z]}
        text={`JOIN x${width}`}
        offsetY={LABEL_GEOMETRY.NODE.offsetY}
      />
    </>
  )
}
BusJoiner3D.displayName = 'BusJoiner3D'
```

- [ ] **Step 5: Implement `BusComponentRenderer.tsx`**

Create `src/nodes/BusComponentRenderer.tsx`:

```tsx
// BusComponentRenderer - dispatches to the right bus component by kind
import type { BusComponent } from '@/store/types'
import { BusSplitter3D, type BusPinClickHandler } from './BusSplitter3D'
import { BusJoiner3D } from './BusJoiner3D'

interface BusComponentRendererProps {
  component: BusComponent
  onPinClick?: BusPinClickHandler
}

export function BusComponentRenderer({ component, onPinClick }: BusComponentRendererProps) {
  switch (component.kind) {
    case 'splitter':
      return <BusSplitter3D component={component} onPinClick={onPinClick} />
    case 'joiner':
      return <BusJoiner3D component={component} onPinClick={onPinClick} />
    default:
      return ((_: never) => null)(component.kind)
  }
}
BusComponentRenderer.displayName = 'BusComponentRenderer'
```

- [ ] **Step 6: Export from `src/nodes/index.ts`**

In `src/nodes/index.ts`, add:

```ts
export { BusComponentRenderer } from './BusComponentRenderer'
export { BusSplitter3D, type BusPinClickHandler } from './BusSplitter3D'
export { BusJoiner3D } from './BusJoiner3D'
```

- [ ] **Step 7: Add the bus pin-click handler + bus-source branches**

In `src/components/canvas/handlers/canvasHandlers.ts`, in `handlePinClick`, add a bus-source branch inside the `if (currentWiringFrom)` block (after the `source.type === 'junction'` branch, before the `else`):

```ts
    } else if (source && source.type === 'bus') {
      circuitActions.completeWiringFromBusToGate(gateId, pinId, pinType)
```

In `handleNodePinClick`, add a bus-source branch inside the `if (currentWiringFrom)` block (after the junction branch):

```ts
    } else if (source && source.type === 'bus') {
      if (nodeType === 'output') {
        circuitActions.completeWiringFromBusToNode(nodeId, nodeType)
      }
```

Add a new exported handler at the end of the file:

```ts
/**
 * Handle bus pin click - start wiring from a bus pin, or complete the active
 * wire onto this bus pin. Completion reads the source generically, so any
 * source (gate/input/bus) can terminate on a bus pin.
 */
export function handleBusPinClick(
  busId: string,
  pinId: string,
  pinType: 'input' | 'output',
  worldPosition: Position,
): void {
  const currentWiringFrom = useCircuitStore.getState().wiringFrom
  if (currentWiringFrom) {
    circuitActions.completeWiringToBus(busId, pinId)
  } else {
    circuitActions.startWiringFromBus(busId, pinId, pinType, worldPosition)
  }
}
```

- [ ] **Step 8: Map `busComponents` in `CanvasArea.tsx`**

In `src/components/canvas/CanvasArea.tsx`, add `BusComponentRenderer` to the nodes import (line 3):

```ts
import { NodeRenderer, BusComponentRenderer } from '@/nodes'
```

Add `handleBusPinClick` to the handlers import (line 8):

```ts
import { handlePinClick, handleInputToggle, handleGateClick, handleInputNodeToggle, handleNodeClick, handleNodePinClick, handleJunctionClick, handleBusPinClick } from './handlers/canvasHandlers'
```

Add a selector after the `junctions` selector (after line 30):

```ts
  const busComponents = useCircuitStore((s) => s.busComponents)
```

Add the map after the `junctions.map(...)` block (after line 171, before the closing `</Scene>`):

```tsx
        {busComponents.map((component) => (
          <BusComponentRenderer
            key={component.id}
            component={component}
            onPinClick={handleBusPinClick}
          />
        ))}
```

- [ ] **Step 9: Run the renderer tests; expect PASS**

Run: `pnpm exec vitest run src/nodes/BusSplitter3D.test.tsx src/nodes/BusComponentRenderer.test.tsx`
Expected: PASS — 3 tests pass.

- [ ] **Step 10: Lint the new/changed render files (React Compiler gate)**

Run: `pnpm run lint`
Expected: exit 0 (no `react-compiler/react-compiler` violations; no unused vars).

- [ ] **Step 11: Commit**

```bash
git add src/nodes/BusSplitter3D.tsx src/nodes/BusJoiner3D.tsx src/nodes/BusComponentRenderer.tsx src/nodes/BusSplitter3D.test.tsx src/nodes/BusComponentRenderer.test.tsx src/nodes/index.ts src/components/canvas/CanvasArea.tsx src/components/canvas/handlers/canvasHandlers.ts
git commit -m "feat(nodes): render bus splitter/joiner with width-dynamic pins"
```

---

## Task 7: Scene-graph render test (ADR-0008 layer)

**Files:**
- Create: `src/test/r3f/busSplitterScene.test.tsx`
- Modify: `src/test/r3f/seedCircuit.ts` (reset `busComponents`)

**Interfaces:**
- Consumes: `renderCircuitScene`, `getRenderedWirePolylines`, `expectWireConnects` (existing harness); `resetCircuitStore` (existing); bus CRUD + wiring + pin resolution (Tasks 2-5); `calculateWirePath` (existing).
- Produces: a scene-graph assertion that every dynamic splitter output pin gets a rendered wire connecting it to its downstream gate pin.

- [ ] **Step 1: Reset `busComponents` in `seedCircuit.ts`**

In `src/test/r3f/seedCircuit.ts`, in `resetCircuitStore`, add `busComponents: []` to the `setState` object (after `junctions: [],`, line 13):

```ts
    busComponents: [],
```

- [ ] **Step 2: Write the failing scene-graph test**

Create `src/test/r3f/busSplitterScene.test.tsx`:

```tsx
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { useCircuitStore } from '@/store/circuitStore'
import { calculateWirePath } from '@/utils/wiringScheme/core'
import { calculateNodePinPosition } from '@/nodes/config'
import { resetCircuitStore } from './seedCircuit'
import { renderCircuitScene, type SceneTestHandle } from './renderCircuitScene'
import { getRenderedWirePolylines, expectWireConnects } from './wireGeometry'
import type { Wire } from '@/store/types'

const getState = () => useCircuitStore.getState()

/** Route + add a wire from a bus output pin to a gate input pin (app routing). */
function wireBusPinToGatePin(busId: string, busPinId: string, gateId: string, gatePinId: string): Wire {
  const state = getState()
  const fromPos = state.getPinWorldPosition(busId, busPinId)!
  const fromOri = state.getPinOrientation(busId, busPinId)!
  const toPos = state.getPinWorldPosition(gateId, gatePinId)!
  const toOri = state.getPinOrientation(gateId, gatePinId)!
  const path = calculateWirePath(
    fromPos,
    { type: 'pin', pin: toPos, orientation: { direction: toOri } },
    { direction: fromOri },
    state.gates,
    { existingSegments: state.wires.flatMap((w) => w.segments) },
  )
  return state.addWire(
    { type: 'bus', entityId: busId, pinId: busPinId },
    { type: 'gate', entityId: gateId, pinId: gatePinId },
    path.segments,
  )
}

describe('bus splitter scene-graph rendering', () => {
  let handle: SceneTestHandle | null = null
  beforeEach(() => resetCircuitStore())
  afterEach(async () => {
    if (handle) await handle.unmount()
    handle = null
  })

  it('renders a connected wire from every splitter output pin to its gate', async () => {
    const inputNode = getState().addInputNode('a', { x: -4, y: 0, z: 0 }, 4)
    const splitter = getState().placeBusSplitter(4, { x: 0, y: 0, z: 0 })!

    // input bus -> splitter input (routed)
    const inPin = getState().getPinWorldPosition(splitter.id, 'in')!
    const off = calculateNodePinPosition('input')
    const inStart = { x: inputNode.position.x + off.x, y: 0.2, z: inputNode.position.z + off.z }
    const inPath = calculateWirePath(
      inStart,
      { type: 'pin', pin: inPin, orientation: { direction: getState().getPinOrientation(splitter.id, 'in')! } },
      { direction: { x: 1, y: 0, z: 0 } },
      getState().gates,
      { existingSegments: [] },
    )
    getState().addWire({ type: 'input', entityId: inputNode.id }, { type: 'bus', entityId: splitter.id, pinId: 'in' }, inPath.segments)

    // one downstream gate per output bit
    const gateIds: string[] = []
    const wireByPin = new Map<string, string>()
    for (let i = 0; i < 4; i++) {
      const gate = getState().addGate('Not', { x: 6, y: 0, z: (i - 1.5) * 4 })
      gateIds.push(gate.id)
      const wire = wireBusPinToGatePin(splitter.id, `out${i}`, gate.id, gate.inputs[0].id)
      wireByPin.set(`out${i}`, wire.id)
    }

    handle = await renderCircuitScene({ gates: false })
    const rendered = getRenderedWirePolylines(handle)

    for (let i = 0; i < 4; i++) {
      const wireId = wireByPin.get(`out${i}`)!
      const w = rendered.find((r) => r.wireId === wireId)
      expect(w, `no rendered wire for out${i}`).toBeDefined()
      const busPin = getState().getPinWorldPosition(splitter.id, `out${i}`)!
      const gatePin = getState().getPinWorldPosition(gateIds[i], getState().gates[i].inputs[0].id)!
      expectWireConnects(w!, busPin, gatePin)
    }
  })
})
```

- [ ] **Step 3: Run it; expect FAIL (then confirm PASS)**

Run: `pnpm exec vitest run src/test/r3f/busSplitterScene.test.tsx`
Expected: with Tasks 2-6 in place, this should PASS immediately (the harness, bus pin resolution, and `deriveWire3DProps` bus branch are all present). If it FAILS on `expectWireConnects` (Δ > 0.001), the failure message prints rendered-vs-expected endpoints — re-verify the Task 5 `deriveWire3DProps` bus branches and the Task 3 pin resolution; do NOT loosen the tolerance.

Expected final: PASS — 1 test passes.

- [ ] **Step 4: Commit**

```bash
git add src/test/r3f/busSplitterScene.test.tsx src/test/r3f/seedCircuit.ts
git commit -m "test(r3f): assert splitter output pins render connected wires"
```

---

## Task 8: Placement flow + toolbar

**Files:**
- Modify: `src/store/types.ts` (`busPlacementMode`, `BusPlacementActions`)
- Create: `src/store/actions/busPlacementActions/busPlacementActions.ts`
- Test: `src/store/actions/busPlacementActions/busPlacementActions.test.ts`
- Modify: `src/store/circuitStore.ts` (state + slice + `circuitActions`)
- Modify: `src/test/testUtils.ts` (state default + no-op actions)
- Modify: `src/components/ui/CompactToolbar.tsx`
- Modify: `e2e/types/globals.ts`
- Create: `e2e/specs/bus/bus-placement.store.spec.ts`

**Interfaces:**
- Consumes: `placeBusSplitter`/`placeBusJoiner` (Task 2); `snapToGrid` (existing).
- Produces:
  - `CircuitState.busPlacementMode: BusComponentKind | null`
  - `BusPlacementActions { startBusPlacement(kind), cancelBusPlacement(), placeBusComponent(position) }`
  - `createBusPlacementActions(set, get): BusPlacementActions`
  - Toolbar entries `bus-button-splitter` / `bus-button-joiner`.
- Default placement width: **16**.

- [ ] **Step 1: Write the failing placement store test**

Create `src/store/actions/busPlacementActions/busPlacementActions.test.ts`:

```ts
import { describe, it, expect, beforeEach } from 'vitest'
import { useCircuitStore } from '../../circuitStore'

describe('busPlacementActions', () => {
  beforeEach(() => {
    useCircuitStore.setState({
      gates: [],
      wires: [],
      inputNodes: [],
      outputNodes: [],
      junctions: [],
      busComponents: [],
      busPlacementMode: null,
      placementMode: null,
      nodePlacementMode: null,
    })
  })

  it('startBusPlacement sets the mode and clears other placement modes', () => {
    useCircuitStore.setState({ placementMode: 'Nand', nodePlacementMode: 'INPUT' })
    useCircuitStore.getState().startBusPlacement('splitter')
    expect(useCircuitStore.getState().busPlacementMode).toBe('splitter')
    expect(useCircuitStore.getState().placementMode).toBe(null)
    expect(useCircuitStore.getState().nodePlacementMode).toBe(null)
  })

  it('cancelBusPlacement clears the mode', () => {
    useCircuitStore.setState({ busPlacementMode: 'joiner' })
    useCircuitStore.getState().cancelBusPlacement()
    expect(useCircuitStore.getState().busPlacementMode).toBe(null)
  })

  it('placeBusComponent creates a width-16 splitter and clears the mode', () => {
    useCircuitStore.getState().startBusPlacement('splitter')
    useCircuitStore.getState().placeBusComponent({ x: 2, y: 0.2, z: 2 })
    const state = useCircuitStore.getState()
    expect(state.busComponents).toHaveLength(1)
    expect(state.busComponents[0].kind).toBe('splitter')
    expect(state.busComponents[0].width).toBe(16)
    expect(state.busComponents[0].outputs).toHaveLength(16)
    expect(state.busPlacementMode).toBe(null)
  })

  it('placeBusComponent creates a width-16 joiner', () => {
    useCircuitStore.getState().startBusPlacement('joiner')
    useCircuitStore.getState().placeBusComponent({ x: 0, y: 0.2, z: 0 })
    const state = useCircuitStore.getState()
    expect(state.busComponents[0].kind).toBe('joiner')
    expect(state.busComponents[0].inputs).toHaveLength(16)
  })

  it('placeBusComponent is a no-op when no mode is active', () => {
    useCircuitStore.getState().placeBusComponent({ x: 0, y: 0, z: 0 })
    expect(useCircuitStore.getState().busComponents).toHaveLength(0)
  })
})
```

- [ ] **Step 2: Run it; expect FAIL**

Run: `pnpm exec vitest run src/store/actions/busPlacementActions/busPlacementActions.test.ts`
Expected: FAIL — `startBusPlacement is not a function` (and TS errors on `busPlacementMode`).

- [ ] **Step 3: Add types in `types.ts`**

In `src/store/types.ts`, add to `CircuitState` after `busComponents: BusComponent[]` (the line added in Task 2):

```ts
  busPlacementMode: BusComponentKind | null
```

Add the interface after the `BusActions` interface (added in Task 2):

```ts
/**
 * Actions for placing bus components on the canvas (mirrors node placement).
 */
export interface BusPlacementActions {
  startBusPlacement: (kind: BusComponentKind) => void
  cancelBusPlacement: () => void
  placeBusComponent: (position: Position) => void
}
```

Append `BusPlacementActions` to the `CircuitStore` extends list:

```ts
export interface CircuitStore extends CircuitState, GateActions, WireActions, SimulationActions, PlacementActions, NodePlacementActions, WiringActions, PinHelpers, ViewActions, NodeActions, JunctionActions, JunctionPlacementActions, StatusActions, PersistenceActions, TestActions, BusActions, BusPlacementActions {}
```

- [ ] **Step 4: Implement `busPlacementActions.ts`**

Create `src/store/actions/busPlacementActions/busPlacementActions.ts`:

```ts
import type {
  BusPlacementActions,
  BusComponentKind,
  Position,
  CircuitStore,
} from '../../types'
import { snapToGrid } from '@/utils/grid'

type SetState = (
  fn: (state: CircuitStore) => void,
  replace?: false,
  actionName?: string
) => void
type GetState = () => CircuitStore

/** Default bus width for first-slice placement (the common nand2tetris case). */
const DEFAULT_BUS_WIDTH = 16

export const createBusPlacementActions = (
  set: SetState,
  get: GetState,
): BusPlacementActions => ({
  startBusPlacement: (kind: BusComponentKind) => {
    set((state) => {
      state.busPlacementMode = kind
      state.placementMode = null
      state.nodePlacementMode = null
      state.junctionPlacementMode = null
      state.selectedGateId = null
      state.selectedWireId = null
      state.selectedNodeId = null
      state.selectedNodeType = null
      state.gates.forEach((g) => {
        g.selected = false
      })
    }, false, 'startBusPlacement')
  },

  cancelBusPlacement: () => {
    set((state) => {
      state.busPlacementMode = null
      state.placementPreviewPosition = null
    }, false, 'cancelBusPlacement')
  },

  placeBusComponent: (position: Position) => {
    const mode = get().busPlacementMode
    if (!mode) return
    const snapped = snapToGrid(position)
    if (mode === 'splitter') {
      get().placeBusSplitter(DEFAULT_BUS_WIDTH, snapped)
    } else {
      get().placeBusJoiner(DEFAULT_BUS_WIDTH, snapped)
    }
    set((state) => {
      state.busPlacementMode = null
      state.placementPreviewPosition = null
    }, false, 'placeBusComponent')
  },
})
```

- [ ] **Step 5: Wire into `circuitStore.ts`**

In `src/store/circuitStore.ts`, add the import after the `createBusActions` import (Task 2):

```ts
import { createBusPlacementActions } from './actions/busPlacementActions/busPlacementActions'
```

In `initialState`, add after `busComponents` (Task 2):

```ts
  busPlacementMode: null as import('./types').BusComponentKind | null,
```

In the store factory, add after `...createBusActions(set, get),`:

```ts
        ...createBusPlacementActions(set, get),
```

In `circuitActions`, add after the bus actions block (Task 2):

```ts
  // Bus placement actions
  startBusPlacement: (...args: Parameters<CircuitStore['startBusPlacement']>) => useCircuitStore.getState().startBusPlacement(...args),
  cancelBusPlacement: () => useCircuitStore.getState().cancelBusPlacement(),
  placeBusComponent: (...args: Parameters<CircuitStore['placeBusComponent']>) => useCircuitStore.getState().placeBusComponent(...args),
```

- [ ] **Step 6: Update `testUtils.ts`**

In `src/test/testUtils.ts`, in `defaultState`, add after `busComponents: [],` (Task 2):

```ts
    busPlacementMode: null,
```

In the no-op actions, add after the bus actions (Task 2):

```ts
    startBusPlacement: () => {},
    cancelBusPlacement: () => {},
    placeBusComponent: () => {},
```

- [ ] **Step 7: Run the placement store test; expect PASS**

Run: `pnpm exec vitest run src/store/actions/busPlacementActions/busPlacementActions.test.ts`
Expected: PASS — 5 tests pass.

- [ ] **Step 8: Add toolbar entries in `CompactToolbar.tsx`**

In `src/components/ui/CompactToolbar.tsx`, import the bus kind type and add subscriptions. First, add to the lucide import block (after line 19 `Info,`):

```ts
  Split,
```

Add a selector after `nodePlacementMode` (after line 73):

```ts
  const busPlacementMode = useCircuitStore((s) => s.busPlacementMode)
```

Add a handler after `handleIoSelect` (after line 122):

```ts
  const handleBusSelect = (kind: 'splitter' | 'joiner') => {
    if (busPlacementMode === kind) {
      circuitActions.cancelBusPlacement()
    } else {
      circuitActions.startBusPlacement(kind)
    }
    setIoOpen(false)
  }
```

In the I/O popover content, after the `ioElements.map(...)` block's closing `</div>` (after line 267), add a bus section:

```tsx
            <div className="text-xs font-medium text-muted-foreground mt-2 mb-2 px-2">Buses</div>
            <div className="flex flex-col gap-1">
              <Button
                data-testid="bus-button-splitter"
                variant={busPlacementMode === 'splitter' ? 'secondary' : 'ghost'}
                size="sm"
                className="justify-start gap-2 h-8"
                onClick={() => handleBusSelect('splitter')}
              >
                <Split className="w-4 h-4" />
                <span className="text-xs">Splitter</span>
              </Button>
              <Button
                data-testid="bus-button-joiner"
                variant={busPlacementMode === 'joiner' ? 'secondary' : 'ghost'}
                size="sm"
                className="justify-start gap-2 h-8"
                onClick={() => handleBusSelect('joiner')}
              >
                <Split className="w-4 h-4 rotate-180" />
                <span className="text-xs">Joiner</span>
              </Button>
            </div>
```

- [ ] **Step 9: Extend E2E typings in `globals.ts`**

In `e2e/types/globals.ts`, in `CircuitStoreSnapshot` (the interface around line 89), add after `outputNodes?: ...`:

```ts
  busComponents?: Array<{
    id: string
    kind: 'splitter' | 'joiner'
    width: number
    inputs: Array<{ id: string }>
    outputs: Array<{ id: string }>
  }>
  busPlacementMode?: 'splitter' | 'joiner' | null
```

In `CircuitActionsAPI` (around line 114), add before its closing `}` (after line 200 `importCircuitJSON`):

```ts
  // Bus actions (P05-12a)
  placeBusSplitter: (width: number, position: { x: number; y: number; z: number }) => { id: string; kind: string; width: number } | null
  placeBusJoiner: (width: number, position: { x: number; y: number; z: number }) => { id: string; kind: string; width: number } | null
  removeBusComponent: (id: string) => void
  startBusPlacement: (kind: 'splitter' | 'joiner') => void
  cancelBusPlacement: () => void
  placeBusComponent: (position: { x: number; y: number; z: number }) => void
```

- [ ] **Step 10: Write the failing E2E store spec**

Create `e2e/specs/bus/bus-placement.store.spec.ts`:

```ts
/**
 * Bus Component Placement Store Tests
 *
 * Placement of bus splitter/joiner components via window.__CIRCUIT_ACTIONS__.
 *
 * Tag: @store @bus
 */

import { storeTest as test, storeExpect as expect } from '../../fixtures'
import { DEFAULT_POSITIONS } from '../../config/constants'

test.describe('Bus Placement @store @bus', () => {
  test('places a splitter directly via placeBusSplitter', async ({ page }) => {
    const created = await page.evaluate(({ position }) => {
      return window.__CIRCUIT_ACTIONS__?.placeBusSplitter(16, position)
    }, { position: DEFAULT_POSITIONS.center })

    expect(created).not.toBeNull()
    expect(created?.kind).toBe('splitter')

    const summary = await page.evaluate(() => {
      const list = window.__CIRCUIT_STORE__?.busComponents ?? []
      return list.map((c) => ({ kind: c.kind, width: c.width, ins: c.inputs.length, outs: c.outputs.length }))
    })
    expect(summary).toEqual([{ kind: 'splitter', width: 16, ins: 1, outs: 16 }])
  })

  test('places a joiner via the placement flow (startBusPlacement + placeBusComponent)', async ({ page }) => {
    await page.evaluate(() => window.__CIRCUIT_ACTIONS__?.startBusPlacement('joiner'))
    await page.evaluate(({ position }) => {
      window.__CIRCUIT_ACTIONS__?.placeBusComponent(position)
    }, { position: DEFAULT_POSITIONS.right })

    const summary = await page.evaluate(() => {
      const list = window.__CIRCUIT_STORE__?.busComponents ?? []
      const mode = window.__CIRCUIT_STORE__?.busPlacementMode ?? null
      return { count: list.length, kind: list[0]?.kind, width: list[0]?.width, ins: list[0]?.inputs.length, mode }
    })
    expect(summary.count).toBe(1)
    expect(summary.kind).toBe('joiner')
    expect(summary.width).toBe(16)
    expect(summary.ins).toBe(16)
    expect(summary.mode).toBeNull()
  })
})
```

- [ ] **Step 11: Run the E2E spec; expect PASS**

Run: `pnpm exec playwright test -g "Bus Placement"`
Expected: PASS — 2 tests pass. (If Playwright browsers are missing, run `pnpm exec playwright install` first.)

- [ ] **Step 12: Lint (toolbar + globals)**

Run: `pnpm run lint`
Expected: exit 0.

- [ ] **Step 13: Commit**

```bash
git add src/store/types.ts src/store/actions/busPlacementActions/ src/store/circuitStore.ts src/test/testUtils.ts src/components/ui/CompactToolbar.tsx e2e/types/globals.ts e2e/specs/bus/bus-placement.store.spec.ts
git commit -m "feat(toolbar): add bus splitter/joiner placement flow"
```

---

## Task 9: ADR + docs-sync + full DoD + final review

**Files:**
- Create: `docs/decisions/0009-bus-components-entity-and-wireendpoint-bus.md`
- Modify: `REPO_MAP.md`
- Modify: `HACER_LLM_GUIDE.md` (only if a new reusable pattern was added)

**Interfaces:** none (documentation + verification).

- [ ] **Step 1: Confirm the next ADR number**

Run: `ls docs/decisions/`
Expected: highest existing is `0008-...`; the new ADR is `0009-...`. (If a `0009` already exists, bump to the next free number and rename the file in this task accordingly.)

- [ ] **Step 2: Write the ADR**

Create `docs/decisions/0009-bus-components-entity-and-wireendpoint-bus.md`:

```markdown
# 9. Bus components as a separate entity; `'bus'` WireEndpointType

Date: 2026-06-27

## Status

Accepted

## Context

P05-12a adds bus splitter/joiner tooling. The stale P05-12 ticket assumed a
`GateType` union and a `type` discriminator on `GateInstance`; neither exists
(gates are identified by `chipName` against a registry). Bus components need
dynamic, per-instance, width-dependent pins, which is exactly what the existing
node entities (`inputNodes`/`outputNodes`/`junctions`) already model.

## Decision

1. **Separate entity, not a chip.** Bus components live in a new
   `busComponents: BusComponent[]` array on `CircuitState`, with their own slice
   factory (`busActions`), placement flow (`busPlacementActions`), geometry
   (`busBodyLayout`), pure logic (`busLogic`), and `src/nodes/` renderers
   (`BusSplitter3D`/`BusJoiner3D`/`BusComponentRenderer`). They are NOT registry
   chips and NOT `GateInstance`s.

2. **Extend `WireEndpointType` with `'bus'`.** A wire endpoint on a bus pin is
   `{ type: 'bus', entityId, pinId }`. Every endpoint switch
   (`getSignalSourceValue`, `getEndpointWidth`, `destinationWidth`,
   `resolveSourceGateId`, `deriveWire3DProps`, the topological sort/eval) gained
   a `'bus'` case. (All switches carry a `default`, so the extension surfaced no
   compile break; cases were added for correctness, not exhaustiveness.)

3. **Generalize the pin wiring path, do not clone the node method family.** Bus
   wiring is four thin actions (`startWiringFromBus`, `completeWiringToBus`,
   `completeWiringFromBusToGate`, `completeWiringFromBusToNode`) over one shared
   `createWireFromActiveWiring` core that reads the source generically via
   `resolveSourceEndpoint`.

4. **Pin layout spreads along local Z (not local Y).** Unlike `chipBodyLayout`
   (local-Y + a `[π/2,0,0]` render rotation), bus components render like nodes
   (identity render rotation), so pins are laid out along local Z directly. The
   renderer, `getPinWorldPosition`, and `deriveWire3DProps` therefore share one
   transform and cannot drift.

## Consequences

- Simulation treats bus components as first-class ordered nodes (combinational,
  evaluated between gates in topological order).
- Bus components are NOT yet serialized (out of scope for 12a; follow-up).
- 12b (thick bus-wire rendering + xN labels) reads existing `wire.width` and is
  independent of this entity model.
```

- [ ] **Step 3: Update `REPO_MAP.md`**

Add `src/nodes/` entries for the new files (`BusSplitter3D.tsx`, `BusJoiner3D.tsx`, `BusComponentRenderer.tsx`), the `src/store/actions/busActions/` and `src/store/actions/busPlacementActions/` slices, `src/simulation/busLogic.ts`, and `src/components/scene/busBodyLayout.ts`, mirroring the surrounding format. In any "add X" jump table, add a "add a bus component" row pointing at: `types.ts` (entity) → `busPins.ts` + `busLogic.ts` (logic) → `busActions.ts` (CRUD) → `busBodyLayout.ts` + `pinHelpers.ts` (geometry) → `topologicalEval.ts` (sim) → `BusSplitter3D/BusJoiner3D/BusComponentRenderer` (render) → `CanvasArea.tsx` (map) → `busPlacementActions.ts` + `CompactToolbar.tsx` (placement). Run the `docs-sync` skill for the authoritative format.

- [ ] **Step 4: Update `HACER_LLM_GUIDE.md` (only if warranted)**

If `HACER_LLM_GUIDE.md` documents the node-entity or wiring patterns, add a short note that bus components follow the node-entity pattern and that bus wiring uses the generalized `createWireFromActiveWiring` core (a `'bus'` source/destination, not a cloned method family). Skip if no existing section fits — do not invent a new top-level section.

- [ ] **Step 5: Run the FULL Definition of Done**

Run each and confirm exit 0 (record the outcomes):

```bash
pnpm run lint
pnpm run test:run
pnpm run test:e2e:store
pnpm run build
```

Expected: all four exit 0. **Note:** run `pnpm run test:run` when machine load is low — DOM/UI tests can flake on timeout under load. If a file flakes, re-run it in isolation (`pnpm exec vitest run <file>`) to confirm it is a load artifact, not a real failure, before declaring DoD met.

- [ ] **Step 6: Commit**

```bash
git add docs/decisions/0009-bus-components-entity-and-wireendpoint-bus.md REPO_MAP.md HACER_LLM_GUIDE.md
git commit -m "docs: record bus component ADR and sync living docs"
```

---

## Self-Review

### 1. Spec coverage

| Spec section / requirement | Task(s) |
|---|---|
| Entity & store state (`BusComponent`, `busComponents`, `'bus'` endpoint) | 2 |
| `BusActions` slice (place/update/remove) + invalid-width no-op + wire stripping | 2, 5 |
| `createBusPins` helper | 1 |
| Pin world position / orientation (`computeBusPinLayout`, resolvers) | 3 |
| Wire creation learns `'bus'` source/dest; `getSignalSourceValue` reads bus | 2, 5 |
| `deriveWire3DProps` `'bus'` branch | 5 |
| `busLogic.ts` (`evaluateSplitter`/`evaluateJoiner`) | 1 |
| Topological sort + evaluate include bus nodes | 4 |
| Renderers + dispatch + CanvasArea map | 6 |
| Placement flow (`busPlacementMode` + actions) + toolbar | 8 |
| Unit / store / simulation / scene-graph / E2E tests | 1, 2, 4, 7, 8 |
| Error handling (invalid width no-op; unconnected pins default 0) | 2 (no-op), 4 (default-0 via pin init) |
| Float tolerance 0.001 reused | 7 (`expectWireConnects`) |
| ADR + docs-sync + full DoD | 9 |
| Out of scope (12b thick wires, width picker, sub-bus wiring, multi-bit fan-out) | intentionally excluded |

No spec requirement is unmapped. Determinism: bus logic is pure (no time/random); IDs use `Date.now()+random` only for entity ids, consistent with existing nodes.

### 2. Placeholder scan

No `TBD`/`TODO`/`similar to`/"add error handling" placeholders. Every code step contains complete code. The only conditional steps are: Task 9 Step 1 (ADR number bump if `0009` is taken) and Task 9 Step 4 (HACER_LLM_GUIDE only if a section fits) — both give an explicit decision rule, not a vague gap.

### 3. Type consistency

- `createBusPins(kind: 'splitter'|'joiner', width) => { inputs: Pin[]; outputs: Pin[] }` — defined Task 1, consumed Task 2 (`createBusComponent`) and Task 3 test helper. `'splitter'|'joiner'` is structurally `BusComponentKind`. ✔
- `BusComponent` fields (`id, kind, position, rotation, width, inputs, outputs, selected`) — defined Task 2, constructed in `createBusComponent` (Task 2), `placeBusComponent` (Task 8 via place actions), and test helpers (Tasks 3, 6) — all match. ✔
- `placeBusSplitter/placeBusJoiner => BusComponent | null` — defined Task 2; callers use `!` (Tasks 4, 5, 7) and null-check (Task 2 test, Task 8 e2e). ✔
- `BusPinSlot { pinId; side; position }` + `computeBusPinLayout => BusPinSlot[]` — defined Task 3, consumed Task 3 (pinHelpers) and Task 6 (renderers). ✔
- `computeBusBodyDimensions => { sizeX; sizeY; sizeZ }` — defined Task 3, consumed Task 6. ✔
- Wiring actions `startWiringFromBus/completeWiringToBus/completeWiringFromBusToGate/completeWiringFromBusToNode` — declared Task 5 (`WiringActions`), implemented Task 5, exposed on `circuitActions` Task 5, called in handlers Task 6. ✔
- `BusPlacementActions` (`startBusPlacement/cancelBusPlacement/placeBusComponent`) — declared Task 8, implemented Task 8, used by toolbar (Task 8) and e2e (Task 8). ✔
- `WireEndpoint` `'bus'` shape `{ type:'bus', entityId, pinId }` used identically in Tasks 2, 4, 5, 6, 7. ✔
- `BusPinClickHandler` exported from `BusSplitter3D` (Task 6), reused by `BusJoiner3D` and `BusComponentRenderer` (Task 6). ✔
- `createMockStore`/`testUtils` updated for every new `CircuitStore` member (busComponents + 4 bus actions in Task 2; 4 wiring actions in Task 5; busPlacementMode + 3 placement actions in Task 8) so the `satisfies CircuitStore` literal stays complete. ✔

No naming or signature drift found across tasks.
