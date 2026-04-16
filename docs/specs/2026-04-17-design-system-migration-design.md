# Design System Migration — Design Spec

**Status:** Approved (brainstorming complete) — ready for implementation plan
**Date:** 2026-04-17
**Owner:** mezivillager
**Related branch:** `feat/design-system-migration` (to be created)
**Supersedes:** `docs/plans/2026-04-02-design-system-migration.md` (deleted in commit `4d691ab`, the previous incremental approach that did not work out)

---

## Goal

Replace HACER's Ant Design + custom CSS UI shell with a pixel-perfect implementation of the design defined in the `design-system/` folder (shadcn/ui + Radix + Tailwind v4 + OKLch tokens + Sonner + Lucide), keep the React Three Fiber 3D scene as the central canvas (color/grid retokenized only), wire all existing functionality into the new shell, and stub every new-design surface that has no backing logic with a "Coming soon" tooltip.

## Non-goals

- Porting HACER to Next.js (not required for pixel-perfect; would hurt cold-load performance)
- Designing slots for Phase 0.5 panels (`HDLEditor`, `TestResultsPanel`, `PinoutPanel`, `ChipDefinitionPanel`, `ChipWorkflowBrowser`) — separate brainstorm
- Implementing undo / redo, layers, gate duplication, export / import, truth table generator, find / fit-to-view, per-element color, position / rotation editors, default-value toggle for inputs — all stubbed with "Coming soon" tooltips and filed as follow-up tickets at PR-open time
- Automated visual regression baselines (Playwright `toHaveScreenshot`) — separable follow-up
- Extracting `design-system/` as a publishable package or moving HACER to a monorepo

---

## Context

### Current state (`src/`)

- **Stack**: Vite 8 + React 19 (with React Compiler) + Zustand + Immer + R3F + Three.js + **Ant Design 6** + `@ant-design/icons` + custom CSS (`src/App.css`, ~329 lines)
- **Layout**: 260px Ant `<Sider>` left + `CanvasArea` (R3F) + `DemoOverlay` + `StatusBar`
- **Ant surface area**: `Layout/Sider/Content`, `Button`, `Space`, `Typography`, `Tooltip`, `Divider`, `Switch`, `Input`, plus the `message` API used in **30+ callsites** across `src/store/actions/wiringActions/`, `src/store/actions/simulationActions/`, `src/store/actions/gateActions/`, `src/components/canvas/handlers/wireHandlers.ts`, `src/components/canvas/Scene/WirePreview.tsx`, and `src/components/ui/NodeRenameControl.tsx`
- **Theme**: dark-only via Ant `ConfigProvider` (`src/theme/ThemeProvider.tsx`); plain TS color constants for R3F grid in `src/theme/tokens.ts`

### Design system source (`design-system/`)

Standalone Next.js 16 showcase (not a consumable package). Visual ingredients:

- Tailwind CSS v4 + `tw-animate-css` + OKLch token sets (light + dark)
- shadcn/ui components (~64 primitives in `design-system/components/ui/`)
- Radix UI primitives
- Lucide React icons
- Sonner toasts
- Geist + Geist Mono fonts
- `next-themes` tri-state toggle (`light` / `dark` / `system`)

Shell components (`design-system/components/circuit-designer/`):

- `CompactToolbar` — 12px-wide left rail, icon-only with popovers (Gates, I/O, theme picker)
- `CircuitCanvas` — 2D HTML canvas in the showcase; **replaced by HACER's R3F canvas** in our integration
- `RightActionBar` — icon rail + collapsible 280px drawer with Info / Layers / History tabs
- `PropertiesPanel` — floating bottom-center contextual panel for selection
- `HelpBar` — bottom strip with contextual keyboard shortcuts + `KeyboardShortcutsModal`

### Prior attempt context

A 1108-line incremental migration plan (`docs/plans/2026-04-02-design-system-migration.md`) was authored on Apr 2 and removed Apr 4 (commit `4d691ab`). It planned to install Tailwind alongside Ant Design and migrate file-by-file across 8 phases. The styling systems do not visually coexist on the same screen, which forced rework. This spec corrects course by **stripping Ant before adding Tailwind**, and by shipping the entire migration in **one PR**.

---

## Strategy summary

**Approach:** Strip-first vertical slice in a single PR.

Hard constraints (decided during brainstorming):

- **One PR.** No coexistence on `main`. No `?ui=v2` flag.
- **Fresh branch in current workspace** (no worktree per user preference). Branch name: `feat/design-system-migration`.
- **Single styling system at all times.** After commit 1 there's no Ant CSS in the bundle; after commit 2 there's Tailwind. There's never a moment where both render to the screen.
- **Tri-state theme** (light / dark / system) on PR merge — both 2D shell and 3D scene must look correct in both themes.
- **Sonner for transient toasts**; **StatusBar (kept, restyled) for persistent severity messages**. Every existing `message.*` call → `notify.*` 1:1.
- **Phase 0.5 panels deferred** — designed in a follow-up brainstorm.
- **`NodeRenameControl` absorbs into `PropertiesPanel`'s name field** for I/O selections; standalone component is deleted.
- **No Next.js port.** Vite SPA stays; we replace `next-themes` with `next-themes` itself (it works in non-Next React despite the name) or a tiny custom `ThemeProvider` fallback. Replace `next/font` with the `geist` npm package wired via `@font-face`.
- **CI gates green at every commit** in the branch: `pnpm run lint`, `pnpm run test:run`, `pnpm run test:e2e:store`, `pnpm run build`. `pnpm run test:e2e:ui` may be `.skip`-ped during phases A–D and is fully restored in Phase E.

### End state

- `package.json` no longer depends on `antd` or `@ant-design/icons`
- `src/App.css` is gone (replaced by `src/styles/globals.css` + Tailwind utility classes)
- Both themes look pixel-equivalent to the design-system showcase
- Every existing user-facing capability still works
- Bundle size measurably smaller than pre-migration baseline

