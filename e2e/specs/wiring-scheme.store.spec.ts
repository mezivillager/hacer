/**
 * Simplified Wiring Scheme (Store-level)
 * Fast store tests for the new simplified wiring scheme that routes wires along section lines
 *
 * Note: Store tests verify wire creation in the store state only.
 * Wire path calculation and rendering are tested in unit tests and UI tests.
 */

import { test as storeTest, expect as storeExpect } from '../fixtures'
import { addGateViaStore, addWireViaStore } from '../helpers/actions'
import { ensureGates, ensureWires } from '../helpers/waits'
import { expectWireCount } from '../helpers/assertions'

// Tag for filtering: @store
storeTest.describe('Simplified Wiring Scheme (Store) @store', () => {
  storeTest('can create wire between two gates', async ({ page }) => {
    // Place two gates
    const gate1 = await addGateViaStore(page, 'NAND', { x: 2, y: 0.2, z: 2 })
    const gate2 = await addGateViaStore(page, 'NAND', { x: 6, y: 0.2, z: 2 })
    await ensureGates(page, 2)

    // Connect wire via store (synchronous action, no scene needed)
    await addWireViaStore(page, {
      fromGateId: gate1.id,
      fromPinId: `${gate1.id}-out-0`,
      toGateId: gate2.id,
      toPinId: `${gate2.id}-in-0`,
    })

    // Verify wire exists in store immediately
    await ensureWires(page, 1)
    await expectWireCount(page, 1)

    // Verify wire structure
    const wire = await page.evaluate(() => {
      const state = (window.__CIRCUIT_STORE__ as { wires: Array<{ id?: string; fromGateId?: string; toGateId?: string; toPinId?: string }> } | undefined)
      return state?.wires[0] ?? null
    })

    storeExpect(wire).not.toBeNull()
    storeExpect(wire?.fromGateId).toBe(gate1.id)
    storeExpect(wire?.toGateId).toBe(gate2.id)
    storeExpect(wire?.fromPinId).toBe(`${gate1.id}-out-0`)
    storeExpect(wire?.toPinId).toBe(`${gate2.id}-in-0`)
  })

  storeTest('can verify pin positions for wire connections', async ({ page }) => {
    const gate1 = await addGateViaStore(page, 'NAND', { x: 2, y: 0.2, z: 2 })
    const gate2 = await addGateViaStore(page, 'NAND', { x: 6, y: 0.2, z: 2 })
    await ensureGates(page, 2)

    // Verify pin helper functions work (needed for path calculation)
    const pinInfo = await page.evaluate(
      ({ fromGateId, fromPinId, toGateId, toPinId }: { fromGateId: string; fromPinId: string; toGateId: string; toPinId: string }) => {
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
  })

  storeTest('can create wires with gates at different positions', async ({ page }) => {
    // Place gates at various positions
    const gate1 = await addGateViaStore(page, 'NAND', { x: 2, y: 0.2, z: 2 })
    const gate2 = await addGateViaStore(page, 'NAND', { x: 10, y: 0.2, z: 6 })
    await ensureGates(page, 2)

    await addWireViaStore(page, {
      fromGateId: gate1.id,
      fromPinId: `${gate1.id}-out-0`,
      toGateId: gate2.id,
      toPinId: `${gate2.id}-in-0`,
    })

    await ensureWires(page, 1)
    await expectWireCount(page, 1)
  })

  storeTest('can create wires with multiple gates present', async ({ page }) => {
    // Place multiple gates - wire creation should work regardless
    const gate1 = await addGateViaStore(page, 'NAND', { x: 2, y: 0.2, z: 2 })
    await addGateViaStore(page, 'NAND', { x: 6, y: 0.2, z: 6 })
    const gate2 = await addGateViaStore(page, 'NAND', { x: 10, y: 0.2, z: 2 })
    await ensureGates(page, 3)

    await addWireViaStore(page, {
      fromGateId: gate1.id,
      fromPinId: `${gate1.id}-out-0`,
      toGateId: gate2.id,
      toPinId: `${gate2.id}-in-0`,
    })

    await ensureWires(page, 1)
    await expectWireCount(page, 1)
  })

  storeTest('multiple wires can coexist', async ({ page }) => {
    const gate1 = await addGateViaStore(page, 'NAND', { x: 2, y: 0.2, z: 2 })
    const gate2 = await addGateViaStore(page, 'NAND', { x: 6, y: 0.2, z: 2 })
    const gate3 = await addGateViaStore(page, 'NAND', { x: 2, y: 0.2, z: 6 })
    const gate4 = await addGateViaStore(page, 'NAND', { x: 6, y: 0.2, z: 6 })
    await ensureGates(page, 4)

    // Connect first wire
    await addWireViaStore(page, {
      fromGateId: gate1.id,
      fromPinId: `${gate1.id}-out-0`,
      toGateId: gate2.id,
      toPinId: `${gate2.id}-in-0`,
    })
    await ensureWires(page, 1)

    // Connect second wire
    await addWireViaStore(page, {
      fromGateId: gate3.id,
      fromPinId: `${gate3.id}-out-0`,
      toGateId: gate4.id,
      toPinId: `${gate4.id}-in-0`,
    })
    await ensureWires(page, 2)
    await expectWireCount(page, 2)
  })

  storeTest('wire has correct structure in store', async ({ page }) => {
    const gate1 = await addGateViaStore(page, 'NAND', { x: 2, y: 0.2, z: 2 })
    const gate2 = await addGateViaStore(page, 'NAND', { x: 6, y: 0.2, z: 2 })
    await ensureGates(page, 2)

    await addWireViaStore(page, {
      fromGateId: gate1.id,
      fromPinId: `${gate1.id}-out-0`,
      toGateId: gate2.id,
      toPinId: `${gate2.id}-in-0`,
    })
    await ensureWires(page, 1)

    // Verify wire structure in store
    const wire = await page.evaluate(() => {
      const state = (window.__CIRCUIT_STORE__ as { wires: Array<{ id?: string; fromGateId?: string; toGateId?: string; fromPinId?: string; toPinId?: string }> } | undefined)
      return state?.wires[0] ?? null
    })

    storeExpect(wire).not.toBeNull()
    storeExpect(wire?.id).toBeDefined()
    storeExpect(wire?.fromGateId).toBe(gate1.id)
    storeExpect(wire?.toGateId).toBe(gate2.id)
    storeExpect(wire?.fromPinId).toBe(`${gate1.id}-out-0`)
    storeExpect(wire?.toPinId).toBe(`${gate2.id}-in-0`)
  })

  storeTest('wire persists when gate moves', async ({ page }) => {
    const gate1 = await addGateViaStore(page, 'NAND', { x: 2, y: 0.2, z: 2 })
    const gate2 = await addGateViaStore(page, 'NAND', { x: 6, y: 0.2, z: 2 })
    await ensureGates(page, 2)

    await addWireViaStore(page, {
      fromGateId: gate1.id,
      fromPinId: `${gate1.id}-out-0`,
      toGateId: gate2.id,
      toPinId: `${gate2.id}-in-0`,
    })
    await ensureWires(page, 1)

    // Move gate2 - wire should still exist in store
    await page.evaluate(
      ({ gateId, newPos }: { gateId: string; newPos: { x: number; y: number; z: number } }) => {
        window.__CIRCUIT_ACTIONS__?.updateGatePosition(gateId, newPos)
      },
      { gateId: gate2.id, newPos: { x: 10, y: 0.2, z: 2 } }
    )

    // Verify wire still exists and connects to moved gate
    const wire = await page.evaluate((gate2Id: string) => {
      const state = (window.__CIRCUIT_STORE__ as { wires: Array<{ toGateId?: string }> } | undefined)
      const wire = state?.wires[0]
      return wire?.toGateId === gate2Id
    }, gate2.id)

    storeExpect(wire).toBe(true)
    await expectWireCount(page, 1)
  })

  storeTest('wire persists when gate rotates', async ({ page }) => {
    const gate1 = await addGateViaStore(page, 'NAND', { x: 2, y: 0.2, z: 2 })
    const gate2 = await addGateViaStore(page, 'NAND', { x: 6, y: 0.2, z: 2 })
    await ensureGates(page, 2)

    await addWireViaStore(page, {
      fromGateId: gate1.id,
      fromPinId: `${gate1.id}-out-0`,
      toGateId: gate2.id,
      toPinId: `${gate2.id}-in-0`,
    })
    await ensureWires(page, 1)

    // Rotate gate2 - wire should still exist in store
    await page.evaluate(
      ({ gateId }: { gateId: string }) => {
        window.__CIRCUIT_ACTIONS__?.rotateGate(gateId, 'z', Math.PI / 2)
      },
      { gateId: gate2.id }
    )

    // Verify wire still exists
    await expectWireCount(page, 1)
  })
})

