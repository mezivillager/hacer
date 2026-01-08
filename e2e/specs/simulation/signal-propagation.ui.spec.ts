/**
 * Signal Propagation UI Tests
 *
 * Tests for signal propagation through multi-gate circuits via UI.
 * Mirrors store tests with UI-driven interactions.
 *
 * Tag: @ui @simulation
 */

import { uiTest as test } from '../../fixtures'
import { DEFAULT_POSITIONS, TIMEOUTS } from '../../config/constants'
import {
  addGateViaUI,
  connectWiresViaUI,
  getGateIds,
  startSimulationViaUI,
} from '../../helpers/actions'
import { ensureGates, waitForSceneStable } from '../../helpers/waits'
import {
  expectGateCount,
  expectWireCount,
  expectSimulationRunning,
} from '../../helpers/assertions'

test.describe('Signal Propagation @ui @simulation', () => {
  test.describe('Two-Gate Circuits', () => {
    test('can build and run two-gate circuit', async ({ page }) => {
      await addGateViaUI(page, {
        type: 'NAND',
        position: DEFAULT_POSITIONS.left,
      })
      await addGateViaUI(page, {
        type: 'NAND',
        position: DEFAULT_POSITIONS.right,
        rotate: { direction: 'left', times: 2 },
      })
      await ensureGates(page, 2)

      await waitForSceneStable(page)

      const gateIds = await getGateIds(page)
      await connectWiresViaUI(
        page,
        [{ fromGate: 0, fromPin: 'out-0', toGate: 1, toPin: 'in-0' }],
        gateIds
      )

      await expectGateCount(page, 2)
      await expectWireCount(page, 1)

      // Start simulation
      await startSimulationViaUI(page)
      await expectSimulationRunning(page)

      // Wait for simulation to run
      await page.waitForTimeout(TIMEOUTS.simulation)

      // Verify circuit still intact
      await expectGateCount(page, 2)
      await expectWireCount(page, 1)
    })
  })

  test.describe('Three-Gate Circuits', () => {
    test('can build and run three-gate chain circuit', async ({ page }) => {
      await addGateViaUI(page, {
        type: 'NAND',
        position: DEFAULT_POSITIONS.left,
      })
      await addGateViaUI(page, {
        type: 'AND',
        position: DEFAULT_POSITIONS.center,
        rotate: { direction: 'left', times: 2 },
      })
      await addGateViaUI(page, {
        type: 'OR',
        position: DEFAULT_POSITIONS.right,
        rotate: { direction: 'left', times: 2 },
      })
      await ensureGates(page, 3)

      await waitForSceneStable(page)

      const gateIds = await getGateIds(page)

      // Wire chain: g1 -> g2 -> g3
      await connectWiresViaUI(
        page,
        [{ fromGate: 0, fromPin: 'out-0', toGate: 1, toPin: 'in-0' }],
        gateIds
      )
      await expectWireCount(page, 1)

      await connectWiresViaUI(
        page,
        [{ fromGate: 1, fromPin: 'out-0', toGate: 2, toPin: 'in-0' }],
        gateIds
      )
      await expectWireCount(page, 2)

      await expectGateCount(page, 3)

      // Start simulation
      await startSimulationViaUI(page)
      await expectSimulationRunning(page)

      await page.waitForTimeout(TIMEOUTS.simulation)

      // Verify circuit still intact
      await expectGateCount(page, 3)
      await expectWireCount(page, 2)
    })
  })

  test.describe('Mixed Gate Type Circuits', () => {
    test('can build circuit with multiple gate types', async ({ page }) => {
      await addGateViaUI(page, {
        type: 'XOR',
        position: DEFAULT_POSITIONS.left,
      })
      await addGateViaUI(page, {
        type: 'NOT',
        position: DEFAULT_POSITIONS.right,
        rotate: { direction: 'left', times: 2 },
      })
      await ensureGates(page, 2)

      await waitForSceneStable(page)

      const gateIds = await getGateIds(page)
      await connectWiresViaUI(
        page,
        [{ fromGate: 0, fromPin: 'out-0', toGate: 1, toPin: 'in-0' }],
        gateIds
      )

      await expectGateCount(page, 2)
      await expectWireCount(page, 1)

      await startSimulationViaUI(page)
      await expectSimulationRunning(page)
    })
  })
})