---

## Vite vs. Next.js decision

Stay on Vite. Confidence: very high (~95%). Rationale:

- Every visual ingredient (Tailwind v4, OKLch tokens, Radix, Lucide, Sonner, Geist) is framework-agnostic
- The design-system app uses Next purely as a CSR shell — no SSR, no Server Components, no Image, no middleware, no streaming, no App Router routing (single page)
- A Next.js port would ship more JS to parse before the 3D canvas mounts, hurting cold-load TTI for zero pixel-fidelity gain
- The 5% caveat is addressed in §3 (Foundation): pre-inlined no-flash theme script, font preload, `next-themes` Vite verification

If during implementation a specific surface cannot reach pixel-perfect on Vite, the response is to address it on that surface — not to port the whole app to Next.

---

## Phase A — The Ant strip (commit 1)

**Goal:** Remove every line of Ant Design + `@ant-design/icons` from the source tree and `package.json`. Leave the app in a deliberately ugly but compilable, lint-clean, build-clean state where store tests still pass.

### Delete outright (component + co-located `.test.tsx`)

| File | Why |
|---|---|
| `src/components/ui/Sidebar.tsx` + `Sidebar.test.tsx` | Ant `Layout/Sider/Button/Space/Typography/Tooltip/Divider/Switch` |
| `src/components/ui/GateSelector.tsx` + `GateSelector.test.tsx` | Ant `Tooltip` + Ant icons |
| `src/components/ui/NodeSelector.tsx` + `NodeSelector.test.tsx` | Ant `Button/Space/Tooltip` + icons |
| `src/components/ui/NodeRenameControl.tsx` + `NodeRenameControl.test.tsx` | Ant `Input/Button/Space/Typography`; logic absorbed into PropertiesPanel in Phase C-3c |
| `src/components/ui/handlers/uiHandlers.ts` | Sidebar's `handleDeleteSelected` helper; logic re-implemented inline in CompactToolbar |
| `src/theme/ThemeProvider.tsx` | Ant `ConfigProvider` wrapper |
| `src/components/ui/DemoOverlay.tsx` | Uses `CloseOutlined`; rebuilt in Phase C-3f |
| `src/App.css` | 329-line Ant-shell-specific CSS |

### Rewrite in place (Phase A — temporary, ugly placeholder)

| File | New contents (temporary) |
|---|---|
| `src/App.tsx` | Bare scaffold: `<div style={{display:'flex',height:'100vh',flexDirection:'column'}}><CanvasArea/><StatusBar/></div>`. No theme provider yet. |
| `src/components/canvas/CanvasArea.tsx` | Replace `import { Layout, Typography } from 'antd'` and the `<Content>`/`<Title>` JSX with a plain `<div>` wrapper. R3F `<Canvas>` and Scene logic untouched. |

### Survives unchanged

- `src/components/ui/StatusBar.tsx` + `StatusBar.module.css` (no Ant; restyled later in Phase C-3e)
- `src/components/canvas/Scene/**` (all R3F components; only `CanvasArea` wrapper edited)
- `src/components/canvas/Scene/WirePreview.tsx` (one `message.error` patched in notify sweep)
- `src/components/canvas/handlers/wireHandlers.ts` (two `message.*` calls patched)
- `src/theme/tokens.ts` (plain TS constants; Phase D retokenizes by replacing internals)
- `src/gates/**`, `src/nodes/**`, `src/simulation/**`, `src/utils/**`, `src/hooks/**`, `src/store/**` (no Ant except `message`)
- `src/main.tsx`, `src/index.css` (no Ant)

### Create

`src/lib/notify.ts` — temporary stub; replaced by Sonner-backed implementation in Phase B without callsite changes:

```ts
type NotifyOpts = { description?: string; duration?: number };
type NotifyFn = (message: string, opts?: NotifyOpts) => void;

const stubLog = (level: string): NotifyFn => (msg, opts) => {
  console.warn(`[notify.${level}]`, msg, opts ?? '');
};

export const notify = {
  success: stubLog('success'),
  info: stubLog('info'),
  error: stubLog('error'),
  warning: stubLog('warning'),
};
```

### Patch (sweep `message.*` → `notify.*`)

| File | Approx. count |
|---|---|
| `src/store/actions/wiringActions/wiringActions.ts` | ~30 |
| `src/store/actions/simulationActions/simulationActions.ts` | 1 |
| `src/store/actions/gateActions/gateActions.ts` | 2 |
| `src/components/canvas/handlers/wireHandlers.ts` | 2 |
| `src/components/canvas/Scene/WirePreview.tsx` | 1 |
| Test files for the above | varies — replace `vi.spyOn(message, ...)` with `vi.spyOn(notifyModule, ...)` |

All callsites are `message.X('string literal')` shape (verified via grep) — sweep is mechanical.

### `package.json` mutations

Remove `antd` and `@ant-design/icons` from `dependencies`; run `pnpm install`.

### `@ui` Playwright specs

Apply `test.describe.skip(...)` per file with comment:

```ts
// TODO(design-system-migration): re-enable in Phase E once new shell selectors are in place.
```

`@store` specs untouched.

### Verification gate

```bash
rg "from ['\"]antd['\"]|from ['\"]@ant-design"  src/  e2e/   # must return 0 matches
pnpm run typecheck                                            # green
pnpm run lint                                                  # green
pnpm run test:run                                              # green
pnpm run test:e2e:store                                        # green
pnpm run build                                                 # green
```

### WIP state after Phase A

- Borderless 3D canvas filling the viewport with the existing dark Three.js background and grid
- `StatusBar` strip at bottom when status messages exist (still old visual)
- No interactive UI affordances (no gate selector, no sim toggle, no buttons)
- App driveable through `window.circuitActions` (already exposed for E2E) and existing keyboard shortcuts
- Bundle drops by ~750 KB gzipped (Ant + icons removed)

