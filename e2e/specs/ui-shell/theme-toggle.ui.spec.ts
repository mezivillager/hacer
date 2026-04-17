import { uiTest as test, uiExpect as expect } from '../../fixtures'
import { setThemeViaToolbar } from '../../helpers/actions'

test.describe('Theme toggle @ui @ui-shell', () => {
  test('toggling theme flips html.dark class', async ({ page }) => {
    await setThemeViaToolbar(page, 'light')
    await expect(page.locator('html')).not.toHaveClass(/(^|\s)dark(\s|$)/)

    await setThemeViaToolbar(page, 'dark')
    await expect(page.locator('html')).toHaveClass(/(^|\s)dark(\s|$)/)
  })
})
