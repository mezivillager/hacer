/**
 * Junction Placement E2E Tests
 *
 * Tests for placing junction nodes on wires and wiring from junctions.
 */

import { test, expect } from '@playwright/test'
import { ensureGates, ensureWires } from '../../helpers/waits'
import { addGateViaStore } from '../../helpers/actions/gate.actions'

const SECTION_SIZE = 4.0
const WIRE_HEIGHT = 0.2

const DEFAULT_POSITIONS = {
  left: { x: -4, y: 0, z: 0 },
  center: { x: 0, y: 0, z: 0 },
  right: { x: 8, y: 0, z: 0 },
  farRight: { x: 12, y: 0, z: 0 },
}

test.describe('Junction Placement @store @wiring @junctions', () => {
  test('places junction on wire', async ({ page }) => {
    // Add a gate
    const gate = await addGateViaStore(page, 'NAND', DEFAULT_POSITIONS.center)
    await ensureGates(page, 1)

    if (!gate) {
      throw new Error('Failed to create gate')
    }

    // Create a wire with exit + vertical + horizontal + entry segments (has corners)
    await page.evaluate(
      ({ gateId, pinId, sectionSize, wireHeight }) => {
        const fromEndpoint = { type: 'gate' as const, entityId: gateId, pinId: pinId }
        const toEndpoint = { type: 'gate' as const, entityId: gateId, pinId: `${gateId}-in-0` }
        window.__CIRCUIT_ACTIONS__?.addWire(fromEndpoint, toEndpoint, [
          { type: 'exit', start: { x: 0.7, y: wireHeight, z: 0 }, end: { x: sectionSize, y: wireHeight, z: 0 } },
          { type: 'vertical', start: { x: sectionSize, y: wireHeight, z: 0 }, end: { x: sectionSize, y: wireHeight, z: -sectionSize } },
          { type: 'horizontal', start: { x: sectionSize, y: wireHeight, z: -sectionSize }, end: { x: 2 * sectionSize, y: wireHeight, z: -sectionSize } },
          { type: 'entry', start: { x: 2 * sectionSize, y: wireHeight, z: -sectionSize }, end: { x: 2 * sectionSize + 0.7, y: wireHeight, z: -sectionSize } },
        ])
      },
      {
        gateId: gate.id,
        pinId: `${gate.id}-out-0`,
        sectionSize: SECTION_SIZE,
        wireHeight: WIRE_HEIGHT,
      }
    )

    await ensureWires(page, 1)

    // Get wire ID
    const wireId = await page.evaluate(() => {
      return window.__CIRCUIT_STORE__?.wires[0]?.id
    })

    expect(wireId).toBeDefined()
    if (typeof wireId !== 'string') throw new Error('wireId is required')

    // Place junction at corner where vertical meets horizontal
    const junction = await page.evaluate(
      ({ wireId, sectionSize, wireHeight }: { wireId: string; sectionSize: number; wireHeight: number }) => {
        return window.__CIRCUIT_ACTIONS__?.placeJunctionOnWire(
          { x: sectionSize, y: wireHeight, z: -sectionSize },
          wireId
        )
      },
      {
        wireId,
        sectionSize: SECTION_SIZE,
        wireHeight: WIRE_HEIGHT,
      }
    )

    expect(junction).toBeDefined()
    expect(junction?.id).toBeDefined()
    expect(junction?.signalId).toBeDefined()
    expect(junction?.wireIds).toContain(wireId)

    // Verify junction was created
    const junctionCount = await page.evaluate((): number => {
      const store = window.__CIRCUIT_STORE__
      if (!store || !('junctions' in store)) return 0
      const junctions = store.junctions as Array<{ id: string; wireIds: string[] }> | undefined
      return junctions?.length ?? 0
    })
    expect(junctionCount).toBe(1)

    // Verify wire still exists (not split)
    await ensureWires(page, 1)
  })

  test('wires from junction to create branch', async ({ page }) => {
    // Add gates
    const gate1 = await addGateViaStore(page, 'NAND', DEFAULT_POSITIONS.center)
    const gate2 = await addGateViaStore(page, 'NAND', DEFAULT_POSITIONS.right)
    const gate3 = await addGateViaStore(page, 'NAND', DEFAULT_POSITIONS.farRight)

    await ensureGates(page, 3)

    if (!gate1 || !gate2 || !gate3) {
      throw new Error('Failed to create gates')
    }

    // Create original wire with exit + vertical + horizontal + entry segments
    await page.evaluate(
      ({ gate1Id, gate2Id, pinId, sectionSize, wireHeight }) => {
        const fromEndpoint = { type: 'gate' as const, entityId: gate1Id, pinId: pinId }
        const toEndpoint = { type: 'gate' as const, entityId: gate2Id, pinId: `${gate2Id}-in-0` }
        window.__CIRCUIT_ACTIONS__?.addWire(fromEndpoint, toEndpoint, [
          { type: 'exit', start: { x: 0.7, y: wireHeight, z: 0 }, end: { x: sectionSize, y: wireHeight, z: 0 } },
          { type: 'vertical', start: { x: sectionSize, y: wireHeight, z: 0 }, end: { x: sectionSize, y: wireHeight, z: -sectionSize } },
          { type: 'horizontal', start: { x: sectionSize, y: wireHeight, z: -sectionSize }, end: { x: 2 * sectionSize, y: wireHeight, z: -sectionSize } },
          { type: 'entry', start: { x: 2 * sectionSize, y: wireHeight, z: -sectionSize }, end: { x: 2 * sectionSize + 0.7, y: wireHeight, z: -sectionSize } },
        ], [], 'sig-test')
      },
      {
        gate1Id: gate1.id,
        gate2Id: gate2.id,
        pinId: `${gate1.id}-out-0`,
        sectionSize: SECTION_SIZE,
        wireHeight: WIRE_HEIGHT,
      }
    )

    await ensureWires(page, 1)

    const wireId = await page.evaluate(() => {
      return window.__CIRCUIT_STORE__?.wires[0]?.id
    })
    expect(wireId).toBeDefined()

    // Place junction at corner where vertical meets horizontal
    const junction = await page.evaluate(
      ({ wireId, sectionSize, wireHeight }: { wireId: string; sectionSize: number; wireHeight: number }) => {
        return window.__CIRCUIT_ACTIONS__?.placeJunctionOnWire(
          { x: sectionSize, y: wireHeight, z: -sectionSize },
          wireId
        )
      },
      {
        wireId: wireId!,
        sectionSize: SECTION_SIZE,
        wireHeight: WIRE_HEIGHT,
      }
    )

    // Start wiring from junction
    await page.evaluate(
      ({ junctionId, position }) => {
        window.__CIRCUIT_ACTIONS__?.startWiringFromJunction(junctionId, position)
      },
      {
        junctionId: junction!.id,
        position: junction!.position,
      }
    )

    // Wait for segments to be calculated
    await page.waitForTimeout(500)

    // Set segments manually (normally done by WirePreview)
    await page.evaluate(({ sectionSize, wireHeight }) => {
      const state = window.__CIRCUIT_STORE__
      if (state?.wiringFrom) {
        state.wiringFrom.segments = [
          {
            start: { x: sectionSize, y: wireHeight, z: -sectionSize },
            end: { x: 11.5, y: wireHeight, z: -sectionSize },
            type: 'horizontal',
          },
        ]
      }
    }, { sectionSize: SECTION_SIZE, wireHeight: WIRE_HEIGHT })

    // Complete wiring to gate3
    await page.evaluate(
      ({ gateId, pinId }) => {
        window.__CIRCUIT_ACTIONS__?.completeWiringFromJunction(gateId, pinId, 'input')
      },
      {
        gateId: gate3.id,
        pinId: `${gate3.id}-in-0`,
      }
    )

    await ensureWires(page, 2)

    // Verify branch wire starts at original wire's start (gate1)
    const branchWire = await page.evaluate((gate3Id: string): {
      from: { type: string; entityId: string; pinId?: string }
      to: { type: string; entityId: string; pinId?: string }
      signalId?: string
    } | null => {
      const state = window.__CIRCUIT_STORE__
      const w = state?.wires.find((wire) => wire.to.entityId === gate3Id)
      if (!w) return null
      return { from: w.from, to: w.to, signalId: w.signalId }
    }, gate3.id)

    expect(branchWire?.from.type).toBe('gate')
    expect(branchWire?.from.entityId).toBe(gate1.id) // Starts at original wire's start
    expect(branchWire?.to.entityId).toBe(gate3.id)
    expect(branchWire?.signalId).toBe('sig-test')

    // Verify junction tracks both wires
    const updatedJunction = await page.evaluate((junctionId: string): { wireIds: string[] } | null => {
      const state = window.__CIRCUIT_STORE__
      const j = state?.junctions?.find((junction: { id: string; wireIds: string[] }) => junction.id === junctionId)
      if (!j) return null
      return { wireIds: j.wireIds }
    }, junction!.id)

    expect(updatedJunction?.wireIds).toHaveLength(2)
  })

  test('removes junction when only one wire remains', async ({ page }) => {
    // Add gates
    const gate1 = await addGateViaStore(page, 'NAND', DEFAULT_POSITIONS.center)
    const gate2 = await addGateViaStore(page, 'NAND', DEFAULT_POSITIONS.right)
    const gate3 = await addGateViaStore(page, 'NAND', DEFAULT_POSITIONS.farRight)

    if (!gate1 || !gate2 || !gate3) {
      throw new Error('Failed to create gates')
    }

    // Create original wire with exit + vertical + horizontal + entry segments
    await page.evaluate(
      ({ gate1Id, gate2Id, pinId, sectionSize, wireHeight }) => {
        const fromEndpoint = { type: 'gate' as const, entityId: gate1Id, pinId: pinId }
        const toEndpoint = { type: 'gate' as const, entityId: gate2Id, pinId: `${gate2Id}-in-0` }
        window.__CIRCUIT_ACTIONS__?.addWire(fromEndpoint, toEndpoint, [
          { type: 'exit', start: { x: 0.7, y: wireHeight, z: 0 }, end: { x: sectionSize, y: wireHeight, z: 0 } },
          { type: 'vertical', start: { x: sectionSize, y: wireHeight, z: 0 }, end: { x: sectionSize, y: wireHeight, z: -sectionSize } },
          { type: 'horizontal', start: { x: sectionSize, y: wireHeight, z: -sectionSize }, end: { x: 2 * sectionSize, y: wireHeight, z: -sectionSize } },
          { type: 'entry', start: { x: 2 * sectionSize, y: wireHeight, z: -sectionSize }, end: { x: 2 * sectionSize + 0.7, y: wireHeight, z: -sectionSize } },
        ])
      },
      {
        gate1Id: gate1.id,
        gate2Id: gate2.id,
        pinId: `${gate1.id}-out-0`,
        sectionSize: SECTION_SIZE,
        wireHeight: WIRE_HEIGHT,
      }
    )

    const wireId = await page.evaluate(() => {
      return window.__CIRCUIT_STORE__?.wires[0]?.id
    })
    expect(wireId).toBeDefined()

    // Place junction at corner where vertical meets horizontal
    const junction = await page.evaluate(
      ({ wireId, sectionSize, wireHeight }: { wireId: string; sectionSize: number; wireHeight: number }) => {
        return window.__CIRCUIT_ACTIONS__?.placeJunctionOnWire(
          { x: sectionSize, y: wireHeight, z: -sectionSize },
          wireId
        )
      },
      {
        wireId: wireId!,
        sectionSize: SECTION_SIZE,
        wireHeight: WIRE_HEIGHT,
      }
    )

    await page.evaluate(
      ({ junctionId, position }) => {
        window.__CIRCUIT_ACTIONS__?.startWiringFromJunction(junctionId, position)
      },
      {
        junctionId: junction!.id,
        position: junction!.position,
      }
    )

    await page.waitForTimeout(500)

    await page.evaluate(({ sectionSize, wireHeight }) => {
      const state = window.__CIRCUIT_STORE__
      if (state?.wiringFrom) {
        state.wiringFrom.segments = [
          {
            start: { x: sectionSize, y: wireHeight, z: -sectionSize },
            end: { x: 11.5, y: wireHeight, z: -sectionSize },
            type: 'horizontal',
          },
        ]
      }
    }, { sectionSize: SECTION_SIZE, wireHeight: WIRE_HEIGHT })

    await page.evaluate(
      ({ gateId, pinId }) => {
        window.__CIRCUIT_ACTIONS__?.completeWiringFromJunction(gateId, pinId, 'input')
      },
      {
        gateId: gate3.id,
        pinId: `${gate3.id}-in-0`,
      }
    )

    await ensureWires(page, 2)

    // Delete original wire
    expect(wireId).toBeDefined()
    await page.evaluate(
      (wid: string) => {
        window.__CIRCUIT_ACTIONS__?.removeWire(wid)
      },
      wireId as string
    )

    // Junction should be removed (only one wire remains)
    const junctionCount = await page.evaluate((): number => {
      const store = window.__CIRCUIT_STORE__
      if (!store || !('junctions' in store)) return 0
      const junctions = store.junctions as Array<{ id: string; wireIds: string[] }> | undefined
      return junctions?.length ?? 0
    })
    expect(junctionCount).toBe(0)

    // Branch wire should still exist
    await ensureWires(page, 1)
  })

  test('rejects junction placement when not at corner', async ({ page }) => {
    // Add gates
    const gate1 = await addGateViaStore(page, 'NAND', DEFAULT_POSITIONS.center)
    const gate2 = await addGateViaStore(page, 'NAND', DEFAULT_POSITIONS.farRight)

    await ensureGates(page, 2)

    if (!gate1 || !gate2) {
      throw new Error('Failed to create gates')
    }

    // Create wire with exit + vertical + horizontal + entry segments
    await page.evaluate(
      ({ gate1Id, gate2Id, pinId, sectionSize, wireHeight }) => {
        const fromEndpoint = { type: 'gate' as const, entityId: gate1Id, pinId: pinId }
        const toEndpoint = { type: 'gate' as const, entityId: gate2Id, pinId: `${gate2Id}-in-0` }
        window.__CIRCUIT_ACTIONS__?.addWire(fromEndpoint, toEndpoint, [
          { type: 'exit', start: { x: 0.7, y: wireHeight, z: 0 }, end: { x: sectionSize, y: wireHeight, z: 0 } },
          { type: 'vertical', start: { x: sectionSize, y: wireHeight, z: 0 }, end: { x: sectionSize, y: wireHeight, z: -sectionSize } },
          { type: 'horizontal', start: { x: sectionSize, y: wireHeight, z: -sectionSize }, end: { x: 2 * sectionSize, y: wireHeight, z: -sectionSize } },
          { type: 'entry', start: { x: 2 * sectionSize, y: wireHeight, z: -sectionSize }, end: { x: 2 * sectionSize + 0.7, y: wireHeight, z: -sectionSize } },
        ])
      },
      {
        gate1Id: gate1.id,
        gate2Id: gate2.id,
        pinId: `${gate1.id}-out-0`,
        sectionSize: SECTION_SIZE,
        wireHeight: WIRE_HEIGHT,
      }
    )

    await ensureWires(page, 1)

    const wireId = await page.evaluate(() => {
      return window.__CIRCUIT_STORE__?.wires[0]?.id
    })
    expect(wireId).toBeDefined()

    // Try to place junction in middle of vertical segment (not at corner) - should throw error
    const error = await page.evaluate(
      ({ wireId, sectionSize, wireHeight }: { wireId: string; sectionSize: number; wireHeight: number }) => {
        try {
          window.__CIRCUIT_ACTIONS__?.placeJunctionOnWire(
            { x: sectionSize, y: wireHeight, z: -sectionSize / 2 },
            wireId
          )
          return null
        } catch (e) {
          return e instanceof Error ? e.message : String(e)
        }
      },
      {
        wireId: wireId!,
        sectionSize: SECTION_SIZE,
        wireHeight: WIRE_HEIGHT,
      }
    )

    expect(error).toBe(
      'Junction can only be placed at wire corners (section line intersections). Please click on a corner where segments meet.'
    )

    // Verify no junction was created
    const junctionCount = await page.evaluate((): number => {
      const store = window.__CIRCUIT_STORE__
      if (!store || !('junctions' in store)) return 0
      const junctions = store.junctions as Array<{ id: string }> | undefined
      return junctions?.length ?? 0
    })
    expect(junctionCount).toBe(0)
  })

  test('creates multiple branches from same junction', async ({ page }) => {
    // Add gates
    const gate1 = await addGateViaStore(page, 'NAND', DEFAULT_POSITIONS.center)
    const gate2 = await addGateViaStore(page, 'NAND', DEFAULT_POSITIONS.right)
    const gate3 = await addGateViaStore(page, 'NAND', DEFAULT_POSITIONS.farRight)
    const gate4 = await addGateViaStore(page, 'NAND', { x: 12, y: 0, z: 4 })

    await ensureGates(page, 4)

    if (!gate1 || !gate2 || !gate3 || !gate4) {
      throw new Error('Failed to create gates')
    }

    // Create original wire with exit + vertical + horizontal + entry segments
    await page.evaluate(
      ({ gate1Id, gate2Id, pinId, sectionSize, wireHeight }) => {
        const fromEndpoint = { type: 'gate' as const, entityId: gate1Id, pinId: pinId }
        const toEndpoint = { type: 'gate' as const, entityId: gate2Id, pinId: `${gate2Id}-in-0` }
        window.__CIRCUIT_ACTIONS__?.addWire(fromEndpoint, toEndpoint, [
          { type: 'exit', start: { x: 0.7, y: wireHeight, z: 0 }, end: { x: sectionSize, y: wireHeight, z: 0 } },
          { type: 'vertical', start: { x: sectionSize, y: wireHeight, z: 0 }, end: { x: sectionSize, y: wireHeight, z: -sectionSize } },
          { type: 'horizontal', start: { x: sectionSize, y: wireHeight, z: -sectionSize }, end: { x: 2 * sectionSize, y: wireHeight, z: -sectionSize } },
          { type: 'entry', start: { x: 2 * sectionSize, y: wireHeight, z: -sectionSize }, end: { x: 2 * sectionSize + 0.7, y: wireHeight, z: -sectionSize } },
        ], [], 'sig-test')
      },
      {
        gate1Id: gate1.id,
        gate2Id: gate2.id,
        pinId: `${gate1.id}-out-0`,
        sectionSize: SECTION_SIZE,
        wireHeight: WIRE_HEIGHT,
      }
    )

    await ensureWires(page, 1)

    const wireId = await page.evaluate(() => {
      return window.__CIRCUIT_STORE__?.wires[0]?.id
    })
    expect(wireId).toBeDefined()

    // Place junction at corner where vertical meets horizontal
    const junction = await page.evaluate(
      ({ wireId, sectionSize, wireHeight }: { wireId: string; sectionSize: number; wireHeight: number }) => {
        return window.__CIRCUIT_ACTIONS__?.placeJunctionOnWire(
          { x: sectionSize, y: wireHeight, z: -sectionSize },
          wireId
        )
      },
      {
        wireId: wireId!,
        sectionSize: SECTION_SIZE,
        wireHeight: WIRE_HEIGHT,
      }
    )

    // Create first branch
    await page.evaluate(
      ({ junctionId, position }) => {
        window.__CIRCUIT_ACTIONS__?.startWiringFromJunction(junctionId, position)
      },
      {
        junctionId: junction!.id,
        position: junction!.position,
      }
    )

    await page.waitForTimeout(500)

    await page.evaluate(({ sectionSize, wireHeight }) => {
      const state = window.__CIRCUIT_STORE__
      if (state?.wiringFrom) {
        state.wiringFrom.segments = [
          {
            start: { x: sectionSize, y: wireHeight, z: -sectionSize },
            end: { x: 11.5, y: wireHeight, z: -sectionSize },
            type: 'horizontal',
          },
        ]
      }
    }, { sectionSize: SECTION_SIZE, wireHeight: WIRE_HEIGHT })

    await page.evaluate(
      ({ gateId, pinId }) => {
        window.__CIRCUIT_ACTIONS__?.completeWiringFromJunction(gateId, pinId, 'input')
      },
      {
        gateId: gate3.id,
        pinId: `${gate3.id}-in-0`,
      }
    )

    await ensureWires(page, 2)

    // Create second branch from same junction
    await page.evaluate(
      ({ junctionId, position }) => {
        window.__CIRCUIT_ACTIONS__?.startWiringFromJunction(junctionId, position)
      },
      {
        junctionId: junction!.id,
        position: junction!.position,
      }
    )

    await page.waitForTimeout(500)

    await page.evaluate(({ sectionSize, wireHeight }) => {
      const state = window.__CIRCUIT_STORE__
      if (state?.wiringFrom) {
        state.wiringFrom.segments = [
          {
            start: { x: sectionSize, y: wireHeight, z: -sectionSize },
            end: { x: 11.5, y: wireHeight, z: 4 },
            type: 'horizontal',
          },
        ]
      }
    }, { sectionSize: SECTION_SIZE, wireHeight: WIRE_HEIGHT })

    await page.evaluate(
      ({ gateId, pinId }) => {
        window.__CIRCUIT_ACTIONS__?.completeWiringFromJunction(gateId, pinId, 'input')
      },
      {
        gateId: gate4.id,
        pinId: `${gate4.id}-in-0`,
      }
    )

    await ensureWires(page, 3)

    // Verify junction tracks all wires
    const updatedJunction = await page.evaluate((junctionId: string): { wireIds: string[] } | null => {
      const state = window.__CIRCUIT_STORE__
      const j = state?.junctions?.find((junction: { id: string; wireIds: string[] }) => junction.id === junctionId)
      if (!j) return null
      return { wireIds: j.wireIds }
    }, junction!.id)

    expect(updatedJunction?.wireIds).toHaveLength(3) // Original + 2 branches
  })

  test('handles nested junctions (junction on branch wire)', async ({ page }) => {
    // Add gates
    const gate1 = await addGateViaStore(page, 'NAND', DEFAULT_POSITIONS.center)
    const gate2 = await addGateViaStore(page, 'NAND', DEFAULT_POSITIONS.right)
    const gate3 = await addGateViaStore(page, 'NAND', DEFAULT_POSITIONS.farRight)
    const gate4 = await addGateViaStore(page, 'NAND', { x: 12, y: 0, z: 4 })

    await ensureGates(page, 4)

    if (!gate1 || !gate2 || !gate3 || !gate4) {
      throw new Error('Failed to create gates')
    }

    // Create original wire with exit + vertical + horizontal + entry segments
    await page.evaluate(
      ({ gate1Id, gate2Id, pinId, sectionSize, wireHeight }) => {
        const fromEndpoint = { type: 'gate' as const, entityId: gate1Id, pinId: pinId }
        const toEndpoint = { type: 'gate' as const, entityId: gate2Id, pinId: `${gate2Id}-in-0` }
        window.__CIRCUIT_ACTIONS__?.addWire(fromEndpoint, toEndpoint, [
          { type: 'exit', start: { x: 0.7, y: wireHeight, z: 0 }, end: { x: sectionSize, y: wireHeight, z: 0 } },
          { type: 'vertical', start: { x: sectionSize, y: wireHeight, z: 0 }, end: { x: sectionSize, y: wireHeight, z: -sectionSize } },
          { type: 'horizontal', start: { x: sectionSize, y: wireHeight, z: -sectionSize }, end: { x: 2 * sectionSize, y: wireHeight, z: -sectionSize } },
          { type: 'entry', start: { x: 2 * sectionSize, y: wireHeight, z: -sectionSize }, end: { x: 2 * sectionSize + 0.7, y: wireHeight, z: -sectionSize } },
        ], [], 'sig-test')
      },
      {
        gate1Id: gate1.id,
        gate2Id: gate2.id,
        pinId: `${gate1.id}-out-0`,
        sectionSize: SECTION_SIZE,
        wireHeight: WIRE_HEIGHT,
      }
    )

    await ensureWires(page, 1)

    const wireId = await page.evaluate(() => {
      return window.__CIRCUIT_STORE__?.wires[0]?.id
    })
    expect(wireId).toBeDefined()

    // Place first junction at corner where vertical meets horizontal
    const junction1 = await page.evaluate(
      ({ wireId, sectionSize, wireHeight }: { wireId: string; sectionSize: number; wireHeight: number }) => {
        return window.__CIRCUIT_ACTIONS__?.placeJunctionOnWire(
          { x: sectionSize, y: wireHeight, z: -sectionSize },
          wireId
        )
      },
      {
        wireId: wireId!,
        sectionSize: SECTION_SIZE,
        wireHeight: WIRE_HEIGHT,
      }
    )

    // Create branch wire from junction1 to gate3 with corners (vertical + horizontal)
    await page.evaluate(
      ({ junctionId, position }) => {
        window.__CIRCUIT_ACTIONS__?.startWiringFromJunction(junctionId, position)
      },
      {
        junctionId: junction1!.id,
        position: junction1!.position,
      }
    )

    await page.waitForTimeout(500)

    await page.evaluate(({ sectionSize, wireHeight }) => {
      const state = window.__CIRCUIT_STORE__
      if (state?.wiringFrom) {
        state.wiringFrom.segments = [
          {
            start: { x: sectionSize, y: wireHeight, z: -sectionSize },
            end: { x: sectionSize, y: wireHeight, z: -2 * sectionSize },
            type: 'vertical',
          },
          {
            start: { x: sectionSize, y: wireHeight, z: -2 * sectionSize },
            end: { x: 2 * sectionSize, y: wireHeight, z: -2 * sectionSize },
            type: 'horizontal',
          },
        ]
      }
    }, { sectionSize: SECTION_SIZE, wireHeight: WIRE_HEIGHT })

    await page.evaluate(
      ({ gateId, pinId }) => {
        window.__CIRCUIT_ACTIONS__?.completeWiringFromJunction(gateId, pinId, 'input')
      },
      {
        gateId: gate3.id,
        pinId: `${gate3.id}-in-0`,
      }
    )

    await ensureWires(page, 2)

    // Find branch wire and place second junction on it at the corner
    const branchWireId = await page.evaluate((gate3Id: string): string | null => {
      const state = window.__CIRCUIT_STORE__
      const w = state?.wires.find((wire) => wire.to.entityId === gate3Id)
      return w?.id ?? null
    }, gate3.id)

    expect(branchWireId).toBeDefined()

    // Place junction2 at corner where vertical meets horizontal on the branch wire
    const junction2 = await page.evaluate(
      ({ wireId, sectionSize, wireHeight }) => {
        return window.__CIRCUIT_ACTIONS__?.placeJunctionOnWire(
          { x: sectionSize, y: wireHeight, z: -2 * sectionSize },
          wireId
        )
      },
      {
        wireId: branchWireId!,
        sectionSize: SECTION_SIZE,
        wireHeight: WIRE_HEIGHT,
      }
    )

    // Create branch from junction2 to gate4
    await page.evaluate(
      ({ junctionId, position }) => {
        window.__CIRCUIT_ACTIONS__?.startWiringFromJunction(junctionId, position)
      },
      {
        junctionId: junction2!.id,
        position: junction2!.position,
      }
    )

    await page.waitForTimeout(500)

    await page.evaluate(({ sectionSize, wireHeight }) => {
      const state = window.__CIRCUIT_STORE__
      if (state?.wiringFrom) {
        state.wiringFrom.segments = [
          {
            start: { x: sectionSize, y: wireHeight, z: -2 * sectionSize },
            end: { x: 2 * sectionSize, y: wireHeight, z: 4 },
            type: 'horizontal',
          },
        ]
      }
    }, { sectionSize: SECTION_SIZE, wireHeight: WIRE_HEIGHT })

    await page.evaluate(
      ({ gateId, pinId }) => {
        window.__CIRCUIT_ACTIONS__?.completeWiringFromJunction(gateId, pinId, 'input')
      },
      {
        gateId: gate4.id,
        pinId: `${gate4.id}-in-0`,
      }
    )

    await ensureWires(page, 3)

    // Verify all branch wires start at gate1
    const branchWire2 = await page.evaluate((gate4Id: string): {
      from: { type: string; entityId: string; pinId?: string }
    } | null => {
      const state = window.__CIRCUIT_STORE__
      const w = state?.wires.find((wire) => wire.to.entityId === gate4Id)
      if (!w) return null
      return { from: w.from }
    }, gate4.id)

    expect(branchWire2?.from.type).toBe('gate')
    expect(branchWire2?.from.entityId).toBe(gate1.id)
  })
})
