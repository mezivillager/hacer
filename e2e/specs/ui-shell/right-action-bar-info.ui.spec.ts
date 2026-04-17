import { uiTest as test, uiExpect as expect } from '../../fixtures'
import { UI_SELECTORS } from '../../selectors'
import { addGateViaStore, clearAllViaStore, openInfoDrawer, closeInfoDrawer } from '../../helpers/actions'

test.describe('RightActionBar Info drawer @ui @ui-shell', () => {
  test('drawer opens with Info trigger and shows live gate count', async ({ page }) => {
    await clearAllViaStore(page)

    await openInfoDrawer(page)
    await expect(page.locator(UI_SELECTORS.infoPanel.gatesCount)).toContainText('0')

    // Add a gate via store and verify the count updates while drawer is open
    await addGateViaStore(page, 'AND', { x: 1, y: 0.2, z: 1 })
    await expect(page.locator(UI_SELECTORS.infoPanel.gatesCount)).toContainText('1')

    await closeInfoDrawer(page)
    await expect(page.locator(UI_SELECTORS.infoPanel.root)).not.toBeVisible()
  })

  test('clicking the active tab again collapses the drawer', async ({ page }) => {
    await clearAllViaStore(page)
    await openInfoDrawer(page)
    await page.click(UI_SELECTORS.rightBar.infoTrigger)
    await expect(page.locator(UI_SELECTORS.infoPanel.root)).not.toBeVisible()
  })
})
