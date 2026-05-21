# Multi-Bit Gates + Floating 3D Labels Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** (A) Make primitive gates operate bitwise across their bus width so `4-bit 0b0111 → NOT → 0b1000` works as expected; (B) replace face-painted 3D text with always-camera-facing floating labels above nodes, gates, junctions (wires get a midpoint label).

**Architecture:**
- **Gates**: each gate carries a `width: number` (default 1). `gateLogic` becomes width-aware — every op masks with `widthMask(width)`. Width is **inferred at wire-add time**, mirroring how `addWire` already infers wire width. Mismatched gate inputs throw, matching web-ide's strict semantics (no silent narrowing).
- **Labels**: one shared `<FloatingLabel>` component (Drei `<Text>` + `<Billboard>`) renders above each element's bounding box, camera-facing, hidden in `low-power` performance mode. The existing face-painted `<Text>` on `InputNode3D`/`OutputNode3D`/`BaseGate` is removed and replaced.

**Tech Stack:** React 18, TypeScript, Zustand+Immer, R3F, `@react-three/drei` (`<Text>`, `<Billboard>`), Vitest, Playwright.

**Reference:**
- web-ide multi-bit model: `~/Documents/codelab/slow/web-ide/simulator/src/chip/builtins/logic/not.ts` (`not16(inn) = ~inn & 0xffff`); per-width gate variants; strict width validation in `chip.ts`.
- P05-11 width clamp: `src/simulation/topologicalEval.ts:231,251` already clamps to destination width.
- P05-13 multi-bit UI: `formatSignalLabel(value, width)` in `src/simulation/signalDisplay.ts` already returns hex for `width > 1`.

---

## File Structure

