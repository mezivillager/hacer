# Performance Mode Switch Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a user-visible two-mode performance switch so HACER can run either in full-detail Normal mode or in Low Power mode with reduced CPU/GPU pressure.

**Architecture:** Add one persisted `performanceMode` field to the Zustand circuit store and expose it through `circuitActions`. The UI lives in the existing CompactToolbar Settings button, and rendering code reads the mode through narrow selectors to choose canvas DPR/frameloop/shadow policy, scene detail, wire preview cadence, and expensive 3D decorative detail.

**Tech Stack:** React 19, TypeScript 5.9 strict, Zustand + Immer, React Three Fiber, drei, Tailwind/shadcn-style UI primitives, Vitest, Playwright.

---

## Accepted Design

HACER will have exactly two modes:

- `normal`: full-detail rendering, continuous render loop, normal DPR range, shadows, environment lighting, normal wire detail, gate labels.
- `low-power`: assumes the device cannot sustain intense CPU/GPU work, so it caps DPR to `1`, switches the R3F canvas to `frameloop="demand"`, disables shadows and environment lighting, disables OrbitControls damping, uses a finite/lighter grid, lowers wire arc detail, hides gate text labels, and slows wire preview updates.

Mode is app-level UI/rendering policy, not circuit data. It should persist across reloads via a small localStorage helper but should not become part of circuit serialization.

## File Structure

- Create `src/lib/performanceModeStorage.ts`: read/write/validate the persisted performance mode.
- Create `src/lib/performanceModeStorage.test.ts`: storage helper unit tests.
- Modify `src/store/types.ts`: add `PerformanceMode`, `performanceMode`, and store actions.
- Modify `src/store/circuitStore.ts`: initialize mode and expose actions.
- Modify `src/store/actions/viewActions/viewActions.ts`: implement mode actions alongside other view/UI actions.
- Create `src/store/actions/viewActions/viewActions.test.ts`: store-level tests for mode actions.
- Modify `src/components/ui/CompactToolbar.tsx`: replace the Settings stub with a settings popover containing the Low Power switch.
- Modify `src/components/ui/CompactToolbar.test.tsx`: verify UI switch behavior and reflected state.
- Modify `e2e/selectors/ui.selectors.ts`: add selectors for the settings popover and low-power switch.
- Create `e2e/specs/performance/performance-mode.ui.spec.ts`: Playwright UI coverage for switching modes.
- Create `src/components/canvas/Scene/renderConfig.ts`: pure canvas config policy for both modes.
- Create `src/components/canvas/Scene/renderConfig.test.ts`: pure render policy tests.
- Create `src/components/canvas/Scene/Scene.test.tsx`: verify `Scene` wires mode into `<Canvas />`.
- Modify `src/components/canvas/Scene/Scene.tsx`: apply mode-specific R3F canvas props.
- Modify `src/components/canvas/Scene/SceneContent.tsx`: skip environment and shadows in low-power mode.
- Modify `src/components/canvas/Scene/SceneContent.test.tsx`: assert environment/shadow behavior.
- Modify `src/components/canvas/Scene/SceneGrid.tsx`: reduce grid cost in low-power mode.
- Modify `src/components/canvas/Scene/SceneGrid.test.tsx`: assert finite/lighter grid in low-power mode.
- Modify `src/components/canvas/Scene/SceneOrbitControls.tsx`: disable damping in low-power mode.
- Modify `src/components/canvas/Scene/SceneOrbitControls.test.tsx`: assert damping policy.
- Modify `src/gates/common/BaseGate.tsx`: hide drei text labels in low-power mode.
- Modify `src/gates/common/BaseGate.test.tsx`: assert labels are omitted in low-power mode.
- Modify `src/components/canvas/Wire3D.tsx`: reduce arc sample count and selected line width in low-power mode.
- Modify `src/components/canvas/Wire3D.test.tsx`: test the exported arc sample policy.
- Modify `src/components/canvas/handlers/groundPlaneHandlers.ts`: use slower wire preview debounce in low-power mode.
- Modify `src/components/canvas/Scene/WirePreview.tsx`: move pathfinding error side effects out of render.
- Modify `src/components/canvas/Scene/WirePreview.test.tsx`: assert render-safe error handling.
- Run docs sync author pass from `docs/llm-docs-sync.md` because this changes public UI behavior.

## Task 1: Store State And Persistence

**Files:**
- Create: `src/lib/performanceModeStorage.ts`
- Create: `src/lib/performanceModeStorage.test.ts`
- Modify: `src/store/types.ts`
- Modify: `src/store/circuitStore.ts`
- Modify: `src/store/actions/viewActions/viewActions.ts`
- Create: `src/store/actions/viewActions/viewActions.test.ts`

- [ ] **Step 1: Write the failing storage helper test**

Create `src/lib/performanceModeStorage.test.ts`:

```ts
import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  readPerformanceMode,
  writePerformanceMode,
  isPerformanceMode,
  PERFORMANCE_MODE_STORAGE_KEY,
} from './performanceModeStorage'

describe('performanceModeStorage', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.restoreAllMocks()
  })

  it('accepts only known performance modes', () => {
    expect(isPerformanceMode('normal')).toBe(true)
    expect(isPerformanceMode('low-power')).toBe(true)
    expect(isPerformanceMode('fast')).toBe(false)
    expect(isPerformanceMode(null)).toBe(false)
  })

  it('defaults to normal when no value is stored', () => {
    expect(readPerformanceMode()).toBe('normal')
  })

  it('reads a stored low-power value', () => {
    localStorage.setItem(PERFORMANCE_MODE_STORAGE_KEY, 'low-power')
    expect(readPerformanceMode()).toBe('low-power')
  })

  it('falls back to normal for invalid stored values', () => {
    localStorage.setItem(PERFORMANCE_MODE_STORAGE_KEY, 'turbo')
    expect(readPerformanceMode()).toBe('normal')
  })

  it('writes selected mode to localStorage', () => {
    writePerformanceMode('low-power')
    expect(localStorage.getItem(PERFORMANCE_MODE_STORAGE_KEY)).toBe('low-power')
  })

  it('does not throw if localStorage rejects writes', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('storage blocked')
    })

    expect(() => writePerformanceMode('low-power')).not.toThrow()
  })
})
```

