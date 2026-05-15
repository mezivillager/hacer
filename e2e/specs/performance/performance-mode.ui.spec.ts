import { uiTest as test, uiExpect as expect } from '../../fixtures'
import { UI_SELECTORS } from '../../selectors'

test.describe('Performance mode switch @ui @performance', () => {
  test.beforeEach(async ({ page }) => {
    await page.evaluate(() => {
      window.__CIRCUIT_ACTIONS__?.setPerformanceMode('normal')
    })
  })

  test('switches to low-power mode from settings', async ({ page }) => {
    await page.click(UI_SELECTORS.toolbar.settings)
    await expect(page.locator(UI_SELECTORS.settingsPopover.root)).toBeVisible()
    await expect(page.locator(UI_SELECTORS.settingsPopover.lowPowerSwitch)).toHaveAttribute(
      'aria-checked',
      'false',
    )

    await page.click(UI_SELECTORS.settingsPopover.lowPowerSwitch)

    await page.waitForFunction(() => window.__CIRCUIT_STORE__?.performanceMode === 'low-power')
    await expect(page.locator(UI_SELECTORS.settingsPopover.lowPowerSwitch)).toHaveAttribute(
      'aria-checked',
      'true',
    )
    await expect(page.locator(UI_SELECTORS.settingsPopover.performanceModeLabel)).toHaveText(
      'Enabled',
    )
  })
})
