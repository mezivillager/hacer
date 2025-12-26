/**
 * Simulation (UI-driven)
 */

import { test } from '../fixtures'
import { TIMEOUTS } from '../config/constants'
import { simulationTwoGateScenario } from '../scenarios'
import {
  addGateViaUI,
  getGateIds,
  connectWiresViaUI,
  clickPin,
  rotateAtPosition,
  startSimulationViaUI,
  pauseSimulationViaUI,
  runSimulationTick,
} from '../helpers/actions'
import { ensureGates } from '../helpers/waits'
import {
  expectGateCount,
  expectSimulationRunning,
  expectSimulationPaused,
  expectGateOutput,
  expectGateInput,
} from '../helpers/assertions'

const { placements, wires, toggles, expectations } = simulationTwoGateScenario

// Tag for filtering: @ui
test.describe('Simulation (UI) @ui', () => {
  test('can start and stop simulation via UI', async ({ page }) => {
    await addGateViaUI(page, { position: placements[0].position })
    await ensureGates(page, 1)
    await expectGateCount(page, 1)

    await startSimulationViaUI(page)
    await expectSimulationRunning(page)

    await pauseSimulationViaUI(page)
    await expectSimulationPaused(page)
  })

  test('simulation propagates signals through wires via UI', async ({ page }) => {
    // Place gates via UI with appropriate rotations
    for (const placement of placements) {
      await addGateViaUI(page, {
        position: placement.position,
        rotate: placement.rotate
      })
    }
    await ensureGates(page, expectations.gates)
    await expectGateCount(page, expectations.gates)

    const gateIds = await getGateIds(page)

    // Wire via UI clicks
    await connectWiresViaUI(page, wires, gateIds)
    await expectGateCount(page, expectations.gates)

    // Rotate gate 0 to expose inputs for toggling
    await rotateAtPosition(page, placements[0].position, 'left', 2)

    // Toggle inputs via UI
    for (const toggle of toggles) {
      const gateId = gateIds[toggle.gate]
      await clickPin(page, gateId, `${gateId}-${toggle.pin}`, { withShift: true })
    }

    // Run simulation ticks
    await startSimulationViaUI(page)
    await page.waitForTimeout(TIMEOUTS.simulationSettle)
    await runSimulationTick(page)
    await expectGateOutput(page, expectations.outputs[0].gateIndex, expectations.outputs[0].value)

    await runSimulationTick(page)
    await expectGateInput(page, expectations.inputs?.[0].gateIndex ?? 1, expectations.inputs?.[0].inputIndex ?? 0, expectations.inputs?.[0].value ?? false)
    await expectGateOutput(page, expectations.outputs[1].gateIndex, expectations.outputs[1].value)

    await pauseSimulationViaUI(page)
  })
})
