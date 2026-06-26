# Scene-Graph Routing Testing Layer — Design

- **Date:** 2026-06-21
- **Status:** Design (awaiting approval)
- **Phase:** 0.5 (cross-cutting test infrastructure; routing-engine foundation)
- **Related:** [ADR-0007](../../decisions/0007-wire-routing-engine-direction.md) (wire-routing engine direction), B-003/B-004/B-004a (observed-bugs.md), PR #128.

## Goal

Add a **fast, deterministic, GPU-free scene-graph testing layer** to HACER using
`@react-three/test-renderer`, and build a **core routing test suite** on it that
asserts wires *render* where the router computes them — for real circuits with real
chips. This (a) hardens the B-003/B-004/B-004a fix at the render level, (b) gives an
overlap oracle that can surface *new* routing bugs, and (c) becomes a permanent
Definition-of-Done enforcer for every later routing-engine stage (ADR-0007 Stages 2–4).

## Why this layer is missing today

HACER's 3D component tests are **smoke tests only**. `src/components/canvas/Wire3D.test.tsx`
states the reason verbatim: *"R3F components require Canvas context and React Compiler
uses useMemoCache which requires proper React runtime context. Full rendering tests are
covered in E2E tests with proper Canvas setup."* But the E2E tests (`@store` Playwright
specs) assert **store state**, not rendered geometry, and `@ui` specs assert DOM. So
**nothing verifies that computed routing geometry actually renders at those coordinates.**
The data-layer routing tests are strong (they caught nothing about render), and the bug we
just fixed proved a fix can pass 1490 unit tests while a render-level merge hole remained
until adversarial review. `@react-three/test-renderer` (pmndrs, the R3F authors) is a real
R3F reconciler with **no canvas/WebGL/GPU** — it renders the R3F tree to an inspectable
three.js scene graph in Node, which is exactly the `<Canvas>`-context capability the comment
says is missing. It pairs with `@react-three/fiber@9` / React 19 (HACER's stack).

## Scope decision (approved)

**Hybrid, spike-gated.** All tests use **real chips** with real pin layouts/rotations
(pin positions from the production `getPinWorldPosition`). Routing assertions are made on
**rendered wire geometry**. Gate 3D meshes are *also* rendered in the cases where a Task-1
spike proves gate components render cleanly under test-renderer; where they don't (e.g. a
`useFrame`/drag/`<Html>` path misbehaves headlessly), those cases degrade to wires-only and
assert endpoints against `getPinWorldPosition`. The spike's outcome is recorded in the plan
and parameterizes `renderCircuitScene({ gates })`.

## Architecture

Three units, each independently understandable and testable:

### 1. Render harness — `src/test/r3f/renderCircuitScene.tsx`
```ts
interface SceneTestHandle {
  renderer: ReactThreeTestRenderer        // for advanceFrames/unmount
  scene: THREE.Scene                       // renderer.scene.instance (real three graph)
  unmount: () => Promise<void>
}
// Renders the CURRENT useCircuitStore circuit (wires, and gates when enabled) using the
// real Wire3D / GateRenderer components. Async (test-renderer create is async).
function renderCircuitScene(options?: { gates?: boolean; wires?: boolean }): Promise<SceneTestHandle>
```
- Internally renders a small `TestScene` component that reads `useCircuitStore` and maps
  `wires → <Wire3D>` (and, when `gates`, `gates → <GateRenderer>`), using the **same
  per-wire prop derivation as production** `CanvasArea`. To prevent drift, extract
  CanvasArea's inline wire→props mapping into a pure helper
  `deriveWire3DProps(wire, state): { start, end, precomputedPath }` and consume it in BOTH
  CanvasArea and TestScene (targeted, in-scope refactor — no behavior change, covered by the
  new tests + existing ones).
- `TestScene` deliberately omits OrbitControls / grid / post-processing / lighting that the
  routing assertions don't need, keeping the render minimal and robust. Gate rendering is
  behind the `gates` flag for the hybrid degrade path.

### 2. Geometry extraction + oracle — `src/test/r3f/wireGeometry.ts`
```ts
interface RenderedWire { segments: { points: Vector3[] }[]; polyline: Vector3[] }
function getRenderedWirePolylines(handle: SceneTestHandle): RenderedWire[]
function getWireEndpoints(w: RenderedWire): { start: Vector3; end: Vector3 }
// Reusable invariant enforcer — analytic, over RENDERED points (no pixels):
function expectNoWireOverlaps(handle: SceneTestHandle, opts?: { tolerance?: number }): void
function expectWireConnects(w: RenderedWire, start: Position, end: Position, tol?: number): void
```
- `getRenderedWirePolylines` walks `handle.scene` for the line objects Wire3D produces (one
  drei `<Line>` per segment) and reads their world-space points. The **read mechanism is
  resolved by the Task-1 spike** — preferred order: (a) read line geometry position
  attributes; (b) if drei's `Line2` buffers are impractical, read the `points` prop off the
  test instances; (c) last resort, have Wire3D tag each line with `userData={{ segmentIndex,
  type }}` (a tiny, render-inert production touch) to make the walk unambiguous. The chosen
  mechanism is documented in the harness.
