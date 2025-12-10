import { test, expect } from '@playwright/test'
import { waitForSceneReady } from './support/waits'

/**
 * E2E tests for circuit building functionality
 *
 * Uses store-driven approach for reliable gate manipulation
 * and UI assertions for user-visible feedback verification.
 */

test.describe('Circuit Building', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await page.waitForSelector('text=Nand2Fun', { timeout: 10000 })
    await page.waitForSelector('canvas', { timeout: 10000 })
    await waitForSceneReady(page)
  })

  test('can add a NAND gate to the canvas', async ({ page }) => {
    // Add gate via store
    await page.evaluate(() => {
      window.__CIRCUIT_ACTIONS__?.addGate('NAND', { x: 0, y: 0.4, z: 0 })
    })

    // Verify gate was added via UI
    await expect(page.locator('text=/Gates: 1/')).toBeVisible()

    // Verify store state
    const gateCount = await page.evaluate(() => window.__CIRCUIT_STORE__?.gates.length ?? 0)
    expect(gateCount).toBe(1)
  })

  test('can wire two gates together', async ({ page }) => {
    // Add first gate via store
    const gate1 = await page.evaluate(() => {
      return window.__CIRCUIT_ACTIONS__?.addGate('NAND', { x: -1, y: 0.4, z: 0 })
    })

    // Add second gate via store
    const gate2 = await page.evaluate(() => {
      return window.__CIRCUIT_ACTIONS__?.addGate('NAND', { x: 1, y: 0.4, z: 0 })
    })

    // Verify gates were added
    await expect(page.locator('text=/Gates: 2/')).toBeVisible()

    // Wire gates together via store
    await page.evaluate(
      ({ g1, g2 }) => {
        if (g1 && g2) {
          window.__CIRCUIT_ACTIONS__?.addWire(g1.id, g1.outputs[0].id, g2.id, g2.inputs[0].id)
        }
      },
      { g1: gate1, g2: gate2 }
    )

    // Verify wire was created via UI
    await expect(page.locator('text=/Wires: 1/')).toBeVisible()

    // Verify store state
    const wireCount = await page.evaluate(() => window.__CIRCUIT_STORE__?.wires.length ?? 0)
    expect(wireCount).toBe(1)
  })

  test('can delete a gate', async ({ page }) => {
    // Add a gate via store
    const gate = await page.evaluate(() => {
      return window.__CIRCUIT_ACTIONS__?.addGate('NAND', { x: 0, y: 0.4, z: 0 })
    })

    // Verify gate exists
    await expect(page.locator('text=/Gates: 1/')).toBeVisible()

    // Select the gate via store
    await page.evaluate(
      ({ gateId }) => {
        if (gateId) {
          window.__CIRCUIT_ACTIONS__?.selectGate(gateId)
        }
      },
      { gateId: gate?.id }
    )

    // Click Delete Selected button
    const deleteButton = page.locator('button:has-text("Delete Selected")')
    await expect(deleteButton).toBeEnabled()
    await deleteButton.click()

    // Verify gate was removed via UI
    await expect(page.locator('text=/Gates: 0/')).toBeVisible()

    // Verify store state
    const gateCount = await page.evaluate(() => window.__CIRCUIT_STORE__?.gates.length ?? 0)
    expect(gateCount).toBe(0)
  })

  test('can clear all gates', async ({ page }) => {
    // Add multiple gates via store
    await page.evaluate(() => {
      window.__CIRCUIT_ACTIONS__?.addGate('NAND', { x: -1, y: 0.4, z: 0 })
      window.__CIRCUIT_ACTIONS__?.addGate('NAND', { x: 1, y: 0.4, z: 0 })
    })

    // Verify gates exist
    await expect(page.locator('text=/Gates: 2/')).toBeVisible()

    // Click Clear All button
    const clearButton = page.locator('button:has-text("Clear All")')
    await expect(clearButton).toBeEnabled()
    await clearButton.click()

    // Verify all gates cleared via UI
    await expect(page.locator('text=/Gates: 0/')).toBeVisible()

    // Verify store state
    const state = await page.evaluate(() => ({
      gates: window.__CIRCUIT_STORE__?.gates.length ?? 0,
      wires: window.__CIRCUIT_STORE__?.wires.length ?? 0,
    }))
    expect(state.gates).toBe(0)
    expect(state.wires).toBe(0)
  })

  test('wires are removed when gate is deleted', async ({ page }) => {
    // Add two gates and wire them
    const gate1 = await page.evaluate(() => {
      return window.__CIRCUIT_ACTIONS__?.addGate('NAND', { x: -1, y: 0.4, z: 0 })
    })

    const gate2 = await page.evaluate(() => {
      return window.__CIRCUIT_ACTIONS__?.addGate('NAND', { x: 1, y: 0.4, z: 0 })
    })

    await page.evaluate(
      ({ g1, g2 }) => {
        if (g1 && g2) {
          window.__CIRCUIT_ACTIONS__?.addWire(g1.id, g1.outputs[0].id, g2.id, g2.inputs[0].id)
        }
      },
      { g1: gate1, g2: gate2 }
    )

    // Verify initial state
    await expect(page.locator('text=/Gates: 2/')).toBeVisible()
    await expect(page.locator('text=/Wires: 1/')).toBeVisible()

    // Delete gate1 via store
    await page.evaluate(
      ({ gateId }) => {
        if (gateId) {
          window.__CIRCUIT_ACTIONS__?.removeGate(gateId)
        }
      },
      { gateId: gate1?.id }
    )

    // Verify gate and wire were removed
    await expect(page.locator('text=/Gates: 1/')).toBeVisible()
    await expect(page.locator('text=/Wires: 0/')).toBeVisible()
  })
})
