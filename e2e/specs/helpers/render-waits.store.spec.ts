/**
 * Render Wait Helper Tests
 *
 * Proves waitForSceneStable throws — rather than silently continuing —
 * when scene stability never arrives. Before issue #317, a timeout here
 * was swallowed and replaced with a 200ms sleep, so every assertion after
 * the wait ran against an unknown render state.
 *
 * Tag: @store @waits
 */

import { storeTest as test, storeExpect as expect } from '../../fixtures'
import { waitForSceneStable } from '../../helpers/waits'

test.describe('Render Wait Helpers @store @waits', () => {
  test('waitForSceneStable throws, naming what it waited for and for how long, when stability never arrives', async ({
    page,
  }) => {
    // Simulate a tracker that has rendered at least once but never settles —
    // the one condition the old code silently accepted as "good enough".
    await page.evaluate(() => {
      window.__RENDER_TRACKER__ = {
        stats: {},
        totalRenders: 1,
        lastUpdateTime: Date.now(),
        isStable: false,
        reset: () => {},
      }
    })

    await expect(waitForSceneStable(page, 100)).rejects.toThrow(
      'Scene did not stabilize within 100ms (window.__RENDER_TRACKER__.isStable never became true)'
    )
  })
})
