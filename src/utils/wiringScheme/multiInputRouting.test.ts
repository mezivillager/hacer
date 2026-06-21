/**
 * Stage-1 wire-routing tests for dense multi-input chips (B-003/B-004).
 *
 * These exercise the router at the `core` level using the *real* pin geometry
 * of Project-1 chips, asserting that every input pin of a dense chip
 * (Mux4Way16 = 5 inputs, Mux8Way16 = 9 inputs) is routable — including
 * concurrently, with previously-routed wires present in `existingSegments`.
 *
 * Root cause (see docs/superpowers/specs/2026-06-21-wire-routing-stage1-design.md):
 * all input pins on a side share one world X and differ only in Z, so the
 * coarse-grid entry collapses them onto a single vertical section line and the
 * overlap check rejects the inner pins. Stage 1 gives each pin its own approach
 * lane so distinct pins resolve to distinct lanes (exclusivity preserved).
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

/** World-space position of a pin slot for a gate at `gatePos` (default rotation). */
function pinWorldPosition(gatePos: Position, slotPosition: [number, number, number]): Position {
  const local = new Vector3(slotPosition[0], slotPosition[1], slotPosition[2])
  local.applyEuler(GATE_ROTATION)
  return { x: gatePos.x + local.x, y: gatePos.y + local.y, z: gatePos.z + local.z }
}

/** World-space input-pin orientation (local -X) under the default rotation. */
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

