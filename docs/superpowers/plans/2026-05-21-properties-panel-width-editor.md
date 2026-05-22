# PropertiesPanel Width Editor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a width editor to `PropertiesPanel` for `InputNode`/`OutputNode` so users can change a node's bit width post-placement, unblocking manual smoke testing of P05-13's multi-bit I/O UI.

**Architecture:** Two new store actions (`updateInputNodeWidth`, `updateOutputNodeWidth`) mirror the existing `renameInputNode`/`renameOutputNode` pattern. The panel renders a `<select>` of standard widths (1, 2, 4, 8, 16, 32) when an I/O node is selected and dispatches the matching action on change. We deliberately skip placement-time width selection — changing width on a freshly placed node is sufficient for smoke testing and keeps the surface minimal.

**Tech Stack:** React 19, TypeScript, Zustand, Vitest + @testing-library/react, Tailwind + shadcn UI primitives.

**Reference:**
- P05-13 multi-bit I/O UI plan: [`docs/superpowers/plans/2026-05-19-p05-13-multi-bit-io-ui.md`](./2026-05-19-p05-13-multi-bit-io-ui.md)
- Width cap rationale (32): `src/components/ui/multiBitFormat.ts` `widthMask`

---

## File Structure

**Modify:**
- `src/store/actions/nodeActions.ts` — append `updateInputNodeWidth(id, width)` and `updateOutputNodeWidth(id, width)` following the rename action pattern (file lines ~82–106).
- `src/store/circuitStore.ts` — if the `circuitActions` facade explicitly re-exports actions, add the two new ones; if it spreads `nodeActions` they'll appear automatically (verify before editing).
- `src/store/actions/nodeActions.test.ts` (or equivalent — check existing test file colocated with `nodeActions.ts`) — add tests for the two new actions.
- `src/components/ui/PropertiesPanel/index.tsx` — render a width `<select>` for I/O nodes after the name field, dispatch the matching update action on change.
- `src/components/ui/PropertiesPanel/index.test.tsx` — add tests covering width display + change for input + output.

**Do NOT touch:**
- `nodePlacementActions.ts` — placement-time width selection is intentionally out of scope.
- Wire/edge code — see Pitfalls about stale wire widths.

---

## Constants

Standard widths surfaced in the UI: `[1, 2, 4, 8, 16, 32]`. Defined once and reused by both production and tests.

---

## Chunk 1: Store actions (TDD)

### Task 1: `updateInputNodeWidth` + `updateOutputNodeWidth`

**Files:**
- Modify: `src/store/actions/nodeActions.ts`
- Test: locate the existing test file for `nodeActions` — run `ls src/store/actions/nodeActions*` and `grep -rn "renameInputNode" src/store --include=*.test.ts` to find it. Reuse that file. If no test file exists, create `src/store/actions/nodeActions.test.ts` mirroring whatever colocated test pattern the store already uses (check sibling action folders for an example).

- [ ] **Step 1: Read existing rename actions to mirror the pattern**

Run: `grep -n "renameInputNode\|renameOutputNode" src/store/actions/nodeActions.ts`

Read those functions and the surrounding `set((state) => …)` pattern so the new actions follow the exact same style (immutable update, no-op if id not found, no return value).

- [ ] **Step 2: Write failing tests**

Append to the existing nodeActions test file:

