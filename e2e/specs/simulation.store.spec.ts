/**
 * Simulation (store-driven)
 */

import { test } from '../fixtures'
import { simulationTwoGateScenario } from '../scenarios'
import {
  addGateViaStore,
  startSimulationViaUI,
  pauseSimulationViaUI,
  runSimulationTick,
  setInputsViaStore,
} from '../helpers/actions'
import {
  expectGateCount,
  expectSimulationRunning,
  expectSimulationPaused,
  expectSimulationState,
  expectGateOutput,
  expectGateInput,
} from '../helpers/assertions'

const { placements, toggles, expectations } = simulationTwoGateScenario

// Tag for filtering: @store
test.describe('Simulation (store) @store', () => {
  test('can start and stop simulation', async ({ page }) => {
    await addGateViaStore(page, placements[0].position)
    await expectGateCount(page, 1)

    await startSimulationViaUI(page)
    await expectSimulationRunning(page)
    await expectSimulationState(page, true)

    await pauseSimulationViaUI(page)
    await expectSimulationPaused(page)
    await expectSimulationState(page, false)
  })

  test('simulation status updates correctly', async ({ page }) => {
    await expectSimulationPaused(page)
    await startSimulationViaUI(page)
    await expectSimulationRunning(page)
    await pauseSimulationViaUI(page)
    await expectSimulationPaused(page)
  })

  test('simulation propagates signals through wires', async ({ page }) => {
    // Place gates
    const gate1 = await addGateViaStore(page, placements[0].position)
    const gate2 = await addGateViaStore(page, placements[1].position)

    // Wire gate1 output to gate2 input
    await page.evaluate(({ g1, g2 }) => {
      if (g1 && g2) {
        window.__CIRCUIT_ACTIONS__?.addWire(g1.id, g1.outputs[0].id, g2.id, g2.inputs[0].id)
      }
    }, { g1: gate1, g2: gate2 })

    // Set inputs
    const gateIds = [gate1?.id ?? '', gate2?.id ?? '']
    await setInputsViaStore(page, toggles, gateIds)

    // Run ticks and assert outputs
    await runSimulationTick(page)
    await expectGateOutput(page, expectations.outputs[0].gateIndex, expectations.outputs[0].value)

    await runSimulationTick(page)
    await expectGateInput(page, expectations.inputs?.[0].gateIndex ?? 1, expectations.inputs?.[0].inputIndex ?? 0, expectations.inputs?.[0].value ?? false)
    await expectGateOutput(page, expectations.outputs[1].gateIndex, expectations.outputs[1].value)
  })
})
