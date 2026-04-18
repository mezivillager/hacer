import { uiTest as test, uiExpect as expect } from '../../fixtures'
import { UI_SELECTORS } from '../../selectors'
import { addGateViaStore, selectGate, clearAllViaStore } from '../../helpers/actions'

async function openPropertiesPanel(page: import('@playwright/test').Page) {
  await page.evaluate(() => window.__CIRCUIT_ACTIONS__?.openPropertiesPanel())
}

async function closePropertiesPanel(page: import('@playwright/test').Page) {
  await page.evaluate(() => window.__CIRCUIT_ACTIONS__?.closePropertiesPanel())
}

test.describe('PropertiesPanel @ui @ui-shell', () => {
  test.beforeEach(async ({ page }) => {
    await clearAllViaStore(page)
    await page.evaluate(() => window.__CIRCUIT_ACTIONS__?.deselectAll())
    await closePropertiesPanel(page)
  })

  test('does not render when nothing is selected (even if panel is open)', async ({ page }) => {
    await openPropertiesPanel(page)
    await expect(page.locator(UI_SELECTORS.propertiesPanel.root)).not.toBeVisible()
  })

  test('does not render on selection alone (panel must be explicitly opened)', async ({ page }) => {
    const gate = await addGateViaStore(page, 'AND', { x: 1, y: 0.2, z: 1 })
    if (!gate) throw new Error('gate creation failed')
    await selectGate(page, gate.id)
    // Selection without explicit open: panel stays hidden
    await expect(page.locator(UI_SELECTORS.propertiesPanel.root)).not.toBeVisible()
  })

  test('renders gate type label when a gate is selected AND panel is opened', async ({ page }) => {
    const gate = await addGateViaStore(page, 'AND', { x: 1, y: 0.2, z: 1 })
    if (!gate) throw new Error('gate creation failed')
    await selectGate(page, gate.id)
    await openPropertiesPanel(page)

    await expect(page.locator(UI_SELECTORS.propertiesPanel.root)).toBeVisible()
    await expect(page.locator(UI_SELECTORS.propertiesPanel.typeLabel)).toContainText('AND')
  })

  test('Close button (X) hides the panel but preserves selection', async ({ page }) => {
    const gate = await addGateViaStore(page, 'AND', { x: 1, y: 0.2, z: 1 })
    if (!gate) throw new Error('gate creation failed')
    await selectGate(page, gate.id)
    await openPropertiesPanel(page)

    await expect(page.locator(UI_SELECTORS.propertiesPanel.root)).toBeVisible()
    await page.click(UI_SELECTORS.propertiesPanel.closeButton)
    await expect(page.locator(UI_SELECTORS.propertiesPanel.root)).not.toBeVisible()

    // Selection itself is preserved
    const selected = await page.evaluate(() => window.__CIRCUIT_STORE__?.selectedGateId)
    expect(selected).toBe(gate.id)
  })

  test('Properties button in CompactToolbar toggles the panel', async ({ page }) => {
    const gate = await addGateViaStore(page, 'AND', { x: 1, y: 0.2, z: 1 })
    if (!gate) throw new Error('gate creation failed')
    await selectGate(page, gate.id)

    const button = page.locator(UI_SELECTORS.toolbar.propertiesToggle)
    await expect(button).toBeEnabled()

    await button.click()
    await expect(page.locator(UI_SELECTORS.propertiesPanel.root)).toBeVisible()

    await button.click()
    await expect(page.locator(UI_SELECTORS.propertiesPanel.root)).not.toBeVisible()
  })
})
