/**
 * Simulation Control Store Tests
 *
 * Tests for simulation start, stop, and pause functionality.
 *
 * Tag: @store @simulation
 */

import { storeTest as test, storeExpect as expect } from '../../fixtures'
import { DEFAULT_POSITIONS, ALL_GATE_TYPES } from '../../config/constants'
import {
  addGateViaStore,
  startSimulationViaUI,
  pauseSimulationViaUI,
  toggleSimulationViaStore,
} from '../../helpers/actions'
import {
  expectGateCount,
  expectSimulationRunning,
  expectSimulationPaused,
  expectSimulationState,
} from '../../helpers/assertions'

test.describe('Simulation Control @store @simulation', () => {
  test('can start and stop simulation', async ({ page }) => {
    await addGateViaStore(page, 'NAND', DEFAULT_POSITIONS.center)
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

  test('can toggle simulation via store', async ({ page }) => {
    await addGateViaStore(page, 'NAND', DEFAULT_POSITIONS.center)

    // Start via store
    await toggleSimulationViaStore(page)
    await expectSimulationState(page, true)

    // Stop via store
    await toggleSimulationViaStore(page)
    await expectSimulationState(page, false)
  })

  test.describe('Simulation with Different Gate Types', () => {
    for (const gateType of ALL_GATE_TYPES) {
      test(`can run simulation with ${gateType} gate`, async ({ page }) => {
        await addGateViaStore(page, gateType, DEFAULT_POSITIONS.center)
        await expectGateCount(page, 1)

        await startSimulationViaUI(page)
        await expectSimulationRunning(page)

        // Verify simulation is running
        const isRunning = await page.evaluate((): boolean => {
          return window.__CIRCUIT_STORE__?.simulationRunning === true
        })
        expect(isRunning).toBe(true)

        await pauseSimulationViaUI(page)
        await expectSimulationPaused(page)
      })
    }
  })
})

