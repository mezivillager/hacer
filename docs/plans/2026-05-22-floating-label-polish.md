# Floating-Label Polish (p05-13 follow-up) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Tighten the brand-new 3D floating labels so they look like schematic reference designators rather than HUD billboards: smaller text, uniform "above the body" orientation, half the current vertical gap, a crude DOM-based fallback in low-power mode, and visible wire labels even when the simulator isn't running.

**Architecture:**
- Replace `FloatingLabel`'s single hard-coded font-size + offset with a per-callsite contract derived from the component's bounding-box half-height + a small gap.
- Add a `lowPowerVariant: 'html' | 'hide'` prop. Default keeps the current `'hide'` behaviour for unaffected call sites; node / gate / junction / wire call sites switch to `'html'`, falling back to a Drei `<Html>` overlay rendered as a plain DOM `<span>` (no SDF text, no Billboard rotation per frame) when `performanceMode === 'low-power'`.
- Centralise the magic numbers in a new `LABEL_GEOMETRY` constant inside `FloatingLabel.tsx` so node/gate/junction/wire code keeps reading from a single source of truth.
- Decouple wire labels from `simulationRunning`: `CanvasArea` always emits a label — `wire.signalId` if present, otherwise the formatted signal value (only when running). If neither is available, no label is passed.

**Tech Stack:** React 19, TypeScript strict, React Three Fiber, `@react-three/drei` (`<Billboard>`, `<Text>`, `<Html>`), Zustand, Vitest, Playwright.

**Industry-standard ratio reference:**
- KiCad/Altium reference-designator text height is typically **30–50%** of the body's shortest visible dimension.
- I/O node body cube is `0.5 × 0.5 × 0.5` (see `src/nodes/config/nodeConfig.ts:8–15`); a `fontSize` of `0.18` = 36% of body height. Still readable from default camera distance.
- Gate body is `1.0 × 0.8 × 0.4` (see `src/gates/config/common.ts:9–16`); `fontSize: 0.22` = 27% of body height — matches the previous face-painted label exactly (`NOT_TEXT_CONFIG.fontSize = 0.22` in `src/gates/config/not-constants.ts:21`).
- Current `LABEL_FONT_SIZE = 0.35` is ~70% of node body height — visibly oversized. Halving it lands at the industry-standard range without sacrificing legibility at default zoom.

---

## File Structure

**Modify:**
- `src/components/canvas/FloatingLabel.tsx` — central constants, `lowPowerVariant` prop, optional `crudeFontSize` prop, conditional `<Html>` branch.
- `src/components/canvas/FloatingLabel.test.tsx` — extend existing 3 tests with offset / lowPower / crude variants (R3F renders into canvas, so smoke-check `<Html>` via DOM and the `lowPowerVariant='hide'` branch via `container.firstChild?.childNodes.length` heuristic plus the existing canvas presence check).
- `src/nodes/components/InputNode3D.tsx` — drop the literal `offsetY={1.2}`; use the new `LABEL_GEOMETRY.NODE` constants; pass `lowPowerVariant="html"`.
- `src/nodes/components/OutputNode3D.tsx` — same treatment as `InputNode3D`.
- `src/nodes/components/JunctionNode3D.tsx` — use `LABEL_GEOMETRY.JUNCTION`; pass `lowPowerVariant="html"`.
- `src/gates/common/BaseGate.tsx` — use `LABEL_GEOMETRY.GATE`; remove the `performanceMode !== 'low-power'` gate (FloatingLabel now owns the rule); pass `lowPowerVariant="html"`.
- `src/components/canvas/Wire3D.tsx` — use `LABEL_GEOMETRY.WIRE`; pass `lowPowerVariant="html"`.
- `src/components/canvas/CanvasArea.tsx:93–149` — emit `signalLabel` regardless of `simulationRunning` using a small helper (`computeWireLabel(wire, signalValue, simulationRunning)`).

**Do NOT touch:**
- `src/store/performanceModeStorage.ts` / `viewActions` / `circuitStore` performance-mode plumbing.
- Multi-bit gate logic or width-inference paths landed earlier in this worktree (already merged on `p05-13`).
- HDL parser, simulation engine.

---

## Constants

Add to `src/components/canvas/FloatingLabel.tsx`:

