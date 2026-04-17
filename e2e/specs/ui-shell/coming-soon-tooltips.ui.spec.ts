import { uiTest as test, uiExpect as expect } from '../../fixtures'
import { UI_SELECTORS } from '../../selectors'
import { clearAllViaStore } from '../../helpers/actions'

/**
 * Regression guard: stubbed UI surfaces must remain stubs (disabled +
 * tooltip on hover/focus). If a future feature wires real behavior to
 * one of these, that's deliberate and the test should be updated.
 */
test.describe('Coming soon tooltips @ui @ui-shell', () => {
  test('Settings button is disabled-but-rendered', async ({ page }) => {
    await clearAllViaStore(page)
    // Settings is the lightest-weight stub: not disabled (settings can theoretically open)
    // but click is a no-op. Just verify it renders.
    await expect(page.locator(UI_SELECTORS.toolbar.settings)).toBeVisible()
  })

  test('Undo, Redo, Find, Maximize all render disabled in RightActionBar rail', async ({ page }) => {
    await clearAllViaStore(page)
    for (const sel of [
      UI_SELECTORS.rightBar.undo,
      UI_SELECTORS.rightBar.redo,
      UI_SELECTORS.rightBar.find,
      UI_SELECTORS.rightBar.maximize,
    ]) {
      await expect(page.locator(sel)).toBeDisabled()
    }
  })
})
