/**
 * UI Assertions
 *
 * Assertions for verifying UI state like gate counts,
 * wire counts, and simulation status display.
 */

import { expect, Page } from '@playwright/test'
import { UI_SELECTORS } from '../../selectors'

/**
 * Assert the UI displays the expected gate count
 */
export async function expectGateCount(page: Page, count: number): Promise<void> {
  await expect(page.locator(UI_SELECTORS.status.gateCount)).toContainText(`${count}`)
}

/**
 * Assert the UI displays the expected wire count
 */
export async function expectWireCount(page: Page, count: number): Promise<void> {
  await expect(page.locator(UI_SELECTORS.status.wireCount)).toContainText(`${count}`)
}

/**
 * Assert the simulation status is displayed as running
 */
export async function expectSimulationRunning(page: Page): Promise<void> {
  await expect(page.locator(UI_SELECTORS.status.running)).toBeVisible()
}

/**
 * Assert the simulation status is displayed as paused
 */
export async function expectSimulationPaused(page: Page): Promise<void> {
  await expect(page.locator(UI_SELECTORS.status.paused)).toBeVisible()
}

/**
 * Assert a button is visible
 */
export async function expectButtonVisible(
  page: Page,
  buttonKey: keyof typeof UI_SELECTORS.buttons
): Promise<void> {
  await expect(page.locator(UI_SELECTORS.buttons[buttonKey])).toBeVisible()
}

/**
 * Assert a button is enabled
 */
export async function expectButtonEnabled(
  page: Page,
  buttonKey: keyof typeof UI_SELECTORS.buttons
): Promise<void> {
  await expect(page.locator(UI_SELECTORS.buttons[buttonKey])).toBeEnabled()
}
