/**
 * Render Wait Helpers
 *
 * Wait utilities for scene stability and render tracking.
 */

import { Page } from '@playwright/test'
import { TIMEOUTS } from '../../config/constants'

/**
 * Wait until the scene is stable (no recent renders)
 * Falls back to a minimum wait if tracker isn't available
 */
export async function waitForSceneStable(
  page: Page,
  timeout: number = TIMEOUTS.store
): Promise<void> {
  try {
    await page.waitForFunction(
      () => {
        const tracker = window.__RENDER_TRACKER__
        // If no tracker or no renders yet, wait for at least one render cycle
        if (!tracker || tracker.totalRenders === 0) return false
        return tracker.isStable === true
      },
      { timeout }
    )
  } catch {
    // Fallback: if timeout waiting for stability, just wait a bit
    await page.waitForTimeout(200)
  }
}

/**
 * Wait for a specific number of renders to complete
 */
export async function waitForRenderCount(
  page: Page,
  minRenders: number,
  timeout: number = TIMEOUTS.store
): Promise<void> {
  await page.waitForFunction(
    (min) => (window.__RENDER_TRACKER__?.totalRenders ?? 0) >= min,
    minRenders,
    { timeout }
  )
}

/**
 * Get current render stats
 */
export async function getRenderStats(page: Page): Promise<{
  totalRenders: number
  isStable: boolean
  componentStats: Record<string, { count: number; reasons: string[] }>
}> {
  return page.evaluate(() => {
    const tracker = window.__RENDER_TRACKER__
    return {
      totalRenders: tracker?.totalRenders ?? 0,
      isStable: tracker?.isStable ?? true,
      componentStats: Object.fromEntries(
        Object.entries(tracker?.stats ?? {}).map(([name, stats]) => [
          name,
          { count: stats.count, reasons: stats.reasons }
        ])
      )
    }
  })
}

/**
 * Log render stats to console (for debugging)
 */
export async function logRenderStats(page: Page, label?: string): Promise<void> {
  const stats = await getRenderStats(page)
  const prefix = label ? `[${label}] ` : ''
  console.log(`${prefix}Render Stats:`, JSON.stringify(stats, null, 2))
}

/**
 * Wait for scene to be ready and stable
 */
export async function waitForSceneReadyAndStable(
  page: Page,
  timeout: number = TIMEOUTS.scene
): Promise<void> {
  // First wait for scene to be ready
  await page.waitForFunction(
    () => window.__SCENE_READY__ === true,
    { timeout }
  )

  // Then wait for renders to stabilize
  await waitForSceneStable(page, timeout)
}

/**
 * Execute an action and wait for scene to stabilize after
 */
export async function executeAndWaitForStable<T>(
  page: Page,
  action: () => Promise<T>,
  timeout: number = TIMEOUTS.store
): Promise<T> {
  const result = await action()
  await waitForSceneStable(page, timeout)
  return result
}

/**
 * Reset render stats (useful before measuring renders for a specific operation)
 */
export async function resetRenderStats(page: Page): Promise<void> {
  await page.evaluate(() => {
    window.__RENDER_TRACKER__?.reset()
  })
}

/**
 * Get render counts per component
 */
export async function getComponentRenderCounts(page: Page): Promise<Record<string, number>> {
  return page.evaluate(() => {
    const tracker = window.__RENDER_TRACKER__
    if (!tracker) return {}
    return Object.fromEntries(
      Object.entries(tracker.stats).map(([name, stats]) => [name, stats.count])
    )
  })
}
