/**
 * Gate Actions
 *
 * Actions for adding, selecting, and removing gates
 * via both store-driven and UI-driven approaches.
 */

import { Page } from '@playwright/test'
import { UI_SELECTORS } from '../../selectors'
import type { Position3D } from '../../config/constants'
import { clickWorldPosition, rotateAtPosition } from './canvas.actions'

export interface GateResult {
  id: string
  inputs: Array<{ id: string }>
  outputs: Array<{ id: string }>
}

/**
 * Add a NAND gate via store (fast, reliable for setup)
 */
export async function addGateViaStore(
  page: Page,
  position: Position3D
): Promise<GateResult | null> {
  return page.evaluate(
    ({ position }) => {
      return window.__CIRCUIT_ACTIONS__?.addGate('NAND', position) ?? null
    },
    { position }
  )
}

/**
 * Add multiple gates via store and return their IDs
 */
export async function addGatesViaStore(
  page: Page,
  placements: Array<{ position: Position3D }>
): Promise<string[]> {
  return page.evaluate(
    (placements) => {
      const ids: string[] = []
      placements.forEach((p) => {
        const res = window.__CIRCUIT_ACTIONS__?.addGate('NAND', p.position)
        if (res?.id) ids.push(res.id)
      })
      return ids
    },
    placements
  )
}

export interface GatePlacementOptions {
  position: Position3D
  rotate?: { direction: 'left' | 'right'; times: number }
}

/**
 * Add a NAND gate via UI interactions (click button, place on canvas)
 */
export async function addGateViaUI(page: Page, options: GatePlacementOptions): Promise<void> {
  await page.click(UI_SELECTORS.buttons.addNandGate)
  await page.getByRole('button', { name: 'Cancel Placement' }).waitFor()
  await clickWorldPosition(page, options.position)

  if (options.rotate) {
    await rotateAtPosition(page, options.position, options.rotate.direction, options.rotate.times)
  }
}

/**
 * Select a gate via store
 */
export async function selectGate(page: Page, gateId: string): Promise<void> {
  await page.evaluate(
    ({ gateId }) => {
      window.__CIRCUIT_ACTIONS__?.selectGate(gateId)
    },
    { gateId }
  )
}

/**
 * Remove a gate via store
 */
export async function removeGateViaStore(page: Page, gateId: string): Promise<void> {
  await page.evaluate(
    ({ gateId }) => {
      window.__CIRCUIT_ACTIONS__?.removeGate(gateId)
    },
    { gateId }
  )
}

/**
 * Delete selected gate via UI (click Delete Selected button)
 */
export async function deleteSelectedViaUI(page: Page): Promise<void> {
  await page.click(UI_SELECTORS.buttons.deleteSelected)
}

/**
 * Clear all gates via UI (click Clear All button)
 */
export async function clearAllViaUI(page: Page): Promise<void> {
  await page.click(UI_SELECTORS.buttons.clearAll)
}

/**
 * Get all gate IDs from the store
 */
export async function getGateIds(page: Page): Promise<string[]> {
  return page.evaluate(() => window.__CIRCUIT_STORE__?.gates.map((g) => g.id) ?? [])
}
