/**
 * Navigation Helpers
 *
 * Page navigation utilities.
 */

import { Page } from '@playwright/test'

/**
 * Navigate to the app root
 */
export async function navigateToApp(page: Page, path = '/'): Promise<void> {
  await page.goto(path)
}

/**
 * Reload the current page
 */
export async function reloadPage(page: Page): Promise<void> {
  await page.reload()
}
