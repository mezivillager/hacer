# Scene-Graph Routing Testing Layer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a fast, deterministic, GPU-free scene-graph testing layer (via `@react-three/test-renderer`) and a core routing test suite that asserts wires *render* where the router computes them, for real circuits with real chips.

**Architecture:** Three reusable units plus one shared extraction. (1) A render harness (`renderCircuitScene` + a minimal `TestScene`) renders the live `useCircuitStore` circuit through the **production** `Wire3D` component into an inspectable three.js scene graph — no canvas/WebGL. (2) A geometry layer (`linePoints` read primitive + `wireGeometry` extraction/oracle) walks that scene graph back to world-space polylines and provides invariant enforcers (`expectWireConnects`, `expectNoWireOverlaps`). (3) A core suite (`routingScene.test.tsx`) seeds the store with real chips, wires them through the **same routing computation the app uses**, renders, and asserts. To stop `TestScene` drifting from production `CanvasArea`, the inline wire→props mapping is extracted into a pure `deriveWire3DProps` consumed by both.

**Tech Stack:** React 19.2.6 + React Compiler, TypeScript 5.9 (strict), Zustand (+Immer), React Three Fiber v9.4.2, `@react-three/drei` v10, three 0.184, Vitest (jsdom), pnpm 10.x.

## Global Constraints

