/**
 * Comprehensive Wiring Scheme Tests (UI-level)
 *
 * UI-driven tests that mirror the store tests but use actual UI interactions.
 * Tests all main wiring scheme features through user interactions.
 * Focus: Catch bugs, not just make tests pass.
 *
 * Tag: @ui
 */

import { test, expect } from '../fixtures'
import { addGateViaUI, clickPin, getGateIds } from '../helpers/actions'
import { ensureGates, ensureWires, waitForSceneStable } from '../helpers/waits'
import { expectWireCount } from '../helpers/assertions'
import { DEFAULT_POSITIONS } from '../config/constants'

test.describe('Wiring Scheme (Comprehensive) @ui', () => {
  test.describe('Wire Creation & Structure', () => {
    test('creates wire with correct structure via UI', async ({ page }) => {
      // Place gates via UI
      await addGateViaUI(page, {
        type: 'NAND',
        position: DEFAULT_POSITIONS.left,
      })
      await addGateViaUI(page, {
        type: 'NAND',
        position: DEFAULT_POSITIONS.right,
      })
      await ensureGates(page, 2)
      await waitForSceneStable(page)

      const gateIds = await getGateIds(page)
      if (gateIds.length < 2) {
        throw new Error('Failed to create gates')
      }

      const gate1Id = gateIds[0]
      const gate2Id = gateIds[1]

      // Connect wire via UI (click output pin, then input pin)
      await clickPin(page, gate1Id, `${gate1Id}-out-0`)
      await clickPin(page, gate2Id, `${gate2Id}-in-0`)
      await ensureWires(page, 1)

      // Verify wire structure in store
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

      expect(wire).not.toBeNull()
      expect(wire?.id).toBeDefined()
      expect(wire?.fromGateId).toBe(gate1Id)
      expect(wire?.toGateId).toBe(gate2Id)
      expect(wire?.fromPinId).toBe(`${gate1Id}-out-0`)
      expect(wire?.toPinId).toBe(`${gate2Id}-in-0`)
      // Segments should exist (calculated during wire creation)
      expect(wire?.segments).toBeDefined()
      expect(Array.isArray(wire?.segments)).toBe(true)
    })

    test('verifies pin positions are accurate via UI', async ({ page }) => {
      await addGateViaUI(page, {
        type: 'NAND',
        position: DEFAULT_POSITIONS.left,
      })
      await addGateViaUI(page, {
        type: 'NAND',
        position: DEFAULT_POSITIONS.right,
      })
      await ensureGates(page, 2)
      await waitForSceneStable(page)

      const gateIds = await getGateIds(page)
      if (gateIds.length < 2) {
        throw new Error('Failed to create gates')
      }

      const gate1Id = gateIds[0]
      const gate2Id = gateIds[1]

      // Verify pin positions
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
          fromGateId: gate1Id,
          fromPinId: `${gate1Id}-out-0`,
          toGateId: gate2Id,
          toPinId: `${gate2Id}-in-0`,
        }
      )

      expect(pinInfo).not.toBeNull()
      expect(pinInfo?.fromPos).not.toBeNull()
      expect(pinInfo?.toPos).not.toBeNull()
      expect(pinInfo?.fromOrientation).not.toBeNull()
      expect(pinInfo?.toOrientation).not.toBeNull()

      // Pin Y should match gate Y (pin center at gate height)
      const gateY = await page.evaluate(() => {
        const state = window.__CIRCUIT_STORE__ as { gates: Array<{ position: { y: number } }> } | undefined
        return state?.gates[0]?.position.y ?? null
      })

      expect(pinInfo?.fromPos?.y).toBeCloseTo(gateY ?? 0.2, 5)
      expect(pinInfo?.toPos?.y).toBeCloseTo(gateY ?? 0.2, 5)
    })
  })

  test.describe('Multiple Wires', () => {
    test('multiple wires can coexist independently via UI', async ({ page }) => {
      // Place 4 gates
      await addGateViaUI(page, {
        type: 'NAND',
        position: { x: 2, y: 0.2, z: 2 },
      })
      await addGateViaUI(page, {
        type: 'NAND',
        position: { x: 6, y: 0.2, z: 2 },
      })
      await addGateViaUI(page, {
        type: 'NAND',
        position: { x: 2, y: 0.2, z: 6 },
      })
      await addGateViaUI(page, {
        type: 'NAND',
        position: { x: 6, y: 0.2, z: 6 },
      })
      await ensureGates(page, 4)
      await waitForSceneStable(page)

      const gateIds = await getGateIds(page)
      if (gateIds.length < 4) {
        throw new Error('Failed to create gates')
      }

      // First wire
      await clickPin(page, gateIds[0], `${gateIds[0]}-out-0`)
      await clickPin(page, gateIds[1], `${gateIds[1]}-in-0`)
      await ensureWires(page, 1)
      await waitForSceneStable(page)

      // Second wire
      await clickPin(page, gateIds[2], `${gateIds[2]}-out-0`)
      await clickPin(page, gateIds[3], `${gateIds[3]}-in-0`)
      await ensureWires(page, 2)
      await waitForSceneStable(page)
      await expectWireCount(page, 2)

      // Verify both wires exist with correct connections
      const wires = await page.evaluate(() => {
        const state = window.__CIRCUIT_STORE__ as {
          wires: Array<{ fromGateId: string; toGateId: string }>
        } | undefined
        return state?.wires ?? []
      })

      expect(wires).toHaveLength(2)
      expect(wires[0].fromGateId).toBe(gateIds[0])
      expect(wires[0].toGateId).toBe(gateIds[1])
      expect(wires[1].fromGateId).toBe(gateIds[2])
      expect(wires[1].toGateId).toBe(gateIds[3])
    })
  })

  test.describe('Connection Status', () => {
    test('pin connection status updates when wire connects via UI', async ({ page }) => {
      await addGateViaUI(page, {
        type: 'NAND',
        position: DEFAULT_POSITIONS.left,
      })
      await ensureGates(page, 1)
      await waitForSceneStable(page)

      const gateIds = await getGateIds(page)
      if (gateIds.length < 1) {
        throw new Error('Failed to create gate')
      }

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

      expect(initialStatus).not.toBeNull()
      expect(initialStatus?.isConnected).toBe(false)

      // Add second gate and connect wire via UI
      await addGateViaUI(page, {
        type: 'NAND',
        position: DEFAULT_POSITIONS.right,
      })
      await ensureGates(page, 2)
      await waitForSceneStable(page)

      const updatedGateIds = await getGateIds(page)
      if (updatedGateIds.length < 2) {
        throw new Error('Failed to create second gate')
      }

      await clickPin(page, updatedGateIds[0], `${updatedGateIds[0]}-out-0`)
      await clickPin(page, updatedGateIds[1], `${updatedGateIds[1]}-in-0`)
      await ensureWires(page, 1)
      await waitForSceneStable(page)

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

      expect(afterConnectionStatus).not.toBeNull()
      expect(afterConnectionStatus?.isConnected).toBe(true)
    })
  })
})