```ts
// Schematic-style label sizing. Font sizes are ~30–40% of the smaller body
// dimension (KiCad/Altium reference-designator convention). offsetY = body
// half-height + small gap so the label sits just above the bounding box.
export const LABEL_GEOMETRY = {
  NODE: { fontSize: 0.18, offsetY: 0.45 }, // body 0.5×0.5×0.5 → half + 0.20 gap
  GATE: { fontSize: 0.22, offsetY: 0.6 },  // body height 0.8 → half + 0.20 gap
  JUNCTION: { fontSize: 0.14, offsetY: 0.32 }, // sphere r=0.08 + extra clearance
  WIRE: { fontSize: 0.16, offsetY: 0.2 }, // floats just above the wire line
} as const

const LABEL_DEFAULT_COLOR = '#ffffff'
const LABEL_DEFAULT_FONT_SIZE = 0.2 // generic fallback only — call sites should use LABEL_GEOMETRY
const LABEL_DEFAULT_OFFSET_Y = 0.5
const LABEL_OUTLINE_WIDTH = 0.015 // was 0.02 — slightly thinner so it reads as a label, not a sticker
const LABEL_CRUDE_FONT_PX = 11 // <Html> DOM-fallback font size
```

---

## Task 1: `FloatingLabel` exposes geometry constants + low-power `<Html>` fallback

**Files:**
- Modify: `src/components/canvas/FloatingLabel.tsx`
- Test: `src/components/canvas/FloatingLabel.test.tsx`

- [ ] **Step 1: Read the existing component**

Run: `cat src/components/canvas/FloatingLabel.tsx`

Confirm current shape (one `<Billboard><Text>` pair, hard-coded `LABEL_FONT_SIZE = 0.35`, `LABEL_DEFAULT_OFFSET_Y = 1.6`, low-power = return `null`). Note: `@react-three/drei` exports `Html` (used in WirePreview tests elsewhere — confirm via `grep -rn "from '@react-three/drei'" src | grep -i html` if curious).

- [ ] **Step 2: Write failing tests**

Replace `src/components/canvas/FloatingLabel.test.tsx` with:

```tsx
import { describe, it, expect, beforeEach } from 'vitest'
import { render } from '@testing-library/react'
import { Canvas } from '@react-three/fiber'
import { FloatingLabel, LABEL_GEOMETRY } from './FloatingLabel'
import { useCircuitStore } from '@/store/circuitStore'

describe('FloatingLabel', () => {
  beforeEach(() => {
    useCircuitStore.setState({ performanceMode: 'normal' })
  })

  it('mounts without throwing in normal mode', () => {
    const { container } = render(
      <Canvas>
        <FloatingLabel position={[0, 0, 0]} text="in: 0x0F" />
      </Canvas>,
    )
    expect(container.querySelector('canvas')).toBeInTheDocument()
  })

  it('returns null in low-power mode when lowPowerVariant defaults to "hide"', () => {
    useCircuitStore.setState({ performanceMode: 'low-power' })
    const { container } = render(
      <Canvas>
        <FloatingLabel position={[0, 0, 0]} text="hidden" />
      </Canvas>,
    )
    expect(container.querySelector('canvas')).toBeInTheDocument()
    // No DOM-overlay span should be present
    expect(container.querySelector('[data-testid="floating-label-crude"]')).toBeNull()
  })

  it('renders a crude DOM overlay in low-power mode when lowPowerVariant="html"', () => {
    useCircuitStore.setState({ performanceMode: 'low-power' })
    const { container } = render(
      <Canvas>
        <FloatingLabel position={[0, 0, 0]} text="crude" lowPowerVariant="html" />
      </Canvas>,
    )
    expect(container.querySelector('[data-testid="floating-label-crude"]')).not.toBeNull()
    expect(container.querySelector('[data-testid="floating-label-crude"]')?.textContent).toBe('crude')
  })

  it('does not render the crude DOM overlay in normal mode even when lowPowerVariant="html"', () => {
    const { container } = render(
      <Canvas>
        <FloatingLabel position={[0, 0, 0]} text="full" lowPowerVariant="html" />
      </Canvas>,
    )
    expect(container.querySelector('[data-testid="floating-label-crude"]')).toBeNull()
  })

  it('returns null when text is empty in either mode', () => {
    const { container } = render(
      <Canvas>
        <FloatingLabel position={[0, 0, 0]} text="" lowPowerVariant="html" />
      </Canvas>,
    )
    expect(container.querySelector('[data-testid="floating-label-crude"]')).toBeNull()
  })

  it('exports LABEL_GEOMETRY presets for every component class', () => {
    expect(LABEL_GEOMETRY.NODE.fontSize).toBeCloseTo(0.18)
    expect(LABEL_GEOMETRY.GATE.fontSize).toBeCloseTo(0.22)
    expect(LABEL_GEOMETRY.JUNCTION.fontSize).toBeCloseTo(0.14)
    expect(LABEL_GEOMETRY.WIRE.fontSize).toBeCloseTo(0.16)
    // All offsets are roughly body-half-height + small gap (≤ 0.6)
    for (const preset of Object.values(LABEL_GEOMETRY)) {
      expect(preset.offsetY).toBeGreaterThan(0)
      expect(preset.offsetY).toBeLessThanOrEqual(0.6)
    }
  })
})
```

