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
 * Both files share the same scenario from e2e/scenarios/:
 *   - e2e/scenarios/featureName.ts
 *
 * TDD Workflow:
 * 1. Create scenario file in e2e/scenarios/
 * 2. Create STORE test first (fast iteration)
 * 3. Run store tests to verify they fail
 * 4. Implement features to pass
 * 5. Create matching UI test (validates real user interactions)
 * 6. Run UI tests manually to verify
 *
 * AI Agents: Always work with STORE tests for speed. Create UI tests after.
 */

// When using this template, copy to e2e/specs/ and use:
// import { test, expect } from '../fixtures';
import { test, expect } from '@playwright/test';
// Import scenario:
// import { yourScenario } from '../scenarios';
// Import helpers as needed:
// import { addGateViaUI, connectWiresViaUI } from '../helpers/actions';
// import { expectGateCount, expectWireCount } from '../helpers/assertions';
// import { ensureGates, waitForSceneStable } from '../helpers/waits';

// ============================================================================
// STORE TEST TEMPLATE (feature-name.store.spec.ts)
// ============================================================================
// FAST tests - use for TDD, AI agents, pre-commit hooks
// No scene waits, direct store actions

test.describe('Feature Name (Store) @store', () => {
  // Store tests are FAST - preferred for TDD iteration
  // Use shared scenario data from e2e/scenarios/

  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    // NO waitForSceneStable - that's what makes store tests fast
  });

  test('can perform action via store', async ({ page }) => {
    // Use store actions directly (fast, no UI waits)
    // const { placements } = yourScenario;
    // await page.evaluate((pos) => {
    //   window.__STORE__.getState().actions.addGate('NAND', pos);
    // }, placements[0].position);

    // Assert on store state
    // const gateCount = await page.evaluate(() =>
    //   Object.keys(window.__STORE__.getState().gates).length
    // );
    // expect(gateCount).toBe(1);

    // TODO: Replace with real test
    expect(true).toBe(false);
  });

  test('store state updates correctly', async ({ page }) => {
    // Test state changes from scenario
    // const { wire } = yourScenario;
    // await page.evaluate((w) => {
    //   window.__STORE__.getState().actions.connectWire(w);
    // }, wire);

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
  // Share same scenario as store tests

  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    // await waitForSceneStable(page); // Required for UI tests
  });

  test('user can perform action via UI', async ({ page }) => {
    // Use UI helpers (slower, realistic)
    // const { placements } = yourScenario;
    // await addGateViaUI(page, {
    //   type: 'NAND',
    //   position: placements[0].position
    // });

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
 * - [ ] e2e/scenarios/featureName.ts       (shared test data)
 * - [ ] e2e/specs/feature-name.store.spec.ts (FAST - @store)
 * - [ ] e2e/specs/feature-name.ui.spec.ts    (SLOW - @ui)
 *
 * Before committing:
 * - [ ] Scenario file exports typed test data
 * - [ ] Store tests use direct store actions (no UI waits)
 * - [ ] UI tests use UI helpers with scene waits
 * - [ ] Both spec files import the SAME scenario
 * - [ ] Store tests ran and FAILED before implementation
 * - [ ] Store tests pass after implementation
 * - [ ] UI tests verified manually (not required for commit)
 *
 * Running E2E tests:
 * - npm run test:e2e:store     # FAST - run before every commit
 * - npm run test:e2e:ui        # SLOW - run manually or CI only
 * - npm run test:e2e           # All tests (slow)
 * - npm run test:e2e:headed    # With browser visible
 *
 * AI Agent Workflow:
 * 1. Create scenario in e2e/scenarios/
 * 2. Write store test first (fast TDD iteration)
 * 3. Implement feature
 * 4. Create matching UI test
 * 5. Run: npm run test:e2e:store (must pass before commit)
 */
