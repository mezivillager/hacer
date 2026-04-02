# Design System Migration Plan: Ant Design → shadcn/ui + Tailwind v4

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Migrate the HACER app UI from Ant Design to the modern design system defined in `design-system/` (shadcn/ui + Radix UI primitives + Tailwind CSS v4 + Lucide icons + Sonner toasts). The migration follows an incremental bottom-up strategy across 8 phases to minimize risk while maintaining a working app at every step.

**Architecture:** The `design-system/` folder is a standalone Next.js showcase app — not a consumable package. Migration means porting the design system's components, CSS tokens, and patterns into the Vite-based main app (`src/`), then replacing Ant Design usage file by file. The 3D layer (React Three Fiber + Three.js) is completely untouched throughout.

**Tech Stack (target):** React 19, TypeScript strict, Zustand + Immer, Tailwind CSS v4, shadcn/ui (Radix primitives), Lucide React, Sonner, Vite 8, Vitest, Playwright.

---

## Strategy: Incremental Bottom-Up

Replace Ant Design in layers — foundation first, then leaf components, then composite layout, then full theme swap. Both Ant Design and Tailwind coexist temporarily until cleanup.

**Why this approach:**
- Ant Design surface area is small (~10 component types across ~13 files) — manageable incrementally
- The 3D layer (R3F, Three.js) is completely unaffected — no risk there
- Each phase produces an independently testable, shippable state
- The biggest visual change (sidebar → compact toolbar) comes last, after the primitive foundation is solid
- Temporary bundle bloat is acceptable for a dev-phase app at v0.5

---

## Execution Skills

- Use @tdd (or @test-driven-development): always write failing tests before production code.
- Use @subagent-driven-development for task execution if available.
- Use @verification-before-completion before claiming done.
- Use @code-review before PR handoff.

---

## Current Ant Design Surface Area

### Component Usage Map

| Ant Design Component | Files Using It |
|---------------------|----------------|
| `Layout` (+ `Sider`, `Content`) | `src/App.tsx`, `src/components/ui/Sidebar.tsx`, `src/components/canvas/CanvasArea.tsx` |
| `Button` | `src/components/ui/Sidebar.tsx`, `src/components/ui/NodeSelector.tsx`, `src/components/ui/NodeRenameControl.tsx` |
| `Space` (+ `Space.Compact`) | `src/components/ui/Sidebar.tsx`, `src/components/ui/NodeSelector.tsx`, `src/components/ui/NodeRenameControl.tsx` |
| `Typography` (`Text`, `Title`) | `src/components/ui/Sidebar.tsx`, `src/components/canvas/CanvasArea.tsx`, `src/components/ui/NodeRenameControl.tsx` |
| `Tooltip` | `src/components/ui/Sidebar.tsx`, `src/components/ui/GateSelector.tsx`, `src/components/ui/NodeSelector.tsx` |
| `Divider` | `src/components/ui/Sidebar.tsx` |
| `Switch` | `src/components/ui/Sidebar.tsx` |
| `Input` | `src/components/ui/NodeRenameControl.tsx` |
| `message` (notification) | `src/store/actions/wiringActions/wiringActions.ts` (30+), `src/store/actions/simulationActions/simulationActions.ts` (1), `src/store/actions/gateActions/gateActions.ts` (2), `src/components/canvas/handlers/wireHandlers.ts` (2), `src/components/canvas/Scene/WirePreview.tsx` (1), `src/components/ui/NodeRenameControl.tsx` (1) |
| `ConfigProvider` + `theme` | `src/theme/ThemeProvider.tsx` |
| `@ant-design/icons` | `src/components/ui/Sidebar.tsx` (6 icons), `src/components/ui/NodeSelector.tsx` (3 icons), `src/components/ui/DemoOverlay.tsx` (1 icon) |

### CSS Files to Replace

| File | Lines | Purpose |
|------|-------|---------|
| `src/App.css` | 329 | Layout, sidebar, gate grid, cursors, demo overlay |
| `src/index.css` | 20 | Global reset, font, overflow |
| `src/components/ui/StatusBar.module.css` | 62 | Status bar severity colors |

---

## Dependencies

### To Add (Phase 1)

| Package | Version | Purpose |
|---------|---------|---------|
| `tailwindcss` | `^4.2.0` | Utility-first CSS framework |
| `@tailwindcss/vite` | `^4.2.0` | Vite integration for Tailwind v4 |
| `clsx` | `^2.1.1` | Conditional classnames |
| `tailwind-merge` | `^3.3.1` | Tailwind class deduplication |
| `class-variance-authority` | `^0.7.1` | Component variant system (CVA) |
| `tw-animate-css` | `^1.3.3` | Tailwind animation utilities |

### To Add (Phase 2)

| Package | Version | Purpose |
|---------|---------|---------|
| `@radix-ui/react-tooltip` | `1.2.8` | Tooltip primitive |
| `@radix-ui/react-popover` | `1.1.15` | Popover primitive |
| `@radix-ui/react-dropdown-menu` | `2.1.16` | Dropdown menu primitive |
| `@radix-ui/react-dialog` | `1.1.15` | Dialog primitive |
| `@radix-ui/react-switch` | `1.2.6` | Switch primitive |
| `@radix-ui/react-scroll-area` | `1.2.10` | Scroll area primitive |
| `@radix-ui/react-toggle` | `1.1.10` | Toggle primitive |
| `@radix-ui/react-toggle-group` | `1.1.11` | Toggle group primitive |
| `@radix-ui/react-separator` | `1.1.8` | Separator primitive |
| `@radix-ui/react-label` | `2.1.8` | Label primitive |
| `@radix-ui/react-slot` | `1.2.4` | Slot composition primitive |
| `@radix-ui/react-tabs` | `1.1.13` | Tabs primitive (for keyboard shortcuts modal) |
| `lucide-react` | `^0.564.0` | Icon library |

