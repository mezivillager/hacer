# P05-14 Circuit Persistence Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make HACER circuits survive a page refresh — pure serialization + `localStorage`-backed save/load/list/delete + JSON export/import + debounced autosave + a `CircuitLibrary` UI panel mounted in the existing right-rail drawer.

**Architecture:** Pure serialization helpers live in `src/core/serialization/` and have NO Zustand / DOM dependencies. A new `persistenceActions` slice owns all `localStorage` I/O, registers itself in the `CircuitStore` union, and is spread into the store like every other action slice. A debounced autosave subscription is wired in `circuitStore.ts` alongside the existing simulation interval. Deserialization rehydrates gates via the existing `createGateInstance` export (then overwrites `id`, `rotation`, and pin IDs) so wire endpoint references stay valid. UI is a `CircuitLibrary` panel, mounted as a new `'library'` value of the existing `ActivePanel` union in `RightActionBar`. The current `ComingSoon` Export/Import stubs in `CircuitInfoPanel` are rewired to the new persistence actions.

**Tech Stack:** React 19 + React Compiler (no manual `useMemo` / `useCallback`), TypeScript 5.9 strict, Zustand + immer + `subscribeWithSelector`, Vitest + @testing-library/react, Playwright store-fixture, Tailwind v4 + shadcn-style primitives from `@/components/ui-kit`, Sonner toasts via `@/lib/notify`, `lucide-react` icons.

**Reference Spec:** [`docs/plans/phase-0.5-tickets/P05-14.md`](../../plans/phase-0.5-tickets/P05-14.md)

---

## File Structure

**Create:**

- `src/core/serialization/types.ts` — Versioned `SerializedCircuit` interfaces.
- `src/core/serialization/serialize.ts` — Pure `serializeCircuit(state, name)`.
- `src/core/serialization/deserialize.ts` — Pure `deserializeCircuit(data)`.
- `src/core/serialization/index.ts` — Barrel export.
- `src/core/serialization/serialization.test.ts` — Round-trip Vitest suite.
- `src/store/actions/persistenceActions/persistenceActions.ts` — Slice implementing the `PersistenceActions` interface.
- `src/store/actions/persistenceActions/persistenceActions.test.ts` — Action tests with mocked `localStorage` + fake timers.
- `src/store/actions/persistenceActions/autosave.ts` — Debounced subscription + `subscribeAutosave()` / `__resetAutosaveForTests()` exports.
- `src/store/actions/persistenceActions/autosave.test.ts` — Fake-timer tests for the autosave debounce.
- `src/store/actions/persistenceActions/debounce.ts` — Tiny dependency-free debounce helper (used only by autosave).
- `src/components/ui/CircuitLibrary.tsx` — Library panel component.
- `src/components/ui/CircuitLibrary.test.tsx` — RTL component tests.
- `e2e/specs/persistence/circuit-persistence.store.spec.ts` — Playwright store spec tagged `@store @persistence`.

**Modify:**

- `src/store/types.ts` — Add `PersistenceActions` interface and extend `CircuitStore` union.
- `src/store/circuitStore.ts` — Spread `createPersistenceActions`, expose actions in `circuitActions`, call `subscribeAutosave()`.
- `src/components/ui/RightActionBar.tsx` — Extend `ActivePanel`, add library trigger button, render `<CircuitLibrary />`, rewire `CircuitInfoPanel` Export/Import.

**Do NOT touch:** simulation engine (`src/simulation/*`), wire routing (`src/utils/wiringScheme/*`), gate logic, existing action slices. Pure presentation+persistence ticket.

---

## Setup checklist (one-shot)

- [ ] **Step 0.1: Confirm working tree is the dedicated worktree on `p05-14`**

```bash
git rev-parse --show-toplevel
git branch --show-current
```

Expected: tree ends in `.worktrees/p05-14`, branch `p05-14`.

- [ ] **Step 0.2: Confirm the canonical store reset is up to date**

Open `src/store/actions/gateActions/gateActions.test.ts` and copy the `beforeEach` reset object. Reuse the same fields in every new `*.test.ts` you create in this plan. Do NOT regenerate the field list from docs — read the file.

- [ ] **Step 0.3: Sanity-check baseline tests pass**

Run: `pnpm install` then `pnpm run lint && pnpm run test:run`
Expected: PASS on a clean baseline before changes.

---

## Chunk 1: Pure serialization (`src/core/serialization/`)

### Task 1: Serialization types

**Files:**
- Create: `src/core/serialization/types.ts`

- [ ] **Step 1.1: Write the types file**

```typescript
// src/core/serialization/types.ts
export const CIRCUIT_FORMAT_VERSION = 1 as const

export type SerializedPosition = { x: number; y: number; z: number }
export type SerializedRotation = { x: number; y: number; z: number }

export type SerializedEndpointType = 'gate' | 'input' | 'output' | 'junction'

export interface SerializedWireSegment {
  start: SerializedPosition
  end: SerializedPosition
  type: 'horizontal' | 'vertical' | 'entry' | 'exit' | 'arc'
  arcCenter?: SerializedPosition
  arcRadius?: number
  crossedWireId?: string
}

export interface SerializedGate {
  id: string
  type: string
  position: SerializedPosition
  rotation: SerializedRotation
  width: number
}

export interface SerializedWire {
  id: string
  signalId?: string
  from: { type: SerializedEndpointType; entityId: string; pinId?: string }
  to: { type: SerializedEndpointType; entityId: string; pinId?: string }
  segments: SerializedWireSegment[]
  crossesWireIds: string[]
  width?: number
}

export interface SerializedInputNode {
  id: string
  name: string
  position: SerializedPosition
  rotation: SerializedRotation
  value: number
  width: number
}

export interface SerializedOutputNode {
  id: string
  name: string
  position: SerializedPosition
  rotation: SerializedRotation
  value: number
  width: number
}

export interface SerializedJunction {
  id: string
  position: SerializedPosition
  signalId: string
  wireIds: string[]
}

export interface SerializedCircuit {
  version: typeof CIRCUIT_FORMAT_VERSION
  name: string
  savedAt: string
  gates: SerializedGate[]
  wires: SerializedWire[]
  inputNodes: SerializedInputNode[]
  outputNodes: SerializedOutputNode[]
  junctions: SerializedJunction[]
}
```

- [ ] **Step 1.2: Typecheck**

Run: `pnpm run typecheck`
Expected: PASS (no unused warnings expected — file is exported via barrel in Task 5).

### Task 2: `serializeCircuit` (RED → GREEN)

**Files:**
- Create: `src/core/serialization/serialize.ts`
- Create: `src/core/serialization/serialization.test.ts`

- [ ] **Step 2.1: Write the failing serializer tests**

Create `src/core/serialization/serialization.test.ts`:

```typescript
import { describe, it, expect, beforeEach } from 'vitest'
import { useCircuitStore, circuitActions } from '@/store/circuitStore'
import { serializeCircuit } from './serialize'
import { CIRCUIT_FORMAT_VERSION } from './types'

beforeEach(() => {
  circuitActions.clearCircuit()
})

describe('serializeCircuit', () => {
  it('produces a SerializedCircuit with version 1 and the given name', () => {
    const out = serializeCircuit(useCircuitStore.getState(), 'empty')
    expect(out.version).toBe(CIRCUIT_FORMAT_VERSION)
    expect(out.name).toBe('empty')
    expect(out.gates).toEqual([])
    expect(out.wires).toEqual([])
    expect(out.inputNodes).toEqual([])
    expect(out.outputNodes).toEqual([])
    expect(out.junctions).toEqual([])
  })

  it('writes an ISO timestamp to savedAt', () => {
    const out = serializeCircuit(useCircuitStore.getState(), 'empty')
    expect(() => new Date(out.savedAt).toISOString()).not.toThrow()
    expect(out.savedAt).toBe(new Date(out.savedAt).toISOString())
  })

  it('serializes a single gate including width', () => {
    const gate = circuitActions.addGate('NAND', { x: 4, y: 0, z: 4 })
    const out = serializeCircuit(useCircuitStore.getState(), 'one-gate')
    expect(out.gates).toHaveLength(1)
    expect(out.gates[0]).toEqual({
      id: gate.id,
      type: 'NAND',
      position: { x: 4, y: 0, z: 4 },
      rotation: { x: Math.PI / 2, y: 0, z: 0 },
      width: 1,
    })
  })

  it('preserves multi-bit gate width', () => {
    const gate = circuitActions.addGate('AND', { x: 0, y: 0, z: 0 }, 16)
    const out = serializeCircuit(useCircuitStore.getState(), 'wide')
    expect(out.gates[0].width).toBe(16)
    expect(out.gates[0].id).toBe(gate.id)
  })

  it('serializes I/O nodes with name + width + value', () => {
    const i = circuitActions.addInputNode('a', { x: -4, y: 0, z: 0 })
    circuitActions.updateInputNodeValue(i.id, 0)
    circuitActions.addOutputNode('out', { x: 4, y: 0, z: 0 })
    const out = serializeCircuit(useCircuitStore.getState(), 'io')
    expect(out.inputNodes).toHaveLength(1)
    expect(out.outputNodes).toHaveLength(1)
    expect(out.inputNodes[0].name).toBe('a')
    expect(out.inputNodes[0].value).toBe(0)
    expect(out.inputNodes[0].width).toBe(1)
    expect(out.outputNodes[0].name).toBe('out')
  })

  it('deep-clones positions and segments (no shared refs with store)', () => {
    const gate = circuitActions.addGate('NAND', { x: 4, y: 0, z: 4 })
    const out = serializeCircuit(useCircuitStore.getState(), 'isolated')
    out.gates[0].position.x = 9999
    expect(useCircuitStore.getState().gates.find((g) => g.id === gate.id)?.position.x).toBe(4)
  })

  it('serializes wire segments with type and optional arc metadata', () => {
    const a = circuitActions.addGate('NAND', { x: -4, y: 0, z: 0 })
    const b = circuitActions.addGate('NAND', { x: 4, y: 0, z: 0 })
    circuitActions.addWire(
      { type: 'gate', entityId: a.id, pinId: `${a.id}-out-0` },
      { type: 'gate', entityId: b.id, pinId: `${b.id}-in-0` },
      [
        { start: { x: -3, y: 0.2, z: 0 }, end: { x: 0, y: 0.2, z: 0 }, type: 'horizontal' },
        {
          start: { x: 0, y: 0.2, z: 0 },
          end: { x: 0.15, y: 0.2, z: 0 },
          type: 'arc',
          arcCenter: { x: 0.075, y: 0.2, z: 0 },
          arcRadius: 0.075,
          crossedWireId: 'some-other-wire',
        },
        { start: { x: 0.15, y: 0.2, z: 0 }, end: { x: 3, y: 0.2, z: 0 }, type: 'horizontal' },
      ],
    )
    const out = serializeCircuit(useCircuitStore.getState(), 'arced')
    expect(out.wires).toHaveLength(1)
    const segs = out.wires[0].segments
    expect(segs).toHaveLength(3)
    expect(segs[1]).toEqual({
      start: { x: 0, y: 0.2, z: 0 },
      end: { x: 0.15, y: 0.2, z: 0 },
      type: 'arc',
      arcCenter: { x: 0.075, y: 0.2, z: 0 },
      arcRadius: 0.075,
      crossedWireId: 'some-other-wire',
    })
  })
})
```

