import { uiTest as test, uiExpect as expect } from '../../fixtures'
import { UI_SELECTORS } from '../../selectors'
import { clearAllViaStore } from '../../helpers/actions'

/**
 * Regression guard: still-stubbed UI surfaces must remain disabled while
 * Settings stays visible as a real popover entry point.
 */
test.describe('Coming soon tooltips @ui @ui-shell', () => {
  test('Settings button is rendered', async ({ page }) => {
    await clearAllViaStore(page)
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
