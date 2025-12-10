/**
 * Circuit Building (store-driven)
 */

import { test, expect } from '../fixtures'
import { UI_SELECTORS } from '../selectors'
import {
  addGateViaStore,
  selectGate,
  removeGateViaStore,
} from '../helpers/actions'
import {
  expectGateCount,
  expectWireCount,
  expectStoreGateCount,
  expectStoreWireCount,
} from '../helpers/assertions'
import { circuitBuildScenario } from '../scenarios'

const { placements } = circuitBuildScenario

// Tag for filtering: @store
test.describe('Circuit Building (store) @store', () => {
  test('can add a NAND gate to the canvas', async ({ page }) => {
    await addGateViaStore(page, placements[0].position)
    await expectGateCount(page, 1)
    await expectStoreGateCount(page, 1)
  })

  test('can wire two gates together', async ({ page }) => {
    const gate1 = await addGateViaStore(page, placements[0].position)
    const gate2 = await addGateViaStore(page, placements[1].position)
    await expectGateCount(page, 2)

    await page.evaluate(({ g1, g2 }) => {
      if (g1 && g2) {
        window.__CIRCUIT_ACTIONS__?.addWire(g1.id, g1.outputs[0].id, g2.id, g2.inputs[0].id)
      }
    }, { g1: gate1, g2: gate2 })

    await expectWireCount(page, 1)
    await expectStoreWireCount(page, 1)
  })

  test('can delete a gate', async ({ page }) => {
    const gate = await addGateViaStore(page, placements[0].position)
    await expectGateCount(page, 1)

    if (gate?.id) {
      await selectGate(page, gate.id)
    }

    const deleteButton = page.locator(UI_SELECTORS.buttons.deleteSelected)
    await expect(deleteButton).toBeEnabled()
    await deleteButton.click()

    await expectGateCount(page, 0)
    await expectStoreGateCount(page, 0)
  })

  test('can clear all gates', async ({ page }) => {
    await addGateViaStore(page, placements[0].position)
    await addGateViaStore(page, placements[1].position)
    await expectGateCount(page, 2)

    const clearButton = page.locator(UI_SELECTORS.buttons.clearAll)
    await expect(clearButton).toBeEnabled()
    await clearButton.click()

    await expectGateCount(page, 0)
    await expectStoreGateCount(page, 0)
    await expectStoreWireCount(page, 0)
  })

  test('wires are removed when gate is deleted', async ({ page }) => {
    const gate1 = await addGateViaStore(page, placements[0].position)
    const gate2 = await addGateViaStore(page, placements[1].position)

    await page.evaluate(
      ({ g1, g2 }) => {
        if (g1 && g2) {
          window.__CIRCUIT_ACTIONS__?.addWire(g1.id, g1.outputs[0].id, g2.id, g2.inputs[0].id)
        }
      },
      { g1: gate1, g2: gate2 }
    )

    await expectGateCount(page, 2)
    await expectWireCount(page, 1)

    if (gate1?.id) {
      await removeGateViaStore(page, gate1.id)
    }

    await expectGateCount(page, 1)
    await expectWireCount(page, 0)
  })
})
