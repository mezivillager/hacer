import { describe, it, expect } from 'vitest'
import type { Position, Wire } from '@/store/types'
import type { WireSegment } from './types'
import { WIRE_HEIGHT, HOP_RADIUS } from './types'
import {
  findSegmentCrossing,
  detectCrossings,
  generateHopArc,
  replaceSegmentWithHop,
  resolveCrossings,
  type Crossing,
} from './crossing'

describe('Wire Crossing Detection and Resolution', () => {
  const createPosition = (x: number, y: number, z: number): Position => ({ x, y, z })

  describe('findSegmentCrossing', () => {
    it('finds intersection between perpendicular segments that cross', () => {
      const horizontalSeg: WireSegment = {
        start: createPosition(0, WIRE_HEIGHT, 4),
        end: createPosition(8, WIRE_HEIGHT, 4),
        type: 'horizontal',
      }
      const verticalSeg: WireSegment = {
        start: createPosition(4, WIRE_HEIGHT, 0),
        end: createPosition(4, WIRE_HEIGHT, 8),
        type: 'vertical',
      }

      const intersection = findSegmentCrossing(horizontalSeg, verticalSeg)

      expect(intersection).not.toBeNull()
      expect(intersection?.x).toBeCloseTo(4, 3)
      expect(intersection?.z).toBeCloseTo(4, 3)
      expect(intersection?.y).toBe(WIRE_HEIGHT)
    })

    it('returns null for segments that do not cross (parallel horizontal)', () => {
      const horizontal1: WireSegment = {
        start: createPosition(0, WIRE_HEIGHT, 4),
        end: createPosition(8, WIRE_HEIGHT, 4),
        type: 'horizontal',
      }
      const horizontal2: WireSegment = {
        start: createPosition(0, WIRE_HEIGHT, 8),
        end: createPosition(8, WIRE_HEIGHT, 8),
        type: 'horizontal',
      }

      const intersection = findSegmentCrossing(horizontal1, horizontal2)
      expect(intersection).toBeNull()
    })

    it('returns null for segments that do not cross (parallel vertical)', () => {
      const vertical1: WireSegment = {
        start: createPosition(4, WIRE_HEIGHT, 0),
        end: createPosition(4, WIRE_HEIGHT, 8),
        type: 'vertical',
      }
      const vertical2: WireSegment = {
        start: createPosition(8, WIRE_HEIGHT, 0),
        end: createPosition(8, WIRE_HEIGHT, 8),
        type: 'vertical',
      }

      const intersection = findSegmentCrossing(vertical1, vertical2)
      expect(intersection).toBeNull()
    })

    it('returns null when segments touch at endpoints', () => {
      const horizontalSeg: WireSegment = {
        start: createPosition(0, WIRE_HEIGHT, 4),
        end: createPosition(4, WIRE_HEIGHT, 4),
        type: 'horizontal',
      }
      const verticalSeg: WireSegment = {
        start: createPosition(4, WIRE_HEIGHT, 0),
        end: createPosition(4, WIRE_HEIGHT, 4),
        type: 'vertical',
      }

      const intersection = findSegmentCrossing(horizontalSeg, verticalSeg)
      expect(intersection).toBeNull()
    })

    it('returns null when segments do not intersect within bounds', () => {
      const horizontalSeg: WireSegment = {
        start: createPosition(0, WIRE_HEIGHT, 4),
        end: createPosition(4, WIRE_HEIGHT, 4),
        type: 'horizontal',
      }
      const verticalSeg: WireSegment = {
        start: createPosition(8, WIRE_HEIGHT, 0),
        end: createPosition(8, WIRE_HEIGHT, 8),
        type: 'vertical',
      }

      const intersection = findSegmentCrossing(horizontalSeg, verticalSeg)
      expect(intersection).toBeNull()
    })
  })

  describe('detectCrossings', () => {
    it('detects single crossing between two wires', () => {
      const newWireSegments: WireSegment[] = [
        {
          start: createPosition(0, WIRE_HEIGHT, 4),
          end: createPosition(8, WIRE_HEIGHT, 4),
          type: 'horizontal',
        },
      ]
      const existingWires: Wire[] = [
        {
          id: 'wire-1',
          fromGateId: 'gate-1',
          fromPinId: 'pin-1',
          toGateId: 'gate-2',
          toPinId: 'pin-2',
          segments: [
            {
              start: createPosition(4, WIRE_HEIGHT, 0),
              end: createPosition(4, WIRE_HEIGHT, 8),
              type: 'vertical',
            },
          ],
        },
      ]

      const crossings = detectCrossings(newWireSegments, existingWires)

      expect(crossings).toHaveLength(1)
      expect(crossings[0].segmentIndex).toBe(0)
      expect(crossings[0].existingWireId).toBe('wire-1')
      expect(crossings[0].intersectionPoint.x).toBeCloseTo(4, 3)
      expect(crossings[0].intersectionPoint.z).toBeCloseTo(4, 3)
    })

    it('returns empty array when no crossings exist', () => {
      const newWireSegments: WireSegment[] = [
        {
          start: createPosition(0, WIRE_HEIGHT, 4),
          end: createPosition(8, WIRE_HEIGHT, 4),
          type: 'horizontal',
        },
      ]
      const existingWires: Wire[] = [
        {
          id: 'wire-1',
          fromGateId: 'gate-1',
          fromPinId: 'pin-1',
          toGateId: 'gate-2',
          toPinId: 'pin-2',
          segments: [
            {
              start: createPosition(0, WIRE_HEIGHT, 8),
              end: createPosition(8, WIRE_HEIGHT, 8),
              type: 'horizontal',
            },
          ],
        },
      ]

      const crossings = detectCrossings(newWireSegments, existingWires)
      expect(crossings).toHaveLength(0)
    })

    it('skips entry/exit segments', () => {
      const newWireSegments: WireSegment[] = [
        {
          start: createPosition(0, WIRE_HEIGHT, 4),
          end: createPosition(4, WIRE_HEIGHT, 4),
          type: 'exit',
        },
        {
          start: createPosition(4, WIRE_HEIGHT, 4),
          end: createPosition(8, WIRE_HEIGHT, 4),
          type: 'horizontal',
        },
        {
          start: createPosition(8, WIRE_HEIGHT, 4),
          end: createPosition(12, WIRE_HEIGHT, 4),
          type: 'entry',
        },
      ]
      const existingWires: Wire[] = [
        {
          id: 'wire-1',
          fromGateId: 'gate-1',
          fromPinId: 'pin-1',
          toGateId: 'gate-2',
          toPinId: 'pin-2',
          segments: [
            {
              start: createPosition(6, WIRE_HEIGHT, 0),
              end: createPosition(6, WIRE_HEIGHT, 8),
              type: 'vertical',
            },
          ],
        },
      ]

      const crossings = detectCrossings(newWireSegments, existingWires)

      // Should only detect crossing on the horizontal segment, not entry/exit
      expect(crossings).toHaveLength(1)
      expect(crossings[0].segmentIndex).toBe(1) // Only the horizontal segment
    })

    it('skips arc segments', () => {
      const newWireSegments: WireSegment[] = [
        {
          start: createPosition(0, WIRE_HEIGHT, 4),
          end: createPosition(8, WIRE_HEIGHT, 4),
          type: 'horizontal',
        },
      ]
      const existingWires: Wire[] = [
        {
          id: 'wire-1',
          fromGateId: 'gate-1',
          fromPinId: 'pin-1',
          toGateId: 'gate-2',
          toPinId: 'pin-2',
          segments: [
            {
              start: createPosition(4, WIRE_HEIGHT, 2),
              end: createPosition(4, WIRE_HEIGHT, 6),
              type: 'arc',
              arcCenter: createPosition(4, WIRE_HEIGHT, 4),
              arcRadius: HOP_RADIUS,
            },
          ],
        },
      ]

      const crossings = detectCrossings(newWireSegments, existingWires)
      expect(crossings).toHaveLength(0)
    })

    it('detects multiple crossings on different segments', () => {
      const newWireSegments: WireSegment[] = [
        {
          start: createPosition(0, WIRE_HEIGHT, 4),
          end: createPosition(8, WIRE_HEIGHT, 4),
          type: 'horizontal',
        },
        {
          start: createPosition(8, WIRE_HEIGHT, 4),
          end: createPosition(8, WIRE_HEIGHT, 12),
          type: 'vertical',
        },
      ]
      const existingWires: Wire[] = [
        {
          id: 'wire-1',
          fromGateId: 'gate-1',
          fromPinId: 'pin-1',
          toGateId: 'gate-2',
          toPinId: 'pin-2',
          segments: [
            {
              start: createPosition(4, WIRE_HEIGHT, 0),
              end: createPosition(4, WIRE_HEIGHT, 8),
              type: 'vertical',
            },
            {
              start: createPosition(4, WIRE_HEIGHT, 8),
              end: createPosition(12, WIRE_HEIGHT, 8),
              type: 'horizontal',
            },
          ],
        },
      ]

      const crossings = detectCrossings(newWireSegments, existingWires)

      expect(crossings).toHaveLength(2)
      expect(crossings[0].segmentIndex).toBe(0)
      expect(crossings[1].segmentIndex).toBe(1)
    })
  })

  describe('generateHopArc', () => {
    it('creates arc with correct metadata for horizontal segment', () => {
      const intersectionPoint = createPosition(4, WIRE_HEIGHT, 4)
      const cutStart = createPosition(intersectionPoint.x - HOP_RADIUS, WIRE_HEIGHT, intersectionPoint.z)
      const cutEnd = createPosition(intersectionPoint.x + HOP_RADIUS, WIRE_HEIGHT, intersectionPoint.z)

      const arc = generateHopArc(cutStart, cutEnd, intersectionPoint)

      expect(arc.type).toBe('arc')
      expect(arc.arcCenter).toEqual({
        x: intersectionPoint.x,
        y: WIRE_HEIGHT,
        z: intersectionPoint.z,
      })
      expect(arc.arcRadius).toBe(HOP_RADIUS)
      expect(arc.start.x).toBeCloseTo(intersectionPoint.x - HOP_RADIUS, 3)
      expect(arc.start.z).toBe(intersectionPoint.z)
      expect(arc.end.x).toBeCloseTo(intersectionPoint.x + HOP_RADIUS, 3)
      expect(arc.end.z).toBe(intersectionPoint.z)
    })

    it('creates arc with correct metadata for vertical segment', () => {
      const intersectionPoint = createPosition(4, WIRE_HEIGHT, 4)
      const cutStart = createPosition(intersectionPoint.x, WIRE_HEIGHT, intersectionPoint.z - HOP_RADIUS)
      const cutEnd = createPosition(intersectionPoint.x, WIRE_HEIGHT, intersectionPoint.z + HOP_RADIUS)

      const arc = generateHopArc(cutStart, cutEnd, intersectionPoint)

      expect(arc.type).toBe('arc')
      expect(arc.arcCenter).toEqual({
        x: intersectionPoint.x,
        y: WIRE_HEIGHT,
        z: intersectionPoint.z,
      })
      expect(arc.arcRadius).toBe(HOP_RADIUS)
      expect(arc.start.z).toBeCloseTo(intersectionPoint.z - HOP_RADIUS, 3)
      expect(arc.start.x).toBe(intersectionPoint.x)
      expect(arc.end.z).toBeCloseTo(intersectionPoint.z + HOP_RADIUS, 3)
      expect(arc.end.x).toBe(intersectionPoint.x)
    })
  })

  describe('replaceSegmentWithHop', () => {
    it('replaces segment with hop arc for single crossing', () => {
      const segment: WireSegment = {
        start: createPosition(0, WIRE_HEIGHT, 4),
        end: createPosition(8, WIRE_HEIGHT, 4),
        type: 'horizontal',
      }
      const crossings: Crossing[] = [
        {
          segmentIndex: 0,
          existingWireId: 'wire-1',
          existingSegmentIndex: 0,
          intersectionPoint: createPosition(4, WIRE_HEIGHT, 4),
        },
      ]
      const existingWires: Wire[] = [
        {
          id: 'wire-1',
          fromGateId: 'gate-1',
          fromPinId: 'pin-1',
          toGateId: 'gate-2',
          toPinId: 'pin-2',
          segments: [
            {
              start: createPosition(4, WIRE_HEIGHT, 0),
              end: createPosition(4, WIRE_HEIGHT, 8),
              type: 'vertical',
            },
          ],
        },
      ]

      const result = replaceSegmentWithHop(segment, crossings, existingWires)

      expect(result.length).toBeGreaterThan(1)
      const arcSegment = result.find((s) => s.type === 'arc')
      expect(arcSegment).toBeDefined()
      expect(arcSegment?.type).toBe('arc')
    })

    it('throws error if segment is too short for hop', () => {
      const segment: WireSegment = {
        start: createPosition(0, WIRE_HEIGHT, 4),
        end: createPosition(0.05, WIRE_HEIGHT, 4), // Very short segment
        type: 'horizontal',
      }
      const crossings: Crossing[] = [
        {
          segmentIndex: 0,
          existingWireId: 'wire-1',
          existingSegmentIndex: 0,
          intersectionPoint: createPosition(0.025, WIRE_HEIGHT, 4),
        },
      ]
      const existingWires: Wire[] = [
        {
          id: 'wire-1',
          fromGateId: 'gate-1',
          fromPinId: 'pin-1',
          toGateId: 'gate-2',
          toPinId: 'pin-2',
          segments: [
            {
              start: createPosition(0.025, WIRE_HEIGHT, 0),
              end: createPosition(0.025, WIRE_HEIGHT, 8),
              type: 'vertical',
            },
          ],
        },
      ]

      expect(() => replaceSegmentWithHop(segment, crossings, existingWires)).toThrow(
        'Cannot resolve wire crossing: segment is too short'
      )
    })

    it('throws error if existing wire for crossing is not found', () => {
      const segment: WireSegment = {
        start: createPosition(0, WIRE_HEIGHT, 4),
        end: createPosition(8, WIRE_HEIGHT, 4),
        type: 'horizontal',
      }
      const crossings: Crossing[] = [
        {
          segmentIndex: 0,
          existingWireId: 'wire-nonexistent',
          existingSegmentIndex: 0,
          intersectionPoint: createPosition(4, WIRE_HEIGHT, 4),
        },
      ]
      const existingWires: Wire[] = []

      expect(() => replaceSegmentWithHop(segment, crossings, existingWires)).toThrow(
        'Cannot resolve wire crossing: existing wire not found'
      )
    })

    it('throws error if existing segment index is invalid', () => {
      const segment: WireSegment = {
        start: createPosition(0, WIRE_HEIGHT, 4),
        end: createPosition(8, WIRE_HEIGHT, 4),
        type: 'horizontal',
      }
      const crossings: Crossing[] = [
        {
          segmentIndex: 0,
          existingWireId: 'wire-1',
          existingSegmentIndex: 999, // Invalid index
          intersectionPoint: createPosition(4, WIRE_HEIGHT, 4),
        },
      ]
      const existingWires: Wire[] = [
        {
          id: 'wire-1',
          fromGateId: 'gate-1',
          fromPinId: 'pin-1',
          toGateId: 'gate-2',
          toPinId: 'pin-2',
          segments: [
            {
              start: createPosition(4, WIRE_HEIGHT, 0),
              end: createPosition(4, WIRE_HEIGHT, 8),
              type: 'vertical',
            },
          ],
        },
      ]

      expect(() => replaceSegmentWithHop(segment, crossings, existingWires)).toThrow(
        'Cannot resolve wire crossing: invalid segment index'
      )
    })

    it('replaces segment with multiple hops for multiple crossings', () => {
      const segment: WireSegment = {
        start: createPosition(0, WIRE_HEIGHT, 4),
        end: createPosition(12, WIRE_HEIGHT, 4),
        type: 'horizontal',
      }
      const crossings: Crossing[] = [
        {
          segmentIndex: 0,
          existingWireId: 'wire-1',
          existingSegmentIndex: 0,
          intersectionPoint: createPosition(4, WIRE_HEIGHT, 4),
        },
        {
          segmentIndex: 0,
          existingWireId: 'wire-2',
          existingSegmentIndex: 0,
          intersectionPoint: createPosition(8, WIRE_HEIGHT, 4),
        },
      ]
      const existingWires: Wire[] = [
        {
          id: 'wire-1',
          fromGateId: 'gate-1',
          fromPinId: 'pin-1',
          toGateId: 'gate-2',
          toPinId: 'pin-2',
          segments: [
            {
              start: createPosition(4, WIRE_HEIGHT, 0),
              end: createPosition(4, WIRE_HEIGHT, 8),
              type: 'vertical',
            },
          ],
        },
        {
          id: 'wire-2',
          fromGateId: 'gate-3',
          fromPinId: 'pin-1',
          toGateId: 'gate-4',
          toPinId: 'pin-2',
          segments: [
            {
              start: createPosition(8, WIRE_HEIGHT, 0),
              end: createPosition(8, WIRE_HEIGHT, 8),
              type: 'vertical',
            },
          ],
        },
      ]

      const result = replaceSegmentWithHop(segment, crossings, existingWires)

      const arcSegments = result.filter((s) => s.type === 'arc')
      expect(arcSegments.length).toBe(2)
    })
  })

  describe('resolveCrossings', () => {
    it('returns original segments when no crossings exist', () => {
      const newWireSegments: WireSegment[] = [
        {
          start: createPosition(0, WIRE_HEIGHT, 4),
          end: createPosition(8, WIRE_HEIGHT, 4),
          type: 'horizontal',
        },
      ]
      const existingWires: Wire[] = []

      const result = resolveCrossings(newWireSegments, existingWires)

      expect(result).toEqual(newWireSegments)
    })

    it('resolves crossings across multiple segments', () => {
      const newWireSegments: WireSegment[] = [
        {
          start: createPosition(0, WIRE_HEIGHT, 4),
          end: createPosition(8, WIRE_HEIGHT, 4),
          type: 'horizontal',
        },
        {
          start: createPosition(8, WIRE_HEIGHT, 4),
          end: createPosition(8, WIRE_HEIGHT, 8),
          type: 'vertical',
        },
      ]
      const existingWires: Wire[] = [
        {
          id: 'wire-1',
          fromGateId: 'gate-1',
          fromPinId: 'pin-1',
          toGateId: 'gate-2',
          toPinId: 'pin-2',
          segments: [
            {
              start: createPosition(4, WIRE_HEIGHT, 0),
              end: createPosition(4, WIRE_HEIGHT, 8),
              type: 'vertical',
            },
          ],
        },
        {
          id: 'wire-2',
          fromGateId: 'gate-3',
          fromPinId: 'pin-1',
          toGateId: 'gate-4',
          toPinId: 'pin-2',
          segments: [
            {
              start: createPosition(8, WIRE_HEIGHT, 6),
              end: createPosition(12, WIRE_HEIGHT, 6),
              type: 'horizontal',
            },
          ],
        },
      ]

      const result = resolveCrossings(newWireSegments, existingWires)

      // Should have arcs for both crossings
      const arcSegments = result.filter((s) => s.type === 'arc')
      expect(arcSegments.length).toBeGreaterThan(0)
      expect(result.length).toBeGreaterThan(newWireSegments.length)
    })
  })
})