```typescript
describe('updateInputNodeWidth', () => {
  beforeEach(() => {
    circuitActions.clearCircuit()
  })

  it('changes the width of an existing input node', () => {
    const node = useCircuitStore.getState().addInputNode('in', { x: 0, y: 0, z: 0 }, 1)
    circuitActions.updateInputNodeWidth(node.id, 4)
    const updated = useCircuitStore.getState().inputNodes.find(n => n.id === node.id)
    expect(updated?.width).toBe(4)
  })

  it('is a no-op when the node id is unknown', () => {
    const before = useCircuitStore.getState().inputNodes.length
    circuitActions.updateInputNodeWidth('does-not-exist', 8)
    expect(useCircuitStore.getState().inputNodes.length).toBe(before)
  })

  it('does not mutate other nodes', () => {
    const a = useCircuitStore.getState().addInputNode('a', { x: 0, y: 0, z: 0 }, 1)
    const b = useCircuitStore.getState().addInputNode('b', { x: 1, y: 0, z: 0 }, 1)
    circuitActions.updateInputNodeWidth(a.id, 4)
    const bAfter = useCircuitStore.getState().inputNodes.find(n => n.id === b.id)
    expect(bAfter?.width).toBe(1)
  })
})

describe('updateOutputNodeWidth', () => {
  beforeEach(() => {
    circuitActions.clearCircuit()
  })

  it('changes the width of an existing output node', () => {
    const node = useCircuitStore.getState().addOutputNode('out', { x: 0, y: 0, z: 0 }, 1)
    circuitActions.updateOutputNodeWidth(node.id, 8)
    const updated = useCircuitStore.getState().outputNodes.find(n => n.id === node.id)
    expect(updated?.width).toBe(8)
  })

  it('is a no-op when the node id is unknown', () => {
    const before = useCircuitStore.getState().outputNodes.length
    circuitActions.updateOutputNodeWidth('does-not-exist', 8)
    expect(useCircuitStore.getState().outputNodes.length).toBe(before)
  })
})
```

> If `circuitActions` and `useCircuitStore` are not already imported at the top of the existing test file, add them next to the existing imports (same source as the `renameInputNode` tests use).

- [ ] **Step 3: Run tests, confirm RED**

Run: `pnpm exec vitest run src/store/actions/nodeActions.test.ts`
Expected: FAIL — `circuitActions.updateInputNodeWidth is not a function`.

- [ ] **Step 4: Implement the actions in `nodeActions.ts`**

Add directly after `renameOutputNode` in `src/store/actions/nodeActions.ts`, mirroring the existing rename pattern. Use the same `set` signature and `state.inputNodes.map` / `state.outputNodes.map` style as `renameInputNode` and `renameOutputNode`:

```typescript
updateInputNodeWidth: (nodeId: string, width: number): void => {
  set((state) => ({
    inputNodes: state.inputNodes.map((n) =>
      n.id === nodeId ? { ...n, width } : n,
    ),
  }))
},

updateOutputNodeWidth: (nodeId: string, width: number): void => {
  set((state) => ({
    outputNodes: state.outputNodes.map((n) =>
      n.id === nodeId ? { ...n, width } : n,
    ),
  }))
},
```

> Match the surrounding TypeScript style (arrow vs method, `set` vs `useCircuitStore.setState`). If `nodeActions.ts` uses method shorthand `renameInputNode(...) { … }`, use the same shorthand here.

- [ ] **Step 5: Wire actions into the `circuitActions` facade (if needed)**

Run: `grep -n "renameInputNode\|renameOutputNode" src/store/circuitStore.ts`

- If `circuitStore.ts` explicitly lists actions (e.g. `circuitActions = { renameInputNode: …, renameOutputNode: …, … }`), add the two new ones next to them.
- If it spreads the entire action set (e.g. `…nodeActions(set, get)`), no edit needed — the actions will appear automatically.

Confirm by running the new tests.

- [ ] **Step 6: Run tests, confirm GREEN**

Run: `pnpm exec vitest run src/store/actions/nodeActions.test.ts`
Expected: PASS (existing tests still passing + 5 new tests).

- [ ] **Step 7: Typecheck + lint**

Run: `pnpm run lint`
Expected: exit 0.

- [ ] **Step 8: Commit**

```bash
git add src/store/actions/nodeActions.ts src/store/actions/nodeActions.test.ts src/store/circuitStore.ts
git commit -m "feat(props-panel): add updateInputNodeWidth/updateOutputNodeWidth actions"
```

> If `circuitStore.ts` didn't need changes, drop it from the `git add` list.

---

## Chunk 2: PropertiesPanel width editor (TDD)

### Task 2: Render width `<select>` for I/O nodes

**Files:**
- Modify: `src/components/ui/PropertiesPanel/index.tsx`
- Modify: `src/components/ui/PropertiesPanel/index.test.tsx`

