/**
 * Scene Wait Helpers
 *
 * Wait utilities for 3D scene and WebGL readiness.
 */

import { Page } from '@playwright/test'
import { TIMEOUTS } from '../../config/constants'

/**
 * Wait for the 3D scene to be fully initialized and ready for interaction
 */
export async function waitForSceneReady(page: Page, timeout = TIMEOUTS.scene): Promise<void> {
  await page.waitForFunction(() => window.__SCENE_READY__ === true, { timeout })
}
