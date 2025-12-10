import { test, expect } from '@playwright/test'

/**
 * E2E test for 3-gate NAND circuit workflow
 *
 * This test uses store-driven interactions for reliability:
 * - Gates are added via circuitActions.addGate()
 * - Wires are created via circuitActions.addWire()
 * - Inputs are toggled via circuitActions.setInputValue()
 * - State is verified via circuitStore access
 *
 * This approach bypasses unreliable canvas coordinate clicking
 * while still testing the full application flow.
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
      }>
      wires: Array<{
        id: string
        fromGateId: string
        fromPinId: string
        toGateId: string
        toPinId: string
      }>
      simulationRunning: boolean
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
      setInputValue: (gateId: string, pinId: string, value: boolean) => void
      toggleSimulation: () => void
      clearCircuit: () => void
      simulationTick: () => void
    }
  }
}

test.describe('NAND Gate Circuit', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    // Wait for app to load
    await page.waitForSelector('text=Nand2Fun', { timeout: 10000 })
    // Wait for canvas to be ready
    await page.waitForSelector('canvas', { timeout: 10000 })
    // Wait for WebGL context to initialize
    await page.waitForFunction(
      () => {
        const canvas = document.querySelector('canvas')
        return canvas && (canvas.getContext('webgl') || canvas.getContext('webgl2'))
      },
      { timeout: 10000 }
    )
  })

  test('creates 3-gate circuit, wires them, toggles inputs, and verifies simulation', async ({
    page,
  }) => {
    // Step 1: Add 3 NAND gates via store
    // Gate 1 - left side
    const gate1 = await page.evaluate(() => {
      return window.__CIRCUIT_ACTIONS__.addGate('NAND', { x: -2, y: 0.4, z: 0 })
    })

    // Gate 2 - middle left
    const gate2 = await page.evaluate(() => {
      return window.__CIRCUIT_ACTIONS__.addGate('NAND', { x: -2, y: 0.4, z: 2 })
    })

    // Gate 3 - right side (will receive inputs from gates 1 and 2)
    const gate3 = await page.evaluate(() => {
      return window.__CIRCUIT_ACTIONS__.addGate('NAND', { x: 2, y: 0.4, z: 1 })
    })

    // Verify gates were created via UI
    await expect(page.locator('text=/Gates: 3/')).toBeVisible({ timeout: 5000 })

    // Step 2: Wire gates together via store
    // Connect Gate 1 output to Gate 3 input 0
    await page.evaluate(
      ({ g1, g3 }) => {
        window.__CIRCUIT_ACTIONS__.addWire(g1.id, g1.outputs[0].id, g3.id, g3.inputs[0].id)
      },
      { g1: gate1, g3: gate3 }
    )

    // Connect Gate 2 output to Gate 3 input 1
    await page.evaluate(
      ({ g2, g3 }) => {
        window.__CIRCUIT_ACTIONS__.addWire(g2.id, g2.outputs[0].id, g3.id, g3.inputs[1].id)
      },
      { g2: gate2, g3: gate3 }
    )

    // Verify wires were created via UI
    await expect(page.locator('text=/Wires: 2/')).toBeVisible({ timeout: 5000 })

    // Step 3: Toggle inputs of Gate 1 and Gate 2 via store
    // Toggle Gate 1 input 0 (true)
    await page.evaluate(
      ({ g1 }) => {
        window.__CIRCUIT_ACTIONS__.setInputValue(g1.id, g1.inputs[0].id, true)
      },
      { g1: gate1 }
    )

    // Toggle Gate 1 input 1 (true)
    await page.evaluate(
      ({ g1 }) => {
        window.__CIRCUIT_ACTIONS__.setInputValue(g1.id, g1.inputs[1].id, true)
      },
      { g1: gate1 }
    )

    // Toggle Gate 2 input 0 (true)
    await page.evaluate(
      ({ g2 }) => {
        window.__CIRCUIT_ACTIONS__.setInputValue(g2.id, g2.inputs[0].id, true)
      },
      { g2: gate2 }
    )

    // Verify inputs were toggled via store
    const inputState = await page.evaluate(() => {
      const gates = window.__CIRCUIT_STORE__.gates
      return {
        gate1Input0: gates[0]?.inputs[0]?.value,
        gate1Input1: gates[0]?.inputs[1]?.value,
        gate2Input0: gates[1]?.inputs[0]?.value,
        gate2Input1: gates[1]?.inputs[1]?.value,
      }
    })
    expect(inputState.gate1Input0).toBe(true)
    expect(inputState.gate1Input1).toBe(true)
    expect(inputState.gate2Input0).toBe(true)
    expect(inputState.gate2Input1).toBe(false) // Not toggled

    // Step 4: Run simulation and verify results
    // Click Run Simulation button
    const runButton = page.locator('button:has-text("Run Simulation")')
    await runButton.click()
    await expect(page.locator('button:has-text("Pause Simulation")')).toBeVisible()
    await expect(page.locator('text=/Status:.*Running/')).toBeVisible()

    // Wait for simulation to run multiple ticks (simulation speed is 100ms)
    await page.waitForTimeout(500)

    // Run a simulation tick manually to ensure state is updated
    await page.evaluate(() => {
      window.__CIRCUIT_ACTIONS__.simulationTick()
    })

    // Verify simulation results via store
    // Gate 1: inputs (true, true) -> NAND output = false
    // Gate 2: inputs (true, false) -> NAND output = true
    // Gate 3: inputs (false from gate1, true from gate2) -> NAND output = true
    const simulationState = await page.evaluate(() => {
      const gates = window.__CIRCUIT_STORE__.gates
      return {
        gate1Output: gates[0]?.outputs[0]?.value,
        gate2Output: gates[1]?.outputs[0]?.value,
        gate3Input0: gates[2]?.inputs[0]?.value,
        gate3Input1: gates[2]?.inputs[1]?.value,
        gate3Output: gates[2]?.outputs[0]?.value,
        simulationRunning: window.__CIRCUIT_STORE__.simulationRunning,
      }
    })

    // Verify NAND logic
    expect(simulationState.gate1Output).toBe(false) // NAND(true, true) = false
    expect(simulationState.gate2Output).toBe(true) // NAND(true, false) = true
    expect(simulationState.gate3Input0).toBe(false) // Receives gate1 output
    expect(simulationState.gate3Input1).toBe(true) // Receives gate2 output
    expect(simulationState.gate3Output).toBe(true) // NAND(false, true) = true
    expect(simulationState.simulationRunning).toBe(true)

    // Verify simulation is still running via UI
    await expect(page.locator('text=/Status:.*Running/')).toBeVisible()

    // Verify final circuit state
    await expect(page.locator('text=/Gates: 3/')).toBeVisible()
    await expect(page.locator('text=/Wires: 2/')).toBeVisible()
  })

  test('can clear circuit and verify state reset', async ({ page }) => {
    // Add a gate via store
    await page.evaluate(() => {
      window.__CIRCUIT_ACTIONS__.addGate('NAND', { x: 0, y: 0.4, z: 0 })
    })
    await expect(page.locator('text=/Gates: 1/')).toBeVisible()

    // Clear circuit via UI button
    const clearButton = page.locator('button:has-text("Clear All")')
    await clearButton.click()

    // Verify circuit was cleared
    await expect(page.locator('text=/Gates: 0/')).toBeVisible()
    await expect(page.locator('text=/Wires: 0/')).toBeVisible()

    // Verify store state
    const storeState = await page.evaluate(() => ({
      gates: window.__CIRCUIT_STORE__.gates.length,
      wires: window.__CIRCUIT_STORE__.wires.length,
    }))
    expect(storeState.gates).toBe(0)
    expect(storeState.wires).toBe(0)
  })
})