- [ ] **Step 2: Run the storage helper test and verify it fails**

Run:

```bash
pnpm vitest run src/lib/performanceModeStorage.test.ts
```

Expected: FAIL because `src/lib/performanceModeStorage.ts` does not exist.

- [ ] **Step 3: Implement the storage helper**

Create `src/lib/performanceModeStorage.ts`:

```ts
import type { PerformanceMode } from '@/store/types'

export const PERFORMANCE_MODE_STORAGE_KEY = 'hacer.performanceMode'

export function isPerformanceMode(value: unknown): value is PerformanceMode {
  return value === 'normal' || value === 'low-power'
}

export function readPerformanceMode(): PerformanceMode {
  if (typeof window === 'undefined') return 'normal'

  try {
    const stored = window.localStorage.getItem(PERFORMANCE_MODE_STORAGE_KEY)
    return isPerformanceMode(stored) ? stored : 'normal'
  } catch {
    return 'normal'
  }
}

export function writePerformanceMode(mode: PerformanceMode): void {
  if (typeof window === 'undefined') return

  try {
    window.localStorage.setItem(PERFORMANCE_MODE_STORAGE_KEY, mode)
  } catch {
    // Storage can be unavailable in private or locked-down browser contexts.
  }
}
```

- [ ] **Step 4: Run the storage helper test and verify it passes**

Run:

```bash
pnpm vitest run src/lib/performanceModeStorage.test.ts
```

Expected: PASS.

- [ ] **Step 5: Write the failing store action test**

Create `src/store/actions/viewActions/viewActions.test.ts`:

```ts
import { describe, it, expect, beforeEach } from 'vitest'
import { circuitActions, useCircuitStore } from '@/store/circuitStore'
import { PERFORMANCE_MODE_STORAGE_KEY } from '@/lib/performanceModeStorage'

describe('viewActions performance mode', () => {
  beforeEach(() => {
    localStorage.clear()
    useCircuitStore.setState({
      performanceMode: 'normal',
      showAxes: false,
      propertiesPanelOpen: false,
    })
  })

  it('defaults to normal mode', () => {
    expect(useCircuitStore.getState().performanceMode).toBe('normal')
  })

  it('sets low-power mode and persists it', () => {
    circuitActions.setPerformanceMode('low-power')

    expect(useCircuitStore.getState().performanceMode).toBe('low-power')
    expect(localStorage.getItem(PERFORMANCE_MODE_STORAGE_KEY)).toBe('low-power')
  })

  it('sets normal mode and persists it', () => {
    circuitActions.setPerformanceMode('low-power')
    circuitActions.setPerformanceMode('normal')

    expect(useCircuitStore.getState().performanceMode).toBe('normal')
    expect(localStorage.getItem(PERFORMANCE_MODE_STORAGE_KEY)).toBe('normal')
  })

  it('toggles between modes', () => {
    circuitActions.togglePerformanceMode()
    expect(useCircuitStore.getState().performanceMode).toBe('low-power')

    circuitActions.togglePerformanceMode()
    expect(useCircuitStore.getState().performanceMode).toBe('normal')
  })
})
```

- [ ] **Step 6: Run the store action test and verify it fails**

Run:

```bash
pnpm vitest run src/store/actions/viewActions/viewActions.test.ts
```

Expected: FAIL with TypeScript errors for missing `performanceMode`, `setPerformanceMode`, and `togglePerformanceMode`.

- [ ] **Step 7: Add types for performance mode**

Modify `src/store/types.ts`.

Add near the existing basic types:

```ts
export type PerformanceMode = 'normal' | 'low-power'
```

Add to `CircuitState` near `showAxes`:

```ts
  performanceMode: PerformanceMode
```

Extend `ViewActions`:

```ts
export interface ViewActions {
  toggleAxes: () => void
  openPropertiesPanel: () => void
  closePropertiesPanel: () => void
  togglePropertiesPanel: () => void
  setPerformanceMode: (mode: PerformanceMode) => void
  togglePerformanceMode: () => void
}
```

- [ ] **Step 8: Implement view actions**

Modify `src/store/actions/viewActions/viewActions.ts`.

Replace the first import with:

```ts
import type { ViewActions, CircuitStore, PerformanceMode } from '../../types'
import { writePerformanceMode } from '@/lib/performanceModeStorage'
```

Add these actions inside the object returned by `createViewActions`, after `togglePropertiesPanel`:

```ts
  setPerformanceMode: (mode: PerformanceMode) => {
    set((state) => {
      state.performanceMode = mode
    }, false, 'setPerformanceMode')
    writePerformanceMode(mode)
  },
  togglePerformanceMode: () => {
    let nextMode: PerformanceMode = 'normal'
    set((state) => {
      nextMode = state.performanceMode === 'normal' ? 'low-power' : 'normal'
      state.performanceMode = nextMode
    }, false, 'togglePerformanceMode')
    writePerformanceMode(nextMode)
  },
```

- [ ] **Step 9: Wire store initialization and action exports**

Modify `src/store/circuitStore.ts`.

Add the import near existing imports:

```ts
import { readPerformanceMode } from '@/lib/performanceModeStorage'
```

