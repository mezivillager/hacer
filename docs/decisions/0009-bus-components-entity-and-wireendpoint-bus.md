# 0009. Bus components as a separate entity; `'bus'` WireEndpoint

- **Status:** Accepted
- **Date:** 2026-06-27
- **Deciders:** P05-12a session (bus splitter/joiner)
- **Phase:** Phase 0.5 (0.5.2 — multi-bit buses)

## Context

P05-12 needed visual, wirable bus tooling: a **splitter** (1 N-bit input → N 1-bit outputs) and a **joiner** (N 1-bit inputs → 1 N-bit output). The original ticket modelled these as `GateInstance`s with a `type` discriminator, but that predates the current architecture: gates are identified by `chipName` against a chip registry with **fixed** pin layouts, whereas bus components need **dynamic, width-dependent** pins. Forcing them into the registry or onto `GateInstance` would distort a core abstraction. The codebase already has the right precedent — `inputNodes` / `outputNodes` / `junctions` are separate entity arrays with their own renderer, dynamic per-instance shape, and full lifecycle integration.

P05-12 was split into **12a** (this: entity + simulation + wiring + rendering + placement) and **12b** (thick bus-wire rendering + ×N labels — a later, independent spec).

## Decision

We will model bus components as a **new first-class entity**, not as gates:

1. **Entity & state.** `BusComponent { id, kind: 'splitter' | 'joiner', position, rotation, width, inputs: Pin[], outputs: Pin[], selected }` in a new `busComponents: BusComponent[]` store array, with a `busActions` Immer slice (`placeBusSplitter`/`placeBusJoiner`/`updateBusComponentPosition`/`removeBusComponent`) and a `busPlacementActions` slice — mirroring the node-entity pattern. Pins are generated from `kind`+`width` (`createBusPins`).
2. **Wire connectivity.** `WireEndpointType` gains `'bus'`. Bus pins are wired through the **generalized pin-based path** (a shared `resolveSourceEndpoint`/`createWireFromActiveWiring` core), not a cloned per-source method family — and that core enforces the same guards as gate/node wiring (same-pin-type rejection, self-connection rejection, output→input orientation so `wire.from` is always the signal source).
3. **Simulation.** Bus components are **first-class nodes in the topological sort** (alongside gates) and are evaluated in topological order inside `evaluateCircuit` via pure `busLogic` (`evaluateSplitter`/`evaluateJoiner`, built on the P05-11 `busOps`). Behaviour is preserved when no bus components exist.
4. **Persistence & lifecycle.** Because `'bus'` became a serializable wire endpoint, bus components are **persisted as a first-class entity** (`SerializedBusComponent` in `SerializedCircuit`, serialize/deserialize, with dangling-bus-wire pruning) and integrated into every circuit-lifecycle site (`clearCircuit`, `loadCircuit`, `importCircuitJSON`, autosave change-detection) — exactly where `inputNodes`/`outputNodes`/`junctions` already are.
5. **Geometry & rendering.** `computeBusPinLayout` is the single source of pin layout, consumed by the renderer (`BusSplitter3D`/`BusJoiner3D` under `src/nodes/`) AND by `getPinWorldPosition`/`getPinOrientation` (which fall back to bus resolution on a gate-lookup miss) AND by `deriveWire3DProps`. Bus pins lay out along local Z under an identity transform (rotation `{0,0,0}`), deliberately diverging from `chipBodyLayout`'s local-Y + π/2 convention to keep renderer / pin-resolution / wire-derivation on one transform.

## Consequences

- **Positive.** Dynamic width-dependent pins fit naturally; the fixed chip registry and `GateInstance` are untouched; bus components inherit the node entity's well-trodden lifecycle. The new entity is wirable, simulated, rendered, placed, persisted, and re-routed on drag (with the B-003 no-orphan guard and junction-aware re-route).
- **Negative / cost.** A new `WireEndpointType` member ripples to every endpoint switch. Crucially, **those switches carry a `default`, so a missing `'bus'` case fails silently (wrong value), not at build** — every endpoint switch must be audited by hand when extended. Two review-caught defects came from exactly this class: (a) serialized `'bus'` endpoints without persisting the entity → silent persisted-circuit corruption (fixed: full serialization + pruning); (b) the generalized wiring core initially dropped direction/self guards → backwards/invalid wires (fixed: guards + orientation restored).
- **Explicitly rejected.** Parametric registry chips and extending `GateInstance` (both distort the fixed-pin gate abstraction).
- **Follow-on.** 12b (thick bus wires + ×N labels). A width-picker UI (placement currently defaults to width 16). Multi-bit slice outputs (e.g. 16→2×8) — 12a is 1-bit fan-out/fan-in only. A cross-entity follow-up to add orphaned-arc / junction-`wireIds` cleanup to `removeBusComponent`/`removeInputNode`/`removeOutputNode` (a shared pre-existing gap).

## Affected living docs

- `REPO_MAP.md` — updated (`src/nodes/` bus components; `src/store/actions/busActions`/`busPlacementActions`; "add a bus component" jump-table row).
- `HACER_LLM_GUIDE.md` — updated (bus components noted as the second entity family alongside I/O nodes).
- `docs/decisions/README.md` — index row added.
- `.cursorrules` / roadmap / README — N/A (no phase/stack-rule change; P05-12a is in-phase product work).

## Links

- Spec: `docs/superpowers/specs/2026-06-27-bus-splitter-joiner-design.md`
- Plan: `docs/superpowers/plans/2026-06-27-bus-splitter-joiner.md`
- Related: [[0008-scene-graph-routing-testing-layer]] (the scene-graph render test validates bus pin wiring), P05-11 (`busOps`), B-003 (no-orphan re-route guard).
- Key code: `src/store/types.ts` (`BusComponent`, `WireEndpointType`), `src/store/actions/busActions/`, `src/simulation/busLogic.ts` + `topologicalEval.ts`, `src/components/scene/busBodyLayout.ts`, `src/nodes/BusSplitter3D.tsx`/`BusJoiner3D.tsx`, `src/core/serialization/`.
