/**
 * Canvas Interaction Actions
 *
 * Low-level 3D canvas interactions including coordinate projection,
 * clicking world positions, and rotation controls.
 */

import { Page } from '@playwright/test'
import { TIMEOUTS } from '../../config/constants'
import type { Position3D } from '../../config/constants'

/**
 * Project a 3D world position to 2D screen coordinates
 */
export async function projectToScreen(
  page: Page,
  position: Position3D
): Promise<{ x: number; y: number }> {
  // Ensure scene helpers are available
  await page.waitForFunction(() => window.__SCENE_HELPERS__?.projectToScreen !== undefined, {
    timeout: TIMEOUTS.scene,
  })

  const point = await page.evaluate(
    ({ position }) => {
      const helper = window.__SCENE_HELPERS__
      if (!helper?.projectToScreen) return null
      return helper.projectToScreen(position)
    },
    { position }
  )
  if (!point) throw new Error('Projection helper not available')
  return point
}

/**
 * Click at a 3D world position (projected to screen)
 */
export async function clickWorldPosition(page: Page, position: Position3D): Promise<void> {
  const pt = await projectToScreen(page, position)

  // Get the canvas bounding rect
  const canvasRect = await page.evaluate((): { left: number; top: number } | null => {
    const canvas = document.querySelector('canvas')
    if (!canvas) return null
    const rect = canvas.getBoundingClientRect()
    return { left: rect.left, top: rect.top }
  })
  if (!canvasRect) throw new Error('Canvas not found')

  // Calculate position relative to canvas
  const relX = pt.x - canvasRect.left
  const relY = pt.y - canvasRect.top

  // Use Playwright's locator click with explicit position
  // This sends proper pointer events that R3F should handle
  const canvas = page.locator('canvas')
  await canvas.click({ position: { x: relX, y: relY } })

  // Small delay to allow event to propagate
  await page.waitForTimeout(100)
}

/**
 * Click on a specific pin of a gate
 */
export async function clickPin(
  page: Page,
  gateId: string,
  pinId: string,
  opts: { withShift?: boolean } = {}
): Promise<void> {
  // Small wait for Three.js render cycle to complete
  // Removed waitForSceneStable as it was causing timeouts with worker-scoped pages
  if (!page.isClosed()) {
    await page.waitForTimeout(50)
  }

  // Check if page is still open before proceeding
  if (page.isClosed()) {
    throw new Error('Page is closed, cannot click pin')
  }

  const pinPos = await page.evaluate(
    ({ gateId, pinId }) => {
      return window.__CIRCUIT_ACTIONS__?.getPinWorldPosition(gateId, pinId) ?? null
    },
    { gateId, pinId }
  )

  if (!pinPos) throw new Error(`Pin position not found for ${gateId}:${pinId}`)

  // Check again before projecting
  if (page.isClosed()) {
    throw new Error('Page closed while getting pin position')
  }

  const pt = await projectToScreen(page, pinPos)

  // Final check before clicking
  if (page.isClosed()) {
    throw new Error('Page closed before clicking pin')
  }

  if (opts.withShift) await page.keyboard.down('Shift')
  await page.mouse.click(pt.x, pt.y)
  if (opts.withShift) await page.keyboard.up('Shift')
}

/**
 * Rotate a selected object at a position using arrow keys
 */
export async function rotateAtPosition(
  page: Page,
  position: Position3D,
  direction: 'left' | 'right',
  times = 1
): Promise<void> {
  await clickWorldPosition(page, position)
  const key = direction === 'left' ? 'ArrowLeft' : 'ArrowRight'
  for (let i = 0; i < times; i++) {
    await page.keyboard.press(key)
  }
  await page.waitForTimeout(TIMEOUTS.animation)
}
