/**
 * Simulation Actions
 *
 * Actions for controlling simulation state and
 * setting input values.
 */

import { Page } from '@playwright/test'
import { UI_SELECTORS } from '../../selectors'
import { TIMEOUTS } from '../../config/constants'

/**
 * Start simulation via UI button
 */
export async function startSimulationViaUI(page: Page): Promise<void> {
  await page.click(UI_SELECTORS.buttons.runSimulation)
  await page.locator(UI_SELECTORS.status.running).waitFor()
}

/**
 * Pause simulation via UI button
 */
export async function pauseSimulationViaUI(page: Page): Promise<void> {
  await page.click(UI_SELECTORS.buttons.pauseSimulation)
  await page.locator(UI_SELECTORS.status.paused).waitFor()
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
  value: boolean
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
  toggles: Array<{ gate: number; pin: string; value: boolean }>,
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