### To Add (Phase 4)

| Package | Version | Purpose |
|---------|---------|---------|
| `sonner` | `^1.7.1` | Toast notification system |

### To Remove (Phase 8)

| Package | Reason |
|---------|--------|
| `antd` | Fully replaced by shadcn/ui primitives |
| `@ant-design/icons` | Fully replaced by Lucide React |

---

## Phase 1: Foundation (No UI Changes)

**Goal:** Install Tailwind v4, add OKLch CSS tokens, create utility layer. No visible changes. All existing tests pass unchanged.

**Verification:** `pnpm run lint` · `pnpm run test:run` · `pnpm run test:e2e:store` · `pnpm run build` — all exit 0.

### Task 1.1: Install Tailwind CSS v4 for Vite

- [ ] **Step 1: Install Tailwind and supporting packages**

```bash
pnpm add tailwindcss@^4.2.0 @tailwindcss/vite@^4.2.0
pnpm add clsx@^2.1.1 tailwind-merge@^3.3.1 class-variance-authority@^0.7.1 tw-animate-css@^1.3.3
```

- [ ] **Step 2: Add the Tailwind Vite plugin to `vite.config.ts`**

Import `@tailwindcss/vite` and add it to the `plugins` array (before `react()`):

```ts
// vite.config.ts
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [
    tailwindcss(),
    react(),
    babel({ presets: [reactCompilerPreset()] }),
  ],
  // ... rest unchanged
})
```

- [ ] **Step 3: Verify build still works**

```bash
pnpm run build && pnpm run lint && pnpm run test:run
```

### Task 1.2: Port OKLch CSS Token System

- [ ] **Step 1: Create `src/styles/globals.css` with Tailwind directives and OKLch tokens**

Port from `design-system/app/globals.css`. Adapt for Vite (no Next.js `@import` magic). This file will be imported alongside the existing `index.css` initially.

```css
/* src/styles/globals.css */
@import 'tailwindcss';
@import 'tw-animate-css';

@custom-variant dark (&:is(.dark *));

:root {
  --background: oklch(0.97 0.01 240);
  --foreground: oklch(0.18 0.01 240);
  --card: oklch(0.97 0.01 240);
  --card-foreground: oklch(0.18 0.01 240);
  --popover: oklch(0.97 0.01 240);
  --popover-foreground: oklch(0.18 0.01 240);
  --primary: oklch(0.50 0.15 180);
  --primary-foreground: oklch(0.98 0.005 180);
  --secondary: oklch(0.94 0.01 240);
  --secondary-foreground: oklch(0.25 0.01 240);
  --muted: oklch(0.94 0.01 240);
  --muted-foreground: oklch(0.48 0.01 240);
  --accent: oklch(0.50 0.15 180);
  --accent-foreground: oklch(0.98 0.005 180);
  --destructive: oklch(0.55 0.2 25);
  --border: oklch(0.88 0.01 240);
  --input: oklch(0.94 0.01 240);
  --ring: oklch(0.50 0.15 180);
  --radius: 0.5rem;
  --sidebar: oklch(0.98 0.005 240);
  --sidebar-foreground: oklch(0.18 0.01 240);
  --sidebar-primary: oklch(0.50 0.15 180);
  --sidebar-primary-foreground: oklch(0.98 0.005 180);
  --sidebar-accent: oklch(0.94 0.01 240);
  --sidebar-accent-foreground: oklch(0.25 0.01 240);
  --sidebar-border: oklch(0.88 0.01 240);
  --sidebar-ring: oklch(0.50 0.15 180);
  --canvas-bg: oklch(0.95 0.01 240);
  --canvas-grid: oklch(0.82 0.02 240);
  --chart-1: oklch(0.50 0.15 180);
  --chart-2: oklch(0.55 0.2 25);
  --chart-3: oklch(0.50 0.15 260);
  --chart-4: oklch(0.65 0.15 60);
  --chart-5: oklch(0.55 0.15 300);
}

.dark {
  --background: oklch(0.12 0.01 240);
  --foreground: oklch(0.92 0 0);
  --card: oklch(0.14 0.01 240);
  --card-foreground: oklch(0.92 0 0);
  --popover: oklch(0.14 0.01 240);
  --popover-foreground: oklch(0.92 0 0);
  --primary: oklch(0.65 0.15 180);
  --primary-foreground: oklch(0.12 0.01 240);
  --secondary: oklch(0.22 0.01 240);
  --secondary-foreground: oklch(0.92 0 0);
  --muted: oklch(0.22 0.01 240);
  --muted-foreground: oklch(0.65 0 0);
  --accent: oklch(0.65 0.15 180);
  --accent-foreground: oklch(0.12 0.01 240);
  --destructive: oklch(0.55 0.2 25);
  --border: oklch(0.25 0.01 240);
  --input: oklch(0.20 0.01 240);
  --ring: oklch(0.65 0.15 180);
  --sidebar: oklch(0.14 0.01 240);
  --sidebar-foreground: oklch(0.92 0 0);
  --sidebar-primary: oklch(0.65 0.15 180);
  --sidebar-primary-foreground: oklch(0.12 0.01 240);
  --sidebar-accent: oklch(0.22 0.01 240);
  --sidebar-accent-foreground: oklch(0.92 0 0);
  --sidebar-border: oklch(0.25 0.01 240);
  --sidebar-ring: oklch(0.65 0.15 180);
  --canvas-bg: oklch(0.12 0.01 240);
  --canvas-grid: oklch(0.22 0.02 240);
  --chart-1: oklch(0.65 0.15 180);
  --chart-2: oklch(0.55 0.2 25);
  --chart-3: oklch(0.65 0.15 260);
  --chart-4: oklch(0.70 0.15 60);
  --chart-5: oklch(0.60 0.15 300);
}

@theme inline {
  --font-sans: 'Geist', 'Geist Fallback', -apple-system, BlinkMacSystemFont,
    'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
  --font-mono: 'Geist Mono', 'Geist Mono Fallback', ui-monospace,
    SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', monospace;
  --color-background: var(--background);
  --color-foreground: var(--foreground);
  --color-card: var(--card);
  --color-card-foreground: var(--card-foreground);
  --color-popover: var(--popover);
  --color-popover-foreground: var(--popover-foreground);
  --color-primary: var(--primary);
  --color-primary-foreground: var(--primary-foreground);
  --color-secondary: var(--secondary);
  --color-secondary-foreground: var(--secondary-foreground);
  --color-muted: var(--muted);
  --color-muted-foreground: var(--muted-foreground);
  --color-accent: var(--accent);
  --color-accent-foreground: var(--accent-foreground);
  --color-destructive: var(--destructive);
  --color-border: var(--border);
  --color-input: var(--input);
  --color-ring: var(--ring);
  --color-chart-1: var(--chart-1);
  --color-chart-2: var(--chart-2);
  --color-chart-3: var(--chart-3);
  --color-chart-4: var(--chart-4);
  --color-chart-5: var(--chart-5);
  --color-sidebar: var(--sidebar);
  --color-sidebar-foreground: var(--sidebar-foreground);
  --color-sidebar-primary: var(--sidebar-primary);
  --color-sidebar-primary-foreground: var(--sidebar-primary-foreground);
  --color-sidebar-accent: var(--sidebar-accent);
  --color-sidebar-accent-foreground: var(--sidebar-accent-foreground);
  --color-sidebar-border: var(--sidebar-border);
  --color-sidebar-ring: var(--sidebar-ring);
  --radius-sm: calc(var(--radius) - 4px);
  --radius-md: calc(var(--radius) - 2px);
  --radius-lg: var(--radius);
  --radius-xl: calc(var(--radius) + 4px);
}

@layer base {
  * {
    @apply border-border outline-ring/50;
  }
  body {
    @apply bg-background text-foreground;
  }
}
```

