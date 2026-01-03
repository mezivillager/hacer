/**
 * Wire Crossing Detection and Resolution
 *
 * This module provides functions to detect wire crossings and resolve them
 * by replacing crossing segments with semi-circular hop arcs.
 */

import type { WireSegment, Position } from './types'
import type { Wire } from '@/store/types'
import { WIRE_HEIGHT, HOP_RADIUS } from './types'
import { areSegmentsOnSameSectionLine } from './overlap'
import { combineAdjacentSegments } from './segments'

const TOLERANCE = 0.001

/**
 * Represents a crossing between a new wire segment and an existing wire segment.
 */
export interface Crossing {
  segmentIndex: number // Index of new wire segment that crosses
  existingWireId: string
  existingSegmentIndex: number
  intersectionPoint: Position // Exact point where segments cross
}

/**
 * Find the intersection point between a horizontal and vertical segment.
 * Returns null if segments don't intersect.
 *
 * NOTE: We allow endpoint intersections when they occur at section line corners
 * (where both X and Z are on section lines), as these are valid crossings.
 * We only exclude intersections that are at pin positions (entry/exit segments).
 *
 * @param horizontalSeg - Horizontal segment (constant Z)
 * @param verticalSeg - Vertical segment (constant X)
 * @returns Intersection point, or null if no valid intersection
 */
export function findSegmentCrossing(
  horizontalSeg: WireSegment,
  verticalSeg: WireSegment
): Position | null {
  // Verify segments are perpendicular (one horizontal, one vertical)
  const horizontalIsHorizontal = Math.abs(horizontalSeg.start.z - horizontalSeg.end.z) < TOLERANCE
  const verticalIsVertical = Math.abs(verticalSeg.start.x - verticalSeg.end.x) < TOLERANCE

  if (!horizontalIsHorizontal || !verticalIsVertical) {
    console.log(`[findSegmentCrossing] Segments not perpendicular`, {
      horizontalIsHorizontal,
      verticalIsVertical,
      horizontalSeg: { start: horizontalSeg.start, end: horizontalSeg.end },
      verticalSeg: { start: verticalSeg.start, end: verticalSeg.end },
    })
    return null
  }

  // Horizontal segment has constant Z, vertical segment has constant X
  const horizontalZ = horizontalSeg.start.z
  const verticalX = verticalSeg.start.x

  // Find intersection point
  const intersectionPoint: Position = {
    x: verticalX,
    y: WIRE_HEIGHT,
    z: horizontalZ,
  }

  // Check if intersection point is within both segment bounds
  const horizontalMinX = Math.min(horizontalSeg.start.x, horizontalSeg.end.x)
  const horizontalMaxX = Math.max(horizontalSeg.start.x, horizontalSeg.end.x)
  const verticalMinZ = Math.min(verticalSeg.start.z, verticalSeg.end.z)
  const verticalMaxZ = Math.max(verticalSeg.start.z, verticalSeg.end.z)

  // Check if intersection is within segment bounds (including endpoints)
  // We allow endpoint intersections because segments can meet at section line corners
  const isWithinHorizontal =
    intersectionPoint.x >= horizontalMinX - TOLERANCE &&
    intersectionPoint.x <= horizontalMaxX + TOLERANCE
  const isWithinVertical =
    intersectionPoint.z >= verticalMinZ - TOLERANCE &&
    intersectionPoint.z <= verticalMaxZ + TOLERANCE

  // Note: We allow endpoint intersections because segments can meet at section line corners
  // This is a valid crossing that should be resolved with arcs

  console.log(`[findSegmentCrossing] Checking intersection`, {
    intersectionPoint: { x: intersectionPoint.x, z: intersectionPoint.z },
    horizontalRange: { min: horizontalMinX, max: horizontalMaxX },
    verticalRange: { min: verticalMinZ, max: verticalMaxZ },
    isWithinHorizontal,
    isWithinVertical,
    horizontalSeg: { start: horizontalSeg.start, end: horizontalSeg.end },
    verticalSeg: { start: verticalSeg.start, end: verticalSeg.end },
  })

  if (isWithinHorizontal && isWithinVertical) {
    // Allow intersection if it's within bounds (including endpoints at section line corners)
    console.log(`[findSegmentCrossing] Valid intersection found!`)
    return intersectionPoint
  }

  console.log(`[findSegmentCrossing] Intersection outside segments`)
  return null
}

/**
 * Detect all crossings between new wire segments and existing wires.
 *
 * @param newWireSegments - Segments of the new wire being created
 * @param existingWires - Array of existing wires in the circuit
 * @returns Array of detected crossings, sorted by segment index then position along segment
 */
