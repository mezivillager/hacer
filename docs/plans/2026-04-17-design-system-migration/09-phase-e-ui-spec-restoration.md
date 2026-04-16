# Chunk 9: Phase E — `@ui` Playwright restoration (commit 5)

> Spec ref: [`Phase E — @ui Playwright restoration`](../../specs/2026-04-17-design-system-migration-design.md#phase-e--ui-playwright-restoration-commit-5)

**Goal:** Re-enable the 8 `@ui` specs that were `.skip`-ped in chunk 1, rewrite their selectors to use the new `data-testid` discipline, and add 6 new specs covering the new shell affordances.

---

## File inventory

### Modify

| Path | Change |
|---|---|
| `e2e/selectors/ui.selectors.ts` | Replace contents with new `data-testid`-based selectors per spec §6 |
| `e2e/specs/gates/gate-placement.ui.spec.ts` | Remove `.skip`; rewrite selectors |
| `e2e/specs/gates/gate-types.ui.spec.ts` | Same |
| `e2e/specs/gates/gate-movement.ui.spec.ts` | Same |
| `e2e/specs/wiring/wire-creation.ui.spec.ts` | Same |
| `e2e/specs/wiring/wire-persistence.ui.spec.ts` | Same |
| `e2e/specs/simulation/simulation-control.ui.spec.ts` | Same |
| `e2e/specs/simulation/signal-propagation.ui.spec.ts` | Same |
| `e2e/specs/performance/render-sanity.ui.spec.ts` | Same |

### Create

| Path | Purpose |
|---|---|
| `e2e/helpers/actions/toolbar.actions.ts` | New helpers for popover-then-click flows |
| `e2e/specs/ui-shell/theme-toggle.ui.spec.ts` | Theme picker → `<html>.dark` flips |
| `e2e/specs/ui-shell/properties-panel.ui.spec.ts` | Selecting each kind shows correct panel |
| `e2e/specs/ui-shell/node-rename-via-properties-panel.ui.spec.ts` | Replaces deleted NodeRenameControl spec |
| `e2e/specs/ui-shell/right-action-bar-info.ui.spec.ts` | Drawer toggle + count updates |
| `e2e/specs/ui-shell/coming-soon-tooltips.ui.spec.ts` | Hover stubbed controls; assert tooltip text |
| `e2e/specs/ui-shell/keyboard-shortcuts-modal.ui.spec.ts` | `?` opens modal; tabs render |

### Verify (sweep)

The contract: every `data-testid` referenced in the new `e2e/selectors/ui.selectors.ts` MUST exist in the corresponding shell component. If a testid is missing, add it to the shell file (small one-line edit). The tests cannot pass without this discipline.

---

## Tasks

### Task 1: Replace `e2e/selectors/ui.selectors.ts`

- [ ] **Step 1.1: Replace contents per spec §6 (full snippet in spec)**

Use the snippet in spec §6 verbatim. Includes selectors for: canvas, toolbar (10 testids), gatesPopover, ioPopover, rightBar, infoPanel, propertiesPanel, helpBar, shortcutsModal, statusBar.

- [ ] **Step 1.2: Verify TypeScript compiles**

```bash
pnpm run typecheck
```

---

### Task 2: Add `e2e/helpers/actions/toolbar.actions.ts`

- [ ] **Step 2.1: Create the helper**

```ts
// e2e/helpers/actions/toolbar.actions.ts
import type { Page } from '@playwright/test';
import { UI_SELECTORS } from '../../selectors/ui.selectors';
import type { GateType } from '@/gates/types';

export async function selectGate(page: Page, gateType: GateType) {
  await page.click(UI_SELECTORS.toolbar.gatesTrigger);
  await page.waitForSelector(UI_SELECTORS.gatesPopover.root, { state: 'visible' });
  await page.click(UI_SELECTORS.gatesPopover.getGate(gateType));
}

export async function selectIo(page: Page, kind: 'input' | 'output' | 'junction') {
  await page.click(UI_SELECTORS.toolbar.ioTrigger);
  await page.waitForSelector(UI_SELECTORS.ioPopover.root, { state: 'visible' });
  await page.click(UI_SELECTORS.ioPopover[kind]);
}

export async function openInfoDrawer(page: Page) {
  await page.click(UI_SELECTORS.rightBar.infoTrigger);
  await page.waitForSelector(UI_SELECTORS.infoPanel.root, { state: 'visible' });
}

export async function toggleSimulation(page: Page) {
  await page.click(UI_SELECTORS.toolbar.simToggle);
}

export async function clickClearAll(page: Page) {
  await page.click(UI_SELECTORS.toolbar.clearAll);
}
```

- [ ] **Step 2.2: Re-export from `e2e/helpers/actions/index.ts`**

Add `export * from './toolbar.actions';`.

---

### Task 3: Sweep `data-testid` audit

- [ ] **Step 3.1: For each testid in the new selectors file, grep the shell components**

```bash
for tid in compact-toolbar toolbar-gates-trigger toolbar-io-trigger toolbar-sim-toggle \
           toolbar-axes-toggle toolbar-delete-selected toolbar-clear-all toolbar-theme-trigger \
           toolbar-github-link toolbar-version gates-popover io-popover \
           right-action-bar right-bar-info-trigger right-bar-layers-trigger right-bar-history-trigger \
           right-bar-drawer right-bar-drawer-close info-panel info-status-pill \
           info-stat-gates info-stat-wires info-stat-inputs info-stat-outputs \
           properties-panel properties-type-label properties-name-field properties-delete properties-close \
           help-bar help-bar-expand-button help-bar-all-shortcuts shortcuts-modal status-bar; do
  if ! rg -q "data-testid=\"$tid\"" src/components/; then
    echo "MISSING: $tid"
  fi
done
```

- [ ] **Step 3.2: For every MISSING testid, add it to the corresponding shell**

Single-line edits per missing testid. Re-run the audit until zero MISSING.

---

### Task 4: Per-spec rewrite (8 existing specs)

For each `*.ui.spec.ts`:

- [ ] **Step 4.x.1: Remove `.skip`**

Find `test.describe.skip(` (or `test.skip(`) added in chunk 1; remove the `.skip`.

- [ ] **Step 4.x.2: Update selectors**

Replace text-based and class-based selectors with `data-testid`-based selectors from the new `UI_SELECTORS`. Common rewrites:
- `text=Run Simulation` → `UI_SELECTORS.toolbar.simToggle`
- `.gate-icon[data-gate-type="NAND"]` → use `selectGate(page, 'NAND')` helper
- `text=/Gates: \\d+/` → open Info drawer first then read `UI_SELECTORS.infoPanel.gatesCount`

- [ ] **Step 4.x.3: For Circuit Info reads, prepend `await openInfoDrawer(page)`**

- [ ] **Step 4.x.4: Run the spec, fix any flakiness**

```bash
pnpm exec playwright test <spec-path> --reporter=line
```

(Per `tasks/lessons.md` 2026-03-29: use `--reporter=line`, not html.)

Spec files in suggested order (low-effort first):
- [ ] `e2e/specs/performance/render-sanity.ui.spec.ts` (Low)
- [ ] `e2e/specs/gates/gate-movement.ui.spec.ts` (Low)
- [ ] `e2e/specs/wiring/wire-creation.ui.spec.ts` (Low)
- [ ] `e2e/specs/wiring/wire-persistence.ui.spec.ts` (Low)
- [ ] `e2e/specs/gates/gate-placement.ui.spec.ts` (Medium)
- [ ] `e2e/specs/gates/gate-types.ui.spec.ts` (Medium)
- [ ] `e2e/specs/simulation/simulation-control.ui.spec.ts` (Medium)
- [ ] `e2e/specs/simulation/signal-propagation.ui.spec.ts` (Medium)

---

### Task 5: Add 6 new `@ui` specs

Each spec is small; common pattern below.

- [ ] **Step 5.1: `theme-toggle.ui.spec.ts`**

```ts
import { test, expect } from '../../fixtures/ui.fixture';
import { UI_SELECTORS } from '../../selectors/ui.selectors';

test.describe('Theme toggle @ui', () => {
  test('toggling theme flips html.dark class', async ({ page }) => {
    await page.click(UI_SELECTORS.toolbar.themeTrigger);
    await page.click('[data-testid="toolbar-theme-light"]');
    await expect(page.locator('html')).not.toHaveClass(/\\bdark\\b/);

    await page.click(UI_SELECTORS.toolbar.themeTrigger);
    await page.click('[data-testid="toolbar-theme-dark"]');
    await expect(page.locator('html')).toHaveClass(/\\bdark\\b/);
  });
});
```

- [ ] **Step 5.2: `properties-panel.ui.spec.ts`** — place gate, click it, assert panel renders with type label `AND`.

- [ ] **Step 5.3: `node-rename-via-properties-panel.ui.spec.ts`** — place input node, click it, type new name in panel name field, press Enter, assert store updates (`window.useCircuitStore.getState().inputNodes[0].name`).

- [ ] **Step 5.4: `right-action-bar-info.ui.spec.ts`** — open Info drawer, assert gates count = 0; place gates via `selectGate` + canvas click; reopen drawer; assert count updated.

- [ ] **Step 5.5: `coming-soon-tooltips.ui.spec.ts`** — hover one stubbed control per surface (settings in toolbar, undo in rightbar, layers panel, color in properties-panel); assert tooltip text matches `/coming soon/i`.

- [ ] **Step 5.6: `keyboard-shortcuts-modal.ui.spec.ts`** — press `?`; assert modal open with 4 tabs; click each tab; press Esc; assert modal closes.

For each spec:
- [ ] Run in isolation: `pnpm exec playwright test <path> --reporter=line`

---

### Task 6: Phase E verification gate

- [ ] **Step 6.1: Mandatory gates plus `@ui`**

```bash
pnpm run lint
pnpm run test:run
pnpm run test:e2e:store
pnpm run test:e2e:ui              # ALL specs green; no .skip remaining from this migration
pnpm run build
```

- [ ] **Step 6.2: Verify zero `.skip` from this migration**

```bash
rg "\\.skip" e2e/specs/ | rg -v "(legacy|temporarily-broken-flake)"
```

Expected: zero matches with the migration TODO comment. Any other `.skip` (pre-existing, unrelated to migration) is OK.

---

### Task 7: Commit Phase E

```bash
git add -A
git commit -m "$(cat <<'EOF'
test(e2e): restore @ui specs against new shell selectors

Replaces e2e/selectors/ui.selectors.ts with a data-testid-based contract
covering CompactToolbar, RightActionBar drawer, InfoPanel, PropertiesPanel,
HelpBar, KeyboardShortcutsModal, and StatusBar. Adds toolbar.actions.ts
helpers for popover-then-click flows.

Re-enables all 8 .skip-ped @ui specs from chunk 1; updates selectors and
adds drawer-open prefixes for Info-panel reads. Adds 6 new specs covering
new affordances: theme toggle, properties panel rendering per kind, node
rename via PropertiesPanel (replaces deleted NodeRenameControl spec),
RightActionBar Info drawer, Coming soon tooltip regression guard, keyboard
shortcuts modal.

CI gates green: lint, test:run, test:e2e:store, test:e2e:ui, build.

Refs: docs/plans/2026-04-17-design-system-migration/09-phase-e-ui-spec-restoration.md
EOF
)"
```

Move to chunk 10.

---

## Phase E complete

Move to [`10-phase-f-polish.md`](./10-phase-f-polish.md).
