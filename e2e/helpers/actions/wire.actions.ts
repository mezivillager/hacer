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
    // Check if page is still open before proceeding
    if (page.isClosed()) {
      throw new Error('Page was closed during wire creation')
    }

    const from = gateIds[wire.fromGate]
    const to = gateIds[wire.toGate]
    const fromPinId = `${from}-${wire.fromPin}`
    const toPinId = `${to}-${wire.toPin}`

    // Cancel any existing wiring state before starting new wire
    await page.evaluate(() => {
      window.__CIRCUIT_ACTIONS__?.cancelWiring()
    })

    // Get pin positions
    const fromPinPos = await page.evaluate(
      ({ gateId, pinId }) => {
        return window.__CIRCUIT_ACTIONS__?.getPinWorldPosition(gateId, pinId) ?? null
      },
      { gateId: from, pinId: fromPinId }
    )

    const toPinPos = await page.evaluate(
      ({ gateId, pinId }) => {
        return window.__CIRCUIT_ACTIONS__?.getPinWorldPosition(gateId, pinId) ?? null
      },
      { gateId: to, pinId: toPinId }
    )

    if (!fromPinPos || !toPinPos) {
      throw new Error(`Pin positions not found`)
    }

    // Check page is still open
    if (page.isClosed()) {
      throw new Error('Page was closed while getting pin positions')
    }

    // Start wiring directly via store action (UI clicks don't trigger R3F events reliably in Playwright)
    await page.evaluate(
      ({ gateId, pinId, position }) => {
        window.__CIRCUIT_ACTIONS__?.startWiring(gateId, pinId, 'output', position)
      },
      { gateId: from, pinId: fromPinId, position: fromPinPos }
    )

    // Set destination pin and preview position
    await page.evaluate(
      ({ gateId, pinId, position }) => {
        const actions = window.__CIRCUIT_ACTIONS__
        if (actions) {
          actions.setDestinationPin(gateId, pinId)
          actions.updateWirePreviewPosition(position)
        }
      },
      { gateId: to, pinId: toPinId, position: toPinPos }
    )

    // Wait for destination pin and preview position to be set in store
    await page.waitForFunction(
      ({ expectedGateId, expectedPinId }) => {
        const wiringFrom = window.__CIRCUIT_STORE__?.wiringFrom
        return (
          wiringFrom?.destinationGateId === expectedGateId &&
          wiringFrom?.destinationPinId === expectedPinId &&
          wiringFrom?.previewEndPosition !== null
        )
      },
      { expectedGateId: to, expectedPinId: toPinId },
      { timeout: 2000 }
    )

    // Manually calculate and store segments using the same logic as the store
    // This bypasses WirePreview component which may not render in time for tests
    const segmentsCalculated = await page.evaluate(
      ({ fromGateId, fromPinId, toGateId, toPinId }) => {
        const store = window.__CIRCUIT_STORE__
        const actions = window.__CIRCUIT_ACTIONS__

        if (!store || !actions) {
          return false
        }

        // Check if segments already exist (WirePreview might have calculated them)
        const wiringFrom = store.wiringFrom
        if (wiringFrom?.segments && wiringFrom.segments.length > 0) {
          return true // Already calculated
        }

        // Manually calculate segments using the exposed helper
        if (!actions?.calculateWirePathSegments) {
          return false
        }

        try {
          const segments = actions.calculateWirePathSegments(fromGateId, fromPinId, toGateId, toPinId)
          if (segments && segments.length > 0 && wiringFrom) {
            // Segments are automatically stored by calculateWirePathSegments via setState
            return true
          }
          return false
        } catch (error) {
          console.error('Error calculating segments:', error)
          return false
        }
      },
      { fromGateId: from, fromPinId: fromPinId, toGateId: to, toPinId: toPinId }
    )

    // If segments weren't calculated manually, wait for WirePreview
    if (!segmentsCalculated) {
      await page.waitForTimeout(800)
    }

    // Check if segments were calculated (either manually or by WirePreview)
    let segmentsReady = false
    const maxAttempts = 30 // 3 seconds total (30 * 100ms)

    if (segmentsCalculated) {
      // Segments were calculated manually, verify they're in the store
      await page.waitForTimeout(50) // Small wait for state to sync
      const verifySegments = await page.evaluate(() => {
        const wiringFrom = window.__CIRCUIT_STORE__?.wiringFrom
        return (wiringFrom?.segments?.length ?? 0) > 0
      })
      if (verifySegments) {
        segmentsReady = true
      }
    }

    // If not ready yet, poll for segments (WirePreview might still be calculating)
    if (!segmentsReady) {
      let attempts = 0

      while (!segmentsReady && attempts < maxAttempts) {
        if (page.isClosed()) {
          throw new Error('Page was closed while waiting for wire segments')
        }

        const result = await page.evaluate(() => {
          const wiringFrom = window.__CIRCUIT_STORE__?.wiringFrom
          return {
            hasSegments: (wiringFrom?.segments?.length ?? 0) > 0,
            hasDestination: wiringFrom?.destinationGateId !== null && wiringFrom?.destinationPinId !== null,
            wiringActive: wiringFrom !== null
          }
        })

        if (result.hasSegments) {
          segmentsReady = true
          break
        }

        // If wiring is no longer active, something went wrong
        if (!result.wiringActive) {
          throw new Error('Wiring state was cleared before segments were calculated')
        }

        attempts++
        await page.waitForTimeout(100)
      }
    }

    if (!segmentsReady) {
      // Segments not ready - check if page is still open before canceling
      if (page.isClosed()) {
        throw new Error('Page was closed while waiting for wire segments')
      }

      // Check one more time if segments exist (might have been calculated during the last check)
      const finalCheck = await page.evaluate(() => {
        const wiringFrom = window.__CIRCUIT_STORE__?.wiringFrom
        return (wiringFrom?.segments?.length ?? 0) > 0
      })

      if (!finalCheck) {
        // Check if there's an error or if wiring is still active
        const wiringState = await page.evaluate(() => {
          const wiringFrom = window.__CIRCUIT_STORE__?.wiringFrom
          return {
            active: wiringFrom !== null,
            hasDestination: wiringFrom?.destinationGateId !== null,
            hasPreviewPos: wiringFrom?.previewEndPosition !== null,
            segmentsLength: wiringFrom?.segments?.length ?? 0
          }
        })

        // If wiring is still active with destination set, check if gates exist
        // WirePreview needs gates to be in the store to calculate path
        if (wiringState.active && wiringState.hasDestination && wiringState.hasPreviewPos) {
          const gatesCheck = await page.evaluate(({ fromGateId, toGateId }) => {
            const gates = window.__CIRCUIT_STORE__?.gates ?? []
            const fromGate = gates.find(g => g.id === fromGateId)
            const toGate = gates.find(g => g.id === toGateId)
            return {
              gatesCount: gates.length,
              hasFromGate: fromGate !== undefined,
              hasToGate: toGate !== undefined,
              fromGateId,
              toGateId
            }
          }, { fromGateId: from, toGateId: to })

          if (!gatesCheck.hasFromGate || !gatesCheck.hasToGate) {
            await page.evaluate(() => {
              window.__CIRCUIT_ACTIONS__?.cancelWiring()
            })
            throw new Error(`Gates not found in store. From: ${gatesCheck.hasFromGate}, To: ${gatesCheck.hasToGate}, Total gates: ${gatesCheck.gatesCount}`)
          }

          // Gates exist, but segments still not calculated
          // This suggests WirePreview isn't rendering or path calculation is failing
          // Let's wait a bit more and check one final time
          await page.waitForTimeout(1000)

          const finalSegmentsCheck = await page.evaluate(() => {
            const wiringFrom = window.__CIRCUIT_STORE__?.wiringFrom
            return (wiringFrom?.segments?.length ?? 0) > 0
          })

          if (finalSegmentsCheck) {
            segmentsReady = true
          } else {
            // Cancel wiring and throw with detailed error
            await page.evaluate(() => {
              window.__CIRCUIT_ACTIONS__?.cancelWiring()
            })
            throw new Error(`Wire segments were not calculated after ${30 * 100 + 1000}ms. Gates exist but WirePreview didn't calculate path.`)
          }
        } else {
          // Cancel wiring and throw
          await page.evaluate(() => {
            window.__CIRCUIT_ACTIONS__?.cancelWiring()
          })
          throw new Error(`Wire segments were not calculated. State: ${JSON.stringify(wiringState)}`)
        }
      } else {
        segmentsReady = true
      }
    }

    // Check page is still open before completing
    if (page.isClosed()) {
      throw new Error('Page was closed before completing wire')
    }

    // Complete wiring directly via store action
    try {
      await page.evaluate(
        ({ gateId, pinId }) => {
          window.__CIRCUIT_ACTIONS__?.completeWiring(gateId, pinId, 'input')
        },
        { gateId: to, pinId: toPinId }
      )
    } catch (error) {
      // If completeWiring fails, cancel wiring to clean up state
      if (!page.isClosed()) {
        await page.evaluate(() => {
          window.__CIRCUIT_ACTIONS__?.cancelWiring()
        })
      }
      throw error
    }

    // Only wait for wires if page is still open
    if (!page.isClosed()) {
      await ensureWires(page, idx + 1, timeout)
    } else {
      throw new Error('Page was closed after completing wire')
    }
  }
}
