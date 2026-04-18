# Chunk 8: Phase D — R3F retoken (commit 4)

> Spec ref: [`Phase D — R3F retoken`](../../specs/2026-04-17-design-system-migration-design.md#phase-d--r3f-retoken-commit-4)

**Goal:** Make 3D scene colors theme-aware. After this commit, canvas backdrop, grid, gate bodies, pins, wires, axes shift correctly when the user toggles light / dark / system. THREE.js materials reactively re-read CSS custom properties via a `useThemeColor` hook.

---

## File inventory

### Create

| Path | Purpose |
|---|---|
| `src/components/canvas/hooks/useThemeColor.ts` | CSS-var resolver hook that returns a THREE.Color, re-reads on theme change |
| `src/components/canvas/hooks/useThemeColor.test.tsx` | Hook tests with mocked `getComputedStyle` |

### Modify (color-source swap)

Per the token mapping in spec §5:

| Path | Change |
|---|---|
| `src/theme/tokens.ts` | Drop color exports; keep only non-color constants (e.g. opacity values). If file becomes empty, delete it and `src/theme/` directory. |
| `src/components/canvas/Scene/SceneGrid.tsx` | Color sources → `useThemeColor('--canvas-grid')` |
| `src/components/canvas/Scene/GroundPlane.tsx` | `useThemeColor('--canvas-bg')` |
| `src/components/canvas/Scene/SceneAxes.tsx` | `useThemeColor('--muted-foreground')` |
| `src/components/canvas/Scene/Scene.tsx` (or `SceneContent.tsx`) | If R3F `<Canvas>` `gl.setClearColor` is set, swap to `useThemeColor('--canvas-bg')` |
| `src/components/canvas/Scene/PlacementPreview.tsx` | Preview material → `useThemeColor('--primary')` |
| `src/components/canvas/Scene/Wire3D.tsx` | Idle / active → `useThemeColor('--muted-foreground')` and `useThemeColor('--primary')` |
| `src/components/canvas/Scene/JunctionPreview.tsx` | Same wire color treatment |
| `src/components/canvas/Scene/WirePreview.tsx` | Same |
| `src/gates/common/BaseGate.tsx` (or equivalent) | Body fill → `--card`, border → `--border`, text → `--foreground` |
| `src/gates/common/GatePin.tsx` | Idle → `--muted-foreground`, active → `--primary` |
| `src/gates/common/WireStub.tsx` | Same |

(Verify exact file list at impl by greping `from '@/theme/tokens'` and `tokens\\.` consumers.)

---

## Tasks

### Task 1: Build `useThemeColor` (TDD)

**Files:**
- Create: `src/components/canvas/hooks/useThemeColor.test.tsx`
- Create: `src/components/canvas/hooks/useThemeColor.ts`

- [ ] **Step 1.1: Write the failing test**

```tsx
// src/components/canvas/hooks/useThemeColor.test.tsx
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { Color } from 'three';
import { useThemeColor } from './useThemeColor';

let resolvedTheme = 'dark';
vi.mock('next-themes', () => ({
  useTheme: () => ({ resolvedTheme }),
}));

const mockComputedStyle = (cssVar: string, value: string) => {
  const original = window.getComputedStyle;
  vi.spyOn(window, 'getComputedStyle').mockImplementation((el) => ({
    ...original(el),
    getPropertyValue: (prop: string) => (prop === cssVar ? value : ''),
  } as unknown as CSSStyleDeclaration));
};

describe('useThemeColor', () => {
  beforeEach(() => { resolvedTheme = 'dark'; });
  afterEach(() => { vi.restoreAllMocks(); });

  it('returns a THREE.Color matching the resolved CSS variable', () => {
    mockComputedStyle('--canvas-bg', 'oklch(0.12 0.01 240)');
    const { result } = renderHook(() => useThemeColor('--canvas-bg'));
    expect(result.current).toBeInstanceOf(Color);
  });

  it('re-reads the CSS variable when resolvedTheme changes', () => {
    mockComputedStyle('--canvas-bg', 'oklch(0.12 0.01 240)');
    const { result, rerender } = renderHook(() => useThemeColor('--canvas-bg'));
    const darkColor = result.current.clone();

    mockComputedStyle('--canvas-bg', 'oklch(0.95 0.01 240)');
    resolvedTheme = 'light';
    rerender();
    expect(result.current.equals(darkColor)).toBe(false);
  });

  it('returns a fallback color when the CSS variable is empty', () => {
    mockComputedStyle('--undefined-var', '');
    const { result } = renderHook(() => useThemeColor('--undefined-var'));
    expect(result.current).toBeInstanceOf(Color);
  });
});
```

- [ ] **Step 1.2: Run, fail**

```bash
pnpm vitest run src/components/canvas/hooks/useThemeColor.test.tsx
```

- [ ] **Step 1.3: Implement**

```ts
// src/components/canvas/hooks/useThemeColor.ts
import { useTheme } from 'next-themes';
import { useEffect, useState } from 'react';
import { Color } from 'three';

const FALLBACK = '#888';

export function useThemeColor(cssVar: string): Color {
  const { resolvedTheme } = useTheme();
  const [color, setColor] = useState(() => readCssColor(cssVar));

  useEffect(() => {
    setColor(readCssColor(cssVar));
  }, [resolvedTheme, cssVar]);

  return color;
}

function readCssColor(cssVar: string): Color {
  if (typeof window === 'undefined') return new Color(FALLBACK);
  const value = getComputedStyle(document.documentElement).getPropertyValue(cssVar).trim();
  const c = new Color();
  try {
    if (!value) {
      c.set(FALLBACK);
    } else {
      // THREE 0.183 supports OKLch via Color.setStyle (CSS Color 4 spec)
      c.setStyle(value);
    }
  } catch {
    c.set(FALLBACK);
  }
  return c;
}
```

- [ ] **Step 1.4: Run, pass**

```bash
pnpm vitest run src/components/canvas/hooks/useThemeColor.test.tsx
```

---

### Task 2: Audit existing token consumers

- [ ] **Step 2.1: Find all consumers of `src/theme/tokens.ts`**

```bash
rg "from ['\"]@/theme['\"]|from ['\"]@/theme/tokens['\"]" src/
rg "tokens\\.\\w+(Color|Background)" src/
```

This produces the exact file list to modify in subsequent tasks. Document any consumer not listed in the file inventory above as a deviation in `tasks/lessons.md`.

---

### Task 3: Sweep R3F components to use `useThemeColor`

For each consumer file from Task 2:

- [ ] **Step 3.x.1: Replace import**

Remove `import { tokens } from '@/theme/tokens';` (or similar). Add `import { useThemeColor } from '@/components/canvas/hooks/useThemeColor';`.

- [ ] **Step 3.x.2: Replace color reads at the call sites**

Replace each `tokens.gridCellColor` (etc.) with the matching `useThemeColor('--canvas-grid')` (etc.) per the token mapping table in spec §5.

- [ ] **Step 3.x.3: For materials passed `color={...}` prop**

Pass the Color instance directly (R3F supports this).

- [ ] **Step 3.x.4: For materials needing imperative update (e.g. `gl.setClearColor`)**

Use a `useEffect` that depends on the color instance and calls `setClearColor` on the THREE renderer.

Apply this pattern across all files in the file inventory (8–11 files expected). Each file's existing tests should continue passing — most assert structure, not color values. Where a test asserted a specific hex/rgb color from the deleted `tokens.ts`, update the assertion to assert that the material received "a Color instance" rather than a specific value (or mock `useThemeColor` to return a known color).

- [ ] **Step 3.5: Verify all `tokens` consumers are migrated**

```bash
rg "tokens\\.\\w+" src/components/ src/gates/
```

Expected: zero matches (or only matches in non-color contexts such as opacity constants).

---

### Task 4: Clean up `src/theme/tokens.ts` and `src/theme/`

- [ ] **Step 4.1: Open `src/theme/tokens.ts`**

If only color exports remained and they're all migrated, delete the file:

```bash
rm src/theme/tokens.ts
```

If non-color constants survive (e.g. `GATE_BODY_OPACITY`), keep the file with only those exports.

- [ ] **Step 4.2: Delete `src/theme/` directory if empty**

```bash
rmdir src/theme 2>/dev/null
```

(Will succeed only if empty.)

---

### Task 5: Phase D verification gate

- [ ] **Step 5.1: All four mandatory gates**

```bash
pnpm run lint && pnpm run test:run && pnpm run test:e2e:store && pnpm run build
```

- [ ] **Step 5.2: Manual visual QA pass (mandatory) — both themes**

Per spec §5 verification table:

| Check | Action |
|---|---|
| Dark baseline | Open in dark mode; 3D scene reads cohesive |
| Light baseline | Toggle to light; entire 3D scene flips to light palette |
| Mid-session toggle | With gates placed and a wire active → toggle theme → all colors flip immediately, no flash, no stuck materials |
| Selected element | Select a gate → outline matches `--ring` token |
| Placement preview | Pick NAND from CompactToolbar → ghost matches `--primary` at correct alpha in active theme |
| Wire signal states | Run sim → high-signal wires `--primary`, low-signal `--muted-foreground` in both themes |
| Cycle error highlight | Force a combinational cycle → cycle highlight uses `--destructive` in both themes |
| GitHub Pages preview | `pnpm run build && pnpm run preview` under `/hacer/` base path |

If any element looks visually wrong in light mode, tune the token mapping or alpha value in the affected file. Document any persistent issue in `tasks/lessons.md`.

---

### Task 6: Commit Phase D

```bash
git add -A
git commit -m "$(cat <<'EOF'
feat(canvas): retokenize R3F scene to design-system OKLch tokens

Adds useThemeColor hook that reads CSS custom properties off
documentElement, parses to a THREE.Color via Color.setStyle (THREE 0.183
supports OKLch per CSS Color 4 spec), and re-reads on resolvedTheme
changes from next-themes.

Sweeps all R3F materials to use useThemeColor for canvas-bg,
canvas-grid, primary (active wire / pin / placement preview),
muted-foreground (idle wire / pin / axes), card / border / foreground
(gate body / border / text), ring (selection outline), destructive
(cycle errors).

Removes color exports from src/theme/tokens.ts (deletes the file if
empty after migration); keeps non-color constants if any. Removes
src/theme/ directory if empty.

3D scene now flips cohesively when user toggles light/dark/system theme
via CompactToolbar theme picker. No reload needed.

CI gates green.

Refs: docs/plans/2026-04-17-design-system-migration/08-phase-d-r3f-retoken.md
EOF
)"
```

Move to chunk 9.

---

## Phase D complete

Move to [`09-phase-e-ui-spec-restoration.md`](./09-phase-e-ui-spec-restoration.md).