- `expectNoWireOverlaps` flags any two **distinct** wires sharing a collinear track over an
  overlapping range, reusing the pure `coordinateRangesOverlap` from `wiringScheme/overlap`
  for the range math. Error message names both wires, the axis/coordinate, and the range —
  so a failure is immediately diagnosable. This is the general routing invariant and the
  primary tool for surfacing new bugs.

### 3. Core routing suite — `src/components/canvas/routingScene.test.tsx` (+ split if it grows)
Built entirely on units 1 & 2. See "Test cases" below.

## Data flow

```
seed store (circuitActions.addGate/addInputNode/...) with REAL chips
   → wire pins the way the app does (real routing: calculateWirePathFromConnection → addWire)
   → renderCircuitScene()  [test-renderer → three.js scene, no GPU]
   → getRenderedWirePolylines()  [walk scene → world points]
   → assert: connectivity to real pin positions • expectNoWireOverlaps • scenario invariants
```
Tests build wires through the **same routing computation the production app uses**, so the
suite tests real routing end-to-end through the render — not hand-fed coordinates.

## Test cases (core / critical)

1. **Render contract (foundation).** A wire with a known N-segment path renders N lines;
   each rendered segment's endpoints equal the computed segment endpoints (proves the read
   mechanism; gates off).
2. **Connectivity, real gates.** Two real gates (e.g. `And` → `Nand`) wired via real
   routing; the rendered wire starts at the source pin's world position and ends at the
   destination pin's, within tolerance.
3. **B-004 — dense multi-input chip.** `Mux4Way16` with all input pins wired from distinct
   sources: every input wire renders, each reaches its own pin, and `expectNoWireOverlaps`
   passes (distinct lanes at the render level). A `Mux8Way16` (9 inputs) variant.
4. **B-004a / CASE1 + transit-vs-transit.** A chip fan-in backbone plus a transit wire:
   the rendered transit run is **off** the backbone track; and two transit wires that hash
   to the same lane render on **distinct** tracks (the exact regression we fixed, now
   enforced on rendered geometry).
5. **B-003 — node-drag re-route.** An input node wired to an inner pin; move the node;
   the wire still renders (not orphaned/empty) and now connects the node's new position to
   the pin.
6. **Broad overlap sweep.** A moderately complex mixed circuit; `expectNoWireOverlaps`
   passes — the net for *uncovering new bugs*. If it fails, that is a discovery, logged to
   observed-bugs.md.

## Robustness, determinism, error handling

- **No pixels, no GPU, no network** → deterministic across machines/CI. test-renderer
  `create` is awaited; `advanceFrames()` only if a rendered gate path needs a frame tick.
- Float compares use a shared `TOLERANCE` (0.001, matching the router).
- Each test seeds and resets the store via the existing `beforeEach` reset pattern;
  `handle.unmount()` in `afterEach` to release the renderer.
- Harness throws **descriptive** failures (which wire, which track, which range), so the
  suite is diagnostic, not just red/green.

## Dependency & CI integration

- Add `@react-three/test-renderer` (matching the installed `@react-three/fiber` v9 major)
  as a **devDependency**; verify it resolves against React 19 before building on it (part of
  the spike).
- The suite runs inside the existing `vitest` (`pnpm run test:run`) — so it is **automatically
  part of the Definition of Done** and gates every commit, including all future routing
  stages. No new CI wiring needed.

## Out of scope (YAGNI)

- Pixel/screenshot/visual-regression testing and any "looks nice/aesthetics" assertions —
  explicitly not wanted; the value is *geometry correctness*, not appearance.
- Testing non-routing 3D (gate visuals, lighting, controls, labels).
- The Stage 2/3 router rewrite (this is its test foundation, not the rewrite).

## Risks & mitigations

| Risk | Mitigation |
|------|-----------|
| Can't read drei `<Line>`/`Line2` coordinates back | Task-1 spike resolves the read path (geometry attrs → instance props → `userData` tag). Go/no-go before suite. |
| Gate components fragile under test-renderer (`useFrame`/drag/`<Html>`) | Hybrid degrade: render wires-only for those, assert vs `getPinWorldPosition`. |
| TestScene drifts from production CanvasArea | Extract shared pure `deriveWire3DProps`; both consume it. |
| `@react-three/test-renderer` React-19 compat | Verify install/import in the spike before committing to it. |

## Definition of done for this work

- `@react-three/test-renderer` added; harness (`renderCircuitScene`, `wireGeometry`) in place.
- All 6 core test cases implemented and green (TDD; spike first).
- Full DoD green: `pnpm run lint` · `pnpm run test:run` · `pnpm run test:e2e:store` · `pnpm run build`.
- Any new bug surfaced by the overlap sweep is logged to `observed-bugs.md`.
- An ADR records the scene-graph testing layer as the routing enforcer (docs-sync).
