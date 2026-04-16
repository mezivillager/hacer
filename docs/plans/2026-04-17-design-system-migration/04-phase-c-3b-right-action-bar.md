# Chunk 4: Phase C-3b — RightActionBar (commit 3b)

> Spec ref: [`Commit 3b — RightActionBar`](../../specs/2026-04-17-design-system-migration-design.md#commit-3b--rightactionbar)

**Goal:** Build the absolute-positioned right side icon rail + collapsible 280px drawer with Info / Layers / History tabs. Info wired to real circuit info; Layers and History stubbed with empty-state copy. Undo/Redo, Find, Maximize all "Coming soon".

---

## File inventory

### Add (no new shadcn primitives — `button`, `tooltip`, `separator` already in ui-kit/)

### Create

| Path | Purpose |
|---|---|
| `src/components/ui/RightActionBar.tsx` | Right rail + drawer port |
| `src/components/ui/RightActionBar.test.tsx` | Behavioral tests |

### Modify

| Path | Change |
|---|---|
| `src/App.tsx` | Mount `<RightActionBar />` inside the canvas-relative wrapper |

---

## Tasks

### Task 1: Write RightActionBar test (TDD)

**Files:**
- Create: `src/components/ui/RightActionBar.test.tsx`

- [ ] **Step 1.1: Write the failing test**

```tsx
// src/components/ui/RightActionBar.test.tsx
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TooltipProvider } from '@/components/ui-kit/tooltip';
import { RightActionBar } from './RightActionBar';
import { useCircuitStore, circuitActions } from '@/store/circuitStore';

const wrap = () =>
  render(
    <TooltipProvider>
      <RightActionBar />
    </TooltipProvider>,
  );

describe('RightActionBar', () => {
  beforeEach(() => {
    circuitActions.clearCircuit();
    if (useCircuitStore.getState().simulationRunning) circuitActions.toggleSimulation();
  });

  it('drawer is collapsed by default (info panel not visible)', () => {
    wrap();
    expect(screen.queryByTestId('info-panel')).not.toBeInTheDocument();
  });

  it('clicking Info trigger opens drawer with Info panel', async () => {
    const user = userEvent.setup();
    wrap();
    await user.click(screen.getByTestId('right-bar-info-trigger'));
    expect(await screen.findByTestId('info-panel')).toBeInTheDocument();
  });

  it('Info panel shows correct counts from store', async () => {
    const user = userEvent.setup();
    circuitActions.placeGate('AND', { x: 1, y: 0, z: 1 });
    circuitActions.placeGate('OR', { x: 3, y: 0, z: 1 });
    wrap();
    await user.click(screen.getByTestId('right-bar-info-trigger'));
    expect(screen.getByTestId('info-stat-gates').textContent).toContain('2');
  });

  it('Info status pill reflects simulationRunning', async () => {
    const user = userEvent.setup();
    circuitActions.toggleSimulation();
    wrap();
    await user.click(screen.getByTestId('right-bar-info-trigger'));
    expect(screen.getByTestId('info-status-pill').textContent).toMatch(/running/i);
  });

  it('clicking Layers shows empty state copy', async () => {
    const user = userEvent.setup();
    wrap();
    await user.click(screen.getByTestId('right-bar-layers-trigger'));
    expect(await screen.findByText(/coming soon/i)).toBeInTheDocument();
  });

  it('clicking History shows empty state copy', async () => {
    const user = userEvent.setup();
    wrap();
    await user.click(screen.getByTestId('right-bar-history-trigger'));
    expect(await screen.findByText(/no history yet|coming soon/i)).toBeInTheDocument();
  });

  it('Undo, Redo, Find, Maximize, and quick-action buttons show Coming soon tooltip', async () => {
    const user = userEvent.setup();
    wrap();
    for (const tid of [
      'right-bar-undo',
      'right-bar-redo',
      'right-bar-find',
      'right-bar-maximize',
    ]) {
      await user.hover(screen.getByTestId(tid));
      expect(await screen.findAllByText(/coming soon/i)).not.toHaveLength(0);
    }
  });

  it('clicking the active tab again collapses the drawer', async () => {
    const user = userEvent.setup();
    wrap();
    const trigger = screen.getByTestId('right-bar-info-trigger');
    await user.click(trigger);
    expect(await screen.findByTestId('info-panel')).toBeInTheDocument();
    await user.click(trigger);
    await waitFor(() => expect(screen.queryByTestId('info-panel')).not.toBeInTheDocument());
  });

  it('X button in drawer header closes the drawer', async () => {
    const user = userEvent.setup();
    wrap();
    await user.click(screen.getByTestId('right-bar-info-trigger'));
    await user.click(screen.getByTestId('right-bar-drawer-close'));
    await waitFor(() => expect(screen.queryByTestId('info-panel')).not.toBeInTheDocument());
  });
});
```

- [ ] **Step 1.2: Run, confirm fail**

```bash
pnpm vitest run src/components/ui/RightActionBar.test.tsx
```

Expected: failure (module not found).

---

### Task 2: Implement RightActionBar

**Files:**
- Create: `src/components/ui/RightActionBar.tsx`

- [ ] **Step 2.1: Author the component**

Direct port of `design-system/components/circuit-designer/right-action-bar.tsx` with adaptations per the spec:

- Drop `circuitInfo`, `historyEntries`, `onUndo`, `onRedo`, `canUndo`, `canRedo` props — read circuit state directly via `useCircuitStore` selectors
- `LayersPanel` and `HistoryPanel` render empty-state copy (no mock data)
- Undo / Redo / Find / Maximize / Export / Import / Truth Table all wrapped in `<ComingSoon>`
- Status pill derived from `simulationRunning ? 'Running' : 'Paused'`
- Stat counts from `gates.length`, `wires.length`, `inputNodes.length`, `outputNodes.length`
- Add `data-testid` per the contract in `e2e/selectors/ui.selectors.ts`:
  - Root: `right-action-bar`
  - Triggers: `right-bar-info-trigger`, `right-bar-layers-trigger`, `right-bar-history-trigger`
  - Drawer: `right-bar-drawer`, `right-bar-drawer-close`
  - Stubs: `right-bar-undo`, `right-bar-redo`, `right-bar-find`, `right-bar-maximize`
  - Info panel: `info-panel`, `info-status-pill`, `info-stat-gates`, `info-stat-wires`, `info-stat-inputs`, `info-stat-outputs`

Component skeleton (full structure follows the design-system source verbatim; abbreviated here):

```tsx
// src/components/ui/RightActionBar.tsx
import { useState } from 'react';
import {
  Info, History, Layers, Settings2, Download, Upload, Search,
  Maximize2, X, ChevronRight, Pause, Play, Undo2, Redo2,
} from 'lucide-react';
import { Button } from '@/components/ui-kit/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui-kit/tooltip';
import { Separator } from '@/components/ui-kit/separator';
import { cn } from '@/lib/utils';
import { ComingSoon } from './coming-soon';
import { useCircuitStore } from '@/store/circuitStore';

type ActivePanel = 'info' | 'history' | 'layers' | null;

export function RightActionBar() {
  const [activePanel, setActivePanel] = useState<ActivePanel>(null);
  const togglePanel = (p: ActivePanel) => setActivePanel(activePanel === p ? null : p);

  const gatesCount = useCircuitStore((s) => s.gates.length);
  const wiresCount = useCircuitStore((s) => s.wires.length);
  const inputsCount = useCircuitStore((s) => s.inputNodes.length);
  const outputsCount = useCircuitStore((s) => s.outputNodes.length);
  const simulationRunning = useCircuitStore((s) => s.simulationRunning);

  // ...follow design-system source structure for icon rail + drawer animation...
  // Tab triggers and stub-wrapped buttons get data-testid attributes per the contract above.
  // Info panel: render real-data StatCard components for gates/wires/inputs/outputs.
  // Status pill: simulationRunning ? 'Running' (primary tone) : 'Paused' (muted).
  // Quick Actions buttons (Export Circuit, Import Circuit, Generate Truth Table) all wrapped in <ComingSoon>.
  // Layers panel: empty state with "Coming soon \u2014 visibility controls will appear here".
  // History panel: empty state from design-system source ("No history yet / Actions will appear here").
}
```

(See spec §4b "RightActionBar" for the full adaptation table.)

- [ ] **Step 2.2: Run, confirm pass**

```bash
pnpm vitest run src/components/ui/RightActionBar.test.tsx
```

Expected: 9 tests pass.

---

### Task 3: Mount RightActionBar in App.tsx

- [ ] **Step 3.1: Update App.tsx**

```tsx
<div className="flex h-screen w-screen overflow-hidden bg-background text-foreground">
  <CompactToolbar />
  <div className="flex-1 relative">
    <CanvasArea />
    <RightActionBar />
  </div>
</div>
```

- [ ] **Step 3.2: Verify build**

```bash
pnpm run build
```

Expected: green.

---

### Task 4: Phase C-3b verification gate + commit

- [ ] **Step 4.1: All four gates**

```bash
pnpm run lint && pnpm run test:run && pnpm run test:e2e:store && pnpm run build
```

- [ ] **Step 4.2: Manual side-by-side QA against design-system showcase**

Verify drawer animation, panel content, stub tooltips. Both themes.

- [ ] **Step 4.3: Commit**

```bash
git add -A
git commit -m "$(cat <<'EOF'
feat(ui): add RightActionBar with Info drawer wired to store

Ports design-system right-action-bar.tsx into HACER. Drops the
prop-drilled circuitInfo / historyEntries / onUndo / onRedo / canUndo
/ canRedo props in favor of direct useCircuitStore selectors.

Info drawer panel shows live gate/wire/input/output counts, simulation
status pill, and Quick Actions stubbed with Coming soon tooltips
(Export, Import, Truth Table). Layers and History tabs render empty
state copy. Undo, Redo, Find, Maximize all wrapped in ComingSoon.

CI gates green.

Refs: docs/plans/2026-04-17-design-system-migration/04-phase-c-3b-right-action-bar.md
EOF
)"
```

Move to chunk 5.

---

## Phase C-3b complete

Move to [`05-phase-c-3c-properties-panel.md`](./05-phase-c-3c-properties-panel.md).
