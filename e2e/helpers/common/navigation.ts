/**
 * Navigation Helpers
 *
 * Page navigation utilities.
 */

import { Page } from '@playwright/test'
import { APP_ENTRY_URL } from '../../config/constants'

/**
 * Navigate to the app root (demo tour suppressed by default for E2E)
 */
export async function navigateToApp(page: Page, path = APP_ENTRY_URL): Promise<void> {
  await page.goto(path)
}

/**
 * Reload the current page
 */
export async function reloadPage(page: Page): Promise<void> {
  await page.reload()
}
