/**
 * Simulation Control UI Tests
 *
 * Tests for simulation start, stop, and pause functionality via UI.
 *
 * Tag: @ui @simulation
 */

import { uiTest as test } from '../../fixtures'
import { DEFAULT_POSITIONS, ALL_GATE_TYPES } from '../../config/constants'
import {
  addGateViaUI,
  startSimulationViaUI,
  pauseSimulationViaUI,
} from '../../helpers/actions'
import { ensureGates } from '../../helpers/waits'
import {
  expectGateCount,
  expectSimulationRunning,
  expectSimulationPaused,
  expectSimulationState,
} from '../../helpers/assertions'

// TODO(design-system-migration): re-enable in Phase E once new shell selectors land.
// TODO: Re-enable once UI e2e test stability is improved
// Skipped due to flaky behavior causing test slowdowns
test.describe.skip('Simulation Control @ui @simulation', () => {
  test('can start and stop simulation via UI', async ({ page }) => {
    await addGateViaUI(page, {
      type: 'NAND',
      position: DEFAULT_POSITIONS.center,
    })
    await ensureGates(page, 1)
    await expectGateCount(page, 1)

    await startSimulationViaUI(page)
    await expectSimulationRunning(page)
    await expectSimulationState(page, true)

    await pauseSimulationViaUI(page)
    await expectSimulationPaused(page)
    await expectSimulationState(page, false)
  })

  test('simulation status updates correctly via UI', async ({ page }) => {
    await expectSimulationPaused(page)
    await startSimulationViaUI(page)
    await expectSimulationRunning(page)
    await pauseSimulationViaUI(page)
    await expectSimulationPaused(page)
  })

  test.describe('Simulation with Different Gate Types', () => {
    for (const gateType of ALL_GATE_TYPES) {
      test(`can run simulation with ${gateType} gate`, async ({ page }) => {
        await addGateViaUI(page, {
          type: gateType,
          position: DEFAULT_POSITIONS.center,
        })
        await ensureGates(page, 1)
        await expectGateCount(page, 1)

        await startSimulationViaUI(page)
        await expectSimulationRunning(page)

        await pauseSimulationViaUI(page)
        await expectSimulationPaused(page)
      })
    }
  })
})

