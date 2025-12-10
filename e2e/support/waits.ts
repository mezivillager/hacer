import { Page } from '@playwright/test'

export async function waitForSceneReady(page: Page, timeout = 10000) {
  await page.waitForFunction(() => window.__SCENE_READY__ === true, { timeout })
}

export async function waitForWebGL(page: Page, timeout = 10000) {
  await page.waitForFunction(() => {
    const canvas = document.querySelector('canvas') as HTMLCanvasElement | null
    return !!canvas && (canvas.getContext('webgl') || canvas.getContext('webgl2'))
  }, { timeout })
}

export async function ensureGates(page: Page, count: number, timeout = 5000) {
  await page.waitForFunction((expected) => {
    const gates = window.__CIRCUIT_STORE__?.gates ?? []
    return gates.length >= expected
  }, count, { timeout })
}

export async function ensureWires(page: Page, count: number, timeout = 5000) {
  await page.waitForFunction((expected) => {
    const wires = window.__CIRCUIT_STORE__?.wires ?? []
    return wires.length >= expected
  }, count, { timeout })
}
