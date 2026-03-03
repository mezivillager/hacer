/**
 * Wire Position Calculation Utilities
 *
 * Utilities for calculating positions on wires and working with wire segments.
 */

import type { Wire, Position } from '@/store/types'
import type { WireSegment } from '@/utils/wiringScheme/types'
import { WIRE_HEIGHT } from '@/utils/wiringScheme/types'

/**
 * Calculate the distance from a point to a line segment in 3D space.
 * Returns the closest point on the segment and the distance.
 */
function pointToLineSegment(
  point: Position,
  lineStart: Position,
  lineEnd: Position
): { closestPoint: Position; distance: number; t: number } {
  const dx = lineEnd.x - lineStart.x
  const dy = lineEnd.y - lineStart.y
  const dz = lineEnd.z - lineStart.z

  const lineLengthSq = dx * dx + dy * dy + dz * dz
  if (lineLengthSq < 1e-10) {
    return {
      closestPoint: { ...lineStart },
      distance: Math.sqrt(
        (point.x - lineStart.x) ** 2 +
        (point.y - lineStart.y) ** 2 +
        (point.z - lineStart.z) ** 2
      ),
      t: 0,
    }
  }

  const px = point.x - lineStart.x
  const py = point.y - lineStart.y
  const pz = point.z - lineStart.z

  const t = Math.max(0, Math.min(1, (px * dx + py * dy + pz * dz) / lineLengthSq))

  const closestX = lineStart.x + t * dx
  const closestY = lineStart.y + t * dy
  const closestZ = lineStart.z + t * dz

  const distX = point.x - closestX
  const distY = point.y - closestY
  const distZ = point.z - closestZ
  const distance = Math.sqrt(distX * distX + distY * distY + distZ * distZ)

  return {
    closestPoint: { x: closestX, y: closestY, z: closestZ },
    distance,
    t,
  }
}

/**
 * Calculate the distance from a point to an arc segment.
 * Arc segments are semi-circular arcs that go from start to end, peaking at HOP_HEIGHT.
 */
function pointToArcSegment(
  point: Position,
  segment: WireSegment
): { closestPoint: Position; distance: number; t: number } {
  if (segment.type !== 'arc' || !segment.arcCenter || segment.arcRadius === undefined) {
    const result = pointToLineSegment(point, segment.start, segment.end)
    return result
  }

  const numSamples = 20
  let minDistance = Infinity
  let closestPoint: Position = segment.start
  let bestT = 0

  for (let i = 0; i <= numSamples; i++) {
    const t = i / numSamples
    const arcPoint = {
      x: segment.start.x + (segment.end.x - segment.start.x) * t,
      y: WIRE_HEIGHT + (segment.arcCenter.y - WIRE_HEIGHT) * Math.sin(t * Math.PI),
      z: segment.start.z + (segment.end.z - segment.start.z) * t,
    }

    const dx = point.x - arcPoint.x
    const dy = point.y - arcPoint.y
    const dz = point.z - arcPoint.z
    const distance = Math.sqrt(dx * dx + dy * dy + dz * dz)

    if (distance < minDistance) {
      minDistance = distance
      closestPoint = arcPoint
      bestT = t
    }
  }

  return { closestPoint, distance: minDistance, t: bestT }
}

/**
 * Calculate the nearest position on a wire to a given click point.
 * Returns the position on the wire (at WIRE_HEIGHT) or null if wire has no segments.
 *
 * @param clickPoint - The 3D point where the user clicked
 * @param wire - The wire to find position on
 * @returns Position on wire at WIRE_HEIGHT, or null if wire has no segments
 */
