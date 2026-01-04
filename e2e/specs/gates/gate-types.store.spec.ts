/**
 * Gate Types Store Tests
 *
 * Tests for adding gates of all types via store.
 * All gate types are tested via parameterization.
 *
 * Tag: @store @gates
 */

import { storeTest as test, storeExpect as expect } from '../../fixtures'
import {
  DEFAULT_POSITIONS,
  ALL_GATE_TYPES,
  TWO_INPUT_GATES,
  SINGLE_INPUT_GATES,
  type GateType,
} from '../../config/constants'
import {
  addGateViaStore,
  getGateIds,
  getGateType,
  clearAllViaStore,
} from '../../helpers/actions'
import { ensureGates } from '../../helpers/waits'
import { expectGateCount } from '../../helpers/assertions'

test.describe('Gate Types @store @gates', () => {
  for (const gateType of ALL_GATE_TYPES) {
    test(`can add ${gateType} gate via store`, async ({ page }) => {
      const result = await addGateViaStore(
        page,
        gateType,
        DEFAULT_POSITIONS.center
      )

      expect(result).not.toBeNull()
      expect(result?.id).toBeDefined()

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
      await addGateViaStore(
        page,
        ALL_GATE_TYPES[i],
        positions[i]
      )
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
        await addGateViaStore(
          page,
          gateType as GateType,
          DEFAULT_POSITIONS.center
        )

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
              inputIds: gate?.inputs.map((p) => p.id) ?? [],
              outputIds: gate?.outputs.map((p) => p.id) ?? [],
            }
          },
          gateId
        )

        expect(gateInfo.inputCount).toBe(1)
        expect(gateInfo.outputCount).toBe(1)
        expect(gateInfo.inputIds[0]).toContain('-in-0')
        expect(gateInfo.outputIds[0]).toContain('-out-0')
      })
    }

    for (const gateType of TWO_INPUT_GATES) {
      test(`${gateType} gate has 2 inputs and 1 output`, async ({ page }) => {
        await clearAllViaStore(page)

        await addGateViaStore(
          page,
          gateType as GateType,
          DEFAULT_POSITIONS.center
        )

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
              inputIds: gate?.inputs.map((p) => p.id) ?? [],
              outputIds: gate?.outputs.map((p) => p.id) ?? [],
            }
          },
          gateId
        )

        expect(gateInfo.inputCount).toBe(2)
        expect(gateInfo.outputCount).toBe(1)
        expect(gateInfo.inputIds[0]).toContain('-in-0')
        expect(gateInfo.inputIds[1]).toContain('-in-1')
        expect(gateInfo.outputIds[0]).toContain('-out-0')
      })
    }
  })

  test.describe('Gate Deletion', () => {
    test('can delete a gate', async ({ page }) => {
      const gate = await addGateViaStore(
        page,
        'NAND',
        DEFAULT_POSITIONS.center
      )
      await expectGateCount(page, 1)

      if (gate?.id) {
        await page.evaluate(
          ({ gateId }: { gateId: string }) => {
            window.__CIRCUIT_ACTIONS__?.selectGate(gateId)
          },
          { gateId: gate.id }
        )

        await page.evaluate(
          ({ gateId }: { gateId: string }) => {
            window.__CIRCUIT_ACTIONS__?.removeGate(gateId)
          },
          { gateId: gate.id }
        )
      }

      await expectGateCount(page, 0)
    })

    test('can clear all gates', async ({ page }) => {
      await addGateViaStore(page, 'NAND', DEFAULT_POSITIONS.left)
      await addGateViaStore(page, 'AND', DEFAULT_POSITIONS.right)
      await expectGateCount(page, 2)

      await clearAllViaStore(page)

      await expectGateCount(page, 0)
    })
  })
})