Add to `initialState` after `showAxes`:

```ts
  performanceMode: readPerformanceMode(),
```

Add to `circuitActions` after `toggleAxes`:

```ts
  setPerformanceMode: (...args: Parameters<CircuitStore['setPerformanceMode']>) => useCircuitStore.getState().setPerformanceMode(...args),
  togglePerformanceMode: () => useCircuitStore.getState().togglePerformanceMode(),
```

- [ ] **Step 10: Run task tests**

Run:

```bash
pnpm vitest run src/lib/performanceModeStorage.test.ts src/store/actions/viewActions/viewActions.test.ts
```

Expected: PASS.

- [ ] **Step 11: Commit Task 1**

```bash
git add src/lib/performanceModeStorage.ts src/lib/performanceModeStorage.test.ts src/store/types.ts src/store/circuitStore.ts src/store/actions/viewActions/viewActions.ts src/store/actions/viewActions/viewActions.test.ts
git commit -m "feat: add performance mode store state"
```

## Task 2: Settings UI Switch

**Files:**
- Modify: `src/components/ui/CompactToolbar.tsx`
- Modify: `src/components/ui/CompactToolbar.test.tsx`
- Modify: `e2e/selectors/ui.selectors.ts`

- [ ] **Step 1: Write failing toolbar tests**

Modify `src/components/ui/CompactToolbar.test.tsx`.

In `beforeEach`, add this reset line:

```ts
    circuitActions.setPerformanceMode('normal')
```

Replace the existing `describe('Settings (stub)'...)` block with:

```ts
  describe('Settings performance mode', () => {
    it('opens settings popover with low power switch', async () => {
      const user = userEvent.setup()
      wrap()

      await user.click(screen.getByTestId('toolbar-settings'))

      expect(screen.getByTestId('settings-popover')).toBeInTheDocument()
      expect(screen.getByTestId('settings-low-power-switch')).toBeInTheDocument()
    })

    it('switches to low-power mode from the settings popover', async () => {
      const user = userEvent.setup()
      wrap()

      await user.click(screen.getByTestId('toolbar-settings'))
      await user.click(screen.getByTestId('settings-low-power-switch'))

      expect(useCircuitStore.getState().performanceMode).toBe('low-power')
      expect(screen.getByTestId('toolbar-settings').getAttribute('aria-pressed')).toBe('true')
    })

    it('switches back to normal mode from the settings popover', async () => {
      const user = userEvent.setup()
      circuitActions.setPerformanceMode('low-power')
      wrap()

      await user.click(screen.getByTestId('toolbar-settings'))
      await user.click(screen.getByTestId('settings-low-power-switch'))

      expect(useCircuitStore.getState().performanceMode).toBe('normal')
      expect(screen.getByTestId('toolbar-settings').getAttribute('aria-pressed')).toBe('false')
    })
  })
```

- [ ] **Step 2: Run toolbar tests and verify they fail**

Run:

```bash
pnpm vitest run src/components/ui/CompactToolbar.test.tsx
```

Expected: FAIL because `settings-popover` and `settings-low-power-switch` are not rendered.

- [ ] **Step 3: Update toolbar implementation**

Modify `src/components/ui/CompactToolbar.tsx`.

Remove this import:

```ts
import { ComingSoon } from './coming-soon'
```

Add the selector in `CompactToolbar` after `propertiesPanelOpen`:

```ts
  const performanceMode = useCircuitStore((s) => s.performanceMode)
```

Add this derived value after `hasSelection`:

```ts
  const isLowPowerMode = performanceMode === 'low-power'
```

Replace the current `<ComingSoon>...toolbar-settings...</ComingSoon>` block with:

```tsx
        <Popover>
          <Tooltip>
            <TooltipTrigger asChild>
              <PopoverTrigger asChild>
                <Button
                  data-testid="toolbar-settings"
                  variant={isLowPowerMode ? 'secondary' : 'ghost'}
                  size="icon"
                  className="w-9 h-9"
                  aria-pressed={isLowPowerMode}
                >
                  <Settings className="w-4 h-4" />
                </Button>
              </PopoverTrigger>
            </TooltipTrigger>
            <TooltipContent side="right">Settings</TooltipContent>
          </Tooltip>
          <PopoverContent
            data-testid="settings-popover"
            side="right"
            align="end"
            className="w-44 p-3"
          >
            <div className="flex items-center justify-between gap-3">
              <span className="text-xs font-medium">Low Power</span>
              <Switch
                data-testid="settings-low-power-switch"
                size="sm"
                checked={isLowPowerMode}
                aria-label="Low power mode"
                onCheckedChange={(checked) => {
                  circuitActions.setPerformanceMode(checked ? 'low-power' : 'normal')
                }}
              />
            </div>
            <div className="mt-2 text-[11px] text-muted-foreground">
              {isLowPowerMode ? 'Reduced 3D load' : 'Full detail'}
            </div>
          </PopoverContent>
        </Popover>
```

- [ ] **Step 4: Add E2E selectors**

Modify `e2e/selectors/ui.selectors.ts`.

Add inside `toolbar`:

```ts
    settingsPopover: '[data-testid="settings-popover"]',
    lowPowerSwitch: '[data-testid="settings-low-power-switch"]',
```

- [ ] **Step 5: Run toolbar tests and typecheck selectors**

Run:

```bash
pnpm vitest run src/components/ui/CompactToolbar.test.tsx
pnpm run typecheck
```

Expected: PASS.

- [ ] **Step 6: Commit Task 2**

```bash
git add src/components/ui/CompactToolbar.tsx src/components/ui/CompactToolbar.test.tsx e2e/selectors/ui.selectors.ts
git commit -m "feat: add performance mode settings switch"
```

