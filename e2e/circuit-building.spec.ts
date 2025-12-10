import { test, expect } from '@playwright/test'

/**
 * E2E tests for circuit building functionality
 *
 * Uses store-driven approach for reliable gate manipulation
 * and UI assertions for user-visible feedback verification.
 */

// Type declarations for window globals
declare global {
  interface Window {
    __CIRCUIT_STORE__: {
      gates: Array<{
        id: string
        type: string
        position: { x: number; y: number; z: number }
        inputs: Array<{ id: string; value: boolean }>
        outputs: Array<{ id: string; value: boolean }>
        selected: boolean
      }>
      wires: Array<{
        id: string
        fromGateId: string
        fromPinId: string
        toGateId: string
        toPinId: string
      }>
      selectedGateId: string | null
    }
    __CIRCUIT_ACTIONS__: {
      addGate: (
        type: string,
        position: { x: number; y: number; z: number }
      ) => { id: string; inputs: Array<{ id: string }>; outputs: Array<{ id: string }> }
      addWire: (
        fromGateId: string,
        fromPinId: string,
        toGateId: string,
        toPinId: string
      ) => void
      removeGate: (gateId: string) => void
      selectGate: (gateId: string | null) => void
      clearCircuit: () => void
    }
  }
}

test.describe('Circuit Building', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    // Wait for app to load
    await page.waitForSelector('text=Nand2Fun', { timeout: 10000 })
    // Wait for canvas to be ready
    await page.waitForSelector('canvas', { timeout: 10000 })
    // Wait for WebGL context
    await page.waitForFunction(
      () => {
        const canvas = document.querySelector('canvas')
        return canvas && (canvas.getContext('webgl') || canvas.getContext('webgl2'))
      },
      { timeout: 10000 }
    )
  })

  test('can add a NAND gate to the canvas', async ({ page }) => {
    // Add gate via store
    await page.evaluate(() => {
      window.__CIRCUIT_ACTIONS__.addGate('NAND', { x: 0, y: 0.4, z: 0 })
    })

    // Verify gate was added via UI
    await expect(page.locator('text=/Gates: 1/')).toBeVisible()

    // Verify store state
    const gateCount = await page.evaluate(() => window.__CIRCUIT_STORE__.gates.length)
    expect(gateCount).toBe(1)
  })

  test('can wire two gates together', async ({ page }) => {
    // Add first gate via store
    const gate1 = await page.evaluate(() => {
      return window.__CIRCUIT_ACTIONS__.addGate('NAND', { x: -1, y: 0.4, z: 0 })
    })

    // Add second gate via store
    const gate2 = await page.evaluate(() => {
      return window.__CIRCUIT_ACTIONS__.addGate('NAND', { x: 1, y: 0.4, z: 0 })
    })

    // Verify gates were added
    await expect(page.locator('text=/Gates: 2/')).toBeVisible()

    // Wire gates together via store
    await page.evaluate(
      ({ g1, g2 }) => {
        window.__CIRCUIT_ACTIONS__.addWire(g1.id, g1.outputs[0].id, g2.id, g2.inputs[0].id)
      },
      { g1: gate1, g2: gate2 }
    )

    // Verify wire was created via UI
    await expect(page.locator('text=/Wires: 1/')).toBeVisible()

    // Verify store state
    const wireCount = await page.evaluate(() => window.__CIRCUIT_STORE__.wires.length)
    expect(wireCount).toBe(1)
  })

  test('can delete a gate', async ({ page }) => {
    // Add a gate via store
    const gate = await page.evaluate(() => {
      return window.__CIRCUIT_ACTIONS__.addGate('NAND', { x: 0, y: 0.4, z: 0 })
    })

    // Verify gate exists
    await expect(page.locator('text=/Gates: 1/')).toBeVisible()

    // Select the gate via store
    await page.evaluate(
      ({ gateId }) => {
        window.__CIRCUIT_ACTIONS__.selectGate(gateId)
      },
      { gateId: gate.id }
    )

    // Click Delete Selected button
    const deleteButton = page.locator('button:has-text("Delete Selected")')
    await expect(deleteButton).toBeEnabled()
    await deleteButton.click()

    // Verify gate was removed via UI
    await expect(page.locator('text=/Gates: 0/')).toBeVisible()

    // Verify store state
    const gateCount = await page.evaluate(() => window.__CIRCUIT_STORE__.gates.length)
    expect(gateCount).toBe(0)
  })

  test('can clear all gates', async ({ page }) => {
    // Add multiple gates via store
    await page.evaluate(() => {
      window.__CIRCUIT_ACTIONS__.addGate('NAND', { x: -1, y: 0.4, z: 0 })
      window.__CIRCUIT_ACTIONS__.addGate('NAND', { x: 1, y: 0.4, z: 0 })
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
      gates: window.__CIRCUIT_STORE__.gates.length,
      wires: window.__CIRCUIT_STORE__.wires.length,
    }))
    expect(state.gates).toBe(0)
    expect(state.wires).toBe(0)
  })

  test('wires are removed when gate is deleted', async ({ page }) => {
    // Add two gates and wire them
    const gate1 = await page.evaluate(() => {
      return window.__CIRCUIT_ACTIONS__.addGate('NAND', { x: -1, y: 0.4, z: 0 })
    })

    const gate2 = await page.evaluate(() => {
      return window.__CIRCUIT_ACTIONS__.addGate('NAND', { x: 1, y: 0.4, z: 0 })
    })

    await page.evaluate(
      ({ g1, g2 }) => {
        window.__CIRCUIT_ACTIONS__.addWire(g1.id, g1.outputs[0].id, g2.id, g2.inputs[0].id)
      },
      { g1: gate1, g2: gate2 }
    )

    // Verify initial state
    await expect(page.locator('text=/Gates: 2/')).toBeVisible()
    await expect(page.locator('text=/Wires: 1/')).toBeVisible()

    // Delete gate1 via store
    await page.evaluate(
      ({ gateId }) => {
        window.__CIRCUIT_ACTIONS__.removeGate(gateId)
      },
      { gateId: gate1.id }
    )

    // Verify gate and wire were removed
    await expect(page.locator('text=/Gates: 1/')).toBeVisible()
    await expect(page.locator('text=/Wires: 0/')).toBeVisible()
  })
})
