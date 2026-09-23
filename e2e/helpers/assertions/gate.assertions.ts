/**
 * Gate-Specific Assertions
 *
 * Assertions for verifying gate outputs, especially
 * for NAND gate circuits.
 */

import { expect, Page } from '@playwright/test'

/**
 * Assert a specific gate's output value
 */
export async function expectGateOutput(
  page: Page,
  gateIndex: number,
  expectedValue: number,
  outputIndex = 0
): Promise<void> {
  const value = await page.evaluate(
    ({ gateIndex, outputIndex }) => {
      return window.__CIRCUIT_STORE__?.gates[gateIndex]?.outputs[outputIndex]?.value
    },
    { gateIndex, outputIndex }
  )
  expect(value).toBe(expectedValue)
}
