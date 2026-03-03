/**
 * Wire Sharing Utilities Tests
 *
 * Tests for utilities that detect and manage shared segments between wires through junctions.
 */

import { describe, it, expect } from 'vitest'
import type { Wire, JunctionNode } from '@/store/types'
import {
  getSharedSegmentRange,
  getUnsharedSegments,
  findWiresThroughJunction,
  getJunctionsWithSharedSegments,
  countWiresThroughJunction,
} from './wireSharing'

describe('wireSharing', () => {
  describe('getSharedSegmentRange', () => {
    it('returns null for wire with no segments', () => {
      const wire: Wire = {
        id: 'wire-1',
        from: { type: 'gate', entityId: 'gate-1', pinId: 'pin-1' },
        to: { type: 'gate', entityId: 'gate-2', pinId: 'pin-2' },
        segments: [],
        crossesWireIds: [],
      }

      const result = getSharedSegmentRange(wire, { x: 2, y: 0.2, z: 0 })
      expect(result).toBeNull()
    })

    it('returns null when wire has no segments', () => {
      const wire: Wire = {
        id: 'wire-1',
        from: { type: 'gate', entityId: 'gate-1', pinId: 'pin-1' },
        to: { type: 'gate', entityId: 'gate-2', pinId: 'pin-2' },
        segments: [],
        crossesWireIds: [],
      }

      const result = getSharedSegmentRange(wire, { x: 100, y: 0.2, z: 0 })
      expect(result).toBeNull()
    })

    it('returns correct range when junction is at segment end (t === 1)', () => {
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
            end: { x: 8, y: 0.2, z: 0 },
            type: 'horizontal',
          },
        ],
        crossesWireIds: [],
      }

      // Junction at end of first segment (x: 4)
      const result = getSharedSegmentRange(wire, { x: 4, y: 0.2, z: 0 })
      expect(result).not.toBeNull()
      expect(result?.startIndex).toBe(0)
      expect(result?.endIndex).toBe(0) // Include first segment fully
    })

    it('returns correct range when junction is in middle of segment (0 < t < 1)', () => {
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
            end: { x: 8, y: 0.2, z: 0 },
            type: 'horizontal',
          },
          {
            start: { x: 8, y: 0.2, z: 0 },
            end: { x: 12, y: 0.2, z: 0 },
            type: 'horizontal',
          },
        ],
        crossesWireIds: [],
      }

      // Junction in middle of second segment (x: 6)
      const result = getSharedSegmentRange(wire, { x: 6, y: 0.2, z: 0 })
      expect(result).not.toBeNull()
      expect(result?.startIndex).toBe(0)
      expect(result?.endIndex).toBe(0) // Segments before the split segment (first segment only)
    })

    it('returns correct range when junction is at segment start (t === 0)', () => {
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
            end: { x: 8, y: 0.2, z: 0 },
            type: 'horizontal',
          },
        ],
        crossesWireIds: [],
      }

      // Junction at start of second segment (x: 4)
      const result = getSharedSegmentRange(wire, { x: 4, y: 0.2, z: 0 })
      expect(result).not.toBeNull()
      expect(result?.startIndex).toBe(0)
      expect(result?.endIndex).toBe(0) // Segments before this segment (first segment only)
    })

    it('handles multiple segments correctly', () => {
      const wire: Wire = {
        id: 'wire-1',
        from: { type: 'gate', entityId: 'gate-1', pinId: 'pin-1' },
        to: { type: 'gate', entityId: 'gate-2', pinId: 'pin-2' },
        segments: [
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
            end: { x: 6, y: 0.2, z: 0 },
            type: 'horizontal',
          },
          {
            start: { x: 6, y: 0.2, z: 0 },
            end: { x: 8, y: 0.2, z: 0 },
            type: 'horizontal',
          },
        ],
        crossesWireIds: [],
      }

      // Junction at end of third segment (x: 6)
      const result = getSharedSegmentRange(wire, { x: 6, y: 0.2, z: 0 })
      expect(result).not.toBeNull()
      expect(result?.startIndex).toBe(0)
      expect(result?.endIndex).toBe(2) // Include segments 0, 1, and 2
    })
  })

  describe('getUnsharedSegments', () => {
    it('returns empty array for wire with no segments', () => {
      const wire: Wire = {
        id: 'wire-1',
        from: { type: 'gate', entityId: 'gate-1', pinId: 'pin-1' },
        to: { type: 'gate', entityId: 'gate-2', pinId: 'pin-2' },
        segments: [],
        crossesWireIds: [],
      }

      const result = getUnsharedSegments(wire, { x: 2, y: 0.2, z: 0 })
      expect(result).toEqual([])
    })

    it('returns all segments when wire has no segments', () => {
      const wire: Wire = {
        id: 'wire-1',
        from: { type: 'gate', entityId: 'gate-1', pinId: 'pin-1' },
        to: { type: 'gate', entityId: 'gate-2', pinId: 'pin-2' },
        segments: [],
        crossesWireIds: [],
      }

      const result = getUnsharedSegments(wire, { x: 100, y: 0.2, z: 0 })
      expect(result).toHaveLength(0)
    })

    it('splits segment when junction is in middle (0 < t < 1)', () => {
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
            end: { x: 8, y: 0.2, z: 0 },
            type: 'horizontal',
          },
        ],
        crossesWireIds: [],
      }

      // Junction in middle of second segment (x: 6)
      const result = getUnsharedSegments(wire, { x: 6, y: 0.2, z: 0 })
      expect(result).toHaveLength(1)
      expect(result[0].start.x).toBeCloseTo(6, 1)
      expect(result[0].end.x).toBe(8)
    })

    it('includes all segments after junction when junction is at segment end (t === 1)', () => {
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
            end: { x: 8, y: 0.2, z: 0 },
            type: 'horizontal',
          },
        ],
        crossesWireIds: [],
      }

      // Junction at end of first segment (x: 4)
      const result = getUnsharedSegments(wire, { x: 4, y: 0.2, z: 0 })
      expect(result).toHaveLength(1)
      expect(result[0]).toEqual(wire.segments[1])
    })

    it('includes segment when junction is at segment start (t === 0)', () => {
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
            end: { x: 8, y: 0.2, z: 0 },
            type: 'horizontal',
          },
        ],
        crossesWireIds: [],
      }

      // Junction at start of second segment (x: 4)
      const result = getUnsharedSegments(wire, { x: 4, y: 0.2, z: 0 })
      expect(result).toHaveLength(1)
      expect(result[0]).toEqual(wire.segments[1])
    })
  })

  describe('findWiresThroughJunction', () => {
    it('returns empty array when junction not found', () => {
      const wires: Wire[] = [
        {
          id: 'wire-1',
          from: { type: 'gate', entityId: 'gate-1', pinId: 'pin-1' },
          to: { type: 'gate', entityId: 'gate-2', pinId: 'pin-2' },
          segments: [],
          crossesWireIds: [],
        },
      ]
      const junctions: JunctionNode[] = []

      const result = findWiresThroughJunction('non-existent', wires, junctions)
      expect(result).toEqual([])
    })

    it('returns empty array when wire has no segments', () => {
      const wires: Wire[] = [
        {
          id: 'wire-1',
          from: { type: 'gate', entityId: 'gate-1', pinId: 'pin-1' },
          to: { type: 'gate', entityId: 'gate-2', pinId: 'pin-2' },
          segments: [],
          crossesWireIds: [],
        },
      ]
      const junctions: JunctionNode[] = [
        {
          id: 'junction-1',
          position: { x: 2, y: 0.2, z: 0 },
          signalId: 'sig-test',
          wireIds: [],
        },
      ]

      const result = findWiresThroughJunction('junction-1', wires, junctions)
      expect(result).toEqual([])
    })

    it('finds wires that pass through junction', () => {
      const wires: Wire[] = [
        {
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
        },
        {
          id: 'wire-2',
          from: { type: 'gate', entityId: 'gate-3', pinId: 'pin-3' },
          to: { type: 'gate', entityId: 'gate-4', pinId: 'pin-4' },
          segments: [
            {
              start: { x: 0, y: 0.2, z: 0 },
              end: { x: 8, y: 0.2, z: 0 },
              type: 'horizontal',
            },
          ],
          crossesWireIds: [],
        },
        {
          id: 'wire-3',
          from: { type: 'gate', entityId: 'gate-5', pinId: 'pin-5' },
          to: { type: 'gate', entityId: 'gate-6', pinId: 'pin-6' },
          segments: [
            {
              start: { x: 10, y: 0.2, z: 0 },
              end: { x: 14, y: 0.2, z: 0 },
              type: 'horizontal',
            },
          ],
          crossesWireIds: [],
        },
      ]
      const junctions: JunctionNode[] = [
        {
          id: 'junction-1',
          position: { x: 2, y: 0.2, z: 0 },
          signalId: 'sig-test',
          wireIds: ['wire-1', 'wire-2'],
        },
      ]

      const result = findWiresThroughJunction('junction-1', wires, junctions)
      expect(result).toHaveLength(2)
      expect(result.map((w) => w.id)).toContain('wire-1')
      expect(result.map((w) => w.id)).toContain('wire-2')
      expect(result.map((w) => w.id)).not.toContain('wire-3')
    })

    it('handles junction at segment boundary', () => {
      const wires: Wire[] = [
        {
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
              end: { x: 8, y: 0.2, z: 0 },
              type: 'horizontal',
            },
          ],
          crossesWireIds: [],
        },
      ]
      const junctions: JunctionNode[] = [
        {
          id: 'junction-1',
          position: { x: 4, y: 0.2, z: 0 },
          signalId: 'sig-test',
          wireIds: ['wire-1'],
        },
      ]

      const result = findWiresThroughJunction('junction-1', wires, junctions)
      expect(result).toHaveLength(1)
      expect(result[0].id).toBe('wire-1')
    })
  })

  describe('countWiresThroughJunction', () => {
    it('returns 0 when junction not found', () => {
      const junctions: JunctionNode[] = []

      const result = countWiresThroughJunction('non-existent', junctions)
      expect(result).toBe(0)
    })

    it('returns correct count of wires through junction', () => {
      const junctions: JunctionNode[] = [
        {
          id: 'junction-1',
          position: { x: 4, y: 0.2, z: 0 },
          signalId: 'sig-test',
          wireIds: ['wire-1', 'wire-2', 'wire-3'],
        },
      ]

      const result = countWiresThroughJunction('junction-1', junctions)
      expect(result).toBe(3)
    })

    it('returns 0 when junction has no wires', () => {
      const junctions: JunctionNode[] = [
        {
          id: 'junction-1',
          position: { x: 4, y: 0.2, z: 0 },
          signalId: 'sig-test',
          wireIds: [],
        },
      ]

      const result = countWiresThroughJunction('junction-1', junctions)
      expect(result).toBe(0)
    })
  })

  describe('getJunctionsWithSharedSegments', () => {
    it('returns empty array when wire has no junctions', () => {
      const wire: Wire = {
        id: 'wire-1',
        from: { type: 'gate', entityId: 'gate-1', pinId: 'pin-1' },
        to: { type: 'gate', entityId: 'gate-2', pinId: 'pin-2' },
        segments: [],
        crossesWireIds: [],
      }

      const junctions: JunctionNode[] = []
      const wires: Wire[] = []

      const result = getJunctionsWithSharedSegments(wire, junctions, wires)
      expect(result).toEqual([])
    })

    it('returns empty array when wire does not pass through any junctions', () => {
      const wire: Wire = {
        id: 'wire-1',
        from: { type: 'gate', entityId: 'gate-1', pinId: 'pin-1' },
        to: { type: 'gate', entityId: 'gate-2', pinId: 'pin-2' },
        segments: [],
        crossesWireIds: [],
      }

      const junctions: JunctionNode[] = [
        {
          id: 'junction-1',
          position: { x: 4, y: 0.2, z: 0 },
          signalId: 'sig-test',
          wireIds: ['wire-2', 'wire-3'],
        },
      ]
      const wires: Wire[] = []

      const result = getJunctionsWithSharedSegments(wire, junctions, wires)
      expect(result).toEqual([])
    })

    it('returns empty array when wire passes through junction alone', () => {
      const wire: Wire = {
        id: 'wire-1',
        from: { type: 'gate', entityId: 'gate-1', pinId: 'pin-1' },
        to: { type: 'gate', entityId: 'gate-2', pinId: 'pin-2' },
        segments: [],
        crossesWireIds: [],
      }

      const junctions: JunctionNode[] = [
        {
          id: 'junction-1',
          position: { x: 4, y: 0.2, z: 0 },
          signalId: 'sig-test',
          wireIds: ['wire-1'],
        },
      ]
      const wires: Wire[] = []

      const result = getJunctionsWithSharedSegments(wire, junctions, wires)
      expect(result).toEqual([])
    })

    it('returns junction ID when wire shares segments with other wires', () => {
      const wire: Wire = {
        id: 'wire-1',
        from: { type: 'gate', entityId: 'gate-1', pinId: 'pin-1' },
        to: { type: 'gate', entityId: 'gate-2', pinId: 'pin-2' },
        segments: [],
        crossesWireIds: [],
      }

      const junctions: JunctionNode[] = [
        {
          id: 'junction-1',
          position: { x: 4, y: 0.2, z: 0 },
          signalId: 'sig-test',
          wireIds: ['wire-1', 'wire-2', 'wire-3'],
        },
      ]
      const wires: Wire[] = []

      const result = getJunctionsWithSharedSegments(wire, junctions, wires)
      expect(result).toEqual(['junction-1'])
    })

    it('returns multiple junction IDs when wire shares segments at multiple junctions', () => {
      const wire: Wire = {
        id: 'wire-1',
        from: { type: 'gate', entityId: 'gate-1', pinId: 'pin-1' },
        to: { type: 'gate', entityId: 'gate-2', pinId: 'pin-2' },
        segments: [],
        crossesWireIds: [],
      }

      const junctions: JunctionNode[] = [
        {
          id: 'junction-1',
          position: { x: 4, y: 0.2, z: 0 },
          signalId: 'sig-test',
          wireIds: ['wire-1', 'wire-2'],
        },
        {
          id: 'junction-2',
          position: { x: 6, y: 0.2, z: 0 },
          signalId: 'sig-test',
          wireIds: ['wire-1', 'wire-3'],
        },
        {
          id: 'junction-3',
          position: { x: 8, y: 0.2, z: 0 },
          signalId: 'sig-test',
          wireIds: ['wire-1'], // Only wire-1, no sharing
        },
      ]
      const wires: Wire[] = []

      const result = getJunctionsWithSharedSegments(wire, junctions, wires)
      expect(result).toEqual(['junction-1', 'junction-2'])
      expect(result).not.toContain('junction-3')
    })
  })
})
