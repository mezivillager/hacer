# Bus Splitter / Joiner Components (P05-12a) — Design

- **Date:** 2026-06-27
- **Status:** Design (awaiting approval)
- **Phase:** 0.5.2 (multi-bit buses) — checklist ticket **P05-12**, sub-project **a** (entity + simulation + wiring + rendering)
- **Addresses:** GAP-3D-2 (multi-bit bus tooling). Splits the stale **P05-12** ticket into **12a** (this) and **12b** (thick bus-wire rendering + ×N labels — a separate follow-on spec).
- **Depends on:** P05-11 (`src/simulation/busOps.ts`, `width` on pins/wires — already on `main`); the scene-graph testing layer (`src/test/r3f/`, ADR-0008 — currently on `fix/multi-input-chip-wiring`, used by this work's render tests).
- **Related:** ADR-0008 (scene-graph testing layer), the node-entity pattern (`inputNodes`/`outputNodes`/`junctions`).

## Goal

Give users visual, wirable tools for multi-bit circuits:
- **Bus splitter** — 1 input (N-bit) → N outputs (1-bit each), `out_i = bit i of in`.
- **Bus joiner** — N inputs (1-bit each) → 1 output (N-bit), `out = Σ (in_i << i)`.

After 12a, a splitter/joiner can be **placed** on the canvas, **rendered** with width-dependent pins, **wired** like any other component, and **evaluated** in the live simulation. Bus-wire visual differentiation (thick wires, ×N labels) is explicitly **12b**, not here.

## Why the ticket needed redesign

The P05-12 ticket predates the current architecture. It assumes a `GateType` union and a `type` discriminator on `GateInstance`; neither exists — gates are identified by `chipName` against a chip registry, and `GateInstance` has no `type` field. Its literal code is unusable. This spec designs fresh against current reality, using the **separate-entity** model (the approved decision): bus components are NOT registry chips and NOT `GateInstance`s — they are a new entity type alongside `inputNodes`/`outputNodes`/`junctions`, which is exactly where dynamic, per-instance, width-dependent pins belong.

## Scope decision (approved)

P05-12 → **12a (this spec)** = bus splitter/joiner entity, simulation, wiring, placement, rendering. **12b (separate)** = thick bus-wire rendering + ×N midpoint labels (reads existing `wire.width`; independent and independently shippable). Build 12a first.

## Architecture

Five units, each independently understandable and testable. The guiding principle: **mirror the node-entity pattern** (`inputNodes`/`nodeActions`/`NodeRenderer`) rather than the gate/registry pattern.

### 1. Entity & store state — `src/store/types.ts`
```ts
export type BusComponentKind = 'splitter' | 'joiner'

export interface BusComponent {
  id: string
  kind: BusComponentKind
  position: Position
  rotation: Rotation
  width: number          // bus width N (≥ 2); splitter: 1→N, joiner: N→1
  inputs: Pin[]          // generated from kind+width: splitter [in], joiner [in0..in(N-1)]
  outputs: Pin[]         // splitter [out0..out(N-1)], joiner [out]
  selected: boolean
}
```
- Add `busComponents: BusComponent[]` to `CircuitState` (and to the store-reset shapes used in tests / `createMockStore`).
- Extend `WireEndpointType`: `'gate' | 'input' | 'output' | 'junction' | 'bus'`. A wire endpoint on a bus pin is `{ type: 'bus', entityId, pinId }`.
- The 1-bit pins carry `width: 1`; the N-bit pin carries `width: N` — so the existing `addWire` width inference (`min(source,dest)`) and `topologicalEval` clamping work unchanged.

### 2. Store actions — `src/store/actions/busActions/busActions.ts`
A new slice factory (Immer), surfaced on `circuitActions`, mirroring `nodeActions`:
```ts
interface BusActions {
  placeBusSplitter: (width: number, position: Position) => BusComponent
  placeBusJoiner:  (width: number, position: Position) => BusComponent
  updateBusComponentPosition: (id: string, position: Position) => void  // triggers wire re-route (see §3)
  removeBusComponent: (id: string) => void                              // removes connected wires, like removeInputNode
}
```
- A pure `createBusPins(kind, width)` helper generates the `inputs`/`outputs` arrays with stable, unique pin ids (`in` / `in{i}` / `out` / `out{i}`) and correct per-pin `width`.
- `width` is validated (`≥ 2`, integer); invalid input is a no-op with a `notify.warning` (never throws into the UI).
- `removeBusComponent` also strips wires whose endpoint references the component (parity with `removeInputNode`/`removeOutputNode`).
- `updateBusComponentPosition` re-routes connected wires via the existing `recalculateWiresForNode`-style path generalized to bus endpoints (see §3); a node-drag of a bus component must not orphan its wires (the B-003 guard applies).

### 3. Wiring & geometry integration
Bus pins behave like gate pins (they have a pin id, a type, a world position, an orientation), so the design **generalizes the pin-based wiring path** to accept a `'bus'` endpoint rather than adding a parallel method family:
- **Pin world position / orientation:** add `computeBusPinLayout(component): { pinId, side, position }[]` (the bus analogue of `computeChipLayout`), and make the position/orientation resolvers (`getPinWorldPosition`/`getPinOrientation`, today gate-only) resolve a bus component too. Exact resolver shape (extend the existing functions vs. an entity-aware dispatcher) is settled in the plan; the spec's contract is "a `'bus'` endpoint resolves to a world pin position + orientation."
- **Wire creation:** `startWiring`/`completeWiring` (and the node↔gate variants) learn the `'bus'` source/destination so a bus pin can wire to/from gate pins and I/O nodes. `getSignalSourceValue` learns to read a bus output pin's value. `calculateWirePathFromConnection` already takes generic endpoints + positions, so routing is unchanged once positions resolve.
- **CanvasArea wire endpoint resolution:** `deriveWire3DProps` (the shared helper from ADR-0008) gains a `'bus'` branch so wires to/from bus pins render. This keeps production and the scene-graph test scene on one mapping.

### 4. Simulation — `src/simulation/` (`busLogic.ts` + `topologicalEval.ts`)
Splitter/joiner are combinational and must evaluate in topological order alongside gates:
- `topologicalSort` includes bus components as nodes (edges through their pins), tracing wires the same way it does for gates (junction tracing unchanged).
- A small pure `busLogic.ts`: `evaluateSplitter(inValue, width) → number[]` (bit i via `readSubBus`/`busOps`) and `evaluateJoiner(inValues) → number` (`Σ in_i << i`). Unit-tested in isolation.
- In `evaluateCircuit`, when an ordered node is a bus component: pull its input pin value(s) from incoming wires (same `getSignalSourceValue` + `clampToWidth` path as gates), apply the bus logic, write output pin value(s). Output pins then feed downstream via the existing wire propagation.

### 5. Rendering — `src/nodes/` (`BusSplitter3D.tsx`, `BusJoiner3D.tsx`, dispatch)
Bus components are entities, so they render under `src/nodes/` (like `InputNode3D`), not `src/gates/`:
- `BusSplitter3D` / `BusJoiner3D`: a body whose height scales with `width`, a label (`SPLIT ×N` / `JOIN ×N`), and **dynamically laid-out pins** from `computeBusPinLayout` (1 pin one side, N pins the other, evenly spaced). Pins are clickable for wiring (reuse the node pin-click handler pattern).
- A `BusComponentRenderer` dispatches on `kind`; `CanvasArea` maps `busComponents → BusComponentRenderer` (next to the `inputNodes.map(...)` block).
- React-Compiler-clean: pin layout computed inline/pure, no `useMemo`/`useCallback`.

### 6. Placement flow
Mirror node placement (`nodePlacementMode` → `startNodePlacement`/`placeNode`):
- A `busPlacementMode: BusComponentKind | null` (+ `startBusPlacement(kind)`, `placeBusComponent(position)`, `cancelBusPlacement`), or reuse the generic placement state if a clean fit exists — decided in the plan.
- A toolbar entry to start splitter/joiner placement. **Width selection:** default **16** for the first slice (the common nand2tetris case); a width picker UI is a noted follow-up, not 12a. The `placeBusSplitter/Joiner` actions already take `width`, so the picker is additive later.

## Data flow

```
toolbar → startBusPlacement(kind) → click canvas → placeBusComponent(pos)
   → busActions.placeBusSplitter/Joiner(width,pos)  [creates entity with width-derived pins]
   → wire bus pins to gates/nodes (startWiring/completeWiring with 'bus' endpoints)
   → simulationTick → evaluateCircuit: topo order incl. bus nodes → busLogic split/join
   → output pin values propagate along wires → downstream gates / output nodes
   → BusComponentRenderer renders body + dynamic pins; wires render via deriveWire3DProps('bus')
```

## Testing strategy

- **Unit (Vitest):** `busLogic.test.ts` — `evaluateSplitter`/`evaluateJoiner` truth/value tables (e.g. split `0b1011`/width 4 → `[1,1,0,1]`; join `[1,1,0,1]` → `0b1011`); edge widths.
- **Store (Vitest):** `busActions.test.ts` — `placeBusSplitter(16,…)` → 1 input + 16 outputs with correct ids/widths; `placeBusJoiner(8,…)` → 8 inputs + 1 output; appears in `busComponents`; `removeBusComponent` strips connected wires; invalid width is a no-op.
- **Simulation (Vitest):** seed a splitter/joiner wired to I/O nodes, run `evaluateCircuit`, assert downstream values (round-trip: input bus → splitter → joiner → output equals input).
- **Scene-graph (Vitest, the ADR-0008 layer):** render a circuit containing a splitter; assert every dynamic output pin gets a rendered, connected wire (real use of the new harness beyond its own suite — splitter pins are the densest dynamic-pin case yet).
- **Store E2E (Playwright):** placement + wiring of a splitter via `window.__CIRCUIT_ACTIONS__`, mirroring existing node-placement specs.

## Error handling & determinism

- Invalid `width` (< 2 / non-integer): no-op + `notify.warning`; never throw to the render path.
- A bus component with unconnected input pins evaluates with those pins at their default (0), like gates — no crash.
- All float/geometry comparisons reuse the router tolerance (0.001). No new nondeterminism (no time/random in logic).

## Out of scope (YAGNI / deferred)

- **12b**: thick bus-wire rendering + ×N labels (separate spec).
- Width-picker UI (default 16 for now; actions already parameterized).
- Sub-bus *wiring* UI / arbitrary bit-slice selection — that's an HDL-compiler concern (P05-16), not a visual component.
- Multi-bit splitter outputs wider than 1 bit (e.g. 16→2×8); 12a is 1-bit fan-out/fan-in only.

## Risks & mitigations

| Risk | Mitigation |
|------|-----------|
| `WireEndpointType` extension ripples through wiring/sim/geometry switches | Enumerate every `WireEndpointType`/`from.type` switch in the plan; add the `'bus'` case to each (TS exhaustiveness will surface misses at build). |
| Wiring action surface is per-type and large | Generalize the pin-based path to accept `'bus'` rather than cloning the node method family; settle exact resolver shape in the plan. |
| Topological sort currently keyed on gates | Include bus components as first-class ordered nodes; reuse junction-tracing; cover with the round-trip simulation test. |
| Dynamic pin layout under React Compiler | Pure inline layout (`computeBusPinLayout`), no memo hooks; scene-graph test asserts rendered pin/wire positions. |
| Base branch: scene-graph layer not yet on `main` | Stack 12a off `fix/multi-input-chip-wiring`; rebase onto `main` after PR #128 merges. |

## Definition of done (12a)

- `busComponents` entity + `busActions` (+ `circuitStore`/`circuitActions` wiring) in place; `WireEndpointType` extended with `'bus'`.
- Splitter/joiner: placeable (toolbar + placement flow), wirable (to/from gates and I/O nodes), and evaluated live (round-trip correct).
- `BusSplitter3D`/`BusJoiner3D` + dispatch render with width-dynamic pins.
- Tests green: bus logic unit, store actions, simulation round-trip, scene-graph splitter-pin render, store E2E placement.
- Full DoD: `pnpm run lint` · `pnpm run test:run` · `pnpm run test:e2e:store` · `pnpm run build` all exit 0.
- ADR if a material architectural decision emerges (e.g. the `WireEndpointType` extension / wiring generalization); living docs (`REPO_MAP.md`, `HACER_LLM_GUIDE.md`) updated via docs-sync.
