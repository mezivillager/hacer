/**
 * Simulation Actions
 *
 * Actions for controlling simulation state and
 * setting input values.
 */

import { Page } from '@playwright/test'
import { TIMEOUTS } from '../../config/constants'

/**
 * Start simulation.
 *
 * Phase A note: the original implementation clicked the Sidebar's
 * "Run Simulation" button. The Sidebar is deleted; this function now
 * dispatches via the store global so @store specs continue to work.
 * Phase E (chunk 9) will provide a separate UI-clicking helper for
 * the new CompactToolbar sim toggle.
 */
export async function startSimulationViaUI(page: Page): Promise<void> {
  await page.evaluate(() => {
    if (!window.__CIRCUIT_STORE__?.simulationRunning) {
      window.__CIRCUIT_ACTIONS__?.toggleSimulation()
    }
  })
  await page.waitForFunction(() => window.__CIRCUIT_STORE__?.simulationRunning === true)
}

/**
 * Pause simulation. See note on startSimulationViaUI.
 */
export async function pauseSimulationViaUI(page: Page): Promise<void> {
  await page.evaluate(() => {
    if (window.__CIRCUIT_STORE__?.simulationRunning) {
      window.__CIRCUIT_ACTIONS__?.toggleSimulation()
    }
  })
  await page.waitForFunction(() => window.__CIRCUIT_STORE__?.simulationRunning === false)
}

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
 * Run simulation tick with a small delay for signal propagation
 */
export async function runSimulationTickWithDelay(
  page: Page,
  delay = TIMEOUTS.simulation
): Promise<void> {
  await page.waitForTimeout(delay)
  await runSimulationTick(page)
}

/**
 * Set an input pin value via store
 */
export async function setInputValue(
  page: Page,
  gateId: string,
  pinId: string,
  value: number
): Promise<void> {
  await page.evaluate(
    ({ gateId, pinId, value }) => {
      window.__CIRCUIT_ACTIONS__?.setInputValue(gateId, pinId, value)
    },
    { gateId, pinId, value }
  )
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

/**
 * Set multiple input values via store using gate indices.
 *
 * Only meaningful for a pin that already has an incoming wire — the value is
 * overwritten by that wire on the next tick — or while the simulation is
 * stopped. For driving a circuit, use {@link driveInputsViaStore}. See #309.
 */
export async function setInputsViaStore(
  page: Page,
  toggles: Array<{ gate: number; pin: string; value: number }>,
  gateIds: string[]
): Promise<void> {
  await page.evaluate(
    ({ toggles, gateIds }) => {
      toggles.forEach((t) => {
        const gateId = gateIds[t.gate]
        window.__CIRCUIT_ACTIONS__?.setInputValue(gateId, `${gateId}-${t.pin}`, t.value)
      })
    },
    { toggles, gateIds }
  )
}

/**
 * Clear the entire circuit via store
 */
export async function clearCircuitViaStore(page: Page): Promise<void> {
  await page.evaluate(() => window.__CIRCUIT_ACTIONS__?.clearCircuit())
}
