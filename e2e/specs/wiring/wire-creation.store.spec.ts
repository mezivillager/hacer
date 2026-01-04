/**
 * Wire Creation Store Tests
 *
 * Tests for creating wires between gates via store.
 * Tests wire structure, multiple wires, and connection status.
 *
 * Tag: @store @wiring
 */

import { storeTest as test, storeExpect as expect } from '../../fixtures'
import { DEFAULT_POSITIONS, type GateType } from '../../config/constants'
import { addGateViaStore, addWireViaStore } from '../../helpers/actions'
import { ensureGates, ensureWires } from '../../helpers/waits'
import { expectWireCount, expectGateCount } from '../../helpers/assertions'

test.describe('Wire Creation @store @wiring', () => {
  test.describe('Wire Structure', () => {
    test('creates wire with correct structure', async ({ page }) => {
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

      const wire = await page.evaluate((): {
        id: string
        fromGateId: string
        toGateId: string
        fromPinId: string
        toPinId: string
        segments?: unknown[]
      } | null => {
        const state = window.__CIRCUIT_STORE__
        const wire = state?.wires[0]
        if (!wire) return null
        return {
          ...wire,
          segments: (wire as { segments?: unknown[] }).segments,
        }
      })

      expect(wire).not.toBeNull()
      expect(wire?.id).toBeDefined()
      expect(wire?.fromGateId).toBe(gate1.id)
      expect(wire?.toGateId).toBe(gate2.id)
      expect(wire?.fromPinId).toBe(`${gate1.id}-out-0`)
      expect(wire?.toPinId).toBe(`${gate2.id}-in-0`)
      expect(wire?.segments).toBeDefined()
      expect(Array.isArray(wire?.segments)).toBe(true)
    })

    test('verifies pin positions are accurate', async ({ page }) => {
      const gate1 = await addGateViaStore(page, 'NAND', DEFAULT_POSITIONS.left)
      const gate2 = await addGateViaStore(page, 'NAND', DEFAULT_POSITIONS.right)
      await ensureGates(page, 2)

      if (!gate1 || !gate2) {
        throw new Error('Failed to create gates')
      }

      const pinInfo = await page.evaluate(
        ({
          fromGateId,
          fromPinId,
          toGateId,
          toPinId,
        }: {
          fromGateId: string
          fromPinId: string
          toGateId: string
          toPinId: string
        }): {
          fromPos: { x: number; y: number; z: number } | null
          toPos: { x: number; y: number; z: number } | null
        } | null => {
          const actions = window.__CIRCUIT_ACTIONS__
          if (!actions) return null

          const fromPos = actions.getPinWorldPosition(fromGateId, fromPinId)
          const toPos = actions.getPinWorldPosition(toGateId, toPinId)

          return { fromPos, toPos }
        },
        {
          fromGateId: gate1.id,
          fromPinId: `${gate1.id}-out-0`,
          toGateId: gate2.id,
          toPinId: `${gate2.id}-in-0`,
        }
      )

      expect(pinInfo).not.toBeNull()
      expect(pinInfo?.fromPos).not.toBeNull()
      expect(pinInfo?.toPos).not.toBeNull()

      // Pin Y should match gate Y (0.2 for flat gates)
      const gateY = await page.evaluate((): number | null => {
        const state = window.__CIRCUIT_STORE__
        return state?.gates[0]?.position.y ?? null
      })

      expect(pinInfo?.fromPos?.y).toBeCloseTo(gateY ?? 0.2, 5)
      expect(pinInfo?.toPos?.y).toBeCloseTo(gateY ?? 0.2, 5)
    })
  })

  test.describe('Multiple Wires', () => {
    test('multiple wires can coexist independently', async ({ page }) => {
      const gate1 = await addGateViaStore(page, 'NAND', DEFAULT_POSITIONS.topLeft)
      const gate2 = await addGateViaStore(page, 'NAND', DEFAULT_POSITIONS.topRight)
      const gate3 = await addGateViaStore(page, 'NAND', DEFAULT_POSITIONS.bottomLeft)
      const gate4 = await addGateViaStore(page, 'NAND', DEFAULT_POSITIONS.bottomRight)
      await ensureGates(page, 4)

      if (!gate1 || !gate2 || !gate3 || !gate4) {
        throw new Error('Failed to create gates')
      }

      // First wire
      await addWireViaStore(page, {
        fromGateId: gate1.id,
        fromPinId: `${gate1.id}-out-0`,
        toGateId: gate2.id,
        toPinId: `${gate2.id}-in-0`,
      })
      await ensureWires(page, 1)

      // Second wire
      await addWireViaStore(page, {
        fromGateId: gate3.id,
        fromPinId: `${gate3.id}-out-0`,
        toGateId: gate4.id,
        toPinId: `${gate4.id}-in-0`,
      })
      await ensureWires(page, 2)
      await expectWireCount(page, 2)

      // Verify both wires exist with correct connections
      const wires = await page.evaluate((): Array<{
        fromGateId: string
        toGateId: string
      }> => {
        const state = window.__CIRCUIT_STORE__
        return state?.wires ?? []
      })

      expect(wires).toHaveLength(2)
      expect(wires[0].fromGateId).toBe(gate1.id)
      expect(wires[0].toGateId).toBe(gate2.id)
      expect(wires[1].fromGateId).toBe(gate3.id)
      expect(wires[1].toGateId).toBe(gate4.id)
    })
  })

  test.describe('Connection Status', () => {
    test('pin connection status updates when wire connects', async ({ page }) => {
      const gate1 = await addGateViaStore(page, 'NAND', DEFAULT_POSITIONS.left)
      await ensureGates(page, 1)

      // Verify initial state: output pin not connected
      const initialStatus = await page.evaluate((): {
        pinId: string
        isConnected: boolean
      } | null => {
        const state = window.__CIRCUIT_STORE__
        if (!state) return null
        const gate = state.gates[0]
        if (!gate) return null
        const outputPin = gate.outputs[0]
        const isConnected = state.wires.some(
          (w) =>
            (w.fromGateId === gate.id && w.fromPinId === outputPin.id) ||
            (w.toGateId === gate.id && w.toPinId === outputPin.id)
        )
        return { pinId: outputPin.id, isConnected }
      })

      expect(initialStatus).not.toBeNull()
      expect(initialStatus?.isConnected).toBe(false)

      // Add second gate and connect wire
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

      // Verify connection status updated
      const afterConnectionStatus = await page.evaluate((): {
        pinId: string
        isConnected: boolean
      } | null => {
        const state = window.__CIRCUIT_STORE__
        if (!state) return null
        const gate = state.gates[0]
        if (!gate) return null
        const outputPin = gate.outputs[0]
        const isConnected = state.wires.some(
          (w) =>
            (w.fromGateId === gate.id && w.fromPinId === outputPin.id) ||
            (w.toGateId === gate.id && w.toPinId === outputPin.id)
        )
        return { pinId: outputPin.id, isConnected }
      })

      expect(afterConnectionStatus).not.toBeNull()
      expect(afterConnectionStatus?.isConnected).toBe(true)
    })

    test('pin connection status updates when wire disconnects', async ({ page }) => {
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

      // Delete wire
      const wireId = await page.evaluate((): string | null => {
        const state = window.__CIRCUIT_STORE__
        return state?.wires[0]?.id ?? null
      })

      if (wireId) {
        await page.evaluate(({ wireId }: { wireId: string }) => {
          window.__CIRCUIT_ACTIONS__?.removeWire(wireId)
        }, { wireId })
        await expectWireCount(page, 0)
      }

      // Verify disconnected
      const disconnectedStatus = await page.evaluate((): {
        pinId: string
        isConnected: boolean
      } | null => {
        const state = window.__CIRCUIT_STORE__
        if (!state) return null
        const gate = state.gates[0]
        if (!gate) return null
        const outputPin = gate.outputs[0]
        const isConnected = state.wires.some(
          (w) =>
            (w.fromGateId === gate.id && w.fromPinId === outputPin.id) ||
            (w.toGateId === gate.id && w.toPinId === outputPin.id)
        )
        return { pinId: outputPin.id, isConnected }
      })

      expect(disconnectedStatus?.isConnected).toBe(false)
    })
  })

  test.describe('Wire Deletion on Gate Removal', () => {
    test('wires are removed when connected gate is deleted', async ({ page }) => {
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

      await expectGateCount(page, 2)
      await expectWireCount(page, 1)

      // Remove gate1
      await page.evaluate(({ gateId }: { gateId: string }) => {
        window.__CIRCUIT_ACTIONS__?.removeGate(gateId)
      }, { gateId: gate1.id })

      await expectGateCount(page, 1)
      await expectWireCount(page, 0)
    })
  })

  test.describe('Cross-Gate-Type Wiring', () => {
    // Test wiring between different gate types
    const gateTypePairs: [GateType, GateType][] = [
      ['NAND', 'AND'],
      ['OR', 'NOT'],
      ['XOR', 'NAND'],
    ]

    for (const [type1, type2] of gateTypePairs) {
      test(`can wire ${type1} output to ${type2} input`, async ({ page }) => {
        const gate1 = await addGateViaStore(page, type1, DEFAULT_POSITIONS.left)
        const gate2 = await addGateViaStore(page, type2, DEFAULT_POSITIONS.right)
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
        await expectWireCount(page, 1)
      })
    }
  })
})

