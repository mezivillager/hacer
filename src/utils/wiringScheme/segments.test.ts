import { describe, it, expect } from 'vitest'
import type { Position } from '@/store/types'
import type { PinOrientation, WireSegment } from './types'
import { SECTION_SIZE, WIRE_HEIGHT } from './types'
import { calculateExitSegment, calculateEntrySegment, collectWireSegments } from './segments'
import type { Wire } from '@/store/types'

describe('WiringScheme Segments Module', () => {
  const createPosition = (x: number, y: number, z: number): Position => ({ x, y, z })

  describe('calculateExitSegment', () => {
    it('creates exit segment from pin center to nearest section line (horizontal pin, positive X)', () => {
      const pinCenter = createPosition(1.4, 0.2, 2.0)
      const orientation: PinOrientation = { direction: { x: 1, y: 0, z: 0 } }

      const segment = calculateExitSegment(pinCenter, orientation)

      expect(segment.type).toBe('exit')
      expect(segment.start.x).toBeCloseTo(pinCenter.x, 3)
      expect(segment.start.y).toBe(WIRE_HEIGHT)
      expect(segment.start.z).toBeCloseTo(pinCenter.z, 3)

      // Should extend to next section line in positive X direction (4.0)
      expect(segment.end.x).toBe(4.0)
      expect(segment.end.y).toBe(WIRE_HEIGHT)
      expect(segment.end.z).toBeCloseTo(pinCenter.z, 3)
    })

    it('creates exit segment from pin center to nearest section line (horizontal pin, negative X)', () => {
      const pinCenter = createPosition(5.4, 0.2, 2.0)
      const orientation: PinOrientation = { direction: { x: -1, y: 0, z: 0 } }

      const segment = calculateExitSegment(pinCenter, orientation)

      expect(segment.type).toBe('exit')
      // Should extend to previous section line in negative X direction (4.0)
      expect(segment.end.x).toBe(4.0)
      expect(segment.end.y).toBe(WIRE_HEIGHT)
      expect(segment.end.z).toBeCloseTo(pinCenter.z, 3)
    })

    it('creates exit segment from pin center to nearest section line (vertical pin, positive Z)', () => {
      const pinCenter = createPosition(2.0, 0.2, 1.4)
      const orientation: PinOrientation = { direction: { x: 0, y: 0, z: 1 } }

      const segment = calculateExitSegment(pinCenter, orientation)

      expect(segment.type).toBe('exit')
      expect(segment.start.x).toBeCloseTo(pinCenter.x, 3)
      expect(segment.start.y).toBe(WIRE_HEIGHT)
      expect(segment.start.z).toBeCloseTo(pinCenter.z, 3)

      // Should extend to next section line in positive Z direction (4.0)
      expect(segment.end.x).toBeCloseTo(pinCenter.x, 3)
      expect(segment.end.y).toBe(WIRE_HEIGHT)
      expect(segment.end.z).toBe(4.0)
    })

    it('creates exit segment from pin center to nearest section line (vertical pin, negative Z)', () => {
      const pinCenter = createPosition(2.0, 0.2, 5.4)
      const orientation: PinOrientation = { direction: { x: 0, y: 0, z: -1 } }

      const segment = calculateExitSegment(pinCenter, orientation)

      expect(segment.type).toBe('exit')
      // Should extend to previous section line in negative Z direction (4.0)
      expect(segment.end.x).toBeCloseTo(pinCenter.x, 3)
      expect(segment.end.y).toBe(WIRE_HEIGHT)
      expect(segment.end.z).toBe(4.0)
    })

    it('exit segment end is always on a section line (X-axis)', () => {
      const pinCenter = createPosition(1.4, 0.2, 2.0)
      const orientation: PinOrientation = { direction: { x: 1, y: 0, z: 0 } }

      const segment = calculateExitSegment(pinCenter, orientation)

      // Section lines are at multiples of SECTION_SIZE (4.0)
      const remainder = Math.abs(segment.end.x % SECTION_SIZE)
      expect(remainder < 0.001 || Math.abs(remainder - SECTION_SIZE) < 0.001).toBe(true)
    })

    it('exit segment end is always on a section line (Z-axis)', () => {
      const pinCenter = createPosition(2.0, 0.2, 1.4)
      const orientation: PinOrientation = { direction: { x: 0, y: 0, z: 1 } }

      const segment = calculateExitSegment(pinCenter, orientation)

      // Section lines are at multiples of SECTION_SIZE (4.0)
      const remainder = Math.abs(segment.end.z % SECTION_SIZE)
      expect(remainder < 0.001 || Math.abs(remainder - SECTION_SIZE) < 0.001).toBe(true)
    })

    it('exit segment preserves Y coordinate at WIRE_HEIGHT', () => {
      const pinCenter = createPosition(1.4, 0.2, 2.0)
      const orientation: PinOrientation = { direction: { x: 1, y: 0, z: 0 } }

      const segment = calculateExitSegment(pinCenter, orientation)

      expect(segment.start.y).toBe(WIRE_HEIGHT)
      expect(segment.end.y).toBe(WIRE_HEIGHT)
    })

    it('exit segment extends in correct direction based on pin orientation', () => {
      const pinCenter = createPosition(1.5, 0.2, 2.0) // Between 0 and 4
      const orientationPositive: PinOrientation = { direction: { x: 1, y: 0, z: 0 } }
      const orientationNegative: PinOrientation = { direction: { x: -1, y: 0, z: 0 } }

      const segmentPositive = calculateExitSegment(pinCenter, orientationPositive)
      const segmentNegative = calculateExitSegment(pinCenter, orientationNegative)

      // Positive X should go to 4.0, negative X should go to 0.0
      expect(segmentPositive.end.x).toBe(4.0)
      expect(segmentNegative.end.x).toBe(0.0)
    })
  })

  describe('calculateEntrySegment', () => {
    it('creates entry segment from section line to pin center (horizontal pin, positive X)', () => {
      const pinCenter = createPosition(5.4, 0.2, 2.0)
      const orientation: PinOrientation = { direction: { x: 1, y: 0, z: 0 } }

      const segment = calculateEntrySegment(pinCenter, orientation)

      expect(segment.type).toBe('entry')
      expect(segment.end.x).toBeCloseTo(pinCenter.x, 3)
      expect(segment.end.y).toBe(WIRE_HEIGHT)
      expect(segment.end.z).toBeCloseTo(pinCenter.z, 3)

      // Should start from section line in same direction pin faces (to the right, 8.0)
      expect(segment.start.x).toBe(8.0)
      expect(segment.start.y).toBe(WIRE_HEIGHT)
      expect(segment.start.z).toBeCloseTo(pinCenter.z, 3)
    })

    it('creates entry segment from section line to pin center (horizontal pin, negative X)', () => {
      const pinCenter = createPosition(1.4, 0.2, 2.0)
      const orientation: PinOrientation = { direction: { x: -1, y: 0, z: 0 } }

      const segment = calculateEntrySegment(pinCenter, orientation)

      expect(segment.type).toBe('entry')
      // Should start from section line in same direction pin faces (to the left, 0.0)
      expect(segment.start.x).toBe(0.0)
      expect(segment.start.y).toBe(WIRE_HEIGHT)
      expect(segment.start.z).toBeCloseTo(pinCenter.z, 3)
    })

    it('creates entry segment from section line to pin center (vertical pin, positive Z)', () => {
      const pinCenter = createPosition(2.0, 0.2, 5.4)
      const orientation: PinOrientation = { direction: { x: 0, y: 0, z: 1 } }

      const segment = calculateEntrySegment(pinCenter, orientation)

      expect(segment.type).toBe('entry')
      expect(segment.end.x).toBeCloseTo(pinCenter.x, 3)
      expect(segment.end.y).toBe(WIRE_HEIGHT)
      expect(segment.end.z).toBeCloseTo(pinCenter.z, 3)

      // Should start from section line in same direction pin faces (forward, 8.0)
      expect(segment.start.x).toBeCloseTo(pinCenter.x, 3)
      expect(segment.start.y).toBe(WIRE_HEIGHT)
      expect(segment.start.z).toBe(8.0)
    })

    it('creates entry segment from section line to pin center (vertical pin, negative Z)', () => {
      const pinCenter = createPosition(2.0, 0.2, 1.4)
      const orientation: PinOrientation = { direction: { x: 0, y: 0, z: -1 } }

      const segment = calculateEntrySegment(pinCenter, orientation)

      expect(segment.type).toBe('entry')
      // Should start from section line in same direction pin faces (backward, 0.0)
      expect(segment.start.x).toBeCloseTo(pinCenter.x, 3)
      expect(segment.start.y).toBe(WIRE_HEIGHT)
      expect(segment.start.z).toBe(0.0)
    })

    it('entry segment start is always on a section line (X-axis)', () => {
      const pinCenter = createPosition(5.4, 0.2, 2.0)
      const orientation: PinOrientation = { direction: { x: 1, y: 0, z: 0 } }

      const segment = calculateEntrySegment(pinCenter, orientation)

      // Section lines are at multiples of SECTION_SIZE (4.0)
      const remainder = Math.abs(segment.start.x % SECTION_SIZE)
      expect(remainder < 0.001 || Math.abs(remainder - SECTION_SIZE) < 0.001).toBe(true)
    })

    it('entry segment start is always on a section line (Z-axis)', () => {
      const pinCenter = createPosition(2.0, 0.2, 5.4)
      const orientation: PinOrientation = { direction: { x: 0, y: 0, z: 1 } }

      const segment = calculateEntrySegment(pinCenter, orientation)

      // Section lines are at multiples of SECTION_SIZE (4.0)
      const remainder = Math.abs(segment.start.z % SECTION_SIZE)
      expect(remainder < 0.001 || Math.abs(remainder - SECTION_SIZE) < 0.001).toBe(true)
    })

    it('entry segment preserves Y coordinate at WIRE_HEIGHT', () => {
      const pinCenter = createPosition(5.4, 0.2, 2.0)
      const orientation: PinOrientation = { direction: { x: 1, y: 0, z: 0 } }

      const segment = calculateEntrySegment(pinCenter, orientation)

      expect(segment.start.y).toBe(WIRE_HEIGHT)
      expect(segment.end.y).toBe(WIRE_HEIGHT)
    })

    it('entry and exit segments connect to section lines correctly', () => {
      const pinCenter = createPosition(1.4, 0.2, 2.0)
      const orientation: PinOrientation = { direction: { x: 1, y: 0, z: 0 } }

      const exitSegment = calculateExitSegment(pinCenter, orientation)
      const entrySegment = calculateEntrySegment(pinCenter, orientation)

      // Exit segment should end on a section line
      const exitEndXRemainder = Math.abs(exitSegment.end.x % SECTION_SIZE)
      expect(exitEndXRemainder < 0.001 || Math.abs(exitEndXRemainder - SECTION_SIZE) < 0.001).toBe(true)

      // Entry segment should start on a section line
      const entryStartXRemainder = Math.abs(entrySegment.start.x % SECTION_SIZE)
      expect(entryStartXRemainder < 0.001 || Math.abs(entryStartXRemainder - SECTION_SIZE) < 0.001).toBe(true)
    })

    it('handles pin exactly on section line correctly', () => {
      const pinCenter = createPosition(4.0, 0.2, 4.0) // Exactly on section line intersection
      const orientation: PinOrientation = { direction: { x: 1, y: 0, z: 0 } }

      const exitSegment = calculateExitSegment(pinCenter, orientation)
      const entrySegment = calculateEntrySegment(pinCenter, orientation)

      // Should still create valid segments
      expect(exitSegment.end.x).toBe(4.0) // Should go to next section line (8.0) or stay at 4.0?
      expect(entrySegment.start.x).toBeDefined()
    })
  })

  describe('collectWireSegments', () => {
    const createWireSegment = (start: Position, end: Position, type: WireSegment['type'] = 'horizontal'): WireSegment => ({
      start,
      end,
      type,
    })

    const createWire = (id: string, segments: WireSegment[]): Wire => ({
      id,
      fromGateId: `gate-${id}`,
      fromPinId: `pin-${id}`,
      toGateId: `gate-to-${id}`,
      toPinId: `pin-to-${id}`,
      segments,
    })

    it('collects segments from all wires', () => {
      const segment1 = createWireSegment({ x: 0, y: 0.2, z: 0 }, { x: 4, y: 0.2, z: 0 })
      const segment2 = createWireSegment({ x: 4, y: 0.2, z: 0 }, { x: 8, y: 0.2, z: 0 })
      const segment3 = createWireSegment({ x: 0, y: 0.2, z: 4 }, { x: 0, y: 0.2, z: 8 }, 'vertical')

      const wire1 = createWire('wire-1', [segment1, segment2])
      const wire2 = createWire('wire-2', [segment3])

      const wires: Wire[] = [wire1, wire2]
      const collected = collectWireSegments(wires)

      expect(collected).toHaveLength(3)
      expect(collected).toContainEqual(segment1)
      expect(collected).toContainEqual(segment2)
      expect(collected).toContainEqual(segment3)
    })

    it('returns empty array when no wires provided', () => {
      const collected = collectWireSegments([])
      expect(collected).toEqual([])
    })

    it('skips wires with no segments', () => {
      const wire1 = createWire('wire-1', [])
      const wire2 = createWire('wire-2', [createWireSegment({ x: 0, y: 0.2, z: 0 }, { x: 4, y: 0.2, z: 0 })])

      const wires: Wire[] = [wire1, wire2]
      const collected = collectWireSegments(wires)

      expect(collected).toHaveLength(1)
      expect(collected[0]).toEqual(wire2.segments[0])
    })

    it('filters wires when filterFn is provided', () => {
      const segment1 = createWireSegment({ x: 0, y: 0.2, z: 0 }, { x: 4, y: 0.2, z: 0 })
      const segment2 = createWireSegment({ x: 4, y: 0.2, z: 0 }, { x: 8, y: 0.2, z: 0 })

      const wire1 = createWire('wire-1', [segment1])
      const wire2 = createWire('wire-2', [segment2])

      const wires: Wire[] = [wire1, wire2]
      const collected = collectWireSegments(wires, (wire) => wire.id === 'wire-1')

      expect(collected).toHaveLength(1)
      expect(collected[0]).toEqual(segment1)
    })

    it('returns empty array when filterFn excludes all wires', () => {
      const wire1 = createWire('wire-1', [createWireSegment({ x: 0, y: 0.2, z: 0 }, { x: 4, y: 0.2, z: 0 })])

      const wires: Wire[] = [wire1]
      const collected = collectWireSegments(wires, () => false)

      expect(collected).toEqual([])
    })
  })
})

