# Chunk 6: Phase C-3d — HelpBar + KeyboardShortcutsModal (commit 3d)

> Spec ref: [`Commit 3d — HelpBar + KeyboardShortcutsModal`](../../specs/2026-04-17-design-system-migration-design.md#commit-3d--helpbar--keyboardshortcutsmodal)

**Goal:** Build the bottom shortcut hint strip + the modal listing every keyboard shortcut. Contextual mode derived from store state. Collapse state persists to localStorage. `?` key opens modal (guarded against text input focus).

---

## File inventory

### Add (shadcn primitives)

```bash
npx shadcn@latest add dialog tabs
```

`kbd` is not a standard shadcn CLI component — copy it manually from the design-system folder in Task 1.5 below.

### Create

| Path | Purpose |
|---|---|
| `src/components/ui/HelpBar/index.tsx` | Bottom strip + collapsed state |
| `src/components/ui/HelpBar/index.test.tsx` | |
| `src/components/ui/HelpBar/useContextMode.ts` | Store-derived mode (default/selecting/wiring/moving) |
| `src/components/ui/HelpBar/useContextMode.test.ts` | |
| `src/components/ui/HelpBar/useHelpBarCollapsed.ts` | localStorage-backed collapse state shared with StatusBar/PropertiesPanel offsets in chunk 7 |
| `src/components/ui/KeyboardShortcutsModal/index.tsx` | Modal with tabbed shortcut catalog |
| `src/components/ui/KeyboardShortcutsModal/index.test.tsx` | |
| `src/components/ui/KeyboardShortcutsModal/catalog.ts` | SHORTCUT_GROUPS source of truth |

### Modify

| Path | Change |
|---|---|
| `src/App.tsx` | Mount `<HelpBar />` inside the canvas-relative wrapper |
| `src/hooks/useKeyboardShortcuts.ts` | Add `?` key binding to open the modal (or coordinate via shared event); guard against input focus |

---

## Tasks

### Task 1: Add primitives

```bash
npx shadcn@latest add dialog tabs
```

---

### Task 1.5: Copy `kbd` primitive from design-system

`kbd` is not a standard shadcn CLI component — it's a small custom primitive defined in `design-system/components/ui/kbd.tsx`. Copy it into `src/components/ui-kit/`.

- [ ] **Step 1.5.1: Copy the file**

```bash
cp design-system/components/ui/kbd.tsx src/components/ui-kit/kbd.tsx
```

- [ ] **Step 1.5.2: Adjust imports if needed**

Open `src/components/ui-kit/kbd.tsx`. If it imports from `@/lib/utils` (the design-system convention), the path resolves identically in HACER (we set `aliases.utils` to `@/lib/utils` in `components.json` chunk 2). No change needed.

If it imports from `next/font` or any Next-only path, replace with the equivalent (likely just dropping the import — `kbd` is typically a styled `<kbd>` element with no font-specific dependency).

- [ ] **Step 1.5.3: Verify typecheck**

```bash
pnpm run typecheck
```

Expected: green.

---

### Task 2: Verify wiringMode store field name (Spec Known Unknown #3)

- [ ] **Step 2.1: Grep**

```bash
rg "wiringMode|isWiring|pendingWireSource|wiringFrom" src/store/
```

Identify the actual boolean (or boolean-derivable) field that signals "user is currently wiring". Per the existing `CanvasArea.tsx` line 26, the field is `wiringFrom` (a `WireEndpoint | null`). Use that with a derived `wiringFrom !== null` check inside `useContextMode`.

---

### Task 3: Build `useContextMode` (TDD)

**Files:**
- Create: `src/components/ui/HelpBar/useContextMode.ts`
- Create: `src/components/ui/HelpBar/useContextMode.test.ts`

- [ ] **Step 3.1: Tests**

```ts
// src/components/ui/HelpBar/useContextMode.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useContextMode } from './useContextMode';
import { useCircuitStore, circuitActions } from '@/store/circuitStore';

describe('useContextMode', () => {
  beforeEach(() => {
    circuitActions.clearCircuit();
    circuitActions.deselectAll();
    circuitActions.setPlacementMode(null);
    circuitActions.setNodePlacementMode(null);
    useCircuitStore.setState((s) => { s.wiringFrom = null; });
  });

  it('returns "default" when nothing is happening', () => {
    expect(renderHook(() => useContextMode()).result.current).toBe('default');
  });

  it('returns "moving" when placementMode is set', () => {
    circuitActions.setPlacementMode('AND');
    expect(renderHook(() => useContextMode()).result.current).toBe('moving');
  });

  it('returns "moving" when nodePlacementMode is set', () => {
    circuitActions.setNodePlacementMode('input');
    expect(renderHook(() => useContextMode()).result.current).toBe('moving');
  });

  it('returns "wiring" when wiringFrom is set', () => {
    useCircuitStore.setState((s) => {
      s.wiringFrom = { type: 'gate', entityId: 'fake', pinId: 'out' };
    });
    expect(renderHook(() => useContextMode()).result.current).toBe('wiring');
  });

  it('returns "selecting" when something is selected and no placement/wiring', () => {
    circuitActions.placeGate('AND', { x: 1, y: 0, z: 1 });
    circuitActions.selectGate(useCircuitStore.getState().gates[0].id);
    expect(renderHook(() => useContextMode()).result.current).toBe('selecting');
  });

  it('priority moving > wiring > selecting > default', () => {
    circuitActions.placeGate('AND', { x: 1, y: 0, z: 1 });
    circuitActions.selectGate(useCircuitStore.getState().gates[0].id);
    circuitActions.setPlacementMode('OR');
    expect(renderHook(() => useContextMode()).result.current).toBe('moving');
  });
});
```

- [ ] **Step 3.2: Implement**

```ts
// src/components/ui/HelpBar/useContextMode.ts
import { useCircuitStore } from '@/store/circuitStore';

export type ContextMode = 'default' | 'selecting' | 'wiring' | 'moving';

export function useContextMode(): ContextMode {
  const placementMode = useCircuitStore((s) => s.placementMode);
  const nodePlacementMode = useCircuitStore((s) => s.nodePlacementMode);
  const wiringFrom = useCircuitStore((s) => s.wiringFrom);
  const hasSelection = useCircuitStore(
    (s) => s.selectedGateId !== null || s.selectedWireId !== null || s.selectedNodeId !== null,
  );

  if (placementMode !== null || nodePlacementMode !== null) return 'moving';
  if (wiringFrom !== null) return 'wiring';
  if (hasSelection) return 'selecting';
  return 'default';
}
```

- [ ] **Step 3.3: Run, pass**

---

### Task 4: Build `useHelpBarCollapsed`

**Files:**
- Create: `src/components/ui/HelpBar/useHelpBarCollapsed.ts`

```ts
// src/components/ui/HelpBar/useHelpBarCollapsed.ts
import { useState, useEffect } from 'react';

const KEY = 'helpBarCollapsed';

export function useHelpBarCollapsed(): [boolean, (v: boolean) => void] {
  const [collapsed, setCollapsed] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return window.localStorage.getItem(KEY) === 'true';
  });
  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(KEY, String(collapsed));
  }, [collapsed]);
  return [collapsed, setCollapsed];
}
```

(Tested transitively via HelpBar tests; no separate test file required.)

---

### Task 5: Build SHORTCUT_GROUPS catalog

**Files:**
- Create: `src/components/ui/KeyboardShortcutsModal/catalog.ts`

```ts
// src/components/ui/KeyboardShortcutsModal/catalog.ts
export type ShortcutEntry = { keys: string[]; action: string; comingSoon?: boolean };
export type ShortcutGroup = { name: string; shortcuts: ShortcutEntry[] };

export const SHORTCUT_GROUPS: ShortcutGroup[] = [
  {
    name: 'Navigation',
    shortcuts: [
      { keys: ['Scroll'], action: 'Zoom in/out' },
      { keys: ['Right-click drag'], action: 'Pan camera' },
      { keys: ['Left-click drag'], action: 'Orbit camera' },
      { keys: ['F'], action: 'Fit view', comingSoon: true },
    ],
  },
  {
    name: 'Selection',
    shortcuts: [
      { keys: ['Click'], action: 'Select element' },
      { keys: ['Esc'], action: 'Deselect' },
      { keys: ['Delete'], action: 'Delete selected' },
    ],
  },
  {
    name: 'Editing',
    shortcuts: [
      { keys: ['Z'], action: 'Rotate gate 90\u00b0 (when selected)' },
      { keys: ['Esc'], action: 'Cancel placement / wiring' },
    ],
  },
  {
    name: 'Simulation',
    shortcuts: [
      { keys: ['Space'], action: 'Run/Pause simulation', comingSoon: true },
    ],
  },
];
```

(Verify each non-comingSoon entry against `src/hooks/useKeyboardShortcuts.ts` at impl. Mark as comingSoon if no live binding exists.)

---

### Task 6: Build KeyboardShortcutsModal (TDD)

**Files:**
- Create: `src/components/ui/KeyboardShortcutsModal/index.test.tsx`
- Create: `src/components/ui/KeyboardShortcutsModal/index.tsx`

- [ ] **Step 6.1: Tests cover**

- Modal renders with Dialog role
- All 4 tab triggers (Navigation/Selection/Editing/Simulation) present
- Default tab (Navigation) shows its catalog entries
- Switching tab shows new entries
- Comingsoon entries render with muted styling or `<ComingSoon>` wrap
- Esc closes modal (Radix default)

- [ ] **Step 6.2: Implement**

Direct port of `design-system/components/circuit-designer/keyboard-shortcuts-modal.tsx` driven by `SHORTCUT_GROUPS`. Add `data-testid="shortcuts-modal"` on the Dialog root.

- [ ] **Step 6.3: Pass**

---

### Task 7: Build HelpBar (TDD)

**Files:**
- Create: `src/components/ui/HelpBar/index.test.tsx`
- Create: `src/components/ui/HelpBar/index.tsx`

- [ ] **Step 7.1: Tests cover**

- Default mode: Click/Drag/Scroll hints
- Selecting mode (selection set): Delete/Z/Esc hints
- Wiring mode (wiringFrom set): Click pin/Esc hints
- Moving mode (placementMode set): Esc/Click hints
- Collapse button hides strip and shows floating expand button
- Floating expand button restores
- Collapse state persists across remount (localStorage)
- "All shortcuts" button opens modal

- [ ] **Step 7.2: Implement**

Direct port of `design-system/components/circuit-designer/help-bar.tsx` with:
- Drop `mode` prop; derive via `useContextMode()`
- Drop `collapsed`/`onCollapsedChange` props; use `useHelpBarCollapsed()`
- Replace shortcut text with HACER's mode-specific hints (table in spec §4d)
- Add `data-testid` per the contract: `help-bar`, `help-bar-expand-button`, `help-bar-all-shortcuts`

- [ ] **Step 7.3: Pass**

---

### Task 8: Wire `?` key to open modal

**Files:**
- Modify: `src/hooks/useKeyboardShortcuts.ts`

- [ ] **Step 8.1: Read existing hook to confirm `?` not already bound**

```bash
rg '"\\?"|key === [\\"]\\?' src/hooks/useKeyboardShortcuts.ts
```

If unbound, add. If bound, document in `tasks/lessons.md` and either remap or piggyback.

- [ ] **Step 8.2: Add binding**

Add a handler in `useKeyboardShortcuts` that dispatches a custom event `hacer-open-shortcuts-modal` when `?` is pressed AND `document.activeElement` is not an `INPUT`/`TEXTAREA`. The `HelpBar` (or `KeyboardShortcutsModal` directly) listens for this event and toggles open state.

(Alternative: use a lightweight Zustand store slice for modal open state. Pick the cleaner pattern at impl.)

- [ ] **Step 8.3: Test the binding**

Add a test verifying `?` keydown opens the modal.

---

### Task 9: Mount in App.tsx + verification + commit

```tsx
<div className="flex-1 relative">
  <CanvasArea />
  <RightActionBar />
  <PropertiesPanel />
  <HelpBar />
</div>
```

- [ ] **Step 9.1: All four CI gates**
- [ ] **Step 9.2: Manual QA**: HelpBar transitions correctly between modes; ? opens modal; collapse persists across reload
- [ ] **Step 9.3: Commit**

```bash
git add -A
git commit -m "$(cat <<'EOF'
feat(ui): add HelpBar with contextual shortcuts and keyboard modal

Ports design-system help-bar.tsx and keyboard-shortcuts-modal.tsx into
HACER. Drops the design's mode prop in favor of useContextMode hook
that derives current interaction mode from store state
(placementMode / nodePlacementMode / wiringFrom / selection presence)
with priority: moving > wiring > selecting > default.

SHORTCUT_GROUPS catalog is the single source of truth for the modal
content; entries flagged comingSoon when no live keyboard handler
exists. Collapse state persists to localStorage. ? key opens the
modal, guarded against opening when an input is focused.

CI gates green.

Refs: docs/plans/2026-04-17-design-system-migration/06-phase-c-3d-help-bar.md
EOF
)"
```

Move to chunk 7.

---

## Phase C-3d complete

Move to [`07-phase-c-3e-3f-statusbar-demo-overlay.md`](./07-phase-c-3e-3f-statusbar-demo-overlay.md).
