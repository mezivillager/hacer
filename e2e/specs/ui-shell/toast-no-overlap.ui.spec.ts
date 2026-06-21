/**
 * Toast / RightActionBar overlap regression test (B-002)
 *
 * Verifies that Sonner toasts rendered at position="top-right" never
 * horizontally overlap the persistent right-action-bar icon column.
 *
 * Approach:
 *  1. Load the app (worker-scoped page already navigated and ready).
 *  2. Trigger a warning toast deterministically via window.__CIRCUIT_ACTIONS__
 *     (completeWiring with no active wiring → "No active wiring operation").
 *  3. Wait for the Sonner toast element to appear in the DOM.
 *  4. Compare bounding rects: assert toast.right <= bar.left (no horizontal overlap).
 *
 * Tag: @ui @ui-shell @regression
 */

import { uiTest as test, uiExpect as expect } from '../../fixtures'

test.describe('Toast positioning — no overlap with RightActionBar @ui @ui-shell @regression', () => {
  test('warning toast right edge does not overlap the right action bar', async ({ page }) => {
    // Trigger a warning toast without any UI interaction:
    // completeWiring() with no active wiringFrom state emits notify.warning('No active wiring operation')
    await page.evaluate(() => {
      window.__CIRCUIT_ACTIONS__?.completeWiring('__probe__', '__probe__', 'input')
    })

    // Wait for an individual toast item to appear (the toaster element is always in the DOM
    // but marked hidden when empty; the individual toast li becomes visible when a toast fires)
    const firstToast = page.locator('[data-sonner-toast]').first()
    await expect(firstToast).toBeVisible({ timeout: 5000 })

    // Get bounding rects for the toast item and the right action bar
    const toastRect = await firstToast.boundingBox()
    const barRect = await page.locator('[data-testid="right-action-bar"]').boundingBox()

    expect(toastRect).not.toBeNull()
    expect(barRect).not.toBeNull()

    if (!toastRect || !barRect) throw new Error('Could not get bounding boxes')

    const toastRight = toastRect.x + toastRect.width
    const barLeft = barRect.x

    // The toast's right edge must not extend past the bar's left edge
    expect(toastRight).toBeLessThanOrEqual(barLeft)
  })
})
