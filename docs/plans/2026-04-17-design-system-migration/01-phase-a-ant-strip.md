# Chunk 1: Phase A — Ant Design strip (commit 1)

> Spec ref: [`Phase A — The Ant strip`](../../specs/2026-04-17-design-system-migration-design.md#phase-a--the-ant-strip-commit-1)

**Goal:** Remove every line of Ant Design + `@ant-design/icons` from `src/` and `package.json`. Leave the app in a deliberately ugly but compilable, lint-clean, build-clean state where store tests still pass. Bundle drops by ~750 KB gzipped.

**Branch state going in:** Just-created `feat/design-system-migration` from clean `main`. CI baseline green (per Pre-flight P3 in the index).

---

## File inventory

### Delete

| Path | Reason |
|---|---|
| `src/components/ui/Sidebar.tsx` | Ant `Layout/Sider/Button/Space/Typography/Tooltip/Divider/Switch` |
| `src/components/ui/Sidebar.test.tsx` | Test of deleted component |
| `src/components/ui/GateSelector.tsx` | Ant `Tooltip` + Ant icons |
| `src/components/ui/GateSelector.test.tsx` | Test of deleted component |
| `src/components/ui/NodeSelector.tsx` | Ant `Button/Space/Tooltip` + icons |
| `src/components/ui/NodeSelector.test.tsx` | Test of deleted component |
| `src/components/ui/NodeRenameControl.tsx` | Ant `Input/Button/Space/Typography`; logic absorbed into PropertiesPanel in 3c |
| `src/components/ui/NodeRenameControl.test.tsx` | Test of deleted component |
| `src/components/ui/handlers/uiHandlers.ts` | Sidebar's `handleDeleteSelected` helper; logic re-implemented inline in CompactToolbar in 3a |
| `src/components/ui/handlers/` (the directory if empty after the above) | Empty directory cleanup |
| `src/components/ui/DemoOverlay.tsx` | Uses `CloseOutlined` and App.css classes; rebuilt in 3f |
| `src/theme/ThemeProvider.tsx` | Ant `ConfigProvider` wrapper |
| `src/App.css` | 329-line Ant-shell-specific CSS (sidebar, gate-grid, demo-overlay, cursors) |

### Rewrite (existing path, new contents — temporary placeholder for Phase A only)

| Path | Phase A contents |
|---|---|
| `src/App.tsx` | Bare scaffold rendering `<CanvasArea/>` + `<StatusBar/>` only |
| `src/components/canvas/CanvasArea.tsx` | Same R3F logic; replace `<Content>` and `<Text>` (Ant) with `<div>`/`<span>`; drop CSS classes that no longer exist |

### Create

| Path | Purpose |
|---|---|
| `src/lib/notify.ts` | Temporary `console.warn`-based stub of the `notify` API (replaced by Sonner-backed real impl in Phase B) |
| `src/lib/notify.test.ts` | Smoke test asserting the stub exports the four expected methods with correct shape |

### Patch (sweep `message.*` → `notify.*`)

Verified callsite counts via grep — implementer uses these as a checklist:

| Path | Callsites |
|---|---|
| `src/store/actions/wiringActions/wiringActions.ts` | 45 |
| `src/store/actions/wiringActions/wiringActions.test.ts` | 14 |
| `src/store/actions/simulationActions/simulationActions.ts` | 1 |
| `src/store/actions/simulationActions/simulationActions.test.ts` | 4 |
| `src/store/actions/gateActions/gateActions.ts` | 2 |
| `src/store/actions/gateActions/gateActions.test.ts` | 3 |
| `src/components/canvas/handlers/wireHandlers.ts` | 2 |
| `src/components/canvas/handlers/wireHandlers.test.ts` | 2 |
| `src/components/canvas/Scene/WirePreview.tsx` | 1 |
| `src/components/canvas/Scene/WirePreview.test.tsx` | 1 |

Total: 75 callsites across 10 files.

### `@ui` Playwright specs to skip

All 8 specs under `e2e/specs/**/*.ui.spec.ts`:

- `e2e/specs/wiring/wire-persistence.ui.spec.ts`
- `e2e/specs/wiring/wire-creation.ui.spec.ts`
- `e2e/specs/simulation/simulation-control.ui.spec.ts`
- `e2e/specs/simulation/signal-propagation.ui.spec.ts`
- `e2e/specs/performance/render-sanity.ui.spec.ts`
- `e2e/specs/gates/gate-types.ui.spec.ts`
- `e2e/specs/gates/gate-placement.ui.spec.ts`
- `e2e/specs/gates/gate-movement.ui.spec.ts`

### `package.json` mutations

- Remove `antd` from `dependencies`
- Remove `@ant-design/icons` from `dependencies`
- Run `pnpm install` to regenerate `pnpm-lock.yaml`

---

## Tasks

### Task 1: Create `notify` stub (TDD)

**Files:**
- Create: `src/lib/notify.ts`
- Create: `src/lib/notify.test.ts`

- [ ] **Step 1.1: Write the failing test**

```ts
// src/lib/notify.test.ts
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { notify } from './notify';

describe('notify (Phase A stub)', () => {
  let warnSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    warnSpy.mockRestore();
  });

  it.each(['success', 'info', 'error', 'warning'] as const)(
    'exports notify.%s as a callable function',
    (level) => {
      expect(typeof notify[level]).toBe('function');
    },
  );

  it('routes calls to console.warn with the level prefix', () => {
    notify.error('something broke');
    expect(warnSpy).toHaveBeenCalledWith('[notify.error]', 'something broke', '');
  });

  it('forwards opts when provided', () => {
    notify.success('done', { description: 'all good' });
    expect(warnSpy).toHaveBeenCalledWith('[notify.success]', 'done', { description: 'all good' });
  });
});
```

- [ ] **Step 1.2: Run the test and confirm it fails**

```bash
pnpm vitest run src/lib/notify.test.ts
```

Expected: failure with `Failed to resolve import "./notify" from "src/lib/notify.test.ts"`.

- [ ] **Step 1.3: Write the implementation**

```ts
// src/lib/notify.ts
type NotifyOpts = { description?: string; duration?: number };
type NotifyFn = (message: string, opts?: NotifyOpts) => void;

const stubLog = (level: string): NotifyFn => (msg, opts) => {
  // Temporary stub; replaced by Sonner-backed implementation in Phase B.
  console.warn(`[notify.${level}]`, msg, opts ?? '');
};

export const notify = {
  success: stubLog('success'),
  info: stubLog('info'),
  error: stubLog('error'),
  warning: stubLog('warning'),
};
```

- [ ] **Step 1.4: Run the test and confirm it passes**

```bash
pnpm vitest run src/lib/notify.test.ts
```

Expected: 3 tests pass.

- [ ] **Step 1.5: Commit**

```bash
git add src/lib/notify.ts src/lib/notify.test.ts
git commit -m "feat(notify): add Phase A console.warn stub"
```

---

### Task 2: Sweep `message.*` → `notify.*` in store actions and handlers

For each of the 10 files in the sweep table above, perform the following pattern. Do **not** touch test files until Task 3.

For each production file (e.g. `wiringActions.ts`):

- [ ] **Step 2.x.1: Replace import**

Open the file. Replace:
```ts
import { message } from 'antd';
```
with:
```ts
import { notify } from '@/lib/notify';
```

- [ ] **Step 2.x.2: Replace every callsite**

Find/replace within the file (preserve method name):
- `message.success(` → `notify.success(`
- `message.info(`    → `notify.info(`
- `message.error(`   → `notify.error(`
- `message.warning(` → `notify.warning(`

- [ ] **Step 2.x.3: Verify no `message.` references remain in this file**

```bash
rg "\\bmessage\\." <file_path>
```

Expected: zero matches.

Production files in order:
- [ ] `src/store/actions/wiringActions/wiringActions.ts` (45 sites)
- [ ] `src/store/actions/simulationActions/simulationActions.ts` (1 site)
- [ ] `src/store/actions/gateActions/gateActions.ts` (2 sites)
- [ ] `src/components/canvas/handlers/wireHandlers.ts` (2 sites)
- [ ] `src/components/canvas/Scene/WirePreview.tsx` (1 site)

Note: `src/components/ui/NodeRenameControl.tsx` has 1 site but the file is being deleted in Task 4 — skip the sweep for that file.

- [ ] **Step 2.6: Verify production sweep complete**

```bash
rg "from ['\"]antd['\"]" src/store/ src/components/canvas/
rg "\\bmessage\\.(success|info|error|warning)" src/store/ src/components/canvas/
```

Expected: zero matches in both.

- [ ] **Step 2.7: Run the unit tests (will fail in test files where they still reference message; expected)**

```bash
pnpm run test:run
```

Expected: failures only in `wiringActions.test.ts`, `simulationActions.test.ts`, `gateActions.test.ts`, `wireHandlers.test.ts`, `WirePreview.test.tsx` (the test files we'll patch in Task 3). Production code compiles.

---

### Task 3: Sweep `message` mocks in test files → `notify` mocks

For each test file in the sweep table:

- [ ] **Step 3.x.1: Replace the antd import**

Replace:
```ts
import { message } from 'antd';
```
with:
```ts
import { notify } from '@/lib/notify';
```

- [ ] **Step 3.x.2: Replace `vi.mock`/`vi.spyOn` targets**

Where the test uses `vi.mock('antd', ...)` and stubs `message`, replace with `vi.mock('@/lib/notify', ...)`. Where the test uses `vi.spyOn(message, 'error')`, replace with `vi.spyOn(notify, 'error')`. Where the test asserts `expect(message.error).toHaveBeenCalledWith(...)`, replace with `expect(notify.error).toHaveBeenCalledWith(...)`.

- [ ] **Step 3.x.3: Replace assertion call sites**

Find/replace within each file:
- `message.success` → `notify.success`
- `message.info` → `notify.info`
- `message.error` → `notify.error`
- `message.warning` → `notify.warning`

Test files in order:
- [ ] `src/store/actions/wiringActions/wiringActions.test.ts` (14 sites)
- [ ] `src/store/actions/simulationActions/simulationActions.test.ts` (4 sites)
- [ ] `src/store/actions/gateActions/gateActions.test.ts` (3 sites)
- [ ] `src/components/canvas/handlers/wireHandlers.test.ts` (2 sites)
- [ ] `src/components/canvas/Scene/WirePreview.test.tsx` (1 site)

- [ ] **Step 3.6: Run the unit tests (should now be green for these files)**

```bash
pnpm run test:run
```

Expected: green except for tests of components we're about to delete (Sidebar.test, GateSelector.test, NodeSelector.test, NodeRenameControl.test) — those still pass at this point because the components still exist.

- [ ] **Step 3.7: Commit the sweep**

```bash
git add src/store/ src/components/canvas/
git commit -m "$(cat <<'EOF'
refactor(notify): replace antd message.* with notify.* shim

Sweeps 75 callsites across store actions, canvas handlers, scene components,
and their tests. Production code no longer imports message from antd.
NodeRenameControl is excluded \u2014 the file is removed in the next commit.
EOF
)"
```

---

### Task 4: Delete Ant-dependent UI components and tests

- [ ] **Step 4.1: Delete the components and their tests**

```bash
rm src/components/ui/Sidebar.tsx
rm src/components/ui/Sidebar.test.tsx
rm src/components/ui/GateSelector.tsx
rm src/components/ui/GateSelector.test.tsx
rm src/components/ui/NodeSelector.tsx
rm src/components/ui/NodeSelector.test.tsx
rm src/components/ui/NodeRenameControl.tsx
rm src/components/ui/NodeRenameControl.test.tsx
rm src/components/ui/DemoOverlay.tsx
rm src/components/ui/handlers/uiHandlers.ts
rmdir src/components/ui/handlers 2>/dev/null  # only succeeds if empty
```

- [ ] **Step 4.2: Delete the Ant theme provider**

```bash
rm src/theme/ThemeProvider.tsx
```

- [ ] **Step 4.3: Verify no orphan imports remain**

```bash
rg "from ['\"]@/components/ui/Sidebar['\"]" src/
rg "from ['\"]@/components/ui/GateSelector['\"]" src/
rg "from ['\"]@/components/ui/NodeSelector['\"]" src/
rg "from ['\"]@/components/ui/NodeRenameControl['\"]" src/
rg "from ['\"]@/components/ui/DemoOverlay['\"]" src/
rg "from ['\"]@/theme/ThemeProvider['\"]" src/
rg "from ['\"]@/components/ui/handlers/uiHandlers['\"]" src/
```

Expected: zero matches across all six greps.

If any match exists (likely in `src/App.tsx`), that file gets rewritten in Task 5 — leave for now.

- [ ] **Step 4.4: Defer commit until Task 5**

App.tsx still imports the deleted components. Commit happens after Task 5.

---

### Task 5: Rewrite `src/App.tsx` (temporary Phase A scaffold)

**Files:**
- Modify: `src/App.tsx` — full replacement

- [ ] **Step 5.1: Replace contents of `src/App.tsx`**

```tsx
// src/App.tsx
import { CanvasArea } from '@/components/canvas/CanvasArea';
import { StatusBar } from '@/components/ui/StatusBar';
import './index.css';

// Phase A scaffold: bare layout. Replaced by themed shell in Phase B onward.
function App() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }}>
      <CanvasArea />
      <StatusBar />
    </div>
  );
}

export default App;
```

- [ ] **Step 5.2: Verify TypeScript compiles**

```bash
pnpm run typecheck
```

Expected: no errors. (CanvasArea will fail typecheck if it still imports antd — fixed in Task 6.)

If CanvasArea is the only remaining Ant consumer and typecheck flags it, proceed to Task 6 immediately.

---

### Task 6: Rewrite `src/components/canvas/CanvasArea.tsx` (drop Ant `<Content>` + `<Text>`)

**Files:**
- Modify: `src/components/canvas/CanvasArea.tsx`

The file is 232 lines; only the imports, the wrapper element, and the helpText overlay use Ant. R3F logic is unchanged.

- [ ] **Step 6.1: Edit the imports**

Remove these two lines (currently lines 1, 14, 15):
```ts
import { Layout, Typography } from 'antd'
// ...
const { Content } = Layout
const { Text } = Typography
```

(No replacement import needed; we use plain HTML elements.)

- [ ] **Step 6.2: Edit the wrapper element (was `<Content>`)**

Find the JSX root of the component (currently around line 103):

```tsx
<Content className={`app-content ${isPlacing ? 'placing' : ''} ${isPlacing && isPlacementInvalid ? 'placing-invalid' : ''} ${isWiring ? 'wiring' : ''} ${isDragActive ? 'dragging' : ''} ${isDragInvalid ? 'dragging-invalid' : ''}`}>
```

Replace with:

```tsx
<div
  className={`app-content ${isPlacing ? 'placing' : ''} ${isPlacing && isPlacementInvalid ? 'placing-invalid' : ''} ${isWiring ? 'wiring' : ''} ${isDragActive ? 'dragging' : ''} ${isDragInvalid ? 'dragging-invalid' : ''}`}
  style={{ position: 'relative', flex: 1, width: '100%', overflow: 'hidden' }}
>
```

The class names reference rules from `App.css` which we delete in Task 7 — they become no-ops, harmless. The inline style provides the bare-minimum layout (flex item filling available vertical space, relative for overlay positioning, hidden overflow).

The matching closing tag (currently `</Content>` at the end of the JSX) becomes `</div>`.

- [ ] **Step 6.3: Edit the help overlay (was `<Text>`)**

Find the help overlay block (currently around line 226):

```tsx
{/* Help overlay */}
<div className="help-overlay">
  <Text type="secondary">{helpText}</Text>
</div>
```

Replace with:

```tsx
{/* Help overlay (Phase A — restyled in Phase C-3d HelpBar) */}
<div
  style={{
    position: 'absolute',
    bottom: 8,
    left: 8,
    right: 8,
    fontSize: 12,
    opacity: 0.7,
    pointerEvents: 'none',
  }}
>
  {helpText}
</div>
```

(Inline styles are intentional Phase A placeholder — the help overlay is replaced entirely by the HelpBar shell component in Phase C-3d.)

- [ ] **Step 6.4: Verify no antd imports remain in the file**

```bash
rg "antd" src/components/canvas/CanvasArea.tsx
```

Expected: zero matches.

- [ ] **Step 6.5: Verify typecheck**

```bash
pnpm run typecheck
```

Expected: green.

---

### Task 7: Delete `src/App.css`

**Files:**
- Delete: `src/App.css`

- [ ] **Step 7.1: Verify no live import of `App.css` remains**

```bash
rg "from ['\"].*App\\.css['\"]|import ['\"].*App\\.css['\"]" src/
```

Expected: zero matches. (`src/App.tsx` Phase A scaffold doesn't import it; CanvasArea references CSS class names but no longer through an explicit import.)

- [ ] **Step 7.2: Delete the file**

```bash
rm src/App.css
```

- [ ] **Step 7.3: Verify typecheck and build**

```bash
pnpm run typecheck && pnpm run build
```

Expected: both green.

---

### Task 8: `.skip` all `@ui` Playwright specs

For each of the 8 `.ui.spec.ts` files, wrap the top-level `test.describe` (or each test) with `.skip` and add a TODO comment.

- [ ] **Step 8.1: Edit each spec file**

Convert:
```ts
test.describe('Wire creation @ui', () => {
  // ...
});
```
to:
```ts
// TODO(design-system-migration): re-enable in Phase E once new shell selectors land.
test.describe.skip('Wire creation @ui', () => {
  // ...
});
```

(If a spec uses bare `test('...', async ({ page }) => { ... })` instead of `describe`, change `test(` → `test.skip(` for each test in the file.)

Files:
- [ ] `e2e/specs/gates/gate-placement.ui.spec.ts`
- [ ] `e2e/specs/gates/gate-types.ui.spec.ts`
- [ ] `e2e/specs/gates/gate-movement.ui.spec.ts`
- [ ] `e2e/specs/wiring/wire-creation.ui.spec.ts`
- [ ] `e2e/specs/wiring/wire-persistence.ui.spec.ts`
- [ ] `e2e/specs/simulation/simulation-control.ui.spec.ts`
- [ ] `e2e/specs/simulation/signal-propagation.ui.spec.ts`
- [ ] `e2e/specs/performance/render-sanity.ui.spec.ts`

- [ ] **Step 8.2: Verify all `@ui` specs are skipped**

```bash
rg "test\\.describe\\s*\\(" e2e/specs/**/*.ui.spec.ts
rg "test\\.describe\\.skip\\s*\\(" e2e/specs/**/*.ui.spec.ts
```

The first command should return zero. The second should return one match per `.ui.spec.ts` file (8 total) — or as many describe blocks as exist.

- [ ] **Step 8.3: Run e2e UI specs to confirm all skipped**

```bash
pnpm run test:e2e:ui
```

Expected: 0 passed, N skipped, 0 failed (where N is the number of test cases).

---

### Task 9: Remove Ant Design from `package.json`

**Files:**
- Modify: `package.json`
- Modify (auto): `pnpm-lock.yaml`

- [ ] **Step 9.1: Remove the dependencies**

```bash
pnpm remove antd @ant-design/icons
```

This updates `package.json` and regenerates `pnpm-lock.yaml`.

- [ ] **Step 9.2: Final Ant grep — must be zero**

```bash
rg "from ['\"]antd['\"]|from ['\"]@ant-design" src/ e2e/
rg "antd|@ant-design" package.json
```

Expected: zero matches in `src/` and `e2e/`. The `package.json` grep should also return zero.

If any match remains in `src/` or `e2e/`, STOP and triage — likely a missed sweep callsite.

---

### Task 10: Final Phase A verification gate

- [ ] **Step 10.1: Lint**

```bash
pnpm run lint
```

Expected: green.

- [ ] **Step 10.2: Unit tests**

```bash
pnpm run test:run
```

Expected: green. Test count drops from baseline by the number of tests in the deleted spec files (Sidebar, GateSelector, NodeSelector, NodeRenameControl).

- [ ] **Step 10.3: Store E2E**

```bash
pnpm run test:e2e:store
```

Expected: green. No spec changes here — proves the store API is still healthy after the notify sweep.

- [ ] **Step 10.4: UI E2E (smoke — confirm all skipped)**

```bash
pnpm run test:e2e:ui
```

Expected: 0 passed, all skipped, 0 failed.

- [ ] **Step 10.5: Build**

```bash
pnpm run build
```

Expected: green. Bundle size noticeably smaller than baseline (Ant removed).

- [ ] **Step 10.6: Manual sanity in dev**

```bash
pnpm run dev
```

Open the dev URL. Expected: ugly bare-HTML viewport with the R3F canvas visible. No interactive UI affordances. Help text in bottom-left of the canvas region. StatusBar invisible (no messages).

Then in browser devtools console:

```js
// Trigger a status message to confirm StatusBar still works
circuitActions.addStatusMessage({ severity: 'info', text: 'Phase A verification' });
```

Expected: status pill renders at bottom (still old CSS-module style). Click to dismiss works.

```js
// Trigger a notify call (will console.warn since it's still a stub)
import('/src/lib/notify.ts').then(m => m.notify.error('test'));
```

Expected: `[notify.error] test` in console. (Sonner toast comes in Phase B.)

---

### Task 11: Commit Phase A

- [ ] **Step 11.1: Stage and commit**

```bash
git add -A
git status                    # review the diff one more time

git commit -m "$(cat <<'EOF'
feat(ui)!: strip Ant Design and lay groundwork for shadcn migration

BREAKING CHANGE: Removes the Ant Design UI shell. The app renders only the
3D canvas and StatusBar in this commit; interactive UI affordances return
in subsequent commits as the new shadcn-based shell is built.

Ant Design and @ant-design/icons removed from package.json. All 75 message.*
callsites (production + tests) swapped to a temporary notify shim that
console.warn-logs (replaced by Sonner-backed implementation in Phase B).

Deleted Ant-dependent components: Sidebar, GateSelector, NodeSelector,
NodeRenameControl, DemoOverlay, ThemeProvider (Ant ConfigProvider variant),
and 329-line App.css. CanvasArea rewritten to drop Layout/Content/Typography
in favour of plain HTML wrappers.

@ui Playwright specs marked .skip with TODO references for Phase E
restoration. @store specs untouched and green.

CI gates green: lint, test:run, test:e2e:store, build.

Refs: docs/specs/2026-04-17-design-system-migration-design.md
Refs: docs/plans/2026-04-17-design-system-migration/01-phase-a-ant-strip.md
EOF
)"
```

- [ ] **Step 11.2: Verify commit landed**

```bash
git log -1 --stat | head -40
```

- [ ] **Step 11.3: Update todo list**

Mark chunk 1 complete; mark chunk 2 in-progress.

---

## Phase A complete

Chunk 1 done. Move to [`02-phase-b-foundation.md`](./02-phase-b-foundation.md).
