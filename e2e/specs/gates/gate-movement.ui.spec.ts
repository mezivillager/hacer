/**
 * Gate Movement UI Tests
 *
 * Tests for gate rotation via keyboard shortcuts.
 * Mirrors store tests with UI-driven interactions.
 *
 * Tag: @ui @gates
 */

import { test, expect } from '../../fixtures'
import {
  DEFAULT_POSITIONS,
  ALL_GATE_TYPES,
} from '../../config/constants'
import { addGateViaUI, getGateIds, selectGate } from '../../helpers/actions'
import { ensureGates } from '../../helpers/waits'

test.describe('Gate Movement @ui @gates', () => {
  test.describe('Keyboard Rotation', () => {
    for (const gateType of ALL_GATE_TYPES) {
      test(`${gateType} gate can be rotated via arrow keys`, async ({
        page,
      }) => {
        await addGateViaUI(page, {
          type: gateType,
          position: DEFAULT_POSITIONS.center,
        })
        await ensureGates(page, 1)

        const gateIds = await getGateIds(page)
        await selectGate(page, gateIds[0])

        // Get initial rotation
        const initialZ = await page.evaluate(
          (gateId: string): number => {
            const gate = window.__CIRCUIT_STORE__?.gates.find(
              (g) => g.id === gateId
            )
            return gate?.rotation?.z ?? 0
          },
          gateIds[0]
        )

        // Rotate right using arrow key
        await page.keyboard.press('ArrowRight')
        await page.waitForTimeout(100)

        // Get new rotation
        const newZ = await page.evaluate(
          (gateId: string): number => {
            const gate = window.__CIRCUIT_STORE__?.gates.find(
              (g) => g.id === gateId
            )
            return gate?.rotation?.z ?? 0
          },
          gateIds[0]
        )

        // Rotation should have changed by 90 degrees
        expect(newZ).toBeCloseTo(initialZ + Math.PI / 2, 5)
      })
    }

    test('arrow keys rotate in opposite directions', async ({ page }) => {
      await addGateViaUI(page, {
        type: 'NAND',
        position: DEFAULT_POSITIONS.center,
      })
      await ensureGates(page, 1)

      const gateIds = await getGateIds(page)
      await selectGate(page, gateIds[0])

      // Rotate right
      await page.keyboard.press('ArrowRight')
      await page.waitForTimeout(100)

      let rotation = await page.evaluate(
        (gateId: string): number => {
          const gate = window.__CIRCUIT_STORE__?.gates.find(
            (g) => g.id === gateId
          )
          return gate?.rotation?.z ?? 0
        },
        gateIds[0]
      )

      expect(rotation).toBeCloseTo(Math.PI / 2, 5)

      // Rotate left
      await page.keyboard.press('ArrowLeft')
      await page.waitForTimeout(100)

      rotation = await page.evaluate(
        (gateId: string): number => {
          const gate = window.__CIRCUIT_STORE__?.gates.find(
            (g) => g.id === gateId
          )
          return gate?.rotation?.z ?? 0
        },
        gateIds[0]
      )

      expect(rotation).toBeCloseTo(0, 5)
    })

    test('rotation requires gate selection', async ({ page }) => {
      await addGateViaUI(page, {
        type: 'NAND',
        position: DEFAULT_POSITIONS.center,
      })
      await ensureGates(page, 1)

      const gateIds = await getGateIds(page)

      // Get initial rotation (no gate selected)
      await selectGate(page, null)

      const initialZ = await page.evaluate(
        (gateId: string): number => {
          const gate = window.__CIRCUIT_STORE__?.gates.find(
            (g) => g.id === gateId
          )
          return gate?.rotation?.z ?? 0
        },
        gateIds[0]
      )

      // Try to rotate without selection
      await page.keyboard.press('ArrowRight')
      await page.waitForTimeout(100)

      const afterZ = await page.evaluate(
        (gateId: string): number => {
          const gate = window.__CIRCUIT_STORE__?.gates.find(
            (g) => g.id === gateId
          )
          return gate?.rotation?.z ?? 0
        },
        gateIds[0]
      )

      // Rotation should not have changed
      expect(afterZ).toBeCloseTo(initialZ, 5)
    })
  })

  test.describe('Gate Selection', () => {
    test('clicking a gate icon and placing selects the gate', async ({
      page,
    }) => {
      await addGateViaUI(page, {
        type: 'NAND',
        position: DEFAULT_POSITIONS.center,
      })
      await ensureGates(page, 1)

      // Gate should be selected after placement
      const gateIds = await getGateIds(page)
      const selectedId = await page.evaluate((): string | null => {
        return window.__CIRCUIT_STORE__?.selectedGateId ?? null
      })

      expect(selectedId).toBe(gateIds[0])
    })

    test('can select different gates', async ({ page }) => {
      await addGateViaUI(page, {
        type: 'NAND',
        position: DEFAULT_POSITIONS.left,
      })
      await addGateViaUI(page, {
        type: 'AND',
        position: DEFAULT_POSITIONS.right,
      })
      await ensureGates(page, 2)

      const gateIds = await getGateIds(page)

      // Select first gate
      await selectGate(page, gateIds[0])

      let selectedId = await page.evaluate((): string | null => {
        return window.__CIRCUIT_STORE__?.selectedGateId ?? null
      })

      expect(selectedId).toBe(gateIds[0])

      // Select second gate
      await selectGate(page, gateIds[1])

      selectedId = await page.evaluate((): string | null => {
        return window.__CIRCUIT_STORE__?.selectedGateId ?? null
      })

      expect(selectedId).toBe(gateIds[1])
    })
  })
})

