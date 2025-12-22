/**
 * Wire-to-Pin Connection Refinement (Store-level)
 * Fast store tests for connection status logic without UI rendering
 */

import { test } from '../fixtures'
import { addGateViaStore, addWireViaStore } from '../helpers/actions'
import { ensureGates, ensureWires } from '../helpers/waits'
import { expectGateCount, expectWireCount } from '../helpers/assertions'
import { DEFAULT_POSITIONS } from '../config/constants'

// Tag for filtering: @store
test.describe('Wire-to-Pin Connection Refinement @store', () => {
  test('wire stub visibility updates when wire connects', async ({ page }) => {
    // Place a gate
    await addGateViaStore(page, 'NAND', DEFAULT_POSITIONS.left)
    await ensureGates(page, 1)
    await expectGateCount(page, 1)

    // Verify initial state: output pin should not be connected
    const initialConnectionStatus = await page.evaluate(() => {
      const state = window.__CIRCUIT_STORE__?.getState()
      if (!state) return null
      const gate = state.gates[0]
      if (!gate) return null
      const outputPin = gate.outputs[0]
      // Check if pin is connected to any wire
      const isConnected = state.wires.some(
        w =>
          (w.fromGateId === gate.id && w.fromPinId === outputPin.id) ||
          (w.toGateId === gate.id && w.toPinId === outputPin.id)
      )
      return { pinId: outputPin.id, isConnected }
    })

    expect(initialConnectionStatus).not.toBeNull()
    expect(initialConnectionStatus?.isConnected).toBe(false)

    // Place second gate and connect wire
    await addGateViaStore(page, 'NAND', DEFAULT_POSITIONS.right)
    await ensureGates(page, 2)

    const gateIds = await page.evaluate((): string[] => {
      const state = window.__CIRCUIT_STORE__?.getState() as { gates: Array<{ id: string }> } | undefined
      return state?.gates.map((g: { id: string }) => g.id) ?? []
    })

    // Connect wire from first gate output to second gate input
    await addWireViaStore(page, {
      fromGateId: gateIds[0],
      fromPinId: `${gateIds[0]}-out-0`,
      toGateId: gateIds[1],
      toPinId: `${gateIds[1]}-in-0`,
    })
    await ensureWires(page, 1)
    await expectWireCount(page, 1)

    // Verify connection status updated
    const afterConnectionStatus = await page.evaluate((): { pinId: string; isConnected: boolean } | null => {
      const state = window.__CIRCUIT_STORE__?.getState() as { gates: Array<{ id: string; outputs: Array<{ id: string }> }>; wires: Array<{ fromGateId: string; fromPinId: string; toGateId: string; toPinId: string }> } | undefined
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

  test('wire stub visibility updates when wire disconnects', async ({ page }) => {
    // Place two gates and connect them
    await addGateViaStore(page, 'NAND', DEFAULT_POSITIONS.left)
    await addGateViaStore(page, 'NAND', DEFAULT_POSITIONS.right)
    await ensureGates(page, 2)

    const gateIds = await page.evaluate((): string[] => {
      const state = window.__CIRCUIT_STORE__?.getState() as { gates: Array<{ id: string }> } | undefined
      return state?.gates.map((g: { id: string }) => g.id) ?? []
    })

    // Connect wire
    await addWireViaStore(page, {
      fromGateId: gateIds[0],
      fromPinId: `${gateIds[0]}-out-0`,
      toGateId: gateIds[1],
      toPinId: `${gateIds[1]}-in-0`,
    })
    await ensureWires(page, 1)

    // Verify connected
    const connectedStatus = await page.evaluate((): { pinId: string; isConnected: boolean } | null => {
      const state = window.__CIRCUIT_STORE__?.getState() as { gates: Array<{ id: string; outputs: Array<{ id: string }> }>; wires: Array<{ fromGateId: string; fromPinId: string; toGateId: string; toPinId: string }> } | undefined
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

    expect(connectedStatus?.isConnected).toBe(true)

    // Delete wire via store
    const wireId = await page.evaluate((): string | null => {
      const state = window.__CIRCUIT_STORE__?.getState()
      const wires = state?.wires as Array<{ id: string }> | undefined
      return wires?.[0]?.id ?? null
    })

    if (wireId) {
      await page.evaluate(
        ({ wireId }: { wireId: string }) => {
          window.__CIRCUIT_ACTIONS__?.removeWire(wireId)
        },
        { wireId }
      )
      await expectWireCount(page, 0)
    }

    // Verify disconnected
    const disconnectedStatus = await page.evaluate((): { pinId: string; isConnected: boolean } | null => {
      const state = window.__CIRCUIT_STORE__?.getState() as { gates: Array<{ id: string; outputs: Array<{ id: string }> }>; wires: Array<{ fromGateId: string; fromPinId: string; toGateId: string; toPinId: string }> } | undefined
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

  test('pin center positions are accurate for wire connections', async ({ page }) => {
    // Place two gates
    await addGateViaStore(page, 'NAND', DEFAULT_POSITIONS.left)
    await addGateViaStore(page, 'NAND', DEFAULT_POSITIONS.right)
    await ensureGates(page, 2)

    const gateIds = await page.evaluate((): string[] => {
      const state = window.__CIRCUIT_STORE__?.getState() as { gates: Array<{ id: string }> } | undefined
      return state?.gates.map((g: { id: string }) => g.id) ?? []
    })

    // Get pin center positions
    const pinPositions = await page.evaluate(
      ({ fromGateId, fromPinId, toGateId, toPinId }: { fromGateId: string; fromPinId: string; toGateId: string; toPinId: string }): { fromPos: { x: number; y: number; z: number } | null; toPos: { x: number; y: number; z: number } | null } | null => {
        const actions = window.__CIRCUIT_ACTIONS__ as { getPinWorldPosition: (gateId: string, pinId: string) => { x: number; y: number; z: number } | null } | undefined
        if (!actions) return null
        const fromPos = actions.getPinWorldPosition(fromGateId, fromPinId)
        const toPos = actions.getPinWorldPosition(toGateId, toPinId)
        return { fromPos, toPos }
      },
      {
        fromGateId: gateIds[0],
        fromPinId: `${gateIds[0]}-out-0`,
        toGateId: gateIds[1],
        toPinId: `${gateIds[1]}-in-0`,
      }
    )

    expect(pinPositions).not.toBeNull()
    expect(pinPositions?.fromPos).not.toBeNull()
    expect(pinPositions?.toPos).not.toBeNull()

    // Verify pin positions are at gate Y coordinate (pin center Y = gate Y)
    const gateY = await page.evaluate((): number | null => {
      const state = window.__CIRCUIT_STORE__?.getState()
      const gate = state?.gates[0] as { position: { y: number } } | undefined
      return gate?.position.y ?? null
    })

    expect(pinPositions?.fromPos?.y).toBeCloseTo(gateY ?? 0.2, 5)
    expect(pinPositions?.toPos?.y).toBeCloseTo(gateY ?? 0.2, 5)
  })

  test('connection status works for all gate types', async ({ page }) => {
    const gateTypes = ['NAND', 'AND', 'OR', 'XOR', 'NOT'] as const

    for (const gateType of gateTypes) {
      // Place gate
      await addGateViaStore(page, gateType, DEFAULT_POSITIONS.left)

      // Verify pin connection status can be checked
      const connectionStatus = await page.evaluate(
        ({ gateType }) => {
          const state = window.__CIRCUIT_STORE__?.getState()
          if (!state) return null
          const gate = state.gates.find(g => g.type === gateType)
          if (!gate) return null
          const outputPin = gate.outputs[0]
          const isConnected = state.wires.some(
            w =>
              (w.fromGateId === gate.id && w.fromPinId === outputPin.id) ||
              (w.toGateId === gate.id && w.toPinId === outputPin.id)
          )
          return { gateType, pinId: outputPin.id, isConnected }
        },
        { gateType }
      )

      expect(connectionStatus).not.toBeNull()
      expect(connectionStatus?.isConnected).toBe(false) // Initially not connected
    }
  })
})
