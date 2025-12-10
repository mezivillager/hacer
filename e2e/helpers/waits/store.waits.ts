/**
 * Store Wait Helpers
 *
 * Wait utilities for circuit store state changes.
 */

import { Page } from '@playwright/test'
import { TIMEOUTS } from '../../config/constants'

/**
 * Wait until the store has at least the expected number of gates
 */
export async function ensureGates(page: Page, count: number, timeout = TIMEOUTS.store): Promise<void> {
  await page.waitForFunction(
    (expected) => {
      const gates = window.__CIRCUIT_STORE__?.gates ?? []
      return gates.length >= expected
    },
    count,
    { timeout }
  )
}

/**
 * Wait until the store has at least the expected number of wires
 */
export async function ensureWires(page: Page, count: number, timeout = TIMEOUTS.store): Promise<void> {
  await page.waitForFunction(
    (expected) => {
      const wires = window.__CIRCUIT_STORE__?.wires ?? []
      return wires.length >= expected
    },
    count,
    { timeout }
  )
}

/**
 * Wait until simulation is in the expected running state
 */
export async function ensureSimulationState(
  page: Page,
  running: boolean,
  timeout = TIMEOUTS.store
): Promise<void> {
  await page.waitForFunction(
    (expectedRunning) => {
      return window.__CIRCUIT_STORE__?.simulationRunning === expectedRunning
    },
    running,
    { timeout }
  )
}
