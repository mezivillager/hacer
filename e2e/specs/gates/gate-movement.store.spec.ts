/**
 * Gate Movement Store Tests
 *
 * Tests for gate rotation and position updates via store.
 * Verifies 90-degree rotation and position persistence.
 *
 * Tag: @store @gates
 */

import { storeTest as test, storeExpect as expect } from '../../fixtures'
import {
  DEFAULT_POSITIONS,
  ALL_GATE_TYPES,
} from '../../config/constants'
import { addGateViaStore } from '../../helpers/actions'
import { ensureGates } from '../../helpers/waits'

test.describe('Gate Movement @store @gates', () => {
  test.describe('90-Degree Rotation', () => {
    for (const gateType of ALL_GATE_TYPES) {
      test(`${gateType} gate can be rotated 90 degrees`, async ({ page }) => {
        const gate = await addGateViaStore(
          page,
          gateType,
          DEFAULT_POSITIONS.center
        )
        await ensureGates(page, 1)

        // Get initial rotation
        const initialRotation = await page.evaluate(
          (gateId: string): { x: number; y: number; z: number } | null => {
            const gate = window.__CIRCUIT_STORE__?.gates.find(
              (g) => g.id === gateId
            )
            return gate?.rotation ?? null
          },
          gate!.id
        )

        // Rotate gate by 90 degrees (around Z axis for flat gates)
        await page.evaluate(({ gateId }: { gateId: string }) => {
          window.__CIRCUIT_ACTIONS__?.rotateGate(gateId, 'z', Math.PI / 2)
        }, { gateId: gate!.id })

        // Get new rotation
        const newRotation = await page.evaluate(
          (gateId: string): { x: number; y: number; z: number } | null => {
            const gate = window.__CIRCUIT_STORE__?.gates.find(
              (g) => g.id === gateId
            )
            return gate?.rotation ?? null
          },
          gate!.id
        )

        expect(newRotation).not.toBeNull()
        // Z rotation should have changed by 90 degrees
        expect(newRotation?.z).toBeCloseTo(
          (initialRotation?.z ?? 0) + Math.PI / 2,
          5
        )
        // X rotation should remain the same (flat orientation)
        expect(newRotation?.x).toBeCloseTo(Math.PI / 2, 5)
      })
    }

    test('gate can be rotated multiple times', async ({ page }) => {
      const gate = await addGateViaStore(page, 'NAND', DEFAULT_POSITIONS.center)
      await ensureGates(page, 1)

      // Rotate 4 times (full circle)
      for (let i = 0; i < 4; i++) {
        await page.evaluate(({ gateId }: { gateId: string }) => {
          window.__CIRCUIT_ACTIONS__?.rotateGate(gateId, 'z', Math.PI / 2)
        }, { gateId: gate!.id })
      }

      // Get final rotation
      const finalRotation = await page.evaluate(
        (gateId: string): { z: number } | null => {
          const gate = window.__CIRCUIT_STORE__?.gates.find(
            (g) => g.id === gateId
          )
          return gate?.rotation ? { z: gate.rotation.z } : null
        },
        gate!.id
      )

      // After 4 rotations of 90 degrees, should be back to 0 (or 2*PI)
      const normalizedZ = (finalRotation?.z ?? 0) % (2 * Math.PI)
      expect(Math.abs(normalizedZ)).toBeLessThan(0.01)
    })

    test('can rotate in both directions', async ({ page }) => {
      const gate = await addGateViaStore(page, 'NAND', DEFAULT_POSITIONS.center)
      await ensureGates(page, 1)

      // Rotate right (positive)
      await page.evaluate(({ gateId }: { gateId: string }) => {
        window.__CIRCUIT_ACTIONS__?.rotateGate(gateId, 'z', Math.PI / 2)
      }, { gateId: gate!.id })

      let rotation = await page.evaluate(
        (gateId: string): number => {
          const gate = window.__CIRCUIT_STORE__?.gates.find(
            (g) => g.id === gateId
          )
          return gate?.rotation?.z ?? 0
        },
        gate!.id
      )

      expect(rotation).toBeCloseTo(Math.PI / 2, 5)

      // Rotate left (negative)
      await page.evaluate(({ gateId }: { gateId: string }) => {
        window.__CIRCUIT_ACTIONS__?.rotateGate(gateId, 'z', -Math.PI / 2)
      }, { gateId: gate!.id })

      rotation = await page.evaluate(
        (gateId: string): number => {
          const gate = window.__CIRCUIT_STORE__?.gates.find(
            (g) => g.id === gateId
          )
          return gate?.rotation?.z ?? 0
        },
        gate!.id
      )

      expect(rotation).toBeCloseTo(0, 5)
    })
  })

  test.describe('Position Update', () => {
    test('gate position can be updated via store', async ({ page }) => {
      const gate = await addGateViaStore(page, 'NAND', DEFAULT_POSITIONS.left)
      await ensureGates(page, 1)

      // Get initial position
      const initialPosition = await page.evaluate(
        (gateId: string): { x: number; z: number } | null => {
          const gate = window.__CIRCUIT_STORE__?.gates.find(
            (g) => g.id === gateId
          )
          return gate ? { x: gate.position.x, z: gate.position.z } : null
        },
        gate!.id
      )

      // Update position (move right along x-axis)
      const newX = (initialPosition?.x ?? 0) + 4 // Move 4 units to the right
      await page.evaluate(
        ({
          gateId,
          newPos,
        }: {
          gateId: string
          newPos: { x: number; y: number; z: number }
        }) => {
          window.__CIRCUIT_ACTIONS__?.updateGatePosition(gateId, newPos)
        },
        { gateId: gate!.id, newPos: { x: newX, y: 0.2, z: initialPosition?.z ?? 1 } }
      )

      // Verify position changed
      const position = await page.evaluate(
        (gateId: string): { x: number; y: number; z: number } | null => {
          const gate = window.__CIRCUIT_STORE__?.gates.find(
            (g) => g.id === gateId
          )
          return gate?.position ?? null
        },
        gate!.id
      )

      // Position should have changed from initial
      expect(position?.x).not.toBe(initialPosition?.x)
    })

    test('multiple gates can be moved independently', async ({ page }) => {
      const gate1 = await addGateViaStore(page, 'NAND', DEFAULT_POSITIONS.left)
      const gate2 = await addGateViaStore(page, 'AND', DEFAULT_POSITIONS.right)
      await ensureGates(page, 2)

      // Get initial positions
      const initialPos1 = await page.evaluate(
        (gateId: string): { x: number; z: number } | null => {
          const gate = window.__CIRCUIT_STORE__?.gates.find(
            (g) => g.id === gateId
          )
          return gate ? { x: gate.position.x, z: gate.position.z } : null
        },
        gate1!.id
      )

      const initialPos2 = await page.evaluate(
        (gateId: string): { x: number; z: number } | null => {
          const gate = window.__CIRCUIT_STORE__?.gates.find(
            (g) => g.id === gateId
          )
          return gate ? { x: gate.position.x, z: gate.position.z } : null
        },
        gate2!.id
      )

      // Move gate1 to a different Z position
      const newZ = (initialPos1?.z ?? 1) - 2
      await page.evaluate(
        ({
          gateId,
          newPos,
        }: {
          gateId: string
          newPos: { x: number; y: number; z: number }
        }) => {
          window.__CIRCUIT_ACTIONS__?.updateGatePosition(gateId, newPos)
        },
        { gateId: gate1!.id, newPos: { x: initialPos1?.x ?? -1, y: 0.2, z: newZ } }
      )

      // Verify gate1 moved (z changed)
      const pos1 = await page.evaluate(
        (gateId: string): { x: number; z: number } | null => {
          const gate = window.__CIRCUIT_STORE__?.gates.find(
            (g) => g.id === gateId
          )
          return gate ? { x: gate.position.x, z: gate.position.z } : null
        },
        gate1!.id
      )

      expect(pos1?.z).not.toBe(initialPos1?.z)

      // Verify gate2 didn't move
      const pos2 = await page.evaluate(
        (gateId: string): { x: number; z: number } | null => {
          const gate = window.__CIRCUIT_STORE__?.gates.find(
            (g) => g.id === gateId
          )
          return gate ? { x: gate.position.x, z: gate.position.z } : null
        },
        gate2!.id
      )

      expect(pos2?.x).toBe(initialPos2?.x)
      expect(pos2?.z).toBe(initialPos2?.z)
    })
  })

  test.describe('Selection and Movement', () => {
    test('can select a gate via store', async ({ page }) => {
      const gate = await addGateViaStore(page, 'NAND', DEFAULT_POSITIONS.center)
      await ensureGates(page, 1)

      // Select the gate
      await page.evaluate(({ gateId }: { gateId: string }) => {
        window.__CIRCUIT_ACTIONS__?.selectGate(gateId)
      }, { gateId: gate!.id })

      // Verify selection
      const selectedId = await page.evaluate((): string | null => {
        return window.__CIRCUIT_STORE__?.selectedGateId ?? null
      })

      expect(selectedId).toBe(gate!.id)
    })

    test('can deselect a gate', async ({ page }) => {
      const gate = await addGateViaStore(page, 'NAND', DEFAULT_POSITIONS.center)
      await ensureGates(page, 1)

      // Select then deselect
      await page.evaluate(({ gateId }: { gateId: string }) => {
        window.__CIRCUIT_ACTIONS__?.selectGate(gateId)
      }, { gateId: gate!.id })

      await page.evaluate(() => {
        window.__CIRCUIT_ACTIONS__?.selectGate(null)
      })

      // Verify deselection
      const selectedId = await page.evaluate((): string | null => {
        return window.__CIRCUIT_STORE__?.selectedGateId ?? null
      })

      expect(selectedId).toBeNull()
    })
  })
})

