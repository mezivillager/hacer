import { uiTest as test, uiExpect as expect } from '../../fixtures'
import { UI_SELECTORS } from '../../selectors'

// Each test is independent: any test that opens the modal also closes it
// at the end. The shared worker page carries state between tests.
async function ensureModalClosed(page: import('@playwright/test').Page) {
  if (await page.locator(UI_SELECTORS.shortcutsModal).isVisible().catch(() => false)) {
    await page.keyboard.press('Escape')
    await page.locator(UI_SELECTORS.shortcutsModal).waitFor({ state: 'hidden' })
  }
}

test.describe('Keyboard shortcuts modal @ui @ui-shell', () => {
  test.beforeEach(async ({ page }) => {
    await ensureModalClosed(page)
  })

  test('? key opens the modal', async ({ page }) => {
    // Click the canvas to ensure focus is on the document body, not an input
    await page.locator(UI_SELECTORS.canvas).click({ force: true })
    // Dispatch the ? keydown directly to bypass keyboard-layout differences
    await page.evaluate(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: '?', bubbles: true }))
    })
    await expect(page.locator(UI_SELECTORS.shortcutsModal)).toBeVisible()
    await ensureModalClosed(page)
  })

  test('clicking "All shortcuts" button opens the modal', async ({ page }) => {
    await page.click(UI_SELECTORS.helpBar.allShortcutsButton)
    await expect(page.locator(UI_SELECTORS.shortcutsModal)).toBeVisible()
    await ensureModalClosed(page)
  })

  test('Esc closes the modal', async ({ page }) => {
    await page.click(UI_SELECTORS.helpBar.allShortcutsButton)
    await expect(page.locator(UI_SELECTORS.shortcutsModal)).toBeVisible()
    await page.keyboard.press('Escape')
    await expect(page.locator(UI_SELECTORS.shortcutsModal)).not.toBeVisible()
  })
})
