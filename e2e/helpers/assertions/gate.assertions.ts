/**
 * Gate-Specific Assertions
 *
 * Assertions for verifying gate outputs, especially
 * for NAND gate circuits.
 */

import { expect, Page } from '@playwright/test'

export interface NandOutputsExpectation {
  gate1Output: number
  gate2Output: number
  gate3Output: number
  gate3Inputs: [number, number]
}

/**
 * Assert NAND gate outputs match expected values for a 3-gate circuit
 */
export async function expectNandOutputs(
  page: Page,
  opts: NandOutputsExpectation
): Promise<void> {
  const state = await page.evaluate(() => {
    const gates = window.__CIRCUIT_STORE__?.gates ?? []
    return {
      g1Out: gates[0]?.outputs[0]?.value,
      g2Out: gates[1]?.outputs[0]?.value,
      g3In0: gates[2]?.inputs[0]?.value,
      g3In1: gates[2]?.inputs[1]?.value,
      g3Out: gates[2]?.outputs[0]?.value,
    }
  })

  expect(state.g1Out).toBe(opts.gate1Output)
  expect(state.g2Out).toBe(opts.gate2Output)
  expect(state.g3In0).toBe(opts.gate3Inputs[0])
  expect(state.g3In1).toBe(opts.gate3Inputs[1])
  expect(state.g3Out).toBe(opts.gate3Output)
}

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

/**
 * Assert a specific gate's input value
 */
export async function expectGateInput(
  page: Page,
  gateIndex: number,
  inputIndex: number,
  expectedValue: number
): Promise<void> {
  const value = await page.evaluate(
    ({ gateIndex, inputIndex }) => {
      return window.__CIRCUIT_STORE__?.gates[gateIndex]?.inputs[inputIndex]?.value
    },
    { gateIndex, inputIndex }
  )
  expect(value).toBe(expectedValue)
}