## Task 3: Canvas Render Policy

**Files:**
- Create: `src/components/canvas/Scene/renderConfig.ts`
- Create: `src/components/canvas/Scene/renderConfig.test.ts`
- Create: `src/components/canvas/Scene/Scene.test.tsx`
- Modify: `src/components/canvas/Scene/Scene.tsx`

- [ ] **Step 1: Write failing render config tests**

Create `src/components/canvas/Scene/renderConfig.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { getSceneRenderConfig } from './renderConfig'

describe('getSceneRenderConfig', () => {
  it('uses full-detail settings in normal mode', () => {
    expect(getSceneRenderConfig('normal')).toEqual({
      frameloop: 'always',
      dpr: [1, 2],
      shadows: true,
      gl: {
        antialias: true,
        powerPreference: 'high-performance',
      },
    })
  })

  it('uses low-impact settings in low-power mode', () => {
    expect(getSceneRenderConfig('low-power')).toEqual({
      frameloop: 'demand',
      dpr: 1,
      shadows: false,
      gl: {
        antialias: false,
        powerPreference: 'low-power',
      },
    })
  })
})
```

- [ ] **Step 2: Run render config test and verify it fails**

Run:

```bash
pnpm vitest run src/components/canvas/Scene/renderConfig.test.ts
```

Expected: FAIL because `renderConfig.ts` does not exist.

- [ ] **Step 3: Implement render config**

Create `src/components/canvas/Scene/renderConfig.ts`:

```ts
import type { PerformanceMode } from '@/store/types'

export type SceneFrameloop = 'always' | 'demand'

export interface SceneRenderConfig {
  frameloop: SceneFrameloop
  dpr: number | [number, number]
  shadows: boolean
  gl: {
    antialias: boolean
    powerPreference: WebGLPowerPreference
  }
}

export function getSceneRenderConfig(mode: PerformanceMode): SceneRenderConfig {
  if (mode === 'low-power') {
    return {
      frameloop: 'demand',
      dpr: 1,
      shadows: false,
      gl: {
        antialias: false,
        powerPreference: 'low-power',
      },
    }
  }

  return {
    frameloop: 'always',
    dpr: [1, 2],
    shadows: true,
    gl: {
      antialias: true,
      powerPreference: 'high-performance',
    },
  }
}
```

- [ ] **Step 4: Run render config test and verify it passes**

Run:

```bash
pnpm vitest run src/components/canvas/Scene/renderConfig.test.ts
```

Expected: PASS.

- [ ] **Step 5: Write failing Scene wiring test**

Create `src/components/canvas/Scene/Scene.test.tsx`:

```tsx
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Scene } from './Scene'
import { useCircuitStore } from '@/store/circuitStore'

vi.mock('@react-three/fiber', () => ({
  Canvas: ({
    children,
    frameloop,
    dpr,
    shadows,
    gl,
  }: {
    children: React.ReactNode
    frameloop?: string
    dpr?: number | [number, number]
    shadows?: boolean
    gl?: Record<string, unknown>
  }) => (
    <div
      data-testid="mock-canvas"
      data-frameloop={frameloop}
      data-dpr={JSON.stringify(dpr)}
      data-shadows={String(shadows)}
      data-gl={JSON.stringify(gl)}
    >
      {children}
    </div>
  ),
}))

vi.mock('./SceneReadyBridge', () => ({
  SceneReadyBridge: () => <div data-testid="scene-ready-bridge" />,
}))

vi.mock('./SceneContent', () => ({
  SceneContent: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="scene-content">{children}</div>
  ),
}))

const setState = useCircuitStore.setState

describe('Scene performance mode render config', () => {
  beforeEach(() => {
    setState({ performanceMode: 'normal' })
  })

  it('uses continuous full-detail canvas settings in normal mode', () => {
    render(<Scene />)

    const canvas = screen.getByTestId('mock-canvas')
    expect(canvas.getAttribute('data-frameloop')).toBe('always')
    expect(canvas.getAttribute('data-dpr')).toBe('[1,2]')
    expect(canvas.getAttribute('data-shadows')).toBe('true')
    expect(canvas.getAttribute('data-gl')).toContain('high-performance')
  })

  it('uses demand low-impact canvas settings in low-power mode', () => {
    setState({ performanceMode: 'low-power' })

    render(<Scene />)

    const canvas = screen.getByTestId('mock-canvas')
    expect(canvas.getAttribute('data-frameloop')).toBe('demand')
    expect(canvas.getAttribute('data-dpr')).toBe('1')
    expect(canvas.getAttribute('data-shadows')).toBe('false')
    expect(canvas.getAttribute('data-gl')).toContain('low-power')
  })
})
```

- [ ] **Step 6: Run Scene test and verify it fails**

Run:

```bash
pnpm vitest run src/components/canvas/Scene/Scene.test.tsx
```

Expected: FAIL because `Scene` does not pass mode-specific Canvas props.

- [ ] **Step 7: Apply render config in Scene**

Modify `src/components/canvas/Scene/Scene.tsx`.

Add imports:

```ts
import { useCircuitStore } from '@/store/circuitStore'
import { getSceneRenderConfig } from './renderConfig'
```

Add inside `Scene` before `return`:

```ts
  const performanceMode = useCircuitStore((s) => s.performanceMode)
  const renderConfig = getSceneRenderConfig(performanceMode)
```

Replace the `<Canvas ...>` opening props with:

```tsx
    <Canvas
      shadows={renderConfig.shadows}
      frameloop={renderConfig.frameloop}
      dpr={renderConfig.dpr}
      gl={renderConfig.gl}
      camera={{ position: [0, 6, 6], fov: 50 }}
      style={bgStyle}
      data-testid="scene-canvas"
    >
```