export function detectCrossings(
  newWireSegments: WireSegment[],
  existingWires: Wire[]
): Crossing[] {
  const crossings: Crossing[] = []

  for (let segIndex = 0; segIndex < newWireSegments.length; segIndex++) {
    const newSeg = newWireSegments[segIndex]

    // Skip entry/exit segments (they connect to pins, not section lines)
    // Also skip arc segments (they are already resolved crossings)
    if (newSeg.type === 'entry' || newSeg.type === 'exit' || newSeg.type === 'arc') {
      continue
    }

    // Check against all existing wires
    for (const existingWire of existingWires) {
      console.log(`[detectCrossings] Checking against existing wire ${existingWire.id}`, {
        existingWireSegmentsCount: existingWire.segments.length,
      })
      for (let existingSegIndex = 0; existingSegIndex < existingWire.segments.length; existingSegIndex++) {
        const existingSeg = existingWire.segments[existingSegIndex]

        // Skip entry/exit segments and arc segments
        if (existingSeg.type === 'entry' || existingSeg.type === 'exit' || existingSeg.type === 'arc') {
          console.log(`[detectCrossings] Skipping existing segment ${existingSegIndex} (type: ${existingSeg.type})`)
          continue
        }

        console.log(`[detectCrossings] Comparing new segment ${segIndex} with existing segment ${existingSegIndex}`, {
          newSeg: { type: newSeg.type, start: { x: newSeg.start.x, z: newSeg.start.z }, end: { x: newSeg.end.x, z: newSeg.end.z } },
          existingSeg: { type: existingSeg.type, start: { x: existingSeg.start.x, z: existingSeg.start.z }, end: { x: existingSeg.end.x, z: existingSeg.end.z } },
        })

        // Only check perpendicular segments (horizontal × vertical)
        // Same-line overlaps are already handled by overlap detection
        if (areSegmentsOnSameSectionLine(newSeg, existingSeg)) {
          console.log(`[detectCrossings] Segments on same section line, skipping`)
          continue
        }

        // Determine which is horizontal and which is vertical
        const newIsHorizontal = Math.abs(newSeg.start.z - newSeg.end.z) < TOLERANCE
        const existingIsHorizontal = Math.abs(existingSeg.start.z - existingSeg.end.z) < TOLERANCE

        console.log(`[detectCrossings] Segment orientations`, {
          newIsHorizontal,
          existingIsHorizontal,
        })

        // Must be one horizontal and one vertical
        if (newIsHorizontal === existingIsHorizontal) {
          console.log(`[detectCrossings] Both segments same orientation, skipping`)
          continue
        }

        // Find intersection
        const horizontalSeg = newIsHorizontal ? newSeg : existingSeg
        const verticalSeg = newIsHorizontal ? existingSeg : newSeg
        const intersection = findSegmentCrossing(horizontalSeg, verticalSeg)

        console.log(`[detectCrossings] Intersection check result`, {
          intersection: intersection ? { x: intersection.x, z: intersection.z } : null,
        })

        if (intersection) {
          console.log(`[detectCrossings] Found crossing!`, {
            newSegmentIndex: segIndex,
            existingWireId: existingWire.id,
            existingSegmentIndex: existingSegIndex,
            intersectionPoint: intersection,
            horizontalSeg: { start: horizontalSeg.start, end: horizontalSeg.end },
            verticalSeg: { start: verticalSeg.start, end: verticalSeg.end },
          })
          crossings.push({
            segmentIndex: segIndex,
            existingWireId: existingWire.id,
            existingSegmentIndex: existingSegIndex,
            intersectionPoint: intersection,
          })
        }
      }
    }
  }

  // Sort crossings by segment index, then by position along segment
  crossings.sort((a, b) => {
    if (a.segmentIndex !== b.segmentIndex) {
      return a.segmentIndex - b.segmentIndex
    }

    // Sort by position along segment (distance from start)
    const segA = newWireSegments[a.segmentIndex]
    const segB = newWireSegments[b.segmentIndex]
    const distA =
      Math.abs(a.intersectionPoint.x - segA.start.x) +
      Math.abs(a.intersectionPoint.z - segA.start.z)
    const distB =
      Math.abs(b.intersectionPoint.x - segB.start.x) +
      Math.abs(b.intersectionPoint.z - segB.start.z)
    return distA - distB
  })

  console.log('[detectCrossings] Finished detection', {
    totalCrossings: crossings.length,
    crossings: crossings.map((c) => ({
      segmentIndex: c.segmentIndex,
      existingWireId: c.existingWireId,
      intersectionPoint: c.intersectionPoint,
    })),
  })

  return crossings
}

/**
 * Information about a wire segment's orientation and bounds.
 */
export interface SegmentInfo {
  isHorizontal: boolean
  isIncreasing: boolean
  minCoord: number
  maxCoord: number
  length: number
}

/**
 * Extract segment information (orientation, direction, bounds, length).
 * Computes all segment properties once to avoid redundant calculations.
 *
 * @param segment - Wire segment to analyze
 * @returns Segment information
 */
