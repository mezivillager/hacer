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
 */
export async function addWireViaStore(page: Page, wire: WireSpec): Promise<void> {
  await page.evaluate(
    ({ wire }) => {
      window.__CIRCUIT_ACTIONS__?.addWire(
        wire.fromGateId,
        wire.fromPinId,
        wire.toGateId,
        wire.toPinId
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
        window.__CIRCUIT_ACTIONS__?.addWire(from, `${from}-${w.fromPin}`, to, `${to}-${w.toPin}`)
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
    await clickPin(page, from, `${from}-${wire.fromPin}`)
    await clickPin(page, to, `${to}-${wire.toPin}`)
    await ensureWires(page, idx + 1, timeout)
  }
}
