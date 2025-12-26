/**
 * Elementary Gates UI Tests
 *
 * Tests for adding and using AND, OR, NOT, and NAND gates via UI
 */

import { test, expect } from '../fixtures'
import { DEFAULT_POSITIONS } from '../config/constants'
import {
  addGateViaUI,
  getGateIds,
  getGateType,
  connectWiresViaUI,
  clearAllViaUI,
} from '../helpers/actions'
import { ensureGates } from '../helpers/waits'
import { expectGateCount, expectWireCount } from '../helpers/assertions'
import type { GateType } from '../helpers/actions/gate.actions'

const gateTypes: GateType[] = ['NAND', 'AND', 'OR', 'NOT']

// Tag for filtering: @ui @elementary-gates
test.describe('Elementary Gates (UI) @ui @elementary-gates', () => {
  test.beforeEach(async ({ page }) => {
    // Clear any existing gates before each test
    await clearAllViaUI(page)
  })

  for (const gateType of gateTypes) {
    test(`can add ${gateType} gate via UI`, async ({ page }) => {
      await addGateViaUI(page, {
        type: gateType,
        position: DEFAULT_POSITIONS.center,
      })

      await ensureGates(page, 1)
      await expectGateCount(page, 1)

      // Verify the gate type is correct
      const gateIds = await getGateIds(page)
      const actualType = await getGateType(page, gateIds[0])
      expect(actualType).toBe(gateType)
    })
  }

  test('can add multiple different gate types', async ({ page }) => {
    const positions = [
      DEFAULT_POSITIONS.left,
      DEFAULT_POSITIONS.center,
      DEFAULT_POSITIONS.right,
    ]

    for (let i = 0; i < gateTypes.length && i < positions.length; i++) {
      await addGateViaUI(page, {
        type: gateTypes[i],
        position: positions[i],
      })
    }

    await ensureGates(page, Math.min(gateTypes.length, positions.length))
    await expectGateCount(page, Math.min(gateTypes.length, positions.length))

    // Verify all gate types are present
    const gateIds = await getGateIds(page)
    const types = await Promise.all(
      gateIds.map((id) => getGateType(page, id))
    )

    for (let i = 0; i < Math.min(gateTypes.length, positions.length); i++) {
      expect(types[i]).toBe(gateTypes[i])
    }
  })

  test('gate selector shows active state when placing', async ({ page }) => {
    // Click NAND gate icon
    await page.click('.gate-icon:has-text("NAND")')

    // Verify it's active
    const nandIcon = page.locator('.gate-icon:has-text("NAND")')
    await expect(nandIcon).toHaveClass(/active/)

    // Click on canvas to place
    await page.click('canvas')

    // Verify active state is cleared
    await expect(nandIcon).not.toHaveClass(/active/)
  })

  test('can cancel gate placement', async ({ page }) => {
    // Click AND gate icon
    await page.click('.gate-icon:has-text("AND")')

    // Verify it's active
    const andIcon = page.locator('.gate-icon:has-text("AND")')
    await expect(andIcon).toHaveClass(/active/)

    // Click the same icon again to cancel
    await page.click('.gate-icon:has-text("AND")')

    // Verify active state is cleared
    await expect(andIcon).not.toHaveClass(/active/)

    // Verify no gate was placed
    await expectGateCount(page, 0)
  })

  test('can wire gates of different types', async ({ page }) => {
    // Place NAND and AND gates
    await addGateViaUI(page, {
      type: 'NAND',
      position: DEFAULT_POSITIONS.left,
    })

    await addGateViaUI(page, {
      type: 'AND',
      position: DEFAULT_POSITIONS.right,
      rotate: { direction: 'left', times: 2 }, // Rotate to face left
    })

    await ensureGates(page, 2)
    const gateIds = await getGateIds(page)

    // Wire NAND output to AND input
    await connectWiresViaUI(page, [
      {
        fromGate: 0,
        fromPin: 'out-0',
        toGate: 1,
        toPin: 'in-0',
      },
    ], gateIds)

    await expectWireCount(page, 1)
  })

  test('NOT gate has single input pin', async ({ page }) => {
    await addGateViaUI(page, {
      type: 'NOT',
      position: DEFAULT_POSITIONS.center,
    })

    await ensureGates(page, 1)
    const gateIds = await getGateIds(page)
    const gateId = gateIds[0]

    // Verify NOT gate has 1 input and 1 output
    const gateInfo = await page.evaluate((id) => {
      const gate = window.__CIRCUIT_STORE__?.gates.find((g) => g.id === id)
      return {
        inputCount: gate?.inputs.length ?? 0,
        outputCount: gate?.outputs.length ?? 0,
      }
    }, gateId)

    expect(gateInfo.inputCount).toBe(1)
    expect(gateInfo.outputCount).toBe(1)
  })

  test('two-input gates have two input pins', async ({ page }) => {
    const twoInputGates: GateType[] = ['NAND', 'AND', 'OR']

    for (const gateType of twoInputGates) {
      await clearAllViaUI(page)

      await addGateViaUI(page, {
        type: gateType,
        position: DEFAULT_POSITIONS.center,
      })

      await ensureGates(page, 1)
      const gateIds = await getGateIds(page)
      const gateId = gateIds[0]

      // Verify gate has 2 inputs and 1 output
      const gateInfo = await page.evaluate((id) => {
        const gate = window.__CIRCUIT_STORE__?.gates.find((g) => g.id === id)
        return {
          inputCount: gate?.inputs.length ?? 0,
          outputCount: gate?.outputs.length ?? 0,
        }
      }, gateId)

      expect(gateInfo.inputCount).toBe(2)
      expect(gateInfo.outputCount).toBe(1)
    }
  })
})
