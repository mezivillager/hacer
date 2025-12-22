/**
 * Store Test Fixture
 *
 * Lighter fixture for store-driven tests that don't need
 * to wait for the 3D scene to be ready.
 */

import { test as base } from '@playwright/test'
import { UI_SELECTORS } from '../selectors'
import { TIMEOUTS } from '../config/constants'

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
      await page.goto('/')
      await page.waitForSelector(UI_SELECTORS.appTitle, { timeout: TIMEOUTS.selector })
      // Wait for store to be available (required for store tests)
      await page.waitForFunction(() => window.__CIRCUIT_STORE__ !== undefined, { timeout: TIMEOUTS.store })
      // Skip scene ready wait - store tests don't need 3D scene
      await use()
    },
    { auto: true },
  ],
})

export { expect } from '@playwright/test'
