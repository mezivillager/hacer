import type { Wire, Position } from '@/store/types'
import type { WireSegment } from '@/utils/wiringScheme/types'
import { WIRE_HEIGHT, HOP_HEIGHT } from './wiringScheme/types'

/**
 * Calculate the distance from a point to a line segment in 3D space.
 * Uses the formula for point-to-line distance.
 */
function pointToLineDistance(
  point: Position,
  lineStart: Position,
  lineEnd: Position
): number {
  const dx = lineEnd.x - lineStart.x
  const dy = lineEnd.y - lineStart.y
  const dz = lineEnd.z - lineStart.z

  // If line segment has zero length, return distance to start point
  const lineLengthSq = dx * dx + dy * dy + dz * dz
  if (lineLengthSq < 1e-10) {
    const px = point.x - lineStart.x
    const py = point.y - lineStart.y
    const pz = point.z - lineStart.z
    return Math.sqrt(px * px + py * py + pz * pz)
  }

  // Calculate parameter t (projection of point onto line)
  const px = point.x - lineStart.x
  const py = point.y - lineStart.y
  const pz = point.z - lineStart.z

  const t = Math.max(0, Math.min(1, (px * dx + py * dy + pz * dz) / lineLengthSq))

  // Find closest point on line segment
  const closestX = lineStart.x + t * dx
  const closestY = lineStart.y + t * dy
  const closestZ = lineStart.z + t * dz

  // Return distance to closest point
  const distX = point.x - closestX
  const distY = point.y - closestY
  const distZ = point.z - closestZ

  return Math.sqrt(distX * distX + distY * distY + distZ * distZ)
}

/**
 * Calculate the distance from a point to an arc segment.
 * Arc segments are semi-circular arcs that go from start to end, peaking at HOP_HEIGHT.
 */
function pointToArcDistance(
  point: Position,
  segment: WireSegment
): number {
  if (segment.type !== 'arc' || !segment.arcCenter || segment.arcRadius === undefined) {
    // Fallback to line distance if arc metadata missing
    return pointToLineDistance(point, segment.start, segment.end)
  }

  const center = segment.arcCenter
  const radius = segment.arcRadius

  // Determine arc orientation from start/end points
  const isHorizontal = Math.abs(segment.start.z - segment.end.z) < 0.001

  // Sample points along the arc to find minimum distance
  // For efficiency, sample at key points: start, midpoint, end
  const numSamples = 20
  let minDistance = Infinity

  for (let i = 0; i <= numSamples; i++) {
    const t = (i / numSamples) * Math.PI // t goes from 0 to π

    const y = WIRE_HEIGHT + (HOP_HEIGHT - WIRE_HEIGHT) * Math.sin(t)
    let x: number
    let z: number

    if (isHorizontal) {
      x = center.x + radius * Math.cos(Math.PI - t)
      z = center.z
    } else {
      x = center.x
      z = center.z + radius * Math.cos(Math.PI - t)
    }

    const arcPoint = { x, y, z }
    const dx = point.x - arcPoint.x
    const dy = point.y - arcPoint.y
    const dz = point.z - arcPoint.z
    const distance = Math.sqrt(dx * dx + dy * dy + dz * dz)

    if (distance < minDistance) {
      minDistance = distance
    }
  }

  return minDistance
}

/**
 * Calculate the minimum distance from a point to a wire segment.
 */
function distanceToSegment(point: Position, segment: WireSegment): number {
  if (segment.type === 'arc') {
    return pointToArcDistance(point, segment)
  } else {
    // Straight segments: horizontal, vertical, entry, exit
    return pointToLineDistance(point, segment.start, segment.end)
  }
}

/**
 * Find the nearest wire to a point within a threshold distance.
 * Returns the wire ID if found, null otherwise.
 *
 * Note: Threshold is exclusive - wires at exactly the threshold distance are not selected.
 * Wires with empty segments arrays are skipped.
 *
 * @param point - The 3D point to check
 * @param wires - Array of wires to check
 * @param threshold - Maximum distance to consider (exclusive, default 0.5)
 * @returns Wire ID of the nearest wire within threshold, or null
 */
export function findNearestWire(
  point: Position,
  wires: Wire[],
  threshold: number = 0.5
): string | null {
  if (wires.length === 0) {
    return null
  }

  let nearestWireId: string | null = null
  let nearestDistance = threshold

  for (const wire of wires) {
    // Skip wires with no segments (cannot be selected)
    if (!wire.segments || wire.segments.length === 0) {
      continue
    }

    // Check distance to each segment of the wire
    let minWireDistance = Infinity

    for (const segment of wire.segments) {
      const distance = distanceToSegment(point, segment)
      if (distance < minWireDistance) {
        minWireDistance = distance
      }
    }

    // If this wire is closer than previous best and within threshold
    if (minWireDistance < nearestDistance) {
      nearestDistance = minWireDistance
      nearestWireId = wire.id
    }
  }

  return nearestWireId
}
