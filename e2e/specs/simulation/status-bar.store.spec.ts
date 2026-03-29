/**
 * Status Bar Store Tests
 *
 * Tag: @store @simulation
 */

import { storeTest as test, storeExpect as expect } from '../../fixtures'

test.describe('Status Bar @store @simulation', () => {
  test('adds and clears error status messages', async ({ page }) => {
    await page.evaluate(() => {
      const actions = window.__CIRCUIT_ACTIONS__
      if (!actions) throw new Error('Circuit actions are unavailable')
      actions.addStatus('error', 'Parse failed at line 3')
    })

    await expect(page.getByTestId('status-text')).toHaveText('Parse failed at line 3')
    await expect(page.getByTestId('status-bar')).toHaveAttribute('data-severity', 'error')

    await page.getByTestId('status-bar').click()

    const count = await page.evaluate((): number => window.__CIRCUIT_STORE__?.statusMessages?.length ?? 0)
    expect(count).toBe(0)
  })
})
