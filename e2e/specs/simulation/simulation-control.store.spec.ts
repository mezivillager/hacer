/**
 * Simulation Control Store Tests
 *
 * Migrated from the skipped simulation-control.ui.spec.ts (P05-32).
 *
 * Scenarios from the former @ui spec:
 * 1. start + stop simulation -> covered by CompactToolbar.test.tsx (RTL)
 *    and Shell.integration.test.tsx (RTL) - not duplicated here.
 * 2. simulation status cycle (paused -> running -> paused) -> same RTL coverage.
 * 3. simulation toggles correctly for each gate type - this @store spec.
 *    The @ui spec was checking the simulation-running flag per gate type;
 *    that is purely a store contract: adding any gate type must not prevent
 *    toggleSimulation from updating simulationRunning.
 *
 * Tag: @store @simulation
 */

import { storeTest as test, storeExpect as expect } from '../../fixtures'
import { DEFAULT_POSITIONS, ALL_GATE_TYPES } from '../../config/constants'
import { addGateViaStore } from '../../helpers/actions'
import { ensureGates } from '../../helpers/waits'

test.describe('Simulation Control @store @simulation', () => {
  test('toggleSimulation starts simulation from stopped state', async ({ page }) => {
    const before = await page.evaluate(() => window.__CIRCUIT_STORE__?.simulationRunning ?? false)
    expect(before).toBe(false)

    await page.evaluate(() => window.__CIRCUIT_ACTIONS__?.toggleSimulation())

    const after = await page.evaluate(() => window.__CIRCUIT_STORE__?.simulationRunning ?? false)
    expect(after).toBe(true)

    // Cleanup
    await page.evaluate(() => window.__CIRCUIT_ACTIONS__?.toggleSimulation())
  })

  test('toggleSimulation stops a running simulation', async ({ page }) => {
    await page.evaluate(() => window.__CIRCUIT_ACTIONS__?.toggleSimulation())
    const running = await page.evaluate(() => window.__CIRCUIT_STORE__?.simulationRunning ?? false)
    expect(running).toBe(true)

    await page.evaluate(() => window.__CIRCUIT_ACTIONS__?.toggleSimulation())

    const stopped = await page.evaluate(() => window.__CIRCUIT_STORE__?.simulationRunning ?? false)
    expect(stopped).toBe(false)
  })

  test.describe('Simulation with Different Gate Types', () => {
    for (const gateType of ALL_GATE_TYPES) {
      test(`toggleSimulation works with a ${gateType} gate in the circuit`, async ({ page }) => {
        await addGateViaStore(page, gateType, DEFAULT_POSITIONS.center)
        await ensureGates(page, 1)

        const beforeToggle = await page.evaluate(
          () => window.__CIRCUIT_STORE__?.simulationRunning ?? false
        )
        expect(beforeToggle).toBe(false)

        await page.evaluate(() => window.__CIRCUIT_ACTIONS__?.toggleSimulation())

        const afterStart = await page.evaluate(
          () => window.__CIRCUIT_STORE__?.simulationRunning ?? false
        )
        expect(afterStart).toBe(true)

        await page.evaluate(() => window.__CIRCUIT_ACTIONS__?.toggleSimulation())

        const afterStop = await page.evaluate(
          () => window.__CIRCUIT_STORE__?.simulationRunning ?? false
        )
        expect(afterStop).toBe(false)
      })
    }
  })
})