- [ ] **Step 1: Read the existing panel structure**

Run: `cat src/components/ui/PropertiesPanel/index.tsx`

Note specifically:
- The `isEditableNode` flag (around line 67) — width is editable in the same conditions as name.
- The `commitName` flow with `onBlur` / `onKeyDown` Escape/Enter handling — we do NOT need that complexity for a `<select>`; it commits on change.
- Which shadcn primitive is in use (`<Input>` from `@/components/ui-kit/input` or equivalent). For the `<select>` we'll use a plain native HTML `<select>` with Tailwind classes, since no shadcn-styled `Select` was used elsewhere in the panel — matches the file's existing minimalism. Confirm by `grep -n "Select\|select" src/components/ui/PropertiesPanel/index.tsx` (look for prior `<select>` usage; if found, follow that style instead).

- [ ] **Step 2: Add failing tests for the width editor**

Append to `src/components/ui/PropertiesPanel/index.test.tsx` (do NOT recreate the file — it already has imports for `render`, `screen`, `fireEvent`, `circuitActions`, `useCircuitStore`):

```tsx
describe('PropertiesPanel — width editor (smoke-test gap)', () => {
  beforeEach(() => {
    circuitActions.clearCircuit()
  })

  it('shows the current width for a selected input node', () => {
    const node = useCircuitStore.getState().addInputNode('in', { x: 0, y: 0, z: 0 }, 4)
    useCircuitStore.setState({ selectedNodeId: node.id, selectedNodeType: 'input' })

    render(<PropertiesPanel />)
    const select = screen.getByTestId('node-width-select') as HTMLSelectElement
    expect(select.value).toBe('4')
  })

  it('changing the width dispatches updateInputNodeWidth for input nodes', () => {
    const node = useCircuitStore.getState().addInputNode('in', { x: 0, y: 0, z: 0 }, 1)
    useCircuitStore.setState({ selectedNodeId: node.id, selectedNodeType: 'input' })

    render(<PropertiesPanel />)
    const select = screen.getByTestId('node-width-select')
    fireEvent.change(select, { target: { value: '8' } })

    const updated = useCircuitStore.getState().inputNodes.find(n => n.id === node.id)
    expect(updated?.width).toBe(8)
  })

  it('changing the width dispatches updateOutputNodeWidth for output nodes', () => {
    const node = useCircuitStore.getState().addOutputNode('out', { x: 0, y: 0, z: 0 }, 1)
    useCircuitStore.setState({ selectedNodeId: node.id, selectedNodeType: 'output' })

    render(<PropertiesPanel />)
    const select = screen.getByTestId('node-width-select')
    fireEvent.change(select, { target: { value: '16' } })

    const updated = useCircuitStore.getState().outputNodes.find(n => n.id === node.id)
    expect(updated?.width).toBe(16)
  })

  it('does not render the width select when no I/O node is selected', () => {
    // No selection — panel may be empty or in a default state; either way no width select
    useCircuitStore.setState({ selectedNodeId: null, selectedNodeType: null })

    render(<PropertiesPanel />)
    expect(screen.queryByTestId('node-width-select')).toBeNull()
  })

  it('offers the standard width set 1, 2, 4, 8, 16, 32', () => {
    const node = useCircuitStore.getState().addInputNode('in', { x: 0, y: 0, z: 0 }, 1)
    useCircuitStore.setState({ selectedNodeId: node.id, selectedNodeType: 'input' })

    render(<PropertiesPanel />)
    const select = screen.getByTestId('node-width-select') as HTMLSelectElement
    const values = Array.from(select.options).map(o => o.value)
    expect(values).toEqual(['1', '2', '4', '8', '16', '32'])
  })
})
```

