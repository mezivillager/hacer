import { Page } from '@playwright/test'

export async function projectToScreen(page: Page, position: { x: number; y: number; z: number }) {
  const point = await page.evaluate(({ position }) => {
    const helper = window.__SCENE_HELPERS__
    if (!helper?.projectToScreen) return null
    return helper.projectToScreen(position)
  }, { position })
  if (!point) throw new Error('Projection helper not available')
  return point
}

export async function clickWorldPosition(page: Page, position: { x: number; y: number; z: number }) {
  const pt = await projectToScreen(page, position)
  await page.mouse.click(pt.x, pt.y)
}

export async function clickPin(page: Page, gateId: string, pinId: string, opts: { withShift?: boolean } = {}) {
  const pinPos = await page.evaluate(({ gateId, pinId }) => {
    return window.__CIRCUIT_ACTIONS__?.getPinWorldPosition(gateId, pinId) ?? null
  }, { gateId, pinId })

  if (!pinPos) throw new Error(`Pin position not found for ${gateId}:${pinId}`)
  const pt = await projectToScreen(page, pinPos)

  if (opts.withShift) await page.keyboard.down('Shift')
  await page.mouse.click(pt.x, pt.y)
  if (opts.withShift) await page.keyboard.up('Shift')
}

export async function rotateAtPosition(page: Page, position: { x: number; y: number; z: number }, direction: 'left' | 'right', times = 1) {
  await clickWorldPosition(page, position)
  const key = direction === 'left' ? 'ArrowLeft' : 'ArrowRight'
  for (let i = 0; i < times; i++) {
    await page.keyboard.press(key)
  }
  await page.waitForTimeout(100)
}
