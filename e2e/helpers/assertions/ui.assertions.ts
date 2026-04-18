/**
 * UI / Store Assertions
 *
 * Assertions for verifying state like gate counts, wire counts, and
 * simulation status.
 *
 * Phase A note: gate/wire-count and simulation-status assertions used
 * to read DOM text from the (now deleted) Sidebar Circuit Info section.
 * They now read directly from `window.__CIRCUIT_STORE__` since these
 * are predominantly used by @store specs where the store is the source
 * of truth. UI-specific assertions (expectButtonVisible / Enabled) are
 * used only by @ui specs and stay DOM-driven \u2014 they will be rewritten
 * with the new selectors in Phase E (chunk 9).
 */

import { expect, Page } from '@playwright/test'

async function readStoreCount(page: Page, slot: 'gates' | 'wires'): Promise<number> {
  return page.evaluate((s) => {
    const store = window.__CIRCUIT_STORE__
    if (!store) throw new Error('window.__CIRCUIT_STORE__ not initialized')
    return store[s].length
  }, slot)
}

async function readSimulationRunning(page: Page): Promise<boolean> {
  return page.evaluate(() => {
    const store = window.__CIRCUIT_STORE__
    if (!store) throw new Error('window.__CIRCUIT_STORE__ not initialized')
    return Boolean(store.simulationRunning)
  })
}

/**
 * Assert the store reports the expected gate count.
 */
export async function expectGateCount(page: Page, count: number): Promise<void> {
  await expect.poll(() => readStoreCount(page, 'gates'), { timeout: 5000 }).toBe(count)
}

/**
 * Assert the store reports the expected wire count.
 */
export async function expectWireCount(page: Page, count: number): Promise<void> {
  await expect.poll(() => readStoreCount(page, 'wires'), { timeout: 5000 }).toBe(count)
}

/**
 * Assert the store reports simulation as running.
 */
export async function expectSimulationRunning(page: Page): Promise<void> {
  await expect.poll(() => readSimulationRunning(page), { timeout: 5000 }).toBe(true)
}

/**
 * Assert the store reports simulation as paused.
 */
export async function expectSimulationPaused(page: Page): Promise<void> {
  await expect.poll(() => readSimulationRunning(page), { timeout: 5000 }).toBe(false)
}

// expectButtonVisible / expectButtonEnabled removed in Phase E \u2014 the
// legacy UI_SELECTORS.buttons map no longer exists, and no callers
// reference them. New @ui specs target buttons directly via their
// data-testid selectors from UI_SELECTORS.toolbar.
