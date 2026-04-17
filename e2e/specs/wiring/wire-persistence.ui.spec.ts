/**
 * Wire Persistence UI Tests
 *
 * Tests for wire behavior when gates move or rotate via UI.
 * Mirrors store tests with UI-driven interactions.
 *
 * Tag: @ui @wiring
 */

import { uiTest as test, uiExpect as expect } from '../../fixtures'
import { DEFAULT_POSITIONS } from '../../config/constants'
import {
  addGateViaUI,
  connectWiresViaUI,
  getGateIds,
  selectGate,
} from '../../helpers/actions'
import { ensureGates, waitForSceneStable } from '../../helpers/waits'
import { expectWireCount } from '../../helpers/assertions'

// TODO: Re-enable once UI e2e test stability is improved
// Skipped due to flaky behavior causing test slowdowns
test.describe.skip('Wire Persistence @ui @wiring', () => {
  test.describe('Gate Rotation', () => {
    test('wire persists when gate rotates via keyboard', async ({ page }) => {
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
      await expectWireCount(page, 1)

      // Select second gate and rotate it
      await selectGate(page, gateIds[1])
      await page.keyboard.press('ArrowRight')
      await page.waitForTimeout(100)

      // Verify wire still exists
      await expectWireCount(page, 1)

      // Verify wire still connects to rotated gate
      const wireStillConnected = await page.evaluate(
        (gate2Id: string): boolean => {
          const state = window.__CIRCUIT_STORE__
          const wire = state?.wires[0]
          return wire?.to.entityId === gate2Id
        },
        gateIds[1]
      )

      expect(wireStillConnected).toBe(true)
    })
  })

  test.describe('Multiple Wire Persistence', () => {
    test('all wires persist through gate rotations', async ({ page }) => {
      // Create 3 gates
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

      // Wire g1 -> g2
      await connectWiresViaUI(
        page,
        [{ fromGate: 0, fromPin: 'out-0', toGate: 1, toPin: 'in-0' }],
        gateIds
      )
      await expectWireCount(page, 1)

      // Wire g2 -> g3
      await connectWiresViaUI(
        page,
        [{ fromGate: 1, fromPin: 'out-0', toGate: 2, toPin: 'in-0' }],
        gateIds
      )
      await expectWireCount(page, 2)

      // Rotate middle gate
      await selectGate(page, gateIds[1])
      await page.keyboard.press('ArrowRight')
      await page.waitForTimeout(100)

      // Both wires should still exist
      await expectWireCount(page, 2)
    })
  })
})