- **Node ≥ 22; pnpm 10.x.** Run everything from inside `hacer-wt-scene-graph-testing/` (the worktree).
- **devDependency floor:** `@react-three/test-renderer@^9` — MUST match the installed `@react-three/fiber` major (`^9.4.2`). Add to `devDependencies`, not `dependencies`.
- **React Compiler is ON** — do NOT add `useMemo`/`useCallback`/`React.memo`. The only sanctioned `useMemo` is for Three.js geometry/material objects. ESLint enforces this and `pnpm run lint` will fail otherwise.
- **State access:** production code reads via narrow selectors `useCircuitStore(s => s.x)` and mutates ONLY via `circuitActions.*`. In TEST code, the established pattern (see `src/store/actions/wireActions/wireActions.test.ts`) is allowed and expected: `useCircuitStore.setState({ ... })` to reset, and `useCircuitStore.getState().<action>(...)` to seed. Never use Valtio.
- **User feedback** in production uses `notify` from `@/lib/notify`; never `console.log`/`alert`. (Tests do not call `notify`.)
- **`@/` alias maps to `src/`.** Harness/helpers live under `src/test/r3f/`; the suite lives at `src/components/canvas/routingScene.test.tsx` (colocated with the components it exercises).
- **TDD is the iron law** — failing test first, watch it fail for the right reason, then minimal implementation, watch it pass, then commit.
- **Float comparisons** use tolerance `0.001` (the router's `TOLERANCE`, exported context `TRANSIT_LANE_PITCH = 0.06` etc. live in `@/utils/wiringScheme/types`).
- **Commits:** conventional-commit format (`feat:`/`test:`/`refactor:`/`docs:`/`chore:`) — the repo uses semantic-release. **NO AI attribution** (no `Co-Authored-By`, no "Generated with Claude"). **Never commit to `main`.** **Never** use `--no-verify`.
- **Definition of Done (all must exit 0):** `pnpm run lint` · `pnpm run test:run` · `pnpm run test:e2e:store` · `pnpm run build`.
- **Spec:** `docs/superpowers/specs/2026-06-21-scene-graph-routing-testing-design.md` (this plan implements it).

---

## File Structure

| Path | Responsibility | Created in |
|------|----------------|-----------|
| `src/test/r3f/linePoints.ts` | Lowest-level read primitive: detect a rendered drei `<Line>` (`isRenderedLine`) and read its world-space points back (`readLinePoints`). The single place that knows the `LineGeometry` buffer layout. | Task 1 (spike) |
| `src/test/r3f/linePoints.test.tsx` | Proves the read primitive against a known drei `<Line>` rendered via test-renderer; gate-stability probe. | Task 1 |
| `src/components/canvas/deriveWire3DProps.ts` | Pure `(wire, state) → { start, end, precomputedPath }`. Single source of truth for wire→Wire3D geometry props, consumed by `CanvasArea` AND `TestScene`. | Task 2 |
| `src/components/canvas/deriveWire3DProps.test.ts` | Unit test for the extraction. | Task 2 |
| `src/components/canvas/CanvasArea.tsx` (modify) | Consume `deriveWire3DProps` instead of the inline block (behavior-preserving). | Task 2 |
| `src/test/r3f/seedCircuit.ts` | Test seeding helpers: `resetCircuitStore`, `wireGatePins` (gate↔gate via real routing), later `wireInputNodeToPin`. | Task 3 (extended Task 7) |
| `src/test/r3f/TestScene.tsx` | Minimal R3F scene: maps store wires → `<group userData={{hacerWire,wireId}}><Wire3D/></group>` (and gates behind a flag). | Task 3 |
| `src/test/r3f/renderCircuitScene.tsx` | `renderCircuitScene(options) → SceneTestHandle`; exports `GATES_RENDER_UNDER_TEST`. | Task 3 |
| `src/test/r3f/wireGeometry.ts` | `getRenderedWirePolylines`, `getWireEndpoints` (Task 3/4), `expectWireConnects` (Task 4), `expectNoWireOverlaps` (Task 5). | Tasks 3–5 |
| `src/components/canvas/routingScene.test.tsx` | The 6 core routing test cases. | Tasks 3–8 |
| `docs/decisions/NNNN-scene-graph-routing-testing-layer.md` | ADR recording the layer as the routing DoD enforcer. | Task 9 |
| `docs/development/observed-bugs.md` (modify, only if sweep finds a bug) | Log any new bug surfaced by the overlap sweep. | Task 8 |

---

## Task 1: Spike — read mechanism + gate-stability probe (go/no-go)

**This is a spike.** Its job is to prove, empirically and against React 19, that test-renderer can (a) render the production `Wire3D`/drei `<Line>` headlessly and (b) let us read the rendered world points back — and to decide whether real gate meshes render cleanly. It is TDD-shaped: the read primitive has a failing test that goes green only when the buffer indexing is correct. Everything downstream consumes the *interface* this task produces, not its internals — so a different read mechanism here does not ripple into later tasks.

**Files:**
- Modify: `package.json` (add devDependency)
- Create: `src/test/r3f/linePoints.ts`
- Test: `src/test/r3f/linePoints.test.tsx`

**Interfaces:**
- Consumes: production `Wire3D` (`@/components/canvas/Wire3D`), `GateRenderer` (`@/gates`), the real store (`@/store/circuitStore`), `@react-three/drei`'s `Line`.
- Produces:
  - `isRenderedLine(obj: Object3D): boolean` — true for a three object that is a rendered drei `<Line>` (has a `LineGeometry` with an `instanceStart` attribute).
  - `readLinePoints(obj: Object3D): Vector3[]` — world-space polyline points of that line, in order.
  - `GATES_RENDER_UNDER_TEST` decision (recorded as a header comment in `linePoints.ts` and applied as the default in Task 3's `renderCircuitScene`).

- [ ] **Step 1: Add the devDependency**

```bash
pnpm add -D @react-three/test-renderer@^9
```

Verify it resolved against fiber 9 / React 19:

```bash
pnpm ls @react-three/test-renderer @react-three/fiber react
```
Expected: `@react-three/test-renderer` shows a `9.x` version and installs without peer-dep errors. If it fails to resolve against React 19, STOP and report — this is the go/no-go gate.

- [ ] **Step 2: Write the failing read-primitive test**

Create `src/test/r3f/linePoints.test.tsx`:

```tsx
import { describe, it, expect } from 'vitest'
import { Vector3 } from 'three'
import ReactThreeTestRenderer from '@react-three/test-renderer'
import { Line } from '@react-three/drei'
import { isRenderedLine, readLinePoints } from './linePoints'

describe('linePoints read primitive', () => {
  it('reads back the exact world points of a straight drei <Line>', async () => {
    const pts: [number, number, number][] = [
      [-2, 0.2, 0],
      [-2, 0.2, 3],
      [1, 0.2, 3],
    ]
    const renderer = await ReactThreeTestRenderer.create(<Line points={pts} />)
    const scene = renderer.scene.instance

    const lines: import('three').Object3D[] = []
    scene.traverse((o) => {
      if (isRenderedLine(o)) lines.push(o)
    })
    expect(lines).toHaveLength(1)

    const read = readLinePoints(lines[0])
    expect(read).toHaveLength(pts.length)
    read.forEach((v, i) => {
      expect(v.x).toBeCloseTo(pts[i][0], 3)
      expect(v.y).toBeCloseTo(pts[i][1], 3)
      expect(v.z).toBeCloseTo(pts[i][2], 3)
    })

    await renderer.unmount()
  })
})
```

- [ ] **Step 3: Run it to confirm it fails**

Run: `pnpm exec vitest run src/test/r3f/linePoints.test.tsx`
Expected: FAIL — module `./linePoints` not found (or the import errors). This also confirms test-renderer imports and renders a drei `<Line>` under React 19; if it throws on `create` for any reason other than the missing module, investigate that first (go/no-go).

- [ ] **Step 4: Implement the read primitive**

Create `src/test/r3f/linePoints.ts`:

```ts
// SPIKE OUTCOME (Task 1): drei <Line> renders cleanly under @react-three/test-renderer
// on React 19. Its underlying THREE object is a Line2 whose geometry is a
// LineGeometry; the polyline is stored in the interleaved `instanceStart`/
// `instanceEnd` buffer (stride 6: [startXYZ, endXYZ] per sub-segment). We read the
// polyline from that one shared interleaved array: point0 = first start, then each
// segment's end. See GATES_RENDER_UNDER_TEST note recorded by Step 6.
import { Vector3 } from 'three'
import type { Object3D } from 'three'

interface LineLike extends Object3D {
  geometry?: {
    attributes?: {
      instanceStart?: { data: { array: ArrayLike<number> } }
    }
  }
}

/** True for a rendered drei <Line> (a Line2 backed by a LineGeometry). */
export function isRenderedLine(obj: Object3D): boolean {
  const g = (obj as LineLike).geometry
  return !!g?.attributes?.instanceStart?.data?.array
}

/** Read a rendered drei <Line>'s world-space polyline points, in order. */
export function readLinePoints(obj: Object3D): Vector3[] {
  const g = (obj as LineLike).geometry
  const arr = g?.attributes?.instanceStart?.data?.array
  if (!arr) return []
  const segCount = Math.floor(arr.length / 6)
  const points: Vector3[] = []
  if (segCount > 0) {
    points.push(new Vector3(arr[0], arr[1], arr[2]))
    for (let k = 0; k < segCount; k++) {
      points.push(new Vector3(arr[k * 6 + 3], arr[k * 6 + 4], arr[k * 6 + 5]))
    }
  }
  return points
}
```

- [ ] **Step 5: Run the test until green**

Run: `pnpm exec vitest run src/test/r3f/linePoints.test.tsx`
Expected: PASS. If the read points are off (wrong stride/offset), this is the spike's core work: inspect the actual `geometry.attributes` of `lines[0]` (e.g. temporarily `console.log(Object.keys(g.attributes))` and the array contents) and correct `readLinePoints`/`isRenderedLine` to match the real buffer layout. The test passing IS the proof the indexing is right.

- [ ] **Step 6: Gate-stability probe + record `GATES_RENDER_UNDER_TEST`**

Append a second test to `src/test/r3f/linePoints.test.tsx` that probes whether a real gate mesh renders headlessly:

```tsx
import { describe as describe2, it as it2 } from 'vitest' // (reuse existing imports; no second import needed)
```

Add inside the existing file (reusing the existing `describe`/`it` imports):

```tsx
import { useCircuitStore } from '@/store/circuitStore'
import { GateRenderer } from '@/gates'

describe('gate-stability probe (informational)', () => {
  it('records whether a real GateRenderer renders headlessly', async () => {
    useCircuitStore.setState({ gates: [], wires: [], inputNodes: [], outputNodes: [], junctions: [] })
    const gate = useCircuitStore.getState().addGate('And', { x: 0, y: 0, z: 0 })
    let renderedClean = false
    try {
      const renderer = await ReactThreeTestRenderer.create(
        <GateRenderer
          gate={gate}
          isWiring={false}
          isPinConnected={() => false}
          onClick={() => {}}
          onPinClick={() => {}}
          onInputToggle={() => {}}
        />,
      )
      renderedClean = !!renderer.scene.instance
      await renderer.unmount()
    } catch {
      renderedClean = false
    }
    // This test never fails; it documents the spike outcome for the harness default.
    expect(typeof renderedClean).toBe('boolean')
    // eslint-disable-next-line no-console -- spike-only diagnostic, removed is fine
    console.info('[spike] GateRenderer renders headlessly:', renderedClean)
  })
})
```

Run: `pnpm exec vitest run src/test/r3f/linePoints.test.tsx`
Expected: PASS, with `[spike] GateRenderer renders headlessly: <true|false>` printed.

Then record the outcome in the header comment of `linePoints.ts` (replace the trailing sentence): `GATES_RENDER_UNDER_TEST = true` if the probe printed `true`, else `false`. Task 3 reads this decision. (The core routing assertions resolve pin positions from the store via `getPinWorldPosition` and do **not** require gate meshes to render; gate rendering is a realism nicety gated here.)

- [ ] **Step 7: Remove the spike-only diagnostic and commit**

Delete the `gate-stability probe` `describe` block's `console.info` line (or the whole probe block if you prefer — the decision is now captured in the comment). Keep the read-primitive test.

Run: `pnpm exec vitest run src/test/r3f/linePoints.test.tsx` (Expected: PASS) and `pnpm run lint` (Expected: exit 0).

```bash
git add package.json pnpm-lock.yaml src/test/r3f/linePoints.ts src/test/r3f/linePoints.test.tsx
git commit -m "test: add scene-graph line-read primitive and resolve test-renderer spike"
```

---

## Task 2: Extract `deriveWire3DProps` (shared by CanvasArea + TestScene)

A behavior-preserving refactor: pull `CanvasArea`'s inline wire→`{start,end,precomputedPath}` mapping (currently `CanvasArea.tsx:97-143`) into a pure function so `TestScene` (Task 3) consumes the exact same computation. No routing behavior changes.

**Files:**
- Create: `src/components/canvas/deriveWire3DProps.ts`
- Test: `src/components/canvas/deriveWire3DProps.test.ts`
- Modify: `src/components/canvas/CanvasArea.tsx`

**Interfaces:**
- Consumes: `CircuitStore`/`Wire`/`Position` (`@/store/types`), `WirePath`/`WireSegment` (`@/utils/wiringScheme/types`), `calculateNodePinPosition` (`@/nodes/config`).
- Produces: `deriveWire3DProps(wire: Wire, state: CircuitStore): { start: Position | null; end: Position | null; precomputedPath: WirePath }`.

- [ ] **Step 1: Write the failing test**

Create `src/components/canvas/deriveWire3DProps.test.ts`:

```ts
import { describe, it, expect, beforeEach } from 'vitest'
import { useCircuitStore } from '@/store/circuitStore'
import { deriveWire3DProps } from './deriveWire3DProps'

const getState = () => useCircuitStore.getState()

describe('deriveWire3DProps', () => {
  beforeEach(() => {
    useCircuitStore.setState({ gates: [], wires: [], inputNodes: [], outputNodes: [], junctions: [] })
  })

  it('resolves gate→gate endpoints to the real pin world positions', () => {
    const g1 = getState().addGate('And', { x: 0, y: 0, z: 0 })
    const g2 = getState().addGate('And', { x: 6, y: 0, z: 0 })
    const fromPin = g1.outputs[0].id
    const toPin = g2.inputs[0].id

    const wire = getState().addWire(
      { type: 'gate', entityId: g1.id, pinId: fromPin },
      { type: 'gate', entityId: g2.id, pinId: toPin },
      [
        { start: { x: 1, y: 0.2, z: 0 }, end: { x: 5, y: 0.2, z: 0 }, type: 'horizontal' },
      ],
    )

    const { start, end, precomputedPath } = deriveWire3DProps(wire, getState())
    const expectedStart = getState().getPinWorldPosition(g1.id, fromPin)
    const expectedEnd = getState().getPinWorldPosition(g2.id, toPin)

    expect(start).toEqual(expectedStart)
    expect(end).toEqual(expectedEnd)
    expect(precomputedPath.segments).toBe(wire.segments)
    expect(precomputedPath.totalLength).toBeCloseTo(4, 3)
  })

  it('resolves an input-node source endpoint to the node pin offset', () => {
    const node = getState().addInputNode('a', { x: -6, y: 0, z: 0 })
    const g = getState().addGate('Not', { x: 0, y: 0, z: 0 })
    const wire = getState().addWire(
      { type: 'input', entityId: node.id },
      { type: 'gate', entityId: g.id, pinId: g.inputs[0].id },
      [{ start: { x: -5, y: 0.2, z: 0 }, end: { x: -1, y: 0.2, z: 0 }, type: 'horizontal' }],
    )
    const { start } = deriveWire3DProps(wire, getState())
    expect(start).not.toBeNull()
    expect(start!.y).toBeCloseTo(0.2, 3)
    // x is node.x + positive pin offset (input node pin is on the right)
    expect(start!.x).toBeGreaterThan(node.position.x)
  })
})
```

- [ ] **Step 2: Run it to verify it fails**

Run: `pnpm exec vitest run src/components/canvas/deriveWire3DProps.test.ts`
Expected: FAIL — `Cannot find module './deriveWire3DProps'`.

- [ ] **Step 3: Implement `deriveWire3DProps`**

Create `src/components/canvas/deriveWire3DProps.ts`:

```ts
import type { CircuitStore, Wire, Position } from '@/store/types'
import type { WirePath } from '@/utils/wiringScheme/types'
import { calculateNodePinPosition } from '@/nodes/config'

export interface DerivedWire3DProps {
  start: Position | null
  end: Position | null
  precomputedPath: WirePath
}

/**
 * Pure wire → Wire3D geometry props. Single source of truth shared by the
 * production CanvasArea and the test-only TestScene so the two cannot drift.
 * Resolves gate endpoints via getPinWorldPosition and node/junction endpoints
 * via their stored positions (matching CanvasArea's prior inline mapping).
 */
export function deriveWire3DProps(wire: Wire, state: CircuitStore): DerivedWire3DProps {
  const precomputedPath: WirePath = {
    segments: wire.segments,
    totalLength: wire.segments.reduce((sum, seg) => {
      const dx = seg.end.x - seg.start.x
      const dy = seg.end.y - seg.start.y
      const dz = seg.end.z - seg.start.z
      return sum + Math.sqrt(dx * dx + dy * dy + dz * dz)
    }, 0),
  }

  let start: Position | null = null
  if (wire.from.type === 'gate' && wire.from.pinId) {
    start = state.getPinWorldPosition(wire.from.entityId, wire.from.pinId)
  } else if (wire.from.type === 'input') {
    const node = state.inputNodes.find((n) => n.id === wire.from.entityId)
    if (node) {
      const off = calculateNodePinPosition('input')
      start = { x: node.position.x + off.x, y: 0.2, z: node.position.z + off.z }
    }
  } else if (wire.from.type === 'junction') {
    const j = state.junctions.find((j) => j.id === wire.from.entityId)
    if (j) start = { ...j.position, y: 0.2 }
  }

  let end: Position | null = null
  if (wire.to.type === 'gate' && wire.to.pinId) {
    end = state.getPinWorldPosition(wire.to.entityId, wire.to.pinId)
  } else if (wire.to.type === 'output') {
    const node = state.outputNodes.find((n) => n.id === wire.to.entityId)
    if (node) {
      const off = calculateNodePinPosition('output')
      end = { x: node.position.x + off.x, y: 0.2, z: node.position.z + off.z }
    }
  } else if (wire.to.type === 'junction') {
    const j = state.junctions.find((j) => j.id === wire.to.entityId)
    if (j) end = { ...j.position, y: 0.2 }
  }

  return { start, end, precomputedPath }
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `pnpm exec vitest run src/components/canvas/deriveWire3DProps.test.ts`
Expected: PASS.

- [ ] **Step 5: Refactor CanvasArea to consume it (behavior-preserving)**

In `src/components/canvas/CanvasArea.tsx`, add the import near the other imports:

```ts
import { deriveWire3DProps } from './deriveWire3DProps'
```

Replace the body of the `wires.map((wire) => { ... })` callback's path/start/end computation (the block currently spanning the `// Build precomputed path...` comment through the `endPos` assignments, `CanvasArea.tsx:97-136`) with:

```ts
          const { start: startPos, end: endPos, precomputedPath: path } = deriveWire3DProps(
            wire,
            useCircuitStore.getState(),
          )
```

Leave the `signalValue` computation (line 95) and the `<Wire3D ... />` return (lines 138-147) unchanged — they still read `signalValue`, `startPos`, `endPos`, `path`, `selectedWireId`. Remove the now-unused `calculateNodePinPosition` import from `CanvasArea.tsx` ONLY if no other code in the file uses it (it is used by node rendering below — verify with a search; if still used, leave the import).

- [ ] **Step 6: Verify no regression**

Run: `pnpm run lint` (Expected: exit 0 — no unused imports, no manual-memo violations) and `pnpm run test:run` (Expected: all pass; the existing suite covers CanvasArea's consumers and the new `deriveWire3DProps` test covers the extraction).

- [ ] **Step 7: Commit**

```bash
git add src/components/canvas/deriveWire3DProps.ts src/components/canvas/deriveWire3DProps.test.ts src/components/canvas/CanvasArea.tsx
git commit -m "refactor: extract deriveWire3DProps shared by CanvasArea and scene tests"
```

---

## Task 3: Render harness + `getRenderedWirePolylines` + render-contract test (case 1)

Build the harness (`TestScene` + `renderCircuitScene`), the polyline extractor, and the test seeding helpers. Prove it all with the **render-contract** case: a wire with a known N-segment path renders N lines whose endpoints equal the computed segment endpoints.

**Files:**
- Create: `src/test/r3f/seedCircuit.ts`
- Create: `src/test/r3f/TestScene.tsx`
- Create: `src/test/r3f/renderCircuitScene.tsx`
- Create: `src/test/r3f/wireGeometry.ts`
- Create: `src/components/canvas/routingScene.test.tsx`

**Interfaces:**
- Consumes: `isRenderedLine`/`readLinePoints` (Task 1), `deriveWire3DProps` (Task 2), production `Wire3D` (`@/components/canvas/Wire3D`), `GateRenderer` (`@/gates`), the real store, `calculateWirePathFromConnection` (`@/utils/wiringScheme/core`).
- Produces:
  - `resetCircuitStore(): void`
  - `wireGatePins(fromGateId, fromPinId, toGateId, toPinId): Wire` — routes via `calculateWirePathFromConnection` (the same computation `completeWiring` uses) against current store state and commits the segments with `addWire`.
  - `SceneTestHandle { renderer; scene: THREE.Scene; unmount(): Promise<void> }`
  - `renderCircuitScene(options?: { gates?: boolean; wires?: boolean }): Promise<SceneTestHandle>`
  - `GATES_RENDER_UNDER_TEST: boolean`
  - `RenderedWire { wireId: string; segments: { points: Vector3[] }[]; polyline: Vector3[] }`
  - `getRenderedWirePolylines(handle: SceneTestHandle): RenderedWire[]`
  - `getWireEndpoints(w: RenderedWire): { start: Vector3; end: Vector3 }`

- [ ] **Step 1: Write the seeding helpers** (no test of their own — exercised by every suite below)

Create `src/test/r3f/seedCircuit.ts`:

```ts
import { useCircuitStore } from '@/store/circuitStore'
import { calculateWirePathFromConnection } from '@/utils/wiringScheme/core'
import type { Wire } from '@/store/types'
import type { WireSegment } from '@/utils/wiringScheme/types'

/** Reset the live store to an empty circuit between tests. */
export function resetCircuitStore(): void {
  useCircuitStore.setState({
    gates: [],
    wires: [],
    inputNodes: [],
    outputNodes: [],
    junctions: [],
    selectedGateId: null,
    selectedWireId: null,
    selectedNodeId: null,
    selectedNodeType: null,
    wiringFrom: null,
    simulationRunning: false,
  })
}

/**
 * Wire two gate pins using the SAME routing computation the app uses
 * (calculateWirePathFromConnection, deconflicting against all existing wire
 * segments), then commit the routed segments via addWire. Returns the Wire.
 *
 * Crossing-hop resolution (resolveCrossings) is intentionally NOT applied here:
 * it is a separate rendering concern with its own extensive unit coverage
 * (crossing.test.ts) and would inject arcs/junctions that obscure the routing
 * geometry these tests assert. These tests target routing-path geometry.
 */
export function wireGatePins(
  fromGateId: string,
  fromPinId: string,
  toGateId: string,
  toPinId: string,
): Wire {
  const state = useCircuitStore.getState()
  const existingSegments: WireSegment[] = state.wires.flatMap((w) => w.segments)
  const path = calculateWirePathFromConnection(fromGateId, fromPinId, toGateId, toPinId, {
    gates: state.gates,
    getPinWorldPosition: state.getPinWorldPosition,
    getPinOrientation: state.getPinOrientation,
    existingSegments,
  })
  if (!path) {
    throw new Error(`Failed to route wire ${fromGateId}.${fromPinId} -> ${toGateId}.${toPinId}`)
  }
  return state.addWire(
    { type: 'gate', entityId: fromGateId, pinId: fromPinId },
    { type: 'gate', entityId: toGateId, pinId: toPinId },
    path.segments,
  )
}
```

- [ ] **Step 2: Write the TestScene**

Create `src/test/r3f/TestScene.tsx`:

```tsx
import { useCircuitStore } from '@/store/circuitStore'
import { Wire3D } from '@/components/canvas/Wire3D'
import { GateRenderer } from '@/gates'
import { deriveWire3DProps } from '@/components/canvas/deriveWire3DProps'

/**
 * Minimal R3F scene for routing tests. Each wire is wrapped in a <group> tagged
 * with its wireId so the geometry layer can group rendered line segments back to
 * their wire WITHOUT touching production Wire3D/CanvasArea. Deliberately omits
 * OrbitControls / grid / lighting / post-processing — none affect routing
 * geometry. Gate meshes render only when `gates` is true (hybrid degrade path).
 */
export function TestScene({ gates = false, wires = true }: { gates?: boolean; wires?: boolean }) {
  const wireList = useCircuitStore((s) => s.wires)
  const gateList = useCircuitStore((s) => s.gates)
  const state = useCircuitStore.getState()
  return (
    <>
      {wires &&
        wireList.map((wire) => {
          const { start, end, precomputedPath } = deriveWire3DProps(wire, state)
          return (
            <group key={wire.id} userData={{ hacerWire: true, wireId: wire.id }}>
              <Wire3D start={start} end={end} precomputedPath={precomputedPath} />
            </group>
          )
        })}
      {gates &&
        gateList.map((gate) => (
          <GateRenderer
            key={gate.id}
            gate={gate}
            isWiring={false}
            isPinConnected={() => false}
            onClick={() => {}}
            onPinClick={() => {}}
            onInputToggle={() => {}}
          />
        ))}
    </>
  )
}
```

- [ ] **Step 3: Write `renderCircuitScene`**

Create `src/test/r3f/renderCircuitScene.tsx`:

```tsx
import ReactThreeTestRenderer from '@react-three/test-renderer'
import type { Scene } from 'three'
import { TestScene } from './TestScene'

/**
 * Whether real gate meshes render cleanly under test-renderer. Set from the
 * Task-1 spike outcome. Core routing assertions resolve pin positions from the
 * store (getPinWorldPosition), so they hold regardless of this flag; it only
 * controls the realism nicety of also rendering gate bodies.
 */
export const GATES_RENDER_UNDER_TEST = false // TODO(Task 1): set to the spike's recorded outcome

export interface SceneTestHandle {
  renderer: Awaited<ReturnType<typeof ReactThreeTestRenderer.create>>
  scene: Scene
  unmount: () => Promise<void>
}

/** Render the CURRENT useCircuitStore circuit into an inspectable three.js scene. */
export async function renderCircuitScene(
  options: { gates?: boolean; wires?: boolean } = {},
): Promise<SceneTestHandle> {
  const { gates = GATES_RENDER_UNDER_TEST, wires = true } = options
  const renderer = await ReactThreeTestRenderer.create(<TestScene gates={gates} wires={wires} />)
  return {
    renderer,
    scene: renderer.scene.instance as unknown as Scene,
    unmount: () => renderer.unmount(),
  }
}
```

> **Implementer note:** when you reach this step, replace the `GATES_RENDER_UNDER_TEST` literal with the boolean the Task-1 spike recorded in `linePoints.ts`'s header comment, and delete the `TODO` comment.

- [ ] **Step 4: Write `getRenderedWirePolylines` + `getWireEndpoints`**

Create `src/test/r3f/wireGeometry.ts`:

```ts
import { Vector3 } from 'three'
import type { Object3D } from 'three'
import { isRenderedLine, readLinePoints } from './linePoints'
import type { SceneTestHandle } from './renderCircuitScene'

export interface RenderedWire {
  wireId: string
  /** One entry per rendered drei <Line> (i.e. per stored wire segment). */
  segments: { points: Vector3[] }[]
  /** Concatenated polyline across all segments, deduplicating shared corners. */
  polyline: Vector3[]
}

/** Walk the scene, grouping rendered line segments back to their wire by the
 *  wireId tag on each wire's wrapping <group>. */
export function getRenderedWirePolylines(handle: SceneTestHandle): RenderedWire[] {
  const wires: RenderedWire[] = []
  handle.scene.traverse((obj: Object3D) => {
    if (!obj.userData?.hacerWire) return
    const segments: { points: Vector3[] }[] = []
    obj.traverse((child: Object3D) => {
      if (isRenderedLine(child)) segments.push({ points: readLinePoints(child) })
    })
    const polyline = segments.flatMap((s, i) => (i === 0 ? s.points : s.points.slice(1)))
    wires.push({ wireId: obj.userData.wireId as string, segments, polyline })
  })
  return wires
}

export function getWireEndpoints(w: RenderedWire): { start: Vector3; end: Vector3 } {
  return { start: w.polyline[0], end: w.polyline[w.polyline.length - 1] }
}
```

- [ ] **Step 5: Write the failing render-contract test (case 1)**

Create `src/components/canvas/routingScene.test.tsx`:

```tsx
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { useCircuitStore } from '@/store/circuitStore'
import { resetCircuitStore, wireGatePins } from '@/test/r3f/seedCircuit'
import { renderCircuitScene, type SceneTestHandle } from '@/test/r3f/renderCircuitScene'
import { getRenderedWirePolylines } from '@/test/r3f/wireGeometry'

const getState = () => useCircuitStore.getState()
const TOL = 0.001

describe('routing scene-graph: render contract', () => {
  let handle: SceneTestHandle | null = null
  beforeEach(() => resetCircuitStore())
  afterEach(async () => {
    if (handle) await handle.unmount()
    handle = null
  })

  it('renders one line per computed segment, each at the computed endpoints', async () => {
    const g1 = getState().addGate('And', { x: 0, y: 0, z: 0 })
    const g2 = getState().addGate('And', { x: 8, y: 0, z: 4 })
    const wire = wireGatePins(g1.id, g1.outputs[0].id, g2.id, g2.inputs[0].id)

    handle = await renderCircuitScene({ gates: false })
    const rendered = getRenderedWirePolylines(handle)

    expect(rendered).toHaveLength(1)
    // One rendered <Line> per stored segment.
    expect(rendered[0].segments).toHaveLength(wire.segments.length)
    // Each rendered straight segment's endpoints equal the computed segment endpoints.
    wire.segments.forEach((seg, i) => {
      const pts = rendered[0].segments[i].points
      const first = pts[0]
      const last = pts[pts.length - 1]
      expect(first.x).toBeCloseTo(seg.start.x, 3)
      expect(first.y).toBeCloseTo(seg.start.y, 3)
      expect(first.z).toBeCloseTo(seg.start.z, 3)
      expect(last.x).toBeCloseTo(seg.end.x, 3)
      expect(last.y).toBeCloseTo(seg.end.y, 3)
      expect(last.z).toBeCloseTo(seg.end.z, 3)
    })
    expect(TOL).toBe(0.001)
  })
})
```

- [ ] **Step 6: Run it to verify it fails, then passes**

Run: `pnpm exec vitest run src/components/canvas/routingScene.test.tsx`
Expected initially: FAIL if any harness wiring is off (e.g. group tag not found, or `addGate('And')`/routing returns no segments). Debug using the systematic-debugging skill until it passes — the failure must be a real harness fix, not a weakened assertion. Expected after: PASS, with exactly one wire and per-segment endpoint matches.

- [ ] **Step 7: Commit**

```bash
git add src/test/r3f/seedCircuit.ts src/test/r3f/TestScene.tsx src/test/r3f/renderCircuitScene.tsx src/test/r3f/wireGeometry.ts src/components/canvas/routingScene.test.tsx
git commit -m "test: add scene-graph render harness and render-contract routing test"
```

---

## Task 4: `expectWireConnects` + real-gate connectivity test (case 2)

Add the connectivity invariant and prove it: two real gates wired via real routing render a wire from the source pin's world position to the destination pin's.

**Files:**
- Modify: `src/test/r3f/wireGeometry.ts`
- Modify: `src/components/canvas/routingScene.test.tsx`

**Interfaces:**
- Consumes: `RenderedWire`/`getWireEndpoints` (Task 3).
- Produces: `expectWireConnects(w: RenderedWire, start: {x;y;z}, end: {x;y;z}, tol?: number): void` — throws a descriptive error if the rendered wire's endpoints are not within `tol` of `start`/`end`.

- [ ] **Step 1: Write the failing connectivity test**

Append to `src/components/canvas/routingScene.test.tsx`:

```tsx
import { getWireEndpoints, expectWireConnects } from '@/test/r3f/wireGeometry'

describe('routing scene-graph: connectivity with real gates', () => {
  let handle: SceneTestHandle | null = null
  beforeEach(() => resetCircuitStore())
  afterEach(async () => {
    if (handle) await handle.unmount()
    handle = null
  })

  it('renders an And→Nand wire from the source pin to the destination pin', async () => {
    const and = getState().addGate('And', { x: 0, y: 0, z: 0 })
    const nand = getState().addGate('Nand', { x: 10, y: 0, z: 0 })
    const fromPin = and.outputs[0].id
    const toPin = nand.inputs[0].id
    wireGatePins(and.id, fromPin, nand.id, toPin)

    handle = await renderCircuitScene({ gates: false })
    const [rendered] = getRenderedWirePolylines(handle)

    const srcPos = getState().getPinWorldPosition(and.id, fromPin)!
    const dstPos = getState().getPinWorldPosition(nand.id, toPin)!

    // Endpoints reach the real pin world positions.
    expectWireConnects(rendered, srcPos, dstPos, TOL)

    // Sanity: the rendered polyline is non-trivial (more than a single point).
    const { start, end } = getWireEndpoints(rendered)
    expect(start.distanceTo(end)).toBeGreaterThan(0.001)
  })
})
```

- [ ] **Step 2: Run it to verify it fails**

Run: `pnpm exec vitest run src/components/canvas/routingScene.test.tsx -t "And→Nand"`
Expected: FAIL — `expectWireConnects` is not exported.

- [ ] **Step 3: Implement `expectWireConnects`**

Append to `src/test/r3f/wireGeometry.ts`:

```ts
/** Assert a rendered wire's endpoints reach `start` and `end` within tolerance. */
export function expectWireConnects(
  w: RenderedWire,
  start: { x: number; y: number; z: number },
  end: { x: number; y: number; z: number },
  tol = 0.001,
): void {
  const ends = getWireEndpoints(w)
  const startD = ends.start.distanceTo(new Vector3(start.x, start.y, start.z))
  const endD = ends.end.distanceTo(new Vector3(end.x, end.y, end.z))
  if (startD > tol || endD > tol) {
    throw new Error(
      `wire ${w.wireId} does not connect: ` +
        `start rendered (${fmt(ends.start)}) vs expected (${fmt(start)}) Δ=${startD.toFixed(4)}; ` +
        `end rendered (${fmt(ends.end)}) vs expected (${fmt(end)}) Δ=${endD.toFixed(4)} (tol=${tol})`,
    )
  }
}

function fmt(p: { x: number; y: number; z: number }): string {
  return `${p.x.toFixed(3)},${p.y.toFixed(3)},${p.z.toFixed(3)}`
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `pnpm exec vitest run src/components/canvas/routingScene.test.tsx -t "And→Nand"`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/test/r3f/wireGeometry.ts src/components/canvas/routingScene.test.tsx
git commit -m "test: add scene-graph connectivity invariant and real-gate routing test"
```

---

## Task 5: `expectNoWireOverlaps` oracle + B-004 dense multi-input test (case 3)

Add the overlap oracle (the primary tool for surfacing routing-merge bugs) and prove it on dense multi-input chips: every input wire of `Mux4Way16` (5 inputs) and `Mux8Way16` (9 inputs) renders, reaches its own pin, and no two distinct wires share a collinear track.

**Files:**
- Modify: `src/test/r3f/wireGeometry.ts`
- Modify: `src/components/canvas/routingScene.test.tsx`

**Interfaces:**
- Consumes: `getRenderedWirePolylines` (Task 3), `segmentsOverlap` (`@/utils/wiringScheme/overlap`), `WireSegment` (`@/utils/wiringScheme/types`).
- Produces: `expectNoWireOverlaps(handle: SceneTestHandle, opts?: { tolerance?: number }): void` — throws naming both wires, the axis/coordinate, and the overlapping range, if any two distinct wires share a collinear straight track.

- [ ] **Step 1: Write the failing B-004 test**

Append to `src/components/canvas/routingScene.test.tsx`:

```tsx
import { expectNoWireOverlaps } from '@/test/r3f/wireGeometry'

describe('routing scene-graph: dense multi-input chips (B-004)', () => {
  let handle: SceneTestHandle | null = null
  beforeEach(() => resetCircuitStore())
  afterEach(async () => {
    if (handle) await handle.unmount()
    handle = null
  })

  // Wire every input pin of `chipName` from its own distinct source gate, fanned
  // out so each source sits on its own row/column (the real B-004 layout). Assert
  // every input wire renders, reaches its own pin, and no two wires merge.
  async function assertDenseChipRoutesCleanly(chipName: string, expectedInputs: number) {
    const chip = getState().addGate(chipName, { x: 0, y: 0, z: 0 })
    expect(chip.inputs).toHaveLength(expectedInputs)

    const expectedPins = chip.inputs.map((pin, i) => {
      // Distinct source gate per input, spread in X and Z so trunks don't collapse.
      const src = getState().addGate('Not', { x: -(8 + i * 4), y: 0, z: i * 4 })
      wireGatePins(src.id, src.outputs[0].id, chip.id, pin.id)
      return { pinId: pin.id, pos: getState().getPinWorldPosition(chip.id, pin.id)! }
    })

    handle = await renderCircuitScene({ gates: false })
    const rendered = getRenderedWirePolylines(handle)

    // Every input wire rendered.
    expect(rendered).toHaveLength(expectedInputs)
    // Each wire reaches its own pin (some wire's rendered end matches each pin).
    for (const { pos } of expectedPins) {
      const reaches = rendered.some(
        (w) => getWireEndpointsMatchesPin(w, pos, TOL),
      )
      expect(reaches, `no wire reaches pin at ${pos.x},${pos.y},${pos.z}`).toBe(true)
    }
    // No two distinct wires share a collinear track at the render level.
    expectNoWireOverlaps(handle, { tolerance: TOL })
  }

  function getWireEndpointsMatchesPin(
    w: ReturnType<typeof getRenderedWirePolylines>[number],
    pin: { x: number; y: number; z: number },
    tol: number,
  ): boolean {
    const { start, end } = getWireEndpoints(w)
    return (
      Math.hypot(end.x - pin.x, end.y - pin.y, end.z - pin.z) <= tol ||
      Math.hypot(start.x - pin.x, start.y - pin.y, start.z - pin.z) <= tol
    )
  }

  it('routes all 5 Mux4Way16 inputs to distinct pins with no overlaps', async () => {
    await assertDenseChipRoutesCleanly('Mux4Way16', 5)
  })

  it('routes all 9 Mux8Way16 inputs to distinct pins with no overlaps', async () => {
    await assertDenseChipRoutesCleanly('Mux8Way16', 9)
  })
})
```

- [ ] **Step 2: Run it to verify it fails**

Run: `pnpm exec vitest run src/components/canvas/routingScene.test.tsx -t "Mux4Way16"`
Expected: FAIL — `expectNoWireOverlaps` is not exported.

- [ ] **Step 3: Implement `expectNoWireOverlaps`**

Append to `src/test/r3f/wireGeometry.ts`:

```ts
import { segmentsOverlap } from '@/utils/wiringScheme/overlap'
import type { WireSegment } from '@/utils/wiringScheme/types'

/**
 * Assert no two DISTINCT rendered wires share a collinear straight track over an
 * overlapping range. Only straight rendered segments (exactly 2 points) are
 * considered — arc/hop lines (>2 points) intentionally cross over other wires in
 * Y and must be skipped. Reuses the production `segmentsOverlap` range math, which
 * infers horizontal/vertical from coordinates (not the `type` field). Perpendicular
 * crossings are not collinear, so they are correctly NOT flagged.
 *
 * NOTE: this oracle assumes no intentional shared trunks (junction branches). The
 * suites built on it keep circuits junction-free, so any collinear overlap is a bug.
 */
export function expectNoWireOverlaps(
  handle: SceneTestHandle,
  opts: { tolerance?: number } = {},
): void {
  const tol = opts.tolerance ?? 0.001
  const wires = getRenderedWirePolylines(handle)

  const straight: { wireId: string; seg: WireSegment }[] = []
  for (const w of wires) {
    for (const s of w.segments) {
      if (s.points.length !== 2) continue // skip arcs/hops
      const [a, b] = s.points
      const horizontal = Math.abs(a.z - b.z) < tol
      straight.push({
        wireId: w.wireId,
        seg: {
          start: { x: a.x, y: a.y, z: a.z },
          end: { x: b.x, y: b.y, z: b.z },
          type: horizontal ? 'horizontal' : 'vertical',
        },
      })
    }
  }

  const violations: string[] = []
  for (let i = 0; i < straight.length; i++) {
    for (let j = i + 1; j < straight.length; j++) {
      if (straight[i].wireId === straight[j].wireId) continue
      if (segmentsOverlap(straight[i].seg, straight[j].seg)) {
        const a = straight[i]
        const b = straight[j]
        violations.push(
          `wires ${a.wireId} & ${b.wireId} overlap on a ${a.seg.type} track: ` +
            `${a.wireId}=[${fmt(a.seg.start)}→${fmt(a.seg.end)}] vs ` +
            `${b.wireId}=[${fmt(b.seg.start)}→${fmt(b.seg.end)}]`,
        )
      }
    }
  }
  if (violations.length > 0) {
    throw new Error(`expectNoWireOverlaps: ${violations.length} overlap(s) found:\n${violations.join('\n')}`)
  }
}
```

(`fmt` already exists in the file from Task 4 — do not redeclare it.)

- [ ] **Step 4: Run the tests to verify they pass**

Run: `pnpm exec vitest run src/components/canvas/routingScene.test.tsx -t "Mux"`
Expected: PASS for both Mux4Way16 and Mux8Way16. If `expectNoWireOverlaps` throws, that is a genuine routing discovery — switch to the systematic-debugging skill, confirm it is a real render-level merge (not an oracle false-positive on a legitimate shared corner), and if real, this is a NEW bug: capture it (it will be logged in Task 8's flow) and report to the controller before weakening anything.

- [ ] **Step 5: Commit**

```bash
git add src/test/r3f/wireGeometry.ts src/components/canvas/routingScene.test.tsx
git commit -m "test: add render-level overlap oracle and dense multi-input routing tests"
```

---

## Task 6: B-004a / CASE1 + transit-vs-transit test (case 4)

Harden the exact regression the lane-nudging fix (PR #128, commit 67ee9f4) closed, now enforced on **rendered** geometry: a transit run must render **off** an unrelated chip's approach backbone, and two transit wires that hash to the same lane must render on **distinct** tracks.

**Files:**
- Modify: `src/components/canvas/routingScene.test.tsx`

**Interfaces:**
- Consumes: the full harness (Tasks 3–5). Mirrors the data-level scenarios in `src/utils/wiringScheme/laneExclusivity.test.ts` but asserts on rendered polylines.

- [ ] **Step 1: Reproduce the data-level transit scenario at the render level**

Read `src/utils/wiringScheme/laneExclusivity.test.ts` to see the exact transit-net geometry that collides under the lane hash (the two distinct transit nets whose start/end hash to the same lane). The render-level test must build the *same* shape through the store + real routing so the rendered wires reproduce the conditions, then assert separation.

- [ ] **Step 2: Write the failing transit-separation test**

Append to `src/components/canvas/routingScene.test.tsx`:

```tsx
describe('routing scene-graph: B-004a / CASE1 + transit-vs-transit', () => {
  let handle: SceneTestHandle | null = null
  beforeEach(() => resetCircuitStore())
  afterEach(async () => {
    if (handle) await handle.unmount()
    handle = null
  })

  it('keeps two distinct transit wires on distinct rendered tracks (no merge)', async () => {
    // Two independent source→dest gate pairs whose trunks transit the same region.
    // Geometry chosen (per laneExclusivity.test.ts) so both nets hash to the same
    // lane index; the lane-nudging fix must place them on distinct parallel tracks.
    const srcA = getState().addGate('Not', { x: -12, y: 0, z: -6 })
    const dstA = getState().addGate('Not', { x: 12, y: 0, z: -6 })
    const srcB = getState().addGate('Not', { x: -12, y: 0, z: -5 })
    const dstB = getState().addGate('Not', { x: 12, y: 0, z: -5 })

    wireGatePins(srcA.id, srcA.outputs[0].id, dstA.id, dstA.inputs[0].id)
    wireGatePins(srcB.id, srcB.outputs[0].id, dstB.id, dstB.inputs[0].id)

    handle = await renderCircuitScene({ gates: false })
    const rendered = getRenderedWirePolylines(handle)
    expect(rendered).toHaveLength(2)

    // The two transit wires must not merge onto one track.
    expectNoWireOverlaps(handle, { tolerance: TOL })
  })

  it('routes a transit wire off an unrelated chip fan-in backbone (CASE1)', async () => {
    // A dense chip with several fanned-in inputs (builds an approach backbone),
    // plus an unrelated transit wire crossing the same region. The transit run must
    // render OFF the chip's backbone track.
    const chip = getState().addGate('Mux4Way16', { x: 0, y: 0, z: 0 })
    chip.inputs.slice(0, 3).forEach((pin, i) => {
      const src = getState().addGate('Not', { x: -(8 + i * 4), y: 0, z: i * 4 })
      wireGatePins(src.id, src.outputs[0].id, chip.id, pin.id)
    })
    // Unrelated transit pair crossing the backbone region.
    const tSrc = getState().addGate('Not', { x: -10, y: 0, z: -3 })
    const tDst = getState().addGate('Not', { x: 10, y: 0, z: -3 })
    wireGatePins(tSrc.id, tSrc.outputs[0].id, tDst.id, tDst.inputs[0].id)

    handle = await renderCircuitScene({ gates: false })
    // No wire merges onto another's track — including the transit onto the backbone.
    expectNoWireOverlaps(handle, { tolerance: TOL })
  })
})
```

- [ ] **Step 3: Run it**

Run: `pnpm exec vitest run src/components/canvas/routingScene.test.tsx -t "transit"`
Expected: PASS (the fix is present on this branch). If a test passes *vacuously* (e.g. fewer than 2 wires rendered, or the two nets did not actually share a region), strengthen the seed geometry so the precondition genuinely holds — mirror the proven inputs from `laneExclusivity.test.ts`. If it FAILS, the fix has a render-level hole: switch to systematic-debugging, do not weaken the assertion.

- [ ] **Step 4: Commit**

```bash
git add src/components/canvas/routingScene.test.tsx
git commit -m "test: enforce transit-vs-transit and CASE1 lane separation on rendered geometry"
```

---

## Task 7: B-003 node-drag re-route test (case 5)

Prove the B-003 fix at the render level: an input node wired to an inner pin, then moved, still renders a non-empty wire that now connects the node's new position to the pin (no silent orphaning).

**Files:**
- Modify: `src/test/r3f/seedCircuit.ts` (add `wireInputNodeToPin`)
- Modify: `src/components/canvas/routingScene.test.tsx`

**Interfaces:**
- Consumes: `calculateWirePath` (`@/utils/wiringScheme/core`), `calculateNodePinPosition` (`@/nodes/config`), `updateInputNodePosition` store action (triggers `recalculateWiresForNode`).
- Produces: `wireInputNodeToPin(nodeId: string, toGateId: string, toPinId: string): Wire`.

- [ ] **Step 1: Add the node→pin seeding helper**

Append to `src/test/r3f/seedCircuit.ts`:

```ts
import { calculateWirePath } from '@/utils/wiringScheme/core'
import { calculateNodePinPosition } from '@/nodes/config'

/** Wire an input node to a gate input pin using the app's node-routing path. */
export function wireInputNodeToPin(nodeId: string, toGateId: string, toPinId: string): Wire {
  const state = useCircuitStore.getState()
  const node = state.inputNodes.find((n) => n.id === nodeId)
  if (!node) throw new Error(`input node ${nodeId} not found`)
  const pinPos = state.getPinWorldPosition(toGateId, toPinId)
  const pinOri = state.getPinOrientation(toGateId, toPinId)
  if (!pinPos || !pinOri) throw new Error(`pin ${toGateId}.${toPinId} not found`)

  const off = calculateNodePinPosition('input')
  const startPin = { x: node.position.x + off.x, y: 0.2, z: node.position.z + off.z }
  const path = calculateWirePath(
    startPin,
    { type: 'pin', pin: pinPos, orientation: { direction: pinOri } },
    { direction: { x: 1, y: 0, z: 0 } },
    state.gates,
    { existingSegments: state.wires.flatMap((w) => w.segments) },
  )
  return state.addWire(
    { type: 'input', entityId: nodeId },
    { type: 'gate', entityId: toGateId, pinId: toPinId },
    path.segments,
  )
}
```

- [ ] **Step 2: Write the failing node-drag test**

Append to `src/components/canvas/routingScene.test.tsx`:

```tsx
import { wireInputNodeToPin } from '@/test/r3f/seedCircuit'
import { calculateNodePinPosition } from '@/nodes/config'

describe('routing scene-graph: node-drag re-route (B-003)', () => {
  let handle: SceneTestHandle | null = null
  beforeEach(() => resetCircuitStore())
  afterEach(async () => {
    if (handle) await handle.unmount()
    handle = null
  })

  it('keeps the wire connected to an input node after the node is moved', async () => {
    const chip = getState().addGate('Mux4Way16', { x: 0, y: 0, z: 0 })
    const innerPin = chip.inputs[2].id // an inner pin (the B-003-prone case)
    const node = getState().addInputNode('a', { x: -10, y: 0, z: 2 })
    wireInputNodeToPin(node.id, chip.id, innerPin)

    // Render before the move: connects node pin → gate pin.
    handle = await renderCircuitScene({ gates: false })
    const before = getRenderedWirePolylines(handle)
    expect(before).toHaveLength(1)
    expect(before[0].segments.length).toBeGreaterThan(0)
    await handle.unmount()
    handle = null

    // Move the node (this triggers recalculateWiresForNode).
    const newPos = { x: -14, y: 0, z: -3 }
    getState().updateInputNodePosition(node.id, newPos)

    // Render after the move: wire still renders (non-empty) and follows the node.
    handle = await renderCircuitScene({ gates: false })
    const after = getRenderedWirePolylines(handle)
    expect(after).toHaveLength(1)
    expect(after[0].segments.length).toBeGreaterThan(0) // B-003: must not be orphaned/empty

    const off = calculateNodePinPosition('input')
    const expectedNodePin = { x: newPos.x + off.x, y: 0.2, z: newPos.z + off.z }
    const pinPos = getState().getPinWorldPosition(chip.id, innerPin)!
    expectWireConnects(after[0], expectedNodePin, pinPos, TOL)
  })
})
```

- [ ] **Step 3: Run it**

Run: `pnpm exec vitest run src/components/canvas/routingScene.test.tsx -t "node is moved"`
Expected: PASS (B-003 fix present on this branch). If FAIL, switch to systematic-debugging. A vacuous pass guard is already present (`segments.length > 0` and the connectivity assertion against the *new* position).

- [ ] **Step 4: Commit**

```bash
git add src/test/r3f/seedCircuit.ts src/components/canvas/routingScene.test.tsx
git commit -m "test: enforce node-drag re-route connectivity on rendered geometry (B-003)"
```

---

## Task 8: Broad overlap sweep (case 6)

The net for *uncovering new bugs*: a moderately complex, junction-free mixed circuit; `expectNoWireOverlaps` must pass. If it fails, that is a discovery — log it.

**Files:**
- Modify: `src/components/canvas/routingScene.test.tsx`
- Modify (only if a bug is found): `docs/development/observed-bugs.md`

**Interfaces:**
- Consumes: the full harness.

- [ ] **Step 1: Write the sweep test**

Append to `src/components/canvas/routingScene.test.tsx`:

```tsx
describe('routing scene-graph: broad overlap sweep', () => {
  let handle: SceneTestHandle | null = null
  beforeEach(() => resetCircuitStore())
  afterEach(async () => {
    if (handle) await handle.unmount()
    handle = null
  })

  it('routes a mixed multi-gate circuit with no two wires sharing a track', async () => {
    // Junction-free mixed circuit: a small fan of gates feeding two consumers.
    const a = getState().addGate('And', { x: -8, y: 0, z: -4 })
    const b = getState().addGate('Or', { x: -8, y: 0, z: 0 })
    const c = getState().addGate('Xor', { x: -8, y: 0, z: 4 })
    const mux = getState().addGate('Mux', { x: 6, y: 0, z: 0 })
    const out = getState().addGate('Not', { x: 14, y: 0, z: 2 })

    wireGatePins(a.id, a.outputs[0].id, mux.id, mux.inputs[0].id)
    wireGatePins(b.id, b.outputs[0].id, mux.id, mux.inputs[1].id)
    wireGatePins(c.id, c.outputs[0].id, mux.id, mux.inputs[2].id) // sel
    wireGatePins(mux.id, mux.outputs[0].id, out.id, out.inputs[0].id)

    handle = await renderCircuitScene({ gates: false })
    const rendered = getRenderedWirePolylines(handle)
    expect(rendered).toHaveLength(4)
    rendered.forEach((w) => expect(w.segments.length).toBeGreaterThan(0))

    // The discovery oracle. A failure here is a NEW routing bug — log it (Step 3).
    expectNoWireOverlaps(handle, { tolerance: TOL })
  })
})
```

> **Implementer note:** verify the chip names (`Mux`, `Xor`, etc.) and their pin counts exist in the builtin registry before relying on them — `getState().addGate(name, …)` throws/returns an unusable instance for an unregistered chip, and `mux.inputs[2]` must exist. If a chosen chip is not registered or has fewer inputs than indexed, substitute a registered chip with enough inputs (e.g. an additional `And`/`Or`) so the circuit is valid. Keep the circuit **junction-free**.

- [ ] **Step 2: Run it**

Run: `pnpm exec vitest run src/components/canvas/routingScene.test.tsx -t "broad overlap"`
Expected: PASS — or a genuine overlap discovery.

- [ ] **Step 3: If the sweep finds a bug, log it (do NOT weaken the test to hide it)**

If `expectNoWireOverlaps` throws, first confirm via systematic-debugging that it is a real render-level merge (read the named wires/track/range from the error; check it is not a legitimate shared corner of one wire's own segments — those are excluded by the distinct-wire guard). If real:
- Add an entry to `docs/development/observed-bugs.md` under the open-bugs section: a new `B-0NN` id, the reproducing circuit, the overlapping wires/track from the error message, and a note that the scene-graph sweep surfaced it.
- Report it to the controller. Decide with the controller whether to fix in this branch or mark the new test `it.fails(...)`/`it.skip(...)` with a comment linking the bug id (so the suite stays green and the discovery is not lost). Do not silently delete the assertion.

If no bug is found, no `observed-bugs.md` change is needed.

- [ ] **Step 4: Commit**

```bash
git add src/components/canvas/routingScene.test.tsx
# include docs/development/observed-bugs.md only if a bug was logged
git commit -m "test: add broad scene-graph overlap sweep for routing-bug discovery"
```

---

## Task 9: ADR + docs-sync + final Definition of Done

Record the scene-graph testing layer as the routing DoD enforcer and reconcile living docs, then run the full DoD gate.

**Files:**
- Create: `docs/decisions/NNNN-scene-graph-routing-testing-layer.md` (next zero-padded number; check `docs/decisions/README.md` for the latest)
- Modify: `docs/decisions/README.md` (index row)
- Modify (as the author pass determines): `REPO_MAP.md`, `HACER_LLM_GUIDE.md` (testing section), `.cursorrules` (if it enumerates test layers)

**Interfaces:** none (documentation + verification).

- [ ] **Step 1: Determine the next ADR number**

```bash
ls docs/decisions/ | grep -E '^[0-9]{4}-' | sort | tail -3
```
Use the next zero-padded integer after the highest existing (do not renumber existing ADRs).

- [ ] **Step 2: Write the ADR**

Create `docs/decisions/NNNN-scene-graph-routing-testing-layer.md` from `docs/decisions/0000-template.md`. Content (fill the template's sections):
- **Context:** 3D component tests were smoke-only (`Wire3D.test.tsx`'s own comment: full rendering "covered in E2E"); but `@store` E2E asserts store state and `@ui` asserts DOM — nothing verified that computed routing geometry actually renders at those coordinates. A fix passed 1490+ unit tests while a render-level merge hole survived to adversarial review (PR #128).
- **Decision:** Adopt `@react-three/test-renderer` as a GPU-free scene-graph testing layer (`src/test/r3f/`), with a core routing suite (`routingScene.test.tsx`) asserting rendered wire geometry for real chips. It runs inside `pnpm run test:run`, so it is automatically part of the DoD and gates every routing-engine stage (ADR-0007 Stages 2–4).
- **Consequences:** new devDependency `@react-three/test-renderer@^9`; `deriveWire3DProps` extracted as the shared wire→props source of truth; the overlap oracle assumes junction-free circuits; gate-mesh rendering under test is gated by the spike outcome (`GATES_RENDER_UNDER_TEST`). Reference ADR-0007 and the spec.

Add the index row to `docs/decisions/README.md`.

- [ ] **Step 3: Run the docs-sync author pass**

Invoke the `docs-sync` skill's author pass over the living-documentation inventory. At minimum, add the scene-graph testing layer to the testing section of `HACER_LLM_GUIDE.md` and the `src/test/r3f/` directory to `REPO_MAP.md`. Mark any inventory row N/A with a reason if untouched.

- [ ] **Step 4: Run the full Definition of Done**

```bash
pnpm run lint
pnpm run test:run
pnpm run test:e2e:store
pnpm run build
```
Expected: every command exits 0. Capture the `test:run` total (it should be the prior count plus the new routing-scene tests). If any gate fails, fix before proceeding — no waivers, no `--no-verify`.

- [ ] **Step 5: Commit**

```bash
git add docs/decisions/ REPO_MAP.md HACER_LLM_GUIDE.md .cursorrules
git commit -m "docs: record scene-graph routing testing layer as DoD enforcer (ADR + living docs)"
```

- [ ] **Step 6: Final whole-branch review + branch completion**

Dispatch the final whole-branch code review (superpowers:requesting-code-review), address Critical/Important findings, then use the `finishing-a-development-branch` skill to open the PR (stacked on `fix/multi-input-chip-wiring`; rebase onto `main` after PR #128 merges).

---

## Self-Review

**1. Spec coverage** (against `2026-06-21-scene-graph-routing-testing-design.md`):
- Render harness `renderCircuitScene` + `SceneTestHandle` → Task 3 ✅
- `getRenderedWirePolylines` / `getWireEndpoints` → Task 3 ✅
- `expectWireConnects` → Task 4 ✅; `expectNoWireOverlaps` → Task 5 ✅
- `deriveWire3DProps` extraction shared by CanvasArea + TestScene → Task 2 ✅
- Read mechanism resolved by a Task-1 spike (geometry attrs path), go/no-go, gate-stability → Task 1 ✅
- devDependency `@react-three/test-renderer@^9`, runs in `test:run` as DoD enforcer → Task 1 + Task 9 ✅
- 6 core cases: (1) render contract → Task 3; (2) connectivity real gates → Task 4; (3) B-004 Mux4Way16/Mux8Way16 → Task 5; (4) B-004a/CASE1 + transit-vs-transit → Task 6; (5) B-003 node-drag → Task 7; (6) broad overlap sweep → Task 8 ✅
- New bug surfaced by sweep logged to `observed-bugs.md` → Task 8 Step 3 ✅
- ADR recording the layer → Task 9 ✅
- Out-of-scope honored: no pixel/screenshot/aesthetics tests; crossing-hop resolution explicitly excluded with rationale (Task 3 helper doc) ✅

**2. Placeholder scan:** No "TBD"/"implement later". The one `// TODO(Task 1)` on `GATES_RENDER_UNDER_TEST` is a deliberate cross-task handoff with a concrete resolution step (Task 3 Step 3 implementer note) — it names the exact value source and is resolved within the same task. The Task-8 chip-name verification and Task-9 ADR-number lookup are concrete verification steps, not vague placeholders.

**3. Type consistency:** `RenderedWire`, `SceneTestHandle`, `DerivedWire3DProps` are defined once (Tasks 3/2) and consumed by name thereafter. `expectWireConnects`/`expectNoWireOverlaps`/`getRenderedWirePolylines`/`getWireEndpoints` signatures are stable across the suite. `wireGatePins`/`wireInputNodeToPin`/`resetCircuitStore` signatures match their call sites. `WireSegment.type` uses a real union member (`'horizontal'`/`'vertical'`), not the non-existent `'straight'`. `addWire`/`addGate`/`addInputNode`/`updateInputNodePosition`/`getPinWorldPosition`/`getPinOrientation`/`calculateWirePathFromConnection`/`calculateWirePath` signatures match the verified source.

**4. Scope:** One subsystem (a test layer + its suite). Single plan. No decomposition needed.
