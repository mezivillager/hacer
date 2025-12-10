/**
 * Fast store-driven version of the 3-gate NAND circuit scenario.
 * Mirrors the UI-driven spec by consuming the same scenario descriptor.
 */

import { test, expect } from '../fixtures'
import { TIMEOUTS } from '../config/constants'
import { nand3Scenario } from '../scenarios'
import {
  addGatesViaStore,
  addWiresViaStore,
  setInputsViaStore,
  toggleSimulationViaStore,
  runSimulationTick,
} from '../helpers/actions'
import { expectGateCount, expectWireCount, expectNandOutputs } from '../helpers/assertions'

test.describe('NAND Gate Circuit (store-driven)', () => {
  test('builds circuit and simulates via store interactions', async ({ page }) => {
    const { placements, wires, toggles, expectations } = nand3Scenario

    // Place gates via store
    const gateIds = await addGatesViaStore(page, placements)

    expect(gateIds.length).toBe(expectations.gates)
    await expectGateCount(page, expectations.gates)

    // Wire gates via store
    await addWiresViaStore(page, wires, gateIds)

    await expectWireCount(page, expectations.wires)

    // Toggle inputs via store
    await setInputsViaStore(page, toggles, gateIds)

    // Run simulation
    await toggleSimulationViaStore(page)
    await page.waitForTimeout(TIMEOUTS.simulation)
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
