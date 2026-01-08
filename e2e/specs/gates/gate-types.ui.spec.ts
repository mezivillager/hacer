/**
 * Gate Types UI Tests
 *
 * Tests for adding gates of all types via UI interactions.
 * All gate types are tested via parameterization.
 *
 * Tag: @ui @gates
 */

import { uiTest as test, uiExpect as expect } from '../../fixtures'
import {
  DEFAULT_POSITIONS,
  ALL_GATE_TYPES,
  TWO_INPUT_GATES,
  SINGLE_INPUT_GATES,
} from '../../config/constants'
import {
  addGateViaUI,
  getGateIds,
  getGateType,
  selectGate,
  deleteSelectedViaUI,
  clearAllViaUI,
} from '../../helpers/actions'
import { ensureGates } from '../../helpers/waits'
import { expectGateCount } from '../../helpers/assertions'

test.describe('Gate Types @ui @gates', () => {
  for (const gateType of ALL_GATE_TYPES) {
    test(`can add ${gateType} gate via UI`, async ({ page }) => {
      await addGateViaUI(page, {
        type: gateType,
        position: DEFAULT_POSITIONS.center,
      })

      await ensureGates(page, 1)
      await expectGateCount(page, 1)

      // Verify the gate type is correct
      const gateIds = await getGateIds(page)
      const actualType = await getGateType(page, gateIds[0])
      expect(actualType).toBe(gateType)
    })
  }

  test('can add multiple different gate types', async ({ page }) => {
    const positions = [
      DEFAULT_POSITIONS.left,
      DEFAULT_POSITIONS.center,
      DEFAULT_POSITIONS.right,
      DEFAULT_POSITIONS.topLeft,
      DEFAULT_POSITIONS.topRight,
    ]

    for (let i = 0; i < ALL_GATE_TYPES.length; i++) {
      await addGateViaUI(page, {
        type: ALL_GATE_TYPES[i],
        position: positions[i],
      })
    }

    await ensureGates(page, ALL_GATE_TYPES.length)
    await expectGateCount(page, ALL_GATE_TYPES.length)

    // Verify all gate types are present
    const gateIds = await getGateIds(page)
    const types = await Promise.all(
      gateIds.map((id) => getGateType(page, id))
    )

    for (let i = 0; i < ALL_GATE_TYPES.length; i++) {
      expect(types[i]).toBe(ALL_GATE_TYPES[i])
    }
  })

  test.describe('Pin Configuration', () => {
    for (const gateType of SINGLE_INPUT_GATES) {
      test(`${gateType} gate has 1 input and 1 output`, async ({ page }) => {
        await addGateViaUI(page, {
          type: gateType as GateType,
          position: DEFAULT_POSITIONS.center,
        })

        await ensureGates(page, 1)
        const gateIds = await getGateIds(page)
        const gateId = gateIds[0]

        const gateInfo = await page.evaluate(
          (id: string) => {
            const gate = window.__CIRCUIT_STORE__?.gates.find(
              (g) => g.id === id
            )
            return {
              inputCount: gate?.inputs.length ?? 0,
              outputCount: gate?.outputs.length ?? 0,
            }
          },
          gateId
        )

        expect(gateInfo.inputCount).toBe(1)
        expect(gateInfo.outputCount).toBe(1)
      })
    }

    for (const gateType of TWO_INPUT_GATES) {
      test(`${gateType} gate has 2 inputs and 1 output`, async ({ page }) => {
        await addGateViaUI(page, {
          type: gateType as GateType,
          position: DEFAULT_POSITIONS.center,
        })

        await ensureGates(page, 1)
        const gateIds = await getGateIds(page)
        const gateId = gateIds[0]

        const gateInfo = await page.evaluate(
          (id: string) => {
            const gate = window.__CIRCUIT_STORE__?.gates.find(
              (g) => g.id === id
            )
            return {
              inputCount: gate?.inputs.length ?? 0,
              outputCount: gate?.outputs.length ?? 0,
            }
          },
          gateId
        )

        expect(gateInfo.inputCount).toBe(2)
        expect(gateInfo.outputCount).toBe(1)
      })
    }
  })

  test.describe('Gate Deletion', () => {
    test('can delete a gate via UI', async ({ page }) => {
      await addGateViaUI(page, {
        type: 'NAND',
        position: DEFAULT_POSITIONS.center,
      })
      await expectGateCount(page, 1)

      const gateIds = await getGateIds(page)
      if (gateIds[0]) {
        await selectGate(page, gateIds[0])
        await deleteSelectedViaUI(page)
      }

      await expectGateCount(page, 0)
    })

    test('can clear all gates via UI', async ({ page }) => {
      await addGateViaUI(page, {
        type: 'NAND',
        position: DEFAULT_POSITIONS.left,
      })
      await addGateViaUI(page, {
        type: 'AND',
        position: DEFAULT_POSITIONS.right,
      })
      await expectGateCount(page, 2)

      await clearAllViaUI(page)

      await expectGateCount(page, 0)
    })
  })
})

