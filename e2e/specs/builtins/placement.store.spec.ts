/**
 * Builtin Chip Placement Store Tests
 *
 * Verifies that the new Project 1 builtin chips introduced by the
 * 2026-05-24 builtin-chip-placement-standardization plan can be
 * selected from the toolbar gates popover and end up in the circuit
 * store with the correct `chipName`.
 *
 * The five legacy chips (Nand/And/Or/Not/Xor) are covered by the
 * existing `gate-placement.{store,ui}.spec.ts` suites; this spec
 * exclusively exercises the 11 new chips so each one has at least
 * one explicit end-to-end smoke against the registry-driven toolbar.
 *
 * Why we do not click the 3D canvas: Playwright synthetic events do
 * not reliably trigger React Three Fiber raycasting, so we drive the
 * UI to enter placement mode and then call `placeGate` on the store
 * directly (matches the pattern in `helpers/actions/gate.actions.ts`
 * → `addGateViaUI`).
 *
 * Tag: @store @builtins
 */

import { storeTest as test, storeExpect as expect } from '../../fixtures'
import { DEFAULT_POSITIONS, TIMEOUTS } from '../../config/constants'
import { UI_SELECTORS } from '../../selectors'

/**
 * New Project 1 builtin chip names introduced by the
 * 2026-05-24-builtin-chip-placement-standardization plan.
 * Excludes Nand/And/Or/Not/Xor (covered by gate-placement specs).
 */
const NEW_CHIPS = [
  'Mux',
  'DMux',
  'Not16',
  'And16',
  'Or16',
  'Mux16',
  'Or8Way',
  'Mux4Way16',
  'Mux8Way16',
  'DMux4Way',
  'DMux8Way',
] as const

test.describe('Builtin Chip Placement @store @builtins', () => {
  for (const chipName of NEW_CHIPS) {
    test(`places ${chipName} via toolbar`, async ({ page }) => {
      // Open the Gates popover.
      await page.click(UI_SELECTORS.toolbar.gatesTrigger)
      await page.waitForSelector(UI_SELECTORS.gatesPopover.root, {
        state: 'visible',
      })

      // Click the chip button. We use a raw selector here because the
      // typed `UI_SELECTORS.gatesPopover.getGate` helper accepts only
      // the legacy 5-chip `GateType` union; the new chips intentionally
      // live outside that union.
      await page.click(`[data-testid="gate-button-${chipName}"]`)
      await page.waitForSelector(UI_SELECTORS.gatesPopover.root, {
        state: 'hidden',
      })

      // Confirm placement mode is active for this chip.
      await page.waitForFunction(
        (expected: string) =>
          window.__CIRCUIT_STORE__?.placementMode === expected,
        chipName,
        { timeout: TIMEOUTS.store }
      )

      // Place the gate via store action (see file header for rationale).
      await page.evaluate((position) => {
        window.__CIRCUIT_ACTIONS__?.placeGate(position)
      }, DEFAULT_POSITIONS.center)

      // Placement mode clears on success.
      await page.waitForFunction(
        () => window.__CIRCUIT_STORE__?.placementMode === null,
        { timeout: TIMEOUTS.store }
      )

      // Assert: at least one gate with the expected chipName is in the store.
      const placedChipNames = await page.evaluate(
        () => window.__CIRCUIT_STORE__?.gates.map((g) => g.chipName) ?? []
      )
      expect(placedChipNames).toContain(chipName)
    })
  }
})
