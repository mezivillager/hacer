# P05-13 Multi-bit I/O UI Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add multi-bit input/output UI (bit toggles for width ≤ 8, numeric text input for wider buses, format selector for Binary/Decimal/Hex) integrated into `PinoutPanel` and the 3D `InputNode3D` / `OutputNode3D` labels.

**Architecture:** New pure helpers (`formatValue`, `parseValue`) live in `src/components/ui/multiBitFormat.ts` so they are unit-testable without React Testing Library. A new presentational component `MultiBitInput.tsx` uses these helpers and the existing shadcn/Tailwind design system (NO inline styles — match the rest of `PinoutPanel`). The 3D node labels reuse `formatValue` via a thin wrapper inside `src/simulation/signalDisplay.ts` so that label rendering stays centralized. Format-selector state is local per node (UI concern, not circuit state — `useState` is fine, React Compiler handles it).

**Tech Stack:** React 18, TypeScript, Zustand, Vitest + @testing-library/react, Tailwind, shadcn/ui (`@/components/ui-kit/button`), React Three Fiber (`<Text>` from drei).

**Reference Spec:** [`docs/plans/phase-0.5-tickets/P05-13.md`](../../plans/phase-0.5-tickets/P05-13.md)

---

## File Structure

**Create:**
- `src/components/ui/multiBitFormat.ts` — pure helpers `formatValue(value, width, format)` and `parseValue(text, width)`. Exported `DisplayFormat = 'B' | 'D' | 'X'`.
- `src/components/ui/multiBitFormat.test.ts` — Vitest unit tests for helpers (no React).
- `src/components/ui/MultiBitInput.tsx` — presentational component: bit-toggle row for width ≤ 8, numeric text input for width > 8, embedded `<FormatSelector>`.
- `src/components/ui/MultiBitInput.test.tsx` — RTL component tests.

**Modify:**
- `src/components/ui/PinoutPanel.tsx` — replace single-bit-only toggle with `MultiBitInput` for inputs (`width > 1`); replace read-only output `<span>` with a `MultiBitDisplay`-style read-only render using the same format selector. Keep the existing single-bit toggle path unchanged.
- `src/simulation/signalDisplay.ts` — extend `formatSignalLabel(value)` (or add `formatBusLabel(value, width)`) to use `formatValue(value, width, 'X')` for `width > 1`. Single-bit behavior unchanged.
- `src/nodes/components/InputNode3D.tsx` — pass `width` into the label helper so multi-bit values render as `0x..`.
- `src/nodes/components/OutputNode3D.tsx` — same as InputNode3D.

**Do NOT touch:** `circuitStore.ts`, node types, evaluator, store actions. This ticket is pure presentation.

---

## Chunk 1: Pure format helpers (TDD)

### Task 1: `multiBitFormat.ts` helpers

**Files:**
- Create: `src/components/ui/multiBitFormat.ts`
- Test: `src/components/ui/multiBitFormat.test.ts`

- [ ] **Step 1: Write failing helper tests**