- [ ] **Step 2.2: Run the failing test**

Run: `pnpm exec vitest run src/core/serialization/serialization.test.ts`
Expected: FAIL with `Cannot find module './serialize'`.

- [ ] **Step 2.3: Implement `serializeCircuit`**

Create `src/core/serialization/serialize.ts`:

```typescript
import type { CircuitState } from '@/store/types'
import {
  CIRCUIT_FORMAT_VERSION,
  type SerializedCircuit,
  type SerializedGate,
  type SerializedInputNode,
  type SerializedJunction,
  type SerializedOutputNode,
  type SerializedWire,
  type SerializedWireSegment,
} from './types'

const cloneVec3 = (v: { x: number; y: number; z: number }) => ({ x: v.x, y: v.y, z: v.z })

function cloneSegment(s: {
  start: { x: number; y: number; z: number }
  end: { x: number; y: number; z: number }
  type: 'horizontal' | 'vertical' | 'entry' | 'exit' | 'arc'
  arcCenter?: { x: number; y: number; z: number }
  arcRadius?: number
  crossedWireId?: string
}): SerializedWireSegment {
  const out: SerializedWireSegment = {
    start: cloneVec3(s.start),
    end: cloneVec3(s.end),
    type: s.type,
  }
  if (s.arcCenter) out.arcCenter = cloneVec3(s.arcCenter)
  if (s.arcRadius !== undefined) out.arcRadius = s.arcRadius
  if (s.crossedWireId) out.crossedWireId = s.crossedWireId
  return out
}

export function serializeCircuit(state: CircuitState, name: string): SerializedCircuit {
  const gates: SerializedGate[] = state.gates.map((g) => ({
    id: g.id,
    type: g.type,
    position: cloneVec3(g.position),
    rotation: cloneVec3(g.rotation),
    width: g.width,
  }))

  const wires: SerializedWire[] = state.wires.map((w) => {
    const out: SerializedWire = {
      id: w.id,
      from: { type: w.from.type, entityId: w.from.entityId, ...(w.from.pinId ? { pinId: w.from.pinId } : {}) },
      to: { type: w.to.type, entityId: w.to.entityId, ...(w.to.pinId ? { pinId: w.to.pinId } : {}) },
      segments: w.segments.map(cloneSegment),
      crossesWireIds: [...w.crossesWireIds],
    }
    if (w.signalId) out.signalId = w.signalId
    if (w.width !== undefined) out.width = w.width
    return out
  })

  const inputNodes: SerializedInputNode[] = state.inputNodes.map((n) => ({
    id: n.id,
    name: n.name,
    position: cloneVec3(n.position),
    rotation: cloneVec3(n.rotation),
    value: n.value,
    width: n.width,
  }))

  const outputNodes: SerializedOutputNode[] = state.outputNodes.map((n) => ({
    id: n.id,
    name: n.name,
    position: cloneVec3(n.position),
    rotation: cloneVec3(n.rotation),
    value: n.value,
    width: n.width,
  }))

  const junctions: SerializedJunction[] = state.junctions.map((j) => ({
    id: j.id,
    position: cloneVec3(j.position),
    signalId: j.signalId,
    wireIds: [...j.wireIds],
  }))

  return {
    version: CIRCUIT_FORMAT_VERSION,
    name,
    savedAt: new Date().toISOString(),
    gates,
    wires,
    inputNodes,
    outputNodes,
    junctions,
  }
}
```

- [ ] **Step 2.4: Run tests again**

Run: `pnpm exec vitest run src/core/serialization/serialization.test.ts`
Expected: All tests PASS.

- [ ] **Step 2.5: Commit**

```bash
git add src/core/serialization/types.ts src/core/serialization/serialize.ts src/core/serialization/serialization.test.ts
git commit -m "feat(serialize): SerializedCircuit types + pure serializeCircuit (P05-14)"
```

### Task 3: `deserializeCircuit` (RED → GREEN)

**Files:**
- Create: `src/core/serialization/deserialize.ts`
- Modify: `src/core/serialization/serialization.test.ts` (add `describe('deserializeCircuit')`)

- [ ] **Step 3.1: Add failing deserializer tests**

Append the following to `src/core/serialization/serialization.test.ts`:

```typescript
import { deserializeCircuit } from './deserialize'

describe('deserializeCircuit', () => {
  it('rejects unknown version', () => {
    expect(() =>
      deserializeCircuit({ version: 0 as 1, name: 'x', savedAt: '', gates: [], wires: [], inputNodes: [], outputNodes: [], junctions: [] }),
    ).toThrow(/Unsupported circuit version/)
  })

  it('round-trips an empty circuit', () => {
    const out = serializeCircuit(useCircuitStore.getState(), 'empty')
    const restored = deserializeCircuit(out)
    expect(restored).toEqual({ gates: [], wires: [], inputNodes: [], outputNodes: [], junctions: [] })
  })

  it('round-trips a single gate and preserves its id, width, and pin ids', () => {
    const gate = circuitActions.addGate('NAND', { x: 4, y: 0, z: 4 }, 1)
    const expectedInIds = gate.inputs.map((p) => p.id)
    const expectedOutIds = gate.outputs.map((p) => p.id)

    const blob = serializeCircuit(useCircuitStore.getState(), 'one-gate')
    const restored = deserializeCircuit(blob)

    expect(restored.gates).toHaveLength(1)
    expect(restored.gates[0].id).toBe(gate.id)
    expect(restored.gates[0].width).toBe(1)
    expect(restored.gates[0].inputs.map((p) => p.id)).toEqual(expectedInIds)
    expect(restored.gates[0].outputs.map((p) => p.id)).toEqual(expectedOutIds)
  })

  it('round-trips a 16-bit gate', () => {
    const gate = circuitActions.addGate('AND', { x: 0, y: 0, z: 0 }, 16)
    const blob = serializeCircuit(useCircuitStore.getState(), 'wide')
    const restored = deserializeCircuit(blob)
    expect(restored.gates[0].width).toBe(16)
    expect(restored.gates[0].inputs.every((p) => p.width === 16)).toBe(true)
    expect(restored.gates[0].outputs.every((p) => p.width === 16)).toBe(true)
    expect(restored.gates[0].id).toBe(gate.id)
  })

  it('round-trips a gate-to-gate wire with arc segment', () => {
    const a = circuitActions.addGate('NAND', { x: -4, y: 0, z: 0 })
    const b = circuitActions.addGate('NAND', { x: 4, y: 0, z: 0 })
    circuitActions.addWire(
      { type: 'gate', entityId: a.id, pinId: `${a.id}-out-0` },
      { type: 'gate', entityId: b.id, pinId: `${b.id}-in-0` },
      [
        { start: { x: -3, y: 0.2, z: 0 }, end: { x: 0, y: 0.2, z: 0 }, type: 'horizontal' },
        { start: { x: 0, y: 0.2, z: 0 }, end: { x: 0.15, y: 0.2, z: 0 }, type: 'arc', arcCenter: { x: 0.075, y: 0.2, z: 0 }, arcRadius: 0.075, crossedWireId: 'other' },
        { start: { x: 0.15, y: 0.2, z: 0 }, end: { x: 3, y: 0.2, z: 0 }, type: 'horizontal' },
      ],
    )
    const blob = serializeCircuit(useCircuitStore.getState(), 'arced')
    const restored = deserializeCircuit(blob)
    expect(restored.wires).toHaveLength(1)
    expect(restored.wires[0].segments).toEqual(blob.wires[0].segments)
    expect(restored.wires[0].from).toEqual(blob.wires[0].from)
  })

  it('round-trips junctions with signalId and wireIds', () => {
    const a = circuitActions.addGate('NAND', { x: 0, y: 0, z: 0 })
    const blob: ReturnType<typeof serializeCircuit> = {
      version: 1,
      name: 'jn',
      savedAt: new Date().toISOString(),
      gates: [
        {
          id: a.id,
          type: 'NAND',
          position: { x: 0, y: 0, z: 0 },
          rotation: { x: Math.PI / 2, y: 0, z: 0 },
          width: 1,
        },
      ],
      wires: [],
      inputNodes: [],
      outputNodes: [],
      junctions: [
        { id: 'junction-test-1', position: { x: 2, y: 0.2, z: 0 }, signalId: 'sig-1', wireIds: ['wire-a', 'wire-b'] },
      ],
    }
    const restored = deserializeCircuit(blob)
    expect(restored.junctions).toEqual(blob.junctions)
  })

  it('honors the saved InputNode value (does not re-default to 1)', () => {
    const i = circuitActions.addInputNode('a', { x: 0, y: 0, z: 0 })
    circuitActions.updateInputNodeValue(i.id, 0)
    const blob = serializeCircuit(useCircuitStore.getState(), 'val')
    const restored = deserializeCircuit(blob)
    expect(restored.inputNodes[0].value).toBe(0)
  })
})
```

