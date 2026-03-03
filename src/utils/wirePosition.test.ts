/**
 * Wire Position Calculation Tests
 *
 * Tests for utilities that calculate positions on wires and work with wire segments.
 */

import { describe, it, expect } from 'vitest'
import type { Wire } from '@/store/types'
import type { WireSegment } from '@/utils/wiringScheme/types'
import {
  calculatePositionOnWire,
  findSegmentContainingPosition,
  getSegmentsUpToPosition,
  areSegmentsPerpendicular,
  isAtSegmentCorner,
  findWireCorners,
} from './wirePosition'
import { WIRE_HEIGHT } from '@/utils/wiringScheme/types'

const SECTION_SIZE = 4.0

describe('wirePosition', () => {
  describe('calculatePositionOnWire', () => {
    it('returns null for wire with no segments', () => {
      const wire: Wire = {
        id: 'wire-1',
        from: { type: 'gate', entityId: 'gate-1', pinId: 'pin-1' },
        to: { type: 'gate', entityId: 'gate-2', pinId: 'pin-2' },
        segments: [],
        crossesWireIds: [],
      }

      const result = calculatePositionOnWire({ x: 0, y: 0.2, z: 0 }, wire)
      expect(result).toBeNull()
    })

    it('finds position on simple horizontal wire', () => {
      const wire: Wire = {
        id: 'wire-1',
        from: { type: 'gate', entityId: 'gate-1', pinId: 'pin-1' },
        to: { type: 'gate', entityId: 'gate-2', pinId: 'pin-2' },
        segments: [
          {
            start: { x: 0, y: 0.2, z: 0 },
            end: { x: 4, y: 0.2, z: 0 },
            type: 'horizontal',
          },
        ],
        crossesWireIds: [],
      }

      const result = calculatePositionOnWire({ x: 2, y: 0.2, z: 0 }, wire)
      expect(result).not.toBeNull()
      expect(result?.x).toBeCloseTo(2, 1)
      expect(result?.y).toBe(0.2)
      expect(result?.z).toBe(0)
    })
  })

  describe('findSegmentContainingPosition', () => {
    it('returns null for empty segments', () => {
      const result = findSegmentContainingPosition([], { x: 0, y: 0.2, z: 0 })
      expect(result).toBeNull()
    })

    it('finds segment containing position', () => {
      const segments: WireSegment[] = [
        {
          start: { x: 0, y: 0.2, z: 0 },
          end: { x: 4, y: 0.2, z: 0 },
          type: 'horizontal',
        },
        {
          start: { x: 4, y: 0.2, z: 0 },
          end: { x: 8, y: 0.2, z: 0 },
          type: 'horizontal',
        },
      ]

      const result = findSegmentContainingPosition(segments, { x: 2, y: 0.2, z: 0 })
      expect(result).not.toBeNull()
      expect(result?.segmentIndex).toBe(0)
      expect(result?.t).toBeGreaterThan(0)
      expect(result?.t).toBeLessThan(1)
    })
  })

  describe('getSegmentsUpToPosition', () => {
    it('returns empty array for empty segments', () => {
      const result = getSegmentsUpToPosition([], { x: 0, y: 0.2, z: 0 })
      expect(result).toEqual([])
    })

    it('returns segments up to position', () => {
      const segments: WireSegment[] = [
        {
          start: { x: 0, y: 0.2, z: 0 },
          end: { x: 4, y: 0.2, z: 0 },
          type: 'horizontal',
        },
        {
          start: { x: 4, y: 0.2, z: 0 },
          end: { x: 8, y: 0.2, z: 0 },
          type: 'horizontal',
        },
      ]

      const result = getSegmentsUpToPosition(segments, { x: 2, y: 0.2, z: 0 })
      expect(result).toHaveLength(1)
      expect(result[0].start).toEqual({ x: 0, y: 0.2, z: 0 })
      expect(result[0].end.x).toBeCloseTo(2, 1)
    })

    it('handles position at segment start (t === 0)', () => {
      const segments: WireSegment[] = [
        {
          start: { x: 0, y: 0.2, z: 0 },
          end: { x: 4, y: 0.2, z: 0 },
          type: 'horizontal',
        },
        {
          start: { x: 4, y: 0.2, z: 0 },
          end: { x: 8, y: 0.2, z: 0 },
          type: 'horizontal',
        },
      ]

      const result = getSegmentsUpToPosition(segments, { x: 0, y: 0.2, z: 0 })
      expect(result).toHaveLength(0) // Position at start, no segments before it
    })

    it('handles position at segment end (t === 1)', () => {
      const segments: WireSegment[] = [
        {
          start: { x: 0, y: 0.2, z: 0 },
          end: { x: 4, y: 0.2, z: 0 },
          type: 'horizontal',
        },
        {
          start: { x: 4, y: 0.2, z: 0 },
          end: { x: 8, y: 0.2, z: 0 },
          type: 'horizontal',
        },
      ]

      const result = getSegmentsUpToPosition(segments, { x: 4, y: 0.2, z: 0 })
      expect(result).toHaveLength(1)
      expect(result[0].start).toEqual({ x: 0, y: 0.2, z: 0 })
      expect(result[0].end).toEqual({ x: 4, y: 0.2, z: 0 })
    })

    it('handles position at wire end (last segment, t === 1)', () => {
      const segments: WireSegment[] = [
        {
          start: { x: 0, y: 0.2, z: 0 },
          end: { x: 4, y: 0.2, z: 0 },
          type: 'horizontal',
        },
        {
          start: { x: 4, y: 0.2, z: 0 },
          end: { x: 8, y: 0.2, z: 0 },
          type: 'horizontal',
        },
      ]

      const result = getSegmentsUpToPosition(segments, { x: 8, y: 0.2, z: 0 })
      expect(result).toHaveLength(2)
      expect(result[0].start).toEqual({ x: 0, y: 0.2, z: 0 })
      expect(result[1].end).toEqual({ x: 8, y: 0.2, z: 0 })
    })
  })

  describe('edge cases', () => {
    it('handles arc segments', () => {
      const wire: Wire = {
        id: 'wire-1',
        from: { type: 'gate', entityId: 'gate-1', pinId: 'pin-1' },
        to: { type: 'gate', entityId: 'gate-2', pinId: 'pin-2' },
        segments: [
          {
            start: { x: 0, y: 0.2, z: 0 },
            end: { x: 4, y: 0.2, z: 0 },
            type: 'horizontal',
          },
          {
            start: { x: 4, y: 0.2, z: 0 },
            end: { x: 8, y: 0.2, z: 4 },
            type: 'arc',
          },
        ],
        crossesWireIds: [],
      }

      const result = calculatePositionOnWire({ x: 6, y: 0.2, z: 2 }, wire)
      expect(result).not.toBeNull()
      // Arc segments should be handled (approximation)
    })

    it('handles complex multi-segment paths', () => {
      const segments: WireSegment[] = [
        {
          start: { x: 0, y: 0.2, z: 0 },
          end: { x: 2, y: 0.2, z: 0 },
          type: 'horizontal',
        },
        {
          start: { x: 2, y: 0.2, z: 0 },
          end: { x: 4, y: 0.2, z: 0 },
          type: 'horizontal',
        },
        {
          start: { x: 4, y: 0.2, z: 0 },
          end: { x: 4, y: 0.2, z: 2 },
          type: 'vertical',
        },
        {
          start: { x: 4, y: 0.2, z: 2 },
          end: { x: 6, y: 0.2, z: 2 },
          type: 'horizontal',
        },
      ]

      const result = findSegmentContainingPosition(segments, { x: 5, y: 0.2, z: 2 })
      expect(result).not.toBeNull()
      expect(result?.segmentIndex).toBe(3) // Last horizontal segment
    })

    it('handles position very close to segment boundary', () => {
      const segments: WireSegment[] = [
        {
          start: { x: 0, y: 0.2, z: 0 },
          end: { x: 4, y: 0.2, z: 0 },
          type: 'horizontal',
        },
        {
          start: { x: 4, y: 0.2, z: 0 },
          end: { x: 8, y: 0.2, z: 0 },
          type: 'horizontal',
        },
      ]

      // Position very close to segment boundary (x: 3.99)
      const result = findSegmentContainingPosition(segments, { x: 3.99, y: 0.2, z: 0 })
      expect(result).not.toBeNull()
      expect(result?.segmentIndex).toBe(0) // Should still be on first segment
    })
  })

  describe('areSegmentsPerpendicular', () => {
    it('returns true for horizontal + vertical', () => {
      const seg1: WireSegment = { start: { x: 0, y: WIRE_HEIGHT, z: 0 }, end: { x: SECTION_SIZE, y: WIRE_HEIGHT, z: 0 }, type: 'horizontal' }
      const seg2: WireSegment = { start: { x: SECTION_SIZE, y: WIRE_HEIGHT, z: 0 }, end: { x: SECTION_SIZE, y: WIRE_HEIGHT, z: SECTION_SIZE }, type: 'vertical' }
      expect(areSegmentsPerpendicular(seg1, seg2)).toBe(true)
    })

    it('returns true for vertical + horizontal', () => {
      const seg1: WireSegment = { start: { x: 0, y: WIRE_HEIGHT, z: 0 }, end: { x: 0, y: WIRE_HEIGHT, z: SECTION_SIZE }, type: 'vertical' }
      const seg2: WireSegment = { start: { x: 0, y: WIRE_HEIGHT, z: SECTION_SIZE }, end: { x: SECTION_SIZE, y: WIRE_HEIGHT, z: SECTION_SIZE }, type: 'horizontal' }
      expect(areSegmentsPerpendicular(seg1, seg2)).toBe(true)
    })

    it('returns false for horizontal + horizontal', () => {
      const seg1: WireSegment = { start: { x: 0, y: WIRE_HEIGHT, z: 0 }, end: { x: SECTION_SIZE, y: WIRE_HEIGHT, z: 0 }, type: 'horizontal' }
      const seg2: WireSegment = { start: { x: SECTION_SIZE, y: WIRE_HEIGHT, z: 0 }, end: { x: 2 * SECTION_SIZE, y: WIRE_HEIGHT, z: 0 }, type: 'horizontal' }
      expect(areSegmentsPerpendicular(seg1, seg2)).toBe(false)
    })

    it('returns false for vertical + vertical', () => {
      const seg1: WireSegment = { start: { x: 0, y: WIRE_HEIGHT, z: 0 }, end: { x: 0, y: WIRE_HEIGHT, z: SECTION_SIZE }, type: 'vertical' }
      const seg2: WireSegment = { start: { x: 0, y: WIRE_HEIGHT, z: SECTION_SIZE }, end: { x: 0, y: WIRE_HEIGHT, z: 2 * SECTION_SIZE }, type: 'vertical' }
      expect(areSegmentsPerpendicular(seg1, seg2)).toBe(false)
    })

    it('returns true for exit + horizontal', () => {
      const seg1: WireSegment = { start: { x: 0, y: WIRE_HEIGHT, z: 0 }, end: { x: 1, y: WIRE_HEIGHT, z: 0 }, type: 'exit' }
      const seg2: WireSegment = { start: { x: 1, y: WIRE_HEIGHT, z: 0 }, end: { x: SECTION_SIZE, y: WIRE_HEIGHT, z: 0 }, type: 'horizontal' }
      expect(areSegmentsPerpendicular(seg1, seg2)).toBe(true)
    })

    it('returns true for horizontal + entry', () => {
      const seg1: WireSegment = { start: { x: 0, y: WIRE_HEIGHT, z: 0 }, end: { x: SECTION_SIZE, y: WIRE_HEIGHT, z: 0 }, type: 'horizontal' }
      const seg2: WireSegment = { start: { x: SECTION_SIZE, y: WIRE_HEIGHT, z: 0 }, end: { x: SECTION_SIZE + 1, y: WIRE_HEIGHT, z: 0 }, type: 'entry' }
      expect(areSegmentsPerpendicular(seg1, seg2)).toBe(true)
    })

    it('returns true for arc + horizontal', () => {
      const seg1: WireSegment = { start: { x: 0, y: WIRE_HEIGHT, z: 0 }, end: { x: 1, y: WIRE_HEIGHT, z: 0 }, type: 'arc', arcCenter: { x: 0.5, y: 0.35, z: 0 }, arcRadius: 0.075 }
      const seg2: WireSegment = { start: { x: 1, y: WIRE_HEIGHT, z: 0 }, end: { x: SECTION_SIZE, y: WIRE_HEIGHT, z: 0 }, type: 'horizontal' }
      expect(areSegmentsPerpendicular(seg1, seg2)).toBe(true)
    })
  })

  describe('isAtSegmentCorner', () => {
    it('returns true at exit segment end', () => {
      const segments: WireSegment[] = [
        { start: { x: 0, y: WIRE_HEIGHT, z: 0 }, end: { x: 1, y: WIRE_HEIGHT, z: 0 }, type: 'exit' },
        { start: { x: 1, y: WIRE_HEIGHT, z: 0 }, end: { x: SECTION_SIZE, y: WIRE_HEIGHT, z: 0 }, type: 'horizontal' },
      ]
      const result = isAtSegmentCorner(segments[0].end, segments[0], segments, 0)
      expect(result).toBe(true)
    })

    it('returns true at entry segment start', () => {
      const segments: WireSegment[] = [
        { start: { x: 0, y: WIRE_HEIGHT, z: 0 }, end: { x: SECTION_SIZE, y: WIRE_HEIGHT, z: 0 }, type: 'horizontal' },
        { start: { x: SECTION_SIZE, y: WIRE_HEIGHT, z: 0 }, end: { x: SECTION_SIZE + 1, y: WIRE_HEIGHT, z: 0 }, type: 'entry' },
      ]
      const result = isAtSegmentCorner(segments[1].start, segments[1], segments, 1)
      expect(result).toBe(true)
    })

    it('returns false at exit segment start (pin side, not routing side)', () => {
      const segments: WireSegment[] = [
        { start: { x: 0, y: WIRE_HEIGHT, z: 0 }, end: { x: 1, y: WIRE_HEIGHT, z: 0 }, type: 'exit' },
        { start: { x: 1, y: WIRE_HEIGHT, z: 0 }, end: { x: SECTION_SIZE, y: WIRE_HEIGHT, z: 0 }, type: 'horizontal' },
      ]
      const result = isAtSegmentCorner(segments[0].start, segments[0], segments, 0)
      expect(result).toBe(false)
    })

    it('returns false at entry segment end (pin side, not routing side)', () => {
      const segments: WireSegment[] = [
        { start: { x: 0, y: WIRE_HEIGHT, z: 0 }, end: { x: SECTION_SIZE, y: WIRE_HEIGHT, z: 0 }, type: 'horizontal' },
        { start: { x: SECTION_SIZE, y: WIRE_HEIGHT, z: 0 }, end: { x: SECTION_SIZE + 1, y: WIRE_HEIGHT, z: 0 }, type: 'entry' },
      ]
      const result = isAtSegmentCorner(segments[1].end, segments[1], segments, 1)
      expect(result).toBe(false)
    })

    it('returns true where horizontal meets vertical (routing corner)', () => {
      const segments: WireSegment[] = [
        { start: { x: 0, y: WIRE_HEIGHT, z: 0 }, end: { x: SECTION_SIZE, y: WIRE_HEIGHT, z: 0 }, type: 'horizontal' },
        { start: { x: SECTION_SIZE, y: WIRE_HEIGHT, z: 0 }, end: { x: SECTION_SIZE, y: WIRE_HEIGHT, z: SECTION_SIZE }, type: 'vertical' },
      ]
      const position = { x: SECTION_SIZE, y: WIRE_HEIGHT, z: 0 }
      expect(isAtSegmentCorner(position, segments[0], segments, 0)).toBe(true)
      expect(isAtSegmentCorner(position, segments[1], segments, 1)).toBe(true)
    })

    it('returns false in middle of segment (not at endpoint)', () => {
      const segments: WireSegment[] = [
        { start: { x: 0, y: WIRE_HEIGHT, z: 0 }, end: { x: SECTION_SIZE, y: WIRE_HEIGHT, z: 0 }, type: 'horizontal' },
        { start: { x: SECTION_SIZE, y: WIRE_HEIGHT, z: 0 }, end: { x: SECTION_SIZE, y: WIRE_HEIGHT, z: SECTION_SIZE }, type: 'vertical' },
      ]
      const midPoint = { x: SECTION_SIZE / 2, y: WIRE_HEIGHT, z: 0 }
      expect(isAtSegmentCorner(midPoint, segments[0], segments, 0)).toBe(false)
    })

    it('returns false at junction of two same-direction segments', () => {
      const segments: WireSegment[] = [
        { start: { x: 0, y: WIRE_HEIGHT, z: 0 }, end: { x: SECTION_SIZE, y: WIRE_HEIGHT, z: 0 }, type: 'horizontal' },
        { start: { x: SECTION_SIZE, y: WIRE_HEIGHT, z: 0 }, end: { x: 2 * SECTION_SIZE, y: WIRE_HEIGHT, z: 0 }, type: 'horizontal' },
      ]
      const junction = { x: SECTION_SIZE, y: WIRE_HEIGHT, z: 0 }
      expect(isAtSegmentCorner(junction, segments[0], segments, 0)).toBe(false)
    })
  })

  describe('findWireCorners', () => {
    const makeWire = (segments: WireSegment[]): Wire => ({
      id: 'wire-1',
      from: { type: 'gate', entityId: 'gate-1', pinId: 'pin-1' },
      to: { type: 'gate', entityId: 'gate-2', pinId: 'pin-2' },
      segments,
      crossesWireIds: [],
    })

    it('returns empty array for wire with no segments', () => {
      expect(findWireCorners(makeWire([]))).toEqual([])
    })

    it('returns corner at exit segment end', () => {
      const wire = makeWire([
        { start: { x: 0, y: WIRE_HEIGHT, z: 0 }, end: { x: 1, y: WIRE_HEIGHT, z: 0 }, type: 'exit' },
        { start: { x: 1, y: WIRE_HEIGHT, z: 0 }, end: { x: SECTION_SIZE, y: WIRE_HEIGHT, z: 0 }, type: 'horizontal' },
      ])
      const corners = findWireCorners(wire)
      expect(corners).toContainEqual({ x: 1, y: WIRE_HEIGHT, z: 0 })
    })

    it('returns corner at entry segment start', () => {
      const wire = makeWire([
        { start: { x: 0, y: WIRE_HEIGHT, z: 0 }, end: { x: SECTION_SIZE, y: WIRE_HEIGHT, z: 0 }, type: 'horizontal' },
        { start: { x: SECTION_SIZE, y: WIRE_HEIGHT, z: 0 }, end: { x: SECTION_SIZE + 1, y: WIRE_HEIGHT, z: 0 }, type: 'entry' },
      ])
      const corners = findWireCorners(wire)
      expect(corners).toContainEqual({ x: SECTION_SIZE, y: WIRE_HEIGHT, z: 0 })
    })

    it('returns corner where vertical meets horizontal', () => {
      const wire = makeWire([
        { start: { x: 0, y: WIRE_HEIGHT, z: 0 }, end: { x: 0, y: WIRE_HEIGHT, z: SECTION_SIZE }, type: 'vertical' },
        { start: { x: 0, y: WIRE_HEIGHT, z: SECTION_SIZE }, end: { x: SECTION_SIZE, y: WIRE_HEIGHT, z: SECTION_SIZE }, type: 'horizontal' },
      ])
      const corners = findWireCorners(wire)
      expect(corners).toContainEqual({ x: 0, y: WIRE_HEIGHT, z: SECTION_SIZE })
    })

    it('returns all 3 corners for Z-shaped wire (exit.end, vertical/horizontal, entry.start)', () => {
      const wire = makeWire([
        { start: { x: 0, y: WIRE_HEIGHT, z: 0 }, end: { x: 1, y: WIRE_HEIGHT, z: 0 }, type: 'exit' },
        { start: { x: 1, y: WIRE_HEIGHT, z: 0 }, end: { x: 1, y: WIRE_HEIGHT, z: SECTION_SIZE }, type: 'vertical' },
        { start: { x: 1, y: WIRE_HEIGHT, z: SECTION_SIZE }, end: { x: SECTION_SIZE, y: WIRE_HEIGHT, z: SECTION_SIZE }, type: 'horizontal' },
        { start: { x: SECTION_SIZE, y: WIRE_HEIGHT, z: SECTION_SIZE }, end: { x: SECTION_SIZE + 1, y: WIRE_HEIGHT, z: SECTION_SIZE }, type: 'entry' },
      ])
      const corners = findWireCorners(wire)
      expect(corners).toHaveLength(3)
      expect(corners).toContainEqual({ x: 1, y: WIRE_HEIGHT, z: 0 })
      expect(corners).toContainEqual({ x: 1, y: WIRE_HEIGHT, z: SECTION_SIZE })
      expect(corners).toContainEqual({ x: SECTION_SIZE, y: WIRE_HEIGHT, z: SECTION_SIZE })
    })

    it('does not return duplicate corners', () => {
      const wire = makeWire([
        { start: { x: 0, y: WIRE_HEIGHT, z: 0 }, end: { x: 1, y: WIRE_HEIGHT, z: 0 }, type: 'exit' },
        { start: { x: 1, y: WIRE_HEIGHT, z: 0 }, end: { x: 1, y: WIRE_HEIGHT, z: SECTION_SIZE }, type: 'vertical' },
      ])
      const corners = findWireCorners(wire)
      const serialized = corners.map(c => `${c.x},${c.y},${c.z}`)
      const unique = new Set(serialized)
      expect(serialized.length).toBe(unique.size)
    })

    it('does not return corners for all-horizontal wires', () => {
      const wire = makeWire([
        { start: { x: 0, y: WIRE_HEIGHT, z: 0 }, end: { x: SECTION_SIZE, y: WIRE_HEIGHT, z: 0 }, type: 'horizontal' },
        { start: { x: SECTION_SIZE, y: WIRE_HEIGHT, z: 0 }, end: { x: 2 * SECTION_SIZE, y: WIRE_HEIGHT, z: 0 }, type: 'horizontal' },
      ])
      const corners = findWireCorners(wire)
      expect(corners).toHaveLength(0)
    })
  })
})
