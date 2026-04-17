/**
 * Common Setup Helpers
 *
 * Reusable setup functions for test initialization.
 */

import { Page } from '@playwright/test'
import { UI_SELECTORS } from '../../selectors'
import { APP_ENTRY_URL, TIMEOUTS } from '../../config/constants'
import { waitForSceneReady } from '../waits'

/**
 * Standard page setup: navigate, wait for canvas, and scene ready.
 * Phase A note: appTitle wait dropped \u2014 lived in deleted Sidebar.
 * Full UI_SELECTORS rewrite in Phase E (chunk 9).
 */
export async function setupPage(page: Page): Promise<void> {
  await page.goto(APP_ENTRY_URL)
  await page.waitForSelector(UI_SELECTORS.canvas, { timeout: TIMEOUTS.selector })
  await waitForSceneReady(page)
}