- [ ] **Step 3.2: Run the failing tests**

Run: `pnpm exec vitest run src/core/serialization/serialization.test.ts`
Expected: FAIL with `Cannot find module './deserialize'`.

- [ ] **Step 3.3: Implement `deserializeCircuit`**

Create `src/core/serialization/deserialize.ts`:

```typescript
import { createGateInstance } from '@/store/actions/gateActions/gateActions'
import type { GateInstance, GateType, InputNode, JunctionNode, OutputNode, Pin, Wire } from '@/store/types'
import type { WireSegment } from '@/utils/wiringScheme/types'
import {
  CIRCUIT_FORMAT_VERSION,
  type SerializedCircuit,
  type SerializedGate,
  type SerializedInputNode,
  type SerializedJunction,
  type SerializedOutputNode,
  type SerializedWire,
  type SerializedWireSegment,
} from './types'

export interface DeserializedCircuit {
  gates: GateInstance[]
  wires: Wire[]
  inputNodes: InputNode[]
  outputNodes: OutputNode[]
  junctions: JunctionNode[]
}

const cloneVec3 = (v: { x: number; y: number; z: number }) => ({ x: v.x, y: v.y, z: v.z })

function reconstructGate(s: SerializedGate): GateInstance {
  const tmpl = createGateInstance(s.type as GateType, cloneVec3(s.position), s.width)
  const inputs: Pin[] = tmpl.inputs.map((p, i) => ({
    ...p,
    id: `${s.id}-in-${i}`,
    value: 0,
    width: s.width,
  }))
  const outputs: Pin[] = tmpl.outputs.map((p, i) => ({
    ...p,
    id: `${s.id}-out-${i}`,
    value: 0,
    width: s.width,
  }))
  return {
    id: s.id,
    type: s.type as GateType,
    position: cloneVec3(s.position),
    rotation: cloneVec3(s.rotation),
    inputs,
    outputs,
    selected: false,
    width: s.width,
  }
}

function reconstructSegment(s: SerializedWireSegment): WireSegment {
  const out: WireSegment = {
    start: cloneVec3(s.start),
    end: cloneVec3(s.end),
    type: s.type,
  }
  if (s.arcCenter) out.arcCenter = cloneVec3(s.arcCenter)
  if (s.arcRadius !== undefined) out.arcRadius = s.arcRadius
  if (s.crossedWireId) out.crossedWireId = s.crossedWireId
  return out
}

function reconstructWire(s: SerializedWire): Wire {
  const out: Wire = {
    id: s.id,
    from: { type: s.from.type, entityId: s.from.entityId, ...(s.from.pinId ? { pinId: s.from.pinId } : {}) },
    to: { type: s.to.type, entityId: s.to.entityId, ...(s.to.pinId ? { pinId: s.to.pinId } : {}) },
    segments: s.segments.map(reconstructSegment),
    crossesWireIds: [...s.crossesWireIds],
  }
  if (s.signalId) out.signalId = s.signalId
  if (s.width !== undefined) out.width = s.width
  return out
}

function reconstructInputNode(s: SerializedInputNode): InputNode {
  return {
    id: s.id,
    name: s.name,
    position: cloneVec3(s.position),
    rotation: cloneVec3(s.rotation),
    value: s.value,
    width: s.width,
  }
}

function reconstructOutputNode(s: SerializedOutputNode): OutputNode {
  return {
    id: s.id,
    name: s.name,
    position: cloneVec3(s.position),
    rotation: cloneVec3(s.rotation),
    value: s.value,
    width: s.width,
  }
}

function reconstructJunction(s: SerializedJunction): JunctionNode {
  return {
    id: s.id,
    position: cloneVec3(s.position),
    signalId: s.signalId,
    wireIds: [...s.wireIds],
  }
}

export function deserializeCircuit(data: SerializedCircuit): DeserializedCircuit {
  if (data.version !== CIRCUIT_FORMAT_VERSION) {
    throw new Error(`Unsupported circuit version: ${data.version}`)
  }
  return {
    gates: data.gates.map(reconstructGate),
    wires: data.wires.map(reconstructWire),
    inputNodes: data.inputNodes.map(reconstructInputNode),
    outputNodes: data.outputNodes.map(reconstructOutputNode),
    junctions: data.junctions.map(reconstructJunction),
  }
}
```

- [ ] **Step 3.4: Run tests**

Run: `pnpm exec vitest run src/core/serialization/serialization.test.ts`
Expected: All tests PASS.

- [ ] **Step 3.5: Commit**

```bash
git add src/core/serialization/deserialize.ts src/core/serialization/serialization.test.ts
git commit -m "feat(serialize): deserializeCircuit with pin-id-preserving gate reconstruction (P05-14)"
```

### Task 4: Barrel export

**Files:**
- Create: `src/core/serialization/index.ts`

- [ ] **Step 4.1: Write the barrel**

```typescript
// src/core/serialization/index.ts
export * from './types'
export { serializeCircuit } from './serialize'
export { deserializeCircuit, type DeserializedCircuit } from './deserialize'
```

- [ ] **Step 4.2: Verify**

Run: `pnpm run typecheck`
Expected: PASS.

- [ ] **Step 4.3: Commit**

```bash
git add src/core/serialization/index.ts
git commit -m "feat(serialize): barrel export for serialization module (P05-14)"
```

---

## Chunk 2: `persistenceActions` slice

### Task 5: Declare the `PersistenceActions` interface in store types

**Files:**
- Modify: `src/store/types.ts`

- [ ] **Step 5.1: Append the interface and extend the `CircuitStore` union**

Append immediately after the existing `StatusActions` declaration, then update the `CircuitStore` extends list to include `PersistenceActions`:

```typescript
// Add near the bottom of src/store/types.ts, just above the `CircuitStore` declaration.
export interface SavedCircuitSummary {
  name: string
  savedAt: string
}

export interface PersistenceActions {
  saveCircuit: (name: string) => void
  loadCircuit: (name: string) => boolean
  listSavedCircuits: () => SavedCircuitSummary[]
  deleteSavedCircuit: (name: string) => void
  exportCircuitJSON: (name?: string) => void
  importCircuitJSON: (json: string) => boolean
}
```

Then update:

```typescript
export interface CircuitStore extends CircuitState, GateActions, WireActions, SimulationActions, PlacementActions, NodePlacementActions, WiringActions, PinHelpers, ViewActions, NodeActions, JunctionActions, JunctionPlacementActions, StatusActions, PersistenceActions {}
```

- [ ] **Step 5.2: Typecheck**

