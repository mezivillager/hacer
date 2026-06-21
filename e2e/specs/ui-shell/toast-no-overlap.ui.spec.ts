/**
 * Toast / RightActionBar overlap regression test (B-002)
 *
 * Verifies that Sonner toasts at position="top-right" never horizontally
 * overlap the RightActionBar in either state:
 *   (a) Drawer CLOSED — toast clears the ~44 px icon column.
 *   (b) Drawer OPEN  — toast clears the icon column + 280 px panel drawer.
 *
 * Approach:
 *  1. Load the app (worker-scoped page already navigated and ready).
 *  2. Trigger a warning toast deterministically via window.__CIRCUIT_ACTIONS__
 *     (completeWiring with no active wiringFrom → "No active wiring operation").
 *  3. Wait for the Sonner toast element to appear in the DOM.
 *  4. Compare bounding rects: assert toast.right <= bar.left (no horizontal overlap).
 *
 * Tag: @ui @ui-shell @regression
 */

import type { Page } from '@playwright/test'
import { uiTest as test, uiExpect as expect } from '../../fixtures'

/** Trigger a warning toast without any UI interaction. */
async function triggerWarningToast(page: Page) {
  // completeWiring() with no active wiringFrom state emits notify.warning('No active wiring operation')
  await page.evaluate(() => {
    window.__CIRCUIT_ACTIONS__?.completeWiring('__probe__', '__probe__', 'input')
  })
}

/** Dismiss all visible toasts so the next test starts clean. */
async function dismissToasts(page: Page) {
  // Click all close buttons; ignore failures if none present
  const closeButtons = page.locator('[data-sonner-toast] [data-close-button]')
  const count = await closeButtons.count()
  for (let i = 0; i < count; i++) {
    await closeButtons.nth(i).click({ force: true }).catch(() => {/* already gone */})
  }
  // Wait a beat for Sonner's exit animation
  await page.waitForTimeout(300)
}

test.describe('Toast positioning — no overlap with RightActionBar @ui @ui-shell @regression', () => {
  test('(a) drawer CLOSED: toast right edge does not overlap the right action bar', async ({ page }) => {
    // Guarantee drawer is closed: if a panel trigger is active (secondary variant), click it to toggle off.
    // Checking store state is the most reliable way to know the panel is closed.
    const isOpen = await page.evaluate(() => !!window.__CIRCUIT_STORE__?.rightPanelOpen)
    if (isOpen) {
      // Find the active trigger and click it to toggle the drawer closed
      const activeTrigger = page.locator('[data-testid^="right-bar-"][data-testid$="-trigger"][data-variant="secondary"]').first()
      if (await activeTrigger.count() > 0) {
        await activeTrigger.click()
      }
      // Wait for the store to reflect closed state
      await page.waitForFunction(() => !window.__CIRCUIT_STORE__?.rightPanelOpen, { timeout: 3000 })
      await page.waitForTimeout(250) // let CSS transition settle
    }

    await triggerWarningToast(page)

    const firstToast = page.locator('[data-sonner-toast]').first()
    await expect(firstToast).toBeVisible({ timeout: 5000 })

    const toastRect = await firstToast.boundingBox()
    const barRect = await page.locator('[data-testid="right-action-bar"]').boundingBox()

    expect(toastRect).not.toBeNull()
    expect(barRect).not.toBeNull()

    if (!toastRect || !barRect) throw new Error('Could not get bounding boxes')

    const toastRight = toastRect.x + toastRect.width
    const barLeft = barRect.x

    // Toast right edge must not overlap the action bar's left edge
    expect(toastRight).toBeLessThanOrEqual(barLeft)

    await dismissToasts(page)
  })

  test('(b) drawer OPEN: toast right edge does not overlap the right-bar-drawer', async ({ page }) => {
    // Open the Info panel drawer via its trigger
    await page.click('[data-testid="right-bar-info-trigger"]')

    // Wait for the store to reflect the open state (set by RightActionBar's useEffect)
    await page.waitForFunction(() => !!window.__CIRCUIT_STORE__?.rightPanelOpen, { timeout: 3000 })
    await page.waitForTimeout(250) // let CSS transition settle

    await triggerWarningToast(page)

    const firstToast = page.locator('[data-sonner-toast]').first()
    await expect(firstToast).toBeVisible({ timeout: 5000 })

    // The drawer element itself has the correct width when open
    const drawer = page.locator('[data-testid="right-bar-drawer"]')
    const toastRect = await firstToast.boundingBox()
    const drawerRect = await drawer.boundingBox()

    expect(toastRect).not.toBeNull()
    expect(drawerRect).not.toBeNull()

    if (!toastRect || !drawerRect) throw new Error('Could not get bounding boxes')

    const toastRight = toastRect.x + toastRect.width
    const drawerLeft = drawerRect.x

    // Toast right edge must not overlap the open drawer's left edge
    expect(toastRight).toBeLessThanOrEqual(drawerLeft)

    // Clean up: close the drawer via the trigger toggle and dismiss toasts
    await page.click('[data-testid="right-bar-info-trigger"]')
    await page.waitForFunction(() => !window.__CIRCUIT_STORE__?.rightPanelOpen, { timeout: 3000 })
    await dismissToasts(page)
  })
})
