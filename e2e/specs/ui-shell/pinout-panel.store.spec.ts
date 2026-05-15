/**
 * PinoutPanel store-driven E2E (P05-10)
 *
 * Tag: @store @ui-shell @pinout
 */

import { test, expect } from '@playwright/test'
import { PERFORMANCE_MODE_STORAGE_KEY } from '@/lib/performanceModeStorage'
import { APP_ENTRY_URL, DEFAULT_POSITIONS, TIMEOUTS } from '../../config/constants'

test.describe('PinoutPanel @store @ui-shell @pinout', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript((storageKey) => {
      localStorage.setItem(storageKey, 'low-power')
    }, PERFORMANCE_MODE_STORAGE_KEY)
    await page.goto(APP_ENTRY_URL)
    await page.waitForFunction(() => window.__CIRCUIT_STORE__ !== undefined, { timeout: TIMEOUTS.store })
  })

  test('renders pin rows after creating I/O via store, and toggle updates store', async ({ page }) => {
    // Create input + output via the store first so PinoutPanel renders (returns null when empty).
    const created = await page.evaluate(({ leftPos, rightPos }) => {
      const a = window.__CIRCUIT_ACTIONS__?.addInputNode('a', leftPos)
      const out = window.__CIRCUIT_ACTIONS__?.addOutputNode('out', rightPos)
      return { aId: a?.id ?? null, outId: out?.id ?? null }
    }, { leftPos: DEFAULT_POSITIONS.left, rightPos: DEFAULT_POSITIONS.right })

    expect(created.aId).not.toBeNull()
    expect(created.outId).not.toBeNull()
    await page.waitForFunction(
      () => window.__CIRCUIT_STORE__?.inputNodes?.length === 1 && window.__CIRCUIT_STORE__?.outputNodes?.length === 1,
    )

    // Open the right-bar info drawer where PinoutPanel lives.
    await page.getByTestId('right-bar-info-trigger').click()

    await expect(page.getByTestId('pinout-panel')).toBeVisible()
    await expect(page.getByTestId('pin-input-a')).toBeVisible()
    await expect(page.getByTestId('pin-output-out')).toBeVisible()

    // Drive the input value to a known starting state (0), then toggle via UI.
    await page.evaluate((id) => {
      window.__CIRCUIT_ACTIONS__?.updateInputNodeValue(id!, 0)
    }, created.aId)
    await page.waitForFunction(
      (id) => window.__CIRCUIT_STORE__?.inputNodes?.find(n => n.id === id)?.value === 0,
      created.aId,
    )

    const inputToggle = page.getByTestId('pin-toggle-a')
    await expect(inputToggle).toHaveText('0')
    await inputToggle.click()

    const value = await page.evaluate((id) => {
      const state = window.__CIRCUIT_STORE__
      return state?.inputNodes?.find(n => n.id === id)?.value ?? null
    }, created.aId)
    expect(Number(value)).toBe(1)
  })
})