Create `src/components/ui/multiBitFormat.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import { formatValue, parseValue } from './multiBitFormat'

describe('formatValue', () => {
  it('binary format pads to width (4-bit)', () => {
    expect(formatValue(0b1010, 4, 'B')).toBe('1010')
  })
  it('binary pads zeros on the left', () => {
    expect(formatValue(0b11, 8, 'B')).toBe('00000011')
  })
  it('decimal format', () => {
    expect(formatValue(255, 8, 'D')).toBe('255')
  })
  it('hex format with 0x prefix and width-rounded padding', () => {
    expect(formatValue(0xFF, 16, 'X')).toBe('0x00FF')
  })
  it('hex format for non-multiple-of-4 width pads to ceil(width/4)', () => {
    expect(formatValue(0x5, 5, 'X')).toBe('0x05')
  })
  it('masks bits above the width', () => {
    expect(formatValue(0x1FF, 8, 'D')).toBe('255')
  })
  it('handles width=32 without overflow', () => {
    expect(formatValue(0xFFFFFFFF, 32, 'X')).toBe('0xFFFFFFFF')
  })
})

describe('parseValue', () => {
  it('parses decimal', () => expect(parseValue('42', 8)).toBe(42))
  it('parses hex with 0x prefix', () => expect(parseValue('0xFF', 8)).toBe(255))
  it('parses hex with 0X prefix', () => expect(parseValue('0XFF', 8)).toBe(255))
  it('parses binary with 0b prefix', () => expect(parseValue('0b1010', 4)).toBe(10))
  it('parses binary with 0B prefix', () => expect(parseValue('0B1010', 4)).toBe(10))
  it('clamps to width', () => expect(parseValue('256', 8)).toBe(0))
  it('clamps wider hex to width', () => expect(parseValue('0x1FF', 8)).toBe(255))
  it('returns null for non-numeric text', () => expect(parseValue('abc', 8)).toBeNull())
  it('returns null for empty string', () => expect(parseValue('', 8)).toBeNull())
  it('returns null for whitespace only', () => expect(parseValue('   ', 8)).toBeNull())
  it('returns null for negative numbers', () => expect(parseValue('-1', 8)).toBeNull())
  it('trims whitespace', () => expect(parseValue('  42  ', 8)).toBe(42))
})
```

- [ ] **Step 2: Run tests and verify they fail**

Run: `pnpm exec vitest run src/components/ui/multiBitFormat.test.ts`
Expected: FAIL — `Cannot find module './multiBitFormat'`.

- [ ] **Step 3: Implement helpers**

Create `src/components/ui/multiBitFormat.ts`:

```typescript
export type DisplayFormat = 'B' | 'D' | 'X'

function widthMask(width: number): number {
  // 1 << 32 is undefined behavior in JS — use unsigned full mask for >= 32
  return width >= 32 ? 0xFFFFFFFF : (1 << width) - 1
}

export function formatValue(value: number, width: number, format: DisplayFormat): string {
  const clamped = (value & widthMask(width)) >>> 0
  switch (format) {
    case 'B':
      return clamped.toString(2).padStart(width, '0')
    case 'D':
      return String(clamped)
    case 'X':
      return '0x' + clamped.toString(16).toUpperCase().padStart(Math.ceil(width / 4), '0')
  }
}

export function parseValue(text: string, width: number): number | null {
  const trimmed = text.trim()
  if (trimmed.length === 0) return null
  if (trimmed.startsWith('-')) return null

  let num: number
  if (trimmed.startsWith('0x') || trimmed.startsWith('0X')) {
    num = parseInt(trimmed.slice(2), 16)
  } else if (trimmed.startsWith('0b') || trimmed.startsWith('0B')) {
    num = parseInt(trimmed.slice(2), 2)
  } else {
    if (!/^[0-9]+$/.test(trimmed)) return null
    num = parseInt(trimmed, 10)
  }
  if (!Number.isFinite(num) || Number.isNaN(num)) return null
  return (num & widthMask(width)) >>> 0
}
```

- [ ] **Step 4: Run tests and verify they pass**

Run: `pnpm exec vitest run src/components/ui/multiBitFormat.test.ts`
Expected: PASS, all cases green.

- [ ] **Step 5: Commit**

```bash
git add src/components/ui/multiBitFormat.ts src/components/ui/multiBitFormat.test.ts
git commit -m "test(p05-13): add multi-bit format/parse helpers with width masking"
```

---

## Chunk 2: `MultiBitInput` component (TDD)

### Task 2: Bit-toggle path (width ≤ 8)

**Files:**
- Create: `src/components/ui/MultiBitInput.tsx`
- Test: `src/components/ui/MultiBitInput.test.tsx`

- [ ] **Step 1: Write failing RTL tests for the bit-toggle path**

Create `src/components/ui/MultiBitInput.test.tsx`:

```tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { MultiBitInput } from './MultiBitInput'

describe('MultiBitInput (width ≤ 8 — bit toggles)', () => {
  it('renders one toggle per bit for width=4', () => {
    render(
      <MultiBitInput nodeId="n1" currentValue={0b1010} width={4} onValueChange={vi.fn()} />,
    )
    expect(screen.getAllByTestId(/^bit-toggle-n1-/)).toHaveLength(4)
  })

  it('renders MSB on the left, LSB on the right', () => {
    render(
      <MultiBitInput nodeId="n1" currentValue={0b1100} width={4} onValueChange={vi.fn()} />,
    )
    // bit-toggle-n1-0 is leftmost (MSB) → bit index width-1-0 = 3 → value (0b1100 >> 3) & 1 = 1
    expect(screen.getByTestId('bit-toggle-n1-0').textContent).toBe('1')
    expect(screen.getByTestId('bit-toggle-n1-3').textContent).toBe('0')
  })

  it('clicking a bit calls onValueChange with the flipped value', () => {
    const onChange = vi.fn()
    render(
      <MultiBitInput nodeId="n1" currentValue={0b1010} width={4} onValueChange={onChange} />,
    )
    // Rightmost toggle (LSB, index width-1) flips bit 0
    fireEvent.click(screen.getByTestId('bit-toggle-n1-3'))
    expect(onChange).toHaveBeenCalledWith('n1', 0b1011)
  })

  it('shows the formatted value next to the toggles', () => {
    render(
      <MultiBitInput nodeId="n1" currentValue={0b1010} width={4} onValueChange={vi.fn()} />,
    )
    // Default format is 'D'
    expect(screen.getByTestId('multibit-display-n1').textContent).toBe('10')
  })

  it('switching format to X shows hex', () => {
    render(
      <MultiBitInput nodeId="n1" currentValue={0xAB} width={8} onValueChange={vi.fn()} />,
    )
    fireEvent.click(screen.getByTestId('format-X-n1'))
    expect(screen.getByTestId('multibit-display-n1').textContent).toBe('0xAB')
  })
})
```

- [ ] **Step 2: Run tests and verify they fail**

Run: `pnpm exec vitest run src/components/ui/MultiBitInput.test.tsx`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `MultiBitInput.tsx` (bit-toggle path only, plus format selector)**

Create `src/components/ui/MultiBitInput.tsx`:

```tsx
import { useState } from 'react'
import { formatValue, parseValue, type DisplayFormat } from './multiBitFormat'

interface MultiBitInputProps {
  nodeId: string
  currentValue: number
  width: number
  onValueChange: (nodeId: string, value: number) => void
  readOnly?: boolean
}

export function MultiBitInput({
  nodeId,
  currentValue,
  width,
  onValueChange,
  readOnly = false,
}: MultiBitInputProps) {
  const [format, setFormat] = useState<DisplayFormat>('D')
  const [editText, setEditText] = useState('')
  const [isEditing, setIsEditing] = useState(false)

  if (width <= 8) {
    return (
      <div data-testid={`multibit-input-${nodeId}`} className="flex items-center gap-2">
        <div className="flex gap-0.5">
          {Array.from({ length: width }, (_, i) => {
            const bitIndex = width - 1 - i
            const bit = (currentValue >>> bitIndex) & 1
            return (
              <button
                key={i}
                type="button"
                data-testid={`bit-toggle-${nodeId}-${i}`}
                disabled={readOnly}
                onClick={() => {
                  if (readOnly) return
                  onValueChange(nodeId, currentValue ^ (1 << bitIndex))
                }}
                className={
                  'font-mono text-[10px] leading-none px-1 py-0.5 rounded ' +
                  (bit
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-muted-foreground') +
                  ' disabled:cursor-default cursor-pointer'
                }
              >
                {bit}
              </button>
            )
          })}
        </div>
        <span data-testid={`multibit-display-${nodeId}`} className="font-mono text-xs">
          {formatValue(currentValue, width, format)}
        </span>
        <FormatSelector nodeId={nodeId} format={format} onChange={setFormat} />
      </div>
    )
  }

  // width > 8 — numeric text input
  return (
    <div data-testid={`multibit-input-${nodeId}`} className="flex items-center gap-2">
      {isEditing && !readOnly ? (
        <input
          data-testid={`multibit-text-input-${nodeId}`}
          className="font-mono text-xs w-24 px-1 py-0.5 rounded bg-background border"
          value={editText}
          onChange={(e) => setEditText(e.target.value)}
          onBlur={() => {
            const parsed = parseValue(editText, width)
            if (parsed !== null) onValueChange(nodeId, parsed)
            setIsEditing(false)
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') (e.target as HTMLInputElement).blur()
            if (e.key === 'Escape') setIsEditing(false)
          }}
          autoFocus
        />
      ) : (
        <button
          type="button"
          data-testid={`multibit-display-${nodeId}`}
          disabled={readOnly}
          onClick={() => {
            if (readOnly) return
            setEditText(formatValue(currentValue, width, format))
            setIsEditing(true)
          }}
          className="font-mono text-xs px-1.5 py-0.5 rounded hover:bg-accent disabled:hover:bg-transparent disabled:cursor-default cursor-pointer"
        >
          {formatValue(currentValue, width, format)}
        </button>
      )}
      <FormatSelector nodeId={nodeId} format={format} onChange={setFormat} />
    </div>
  )
}

function FormatSelector({
  nodeId,
  format,
  onChange,
}: {
  nodeId: string
  format: DisplayFormat
  onChange: (f: DisplayFormat) => void
}) {
  return (
    <span data-testid={`format-selector-${nodeId}`} className="flex gap-0.5">
      {(['B', 'D', 'X'] as const).map((f) => (
        <button
          key={f}
          type="button"
          data-testid={`format-${f}-${nodeId}`}
          onClick={() => onChange(f)}
          className={
            'font-mono text-[10px] leading-none px-1 py-0.5 rounded cursor-pointer ' +
            (f === format
              ? 'bg-primary text-primary-foreground font-semibold'
              : 'text-muted-foreground hover:bg-accent')
          }
        >
          {f}
        </button>
      ))}
    </span>
  )
}
```

- [ ] **Step 4: Run bit-toggle tests and verify they pass**

Run: `pnpm exec vitest run src/components/ui/MultiBitInput.test.tsx`
Expected: PASS for all five `width ≤ 8` cases.

- [ ] **Step 5: Commit**

```bash
git add src/components/ui/MultiBitInput.tsx src/components/ui/MultiBitInput.test.tsx
git commit -m "feat(p05-13): MultiBitInput bit-toggle + format selector for width<=8"
```

### Task 3: Numeric text-input path (width > 8)

**Files:**
- Modify: `src/components/ui/MultiBitInput.test.tsx`

- [ ] **Step 1: Add failing tests for the wide-bus path**

Append to `MultiBitInput.test.tsx`:

```tsx
describe('MultiBitInput (width > 8 — numeric input)', () => {
  it('renders a display button (not bit toggles) for width=16', () => {
    render(
      <MultiBitInput nodeId="n2" currentValue={0x1234} width={16} onValueChange={vi.fn()} />,
    )
    expect(screen.queryAllByTestId(/^bit-toggle-n2-/)).toHaveLength(0)
    expect(screen.getByTestId('multibit-display-n2')).toBeTruthy()
  })

  it('clicking display reveals a text input pre-filled with the current value', () => {
    render(
      <MultiBitInput nodeId="n2" currentValue={0xAB} width={16} onValueChange={vi.fn()} />,
    )
    fireEvent.click(screen.getByTestId('multibit-display-n2'))
    const input = screen.getByTestId('multibit-text-input-n2') as HTMLInputElement
    // Default format 'D' so display & edit text are decimal
    expect(input.value).toBe('171')
  })

  it('committing an edit (Enter -> blur) calls onValueChange with the parsed value', () => {
    const onChange = vi.fn()
    render(
      <MultiBitInput nodeId="n2" currentValue={0} width={16} onValueChange={onChange} />,
    )
    fireEvent.click(screen.getByTestId('multibit-display-n2'))
    const input = screen.getByTestId('multibit-text-input-n2') as HTMLInputElement
    fireEvent.change(input, { target: { value: '0xFF' } })
    fireEvent.blur(input)
    expect(onChange).toHaveBeenCalledWith('n2', 255)
  })

  it('invalid input on blur does not call onValueChange', () => {
    const onChange = vi.fn()
    render(
      <MultiBitInput nodeId="n2" currentValue={0} width={16} onValueChange={onChange} />,
    )
    fireEvent.click(screen.getByTestId('multibit-display-n2'))
    const input = screen.getByTestId('multibit-text-input-n2') as HTMLInputElement
    fireEvent.change(input, { target: { value: 'not a number' } })
    fireEvent.blur(input)
    expect(onChange).not.toHaveBeenCalled()
  })

  it('readOnly prop disables editing on wide-bus path', () => {
    render(
      <MultiBitInput
        nodeId="n2"
        currentValue={0xAB}
        width={16}
        onValueChange={vi.fn()}
        readOnly
      />,
    )
    fireEvent.click(screen.getByTestId('multibit-display-n2'))
    expect(screen.queryByTestId('multibit-text-input-n2')).toBeNull()
  })
})
```

- [ ] **Step 2: Run tests and verify all pass**

Run: `pnpm exec vitest run src/components/ui/MultiBitInput.test.tsx`
Expected: All wide-bus tests PASS (the implementation from Task 2 already covers this path).

If any fail, fix the implementation — do NOT add behavior beyond what tests assert.

- [ ] **Step 3: Commit**

```bash
git add src/components/ui/MultiBitInput.test.tsx
git commit -m "test(p05-13): cover MultiBitInput numeric-input path and readOnly"
```

---

## Chunk 3: Integrate into `PinoutPanel`

### Task 4: Replace inline single-bit/multi-bit rendering with `MultiBitInput`

**Files:**
- Modify: `src/components/ui/PinoutPanel.tsx`
- Modify: `src/components/ui/PinoutPanel.test.tsx`

- [ ] **Step 1: Read the existing PinoutPanel test file**

Run: `cat src/components/ui/PinoutPanel.test.tsx`

Note current testids used so the failing test for multi-bit doesn't collide.

- [ ] **Step 2: Add failing test for multi-bit input wiring in PinoutPanel**

First confirm the existing test conventions: `grep -n "addInputNode\|clearCircuit\|useCircuitStore" src/components/ui/PinoutPanel.test.tsx`. The file already imports `useCircuitStore` and `circuitActions` from `@/store/circuitStore` at the top and resets state via `circuitActions.clearCircuit()` in a `beforeEach`. The `addInputNode` signature is `addInputNode(name: string, position: {x,y,z}, width?: number)` and returns the created node directly.

Append a new `describe` block to `src/components/ui/PinoutPanel.test.tsx` — use ESM imports already at top of file, do NOT use `require`:

```tsx
describe('PinoutPanel — multi-bit inputs (P05-13)', () => {
  it('renders MultiBitInput for an input node with width > 1', () => {
    circuitActions.clearCircuit()
    const s = useCircuitStore.getState()
    const node = s.addInputNode('in4', { x: 0, y: 0, z: 0 }, 4)

    render(<PinoutPanel />)
    expect(screen.getByTestId(`multibit-input-${node.id}`)).toBeTruthy()
    expect(screen.getAllByTestId(new RegExp(`^bit-toggle-${node.id}-`))).toHaveLength(4)
  })

  it('toggling a bit in a multi-bit input updates the store value', () => {
    circuitActions.clearCircuit()
    const s = useCircuitStore.getState()
    const node = s.addInputNode('in4', { x: 0, y: 0, z: 0 }, 4)

    render(<PinoutPanel />)
    // LSB toggle = `bit-toggle-<id>-3` (i = width-1, bitIndex = 0)
    fireEvent.click(screen.getByTestId(`bit-toggle-${node.id}-3`))
    expect(useCircuitStore.getState().inputNodes.find(n => n.id === node.id)?.value).toBe(1)
  })

  it('still renders the legacy single-bit toggle for width=1 inputs', () => {
    circuitActions.clearCircuit()
    const s = useCircuitStore.getState()
    s.addInputNode('single', { x: 0, y: 0, z: 0 })

    render(<PinoutPanel />)
    expect(screen.getByTestId('pin-toggle-single')).toBeTruthy()
  })
})
```

