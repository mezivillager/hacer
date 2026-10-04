/* eslint-disable @typescript-eslint/no-unused-vars */
/**
 * TDD E2E Test Template
 *
 * NOTE: Remove the eslint-disable comment when using this template!
 *
 * IMPORTANT: E2E tests come in PAIRS - Store tests and UI tests.
 *
 * File naming convention:
 *   - e2e/specs/feature-name.store.spec.ts  (FAST - for TDD, AI agents, pre-commit)
 *   - e2e/specs/feature-name.ui.spec.ts     (SLOW - manual/CI only, twice weekly)
 *
 * Both files drive the same circuit through e2e/helpers/:
 *
 * TDD Workflow:
 * 1. Write the shared setup as a helper in e2e/helpers/
 * 2. Create STORE test first (fast iteration)
 * 3. Run store tests to verify they fail
 * 4. Implement features to pass
 * 5. Create matching UI test (validates real user interactions)
 * 6. Run UI tests manually to verify
 *
 * AI Agents: Always work with STORE tests for speed. Create UI tests after.
 */

// When using this template, copy each half to e2e/specs/<area>/ and import its fixture:
//   store spec: import { storeTest as test, storeExpect as expect } from '../../fixtures';
//   UI spec:    import { uiTest as test, uiExpect as expect } from '../../fixtures';
import { test, expect } from '@playwright/test';
// Import helpers as needed — they drive the app through window.__CIRCUIT_ACTIONS__ and
// read window.__CIRCUIT_STORE__, so a spec rarely needs page.evaluate of its own:
// import { DEFAULT_POSITIONS } from '../../config/constants';
// import { addGateViaStore, addWireViaStore, addGateViaUI } from '../../helpers/actions';
// import { expectGateCount, expectWireCount } from '../../helpers/assertions';
// import { ensureGates, ensureWires, waitForSceneReady } from '../../helpers/waits';

// ============================================================================
// STORE TEST TEMPLATE (feature-name.store.spec.ts)
// ============================================================================
// FAST tests - use for TDD, AI agents, pre-commit hooks
// No scene waits, direct store actions

test.describe('Feature Name (Store) @store', () => {
  // Store tests are FAST - preferred for TDD iteration
  // Use shared setup from e2e/helpers/
  // storeTest opens the app and waits for window.__CIRCUIT_STORE__ only: NO scene wait,
  // which is what makes store tests fast. No beforeEach of your own is needed.

  test('can perform action via store', async ({ page }) => {
    // Use store actions directly (fast, no UI waits)
    // const gate = await addGateViaStore(page, 'Nand', DEFAULT_POSITIONS.center);
    // await ensureGates(page, 1);

    // Assert on store state
    // expect(gate).not.toBeNull();
    // await expectGateCount(page, 1);

    // TODO: Replace with real test
    expect(true).toBe(false);
  });

  test('store state updates correctly', async ({ page }) => {
    // Test state changes through the same helpers
    // const a = await addGateViaStore(page, 'Nand', DEFAULT_POSITIONS.left);
    // const b = await addGateViaStore(page, 'Not', DEFAULT_POSITIONS.right);
    // await addWireViaStore(page, {
    //   fromGateId: a!.id, fromPinId: a!.outputs[0].id,
    //   toGateId: b!.id, toPinId: b!.inputs[0].id,
    // });
    // await ensureWires(page, 1);

    // TODO: Replace with real test
    expect(true).toBe(false);
  });
});

// ============================================================================
// UI TEST TEMPLATE (feature-name.ui.spec.ts)
// ============================================================================
// SLOW tests - run manually or on CI (twice weekly)
// Uses real UI interactions, waits for scene ready

test.describe('Feature Name (UI) @ui', () => {
  // UI tests are SLOW but realistic
  // Drive the same circuit as the store tests
  // uiTest opens the app, waits for the store and then for waitForSceneReady.

  test('user can perform action via UI', async ({ page }) => {
    // Use UI helpers (slower, realistic)
    // await addGateViaUI(page, { chipName: 'Nand', position: DEFAULT_POSITIONS.center });
    // await ensureGates(page, 1);

    // Assert on visible elements
    // await expectGateCount(page, 1);

    // TODO: Replace with real test
    expect(true).toBe(false);
  });

  test('user sees correct feedback', async ({ page }) => {
    // Test visual feedback and UI state
    // await expect(page.locator('[data-testid="result"]')).toBeVisible();

    // TODO: Replace with real test
    expect(true).toBe(false);
  });
});

/**
 * E2E Test Pairing Checklist:
 *
 * Files to create:
 * - [ ] e2e/specs/feature-name.store.spec.ts (FAST - @store)
 * - [ ] e2e/specs/feature-name.ui.spec.ts    (SLOW - @ui)
 *
 * Before committing:
 * - [ ] Shared setup lives in e2e/helpers/, shared data in e2e/config/constants.ts
 * - [ ] Store tests use direct store actions (no UI waits)
 * - [ ] UI tests use UI helpers with scene waits
 * - [ ] Both spec files drive the same circuit through the same helpers
 * - [ ] Store tests ran and FAILED before implementation
 * - [ ] Store tests pass after implementation
 * - [ ] UI tests verified manually (not required for commit)
 *
 * Running E2E tests:
 * Every Playwright suite mounts the 3D canvas, so none runs on a laptop (ADR-0016).
 * Run them in CI, or in the cloud by hand (not a done-criterion):
 * - gh workflow run e2e.yml -f suite=store|ui|all
 *
 * AI Agent Workflow:
 * 1. Write the shared setup as a helper in e2e/helpers/
 * 2. Write store test first (fast TDD iteration)
 * 3. Implement feature
 * 4. Create matching UI test
 * 5. Trigger the store suite in the cloud when the change warrants browser-level checking
 */