export function getSegmentInfo(segment: WireSegment): SegmentInfo {
  const isHorizontal = Math.abs(segment.start.z - segment.end.z) < TOLERANCE

  if (isHorizontal) {
    const isIncreasing = segment.start.x < segment.end.x
    const minCoord = Math.min(segment.start.x, segment.end.x)
    const maxCoord = Math.max(segment.start.x, segment.end.x)
    const length = Math.abs(segment.end.x - segment.start.x)

  return {
      isHorizontal: true,
      isIncreasing,
      minCoord,
      maxCoord,
      length,
    }
  } else {
    const isIncreasing = segment.start.z < segment.end.z
    const minCoord = Math.min(segment.start.z, segment.end.z)
    const maxCoord = Math.max(segment.start.z, segment.end.z)
    const length = Math.abs(segment.end.z - segment.start.z)

    return {
      isHorizontal: false,
      isIncreasing,
      minCoord,
      maxCoord,
      length,
    }
  }
}

/**
 * Ideal cut points for a hop arc, calculated based on intersection and segment direction.
 */
export interface CutPoints {
  cutStart: Position
  cutEnd: Position
}

/**
 * Calculate ideal cut points for a hop arc at an intersection.
 * Cut points are positioned HOP_RADIUS distance from the intersection,
 * respecting the segment's direction (increasing/decreasing).
 *
 * @param intersection - Point where wires intersect
 * @param segmentInfo - Segment orientation and direction information
 * @returns Ideal cut points (may need clamping to segment bounds)
 */
export function calculateIdealCutPoints(
  intersection: Position,
  segmentInfo: SegmentInfo
): CutPoints {
  if (segmentInfo.isHorizontal) {
    if (segmentInfo.isIncreasing) {
      return {
        cutStart: {
          x: intersection.x - HOP_RADIUS,
          y: WIRE_HEIGHT,
          z: intersection.z,
        },
        cutEnd: {
          x: intersection.x + HOP_RADIUS,
          y: WIRE_HEIGHT,
          z: intersection.z,
        },
        }
      } else {
        // Decreasing horizontal segment: cutStart should be higher x, cutEnd should be lower x
      return {
        cutStart: {
          x: intersection.x + HOP_RADIUS,
          y: WIRE_HEIGHT,
          z: intersection.z,
        },
        cutEnd: {
          x: intersection.x - HOP_RADIUS,
          y: WIRE_HEIGHT,
          z: intersection.z,
        },
        }
      }
    } else {
    if (segmentInfo.isIncreasing) {
        // Increasing vertical segment: cutStart should be lower z, cutEnd should be higher z
      return {
        cutStart: {
          x: intersection.x,
          y: WIRE_HEIGHT,
          z: intersection.z - HOP_RADIUS,
        },
        cutEnd: {
          x: intersection.x,
          y: WIRE_HEIGHT,
          z: intersection.z + HOP_RADIUS,
        },
        }
      } else {
        // Decreasing vertical segment: cutStart should be higher z, cutEnd should be lower z
      return {
        cutStart: {
          x: intersection.x,
          y: WIRE_HEIGHT,
          z: intersection.z + HOP_RADIUS,
        },
        cutEnd: {
          x: intersection.x,
          y: WIRE_HEIGHT,
          z: intersection.z - HOP_RADIUS,
        },
      }
    }
  }
}

/**
 * Create a segment from current position to cut start, if there's a meaningful gap.
 * Returns null if positions are too close or cut start is behind current start.
 *
 * @param currentStart - Current position along segment
 * @param cutStart - Cut start position
 * @param segmentInfo - Segment information
 * @param segment - Original segment
 * @returns Segment from currentStart to cutStart, or null
 */
export function createBeforeSegment(
  currentStart: Position,
  cutStart: Position,
  segmentInfo: SegmentInfo,
  segment: WireSegment
): WireSegment | null {
  const distance = segmentInfo.isHorizontal
    ? Math.abs(currentStart.x - cutStart.x)
    : Math.abs(currentStart.z - cutStart.z)

  if (distance <= TOLERANCE) {
    return null
  }

  // Verify cutStart is ahead of currentStart (not behind)
  const isAhead = segmentInfo.isHorizontal
    ? (segmentInfo.isIncreasing ? cutStart.x > currentStart.x : cutStart.x < currentStart.x)
    : (segmentInfo.isIncreasing ? cutStart.z > currentStart.z : cutStart.z < currentStart.z)

  if (!isAhead) {
    return null
  }

  return {
    start: { ...currentStart },
    end: { ...cutStart },
    type: segment.type,
  }
}

/**
 * Create a segment from cut end to segment end, if there's a meaningful gap.
 * Returns null if positions are too close or cut end has passed segment end.
 *
 * @param cutEnd - Cut end position
 * @param segmentEnd - Original segment end position
 * @param segmentInfo - Segment information
 * @param segment - Original segment
 * @returns Segment from cutEnd to segmentEnd, or null
 */