> If your top-of-file imports are missing `useCircuitStore` or `circuitActions`, add them next to the existing imports. Use `clearCircuit()` — never a partial `setState({ inputNodes: [], ... })`, which leaves other store slices stale.

- [ ] **Step 3: Run the new tests and verify they fail**

Run: `pnpm exec vitest run src/components/ui/PinoutPanel.test.tsx -t "multi-bit"`
Expected: FAIL — `getByTestId('multibit-input-...')` returns nothing.

- [ ] **Step 4: Wire `MultiBitInput` into `PinoutPanel`**

Edit `src/components/ui/PinoutPanel.tsx`:

1. Add import: `import { MultiBitInput } from './MultiBitInput'`
2. Inside the `inputNodes.map(...)` block (lines 43–63), branch on `node.width`:

```tsx
{inputNodes.map(node => (
  <div
    key={node.id}
    data-testid={`pin-input-${node.name}`}
    className="flex items-center justify-between py-0.5"
  >
    <span className="text-xs">
      {node.name}
      {node.width > 1 ? `[${node.width}]` : ''}
    </span>
    {node.width === 1 ? (
      <button
        type="button"
        data-testid={`pin-toggle-${node.name}`}
        onClick={() => handleToggle(node.id, node.value, node.width)}
        className="font-mono text-xs cursor-pointer hover:bg-accent rounded px-1.5 py-0.5"
      >
        {String(Number(node.value))}
      </button>
    ) : (
      <MultiBitInput
        nodeId={node.id}
        currentValue={node.value}
        width={node.width}
        onValueChange={(id, v) => circuitActions.updateInputNodeValue(id, v)}
      />
    )}
  </div>
))}
```

3. For outputs (lines 72–86), use `MultiBitInput` in read-only mode for multi-bit; keep the simple span for width=1:

```tsx
{node.width === 1 ? (
  <span className="font-mono text-xs px-1.5 py-0.5">
    {String(Number(node.value))}
  </span>
) : (
  <MultiBitInput
    nodeId={node.id}
    currentValue={node.value}
    width={node.width}
    onValueChange={() => {}}
    readOnly
  />
)}
```

4. Remove the `disabled={node.width !== 1}` attribute from the single-bit toggle path since that branch is now only reached for `width === 1`.

- [ ] **Step 5: Run all PinoutPanel tests**

Run: `pnpm exec vitest run src/components/ui/PinoutPanel.test.tsx`
Expected: all PASS, including the new multi-bit cases and the legacy single-bit cases.

- [ ] **Step 6: Update the `inputsSignature` dirty-state check still works**

Verify: the eval-dirty signature (line 6–8) reads `n.value` — multi-bit changes will produce different signatures, so dirty-state should naturally work. No code change required. Confirm by reading the test output; if any "dirty" test fails, fix at root.

- [ ] **Step 7: Commit**

```bash
git add src/components/ui/PinoutPanel.tsx src/components/ui/PinoutPanel.test.tsx
git commit -m "feat(p05-13): wire MultiBitInput into PinoutPanel for multi-bit I/O"
```

---

## Chunk 4: 3D node label integration

### Task 5: Extend `signalDisplay` to format multi-bit values

**Files:**
- Modify: `src/simulation/signalDisplay.ts`
- Test: `src/simulation/signalDisplay.test.ts` (create if missing — check first with `ls src/simulation/signalDisplay.test.ts`)

- [ ] **Step 1: Read the existing test file to confirm legacy behavior**

