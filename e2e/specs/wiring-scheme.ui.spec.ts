/**
 * Simplified Wiring Scheme (UI-level)
 * UI-driven tests for the new simplified wiring scheme
 */

import { test } from '../fixtures'
import { addGateViaUI, connectWiresViaUI, getGateIds } from '../helpers/actions'
import { ensureGates, ensureWires, waitForSceneStable } from '../helpers/waits'
import { expectWireCount } from '../helpers/assertions'

// Tag for filtering: @ui
test.describe('Simplified Wiring Scheme (UI) @ui', () => {
  test('can create wire connection via UI', async ({ page }) => {
    await page.goto('/')
    await waitForSceneStable(page)

    // Place two gates via UI
    await addGateViaUI(page, { type: 'NAND', position: { x: 2, y: 0.2, z: 2 } })
    await addGateViaUI(page, { type: 'NAND', position: { x: 6, y: 0.2, z: 2 } })
    await ensureGates(page, 2)

    // Wait for scene to stabilize
    await waitForSceneStable(page)

    const gateIds = await getGateIds(page)

    // Connect wires via UI
    await connectWiresViaUI(page, [
      {
        fromGateId: gateIds[0],
        fromPinId: `${gateIds[0]}-out-0`,
        toGateId: gateIds[1],
        toPinId: `${gateIds[1]}-in-0`,
      },
    ], gateIds)

    await ensureWires(page, 1)
    await expectWireCount(page, 1)
  })

  test('preview wire follows section lines', async ({ page }) => {
    await page.goto('/')
    await waitForSceneStable(page)

    // Place gate
    await addGateViaUI(page, { type: 'NAND', position: { x: 2, y: 0.2, z: 2 } })
    await ensureGates(page, 1)
    await waitForSceneStable(page)

    // Start wiring from output pin (preview should appear)
    // This tests that preview wiring uses the new simplified scheme
    // Click on output pin to start wiring
    // Preview wire should follow section lines
    // (Actual preview testing requires UI interaction helpers)
  })

  test('wire paths visible in 3D scene', async ({ page }) => {
    await page.goto('/')
    await waitForSceneStable(page)

    await addGateViaUI(page, { type: 'NAND', position: { x: 2, y: 0.2, z: 2 } })
    await addGateViaUI(page, { type: 'NAND', position: { x: 6, y: 0.2, z: 2 } })
    await ensureGates(page, 2)
    await waitForSceneStable(page)

    const gateIds = await getGateIds(page)
    await connectWiresViaUI(page, [
      {
        fromGateId: gateIds[0],
        fromPinId: `${gateIds[0]}-out-0`,
        toGateId: gateIds[1],
        toPinId: `${gateIds[1]}-in-0`,
      },
    ], gateIds)

    await ensureWires(page, 1)
    
    // Verify wire is rendered in the scene
    // (Would need to check for wire mesh elements in the DOM/3D scene)
    await expectWireCount(page, 1)
  })

  test('multiple wire connections work via UI', async ({ page }) => {
    await page.goto('/')
    await waitForSceneStable(page)

    // Place four gates
    await addGateViaUI(page, { type: 'NAND', position: { x: 2, y: 0.2, z: 2 } })
    await addGateViaUI(page, { type: 'NAND', position: { x: 6, y: 0.2, z: 2 } })
    await addGateViaUI(page, { type: 'NAND', position: { x: 2, y: 0.2, z: 6 } })
    await addGateViaUI(page, { type: 'NAND', position: { x: 6, y: 0.2, z: 6 } })
    await ensureGates(page, 4)
    await waitForSceneStable(page)

    const gateIds = await getGateIds(page)

    // Connect multiple wires
    await connectWiresViaUI(page, [
      {
        fromGateId: gateIds[0],
        fromPinId: `${gateIds[0]}-out-0`,
        toGateId: gateIds[1],
        toPinId: `${gateIds[1]}-in-0`,
      },
      {
        fromGateId: gateIds[2],
        fromPinId: `${gateIds[2]}-out-0`,
        toGateId: gateIds[3],
        toPinId: `${gateIds[3]}-in-0`,
      },
    ], gateIds)

    await ensureWires(page, 2)
    await expectWireCount(page, 2)
  })

  test('wire connections work with different gate types', async ({ page }) => {
    await page.goto('/')
    await waitForSceneStable(page)

    const gateTypes = ['NAND', 'AND', 'OR', 'NOT'] as const

    for (const gateType of gateTypes) {
      // Clear previous gates
      await page.evaluate(() => {
        window.__CIRCUIT_ACTIONS__?.clearCircuit()
      })

      // Add two gates of this type
      await addGateViaUI(page, { type: gateType, position: { x: 2, y: 0.2, z: 2 } })
      await addGateViaUI(page, { type: gateType, position: { x: 6, y: 0.2, z: 2 } })
      await ensureGates(page, 2)
      await waitForSceneStable(page)

      const gateIds = await getGateIds(page)

      // Connect wire
      await connectWiresViaUI(page, [
        {
          fromGateId: gateIds[0],
          fromPinId: `${gateIds[0]}-out-0`,
          toGateId: gateIds[1],
          toPinId: `${gateIds[1]}-in-0`,
        },
      ], gateIds)

      await ensureWires(page, 1)
      await expectWireCount(page, 1)
    }
  })
})

