/**
 * Lane-level exclusivity / nudging (closes CASE1).
 *
 * CASE1 false-negative: an unrelated net's ordinary trunk rides collinearly over
 * a chip's approach backbone on the SAME physical orthogonal track, so the two
 * nets visually merge. The current router (commit 3e72c10) ALLOWS this — a
 * non-approach segment may share an approach backbone's exact line.
 *
 * The fix nudges the transiting trunk onto its own parallel lane (a small offset
 * from the section line) so the two wires physically coexist without merging,
 * while still letting the trunk transit (it is never blocked for lack of a
 * corner — it gets its own lane instead).
 *
 * These tests build the CASE1 geometry at the `core` level with real Project-1
 * pin geometry and assert physical exclusivity: no two distinct nets occupy the
 * same orthogonal track over an overlapping range.
 */

import { describe, it, expect } from 'vitest'
import { Vector3, Euler } from 'three'
import type { Position } from '@/store/types'
import type { WireSegment } from './types'
import { SECTION_SIZE } from './types'
import { computeChipLayout } from '@/components/scene/chipBodyLayout'
import { getBuiltinChipRegistry } from '@/core/chips/appRegistry'
import { calculateWirePath } from './core'

const GATE_ROTATION = new Euler(Math.PI / 2, 0, 0, 'XYZ')

function pinWorldPosition(gatePos: Position, slotPosition: [number, number, number]): Position {
  const local = new Vector3(slotPosition[0], slotPosition[1], slotPosition[2])
  local.applyEuler(GATE_ROTATION)
  return { x: gatePos.x + local.x, y: gatePos.y + local.y, z: gatePos.z + local.z }
}

function inputPinDirection(): { x: number; y: number; z: number } {
  const dir = new Vector3(-1, 0, 0)
  dir.applyEuler(GATE_ROTATION)
  return { x: dir.x, y: dir.y, z: dir.z }
}

function inputSlots(chipName: string, gateId = 'g1') {
  const chip = getBuiltinChipRegistry().get(chipName)
  if (!chip) throw new Error(`chip ${chipName} not registered`)
  return computeChipLayout(chip, gateId).pinSlots.filter((s) => s.side === 'input')
}

/** Vertical routing segments (constant x, varying z) of a path. */
function verticalRoutingSegments(segs: WireSegment[]): WireSegment[] {
  return segs.filter(
    (s) =>
      (s.type === 'vertical' || s.type === 'horizontal') &&
      Math.abs(s.start.x - s.end.x) < 0.001 &&
      Math.abs(s.start.z - s.end.z) > 0.001,
  )
}

/** Whether a coordinate is on a coarse section line. */
function onSectionLine(coord: number): boolean {
  return Math.abs(coord - Math.round(coord / SECTION_SIZE) * SECTION_SIZE) < 0.001
}

