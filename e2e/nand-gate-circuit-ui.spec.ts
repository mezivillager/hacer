import { test } from '@playwright/test'
import { waitForSceneReady, ensureGates, ensureWires } from './support/waits'
import { clickWorldPosition, clickPin, rotateAtPosition } from './support/actions'
import { expectGateCount, expectWireCount, expectNandOutputs } from './support/assertions'
import { nand3Scenario } from './support/scenarios/nand3'

// Fully UI-driven E2E for the 3-gate NAND circuit.
// Uses shared helpers and the common scenario descriptor to mirror the store-driven spec.

test.describe('NAND Gate Circuit (UI-driven)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await page.waitForSelector('text=Nand2Fun', { timeout: 10000 })
    await page.waitForSelector('canvas', { timeout: 10000 })
    await waitForSceneReady(page)
  })

  test('builds circuit and simulates via UI interactions', async ({ page }) => {
    const { placements, wires, toggles, expectations } = nand3Scenario

    // Step 1: Place gates and rotate if needed
    for (const placement of placements) {
      await page.click('button:has-text("Add NAND Gate")')
      await page.getByRole('button', { name: 'Cancel Placement' }).waitFor()
      await clickWorldPosition(page, placement.position)
      if (placement.rotate) {
        await rotateAtPosition(page, placement.position, placement.rotate.direction, placement.rotate.times)
      }
    }

    await ensureGates(page, expectations.gates)
    await expectGateCount(page, expectations.gates)

    const gateIds = await page.evaluate(() => window.__CIRCUIT_STORE__?.gates.map(g => g.id) ?? [])
    if (gateIds.length < expectations.gates) throw new Error('Expected gates not present')

    // Step 2: Wire gates via UI pin clicks
    for (const [idx, wire] of wires.entries()) {
      const from = gateIds[wire.fromGate]
      const to = gateIds[wire.toGate]
      await clickPin(page, from, `${from}-${wire.fromPin}`)
      await clickPin(page, to, `${to}-${wire.toPin}`)
      await ensureWires(page, idx + 1)
    }

    await expectWireCount(page, expectations.wires)

    // Step 3: Toggle inputs via Shift+clicks
    for (const toggle of toggles) {
      const gateId = gateIds[toggle.gate]
      await clickPin(page, gateId, `${gateId}-${toggle.pin}`, { withShift: true })
    }

    // Step 4: Run simulation via UI
    await page.click('button:has-text("Run Simulation")')
    await page.locator('text=/Status:.*Running/').waitFor()
    await page.waitForTimeout(500)
    await page.evaluate(() => window.__CIRCUIT_ACTIONS__?.simulationTick())

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
