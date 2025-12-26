/**
 * Render Sanity Check Tests (UI-driven)
 *
 * These tests verify that common operations don't cause excessive re-renders.
 * Run these tests to catch render performance regressions.
 *
 * Tag for filtering: @render @performance @ui
 */

import { test, expect } from '../fixtures'
import { DEFAULT_POSITIONS } from '../config/constants'
import { addGateViaStore, selectGate, addWireViaStore } from '../helpers/actions'
import { ensureGates, ensureWires } from '../helpers/waits'
import {
  resetRenderStats,
  getComponentRenderCounts,
  waitForSceneStable,
} from '../helpers/waits/render.waits'

/**
 * Render budgets per operation.
 * These values are based on observed behavior plus a small margin.
 * If an operation exceeds these counts, it indicates a performance regression.
 *
 * Current observed baseline (as of optimization):
 * - GroundPlane: Static component that renders only once (budget=1)
 * - PlacementPreview: Re-renders when placement state changes
 * - WirePreview: Re-renders when wiring state changes
 * - CanvasArea: Re-renders on gate/wire changes
 */
const RENDER_BUDGETS = {
  addGate: {
    CanvasArea: 2,
    GroundPlane: 1,
  },
  selectGate: {
    CanvasArea: 2,
    GroundPlane: 1,
  },
  addWire: {
    CanvasArea: 2,
    GroundPlane: 1,
  },
  toggleInput: {
    CanvasArea: 2,
    GroundPlane: 1,
  },
}

test.describe('Render Sanity Check (UI) @render @performance @ui', () => {
  test.beforeEach(async ({ page }) => {
    // Wait for initial scene to be ready and stable
    await page.waitForFunction(() => window.__SCENE_READY__ === true, { timeout: 10000 })
    await waitForSceneStable(page)
  })

  test('addGate stays within render budget', async ({ page }) => {
    // Reset stats before the operation
    await resetRenderStats(page)

    // Perform the operation
    await addGateViaStore(page, 'NAND', DEFAULT_POSITIONS.center)
    await ensureGates(page, 1)
    await waitForSceneStable(page)

    // Check render counts
    const counts = await getComponentRenderCounts(page)

    for (const [component, budget] of Object.entries(RENDER_BUDGETS.addGate)) {
      const actual = counts[component] ?? 0
      expect(
        actual,
        `${component} rendered ${actual} times for addGate (budget: ${budget})`
      ).toBeLessThanOrEqual(budget)
    }
  })

  test('selectGate stays within render budget', async ({ page }) => {
    // Setup: add a gate first
    const gate = await addGateViaStore(page, 'NAND', DEFAULT_POSITIONS.center)
    await ensureGates(page, 1)
    await waitForSceneStable(page)

    // Reset stats before the operation
    await resetRenderStats(page)

    // Perform the operation
    await selectGate(page, gate!.id)
    await waitForSceneStable(page)

    // Check render counts
    const counts = await getComponentRenderCounts(page)

    for (const [component, budget] of Object.entries(RENDER_BUDGETS.selectGate)) {
      const actual = counts[component] ?? 0
      expect(
        actual,
        `${component} rendered ${actual} times for selectGate (budget: ${budget})`
      ).toBeLessThanOrEqual(budget)
    }
  })

  test('addWire stays within render budget', async ({ page }) => {
    // Setup: add two gates
    const gate1 = await addGateViaStore(page, 'NAND', DEFAULT_POSITIONS.left)
    const gate2 = await addGateViaStore(page, 'NAND', DEFAULT_POSITIONS.right)
    await ensureGates(page, 2)
    await waitForSceneStable(page)

    // Reset stats before the operation
    await resetRenderStats(page)

    // Perform the operation - wire output of gate1 to input of gate2
    await addWireViaStore(page, {
      fromGateId: gate1!.id,
      fromPinId: gate1!.outputs[0].id,
      toGateId: gate2!.id,
      toPinId: gate2!.inputs[0].id,
    })
    await ensureWires(page, 1)
    await waitForSceneStable(page)

    // Check render counts
    const counts = await getComponentRenderCounts(page)

    for (const [component, budget] of Object.entries(RENDER_BUDGETS.addWire)) {
      const actual = counts[component] ?? 0
      expect(
        actual,
        `${component} rendered ${actual} times for addWire (budget: ${budget})`
      ).toBeLessThanOrEqual(budget)
    }
  })

  test('toggleInput stays within render budget', async ({ page }) => {
    // Setup: add a gate
    const gate = await addGateViaStore(page, 'NAND', DEFAULT_POSITIONS.center)
    await ensureGates(page, 1)
    await waitForSceneStable(page)

    // Reset stats before the operation
    await resetRenderStats(page)

    // Perform the operation
    await page.evaluate(
      ({ gateId, pinId }) => {
        window.__CIRCUIT_ACTIONS__?.setInputValue(gateId, pinId, true)
      },
      { gateId: gate!.id, pinId: gate!.inputs[0].id }
    )
    await waitForSceneStable(page)

    // Check render counts
    const counts = await getComponentRenderCounts(page)

    for (const [component, budget] of Object.entries(RENDER_BUDGETS.toggleInput)) {
      const actual = counts[component] ?? 0
      expect(
        actual,
        `${component} rendered ${actual} times for toggleInput (budget: ${budget})`
      ).toBeLessThanOrEqual(budget)
    }
  })

  test('logs current render stats (for tuning budgets)', async ({ page }) => {
    // This test is for development - it logs render counts to help tune budgets
    // It always passes but provides useful diagnostic output

    console.log('\n--- Render Budget Diagnostics ---\n')

    // Test addGate
    await resetRenderStats(page)
    await addGateViaStore(page, 'NAND', DEFAULT_POSITIONS.center)
    await ensureGates(page, 1)
    await waitForSceneStable(page)
    let counts = await getComponentRenderCounts(page)
    console.log('addGate renders:', counts)

    // Test selectGate (deselect then reselect)
    await resetRenderStats(page)
    await selectGate(page, null)
    await waitForSceneStable(page)
    counts = await getComponentRenderCounts(page)
    console.log('deselectGate renders:', counts)

    // Test addWire
    const gate1 = await addGateViaStore(page, 'NAND', DEFAULT_POSITIONS.left)
    const gate2 = await addGateViaStore(page, 'NAND', DEFAULT_POSITIONS.right)
    await ensureGates(page, 3)
    await waitForSceneStable(page)

    await resetRenderStats(page)
    await addWireViaStore(page, {
      fromGateId: gate1!.id,
      fromPinId: gate1!.outputs[0].id,
      toGateId: gate2!.id,
      toPinId: gate2!.inputs[0].id,
    })
    await ensureWires(page, 1)
    await waitForSceneStable(page)
    counts = await getComponentRenderCounts(page)
    console.log('addWire renders:', counts)

    console.log('\n--- End Diagnostics ---\n')
  })
})