---

## Phase B — Foundation (commit 2)

**Goal:** Add the styling and behavioral foundation. After this commit, Tailwind classes work, OKLch tokens are live, the page applies the correct theme class on first paint with no flash, the Geist font renders, and `notify.*` calls produce real toasts.

### Dependencies added

```diff
   "dependencies": {
+    "@radix-ui/react-dialog": "1.1.15",
+    "@radix-ui/react-dropdown-menu": "2.1.16",
+    "@radix-ui/react-label": "2.1.8",
+    "@radix-ui/react-popover": "1.1.15",
+    "@radix-ui/react-scroll-area": "1.2.10",
+    "@radix-ui/react-separator": "1.1.8",
+    "@radix-ui/react-slot": "1.2.4",
+    "@radix-ui/react-switch": "1.2.6",
+    "@radix-ui/react-tabs": "1.1.13",
+    "@radix-ui/react-toggle": "1.1.10",
+    "@radix-ui/react-toggle-group": "1.1.11",
+    "@radix-ui/react-tooltip": "1.2.8",
+    "class-variance-authority": "^0.7.1",
+    "clsx": "^2.1.1",
+    "geist": "^1.5.1",
+    "lucide-react": "^0.564.0",
+    "next-themes": "^0.4.6",
+    "sonner": "^1.7.1",
+    "tailwind-merge": "^3.3.1",
   },
   "devDependencies": {
+    "@tailwindcss/vite": "^4.2.0",
+    "tailwindcss": "^4.2.0",
+    "tw-animate-css": "^1.3.3",
   }
```

`Dialog`-style primitives (e.g. shadcn `card`, `input`, `kbd`) are added on demand in their consuming Phase C sub-commits via `npx shadcn add ...`.

### Files added

#### `vite.config.ts` patch

```ts
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [
    tailwindcss(),   // must come before react()
    react(),
    // ...existing babel react-compiler plugin
  ],
});
```

#### `src/styles/globals.css` (new — replaces `src/index.css` + remnants of `src/App.css`)

Direct port of `design-system/app/globals.css` — OKLch token blocks, `@theme inline` map, `@layer base` rules — with adaptations:

