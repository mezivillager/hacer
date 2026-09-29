/**
 * The DOM shell with no 3D scene (`?renderer=none`, ADR-0019), run by the `shell` project.
 *
 * Drives the app through `__CIRCUIT_ACTIONS__` and the DOM and asserts through
 * `__CIRCUIT_STORE__`. The scene bridge does not exist in this mode, so nothing here may need it.
 *
 * Tag: @shell
 */

import { test as base, expect } from '@playwright/test'
import { APP_ENTRY_URL, DEFAULT_POSITIONS, TIMEOUTS } from '../config/constants'

const test = base.extend<{ canvasLessBoot: void }>({
  canvasLessBoot: [
    async ({ page }, use) => {
      await page.goto(`${APP_ENTRY_URL}&renderer=none`)
      await page.waitForFunction(() => window.__CIRCUIT_STORE__ !== undefined, { timeout: TIMEOUTS.store })
      // A spec that quietly needs the scene fails here, instead of hanging on a scene wait.
      expect(await page.evaluate(() => window.__SCENE_READY__)).toBeUndefined()
      await use()
    },
    { auto: true },
  ],
})

test.describe('Canvas-less shell @shell', () => {
  test('mounts the shell with no canvas, in a browser with no WebGL', async ({ page }) => {
    await expect(page.getByTestId('scene-slot')).toBeVisible()
    await expect(page.locator('canvas')).toHaveCount(0)

    // The project turns WebGL off, so a spec that mounted the scene would fail, not render 3D.
    const contexts = await page.evaluate(() => ({
      webgl: document.createElement('canvas').getContext('webgl') !== null,
      webgl2: document.createElement('canvas').getContext('webgl2') !== null,
    }))
    expect(contexts).toEqual({ webgl: false, webgl2: false })
  })

  test('toggles an input from the pinout panel', async ({ page }) => {
    const aId = await page.evaluate(({ leftPos, rightPos }) => {
      const actions = window.__CIRCUIT_ACTIONS__
      if (!actions) throw new Error('Circuit actions are unavailable')
      const a = actions.addInputNode('a', leftPos)
      actions.addOutputNode('out', rightPos)
      actions.updateInputNodeValue(a.id, 0)
      return a.id
    }, { leftPos: DEFAULT_POSITIONS.left, rightPos: DEFAULT_POSITIONS.right })

    await page.getByTestId('right-bar-info-trigger').click()
    await expect(page.getByTestId('pinout-panel')).toBeVisible()
    await expect(page.getByTestId('pin-output-out')).toBeVisible()

    const toggle = page.getByTestId('pin-toggle-a')
    await expect(toggle).toHaveText('0')
    await toggle.click()

    await expect
      .poll(() =>
        page.evaluate((id) => {
          const node = window.__CIRCUIT_STORE__?.inputNodes?.find((n) => n.id === id)
          return node ? Number(node.value) : null
        }, aId),
      )
      .toBe(1)
    await expect(toggle).toHaveText('1')
  })
})