export function createAfterSegment(
  cutEnd: Position,
  segmentEnd: Position,
  segmentInfo: SegmentInfo,
  segment: WireSegment
): WireSegment | null {
  const distance = segmentInfo.isHorizontal
    ? Math.abs(cutEnd.x - segmentEnd.x)
    : Math.abs(cutEnd.z - segmentEnd.z)

  if (distance <= TOLERANCE) {
    return null
  }

  // Check if cut end has passed segment end
  const hasPassedEnd = segmentInfo.isHorizontal
    ? (segmentInfo.isIncreasing ? cutEnd.x > segmentEnd.x : cutEnd.x < segmentEnd.x)
    : (segmentInfo.isIncreasing ? cutEnd.z > segmentEnd.z : cutEnd.z < segmentEnd.z)

  if (hasPassedEnd) {
    return null
  }

  // Verify we're moving in the right direction
  const isAhead = segmentInfo.isHorizontal
    ? (segmentInfo.isIncreasing ? segmentEnd.x > cutEnd.x : segmentEnd.x < cutEnd.x)
    : (segmentInfo.isIncreasing ? segmentEnd.z > cutEnd.z : segmentEnd.z < cutEnd.z)

  if (!isAhead) {
    return null
  }

  return {
    start: { ...cutEnd },
    end: { ...segmentEnd },
    type: segment.type,
  }
}

/**
 * Generate a semi-circular arc segment that hops over a crossed wire.
 *
 * The arc center is at the intersection point. Cut points are exactly
 * HOP_RADIUS distance from the intersection.
 *
 * @param cutStart - Start point of the arc (exactly HOP_RADIUS from intersection)
 * @param cutEnd - End point of the arc (exactly HOP_RADIUS from intersection)
 * @param intersectionPoint - Point where wires intersect (arc center)
 * @param crossedWireId - ID of the wire this arc hops over
 * @returns WireSegment with type 'arc' representing the hop
 */
export function generateHopArc(
  cutStart: Position,
  cutEnd: Position,
  intersectionPoint: Position,
  crossedWireId: string
): WireSegment {
  // Arc center is at intersection point at base height
  // The arc will curve upward from this center
  const arcCenter: Position = {
    x: intersectionPoint.x,
    y: WIRE_HEIGHT, // Arc center at base height, arc curves upward
    z: intersectionPoint.z,
  }

  // Calculate actual arc radius based on cut points
  // Cut points are always exactly HOP_RADIUS from intersection
  const cutStartDist = Math.sqrt(
    Math.pow(cutStart.x - intersectionPoint.x, 2) +
    Math.pow(cutStart.z - intersectionPoint.z, 2)
  )
  const cutEndDist = Math.sqrt(
    Math.pow(cutEnd.x - intersectionPoint.x, 2) +
    Math.pow(cutEnd.z - intersectionPoint.z, 2)
  )

  // Use the average distance as the radius (should be exactly HOP_RADIUS)
  const arcRadius = (cutStartDist + cutEndDist) / 2

  return {
    start: cutStart,
    end: cutEnd,
    type: 'arc',
    arcCenter,
    arcRadius,
    crossedWireId,
  }
}

/**
 * Replace a segment with hop arcs at crossing points.
 *
 * @param segment - Original segment to replace
 * @param crossings - Array of crossings on this segment (must be sorted by position)
 * @param existingWires - Array of existing wires (to get crossed segment details)
 * @returns Array of segments: [before] + [arcs] + [after]
 */
export function replaceSegmentWithHop(
  segment: WireSegment,
  crossings: Crossing[],
  existingWires: Wire[]
): WireSegment[] {
  if (crossings.length === 0) {
    return [segment]
  }

  const result: WireSegment[] = []
  let currentStart = segment.start
  const segmentInfo = getSegmentInfo(segment)

  // Sort crossings by position along segment
  const sortedCrossings = [...crossings].sort((a, b) => {
    const distA =
      Math.abs(a.intersectionPoint.x - segment.start.x) +
      Math.abs(a.intersectionPoint.z - segment.start.z)
    const distB =
      Math.abs(b.intersectionPoint.x - segment.start.x) +
      Math.abs(b.intersectionPoint.z - segment.start.z)
    return distA - distB
  })

  for (const crossing of sortedCrossings) {
    const intersection = crossing.intersectionPoint

    // Safety check: skip if segment is too short for arc (should never happen in practice)
    if (segmentInfo.length < 2 * HOP_RADIUS) {
      continue
    }

    // Calculate ideal cut points
    const idealCutPoints = calculateIdealCutPoints(intersection, segmentInfo)
    const { cutStart, cutEnd } = idealCutPoints

    // Create before segment if there's a gap
    const beforeSegment = createBeforeSegment(currentStart, cutStart, segmentInfo, segment)
    if (beforeSegment) {
      result.push(beforeSegment)
    }

    // Get crossed segment to generate arc
    const existingWire = existingWires.find((w) => w.id === crossing.existingWireId)
    if (!existingWire) {
      throw new Error(
        `Cannot resolve wire crossing: existing wire not found. ` +
        `Wire ID: ${crossing.existingWireId}, Segment: ${JSON.stringify({ start: segment.start, end: segment.end })}`
      )
    }

    if (crossing.existingSegmentIndex < 0 || crossing.existingSegmentIndex >= existingWire.segments.length) {
      throw new Error(
        `Cannot resolve wire crossing: invalid segment index. ` +
        `Wire ID: ${crossing.existingWireId}, Segment index: ${crossing.existingSegmentIndex}, ` +
        `Available segments: ${existingWire.segments.length}, ` +
        `Segment: ${JSON.stringify({ start: segment.start, end: segment.end })}`
      )
    }

    // Generate arc
    const arc = generateHopArc(cutStart, cutEnd, intersection, crossing.existingWireId)
    result.push(arc)

    // Update currentStart to arc end for next iteration
    currentStart = { ...cutEnd }
  }

  // Add final segment from last cut end to segment end
  const afterSegment = createAfterSegment(currentStart, segment.end, segmentInfo, segment)
  if (afterSegment) {
    result.push(afterSegment)
  }

  return result.length > 0 ? result : [segment]
}

