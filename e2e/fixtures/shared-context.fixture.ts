/**
 * Shared Context Fixture
 *
 * Fixture that loads the scene once per worker and clears between tests.
 * This significantly speeds up test execution by avoiding page reloads.
 *
 * Usage:
 * ```ts
 * import { test, expect } from '../fixtures/shared-context.fixture'
 * import { clearScene } from '../helpers/scene'
 *
 * test.describe('My Suite', () => {
 *   test.afterEach(async ({ page }) => {
 *     await clearScene(page)
 *   })
 *
 *   test('my test', async ({ page }) => {
 *     // Scene is ready, tests run faster
 *   })
 * })
 * ```
 */

import { test as base, Page, BrowserContext } from '@playwright/test'
import { UI_SELECTORS } from '../selectors'
import { APP_ENTRY_URL, TIMEOUTS } from '../config/constants'

interface SharedContextFixtures {
  sharedContext: BrowserContext
  sharedPage: Page
}

/**
 * Extended test fixture with worker-scoped browser context and page.
 * The page is loaded once and reused across all tests in the worker.
 */
export const test = base.extend<object, SharedContextFixtures>({
  sharedContext: [
    async ({ browser }, use) => {
      const context = await browser.newContext()
      await use(context)
      await context.close()
    },
    { scope: 'worker' },
  ],

  sharedPage: [
    async ({ sharedContext }, use) => {
      const page = await sharedContext.newPage()

      // Navigate and wait for app to be ready.
      // Phase A note: appTitle wait dropped \u2014 lived in deleted Sidebar.
      // Full UI_SELECTORS rewrite in Phase E (chunk 9).
      await page.goto(APP_ENTRY_URL)
      await page.waitForSelector(UI_SELECTORS.canvas, {
        timeout: TIMEOUTS.selector,
      })

      // Wait for scene to be fully ready
      await page.waitForFunction(() => window.__SCENE_READY__ === true, {
        timeout: TIMEOUTS.scene,
      })

      await use(page)
    },
    { scope: 'worker' },
  ],
})

export { expect } from '@playwright/test'

