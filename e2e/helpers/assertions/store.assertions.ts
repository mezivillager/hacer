/**
 * Store Assertions
 *
 * Assertions and getters for verifying circuit store state.
 */

import { expect, Page } from '@playwright/test'

export interface StoreState {
  gates: Array<{
    id: string
    type: string
    inputs: Array<{ id: string; value: boolean }>
    outputs: Array<{ id: string; value: boolean }>
  }>
  wires: Array<{
    id: string
    from: { type: string; entityId: string; pinId?: string }
    to: { type: string; entityId: string; pinId?: string }
  }>
  simulationRunning: boolean
}

/**
 * Get the current circuit store state
 */
export async function getStoreState(page: Page): Promise<StoreState> {
  return page.evaluate(() => ({
    gates: window.__CIRCUIT_STORE__?.gates ?? [],
    wires: window.__CIRCUIT_STORE__?.wires ?? [],
    simulationRunning: window.__CIRCUIT_STORE__?.simulationRunning ?? false,
  }))
}

/**
 * Assert the store has the expected number of gates
 */
export async function expectStoreGateCount(page: Page, count: number): Promise<void> {
  const gateCount = await page.evaluate(() => window.__CIRCUIT_STORE__?.gates.length ?? 0)
  expect(gateCount).toBe(count)
}

/**
 * Assert the store has the expected number of wires
 */
export async function expectStoreWireCount(page: Page, count: number): Promise<void> {
  const wireCount = await page.evaluate(() => window.__CIRCUIT_STORE__?.wires.length ?? 0)
  expect(wireCount).toBe(count)
}

/**
 * Assert simulation is in expected state
 */
export async function expectSimulationState(page: Page, running: boolean): Promise<void> {
  const isRunning = await page.evaluate(() => window.__CIRCUIT_STORE__?.simulationRunning ?? false)
  expect(isRunning).toBe(running)
}

/**
 * Get a gate's output value by index
 */
export async function getGateOutputValue(
  page: Page,
  gateIndex: number,
  outputIndex = 0
): Promise<boolean | undefined> {
  return page.evaluate(
    ({ gateIndex, outputIndex }) => {
      return window.__CIRCUIT_STORE__?.gates[gateIndex]?.outputs[outputIndex]?.value
    },
    { gateIndex, outputIndex }
  )
}

/**
 * Get a gate's input value by index
 */
export async function getGateInputValue(
  page: Page,
  gateIndex: number,
  inputIndex: number
): Promise<boolean | undefined> {
  return page.evaluate(
    ({ gateIndex, inputIndex }) => {
      return window.__CIRCUIT_STORE__?.gates[gateIndex]?.inputs[inputIndex]?.value
    },
    { gateIndex, inputIndex }
  )
}
