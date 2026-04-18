# Chunk 3: Phase C-3a — CompactToolbar (commit 3a)

> Spec ref: [`Commit 3a — CompactToolbar`](../../specs/2026-04-17-design-system-migration-design.md#commit-3a--compacttoolbar)

**Goal:** Build the 12px-wide left rail. After this commit the app is interactively usable for the first time since chunk 1: gate / I/O placement, sim run/pause, axes toggle, delete selected, clear all, theme picker, GitHub link, version, settings stub.

**Branch state going in:** Phase B foundation in place; themed bare canvas; no interactive shell.

---

## File inventory

### Add (shadcn primitives via CLI)

```bash
npx shadcn@latest add button tooltip popover separator switch
```

Drops 5 files into `src/components/ui-kit/`:
- `button.tsx`
- `tooltip.tsx`
- `popover.tsx`
- `separator.tsx`
- `switch.tsx`

### Create (HACER shell)

| Path | Purpose |
|---|---|
| `src/components/ui/CompactToolbar.tsx` | Left rail port |
| `src/components/ui/CompactToolbar.test.tsx` | Behavioral tests |
| `src/components/ui/coming-soon.tsx` | `<ComingSoon>` wrapper helper used here and across all subsequent shells |
| `src/components/ui/coming-soon.test.tsx` | Helper test |
| `src/components/ui/icons/GateGlyphs.tsx` | 7 inline SVG gate-icon React components (NAND, AND, OR, NOT, NOR, XOR, XNOR). Kept inline per design-system convention. |

### Modify

| Path | Change |
|---|---|
| `src/App.tsx` | Add `<TooltipProvider>` wrap; render `<CompactToolbar />` left of canvas |

### Verify (no-op if already correct)

| Path | Expected state |
|---|---|
| `src/hooks/useAppReleaseVersion.ts` | Must be Ant-free (per spec Known Unknown #1). Read the file before using; if it imports antd, rewrite to drop the import (likely a 1-line fix — it probably reads from a build-injected constant). |

---

## Tasks

### Task 1: Verify `useAppReleaseVersion` is Ant-free

- [ ] **Step 1.1: Read the hook**

```bash
cat src/hooks/useAppReleaseVersion.ts
```

- [ ] **Step 1.2: Grep for antd imports**

```bash
rg "from ['\"]antd|from ['\"]@ant-design" src/hooks/
```

Expected: zero matches. If non-zero, rewrite the affected line to drop the antd import (likely just a `Typography.Text` swap to a plain string export). Document any deviation in `tasks/lessons.md`.

---

### Task 2: Add shadcn primitives via CLI

- [ ] **Step 2.1: Run `npx shadcn add`**

```bash
npx shadcn@latest add button tooltip popover separator switch
```

When prompted about overwriting `src/lib/utils.ts`, choose **No** — we already authored it in chunk 2.

- [ ] **Step 2.2: Verify files dropped into `src/components/ui-kit/`**

```bash
ls src/components/ui-kit/
```

Expected: `button.tsx`, `popover.tsx`, `separator.tsx`, `switch.tsx`, `theme-provider.tsx`, `tooltip.tsx`.

- [ ] **Step 2.3: Verify typecheck and build**

```bash
pnpm run typecheck && pnpm run build
```

Expected: green. (Primitives have no consumers yet; tree-shaken from runtime.)

- [ ] **Step 2.4: Sanity check primitives match design-system byte-for-byte (smoke)**

```bash
diff -u design-system/components/ui/button.tsx src/components/ui-kit/button.tsx | head -50
```

Expected: minimal diff (CLI version may differ slightly in copyright header or import style; semantic content identical). If a diff is non-trivial, document it in `tasks/lessons.md` and either accept or hand-port from `design-system/`.

---

### Task 3: Create `<ComingSoon>` helper (TDD)

**Files:**
- Create: `src/components/ui/coming-soon.tsx`
- Create: `src/components/ui/coming-soon.test.tsx`

- [ ] **Step 3.1: Write the failing test**

```tsx
// src/components/ui/coming-soon.test.tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TooltipProvider } from '@/components/ui-kit/tooltip';
import { ComingSoon } from './coming-soon';

const wrap = (ui: React.ReactNode) => render(<TooltipProvider>{ui}</TooltipProvider>);

describe('ComingSoon', () => {
  it('renders children', () => {
    wrap(<ComingSoon><button>foo</button></ComingSoon>);
    expect(screen.getByRole('button', { name: /foo/i })).toBeInTheDocument();
  });

  it('shows "Coming soon" tooltip on hover by default', async () => {
    const user = userEvent.setup();
    wrap(<ComingSoon><button>foo</button></ComingSoon>);
    await user.hover(screen.getByRole('button', { name: /foo/i }));
    expect(await screen.findByText(/coming soon/i)).toBeInTheDocument();
  });

  it('honors a custom label', async () => {
    const user = userEvent.setup();
    wrap(<ComingSoon label="Not yet"><button>foo</button></ComingSoon>);
    await user.hover(screen.getByRole('button', { name: /foo/i }));
    expect(await screen.findByText(/not yet/i)).toBeInTheDocument();
  });
});
```

- [ ] **Step 3.2: Run, confirm fail**

```bash
pnpm vitest run src/components/ui/coming-soon.test.tsx
```

Expected: failure (module not found).

- [ ] **Step 3.3: Implement**

```tsx
// src/components/ui/coming-soon.tsx
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui-kit/tooltip';
import type { ReactNode } from 'react';

export function ComingSoon({ children, label = 'Coming soon' }: { children: ReactNode; label?: string }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>{children}</TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
}
```

- [ ] **Step 3.4: Run, confirm pass**

```bash
pnpm vitest run src/components/ui/coming-soon.test.tsx
```

Expected: 3 tests pass.

---

### Task 4: Create the gate glyph SVG components

**Files:**
- Create: `src/components/ui/icons/GateGlyphs.tsx`

- [ ] **Step 4.1: Author the file**

Port the 5 SVG components from `design-system/components/circuit-designer/compact-toolbar.tsx` (`NandGateIcon`, `AndGateIcon`, `OrGateIcon`, `NotGateIcon`, `XorGateIcon`) and add 2 new ones (`NorGateIcon`, `XnorGateIcon`) following the same pattern (OR/XOR shapes + bubble for inversion).

```tsx
// src/components/ui/icons/GateGlyphs.tsx
import { cn } from '@/lib/utils';

type IconProps = { className?: string };

export const NandGateIcon = ({ className }: IconProps) => (
  <svg viewBox="0 0 24 24" className={cn('w-4 h-4', className)} fill="none" stroke="currentColor" strokeWidth="1.5">
    <path d="M3 6h6c5 0 9 3 9 6s-4 6-9 6H3V6z" />
    <circle cx="19" cy="12" r="2" />
  </svg>
);

export const AndGateIcon = ({ className }: IconProps) => (
  <svg viewBox="0 0 24 24" className={cn('w-4 h-4', className)} fill="none" stroke="currentColor" strokeWidth="1.5">
    <path d="M3 6h6c5 0 9 3 9 6s-4 6-9 6H3V6z" />
  </svg>
);

export const OrGateIcon = ({ className }: IconProps) => (
  <svg viewBox="0 0 24 24" className={cn('w-4 h-4', className)} fill="none" stroke="currentColor" strokeWidth="1.5">
    <path d="M3 6c2 2 2 6 0 12h4c6 0 12-3 14-6-2-3-8-6-14-6H3z" />
  </svg>
);

export const NotGateIcon = ({ className }: IconProps) => (
  <svg viewBox="0 0 24 24" className={cn('w-4 h-4', className)} fill="none" stroke="currentColor" strokeWidth="1.5">
    <path d="M3 6l12 6-12 6V6z" />
    <circle cx="17" cy="12" r="2" />
  </svg>
);

export const NorGateIcon = ({ className }: IconProps) => (
  <svg viewBox="0 0 24 24" className={cn('w-4 h-4', className)} fill="none" stroke="currentColor" strokeWidth="1.5">
    <path d="M3 6c2 2 2 6 0 12h4c5 0 11-3 13-6-2-3-8-6-13-6H3z" />
    <circle cx="19" cy="12" r="2" />
  </svg>
);

export const XorGateIcon = ({ className }: IconProps) => (
  <svg viewBox="0 0 24 24" className={cn('w-4 h-4', className)} fill="none" stroke="currentColor" strokeWidth="1.5">
    <path d="M5 6c2 2 2 6 0 12h4c6 0 12-3 14-6-2-3-8-6-14-6H5z" />
    <path d="M3 6c2 3 2 9 0 12" />
  </svg>
);

export const XnorGateIcon = ({ className }: IconProps) => (
  <svg viewBox="0 0 24 24" className={cn('w-4 h-4', className)} fill="none" stroke="currentColor" strokeWidth="1.5">
    <path d="M5 6c2 2 2 6 0 12h4c5 0 11-3 13-6-2-3-8-6-13-6H5z" />
    <path d="M3 6c2 3 2 9 0 12" />
    <circle cx="19" cy="12" r="2" />
  </svg>
);
```

(NOR / XNOR paths derived from OR / XOR with the inversion bubble. Final geometry tuned during impl — match the visual weight of the originals; small adjustments acceptable.)

- [ ] **Step 4.2: Verify typecheck**

```bash
pnpm run typecheck
```

Expected: green.

---

### Task 5: Verify `circuitActions.deselectAll` exists (or add it)

Per spec Known Unknown #2 — needed by both PropertiesPanel close button and CompactToolbar's flow.

- [ ] **Step 5.1: Grep for the action**

```bash
rg "deselectAll" src/store/
```

If it exists in `circuitActions`, no work needed — proceed. If not:

- [ ] **Step 5.2 (conditional): Add `deselectAll` to the store**

In the appropriate slice (likely `src/store/actions/gateActions/gateActions.ts` or a new shared `selectionActions/`), add:

```ts
export function deselectAll(): void {
  useCircuitStore.setState((s) => {
    s.selectedGateId = null;
    s.selectedWireId = null;
    s.selectedNodeId = null;
    s.selectedNodeType = null;
  });
}
```

Export from `circuitActions`. Add a co-located test asserting all four slots clear.

---

### Task 6: Write CompactToolbar test (TDD)

**Files:**
- Create: `src/components/ui/CompactToolbar.test.tsx`

- [ ] **Step 6.1: Write the failing test**

```tsx
// src/components/ui/CompactToolbar.test.tsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TooltipProvider } from '@/components/ui-kit/tooltip';
import { CompactToolbar } from './CompactToolbar';
import { useCircuitStore, circuitActions } from '@/store/circuitStore';

vi.mock('next-themes', () => ({
  useTheme: () => ({ theme: 'dark', setTheme: vi.fn(), resolvedTheme: 'dark' }),
}));

const wrap = () =>
  render(
    <TooltipProvider>
      <CompactToolbar />
    </TooltipProvider>,
  );

describe('CompactToolbar', () => {
  beforeEach(() => {
    circuitActions.clearCircuit();
    circuitActions.deselectAll();
    if (useCircuitStore.getState().simulationRunning) circuitActions.toggleSimulation();
  });

  describe('Gates popover', () => {
    it('renders all 7 HACER gate types when popover opens', async () => {
      const user = userEvent.setup();
      wrap();
      await user.click(screen.getByTestId('toolbar-gates-trigger'));
      for (const type of ['NAND', 'AND', 'OR', 'NOT', 'NOR', 'XOR', 'XNOR']) {
        expect(screen.getByTestId(`gate-button-${type}`)).toBeInTheDocument();
      }
    });

    it('clicking a gate sets placementMode and closes popover', async () => {
      const user = userEvent.setup();
      wrap();
      await user.click(screen.getByTestId('toolbar-gates-trigger'));
      await user.click(screen.getByTestId('gate-button-AND'));
      expect(useCircuitStore.getState().placementMode).toBe('AND');
    });

    it('clicking the same gate again clears placementMode (toggle)', async () => {
      const user = userEvent.setup();
      wrap();
      await user.click(screen.getByTestId('toolbar-gates-trigger'));
      await user.click(screen.getByTestId('gate-button-AND'));
      await user.click(screen.getByTestId('toolbar-gates-trigger'));
      await user.click(screen.getByTestId('gate-button-AND'));
      expect(useCircuitStore.getState().placementMode).toBeNull();
    });
  });

  describe('I/O popover', () => {
    it('renders Input, Output, Junction', async () => {
      const user = userEvent.setup();
      wrap();
      await user.click(screen.getByTestId('toolbar-io-trigger'));
      expect(screen.getByTestId('io-button-input')).toBeInTheDocument();
      expect(screen.getByTestId('io-button-output')).toBeInTheDocument();
      expect(screen.getByTestId('io-button-junction')).toBeInTheDocument();
    });

    it('clicking an I/O sets nodePlacementMode', async () => {
      const user = userEvent.setup();
      wrap();
      await user.click(screen.getByTestId('toolbar-io-trigger'));
      await user.click(screen.getByTestId('io-button-input'));
      expect(useCircuitStore.getState().nodePlacementMode).toBe('input');
    });
  });

  describe('Simulation toggle', () => {
    it('reflects simulationRunning state in icon and dispatches toggleSimulation on click', async () => {
      const user = userEvent.setup();
      wrap();
      const btn = screen.getByTestId('toolbar-sim-toggle');
      expect(btn.getAttribute('aria-pressed')).toBe('false');
      await user.click(btn);
      expect(useCircuitStore.getState().simulationRunning).toBe(true);
    });
  });

  describe('Show Axes toggle', () => {
    it('dispatches toggleAxes', async () => {
      const user = userEvent.setup();
      wrap();
      const before = useCircuitStore.getState().showAxes;
      await user.click(screen.getByTestId('toolbar-axes-toggle'));
      expect(useCircuitStore.getState().showAxes).toBe(!before);
    });
  });

  describe('Delete Selected', () => {
    it('is disabled when no selection', () => {
      wrap();
      expect(screen.getByTestId('toolbar-delete-selected')).toBeDisabled();
    });

    it('removes the selected gate', async () => {
      const user = userEvent.setup();
      circuitActions.placeGate('AND', { x: 1, y: 0, z: 1 });
      const id = useCircuitStore.getState().gates[0].id;
      circuitActions.selectGate(id);
      wrap();
      await user.click(screen.getByTestId('toolbar-delete-selected'));
      expect(useCircuitStore.getState().gates).toHaveLength(0);
    });
  });

  describe('Clear All', () => {
    it('is disabled when no gates', () => {
      wrap();
      expect(screen.getByTestId('toolbar-clear-all')).toBeDisabled();
    });

    it('clears the circuit when gates exist', async () => {
      const user = userEvent.setup();
      circuitActions.placeGate('AND', { x: 1, y: 0, z: 1 });
      wrap();
      await user.click(screen.getByTestId('toolbar-clear-all'));
      expect(useCircuitStore.getState().gates).toHaveLength(0);
    });
  });

  describe('GitHub link and version', () => {
    it('renders the HACER GitHub URL', () => {
      wrap();
      const link = screen.getByTestId('toolbar-github-link') as HTMLAnchorElement;
      expect(link.href).toContain('github.com/mezivillager/hacer');
    });

    it('renders a version string', () => {
      wrap();
      expect(screen.getByTestId('toolbar-version').textContent).toMatch(/^v?\d/);
    });
  });

  describe('Settings (stub)', () => {
    it('renders with Coming soon tooltip', async () => {
      const user = userEvent.setup();
      wrap();
      await user.hover(screen.getByTestId('toolbar-settings'));
      expect(await screen.findByText(/coming soon/i)).toBeInTheDocument();
    });
  });
});
```

- [ ] **Step 6.2: Run, confirm fail**

```bash
pnpm vitest run src/components/ui/CompactToolbar.test.tsx
```

Expected: failure — module not found.

---

### Task 7: Implement CompactToolbar

**Files:**
- Create: `src/components/ui/CompactToolbar.tsx`

- [ ] **Step 7.1: Author the implementation**

Direct port of `design-system/components/circuit-designer/compact-toolbar.tsx` with HACER adaptations per the spec. Key differences from the design source:

1. State reads from `useCircuitStore` selectors instead of local `useState`
2. All 7 HACER gate types (add NOR + XNOR) — popover grid stays 2-col, becomes 4 rows with one empty cell
3. GitHub URL → `https://github.com/mezivillager/hacer`
4. Version → `useAppReleaseVersion()`
5. Delete inlines the deleted `handleDeleteSelected` logic (branches on selection slot)
6. Clear All wires to `circuitActions.clearCircuit()`, disabled when `gates.length === 0` (no confirm prompt — matches old Sidebar)
7. Settings is wrapped in `<ComingSoon>`
8. Every interactive element gets a `data-testid` per the contract in `e2e/selectors/ui.selectors.ts` (chunk 9)

Pattern (abbreviated; full file follows the design-system source structure):

```tsx
// src/components/ui/CompactToolbar.tsx
import { useState, useEffect } from 'react';
import { useTheme } from 'next-themes';
import {
  Cpu, Play, Pause, Trash2, RotateCcw, Settings, Github, Grid3X3,
  CircleDot, ArrowRightFromLine, GitBranch, ChevronDown, Sun, Moon, Monitor,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui-kit/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui-kit/tooltip';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui-kit/popover';
import { Separator } from '@/components/ui-kit/separator';
import { Switch } from '@/components/ui-kit/switch';
import { ComingSoon } from './coming-soon';
import {
  NandGateIcon, AndGateIcon, OrGateIcon, NotGateIcon,
  NorGateIcon, XorGateIcon, XnorGateIcon,
} from './icons/GateGlyphs';
import { useCircuitStore, circuitActions } from '@/store/circuitStore';
import { useAppReleaseVersion } from '@/hooks/useAppReleaseVersion';
import type { GateType } from '@/gates/types';

const gates: Array<{ type: GateType; Icon: React.ComponentType<{ className?: string }> }> = [
  { type: 'NAND', Icon: NandGateIcon },
  { type: 'AND',  Icon: AndGateIcon },
  { type: 'OR',   Icon: OrGateIcon },
  { type: 'NOT',  Icon: NotGateIcon },
  { type: 'NOR',  Icon: NorGateIcon },
  { type: 'XOR',  Icon: XorGateIcon },
  { type: 'XNOR', Icon: XnorGateIcon },
];

const ioElements = [
  { id: 'input',    label: 'Input',    Icon: ArrowRightFromLine },
  { id: 'output',   label: 'Output',   Icon: CircleDot },
  { id: 'junction', label: 'Junction', Icon: GitBranch },
] as const;

export function CompactToolbar() {
  const placementMode = useCircuitStore((s) => s.placementMode);
  const nodePlacementMode = useCircuitStore((s) => s.nodePlacementMode);
  const simulationRunning = useCircuitStore((s) => s.simulationRunning);
  const showAxes = useCircuitStore((s) => s.showAxes);
  const gatesCount = useCircuitStore((s) => s.gates.length);
  const selectedGateId = useCircuitStore((s) => s.selectedGateId);
  const selectedWireId = useCircuitStore((s) => s.selectedWireId);
  const selectedNodeId = useCircuitStore((s) => s.selectedNodeId);
  const selectedNodeType = useCircuitStore((s) => s.selectedNodeType);

  const hasSelection = selectedGateId !== null || selectedWireId !== null || selectedNodeId !== null;

  const [gatesOpen, setGatesOpen] = useState(false);
  const [ioOpen, setIoOpen] = useState(false);
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const handleGateSelect = (type: GateType) => {
    circuitActions.setPlacementMode(placementMode === type ? null : type);
    setGatesOpen(false);
  };

  const handleIoSelect = (id: 'input' | 'output' | 'junction') => {
    circuitActions.setNodePlacementMode(nodePlacementMode === id ? null : id);
    setIoOpen(false);
  };

  const handleDelete = () => {
    if (selectedGateId) circuitActions.removeGate(selectedGateId);
    else if (selectedWireId) circuitActions.removeWire(selectedWireId);
    else if (selectedNodeId && selectedNodeType === 'input') circuitActions.removeInputNode(selectedNodeId);
    else if (selectedNodeId && selectedNodeType === 'output') circuitActions.removeOutputNode(selectedNodeId);
  };

  const version = useAppReleaseVersion();

  return (
    <div data-testid="compact-toolbar" className="flex flex-col h-full w-12 bg-sidebar border-r border-sidebar-border">
      {/* Logo */}
      <div className="flex items-center justify-center h-12 border-b border-sidebar-border">
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="flex items-center justify-center w-8 h-8 rounded-md bg-primary/10 text-primary">
              <Cpu className="w-4 h-4" />
            </div>
          </TooltipTrigger>
          <TooltipContent side="right">
            <p className="font-semibold">HACER</p>
            <p className="text-xs text-muted-foreground">Hardware Architecture & Constraints Explorer</p>
          </TooltipContent>
        </Tooltip>
      </div>

      {/* Main tools */}
      <div className="flex-1 flex flex-col items-center py-2 gap-1">
        {/* Gates popover */}
        <Popover open={gatesOpen} onOpenChange={setGatesOpen}>
          <Tooltip>
            <TooltipTrigger asChild>
              <PopoverTrigger asChild>
                <Button
                  data-testid="toolbar-gates-trigger"
                  variant="ghost"
                  size="icon"
                  className={cn('w-9 h-9 relative', gatesOpen && 'bg-sidebar-accent')}
                >
                  <NandGateIcon className="w-5 h-5" />
                  <ChevronDown className="w-2 h-2 absolute bottom-1 right-1 opacity-60" />
                </Button>
              </PopoverTrigger>
            </TooltipTrigger>
            <TooltipContent side="right">Gates</TooltipContent>
          </Tooltip>
          <PopoverContent data-testid="gates-popover" side="right" align="start" className="w-48 p-2">
            <div className="text-xs font-medium text-muted-foreground mb-2 px-2">Elementary Gates</div>
            <div className="grid grid-cols-2 gap-1">
              {gates.map(({ type, Icon }) => (
                <Button
                  key={type}
                  data-testid={`gate-button-${type}`}
                  variant={placementMode === type ? 'secondary' : 'ghost'}
                  size="sm"
                  className="justify-start gap-2 h-8"
                  onClick={() => handleGateSelect(type)}
                >
                  <Icon className="w-4 h-4" />
                  <span className="text-xs">{type}</span>
                </Button>
              ))}
            </div>
          </PopoverContent>
        </Popover>

        {/* I/O popover */}
        <Popover open={ioOpen} onOpenChange={setIoOpen}>
          <Tooltip>
            <TooltipTrigger asChild>
              <PopoverTrigger asChild>
                <Button
                  data-testid="toolbar-io-trigger"
                  variant="ghost"
                  size="icon"
                  className={cn('w-9 h-9 relative', ioOpen && 'bg-sidebar-accent')}
                >
                  <CircleDot className="w-4 h-4" />
                  <ChevronDown className="w-2 h-2 absolute bottom-1 right-1 opacity-60" />
                </Button>
              </PopoverTrigger>
            </TooltipTrigger>
            <TooltipContent side="right">Circuit I/O</TooltipContent>
          </Tooltip>
          <PopoverContent data-testid="io-popover" side="right" align="start" className="w-40 p-2">
            <div className="text-xs font-medium text-muted-foreground mb-2 px-2">Circuit I/O</div>
            <div className="flex flex-col gap-1">
              {ioElements.map(({ id, label, Icon }) => (
                <Button
                  key={id}
                  data-testid={`io-button-${id}`}
                  variant={nodePlacementMode === id ? 'secondary' : 'ghost'}
                  size="sm"
                  className="justify-start gap-2 h-8"
                  onClick={() => handleIoSelect(id)}
                >
                  <Icon className="w-4 h-4" />
                  <span className="text-xs">{label}</span>
                </Button>
              ))}
            </div>
          </PopoverContent>
        </Popover>

        <Separator className="my-1 w-6" />

        {/* Sim toggle */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              data-testid="toolbar-sim-toggle"
              variant={simulationRunning ? 'default' : 'ghost'}
              size="icon"
              className="w-9 h-9"
              aria-pressed={simulationRunning}
              onClick={() => circuitActions.toggleSimulation()}
            >
              {simulationRunning ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
            </Button>
          </TooltipTrigger>
          <TooltipContent side="right">{simulationRunning ? 'Pause Simulation' : 'Run Simulation'}</TooltipContent>
        </Tooltip>

        <Separator className="my-1 w-6" />

        {/* Axes toggle */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              data-testid="toolbar-axes-toggle"
              variant={showAxes ? 'secondary' : 'ghost'}
              size="icon"
              className="w-9 h-9"
              onClick={() => circuitActions.toggleAxes()}
            >
              <Grid3X3 className="w-4 h-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="right">
            <div className="flex items-center gap-2">
              <span>Show Axes</span>
              <Switch checked={showAxes} className="scale-75" />
            </div>
          </TooltipContent>
        </Tooltip>

        {/* Delete */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              data-testid="toolbar-delete-selected"
              variant="ghost"
              size="icon"
              className="w-9 h-9 text-muted-foreground hover:text-destructive"
              disabled={!hasSelection}
              onClick={handleDelete}
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="right">Delete Selected</TooltipContent>
        </Tooltip>

        {/* Clear */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              data-testid="toolbar-clear-all"
              variant="ghost"
              size="icon"
              className="w-9 h-9 text-muted-foreground hover:text-destructive"
              disabled={gatesCount === 0}
              onClick={() => circuitActions.clearCircuit()}
            >
              <RotateCcw className="w-4 h-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="right">Clear All</TooltipContent>
        </Tooltip>
      </div>

      {/* Bottom: theme picker, GitHub, settings, version */}
      <div className="flex flex-col items-center py-2 gap-1 border-t border-sidebar-border">
        <Popover>
          <Tooltip>
            <TooltipTrigger asChild>
              <PopoverTrigger asChild>
                <Button
                  data-testid="toolbar-theme-trigger"
                  variant="ghost"
                  size="icon"
                  className="w-9 h-9"
                >
                  {!mounted ? <Monitor className="w-4 h-4" /> :
                    theme === 'dark' ? <Moon className="w-4 h-4" /> :
                    theme === 'light' ? <Sun className="w-4 h-4" /> :
                    <Monitor className="w-4 h-4" />}
                </Button>
              </PopoverTrigger>
            </TooltipTrigger>
            <TooltipContent side="right">Theme</TooltipContent>
          </Tooltip>
          <PopoverContent side="right" align="end" className="w-36 p-1">
            <div className="flex flex-col gap-0.5">
              {[
                { id: 'light',  label: 'Light',  Icon: Sun },
                { id: 'dark',   label: 'Dark',   Icon: Moon },
                { id: 'system', label: 'System', Icon: Monitor },
              ].map(({ id, label, Icon }) => (
                <Button
                  key={id}
                  data-testid={`toolbar-theme-${id}`}
                  variant={theme === id ? 'secondary' : 'ghost'}
                  size="sm"
                  className="justify-start gap-2 h-8"
                  onClick={() => setTheme(id)}
                >
                  <Icon className="w-4 h-4" />
                  <span className="text-xs">{label}</span>
                </Button>
              ))}
            </div>
          </PopoverContent>
        </Popover>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button data-testid="toolbar-github-link" variant="ghost" size="icon" className="w-9 h-9" asChild>
              <a href="https://github.com/mezivillager/hacer" target="_blank" rel="noopener noreferrer">
                <Github className="w-4 h-4" />
              </a>
            </Button>
          </TooltipTrigger>
          <TooltipContent side="right">GitHub</TooltipContent>
        </Tooltip>

        <ComingSoon>
          <Button data-testid="toolbar-settings" variant="ghost" size="icon" className="w-9 h-9">
            <Settings className="w-4 h-4" />
          </Button>
        </ComingSoon>

        <div data-testid="toolbar-version" className="text-[10px] text-muted-foreground mt-1">{version}</div>
      </div>
    </div>
  );
}
```

- [ ] **Step 7.2: Run the test, confirm pass**

```bash
pnpm vitest run src/components/ui/CompactToolbar.test.tsx
```

Expected: all CompactToolbar tests pass.

---

### Task 8: Wire CompactToolbar into App.tsx

**Files:**
- Modify: `src/App.tsx`

- [ ] **Step 8.1: Update App.tsx**

```tsx
// src/App.tsx
import { ThemeProvider } from '@/components/ui-kit/theme-provider';
import { TooltipProvider } from '@/components/ui-kit/tooltip';
import { Toaster } from 'sonner';
import { CanvasArea } from '@/components/canvas/CanvasArea';
import { StatusBar } from '@/components/ui/StatusBar';
import { CompactToolbar } from '@/components/ui/CompactToolbar';

function App() {
  return (
    <ThemeProvider>
      <TooltipProvider>
        <div className="flex h-screen w-screen overflow-hidden bg-background text-foreground">
          <CompactToolbar />
          <div className="flex-1 relative">
            <CanvasArea />
          </div>
        </div>
        <StatusBar />
        <Toaster position="top-right" richColors closeButton />
      </TooltipProvider>
    </ThemeProvider>
  );
}

export default App;
```

(`<TooltipProvider>` wraps the whole interactive tree — it's a no-op for elements that don't render tooltips.)

- [ ] **Step 8.2: Verify typecheck and build**

```bash
pnpm run typecheck && pnpm run build
```

Expected: green.

---

### Task 9: Phase C-3a verification gate

- [ ] **Step 9.1: All four mandatory gates**

```bash
pnpm run lint && pnpm run test:run && pnpm run test:e2e:store && pnpm run build
```

Expected: all green.

- [ ] **Step 9.2: Manual eyeball QA against design-system showcase**

In one terminal:
```bash
cd design-system && pnpm install && pnpm dev
```

In another:
```bash
pnpm run dev
```

Open both side-by-side. Verify:
- 12px rail width visually identical
- Logo block top: 48px tall, Cpu icon centered in `bg-primary/10` rounded square
- Gates popover opens to the right with `align="start"`, ~192px wide, 2-col grid
- I/O popover ~160px wide
- Theme picker bottom-right with three rows; active theme highlighted with `secondary` variant
- Light + dark themes both render correctly
- Place a gate → click in canvas → 3D gate appears (existing R3F handlers untouched)
- Toggle sim → button icon swaps Play↔Pause; state persists in store
- Toggle axes → grid visibility flips
- Select a gate via canvas click → Delete button enables; click → gate removed

Pixel diff target: ≤2% per region in both themes (eyeball QA acceptable).

---

### Task 10: Commit Phase C-3a

```bash
git add -A
git commit -m "$(cat <<'EOF'
feat(ui): add CompactToolbar shell

Ports design-system/components/circuit-designer/compact-toolbar.tsx as
the new HACER left rail. Adds 5 shadcn primitives (button, tooltip,
popover, separator, switch) into src/components/ui-kit/, plus the
ComingSoon helper and 7 inline gate-glyph SVG components (NAND, AND,
OR, NOT, NOR, XOR, XNOR \u2014 design-system has 5; HACER ships all 7).

Wires every existing capability through the new toolbar: gate placement,
I/O placement, simulation toggle, axes toggle, delete selected, clear
all, theme picker (tri-state), GitHub link, version. Settings stays
stubbed with a Coming soon tooltip.

App.tsx now wraps in TooltipProvider and renders CompactToolbar left of
the canvas. Old Sidebar functionality fully reachable through the new
shell. Selection-derived enable/disable for delete and clear matches
prior behavior.

CI gates green: lint, test:run, test:e2e:store, build.

Refs: docs/plans/2026-04-17-design-system-migration/03-phase-c-3a-compact-toolbar.md
EOF
)"
```

Update todo list. Move to chunk 4.

---

## Phase C-3a complete

Move to [`04-phase-c-3b-right-action-bar.md`](./04-phase-c-3b-right-action-bar.md).
