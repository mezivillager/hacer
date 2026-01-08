/**
 * UI Test Fixture
 *
 * Fixture that loads the scene once per worker and automatically clears
 * circuit state after each test. This significantly speeds up test execution
 * by avoiding page reloads while ensuring clean state between tests.
 *
 * Usage:
 * ```ts
 * import { uiTest as test, uiExpect as expect } from '../fixtures'
 *
 * test('my test', async ({ page }) => {
 *   // Scene is ready, circuit is clean, tests run fast
 * })
 * ```
 */

import { test as base, Page, BrowserContext } from '@playwright/test'
import { UI_SELECTORS } from '../selectors'
import { TIMEOUTS } from '../config/constants'
import { waitForSceneReady } from '../helpers/waits'
import { clearScene, waitForStore } from '../helpers/scene/scene-manager'

interface UIFixtures {
  page: Page
}

interface UIWorkerFixtures {
  sharedContext: BrowserContext
  sharedPage: Page
}

/**
 * Extended test fixture with worker-scoped page and automatic cleanup.
 * - Worker-scoped: Browser context and page loaded once per worker
 * - Test-scoped: Page alias + automatic scene clearing after each test
 */
export const test = base.extend<UIFixtures, UIWorkerFixtures>({
  // Worker-scoped: Create browser context once per worker
  sharedContext: [
    async ({ browser }, use) => {
      const context = await browser.newContext()
      await use(context)
      await context.close()
    },
    { scope: 'worker' },
  ],

  // Worker-scoped: Create and initialize page once per worker
  sharedPage: [
    async ({ sharedContext }, use) => {
      const page = await sharedContext.newPage()

      // Navigate and wait for app to be ready
      await page.goto('/')
      await page.waitForSelector(UI_SELECTORS.appTitle, {
        timeout: TIMEOUTS.selector,
      })
      await page.waitForSelector(UI_SELECTORS.canvas, {
        timeout: TIMEOUTS.selector,
      })

      // Wait for store and scene to be ready
      await waitForStore(page)
      await waitForSceneReady(page)

      await use(page)
    },
    { scope: 'worker' },
  ],

  // Test-scoped: Provide page alias with automatic cleanup
  page: [
    async ({ sharedPage }, use) => {
      // Use the worker-scoped page directly
      await use(sharedPage)

      // Automatically clear scene after each test
      // Only clear if page is still open and valid
      try {
        if (!sharedPage.isClosed()) {
          await clearScene(sharedPage)
        }
      } catch (error) {
        // Ignore errors during cleanup - page might be closed or in bad state
        // This can happen if test timed out or failed catastrophically
        console.warn('Failed to clear scene after test:', error)
      }
    },
    { scope: 'test' },
  ],
})

export { expect } from '@playwright/test'