Run: `pnpm run typecheck`
Expected: FAIL with `Class 'CircuitStore' incorrectly extends interface … missing property 'saveCircuit'` etc. (We have not implemented the slice yet — that's the GREEN step in Task 6.)

> Leave the type-check failing for now; Task 6 fixes it. If you really need a green tree between Task 5 and Task 6, stash the change instead.

### Task 6: Implement `persistenceActions.ts` (save / list / delete)

**Files:**
- Create: `src/store/actions/persistenceActions/persistenceActions.ts`
- Create: `src/store/actions/persistenceActions/persistenceActions.test.ts`

- [ ] **Step 6.1: Write the failing tests for save / list / delete**

Create `src/store/actions/persistenceActions/persistenceActions.test.ts`:

```typescript
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { useCircuitStore, circuitActions } from '@/store/circuitStore'

vi.mock('@/lib/notify', () => ({
  notify: {
    success: vi.fn(),
    info: vi.fn(),
    error: vi.fn(),
    warning: vi.fn(),
  },
}))

beforeEach(() => {
  localStorage.clear()
  circuitActions.clearCircuit()
})

describe('saveCircuit', () => {
  it('writes a SerializedCircuit JSON under hacer-circuit-<name>', () => {
    circuitActions.addGate('NAND', { x: 0, y: 0, z: 0 })
    circuitActions.saveCircuit('demo')
    const raw = localStorage.getItem('hacer-circuit-demo')
    expect(raw).not.toBeNull()
    const data = JSON.parse(raw!)
    expect(data.version).toBe(1)
    expect(data.name).toBe('demo')
    expect(data.gates).toHaveLength(1)
  })

  it('rejects empty or whitespace-only names (no localStorage entry)', async () => {
    const { notify } = await import('@/lib/notify')
    circuitActions.saveCircuit('')
    circuitActions.saveCircuit('   ')
    expect(localStorage.length).toBe(0)
    expect(notify.warning).toHaveBeenCalled()
  })

  it('overwrites an existing entry under the same name', () => {
    circuitActions.saveCircuit('demo')
    const first = JSON.parse(localStorage.getItem('hacer-circuit-demo')!)
    circuitActions.addGate('AND', { x: 4, y: 0, z: 4 })
    circuitActions.saveCircuit('demo')
    const second = JSON.parse(localStorage.getItem('hacer-circuit-demo')!)
    expect(second.gates.length).toBeGreaterThan(first.gates.length)
  })
})

describe('listSavedCircuits', () => {
  it('returns sorted entries with name + savedAt (newest first)', async () => {
    circuitActions.saveCircuit('first')
    await new Promise((r) => setTimeout(r, 5))
    circuitActions.saveCircuit('second')
    const list = circuitActions.listSavedCircuits()
    expect(list.map((e) => e.name)).toEqual(['second', 'first'])
  })

  it('excludes the __autosave__ slot from the user-facing list', () => {
    circuitActions.saveCircuit('a')
    localStorage.setItem('hacer-circuit-__autosave__', JSON.stringify({
      version: 1, name: '__autosave__', savedAt: new Date().toISOString(),
      gates: [], wires: [], inputNodes: [], outputNodes: [], junctions: [],
    }))
    const list = circuitActions.listSavedCircuits()
    expect(list.map((e) => e.name)).toEqual(['a'])
  })
})

describe('deleteSavedCircuit', () => {
  it('removes the named entry only', () => {
    circuitActions.saveCircuit('a')
    circuitActions.saveCircuit('b')
    circuitActions.deleteSavedCircuit('a')
    expect(localStorage.getItem('hacer-circuit-a')).toBeNull()
    expect(localStorage.getItem('hacer-circuit-b')).not.toBeNull()
  })
})
```

- [ ] **Step 6.2: Run the failing test**

Run: `pnpm exec vitest run src/store/actions/persistenceActions/persistenceActions.test.ts`
Expected: FAIL with `Cannot find module … persistenceActions` (no implementation yet).

- [ ] **Step 6.3: Implement the slice (save/list/delete only — load/import/export in later tasks)**

Create `src/store/actions/persistenceActions/persistenceActions.ts`:

```typescript
import { notify } from '@/lib/notify'
import { serializeCircuit } from '@/core/serialization'
import type { CircuitStore, PersistenceActions, SavedCircuitSummary } from '../../types'

export const STORAGE_PREFIX = 'hacer-circuit-'
export const AUTOSAVE_KEY = `${STORAGE_PREFIX}__autosave__`

type SetState = (fn: (state: CircuitStore) => void, replace?: false, actionName?: string) => void
type GetState = () => CircuitStore

function safeWrite(key: string, value: string): boolean {
  if (typeof window === 'undefined') return false
  try {
    window.localStorage.setItem(key, value)
    return true
  } catch {
    return false
  }
}

function safeRead(key: string): string | null {
  if (typeof window === 'undefined') return null
  try {
    return window.localStorage.getItem(key)
  } catch {
    return null
  }
}

function safeRemove(key: string): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.removeItem(key)
  } catch {
    // ignore
  }
}

function normalizeName(name: string): string {
  return name.trim()
}

function storageKeyFor(name: string): string {
  return `${STORAGE_PREFIX}${name}`
}

export const createPersistenceActions = (_set: SetState, get: GetState): PersistenceActions => ({
  saveCircuit: (rawName: string) => {
    const name = normalizeName(rawName)
    if (!name) {
      notify.warning('Save needs a name')
      return
    }
    const data = serializeCircuit(get(), name)
    const ok = safeWrite(storageKeyFor(name), JSON.stringify(data))
    if (ok) {
      notify.success(`Saved circuit "${name}"`)
    } else {
      notify.error(`Could not save circuit "${name}"`)
    }
  },

  loadCircuit: (_name: string) => {
    throw new Error('loadCircuit: not implemented yet (Task 7)')
  },

  listSavedCircuits: () => {
    if (typeof window === 'undefined') return []
    const out: SavedCircuitSummary[] = []
    for (let i = 0; i < window.localStorage.length; i++) {
      const key = window.localStorage.key(i)
      if (!key || !key.startsWith(STORAGE_PREFIX) || key === AUTOSAVE_KEY) continue
      const raw = safeRead(key)
      if (!raw) continue
      try {
        const parsed = JSON.parse(raw) as { name?: string; savedAt?: string }
        if (typeof parsed.name === 'string' && typeof parsed.savedAt === 'string') {
          out.push({ name: parsed.name, savedAt: parsed.savedAt })
        }
      } catch {
        // ignore corrupt entries
      }
    }
    return out.sort((a, b) => b.savedAt.localeCompare(a.savedAt))
  },

  deleteSavedCircuit: (rawName: string) => {
    const name = normalizeName(rawName)
    if (!name) return
    safeRemove(storageKeyFor(name))
    notify.info(`Deleted circuit "${name}"`)
  },

  exportCircuitJSON: (_name?: string) => {
    throw new Error('exportCircuitJSON: not implemented yet (Task 9)')
  },

  importCircuitJSON: (_json: string) => {
    throw new Error('importCircuitJSON: not implemented yet (Task 9)')
  },
})
```

- [ ] **Step 6.4: Wire the slice into the store**

Edit `src/store/circuitStore.ts`. Add the import next to the other slice imports:

```typescript
import { createPersistenceActions } from './actions/persistenceActions/persistenceActions'
```

Spread it inside the store factory next to `createStatusActions(set)`:

```typescript
...createStatusActions(set),
...createPersistenceActions(set, get),
```

Then add the corresponding entries to `circuitActions` (mirror the existing pattern with `Parameters<CircuitStore[...]>`):

```typescript
// Persistence actions
saveCircuit: (...args: Parameters<CircuitStore['saveCircuit']>) => useCircuitStore.getState().saveCircuit(...args),
loadCircuit: (...args: Parameters<CircuitStore['loadCircuit']>) => useCircuitStore.getState().loadCircuit(...args),
listSavedCircuits: () => useCircuitStore.getState().listSavedCircuits(),
deleteSavedCircuit: (...args: Parameters<CircuitStore['deleteSavedCircuit']>) => useCircuitStore.getState().deleteSavedCircuit(...args),
exportCircuitJSON: (...args: Parameters<CircuitStore['exportCircuitJSON']>) => useCircuitStore.getState().exportCircuitJSON(...args),
importCircuitJSON: (...args: Parameters<CircuitStore['importCircuitJSON']>) => useCircuitStore.getState().importCircuitJSON(...args),
```

- [ ] **Step 6.5: Run the tests**

Run: `pnpm exec vitest run src/store/actions/persistenceActions/persistenceActions.test.ts`
Expected: PASS for save / list / delete (and silent for load / export / import — they're not exercised yet).

- [ ] **Step 6.6: Run typecheck + the broader vitest suite**

Run: `pnpm run typecheck && pnpm exec vitest run src/store src/core/serialization`
Expected: PASS.

- [ ] **Step 6.7: Commit**

```bash
git add src/store/types.ts src/store/actions/persistenceActions src/store/circuitStore.ts
git commit -m "feat(store): persistenceActions skeleton + save/list/delete (P05-14)"
```

### Task 7: Implement `loadCircuit`

**Files:**
- Modify: `src/store/actions/persistenceActions/persistenceActions.ts`
- Modify: `src/store/actions/persistenceActions/persistenceActions.test.ts`

- [ ] **Step 7.1: Append failing tests for `loadCircuit`**

Append to `persistenceActions.test.ts`:

```typescript
describe('loadCircuit', () => {
  it('returns false when the named circuit is missing', () => {
    expect(circuitActions.loadCircuit('does-not-exist')).toBe(false)
  })

  it('replaces gates / wires / nodes / junctions with the saved snapshot', () => {
    const a = circuitActions.addGate('NAND', { x: 0, y: 0, z: 0 })
    const b = circuitActions.addGate('NAND', { x: 4, y: 0, z: 0 })
    circuitActions.addWire(
      { type: 'gate', entityId: a.id, pinId: `${a.id}-out-0` },
      { type: 'gate', entityId: b.id, pinId: `${b.id}-in-0` },
      [{ start: { x: -2, y: 0.2, z: 0 }, end: { x: 2, y: 0.2, z: 0 }, type: 'horizontal' }],
    )
    circuitActions.saveCircuit('snap')
    circuitActions.clearCircuit()

    expect(circuitActions.loadCircuit('snap')).toBe(true)
    const state = useCircuitStore.getState()
    expect(state.gates).toHaveLength(2)
    expect(state.wires).toHaveLength(1)
    expect(state.wires[0].from.entityId).toBe(a.id)
    expect(state.wires[0].to.entityId).toBe(b.id)
  })

  it('clears selection, placement, wiring, and lastSimulationError before applying', () => {
    const gate = circuitActions.addGate('NAND', { x: 0, y: 0, z: 0 })
    circuitActions.selectGate(gate.id)
    circuitActions.startPlacement('AND')
    useCircuitStore.setState((s) => {
      s.lastSimulationError = { type: 'cycle', involvedGateIds: [gate.id] }
    })
    circuitActions.saveCircuit('s')

    circuitActions.loadCircuit('s')
    const s = useCircuitStore.getState()
    expect(s.selectedGateId).toBeNull()
    expect(s.selectedWireId).toBeNull()
    expect(s.selectedNodeId).toBeNull()
    expect(s.placementMode).toBeNull()
    expect(s.nodePlacementMode).toBeNull()
    expect(s.wiringFrom).toBeNull()
    expect(s.lastSimulationError).toBeNull()
  })

  it('ticks the simulation so outputs reflect saved input values', () => {
    const i = circuitActions.addInputNode('a', { x: -4, y: 0, z: 0 })
    const o = circuitActions.addOutputNode('out', { x: 4, y: 0, z: 0 })
    circuitActions.addWire(
      { type: 'input', entityId: i.id },
      { type: 'output', entityId: o.id },
      [{ start: { x: -3, y: 0.2, z: 0 }, end: { x: 3, y: 0.2, z: 0 }, type: 'horizontal' }],
    )
    circuitActions.updateInputNodeValue(i.id, 1)
    circuitActions.saveCircuit('passthrough')
    circuitActions.clearCircuit()

    circuitActions.loadCircuit('passthrough')
    const out = useCircuitStore.getState().outputNodes[0]
    expect(out.value).toBe(1)
  })

  it('returns false on JSON parse failure', () => {
    localStorage.setItem('hacer-circuit-broken', '{ this is not json')
    expect(circuitActions.loadCircuit('broken')).toBe(false)
  })

  it('returns false on unsupported version', () => {
    localStorage.setItem('hacer-circuit-future', JSON.stringify({
      version: 999, name: 'future', savedAt: new Date().toISOString(),
      gates: [], wires: [], inputNodes: [], outputNodes: [], junctions: [],
    }))
    expect(circuitActions.loadCircuit('future')).toBe(false)
  })
})
```

- [ ] **Step 7.2: Run the failing tests**

Run: `pnpm exec vitest run src/store/actions/persistenceActions/persistenceActions.test.ts -t loadCircuit`
Expected: FAIL (current `loadCircuit` throws "not implemented yet").

- [ ] **Step 7.3: Implement `loadCircuit`**

Replace the stub in `persistenceActions.ts`:

```typescript
import { deserializeCircuit, type SerializedCircuit } from '@/core/serialization'

// …keep the rest of the file…

  loadCircuit: (rawName: string) => {
    const name = normalizeName(rawName)
    if (!name) return false
    const raw = safeRead(storageKeyFor(name))
    if (!raw) {
      notify.warning(`Circuit "${name}" not found`)
      return false
    }
    let parsed: SerializedCircuit
    try {
      parsed = JSON.parse(raw) as SerializedCircuit
    } catch {
      notify.error(`Saved circuit "${name}" is corrupt`)
      return false
    }
    let restored
    try {
      restored = deserializeCircuit(parsed)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'unknown error'
      notify.error(`Could not load "${name}": ${message}`)
      return false
    }
    useCircuitStore.setState((s) => {
      s.gates = restored.gates
      s.wires = restored.wires
      s.inputNodes = restored.inputNodes
      s.outputNodes = restored.outputNodes
      s.junctions = restored.junctions

      s.selectedGateId = null
      s.selectedWireId = null
      s.selectedNodeId = null
      s.selectedNodeType = null
      s.placementMode = null
      s.placementPreviewPosition = null
      s.nodePlacementMode = null
      s.junctionPlacementMode = null
      s.junctionPreviewPosition = null
      s.junctionPreviewWireId = null
      s.wiringFrom = null
      s.lastSimulationError = null
    }, false, 'loadCircuit')
    useCircuitStore.getState().simulationTick()
    notify.success(`Loaded "${name}"`)
    return true
  },
```

Add the new import at the top of `persistenceActions.ts`:

```typescript
import { useCircuitStore } from '@/store/circuitStore'
```

- [ ] **Step 7.4: Run the tests**

Run: `pnpm exec vitest run src/store/actions/persistenceActions/persistenceActions.test.ts`
Expected: PASS.

- [ ] **Step 7.5: Commit**

```bash
git add src/store/actions/persistenceActions/persistenceActions.ts src/store/actions/persistenceActions/persistenceActions.test.ts
git commit -m "feat(store): persistenceActions.loadCircuit clears UI state + ticks sim (P05-14)"
```

### Task 8: Implement export and import

**Files:**
- Modify: `src/store/actions/persistenceActions/persistenceActions.ts`
- Modify: `src/store/actions/persistenceActions/persistenceActions.test.ts`

- [ ] **Step 8.1: Append failing tests for export / import**

Append:

```typescript
describe('exportCircuitJSON', () => {
  it('triggers a Blob URL download with the serialized JSON', () => {
    const gate = circuitActions.addGate('NAND', { x: 0, y: 0, z: 0 })

    const createObjectURL = vi.fn().mockReturnValue('blob:hacer-test')
    const revokeObjectURL = vi.fn()
    const originalURL = globalThis.URL
    globalThis.URL = { ...originalURL, createObjectURL, revokeObjectURL } as unknown as typeof URL

    const click = vi.fn()
    const remove = vi.fn()
    const anchor = { click, remove, href: '', download: '', style: {} as CSSStyleDeclaration } as unknown as HTMLAnchorElement
    const createElement = vi.spyOn(document, 'createElement').mockReturnValue(anchor)

    try {
      circuitActions.exportCircuitJSON('export-1')
      expect(createObjectURL).toHaveBeenCalledTimes(1)
      expect(click).toHaveBeenCalledTimes(1)
      const [blob] = createObjectURL.mock.calls[0] as [Blob]
      expect(blob).toBeInstanceOf(Blob)
      expect(anchor.download).toBe('export-1.circuit.json')

      return blob.text().then((text) => {
        const parsed = JSON.parse(text)
        expect(parsed.name).toBe('export-1')
        expect(parsed.gates).toHaveLength(1)
        expect(parsed.gates[0].id).toBe(gate.id)
      })
    } finally {
      globalThis.URL = originalURL
      createElement.mockRestore()
    }
  })
})

describe('importCircuitJSON', () => {
  it('replaces current state with the imported JSON and returns true', () => {
    const blob = JSON.stringify({
      version: 1, name: 'imported', savedAt: new Date().toISOString(),
      gates: [{ id: 'gate-imp-1', type: 'NAND', position: { x: 0, y: 0, z: 0 }, rotation: { x: Math.PI / 2, y: 0, z: 0 }, width: 1 }],
      wires: [], inputNodes: [], outputNodes: [], junctions: [],
    })
    expect(circuitActions.importCircuitJSON(blob)).toBe(true)
    const state = useCircuitStore.getState()
    expect(state.gates).toHaveLength(1)
    expect(state.gates[0].id).toBe('gate-imp-1')
  })

  it('returns false on invalid JSON', () => {
    expect(circuitActions.importCircuitJSON('not json')).toBe(false)
  })

  it('returns false on unsupported version', () => {
    expect(circuitActions.importCircuitJSON(JSON.stringify({
      version: 999, name: 'x', savedAt: new Date().toISOString(),
      gates: [], wires: [], inputNodes: [], outputNodes: [], junctions: [],
    }))).toBe(false)
  })
})
```

- [ ] **Step 8.2: Run the failing tests**

Run: `pnpm exec vitest run src/store/actions/persistenceActions/persistenceActions.test.ts -t exportCircuitJSON`
Expected: FAIL (`exportCircuitJSON: not implemented yet`).

- [ ] **Step 8.3: Implement export and import**

Replace the two stubbed methods:

```typescript
  exportCircuitJSON: (rawName?: string) => {
    const name = normalizeName(rawName ?? '') || 'circuit'
    const data = serializeCircuit(get(), name)
    const json = JSON.stringify(data, null, 2)
    if (typeof window === 'undefined' || typeof document === 'undefined') return
    const blob = new Blob([json], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${name}.circuit.json`
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
  },

  importCircuitJSON: (json: string) => {
    let parsed: SerializedCircuit
    try {
      parsed = JSON.parse(json) as SerializedCircuit
    } catch {
      notify.error('Imported file is not valid JSON')
      return false
    }
    let restored
    try {
      restored = deserializeCircuit(parsed)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'unknown error'
      notify.error(`Import failed: ${message}`)
      return false
    }
    useCircuitStore.setState((s) => {
      s.gates = restored.gates
      s.wires = restored.wires
      s.inputNodes = restored.inputNodes
      s.outputNodes = restored.outputNodes
      s.junctions = restored.junctions

      s.selectedGateId = null
      s.selectedWireId = null
      s.selectedNodeId = null
      s.selectedNodeType = null
      s.placementMode = null
      s.placementPreviewPosition = null
      s.nodePlacementMode = null
      s.junctionPlacementMode = null
      s.junctionPreviewPosition = null
      s.junctionPreviewWireId = null
      s.wiringFrom = null
      s.lastSimulationError = null
    }, false, 'importCircuitJSON')
    useCircuitStore.getState().simulationTick()
    notify.success(`Imported "${parsed.name ?? 'circuit'}"`)
    return true
  },
```

- [ ] **Step 8.4: Run the tests**

Run: `pnpm exec vitest run src/store/actions/persistenceActions/persistenceActions.test.ts`
Expected: PASS.

- [ ] **Step 8.5: Commit**

```bash
git add src/store/actions/persistenceActions/persistenceActions.ts src/store/actions/persistenceActions/persistenceActions.test.ts
git commit -m "feat(store): persistenceActions exportCircuitJSON + importCircuitJSON (P05-14)"
```

---

## Chunk 3: Debounced autosave

### Task 9: Tiny debounce helper

**Files:**
- Create: `src/store/actions/persistenceActions/debounce.ts`

- [ ] **Step 9.1: Implement and unit-test the debounce**

Create the helper:

```typescript
// src/store/actions/persistenceActions/debounce.ts
export interface DebouncedFn {
  (): void
  cancel: () => void
  flush: () => void
}

export function debounce(fn: () => void, waitMs: number): DebouncedFn {
  let timer: ReturnType<typeof setTimeout> | null = null
  const debounced = (() => {
    if (timer !== null) clearTimeout(timer)
    timer = setTimeout(() => {
      timer = null
      fn()
    }, waitMs)
  }) as DebouncedFn
  debounced.cancel = () => {
    if (timer !== null) {
      clearTimeout(timer)
      timer = null
    }
  }
  debounced.flush = () => {
    if (timer !== null) {
      clearTimeout(timer)
      timer = null
      fn()
    }
  }
  return debounced
}
```

Create `src/store/actions/persistenceActions/debounce.test.ts`:

```typescript
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { debounce } from './debounce'

describe('debounce', () => {
  beforeEach(() => vi.useFakeTimers())

  it('coalesces repeated calls into one execution after wait', () => {
    const spy = vi.fn()
    const d = debounce(spy, 100)
    d(); d(); d()
    vi.advanceTimersByTime(99)
    expect(spy).toHaveBeenCalledTimes(0)
    vi.advanceTimersByTime(1)
    expect(spy).toHaveBeenCalledTimes(1)
  })

  it('cancel() drops pending invocations', () => {
    const spy = vi.fn()
    const d = debounce(spy, 100)
    d()
    d.cancel()
    vi.advanceTimersByTime(500)
    expect(spy).not.toHaveBeenCalled()
  })

  it('flush() runs the pending call immediately', () => {
    const spy = vi.fn()
    const d = debounce(spy, 100)
    d()
    d.flush()
    expect(spy).toHaveBeenCalledTimes(1)
    vi.advanceTimersByTime(500)
    expect(spy).toHaveBeenCalledTimes(1)
  })
})
```

- [ ] **Step 9.2: Run the test**

Run: `pnpm exec vitest run src/store/actions/persistenceActions/debounce.test.ts`
Expected: PASS.

### Task 10: Autosave subscription

**Files:**
- Create: `src/store/actions/persistenceActions/autosave.ts`
- Create: `src/store/actions/persistenceActions/autosave.test.ts`

- [ ] **Step 10.1: Write the failing autosave tests**

Create `src/store/actions/persistenceActions/autosave.test.ts`:

```typescript
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { useCircuitStore, circuitActions } from '@/store/circuitStore'
import { AUTOSAVE_KEY } from './persistenceActions'
import { __resetAutosaveForTests, AUTOSAVE_DEBOUNCE_MS, subscribeAutosave } from './autosave'

beforeEach(() => {
  vi.useFakeTimers()
  localStorage.clear()
  circuitActions.clearCircuit()
  __resetAutosaveForTests()
  subscribeAutosave()
})

afterEach(() => {
  __resetAutosaveForTests()
  vi.useRealTimers()
})

describe('subscribeAutosave', () => {
  it('does not write before the debounce window elapses', () => {
    circuitActions.addGate('NAND', { x: 0, y: 0, z: 0 })
    expect(localStorage.getItem(AUTOSAVE_KEY)).toBeNull()
  })

  it('writes a SerializedCircuit to the autosave slot after the debounce', () => {
    circuitActions.addGate('NAND', { x: 0, y: 0, z: 0 })
    vi.advanceTimersByTime(AUTOSAVE_DEBOUNCE_MS)
    const raw = localStorage.getItem(AUTOSAVE_KEY)
    expect(raw).not.toBeNull()
    const data = JSON.parse(raw!)
    expect(data.version).toBe(1)
    expect(data.name).toBe('__autosave__')
    expect(data.gates).toHaveLength(1)
  })

  it('coalesces multiple rapid changes into a single write', () => {
    const setItem = vi.spyOn(Storage.prototype, 'setItem')
    circuitActions.addGate('NAND', { x: 0, y: 0, z: 0 })
    circuitActions.addGate('AND', { x: 4, y: 0, z: 0 })
    circuitActions.addInputNode('a', { x: -4, y: 0, z: 0 })
    expect(setItem.mock.calls.filter(([k]) => k === AUTOSAVE_KEY)).toHaveLength(0)
    vi.advanceTimersByTime(AUTOSAVE_DEBOUNCE_MS)
    expect(setItem.mock.calls.filter(([k]) => k === AUTOSAVE_KEY)).toHaveLength(1)
    setItem.mockRestore()
  })

  it('ignores UI-only mutations that do not touch the watched slices', () => {
    // `gates` / `wires` / `inputNodes` / `outputNodes` / `junctions` are the watched
    // slices. `placementMode`, `statusMessages`, `propertiesPanelOpen`, etc. live
    // outside that set, so toggling them must NOT schedule a new autosave write.
    //
    // NOTE: `selectGate` mutates each gate's `selected` field via Immer, which
    // does produce a new `gates` array reference and therefore DOES schedule an
    // autosave. That is intentional and harmless (the serializer drops `selected`,
    // so the write is functionally a no-op besides the new `savedAt`).
    circuitActions.addGate('NAND', { x: 0, y: 0, z: 0 })
    vi.advanceTimersByTime(AUTOSAVE_DEBOUNCE_MS)
    const baseline = localStorage.getItem(AUTOSAVE_KEY)
    circuitActions.startPlacement('AND')
    circuitActions.cancelPlacement()
    circuitActions.addStatus('info', 'just a message')
    vi.advanceTimersByTime(AUTOSAVE_DEBOUNCE_MS)
    expect(localStorage.getItem(AUTOSAVE_KEY)).toBe(baseline)
  })
})
```

- [ ] **Step 10.2: Run the failing tests**

Run: `pnpm exec vitest run src/store/actions/persistenceActions/autosave.test.ts`
Expected: FAIL with `Cannot find module './autosave'`.

- [ ] **Step 10.3: Implement the autosave**

Create `src/store/actions/persistenceActions/autosave.ts`:

```typescript
import { serializeCircuit } from '@/core/serialization'
import { useCircuitStore } from '@/store/circuitStore'
import { AUTOSAVE_KEY } from './persistenceActions'
import { debounce, type DebouncedFn } from './debounce'

export const AUTOSAVE_DEBOUNCE_MS = 2000
export const AUTOSAVE_NAME = '__autosave__'

let unsubscribe: (() => void) | null = null
let pendingWrite: DebouncedFn | null = null

function writeAutosave(): void {
  if (typeof window === 'undefined') return
  const state = useCircuitStore.getState()
  const data = serializeCircuit(state, AUTOSAVE_NAME)
  try {
    window.localStorage.setItem(AUTOSAVE_KEY, JSON.stringify(data))
  } catch {
    // localStorage may be unavailable; the next change will retry.
  }
}

export function subscribeAutosave(): void {
  if (unsubscribe) return
  pendingWrite = debounce(writeAutosave, AUTOSAVE_DEBOUNCE_MS)
  unsubscribe = useCircuitStore.subscribe((state, prev) => {
    if (
      state.gates !== prev.gates ||
      state.wires !== prev.wires ||
      state.inputNodes !== prev.inputNodes ||
      state.outputNodes !== prev.outputNodes ||
      state.junctions !== prev.junctions
    ) {
      pendingWrite!()
    }
  })
}

export function __resetAutosaveForTests(): void {
  if (pendingWrite) pendingWrite.cancel()
  pendingWrite = null
  if (unsubscribe) {
    unsubscribe()
    unsubscribe = null
  }
}
```

- [ ] **Step 10.4: Wire `subscribeAutosave` into `circuitStore.ts`**

In `src/store/circuitStore.ts`, immediately after the simulation interval subscription block (after the `setInterval`/`speed` subscribes), add:

```typescript
import { subscribeAutosave } from './actions/persistenceActions/autosave'

subscribeAutosave()
```

- [ ] **Step 10.5: Run the tests**

Run: `pnpm exec vitest run src/store/actions/persistenceActions/autosave.test.ts`
Expected: PASS.

- [ ] **Step 10.6: Run the broader suite to ensure we did not break anything**

Run: `pnpm run typecheck && pnpm exec vitest run`
Expected: PASS.

- [ ] **Step 10.7: Commit**

```bash
git add src/store/actions/persistenceActions/debounce.ts src/store/actions/persistenceActions/debounce.test.ts src/store/actions/persistenceActions/autosave.ts src/store/actions/persistenceActions/autosave.test.ts src/store/circuitStore.ts
git commit -m "feat(store): debounced autosave subscription writes __autosave__ slot (P05-14)"
```

---

## Chunk 4: `CircuitLibrary` component

### Task 11: Library panel UI

**Files:**
- Create: `src/components/ui/CircuitLibrary.tsx`
- Create: `src/components/ui/CircuitLibrary.test.tsx`

- [ ] **Step 11.1: Write the failing component test**

Create `src/components/ui/CircuitLibrary.test.tsx`:

```typescript
import { describe, it, expect, beforeEach, vi } from 'vitest'
import '@testing-library/jest-dom/vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { useCircuitStore, circuitActions } from '@/store/circuitStore'
import { CircuitLibrary } from './CircuitLibrary'

vi.mock('@/lib/notify', () => ({
  notify: {
    success: vi.fn(),
    info: vi.fn(),
    error: vi.fn(),
    warning: vi.fn(),
  },
}))

beforeEach(() => {
  localStorage.clear()
  circuitActions.clearCircuit()
})

describe('CircuitLibrary', () => {
  it('renders an empty state when no saved circuits exist', () => {
    render(<CircuitLibrary />)
    expect(screen.getByTestId('library-empty-state')).toBeInTheDocument()
  })

  it('saves the current circuit when the user submits a name', () => {
    circuitActions.addGate('NAND', { x: 0, y: 0, z: 0 })
    render(<CircuitLibrary />)
    fireEvent.change(screen.getByTestId('library-name-input'), { target: { value: 'my-circuit' } })
    fireEvent.click(screen.getByTestId('library-save'))
    expect(localStorage.getItem('hacer-circuit-my-circuit')).not.toBeNull()
    expect(screen.getByTestId('library-entry-my-circuit')).toBeInTheDocument()
  })

  it('loads a saved circuit when the user clicks the row Load button', () => {
    circuitActions.addGate('NAND', { x: 0, y: 0, z: 0 })
    circuitActions.saveCircuit('one')
    circuitActions.clearCircuit()
    render(<CircuitLibrary />)
    fireEvent.click(screen.getByTestId('library-load-one'))
    expect(useCircuitStore.getState().gates).toHaveLength(1)
  })

  it('deletes a saved circuit when the user clicks the row Delete button', () => {
    circuitActions.saveCircuit('one')
    render(<CircuitLibrary />)
    fireEvent.click(screen.getByTestId('library-delete-one'))
    expect(localStorage.getItem('hacer-circuit-one')).toBeNull()
    expect(screen.queryByTestId('library-entry-one')).not.toBeInTheDocument()
  })

  it('triggers export when the Export button is clicked', () => {
    circuitActions.addGate('NAND', { x: 0, y: 0, z: 0 })
    const click = vi.fn()
    const anchor = { click, remove: vi.fn(), href: '', download: '', style: {} as CSSStyleDeclaration } as unknown as HTMLAnchorElement
    const createElement = vi.spyOn(document, 'createElement').mockReturnValue(anchor)
    const createObjectURL = vi.fn().mockReturnValue('blob:hacer-test')
    const revokeObjectURL = vi.fn()
    const originalURL = globalThis.URL
    globalThis.URL = { ...originalURL, createObjectURL, revokeObjectURL } as unknown as typeof URL

    try {
      render(<CircuitLibrary />)
      fireEvent.change(screen.getByTestId('library-name-input'), { target: { value: 'demo' } })
      fireEvent.click(screen.getByTestId('library-export'))
      expect(click).toHaveBeenCalled()
    } finally {
      globalThis.URL = originalURL
      createElement.mockRestore()
    }
  })

  it('imports a circuit when the user selects a JSON file', async () => {
    const blob = JSON.stringify({
      version: 1, name: 'imp', savedAt: new Date().toISOString(),
      gates: [{ id: 'gate-imp-1', type: 'NAND', position: { x: 0, y: 0, z: 0 }, rotation: { x: Math.PI / 2, y: 0, z: 0 }, width: 1 }],
      wires: [], inputNodes: [], outputNodes: [], junctions: [],
    })
    const file = new File([blob], 'imp.circuit.json', { type: 'application/json' })

    render(<CircuitLibrary />)
    const input = screen.getByTestId('library-import-input') as HTMLInputElement
    Object.defineProperty(input, 'files', { value: [file] })
    fireEvent.change(input)

    await screen.findByTestId('library-entry-imp')
    expect(useCircuitStore.getState().gates).toHaveLength(1)
  })
})
```

- [ ] **Step 11.2: Run the failing test**

Run: `pnpm exec vitest run src/components/ui/CircuitLibrary.test.tsx`
Expected: FAIL with `Cannot find module './CircuitLibrary'`.

- [ ] **Step 11.3: Implement the component**

Create `src/components/ui/CircuitLibrary.tsx`:

```tsx
import { useRef, useState } from 'react'
import { Save, Trash2, Download, Upload, FolderOpen } from 'lucide-react'
import { Button } from '@/components/ui-kit/button'
import { Input } from '@/components/ui-kit/input'
import { Label } from '@/components/ui-kit/label'
import { Separator } from '@/components/ui-kit/separator'
import { ScrollArea } from '@/components/ui-kit/scroll-area'
import { circuitActions } from '@/store/circuitStore'
import type { SavedCircuitSummary } from '@/store/types'

export function CircuitLibrary() {
  const [name, setName] = useState('')
  const [entries, setEntries] = useState<SavedCircuitSummary[]>(() => circuitActions.listSavedCircuits())
  const fileRef = useRef<HTMLInputElement>(null)

  const refresh = () => setEntries(circuitActions.listSavedCircuits())

  const handleSave = () => {
    circuitActions.saveCircuit(name)
    refresh()
  }

  const handleLoad = (entry: SavedCircuitSummary) => {
    circuitActions.loadCircuit(entry.name)
  }

  const handleDelete = (entry: SavedCircuitSummary) => {
    circuitActions.deleteSavedCircuit(entry.name)
    refresh()
  }

  const handleExport = () => {
    circuitActions.exportCircuitJSON(name)
  }

  const handleImportClick = () => {
    fileRef.current?.click()
  }

  const handleImportChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return
    const text = await file.text()
    circuitActions.importCircuitJSON(text)
    refresh()
    event.target.value = ''
  }

  return (
    <div data-testid="circuit-library" className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="library-name-input" className="text-xs text-muted-foreground">
          Circuit name
        </Label>
        <div className="flex gap-2">
          <Input
            id="library-name-input"
            data-testid="library-name-input"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. not, mux4way16"
            className="h-8 text-sm"
          />
          <Button data-testid="library-save" size="sm" onClick={handleSave}>
            <Save className="w-3 h-3 mr-1" /> Save
          </Button>
        </div>
        <div className="flex gap-2">
          <Button
            data-testid="library-export"
            size="sm"
            variant="outline"
            className="flex-1"
            onClick={handleExport}
          >
            <Download className="w-3 h-3 mr-1" /> Export
          </Button>
          <Button
            data-testid="library-import"
            size="sm"
            variant="outline"
            className="flex-1"
            onClick={handleImportClick}
          >
            <Upload className="w-3 h-3 mr-1" /> Import
          </Button>
          <input
            ref={fileRef}
            data-testid="library-import-input"
            type="file"
            accept="application/json,.json"
            className="hidden"
            onChange={handleImportChange}
          />
        </div>
      </div>

      <Separator />

      <ScrollArea className="max-h-72 pr-1">
        {entries.length === 0 ? (
          <div
            data-testid="library-empty-state"
            className="flex flex-col items-center justify-center py-8 text-muted-foreground"
          >
            <FolderOpen className="w-8 h-8 mb-2 opacity-50" />
            <p className="text-sm">No saved circuits</p>
            <p className="text-xs">Save the current circuit above</p>
          </div>
        ) : (
          <ul className="space-y-1">
            {entries.map((entry) => (
              <li
                key={entry.name}
                data-testid={`library-entry-${entry.name}`}
                className="flex items-center justify-between gap-2 rounded-md bg-secondary/30 border border-border px-2 py-1.5"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{entry.name}</p>
                  <p className="text-[10px] text-muted-foreground">{new Date(entry.savedAt).toLocaleString()}</p>
                </div>
                <Button
                  data-testid={`library-load-${entry.name}`}
                  size="sm"
                  variant="ghost"
                  className="h-7 px-2 text-xs"
                  onClick={() => handleLoad(entry)}
                >
                  Load
                </Button>
                <Button
                  data-testid={`library-delete-${entry.name}`}
                  size="icon"
                  variant="ghost"
                  className="h-7 w-7"
                  onClick={() => handleDelete(entry)}
                  aria-label={`Delete ${entry.name}`}
                >
                  <Trash2 className="w-3 h-3" />
                </Button>
              </li>
            ))}
          </ul>
        )}
      </ScrollArea>
    </div>
  )
}
```

- [ ] **Step 11.4: Run the tests**

Run: `pnpm exec vitest run src/components/ui/CircuitLibrary.test.tsx`
Expected: PASS.

- [ ] **Step 11.5: Commit**

```bash
git add src/components/ui/CircuitLibrary.tsx src/components/ui/CircuitLibrary.test.tsx
git commit -m "feat(ui): CircuitLibrary panel — save/load/list/delete/export/import (P05-14)"
```

---

## Chunk 5: Mount in `RightActionBar`

### Task 12: Add a `'library'` panel and rewire Export / Import quick actions

**Files:**
- Modify: `src/components/ui/RightActionBar.tsx`

- [ ] **Step 12.1: Extend the `ActivePanel` union and add the trigger button**

Replace the `type ActivePanel = …` line with:

```typescript
type ActivePanel = 'info' | 'history' | 'layers' | 'library' | null
```

Add the new import:

```typescript
import { FolderOpen } from 'lucide-react'
import { CircuitLibrary } from './CircuitLibrary'
```

After the existing Info / Layers / History tooltip buttons (and the `<Separator className="my-1" />` that follows them), add a new tooltip-wrapped icon button:

```tsx
<Tooltip>
  <TooltipTrigger asChild>
    <Button
      data-testid="right-bar-library-trigger"
      variant={activePanel === 'library' ? 'secondary' : 'ghost'}
      size="icon"
      className="w-8 h-8"
      onClick={() => togglePanel('library')}
    >
      <FolderOpen className="w-4 h-4" />
    </Button>
  </TooltipTrigger>
  <TooltipContent side="left">Circuit Library</TooltipContent>