> Use `as HTMLSelectElement` here even though P05-13 hit eslint friction with `as HTMLInputElement`. `<select>` exposes `.value` and `.options` typed on `HTMLSelectElement` and there's no jest-dom matcher equivalent for `select.options` enumeration, so the cast is genuinely needed. If `lint-staged` strips it via `no-unnecessary-type-assertion`, fall back to `screen.getByTestId(...) as unknown as HTMLSelectElement` or — preferred — replace the value assertion with `expect((select as HTMLSelectElement).value).toBe('4')` by reading `select` as `HTMLElement` first and casting only at the `.value`/`.options` access sites. Pick whichever your codebase's eslint accepts; document the choice in the commit message.

- [ ] **Step 3: Run tests, confirm RED**

Run: `pnpm exec vitest run src/components/ui/PropertiesPanel/index.test.tsx -t "width editor"`
Expected: FAIL — `screen.getByTestId('node-width-select')` finds no element.

- [ ] **Step 4: Implement the width selector in `PropertiesPanel/index.tsx`**

At the top of the file, near other module-level constants, add:

```tsx
const STANDARD_WIDTHS = [1, 2, 4, 8, 16, 32] as const
```

In the body of the panel where `isEditableNode` (or equivalent) gates the name field, render the width selector immediately AFTER the name field and BEFORE position/rotation. Use the existing `selected.kind` / `selected.id` / `selected.width` shape exposed by `useSelectedElement()`:

```tsx
{isEditableNode && (
  <div className="flex items-center justify-between gap-2 py-1">
    <label htmlFor={`width-${selected.id}`} className="text-xs text-muted-foreground">
      Width
    </label>
    <select
      id={`width-${selected.id}`}
      data-testid="node-width-select"
      className="font-mono text-xs rounded border bg-background px-1 py-0.5 cursor-pointer"
      value={selected.width}
      onChange={(e) => {
        const next = Number(e.target.value)
        if (selected.kind === 'input') {
          circuitActions.updateInputNodeWidth(selected.id, next)
        } else if (selected.kind === 'output') {
          circuitActions.updateOutputNodeWidth(selected.id, next)
        }
      }}
    >
      {STANDARD_WIDTHS.map((w) => (
        <option key={w} value={w}>
          {w}
        </option>
      ))}
    </select>
  </div>
)}
```

> If `useSelectedElement()` does NOT already expose `width` on the discriminated union, extend the selector. Run `grep -n "useSelectedElement\|kind: 'input'" src/components/ui/PropertiesPanel/` to find the selector definition and add `width: node.width` to the `input` and `output` cases. Match the existing field style — do not refactor the selector beyond adding `width`.

- [ ] **Step 5: Run tests, confirm GREEN**

Run: `pnpm exec vitest run src/components/ui/PropertiesPanel/index.test.tsx`
Expected: PASS — all width-editor tests and pre-existing tests.

- [ ] **Step 6: Lint + typecheck**

Run: `pnpm run lint`
Expected: exit 0. If eslint strips the `as HTMLSelectElement` cast in the test file, see Step 2's note and switch to per-access casting.

- [ ] **Step 7: Commit**

```bash
git add src/components/ui/PropertiesPanel/index.tsx src/components/ui/PropertiesPanel/index.test.tsx
git commit -m "feat(props-panel): width selector for input/output nodes"
```

> If you also had to touch the `useSelectedElement` selector to expose `width`, include that file in the commit.

---

## Chunk 3: Verification + ticket close-out

### Task 3: Full quality gates

- [ ] **Step 1: Lint**

Run: `pnpm run lint`
Expected: exit 0.

- [ ] **Step 2: Full unit test suite**

Run: `pnpm run test:run`
Expected: all green; verify the new node-action tests and panel tests appear in the count.

- [ ] **Step 3: Store E2E regression**

Run: `pnpm run test:e2e:store`
Expected: all passing. If `junction-placement.store.spec.ts` flakes (as it did in P05-13), re-run that single spec to confirm:
`pnpm exec playwright test e2e/specs/wiring/junction-placement.store.spec.ts -g "wires from junction to create branch" --project=chromium`.

- [ ] **Step 4: Production build**

Run: `pnpm run build`
Expected: build succeeds.

- [ ] **Step 5: Manual smoke (this is the whole point)**

