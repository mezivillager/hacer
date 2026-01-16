/**
 * Gate Placement Store Tests
 *
 * Tests for grid-based gate placement, snapping, and validation.
 * Verifies gates snap to grid and placement rules are enforced.
 *
 * Tag: @store @gates
 */

import { storeTest as test, storeExpect as expect } from '../../fixtures'
import {
  DEFAULT_POSITIONS,
  GATE_Y,
  ALL_GATE_TYPES,
} from '../../config/constants'
import { addGateViaStore, clearAllViaStore } from '../../helpers/actions'
import { ensureGates } from '../../helpers/waits'
import { expectGateCount } from '../../helpers/assertions'

test.describe('Gate Placement @store @gates', () => {
  test.describe('Grid Snapping', () => {
    for (const gateType of ALL_GATE_TYPES) {
      test(`${gateType} gate snaps to grid center`, async ({ page }) => {
        const gate = await addGateViaStore(
          page,
          gateType,
          DEFAULT_POSITIONS.center
        )
        await ensureGates(page, 1)

        expect(gate).not.toBeNull()

        // Verify position matches grid-aligned position
        const gatePosition = await page.evaluate(
          (gateId: string): { x: number; y: number; z: number } | null => {
            const gate = window.__CIRCUIT_STORE__?.gates.find(
              (g) => g.id === gateId
            )
            return gate?.position ?? null
          },
          gate!.id
        )

        expect(gatePosition).not.toBeNull()
        expect(gatePosition?.x).toBe(DEFAULT_POSITIONS.center.x)
        expect(gatePosition?.y).toBe(GATE_Y)
        expect(gatePosition?.z).toBe(DEFAULT_POSITIONS.center.z)
      })
    }

    test('gate position is preserved at grid coordinates', async ({ page }) => {
      // Place gates at different positions (don't clear between, just verify positions)
      await addGateViaStore(page, 'NAND', DEFAULT_POSITIONS.left)
      await addGateViaStore(page, 'AND', DEFAULT_POSITIONS.right)
      await addGateViaStore(page, 'OR', DEFAULT_POSITIONS.top)
      await ensureGates(page, 3)

      const positions = await page.evaluate((): Array<{
        x: number
        y: number
        z: number
      }> => {
        return (
          window.__CIRCUIT_STORE__?.gates.map((g) => g.position) ?? []
        )
      })

      expect(positions).toHaveLength(3)
      expect(positions[0].x).toBe(DEFAULT_POSITIONS.left.x)
      expect(positions[0].y).toBe(GATE_Y)
      expect(positions[0].z).toBe(DEFAULT_POSITIONS.left.z)
      expect(positions[1].x).toBe(DEFAULT_POSITIONS.right.x)
      expect(positions[1].y).toBe(GATE_Y)
      expect(positions[1].z).toBe(DEFAULT_POSITIONS.right.z)
      expect(positions[2].x).toBe(DEFAULT_POSITIONS.top.x)
      expect(positions[2].y).toBe(GATE_Y)
      expect(positions[2].z).toBe(DEFAULT_POSITIONS.top.z)
    })
  })

  test.describe('Default Rotation', () => {
    for (const gateType of ALL_GATE_TYPES) {
      test(`${gateType} gate has correct default rotation (flat)`, async ({
        page,
      }) => {
        const gate = await addGateViaStore(
          page,
          gateType,
          DEFAULT_POSITIONS.center
        )
        await ensureGates(page, 1)

        const gateRotation = await page.evaluate(
          (gateId: string): { x: number; y: number; z: number } | null => {
            const gate = window.__CIRCUIT_STORE__?.gates.find(
              (g) => g.id === gateId
            )
            return gate?.rotation ?? null
          },
          gate!.id
        )

        expect(gateRotation).not.toBeNull()
        // Gates should be flat (rotated 90 degrees around X axis)
        expect(gateRotation?.x).toBeCloseTo(Math.PI / 2, 5)
        expect(gateRotation?.y).toBe(0)
        expect(gateRotation?.z).toBe(0)
      })
    }
  })

  test.describe('Multiple Gate Placement', () => {
    test('can place multiple gates at different grid positions', async ({
      page,
    }) => {
      const positions = [
        DEFAULT_POSITIONS.left,
        DEFAULT_POSITIONS.center,
        DEFAULT_POSITIONS.right,
      ]

      for (let i = 0; i < positions.length; i++) {
        await addGateViaStore(page, ALL_GATE_TYPES[i], positions[i])
      }

      await ensureGates(page, 3)
      await expectGateCount(page, 3)

      // Verify all gates have unique positions
      const gatePositions = await page.evaluate((): Array<{
        x: number
        y: number
        z: number
      }> => {
        return (
          window.__CIRCUIT_STORE__?.gates.map((g) => g.position) ?? []
        )
      })

      expect(gatePositions).toHaveLength(3)

      // Check each position is at the expected grid location
      for (let i = 0; i < positions.length; i++) {
        expect(gatePositions[i].x).toBe(positions[i].x)
        expect(gatePositions[i].z).toBe(positions[i].z)
      }
    })
  })

  test.describe('Grid Position Validation', () => {
    test('gates placed at odd grid coordinates are valid', async ({ page }) => {
      // All DEFAULT_POSITIONS use odd coordinates (section interiors)
      const gate = await addGateViaStore(page, 'NAND', DEFAULT_POSITIONS.center)
      await ensureGates(page, 1)

      expect(gate).not.toBeNull()
      expect(gate?.id).toBeDefined()

      const gridPosition = await page.evaluate(
        (gateId: string): { row: number; col: number } | null => {
          const gate = window.__CIRCUIT_STORE__?.gates.find(
            (g) => g.id === gateId
          )
          if (!gate) return null
          // Convert world coordinates to grid coordinates
          // row = Math.round(z / GRID_SIZE), col = Math.round(x / GRID_SIZE)
          const GRID_SIZE = 2.0
          return {
            row: Math.round(gate.position.z / GRID_SIZE),
            col: Math.round(gate.position.x / GRID_SIZE),
          }
        },
        gate!.id
      )

      // Verify coordinates are at odd grid positions
      expect(gridPosition?.row).toBe(1) // Odd
      expect(gridPosition?.col).toBe(1) // Odd
    })
  })

  test.describe('Gate Y Position', () => {
    test('all gates are placed at correct Y height for flat orientation', async ({
      page,
    }) => {
      for (const gateType of ALL_GATE_TYPES) {
        await clearAllViaStore(page)

        const gate = await addGateViaStore(
          page,
          gateType,
          DEFAULT_POSITIONS.center
        )
        await ensureGates(page, 1)

        const yPosition = await page.evaluate(
          (gateId: string): number | null => {
            const gate = window.__CIRCUIT_STORE__?.gates.find(
              (g) => g.id === gateId
            )
            return gate?.position.y ?? null
          },
          gate!.id
        )

        expect(yPosition).toBe(GATE_Y)
      }
    })
  })
})

