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

export type GateType = 'NAND' | 'AND' | 'OR' | 'NOT' | 'XOR'

export interface GateResult {
  id: string
  inputs: Array<{ id: string }>
  outputs: Array<{ id: string }>
}

/**
 * Add a gate via store (fast, reliable for setup)
 */
export async function addGateViaStore(
  page: Page,
  type: GateType,
  position: Position3D
): Promise<GateResult | null> {
  return page.evaluate(
    ({ type, position }) => {
      return window.__CIRCUIT_ACTIONS__?.addGate(type, position) ?? null
    },
    { type, position }
  )
}

/**
 * Add multiple gates via store and return their IDs
 */
export async function addGatesViaStore(
  page: Page,
  placements: Array<{ type?: GateType; position: Position3D }>
): Promise<string[]> {
  return page.evaluate(
    (placements) => {
      const ids: string[] = []
      placements.forEach((p) => {
        const gateType = p.type || 'NAND' // Default to NAND for backward compatibility
        const res = window.__CIRCUIT_ACTIONS__?.addGate(gateType, p.position)
        if (res?.id) ids.push(res.id)
      })
      return ids
    },
    placements
  )
}

export interface GatePlacementOptions {
  type?: GateType
  position: Position3D
  rotate?: { direction: 'left' | 'right'; times: number }
}

/**
 * Add a gate via UI interactions (click gate icon, place on canvas)
 */
export async function addGateViaUI(
  page: Page,
  options: GatePlacementOptions
): Promise<void> {
  const gateType = options.type || 'NAND' // Default to NAND for backward compatibility
  
  // Click the gate icon in the selector grid
  const gateIconSelector = UI_SELECTORS.gateSelector.getIcon(gateType)
  await page.click(gateIconSelector)
  
  // Wait for placement mode to be active (check for hint text or active state)
  await page.waitForSelector('.gate-icon.active', { state: 'visible' })
  
  // Click on the canvas to place the gate
  await clickWorldPosition(page, options.position)

  if (options.rotate) {
    await rotateAtPosition(page, options.position, options.rotate.direction, options.rotate.times)
  }
}

/**
 * Add a NAND gate via UI (backward compatibility)
 */
export async function addNandGateViaUI(
  page: Page,
  options: GatePlacementOptions
): Promise<void> {
  return addGateViaUI(page, { ...options, type: 'NAND' })
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

/**
 * Get gate type from the store
 */
export async function getGateType(page: Page, gateId: string): Promise<GateType | null> {
  return page.evaluate(
    ({ gateId }) => {
      const gate = window.__CIRCUIT_STORE__?.gates.find((g) => g.id === gateId)
      const type = gate?.type
      // Type guard to ensure it's a valid GateType
      if (type === 'NAND' || type === 'AND' || type === 'OR' || type === 'NOT' || type === 'XOR') {
        return type
      }
      return null
    },
    { gateId }
  )
}