describe('lane-level exclusivity (CASE1)', () => {
  const gatePos: Position = { x: 0, y: 0, z: 0 }
  const dir = inputPinDirection()
  const sourceOri = { direction: { x: 1, y: 0, z: 0 } }

  it('nudges an unrelated transit trunk off a chip approach backbone (CASE1 closed)', () => {
    // 1. Wire a Mux4Way16 input pin. Its fan-in runs vertically along the
    //    chip-side backbone column x = -4 (the confluence backbone, tagged
    //    approach with confluenceCoord = -4).
    const slots = inputSlots('Mux4Way16')
    const chipPin = pinWorldPosition(gatePos, slots[0].position) // z = -0.8
    const chipWire = calculateWirePath(
      { x: -8, y: 0.2, z: -4 },
      { type: 'pin', pin: chipPin, orientation: { direction: dir } },
      sourceOri,
      [],
      {},
    )
    // Sanity: the chip wire has an approach backbone on x = -4.
    const backbone = chipWire.segments.find(
      (s) => s.approach && s.confluenceCoord !== undefined && Math.abs(s.start.x - -4) < 0.001,
    )
    expect(backbone).toBeDefined()

    // 2. An UNRELATED net (different signal) whose trunk must transit the same
    //    x = -4 column to reach a pin on the far side. It exits at z = -2 and
    //    must run vertically along x = -4 over a z-range that overlaps the chip
    //    backbone's range (z ∈ [-4, -0.8]).
    const farPin: Position = { x: 7.325, y: 0.2, z: -0.8 }
    const trunk = calculateWirePath(
      { x: -7.325, y: 0.2, z: -2 },
      { type: 'pin', pin: farPin, orientation: { direction: { x: -1, y: 0, z: 0 } } },
      sourceOri,
      [],
      { existingSegments: chipWire.segments },
    )

    // The transit trunk's vertical run must NOT sit on the exact backbone line
    // x = -4 — it must be nudged onto its own parallel lane. (RED on current
    // code: the trunk rides x = -4 collinearly with the chip backbone.)
    const trunkVerticals = verticalRoutingSegments(trunk.segments)
    const onBackboneLine = trunkVerticals.filter((s) => Math.abs(s.start.x - -4) < 0.001)

    // No transit vertical may share the exact backbone column.
    expect(onBackboneLine).toHaveLength(0)

    // And the trunk must still route (it gets a lane, never blocked).
    expect(trunk.segments.length).toBeGreaterThan(0)
    // It still reaches the true pin.
    const last = trunk.segments[trunk.segments.length - 1]
    expect(last.end.x).toBeCloseTo(farPin.x, 3)
    expect(last.end.z).toBeCloseTo(farPin.z, 3)
  })

  it('nudged transit lane is off-grid and deterministic across re-routes', () => {
    const slots = inputSlots('Mux4Way16')
    const chipPin = pinWorldPosition(gatePos, slots[0].position)
    const chipWire = calculateWirePath(
      { x: -8, y: 0.2, z: -4 },
      { type: 'pin', pin: chipPin, orientation: { direction: dir } },
      sourceOri,
      [],
      {},
    )
    const farPin: Position = { x: 7.325, y: 0.2, z: -0.8 }
    const routeOnce = () =>
      calculateWirePath(
        { x: -7.325, y: 0.2, z: -2 },
        { type: 'pin', pin: farPin, orientation: { direction: { x: -1, y: 0, z: 0 } } },
        sourceOri,
        [],
        { existingSegments: chipWire.segments },
      )

    const a = routeOnce()
    const b = routeOnce()

    // The transit vertical run is on an off-grid lane (not a section line).
    const aVert = verticalRoutingSegments(a.segments).find((s) => Math.abs(s.start.x - -4) < 1.0)
    expect(aVert).toBeDefined()
    expect(onSectionLine(aVert!.start.x)).toBe(false)

    // Same circuit → same lane (determinism / stable re-routes).
    const bVert = verticalRoutingSegments(b.segments).find((s) => Math.abs(s.start.x - -4) < 1.0)
    expect(bVert!.start.x).toBeCloseTo(aVert!.start.x, 6)
  })

  it('does NOT nudge the chip fan-in bus (owner keeps lane 0; B-003/B-004 unaffected)', () => {
    // All pins of one chip share one confluence — they are owners on lane 0 and
    // must keep riding the exact backbone column (the legitimate fan-in bus).
    const slots = inputSlots('Mux4Way16')
    const existing: WireSegment[] = []
    for (let i = 0; i < slots.length; i++) {
      const pin = pinWorldPosition(gatePos, slots[i].position)
      const path = calculateWirePath(
        { x: -8, y: 0.2, z: -4 - i * SECTION_SIZE },
        { type: 'pin', pin, orientation: { direction: dir } },
        sourceOri,
        [],
        { existingSegments: existing },
      )
      // Each pin's approach backbone segment stays exactly on x = -4 (lane 0).
      const ownBackbone = path.segments.find(
        (s) => s.approach && s.confluenceCoord !== undefined,
      )
      expect(ownBackbone).toBeDefined()
      expect(Math.abs(ownBackbone!.start.x - -4)).toBeLessThan(0.001)
      existing.push(...path.segments)
    }
  })
})
