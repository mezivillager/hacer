# Chunk 2: Phase B — Foundation (commit 2)

> Spec ref: [`Phase B — Foundation`](../../specs/2026-04-17-design-system-migration-design.md#phase-b--foundation-commit-2)

**Goal:** Add the styling and behavioral foundation. After this commit, Tailwind classes work, OKLch tokens are live, the page applies the correct theme class on first paint with no flash, the Geist font renders, and `notify.*` calls produce real Sonner toasts.

**Branch state going in:** Phase A complete; Ant Design fully gone; bare HTML over canvas.

---

## File inventory

### Add (dependencies)

| Package | Version | Purpose |
|---|---|---|
| `tailwindcss` | `^4.2.0` | Utility-first CSS framework |
| `@tailwindcss/vite` | `^4.2.0` | Vite integration for Tailwind v4 |
| `clsx` | `^2.1.1` | Conditional classnames |
| `tailwind-merge` | `^3.3.1` | Tailwind class deduplication |
| `class-variance-authority` | `^0.7.1` | CVA component variant system |
| `tw-animate-css` | `^1.3.3` | Tailwind animation utilities (used by PropertiesPanel etc.) |
| `lucide-react` | `^0.564.0` | Icon library (matches design-system pin) |
| `sonner` | `^1.7.1` | Toast notifications |
| `next-themes` | `^0.4.6` | Theme switcher (works in non-Next React) |
| `geist` | `^1.5.1` | Geist Sans + Mono fonts (framework-agnostic) |
| `@radix-ui/react-dialog` | `1.1.15` | Dialog primitive |
| `@radix-ui/react-dropdown-menu` | `2.1.16` | Dropdown menu primitive |
| `@radix-ui/react-label` | `2.1.8` | Label primitive |
| `@radix-ui/react-popover` | `1.1.15` | Popover primitive |
| `@radix-ui/react-scroll-area` | `1.2.10` | Scroll area primitive |
| `@radix-ui/react-separator` | `1.1.8` | Separator primitive |
| `@radix-ui/react-slot` | `1.2.4` | Slot composition |
| `@radix-ui/react-switch` | `1.2.6` | Switch primitive |
| `@radix-ui/react-tabs` | `1.1.13` | Tabs primitive (KeyboardShortcutsModal) |
| `@radix-ui/react-toggle` | `1.1.10` | Toggle primitive |
| `@radix-ui/react-toggle-group` | `1.1.11` | Toggle group primitive |
| `@radix-ui/react-tooltip` | `1.2.8` | Tooltip primitive |

`tailwindcss`, `@tailwindcss/vite`, and `tw-animate-css` go in `devDependencies`. Everything else in `dependencies`.

### Create

| Path | Purpose |
|---|---|
| `src/styles/globals.css` | Tailwind directives + OKLch tokens + `@theme inline` map + Geist `@font-face` + globals |
| `src/lib/utils.ts` | shadcn `cn(...)` helper |
| `src/components/ui-kit/theme-provider.tsx` | `next-themes` wrapper |
| `src/components/ui-kit/theme-provider.test.tsx` | Smoke test |
| `components.json` | shadcn CLI config (drops primitives into `src/components/ui-kit/`) |

### Modify

| Path | Change |
|---|---|
| `package.json` | Add deps |
| `vite.config.ts` | Add `tailwindcss()` plugin (must come before `react()`) |
| `index.html` | Add no-flash theme script in `<head>` |
| `src/main.tsx` | Import `./styles/globals.css` instead of `./index.css` |
| `src/lib/notify.ts` | Replace stub with Sonner-backed implementation |
| `src/lib/notify.test.ts` | Update assertions to verify Sonner integration |
| `src/App.tsx` | Wrap in `ThemeProvider`; mount `<Toaster/>`; replace inline styles with Tailwind classes |

### Delete

| Path | Reason |
|---|---|
| `src/index.css` | Globals consolidated into `src/styles/globals.css` |

---

## Tasks

### Task 1: Install dependencies

- [ ] **Step 1.1: Install Tailwind + utilities**

```bash
pnpm add -D tailwindcss@^4.2.0 @tailwindcss/vite@^4.2.0 tw-animate-css@^1.3.3
pnpm add clsx@^2.1.1 tailwind-merge@^3.3.1 class-variance-authority@^0.7.1
```

- [ ] **Step 1.2: Install icon, toast, theme, font packages**

```bash
pnpm add lucide-react@^0.564.0 sonner@^1.7.1 next-themes@^0.4.6 geist@^1.5.1
```

- [ ] **Step 1.3: Install Radix primitives**

```bash
pnpm add \
  @radix-ui/react-dialog@1.1.15 \
  @radix-ui/react-dropdown-menu@2.1.16 \
  @radix-ui/react-label@2.1.8 \
  @radix-ui/react-popover@1.1.15 \
  @radix-ui/react-scroll-area@1.2.10 \
  @radix-ui/react-separator@1.1.8 \
  @radix-ui/react-slot@1.2.4 \
  @radix-ui/react-switch@1.2.6 \
  @radix-ui/react-tabs@1.1.13 \
  @radix-ui/react-toggle@1.1.10 \
  @radix-ui/react-toggle-group@1.1.11 \
  @radix-ui/react-tooltip@1.2.8
```

- [ ] **Step 1.4: Verify install succeeded**

```bash
pnpm run typecheck
```

Expected: green. (No source code uses these yet, so no type errors.)

---

### Task 2: Configure Vite with the Tailwind plugin

**Files:**
- Modify: `vite.config.ts`

- [ ] **Step 2.1: Add the plugin import and registration**

Open `vite.config.ts`. Add the import at the top (alongside existing imports):

```ts
import tailwindcss from '@tailwindcss/vite';
```

In the `plugins` array, add `tailwindcss()` as the **first** entry (must come before `react()`):

```ts
plugins: [
  tailwindcss(),
  react(),
  // ...existing plugins (babel react-compiler, etc.)
],
```

- [ ] **Step 2.2: Verify build still works**

```bash
pnpm run build
```

Expected: green. (No CSS imports use Tailwind classes yet, so build is identical to baseline aside from the plugin being loaded.)

---

### Task 3: Create `src/styles/globals.css`

**Files:**
- Create: `src/styles/globals.css`

- [ ] **Step 3.1: Author the file**

```css
/* src/styles/globals.css */
@import 'tailwindcss';
@import 'tw-animate-css';

@custom-variant dark (&:is(.dark *));

/* Geist font wiring (geist npm package) */
@font-face {
  font-family: 'Geist';
  src: url('geist/dist/fonts/geist-sans/Geist-Variable.woff2') format('woff2');
  font-weight: 100 900;
  font-display: swap;
  font-style: normal;
}

@font-face {
  font-family: 'Geist Mono';
  src: url('geist/dist/fonts/geist-mono/GeistMono-Variable.woff2') format('woff2');
  font-weight: 100 900;
  font-display: swap;
  font-style: normal;
}

/* Light theme — clean engineering blueprint style */
:root {
  --background: oklch(0.97 0.01 240);
  --foreground: oklch(0.18 0.01 240);
  --card: oklch(1 0 0);
  --card-foreground: oklch(0.18 0.01 240);
  --popover: oklch(1 0 0);
  --popover-foreground: oklch(0.18 0.01 240);
  --primary: oklch(0.50 0.15 180);
  --primary-foreground: oklch(0.98 0 0);
  --secondary: oklch(0.94 0.01 240);
  --secondary-foreground: oklch(0.25 0.01 240);
  --muted: oklch(0.94 0.01 240);
  --muted-foreground: oklch(0.45 0.01 240);
  --accent: oklch(0.50 0.15 180);
  --accent-foreground: oklch(0.98 0 0);
  --destructive: oklch(0.55 0.2 25);
  --destructive-foreground: oklch(0.98 0 0);
  --warning: oklch(0.70 0.15 80);
  --warning-foreground: oklch(0.18 0.01 240);
  --border: oklch(0.88 0.01 240);
  --input: oklch(0.94 0.01 240);
  --ring: oklch(0.50 0.15 180);
  --chart-1: oklch(0.50 0.15 180);
  --chart-2: oklch(0.55 0.12 145);
  --chart-3: oklch(0.50 0.18 280);
  --chart-4: oklch(0.60 0.15 85);
  --chart-5: oklch(0.55 0.20 30);
  --radius: 0.5rem;
  --sidebar: oklch(0.98 0.005 240);
  --sidebar-foreground: oklch(0.18 0.01 240);
  --sidebar-primary: oklch(0.50 0.15 180);
  --sidebar-primary-foreground: oklch(0.98 0 0);
  --sidebar-accent: oklch(0.94 0.01 240);
  --sidebar-accent-foreground: oklch(0.18 0.01 240);
  --sidebar-border: oklch(0.88 0.01 240);
  --sidebar-ring: oklch(0.50 0.15 180);
  --canvas-bg: oklch(0.95 0.01 240);
  --canvas-grid: oklch(0.82 0.02 240);
}

/* Dark theme — EDA/CAD inspired */
.dark {
  --background: oklch(0.12 0.01 240);
  --foreground: oklch(0.92 0 0);
  --card: oklch(0.16 0.01 240);
  --card-foreground: oklch(0.92 0 0);
  --popover: oklch(0.14 0.01 240);
  --popover-foreground: oklch(0.92 0 0);
  --primary: oklch(0.65 0.15 180);
  --primary-foreground: oklch(0.12 0.01 240);
  --secondary: oklch(0.22 0.01 240);
  --secondary-foreground: oklch(0.85 0 0);
  --muted: oklch(0.20 0.01 240);
  --muted-foreground: oklch(0.55 0 0);
  --accent: oklch(0.65 0.15 180);
  --accent-foreground: oklch(0.12 0.01 240);
  --destructive: oklch(0.55 0.2 25);
  --destructive-foreground: oklch(0.92 0 0);
  --warning: oklch(0.75 0.18 80);
  --warning-foreground: oklch(0.12 0.01 240);
  --border: oklch(0.25 0.01 240);
  --input: oklch(0.20 0.01 240);
  --ring: oklch(0.65 0.15 180);
  --chart-1: oklch(0.65 0.15 180);
  --chart-2: oklch(0.70 0.12 145);
  --chart-3: oklch(0.60 0.18 280);
  --chart-4: oklch(0.75 0.15 85);
  --chart-5: oklch(0.65 0.20 30);
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
}

@theme inline {
  --font-sans: 'Geist', 'Geist Fallback', -apple-system, BlinkMacSystemFont, 'Segoe UI',
    Roboto, 'Helvetica Neue', Arial, sans-serif;
  --font-mono: 'Geist Mono', ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas,
    'Liberation Mono', monospace;
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
  --color-destructive-foreground: var(--destructive-foreground);
  --color-warning: var(--warning);
  --color-warning-foreground: var(--warning-foreground);
  --color-border: var(--border);
  --color-input: var(--input);
  --color-ring: var(--ring);
  --color-chart-1: var(--chart-1);
  --color-chart-2: var(--chart-2);
  --color-chart-3: var(--chart-3);
  --color-chart-4: var(--chart-4);
  --color-chart-5: var(--chart-5);
  --radius-sm: calc(var(--radius) - 4px);
  --radius-md: calc(var(--radius) - 2px);
  --radius-lg: var(--radius);
  --radius-xl: calc(var(--radius) + 4px);
  --color-sidebar: var(--sidebar);
  --color-sidebar-foreground: var(--sidebar-foreground);
  --color-sidebar-primary: var(--sidebar-primary);
  --color-sidebar-primary-foreground: var(--sidebar-primary-foreground);
  --color-sidebar-accent: var(--sidebar-accent);
  --color-sidebar-accent-foreground: var(--sidebar-accent-foreground);
  --color-sidebar-border: var(--sidebar-border);
  --color-sidebar-ring: var(--sidebar-ring);
  --color-canvas-bg: var(--canvas-bg);
  --color-canvas-grid: var(--canvas-grid);
}

@layer base {
  * {
    @apply border-border outline-ring/50;
    margin: 0;
    padding: 0;
    box-sizing: border-box;
  }
  html,
  body,
  #root {
    width: 100%;
    height: 100%;
    overflow: hidden;
  }
  body {
    @apply bg-background text-foreground;
    font-family: var(--font-sans);
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
  }
  canvas {
    display: block;
  }
}
```

Notes vs design-system source:
- Adds `--warning` and `--warning-foreground` tokens (used by StatusBar warning severity in 3e — design-system has no `--warning`)
- Adds the `* { margin/padding/box-sizing }` reset and `html, body, #root` sizing rules from the deleted `src/index.css`
- Adds `canvas { display: block }` so R3F canvas doesn't introduce inline-block whitespace artifacts
- `font-display: swap` on Geist (matches `next/font` behavior)

- [ ] **Step 3.2: Verify the file imports cleanly**

```bash
pnpm run build
```

Expected: green. (Tailwind v4 plugin processes globals.css; OKLch values pass through untouched; @font-face URLs resolve via the `geist` package's package-relative paths.)

If the build fails on font-file resolution, switch to explicit asset imports as documented in the `geist` package README — capture the failure mode in `tasks/lessons.md` and fix here.

---

### Task 4: Switch `main.tsx` to import `globals.css`, delete `index.css`

**Files:**
- Modify: `src/main.tsx`
- Delete: `src/index.css`

- [ ] **Step 4.1: Update `main.tsx`**

Replace:
```ts
import './index.css';
```
with:
```ts
import './styles/globals.css';
```

- [ ] **Step 4.2: Delete `index.css`**

```bash
rm src/index.css
```

- [ ] **Step 4.3: Verify build**

```bash
pnpm run build
```

Expected: green.

---

### Task 5: Create `src/lib/utils.ts` (`cn` helper)

**Files:**
- Create: `src/lib/utils.ts`

- [ ] **Step 5.1: Author the file**

```ts
// src/lib/utils.ts
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
```

- [ ] **Step 5.2: Verify typecheck**

```bash
pnpm run typecheck
```

Expected: green.

(No co-located test required — `cn` is a 1-line composition of well-tested upstream packages.)

---

### Task 6: Replace `notify` stub with Sonner-backed implementation (TDD)

**Files:**
- Modify: `src/lib/notify.ts`
- Modify: `src/lib/notify.test.ts`

- [ ] **Step 6.1: Update the test first (failing test)**

Replace `src/lib/notify.test.ts` with:

```ts
// src/lib/notify.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { notify } from './notify';

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    info: vi.fn(),
    error: vi.fn(),
    warning: vi.fn(),
  },
}));

import { toast } from 'sonner';

describe('notify (Sonner-backed)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it.each(['success', 'info', 'error', 'warning'] as const)(
    'forwards notify.%s to sonner toast.%s',
    (level) => {
      notify[level]('hello');
      expect(toast[level]).toHaveBeenCalledWith('hello', undefined);
    },
  );

  it('forwards options when provided', () => {
    notify.error('boom', { description: 'details', duration: 1000 });
    expect(toast.error).toHaveBeenCalledWith('boom', {
      description: 'details',
      duration: 1000,
    });
  });
});
```

- [ ] **Step 6.2: Run the test, confirm it fails**

```bash
pnpm vitest run src/lib/notify.test.ts
```

Expected: failure — current `notify` calls `console.warn`, not `toast`.

- [ ] **Step 6.3: Update the implementation**

Replace `src/lib/notify.ts` with:

```ts
// src/lib/notify.ts
import { toast } from 'sonner';

type NotifyOpts = { description?: string; duration?: number };

export const notify = {
  success: (msg: string, opts?: NotifyOpts) => toast.success(msg, opts),
  info: (msg: string, opts?: NotifyOpts) => toast.info(msg, opts),
  error: (msg: string, opts?: NotifyOpts) => toast.error(msg, opts),
  warning: (msg: string, opts?: NotifyOpts) => toast.warning(msg, opts),
};
```

- [ ] **Step 6.4: Run the test, confirm it passes**

```bash
pnpm vitest run src/lib/notify.test.ts
```

Expected: 5 tests pass.

- [ ] **Step 6.5: Run all unit tests to confirm Phase A `notify` consumers still pass**

```bash
pnpm run test:run
```

Expected: green. The test files patched in chunk 1 spy on `notify.*` directly (not on `console.warn`), so the implementation swap is invisible to them.

---

### Task 7: Create `ThemeProvider` wrapper (TDD)

**Files:**
- Create: `src/components/ui-kit/theme-provider.tsx`
- Create: `src/components/ui-kit/theme-provider.test.tsx`

- [ ] **Step 7.1: Write the failing test**

```tsx
// src/components/ui-kit/theme-provider.test.tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ThemeProvider } from './theme-provider';

vi.mock('next-themes', () => ({
  ThemeProvider: ({ children, ...props }: { children: React.ReactNode } & Record<string, unknown>) => (
    <div data-testid="next-themes-provider" data-props={JSON.stringify(props)}>
      {children}
    </div>
  ),
}));

describe('ThemeProvider', () => {
  it('wraps next-themes ThemeProvider with HACER defaults', () => {
    render(
      <ThemeProvider>
        <span data-testid="child">child</span>
      </ThemeProvider>,
    );
    const provider = screen.getByTestId('next-themes-provider');
    const props = JSON.parse(provider.dataset.props ?? '{}') as Record<string, unknown>;
    expect(props.attribute).toBe('class');
    expect(props.defaultTheme).toBe('system');
    expect(props.enableSystem).toBe(true);
    expect(props.disableTransitionOnChange).toBe(true);
    expect(screen.getByTestId('child')).toBeInTheDocument();
  });

  it('allows callers to override defaults', () => {
    render(
      <ThemeProvider defaultTheme="dark">
        <span>x</span>
      </ThemeProvider>,
    );
    const provider = screen.getByTestId('next-themes-provider');
    const props = JSON.parse(provider.dataset.props ?? '{}') as Record<string, unknown>;
    expect(props.defaultTheme).toBe('dark');
  });
});
```

- [ ] **Step 7.2: Run the test, confirm it fails**

```bash
pnpm vitest run src/components/ui-kit/theme-provider.test.tsx
```

Expected: failure — module does not exist.

- [ ] **Step 7.3: Create the implementation**

```tsx
// src/components/ui-kit/theme-provider.tsx
import { ThemeProvider as NextThemesProvider } from 'next-themes';
import { type ComponentProps } from 'react';

export function ThemeProvider({
  children,
  ...props
}: ComponentProps<typeof NextThemesProvider>) {
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

- [ ] **Step 7.4: Run the test, confirm it passes**

```bash
pnpm vitest run src/components/ui-kit/theme-provider.test.tsx
```

Expected: 2 tests pass.

---

### Task 8: Add `components.json` (shadcn CLI config)

**Files:**
- Create: `components.json` (project root)

- [ ] **Step 8.1: Author the file**

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

The `aliases.ui` value is the deviation from the shadcn default — it routes `npx shadcn add` primitive copies into `src/components/ui-kit/` so HACER's own shell components in `src/components/ui/` don't collide.

- [ ] **Step 8.2: Verify `npx shadcn add` resolution (smoke)**

```bash
npx shadcn@latest add button --dry-run 2>&1 | head -20
```

Expected: dry-run output mentions `src/components/ui-kit/button.tsx` as the destination. (If `--dry-run` isn't supported by your CLI version, skip this step — the real verification is in chunk 3.)

---

### Task 9: Add no-flash theme script to `index.html`

**Files:**
- Modify: `index.html`

- [ ] **Step 9.1: Insert the script in `<head>`**

In `index.html`, inside `<head>` and **before** `<script type="module" src="/src/main.tsx"></script>`, insert:

```html
<script>
  // Avoid theme flash before React hydration. Mirrors next-themes runtime behavior
  // for SSR-less Vite apps. Single class write on document.documentElement.
  try {
    var stored = localStorage.getItem('theme');
    var theme = stored || 'system';
    var dark = theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
    if (dark) document.documentElement.classList.add('dark');
  } catch (_) {}
</script>
```

- [ ] **Step 9.2: Verify build**

```bash
pnpm run build
```

Expected: green. The inline script is included verbatim in the production HTML.

- [ ] **Step 9.3: Manual cold-load verification (devtools open)**

```bash
pnpm run dev
```

In the browser:
1. Open in private/incognito (no localStorage history)
2. With OS in dark mode → first paint is dark (background `oklch(0.12...)`)
3. With OS in light mode → first paint is light
4. Set `localStorage.theme = 'light'` in DevTools, reload → light
5. Set `localStorage.theme = 'dark'` in DevTools, reload → dark
6. Confirm no white-flash → dark transition, or vice versa

(Actual theme controls land in chunk 3 with the CompactToolbar theme picker.)

---

### Task 10: Rewrite `src/App.tsx` for Phase B (themed minimal shell)

**Files:**
- Modify: `src/App.tsx`

- [ ] **Step 10.1: Replace contents**

```tsx
// src/App.tsx
import { ThemeProvider } from '@/components/ui-kit/theme-provider';
import { Toaster } from 'sonner';
import { CanvasArea } from '@/components/canvas/CanvasArea';
import { StatusBar } from '@/components/ui/StatusBar';

// Phase B scaffold: themed shell, Sonner mounted. Shell components land in Phase C.
function App() {
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

export default App;
```

(`<TooltipProvider>` is added in chunk 3 alongside the first tooltip consumer — CompactToolbar.)

- [ ] **Step 10.2: Verify typecheck and build**

```bash
pnpm run typecheck && pnpm run build
```

Expected: green.

---

### Task 11: Phase B verification gate

- [ ] **Step 11.1: Lint**

```bash
pnpm run lint
```

Expected: green.

- [ ] **Step 11.2: Unit tests**

```bash
pnpm run test:run
```

Expected: green. New tests added: `notify` (5), `theme-provider` (2). Existing `notify` consumer tests still pass.

- [ ] **Step 11.3: Store E2E**

```bash
pnpm run test:e2e:store
```

Expected: green.

- [ ] **Step 11.4: UI E2E (still all skipped)**

```bash
pnpm run test:e2e:ui
```

Expected: 0 passed, all skipped, 0 failed.

- [ ] **Step 11.5: Build**

```bash
pnpm run build
```

Expected: green. Tailwind processed; CSS bundle has token defs; bundle size has grown vs Phase A by ~50–80 KB gzipped (Tailwind runtime + Radix + Sonner) — still net smaller than baseline.

- [ ] **Step 11.6: Manual smoke**

```bash
pnpm run dev
```

In the browser:
1. Cold-load: themed background applies immediately, no flash
2. Open DevTools → Computed → body's `font-family` resolves to `Geist`
3. In console:
   ```js
   import('/src/lib/notify.ts').then(m => m.notify.success('Phase B works'));
   ```
   Expected: green Sonner toast appears top-right with the message
4. Toggle `<html>` `class` between adding/removing `dark` in DevTools Elements → background flips dark/light instantly without reload
5. R3F canvas still renders; gates can still be placed via `window.circuitActions.placeGate('NAND', ...)` from console

---

### Task 12: Commit Phase B

- [ ] **Step 12.1: Stage and commit**

```bash
git add -A
git status                    # review

git commit -m "$(cat <<'EOF'
feat(ui): add Tailwind v4 + shadcn foundation

Installs Tailwind CSS v4 (+ @tailwindcss/vite plugin), tw-animate-css, clsx,
tailwind-merge, class-variance-authority, lucide-react, sonner, next-themes,
geist, and 12 Radix UI primitive packages. Adds shadcn CLI config
(components.json) routing primitives to src/components/ui-kit/.

Creates src/styles/globals.css with OKLch token sets for light + dark
themes, @theme inline map, Geist @font-face wiring, and globals reset.
Replaces notify stub with Sonner-backed implementation. Adds custom
ThemeProvider wrapping next-themes with HACER defaults. Inlines no-flash
theme detection script in index.html (single class write on documentElement).

App.tsx wraps in ThemeProvider and mounts <Toaster /> at root. CanvasArea
unchanged. StatusBar visual unchanged (restyled in chunk 7). No new
interactive UI affordances yet \u2014 those land starting in chunk 3
(CompactToolbar).

CI gates green: lint, test:run, test:e2e:store, build.

Refs: docs/plans/2026-04-17-design-system-migration/02-phase-b-foundation.md
EOF
)"
```

- [ ] **Step 12.2: Verify commit landed**

```bash
git log --oneline -3
```

- [ ] **Step 12.3: Update todo list**

Mark chunk 2 complete; mark chunk 3 in-progress.

---

## Phase B complete

Chunk 2 done. Move to [`03-phase-c-3a-compact-toolbar.md`](./03-phase-c-3a-compact-toolbar.md).
