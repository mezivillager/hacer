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
  getSegmentInfo,
  calculateIdealCutPoints,
  createBeforeSegment,
  createAfterSegment,
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

    it('allows endpoint intersections at section line corners', () => {
      // Endpoint intersections at section line corners (where both X and Z are on section lines)
      // are valid crossings that should be resolved with arcs
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
      // Should find intersection at section line corner (4, 4)
      expect(intersection).not.toBeNull()
      expect(intersection?.x).toBeCloseTo(4, 3)
      expect(intersection?.z).toBeCloseTo(4, 3)
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
      // Arc radius is calculated as average of cut point distances (allows for boundary adjustments)
      expect(arc.arcRadius).toBeCloseTo(HOP_RADIUS, 3)
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
      // Arc radius is calculated as average of cut point distances (allows for boundary adjustments)
      expect(arc.arcRadius).toBeCloseTo(HOP_RADIUS, 3)
      expect(arc.start.z).toBeCloseTo(intersectionPoint.z - HOP_RADIUS, 3)
      expect(arc.start.x).toBe(intersectionPoint.x)
      expect(arc.end.z).toBeCloseTo(intersectionPoint.z + HOP_RADIUS, 3)
      expect(arc.end.x).toBe(intersectionPoint.x)
    })

    it('handles cut points that are not exactly HOP_RADIUS from intersection (boundary case)', () => {
      const intersectionPoint = createPosition(4, WIRE_HEIGHT, 4)
      // Simulate boundary case where cut points are adjusted
      const cutStart = createPosition(intersectionPoint.x - HOP_RADIUS * 0.8, WIRE_HEIGHT, intersectionPoint.z)
      const cutEnd = createPosition(intersectionPoint.x + HOP_RADIUS, WIRE_HEIGHT, intersectionPoint.z)

      // Should not throw - arc radius is calculated dynamically
      const arc = generateHopArc(cutStart, cutEnd, intersectionPoint)

      expect(arc.type).toBe('arc')
      expect(arc.arcCenter).toEqual({
        x: intersectionPoint.x,
        y: WIRE_HEIGHT,
        z: intersectionPoint.z,
      })
      // Radius should be average of the two distances
      const expectedRadius = (HOP_RADIUS * 0.8 + HOP_RADIUS) / 2
      expect(arc.arcRadius).toBeCloseTo(expectedRadius, 3)
    })

    it('verifies arc spans exactly 2 * HOP_RADIUS in XZ plane for horizontal arc', () => {
      const intersectionPoint = createPosition(4, WIRE_HEIGHT, 4)
      const cutStart = createPosition(intersectionPoint.x - HOP_RADIUS, WIRE_HEIGHT, intersectionPoint.z)
      const cutEnd = createPosition(intersectionPoint.x + HOP_RADIUS, WIRE_HEIGHT, intersectionPoint.z)

      const arc = generateHopArc(cutStart, cutEnd, intersectionPoint)

      const span = Math.abs(arc.end.x - arc.start.x)
      expect(span).toBeCloseTo(2 * HOP_RADIUS, 3)
    })

    it('verifies arc spans exactly 2 * HOP_RADIUS in XZ plane for vertical arc', () => {
      const intersectionPoint = createPosition(4, WIRE_HEIGHT, 4)
      const cutStart = createPosition(intersectionPoint.x, WIRE_HEIGHT, intersectionPoint.z - HOP_RADIUS)
      const cutEnd = createPosition(intersectionPoint.x, WIRE_HEIGHT, intersectionPoint.z + HOP_RADIUS)

      const arc = generateHopArc(cutStart, cutEnd, intersectionPoint)

      const span = Math.abs(arc.end.z - arc.start.z)
      expect(span).toBeCloseTo(2 * HOP_RADIUS, 3)
    })
  })

  describe('getSegmentInfo', () => {
    it('identifies horizontal increasing segment correctly', () => {
      const segment: WireSegment = {
        start: createPosition(0, WIRE_HEIGHT, 4),
        end: createPosition(8, WIRE_HEIGHT, 4),
        type: 'horizontal',
      }

      const info = getSegmentInfo(segment)

      expect(info.isHorizontal).toBe(true)
      expect(info.isIncreasing).toBe(true)
      expect(info.minCoord).toBe(0)
      expect(info.maxCoord).toBe(8)
      expect(info.length).toBeCloseTo(8, 3)
    })

    it('identifies horizontal decreasing segment correctly', () => {
      const segment: WireSegment = {
        start: createPosition(8, WIRE_HEIGHT, 4),
        end: createPosition(0, WIRE_HEIGHT, 4),
        type: 'horizontal',
      }

      const info = getSegmentInfo(segment)

      expect(info.isHorizontal).toBe(true)
      expect(info.isIncreasing).toBe(false)
      expect(info.minCoord).toBe(0)
      expect(info.maxCoord).toBe(8)
      expect(info.length).toBeCloseTo(8, 3)
    })

    it('identifies vertical increasing segment correctly', () => {
      const segment: WireSegment = {
        start: createPosition(4, WIRE_HEIGHT, 0),
        end: createPosition(4, WIRE_HEIGHT, 8),
        type: 'vertical',
      }

      const info = getSegmentInfo(segment)

      expect(info.isHorizontal).toBe(false)
      expect(info.isIncreasing).toBe(true)
      expect(info.minCoord).toBe(0)
      expect(info.maxCoord).toBe(8)
      expect(info.length).toBeCloseTo(8, 3)
    })

    it('identifies vertical decreasing segment correctly', () => {
      const segment: WireSegment = {
        start: createPosition(4, WIRE_HEIGHT, 8),
        end: createPosition(4, WIRE_HEIGHT, 0),
        type: 'vertical',
      }

      const info = getSegmentInfo(segment)

      expect(info.isHorizontal).toBe(false)
      expect(info.isIncreasing).toBe(false)
      expect(info.minCoord).toBe(0)
      expect(info.maxCoord).toBe(8)
      expect(info.length).toBeCloseTo(8, 3)
    })

    it('handles zero-length segment', () => {
      const segment: WireSegment = {
        start: createPosition(4, WIRE_HEIGHT, 4),
        end: createPosition(4, WIRE_HEIGHT, 4),
        type: 'horizontal',
      }

      const info = getSegmentInfo(segment)

      expect(info.isHorizontal).toBe(true)
      expect(info.length).toBeCloseTo(0, 3)
      expect(info.minCoord).toBe(4)
      expect(info.maxCoord).toBe(4)
    })
  })

  describe('calculateIdealCutPoints', () => {
    it('calculates ideal cut points for horizontal increasing segment', () => {
      const segment: WireSegment = {
        start: createPosition(0, WIRE_HEIGHT, 4),
        end: createPosition(8, WIRE_HEIGHT, 4),
        type: 'horizontal',
      }
      const segmentInfo = getSegmentInfo(segment)
      const intersection = createPosition(4, WIRE_HEIGHT, 4)

      const cutPoints = calculateIdealCutPoints(intersection, segmentInfo)

      expect(cutPoints.cutStart.x).toBeCloseTo(4 - HOP_RADIUS, 3)
      expect(cutPoints.cutStart.z).toBe(intersection.z)
      expect(cutPoints.cutEnd.x).toBeCloseTo(4 + HOP_RADIUS, 3)
      expect(cutPoints.cutEnd.z).toBe(intersection.z)
    })

    it('calculates ideal cut points for horizontal decreasing segment', () => {
      const segment: WireSegment = {
        start: createPosition(8, WIRE_HEIGHT, 4),
        end: createPosition(0, WIRE_HEIGHT, 4),
        type: 'horizontal',
      }
      const segmentInfo = getSegmentInfo(segment)
      const intersection = createPosition(4, WIRE_HEIGHT, 4)

      const cutPoints = calculateIdealCutPoints(intersection, segmentInfo)

      // For decreasing, cutStart should be higher x, cutEnd should be lower x
      expect(cutPoints.cutStart.x).toBeCloseTo(4 + HOP_RADIUS, 3)
      expect(cutPoints.cutStart.z).toBe(intersection.z)
      expect(cutPoints.cutEnd.x).toBeCloseTo(4 - HOP_RADIUS, 3)
      expect(cutPoints.cutEnd.z).toBe(intersection.z)
    })

    it('calculates ideal cut points for vertical increasing segment', () => {
      const segment: WireSegment = {
        start: createPosition(4, WIRE_HEIGHT, 0),
        end: createPosition(4, WIRE_HEIGHT, 8),
        type: 'vertical',
      }
      const segmentInfo = getSegmentInfo(segment)
      const intersection = createPosition(4, WIRE_HEIGHT, 4)

      const cutPoints = calculateIdealCutPoints(intersection, segmentInfo)

      expect(cutPoints.cutStart.x).toBe(intersection.x)
      expect(cutPoints.cutStart.z).toBeCloseTo(4 - HOP_RADIUS, 3)
      expect(cutPoints.cutEnd.x).toBe(intersection.x)
      expect(cutPoints.cutEnd.z).toBeCloseTo(4 + HOP_RADIUS, 3)
    })

    it('calculates ideal cut points for vertical decreasing segment', () => {
      const segment: WireSegment = {
        start: createPosition(4, WIRE_HEIGHT, 8),
        end: createPosition(4, WIRE_HEIGHT, 0),
        type: 'vertical',
      }
      const segmentInfo = getSegmentInfo(segment)
      const intersection = createPosition(4, WIRE_HEIGHT, 4)

      const cutPoints = calculateIdealCutPoints(intersection, segmentInfo)

      // For decreasing, cutStart should be higher z, cutEnd should be lower z
      expect(cutPoints.cutStart.x).toBe(intersection.x)
      expect(cutPoints.cutStart.z).toBeCloseTo(4 + HOP_RADIUS, 3)
      expect(cutPoints.cutEnd.x).toBe(intersection.x)
      expect(cutPoints.cutEnd.z).toBeCloseTo(4 - HOP_RADIUS, 3)
    })

    it('sets y coordinate to WIRE_HEIGHT', () => {
      const segment: WireSegment = {
        start: createPosition(0, WIRE_HEIGHT, 4),
        end: createPosition(8, WIRE_HEIGHT, 4),
        type: 'horizontal',
      }
      const segmentInfo = getSegmentInfo(segment)
      const intersection = createPosition(4, WIRE_HEIGHT, 4)

      const cutPoints = calculateIdealCutPoints(intersection, segmentInfo)

      expect(cutPoints.cutStart.y).toBe(WIRE_HEIGHT)
      expect(cutPoints.cutEnd.y).toBe(WIRE_HEIGHT)
    })
  })

  describe('createBeforeSegment', () => {
    it('creates segment from current start to cut start when there is a gap', () => {
      const segment: WireSegment = {
        start: createPosition(0, WIRE_HEIGHT, 4),
        end: createPosition(8, WIRE_HEIGHT, 4),
        type: 'horizontal',
      }
      const segmentInfo = getSegmentInfo(segment)
      const currentStart = createPosition(0, WIRE_HEIGHT, 4)
      const cutStart = createPosition(3.925, WIRE_HEIGHT, 4)

      const beforeSegment = createBeforeSegment(currentStart, cutStart, segmentInfo, segment)

      expect(beforeSegment).not.toBeNull()
      expect(beforeSegment!.start.x).toBeCloseTo(currentStart.x, 3)
      expect(beforeSegment!.end.x).toBeCloseTo(cutStart.x, 3)
      expect(beforeSegment!.type).toBe(segment.type)
    })

    it('returns null when current start and cut start are very close', () => {
      const segment: WireSegment = {
        start: createPosition(0, WIRE_HEIGHT, 4),
        end: createPosition(8, WIRE_HEIGHT, 4),
        type: 'horizontal',
      }
      const segmentInfo = getSegmentInfo(segment)
      const currentStart = createPosition(3.925, WIRE_HEIGHT, 4)
      const cutStart = createPosition(3.9255, WIRE_HEIGHT, 4) // Very close (0.0005 < TOLERANCE)

      const beforeSegment = createBeforeSegment(currentStart, cutStart, segmentInfo, segment)

      expect(beforeSegment).toBeNull()
    })

    it('returns null when cut start is behind current start', () => {
      const segment: WireSegment = {
        start: createPosition(0, WIRE_HEIGHT, 4),
        end: createPosition(8, WIRE_HEIGHT, 4),
        type: 'horizontal',
      }
      const segmentInfo = getSegmentInfo(segment)
      const currentStart = createPosition(5, WIRE_HEIGHT, 4)
      const cutStart = createPosition(3, WIRE_HEIGHT, 4) // Behind

      const beforeSegment = createBeforeSegment(currentStart, cutStart, segmentInfo, segment)

      expect(beforeSegment).toBeNull()
    })

    it('works for vertical segments', () => {
      const segment: WireSegment = {
        start: createPosition(4, WIRE_HEIGHT, 0),
        end: createPosition(4, WIRE_HEIGHT, 8),
        type: 'vertical',
      }
      const segmentInfo = getSegmentInfo(segment)
      const currentStart = createPosition(4, WIRE_HEIGHT, 0)
      const cutStart = createPosition(4, WIRE_HEIGHT, 3.925)

      const beforeSegment = createBeforeSegment(currentStart, cutStart, segmentInfo, segment)

      expect(beforeSegment).not.toBeNull()
      expect(beforeSegment!.start.z).toBeCloseTo(currentStart.z, 3)
      expect(beforeSegment!.end.z).toBeCloseTo(cutStart.z, 3)
    })
  })

  describe('createAfterSegment', () => {
    it('creates segment from cut end to segment end when there is a gap', () => {
      const segment: WireSegment = {
        start: createPosition(0, WIRE_HEIGHT, 4),
        end: createPosition(8, WIRE_HEIGHT, 4),
        type: 'horizontal',
      }
      const segmentInfo = getSegmentInfo(segment)
      const cutEnd = createPosition(4.075, WIRE_HEIGHT, 4)
      const segmentEnd = createPosition(8, WIRE_HEIGHT, 4)

      const afterSegment = createAfterSegment(cutEnd, segmentEnd, segmentInfo, segment)

      expect(afterSegment).not.toBeNull()
      expect(afterSegment!.start.x).toBeCloseTo(cutEnd.x, 3)
      expect(afterSegment!.end.x).toBeCloseTo(segmentEnd.x, 3)
      expect(afterSegment!.type).toBe(segment.type)
    })

    it('returns null when cut end and segment end are very close', () => {
      const segment: WireSegment = {
        start: createPosition(0, WIRE_HEIGHT, 4),
        end: createPosition(8, WIRE_HEIGHT, 4),
        type: 'horizontal',
      }
      const segmentInfo = getSegmentInfo(segment)
      const cutEnd = createPosition(7.9995, WIRE_HEIGHT, 4)
      const segmentEnd = createPosition(8, WIRE_HEIGHT, 4) // Very close (0.0005 < TOLERANCE)

      const afterSegment = createAfterSegment(cutEnd, segmentEnd, segmentInfo, segment)

      expect(afterSegment).toBeNull()
    })

    it('returns null when cut end has passed segment end', () => {
      const segment: WireSegment = {
        start: createPosition(0, WIRE_HEIGHT, 4),
        end: createPosition(8, WIRE_HEIGHT, 4),
        type: 'horizontal',
      }
      const segmentInfo = getSegmentInfo(segment)
      const cutEnd = createPosition(9, WIRE_HEIGHT, 4) // Past end
      const segmentEnd = createPosition(8, WIRE_HEIGHT, 4)

      const afterSegment = createAfterSegment(cutEnd, segmentEnd, segmentInfo, segment)

      expect(afterSegment).toBeNull()
    })

    it('works for vertical segments', () => {
      const segment: WireSegment = {
        start: createPosition(4, WIRE_HEIGHT, 0),
        end: createPosition(4, WIRE_HEIGHT, 8),
        type: 'vertical',
      }
      const segmentInfo = getSegmentInfo(segment)
      const cutEnd = createPosition(4, WIRE_HEIGHT, 4.075)
      const segmentEnd = createPosition(4, WIRE_HEIGHT, 8)

      const afterSegment = createAfterSegment(cutEnd, segmentEnd, segmentInfo, segment)

      expect(afterSegment).not.toBeNull()
      expect(afterSegment!.start.z).toBeCloseTo(cutEnd.z, 3)
      expect(afterSegment!.end.z).toBeCloseTo(segmentEnd.z, 3)
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

    it('skips crossing if segment is too short for hop', () => {
      const segment: WireSegment = {
        start: createPosition(0, WIRE_HEIGHT, 4),
        end: createPosition(0.05, WIRE_HEIGHT, 4), // Very short segment (< 2 * HOP_RADIUS)
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

      // Should skip the crossing and return original segment (or segments without arc)
      const result = replaceSegmentWithHop(segment, crossings, existingWires)
      const arcSegments = result.filter((s) => s.type === 'arc')
      expect(arcSegments.length).toBe(0)
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

    it('verifies arc start/end points match cut points exactly', () => {
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
      const arcSegment = result.find((s) => s.type === 'arc')
      expect(arcSegment).toBeDefined()

      // Verify arc start/end are exactly HOP_RADIUS from intersection
      const intersection = crossings[0].intersectionPoint
      const startDist = Math.abs(arcSegment!.start.x - intersection.x)
      const endDist = Math.abs(arcSegment!.end.x - intersection.x)
      expect(startDist).toBeCloseTo(HOP_RADIUS, 3)
      expect(endDist).toBeCloseTo(HOP_RADIUS, 3)
    })

    it('verifies segments before and after arc connect without gaps', () => {
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

      // Should have: [before segment] + [arc] + [after segment]
      expect(result.length).toBeGreaterThanOrEqual(3)

      // Find arc index
      const arcIndex = result.findIndex((s) => s.type === 'arc')
      expect(arcIndex).toBeGreaterThanOrEqual(0)

      // Verify before segment connects to arc start
      if (arcIndex > 0) {
        const beforeSegment = result[arcIndex - 1]
        const arc = result[arcIndex]
        expect(beforeSegment.end.x).toBeCloseTo(arc.start.x, 3)
        expect(beforeSegment.end.z).toBeCloseTo(arc.start.z, 3)
      }

      // Verify after segment connects to arc end
      if (arcIndex < result.length - 1) {
        const afterSegment = result[arcIndex + 1]
        const arc = result[arcIndex]
        expect(afterSegment.start.x).toBeCloseTo(arc.end.x, 3)
        expect(afterSegment.start.z).toBeCloseTo(arc.end.z, 3)
      }
    })

    it('handles intersection near segment start', () => {
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
          intersectionPoint: createPosition(0.1, WIRE_HEIGHT, 4), // Very close to start
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
              start: createPosition(0.1, WIRE_HEIGHT, 0),
              end: createPosition(0.1, WIRE_HEIGHT, 8),
              type: 'vertical',
            },
          ],
        },
      ]

      // Should skip if too close to boundary, or handle gracefully
      const result = replaceSegmentWithHop(segment, crossings, existingWires)
      // Result should either skip the crossing or handle it properly
      expect(result.length).toBeGreaterThan(0)
    })

    it('handles intersection near segment end', () => {
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
          intersectionPoint: createPosition(7.9, WIRE_HEIGHT, 4), // Very close to end
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
              start: createPosition(7.9, WIRE_HEIGHT, 0),
              end: createPosition(7.9, WIRE_HEIGHT, 8),
              type: 'vertical',
            },
          ],
        },
      ]

      // Should skip if too close to boundary, or handle gracefully
      const result = replaceSegmentWithHop(segment, crossings, existingWires)
      // Result should either skip the crossing or handle it properly
      expect(result.length).toBeGreaterThan(0)
    })

    it('handles intersection at segment midpoint', () => {
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
          intersectionPoint: createPosition(4, WIRE_HEIGHT, 4), // Midpoint
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
      const arcSegment = result.find((s) => s.type === 'arc')
      expect(arcSegment).toBeDefined()

      // Verify arc is centered on intersection
      expect(arcSegment!.arcCenter?.x).toBeCloseTo(4, 3)
      expect(arcSegment!.arcCenter?.z).toBeCloseTo(4, 3)
    })

    it('handles segment exactly 2 * HOP_RADIUS long', () => {
      const segmentLength = 2 * HOP_RADIUS
      const segment: WireSegment = {
        start: createPosition(0, WIRE_HEIGHT, 4),
        end: createPosition(segmentLength, WIRE_HEIGHT, 4),
        type: 'horizontal',
      }
      const crossings: Crossing[] = [
        {
          segmentIndex: 0,
          existingWireId: 'wire-1',
          existingSegmentIndex: 0,
          intersectionPoint: createPosition(HOP_RADIUS, WIRE_HEIGHT, 4), // Midpoint
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
              start: createPosition(HOP_RADIUS, WIRE_HEIGHT, 0),
              end: createPosition(HOP_RADIUS, WIRE_HEIGHT, 8),
              type: 'vertical',
            },
          ],
        },
      ]

      const result = replaceSegmentWithHop(segment, crossings, existingWires)
      const arcSegment = result.find((s) => s.type === 'arc')
      expect(arcSegment).toBeDefined()
    })

    it('verifies no overlaps between segments', () => {
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

      // Verify segments are in order and don't overlap
      for (let i = 0; i < result.length - 1; i++) {
        const current = result[i]
        const next = result[i + 1]

        // Current segment end should match next segment start
        expect(current.end.x).toBeCloseTo(next.start.x, 3)
        expect(current.end.z).toBeCloseTo(next.start.z, 3)
      }
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

    it('handles multiple crossings on same segment correctly', () => {
      const newWireSegments: WireSegment[] = [
        {
          start: createPosition(0, WIRE_HEIGHT, 4),
          end: createPosition(16, WIRE_HEIGHT, 4),
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
        {
          id: 'wire-3',
          fromGateId: 'gate-5',
          fromPinId: 'pin-1',
          toGateId: 'gate-6',
          toPinId: 'pin-2',
          segments: [
            {
              start: createPosition(12, WIRE_HEIGHT, 0),
              end: createPosition(12, WIRE_HEIGHT, 8),
              type: 'vertical',
            },
          ],
        },
      ]

      const result = resolveCrossings(newWireSegments, existingWires)

      // Should have 3 arcs
      const arcSegments = result.filter((s) => s.type === 'arc')
      expect(arcSegments.length).toBe(3)

      // Verify all segments connect properly
      for (let i = 0; i < result.length - 1; i++) {
        const current = result[i]
        const next = result[i + 1]
        expect(current.end.x).toBeCloseTo(next.start.x, 3)
        expect(current.end.z).toBeCloseTo(next.start.z, 3)
      }
    })

    it('maintains arc validity after path recalculation', () => {
      // Simulate gate rotation/dragging by recalculating crossings
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

      // First resolution
      const result1 = resolveCrossings(newWireSegments, existingWires)
      const arc1 = result1.find((s) => s.type === 'arc')
      expect(arc1).toBeDefined()

      // Verify arc is valid
      if (arc1 && arc1.arcCenter && arc1.arcRadius) {
        const intersection = createPosition(4, WIRE_HEIGHT, 4)
        const startDist = Math.abs(arc1.start.x - intersection.x)
        const endDist = Math.abs(arc1.end.x - intersection.x)
        expect(startDist).toBeCloseTo(arc1.arcRadius, 3)
        expect(endDist).toBeCloseTo(arc1.arcRadius, 3)
      }

      // Simulate path change (segment moved slightly)
      const newWireSegments2: WireSegment[] = [
        {
          start: createPosition(0.1, WIRE_HEIGHT, 4),
          end: createPosition(8.1, WIRE_HEIGHT, 4),
          type: 'horizontal',
        },
      ]

      // Second resolution should still work
      const result2 = resolveCrossings(newWireSegments2, existingWires)
      const arc2 = result2.find((s) => s.type === 'arc')
      expect(arc2).toBeDefined()
    })

    it('handles adjacent segments with crossings at boundaries', () => {
      const newWireSegments: WireSegment[] = [
        {
          start: createPosition(0, WIRE_HEIGHT, 4),
          end: createPosition(4, WIRE_HEIGHT, 4),
          type: 'horizontal',
        },
        {
          start: createPosition(4, WIRE_HEIGHT, 4),
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

      const result = resolveCrossings(newWireSegments, existingWires)

      // Should handle boundary crossing correctly (may deduplicate or handle separately)
      expect(result.length).toBeGreaterThan(0)
      // Verify no duplicate arcs at boundary
      const arcSegments = result.filter((s) => s.type === 'arc')
      // Should have at most 1 arc (deduplicated at boundary)
      expect(arcSegments.length).toBeLessThanOrEqual(1)
    })
  })
})

