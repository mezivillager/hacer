import { uiTest as test, uiExpect as expect } from '../../fixtures'
import { UI_SELECTORS } from '../../selectors'
import { addGateViaStore, selectGate, clearAllViaStore } from '../../helpers/actions'

test.describe('PropertiesPanel @ui @ui-shell', () => {
  test('does not render when nothing is selected', async ({ page }) => {
    await clearAllViaStore(page)
    await page.evaluate(() => window.__CIRCUIT_ACTIONS__?.deselectAll())
    await expect(page.locator(UI_SELECTORS.propertiesPanel.root)).not.toBeVisible()
  })

  test('renders gate type label when a gate is selected', async ({ page }) => {
    await clearAllViaStore(page)
    const gate = await addGateViaStore(page, 'AND', { x: 1, y: 0.2, z: 1 })
    expect(gate?.id).toBeTruthy()
    if (!gate) throw new Error('gate creation failed')
    await selectGate(page, gate.id)

    await expect(page.locator(UI_SELECTORS.propertiesPanel.root)).toBeVisible()
    await expect(page.locator(UI_SELECTORS.propertiesPanel.typeLabel)).toContainText('AND')
  })

  test('Close button (X) clears selection', async ({ page }) => {
    await clearAllViaStore(page)
    const gate = await addGateViaStore(page, 'AND', { x: 1, y: 0.2, z: 1 })
    if (!gate) throw new Error('gate creation failed')
    await selectGate(page, gate.id)

    await page.click(UI_SELECTORS.propertiesPanel.closeButton)
    await page.waitForFunction(
      () => window.__CIRCUIT_STORE__?.selectedGateId === null,
    )
    await expect(page.locator(UI_SELECTORS.propertiesPanel.root)).not.toBeVisible()
  })
})