**Modify (Chunk A — gates):**
- `src/store/types.ts` — add `width: number` to `GateInstance` (line 118).
- `src/store/actions/gateActions/gateActions.ts` — accept optional `width` in `addGate`, propagate to gate + every pin (currently hardcodes `width: 1` at lines 20, 29).
- `src/simulation/gateLogic.ts` — replace `(inputs: number[]) => number` with `(inputs: number[], width: number) => number`. Every op masks with `widthMask`.
- `src/simulation/topologicalEval.ts:236-243` — pass `gate.width` to logic; mask output to gate width.
- `src/store/actions/wireActions/wireActions.ts` (`addWire`) — when a wire's `from` or `to` endpoint is a `gate` pin and the gate currently has `width === 1` and the other side's width is `> 1`, widen the gate (set `gate.width` AND every pin's `width`). When the gate already has `width > 1` and the new wire's width differs, throw `"Gate width mismatch: gate is W bits, wire is W' bits"`.
- `src/store/circuitStore.ts` — propagate any new action additions (none expected; gate widening happens inside `addWire`'s `set`).

**Modify (Chunk B — labels):**
- Create: `src/components/canvas/FloatingLabel.tsx` — shared `<Billboard><Text>...</Text></Billboard>`, accepts `{ position: [x,y,z]; text: string; offsetY?: number; color?: string }`. Hidden when `usePerformanceStore` `mode === 'low-power'`.
- Create: `src/components/canvas/FloatingLabel.test.tsx` — render tests.
- Modify: `src/nodes/components/InputNode3D.tsx` — remove face-painted `<Text>` (lines ~126–152), add `<FloatingLabel>` above bounding box. Label format: `"${name}: ${formatSignalLabel(value, width)}"`.
- Modify: `src/nodes/components/OutputNode3D.tsx` — same treatment.
- Modify: `src/nodes/components/JunctionNode3D.tsx` — add `<FloatingLabel>` showing the signal name (or signalId truncated to 6 chars if no name).
- Modify: `src/gates/common/BaseGate.tsx:147-160` — remove face-painted `<Text>`, add `<FloatingLabel>` above the gate showing `gate.type` (and `:W` suffix when `width > 1`, e.g. `NOT:4`).
- Modify: `src/components/canvas/Wire3D.tsx` — add `<FloatingLabel>` at the midpoint of the wire showing `formatSignalLabel(value, width)`. Skip for unwired / value-less wires.

**Do NOT touch:**
- `PinoutPanel`, `PropertiesPanel`, `MultiBitInput` — unaffected.
- `useSelectedElement` — unaffected.
- HDL / chip-registry code — out of scope.

---

## Constants

```ts
// FloatingLabel.tsx
const LABEL_DEFAULT_COLOR = '#ffffff'
const LABEL_FONT_SIZE = 0.35
const LABEL_DEFAULT_OFFSET_Y = 1.6 // tweak per element via prop
```

---

## Chunk A: Multi-bit gates (TDD)

### Task 1: `gateLogic` becomes width-aware

**Files:**
- Modify: `src/simulation/gateLogic.ts`
- Test: `src/simulation/gateLogic.test.ts`

- [ ] **Step 1: Read the existing tests + ops**

Run: `cat src/simulation/gateLogic.ts src/simulation/gateLogic.test.ts | head -80`

Note current signature `(inputs: number[]) => number`. Helpers (`notGate`, `andGate`, etc.) are exported individually — update both call sites and the dispatch table.

- [ ] **Step 2: Write failing tests for width-aware ops**

Append to `gateLogic.test.ts`:

```typescript
import { widthMask } from './busOps'

describe('gateLogic — width-aware', () => {
  it('NOT at width 4: 0b0111 → 0b1000', () => {
    expect(gateLogic.NOT([0b0111], 4)).toBe(0b1000)
  })

  it('NOT at width 1 still flips a single bit', () => {
    expect(gateLogic.NOT([0], 1)).toBe(1)
    expect(gateLogic.NOT([1], 1)).toBe(0)
  })

  it('NOT at width 8: 0xAA → 0x55', () => {
    expect(gateLogic.NOT([0xAA], 8)).toBe(0x55)
  })

  it('NOT at width 32 masks safely', () => {
    expect(gateLogic.NOT([0], 32)).toBe(widthMask(32))
  })

  it('AND at width 4: 0b1100 & 0b1010 = 0b1000', () => {
    expect(gateLogic.AND([0b1100, 0b1010], 4)).toBe(0b1000)
  })

  it('OR at width 4 masks result to width', () => {
    // 0xFF | 0x00 = 0xFF; mask to width 4 = 0x0F
    expect(gateLogic.OR([0xFF, 0x00], 4)).toBe(0x0F)
  })

  it('XOR at width 8: 0xAA ^ 0xFF = 0x55', () => {
    expect(gateLogic.XOR([0xAA, 0xFF], 8)).toBe(0x55)
  })

  it('NAND at width 4: ~(0b1111 & 0b1111) = 0b0000', () => {
    expect(gateLogic.NAND([0b1111, 0b1111], 4)).toBe(0b0000)
  })

  it('NOR at width 4: ~(0b0001 | 0b0010) = 0b1100', () => {
    expect(gateLogic.NOR([0b0001, 0b0010], 4)).toBe(0b1100)
  })

  it('XNOR at width 4: ~(0b1010 ^ 0b0101) = 0b0000', () => {
    expect(gateLogic.XNOR([0b1010, 0b0101], 4)).toBe(0b0000)
  })
})
```

- [ ] **Step 3: Run tests, confirm RED**

Run: `pnpm exec vitest run src/simulation/gateLogic.test.ts -t "width-aware"`
Expected: FAIL — `Expected 1 arguments, but got 2` or wrong results.

- [ ] **Step 4: Rewrite `gateLogic.ts` to be width-aware**

Replace the file body with:

```typescript
import type { GateType } from '@/store/types'
import { widthMask } from './busOps'

// All ops operate bitwise across `width` bits and mask their result to width.
// width=1 preserves legacy boolean behavior.
export const nandGate = (a: number, b: number, width: number): number => (~(a & b)) & widthMask(width)
export const andGate  = (a: number, b: number, width: number): number => (a & b) & widthMask(width)
export const orGate   = (a: number, b: number, width: number): number => (a | b) & widthMask(width)
export const notGate  = (a: number, width: number): number => (~a) & widthMask(width)
export const norGate  = (a: number, b: number, width: number): number => (~(a | b)) & widthMask(width)
export const xorGate  = (a: number, b: number, width: number): number => (a ^ b) & widthMask(width)
export const xnorGate = (a: number, b: number, width: number): number => (~(a ^ b)) & widthMask(width)

export const gateLogic: Record<GateType, (inputs: number[], width: number) => number> = {
  NAND: (inputs, w) => nandGate(inputs[0], inputs[1], w),
  AND:  (inputs, w) => andGate(inputs[0], inputs[1], w),
  OR:   (inputs, w) => orGate(inputs[0], inputs[1], w),
  NOT:  (inputs, w) => notGate(inputs[0], w),
  NOR:  (inputs, w) => norGate(inputs[0], inputs[1], w),
  XOR:  (inputs, w) => xorGate(inputs[0], inputs[1], w),
  XNOR: (inputs, w) => xnorGate(inputs[0], inputs[1], w),
}
```

- [ ] **Step 5: Run tests, confirm GREEN**

Run: `pnpm exec vitest run src/simulation/gateLogic.test.ts`
Expected: PASS (pre-existing single-bit tests too; they call without width and will now fail — convert them to pass `1` as the width).

- [ ] **Step 6: Fix any pre-existing tests in `gateLogic.test.ts`**

Anywhere the old form `nandGate(a, b)` / `gateLogic.NAND([a, b])` appears, append `, 1` / `, 1` respectively. Re-run; all green.

- [ ] **Step 7: Lint + commit**

```bash
pnpm run lint
git add src/simulation/gateLogic.ts src/simulation/gateLogic.test.ts
git commit -m "feat(sim): gateLogic operates bitwise across configurable bus width"
```

---

### Task 2: `GateInstance.width` + factory accepts optional width

**Files:**
- Modify: `src/store/types.ts:118-126`
- Modify: `src/store/actions/gateActions/gateActions.ts`
- Test: `src/store/actions/gateActions/gateActions.test.ts` (locate via `ls src/store/actions/gateActions/`)

- [ ] **Step 1: Add `width: number` to `GateInstance`**

Edit `src/store/types.ts`:

```typescript
export interface GateInstance {
  id: string
  type: GateType
  position: Position
  rotation: Rotation
  inputs: Pin[]
  outputs: Pin[]
  selected: boolean
  width: number  // bus width; default 1
}
```

- [ ] **Step 2: Update `addGate` signature**

In `src/store/types.ts` find the `addGate` action signature (around line 218):

```typescript
addGate: (type: GateType, position: Position, width?: number) => GateInstance
```

- [ ] **Step 3: Write failing test for width**

Append to `gateActions.test.ts`:

```typescript
describe('addGate — width', () => {
  it('defaults to width 1 with width-1 pins', () => {
    const store = useCircuitStore.getState()
    const g = store.addGate('NOT', { x: 0, y: 0, z: 0 })
    expect(g.width).toBe(1)
    expect(g.inputs.every(p => p.width === 1)).toBe(true)
    expect(g.outputs.every(p => p.width === 1)).toBe(true)
  })

  it('accepts explicit width and propagates to all pins', () => {
    const store = useCircuitStore.getState()
    const g = store.addGate('AND', { x: 0, y: 0, z: 0 }, 4)
    expect(g.width).toBe(4)
    expect(g.inputs.every(p => p.width === 4)).toBe(true)
    expect(g.outputs.every(p => p.width === 4)).toBe(true)
  })
})
```

- [ ] **Step 4: Run tests, confirm RED**

Run: `pnpm exec vitest run src/store/actions/gateActions/gateActions.test.ts -t "addGate \\u2014 width"`
Expected: FAIL — `g.width` undefined.

- [ ] **Step 5: Implement in `gateActions.ts`**

Update the `addGate` function:
- Add optional `width: number = 1` parameter.
- Replace hardcoded `width: 1` (lines ~20, ~29) with the parameter.
- Add `width` to the returned `GateInstance`.

- [ ] **Step 6: Run tests, confirm GREEN**

Run: `pnpm exec vitest run src/store/actions/gateActions/`
Expected: PASS.

- [ ] **Step 7: Update `circuitActions` facade if it enumerates `addGate`**

Run: `grep -n "addGate" src/store/circuitStore.ts`
The facade uses `Parameters<CircuitStore['addGate']>`, so the new optional arg is picked up automatically. No edit needed.

- [ ] **Step 8: Update test mock store**

Run: `grep -n "addGate" src/test/testUtils.ts`
If the mock returns a `GateInstance` literal, add `width: 1` to it.

- [ ] **Step 9: Lint + commit**

```bash
pnpm run lint
git add src/store/types.ts src/store/actions/gateActions/ src/test/testUtils.ts
git commit -m "feat(gates): GateInstance carries bus width (default 1)"
```

---

### Task 3: `topologicalEval` passes gate width and masks output

**Files:**
- Modify: `src/simulation/topologicalEval.ts:236-243`
- Test: `src/simulation/topologicalEval.test.ts`

- [ ] **Step 1: Write failing eval test**

Append to `topologicalEval.test.ts`:

```typescript
describe('topologicalEval — multi-bit gates', () => {
  it('NOT gate at width 4: 0b0111 input → 0b1000 output node', () => {
    const store = useCircuitStore.getState()
    store.clearCircuit()
    const inNode = store.addInputNode('in', { x: 0, y: 0, z: 0 }, 4)
    const not = store.addGate('NOT', { x: 4, y: 0, z: 0 }, 4)
    const outNode = store.addOutputNode('out', { x: 8, y: 0, z: 0 }, 4)
    store.addWire(
      { type: 'input', entityId: inNode.id },
      { type: 'gate', entityId: not.id, pinId: not.inputs[0].id },
      [], [], 'a',
    )
    store.addWire(
      { type: 'gate', entityId: not.id, pinId: not.outputs[0].id },
      { type: 'output', entityId: outNode.id },
      [], [], 'b',
    )
    store.updateInputNodeValue(inNode.id, 0b0111)

    evaluate(useCircuitStore.getState())

    const out = useCircuitStore.getState().outputNodes.find(n => n.id === outNode.id)
    expect(out?.value).toBe(0b1000)
  })

  it('AND gate at width 8: 0xF0 & 0x0F = 0x00', () => {
    const store = useCircuitStore.getState()
    store.clearCircuit()
    const a = store.addInputNode('a', { x: 0, y: 0, z: 0 }, 8)
    const b = store.addInputNode('b', { x: 0, y: 0, z: 4 }, 8)
    const g = store.addGate('AND', { x: 4, y: 0, z: 0 }, 8)
    const o = store.addOutputNode('o', { x: 8, y: 0, z: 0 }, 8)
    store.addWire({ type: 'input', entityId: a.id }, { type: 'gate', entityId: g.id, pinId: g.inputs[0].id }, [], [], 'a')
    store.addWire({ type: 'input', entityId: b.id }, { type: 'gate', entityId: g.id, pinId: g.inputs[1].id }, [], [], 'b')
    store.addWire({ type: 'gate', entityId: g.id, pinId: g.outputs[0].id }, { type: 'output', entityId: o.id }, [], [], 'c')
    store.updateInputNodeValue(a.id, 0xF0)
    store.updateInputNodeValue(b.id, 0x0F)

    evaluate(useCircuitStore.getState())

    expect(useCircuitStore.getState().outputNodes.find(n => n.id === o.id)?.value).toBe(0x00)
  })
})
```

> Import `evaluate` (or `topologicalEval`) the same way the existing tests in this file do. Match the existing wire-add boilerplate.

- [ ] **Step 2: Run tests, confirm RED**

Run: `pnpm exec vitest run src/simulation/topologicalEval.test.ts -t "multi-bit gates"`
Expected: FAIL — output is `0` (clamped to width 1) for the NOT case.

- [ ] **Step 3: Update `topologicalEval.ts:236-243`**

```typescript
const inputValues = gate.inputs.map((p) => p.value)
const logic = gateLogic[gate.type]
if (logic) {
  const outputValue = logic(inputValues, gate.width)
  for (const output of gate.outputs) {
    output.value = outputValue
  }
}
```

- [ ] **Step 4: Run tests, confirm GREEN**

Run: `pnpm exec vitest run src/simulation/topologicalEval.test.ts`
Expected: PASS (existing single-bit tests still green — gate width defaults to 1).

- [ ] **Step 5: Lint + commit**

```bash
pnpm run lint
git add src/simulation/topologicalEval.ts src/simulation/topologicalEval.test.ts
git commit -m "feat(eval): gateLogic receives gate.width during evaluation"
```

---

### Task 4: `addWire` infers gate width / throws on mismatch

**Files:**
- Modify: `src/store/actions/wireActions/wireActions.ts`
- Test: `src/store/actions/wireActions/wireActions.test.ts`

- [ ] **Step 1: Survey current width inference**

Run: `sed -n '40,80p' src/store/actions/wireActions/wireActions.ts`

Note `getEndpointWidth(endpoint, state)` and the existing input-to-output pass-through check.

- [ ] **Step 2: Write failing tests for gate width inference**

Append to `wireActions.test.ts`:

```typescript
describe('addWire — gate width inference', () => {
  beforeEach(() => circuitActions.clearCircuit())

  it('widens a default (width=1) gate when an N-bit wire connects to its input', () => {
    const store = useCircuitStore.getState()
    const inNode = store.addInputNode('a', { x: 0, y: 0, z: 0 }, 4)
    const not = store.addGate('NOT', { x: 4, y: 0, z: 0 }) // default width 1

    store.addWire(
      { type: 'input', entityId: inNode.id },
      { type: 'gate', entityId: not.id, pinId: not.inputs[0].id },
      [], [], 'sig',
    )

    const g = useCircuitStore.getState().gates.find(x => x.id === not.id)!
    expect(g.width).toBe(4)
    expect(g.inputs.every(p => p.width === 4)).toBe(true)
    expect(g.outputs.every(p => p.width === 4)).toBe(true)
  })

  it('widens a gate when an N-bit wire connects to its output (gate → wider sink)', () => {
    const store = useCircuitStore.getState()
    const not = store.addGate('NOT', { x: 0, y: 0, z: 0 })
    const outNode = store.addOutputNode('o', { x: 4, y: 0, z: 0 }, 8)

    store.addWire(
      { type: 'gate', entityId: not.id, pinId: not.outputs[0].id },
      { type: 'output', entityId: outNode.id },
      [], [], 'sig',
    )

    const g = useCircuitStore.getState().gates.find(x => x.id === not.id)!
    expect(g.width).toBe(8)
  })

  it('throws when adding a wire of a different width to an already-widened gate', () => {
    const store = useCircuitStore.getState()
    const a = store.addInputNode('a', { x: 0, y: 0, z: 0 }, 4)
    const b = store.addInputNode('b', { x: 0, y: 0, z: 4 }, 8)
    const and = store.addGate('AND', { x: 4, y: 0, z: 0 })

    store.addWire({ type: 'input', entityId: a.id }, { type: 'gate', entityId: and.id, pinId: and.inputs[0].id }, [], [], 'a')

    expect(() => {
      store.addWire({ type: 'input', entityId: b.id }, { type: 'gate', entityId: and.id, pinId: and.inputs[1].id }, [], [], 'b')
    }).toThrow(/width mismatch/i)
  })
})
```

- [ ] **Step 3: Run tests, confirm RED**

Run: `pnpm exec vitest run src/store/actions/wireActions/wireActions.test.ts -t "gate width inference"`
Expected: FAIL — gate width stays at 1; no throw on mismatch.

- [ ] **Step 4: Implement gate widening inside `addWire`**

Inside `addWire`, after computing `sourceWidth` / `destWidth` and before constructing the wire, add:

```typescript
// Gate width inference / strict mismatch check.
// When a wire connects to a gate pin, the gate adopts the wire's width.
// If the gate already has width > 1 and the wire's width differs, throw.
const tryWidenGate = (
  endpoint: WireEndpoint,
  otherSideWidth: number,
) => {
  if (endpoint.type !== 'gate') return
  const gate = state.gates.find((g) => g.id === endpoint.entityId)
  if (!gate) return
  if (gate.width === 1 && otherSideWidth > 1) {
    gate.width = otherSideWidth
    for (const p of gate.inputs) p.width = otherSideWidth
    for (const p of gate.outputs) p.width = otherSideWidth
  } else if (gate.width !== otherSideWidth && otherSideWidth !== 1) {
    throw new Error(
      `Gate width mismatch: gate ${gate.id} is ${gate.width} bits, wire is ${otherSideWidth} bits`,
    )
  }
}

tryWidenGate(from, destWidth)
tryWidenGate(to, sourceWidth)
```

> This runs inside the existing `set((state) => { ... })` Immer block — `state.gates` is the draft, so mutations propagate. Place it right after the input-to-output pass-through check.

- [ ] **Step 5: Run tests, confirm GREEN**

Run: `pnpm exec vitest run src/store/actions/wireActions/`
Expected: PASS (new + existing).

- [ ] **Step 6: Run full sim + wire tests for regressions**

Run: `pnpm exec vitest run src/simulation/ src/store/actions/wireActions/ src/store/actions/wiringActions/`
Expected: all green.

- [ ] **Step 7: Lint + commit**

```bash
pnpm run lint
git add src/store/actions/wireActions/
git commit -m "feat(wires): infer gate width from connected wires; throw on mismatch"
```

---

## Chunk B: Floating 3D labels (TDD)

### Task 5: `FloatingLabel` component

**Files:**
- Create: `src/components/canvas/FloatingLabel.tsx`
- Test: `src/components/canvas/FloatingLabel.test.tsx`

- [ ] **Step 1: Survey performance store**

Run: `grep -rn "low-power\|performanceMode\|usePerformanceStore" src/gates/common/BaseGate.tsx src/store/`

Confirm how `performanceMode` is read (BaseGate reads it via prop or hook). Mirror that pattern.

- [ ] **Step 2: Write failing test**

Create `src/components/canvas/FloatingLabel.test.tsx`:

```tsx
import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import { Canvas } from '@react-three/fiber'
import { FloatingLabel } from './FloatingLabel'

describe('FloatingLabel', () => {
  it('renders the supplied text', () => {
    const { container } = render(
      <Canvas>
        <FloatingLabel position={[0, 0, 0]} text="in: 0x0F" />
      </Canvas>,
    )
    // R3F renders into a canvas — we can't query DOM text directly.
    // Smoke check: the canvas element exists and component mounted without error.
    expect(container.querySelector('canvas')).toBeInTheDocument()
  })
})
```

> Drei `<Text>` renders to WebGL, not DOM, so visual assertion is limited; smoke + manual verification covers the rest.

- [ ] **Step 3: Run, confirm RED (missing module)**

Run: `pnpm exec vitest run src/components/canvas/FloatingLabel.test.tsx`
Expected: FAIL — module not found.

- [ ] **Step 4: Implement `FloatingLabel.tsx`**

```tsx
import { Billboard, Text } from '@react-three/drei'
import { usePerformanceStore } from '@/store/performanceStore' // adapt to actual hook

interface FloatingLabelProps {
  position: [number, number, number]
  text: string
  offsetY?: number
  color?: string
  fontSize?: number
}

const LABEL_DEFAULT_COLOR = '#ffffff'
const LABEL_FONT_SIZE = 0.35
const LABEL_DEFAULT_OFFSET_Y = 1.6

export function FloatingLabel({
  position,
  text,
  offsetY = LABEL_DEFAULT_OFFSET_Y,
  color = LABEL_DEFAULT_COLOR,
  fontSize = LABEL_FONT_SIZE,
}: FloatingLabelProps) {
  const performanceMode = usePerformanceStore((s) => s.mode)
  if (performanceMode === 'low-power') return null
  if (!text) return null

  return (
    <Billboard position={[position[0], position[1] + offsetY, position[2]]}>
      <Text
        fontSize={fontSize}
        color={color}
        anchorX="center"
        anchorY="middle"
        outlineWidth={0.02}
        outlineColor="#000000"
      >
        {text}
      </Text>
    </Billboard>
  )
}
```

> If `usePerformanceStore`'s import path differs, fix it. If BaseGate reads performanceMode through a prop instead, accept it as a prop here too and pass from each call site.

- [ ] **Step 5: Run, confirm GREEN**

Run: `pnpm exec vitest run src/components/canvas/FloatingLabel.test.tsx`
Expected: PASS.

- [ ] **Step 6: Lint + commit**

```bash
pnpm run lint
git add src/components/canvas/FloatingLabel.tsx src/components/canvas/FloatingLabel.test.tsx
git commit -m "feat(3d): FloatingLabel \u2014 camera-facing label above element"
```

---

### Task 6: Replace face-painted text on Input/Output nodes

**Files:**
- Modify: `src/nodes/components/InputNode3D.tsx:126-152`
- Modify: `src/nodes/components/OutputNode3D.tsx` (mirror)

- [ ] **Step 1: Read current Text usage in `InputNode3D.tsx`**

Run: `sed -n '120,160p' src/nodes/components/InputNode3D.tsx`

Note the props in scope (`value`, `width`, `name`, position center).

- [ ] **Step 2: Replace face Text with `<FloatingLabel>`**

Remove the `<Text>` block (lines ~126–152). Below the closing `</mesh>` (or wherever appropriate), insert:

```tsx
<FloatingLabel
  position={[0, 0, 0]} // local space — node is already translated
  text={`${name}: ${formatSignalLabel(value, width)}`}
  offsetY={1.2}
/>
```

Update the import: `import { FloatingLabel } from '@/components/canvas/FloatingLabel'`. Remove the no-longer-used `Text` import if applicable (run `grep -n "Text" src/nodes/components/InputNode3D.tsx` to verify).

- [ ] **Step 3: Do the same for `OutputNode3D.tsx`**

Same change. Label text: `${name}: ${formatSignalLabel(value, width)}` (outputs already use `readOnly` UI; label still shows the computed value).

- [ ] **Step 4: Run unit tests for nodes**

Run: `pnpm exec vitest run src/nodes/`
Expected: all green.

- [ ] **Step 5: Lint + commit**

```bash
pnpm run lint
git add src/nodes/components/InputNode3D.tsx src/nodes/components/OutputNode3D.tsx
git commit -m "feat(3d): float input/output node labels above the mesh"
```

---

### Task 7: Floating label on gates

**Files:**
- Modify: `src/gates/common/BaseGate.tsx:147-160`

- [ ] **Step 1: Replace the face-painted `<Text>` with `<FloatingLabel>`**

Remove the `<Text>` block at lines 148–160. In its place add:

```tsx
<FloatingLabel
  position={[0, 0, 0]}
  text={width > 1 ? `${type}:${width}` : type}
  offsetY={1.4}
/>
```

Read `type` + `width` from the gate prop in scope. Update imports. Remove unused `Text` import.

> If `BaseGate` does not currently receive `width`, thread it through `GateRenderer` (mirror the P05-13 width prop drilling for 3D node labels).

- [ ] **Step 2: Run tests**

Run: `pnpm exec vitest run src/gates/`
Expected: all green.

- [ ] **Step 3: Lint + commit**

```bash
pnpm run lint
git add src/gates/
git commit -m "feat(3d): float gate label above the body; show :W suffix for multi-bit"
```

---

### Task 8: Floating label on junctions

**Files:**
- Modify: `src/nodes/components/JunctionNode3D.tsx`

- [ ] **Step 1: Determine display string**

Junction has `signalId` (and optional name from upstream wire). Use `signalId` (first 6 chars if longer than 8) for now — matches the minimal-info principle.

- [ ] **Step 2: Add `<FloatingLabel>`**

Inside the JSX:

```tsx
<FloatingLabel
  position={[0, 0, 0]}
  text={signalId.length > 8 ? signalId.slice(0, 6) + '\u2026' : signalId}
  offsetY={0.8}
/>
```

- [ ] **Step 3: Test + commit**

Run: `pnpm exec vitest run src/nodes/`
Lint, commit:

```bash
git add src/nodes/components/JunctionNode3D.tsx
git commit -m "feat(3d): float junction signal label above branch point"
```

---

### Task 9: Floating midpoint label on wires

**Files:**
- Modify: `src/components/canvas/Wire3D.tsx`

- [ ] **Step 1: Compute midpoint**

Wire3D already builds the line geometry from segments. Compute the midpoint of the wire path (average of start + end, or pick the middle vertex of the segment list).

- [ ] **Step 2: Add `<FloatingLabel>` at midpoint**

Skip rendering if `wire.signalId` is empty OR `wire.value` is undefined. Label text: `formatSignalLabel(wire.value ?? 0, wire.width ?? 1)`. Pass `offsetY={0.3}` (wires are thin; small offset).

> If `wire.value` is not currently tracked, just show `wire.signalId` (or the first 6 chars). Don't expand scope to track per-wire values in this task.

- [ ] **Step 3: Test + commit**

Run: `pnpm exec vitest run src/components/canvas/`
Lint, commit:

```bash
git add src/components/canvas/Wire3D.tsx
git commit -m "feat(3d): float midpoint signal label on wires"
```

---

## Chunk C: Verification + close-out

### Task 10: Full quality gates

- [ ] **Step 1: Lint** — `pnpm run lint` → exit 0
- [ ] **Step 2: Unit tests** — `pnpm run test:run` → all green; new gate/wire/label tests visible in count.
- [ ] **Step 3: Store E2E** — `pnpm run test:e2e:store` → all green. Re-run the wiring-junction spec if it flakes (known flake — unrelated).
- [ ] **Step 4: Build** — `pnpm run build` → succeeds.

### Task 11: Manual smoke

- [ ] **Step 1**: `pnpm run dev` from worktree root.
- [ ] **Step 2 (gate bug fix)**: Drop InputNode → Properties panel → Width = 4. Drop NOT gate, drop OutputNode → set width 4. Wire input → NOT → output. Toggle input to `0b0111`; eval → output reads `0b1000` (label shows `0x08`).
- [ ] **Step 3 (gate mismatch)**: Drop AND gate (default width 1). Drop a width-4 input and a width-8 input. Wire width-4 to AND.input[0] (gate widens to 4). Try to wire width-8 to AND.input[1] → expect an error notification and no wire created.
- [ ] **Step 4 (labels)**: Confirm floating labels above every InputNode, OutputNode, gate, junction, and along wires; they remain readable from every camera angle (Billboard works) and disappear when performance mode is set to `low-power`.

### Task 12: Update todo + finish branch

- [ ] **Step 1**: Append completion notes to `tasks/todo.md` (multi-bit gates + label refactor sections). Note that gate-pin-width inference is strict (web-ide-style) and that wire midpoint labels currently use `signalId` when per-wire value isn't tracked.
- [ ] **Step 2**: Commit todo update.
- [ ] **Step 3**: Invoke `finishing-a-development-branch` skill.

---

## Pitfalls

- **Pre-existing single-bit tests in `gateLogic.test.ts`** will break the moment the signature changes. Update them in the same task (Step 6 of Task 1) — don't ship a failing suite.
- **`testUtils.ts` mock store**: any change to `GateInstance` (adding `width`) will trigger TS strict errors in the build. Add `width: 1` to the mock literal in Task 2 Step 8.
- **`BaseGate` performance mode**: BaseGate reads `performanceMode` and hides face text in `low-power`. `FloatingLabel` MUST replicate that behavior or scenes get noisier in perf mode.
- **`Billboard` re-renders every frame** at the R3F render loop; that's normal — Drei optimizes it. Don't try to `useMemo` the Billboard children unless profiling shows a problem.
- **Wire midpoint with elbow segments**: a wire with multiple bends has multiple plausible midpoints. Picking `segments[Math.floor(segments.length / 2)]` is fine for v1; revisit if labels cluster awkwardly on short wires.
- **Width inference is one-way (widen-only)**: `addWire` widens a default-width-1 gate. It does NOT narrow a wider gate when a width-1 wire arrives (that becomes a mismatch throw). That matches web-ide's "no silent narrowing" rule.
- **Removing a wire does not re-narrow the gate.** This is acceptable for v1 — document as a known limitation. Re-narrowing would require tracking how each pin acquired its width.
- **Don't extend the signalId-only wire labels into a full per-wire value tracker** — that's a separate ticket. YAGNI.
- **Drei `<Text>` font loading**: leaving `font={undefined}` (as BaseGate does) uses the bundled default. Keep it consistent.

---

## Done When

- `pnpm run lint`, `pnpm run test:run`, `pnpm run test:e2e:store`, `pnpm run build` all green.
- Manual smoke (Task 11) passes: 4-bit `0b0111 → NOT → 0b1000`; mismatched-width wire to an already-widened gate is rejected with a notification.
- Every InputNode, OutputNode, gate, junction renders a camera-facing floating label; wires render a midpoint label; all labels hide in `low-power` mode.
- `tasks/todo.md` carries completion notes + known limitations.
- Branch ready to finish via `finishing-a-development-branch`.