Run: `cat src/simulation/signalDisplay.test.ts`

This file is expected to already exist with single-bit cases like `formatSignalLabel(0) === '0'` and `formatSignalLabel(3) === '3'`. Those calls pass no `width` argument, so when we add `width: number = 1` they will keep returning `String(value)` unchanged — verify the legacy assertions still match after the implementation step.

- [ ] **Step 2: Append failing multi-bit tests**

Append to `src/simulation/signalDisplay.test.ts` (do NOT recreate the file):

```typescript
import { describe, it, expect } from 'vitest'
import { formatSignalLabel } from './signalDisplay'

describe('formatSignalLabel — multi-bit (P05-13)', () => {
  it('single-bit unchanged', () => {
    expect(formatSignalLabel(0, 1)).toBe('0')
    expect(formatSignalLabel(1, 1)).toBe('1')
  })
  it('multi-bit renders as hex with 0x prefix', () => {
    expect(formatSignalLabel(0xFF, 8)).toBe('0xFF')
  })
  it('multi-bit pads hex to ceil(width/4)', () => {
    expect(formatSignalLabel(0x5, 16)).toBe('0x0005')
  })
  it('falls back to single-bit behavior when width is omitted', () => {
    expect(formatSignalLabel(1)).toBe('1')
  })
})
```

- [ ] **Step 3: Run test and verify failure**

Run: `pnpm exec vitest run src/simulation/signalDisplay.test.ts`
Expected: FAIL on multi-bit cases (width arg ignored or function signature mismatch).

- [ ] **Step 4: Update `formatSignalLabel` to accept optional width**

Read current signature first: `cat src/simulation/signalDisplay.ts`

Edit so the signature becomes:

```typescript
import { formatValue } from '@/components/ui/multiBitFormat'

export function formatSignalLabel(value: number, width: number = 1): string {
  if (width <= 1) return String(value)
  return formatValue(value, width, 'X')
}
```

> If the file has other exports / additional formatting logic, preserve them. Width default = 1 keeps callers that don't pass width working unchanged.

- [ ] **Step 5: Run test and verify pass**

Run: `pnpm exec vitest run src/simulation/signalDisplay.test.ts`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/simulation/signalDisplay.ts src/simulation/signalDisplay.test.ts
git commit -m "feat(p05-13): formatSignalLabel accepts width and renders hex for multi-bit"
```

### Task 6: Pass `width` from `InputNode3D` and `OutputNode3D`

**Files:**
- Modify: `src/nodes/components/InputNode3D.tsx` (label JSX ~lines 139–149)
- Modify: `src/nodes/components/OutputNode3D.tsx` (label JSX ~lines 162–172)

- [ ] **Step 1: Locate and update the InputNode3D label call**

Run: `grep -n "formatSignalLabel" src/nodes/components/InputNode3D.tsx`

Change call site from `formatSignalLabel(value)` to `formatSignalLabel(value, width)` (where `width` comes from the node's `data.width` or destructured prop — verify with the surrounding code).

- [ ] **Step 2: Update OutputNode3D the same way**

Run: `grep -n "formatSignalLabel" src/nodes/components/OutputNode3D.tsx`

Apply the same change.

- [ ] **Step 3: Lint + typecheck the changed files**

Run: `pnpm run lint`
Expected: exit 0.

- [ ] **Step 4: If either node has unit tests, run them; otherwise rely on the full suite in Chunk 5**

Run (best-effort): `pnpm exec vitest run src/nodes/components/ 2>&1 | tail -20`

- [ ] **Step 5: Commit**

```bash
git add src/nodes/components/InputNode3D.tsx src/nodes/components/OutputNode3D.tsx
git commit -m "feat(p05-13): InputNode3D/OutputNode3D show hex-formatted multi-bit values"
```

---

## Chunk 5: Full verification & ticket close-out

### Task 7: Full quality gates

- [ ] **Step 1: Lint**

Run: `pnpm run lint`
Expected: exit 0, no errors.

- [ ] **Step 2: Full unit test suite**

Run: `pnpm run test:run`
Expected: all green, including the new helper, component, and panel tests.

- [ ] **Step 3: Store E2E regression**

Run: `pnpm run test:e2e:store`
Expected: all passing — no regression in store-driven flows.

- [ ] **Step 4: Production build**

Run: `pnpm run build`
Expected: build succeeds.

- [ ] **Step 5: Manual smoke (if a browser is available)**

1. `pnpm run dev`
2. Drag in an InputNode, set its width to 16 via existing UI.
3. In the Pinout sidebar: click the numeric display → type `0xFF` → press Enter → value updates to 255.
4. Click `B` in the format selector → display shows `0000000011111111`.
5. Verify the 3D top-face label on the node shows `0x00FF`.
6. Drop a width=4 input → confirm 4 bit-toggle buttons, click LSB → value flips, eval button becomes dirty.

Document any deviations in `tasks/lessons.md` and revisit before commit.

### Task 8: Update ticket + checklist

**Files:**
- Modify: `docs/plans/phase-0.5-tickets/P05-13.md`
- Modify: `docs/plans/phase-0.5-tickets-CHECKLIST.md`
- Modify: `tasks/todo.md`

- [ ] **Step 1: Append a completion note to `P05-13.md`**

Add a `## Status` section at the bottom mirroring how P05-11 was closed:

