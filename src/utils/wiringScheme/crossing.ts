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
 * The arc center is at the intersection point. Cut points should ideally be
 * HOP_RADIUS distance from the intersection, but may be adjusted when the
 * intersection is near segment boundaries to fit within the segment.
 *
 * @param cutStart - Start point of the arc (within segment bounds)
 * @param cutEnd - End point of the arc (within segment bounds)
 * @param intersectionPoint - Point where wires intersect (arc center)
 * @returns WireSegment with type 'arc' representing the hop
 */
export function generateHopArc(
  cutStart: Position,
  cutEnd: Position,
  intersectionPoint: Position
): WireSegment {
  // Arc center is at intersection point at base height
  // The arc will curve upward from this center
  // Note: When intersection is at segment boundary, cut points may not be exactly
  // HOP_RADIUS from intersection, but the arc will still visually pass over it
  const arcCenter: Position = {
    x: intersectionPoint.x,
    y: WIRE_HEIGHT, // Arc center at base height, arc curves upward
    z: intersectionPoint.z,
  }

  // Calculate actual arc radius based on cut points
  // This ensures the arc is a proper semi-circle even when cut points are adjusted
  const cutStartDist = Math.sqrt(
    Math.pow(cutStart.x - intersectionPoint.x, 2) +
    Math.pow(cutStart.z - intersectionPoint.z, 2)
  )
  const cutEndDist = Math.sqrt(
    Math.pow(cutEnd.x - intersectionPoint.x, 2) +
    Math.pow(cutEnd.z - intersectionPoint.z, 2)
  )

  // Use the average distance as the radius (should be approximately HOP_RADIUS)
  // This handles cases where cut points are adjusted due to boundary constraints
  const arcRadius = (cutStartDist + cutEndDist) / 2

  return {
    start: cutStart,
    end: cutEnd,
    type: 'arc',
    arcCenter,
    arcRadius,
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

    // Calculate ideal cut points: intersection ± HOP_RADIUS
    // These points must be exactly HOP_RADIUS from the intersection
    let idealCutStart: Position
    let idealCutEnd: Position

    if (isHorizontal) {
      idealCutStart = {
        x: intersection.x - HOP_RADIUS,
        y: WIRE_HEIGHT,
        z: intersection.z,
      }
      idealCutEnd = {
        x: intersection.x + HOP_RADIUS,
        y: WIRE_HEIGHT,
        z: intersection.z,
      }
    } else {
      idealCutStart = {
        x: intersection.x,
        y: WIRE_HEIGHT,
        z: intersection.z - HOP_RADIUS,
      }
      idealCutEnd = {
        x: intersection.x,
        y: WIRE_HEIGHT,
        z: intersection.z + HOP_RADIUS,
      }
    }

    // Clamp cut points to segment bounds
    let cutStart: Position
    let cutEnd: Position

    if (isHorizontal) {
      const segmentMinX = Math.min(segment.start.x, segment.end.x)
      const segmentMaxX = Math.max(segment.start.x, segment.end.x)
      cutStart = {
        x: Math.max(segmentMinX, Math.min(segmentMaxX, idealCutStart.x)),
        y: WIRE_HEIGHT,
        z: intersection.z,
      }
      cutEnd = {
        x: Math.max(segmentMinX, Math.min(segmentMaxX, idealCutEnd.x)),
        y: WIRE_HEIGHT,
        z: intersection.z,
      }
    } else {
      const segmentMinZ = Math.min(segment.start.z, segment.end.z)
      const segmentMaxZ = Math.max(segment.start.z, segment.end.z)
      cutStart = {
        x: intersection.x,
        y: WIRE_HEIGHT,
        z: Math.max(segmentMinZ, Math.min(segmentMaxZ, idealCutStart.z)),
      }
      cutEnd = {
        x: intersection.x,
        y: WIRE_HEIGHT,
        z: Math.max(segmentMinZ, Math.min(segmentMaxZ, idealCutEnd.z)),
      }
    }

    // Verify cut points are still HOP_RADIUS from intersection after clamping
    // If clamping occurred, we need to adjust the arc to fit within the segment
    const cutStartDist = isHorizontal
      ? Math.abs(cutStart.x - intersection.x)
      : Math.abs(cutStart.z - intersection.z)
    const cutEndDist = isHorizontal
      ? Math.abs(cutEnd.x - intersection.x)
      : Math.abs(cutEnd.z - intersection.z)

    // Check if cut points are valid (must be HOP_RADIUS from intersection)
    const cutStartValid = Math.abs(cutStartDist - HOP_RADIUS) < TOLERANCE
    const cutEndValid = Math.abs(cutEndDist - HOP_RADIUS) < TOLERANCE

    // If clamping occurred, adjust cut points to fit within segment
    // The key insight: even if intersection is at segment boundary, we can still create an arc
    // by adjusting the cut points to fit within the segment bounds
    if (!cutStartValid || !cutEndValid) {
      // Calculate segment length and bounds
      const segmentLength = isHorizontal
        ? Math.abs(segment.end.x - segment.start.x)
        : Math.abs(segment.end.z - segment.start.z)

      // Need at least 2 * HOP_RADIUS for a proper arc
      if (segmentLength < 2 * HOP_RADIUS) {
          console.warn(
          `[replaceSegmentWithHop] Skipping crossing: segment too short for arc. ` +
          `Segment length: ${segmentLength.toFixed(3)}, minimum required: ${(2 * HOP_RADIUS).toFixed(3)}. ` +
          `Segment: ${JSON.stringify({ start: segment.start, end: segment.end })}, ` +
          `Intersection: ${JSON.stringify(intersection)}`
          )
          continue
    }

      // Adjust cut points to fit within segment
      // When intersection is at/near boundary, we'll create an arc that fits within the segment
      // The arc center remains at the intersection, but cut points are adjusted
      if (isHorizontal) {
        const segmentMinX = Math.min(segment.start.x, segment.end.x)
        const segmentMaxX = Math.max(segment.start.x, segment.end.x)

        // Try to center arc on intersection first
        const idealStart = intersection.x - HOP_RADIUS
        const idealEnd = intersection.x + HOP_RADIUS

        if (idealStart < segmentMinX) {
          // Intersection too close to start - place cutStart at segment start
          // and cutEnd as far as possible (up to intersection + HOP_RADIUS or segment end)
          cutStart.x = segmentMinX
          // Try to extend cutEnd to intersection + HOP_RADIUS, but clamp to segment end
          cutEnd.x = Math.min(segmentMaxX, intersection.x + HOP_RADIUS)
        } else if (idealEnd > segmentMaxX) {
          // Intersection too close to end (or at end)
          // Try to place cutStart at intersection - HOP_RADIUS first
          const desiredStart = intersection.x - HOP_RADIUS

          if (desiredStart >= segmentMinX) {
            // Can place cutStart at desired position - place cutEnd at intersection + HOP_RADIUS
            // Allow it to extend beyond segment end to ensure proper arc radius
            // The final segment logic will handle not adding a segment if we've passed the end
            cutStart.x = desiredStart
          cutEnd.x = intersection.x + HOP_RADIUS
            // Don't clamp cutEnd - allow it to extend beyond segment for proper arc
          } else {
            // Desired start is outside segment - use segment start
            // Place cutEnd as far as possible (up to intersection + HOP_RADIUS or segment end)
            cutStart.x = segmentMinX
            cutEnd.x = Math.min(segmentMaxX, intersection.x + HOP_RADIUS)
          }
        } else {
          // Can center on intersection
          cutStart.x = idealStart
          cutEnd.x = idealEnd
        }
      } else {
        const segmentMinZ = Math.min(segment.start.z, segment.end.z)
        const segmentMaxZ = Math.max(segment.start.z, segment.end.z)

        // Try to center arc on intersection first
        const idealStart = intersection.z - HOP_RADIUS
        const idealEnd = intersection.z + HOP_RADIUS

        if (idealStart < segmentMinZ) {
          // Intersection too close to start - place cutStart at segment start
          cutStart.z = segmentMinZ
          // Try to extend cutEnd to intersection + HOP_RADIUS, but clamp to segment end
          cutEnd.z = Math.min(segmentMaxZ, intersection.z + HOP_RADIUS)
        } else if (idealEnd > segmentMaxZ) {
          // Intersection too close to end (or at end)
          // Try to place cutStart at intersection - HOP_RADIUS first
          const desiredStart = intersection.z - HOP_RADIUS

          if (desiredStart >= segmentMinZ) {
            // Can place cutStart at desired position - place cutEnd at intersection + HOP_RADIUS
            // Allow it to extend beyond segment end to ensure proper arc radius
            // The final segment logic will handle not adding a segment if we've passed the end
            cutStart.z = desiredStart
          cutEnd.z = intersection.z + HOP_RADIUS
            // Don't clamp cutEnd - allow it to extend beyond segment for proper arc
          } else {
            // Desired start is outside segment - use segment start
            // Place cutEnd as far as possible (up to intersection + HOP_RADIUS or segment end)
            cutStart.z = segmentMinZ
            cutEnd.z = Math.min(segmentMaxZ, intersection.z + HOP_RADIUS)
          }
        } else {
          // Can center on intersection
          cutStart.z = idealStart
          cutEnd.z = idealEnd
        }
      }

      // Verify adjusted cut points span at least a reasonable distance
      const adjustedCutLength = isHorizontal
        ? Math.abs(cutEnd.x - cutStart.x)
        : Math.abs(cutEnd.z - cutStart.z)

      // If intersection is exactly at segment boundary, we might have very short cut length
      // But we should still create the arc if the segment is long enough overall
      // Check if we have at least HOP_RADIUS span (half of ideal 2*HOP_RADIUS)
      if (adjustedCutLength < HOP_RADIUS) {
          console.warn(
          `[replaceSegmentWithHop] Skipping crossing: cannot fit arc within segment. ` +
          `Cut length: ${adjustedCutLength.toFixed(3)}, minimum: ${HOP_RADIUS.toFixed(3)}. ` +
          `Segment: ${JSON.stringify({ start: segment.start, end: segment.end })}, ` +
          `Intersection: ${JSON.stringify(intersection)}`
          )
          continue
        }
      }

    // Verify cut points don't overlap
    const cutLength = isHorizontal
      ? Math.abs(cutEnd.x - cutStart.x)
      : Math.abs(cutEnd.z - cutStart.z)

    if (cutLength < TOLERANCE) {
      console.warn(
        `[replaceSegmentWithHop] Skipping crossing: cut points overlap. ` +
        `Cut length: ${cutLength.toFixed(3)}. ` +
        `Segment: ${JSON.stringify({ start: segment.start, end: segment.end })}, ` +
        `Cut points: ${JSON.stringify({ cutStart, cutEnd })}`
      )
      continue
    }

    // Add segment from current start to cut start (if there's a gap)
    // Ensure no gaps or overlaps by checking distance
    const distanceToCutStart = isHorizontal
      ? Math.abs(currentStart.x - cutStart.x)
      : Math.abs(currentStart.z - cutStart.z)

    if (distanceToCutStart > TOLERANCE) {
      // Verify cutStart is ahead of currentStart (not behind)
      const isAhead = isHorizontal
        ? (segment.start.x < segment.end.x ? cutStart.x > currentStart.x : cutStart.x < currentStart.x)
        : (segment.start.z < segment.end.z ? cutStart.z > currentStart.z : cutStart.z < currentStart.z)

      if (isAhead) {
      result.push({
        start: currentStart,
        end: cutStart,
        type: segment.type,
      })
      } else {
        // Cut start is behind current start - this shouldn't happen with proper sorting
        console.warn(
          `[replaceSegmentWithHop] Cut start is behind current start, skipping segment. ` +
          `Current start: ${JSON.stringify(currentStart)}, Cut start: ${JSON.stringify(cutStart)}`
        )
        continue
      }
    } else if (distanceToCutStart > 0) {
      // Very close but not exact - snap to cutStart to avoid tiny gaps
      currentStart = cutStart
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

    // Generate arc - this will validate that cut points are HOP_RADIUS from intersection
    const arc = generateHopArc(cutStart, cutEnd, intersection)
    result.push(arc)

    // Update currentStart to arc end for next iteration
    // Ensure exact match to avoid gaps
    currentStart = { ...cutEnd }
  }

  // Add final segment from last cut end (or original start if no crossings processed) to segment end
  // But only if currentStart hasn't already passed segment.end (which can happen if cutEnd extended beyond segment)
  const distanceToEnd = isHorizontal
    ? Math.abs(currentStart.x - segment.end.x)
    : Math.abs(currentStart.z - segment.end.z)

  // Check if we've already passed the segment end
  const hasPassedEnd = isHorizontal
    ? (segment.start.x < segment.end.x ? currentStart.x > segment.end.x : currentStart.x < segment.end.x)
    : (segment.start.z < segment.end.z ? currentStart.z > segment.end.z : currentStart.z < segment.end.z)

  if (!hasPassedEnd && distanceToEnd > TOLERANCE) {
    // Verify we're moving in the right direction
    const isAhead = isHorizontal
      ? (segment.start.x < segment.end.x ? segment.end.x > currentStart.x : segment.end.x < currentStart.x)
      : (segment.start.z < segment.end.z ? segment.end.z > currentStart.z : segment.end.z < currentStart.z)

    if (isAhead) {
    result.push({
      start: currentStart,
      end: segment.end,
      type: segment.type,
    })
    }
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

