import { test, expect } from '@playwright/test'

test.describe('test execution @store', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await page.waitForFunction(() => window.__CIRCUIT_STORE__ !== undefined)
  })

  test('runChipTest Not/builtin passes', async ({ page }) => {
    await page.evaluate(() => window.__CIRCUIT_ACTIONS__?.runChipTest('Not', 'builtin'))
    const passed = await page.evaluate(() => window.__CIRCUIT_STORE__?.testResult?.passed)
    expect(passed).toBe(true)
  })

  test('runChipTest with an unknown source sets an error', async ({ page }) => {
    await page.evaluate(() => window.__CIRCUIT_ACTIONS__?.runChipTest('Not', 'nope'))
    const error = await page.evaluate(() => window.__CIRCUIT_STORE__?.testResult?.error)
    expect(error).toBeTruthy()
  })
})
