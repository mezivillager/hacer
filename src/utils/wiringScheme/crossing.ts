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
 * Generate a semi-circular arc segment that hops over a crossed wire.
 *
 * @param intersectionPoint - Point where wires intersect
 * @param newSegment - The new wire segment being crossed (determines arc orientation)
 * @returns WireSegment with type 'arc' representing the hop
 */
export function generateHopArc(
  cutStart: Position,
  cutEnd: Position,
  intersectionPoint: Position
): WireSegment {
  // Arc center is at intersection point at base height
  // The arc will curve upward from this center
  const arcCenter: Position = {
    x: intersectionPoint.x,
    y: WIRE_HEIGHT, // Arc center at base height, arc curves upward
    z: intersectionPoint.z,
  }

  return {
    start: cutStart,
    end: cutEnd,
    type: 'arc',
    arcCenter,
    arcRadius: HOP_RADIUS,
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
  const isHorizontal = Math.abs(segment.start.z - segment.end.z) < TOLERANCE

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

    // Verify segment length first
    const segmentLength = isHorizontal
      ? Math.abs(segment.end.x - segment.start.x)
      : Math.abs(segment.end.z - segment.start.z)

    // If segment is too short to create a hop, skip this crossing
    // Need at least 2 * HOP_RADIUS for a proper semi-circular arc
    if (segmentLength < 2 * HOP_RADIUS) {
      console.warn(
        `[replaceSegmentWithHop] Skipping crossing: segment too short for semi-circular arc. ` +
        `Segment length: ${segmentLength.toFixed(3)}, minimum required: ${(2 * HOP_RADIUS).toFixed(3)}. ` +
        `Segment: ${JSON.stringify({ start: segment.start, end: segment.end })}, ` +
        `Intersection: ${JSON.stringify(intersection)}`
      )
      continue
    }

    // Calculate cut points centered on intersection
    // Arc should always span 2 * HOP_RADIUS, centered on intersection point
    // This ensures a proper semi-circular arc regardless of where intersection is on segment
    let cutStart: Position
    let cutEnd: Position

    if (isHorizontal) {
      // Cut points centered on intersection - span should be 2 * HOP_RADIUS
      cutStart = {
        x: intersection.x - HOP_RADIUS,
        y: WIRE_HEIGHT,
        z: intersection.z,
      }
      cutEnd = {
        x: intersection.x + HOP_RADIUS,
        y: WIRE_HEIGHT,
        z: intersection.z,
      }
      // Clamp to segment bounds
      const segmentMinX = Math.min(segment.start.x, segment.end.x)
      const segmentMaxX = Math.max(segment.start.x, segment.end.x)
      cutStart.x = Math.max(segmentMinX, Math.min(segmentMaxX, cutStart.x))
      cutEnd.x = Math.max(segmentMinX, Math.min(segmentMaxX, cutEnd.x))
    } else {
      // Cut points centered on intersection - span should be 2 * HOP_RADIUS
      cutStart = {
        x: intersection.x,
        y: WIRE_HEIGHT,
        z: intersection.z - HOP_RADIUS,
      }
      cutEnd = {
        x: intersection.x,
        y: WIRE_HEIGHT,
        z: intersection.z + HOP_RADIUS,
      }
      // Clamp to segment bounds
      const segmentMinZ = Math.min(segment.start.z, segment.end.z)
      const segmentMaxZ = Math.max(segment.start.z, segment.end.z)
      cutStart.z = Math.max(segmentMinZ, Math.min(segmentMaxZ, cutStart.z))
      cutEnd.z = Math.max(segmentMinZ, Math.min(segmentMaxZ, cutEnd.z))
    }

    // Verify cut points are valid after clamping
    const cutLength = isHorizontal
      ? Math.abs(cutEnd.x - cutStart.x)
      : Math.abs(cutEnd.z - cutStart.z)

    // Check if cut points overlap or are too close (invalid cut region)
    if (cutLength < TOLERANCE) {
      console.warn(
        `[replaceSegmentWithHop] Skipping crossing: cut points overlap after clamping. ` +
        `Segment length: ${segmentLength.toFixed(3)}, cut length: ${cutLength.toFixed(3)}. ` +
        `Segment: ${JSON.stringify({ start: segment.start, end: segment.end })}, ` +
        `Cut points: ${JSON.stringify({ cutStart, cutEnd })}`
      )
      continue
    }

    // Verify that cut points are not at the intersection point (they should be radius distance away)
    // If a cut point is at the intersection, adjust it to be a radius distance away
    const cutStartDist = isHorizontal
      ? Math.abs(cutStart.x - intersection.x)
      : Math.abs(cutStart.z - intersection.z)
    const cutEndDist = isHorizontal
      ? Math.abs(cutEnd.x - intersection.x)
      : Math.abs(cutEnd.z - intersection.z)

    if (cutStartDist < TOLERANCE) {
      // Cut start is at intersection - adjust it to be a radius distance away
      if (isHorizontal) {
        const segmentMaxX = Math.max(segment.start.x, segment.end.x)
        // Try to move cutStart away from intersection
        if (intersection.x + HOP_RADIUS <= segmentMaxX) {
          // Can extend to the right
          cutStart.x = intersection.x - HOP_RADIUS
          cutEnd.x = intersection.x + HOP_RADIUS
        } else {
          // Cannot extend - skip this crossing
          console.warn(
            `[replaceSegmentWithHop] Cut start at intersection, cannot adjust. Skipping. ` +
            `Intersection: ${JSON.stringify(intersection)}, Segment: ${JSON.stringify({ start: segment.start, end: segment.end })}`
          )
          continue
        }
      } else {
        const segmentMaxZ = Math.max(segment.start.z, segment.end.z)
        if (intersection.z + HOP_RADIUS <= segmentMaxZ) {
          cutStart.z = intersection.z - HOP_RADIUS
          cutEnd.z = intersection.z + HOP_RADIUS
        } else {
          console.warn(
            `[replaceSegmentWithHop] Cut start at intersection, cannot adjust. Skipping. ` +
            `Intersection: ${JSON.stringify(intersection)}, Segment: ${JSON.stringify({ start: segment.start, end: segment.end })}`
          )
          continue
        }
      }
    }

    if (cutEndDist < TOLERANCE) {
      // Cut end is at intersection - adjust it to be a radius distance away
      if (isHorizontal) {
        const segmentMinX = Math.min(segment.start.x, segment.end.x)
        // Try to move cutEnd away from intersection
        if (intersection.x - HOP_RADIUS >= segmentMinX) {
          // Can extend to the left
          cutStart.x = intersection.x - HOP_RADIUS
          cutEnd.x = intersection.x + HOP_RADIUS
        } else {
          // Cannot extend - skip this crossing
          console.warn(
            `[replaceSegmentWithHop] Cut end at intersection, cannot adjust. Skipping. ` +
            `Intersection: ${JSON.stringify(intersection)}, Segment: ${JSON.stringify({ start: segment.start, end: segment.end })}`
          )
          continue
        }
      } else {
        const segmentMinZ = Math.min(segment.start.z, segment.end.z)
        if (intersection.z - HOP_RADIUS >= segmentMinZ) {
          cutStart.z = intersection.z - HOP_RADIUS
          cutEnd.z = intersection.z + HOP_RADIUS
        } else {
          console.warn(
            `[replaceSegmentWithHop] Cut end at intersection, cannot adjust. Skipping. ` +
            `Intersection: ${JSON.stringify(intersection)}, Segment: ${JSON.stringify({ start: segment.start, end: segment.end })}`
          )
          continue
        }
      }
    }

    // Add segment from current start to cut start
    if (
      (isHorizontal && Math.abs(currentStart.x - cutStart.x) > TOLERANCE) ||
      (!isHorizontal && Math.abs(currentStart.z - cutStart.z) > TOLERANCE)
    ) {
      result.push({
        start: currentStart,
        end: cutStart,
        type: segment.type,
      })
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

    const arc = generateHopArc(cutStart, cutEnd, intersection)
    result.push(arc)
    currentStart = cutEnd
  }

  // Add final segment from last cut end to segment end
  if (
    (isHorizontal && Math.abs(currentStart.x - segment.end.x) > TOLERANCE) ||
    (!isHorizontal && Math.abs(currentStart.z - segment.end.z) > TOLERANCE)
  ) {
    result.push({
      start: currentStart,
      end: segment.end,
      type: segment.type,
    })
  }

  return result.length > 0 ? result : [segment]
}

/**
 * Resolve all crossings in new wire segments by replacing affected segments with hops.
 *
 * @param newWireSegments - Segments of the new wire being created
 * @param existingWires - Array of existing wires in the circuit
 * @returns Modified segments with arcs replacing crossing segments
 */
export function resolveCrossings(
  newWireSegments: WireSegment[],
  existingWires: Wire[]
): WireSegment[] {
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
    return newWireSegments
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

        // If intersection is at boundary between adjacent segments, skip this crossing
        // (the previous segment already has an arc for this crossing)
        // This prevents duplicate arcs when adjacent segments both cross at the same boundary point
        if ((isAtCurrentStart && isAtPreviousEnd) || (isAtCurrentEnd && isAtPreviousStart)) {
          console.log(`[resolveCrossings] Deduplicating crossing at segment boundary`, {
            currentSegmentIndex: segIndex,
            previousSegmentIndex,
            intersectionPoint: crossing.intersectionPoint,
          })
          continue // Skip ALL crossings at this boundary - already handled by previous segment
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
    const segment = newWireSegments[segIndex]
    const crossings = crossingsBySegment.get(segIndex) || []

    if (crossings.length > 0) {
      console.log(`[resolveCrossings] Processing segment ${segIndex} with ${crossings.length} crossings`)
      try {
        // Replace segment with hop version
        const replaced = replaceSegmentWithHop(segment, crossings, existingWires)
        console.log(`[resolveCrossings] Segment ${segIndex} replaced`, {
          originalType: segment.type,
          replacedCount: replaced.length,
          hasArcs: replaced.some((s) => s.type === 'arc'),
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
  })

  return result
}

