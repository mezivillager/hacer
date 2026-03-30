/**
 * Pinout Panel Store Tests
 *
 * Tag: @store @simulation
 */

import { storeTest as test, storeExpect as expect } from '../../fixtures'

test.describe('Pinout Panel @store @simulation', () => {
  test('shows panel and toggles input value through the UI', async ({ page }) => {
    const setup = await page.evaluate(() => {
      const actions = window.__CIRCUIT_ACTIONS__
      if (!actions) {
        throw new Error('Circuit actions are unavailable')
      }

      actions.addOutputNode('out', { x: 4, y: 0, z: 0 })
      const input = actions.addInputNode('a', { x: 0, y: 0, z: 0 })
      return { id: input.id, before: input.value }
    })

    await expect(page.getByTestId('pinout-panel')).toBeVisible()
    await expect(page.getByTestId('pin-input-a')).toBeVisible()
    await expect(page.getByTestId('pin-toggle-a')).toBeVisible()

    await page.getByTestId('pin-toggle-a').click()

    const after = await page.evaluate((id: string) => {
      const store = window.__CIRCUIT_STORE__
      if (!store) {
        throw new Error('Circuit store is unavailable')
      }

      return store.inputNodes?.find((node) => node.id === id)?.value
    }, setup.id)

    expect(after).toBe(setup.before ? 0 : 1)
  })
})