</Tooltip>
```

Add a `library` case to the title and content blocks inside the drawer body:

```tsx
{activePanel === 'library' && 'Circuit Library'}
```

```tsx
{activePanel === 'library' && <CircuitLibrary />}
```

- [ ] **Step 12.2: Rewire the ComingSoon stubs in `CircuitInfoPanel`**

Inside the existing `CircuitInfoPanel` function in the same file, replace:

```tsx
<ComingSoon>
  <QuickActionButton icon={Download} label="Export Circuit" />
</ComingSoon>
<ComingSoon>
  <QuickActionButton icon={Upload} label="Import Circuit" />
</ComingSoon>
```

with the working triggers (keep the existing `Generate Truth Table` stub as-is):

```tsx
<QuickActionButton
  data-testid="info-quick-export"
  icon={Download}
  label="Export Circuit"
  onClick={() => circuitActions.exportCircuitJSON()}
/>
<QuickActionButton
  data-testid="info-quick-import"
  icon={Upload}
  label="Import Circuit"
  onClick={() => document.querySelector<HTMLInputElement>('[data-testid="library-import-input"]')?.click()}
/>
```

Add the import at the top of the file:

```typescript
import { circuitActions } from '@/store/circuitStore'
```

Update the `QuickActionButton` component so it accepts and forwards an optional `onClick` and `data-testid`:

```tsx
function QuickActionButton({
  icon: Icon,
  label,
  onClick,
  ...rest
}: {
  icon: IconComponent
  label: string
  onClick?: () => void
} & Pick<React.ComponentProps<'button'>, 'data-testid'>) {
  const disabled = !onClick
  return (
    <Button
      variant="ghost"
      size="sm"
      className="w-full justify-between h-8 text-xs"
      onClick={onClick}
      disabled={disabled}
      {...rest}
    >
      <div className="flex items-center gap-2">
        <Icon className="w-3 h-3" />
        {label}
      </div>
      <ChevronRight className="w-3 h-3 text-muted-foreground" />
    </Button>
  )
}
```

The Generate Truth Table button keeps its `ComingSoon` wrapper and stays `disabled` (because no `onClick` is passed).

- [ ] **Step 12.3: Run the lint + build + RTL + store E2E (preview)**

Run: `pnpm run lint && pnpm exec vitest run src/components/ui/RightActionBar`
Expected: PASS (no existing tests for RightActionBar layout — the typecheck is the real signal here).

- [ ] **Step 12.4: Commit**

```bash
git add src/components/ui/RightActionBar.tsx
git commit -m "feat(ui): right-rail Circuit Library panel + live Export/Import quick actions (P05-14)"
```

---

## Chunk 6: E2E store spec

### Task 13: Playwright store test for persistence round-trip

**Files:**
- Create: `e2e/specs/persistence/circuit-persistence.store.spec.ts`

- [ ] **Step 13.1: Write the spec**

```typescript
// e2e/specs/persistence/circuit-persistence.store.spec.ts
import { test, expect } from '../../fixtures/store.fixture'

