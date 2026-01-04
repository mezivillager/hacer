/**
 * Scene Management Helpers
 *
 * Utilities for managing scene state between tests,
 * enabling scene reuse for faster test execution.
 */

import { Page } from '@playwright/test'
import { TIMEOUTS } from '../../config/constants'

/**
 * Clear the circuit scene without page reload.
 * Much faster than reloading the page for each test.
 */
export async function clearScene(page: Page): Promise<void> {
  await page.evaluate(() => {
    window.__CIRCUIT_ACTIONS__?.clearCircuit()
  })

  // Wait for state to settle
  await page.waitForFunction(
    () => {
      const store = window.__CIRCUIT_STORE__
      return store?.gates.length === 0 && store?.wires.length === 0
    },
    { timeout: TIMEOUTS.store }
  )
}

/**
 * Validate that the scene is in a clean state.
 * Useful for asserting scene reset worked correctly.
 */
export async function validateSceneClean(page: Page): Promise<boolean> {
  return page.evaluate(() => {
    const store = window.__CIRCUIT_STORE__
    return (
      store?.gates.length === 0 &&
      store?.wires.length === 0 &&
      store?.selectedGateId === null
    )
  })
}

/**
 * Wait for the store to be available.
 */
export async function waitForStore(
  page: Page,
  timeout = TIMEOUTS.store
): Promise<void> {
  await page.waitForFunction(() => window.__CIRCUIT_STORE__ !== undefined, {
    timeout,
  })
}