- [ ] **Step 8: Run task tests**

Run:

```bash
pnpm vitest run src/components/canvas/Scene/renderConfig.test.ts src/components/canvas/Scene/Scene.test.tsx
```

Expected: PASS.

- [ ] **Step 9: Commit Task 3**

```bash
git add src/components/canvas/Scene/renderConfig.ts src/components/canvas/Scene/renderConfig.test.ts src/components/canvas/Scene/Scene.test.tsx src/components/canvas/Scene/Scene.tsx
git commit -m "perf: apply performance mode canvas policy"
```

## Task 4: Scene Detail Policy

**Files:**
- Modify: `src/components/canvas/Scene/SceneContent.tsx`
- Modify: `src/components/canvas/Scene/SceneContent.test.tsx`
- Modify: `src/components/canvas/Scene/SceneGrid.tsx`
- Modify: `src/components/canvas/Scene/SceneGrid.test.tsx`
- Modify: `src/components/canvas/Scene/SceneOrbitControls.tsx`
- Modify: `src/components/canvas/Scene/SceneOrbitControls.test.tsx`

- [ ] **Step 1: Write failing SceneContent tests**

Modify `src/components/canvas/Scene/SceneContent.test.tsx`.

Add to `beforeEach`:

```ts
      performanceMode: 'normal',
```

Add these tests:

```tsx
  it('renders Environment in normal mode', () => {
    const { getByTestId } = render(<SceneContent />)
    expect(getByTestId('environment')).toBeInTheDocument()
  })

  it('omits Environment in low-power mode', () => {
    setState({ performanceMode: 'low-power' })
    const { queryByTestId } = render(<SceneContent />)
    expect(queryByTestId('environment')).not.toBeInTheDocument()
  })

  it('disables directional shadows in low-power mode', () => {
    setState({ performanceMode: 'low-power' })
    const { container } = render(<SceneContent />)
    expect(container.innerHTML).toContain('directionallight')
    expect(container.innerHTML).toContain('castshadow="false"')
  })
```

- [ ] **Step 2: Run SceneContent tests and verify they fail**

Run:

```bash
pnpm vitest run src/components/canvas/Scene/SceneContent.test.tsx
```

Expected: FAIL because low-power mode does not affect `Environment` or `castShadow`.

- [ ] **Step 3: Implement SceneContent low-power behavior**

Modify `src/components/canvas/Scene/SceneContent.tsx`.

Add after `showAxes`:

```ts
  const lowPower = useCircuitStore((s) => s.performanceMode === 'low-power')
```

Replace the light/environment block with:

```tsx
      <ambientLight intensity={lowPower ? 0.7 : 0.5} />
      <directionalLight position={[10, 10, 5]} intensity={lowPower ? 0.75 : 1} castShadow={!lowPower} />
      {!lowPower && <Environment preset="city" />}
```

- [ ] **Step 4: Write failing SceneGrid tests**

Modify `src/components/canvas/Scene/SceneGrid.test.tsx`.

Add imports:

```ts
import { beforeEach } from 'vitest'
import { useCircuitStore } from '@/store/circuitStore'
```

Add before `describe`:

```ts
const setState = useCircuitStore.setState
```

Add inside `describe` before tests:

```ts
  beforeEach(() => {
    setState({ performanceMode: 'normal' })
  })
```

Add this test:

```tsx
  it('uses finite lighter grid in low-power mode', () => {
    setState({ performanceMode: 'low-power' })
    const { getByTestId } = render(<SceneGrid />)
    const grid = getByTestId('grid')
    expect(grid.getAttribute('data-infinitegrid')).toBe('false')
    expect(grid.getAttribute('data-args')).toBe('16,16')
    expect(grid.getAttribute('data-fadedistance')).toBe('18')
  })
```

- [ ] **Step 5: Implement SceneGrid low-power behavior**

Modify `src/components/canvas/Scene/SceneGrid.tsx`.

Add import:

```ts
import { useCircuitStore } from '@/store/circuitStore'
```

Add in `SceneGrid` after colors:

```ts
  const lowPower = useCircuitStore((s) => s.performanceMode === 'low-power')
```

Replace `<Grid ... />` props with:

```tsx
    <Grid
      args={lowPower ? [16, 16] : [20, 20]}
      cellSize={GRID_SIZE}
      cellThickness={lowPower ? 0.7 : 1.0}
      cellColor={cellColor}
      sectionSize={GRID_SIZE * 2}
      sectionThickness={lowPower ? 1.0 : 1.2}
      sectionColor={sectionColor}
      fadeDistance={lowPower ? 18 : 30}
      fadeStrength={lowPower ? 0.6 : 1}
      followCamera={false}
      infiniteGrid={!lowPower}
    />
```

- [ ] **Step 6: Write failing OrbitControls test**

Modify `src/components/canvas/Scene/SceneOrbitControls.test.tsx`.

Update the mock to include damping props:

```tsx
  OrbitControls: (props: Record<string, unknown>) => (
    <div
      data-testid="orbit-controls"
      data-enablerotate={String(props.enableRotate)}
      data-enablepan={String(props.enablePan)}
      data-enablezoom={String(props.enableZoom)}
      data-enabledamping={String(props.enableDamping)}
      data-dampingfactor={String(props.dampingFactor)}
    >
      OrbitControls
    </div>
  ),
```

Add to `beforeEach`:

```ts
      performanceMode: 'normal',
```

Add this test:

```tsx
  it('disables damping in low-power mode', () => {
    setState({ performanceMode: 'low-power' })
    const { getByTestId } = render(<SceneOrbitControls />)
    const controls = getByTestId('orbit-controls')
    expect(controls.getAttribute('data-enabledamping')).toBe('false')
    expect(controls.getAttribute('data-dampingfactor')).toBe('0')
  })
```