1. `pnpm run dev` from the worktree root.
2. Drop an `InputNode` (default width 1).
3. Click the node to select it.
4. In `PropertiesPanel` sidebar: a "Width" dropdown is visible, showing `1`.
5. Change to `4` → confirm the sidebar's PinoutPanel now shows 4 bit toggles for this node.
6. Change to `16` → confirm PinoutPanel now shows the click-to-edit numeric display.
7. Click the display, type `0xFF`, press Enter → value updates to `255` (decimal) or `0x00FF` (hex if you click `X`).
8. 3D top-face label reads `0x00FF`.
9. Drop an `OutputNode`, set width to `8`, wire a width=8 input to it, run eval → output panel shows 8 read-only bit toggles reflecting the input value.

If any step fails, file a follow-up — do NOT silently expand this plan.

### Task 4: Update todo + lessons

**Files:**
- Modify: `tasks/todo.md`

- [ ] **Step 1: Append a brief completion note**

Mirror the structure of the P05-13 entry in `tasks/todo.md`:

```markdown
## PropertiesPanel width editor (2026-05-21)

- Added `updateInputNodeWidth(id, width)` and `updateOutputNodeWidth(id, width)` actions in `src/store/actions/nodeActions.ts` following the `renameInputNode`/`renameOutputNode` pattern.
- `PropertiesPanel` now renders a `<select>` of standard widths (1, 2, 4, 8, 16, 32) for selected input/output nodes; dispatches the matching action on change.
- Unblocks manual smoke testing of P05-13 (multi-bit I/O UI) without needing a placement-time width dialog.
- Known limitation: changing a node's width does NOT re-infer the width of wires already connected to it; for smoke testing, set width before wiring. A follow-up ticket should either re-infer wire widths on node-width change or disable the editor when wires are connected.
- Verification: lint, full unit test suite, store E2E specs, production build all green.
```

- [ ] **Step 2: Final commit**

```bash
git add tasks/todo.md
git commit -m "docs(props-panel): record width-editor completion + known limitation"
```

### Task 5: Finish branch

- [ ] **Step 1: Invoke the `finishing-a-development-branch` skill**

The branch already carries P05-13 commits; the width-editor commits stack on top. The skill will present merge/PR/keep/discard options.

---

## Pitfalls

- **Eslint strips type casts**: P05-13 hit `@typescript-eslint/no-unnecessary-type-assertion` stripping `as HTMLInputElement` via `lint-staged`. For `<select>`, prefer jest-dom matchers where possible; for `select.options` enumeration the cast is genuine — see Task 2 Step 2 fallback strategies.
- **Stale wire widths**: P05-11 stores wire widths on the wire itself (inferred at `addWire` time). Changing a node's width afterwards does NOT update existing wires. For smoke testing this is fine (set width before wiring). Documented in Task 4 as a follow-up.
- **`useSelectedElement` may not expose width**: if the selector hasn't been updated, the panel won't have `selected.width`. Step 4 of Task 2 covers extending the selector; keep the change minimal — just add the field.
- **Placement-time width is intentionally out of scope**: don't add toolbar/popover changes. The PropertiesPanel route is sufficient.
- **`width: 32` edge cases**: P05-13 already proved `widthMask` handles 32 safely (`0xFFFFFFFF` branch). No new logic needed here — just allow `32` as an option.
- **Discriminated union narrowing**: `selected.kind === 'input'` vs `'output'` already narrows `selected` for name/position usage; reuse the same narrowing for the action dispatch in `onChange`. Don't cast.
- **`circuitActions` facade**: confirm by grep whether actions are auto-spread or explicitly enumerated before editing `circuitStore.ts` — saves a needless diff.

---

## Done When

- `pnpm run lint`, `pnpm run test:run`, `pnpm run test:e2e:store`, `pnpm run build` all green.
- Manual smoke from Task 3 Step 5 passes end-to-end: drop input → change width via panel → multi-bit UI appears in PinoutPanel and 3D label.
- `tasks/todo.md` carries the completion note + known limitation.
- Branch ready to finish via `finishing-a-development-branch`.
