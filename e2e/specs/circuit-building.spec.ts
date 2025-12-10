/**
 * E2E tests for circuit building functionality
 *
 * Uses store-driven approach for reliable gate manipulation
 * and UI assertions for user-visible feedback verification.
 */

import { test, expect } from '../fixtures'
import { UI_SELECTORS } from '../selectors'
import { DEFAULT_POSITIONS } from '../config/constants'
import {
  addGateViaStore,
  selectGate,
  removeGateViaStore,
  deleteSelectedViaUI,
  clearAllViaUI,
} from '../helpers/actions'
import {
  expectGateCount,
  expectWireCount,
  expectStoreGateCount,
  expectStoreWireCount,
} from '../helpers/assertions'

test.describe('Circuit Building', () => {
  test('can add a NAND gate to the canvas', async ({ page }) => {
    // Add gate via store
    await addGateViaStore(page, DEFAULT_POSITIONS.center)

    // Verify gate was added via UI
    await expectGateCount(page, 1)

    // Verify store state
    await expectStoreGateCount(page, 1)
  })

  test('can wire two gates together', async ({ page }) => {
    // Add first gate via store
    const gate1 = await addGateViaStore(page, DEFAULT_POSITIONS.left)

    // Add second gate via store
    const gate2 = await addGateViaStore(page, DEFAULT_POSITIONS.right)

    // Verify gates were added
    await expectGateCount(page, 2)

    // Wire gates together via store
    await page.evaluate(
      ({ g1, g2 }) => {
        if (g1 && g2) {
          window.__CIRCUIT_ACTIONS__?.addWire(g1.id, g1.outputs[0].id, g2.id, g2.inputs[0].id)
        }
      },
      { g1: gate1, g2: gate2 }
    )

    // Verify wire was created via UI
    await expectWireCount(page, 1)

    // Verify store state
    await expectStoreWireCount(page, 1)
  })

  test('can delete a gate', async ({ page }) => {
    // Add a gate via store
    const gate = await addGateViaStore(page, DEFAULT_POSITIONS.center)

    // Verify gate exists
    await expectGateCount(page, 1)

    // Select the gate via store
    if (gate?.id) {
      await selectGate(page, gate.id)
    }

    // Click Delete Selected button
    const deleteButton = page.locator(UI_SELECTORS.buttons.deleteSelected)
    await expect(deleteButton).toBeEnabled()
    await deleteSelectedViaUI(page)

    // Verify gate was removed via UI
    await expectGateCount(page, 0)

    // Verify store state
    await expectStoreGateCount(page, 0)
  })

  test('can clear all gates', async ({ page }) => {
    // Add multiple gates via store
    await addGateViaStore(page, DEFAULT_POSITIONS.left)
    await addGateViaStore(page, DEFAULT_POSITIONS.right)

    // Verify gates exist
    await expectGateCount(page, 2)

    // Click Clear All button
    const clearButton = page.locator(UI_SELECTORS.buttons.clearAll)
    await expect(clearButton).toBeEnabled()
    await clearAllViaUI(page)

    // Verify all gates cleared via UI
    await expectGateCount(page, 0)

    // Verify store state
    await expectStoreGateCount(page, 0)
    await expectStoreWireCount(page, 0)
  })

  test('wires are removed when gate is deleted', async ({ page }) => {
    // Add two gates and wire them
    const gate1 = await addGateViaStore(page, DEFAULT_POSITIONS.left)
    const gate2 = await addGateViaStore(page, DEFAULT_POSITIONS.right)

    await page.evaluate(
      ({ g1, g2 }) => {
        if (g1 && g2) {
          window.__CIRCUIT_ACTIONS__?.addWire(g1.id, g1.outputs[0].id, g2.id, g2.inputs[0].id)
        }
      },
      { g1: gate1, g2: gate2 }
    )

    // Verify initial state
    await expectGateCount(page, 2)
    await expectWireCount(page, 1)

    // Delete gate1 via store
    if (gate1?.id) {
      await removeGateViaStore(page, gate1.id)
    }

    // Verify gate and wire were removed
    await expectGateCount(page, 1)
    await expectWireCount(page, 0)
  })
})
