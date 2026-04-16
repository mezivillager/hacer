# Chunk 7: Phase C-3e + 3f — StatusBar restyle + DemoOverlay rebuild (commits 3e + 3f)

> Spec ref: [`Commit 3e — StatusBar restyle`](../../specs/2026-04-17-design-system-migration-design.md#commit-3e--statusbar-restyle) and [`Commit 3f — DemoOverlay rebuild`](../../specs/2026-04-17-design-system-migration-design.md#commit-3f--demooverlay-rebuild)

**Goal:** Two related sub-commits that finish the shell layer. StatusBar swaps from CSS module to Tailwind + design tokens (component logic + store binding + accessibility attributes survive). DemoOverlay rebuilt fresh with `Card` primitive, Lucide `X`, and Tailwind classes; logic from `src/lib/demoTour.ts` ports verbatim.

---

## Sub-commit 3e: StatusBar restyle

### File inventory

- Modify: `src/components/ui/StatusBar.tsx`
- Modify: `src/components/ui/StatusBar.test.tsx`
- Delete: `src/components/ui/StatusBar.module.css`

### Task 1: Restyle StatusBar

- [ ] **Step 1.1: Update test assertions**

Update `StatusBar.test.tsx`:
- Keep `data-testid`, `data-severity`, `role="status"`, `aria-live="polite"` assertions verbatim
- Drop assertions on CSS module class names (`styles.error` etc.)
- Add assertions on the new severity-driven Tailwind classes (e.g. `'bg-destructive'` substring for error)
- Add assertion that StatusBar is null when no messages exist
- Add assertion that StatusBar position is `bottom-9` when HelpBar uncollapsed, `bottom-3` when collapsed (use `useHelpBarCollapsed` mock or direct localStorage manipulation)

- [ ] **Step 1.2: Replace `StatusBar.tsx`**

```tsx
// src/components/ui/StatusBar.tsx
import { circuitActions, useCircuitStore } from '@/store/circuitStore';
import type { CircuitStore, StatusMessage } from '@/store/types';
import { cva } from 'class-variance-authority';
import { cn } from '@/lib/utils';
import { useHelpBarCollapsed } from './HelpBar/useHelpBarCollapsed';

const statusVariants = cva(
  'pointer-events-auto inline-flex items-center gap-3 px-4 py-1.5 rounded-full text-xs font-medium border transition-all animate-in slide-in-from-bottom-2 duration-200',
  {
    variants: {
      severity: {
        info: 'bg-secondary text-secondary-foreground border-border',
        success: 'bg-primary/15 text-primary border-primary/30',
        warning: 'bg-[--warning]/15 text-[--warning] border-[--warning]/30',
        error: 'bg-destructive/15 text-destructive border-destructive/30',
      },
    },
    defaultVariants: { severity: 'info' },
  },
);

export function StatusBar() {
  const messages = useCircuitStore((s: CircuitStore): StatusMessage[] => s.statusMessages);
  const [collapsed] = useHelpBarCollapsed();
  const latest = messages[messages.length - 1];

  if (!latest) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        'absolute left-0 right-0 flex justify-center px-3 z-10',
        collapsed ? 'bottom-3' : 'bottom-9',
      )}
    >
      <button
        type="button"
        data-testid="status-bar"
        data-severity={latest.severity}
        onClick={(): void => { circuitActions.clearStatus(latest.id); }}
        className={statusVariants({ severity: latest.severity })}
      >
        <span data-testid="status-text">{latest.text}</span>
        <span aria-hidden className="text-[10px] opacity-60">click to dismiss</span>
      </button>
    </div>
  );
}
```

- [ ] **Step 1.3: Delete CSS module**

```bash
rm src/components/ui/StatusBar.module.css
```

- [ ] **Step 1.4: StatusBar moves into the canvas-relative wrapper**

Update `App.tsx` so StatusBar lives inside `<div className="flex-1 relative">` rather than as a sibling of the toolbar/canvas-flex root. (Otherwise its absolute positioning with `bottom-9` is relative to viewport; we want it relative to the canvas area.)

```tsx
<div className="flex h-screen w-screen overflow-hidden bg-background text-foreground">
  <CompactToolbar />
  <div className="flex-1 relative">
    <CanvasArea />
    <RightActionBar />
    <PropertiesPanel />
    <HelpBar />
    <StatusBar />
  </div>
</div>
<Toaster ... />
```

- [ ] **Step 1.5: Run tests, verify pass**

```bash
pnpm vitest run src/components/ui/StatusBar.test.tsx
pnpm run test:e2e:store -- --grep "status"
```

Both green. Existing P05-09 store E2E specs continue to pass (data-testid + data-severity attributes preserved).

---

### Task 2: Sub-commit 3e

- [ ] **Step 2.1: All four CI gates**
- [ ] **Step 2.2: Manual QA** — trigger info/success/warning/error status messages from console; verify each renders in correct severity color in both themes; verify HelpBar collapse drops StatusBar offset.
- [ ] **Step 2.3: Commit**

```bash
git add -A
git commit -m "$(cat <<'EOF'
feat(ui): restyle StatusBar with design tokens and CVA variants

Removes StatusBar.module.css; replaces with Tailwind classes driven by
class-variance-authority severity variants (info/success/warning/error)
backed by design-system OKLch tokens. Adds new --warning OKLch token in
globals.css.

Component logic, store binding (statusMessages, clearStatus), data-testid
'status-bar', data-severity, role='status', aria-live='polite' all
preserved verbatim. P05-09 store E2E coverage unaffected.

StatusBar now lives inside the canvas-relative wrapper. Vertical offset
adapts to HelpBar collapse state via useHelpBarCollapsed hook
(bottom-9 expanded; bottom-3 collapsed).

CI gates green.

Refs: docs/plans/2026-04-17-design-system-migration/07-phase-c-3e-3f-statusbar-demo-overlay.md
EOF
)"
```

---

## Sub-commit 3f: DemoOverlay rebuild

### File inventory

- Add primitive: `npx shadcn@latest add card`
- Create: `src/components/ui/DemoOverlay.tsx`
- Create: `src/components/ui/DemoOverlay.test.tsx`
- Modify: `src/App.tsx` — mount `<DemoOverlay />`

### Task 3: Add Card primitive

```bash
npx shadcn@latest add card
```

### Task 4: Build DemoOverlay (TDD)

- [ ] **Step 4.1: Tests cover**

- Renders nothing when `?notour=1` in URL (mock window.location.search)
- Renders nothing for first 600ms after mount, then renders
- Clicking the close button hides it
- Dispatching `DISMISS_DEMO_TOUR_EVENT` hides it
- Renders demo image at correct base URL
- `role="region"` and `aria-label="App tour"` present

- [ ] **Step 4.2: Implement**

Per spec §4e DemoOverlay component skeleton (already in spec, ports `src/lib/demoTour.ts` logic verbatim — use Lucide `X` icon, Card primitive, Tailwind classes, `bottom-20 right-4` positioning, `z-10` to overlay canvas, `animate-in slide-in-from-bottom-4 duration-300`).

- [ ] **Step 4.3: Pass**

### Task 5: Mount + sub-commit 3f

```tsx
<div className="flex-1 relative">
  <CanvasArea />
  <RightActionBar />
  <PropertiesPanel />
  <HelpBar />
  <StatusBar />
  <DemoOverlay />
</div>
```

- [ ] **Step 5.1: All four CI gates**
- [ ] **Step 5.2: Manual QA** — DemoOverlay appears bottom-right after 600ms; close button + `DISMISS_DEMO_TOUR_EVENT` both hide it; `?notour=1` query param suppresses entirely; verify no overlap with RightActionBar drawer (move to `bottom-20 left-16` if conflict).
- [ ] **Step 5.3: Commit**

```bash
git add -A
git commit -m "$(cat <<'EOF'
feat(ui): rebuild DemoOverlay with Card primitive and design tokens

Re-implements the deleted DemoOverlay (Phase A) using the shadcn Card
primitive, Lucide X icon, Tailwind classes, and animate-in slide-in
animation from tw-animate-css. All behavior preserved: 600ms auto-show
on mount, ?notour=1 suppression, DISMISS_DEMO_TOUR_EVENT programmatic
dismiss. Demo image continues to load from import.meta.env.BASE_URL.

Adds DemoOverlay.test.tsx with coverage that did not exist before.

Phase C complete. Full pixel-aligned shell now in place. Only
remaining UI gap before merge: 3D scene colors are still pre-Phase-D
(theme toggle does not affect canvas). Phase D retokens R3F materials.

CI gates green.

Refs: docs/plans/2026-04-17-design-system-migration/07-phase-c-3e-3f-statusbar-demo-overlay.md
EOF
)"
```

Move to chunk 8.

---

## Phase C-3e + 3f complete

Move to [`08-phase-d-r3f-retoken.md`](./08-phase-d-r3f-retoken.md).
