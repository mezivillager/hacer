/**
 * Circuit Building (UI-driven)
 */

import { test } from '../fixtures'
import { circuitBuildScenario } from '../scenarios'
import {
  addGateViaUI,
  connectWiresViaUI,
  getGateIds,
  selectGate,
  deleteSelectedViaUI,
  clearAllViaUI,
} from '../helpers/actions'
import { ensureGates, waitForSceneStable } from '../helpers/waits'
import { expectGateCount, expectWireCount } from '../helpers/assertions'

const { placements, wire } = circuitBuildScenario

// Tag for filtering: @ui
test.describe('Circuit Building (UI) @ui', () => {
  test('can add a NAND gate via UI', async ({ page }) => {
    await addGateViaUI(page, { 
      type: 'NAND',
      position: placements[0].position 
    })
    await ensureGates(page, 1)
    await expectGateCount(page, 1)
  })

  test('can wire two gates via UI', async ({ page }) => {
    // Place gates with appropriate rotations for wiring
    for (const placement of placements) {
      await addGateViaUI(page, { 
        type: 'NAND',
        position: placement.position,
        rotate: placement.rotate
      })
    }
    await ensureGates(page, 2)
    await expectGateCount(page, 2)

    // Wait for scene to stabilize after placements
    await waitForSceneStable(page)

    const gateIds = await getGateIds(page)
    await connectWiresViaUI(page, [wire], gateIds)
    await expectWireCount(page, 1)
  })

  test('supports delete and clear flows', async ({ page }) => {
    for (const placement of placements) {
      await addGateViaUI(page, {
        type: 'NAND',
        position: placement.position
      })
    }
    await ensureGates(page, 2)

    const gateIds = await getGateIds(page)
    // Select first gate via store then delete via UI
    if (gateIds[0]) {
      await selectGate(page, gateIds[0])
      await deleteSelectedViaUI(page)
    }

    await expectGateCount(page, 1)

    // Clear remaining gates via UI
    await clearAllViaUI(page)
    await expectGateCount(page, 0)
    await expectWireCount(page, 0)
  })
})
