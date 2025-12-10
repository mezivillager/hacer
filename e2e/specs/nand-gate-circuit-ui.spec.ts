/**
 * Fully UI-driven E2E for the 3-gate NAND circuit.
 * Uses shared helpers and the common scenario descriptor to mirror the store-driven spec.
 */

import { test } from '../fixtures'
import { TIMEOUTS } from '../config/constants'
import { nand3Scenario } from '../scenarios'
import {
  addGateViaUI,
  getGateIds,
  connectWiresViaUI,
  clickPin,
  rotateAtPosition,
  startSimulationViaUI,
  runSimulationTick,
} from '../helpers/actions'
import { ensureGates } from '../helpers/waits'
import { expectGateCount, expectWireCount, expectNandOutputs } from '../helpers/assertions'

test.describe('NAND Gate Circuit (UI-driven)', () => {
  test('builds circuit and simulates via UI interactions', async ({ page }) => {
    const { placements, wires, toggles, expectations } = nand3Scenario

    // Step 1: Place gates and rotate if needed
    for (const placement of placements) {
      await addGateViaUI(page, {
        position: placement.position,
        rotate: placement.rotate,
      })
    }

    await ensureGates(page, expectations.gates)
    await expectGateCount(page, expectations.gates)

    const gateIds = await getGateIds(page)
    if (gateIds.length < expectations.gates) throw new Error('Expected gates not present')

    // Step 2: Wire gates via UI pin clicks
    await connectWiresViaUI(page, wires, gateIds)

    await expectWireCount(page, expectations.wires)

    // Step 3: Rotate gates to expose input pins before toggling
    // Get unique gate indices that need toggling
    const gatesNeedingToggle = [...new Set(toggles.map((t) => t.gate))]
    for (const gateIndex of gatesNeedingToggle) {
      const placement = placements[gateIndex]
      await rotateAtPosition(page, placement.position, 'left', 2)
    }

    // Step 4: Toggle inputs via Shift+clicks
    for (const toggle of toggles) {
      const gateId = gateIds[toggle.gate]
      await clickPin(page, gateId, `${gateId}-${toggle.pin}`, { withShift: true })
    }

    // Step 5: Run simulation via UI
    await startSimulationViaUI(page)
    await page.waitForTimeout(TIMEOUTS.simulationSettle)
    await runSimulationTick(page)

    await expectNandOutputs(page, {
      gate1Output: expectations.outputs.gate1,
      gate2Output: expectations.outputs.gate2,
      gate3Output: expectations.outputs.gate3,
      gate3Inputs: expectations.outputs.gate3Inputs,
    })

    await expectGateCount(page, expectations.gates)
    await expectWireCount(page, expectations.wires)
  })
})
