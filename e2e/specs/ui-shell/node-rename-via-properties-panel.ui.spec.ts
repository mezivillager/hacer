import { uiTest as test, uiExpect as expect } from '../../fixtures'
import { UI_SELECTORS } from '../../selectors'
import { clearAllViaStore } from '../../helpers/actions'

test.describe('Node rename via PropertiesPanel @ui @ui-shell', () => {
  test('typing a new name + Enter renames the input node', async ({ page }) => {
    await clearAllViaStore(page)

    // Add an input node and select it via store
    await page.evaluate(() => {
      const node = window.__CIRCUIT_ACTIONS__?.addInputNode('a', { x: 0, y: 0.2, z: 0 })
      if (node) window.__CIRCUIT_ACTIONS__?.selectNode(node.id, 'input')
    })

    await expect(page.locator(UI_SELECTORS.propertiesPanel.root)).toBeVisible()

    const field = page.locator(UI_SELECTORS.propertiesPanel.nameField)
    await field.click()
    await field.fill('CLK')
    await field.press('Enter')

    await page.waitForFunction(
      () => window.__CIRCUIT_STORE__?.inputNodes?.[0]?.name === 'CLK',
      undefined,
      { timeout: 5000 },
    )
  })

  test('Escape reverts the input field', async ({ page }) => {
    await clearAllViaStore(page)
    await page.evaluate(() => {
      const node = window.__CIRCUIT_ACTIONS__?.addInputNode('original', { x: 0, y: 0.2, z: 0 })
      if (node) window.__CIRCUIT_ACTIONS__?.selectNode(node.id, 'input')
    })

    const field = page.locator(UI_SELECTORS.propertiesPanel.nameField)
    await field.click()
    await field.fill('temporary')
    await field.press('Escape')

    // Store name should be unchanged
    const storedName = await page.evaluate(() => window.__CIRCUIT_STORE__?.inputNodes?.[0]?.name)
    expect(storedName).toBe('original')
  })
})
