import { test, expect } from '@playwright/test'
import { waitForSceneReady } from './support/waits'
import { expectGateCount, expectWireCount, expectNandOutputs } from './support/assertions'
import { nand3Scenario } from './support/scenarios/nand3'

// Fast store-driven version of the 3-gate NAND circuit scenario.
// Mirrors the UI-driven spec by consuming the same scenario descriptor.

test.describe('NAND Gate Circuit (store-driven)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await page.waitForSelector('text=Nand2Fun', { timeout: 10000 })
    await page.waitForSelector('canvas', { timeout: 10000 })
    await waitForSceneReady(page)
  })

  test('builds circuit and simulates via store interactions', async ({ page }) => {
    const { placements, wires, toggles, expectations } = nand3Scenario

    // Place gates via store
    const gateIds = await page.evaluate((placements) => {
      const ids: string[] = []
      placements.forEach(p => {
        const res = window.__CIRCUIT_ACTIONS__?.addGate('NAND', p.position)
        if (res?.id) ids.push(res.id)
      })
      return ids
    }, placements)

    expect(gateIds.length).toBe(expectations.gates)
    await expectGateCount(page, expectations.gates)

    // Wire gates via store
    await page.evaluate(({ wires, gateIds }) => {
      wires.forEach(w => {
        const from = gateIds[w.fromGate]
        const to = gateIds[w.toGate]
        window.__CIRCUIT_ACTIONS__?.addWire(from, `${from}-${w.fromPin}`, to, `${to}-${w.toPin}`)
      })
    }, { wires, gateIds })

    await expectWireCount(page, expectations.wires)

    // Toggle inputs via store
    await page.evaluate(({ toggles, gateIds }) => {
      toggles.forEach(t => {
        const gateId = gateIds[t.gate]
        window.__CIRCUIT_ACTIONS__?.setInputValue(gateId, `${gateId}-${t.pin}`, t.value)
      })
    }, { toggles, gateIds })

    // Run simulation
    await page.evaluate(() => window.__CIRCUIT_ACTIONS__?.toggleSimulation())
    await page.waitForTimeout(200)
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
