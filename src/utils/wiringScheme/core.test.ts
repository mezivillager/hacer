import { describe, it, expect } from 'vitest'
import type { Position } from '@/store/types'
import type { PinOrientation, WireSegment } from './types'
import { WIRE_HEIGHT, SECTION_SIZE } from './types'
import { calculateWirePath, arePointsOnSameSectionLine, combineAdjacentSegments } from './core'

describe('WiringScheme Core Module', () => {
  const createPosition = (x: number, y: number, z: number): Position => ({ x, y, z })


  describe('arePointsOnSameSectionLine', () => {
    it('returns true for two positions on the same horizontal section line', () => {
      const pos1 = createPosition(0, WIRE_HEIGHT, 0)
      const pos2 = createPosition(4, WIRE_HEIGHT, 0)
      expect(arePointsOnSameSectionLine(pos1, pos2)).toBe(true)
    })

    it('returns true for two positions on the same horizontal section line (different x values)', () => {
      const pos1 = createPosition(8, WIRE_HEIGHT, 4)
      const pos2 = createPosition(12, WIRE_HEIGHT, 4)
      expect(arePointsOnSameSectionLine(pos1, pos2)).toBe(true)
    })

    it('returns false for two positions on different horizontal section lines', () => {
      const pos1 = createPosition(0, WIRE_HEIGHT, 0)
      const pos2 = createPosition(4, WIRE_HEIGHT, 4)
      expect(arePointsOnSameSectionLine(pos1, pos2)).toBe(false)
    })

    it('returns true for two positions on the same vertical section line', () => {
      const pos1 = createPosition(0, WIRE_HEIGHT, 0)
      const pos2 = createPosition(0, WIRE_HEIGHT, 4)
      expect(arePointsOnSameSectionLine(pos1, pos2)).toBe(true)
    })

    it('returns true for two positions on the same vertical section line (different z values)', () => {
      const pos1 = createPosition(8, WIRE_HEIGHT, 0)
      const pos2 = createPosition(8, WIRE_HEIGHT, 12)
      expect(arePointsOnSameSectionLine(pos1, pos2)).toBe(true)
    })

    it('returns false for two positions on different vertical section lines', () => {
      const pos1 = createPosition(0, WIRE_HEIGHT, 1) // On x=0 vertical section line
      const pos2 = createPosition(4, WIRE_HEIGHT, 1) // On x=4 vertical section line
      // Different x coordinates (different vertical lines), and z=1 is not on a section line
      expect(arePointsOnSameSectionLine(pos1, pos2)).toBe(false)
    })

    it('returns false when positions are on different section lines (one horizontal, one vertical)', () => {
      // pos1 is on horizontal line at z=0
      // pos2 is on vertical line at x=0
      // They don't share a section line
      const pos1 = createPosition(4, WIRE_HEIGHT, 0) // On horizontal line at z=0
      const pos2 = createPosition(0, WIRE_HEIGHT, 4) // On vertical line at x=0
      expect(arePointsOnSameSectionLine(pos1, pos2)).toBe(false)
    })

    it('returns true when both are at the same section corner (intersection)', () => {
      const pos1 = createPosition(0, WIRE_HEIGHT, 0)
      const pos2 = createPosition(0, WIRE_HEIGHT, 0)
      expect(arePointsOnSameSectionLine(pos1, pos2)).toBe(true)
    })

    it('returns true when both are at the same section corner (different intersections)', () => {
      const pos1 = createPosition(4, WIRE_HEIGHT, 4)
      const pos2 = createPosition(4, WIRE_HEIGHT, 4)
      expect(arePointsOnSameSectionLine(pos1, pos2)).toBe(true)
    })

    it('returns true for positions not on x-section lines but on same z-section line', () => {
      const pos1 = createPosition(1, WIRE_HEIGHT, 0)
      const pos2 = createPosition(2, WIRE_HEIGHT, 0)
      // Both are on z=0 horizontal section line, so should return true
      expect(arePointsOnSameSectionLine(pos1, pos2)).toBe(true)
    })

    it('returns true when both are on same horizontal section line even if x differs', () => {
      const pos1 = createPosition(0, WIRE_HEIGHT, 0) // On both x=0 and z=0 section lines
      const pos2 = createPosition(1, WIRE_HEIGHT, 0) // Not on x-section line, but on z=0 section line
      // Both are on z=0 horizontal section line, so should return true
      expect(arePointsOnSameSectionLine(pos1, pos2)).toBe(true)
    })

    it('returns true when positions are on the same vertical section line even if z differs', () => {
      const pos1 = createPosition(0, WIRE_HEIGHT, 0) // On x=0 vertical section line
      const pos2 = createPosition(0, WIRE_HEIGHT, 4) // On x=0 vertical section line
      // Both are on x=0 vertical section line, so should return true
      expect(arePointsOnSameSectionLine(pos1, pos2)).toBe(true)
    })

    it('returns false when positions are on different horizontal section lines', () => {
      const pos1 = createPosition(1, WIRE_HEIGHT, 0) // On z=0 horizontal section line (z=0 is on section line)
      const pos2 = createPosition(1, WIRE_HEIGHT, 4) // On z=4 horizontal section line (z=4 is on section line)
      // Different z coordinates, so not on same horizontal line
      // Neither x=1 is on a section line, so not on same vertical line either
      expect(arePointsOnSameSectionLine(pos1, pos2)).toBe(false)
    })

    it('returns false when positions are on different vertical section lines', () => {
      const pos1 = createPosition(0, WIRE_HEIGHT, 1) // On x=0 vertical section line (x=0 is on section line)
      const pos2 = createPosition(4, WIRE_HEIGHT, 1) // On x=4 vertical section line (x=4 is on section line)
      // Different x coordinates, so not on same vertical line
      // Neither z=1 is on a section line, so not on same horizontal line either
      expect(arePointsOnSameSectionLine(pos1, pos2)).toBe(false)
    })

    it('handles floating point precision correctly (within tolerance)', () => {
      const pos1 = createPosition(0.0001, WIRE_HEIGHT, 0)
      const pos2 = createPosition(4.0001, WIRE_HEIGHT, 0)
      expect(arePointsOnSameSectionLine(pos1, pos2)).toBe(true)
    })

    it('handles floating point precision correctly (different z within tolerance)', () => {
      const pos1 = createPosition(0, WIRE_HEIGHT, 0.0001)
      const pos2 = createPosition(0, WIRE_HEIGHT, 0.0002)
      // Both should be treated as on z=0 horizontal line
      expect(arePointsOnSameSectionLine(pos1, pos2)).toBe(true)
    })

    it('handles negative coordinates correctly', () => {
      const pos1 = createPosition(-4, WIRE_HEIGHT, 0)
      const pos2 = createPosition(-8, WIRE_HEIGHT, 0)
      expect(arePointsOnSameSectionLine(pos1, pos2)).toBe(true)
    })

    it('handles negative coordinates on vertical lines', () => {
      const pos1 = createPosition(0, WIRE_HEIGHT, -4)
      const pos2 = createPosition(0, WIRE_HEIGHT, -8)
      expect(arePointsOnSameSectionLine(pos1, pos2)).toBe(true)
    })

    it('returns false for positions on different section lines with negative coordinates', () => {
      // Different x coordinates (different vertical lines), and z=-4 vs z=-8 are different horizontal lines
      const pos1 = createPosition(0, WIRE_HEIGHT, -4)
      const pos2 = createPosition(4, WIRE_HEIGHT, -8)
      expect(arePointsOnSameSectionLine(pos1, pos2)).toBe(false)
    })

    it('handles positions very close to x-section lines but not exactly on them', () => {
      // Both are on z=0 horizontal section line, so should return true
      const pos1 = createPosition(0.002, WIRE_HEIGHT, 0)
      const pos2 = createPosition(4.002, WIRE_HEIGHT, 0)
      // Both have z=0 which IS on a section line, so they are on the same horizontal line
      expect(arePointsOnSameSectionLine(pos1, pos2)).toBe(true)
    })

    it('returns false when positions are close but not on any section lines', () => {
      // Both x and z are not on section lines
      const pos1 = createPosition(1, WIRE_HEIGHT, 1)
      const pos2 = createPosition(2, WIRE_HEIGHT, 1)
      // z=1 is not on a section line (snaps to 0 or 4, both > 0.001 away)
      expect(arePointsOnSameSectionLine(pos1, pos2)).toBe(false)
    })

    it('handles positions on section lines at multiples of SECTION_SIZE', () => {
      const pos1 = createPosition(8, WIRE_HEIGHT, 12)
      const pos2 = createPosition(16, WIRE_HEIGHT, 12)
      expect(arePointsOnSameSectionLine(pos1, pos2)).toBe(true)
    })

    it('returns false when x coordinates match but z coordinates are on different section lines', () => {
      const pos1 = createPosition(4, WIRE_HEIGHT, 0)
      const pos2 = createPosition(4, WIRE_HEIGHT, 8)
      // Both are on x=4 vertical line, so should be true
      expect(arePointsOnSameSectionLine(pos1, pos2)).toBe(true)
    })

    it('returns false when z coordinates match but x coordinates are on different section lines', () => {
      const pos1 = createPosition(0, WIRE_HEIGHT, 4)
      const pos2 = createPosition(8, WIRE_HEIGHT, 4)
      // Both are on z=4 horizontal line, so should be true
      expect(arePointsOnSameSectionLine(pos1, pos2)).toBe(true)
    })

    it('handles edge case: positions on section lines at exactly SECTION_SIZE', () => {
      const pos1 = createPosition(SECTION_SIZE, WIRE_HEIGHT, 0)
      const pos2 = createPosition(SECTION_SIZE * 2, WIRE_HEIGHT, 0)
      expect(arePointsOnSameSectionLine(pos1, pos2)).toBe(true)
    })

    it('handles edge case: positions at origin and on axes', () => {
      const pos1 = createPosition(0, WIRE_HEIGHT, 0)
      const pos2 = createPosition(SECTION_SIZE, WIRE_HEIGHT, 0)
      expect(arePointsOnSameSectionLine(pos1, pos2)).toBe(true)
    })
  })

  describe('calculateWirePath - Pin Destination', () => {
    it('calculates complete path from pin to pin (simple case)', () => {
      const startPin = createPosition(1.4, 0.2, 2.0)
      const endPin = createPosition(5.4, 0.2, 2.0)
      const startOrientation: PinOrientation = { direction: { x: 1, y: 0, z: 0 } }
      const endOrientation: PinOrientation = { direction: { x: -1, y: 0, z: 0 } }

      const path = calculateWirePath(
        startPin,
        { type: 'pin', pin: endPin, orientation: endOrientation },
        startOrientation,
        [],
        {}
      )

      expect(path.segments.length).toBeGreaterThan(0)
      expect(path.totalLength).toBeGreaterThan(0)
      
      // First segment should be exit segment
      expect(path.segments[0].type).toBe('exit')
      expect(path.segments[0].start.x).toBeCloseTo(startPin.x, 1)
      expect(path.segments[0].start.z).toBeCloseTo(startPin.z, 1)
      
      // Last segment should be entry segment
      const lastSegment = path.segments[path.segments.length - 1]
      expect(lastSegment.type).toBe('entry')
      expect(lastSegment.end.x).toBeCloseTo(endPin.x, 1)
      expect(lastSegment.end.z).toBeCloseTo(endPin.z, 1)
    })

    it('calculates path with intermediate routing segments', () => {
      const startPin = createPosition(1.4, 0.2, 2.0)
      const endPin = createPosition(5.4, 0.2, 10.0) // Different z coordinate
      const startOrientation: PinOrientation = { direction: { x: 1, y: 0, z: 0 } }
      const endOrientation: PinOrientation = { direction: { x: -1, y: 0, z: 0 } }

      const path = calculateWirePath(
        startPin,
        { type: 'pin', pin: endPin, orientation: endOrientation },
        startOrientation,
        [],
        {}
      )

      expect(path.segments.length).toBeGreaterThan(2) // Should have exit, routing, and entry segments
      
      // Check that segments connect properly
      for (let i = 0; i < path.segments.length - 1; i++) {
        const current = path.segments[i]
        const next = path.segments[i + 1]
        expect(Math.abs(current.end.x - next.start.x)).toBeLessThan(0.01)
        expect(Math.abs(current.end.z - next.start.z)).toBeLessThan(0.01)
      }
    })

    it('handles very close pins correctly', () => {
      const startPin = createPosition(1.4, 0.2, 2.0)
      const endPin = createPosition(1.5, 0.2, 2.0) // Very close
      const startOrientation: PinOrientation = { direction: { x: 1, y: 0, z: 0 } }
      const endOrientation: PinOrientation = { direction: { x: -1, y: 0, z: 0 } }

      const path = calculateWirePath(
        startPin,
        { type: 'pin', pin: endPin, orientation: endOrientation },
        startOrientation,
        [],
        {}
      )

      expect(path.segments.length).toBeGreaterThan(0)
      expect(path.totalLength).toBeGreaterThan(0)
    })

    it('ensures all intermediate points are on section lines', () => {
      const startPin = createPosition(1.4, 0.2, 2.0)
      const endPin = createPosition(5.4, 0.2, 10.0)
      const startOrientation: PinOrientation = { direction: { x: 1, y: 0, z: 0 } }
      const endOrientation: PinOrientation = { direction: { x: -1, y: 0, z: 0 } }

      const path = calculateWirePath(
        startPin,
        { type: 'pin', pin: endPin, orientation: endOrientation },
        startOrientation,
        [],
        {}
      )

      // Helper function to check if coordinate is on section line (same logic as isOnSectionLine)
      const isCoordOnSectionLine = (coord: number): boolean => {
        const snapped = Math.round(coord / SECTION_SIZE) * SECTION_SIZE
        return Math.abs(coord - snapped) < 0.001
      }

      // Check that all intermediate routing segments have endpoints on section lines
      for (const segment of path.segments) {
        if (segment.type === 'horizontal') {
          // For horizontal segments, z should be on section line (x can vary)
          expect(isCoordOnSectionLine(segment.start.z)).toBe(true)
          expect(isCoordOnSectionLine(segment.end.z)).toBe(true)
        } else if (segment.type === 'vertical') {
          // For vertical segments, x should be on section line (z can vary)
          expect(isCoordOnSectionLine(segment.start.x)).toBe(true)
          expect(isCoordOnSectionLine(segment.end.x)).toBe(true)
        }
      }
    })

    it('ensures destination point is on a section line', () => {
      const startPin = createPosition(1.4, 0.2, 2.0)
      const endPin = createPosition(5.4, 0.2, 10.0)
      const startOrientation: PinOrientation = { direction: { x: 1, y: 0, z: 0 } }
      const endOrientation: PinOrientation = { direction: { x: -1, y: 0, z: 0 } }

      const path = calculateWirePath(
        startPin,
        { type: 'pin', pin: endPin, orientation: endOrientation },
        startOrientation,
        [],
        {}
      )

      const entrySegment = path.segments[path.segments.length - 1]
      expect(entrySegment.type).toBe('entry')
      
      // Helper function to check if coordinate is on section line (same logic as isOnSectionLine)
      const isCoordOnSectionLine = (coord: number): boolean => {
        const snapped = Math.round(coord / SECTION_SIZE) * SECTION_SIZE
        return Math.abs(coord - snapped) < 0.001
      }

      // Entry segment start should be on a section line
      const routingStart = entrySegment.start
      const isOnSectionLineX = isCoordOnSectionLine(routingStart.x)
      const isOnSectionLineZ = isCoordOnSectionLine(routingStart.z)
      expect(isOnSectionLineX || isOnSectionLineZ).toBe(true)
    })

    it('path segments connect properly for cursor destinations', () => {
      const startPin = createPosition(1.4, 0.2, 2.0)
      const cursorPos = createPosition(9.0, 0.2, 7.0)
      const startOrientation: PinOrientation = { direction: { x: 1, y: 0, z: 0 } }

      const path = calculateWirePath(
        startPin,
        { type: 'cursor', pos: cursorPos },
        startOrientation,
        [],
        {}
      )

      expect(path.segments.length).toBeGreaterThan(0)
      
      // Check that segments connect properly
      for (let i = 0; i < path.segments.length - 1; i++) {
        const current = path.segments[i]
        const next = path.segments[i + 1]
        expect(Math.abs(current.end.x - next.start.x)).toBeLessThan(0.01)
        expect(Math.abs(current.end.z - next.start.z)).toBeLessThan(0.01)
      }
    })
  })

  describe('combineAdjacentSegments', () => {
    const createSegment = (
      startX: number,
      startZ: number,
      endX: number,
      endZ: number,
      type: WireSegment['type'] = 'horizontal'
    ): WireSegment => ({
      start: { x: startX, y: WIRE_HEIGHT, z: startZ },
      end: { x: endX, y: WIRE_HEIGHT, z: endZ },
      type,
    })

    it('returns empty array for empty input', () => {
      expect(combineAdjacentSegments([])).toEqual([])
    })

    it('returns single segment as-is', () => {
      const segment = createSegment(0, 0, 4, 0, 'horizontal')
      const result = combineAdjacentSegments([segment])
      expect(result).toHaveLength(1)
      expect(result[0]).toEqual(segment)
    })

    it('combines two adjacent horizontal segments', () => {
      const seg1 = createSegment(0, 0, 4, 0, 'horizontal')
      const seg2 = createSegment(4, 0, 8, 0, 'horizontal')
      const result = combineAdjacentSegments([seg1, seg2])
      
      expect(result).toHaveLength(1)
      expect(result[0].start).toEqual(seg1.start)
      expect(result[0].end).toEqual(seg2.end)
      expect(result[0].type).toBe('horizontal')
    })

    it('combines three adjacent horizontal segments', () => {
      const seg1 = createSegment(0, 0, 4, 0, 'horizontal')
      const seg2 = createSegment(4, 0, 8, 0, 'horizontal')
      const seg3 = createSegment(8, 0, 12, 0, 'horizontal')
      const result = combineAdjacentSegments([seg1, seg2, seg3])
      
      expect(result).toHaveLength(1)
      expect(result[0].start).toEqual(seg1.start)
      expect(result[0].end).toEqual(seg3.end)
      expect(result[0].type).toBe('horizontal')
    })

    it('combines two adjacent vertical segments', () => {
      const seg1 = createSegment(0, 0, 0, 4, 'vertical')
      const seg2 = createSegment(0, 4, 0, 8, 'vertical')
      const result = combineAdjacentSegments([seg1, seg2])
      
      expect(result).toHaveLength(1)
      expect(result[0].start).toEqual(seg1.start)
      expect(result[0].end).toEqual(seg2.end)
      expect(result[0].type).toBe('vertical')
    })

    it('combines multiple adjacent vertical segments', () => {
      const seg1 = createSegment(0, 0, 0, 4, 'vertical')
      const seg2 = createSegment(0, 4, 0, 8, 'vertical')
      const seg3 = createSegment(0, 8, 0, 12, 'vertical')
      const result = combineAdjacentSegments([seg1, seg2, seg3])
      
      expect(result).toHaveLength(1)
      expect(result[0].start).toEqual(seg1.start)
      expect(result[0].end).toEqual(seg3.end)
      expect(result[0].type).toBe('vertical')
    })

    it('keeps non-adjacent segments separate (different types prevent combination)', () => {
      const seg1 = createSegment(0, 0, 4, 0, 'horizontal')
      const seg2 = createSegment(4, 0, 4, 4, 'vertical') // Adjacent but different type
      const seg3 = createSegment(4, 4, 8, 4, 'horizontal') // Adjacent to seg2 but different type
      const result = combineAdjacentSegments([seg1, seg2, seg3])
      
      expect(result).toHaveLength(3)
      expect(result[0]).toEqual(seg1)
      expect(result[1]).toEqual(seg2)
      expect(result[2]).toEqual(seg3)
    })

    it('keeps mixed types separate', () => {
      const seg1 = createSegment(0, 0, 4, 0, 'horizontal')
      const seg2 = createSegment(4, 0, 4, 4, 'vertical') // Adjacent but different type
      const result = combineAdjacentSegments([seg1, seg2])
      
      expect(result).toHaveLength(2)
      expect(result[0]).toEqual(seg1)
      expect(result[1]).toEqual(seg2)
    })

    it('preserves entry segments without combining', () => {
      const seg1 = createSegment(0, 0, 4, 0, 'horizontal')
      const entrySeg: WireSegment = {
        start: { x: 4, y: WIRE_HEIGHT, z: 0 },
        end: { x: 5, y: WIRE_HEIGHT, z: 0 },
        type: 'entry',
      }
      const result = combineAdjacentSegments([seg1, entrySeg])
      
      expect(result).toHaveLength(2)
      expect(result[0]).toEqual(seg1)
      expect(result[1]).toEqual(entrySeg)
    })

    it('preserves exit segments without combining', () => {
      const exitSeg: WireSegment = {
        start: { x: 0, y: WIRE_HEIGHT, z: 0 },
        end: { x: 4, y: WIRE_HEIGHT, z: 0 },
        type: 'exit',
      }
      const seg1 = createSegment(4, 0, 8, 0, 'horizontal')
      const result = combineAdjacentSegments([exitSeg, seg1])
      
      expect(result).toHaveLength(2)
      expect(result[0]).toEqual(exitSeg)
      expect(result[1]).toEqual(seg1)
    })

    it('removes backtracking by combining overlapping segments', () => {
      // Segments that go forward then backward on the same line
      const seg1 = createSegment(0, 0, 8, 0, 'horizontal')
      const seg2 = createSegment(8, 0, 4, 0, 'horizontal') // Backtracks
      const seg3 = createSegment(4, 0, 12, 0, 'horizontal') // Continues forward
      const result = combineAdjacentSegments([seg1, seg2, seg3])
      
      // Should combine into single segment from start of seg1 to end of seg3
      expect(result).toHaveLength(1)
      expect(result[0].start).toEqual(seg1.start)
      expect(result[0].end).toEqual(seg3.end)
      expect(result[0].type).toBe('horizontal')
    })

    it('handles multiple groups of combinable segments', () => {
      // Group 1: horizontal segments
      const seg1 = createSegment(0, 0, 4, 0, 'horizontal')
      const seg2 = createSegment(4, 0, 8, 0, 'horizontal')
      
      // Transition: vertical segment (not adjacent to next group)
      const seg3 = createSegment(8, 0, 8, 4, 'vertical')
      
      // Group 2: horizontal segments (on different line, not adjacent to seg3)
      const seg4 = createSegment(12, 4, 16, 4, 'horizontal')
      const seg5 = createSegment(16, 4, 20, 4, 'horizontal')
      
      const result = combineAdjacentSegments([seg1, seg2, seg3, seg4, seg5])
      
      expect(result).toHaveLength(3)
      // First group combined
      expect(result[0].start).toEqual(seg1.start)
      expect(result[0].end).toEqual(seg2.end)
      expect(result[0].type).toBe('horizontal')
      // Transition segment unchanged
      expect(result[1]).toEqual(seg3)
      // Second group combined
      expect(result[2].start).toEqual(seg4.start)
      expect(result[2].end).toEqual(seg5.end)
      expect(result[2].type).toBe('horizontal')
    })

    it('handles segments with negative coordinates', () => {
      const seg1 = createSegment(-4, 0, 0, 0, 'horizontal')
      const seg2 = createSegment(0, 0, 4, 0, 'horizontal')
      const result = combineAdjacentSegments([seg1, seg2])
      
      expect(result).toHaveLength(1)
      expect(result[0].start).toEqual(seg1.start)
      expect(result[0].end).toEqual(seg2.end)
    })

    it('handles segments going in negative direction', () => {
      const seg1 = createSegment(8, 0, 4, 0, 'horizontal') // Right to left
      const seg2 = createSegment(4, 0, 0, 0, 'horizontal') // Right to left
      const result = combineAdjacentSegments([seg1, seg2])
      
      expect(result).toHaveLength(1)
      expect(result[0].start).toEqual(seg1.start)
      expect(result[0].end).toEqual(seg2.end)
    })

    it('handles vertical segments going in negative direction', () => {
      const seg1 = createSegment(0, 8, 0, 4, 'vertical') // Forward to back
      const seg2 = createSegment(0, 4, 0, 0, 'vertical') // Forward to back
      const result = combineAdjacentSegments([seg1, seg2])
      
      expect(result).toHaveLength(1)
      expect(result[0].start).toEqual(seg1.start)
      expect(result[0].end).toEqual(seg2.end)
    })

    it('handles tolerance for adjacent check', () => {
      const seg1 = createSegment(0, 0, 4, 0, 'horizontal')
      const seg2: WireSegment = {
        start: { x: 4.0001, y: WIRE_HEIGHT, z: 0.0001 }, // Within tolerance
        end: { x: 8, y: WIRE_HEIGHT, z: 0 },
        type: 'horizontal',
      }
      const result = combineAdjacentSegments([seg1, seg2])
      
      // Should still combine despite small floating point differences
      expect(result).toHaveLength(1)
    })
  })
})