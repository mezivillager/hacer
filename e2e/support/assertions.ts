import { expect, Page } from '@playwright/test'

export async function expectGateCount(page: Page, count: number) {
  await expect(page.locator('text=/Gates: \\d+/')).toContainText(`${count}`)
}

export async function expectWireCount(page: Page, count: number) {
  await expect(page.locator('text=/Wires: \\d+/')).toContainText(`${count}`)
}

export async function getStoreState(page: Page) {
  return page.evaluate(() => ({
    gates: window.__CIRCUIT_STORE__?.gates ?? [],
    wires: window.__CIRCUIT_STORE__?.wires ?? [],
    simulationRunning: window.__CIRCUIT_STORE__?.simulationRunning ?? false,
  }))
}

export async function expectNandOutputs(page: Page, opts: {
  gate1Output: boolean
  gate2Output: boolean
  gate3Output: boolean
  gate3Inputs: [boolean, boolean]
}) {
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