export function calculatePositionOnWire(
  clickPoint: Position,
  wire: Wire
): Position | null {
  if (!wire.segments || wire.segments.length === 0) {
    return null
  }

  let nearestPosition: Position | null = null
  let minDistance = Infinity

  for (let i = 0; i < wire.segments.length; i++) {
    const segment = wire.segments[i]
    let result: { closestPoint: Position; distance: number; t: number }

    if (segment.type === 'arc') {
      result = pointToArcSegment(clickPoint, segment)
    } else {
      result = pointToLineSegment(clickPoint, segment.start, segment.end)
    }

    if (result.distance < minDistance) {
      minDistance = result.distance
      nearestPosition = {
        x: result.closestPoint.x,
        y: WIRE_HEIGHT,
        z: result.closestPoint.z,
      }
    }
  }

  return nearestPosition
}

/**
 * Find which segment contains (or is closest to) the given position.
 * Returns segment index and parameter t (0-1) along the segment.
 *
 * @param segments - Array of wire segments
 * @param position - Position to find
 * @returns Object with segmentIndex and t, or null if no segments
 */
export function findSegmentContainingPosition(
  segments: WireSegment[],
  position: Position
): { segmentIndex: number; t: number } | null {
  if (segments.length === 0) {
    return null
  }

  let nearestSegmentIndex = 0
  let nearestT = 0
  let minDistance = Infinity

  for (let i = 0; i < segments.length; i++) {
    const segment = segments[i]
    let result: { closestPoint: Position; distance: number; t: number }

    if (segment.type === 'arc') {
      result = pointToArcSegment(position, segment)
    } else {
      result = pointToLineSegment(position, segment.start, segment.end)
    }

    if (result.distance < minDistance) {
      minDistance = result.distance
      nearestSegmentIndex = i
      nearestT = result.t
    }
  }

  return { segmentIndex: nearestSegmentIndex, t: nearestT }
}

/**
 * Get all segments from wire start up to (and including part of) the position.
 * Used for creating shared segments when wiring from junction.
 *
 * For corner placement (position at segment endpoint):
 * - If t === 1: Include the entire segment (position at segment end)
 * - If t === 0: Don't include this segment (position at segment start, include all before)
 *
 * @param segments - Array of wire segments
 * @param position - Position to split at (should be at a corner for junction placement)
 * @returns Array of segments from start to position
 */
export function getSegmentsUpToPosition(
  segments: WireSegment[],
  position: Position
): WireSegment[] {
  const segmentInfo = findSegmentContainingPosition(segments, position)
  if (!segmentInfo) {
    return []
  }

  const { segmentIndex, t } = segmentInfo
  const result: WireSegment[] = []

  for (let i = 0; i < segmentIndex; i++) {
    result.push({ ...segments[i] })
  }

  if (t === 1) {
    result.push({ ...segments[segmentIndex] })
  } else if (t > 0 && t < 1) {
    const segment = segments[segmentIndex]
    const midPoint = {
      x: segment.start.x + (segment.end.x - segment.start.x) * t,
      y: segment.start.y + (segment.end.y - segment.start.y) * t,
      z: segment.start.z + (segment.end.z - segment.start.z) * t,
    }

    result.push({
      ...segment,
      end: midPoint,
    })
  }

  return result
}

/**
 * Check if a position is at a segment corner (endpoint where perpendicular segments meet).
 *
 * @param position - Position to check
 * @param segment - Segment to check against
 * @param segments - All segments in the wire
 * @param segmentIndex - Index of the segment in the array
 * @param tolerance - Distance tolerance for endpoint matching (default 0.1)
 * @returns True if position is at a corner
 */