```markdown
## Status

**Completed:** 2026-05-19
**Branch:** p05-13
**Summary:** Multi-bit I/O UI delivered — bit toggles for width ≤ 8, numeric input (B/D/X) for wider buses, integrated into PinoutPanel and 3D node labels.
```

- [ ] **Step 2: Tick P05-13 in `phase-0.5-tickets-CHECKLIST.md`**

Run: `grep -n "P05-13" docs/plans/phase-0.5-tickets-CHECKLIST.md`

Update the checklist entry from `- [ ]` to `- [x]`.

- [ ] **Step 3: Append a review entry to `tasks/todo.md`**

Mirror the structure used by the most recent P05-11 review entry.

- [ ] **Step 4: Final commit**

```bash
git add docs/plans/phase-0.5-tickets/P05-13.md docs/plans/phase-0.5-tickets-CHECKLIST.md tasks/todo.md
git commit -m "docs(p05-13): mark ticket complete and record completion notes"
```

### Task 9: Finish the branch

- [ ] **Step 1: Use the finishing-a-development-branch skill**

Invoke the `finishing-a-development-branch` skill. It will guide the PR / merge / cleanup path appropriate for HACER.

---

## Pitfalls (carry-over from spec + plan-level)

- **Width=32 mask**: `1 << 32` is undefined in JS — `widthMask` switches to `0xFFFFFFFF` at width ≥ 32.
- **MSB-on-left ordering**: visual order is MSB → LSB. Tests above pin this — don't reverse it.
- **Format state is local UI**: do NOT put `DisplayFormat` into Zustand. `useState` is fine (React Compiler optimizes).
- **Tailwind, not inline styles**: the spec uses inline styles; this codebase uses Tailwind / shadcn. The plan adapts accordingly — match `PinoutPanel.tsx` for class conventions.
- **Read-only output reuse**: rather than build a separate `MultiBitDisplay`, the plan uses `MultiBitInput` with `readOnly`. This keeps a single source of truth for format + masking.
- **`formatSignalLabel` backward compat**: the new `width` parameter defaults to 1 — every existing call site keeps working.
- **PinoutPanel dirty signature**: `inputsSignature` reads `value` directly, so multi-bit edits dirty the panel naturally. Confirm the test still passes; if not, fix at root.

---

## Done When

- All five `pnpm run` quality gates green (`lint`, `test:run`, `test:e2e:store`, `build`, `typecheck` if separate).
- Manual smoke passes for width=1, width=4, and width=16 nodes.
- P05-13 ticket marked complete; checklist updated.
- Branch ready for PR via `finishing-a-development-branch`.
