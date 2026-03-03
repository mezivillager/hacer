/**
 * Wire Sharing Utilities
 *
 * Utilities for detecting and managing shared segments between wires through junctions.
 */

import type { Wire, JunctionNode, Position } from '@/store/types'
import type { WireSegment } from '@/utils/wiringScheme/types'
import { findSegmentContainingPosition } from './wirePosition'

/**
 * Find all wires that pass through a given junction.
 * Validates wires by checking if their segments pass through the junction position.
 *
 * @param junctionId - The junction's ID
 * @param wires - Array of all wires to check
 * @param junctions - Array of all junctions (to find junction position)
 * @returns Array of wires that pass through the junction
 */
export function findWiresThroughJunction(
  junctionId: string,
  wires: Wire[],
  junctions: JunctionNode[]
): Wire[] {
  // Find the junction to get its position
  const junction = junctions.find((j) => j.id === junctionId)
  if (!junction) {
    return []
  }

  const junctionPosition = junction.position
  const result: Wire[] = []

  // Check each wire to see if it passes through the junction position
  for (const wire of wires) {
    if (!wire.segments || wire.segments.length === 0) {
      continue
    }

    // Use findSegmentContainingPosition to check if junction is on this wire
    const segmentInfo = findSegmentContainingPosition(wire.segments, junctionPosition)
    if (segmentInfo) {
      // Junction is on this wire - verify it's close enough (within tolerance)
      const segment = wire.segments[segmentInfo.segmentIndex]
      const closestPoint = {
        x: segment.start.x + (segment.end.x - segment.start.x) * segmentInfo.t,
        y: segment.start.y + (segment.end.y - segment.start.y) * segmentInfo.t,
        z: segment.start.z + (segment.end.z - segment.start.z) * segmentInfo.t,
      }

      const dx = junctionPosition.x - closestPoint.x
      const dy = junctionPosition.y - closestPoint.y
      const dz = junctionPosition.z - closestPoint.z
      const distance = Math.sqrt(dx * dx + dy * dy + dz * dz)

      // Allow small tolerance (0.1 units) for floating point precision
      if (distance <= 0.1) {
        result.push(wire)
      }
    }
  }

  return result
}

/**
 * Find which segments are shared (from wire start to junction).
 * Returns the range of segment indices that are shared.
 *
 * @param wire - The wire to check
 * @param junctionPos - Position of the junction on the wire
 * @returns Object with startIndex and endIndex, or null if junction not found on wire
 */
export function getSharedSegmentRange(
  wire: Wire,
  junctionPos: Position
): { startIndex: number; endIndex: number } | null {
  if (!wire.segments || wire.segments.length === 0) {
    return null
  }

  const segmentInfo = findSegmentContainingPosition(wire.segments, junctionPos)
  if (!segmentInfo) {
    return null
  }

  const { segmentIndex, t } = segmentInfo

  // Shared segments are from start (index 0) up to and including the segment containing the junction
  // The range indicates which complete segments are included before any splitting
  if (t === 1) {
    // Junction at segment end: include all segments up to and including this segment
    return {
      startIndex: 0,
      endIndex: segmentIndex,
    }
  } else if (t > 0 && t < 1) {
    // Junction in middle of segment: include all segments before this one, then split this segment
    // The range ends at segmentIndex - 1 because segmentIndex will be split
    return {
      startIndex: 0,
      endIndex: segmentIndex - 1,
    }
  } else {
    // t === 0: Junction at segment start: include all segments before this one
    return {
      startIndex: 0,
      endIndex: segmentIndex - 1,
    }
  }
}

/**
 * Get segments after the junction (not shared).
 *
 * @param wire - The wire to check
 * @param junctionPos - Position of the junction on the wire
 * @returns Array of segments after the junction
 */
export function getUnsharedSegments(wire: Wire, junctionPos: Position): WireSegment[] {
  if (!wire.segments || wire.segments.length === 0) {
    return []
  }

  const segmentInfo = findSegmentContainingPosition(wire.segments, junctionPos)
  if (!segmentInfo) {
    return wire.segments // If junction not found, all segments are unshared
  }

  const { segmentIndex, t } = segmentInfo
  const result: WireSegment[] = []

  // If t < 1, we need to split the segment
  if (t > 0 && t < 1) {
    const segment = wire.segments[segmentIndex]
    const midPoint = {
      x: segment.start.x + (segment.end.x - segment.start.x) * t,
      y: segment.start.y + (segment.end.y - segment.start.y) * t,
      z: segment.start.z + (segment.end.z - segment.start.z) * t,
    }

    // Add the part of the segment after the junction
    result.push({
      ...segment,
      start: midPoint,
    })
  }

  // Add all segments after the junction segment
  for (let i = segmentIndex + 1; i < wire.segments.length; i++) {
    result.push({ ...wire.segments[i] })
  }

  return result
}

/**
 * Count how many wires pass through a junction.
 *
 * @param junctionId - The junction's ID
 * @param junctions - Array of all junctions
 * @returns Number of wires passing through the junction
 */
export function countWiresThroughJunction(
  junctionId: string,
  junctions: JunctionNode[]
): number {
  const junction = junctions.find((j) => j.id === junctionId)
  if (!junction) {
    return 0
  }
  return junction.wireIds.length
}

/**
 * Check if a wire has shared segments with other wires through junctions.
 *
 * @param wire - The wire to check
 * @param junctions - Array of all junctions
 * @param _wires - Array of all wires (unused for now)
 * @returns Array of junction IDs that this wire passes through and has shared segments
 */
export function getJunctionsWithSharedSegments(
  wire: Wire,
  junctions: JunctionNode[],
  _wires: Wire[]
): string[] {
  const result: string[] = []

  for (const junction of junctions) {
    // Check if this wire passes through the junction
    if (!junction.wireIds.includes(wire.id)) {
      continue
    }

    // Check if other wires also pass through this junction
    const otherWires = junction.wireIds.filter((id) => id !== wire.id)
    if (otherWires.length > 0) {
      // This wire shares segments with other wires through this junction
      result.push(junction.id)
    }
  }

  return result
}
