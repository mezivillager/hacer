/**
 * Simulation Actions
 *
 * Actions for controlling simulation state and
 * setting input values.
 */

import { Page } from '@playwright/test'

/**
 * Toggle simulation via store
 */
export async function toggleSimulationViaStore(page: Page): Promise<void> {
  await page.evaluate(() => window.__CIRCUIT_ACTIONS__?.toggleSimulation())
}

/**
 * Run a single simulation tick via store
 */
export async function runSimulationTick(page: Page): Promise<void> {
  await page.evaluate(() => window.__CIRCUIT_ACTIONS__?.simulationTick())
}

/**
 * Drive gate input pins from freshly created input nodes, one node per pin,
 * wired to the pin and set to the requested value.
 *
 * Prefer this over {@link setInputsViaStore} for any pin that has no incoming
 * wire: `evaluateCircuit` clears an input pin that no wire drives (B-008), so a
 * value written straight onto an unconnected pin is erased by the next tick.
 * Each call adds one input node and one wire per entry — assert wire counts
 * accordingly.
 */
export async function driveInputsViaStore(
  page: Page,
  inputs: Array<{ gate: number; pin: string; value: number }>,
  gateIds: string[]
): Promise<void> {
  await page.evaluate(
    ({ inputs, gateIds }) => {
      inputs.forEach((input, i) => {
        const gateId = gateIds[input.gate]
        const node = window.__CIRCUIT_ACTIONS__?.addInputNode(`drv-${i}`, {
          x: -8,
          y: i * 2,
          z: 0,
        })
        if (!node) return
        window.__CIRCUIT_ACTIONS__?.addWire(
          { type: 'input', entityId: node.id },
          { type: 'gate', entityId: gateId, pinId: `${gateId}-${input.pin}` },
          []
        )
        // addInputNode starts a node at 1, so always write the value explicitly.
        window.__CIRCUIT_ACTIONS__?.updateInputNodeValue(node.id, input.value)
      })
    },
    { inputs, gateIds }
  )
}