- [ ] **Step 7: Implement OrbitControls low-power behavior**

Modify `src/components/canvas/Scene/SceneOrbitControls.tsx`.

Add selector after `hoveredGateId`:

```ts
  const lowPower = useCircuitStore((state): boolean => state.performanceMode === 'low-power')
```

Replace damping props with:

```tsx
      enableDamping={!lowPower}
      dampingFactor={lowPower ? 0 : 0.05}
```

- [ ] **Step 8: Run scene detail tests**

Run:

```bash
pnpm vitest run src/components/canvas/Scene/SceneContent.test.tsx src/components/canvas/Scene/SceneGrid.test.tsx src/components/canvas/Scene/SceneOrbitControls.test.tsx
```

Expected: PASS.

- [ ] **Step 9: Commit Task 4**

```bash
git add src/components/canvas/Scene/SceneContent.tsx src/components/canvas/Scene/SceneContent.test.tsx src/components/canvas/Scene/SceneGrid.tsx src/components/canvas/Scene/SceneGrid.test.tsx src/components/canvas/Scene/SceneOrbitControls.tsx src/components/canvas/Scene/SceneOrbitControls.test.tsx
git commit -m "perf: reduce scene detail in low power mode"
```

## Task 5: Gate And Wire Detail Policy

**Files:**
- Modify: `src/gates/common/BaseGate.tsx`
- Modify: `src/gates/common/BaseGate.test.tsx`
- Modify: `src/components/canvas/Wire3D.tsx`
- Modify: `src/components/canvas/Wire3D.test.tsx`

- [ ] **Step 1: Write failing BaseGate test**

Modify `src/gates/common/BaseGate.test.tsx`.

Add this import:

```ts
import { useCircuitStore } from '@/store/circuitStore'
```

Update the mocked state to include:

```ts
    performanceMode: 'normal' as const,
```

Add this helper after `defaultProps`:

```ts
  const setMockPerformanceMode = (mode: 'normal' | 'low-power') => {
    const storeModule = vi.mocked(useCircuitStore)
    const state = storeModule.getState()
    state.performanceMode = mode
  }
```

Add this test after the text label test:

```tsx
  it('hides text label in low-power mode', () => {
    setMockPerformanceMode('low-power')
    const { queryByTestId } = render(<BaseGate {...defaultProps} textLabel="AND" />)
    expect(queryByTestId('gate-text')).not.toBeInTheDocument()
  })
```

If TypeScript does not accept `vi.mocked(useCircuitStore)` on the mock function, replace the helper with this direct mutation:

```ts
  const setMockPerformanceMode = (mode: 'normal' | 'low-power') => {
    const state = (useCircuitStore as unknown as { getState: () => { performanceMode: 'normal' | 'low-power' } }).getState()
    state.performanceMode = mode
  }
```

- [ ] **Step 2: Run BaseGate test and verify it fails**

Run:

```bash
pnpm vitest run src/gates/common/BaseGate.test.tsx
```

Expected: FAIL because text still renders in low-power mode.

- [ ] **Step 3: Implement BaseGate label reduction**

Modify `src/gates/common/BaseGate.tsx`.

Add after the existing `wiringFrom` selector:

```ts
  const lowPower = useCircuitStore((s) => s.performanceMode === 'low-power')
```

Replace the text label guard:

```tsx
      {textLabel && (
```

with:

```tsx
      {textLabel && !lowPower && (
```

- [ ] **Step 4: Write failing Wire3D policy tests**

Modify `src/components/canvas/Wire3D.test.tsx`:

```ts
/**
 * Wire3D Component Tests
 *
 * Note: R3F components require Canvas context and React Compiler uses useMemoCache
 * which requires proper React runtime context. Full rendering tests are covered
 * in E2E tests with proper Canvas setup.
 *
 * These tests verify component exports and pure render-detail policy.
 */

import { describe, it, expect } from 'vitest'
import { Wire3D, getWireArcPointCount, getWireLineWidth } from './Wire3D'

describe('Wire3D', () => {
  describe('exports', () => {
    it('exports Wire3D component', () => {
      expect(Wire3D).toBeDefined()
    })

    it('is a function component', () => {
      expect(typeof Wire3D).toBe('function')
    })

    it('has correct function name', () => {
      expect(Wire3D.name).toBe('Wire3D')
    })
  })

  describe('render-detail policy', () => {
    it('uses smooth arcs in normal mode', () => {
      expect(getWireArcPointCount('normal')).toBe(30)
    })

    it('uses fewer arc points in low-power mode', () => {
      expect(getWireArcPointCount('low-power')).toBe(8)
    })

    it('keeps selected wires thick in normal mode', () => {
      expect(getWireLineWidth('normal', true)).toBe(3)
    })

    it('uses thin wires in low-power mode', () => {
      expect(getWireLineWidth('low-power', true)).toBe(1)
      expect(getWireLineWidth('low-power', false)).toBe(1)
    })
  })
})
```

- [ ] **Step 5: Run Wire3D test and verify it fails**

Run:

```bash
pnpm vitest run src/components/canvas/Wire3D.test.tsx
```

Expected: FAIL because `getWireArcPointCount` and `getWireLineWidth` are not exported.

- [ ] **Step 6: Implement Wire3D low-power detail**

Modify `src/components/canvas/Wire3D.tsx`.

Add imports:

```ts
import { useCircuitStore } from '@/store/circuitStore'
import type { PerformanceMode } from '@/store/types'
```

Add these exports above `export function Wire3D`:

```ts
export function getWireArcPointCount(mode: PerformanceMode): number {
  return mode === 'low-power' ? 8 : 30
}

export function getWireLineWidth(mode: PerformanceMode, isSelected: boolean): number {
  if (mode === 'low-power') return 1
  return isSelected ? 3 : 1
}
```

Add inside `Wire3D` after props destructuring:

```ts
  const performanceMode = useCircuitStore((s) => s.performanceMode)
```

Replace:

```ts
    const numPoints = 30 // Number of points for smooth curve
```

with:

```ts
    const numPoints = getWireArcPointCount(performanceMode)
```

Replace:

```tsx
            lineWidth={isSelected ? 3 : 1}
```

with:

```tsx
            lineWidth={getWireLineWidth(performanceMode, isSelected)}
```

- [ ] **Step 7: Run detail tests**

Run:

```bash
pnpm vitest run src/gates/common/BaseGate.test.tsx src/components/canvas/Wire3D.test.tsx
```

Expected: PASS.

- [ ] **Step 8: Commit Task 5**

```bash
git add src/gates/common/BaseGate.tsx src/gates/common/BaseGate.test.tsx src/components/canvas/Wire3D.tsx src/components/canvas/Wire3D.test.tsx
git commit -m "perf: lower gate and wire detail in low power mode"
```

## Task 6: Low-Power Wiring Cadence And Render-Safe Errors

**Files:**
- Modify: `src/components/canvas/handlers/groundPlaneHandlers.ts`
- Modify: `src/components/canvas/Scene/WirePreview.tsx`
- Modify: `src/components/canvas/Scene/WirePreview.test.tsx`

- [ ] **Step 1: Write failing WirePreview error test**

Modify `src/components/canvas/Scene/WirePreview.test.tsx`.

Update the import:

```ts
import { render, waitFor } from '@testing-library/react'
```

Replace the assertions in `handles pathfinding errors gracefully` after render with:

```ts
    // Should return null (no rendering)
    expect(container.firstChild).toBeNull()

    // Should log error to console (from useWirePreviewPath hook)
    expect(consoleErrorSpy).toHaveBeenCalledWith('[WirePreview] Pathfinding error:', pathfindingError)

    // Should show error notification after render, not during render
    await waitFor(() => {
      expect(notify.error).toHaveBeenCalledWith('Unable to create wire path. Please try a different connection.')
    })

    // Should cancel wiring after render, not during render
    await waitFor(() => {
      expect(vi.mocked(circuitActions.cancelWiring)).toHaveBeenCalled()
    })
```

Add this assertion before `consoleErrorSpy.mockRestore()`:

```ts
    expect(consoleErrorSpy.mock.calls.some((call) => String(call[0]).includes('Cannot update a component'))).toBe(false)
```

- [ ] **Step 2: Run WirePreview test and verify it still exposes the render-side-effect risk**

Run:

```bash
pnpm vitest run src/components/canvas/Scene/WirePreview.test.tsx
```

Expected: FAIL or produce React render-phase update warnings because `WirePreview` calls `notify.error` and `cancelWiring` during render.

- [ ] **Step 3: Move WirePreview error side effects into an effect**

Modify `src/components/canvas/Scene/WirePreview.tsx`.

Add `useEffect` import:

```ts
import { useEffect } from 'react'
```

Add this block after `trackRender(...)` and before the first return guard:

```ts
  useEffect(() => {
    if (!error) return

    notify.error('Unable to create wire path. Please try a different connection.')
    circuitActions.cancelWiring()
  }, [error])
```

Replace the existing error block:

```ts
  if (error) {
    notify.error('Unable to create wire path. Please try a different connection.')
    circuitActions.cancelWiring()
    return null
  }
```

with:

```ts
  if (error) {
    return null
  }
```

- [ ] **Step 4: Write failing low-power debounce policy test**

Modify the import in `src/components/canvas/handlers/groundPlaneHandlers.test.ts`:

```ts
import { handlePointerMove, handlePointerLeave, handleClick, handlePointerUp, getWirePreviewDebounceMs } from './groundPlaneHandlers'
```

Add this test inside `describe('handlePointerMove', ...)`:

```ts
  it('uses a slower wire preview debounce in low-power mode', () => {
    expect(getWirePreviewDebounceMs('normal')).toBe(50)
    expect(getWirePreviewDebounceMs('low-power')).toBe(120)
  })
```

- [ ] **Step 5: Implement mode-specific debounce policy**

Modify `src/components/canvas/handlers/groundPlaneHandlers.ts`.

Add import:

```ts
import type { PerformanceMode } from '@/store/types'
```

Add after the destructured `circuitActions` block:

```ts
export function getWirePreviewDebounceMs(mode: PerformanceMode): number {
  return mode === 'low-power' ? 120 : 50
}
```

Replace the existing debounced declaration:

```ts
// Debounce wire preview updates to reduce calculation frequency (100ms delay)
const updateWirePreviewPosition = debounce(
  updateWirePreviewPositionOriginal as (...args: unknown[]) => void,
  50
) as typeof updateWirePreviewPositionOriginal
```

with:

```ts
const updateWirePreviewPositionNormal = debounce(
  updateWirePreviewPositionOriginal as (...args: unknown[]) => void,
  getWirePreviewDebounceMs('normal')
) as typeof updateWirePreviewPositionOriginal

const updateWirePreviewPositionLowPower = debounce(
  updateWirePreviewPositionOriginal as (...args: unknown[]) => void,
  getWirePreviewDebounceMs('low-power')
) as typeof updateWirePreviewPositionOriginal
```

Replace:

```ts
    updateWirePreviewPosition(previewPos)
```

with:

