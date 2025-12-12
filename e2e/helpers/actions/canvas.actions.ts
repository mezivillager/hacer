/**
 * Canvas Interaction Actions
 *
 * Low-level 3D canvas interactions including coordinate projection,
 * clicking world positions, and rotation controls.
 */

import { Page } from '@playwright/test'
import { TIMEOUTS } from '../../config/constants'
import type { Position3D } from '../../config/constants'
import { waitForSceneStable } from '../waits/render.waits'

/**
 * Project a 3D world position to 2D screen coordinates
 */
export async function projectToScreen(
  page: Page,
  position: Position3D
): Promise<{ x: number; y: number }> {
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
  await page.mouse.click(pt.x, pt.y)
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
  // Wait for scene to stabilize after state changes
  await waitForSceneStable(page, TIMEOUTS.store)
  // Additional small wait for Three.js render cycle to complete
  await page.waitForTimeout(50)
  
  const pinPos = await page.evaluate(
    ({ gateId, pinId }) => {
      return window.__CIRCUIT_ACTIONS__?.getPinWorldPosition(gateId, pinId) ?? null
    },
    { gateId, pinId }
  )

  if (!pinPos) throw new Error(`Pin position not found for ${gateId}:${pinId}`)
  const pt = await projectToScreen(page, pinPos)

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