- Drop `@import 'tailwindcss';` if Tailwind v4's Vite plugin auto-injects it (verify); else keep
- Add Geist `@font-face` declarations sourced from the `geist` npm package's font files (replaces `next/font/google`)
- Add `html, body, #root { height: 100%; overflow: hidden; }` to keep the canvas full-bleed
- Add a single `--warning` OKLch token (design-system has none; we need it for StatusBar's warning severity in §4e)

`src/main.tsx` import: `import './styles/globals.css';` only.

`src/index.css` and any leftover `src/App.css` deleted now.

#### `src/lib/utils.ts` (new — shadcn convention)

```ts
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
```

#### `src/lib/notify.ts` (replace stub from Phase A)

```ts
import { toast } from 'sonner';

type NotifyOpts = { description?: string; duration?: number };

export const notify = {
  success: (msg: string, opts?: NotifyOpts) => toast.success(msg, opts),
  info: (msg: string, opts?: NotifyOpts) => toast.info(msg, opts),
  error: (msg: string, opts?: NotifyOpts) => toast.error(msg, opts),
  warning: (msg: string, opts?: NotifyOpts) => toast.warning(msg, opts),
};
```

Phase A test mocks (which spy on `notify.success/info/error/warning`) require zero changes — same exported shape.

#### `components.json` (new — shadcn CLI config)

Configures `npx shadcn add ...` (used in every Phase C sub-commit) to drop primitive files into `src/components/ui-kit/` rather than the CLI's default `src/components/ui/`. Match the design-system folder's existing `components.json` shape:

```json
{
  "$schema": "https://ui.shadcn.com/schema.json",
  "style": "new-york",
  "rsc": false,
  "tsx": true,
  "tailwind": {
    "config": "",
    "css": "src/styles/globals.css",
    "baseColor": "neutral",
    "cssVariables": true,
    "prefix": ""
  },
  "aliases": {
    "components": "@/components",
    "utils": "@/lib/utils",
    "ui": "@/components/ui-kit",
    "lib": "@/lib",
    "hooks": "@/hooks"
  },
  "iconLibrary": "lucide"
}
```

The `aliases.ui` value is the only deviation from shadcn defaults — it routes primitives to `ui-kit/` so HACER's own shell components (`CompactToolbar`, `RightActionBar`, etc.) can keep living in `src/components/ui/` without naming collision.

#### `src/components/ui-kit/theme-provider.tsx` (new)

Thin wrapper around `next-themes`:

```tsx
'use client';
import { ThemeProvider as NextThemesProvider } from 'next-themes';
import { type ComponentProps } from 'react';

export function ThemeProvider({ children, ...props }: ComponentProps<typeof NextThemesProvider>) {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
      {...props}
    >
      {children}
    </NextThemesProvider>
  );
}
```

shadcn primitives land under `src/components/ui-kit/` (ui-kit = shadcn-paste directory). HACER's own shell components stay under `src/components/ui/`. Clean split, both directories hold React components.

#### `index.html` patch — no-flash theme script

```html
<head>
  ...
  <script>
    try {
      const stored = localStorage.getItem('theme');
      const theme = stored ?? 'system';
      const dark = theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
      if (dark) document.documentElement.classList.add('dark');
    } catch (_) {}
  </script>
</head>
```

#### `src/App.tsx` (rewrite — minimal but now themed)

```tsx
import { ThemeProvider } from '@/components/ui-kit/theme-provider';
import { Toaster } from 'sonner';
import { CanvasArea } from '@/components/canvas/CanvasArea';
import { StatusBar } from '@/components/ui/StatusBar';

export default function App() {
  return (
    <ThemeProvider>
      <div className="flex flex-col h-screen w-screen overflow-hidden bg-background text-foreground">
        <CanvasArea />
        <StatusBar />
      </div>
      <Toaster position="top-right" richColors closeButton />
    </ThemeProvider>
  );
}
```

(`<TooltipProvider>` is added in commit 3a as part of CompactToolbar's primitive sweep — it's the first tooltip consumer.)

### Verification gate

```bash
pnpm run typecheck && pnpm run lint && pnpm run test:run && pnpm run test:e2e:store && pnpm run build
```

Manual smoke:

1. Cold-load in dark-system browser → background paints dark immediately, no white flash
2. Cold-load in light-system browser → background paints light, no dark flash
3. Toggle `localStorage.theme = 'light'` → reload → light renders
4. Trigger a wiring error from console → Sonner toast renders top-right styled per current theme
5. Devtools Computed → body's `font-family` resolves to Geist

### WIP state after Phase B

- Empty viewport themed (dark by default; light if system preference)
- 3D canvas (still using current `tokens.ts` colors — happens to look fine on dark, slightly off on light; acceptable until Phase D)
- StatusBar visible at bottom only when status messages exist (still its old visual style)
- No buttons, no controls
- Toast pops in correctly themed when `notify.*` triggers

---

## Phase C — Shell components (commits 3a–3f)

Six sub-commits, one per shell component. Each follows the same pattern: add only the shadcn primitives this shell consumes (TDD), build the shell (TDD), wire to real Zustand store, mount in `App.tsx`, verify gate green.

shadcn primitives are copied via `npx shadcn add` into `src/components/ui-kit/` — source ownership, no runtime dependency on a versioned shadcn package. The CLI-generated files match the design-system's `components/ui/` versions byte-for-byte.

### Commit 3a — `CompactToolbar`

12px-wide left rail. After this commit the app is interactively usable for the first time since Phase A.

**Primitives:** `button`, `tooltip`, `popover`, `separator`, `switch`.

**Component file:** `src/components/ui/CompactToolbar.tsx` — direct port of `design-system/components/circuit-designer/compact-toolbar.tsx`.

**Adaptations:**

| Design-system source | HACER adaptation |
|---|---|
| `useState` for `selectedGate` | `useCircuitStore(s => s.placementMode)` and `useCircuitStore(s => s.nodePlacementMode)` |
| Hardcoded 5 gates | All 7 HACER gate types: NAND, AND, OR, NOT, **NOR**, XOR, **XNOR**. Popover grid 2-col × 4 rows (one cell empty) |
| GitHub URL | `https://github.com/mezivillager/hacer` |
| Hardcoded version | `useAppReleaseVersion()` (existing hook; Ant-free per grep, verify at impl) |
| `handleClear` (no-op) | `circuitActions.clearCircuit()`, disabled when `gates.length === 0` (no confirm prompt — matches existing Sidebar behavior) |
| Delete Selected (no-op) | Inline-implements deleted `handleDeleteSelected` logic |
| Settings (no-op) | "Coming soon" tooltip |
| Theme picker | `useTheme()` from `next-themes` |
| Show Axes toggle | `circuitActions.toggleAxes()` |
| Run/Pause | `circuitActions.toggleSimulation()` |

**Tests:** `src/components/ui/CompactToolbar.test.tsx` — covers all 7 gates render, gate-toggle behavior, sim button state, axes toggle, delete enable/disable, clear enable/disable, theme picker, settings tooltip, github link, version display.

**`App.tsx` cutover** (adds `<TooltipProvider>` wrap — first tooltip consumer in the tree):

```tsx
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
```

### Commit 3b — `RightActionBar`

Absolute-positioned right side: thin icon rail with collapsible 280px drawer hosting Info / Layers / History tabs.

**Primitives:** none new.

**Component file:** `src/components/ui/RightActionBar.tsx` — port of `design-system/components/circuit-designer/right-action-bar.tsx`.

**Adaptations:**

| Design-system source | HACER adaptation |
|---|---|
| `circuitInfo` prop | Direct `useCircuitStore` reads inside the component (drop prop drilling) |
| `historyEntries`, `onUndo`, `onRedo`, `canUndo`, `canRedo` | Drop entirely. Undo/Redo buttons render disabled with "Coming soon" tooltip. History tab shows the design's existing empty state. |
| `LayersPanel` mock data | Empty state copy: "Layers coming soon — visibility controls will appear here" |
| `circuitInfo.status` string | `simulationRunning ? 'Running' : 'Paused'` derived |
| Stat counts | Wired to real `useCircuitStore` selectors (`gates.length`, `wires.length`, `inputNodes.length`, `outputNodes.length`) |
| Quick actions (Export / Import / Truth Table) | All three render with "Coming soon" tooltip on hover |
| Find / Maximize buttons | Disabled with "Coming soon" tooltip |

**Coming-soon helper** (used here and elsewhere):

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

**Tests:** `src/components/ui/RightActionBar.test.tsx` — drawer toggle, tab switching, Info counts, status pill, empty states for Layers/History, "Coming soon" tooltips on stubbed controls.

**App.tsx mounting:** `<RightActionBar />` inside the canvas-relative wrapper.

**Z-stack convention:** all canvas overlays sit at `z-10`; R3F `<canvas>` is `z-0`. Pointer events captured by overlay DOM, not forwarded to canvas.

### Commit 3c — `PropertiesPanel`

Floating contextual panel anchored bottom-center. Selection-driven. Absorbs the deleted `NodeRenameControl`'s rename logic for I/O nodes.

**Primitives added:** `input`, `label` (others already present).

**Selection-shape adapter:**

```ts
// src/components/ui/PropertiesPanel/useSelectedElement.ts
export type SelectedElement =
  | { kind: 'gate'; id: GateId; gateType: GateType; name: string; position: Vec3; rotation: Vec3 }
  | { kind: 'wire'; id: WireId; from: WireEndpoint; to: WireEndpoint }
  | { kind: 'input'; id: InputNodeId; name: string; position: Vec3 }
  | { kind: 'output'; id: OutputNodeId; name: string; position: Vec3 }
  | { kind: 'junction'; id: JunctionId; position: Vec3 };

export function useSelectedElement(): SelectedElement | null {
  // Reads selectedGateId | selectedWireId | selectedNodeId + selectedNodeType from store.
  // Looks up the matching record; returns a discriminated union or null.
  // Priority: gate > wire > node when multiple are set (verify store invariants at impl).
}
```

**Component file:** `src/components/ui/PropertiesPanel/index.tsx` — port of `design-system/components/circuit-designer/properties-panel.tsx`.

**Adaptations:**

| Design-system source | HACER adaptation |
|---|---|
| `selectedElement` prop, `onUpdate`, `onDelete`, `onDuplicate`, `onClose` callbacks | Replaced by `useSelectedElement()` and direct `circuitActions.*` dispatches |
| Header name editor (gates / wires) | Read-only with "Coming soon" tooltip — no rename action exists for gates/wires |
| Header name editor (input / output nodes) | Editable, wired to `circuitActions.renameInputNode` / `renameOutputNode`. Enter commits, Escape reverts, empty name → `notify.error('Name cannot be empty')` |
| Display Label field for I/O | Drop the duplicate field — header name editor is the single source of name editing |
| Position read-out | Wired to `position.x` / `position.z`. Read-only. |
| Rotation read-out + +90 button | Read-out wired; +90 button: if `circuitActions.rotateGate(id, +90)` exists or is trivial to add, wire it; else "Coming soon" tooltip. Decided at impl. |
| Color dropdown | "Coming soon" — no per-element color in data model |
| Default Value Switch (input nodes) | "Coming soon" — no `defaultValue` field on InputNode |
| Wire Connection Info pills | Wired to `from`/`to` endpoints. Read-only. |
| Duplicate button | "Coming soon" — no `duplicateGate` action |
| Delete button | Branches on `kind`, dispatches matching removal action |
| Close button (X) | Dispatches `circuitActions.deselectAll()` (verify name at impl; add 5-line action if absent) |

**Tests:** `src/components/ui/PropertiesPanel/index.test.tsx` (per-kind rendering, rename flow, "Coming soon" tooltips, delete/close behavior); `useSelectedElement.test.ts` (adapter correctness).

### Commit 3d — `HelpBar` + `KeyboardShortcutsModal`

Bottom strip with contextual keyboard hints + modal listing every shortcut.

**Primitives added:** `dialog`, `tabs`, `kbd`.

**Component files:**
- `src/components/ui/HelpBar.tsx` — port of `design-system/components/circuit-designer/help-bar.tsx`
- `src/components/ui/KeyboardShortcutsModal.tsx` — port of `design-system/components/circuit-designer/keyboard-shortcuts-modal.tsx`

**Contextual mode derivation:**

```ts
// src/components/ui/HelpBar/useContextMode.ts
export function useContextMode(): ContextMode {
  const placementMode = useCircuitStore((s) => s.placementMode);
  const nodePlacementMode = useCircuitStore((s) => s.nodePlacementMode);
  const wiringMode = useCircuitStore((s) => s.wiringMode);  // verify field name at impl
  const hasSelection = useCircuitStore(
    (s) => s.selectedGateId !== null || s.selectedWireId !== null || s.selectedNodeId !== null
  );

  if (placementMode !== null || nodePlacementMode !== null) return 'moving';
  if (wiringMode) return 'wiring';
  if (hasSelection) return 'selecting';
  return 'default';
}
```

Priority order: `moving > wiring > selecting > default`.

**Shortcut catalog adaptation:**

| HACER context | Hint to display |
|---|---|
| default | `Click` Select · `Drag` Move · `Scroll` Zoom |
| selecting | `Delete` Remove · `Z` Rotate · `Esc` Deselect |
| wiring | `Click pin` Connect · `Esc` Cancel |
| moving | `Esc` Cancel · `Click` Place |

The design's "Ctrl+D Duplicate" hint is dropped (no duplicate action). "Shift snap to grid" dropped (HACER snaps unconditionally).

**Modal catalog:** `src/components/ui/KeyboardShortcutsModal/catalog.ts` — single source of truth grouped by Navigation / Selection / Editing / Simulation. Entries that aren't yet bound to a real handler are marked "Coming soon" inline.

**Collapse persistence:** localStorage key `helpBarCollapsed`.

**`?` key binding:** opens the modal (guard against opening when an input is focused). If HACER's existing `useKeyboardShortcuts.ts` already binds `?`, remap or piggyback at impl.

**Tests:** mode transitions, collapse persistence, modal open/close, all shortcut categories render.

### Commit 3e — `StatusBar` restyle

Component logic, store binding, and accessibility attributes survive Phase A. This commit replaces the visual layer.

**Changes:**

| Before | After |
|---|---|
| `import styles from './StatusBar.module.css'` | Removed; classes inline via `cn()` |
| Severity colors hardcoded in CSS module | CVA variant: `info → bg-secondary text-secondary-foreground`, `success → bg-primary/15 text-primary`, `warning → bg-[--warning]/15 text-[--warning]`, `error → bg-destructive/15 text-destructive` |
| Wrapper positioning rules in CSS | Tailwind: `absolute left-0 right-0 bottom-9 flex justify-center px-3` (sits above HelpBar) |
| `dismissText` span and dismiss-on-click | Preserved; restyled |
| `aria-live="polite"`, `role="status"`, `data-testid`, `data-severity` | All preserved verbatim |

**File deleted:** `src/components/ui/StatusBar.module.css`

**Z-stack** (final bottom-region layering inside canvas-relative wrapper):

| Element | Bottom offset | When visible |
|---|---|---|
| HelpBar (expanded) | `bottom-0` | Always (unless collapsed) |
| HelpBar floating expand button | `bottom-3 left-1/2` | Only when collapsed |
| StatusBar | `bottom-9` (above HelpBar; drops to `bottom-3` when HelpBar collapsed) | Only when status messages exist |
| PropertiesPanel | `bottom-16` (drops to `bottom-10` when HelpBar collapsed) | Only when something selected |
| DemoOverlay | `bottom-20 right-4` | First 600ms after mount unless `?notour=1` |

A `useHelpBarCollapsed()` hook (reading the localStorage-backed state from 3d) drives the conditional offsets.

### Commit 3f — `DemoOverlay` rebuild

Logic concepts (auto-show after 600ms, dismiss on click or `DISMISS_DEMO_TOUR_EVENT`, suppress via `?notour=1`) port from the deleted Phase A version. Visual layer rebuilt from scratch with Tailwind + design tokens + Lucide `X` icon.

**Primitives added:** `card`.

Logic preserved from `src/lib/demoTour.ts` (untouched). Position: `absolute bottom-20 right-4` (verify against RightActionBar drawer overlap; move to `left-16` if needed).

---

## Phase D — R3F retoken (commit 4)

**Goal:** Make 3D scene colors theme-aware. After this commit, canvas backdrop, grid, gate bodies, pins, wires, axes shift correctly when the user toggles light / dark / system.

### Approach

CSS-var resolver hook. THREE.js materials don't subscribe to CSS variable changes — we need to re-read on theme toggle:

```ts
// src/components/canvas/hooks/useThemeColor.ts
import { useTheme } from 'next-themes';
import { useEffect, useState } from 'react';
import { Color } from 'three';

export function useThemeColor(cssVar: string): Color {
  const { resolvedTheme } = useTheme();
  const [color, setColor] = useState(() => readCssColor(cssVar));

  useEffect(() => {
    setColor(readCssColor(cssVar));
  }, [resolvedTheme, cssVar]);

  return color;
}

function readCssColor(cssVar: string): Color {
  if (typeof window === 'undefined') return new Color('#000');
  const value = getComputedStyle(document.documentElement).getPropertyValue(cssVar).trim();
  const c = new Color();
  try {
    c.setStyle(value);                     // THREE 0.183 supports OKLch via setStyle
  } catch {
    c.set('#888');                         // safe fallback
  }
  return c;
}
```

THREE.js 0.183 (already in `package.json`) parses OKLch via `Color.setStyle` natively (CSS Color 4 spec).

### Token mapping (3D ↔ design system)

| 3D scene element | CSS variable |
|---|---|
| Canvas clear color (R3F `<Canvas>` background, GroundPlane fill) | `--canvas-bg` |
| Grid cell + section lines (uniform per Phase 0.25 design choice) | `--canvas-grid` |
| Scene axes (X / Z lines) | `--muted-foreground` |
| Gate body fill | `--card` |
| Gate body border | `--border` |
| Gate text label (top of flat gate) | `--foreground` |
| Pin idle | `--muted-foreground` |
| Pin active (high signal) | `--primary` |
| Wire idle | `--muted-foreground` |
| Wire active (carrying high) | `--primary` |
| Wire selected | `--ring` |
| Gate selected outline / glow | `--ring` |
| Simulation cycle error highlight | `--destructive` |
| Placement preview (translucent ghost) | `--primary` at 40% alpha |
| Junction node | `--muted-foreground` (idle) / `--primary` (active) |

Translucency / alpha values are layered on the THREE side via `material.opacity`, not encoded in OKLch tokens.

### File-by-file changes

| File | Change |
|---|---|
| `src/theme/tokens.ts` | Repurposed to export only non-color constants (e.g. `GATE_BODY_OPACITY`). Color exports deleted. |
| `src/components/canvas/hooks/useThemeColor.ts` | New |
| `src/components/canvas/hooks/useThemeColor.test.tsx` | New (mocks `getComputedStyle`, asserts re-read on theme change) |
| `src/components/canvas/Scene/SceneGrid.tsx` | Color sources → `useThemeColor('--canvas-grid')` |
| `src/components/canvas/Scene/GroundPlane.tsx` | `useThemeColor('--canvas-bg')` |
| `src/components/canvas/Scene/SceneAxes.tsx` | `useThemeColor('--muted-foreground')` |
| `src/components/canvas/Scene/Scene.tsx` (or `SceneContent.tsx`) | If R3F `<Canvas>` `gl.setClearColor` is set, swap to `useThemeColor('--canvas-bg')` |
| `src/components/canvas/Scene/PlacementPreview.tsx` | Preview material → `useThemeColor('--primary')` |
| `src/components/canvas/Scene/Wire3D.tsx` | Idle / active → `useThemeColor('--muted-foreground')` and `useThemeColor('--primary')` |
| `src/components/canvas/Scene/JunctionPreview.tsx`, `WirePreview.tsx` | Same wire color treatment |
| `src/gates/common/BaseGate.tsx`, `GatePin.tsx`, `WireStub.tsx` | Body fill / border / text / pin colors via `useThemeColor` |

(Exact file list verified at impl by grepping current `tokens.ts` consumers.)

### Verification

```bash
pnpm run typecheck && pnpm run lint && pnpm run test:run && pnpm run test:e2e:store && pnpm run build
```

Manual visual QA pass with both themes:

- Dark / light baseline cohesion
- Mid-session theme toggle: instant flip, no flash, no stuck materials
- Selected element: outline matches `--ring`
- Placement preview: matches `--primary` at correct alpha
- Wire signal states: high → `--primary`, low → `--muted-foreground` in both themes
- Cycle error: `--destructive` in both themes
- GitHub Pages preview (`pnpm run build && pnpm run preview`) under `/hacer/` base path

---

## Phase E — `@ui` Playwright restoration (commit 5)

### `e2e/selectors/ui.selectors.ts` — replace contents

```ts
export const UI_SELECTORS = {
  canvas: 'canvas',

  toolbar: {
    root: '[data-testid="compact-toolbar"]',
    gatesTrigger: '[data-testid="toolbar-gates-trigger"]',
    ioTrigger: '[data-testid="toolbar-io-trigger"]',
    simToggle: '[data-testid="toolbar-sim-toggle"]',
    axesToggle: '[data-testid="toolbar-axes-toggle"]',
    deleteSelected: '[data-testid="toolbar-delete-selected"]',
    clearAll: '[data-testid="toolbar-clear-all"]',
    themeTrigger: '[data-testid="toolbar-theme-trigger"]',
    githubLink: '[data-testid="toolbar-github-link"]',
    version: '[data-testid="toolbar-version"]',
  },

  gatesPopover: {
    root: '[data-testid="gates-popover"]',
    getGate: (type: 'NAND' | 'AND' | 'OR' | 'NOT' | 'NOR' | 'XOR' | 'XNOR') =>
      `[data-testid="gate-button-${type}"]`,
  },

  ioPopover: {
    root: '[data-testid="io-popover"]',
    input: '[data-testid="io-button-input"]',
    output: '[data-testid="io-button-output"]',
    junction: '[data-testid="io-button-junction"]',
  },

  rightBar: {
    root: '[data-testid="right-action-bar"]',
    infoTrigger: '[data-testid="right-bar-info-trigger"]',
    layersTrigger: '[data-testid="right-bar-layers-trigger"]',
    historyTrigger: '[data-testid="right-bar-history-trigger"]',
    drawer: '[data-testid="right-bar-drawer"]',
    closeDrawer: '[data-testid="right-bar-drawer-close"]',
  },

  infoPanel: {
    root: '[data-testid="info-panel"]',
    statusPill: '[data-testid="info-status-pill"]',
    gatesCount: '[data-testid="info-stat-gates"]',
    wiresCount: '[data-testid="info-stat-wires"]',
    inputsCount: '[data-testid="info-stat-inputs"]',
    outputsCount: '[data-testid="info-stat-outputs"]',
  },

  propertiesPanel: {
    root: '[data-testid="properties-panel"]',
    typeLabel: '[data-testid="properties-type-label"]',
    nameField: '[data-testid="properties-name-field"]',
    deleteButton: '[data-testid="properties-delete"]',
    closeButton: '[data-testid="properties-close"]',
  },

  helpBar: {
    root: '[data-testid="help-bar"]',
    collapsed: '[data-testid="help-bar-expand-button"]',
    allShortcutsButton: '[data-testid="help-bar-all-shortcuts"]',
  },

  shortcutsModal: {
    root: '[role="dialog"][data-testid="shortcuts-modal"]',
  },

  statusBar: '[data-testid="status-bar"]',
} as const;
```

The `e2e/selectors/ui.selectors.ts` file is the canonical source of truth for which `data-testid`s the shell must expose. Phase C sub-commits add the matching `data-testid` props as part of their TDD sweep; Phase E adds any that were missed.

### Helper additions

```ts
// e2e/helpers/actions/toolbar.actions.ts
export async function selectGate(page: Page, gateType: GateType) {
  await page.click(UI_SELECTORS.toolbar.gatesTrigger);
  await page.click(UI_SELECTORS.gatesPopover.getGate(gateType));
}
export async function openInfoDrawer(page: Page) {
  await page.click(UI_SELECTORS.rightBar.infoTrigger);
  await page.waitFor(UI_SELECTORS.infoPanel.root, { state: 'visible' });
}
```

### Per-spec rewrites

For each `*.ui.spec.ts`:

1. Open the popover or drawer before targeting inner controls
2. Replace `text=...` with `data-testid` selectors
3. For Circuit Info reads, open the Info drawer first
4. For Run/Pause assertions, use `aria-label` or `data-testid` instead of visible text

| Spec file | Effort |
|---|---|
| `gate-placement.ui.spec.ts` | Medium |
| `gate-types.ui.spec.ts` | Medium (parameterized over 7 gates) |
| `gate-movement.ui.spec.ts` | Low |
| `wire-creation.ui.spec.ts` | Low |
| `wire-persistence.ui.spec.ts` | Low |
| `simulation-control.ui.spec.ts` | Medium |
| `signal-propagation.ui.spec.ts` | Medium |
| `render-sanity.ui.spec.ts` | Low |

### New `@ui` specs added

- `theme-toggle.ui.spec.ts`
- `properties-panel.ui.spec.ts`
- `node-rename-via-properties-panel.ui.spec.ts` (replaces deleted NodeRenameControl spec)
- `right-action-bar-info.ui.spec.ts`
- `coming-soon-tooltips.ui.spec.ts` (regression guard)
- `keyboard-shortcuts-modal.ui.spec.ts`

### Verification

```bash
pnpm run typecheck && pnpm run lint && pnpm run test:run \
  && pnpm run test:e2e:store && pnpm run test:e2e:ui && pnpm run build
```

All `@ui` specs green; no `.skip` from this migration remaining.

---

## Phase F — Final polish (commit 6)

No functional changes — clean-up, audit, PR readiness.

### Tasks

1. **Dependency audit:**
   - `rg "from ['\"]antd['\"]|from ['\"]@ant-design"` returns zero
   - `rg "import.*\.module\.css"` audits leftover CSS modules
   - Manual unused-dependency check against `package.json`

2. **Dead code sweep:**
   - `src/App.css`, `src/index.css`, `src/components/ui/handlers/`, `src/theme/tokens.ts` (if empty), `src/theme/` (if empty)
   - Verify no imports of deleted Sidebar / GateSelector / NodeSelector / NodeRenameControl

3. **Documentation updates:**

   | File | Update |
   |---|---|
   | `REPO_MAP.md` | New `src/components/ui-kit/` (shadcn primitives) and `src/components/canvas/hooks/` directories. Removed `src/theme/`. Updated import patterns. |
   | `HACER_LLM_GUIDE.md` | Replace Ant patterns with shadcn / Tailwind. Document `notify`, `useSelectedElement`, `useThemeColor`, `<ComingSoon>`. |
   | `tasks/lessons.md` | Capture: "CSS-in-JS systems can't visually coexist — strip the old before installing the new." |
   | `.cursorrules` Stack section | Update to Tailwind v4 + shadcn/ui + Radix + Lucide + Sonner |
   | `docs/typescript-guidelines.md` | Update if it references Ant patterns |

4. **PR description draft (`docs/PR-DRAFT.md`, deleted before merge):**
   - Summary, visual evidence (light + dark side-by-side screenshots vs design-system showcase), migration scope checklist, out-of-scope, test coverage diff, performance delta, follow-up tickets list

5. **Final verification (mandatory):**

   ```bash
   pnpm run lint && pnpm run test:run && pnpm run test:e2e:store \
     && pnpm run test:e2e:ui && pnpm run build && pnpm run preview
   ```

6. **Branch hygiene:** push branch, open PR, request review.

### Definition of done

1. ✅ All four CI mandatory gates green (`lint`, `test:run`, `test:e2e:store`, `build`)
2. ✅ `test:e2e:ui` green (no skipped specs from this migration)
3. ✅ `rg "from ['\"]antd"` returns zero
4. ✅ Side-by-side visual comparison with design-system showcase shows pixel-equivalent output in both themes for: CompactToolbar, RightActionBar, PropertiesPanel, HelpBar, KeyboardShortcutsModal, StatusBar, DemoOverlay, R3F canvas
5. ✅ Every existing pre-migration HACER capability is reachable through the new shell (gate placement, IO placement, junction placement, wiring, simulation, axes toggle, theme toggle, delete, clear, node rename, status messages, demo)
6. ✅ Every new-design surface without backing logic shows a "Coming soon" tooltip
7. ✅ Bundle size measurably smaller than pre-migration baseline
8. ✅ Documentation updated
9. ✅ Follow-up tickets filed for every "Coming soon" stub
10. ✅ PR description includes screenshots and migration checklist

---

## Risks & known unknowns

### Risks mitigated by the plan

- Ant + Tailwind visual conflict → strip-before-install in Phase A
- `next-themes` Vite incompatibility → pinned `^0.4.6` (no Next runtime imports); fallback custom ThemeProvider available
- Theme flash on first paint → inline blocking script in `index.html` (Phase B)
- 30+ `message.*` callsites → `notify` shim added in Phase A, upgraded in Phase B without callsite re-edits
- 3D materials don't subscribe to CSS vars → `useThemeColor` (Phase D) re-reads on theme change
- `@ui` specs target deleted DOM → `.skip` in Phase A, full rewrite to `data-testid` in Phase E
- WIP intermediate states broken → acceptable; single PR; CI gates green at each commit
- Reviewer fatigue from large PR → vertical-slice commit structure makes the PR walkable commit-by-commit

### Risks accepted

- Bundle size could trend up if heavy unused Radix primitives slip in → audit in Phase F
- GitHub Pages base-path quirks for Geist `.woff2` → verify with `pnpm run preview`
- React Compiler / Radix interaction → `'use no memo'` escape hatch if a primitive triggers compiler warning
- Sonner / Radix Dialog z-index → set `<Toaster className="z-[1000]" />` if needed
- Popover-trigger E2E flakiness → `auto-wait` + explicit `state: 'visible'` waits
- Light theme readability of 3D scene → manual QA in Phase D
- Pixel-perfect informally enforced (eyeball, ≤2% per region) — see Known Unknown #12

### Known unknowns (verify at implementation)

1. `useAppReleaseVersion` hook is Ant-free
2. `circuitActions.deselectAll()` exists or needs adding
3. Wiring-mode store field name (`wiringMode` vs `pendingWireSource` vs `isWiring`)
4. `selectedNodeType` always synced with `selectedNodeId`
5. Existing `useKeyboardShortcuts.ts` does not bind `?`
6. THREE.js 0.183 OKLch parsing matches CSS rendering exactly
7. Existing alpha values in `tokens.ts` look right against new OKLch palette
8. Sonner mounts cleanly inside React Compiler tree
9. `tw-animate-css@^1.3.3` compatible with Tailwind v4.2
10. `@ui` specs `.skip`-able cleanly in Playwright
11. Vitest jsdom returns CSS custom properties via `getComputedStyle` (likely needs mock — `useThemeColor` test plan accounts for this)
12. "≤2% per-region pixel diff" enforced by eyeball QA, not automated. Automated visual regression is a deferred follow-up.
13. `geist` npm package font files match `next/font/google` Geist rendering
14. `circuitActions.clearCircuit()` safe without confirm (matches current Sidebar behavior)
15. `src/main.tsx` has no Ant theme/CSS imports

### Explicit out-of-scope (do not implement in this PR)

Phase 0.5 panels · undo/redo · layers · gate duplication · export/import circuit · truth table generator · find/Cmd+F · fit-to-view · per-element color · position editor · wire +90 rotate (verify if trivial; defer if not) · default-value toggle for inputs · automated visual regression · Plankton/Stryker tuning for new surface · monorepo / package extraction.

---

## Next step

Implementation plan via the writing-plans skill. The plan will break each commit (1 → 2 → 3a → 3b → 3c → 3d → 3e → 3f → 4 → 5 → 6) into 2–5 minute atomic tasks with exact file paths, complete code snippets, and verification commands.
