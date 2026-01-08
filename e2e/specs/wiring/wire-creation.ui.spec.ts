/**
 * Wire Creation UI Tests
 *
 * Tests for creating wires between gates via UI interactions.
 * Mirrors store tests with UI-driven interactions.
 *
 * Tag: @ui @wiring
 */

import { uiTest as test } from '../../fixtures'
import { DEFAULT_POSITIONS, type GateType } from '../../config/constants'
import {
  addGateViaUI,
  connectWiresViaUI,
  getGateIds,
  selectGate,
  clearAllViaUI,
} from '../../helpers/actions'
import { ensureGates, waitForSceneStable } from '../../helpers/waits'
import { expectWireCount, expectGateCount } from '../../helpers/assertions'

test.describe('Wire Creation @ui @wiring', () => {
  test('can wire two gates via UI', async ({ page }) => {
    // Place two gates
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
    await expectGateCount(page, 2)

    await waitForSceneStable(page)

    const gateIds = await getGateIds(page)
    await connectWiresViaUI(
      page,
      [{ fromGate: 0, fromPin: 'out-0', toGate: 1, toPin: 'in-0' }],
      gateIds
    )
    await expectWireCount(page, 1)
  })

  test('can create multiple independent wires', async ({ page }) => {
    // Place 4 gates
    await addGateViaUI(page, {
      type: 'NAND',
      position: DEFAULT_POSITIONS.topLeft,
    })
    await addGateViaUI(page, {
      type: 'AND',
      position: DEFAULT_POSITIONS.topRight,
      rotate: { direction: 'left', times: 2 },
    })
    await addGateViaUI(page, {
      type: 'OR',
      position: DEFAULT_POSITIONS.bottomLeft,
    })
    await addGateViaUI(page, {
      type: 'XOR',
      position: DEFAULT_POSITIONS.bottomRight,
      rotate: { direction: 'left', times: 2 },
    })
    await ensureGates(page, 4)

    await waitForSceneStable(page)

    const gateIds = await getGateIds(page)

    // Wire first pair
    await connectWiresViaUI(
      page,
      [{ fromGate: 0, fromPin: 'out-0', toGate: 1, toPin: 'in-0' }],
      gateIds
    )
    await expectWireCount(page, 1)

    // Wire second pair
    await connectWiresViaUI(
      page,
      [{ fromGate: 2, fromPin: 'out-0', toGate: 3, toPin: 'in-0' }],
      gateIds
    )
    await expectWireCount(page, 2)
  })

  test.describe('Wire Deletion on Gate Removal', () => {
    test('wires are removed when connected gate is deleted via UI', async ({
      page,
    }) => {
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

      // Select and delete first gate
      await selectGate(page, gateIds[0])
      await page.click('[data-testid="delete-selected-btn"]')

      await expectGateCount(page, 1)
      await expectWireCount(page, 0)
    })

    test('clearing all gates removes all wires', async ({ page }) => {
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

      await clearAllViaUI(page)

      await expectGateCount(page, 0)
      await expectWireCount(page, 0)
    })
  })

  test.describe('Cross-Gate-Type Wiring', () => {
    const gateTypePairs: [GateType, GateType][] = [
      ['NAND', 'AND'],
      ['OR', 'NOT'],
      ['XOR', 'NAND'],
    ]

    for (const [type1, type2] of gateTypePairs) {
      test(`can wire ${type1} output to ${type2} input`, async ({ page }) => {
        await addGateViaUI(page, {
          type: type1,
          position: DEFAULT_POSITIONS.left,
        })
        await addGateViaUI(page, {
          type: type2,
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
      })
    }
  })
})