test.describe('Circuit persistence @store @persistence', () => {
  test.beforeEach(async ({ page }) => {
    await page.evaluate(() => {
      const actions = window.__CIRCUIT_ACTIONS__
      if (!actions) return
      Object.keys(localStorage).forEach((key) => {
        if (key.startsWith('hacer-circuit-')) localStorage.removeItem(key)
      })
      actions.clearCircuit()
    })
  })

  test('save → clearCircuit → load restores gates, wires, and I/O nodes', async ({ page }) => {
    const summary = await page.evaluate(() => {
      const actions = window.__CIRCUIT_ACTIONS__
      if (!actions) throw new Error('circuitActions not available')
      const input = actions.addInputNode('a', { x: -4, y: 0, z: 0 })
      const output = actions.addOutputNode('out', { x: 4, y: 0, z: 0 })
      const nand = actions.addGate('NAND', { x: 0, y: 0, z: 0 })
      actions.addWire(
        { type: 'input', entityId: input.id },
        { type: 'gate', entityId: nand.id, pinId: `${nand.id}-in-0` },
        [{ start: { x: -3, y: 0.2, z: 0 }, end: { x: -1, y: 0.2, z: 0 }, type: 'horizontal' }],
      )
      actions.addWire(
        { type: 'input', entityId: input.id },
        { type: 'gate', entityId: nand.id, pinId: `${nand.id}-in-1` },
        [{ start: { x: -3, y: 0.2, z: 0 }, end: { x: -1, y: 0.2, z: 0.6 }, type: 'horizontal' }],
      )
      actions.addWire(
        { type: 'gate', entityId: nand.id, pinId: `${nand.id}-out-0` },
        { type: 'output', entityId: output.id },
        [{ start: { x: 1, y: 0.2, z: 0 }, end: { x: 3, y: 0.2, z: 0 }, type: 'horizontal' }],
      )
      actions.updateInputNodeValue(input.id, 1)
      actions.saveCircuit('not-from-nand')
      return {
        inputId: input.id,
        outputId: output.id,
        nandId: nand.id,
      }
    })

    await page.evaluate(() => window.__CIRCUIT_ACTIONS__?.clearCircuit())
    expect(await page.evaluate(() => window.__CIRCUIT_STORE__?.gates.length)).toBe(0)

    const loaded = await page.evaluate(() => window.__CIRCUIT_ACTIONS__?.loadCircuit('not-from-nand'))
    expect(loaded).toBe(true)

    const state = await page.evaluate(() => {
      const s = window.__CIRCUIT_STORE__
      return {
        gates: s?.gates.map((g) => g.id) ?? [],
        wires: s?.wires.length ?? 0,
        inputs: s?.inputNodes.map((n) => ({ id: n.id, value: n.value })) ?? [],
        outputs: s?.outputNodes.map((n) => ({ id: n.id, value: n.value })) ?? [],
      }
    })

    expect(state.gates).toEqual([summary.nandId])
    expect(state.wires).toBe(3)
    expect(state.inputs).toEqual([{ id: summary.inputId, value: 1 }])
    expect(state.outputs[0].id).toBe(summary.outputId)
    expect(state.outputs[0].value).toBe(0)
  })

  test('import JSON round-trip reproduces the source state', async ({ page }) => {
    const exported = await page.evaluate(() => {
      const actions = window.__CIRCUIT_ACTIONS__
      if (!actions) throw new Error('actions missing')
      actions.addGate('NAND', { x: 0, y: 0, z: 0 })
      // Serialize via the persistence module by saving + reading localStorage
      actions.saveCircuit('export-source')
      const raw = localStorage.getItem('hacer-circuit-export-source')
      if (!raw) throw new Error('expected localStorage entry to exist')
      return raw
    })

    await page.evaluate(() => window.__CIRCUIT_ACTIONS__?.clearCircuit())

    const imported = await page.evaluate((blob) => window.__CIRCUIT_ACTIONS__?.importCircuitJSON(blob), exported)
    expect(imported).toBe(true)

    const gateCount = await page.evaluate(() => window.__CIRCUIT_STORE__?.gates.length ?? 0)
    expect(gateCount).toBe(1)
  })

  test('listSavedCircuits returns saved circuits and excludes the autosave slot', async ({ page }) => {
    await page.evaluate(() => {
      const actions = window.__CIRCUIT_ACTIONS__!
      actions.addGate('NAND', { x: 0, y: 0, z: 0 })
      actions.saveCircuit('alpha')
      actions.addGate('AND', { x: 4, y: 0, z: 0 })
      actions.saveCircuit('beta')
    })

    const list = await page.evaluate(() => window.__CIRCUIT_ACTIONS__?.listSavedCircuits().map((e) => e.name) ?? [])
    expect(list).toEqual(expect.arrayContaining(['alpha', 'beta']))
    expect(list).not.toContain('__autosave__')
  })
})
```

- [ ] **Step 13.2: Run the spec**

Run: `pnpm exec playwright test e2e/specs/persistence/ --reporter=line`
Expected: 3 tests PASS.

(Using the file-path filter avoids tag-filter double-`--grep` ambiguity that `pnpm run test:e2e:store --` would introduce. Step 14.3 below runs the whole `@store` suite.)

- [ ] **Step 13.3: Commit**

```bash
git add e2e/specs/persistence/circuit-persistence.store.spec.ts
git commit -m "test(e2e): @persistence store spec for save/load/import round-trip (P05-14)"
```

---

## Chunk 7: Final verification

### Task 14: Definition-of-done quartet

- [ ] **Step 14.1: Run the lint gate**

Run: `pnpm run lint`
Expected: PASS (no TypeScript / ESLint errors).

- [ ] **Step 14.2: Run unit + component tests**

Run: `pnpm run test:run`
Expected: PASS — including all `serialization.test.ts`, `persistenceActions.test.ts`, `autosave.test.ts`, `debounce.test.ts`, `CircuitLibrary.test.tsx`, and every pre-existing suite (no regressions).

- [ ] **Step 14.3: Run the store E2E suite**

Run: `pnpm run test:e2e:store --reporter=line`
Expected: PASS — including the new `@persistence` spec.

- [ ] **Step 14.4: Run the production build**

Run: `pnpm run build`
Expected: PASS.

- [ ] **Step 14.5: Update `docs/plans/phase-0.5-tickets-CHECKLIST.md`**

Flip the P05-14 row from `[ ]` to `[x]` and update the **Verified this pass** line at the top to mention the new evidence paths:

`src/core/serialization/*`, `src/store/actions/persistenceActions/*`, `src/components/ui/CircuitLibrary.{tsx,test.tsx}`, `e2e/specs/persistence/circuit-persistence.store.spec.ts`.

- [ ] **Step 14.6: Commit the checklist + push the branch**

```bash
git add docs/plans/phase-0.5-tickets-CHECKLIST.md
git commit -m "docs(phase-0.5): mark P05-14 done — circuit persistence shipped"
git push -u origin p05-14
```

- [ ] **Step 14.7: Open a PR**

Use the HACER pull-request template. Reference the gap (`GAP-3D-6`), the ticket (`docs/plans/phase-0.5-tickets/P05-14.md`), and this plan.

---

## Self-Review checklist (run before opening the PR)

- [ ] All P05-14 ticket requirements are addressed by a task above (no orphans).
- [ ] No `TBD`, `TODO`, or "handle edge cases" language remains in this plan or in source.
- [ ] Types, method signatures, and storage key constants match across tasks (`AUTOSAVE_KEY`, `STORAGE_PREFIX`, `PersistenceActions` field names).
- [ ] Pin IDs (`${gate.id}-in-${i}` / `${gate.id}-out-${i}`) survive serialize → deserialize so wire endpoints still resolve.
- [ ] Multi-bit gates round-trip with `width` preserved on the gate and on every pin.
- [ ] `loadCircuit` clears `selected*` / `placementMode` / `wiringFrom` / `lastSimulationError` before mutating slices.
- [ ] `simulationTick()` runs once after `loadCircuit` and after `importCircuitJSON`.
- [ ] Autosave is registered exactly once at module load and is debounced.
- [ ] `localStorage` access is SSR-guarded and wrapped in `try/catch` (mirrors `performanceModeStorage.ts`).
- [ ] `CircuitLibrary` mounts via `RightActionBar`'s new `'library'` panel; the old `ComingSoon` Export/Import stubs in `CircuitInfoPanel` are gone.
- [ ] Definition of done (`pnpm run lint` · `pnpm run test:run` · `pnpm run test:e2e:store` · `pnpm run build`) all pass.

---

## Execution Handoff

Plan saved to `docs/superpowers/plans/2026-05-23-p05-14-circuit-persistence.md`. Two execution options:

**1. Subagent-Driven (recommended)** — dispatch a fresh subagent per task, review between tasks, fast iteration. Use `superpowers:subagent-driven-development`.

**2. Inline Execution** — execute tasks in this session using `superpowers:executing-plans`, batch execution with checkpoints between chunks.

Which approach?
