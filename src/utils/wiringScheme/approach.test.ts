/**
 * Unit tests for the per-pin approach builder (wire-routing Stage 1, B-003/B-004).
 */

import { describe, it, expect } from 'vitest'
import type { Position, PinOrientation } from './types'
import { SECTION_SIZE, WIRE_HEIGHT } from './types'
import { computePinApproach } from './approach'

const leftFacing: PinOrientation = { direction: { x: -1, y: 0, z: 0 } }

describe('computePinApproach', () => {
  it('routes to the section line on the pin row and ends the entry at the true pin', () => {
    const pin: Position = { x: -0.675, y: 0, z: 0.4 }
    const { routingEnd, segments } = computePinApproach(pin, leftFacing)

    // Confluence is on the chip-side section line at the pin's own Z (no detour).
    expect(routingEnd.x).toBe(Math.floor(pin.x / SECTION_SIZE) * SECTION_SIZE)
    expect(routingEnd.z).toBeCloseTo(pin.z, 6)
    expect(routingEnd.y).toBe(WIRE_HEIGHT)

    // Final segment is the entry, terminating exactly at the pin.
    const entry = segments[segments.length - 1]
    expect(entry.type).toBe('entry')
    expect(entry.end.x).toBeCloseTo(pin.x, 6)
    expect(entry.end.z).toBeCloseTo(pin.z, 6)
  })

  it('marks every approach segment as shareable (approach=true)', () => {
    const pin: Position = { x: -0.675, y: 0, z: 0 }
    const { segments } = computePinApproach(pin, leftFacing)
    expect(segments.length).toBeGreaterThan(0)
    expect(segments.every((s) => s.approach === true)).toBe(true)
  })

  it('keeps the per-pin lane strictly between the pin and its section line', () => {
    const pin: Position = { x: -0.675, y: 0, z: 0.4 }
    const sectionX = Math.floor(pin.x / SECTION_SIZE) * SECTION_SIZE
    const { segments } = computePinApproach(pin, leftFacing)
    const entry = segments[segments.length - 1]
    const laneX = entry.start.x
    // laneX lies between the pin and the section line (not past either end).
    expect(laneX).toBeLessThan(pin.x)
    expect(laneX).toBeGreaterThan(sectionX)
  })

  it('assigns distinct lanes to distinct pins on the same side', () => {
    // Five Mux4Way16-style pins, same X, 0.4 apart in Z.
    const pinZs = [-0.8, -0.4, 0, 0.4, 0.8]
    const laneXs = pinZs.map((z) => {
      const { segments } = computePinApproach({ x: -0.675, y: 0, z }, leftFacing)
      return Math.round(segments[segments.length - 1].start.x * 1000) / 1000
    })
    expect(new Set(laneXs).size).toBe(pinZs.length)
  })

  it('handles a vertical-facing pin symmetrically (row backbone)', () => {
    const pin: Position = { x: 0.4, y: 0, z: -0.675 }
    const downFacing: PinOrientation = { direction: { x: 0, y: 0, z: -1 } }
    const { routingEnd, segments } = computePinApproach(pin, downFacing)
    expect(routingEnd.z).toBe(Math.floor(pin.z / SECTION_SIZE) * SECTION_SIZE)
    expect(routingEnd.x).toBeCloseTo(pin.x, 6)
    const entry = segments[segments.length - 1]
    expect(entry.end.x).toBeCloseTo(pin.x, 6)
    expect(entry.end.z).toBeCloseTo(pin.z, 6)
  })
})