- [ ] **Step 3: Run tests, confirm RED**

Run: `pnpm exec vitest run src/components/canvas/FloatingLabel.test.tsx`
Expected: FAIL — `LABEL_GEOMETRY` is not exported, `lowPowerVariant` prop does not exist, low-power DOM overlay missing.

- [ ] **Step 4: Rewrite `FloatingLabel.tsx`**

Replace the file body with:

```tsx
import { Billboard, Html, Text } from '@react-three/drei'
import { useCircuitStore } from '@/store/circuitStore'

export const LABEL_GEOMETRY = {
  NODE: { fontSize: 0.18, offsetY: 0.45 },
  GATE: { fontSize: 0.22, offsetY: 0.6 },
  JUNCTION: { fontSize: 0.14, offsetY: 0.32 },
  WIRE: { fontSize: 0.16, offsetY: 0.2 },
} as const

const LABEL_DEFAULT_COLOR = '#ffffff'
const LABEL_DEFAULT_FONT_SIZE = 0.2
const LABEL_DEFAULT_OFFSET_Y = 0.5
const LABEL_OUTLINE_WIDTH = 0.015
const LABEL_CRUDE_FONT_PX = 11

export type LowPowerVariant = 'hide' | 'html'

interface FloatingLabelProps {
  position: [number, number, number]
  text: string
  offsetY?: number
  color?: string
  fontSize?: number
  /**
   * Behaviour when `performanceMode === 'low-power'`.
   * - 'hide' (default): render nothing — preserves legacy behaviour.
   * - 'html': render a lightweight DOM `<span>` overlay via Drei `<Html>`.
   *   Cheaper than the SDF `<Text>` + per-frame Billboard rotation, but still
   *   shows the label so users can identify components in low-power mode.
   */
  lowPowerVariant?: LowPowerVariant
}

export function FloatingLabel({
  position,
  text,
  offsetY = LABEL_DEFAULT_OFFSET_Y,
  color = LABEL_DEFAULT_COLOR,
  fontSize = LABEL_DEFAULT_FONT_SIZE,
  lowPowerVariant = 'hide',
}: FloatingLabelProps) {
  const performanceMode = useCircuitStore((s) => s.performanceMode)
  if (!text) return null

  const labelPos: [number, number, number] = [
    position[0],
    position[1] + offsetY,
    position[2],
  ]

  if (performanceMode === 'low-power') {
    if (lowPowerVariant === 'hide') return null
    return (
      <Html
        position={labelPos}
        center
        zIndexRange={[100, 0]}
        style={{ pointerEvents: 'none' }}
      >
        <span
          data-testid="floating-label-crude"
          style={{
            fontSize: `${LABEL_CRUDE_FONT_PX}px`,
            color,
            background: 'rgba(0,0,0,0.55)',
            padding: '1px 4px',
            borderRadius: 2,
            whiteSpace: 'nowrap',
            fontFamily: 'monospace',
          }}
        >
          {text}
        </span>
      </Html>
    )
  }

  return (
    <Billboard position={labelPos}>
      <Text
        fontSize={fontSize}
        color={color}
        anchorX="center"
        anchorY="middle"
        outlineWidth={LABEL_OUTLINE_WIDTH}
        outlineColor="#000000"
      >
        {text}
      </Text>
    </Billboard>
  )
}
```

- [ ] **Step 5: Run tests, confirm GREEN**

Run: `pnpm exec vitest run src/components/canvas/FloatingLabel.test.tsx`
Expected: PASS — all six tests green.