/**
 * Result of resolving crossings, including both segments and crossed wire IDs.
 */
export interface CrossingResolutionResult {
  segments: WireSegment[]
  crossedWireIds: string[]
}

/**
 * Resolve all crossings in new wire segments by replacing affected segments with hops.
 *
 * @param newWireSegments - Segments of the new wire being created
 * @param existingWires - Array of existing wires in the circuit
 * @returns Object containing modified segments with arcs and array of crossed wire IDs
 */
export function resolveCrossings(
  newWireSegments: WireSegment[],
  existingWires: Wire[]
): CrossingResolutionResult {
  console.log('[resolveCrossings] Starting resolution', {
    newWireSegmentsCount: newWireSegments.length,
    existingWiresCount: existingWires.length,
  })

  // Detect all crossings
  const allCrossings = detectCrossings(newWireSegments, existingWires)

  console.log('[resolveCrossings] After detection', {
    crossingsCount: allCrossings.length,
  })

  if (allCrossings.length === 0) {
    console.log('[resolveCrossings] No crossings found, returning original segments')
    return { segments: newWireSegments, crossedWireIds: [] }
  }

  // Sort crossings by segment index first, so we process segments in order
  // This ensures that when we check for adjacent segments, the previous segment has already been processed
  allCrossings.sort((a, b) => {
    if (a.segmentIndex !== b.segmentIndex) {
      return a.segmentIndex - b.segmentIndex
    }
    // Within same segment, sort by position along segment
    const segA = newWireSegments[a.segmentIndex]
    const segB = newWireSegments[b.segmentIndex]
    const distA =
      Math.abs(a.intersectionPoint.x - segA.start.x) +
      Math.abs(a.intersectionPoint.z - segA.start.z)
    const distB =
      Math.abs(b.intersectionPoint.x - segB.start.x) +
      Math.abs(b.intersectionPoint.z - segB.start.z)
    return distA - distB
  })

  // Collect unique crossed wire IDs
  const crossedWireIds = new Set<string>()
  for (const crossing of allCrossings) {
    crossedWireIds.add(crossing.existingWireId)
  }

  // Group crossings by segment index, and deduplicate crossings at the same intersection point
  // This prevents creating duplicate hops when multiple segments cross at the same point
  // Also deduplicate across adjacent segments when intersection is at segment boundary
  const crossingsBySegment = new Map<number, Crossing[]>()
  const seenIntersections = new Map<string, number>() // Track seen intersection points globally (value is segment index)

  for (const crossing of allCrossings) {
    const segIndex = crossing.segmentIndex
    if (!crossingsBySegment.has(segIndex)) {
      crossingsBySegment.set(segIndex, [])
    }

    // Create a key for this intersection point (rounded to avoid floating point issues)
    // Use global key (without segment index) to detect same intersection across segments
    const intersectionKey = `${Math.round(crossing.intersectionPoint.x * 1000)}-${Math.round(crossing.intersectionPoint.z * 1000)}`

    // Check if we've seen this intersection point before (across any segment)
    const previousSegmentIndex = seenIntersections.get(intersectionKey)

    // Check if we've seen this intersection point for this specific segment
    if (previousSegmentIndex === segIndex) {
      // Already added this intersection for this segment, skip
      console.log(`[resolveCrossings] Deduplicating crossing at same intersection point within segment`, {
        segmentIndex: segIndex,
        intersectionPoint: crossing.intersectionPoint,
      })
      continue
    }

    // Check if adjacent segments also have crossings at this intersection point
    // If so, skip this crossing to avoid duplicate arcs at boundaries
    const currentSegment = newWireSegments[segIndex]
    const prevSegmentIndex = segIndex - 1
    const nextSegmentIndex = segIndex + 1

    // Check previous segment
    if (prevSegmentIndex >= 0) {
      const prevSegment = newWireSegments[prevSegmentIndex]
      const prevSegmentHasCrossing = crossingsBySegment.get(prevSegmentIndex)?.some(
        (c) =>
          Math.abs(c.intersectionPoint.x - crossing.intersectionPoint.x) < TOLERANCE &&
          Math.abs(c.intersectionPoint.z - crossing.intersectionPoint.z) < TOLERANCE
      )
      if (prevSegmentHasCrossing) {
        // Check if intersection is at boundary
        const isAtCurrentStart = Math.abs(crossing.intersectionPoint.x - currentSegment.start.x) < TOLERANCE &&
                                  Math.abs(crossing.intersectionPoint.z - currentSegment.start.z) < TOLERANCE
        const isAtPrevEnd = Math.abs(crossing.intersectionPoint.x - prevSegment.end.x) < TOLERANCE &&
                             Math.abs(crossing.intersectionPoint.z - prevSegment.end.z) < TOLERANCE
        if (isAtCurrentStart && isAtPrevEnd) {
          console.log(`[resolveCrossings] Deduplicating crossing at segment boundary (previous segment)`, {
            currentSegmentIndex: segIndex,
            previousSegmentIndex: prevSegmentIndex,
            intersectionPoint: crossing.intersectionPoint,
          })
          continue
        }
      }
    }

    // Check next segment
    if (nextSegmentIndex < newWireSegments.length) {
      const nextSegment = newWireSegments[nextSegmentIndex]
      const nextSegmentHasCrossing = crossingsBySegment.get(nextSegmentIndex)?.some(
        (c) =>
          Math.abs(c.intersectionPoint.x - crossing.intersectionPoint.x) < TOLERANCE &&
          Math.abs(c.intersectionPoint.z - crossing.intersectionPoint.z) < TOLERANCE
      )
      if (nextSegmentHasCrossing) {
        // Check if intersection is at boundary
        const isAtCurrentEnd = Math.abs(crossing.intersectionPoint.x - currentSegment.end.x) < TOLERANCE &&
                                Math.abs(crossing.intersectionPoint.z - currentSegment.end.z) < TOLERANCE
        const isAtNextStart = Math.abs(crossing.intersectionPoint.x - nextSegment.start.x) < TOLERANCE &&
                               Math.abs(crossing.intersectionPoint.z - nextSegment.start.z) < TOLERANCE
        if (isAtCurrentEnd && isAtNextStart) {
          console.log(`[resolveCrossings] Deduplicating crossing at segment boundary (next segment)`, {
            currentSegmentIndex: segIndex,
            nextSegmentIndex,
            intersectionPoint: crossing.intersectionPoint,
          })
          continue
        }
      }
    }

    // If we've seen this intersection point on another segment, check if we should skip it
    if (previousSegmentIndex !== undefined && previousSegmentIndex !== segIndex) {
      // Check if segments are adjacent
      const areAdjacent = previousSegmentIndex === segIndex - 1 || previousSegmentIndex === segIndex + 1

      if (areAdjacent) {
        // Check if this intersection is at the boundary between adjacent segments
        const previousSegment = newWireSegments[previousSegmentIndex]

        // Check if intersection is at the boundary (where segments meet)
        const isAtCurrentStart = Math.abs(crossing.intersectionPoint.x - currentSegment.start.x) < TOLERANCE &&
                                  Math.abs(crossing.intersectionPoint.z - currentSegment.start.z) < TOLERANCE
        const isAtPreviousEnd = Math.abs(crossing.intersectionPoint.x - previousSegment.end.x) < TOLERANCE &&
                                 Math.abs(crossing.intersectionPoint.z - previousSegment.end.z) < TOLERANCE
        const isAtCurrentEnd = Math.abs(crossing.intersectionPoint.x - currentSegment.end.x) < TOLERANCE &&
                                Math.abs(crossing.intersectionPoint.z - currentSegment.end.z) < TOLERANCE
        const isAtPreviousStart = Math.abs(crossing.intersectionPoint.x - previousSegment.start.x) < TOLERANCE &&
                                   Math.abs(crossing.intersectionPoint.z - previousSegment.start.z) < TOLERANCE

        // If intersection is at boundary between adjacent segments, we need special handling
        // The arc should span across the boundary, so we need to ensure both segments are cut properly
        // However, we only want ONE arc, not two duplicate arcs
        // Strategy: Process the crossing on the earlier segment, and ensure the later segment
        // starts from where the arc ends (not from the intersection)
        if ((isAtCurrentStart && isAtPreviousEnd) || (isAtCurrentEnd && isAtPreviousStart)) {
          // Prefer processing on the earlier segment (previousSegmentIndex < segIndex)
          // This ensures the arc is created on the first segment and extends into the second
          if (previousSegmentIndex < segIndex) {
            console.log(`[resolveCrossings] Deduplicating crossing at segment boundary (previous segment handles it)`, {
              currentSegmentIndex: segIndex,
              previousSegmentIndex,
              intersectionPoint: crossing.intersectionPoint,
            })
            continue
          } else {
            // This shouldn't happen if segments are processed in order, but handle it
            // Remove from previous segment and process on current
            const prevCrossings = crossingsBySegment.get(previousSegmentIndex)
            if (prevCrossings) {
              const index = prevCrossings.findIndex(
                (c) =>
                  Math.abs(c.intersectionPoint.x - crossing.intersectionPoint.x) < TOLERANCE &&
                  Math.abs(c.intersectionPoint.z - crossing.intersectionPoint.z) < TOLERANCE
              )
              if (index >= 0) {
                prevCrossings.splice(index, 1)
                console.log(`[resolveCrossings] Moving crossing from previous segment to current (boundary handling)`, {
                  currentSegmentIndex: segIndex,
                  previousSegmentIndex,
                  intersectionPoint: crossing.intersectionPoint,
                })
              }
            }
            // Continue to add crossing to current segment
          }
        }
      }
    }

    // Add crossing to this segment
    crossingsBySegment.get(segIndex)!.push(crossing)
    seenIntersections.set(intersectionKey, segIndex)
  }

  console.log('[resolveCrossings] Processing crossings', {
    crossingsToProcess: allCrossings.length,
    segmentsWithCrossings: crossingsBySegment.size,
  })

  // Process each segment
  const result: WireSegment[] = []

  for (let segIndex = 0; segIndex < newWireSegments.length; segIndex++) {
    let segment = newWireSegments[segIndex]
    const crossings = crossingsBySegment.get(segIndex) || []

    // Check if previous segment had an arc that extended beyond its end
    // If so, adjust this segment's start to match where the arc ended
    if (segIndex > 0 && result.length > 0) {
      const lastResultSegment = result[result.length - 1]
      if (lastResultSegment.type === 'arc') {
        // Previous segment ended with an arc - check if it extends beyond the original segment end
        const previousOriginalSegment = newWireSegments[segIndex - 1]
        const arcEnd = lastResultSegment.end
        const originalEnd = previousOriginalSegment.end

        // Check if arc end extends beyond original segment end
        const isHorizontal = Math.abs(previousOriginalSegment.start.z - previousOriginalSegment.end.z) < TOLERANCE
        const hasExtended = isHorizontal
          ? (previousOriginalSegment.start.x < previousOriginalSegment.end.x
              ? arcEnd.x > originalEnd.x
              : arcEnd.x < originalEnd.x)
          : (previousOriginalSegment.start.z < previousOriginalSegment.end.z
              ? arcEnd.z > originalEnd.z
              : arcEnd.z < originalEnd.z)

        if (hasExtended) {
          // Arc extended beyond segment end - adjust current segment to start from arc end
          // Check if current segment starts from the intersection (where arc center is)
          const intersectionAtBoundary = isHorizontal
            ? Math.abs(segment.start.x - originalEnd.x) < TOLERANCE &&
              Math.abs(segment.start.z - originalEnd.z) < TOLERANCE
            : Math.abs(segment.start.x - originalEnd.x) < TOLERANCE &&
              Math.abs(segment.start.z - originalEnd.z) < TOLERANCE

          if (intersectionAtBoundary) {
            // Current segment starts from intersection - adjust it to start from arc end
            segment = {
              ...segment,
              start: { ...arcEnd },
            }
          }
        }
      }
    }

    if (crossings.length > 0) {
      console.log(`[resolveCrossings] Processing segment ${segIndex} with ${crossings.length} crossings`, {
        originalSegment: { start: segment.start, end: segment.end, type: segment.type },
      })
      try {
        // Replace segment with hop version
        const replaced = replaceSegmentWithHop(segment, crossings, existingWires)
        console.log(`[resolveCrossings] Segment ${segIndex} replaced`, {
          originalType: segment.type,
          originalSegment: { start: segment.start, end: segment.end },
          replacedCount: replaced.length,
          hasArcs: replaced.some((s) => s.type === 'arc'),
          replacedSegments: replaced.map((s) => ({
            start: s.start,
            end: s.end,
            type: s.type,
            isArc: s.type === 'arc',
          })),
        })
        result.push(...replaced)
      } catch (error) {
        console.error(`[resolveCrossings] Error replacing segment ${segIndex}:`, error)
        throw error
      }
    } else {
      // Keep original segment
      result.push(segment)
    }
  }

  console.log('[resolveCrossings] Finished resolution', {
    finalSegmentsCount: result.length,
    hasArcs: result.some((s) => s.type === 'arc'),
    crossedWireIds: Array.from(crossedWireIds),
  })

  return { segments: result, crossedWireIds: Array.from(crossedWireIds) }
}