```ts
    const updateWirePreviewPosition = state.performanceMode === 'low-power'
      ? updateWirePreviewPositionLowPower
      : updateWirePreviewPositionNormal
    updateWirePreviewPosition(previewPos)
```

- [ ] **Step 6: Run wiring tests**

Run:

```bash
pnpm vitest run src/components/canvas/Scene/WirePreview.test.tsx src/components/canvas/handlers/groundPlaneHandlers.test.ts
```

Expected: PASS.

- [ ] **Step 7: Commit Task 6**

```bash
git add src/components/canvas/Scene/WirePreview.tsx src/components/canvas/Scene/WirePreview.test.tsx src/components/canvas/handlers/groundPlaneHandlers.ts src/components/canvas/handlers/groundPlaneHandlers.test.ts
git commit -m "perf: reduce low power wiring update pressure"
```

## Task 7: Browser-Level UI Coverage

**Files:**
- Create: `e2e/specs/performance/performance-mode.ui.spec.ts`

- [ ] **Step 1: Write the Playwright UI spec**

Create `e2e/specs/performance/performance-mode.ui.spec.ts`:

```ts
import { uiTest as test, uiExpect as expect } from '../../fixtures'
import { UI_SELECTORS } from '../../selectors'

test.describe('Performance mode switch @ui @performance', () => {
  test.beforeEach(async ({ page }) => {
    await page.evaluate(() => {
      window.__CIRCUIT_ACTIONS__?.setPerformanceMode('normal')
    })
  })

  test('switches between normal and low-power modes from Settings', async ({ page }) => {
    await page.locator(UI_SELECTORS.toolbar.settings).click()
    await expect(page.locator(UI_SELECTORS.toolbar.settingsPopover)).toBeVisible()

    await page.locator(UI_SELECTORS.toolbar.lowPowerSwitch).click()
    await page.waitForFunction(() => window.__CIRCUIT_STORE__?.performanceMode === 'low-power')

    await expect(page.locator(UI_SELECTORS.toolbar.settings)).toHaveAttribute('aria-pressed', 'true')

    await page.locator(UI_SELECTORS.toolbar.lowPowerSwitch).click()
    await page.waitForFunction(() => window.__CIRCUIT_STORE__?.performanceMode === 'normal')

    await expect(page.locator(UI_SELECTORS.toolbar.settings)).toHaveAttribute('aria-pressed', 'false')
  })
})
```

- [ ] **Step 2: Run the new E2E spec**

Run:

```bash
pnpm playwright test e2e/specs/performance/performance-mode.ui.spec.ts --reporter=line
```

Expected: PASS.

- [ ] **Step 3: Commit Task 7**

```bash
git add e2e/specs/performance/performance-mode.ui.spec.ts
git commit -m "test: cover performance mode switch"
```

## Task 8: Docs And Final Verification

**Files:**
- Read: `docs/llm-docs-sync.md`
- Modify only if required by the author pass: `README.md`, `HACER_LLM_GUIDE.md`, `REPO_MAP.md`, or roadmap docs

- [ ] **Step 1: Run focused tests**

Run:

```bash
pnpm vitest run src/lib/performanceModeStorage.test.ts src/store/actions/viewActions/viewActions.test.ts src/components/ui/CompactToolbar.test.tsx src/components/canvas/Scene/renderConfig.test.ts src/components/canvas/Scene/Scene.test.tsx src/components/canvas/Scene/SceneContent.test.tsx src/components/canvas/Scene/SceneGrid.test.tsx src/components/canvas/Scene/SceneOrbitControls.test.tsx src/gates/common/BaseGate.test.tsx src/components/canvas/Wire3D.test.tsx src/components/canvas/Scene/WirePreview.test.tsx src/components/canvas/handlers/groundPlaneHandlers.test.ts
pnpm playwright test e2e/specs/performance/performance-mode.ui.spec.ts --reporter=line
```

Expected: PASS.

- [ ] **Step 2: Run the docs author pass**

Read:

```bash
sed -n '1,260p' docs/llm-docs-sync.md
```

Apply the author pass. Because this feature changes public UI behavior, update docs that mention settings, rendering/performance behavior, or current UI controls. If no existing doc section describes those areas, record that no docs needed updates in the final task summary.

- [ ] **Step 3: Run full definition-of-done gates**

Run:

```bash
pnpm run lint
pnpm run test:run
pnpm run test:e2e:store
pnpm run build
```

Expected: all commands exit 0.

- [ ] **Step 4: Inspect git status**

Run:

```bash
git status --short
```

Expected: only intentional implementation, test, and docs files are modified.

- [ ] **Step 5: Commit Task 8**

```bash
git add .
git commit -m "docs: document performance mode behavior"
```

## Self-Review

Spec coverage:

- Two modes are implemented by `performanceMode: 'normal' | 'low-power'`.
- UI support is implemented in the existing Settings control.
- Low-power CPU/GPU measures cover DPR, frameloop, shadows, environment, controls damping, grid cost, gate labels, wire detail, and wire preview cadence.
- The render-time `WirePreview` state mutation found during investigation is fixed as part of the same performance path.

Placeholder scan:

- The plan uses exact paths and concrete snippets.
- The plan does not include open-ended implementation markers.

Type consistency:

- The store type is `PerformanceMode`.
- The state property is `performanceMode`.
- The actions are `setPerformanceMode(mode)` and `togglePerformanceMode()`.
- The UI test IDs are `settings-popover` and `settings-low-power-switch`.

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-05-14-performance-mode-switch.md`. Two execution options:

1. Subagent-Driven (recommended) - dispatch a fresh subagent per task, review between tasks, fast iteration

2. Inline Execution - execute tasks in this session using executing-plans, batch execution with checkpoints

Which approach?