- [ ] **Step 6: Lint + commit**

```bash
pnpm run lint
git add src/components/canvas/FloatingLabel.tsx src/components/canvas/FloatingLabel.test.tsx
git commit -m "feat(3d): FloatingLabel exposes LABEL_GEOMETRY + crude DOM fallback in low-power"
```

---

## Task 2: Input/Output node labels use schematic sizing

**Files:**
- Modify: `src/nodes/components/InputNode3D.tsx`
- Modify: `src/nodes/components/OutputNode3D.tsx`

- [ ] **Step 1: Update the InputNode3D label block**

In `src/nodes/components/InputNode3D.tsx`, replace the `<FloatingLabel>` block (currently at lines 126–130) with:

```tsx
<FloatingLabel
  position={[0, 0, 0]}
  text={`${name}: ${formatSignalLabel(value, width)}`}
  offsetY={LABEL_GEOMETRY.NODE.offsetY}
  fontSize={LABEL_GEOMETRY.NODE.fontSize}
  lowPowerVariant="html"
/>
```

Update the import on line 10 to:

```tsx
import { FloatingLabel, LABEL_GEOMETRY } from '@/components/canvas/FloatingLabel'
```

- [ ] **Step 2: Mirror the change in OutputNode3D**

In `src/nodes/components/OutputNode3D.tsx`, replace the `<FloatingLabel>` block (currently at lines 149–153) with the same five-prop snippet (`text={`${name}: ${formatSignalLabel(value, width)}`}`), and update the import on line 10 the same way.

- [ ] **Step 3: Run node tests**

Run: `pnpm exec vitest run src/nodes/`
Expected: PASS — pre-existing tests do not assert label font size; they only verify presence (via the existing `gate-text` mocks in other suites). No assertions touch the dropped `offsetY={1.2}` literal.

- [ ] **Step 4: Lint + commit**

```bash
pnpm run lint
git add src/nodes/components/InputNode3D.tsx src/nodes/components/OutputNode3D.tsx
git commit -m "feat(3d): I/O node labels use LABEL_GEOMETRY.NODE (smaller, closer)"
```

---

## Task 3: Gate label uses schematic sizing + delegates low-power gate to FloatingLabel

**Files:**
- Modify: `src/gates/common/BaseGate.tsx`
- Test: `src/gates/common/BaseGate.test.tsx`

- [ ] **Step 1: Update BaseGate label block**

In `src/gates/common/BaseGate.tsx`, replace lines 144–151:

```tsx
{textLabel && (
  <FloatingLabel
    position={[0, 0, 0]}
    text={gateWidth > 1 ? `${textLabel}:${gateWidth}` : textLabel}
    offsetY={LABEL_GEOMETRY.GATE.offsetY}
    fontSize={LABEL_GEOMETRY.GATE.fontSize}
    lowPowerVariant="html"
  />
)}
```

Note: the explicit `performanceMode !== 'low-power'` gate is **removed** because `FloatingLabel` now owns the low-power branch (it renders the crude DOM overlay instead of returning null). Update the import on line 10 to:

```tsx
import { FloatingLabel, LABEL_GEOMETRY } from '@/components/canvas/FloatingLabel'
```

