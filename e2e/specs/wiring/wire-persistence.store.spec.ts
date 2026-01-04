/**
 * Wire Persistence Store Tests
 *
 * Tests for wire behavior when gates move or rotate.
 * Verifies wires persist and update correctly.
 *
 * Tag: @store @wiring
 */

import { storeTest as test, storeExpect as expect } from '../../fixtures'
import { DEFAULT_POSITIONS } from '../../config/constants'
import { addGateViaStore, addWireViaStore } from '../../helpers/actions'
import { ensureGates, ensureWires } from '../../helpers/waits'
import { expectWireCount } from '../../helpers/assertions'

test.describe('Wire Persistence @store @wiring', () => {
  test.describe('Gate Movement', () => {
    test('wire persists when gate moves', async ({ page }) => {
      const gate1 = await addGateViaStore(page, 'NAND', DEFAULT_POSITIONS.left)
      const gate2 = await addGateViaStore(page, 'NAND', DEFAULT_POSITIONS.right)
      await ensureGates(page, 2)

      if (!gate1 || !gate2) {
        throw new Error('Failed to create gates')
      }

      await addWireViaStore(page, {
        fromGateId: gate1.id,
        fromPinId: `${gate1.id}-out-0`,
        toGateId: gate2.id,
        toPinId: `${gate2.id}-in-0`,
      })
      await ensureWires(page, 1)

      // Move gate2 to a new position
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
        { gateId: gate2.id, newPos: DEFAULT_POSITIONS.farRight }
      )

      // Verify wire still exists and connects to moved gate
      const wireStillConnected = await page.evaluate(
        (gate2Id: string): boolean => {
          const state = window.__CIRCUIT_STORE__
          const wire = state?.wires[0]
          return wire?.toGateId === gate2Id
        },
        gate2.id
      )

      expect(wireStillConnected).toBe(true)
      await expectWireCount(page, 1)
    })

    test('wire persists when source gate moves', async ({ page }) => {
      const gate1 = await addGateViaStore(page, 'NAND', DEFAULT_POSITIONS.left)
      const gate2 = await addGateViaStore(page, 'NAND', DEFAULT_POSITIONS.right)
      await ensureGates(page, 2)

      if (!gate1 || !gate2) {
        throw new Error('Failed to create gates')
      }

      await addWireViaStore(page, {
        fromGateId: gate1.id,
        fromPinId: `${gate1.id}-out-0`,
        toGateId: gate2.id,
        toPinId: `${gate2.id}-in-0`,
      })
      await ensureWires(page, 1)

      // Move gate1 (source gate)
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
        { gateId: gate1.id, newPos: DEFAULT_POSITIONS.farLeft }
      )

      // Verify wire still exists
      const wireStillConnected = await page.evaluate(
        (gate1Id: string): boolean => {
          const state = window.__CIRCUIT_STORE__
          const wire = state?.wires[0]
          return wire?.fromGateId === gate1Id
        },
        gate1.id
      )

      expect(wireStillConnected).toBe(true)
      await expectWireCount(page, 1)
    })
  })

  test.describe('Gate Rotation', () => {
    test('wire persists when gate rotates', async ({ page }) => {
      const gate1 = await addGateViaStore(page, 'NAND', DEFAULT_POSITIONS.left)
      const gate2 = await addGateViaStore(page, 'NAND', DEFAULT_POSITIONS.right)
      await ensureGates(page, 2)

      if (!gate1 || !gate2) {
        throw new Error('Failed to create gates')
      }

      await addWireViaStore(page, {
        fromGateId: gate1.id,
        fromPinId: `${gate1.id}-out-0`,
        toGateId: gate2.id,
        toPinId: `${gate2.id}-in-0`,
      })
      await ensureWires(page, 1)

      // Rotate gate2 by 90 degrees
      await page.evaluate(({ gateId }: { gateId: string }) => {
        window.__CIRCUIT_ACTIONS__?.rotateGate(gateId, 'z', Math.PI / 2)
      }, { gateId: gate2.id })

      // Verify wire still exists
      await expectWireCount(page, 1)

      // Verify wire still connects to rotated gate
      const wireStillConnected = await page.evaluate(
        (gate2Id: string): boolean => {
          const state = window.__CIRCUIT_STORE__
          const wire = state?.wires[0]
          return wire?.toGateId === gate2Id
        },
        gate2.id
      )

      expect(wireStillConnected).toBe(true)
    })

    test('wire persists when source gate rotates', async ({ page }) => {
      const gate1 = await addGateViaStore(page, 'NAND', DEFAULT_POSITIONS.left)
      const gate2 = await addGateViaStore(page, 'NAND', DEFAULT_POSITIONS.right)
      await ensureGates(page, 2)

      if (!gate1 || !gate2) {
        throw new Error('Failed to create gates')
      }

      await addWireViaStore(page, {
        fromGateId: gate1.id,
        fromPinId: `${gate1.id}-out-0`,
        toGateId: gate2.id,
        toPinId: `${gate2.id}-in-0`,
      })
      await ensureWires(page, 1)

      // Rotate gate1 (source gate)
      await page.evaluate(({ gateId }: { gateId: string }) => {
        window.__CIRCUIT_ACTIONS__?.rotateGate(gateId, 'z', Math.PI / 2)
      }, { gateId: gate1.id })

      // Verify wire still exists and connects correctly
      const wireConnections = await page.evaluate(
        ({ g1Id: _g1Id, g2Id: _g2Id }: { g1Id: string; g2Id: string }): {
          fromGateId: string
          toGateId: string
        } | null => {
          const state = window.__CIRCUIT_STORE__
          const wire = state?.wires[0]
          if (!wire) return null
          return { fromGateId: wire.fromGateId, toGateId: wire.toGateId }
        },
        { g1Id: gate1.id, g2Id: gate2.id }
      )

      expect(wireConnections?.fromGateId).toBe(gate1.id)
      expect(wireConnections?.toGateId).toBe(gate2.id)
      await expectWireCount(page, 1)
    })
  })

  test.describe('Multiple Wire Persistence', () => {
    test('all wires persist when gate rotates', async ({ page }) => {
      // Create 2 gates and wire them
      const gate1 = await addGateViaStore(page, 'NAND', DEFAULT_POSITIONS.left)
      const gate2 = await addGateViaStore(page, 'NAND', DEFAULT_POSITIONS.right)
      await ensureGates(page, 2)

      if (!gate1 || !gate2) {
        throw new Error('Failed to create gates')
      }

      // Wire g1 -> g2
      await addWireViaStore(page, {
        fromGateId: gate1.id,
        fromPinId: `${gate1.id}-out-0`,
        toGateId: gate2.id,
        toPinId: `${gate2.id}-in-0`,
      })
      await ensureWires(page, 1)

      // Rotate both gates
      await page.evaluate(({ gateId }: { gateId: string }) => {
        window.__CIRCUIT_ACTIONS__?.rotateGate(gateId, 'z', Math.PI / 2)
      }, { gateId: gate1.id })

      await page.evaluate(({ gateId }: { gateId: string }) => {
        window.__CIRCUIT_ACTIONS__?.rotateGate(gateId, 'z', Math.PI / 2)
      }, { gateId: gate2.id })

      // Wire should still exist
      const wireCount = await page.evaluate((): number => {
        return window.__CIRCUIT_STORE__?.wires.length ?? 0
      })

      expect(wireCount).toBe(1)

      // Verify wire connections
      const wire = await page.evaluate((): {
        fromGateId: string
        toGateId: string
      } | null => {
        const state = window.__CIRCUIT_STORE__
        const w = state?.wires[0]
        return w ? { fromGateId: w.fromGateId, toGateId: w.toGateId } : null
      })

      expect(wire?.fromGateId).toBe(gate1.id)
      expect(wire?.toGateId).toBe(gate2.id)
    })
  })
})

