import { storeTest as test, storeExpect as expect } from '../../fixtures'
import { PERFORMANCE_MODE_STORAGE_KEY } from '@/lib/performanceModeStorage'

test.describe('Performance mode @store @performance', () => {
  test.beforeEach(async ({ page }) => {
    await page.evaluate((storageKey) => {
      localStorage.removeItem(storageKey)
      window.__CIRCUIT_ACTIONS__?.setPerformanceMode('normal')
    }, PERFORMANCE_MODE_STORAGE_KEY)
  })

  test('sets low-power mode and persists it', async ({ page }) => {
    await page.evaluate(() => {
      window.__CIRCUIT_ACTIONS__?.setPerformanceMode('low-power')
    })

    await page.waitForFunction(() => window.__CIRCUIT_STORE__?.performanceMode === 'low-power')

    const storedMode = await page.evaluate((storageKey) => {
      return localStorage.getItem(storageKey)
    }, PERFORMANCE_MODE_STORAGE_KEY)

    expect(storedMode).toBe('low-power')
  })

  test('toggles between normal and low-power modes', async ({ page }) => {
    await page.evaluate(() => {
      window.__CIRCUIT_ACTIONS__?.togglePerformanceMode()
    })
    await page.waitForFunction(() => window.__CIRCUIT_STORE__?.performanceMode === 'low-power')

    await page.evaluate(() => {
      window.__CIRCUIT_ACTIONS__?.togglePerformanceMode()
    })
    await page.waitForFunction(() => window.__CIRCUIT_STORE__?.performanceMode === 'normal')

    const storedMode = await page.evaluate((storageKey) => {
      return localStorage.getItem(storageKey)
    }, PERFORMANCE_MODE_STORAGE_KEY)

    expect(storedMode).toBe('normal')
  })
})
