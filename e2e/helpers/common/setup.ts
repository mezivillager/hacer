/**
 * Common Setup Helpers
 *
 * Reusable setup functions for test initialization.
 */

import { Page } from '@playwright/test'
import { UI_SELECTORS } from '../../selectors'
import { TIMEOUTS } from '../../config/constants'
import { waitForSceneReady } from '../waits'

/**
 * Standard page setup: navigate, wait for app title, canvas, and scene ready
 */
export async function setupPage(page: Page): Promise<void> {
  await page.goto('/')
  await page.waitForSelector(UI_SELECTORS.appTitle, { timeout: TIMEOUTS.selector })
  await page.waitForSelector(UI_SELECTORS.canvas, { timeout: TIMEOUTS.selector })
  await waitForSceneReady(page)
}