- [ ] **Step 2: Import `src/styles/globals.css` in `src/main.tsx`**

Add the import before the existing `./index.css` import. Both CSS files coexist during migration.

```ts
// src/main.tsx
import './styles/globals.css'  // ← new (Tailwind + OKLch tokens)
import './index.css'           // ← existing (keep during transition)
```

- [ ] **Step 3: Set dark class on `<html>` for initial dark mode**

Since the current app is dark-only, add the `dark` class to the root `<html>` element in `index.html`:

```html
<html lang="en" class="dark">
```

This enables the `.dark` variant in the CSS tokens. Full light/dark switching is added in Phase 7.

### Task 1.3: Create the `cn()` Utility

- [ ] **Step 1: Create `src/lib/utils.ts`**

Port directly from `design-system/lib/utils.ts`:

```ts
// src/lib/utils.ts
import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
```

- [ ] **Step 2: Add `@lib` path alias to `vite.config.ts` and `tsconfig.json`**

In `vite.config.ts` resolve.alias, add:
```ts
'@lib': path.resolve(__dirname, './src/lib'),
```

In `tsconfig.json` compilerOptions.paths, add:
```json
"@lib/*": ["./src/lib/*"]
```

### Task 1.4: Verify Foundation

- [ ] **Run full verification suite**

```bash
pnpm run lint && pnpm run test:run && pnpm run test:e2e:store && pnpm run build
```

All must exit 0. Tailwind is installed but nothing uses it yet — no visual changes.

---

## Phase 2: Port shadcn/ui Primitives

**Goal:** Copy the needed shadcn/ui components from `design-system/components/ui/` into `src/components/ui/shadcn/`, installing their Radix dependencies. No existing components change yet.

**Verification:** `pnpm run lint` · `pnpm run build` — exit 0. No visual changes.

### Task 2.1: Install Radix UI Dependencies

- [ ] **Step 1: Install all required Radix packages + Lucide**

```bash
pnpm add \
  @radix-ui/react-tooltip@1.2.8 \
  @radix-ui/react-popover@1.1.15 \
  @radix-ui/react-dropdown-menu@2.1.16 \
  @radix-ui/react-dialog@1.1.15 \
  @radix-ui/react-switch@1.2.6 \
  @radix-ui/react-scroll-area@1.2.10 \
  @radix-ui/react-toggle@1.1.10 \
  @radix-ui/react-toggle-group@1.1.11 \
  @radix-ui/react-separator@1.1.8 \
  @radix-ui/react-label@2.1.8 \
  @radix-ui/react-slot@1.2.4 \
  @radix-ui/react-tabs@1.1.13 \
  lucide-react@^0.564.0
```

### Task 2.2: Port shadcn/ui Components