The unused `performanceMode` subscription on line 64 can stay (it's read elsewhere if any future code adds it). If lint flags it as unused, drop the line.

- [ ] **Step 2: Update BaseGate test for low-power mode**

In `src/gates/common/BaseGate.test.tsx`, line 113–119 currently asserts the gate-text element is **absent** in low-power. With the new crude-DOM fallback, the SDF `<Text>` is still bypassed (mock returns null when the production code switches to `<Html>`), but the new DOM overlay isn't mocked.

The cleanest update: extend the `vi.mock('@react-three/drei', …)` block (lines 43–46) so `Html` is mocked the same way `Text` is. Replace those lines with:

```tsx
vi.mock('@react-three/drei', () => ({
  Text: ({ children }: { children: string }) => <div data-testid="gate-text">{children}</div>,
  Billboard: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  Html: ({ children }: { children: React.ReactNode }) => <div data-testid="gate-html">{children}</div>,
}))
```

Then update the low-power test (lines 113–119) to:

```tsx
it('shows crude DOM label in low-power mode (not the SDF Text)', () => {
  useCircuitStore.getState().performanceMode = 'low-power'

  const { queryByTestId } = render(<BaseGate {...defaultProps} textLabel="AND" />)

  expect(queryByTestId('gate-text')).not.toBeInTheDocument()
  expect(queryByTestId('gate-html')).toBeInTheDocument()
})
```

- [ ] **Step 3: Run gate tests, confirm GREEN**

Run: `pnpm exec vitest run src/gates/`
Expected: PASS — `renders text label when provided`, the renamed low-power assertion, and the eight stub-visibility tests all green.

- [ ] **Step 4: Lint + commit**

```bash
pnpm run lint
git add src/gates/common/BaseGate.tsx src/gates/common/BaseGate.test.tsx
git commit -m "feat(3d): gate label uses LABEL_GEOMETRY.GATE + crude fallback in low-power"
```

---

## Task 4: Junction label uses schematic sizing

**Files:**
- Modify: `src/nodes/components/JunctionNode3D.tsx`

- [ ] **Step 1: Update the JunctionNode3D label block**

Replace line 55 in `src/nodes/components/JunctionNode3D.tsx`:

```tsx
<FloatingLabel
  position={[0, 0, 0]}
  text={labelText}
  offsetY={LABEL_GEOMETRY.JUNCTION.offsetY}
  fontSize={LABEL_GEOMETRY.JUNCTION.fontSize}
  lowPowerVariant="html"
/>
```

Update the import on line 6 to:

```tsx
import { FloatingLabel, LABEL_GEOMETRY } from '@/components/canvas/FloatingLabel'
```

- [ ] **Step 2: Run node tests**

Run: `pnpm exec vitest run src/nodes/`
Expected: PASS.

- [ ] **Step 3: Lint + commit**

```bash
pnpm run lint
git add src/nodes/components/JunctionNode3D.tsx
git commit -m "feat(3d): junction label uses LABEL_GEOMETRY.JUNCTION"
```

---

## Task 5: Wire labels — always visible (signalId fallback) + schematic sizing

**Files:**
- Modify: `src/components/canvas/Wire3D.tsx`
- Modify: `src/components/canvas/CanvasArea.tsx:93–149`
- Test: `src/components/canvas/Wire3D.test.tsx`

- [ ] **Step 1: Survey current label plumbing**

Run: `sed -n '40,50p;195,205p' src/components/canvas/Wire3D.tsx` to confirm the `signalLabel` prop is already optional and only renders when truthy.

Run: `sed -n '93,150p' src/components/canvas/CanvasArea.tsx` to confirm the `simulationRunning` gate at line 146.

- [ ] **Step 2: Write failing test for Wire3D sizing constants**

Append to `src/components/canvas/Wire3D.test.tsx`:

```tsx
import { LABEL_GEOMETRY } from './FloatingLabel'

describe('Wire3D label sizing', () => {
  it('exports a wire label preset that is smaller than the gate preset', () => {
    expect(LABEL_GEOMETRY.WIRE.fontSize).toBeLessThan(LABEL_GEOMETRY.GATE.fontSize)
    expect(LABEL_GEOMETRY.WIRE.offsetY).toBeLessThan(LABEL_GEOMETRY.GATE.offsetY)
  })
})
```

This is a tiny structural test — full visual verification lives in manual smoke. Run and confirm GREEN (LABEL_GEOMETRY already lives in FloatingLabel from Task 1):

Run: `pnpm exec vitest run src/components/canvas/Wire3D.test.tsx`
Expected: PASS.

- [ ] **Step 3: Update Wire3D to read from LABEL_GEOMETRY**

In `src/components/canvas/Wire3D.tsx`, replace lines 196–203 with:

```tsx
{signalLabel && midPoint && !isPreview && (
  <FloatingLabel
    position={[midPoint.x, midPoint.y, midPoint.z]}
    text={signalLabel}
    offsetY={LABEL_GEOMETRY.WIRE.offsetY}
    fontSize={LABEL_GEOMETRY.WIRE.fontSize}
    lowPowerVariant="html"
  />
)}
```

Update the import on line 7 to:

```tsx
import { FloatingLabel, LABEL_GEOMETRY } from './FloatingLabel'
```

- [ ] **Step 4: Decouple wire labels from simulationRunning in CanvasArea**

In `src/components/canvas/CanvasArea.tsx`, replace line 146:

```tsx
signalLabel={(() => {
  if (wire.signalId) return wire.signalId
  if (simulationRunning) return formatSignalLabel(signalValue, wire.width ?? 1)
  return undefined
})()}
```

> Inline IIFE keeps the JSX local; no new helper file needed. The order ensures named signals always show their name, and unnamed wires fall back to live values only when sim is running (avoids "0" noise on a paused, unwired canvas).

- [ ] **Step 5: Run wire + canvas tests**

Run: `pnpm exec vitest run src/components/canvas/Wire3D.test.tsx src/components/canvas/CanvasArea.test.tsx`
Expected: PASS. CanvasArea tests don't assert on `signalLabel` content (they cover render counts and grid placement), so no change required there.

- [ ] **Step 6: Lint + commit**

```bash
pnpm run lint
git add src/components/canvas/Wire3D.tsx src/components/canvas/Wire3D.test.tsx src/components/canvas/CanvasArea.tsx
git commit -m "feat(3d): wire labels use LABEL_GEOMETRY.WIRE; show signalId even when sim paused"
```

---

## Task 6: Verification + manual smoke + todo update

- [ ] **Step 1: Full lint** — Run `pnpm run lint` → exit 0.
- [ ] **Step 2: Unit tests** — Run `pnpm run test:run` → all green; the new FloatingLabel suite shows six passing assertions.
- [ ] **Step 3: Store E2E** — Run `pnpm run test:e2e:store` → all green. Re-run the known-flaky `wiring-junction` spec once if it flakes (see lessons.md, unrelated).
- [ ] **Step 4: Production build** — Run `pnpm run build` → succeeds.

- [ ] **Step 5: Manual smoke (normal mode)**

  1. `pnpm run dev` from the worktree root.
  2. Drop an InputNode → set name `in0` via PropertiesPanel.
  3. Drop a NOT gate.
  4. Drop an OutputNode → set name `out0`.
  5. Wire `in0 → NOT → out0`, run sim.
  6. Expect:
     - "in0: 1" label sits **directly above** the green input cube, no more than ~0.5 units away.
     - "out0: 0" label sits **directly above** the red output cube.
     - "NOT" label sits **directly above** the NOT triangle (not behind, not to the side).
     - Wire label shows `0x01` or `1` at the wire midpoint, also above the wire.
     - All four labels are roughly the same visual size and look like reference designators — not larger than the body cubes.

- [ ] **Step 6: Manual smoke (low-power mode)**

  1. Toggle performance mode to low-power (toolbar button).
  2. Expect:
     - SDF labels disappear.
     - Crude DOM `<span>` labels appear in the same spots, monospace font, dark translucent background.
     - Toggle back to normal mode → SDF labels return.

- [ ] **Step 7: Manual smoke (wire labels without sim)**

  1. Stop the simulation.
  2. Expect wires that have a `signalId` to still show their signal-name label at the midpoint; wires without one show nothing.

- [ ] **Step 8: Update `tasks/todo.md`**

Append to `tasks/todo.md`:

```markdown
## P05-13 follow-up — Floating label polish (2026-05-22)

- Centralised label sizing in `LABEL_GEOMETRY` (NODE 0.18 / GATE 0.22 / JUNCTION 0.14 / WIRE 0.16); ~half the previous `0.35`/`0.25` defaults to match KiCad/Altium ~30–40% body-height convention.
- offsetY shrunk to body-half-height + small gap so labels sit just above the bounding box instead of floating 1.2–1.4 units away.
- `FloatingLabel` gained `lowPowerVariant: 'hide' | 'html'`. Node, gate, junction, and wire call sites use `'html'`, rendering a Drei `<Html>` overlay (`monospace`, 11 px, dark translucent bg) in low-power mode — cheap GPU-wise but keeps labels legible.
- Wire labels are no longer gated by `simulationRunning`: `CanvasArea` prefers `wire.signalId`, falls back to the formatted value only when the sim runs.
- Verification: lint, full unit suite, store E2E, build all green; manual smoke covered both performance modes.
```

- [ ] **Step 9: Commit todo update**

```bash
git add tasks/todo.md
git commit -m "docs(p05-13): note floating-label polish follow-up"
```

- [ ] **Step 10: Invoke `finishing-a-development-branch`**

When all eight green checks above hold and the smoke notes are committed, hand off to `superpowers:finishing-a-development-branch` for merge or PR decision (the worktree stays on the `p05-13` branch per the user's directive).

---

## Pitfalls

- **Drei `<Html>` portals into the WebGL parent DOM.** Vitest's `Canvas` shim should still render it (the existing `<Html>` usage in `WirePreview.test.tsx` works); if it doesn't, mock `Html` exactly like `Text` is mocked in `BaseGate.test.tsx` (`Html: ({ children }) => <div data-testid="floating-label-crude">{children}</div>`).
- **`<Html>` ignores `Billboard` rotation** — that's the whole point in low-power mode (cheaper). Do not nest `<Html>` inside `<Billboard>`.
- **`pointerEvents: 'none'`** on the `<Html>` overlay is mandatory; otherwise the crude label captures clicks meant for the underlying mesh, breaking dragging and selection in low-power mode.
- **BaseGate test mock**: the existing mock of `useCircuitStore.getState().performanceMode = 'low-power'` is a direct assignment (line 114), not `setState`. That assignment continues to work because the file mocks the store; do not switch to `setState` there — it would diverge from the rest of the file.
- **Bounding-box-derived offsets**: the I/O node body is centred at the group origin, so `offsetY = halfHeight + gap = 0.25 + 0.20 = 0.45` puts the label baseline at world `y = 0.45`, **0.2 above the top of the cube**. The gate body is also centred at group origin (the `[0, 0, -0.2]` shift on `bodyGeometryProps.position` only moves the mesh in Z for visual depth, not Y); `offsetY = 0.4 + 0.20 = 0.6` puts the label at world `y = 0.6`, **0.2 above the top of the body**. Both ratios match.
- **Junction label collision**: with `offsetY = 0.32`, the label sits slightly above small junction spheres. If during smoke the label visually overlaps a passing wire, bump to `0.40` and update the manual smoke note — do **not** change `LABEL_GEOMETRY.JUNCTION` mid-implementation without re-running Task 1's tests.
- **Don't widen scope**: do not refactor `simulationRunning` plumbing, do not introduce a separate `useLabelGeometry` hook, do not move `LABEL_GEOMETRY` into the theme. Keep the constants colocated with `FloatingLabel` so future changes are one-edit-one-file.
- **React Compiler**: no manual memoization (per `.cursorrules`). The new constants are top-level — no `useMemo` needed even if a smoke run feels jittery.
- **Wire label "0x" noise**: with `signalLabel` always emitted for named wires, very short wires (one or two segments) may have their midpoint label visually clipped by adjacent gate labels. Acceptable for v1; a later ticket can introduce per-wire label opt-out.

---

## Self-Review Checklist (applied)

- **Spec coverage:** all five user-reported issues map to a task:
  1. Labels too big → Task 1 + Task 2/3/4/5 fontSize via `LABEL_GEOMETRY`.
  2. Orientation inconsistent → Task 2/3/4 set `position=[0,0,0]` + uniform offsetY rule; gate-specific Z-offset of the body geometry has no Y component, so all label baselines now sit at `bodyHalfHeight + 0.20` above the group origin.
  3. Labels too far → all offsetY values halved or more (1.2→0.45, 1.4→0.6, 0.8→0.32, 0.3→0.2).
  4. Low-power blank → Task 1's `lowPowerVariant='html'` plus updates to every call site so they opt in.
  5. Wires not labelled → Task 5 decouples from `simulationRunning` and prefers `wire.signalId`.
- **Placeholder scan:** no "TBD"/"handle edge cases"/"similar to Task N" placeholders.
- **Type consistency:** `LABEL_GEOMETRY` and `LowPowerVariant` are defined in Task 1 and consumed unchanged in Tasks 2–5. The prop name `lowPowerVariant` matches across every call site.

---

## Done When

- `pnpm run lint`, `pnpm run test:run`, `pnpm run test:e2e:store`, `pnpm run build` all exit 0.
- Manual smoke confirms every label sits directly above its component, ~half the previous distance away, and is visibly smaller than the body it labels.
- Performance toggle: normal mode shows SDF Billboard labels with outlines; low-power mode shows a crude DOM `<span>` overlay at every label site (nodes, gates, junctions, named wires).
- Wires with `signalId` show their label even when the simulator is stopped.
- `tasks/todo.md` carries a `P05-13 follow-up — Floating label polish (2026-05-22)` entry.
- Branch stays on `p05-13`; ready to be handed to `finishing-a-development-branch`.
