/**
 * Store Test Fixture
 *
 * Lighter fixture for store-driven tests that don't need
 * to wait for the 3D scene to be ready.
 */

import { test as base } from '@playwright/test'
import { APP_ENTRY_URL, TIMEOUTS } from '../config/constants'

/**
 * Extended test fixture for store-driven tests.
 * Skips scene ready wait since store tests don't interact with 3D canvas.
 *
 * Usage:
 * ```ts
 * import { test, expect } from '../fixtures/store.fixture'
 *
 * test('my store test', async ({ page }) => {
 *   // Page is ready, but scene wait is skipped for faster tests
 * })
 * ```
 */
export const test = base.extend<{ setupComplete: void }>({
  setupComplete: [
    async ({ page }, use) => {
      await page.goto(APP_ENTRY_URL)
      // Phase A note: appTitle selector dropped \u2014 lived in deleted Sidebar.
      // Store-global availability is the canonical mount signal for @store specs.
      // Full UI_SELECTORS rewrite happens in Phase E (chunk 9).
      await page.waitForFunction(() => window.__CIRCUIT_STORE__ !== undefined, { timeout: TIMEOUTS.store })
      // Skip scene ready wait - store tests don't need 3D scene
      await use()
    },
    { auto: true },
  ],
})

export { expect } from '@playwright/test'