export function isAtSegmentCorner(
  position: Position,
  segment: WireSegment,
  segments: WireSegment[],
  segmentIndex: number,
  tolerance: number = 0.1
): boolean {
  const distToStart = Math.sqrt(
    (position.x - segment.start.x) ** 2 +
    (position.y - segment.start.y) ** 2 +
    (position.z - segment.start.z) ** 2
  )

  const distToEnd = Math.sqrt(
    (position.x - segment.end.x) ** 2 +
    (position.y - segment.end.y) ** 2 +
    (position.z - segment.end.z) ** 2
  )

  const isAtStart = distToStart < tolerance
  const isAtEnd = distToEnd < tolerance

  if (!isAtStart && !isAtEnd) {
    return false
  }

  let isCorner = false

  if (segment.type === 'exit' && isAtEnd) {
    isCorner = true
  } else if (segment.type === 'entry' && isAtStart) {
    isCorner = true
  } else {
    if (isAtStart && segmentIndex > 0) {
      const prevSegment = segments[segmentIndex - 1]
      isCorner = areSegmentsPerpendicular(prevSegment, segment)
    } else if (isAtEnd && segmentIndex < segments.length - 1) {
      const nextSegment = segments[segmentIndex + 1]
      isCorner = areSegmentsPerpendicular(segment, nextSegment)
    }
  }

  return isCorner
}

/**
 * Check if two segments are perpendicular (one horizontal, one vertical).
 * A corner is where a horizontal segment meets a vertical segment.
 *
 * @param seg1 - First segment
 * @param seg2 - Second segment
 * @returns True if segments are perpendicular
 */
export function areSegmentsPerpendicular(seg1: WireSegment, seg2: WireSegment): boolean {
  if ((seg1.type === 'exit' || seg1.type === 'entry') && (seg2.type === 'horizontal' || seg2.type === 'vertical' || seg2.type === 'arc')) {
    return true
  }
  if ((seg2.type === 'exit' || seg2.type === 'entry') && (seg1.type === 'horizontal' || seg1.type === 'vertical' || seg1.type === 'arc')) {
    return true
  }

  if (seg1.type === 'arc' || seg2.type === 'arc') {
    return true
  }

  return (seg1.type === 'horizontal' && seg2.type === 'vertical') || (seg1.type === 'vertical' && seg2.type === 'horizontal')
}

/**
 * Find all corner positions in a wire's segments.
 * A corner is where a horizontal segment meets a vertical segment.
 *
 * Entry/exit segments: The endpoint at the section line is ALWAYS a corner.
 * - Exit segment: `end` is always a corner
 * - Entry segment: `start` is always a corner
 *
 * Routing segments: A corner is where perpendicular segments meet.
 *
 * @param wire - Wire to find corners in
 * @returns Array of corner positions
 */
export function findWireCorners(wire: Wire): Position[] {
  if (!wire.segments || wire.segments.length === 0) {
    return []
  }

  const corners: Position[] = []
  const seenCorners = new Set<string>()

  for (let i = 0; i < wire.segments.length; i++) {
    const segment = wire.segments[i]

    if (segment.type === 'exit') {
      const key = `${segment.end.x},${segment.end.y},${segment.end.z}`
      if (!seenCorners.has(key)) {
        seenCorners.add(key)
        corners.push({ ...segment.end })
      }
    } else if (segment.type === 'entry') {
      const key = `${segment.start.x},${segment.start.y},${segment.start.z}`
      if (!seenCorners.has(key)) {
        seenCorners.add(key)
        corners.push({ ...segment.start })
      }
    } else {
      if (i > 0) {
        const prevSegment = wire.segments[i - 1]
        const isPerpendicular = areSegmentsPerpendicular(prevSegment, segment)
        if (isPerpendicular) {
          const key = `${segment.start.x},${segment.start.y},${segment.start.z}`
          if (!seenCorners.has(key)) {
            seenCorners.add(key)
            corners.push({ ...segment.start })
          }
        }
      }

      if (i < wire.segments.length - 1) {
        const nextSegment = wire.segments[i + 1]
        const isPerpendicular = areSegmentsPerpendicular(segment, nextSegment)
        if (isPerpendicular) {
          const key = `${segment.end.x},${segment.end.y},${segment.end.z}`
          if (!seenCorners.has(key)) {
            seenCorners.add(key)
            corners.push({ ...segment.end })
          }
        }
      }
    }
  }

  return corners
}
