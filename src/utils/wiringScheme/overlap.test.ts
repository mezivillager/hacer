import { describe, it, expect } from 'vitest'
import { segmentsOverlap, areSegmentsOnSameSectionLine, coordinateRangesOverlap, wouldOverlapWithExisting } from './overlap'
import type { WireSegment } from './types'
import { WIRE_HEIGHT } from './types'

const createPosition = (x: number, z: number) => ({ x, y: WIRE_HEIGHT, z })

const createHorizontalSegment = (x1: number, z: number, x2: number): WireSegment => ({
  start: createPosition(x1, z),
  end: createPosition(x2, z),
  type: 'horizontal',
})

const createVerticalSegment = (x: number, z1: number, z2: number): WireSegment => ({
  start: createPosition(x, z1),
  end: createPosition(x, z2),
  type: 'vertical',
})

describe('Wire Segment Overlap Detection', () => {
  describe('coordinateRangesOverlap', () => {
    it('returns true for overlapping ranges', () => {
      expect(coordinateRangesOverlap(0, 4, 2, 6)).toBe(true) // [0-4] overlaps [2-6]
      expect(coordinateRangesOverlap(2, 6, 0, 4)).toBe(true) // Reversed order
    })

    it('returns true for ranges that touch at endpoints', () => {
      expect(coordinateRangesOverlap(0, 4, 4, 8)).toBe(true) // Touching at 4 (is overlap - wires can't share corners)
      expect(coordinateRangesOverlap(4, 8, 0, 4)).toBe(true) // Reversed
    })

    it('returns false for non-overlapping ranges', () => {
      expect(coordinateRangesOverlap(0, 4, 5, 8)).toBe(false) // [0-4] and [5-8] don't overlap
      expect(coordinateRangesOverlap(5, 8, 0, 4)).toBe(false) // Reversed order
    })

    it('handles reversed segments (start > end)', () => {
      expect(coordinateRangesOverlap(4, 0, 2, 6)).toBe(true) // Reversed [4-0] overlaps [2-6]
      expect(coordinateRangesOverlap(0, 4, 6, 2)).toBe(true) // [0-4] overlaps reversed [6-2]
    })

  })

  describe('areSegmentsOnSameSectionLine', () => {
    it('returns true for horizontal segments on same z coordinate', () => {
      const seg1 = createHorizontalSegment(0, 4, 4)
      const seg2 = createHorizontalSegment(8, 4, 12)
      expect(areSegmentsOnSameSectionLine(seg1, seg2)).toBe(true)
    })

    it('returns false for horizontal segments on different z coordinates', () => {
      const seg1 = createHorizontalSegment(0, 4, 4)
      const seg2 = createHorizontalSegment(0, 8, 4)
      expect(areSegmentsOnSameSectionLine(seg1, seg2)).toBe(false)
    })

    it('returns true for vertical segments on same x coordinate', () => {
      const seg1 = createVerticalSegment(4, 0, 4)
      const seg2 = createVerticalSegment(4, 8, 12)
      expect(areSegmentsOnSameSectionLine(seg1, seg2)).toBe(true)
    })

    it('returns false for vertical segments on different x coordinates', () => {
      const seg1 = createVerticalSegment(4, 0, 4)
      const seg2 = createVerticalSegment(8, 0, 4)
      expect(areSegmentsOnSameSectionLine(seg1, seg2)).toBe(false)
    })

    it('returns false for horizontal and vertical segments', () => {
      const horizontal = createHorizontalSegment(0, 4, 4)
      const vertical = createVerticalSegment(4, 0, 4)
      expect(areSegmentsOnSameSectionLine(horizontal, vertical)).toBe(false)
    })

    it('handles segments with floating point coordinates', () => {
      const seg1 = createHorizontalSegment(0, 4.0001, 4)
      const seg2 = createHorizontalSegment(8, 3.9999, 12)
      expect(areSegmentsOnSameSectionLine(seg1, seg2)).toBe(true) // Within tolerance
    })
  })

  describe('segmentsOverlap', () => {
    describe('horizontal segments', () => {
      it('returns true for overlapping horizontal segments on same line', () => {
        const seg1 = createHorizontalSegment(0, 4, 8)
        const seg2 = createHorizontalSegment(4, 4, 12)
        expect(segmentsOverlap(seg1, seg2)).toBe(true)
      })

      it('returns true for exact segment matches', () => {
        const seg1 = createHorizontalSegment(0, 4, 8)
        const seg2 = createHorizontalSegment(0, 4, 8)
        expect(segmentsOverlap(seg1, seg2)).toBe(true)
      })

      it('returns true when one segment is contained within another', () => {
        const outer = createHorizontalSegment(0, 4, 12)
        const inner = createHorizontalSegment(4, 4, 8)
        expect(segmentsOverlap(outer, inner)).toBe(true)
        expect(segmentsOverlap(inner, outer)).toBe(true)
      })

      it('returns true for segments that touch at endpoints', () => {
        const seg1 = createHorizontalSegment(0, 4, 8)
        const seg2 = createHorizontalSegment(8, 4, 12)
        expect(segmentsOverlap(seg1, seg2)).toBe(true) // Touching at corner is overlap - wires can't share corners
      })

      it('returns false for non-overlapping segments on same line', () => {
        const seg1 = createHorizontalSegment(0, 4, 4)
        const seg2 = createHorizontalSegment(8, 4, 12)
        expect(segmentsOverlap(seg1, seg2)).toBe(false)
      })

      it('returns false for segments on different lines', () => {
        const seg1 = createHorizontalSegment(0, 4, 8)
        const seg2 = createHorizontalSegment(0, 8, 8)
        expect(segmentsOverlap(seg1, seg2)).toBe(false)
      })

      it('handles reversed horizontal segments', () => {
        const seg1 = createHorizontalSegment(8, 4, 0) // Reversed
        const seg2 = createHorizontalSegment(4, 4, 12)
        expect(segmentsOverlap(seg1, seg2)).toBe(true)
      })

    })

    describe('vertical segments', () => {
      it('returns true for overlapping vertical segments on same line', () => {
        const seg1 = createVerticalSegment(4, 0, 8)
        const seg2 = createVerticalSegment(4, 4, 12)
        expect(segmentsOverlap(seg1, seg2)).toBe(true)
      })

      it('returns true for exact segment matches', () => {
        const seg1 = createVerticalSegment(4, 0, 8)
        const seg2 = createVerticalSegment(4, 0, 8)
        expect(segmentsOverlap(seg1, seg2)).toBe(true)
      })

      it('returns true when one segment is contained within another', () => {
        const outer = createVerticalSegment(4, 0, 12)
        const inner = createVerticalSegment(4, 4, 8)
        expect(segmentsOverlap(outer, inner)).toBe(true)
        expect(segmentsOverlap(inner, outer)).toBe(true)
      })

      it('returns true for segments that touch at endpoints', () => {
        const seg1 = createVerticalSegment(4, 0, 8)
        const seg2 = createVerticalSegment(4, 8, 12)
        expect(segmentsOverlap(seg1, seg2)).toBe(true) // Touching at corner is overlap - wires can't share corners
      })

      it('returns false for non-overlapping segments on same line', () => {
        const seg1 = createVerticalSegment(4, 0, 4)
        const seg2 = createVerticalSegment(4, 8, 12)
        expect(segmentsOverlap(seg1, seg2)).toBe(false)
      })

      it('returns false for segments on different lines', () => {
        const seg1 = createVerticalSegment(4, 0, 8)
        const seg2 = createVerticalSegment(8, 0, 8)
        expect(segmentsOverlap(seg1, seg2)).toBe(false)
      })

      it('handles reversed vertical segments', () => {
        const seg1 = createVerticalSegment(4, 8, 0) // Reversed
        const seg2 = createVerticalSegment(4, 4, 12)
        expect(segmentsOverlap(seg1, seg2)).toBe(true)
      })

    })

    describe('mixed segment types', () => {
      it('returns false for horizontal and vertical segments', () => {
        const horizontal = createHorizontalSegment(0, 4, 8)
        const vertical = createVerticalSegment(4, 0, 8)
        expect(segmentsOverlap(horizontal, vertical)).toBe(false)
      })
    })

    describe('entry and exit segments', () => {
      it('handles entry segments correctly', () => {
        const entry1: WireSegment = {
          start: createPosition(4, 0),
          end: createPosition(5.4, 0),
          type: 'entry',
        }
        const entry2: WireSegment = {
          start: createPosition(4, 0),
          end: createPosition(5.6, 0),
          type: 'entry',
        }
        // Both are horizontal segments on same line, should overlap
        expect(segmentsOverlap(entry1, entry2)).toBe(true)
      })

      it('handles exit segments correctly', () => {
        const exit1: WireSegment = {
          start: createPosition(5.4, 0),
          end: createPosition(4, 0),
          type: 'exit',
        }
        const exit2: WireSegment = {
          start: createPosition(5.6, 0),
          end: createPosition(4, 0),
          type: 'exit',
        }
        // Both are horizontal segments on same line, should overlap
        expect(segmentsOverlap(exit1, exit2)).toBe(true)
      })
    })
  })

  describe('wouldOverlapWithExisting', () => {
    it('returns true if potential segment overlaps with any existing segment', () => {
      const existing: WireSegment[] = [
        createHorizontalSegment(0, 4, 8),
        createVerticalSegment(4, 0, 4),
      ]
      const potential = createHorizontalSegment(4, 4, 12) // Overlaps first existing
      expect(wouldOverlapWithExisting(potential, existing)).toBe(true)
    })

    it('returns false if potential segment does not overlap with any existing segment', () => {
      const existing: WireSegment[] = [
        createHorizontalSegment(0, 4, 4),
        createVerticalSegment(4, 0, 4),
      ]
      const potential = createHorizontalSegment(8, 4, 12) // No overlap
      expect(wouldOverlapWithExisting(potential, existing)).toBe(false)
    })

    it('returns false for empty existing segments array', () => {
      const potential = createHorizontalSegment(0, 4, 8)
      expect(wouldOverlapWithExisting(potential, [])).toBe(false)
    })

    it('handles multiple existing segments', () => {
      const existing: WireSegment[] = [
        createHorizontalSegment(0, 4, 4),
        createHorizontalSegment(8, 4, 12),
        createVerticalSegment(4, 0, 4),
      ]
      const potential = createHorizontalSegment(4, 4, 8) // Touches first at 4 and second at 8 - is overlap
      expect(wouldOverlapWithExisting(potential, existing)).toBe(true)

      const overlapping = createHorizontalSegment(2, 4, 6) // Overlaps with first
      expect(wouldOverlapWithExisting(overlapping, existing)).toBe(true)
    })
  })
})