/**
 * Check if an arc segment still crosses a specific wire.
 * An arc is needed if its center point (the original intersection) still intersects
 * a perpendicular segment in the given wire.
 *
 * @param arc - Arc segment to check
 * @param wire - Wire to check against
 * @returns True if arc still crosses the wire, false otherwise
 */
export function isArcStillNeededForWire(arc: WireSegment, wire: Wire): boolean {
  if (arc.type !== 'arc' || !arc.arcCenter) {
    return false
  }

  const arcCenter = arc.arcCenter

  // Determine if the arc was for a horizontal or vertical segment
  // The arc start/end are on the same line, so we check which coordinate changes
  const arcIsHorizontal = Math.abs(arc.start.z - arc.end.z) < TOLERANCE

  // Check segments of the specific wire for a crossing at the arc center
  for (const segment of wire.segments) {
    // Skip entry/exit segments and arc segments (only check routing segments)
    if (segment.type === 'entry' || segment.type === 'exit' || segment.type === 'arc') {
      continue
    }

    const segmentIsHorizontal = Math.abs(segment.start.z - segment.end.z) < TOLERANCE

    // Must be perpendicular (one horizontal, one vertical)
    if (arcIsHorizontal === segmentIsHorizontal) {
      continue
    }

    // Check if segment contains the arc center point
    const segmentMinX = Math.min(segment.start.x, segment.end.x)
    const segmentMaxX = Math.max(segment.start.x, segment.end.x)
    const segmentMinZ = Math.min(segment.start.z, segment.end.z)
    const segmentMaxZ = Math.max(segment.start.z, segment.end.z)

    const isOnSegment = segmentIsHorizontal
      ? arcCenter.x >= segmentMinX - TOLERANCE &&
        arcCenter.x <= segmentMaxX + TOLERANCE &&
        Math.abs(arcCenter.z - segment.start.z) < TOLERANCE
      : arcCenter.z >= segmentMinZ - TOLERANCE &&
        arcCenter.z <= segmentMaxZ + TOLERANCE &&
        Math.abs(arcCenter.x - segment.start.x) < TOLERANCE

    if (isOnSegment) {
      return true
    }
  }

  return false
}

