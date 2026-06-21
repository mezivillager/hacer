/**
 * Render Sanity Smoke Tests (UI-driven)
 *
 * Minimal @ui smoke: confirms the app mounts and the 3D scene signals
 * readiness via `window.__SCENE_READY__`. Everything else that was in
 * the old skipped spec (render-budget checks per CanvasArea/GroundPlane)
 * was based on render tracking that is disabled (renderTracking.ts
 * `trackRender` early-returns), so those assertions were vacuous.
 * Non-3D shell-mounts coverage lives in the RTL integration test:
 *   src/components/Shell.integration.test.tsx
 *
 * Tag: @ui @performance
 */

import { uiTest as test, uiExpect as expect } from '../../fixtures'
import { TIMEOUTS } from '../../config/constants'

test.describe('Render Sanity Smoke @ui @performance', () => {
  test('app mounts and 3D scene signals readiness', async ({ page }) => {
    const sceneReady = await page.waitForFunction(
      () => window.__SCENE_READY__ === true,
      { timeout: TIMEOUTS.scene ?? 10000 }
    )
    expect(sceneReady).toBeTruthy()
  })
})