Port each file from `design-system/components/ui/` → `src/components/ui/shadcn/`. Update import paths from `@/lib/utils` → `@lib/utils` (matching the main app's alias).

- [ ] **Step 1: Create `src/components/ui/shadcn/` directory**

- [ ] **Step 2: Port these components (one file each)**

Each file is copied from `design-system/components/ui/` with import path adjustments:

| Source (`design-system/components/ui/`) | Target (`src/components/ui/shadcn/`) | Radix Dependency |
|----------------------------------------|--------------------------------------|-----------------|
| `button.tsx` | `button.tsx` | `@radix-ui/react-slot` |
| `tooltip.tsx` | `tooltip.tsx` | `@radix-ui/react-tooltip` |
| `popover.tsx` | `popover.tsx` | `@radix-ui/react-popover` |
| `dropdown-menu.tsx` | `dropdown-menu.tsx` | `@radix-ui/react-dropdown-menu` |
| `dialog.tsx` | `dialog.tsx` | `@radix-ui/react-dialog` |
| `input.tsx` | `input.tsx` | none (native) |
| `label.tsx` | `label.tsx` | `@radix-ui/react-label` |
| `switch.tsx` | `switch.tsx` | `@radix-ui/react-switch` |
| `toggle.tsx` | `toggle.tsx` | `@radix-ui/react-toggle` |
| `toggle-group.tsx` | `toggle-group.tsx` | `@radix-ui/react-toggle-group` |
| `separator.tsx` | `separator.tsx` | `@radix-ui/react-separator` |
| `scroll-area.tsx` | `scroll-area.tsx` | `@radix-ui/react-scroll-area` |
| `badge.tsx` | `badge.tsx` | none |
| `sheet.tsx` | `sheet.tsx` | `@radix-ui/react-dialog` |
| `tabs.tsx` | `tabs.tsx` | `@radix-ui/react-tabs` |
| `kbd.tsx` | `kbd.tsx` | none |
| `spinner.tsx` | `spinner.tsx` | none |

**Import path transformation rule:**
- `@/lib/utils` → `@lib/utils`
- `@/components/ui/...` → `./...` (relative within shadcn directory)

- [ ] **Step 3: Create barrel export `src/components/ui/shadcn/index.ts`**

```ts
// src/components/ui/shadcn/index.ts
export { Button, buttonVariants } from './button'
export { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from './tooltip'
export { Popover, PopoverTrigger, PopoverContent } from './popover'
export {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent,
  DropdownMenuItem, DropdownMenuSeparator, DropdownMenuLabel,
} from './dropdown-menu'
export { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './dialog'
export { Input } from './input'
export { Label } from './label'
export { Switch } from './switch'
export { Toggle, toggleVariants } from './toggle'
export { ToggleGroup, ToggleGroupItem } from './toggle-group'
export { Separator } from './separator'
export { ScrollArea, ScrollBar } from './scroll-area'
export { Badge, badgeVariants } from './badge'
export { Sheet, SheetTrigger, SheetContent, SheetHeader, SheetTitle, SheetDescription } from './sheet'
export { Tabs, TabsList, TabsTrigger, TabsContent } from './tabs'
export { Kbd } from './kbd'
export { Spinner } from './spinner'
```

- [ ] **Step 4: Verify build**

```bash
pnpm run lint && pnpm run build
```

---

## Phase 3: Leaf Component Swap

**Goal:** Replace Ant Design usage in leaf components (GateSelector, NodeSelector, NodeRenameControl, DemoOverlay) with shadcn/ui equivalents. Each component is updated individually with tests.

**Verification:** `pnpm run lint` · `pnpm run test:run` · `pnpm run test:e2e:store` · `pnpm run build` — all exit 0 after each task.

### Task 3.1: Migrate GateSelector

**Files to modify:** `src/components/ui/GateSelector.tsx`

**Current Ant Design usage:** `Tooltip` from `antd`

- [ ] **Step 1: Replace Ant Design Tooltip with shadcn Tooltip**

```tsx
// Before
import { Tooltip } from 'antd'
<Tooltip title={`${type} Gate`} placement="right">

// After
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from './shadcn'
<Tooltip>
  <TooltipTrigger asChild>
    <div ...>
  </TooltipTrigger>
  <TooltipContent side="right">{type} Gate</TooltipContent>
</Tooltip>
```

- [ ] **Step 2: Wrap the component return with `<TooltipProvider>`** or ensure the app-level provider exists.

- [ ] **Step 3: Remove `antd` import. Remove `colors` import (use Tailwind classes instead for active/inactive states).**

- [ ] **Step 4: Run tests:** `pnpm run lint && pnpm run test:run`

### Task 3.2: Migrate NodeSelector

**Files to modify:** `src/components/ui/NodeSelector.tsx`

**Current Ant Design usage:** `Tooltip`, `Button`, `Space` from `antd`; `LoginOutlined`, `LogoutOutlined`, `ShareAltOutlined` from `@ant-design/icons`

- [ ] **Step 1: Replace Ant Button → shadcn Button**

```tsx
// Before
import { Button } from 'antd'
<Button type={isActive ? 'primary' : 'default'} icon={...} onClick={...}>{config.label}</Button>

// After
import { Button } from './shadcn'
<Button variant={isActive ? 'default' : 'outline'} onClick={...}>
  <IconComponent className="size-4" />
  {config.label}
</Button>
```

- [ ] **Step 2: Replace Ant Tooltip → shadcn Tooltip**

- [ ] **Step 3: Replace `Space wrap` → flex div with `gap-2 flex-wrap`**

```tsx
// Before
<Space wrap size="small" className="node-selector">

// After
<div className="flex flex-wrap gap-2">
```

- [ ] **Step 4: Replace Ant Design icons → Lucide icons**

| Ant Design Icon | Lucide Equivalent |
|-----------------|-------------------|
| `LoginOutlined` | `ArrowRightToLine` or `LogIn` |
| `LogoutOutlined` | `ArrowLeftFromLine` or `LogOut` |
| `ShareAltOutlined` | `GitBranch` or `Split` |

- [ ] **Step 5: Remove all `antd` and `@ant-design/icons` imports from this file.**

- [ ] **Step 6: Run tests:** `pnpm run lint && pnpm run test:run`

### Task 3.3: Migrate NodeRenameControl

**Files to modify:** `src/components/ui/NodeRenameControl.tsx`

**Current Ant Design usage:** `Button`, `Input`, `Space`, `Typography`, `message` from `antd`

- [ ] **Step 1: Replace Ant Input → shadcn Input**

```tsx
// Before
import { Input } from 'antd'
<Input value={...} onChange={(event) => ...} placeholder="Node name" size="small" />

// After
import { Input } from './shadcn'
<Input value={...} onChange={(event) => ...} placeholder="Node name" className="h-8 text-sm" />
```

- [ ] **Step 2: Replace Ant Button → shadcn Button**

- [ ] **Step 3: Replace `Space.Compact` → flex div with `gap-0`**

```tsx
// Before
<Space.Compact>...</Space.Compact>

// After
<div className="flex">
  <Input className="rounded-r-none" />
  <Button className="rounded-l-none">Apply</Button>
</div>
```

- [ ] **Step 4: Replace `Typography.Text` → plain `<span>` or `<p>` with Tailwind classes**

```tsx
// Before
<Text strong>Rename Selected Node</Text>

// After
<span className="text-sm font-semibold text-foreground">Rename Selected Node</span>
```

- [ ] **Step 5: Keep `message.error()` call for now** — it will be migrated in Phase 4 (Sonner).

- [ ] **Step 6: Remove `antd` imports (except `message`).**

- [ ] **Step 7: Run tests:** `pnpm run lint && pnpm run test:run`

### Task 3.4: Migrate DemoOverlay

**Files to modify:** `src/components/ui/DemoOverlay.tsx`

**Current Ant Design usage:** `CloseOutlined` from `@ant-design/icons`

- [ ] **Step 1: Replace icon**

```tsx
// Before
import { CloseOutlined } from '@ant-design/icons'
<CloseOutlined />

// After
import { X } from 'lucide-react'
<X className="size-4" />
```

- [ ] **Step 2: Remove `@ant-design/icons` import.**

- [ ] **Step 3: Run tests:** `pnpm run lint && pnpm run test:run`

### Task 3.5: Migrate CanvasArea (partial)

**Files to modify:** `src/components/canvas/CanvasArea.tsx`

**Current Ant Design usage:** `Layout` (`Content`), `Typography` (`Text`)

- [ ] **Step 1: Replace `Content` wrapper → plain `<div>`**

```tsx
// Before
import { Layout, Typography } from 'antd'
const { Content } = Layout
<Content className="app-content ...">

// After
<div className="app-content ...">
```

- [ ] **Step 2: Replace `Typography.Text` → `<span>` with Tailwind classes**

- [ ] **Step 3: Remove `antd` imports from this file.**

- [ ] **Step 4: Run tests:** `pnpm run lint && pnpm run test:run && pnpm run test:e2e:store`

---

## Phase 4: Notification System Swap

**Goal:** Replace all `antd` `message.*` calls with Sonner toasts. This is the highest-impact change by file count (~40 calls across 6 files).

**Verification:** `pnpm run lint` · `pnpm run test:run` · `pnpm run test:e2e:store` · `pnpm run build` — all exit 0.

### Task 4.1: Install and Configure Sonner

- [ ] **Step 1: Install Sonner**

```bash
pnpm add sonner@^1.7.1
```

- [ ] **Step 2: Port the Sonner component from the design system**

Copy `design-system/components/ui/sonner.tsx` → `src/components/ui/shadcn/sonner.tsx`. Adjust imports.

- [ ] **Step 3: Add `<Toaster />` to `src/App.tsx`**

```tsx
import { Toaster } from './components/ui/shadcn/sonner'

function App() {
  return (
    <ThemeProvider>
      <AppContent />
      <Toaster />
    </ThemeProvider>
  )
}
```

### Task 4.2: Create a Toast Utility Wrapper

- [ ] **Step 1: Create `src/lib/toast.ts`**

Create a thin wrapper so store actions don't import `sonner` directly (enables testing with mocks):

```ts
// src/lib/toast.ts
import { toast } from 'sonner'

export const notify = {
  success: (message: string) => toast.success(message),
  error: (message: string) => toast.error(message),
  warning: (message: string) => toast.warning(message),
  info: (message: string) => toast.info(message),
} as const
```

### Task 4.3: Replace All `message.*` Calls

For each file, replace `import { message } from 'antd'` with `import { notify } from '@lib/toast'`, then find-and-replace:

| Pattern | Replacement |
|---------|-------------|
| `message.success(...)` | `notify.success(...)` |
| `message.error(...)` | `notify.error(...)` |
| `message.warning(...)` | `notify.warning(...)` |
| `message.info(...)` | `notify.info(...)` |

- [ ] **Step 1: Migrate `src/store/actions/wiringActions/wiringActions.ts`** (~30 calls — largest file)
- [ ] **Step 2: Migrate `src/store/actions/gateActions/gateActions.ts`** (2 calls)
- [ ] **Step 3: Migrate `src/store/actions/simulationActions/simulationActions.ts`** (1 call)
- [ ] **Step 4: Migrate `src/components/canvas/handlers/wireHandlers.ts`** (2 calls)
- [ ] **Step 5: Migrate `src/components/canvas/Scene/WirePreview.tsx`** (1 call)
- [ ] **Step 6: Migrate `src/components/ui/NodeRenameControl.tsx`** (1 call — left from Phase 3)

- [ ] **Step 7: Run full verification:**

```bash
pnpm run lint && pnpm run test:run && pnpm run test:e2e:store && pnpm run build
```

### Task 4.4: Update Test Mocks

- [ ] **Step 1: If any tests mock `antd` `message`, update them to mock `@lib/toast` `notify` instead.**

Search for test files that import or mock from `antd`:
```bash
grep -r "antd" src/ --include="*.test.*" -l
```

---

## Phase 5: Sidebar → CompactToolbar

**Goal:** Replace the Ant Design Sider-based sidebar with the design system's `CompactToolbar`. This is the biggest visual change — the wide (260px) sidebar becomes a compact (48px) icon bar with dropdown menus.

**Verification:** `pnpm run lint` · `pnpm run test:run` · `pnpm run test:e2e:store` · `pnpm run build` — all exit 0.

### Task 5.1: Port CompactToolbar Component

- [ ] **Step 1: Create `src/components/ui/CompactToolbar.tsx`**

Port from `design-system/components/circuit-designer/compact-toolbar.tsx`. Key adaptations:

1. **Replace prop-drilling with Zustand selectors:**
   - `showAxes` → `useCircuitStore((s) => s.showAxes)`
   - `isSimulating` → `useCircuitStore((s) => s.simulationRunning)`
   - `selectedGate` → `useCircuitStore((s) => s.placementMode)`
   - `onSelectGate` → `circuitActions.startPlacement(type)` / `circuitActions.cancelPlacement()`
   - `onToggleAxes` → `circuitActions.toggleAxes()`
   - `onRunSimulation` → `circuitActions.toggleSimulation()`

2. **Replace `next-themes` useTheme** with a placeholder (dark-only for now; full theme switching in Phase 7).

3. **Keep all shadcn/ui imports** pointing to `./shadcn/`.

4. **Port the gate icon rendering** — use existing `getGateIcon()` from `@/gates/icons`.

5. **Add Node Rename integration** — include `<NodeRenameControl />` in a popover when a node is selected.

- [ ] **Step 2: Write tests for CompactToolbar**

Create `src/components/ui/CompactToolbar.test.tsx`:
- Renders without crashing
- Gate buttons trigger placement mode
- Simulation toggle works
- Axes toggle works

### Task 5.2: Replace Sidebar in App Layout

- [ ] **Step 1: Update `src/App.tsx`**

```tsx
// Before
import { Layout } from 'antd'
import { Sidebar } from './components/ui/Sidebar'

function AppContent() {
  return (
    <Layout className="app-layout">
      <Sidebar />
      <CanvasArea />
      ...
    </Layout>
  )
}

// After
import { TooltipProvider } from './components/ui/shadcn'
import { CompactToolbar } from './components/ui/CompactToolbar'

function AppContent() {
  return (
    <TooltipProvider>
      <div className="flex h-screen w-full bg-background overflow-hidden">
        <CompactToolbar />
        <div className="flex-1 relative">
          <CanvasArea />
          ...
        </div>
      </div>
    </TooltipProvider>
  )
}
```

- [ ] **Step 2: Remove `Layout` import from `antd`.**

- [ ] **Step 3: Delete old Sidebar component** (`src/components/ui/Sidebar.tsx`) or keep as `Sidebar.legacy.tsx` temporarily.

- [ ] **Step 4: Update CSS** — remove `.app-sider` styles from `src/App.css`. The new toolbar uses Tailwind classes exclusively.

- [ ] **Step 5: Run full verification:**

```bash
pnpm run lint && pnpm run test:run && pnpm run test:e2e:store && pnpm run build
```

---

## Phase 6: New Panels + Layout Enhancements

**Goal:** Port the PropertiesPanel, RightActionBar, and HelpBar from the design system into the main app. These are net-new UI additions (the current app doesn't have equivalents).

**Verification:** `pnpm run lint` · `pnpm run test:run` · `pnpm run test:e2e:store` · `pnpm run build` — all exit 0.

### Task 6.1: Port PropertiesPanel

- [ ] **Step 1: Create `src/components/ui/PropertiesPanel.tsx`**

Port from `design-system/components/circuit-designer/properties-panel.tsx`. Adaptations:
- Replace mock data with Zustand selectors for the selected element (`selectedGateId`, `selectedWireId`, `selectedNodeId`)
- Wire property edits to `circuitActions` (rename, rotate, delete, etc.)
- Use shadcn/ui components from `./shadcn/`

- [ ] **Step 2: Write tests for PropertiesPanel**

- [ ] **Step 3: Mount in `src/App.tsx`** at the bottom-center of the canvas area.

### Task 6.2: Port RightActionBar

- [ ] **Step 1: Create `src/components/ui/RightActionBar.tsx`**

Port from `design-system/components/circuit-designer/right-action-bar.tsx`. Adaptations:
- Circuit info reads from `useCircuitStore` (gate/wire/node counts)
- History entries come from store (if history tracking exists; otherwise stub)
- Layer visibility toggles map to store state

- [ ] **Step 2: Write tests for RightActionBar**

- [ ] **Step 3: Mount in `src/App.tsx`** on the right side of the canvas.

### Task 6.3: Port HelpBar

- [ ] **Step 1: Create `src/components/ui/HelpBar.tsx`**

Port from `design-system/components/circuit-designer/help-bar.tsx`. Adaptations:
- Mode detection from `useCircuitStore` (placementMode, wiringFrom, selectedGateId, etc.)
- Keyboard shortcuts match those in `useKeyboardShortcuts.ts`

- [ ] **Step 2: Create `src/components/ui/KeyboardShortcutsModal.tsx`**

Port from `design-system/components/circuit-designer/keyboard-shortcuts-modal.tsx`.

- [ ] **Step 3: Write tests for HelpBar and KeyboardShortcutsModal**

- [ ] **Step 4: Mount in `src/App.tsx`** at the bottom of the screen.

- [ ] **Step 5: Run full verification:**

```bash
pnpm run lint && pnpm run test:run && pnpm run test:e2e:store && pnpm run build
```

---

## Phase 7: Theme Migration

**Goal:** Replace Ant Design's ConfigProvider theming with CSS-variable-based theming. Enable light/dark mode switching.

**Verification:** `pnpm run lint` · `pnpm run test:run` · `pnpm run test:e2e:store` · `pnpm run build` — all exit 0.

### Task 7.1: Create New ThemeProvider

- [ ] **Step 1: Rewrite `src/theme/ThemeProvider.tsx`**

Replace Ant Design ConfigProvider with a pure CSS-variable-based provider:

```tsx
// src/theme/ThemeProvider.tsx
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'

type Theme = 'dark' | 'light' | 'system'

interface ThemeContextValue {
  theme: Theme
  resolvedTheme: 'dark' | 'light'
  setTheme: (theme: Theme) => void
}

const ThemeContext = createContext<ThemeContextValue | null>(null)

export function useThemeMode() {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error('useThemeMode must be within ThemeProvider')
  return ctx
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>('dark')
  const [resolvedTheme, setResolvedTheme] = useState<'dark' | 'light'>('dark')

  useEffect(() => {
    const root = document.documentElement
    let resolved: 'dark' | 'light'

    if (theme === 'system') {
      resolved = window.matchMedia('(prefers-color-scheme: dark)').matches
        ? 'dark' : 'light'
    } else {
      resolved = theme
    }

    root.classList.toggle('dark', resolved === 'dark')
    root.classList.toggle('light', resolved === 'light')
    setResolvedTheme(resolved)
  }, [theme])

  return (
    <ThemeContext.Provider value={{ theme, resolvedTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}
```

- [ ] **Step 2: Remove Ant Design `ConfigProvider` and `theme` imports**

### Task 7.2: Update Theme Tokens

- [ ] **Step 1: Update `src/theme/tokens.ts`**

Keep 3D material tokens (metalness, roughness, gate body hex colors) since Three.js materials need direct hex/rgb values. But refactor UI tokens to reference CSS variables:

```ts
// src/theme/tokens.ts

// 3D material tokens — these stay as direct values for Three.js
export const materials = {
  gate: { metalness: 0.3, roughness: 0.7 },
  pin: { metalness: 0.8, roughness: 0.2 },
  wireStub: { metalness: 0.9, roughness: 0.1 },
} as const

// 3D color tokens — hex values for Three.js materials
export const threeColors = {
  gate: {
    body: '#3a4a5a',
    bodyHover: '#5a6a7a',
    bodySelected: '#4a9eff',
    // ... per-gate type colors stay as hex
  },
  pin: { active: '#00ff88', inactive: '#ff4444', disconnected: '#555555' },
  wire: { active: '#00ff88', inactive: '#ff4444', preview: '#cd7f32', default: '#cd7f32', selected: '#4a9eff' },
} as const

// UI tokens — reference CSS variables (resolved by browser)
// These are now used only for TypeScript references; actual colors come from globals.css
export const uiTokens = {
  primary: 'var(--primary)',
  background: 'var(--background)',
  foreground: 'var(--foreground)',
  border: 'var(--border)',
  destructive: 'var(--destructive)',
} as const
```

- [ ] **Step 2: Update 3D components to import from `threeColors` instead of `colors`**

- [ ] **Step 3: Update `src/theme/index.ts` barrel exports**

### Task 7.3: Integrate Theme Toggle in CompactToolbar

- [ ] **Step 1: Wire the theme toggle in CompactToolbar to `useThemeMode().setTheme`**

The design system's compact toolbar already has a Light/Dark/System selector. Connect it to the new ThemeProvider.

- [ ] **Step 2: Run full verification:**

```bash
pnpm run lint && pnpm run test:run && pnpm run test:e2e:store && pnpm run build
```

---

## Phase 8: Cleanup and Final Polish

**Goal:** Remove all Ant Design traces, delete legacy CSS, finalize the migration.

**Verification:** `pnpm run lint` · `pnpm run test:run` · `pnpm run test:e2e:store` · `pnpm run build` — all exit 0. Zero imports from `antd` or `@ant-design/icons` remain.

### Task 8.1: Remove Ant Design Dependencies

- [ ] **Step 1: Verify zero Ant Design imports remain**

```bash
grep -r "from 'antd'" src/ --include="*.ts" --include="*.tsx"
grep -r "from '@ant-design" src/ --include="*.ts" --include="*.tsx"
```

Both must return empty.

- [ ] **Step 2: Uninstall packages**

```bash
pnpm remove antd @ant-design/icons
```

- [ ] **Step 3: Verify build still works**

```bash
pnpm run build
```

### Task 8.2: Delete Legacy CSS

- [ ] **Step 1: Delete `src/App.css`**

All styles are now Tailwind utilities or in `globals.css`.

- [ ] **Step 2: Delete or merge `src/index.css` into `src/styles/globals.css`**

The global reset rules from `index.css` should already be covered by Tailwind's base layer.

- [ ] **Step 3: Delete `src/components/ui/StatusBar.module.css`**

Update `StatusBar.tsx` to use Tailwind classes for severity colors:

```tsx
const severityClasses = {
  info: 'bg-blue-600 hover:bg-blue-700',
  warning: 'bg-yellow-600 hover:bg-yellow-700',
  error: 'bg-red-600 hover:bg-red-700',
} as const
```

- [ ] **Step 4: Remove `import './App.css'` from `src/App.tsx`**

### Task 8.3: Delete Legacy Components

- [ ] **Step 1: Delete `src/components/ui/Sidebar.tsx`** (replaced by CompactToolbar)
- [ ] **Step 2: Delete `src/components/ui/Sidebar.legacy.tsx`** (if kept during Phase 5)

### Task 8.4: Relocate shadcn Components (Optional)

- [ ] **Step 1: Move `src/components/ui/shadcn/*.tsx` → `src/components/ui/`**

Once the old Ant Design components are removed, the shadcn subfolder is no longer needed for disambiguation. Move components up one level and update all import paths.

### Task 8.5: Final Verification

- [ ] **Step 1: Run complete verification suite**

```bash
pnpm run lint && pnpm run test:run && pnpm run test:e2e:store && pnpm run build
```

- [ ] **Step 2: Verify bundle size improvement**

```bash
pnpm run build -- --report
```

Ant Design is ~1.2MB+ (even tree-shaken). Removing it should significantly reduce bundle size. shadcn/ui adds zero runtime overhead (it's copy-paste components).

- [ ] **Step 3: Visual smoke test**

Run `pnpm run dev` and manually verify:
- CompactToolbar renders correctly with gate selection, simulation controls
- PropertiesPanel appears when selecting elements
- RightActionBar shows circuit info
- HelpBar shows contextual shortcuts
- Toast notifications work for wiring errors, rename validation, etc.
- 3D canvas renders and interacts normally
- Dark mode is the default; light mode works via toggle

---

## Risk Mitigation

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Tailwind v4 + Vite 8 incompatibility | Low | High | Tailwind v4 has `@tailwindcss/vite` official plugin; design system already uses v4 |
| Bundle bloat during dual-library phase | Medium | Low | Temporary; antd tree-shakes; not a production concern at v0.5 |
| 3D theme tokens break | Low | High | 3D tokens (hex, metalness, roughness) stay in `tokens.ts`; only UI tokens migrate to oklch |
| E2E selectors break on layout changes | High | Medium | Update selectors phase-by-phase; each phase verifies E2E tests |
| `antd message` removal breaks feedback | Low | Medium | Sonner is a near-identical toast API; 1:1 replacement |
| Tailwind class conflicts with existing CSS | Medium | Low | Tailwind's `@layer base` has lowest specificity; existing CSS wins until removed |
| Light mode breaks 3D materials | Low | Medium | 3D materials use direct hex; only UI surfaces use CSS variables |

---

## Appendix: Icon Mapping

| Ant Design Icon | Lucide Replacement | Used In |
|-----------------|-------------------|---------|
| `DeleteOutlined` | `Trash2` | Sidebar |
| `PlayCircleOutlined` | `Play` | Sidebar |
| `PauseCircleOutlined` | `Pause` | Sidebar |
| `ClearOutlined` | `Eraser` or `Trash` | Sidebar |
| `SettingOutlined` | `Settings` | Sidebar |
| `GithubOutlined` | `Github` | Sidebar |
| `LoginOutlined` | `LogIn` or `ArrowRightToLine` | NodeSelector |
| `LogoutOutlined` | `LogOut` or `ArrowLeftFromLine` | NodeSelector |
| `ShareAltOutlined` | `GitBranch` or `Split` | NodeSelector |
| `CloseOutlined` | `X` | DemoOverlay |

---

## Appendix: Ant Design → shadcn/ui Component Mapping

| Ant Design | shadcn/ui Replacement | Notes |
|-----------|----------------------|-------|
| `Layout` + `Sider` + `Content` | Plain `<div>` with Tailwind flex | No wrapper needed |
| `Button` | `Button` (CVA variants) | `type="primary"` → `variant="default"`, `danger` → `variant="destructive"` |
| `Input` | `Input` | Nearly identical API |
| `Switch` | `Switch` (Radix) | Controlled via `checked`/`onCheckedChange` |
| `Tooltip` | `Tooltip` (Radix) | Compound component: Trigger + Content |
| `Typography.Text` | `<span>` with Tailwind classes | `type="secondary"` → `text-muted-foreground` |
| `Typography.Title` | `<h*>` with Tailwind classes | Level maps to heading size |
| `Space` | `<div className="flex gap-*">` | Direction = flex-col/flex-row |
| `Space.Compact` | `<div className="flex">` | Remove rounded corners at join |
| `Divider` | `Separator` (Radix) | `orientation` prop |
| `message.error()` | `toast.error()` (Sonner) | Via `notify` wrapper |
| `message.warning()` | `toast.warning()` (Sonner) | Via `notify` wrapper |
| `message.success()` | `toast.success()` (Sonner) | Via `notify` wrapper |
| `ConfigProvider` | CSS variables + `ThemeProvider` | No runtime config needed |
