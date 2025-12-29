/**
 * Comprehensive Wiring Scheme Tests (Store-level)
 *
 * Tests all main wiring scheme features in a single consolidated test suite.
 * Focus: Catch bugs, not just make tests pass.
 *
 * Tag: @store
 */

import { test as storeTest, expect as storeExpect } from '../fixtures'
import { addGateViaStore, addWireViaStore } from '../helpers/actions'
import { ensureGates, ensureWires } from '../helpers/waits'
import { expectWireCount } from '../helpers/assertions'
import { DEFAULT_POSITIONS } from '../config/constants'

storeTest.describe('Wiring Scheme (Comprehensive) @store', () => {
  storeTest.describe('Wire Creation & Structure', () => {
    storeTest('creates wire with correct structure', async ({ page }) => {
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

      const wire = await page.evaluate(() => {
        const state = window.__CIRCUIT_STORE__ as {
          wires: Array<{
            id: string
            fromGateId: string
            toGateId: string
            fromPinId: string
            toPinId: string
            segments: unknown[]
          }>
        } | undefined
        return state?.wires[0] ?? null
      })

      storeExpect(wire).not.toBeNull()
      storeExpect(wire?.id).toBeDefined()
      storeExpect(wire?.fromGateId).toBe(gate1.id)
      storeExpect(wire?.toGateId).toBe(gate2.id)
      storeExpect(wire?.fromPinId).toBe(`${gate1.id}-out-0`)
      storeExpect(wire?.toPinId).toBe(`${gate2.id}-in-0`)
      // Segments should exist (even if empty initially)
      storeExpect(wire?.segments).toBeDefined()
      storeExpect(Array.isArray(wire?.segments)).toBe(true)
    })

    storeTest('verifies pin positions are accurate', async ({ page }) => {
      const gate1 = await addGateViaStore(page, 'NAND', DEFAULT_POSITIONS.left)
      const gate2 = await addGateViaStore(page, 'NAND', DEFAULT_POSITIONS.right)
      await ensureGates(page, 2)

      if (!gate1 || !gate2) {
        throw new Error('Failed to create gates')
      }

      const pinInfo = await page.evaluate(
        ({ fromGateId, fromPinId, toGateId, toPinId }: {
          fromGateId: string
          fromPinId: string
          toGateId: string
          toPinId: string
        }) => {
          const actions = window.__CIRCUIT_ACTIONS__ as {
            getPinWorldPosition: (gateId: string, pinId: string) => { x: number; y: number; z: number } | null
            getPinOrientation: (gateId: string, pinId: string) => { direction: { x: number; y: number; z: number } } | null
          } | undefined
          if (!actions) return null

          const fromPos = actions.getPinWorldPosition(fromGateId, fromPinId)
          const toPos = actions.getPinWorldPosition(toGateId, toPinId)
          const fromOrientation = actions.getPinOrientation(fromGateId, fromPinId)
          const toOrientation = actions.getPinOrientation(toGateId, toPinId)

          return { fromPos, toPos, fromOrientation, toOrientation }
        },
        {
          fromGateId: gate1.id,
          fromPinId: `${gate1.id}-out-0`,
          toGateId: gate2.id,
          toPinId: `${gate2.id}-in-0`,
        }
      )

      storeExpect(pinInfo).not.toBeNull()
      storeExpect(pinInfo?.fromPos).not.toBeNull()
      storeExpect(pinInfo?.toPos).not.toBeNull()
      storeExpect(pinInfo?.fromOrientation).not.toBeNull()
      storeExpect(pinInfo?.toOrientation).not.toBeNull()

      // Pin Y should match gate Y (pin center at gate height)
      const gateY = await page.evaluate(() => {
        const state = window.__CIRCUIT_STORE__ as { gates: Array<{ position: { y: number } }> } | undefined
        return state?.gates[0]?.position.y ?? null
      })

      storeExpect(pinInfo?.fromPos?.y).toBeCloseTo(gateY ?? 0.2, 5)
      storeExpect(pinInfo?.toPos?.y).toBeCloseTo(gateY ?? 0.2, 5)
    })
  })

  storeTest.describe('Multiple Wires', () => {
    storeTest('multiple wires can coexist independently', async ({ page }) => {
      const gate1 = await addGateViaStore(page, 'NAND', { x: 2, y: 0.2, z: 2 })
      const gate2 = await addGateViaStore(page, 'NAND', { x: 6, y: 0.2, z: 2 })
      const gate3 = await addGateViaStore(page, 'NAND', { x: 2, y: 0.2, z: 6 })
      const gate4 = await addGateViaStore(page, 'NAND', { x: 6, y: 0.2, z: 6 })
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
      const wires = await page.evaluate(() => {
        const state = window.__CIRCUIT_STORE__ as {
          wires: Array<{ fromGateId: string; toGateId: string }>
        } | undefined
        return state?.wires ?? []
      })

      storeExpect(wires).toHaveLength(2)
      storeExpect(wires[0].fromGateId).toBe(gate1.id)
      storeExpect(wires[0].toGateId).toBe(gate2.id)
      storeExpect(wires[1].fromGateId).toBe(gate3.id)
      storeExpect(wires[1].toGateId).toBe(gate4.id)
    })
  })

  storeTest.describe('Wire Persistence', () => {
    storeTest('wire persists when gate moves', async ({ page }) => {
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

      // Move gate2
      await page.evaluate(
        ({ gateId, newPos }: { gateId: string; newPos: { x: number; y: number; z: number } }) => {
          const actions = window.__CIRCUIT_ACTIONS__ as {
            updateGatePosition: (gateId: string, position: { x: number; y: number; z: number }) => void
          } | undefined
          actions?.updateGatePosition(gateId, newPos)
        },
        { gateId: gate2.id, newPos: { x: 10, y: 0.2, z: 2 } }
      )

      // Verify wire still exists and connects to moved gate
      const wireStillConnected = await page.evaluate((gate2Id: string) => {
        const state = window.__CIRCUIT_STORE__ as { wires: Array<{ toGateId: string }> } | undefined
        const wire = state?.wires[0]
        return wire?.toGateId === gate2Id
      }, gate2.id)

      storeExpect(wireStillConnected).toBe(true)
      await expectWireCount(page, 1)
    })

    storeTest('wire persists when gate rotates', async ({ page }) => {
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

      // Rotate gate2
      await page.evaluate(
        ({ gateId }: { gateId: string }) => {
          const actions = window.__CIRCUIT_ACTIONS__ as {
            rotateGate: (gateId: string, axis: 'z', angle: number) => void
          } | undefined
          actions?.rotateGate(gateId, 'z', Math.PI / 2)
        },
        { gateId: gate2.id }
      )

      // Verify wire still exists
      await expectWireCount(page, 1)

      // Verify wire still connects to rotated gate
      const wireStillConnected = await page.evaluate((gate2Id: string) => {
        const state = window.__CIRCUIT_STORE__ as { wires: Array<{ toGateId: string }> } | undefined
        const wire = state?.wires[0]
        return wire?.toGateId === gate2Id
      }, gate2.id)

      storeExpect(wireStillConnected).toBe(true)
    })
  })

  storeTest.describe('Connection Status', () => {
    storeTest('pin connection status updates when wire connects', async ({ page }) => {
      const gate1 = await addGateViaStore(page, 'NAND', DEFAULT_POSITIONS.left)
      await ensureGates(page, 1)

      // Verify initial state: output pin not connected
      const initialStatus = await page.evaluate(() => {
        const store = window.__CIRCUIT_STORE__ as {
          gates: Array<{ id: string; outputs: Array<{ id: string }> }>
          wires: Array<{ fromGateId: string; fromPinId: string; toGateId: string; toPinId: string }>
          getState?: () => {
            gates: Array<{ id: string; outputs: Array<{ id: string }> }>
            wires: Array<{ fromGateId: string; fromPinId: string; toGateId: string; toPinId: string }>
          }
        } | undefined
        const state = store?.getState?.() ?? store
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

      storeExpect(initialStatus).not.toBeNull()
      storeExpect(initialStatus?.isConnected).toBe(false)

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
      const afterConnectionStatus = await page.evaluate((): { pinId: string; isConnected: boolean } | null => {
        const store = window.__CIRCUIT_STORE__ as {
          gates: Array<{ id: string; outputs: Array<{ id: string }> }>
          wires: Array<{ fromGateId: string; fromPinId: string; toGateId: string; toPinId: string }>
          getState?: () => {
            gates: Array<{ id: string; outputs: Array<{ id: string }> }>
            wires: Array<{ fromGateId: string; fromPinId: string; toGateId: string; toPinId: string }>
          }
        } | undefined
        const state = store?.getState?.() ?? store
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

      storeExpect(afterConnectionStatus).not.toBeNull()
      storeExpect(afterConnectionStatus?.isConnected).toBe(true)
    })

    storeTest('pin connection status updates when wire disconnects', async ({ page }) => {
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

      // Verify connected
      const connectedStatus = await page.evaluate((): { pinId: string; isConnected: boolean } | null => {
        const store = window.__CIRCUIT_STORE__ as {
          gates: Array<{ id: string; outputs: Array<{ id: string }> }>
          wires: Array<{ fromGateId: string; fromPinId: string; toGateId: string; toPinId: string }>
          getState?: () => {
            gates: Array<{ id: string; outputs: Array<{ id: string }> }>
            wires: Array<{ fromGateId: string; fromPinId: string; toGateId: string; toPinId: string }>
          }
        } | undefined
        const state = store?.getState?.() ?? store
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

      storeExpect(connectedStatus?.isConnected).toBe(true)

      // Delete wire
      const wireId = await page.evaluate((): string | null => {
        const store = window.__CIRCUIT_STORE__ as {
          wires: Array<{ id: string }>
          getState?: () => { wires: Array<{ id: string }> }
        } | undefined
        const state = store?.getState?.() ?? store
        return state?.wires[0]?.id ?? null
      })

      if (wireId) {
        await page.evaluate(
          ({ wireId }: { wireId: string }) => {
            const actions = window.__CIRCUIT_ACTIONS__ as {
              removeWire: (wireId: string) => void
            } | undefined
            actions?.removeWire(wireId)
          },
          { wireId }
        )
        await expectWireCount(page, 0)
      }

      // Verify disconnected
      const disconnectedStatus = await page.evaluate((): { pinId: string; isConnected: boolean } | null => {
        const store = window.__CIRCUIT_STORE__ as {
          gates: Array<{ id: string; outputs: Array<{ id: string }> }>
          wires: Array<{ fromGateId: string; fromPinId: string; toGateId: string; toPinId: string }>
          getState?: () => {
            gates: Array<{ id: string; outputs: Array<{ id: string }> }>
            wires: Array<{ fromGateId: string; fromPinId: string; toGateId: string; toPinId: string }>
          }
        } | undefined
        const state = store?.getState?.() ?? store
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

      storeExpect(disconnectedStatus?.isConnected).toBe(false)
    })
  })

  storeTest.describe('Wire Segments & Path Calculation', () => {
    storeTest('wire has segments array structure', async ({ page }) => {
      const gate1 = await addGateViaStore(page, 'NAND', { x: 2, y: 0.2, z: 2 })
      const gate2 = await addGateViaStore(page, 'NAND', { x: 6, y: 0.2, z: 2 })
      await ensureGates(page, 2)

      if (!gate1 || !gate2) {
        throw new Error('Failed to create gates')
      }

      // Use addWireViaStore (standard for store tests)
      // Note: segments are calculated during rendering, but structure exists in store
      await addWireViaStore(page, {
        fromGateId: gate1.id,
        fromPinId: `${gate1.id}-out-0`,
        toGateId: gate2.id,
        toPinId: `${gate2.id}-in-0`,
      })
      await ensureWires(page, 1)

      // Verify wire has segments array structure
      const wire = await page.evaluate(() => {
        const state = window.__CIRCUIT_STORE__ as {
          wires: Array<{
            segments: Array<{ type: string; start?: { x: number; y: number; z: number }; end?: { x: number; y: number; z: number } }>
          }>
        } | undefined
        return state?.wires[0] ?? null
      })

      storeExpect(wire).not.toBeNull()
      // Segments array should exist (may be empty initially, calculated on render)
      storeExpect(Array.isArray(wire?.segments)).toBe(true)
    })
  })
})