/**
 * Remove orphaned arcs from wire segments and replace them with smooth segments.
 * Orphaned arcs are arcs that no longer cross any existing wire.
 *
 * @param segments - Array of wire segments (may contain arcs)
 * @param removedWireId - Optional: ID of wire that was removed (for direct ID matching)
 * @param recalculatedWires - Optional: Array of wires that were recalculated (for geometric check)
 * @returns Updated segments with orphaned arcs replaced, or null if no changes were made
 */
export function removeOrphanedArcs(
  segments: WireSegment[],
  removedWireId?: string,
  recalculatedWires?: Wire[]
): WireSegment[] | null {
  let hasChanges = false
  const result: WireSegment[] = []

  for (let i = 0; i < segments.length; i++) {
    const segment = segments[i]

    if (segment.type === 'arc') {
      let stillNeeded = false

      if (removedWireId !== undefined) {
        // Direct ID matching: arc is orphaned if it crossed the removed wire
        stillNeeded = segment.crossedWireId !== removedWireId
      } else if (recalculatedWires !== undefined) {
        // Geometric check: find the wire this arc crosses and check only that wire
        if (segment.crossedWireId) {
          const crossedWire = recalculatedWires.find((w) => w.id === segment.crossedWireId)
          if (crossedWire) {
            // Check if arc still crosses this specific wire's segments
            stillNeeded = isArcStillNeededForWire(segment, crossedWire)
          } else {
            // Crossed wire not in recalculated list, so arc is still needed
            // (it crosses a wire that wasn't recalculated)
            stillNeeded = true
          }
        } else {
          // Legacy arc without crossedWireId - keep it to be safe
          stillNeeded = true
        }
      } else {
        // No parameters provided - keep all arcs (shouldn't happen in practice)
        stillNeeded = true
      }

      if (!stillNeeded) {
        // Replace arc with smooth segment
        const isHorizontal = Math.abs(segment.start.z - segment.end.z) < TOLERANCE
        const smoothSegment: WireSegment = {
          start: { ...segment.start },
          end: { ...segment.end },
          type: isHorizontal ? 'horizontal' : 'vertical',
        }
        result.push(smoothSegment)
        hasChanges = true
      } else {
        // Keep the arc
        result.push(segment)
      }
    } else {
      // Keep non-arc segments as-is
      result.push(segment)
    }
  }

  if (!hasChanges) {
    return null
  }

  // Combine adjacent segments of the same type after removing arcs
  // This merges the smooth segments that replaced arcs with their neighbors
  const combined = combineAdjacentSegments(result)

  // Check if combining actually changed anything (e.g., if we replaced an arc with a segment
  // that can be combined with neighbors, the combined result may be different)
  // For now, always return the combined result if we made any changes
  return combined
}

