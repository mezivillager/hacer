/**
 * E2E tests for simulation functionality
 *
 * Uses store-driven approach for reliable gate/circuit setup
 * and UI assertions for simulation controls verification.
 */

import { test, expect } from '../fixtures'
import { UI_SELECTORS } from '../selectors'
import { DEFAULT_POSITIONS } from '../config/constants'
import {
  addGateViaStore,
  startSimulationViaUI,
  pauseSimulationViaUI,
  runSimulationTick,
  setInputValue,
} from '../helpers/actions'
import {
  expectGateCount,
  expectSimulationRunning,
  expectSimulationPaused,
  expectSimulationState,
  expectGateOutput,
  expectGateInput,
} from '../helpers/assertions'

test.describe('Simulation', () => {
  test('can start and stop simulation', async ({ page }) => {
    // Add a gate first via store
    await addGateViaStore(page, DEFAULT_POSITIONS.center)
    await expectGateCount(page, 1)

    // Click Run Simulation button
    await startSimulationViaUI(page)

    // Verify button text changed to Pause
    await expect(page.locator(UI_SELECTORS.buttons.pauseSimulation)).toBeVisible()

    // Verify status shows Running
    await expectSimulationRunning(page)

    // Verify store state
    await expectSimulationState(page, true)

    // Click Pause Simulation
    await pauseSimulationViaUI(page)

    // Verify button text changed back
    await expect(page.locator(UI_SELECTORS.buttons.runSimulation)).toBeVisible()

    // Verify status shows Paused
    await expectSimulationPaused(page)

    // Verify store state
    await expectSimulationState(page, false)
  })

  test('simulation status updates correctly', async ({ page }) => {
    // Initially should show Paused
    await expectSimulationPaused(page)

    // Start simulation
    await startSimulationViaUI(page)
    await expectSimulationRunning(page)

    // Stop simulation
    await pauseSimulationViaUI(page)
    await expectSimulationPaused(page)
  })

  test('simulation propagates signals through wires', async ({ page }) => {
    // Create a circuit with 2 gates wired together
    const gate1 = await addGateViaStore(page, DEFAULT_POSITIONS.left)
    const gate2 = await addGateViaStore(page, DEFAULT_POSITIONS.right)

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
    if (gate1) {
      await setInputValue(page, gate1.id, gate1.inputs[0].id, true)
      await setInputValue(page, gate1.id, gate1.inputs[1].id, true)
    }

    // Run a simulation tick
    await runSimulationTick(page)

    // Verify gate1 output is false (NAND of true, true)
    await expectGateOutput(page, 0, false)

    // Run another tick to propagate through wire
    await runSimulationTick(page)

    // Verify gate2 received the signal from gate1
    await expectGateInput(page, 1, 0, false) // Received from gate1 output
    // gate2 has inputs (false from wire, false default) -> NAND output = true
    await expectGateOutput(page, 1, true)
  })
})
