/**
 * Base Test Fixture
 *
 * Extends Playwright's test to automatically set up the page
 * before each test, eliminating duplicate beforeEach blocks.
 */

import { test as base } from '@playwright/test'
import { waitForSceneReady } from '../helpers/waits'
import { UI_SELECTORS } from '../selectors'
import { TIMEOUTS } from '../config/constants'

/**
 * Extended test fixture with automatic page setup.
 *
 * Usage:
 * ```ts
 * import { test, expect } from '../fixtures/base.fixture'
 *
 * test('my test', async ({ page }) => {
 *   // Page is already set up: navigated, app loaded, scene ready
 * })
 * ```
 */
export const test = base.extend<{ setupComplete: void }>({
  setupComplete: [
    async ({ page }, use) => {
      await page.goto('/')
      await page.waitForSelector(UI_SELECTORS.appTitle, { timeout: TIMEOUTS.selector })
      await page.waitForSelector(UI_SELECTORS.canvas, { timeout: TIMEOUTS.selector })
      await waitForSceneReady(page)
      await use()
    },
    { auto: true },
  ],
})

export { expect } from '@playwright/test'
