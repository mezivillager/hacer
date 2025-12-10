import { test, expect } from '@playwright/test'
import { waitForSceneReady } from './support/waits'

/**
 * E2E tests for simulation functionality
 *
 * Uses store-driven approach for reliable gate/circuit setup
 * and UI assertions for simulation controls verification.
 */

test.describe('Simulation', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await page.waitForSelector('text=Nand2Fun', { timeout: 10000 })
    await page.waitForSelector('canvas', { timeout: 10000 })
    await waitForSceneReady(page)
  })

  test('can start and stop simulation', async ({ page }) => {
    // Add a gate first via store
    await page.evaluate(() => {
      window.__CIRCUIT_ACTIONS__?.addGate('NAND', { x: 0, y: 0.4, z: 0 })
    })
    await expect(page.locator('text=/Gates: 1/')).toBeVisible()

    // Click Run Simulation button
    const runButton = page.locator('button:has-text("Run Simulation")')
    await runButton.click()

    // Verify button text changed to Pause
    await expect(page.locator('button:has-text("Pause Simulation")')).toBeVisible()

    // Verify status shows Running
    await expect(page.locator('text=/Status:.*Running/')).toBeVisible()

    // Verify store state
    const isRunning = await page.evaluate(() => window.__CIRCUIT_STORE__?.simulationRunning ?? false)
    expect(isRunning).toBe(true)

    // Click Pause Simulation
    await page.click('button:has-text("Pause Simulation")')

    // Verify button text changed back
    await expect(page.locator('button:has-text("Run Simulation")')).toBeVisible()

    // Verify status shows Paused
    await expect(page.locator('text=/Status:.*Paused/')).toBeVisible()

    // Verify store state
    const isPaused = await page.evaluate(() => !(window.__CIRCUIT_STORE__?.simulationRunning ?? false))
    expect(isPaused).toBe(true)
  })

  test('simulation status updates correctly', async ({ page }) => {
    // Initially should show Paused
    await expect(page.locator('text=/Status:.*Paused/')).toBeVisible()

    // Start simulation
    await page.click('button:has-text("Run Simulation")')
    await expect(page.locator('text=/Status:.*Running/')).toBeVisible()

    // Stop simulation
    await page.click('button:has-text("Pause Simulation")')
    await expect(page.locator('text=/Status:.*Paused/')).toBeVisible()
  })

  test('simulation propagates signals through wires', async ({ page }) => {
    // Create a circuit with 2 gates wired together
    const gate1 = await page.evaluate(() => {
      return window.__CIRCUIT_ACTIONS__?.addGate('NAND', { x: -1, y: 0.4, z: 0 })
    })

    const gate2 = await page.evaluate(() => {
      return window.__CIRCUIT_ACTIONS__?.addGate('NAND', { x: 1, y: 0.4, z: 0 })
    })

    // Wire gate1 output to gate2 input
    await page.evaluate(
      ({ g1, g2 }) => {
        if (g1 && g2) {
          window.__CIRCUIT_ACTIONS__?.addWire(g1.id, g1.outputs[0].id, g2.id, g2.inputs[0].id)
        }
      },
      { g1: gate1, g2: gate2 }
    )

    // Set gate1 inputs to true, true -> NAND output = false
    await page.evaluate(
      ({ g1 }) => {
        if (g1) {
          window.__CIRCUIT_ACTIONS__?.setInputValue(g1.id, g1.inputs[0].id, true)
          window.__CIRCUIT_ACTIONS__?.setInputValue(g1.id, g1.inputs[1].id, true)
        }
      },
      { g1: gate1 }
    )

    // Run a simulation tick
    await page.evaluate(() => {
      window.__CIRCUIT_ACTIONS__?.simulationTick()
    })

    // Verify gate1 output is false (NAND of true, true)
    const gate1Output = await page.evaluate(() => {
      return window.__CIRCUIT_STORE__?.gates[0]?.outputs[0]?.value
    })
    expect(gate1Output).toBe(false)

    // Run another tick to propagate through wire
    await page.evaluate(() => {
      window.__CIRCUIT_ACTIONS__?.simulationTick()
    })

    // Verify gate2 received the signal from gate1
    const gate2State = await page.evaluate(() => {
      const gate2 = window.__CIRCUIT_STORE__?.gates[1]
      return {
        input0: gate2?.inputs[0]?.value,
        output: gate2?.outputs[0]?.value,
      }
    })
    expect(gate2State.input0).toBe(false) // Received from gate1 output
    // gate2 has inputs (false from wire, false default) -> NAND output = true
    expect(gate2State.output).toBe(true)
  })
})
