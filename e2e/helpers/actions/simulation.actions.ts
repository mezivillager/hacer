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
 * Set multiple input values via store using gate indices
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
