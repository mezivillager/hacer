/**
 * Wire Actions
 *
 * Actions for creating wires between gates
 * via both store-driven and UI-driven approaches.
 */

import { Page } from '@playwright/test'
import { clickPin } from './canvas.actions'
import { ensureWires } from '../waits'
import { TIMEOUTS } from '../../config/constants'

export interface WireSpec {
  fromGateId: string
  fromPinId: string
  toGateId: string
  toPinId: string
}

/**
 * Add a wire via store (fast, reliable for setup)
 * Note: For e2e tests, segments are calculated by the store's completeWiring action.
 * This helper should not be used directly - use UI interactions instead.
 * If segments need to be calculated, they should be done in the page context.
 */
export async function addWireViaStore(page: Page, wire: WireSpec): Promise<void> {
  await page.evaluate(
    ({ wire }) => {
      // Calculate segments in page context (requires wiring scheme utils)
      // For now, pass empty array - segments should be calculated via completeWiring
      // This is a fallback for tests that need direct wire creation
      window.__CIRCUIT_ACTIONS__?.addWire(
        wire.fromGateId,
        wire.fromPinId,
        wire.toGateId,
        wire.toPinId,
        [] // Empty segments - will be calculated on render if needed
      )
    },
    { wire }
  )
}

/**
 * Add multiple wires via store using gate indices and pin names
 */
export async function addWiresViaStore(
  page: Page,
  wires: Array<{
    fromGate: number
    fromPin: string
    toGate: number
    toPin: string
  }>,
  gateIds: string[]
): Promise<void> {
  await page.evaluate(
    ({ wires, gateIds }) => {
      wires.forEach((w) => {
        const from = gateIds[w.fromGate]
        const to = gateIds[w.toGate]
        window.__CIRCUIT_ACTIONS__?.addWire(from, `${from}-${w.fromPin}`, to, `${to}-${w.toPin}`, [])
      })
    },
    { wires, gateIds }
  )
}

/**
 * Add a wire via UI by clicking pins
 */
export async function addWireViaUI(
  page: Page,
  fromGateId: string,
  fromPinId: string,
  toGateId: string,
  toPinId: string
): Promise<void> {
  await clickPin(page, fromGateId, fromPinId)
  await clickPin(page, toGateId, toPinId)
}

/**
 * Connect wires via UI and wait for each to be created
 */
export async function connectWiresViaUI(
  page: Page,
  wires: Array<{
    fromGate: number
    fromPin: string
    toGate: number
    toPin: string
  }>,
  gateIds: string[],
  timeout: number = TIMEOUTS.store
): Promise<void> {
  for (const [idx, wire] of wires.entries()) {
    const from = gateIds[wire.fromGate]
    const to = gateIds[wire.toGate]
    const fromPinId = `${from}-${wire.fromPin}`
    const toPinId = `${to}-${wire.toPin}`

    await clickPin(page, from, fromPinId)
    await clickPin(page, to, toPinId)
    await ensureWires(page, idx + 1, timeout)
  }
}
