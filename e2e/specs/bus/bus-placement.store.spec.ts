/**
 * Bus Component Placement Store Tests
 *
 * Placement of bus splitter/joiner components via window.__CIRCUIT_ACTIONS__.
 *
 * Tag: @store @bus
 */

import { storeTest as test, storeExpect as expect } from '../../fixtures'
import { DEFAULT_POSITIONS } from '../../config/constants'

test.describe('Bus Placement @store @bus', () => {
  test('places a splitter directly via placeBusSplitter', async ({ page }) => {
    const created = await page.evaluate(({ position }) => {
      return window.__CIRCUIT_ACTIONS__?.placeBusSplitter(16, position)
    }, { position: DEFAULT_POSITIONS.center })

    expect(created).not.toBeNull()
    expect(created?.kind).toBe('splitter')

    const summary = await page.evaluate(() => {
      const list = window.__CIRCUIT_STORE__?.busComponents ?? []
      return list.map((c) => ({ kind: c.kind, width: c.width, ins: c.inputs.length, outs: c.outputs.length }))
    })
    expect(summary).toEqual([{ kind: 'splitter', width: 16, ins: 1, outs: 16 }])
  })

  test('places a joiner via the placement flow (startBusPlacement + placeBusComponent)', async ({ page }) => {
    await page.evaluate(() => window.__CIRCUIT_ACTIONS__?.startBusPlacement('joiner'))
    await page.evaluate(({ position }) => {
      window.__CIRCUIT_ACTIONS__?.placeBusComponent(position)
    }, { position: DEFAULT_POSITIONS.right })

    const summary = await page.evaluate(() => {
      const list = window.__CIRCUIT_STORE__?.busComponents ?? []
      const mode = window.__CIRCUIT_STORE__?.busPlacementMode ?? null
      return { count: list.length, kind: list[0]?.kind, width: list[0]?.width, ins: list[0]?.inputs.length, mode }
    })
    expect(summary.count).toBe(1)
    expect(summary.kind).toBe('joiner')
    expect(summary.width).toBe(16)
    expect(summary.ins).toBe(16)
    expect(summary.mode).toBeNull()
  })
})