describe('dense multi-input chip routing (B-003/B-004)', () => {
  // Source sits to the left of the chip so wires approach the input side.
  const gatePos: Position = { x: 0, y: 0, z: 0 }
  const source: Position = { x: -8, y: 0.2, z: 0 }
  const sourceOrientation = { direction: { x: 1, y: 0, z: 0 } }
  const dir = inputPinDirection()

  it('routes EACH Mux4Way16 input pin independently without throwing', () => {
    const slots = inputSlots('Mux4Way16')
    expect(slots).toHaveLength(5)

    for (const slot of slots) {
      const pin = pinWorldPosition(gatePos, slot.position)
      const path = calculateWirePath(
        source,
        { type: 'pin', pin, orientation: { direction: dir } },
        sourceOrientation,
        [],
        {},
      )
      expect(path.segments.length).toBeGreaterThan(0)
    }
  })

  // Each pin is wired from its own input node placed to the left of the chip,
  // fanned out in both X and Z (distinct section rows and columns) — the real
  // B-004 scenario where separate input nodes sit around the chip. Spreading in
  // both axes keeps each wire's trunk on its own column so we isolate the
  // pin-collapse fix (distinct per-pin lanes) rather than a shared-backbone
  // concern that belongs to a later routing stage.
  function sourceForPin(index: number): Position {
    return {
      x: -(SECTION_SIZE * (index + 2)),
      y: 0.2,
      z: index * SECTION_SIZE,
    }
  }

  it('routes ALL Mux4Way16 input pins concurrently (each avoids prior wires)', () => {
    const slots = inputSlots('Mux4Way16')
    const existing: WireSegment[] = []

    slots.forEach((slot, i) => {
      const pin = pinWorldPosition(gatePos, slot.position)
      const path = calculateWirePath(
        sourceForPin(i),
        { type: 'pin', pin, orientation: { direction: dir } },
        sourceOrientation,
        [],
        { existingSegments: existing },
      )
      expect(path.segments.length).toBeGreaterThan(0)
      // Path must actually reach the true pin coordinate.
      const last = path.segments[path.segments.length - 1]
      expect(last.end.x).toBeCloseTo(pin.x, 3)
      expect(last.end.z).toBeCloseTo(pin.z, 3)
      existing.push(...path.segments)
    })
  })

  it('routes ALL Mux8Way16 input pins concurrently (9 inputs)', () => {
    const slots = inputSlots('Mux8Way16')
    expect(slots).toHaveLength(9)
    const existing: WireSegment[] = []

    slots.forEach((slot, i) => {
      const pin = pinWorldPosition(gatePos, slot.position)
      const path = calculateWirePath(
        sourceForPin(i),
        { type: 'pin', pin, orientation: { direction: dir } },
        sourceOrientation,
        [],
        { existingSegments: existing },
      )
      expect(path.segments.length).toBeGreaterThan(0)
      const last = path.segments[path.segments.length - 1]
      expect(last.end.x).toBeCloseTo(pin.x, 3)
      expect(last.end.z).toBeCloseTo(pin.z, 3)
      existing.push(...path.segments)
    })
  })

  it('assigns distinct pins to distinct approach lanes (exclusivity preserved)', () => {
    const slots = inputSlots('Mux4Way16')
    const laneXs = new Set<number>()

    for (const slot of slots) {
      const pin = pinWorldPosition(gatePos, slot.position)
      const path = calculateWirePath(
        source,
        { type: 'pin', pin, orientation: { direction: dir } },
        sourceOrientation,
        [],
        {},
      )
      // The entry segment (last) runs horizontally into the pin from its lane.
      const entry = path.segments[path.segments.length - 1]
      laneXs.add(Math.round(entry.start.x * 1000) / 1000)
    }

    // Each of the 5 pins must escape on its own distinct lane line.
    expect(laneXs.size).toBe(slots.length)
  })

  // Genuine B-004 co-located scenario: all input nodes clustered to one side of
  // Mux4Way16, sources at x=-5 (between section lines -4 and -8) so ALL sources
  // exit onto the shared backbone column x=-4 (the chip-side section line).
  // Every wire's trunk runs along that backbone, so each later wire sees prior
  // wires' backbone segments (approach-tagged) in existingSegments.
  // The approach-vs-approach sharing must allow all pins to route without throwing.
  it('routes ALL Mux4Way16 inputs concurrently with co-located sources (B-004 genuine repro)', () => {
    const slots = inputSlots('Mux4Way16')
    const existing: WireSegment[] = []
    // Sources at x=-5 all exit to backbone x=-4; z varies by 0.4 (sub-section clustering)
    const colocatedSource = (i: number): Position => ({ x: -5, y: 0.2, z: i * 0.4 })

    slots.forEach((slot, i) => {
      const pin = pinWorldPosition(gatePos, slot.position)
      const path = calculateWirePath(
        colocatedSource(i),
        { type: 'pin', pin, orientation: { direction: dir } },
        sourceOrientation,
        [],
        { existingSegments: existing },
      )
      expect(path.segments.length).toBeGreaterThan(0)
      const last = path.segments[path.segments.length - 1]
      expect(last.end.x).toBeCloseTo(pin.x, 3)
      expect(last.end.z).toBeCloseTo(pin.z, 3)
      existing.push(...path.segments)
    })
  })

  it('routes a 2-input chip (And) unchanged — regression guard', () => {
    const slots = inputSlots('And')
    expect(slots).toHaveLength(2)

    for (const slot of slots) {
      const pin = pinWorldPosition(gatePos, slot.position)
      const path = calculateWirePath(
        source,
        { type: 'pin', pin, orientation: { direction: dir } },
        sourceOrientation,
        [],
        {},
      )
      expect(path.segments.length).toBeGreaterThan(0)
      const last = path.segments[path.segments.length - 1]
      expect(last.end.x).toBeCloseTo(pin.x, 3)
      expect(last.end.z).toBeCloseTo(pin.z, 3)
    }
  })

  it('routes a 1-input chip (Not) unchanged — regression guard', () => {
    const slots = inputSlots('Not')
    expect(slots).toHaveLength(1)
    const pin = pinWorldPosition(gatePos, slots[0].position)
    const path = calculateWirePath(
      source,
      { type: 'pin', pin, orientation: { direction: dir } },
      sourceOrientation,
      [],
      {},
    )
    expect(path.segments.length).toBeGreaterThan(0)
    const last = path.segments[path.segments.length - 1]
    expect(last.end.x).toBeCloseTo(pin.x, 3)
    expect(last.end.z).toBeCloseTo(pin.z, 3)
  })
})
