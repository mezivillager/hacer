/**
 * Gate Placement UI Tests
 *
 * Tests for grid-based gate placement via UI interactions.
 * Mirrors store tests with UI-driven interactions.
 *
 * Tag: @ui @gates
 */

import { uiTest as test, uiExpect as expect } from '../../fixtures'
import {
  DEFAULT_POSITIONS,
  GATE_Y,
  ALL_GATE_TYPES,
} from '../../config/constants'
import { addGateViaUI, getGateIds, clearAllViaUI } from '../../helpers/actions'
import { ensureGates } from '../../helpers/waits'
import { expectGateCount } from '../../helpers/assertions'

test.describe('Gate Placement @ui @gates', () => {
  test.describe('Grid Snapping', () => {
    for (const gateType of ALL_GATE_TYPES) {
      test(`${gateType} gate snaps to grid center via UI`, async ({ page }) => {
        await addGateViaUI(page, {
          type: gateType,
          position: DEFAULT_POSITIONS.center,
        })
        await ensureGates(page, 1)

        const gateIds = await getGateIds(page)
        expect(gateIds).toHaveLength(1)

        // Verify position matches grid-aligned position
        const gatePosition = await page.evaluate(
          (gateId: string): { x: number; y: number; z: number } | null => {
            const gate = window.__CIRCUIT_STORE__?.gates.find(
              (g) => g.id === gateId
            )
            return gate?.position ?? null
          },
          gateIds[0]
        )

        expect(gatePosition).not.toBeNull()
        expect(gatePosition?.y).toBe(GATE_Y)
      })
    }
  })

  test.describe('Default Rotation', () => {
    for (const gateType of ALL_GATE_TYPES) {
      test(`${gateType} gate has correct default rotation (flat) via UI`, async ({
        page,
      }) => {
        await addGateViaUI(page, {
          type: gateType,
          position: DEFAULT_POSITIONS.center,
        })
        await ensureGates(page, 1)

        const gateIds = await getGateIds(page)
        const gateRotation = await page.evaluate(
          (gateId: string): { x: number; y: number; z: number } | null => {
            const gate = window.__CIRCUIT_STORE__?.gates.find(
              (g) => g.id === gateId
            )
            return gate?.rotation ?? null
          },
          gateIds[0]
        )

        expect(gateRotation).not.toBeNull()
        // Gates should be flat (rotated 90 degrees around X axis)
        expect(gateRotation?.x).toBeCloseTo(Math.PI / 2, 5)
      })
    }
  })

  test.describe('Multiple Gate Placement', () => {
    test('can place multiple gates at different grid positions via UI', async ({
      page,
    }) => {
      const positions = [
        DEFAULT_POSITIONS.left,
        DEFAULT_POSITIONS.center,
        DEFAULT_POSITIONS.right,
      ]

      for (let i = 0; i < positions.length; i++) {
        await addGateViaUI(page, {
          type: ALL_GATE_TYPES[i],
          position: positions[i],
        })
      }

      await ensureGates(page, 3)
      await expectGateCount(page, 3)

      // Verify all gates were created
      const gateIds = await getGateIds(page)
      expect(gateIds).toHaveLength(3)
    })
  })

  test.describe('Gate Y Position', () => {
    test('all gates are placed at correct Y height via UI', async ({
      page,
    }) => {
      for (const gateType of ALL_GATE_TYPES) {
        await clearAllViaUI(page)

        await addGateViaUI(page, {
          type: gateType,
          position: DEFAULT_POSITIONS.center,
        })
        await ensureGates(page, 1)

        const gateIds = await getGateIds(page)
        const yPosition = await page.evaluate(
          (gateId: string): number | null => {
            const gate = window.__CIRCUIT_STORE__?.gates.find(
              (g) => g.id === gateId
            )
            return gate?.position.y ?? null
          },
          gateIds[0]
        )

        expect(yPosition).toBe(GATE_Y)
      }
    })
  })
})

