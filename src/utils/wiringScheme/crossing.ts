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

    console.log(`[replaceSegmentWithHop] Processing crossing`, {
      segment: { start: segment.start, end: segment.end, type: segment.type },
      intersection: { x: intersection.x, z: intersection.z },
      currentStart: { x: currentStart.x, z: currentStart.z },
    })

    // Calculate ideal cut points: intersection ± HOP_RADIUS
    // These points must be exactly HOP_RADIUS from the intersection
    // CRITICAL: For vertical segments, we must respect segment direction
    // - Increasing segment (start.z < end.z): cutStart should be lower z, cutEnd should be higher z
    // - Decreasing segment (start.z > end.z): cutStart should be higher z, cutEnd should be lower z
    let idealCutStart: Position
    let idealCutEnd: Position

    if (isHorizontal) {
      const isIncreasing = segment.start.x < segment.end.x
      if (isIncreasing) {
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
        // Decreasing horizontal segment: cutStart should be higher x, cutEnd should be lower x
        idealCutStart = {
          x: intersection.x + HOP_RADIUS,
          y: WIRE_HEIGHT,
          z: intersection.z,
        }
        idealCutEnd = {
          x: intersection.x - HOP_RADIUS,
          y: WIRE_HEIGHT,
          z: intersection.z,
        }
      }
    } else {
      const isIncreasing = segment.start.z < segment.end.z
      if (isIncreasing) {
        // Increasing vertical segment: cutStart should be lower z, cutEnd should be higher z
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
      } else {
        // Decreasing vertical segment: cutStart should be higher z, cutEnd should be lower z
        idealCutStart = {
          x: intersection.x,
          y: WIRE_HEIGHT,
          z: intersection.z + HOP_RADIUS,
        }
        idealCutEnd = {
          x: intersection.x,
          y: WIRE_HEIGHT,
          z: intersection.z - HOP_RADIUS,
        }
      }
    }

    // Clamp cut points to segment bounds
    let cutStart: Position
    let cutEnd: Position

    if (isHorizontal) {
      const isIncreasing = segment.start.x < segment.end.x
      const segmentMinX = Math.min(segment.start.x, segment.end.x)
      const segmentMaxX = Math.max(segment.start.x, segment.end.x)

      // Clamp to segment bounds - ideal cut points already respect direction
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

      // Verify cut points are in correct order (should already be correct)
      const cutPointsInOrder = isIncreasing
        ? cutStart.x <= cutEnd.x
        : cutStart.x >= cutEnd.x

      if (!cutPointsInOrder) {
        console.error(`[replaceSegmentWithHop] ERROR: Cut points in wrong order after clamping for horizontal segment!`, {
          isIncreasing,
          cutStart: cutStart.x,
          cutEnd: cutEnd.x,
          idealCutStart: idealCutStart.x,
          idealCutEnd: idealCutEnd.x,
        })
        // Auto-correct by swapping
        const temp = cutStart.x
        cutStart.x = cutEnd.x
        cutEnd.x = temp
        console.warn(`[replaceSegmentWithHop] Auto-corrected by swapping cut points`)
      }
    } else {
      // For vertical segments, determine direction first
      const isIncreasing = segment.start.z < segment.end.z
      const segmentStartZ = isIncreasing ? segment.start.z : segment.end.z
      const segmentEndZ = isIncreasing ? segment.end.z : segment.start.z

      // Calculate cut points respecting direction
      // Clamp to segment bounds - ideal cut points already respect direction
      const clampedCutStartZ = Math.max(segmentStartZ, Math.min(segmentEndZ, idealCutStart.z))
      const clampedCutEndZ = Math.max(segmentStartZ, Math.min(segmentEndZ, idealCutEnd.z))

      cutStart = {
        x: intersection.x,
        y: WIRE_HEIGHT,
        z: clampedCutStartZ,
      }
      cutEnd = {
        x: intersection.x,
        y: WIRE_HEIGHT,
        z: clampedCutEndZ,
      }

      // Verify cut points are in correct order (should already be correct after direction-aware calculation)
      // This is just a safety check - we shouldn't need to swap if ideal cut points were calculated correctly
      const cutPointsInOrder = isIncreasing
        ? cutStart.z <= cutEnd.z
        : cutStart.z >= cutEnd.z

      if (!cutPointsInOrder) {
        console.error(`[replaceSegmentWithHop] ERROR: Cut points in wrong order after clamping!`, {
          isIncreasing,
          cutStart: cutStart.z,
          cutEnd: cutEnd.z,
          idealCutStart: idealCutStart.z,
          idealCutEnd: idealCutEnd.z,
        })
        // Auto-correct by swapping
        const temp = cutStart.z
        cutStart.z = cutEnd.z
        cutEnd.z = temp
        console.warn(`[replaceSegmentWithHop] Auto-corrected by swapping cut points`)
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
        const isIncreasing = segment.start.x < segment.end.x
        const segmentMinX = Math.min(segment.start.x, segment.end.x)
        const segmentMaxX = Math.max(segment.start.x, segment.end.x)

        // Try to center arc on intersection first
        const idealStart = intersection.x - HOP_RADIUS
        const idealEnd = intersection.x + HOP_RADIUS

        if (isIncreasing) {
          // Increasing horizontal segment
          if (idealStart < segmentMinX) {
            // Intersection too close to start - place cutStart at segment start
            cutStart.x = segmentMinX
            cutEnd.x = Math.min(segmentMaxX, idealEnd)
          } else if (idealEnd > segmentMaxX) {
            // Intersection too close to end
            const desiredStart = idealStart
            if (desiredStart >= segmentMinX) {
              cutStart.x = desiredStart
              cutEnd.x = Math.min(segmentMaxX, idealEnd)
            } else {
              cutStart.x = segmentMinX
              cutEnd.x = Math.min(segmentMaxX, idealEnd)
            }
          } else {
            // Can center on intersection
            cutStart.x = idealStart
            cutEnd.x = idealEnd
          }
        } else {
          // Decreasing horizontal segment
          if (idealStart > segmentMaxX) {
            // Intersection too close to start (which is at maxX for decreasing)
            cutStart.x = segmentMaxX
            cutEnd.x = Math.max(segmentMinX, idealEnd)
          } else if (idealEnd < segmentMinX) {
            // Intersection too close to end (which is at minX for decreasing)
            const desiredStart = idealStart
            if (desiredStart <= segmentMaxX) {
              cutStart.x = desiredStart
              cutEnd.x = Math.max(segmentMinX, idealEnd)
            } else {
              cutStart.x = segmentMaxX
              cutEnd.x = Math.max(segmentMinX, idealEnd)
            }
          } else {
            // Can center on intersection
            cutStart.x = idealStart
            cutEnd.x = idealEnd
          }
        }
      } else {
        // For vertical segments, determine direction first
        const isIncreasing = segment.start.z < segment.end.z
        const segmentStartZ = isIncreasing ? segment.start.z : segment.end.z
        const segmentEndZ = isIncreasing ? segment.end.z : segment.start.z

        // Try to center arc on intersection first
        // For increasing segments: idealStart < intersection < idealEnd
        // For decreasing segments: idealStart > intersection > idealEnd
        const idealStart = isIncreasing
          ? intersection.z - HOP_RADIUS
          : intersection.z + HOP_RADIUS
        const idealEnd = isIncreasing
          ? intersection.z + HOP_RADIUS
          : intersection.z - HOP_RADIUS

        if (isIncreasing) {
          // Increasing vertical segment
          if (idealStart < segmentStartZ) {
            // Intersection too close to start - place cutStart at segment start
            cutStart.z = segmentStartZ
            cutEnd.z = Math.min(segmentEndZ, idealEnd)
          } else if (idealEnd > segmentEndZ) {
            // Intersection too close to end
            const desiredStart = idealStart
            if (desiredStart >= segmentStartZ) {
              cutStart.z = desiredStart
              cutEnd.z = Math.min(segmentEndZ, idealEnd)
            } else {
              cutStart.z = segmentStartZ
              cutEnd.z = Math.min(segmentEndZ, idealEnd)
            }
          } else {
            // Can center on intersection
            cutStart.z = idealStart
            cutEnd.z = idealEnd
          }
        } else {
          // Decreasing vertical segment
          if (idealStart > segmentEndZ) {
            // Intersection too close to start (which is at maxZ for decreasing)
            cutStart.z = segmentEndZ
            cutEnd.z = Math.max(segmentStartZ, idealEnd)
          } else if (idealEnd < segmentStartZ) {
            // Intersection too close to end (which is at minZ for decreasing)
            const desiredStart = idealStart
            if (desiredStart <= segmentEndZ) {
              cutStart.z = desiredStart
              cutEnd.z = Math.max(segmentStartZ, idealEnd)
            } else {
              cutStart.z = segmentEndZ
              cutEnd.z = Math.max(segmentStartZ, idealEnd)
            }
          } else {
            // Can center on intersection
            cutStart.z = idealStart
            cutEnd.z = idealEnd
          }
        }
      }

      // Verify adjusted cut points span at least a reasonable distance
      const adjustedCutLength = isHorizontal
        ? Math.abs(cutEnd.x - cutStart.x)
        : Math.abs(cutEnd.z - cutStart.z)

      // Validate cut points are in correct order relative to segment direction
      if (isHorizontal) {
        const isIncreasing = segment.start.x < segment.end.x
        const cutPointsInOrder = isIncreasing
          ? cutStart.x <= cutEnd.x
          : cutStart.x >= cutEnd.x

        if (!cutPointsInOrder) {
          console.error(`[replaceSegmentWithHop] ERROR: Cut points in wrong order for horizontal segment!`, {
            segmentStart: segment.start.x,
            segmentEnd: segment.end.x,
            cutStart: cutStart.x,
            cutEnd: cutEnd.x,
            isIncreasing,
            direction: isIncreasing ? 'increasing' : 'decreasing',
          })
          // Auto-correct by swapping
          const temp = cutStart.x
          cutStart.x = cutEnd.x
          cutEnd.x = temp
          console.warn(`[replaceSegmentWithHop] Auto-corrected by swapping cut points`)
        }
      } else {
        const isIncreasing = segment.start.z < segment.end.z
        const cutPointsInOrder = isIncreasing
          ? cutStart.z <= cutEnd.z
          : cutStart.z >= cutEnd.z

        if (!cutPointsInOrder) {
          console.error(`[replaceSegmentWithHop] ERROR: Cut points in wrong order for vertical segment!`, {
            segmentStart: segment.start.z,
            segmentEnd: segment.end.z,
            cutStart: cutStart.z,
            cutEnd: cutEnd.z,
            isIncreasing,
            direction: isIncreasing ? 'increasing' : 'decreasing',
          })
          // Auto-correct by swapping
          const temp = cutStart.z
          cutStart.z = cutEnd.z
          cutEnd.z = temp
          console.warn(`[replaceSegmentWithHop] Auto-corrected by swapping cut points`)
        }
      }

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

    console.log(`[replaceSegmentWithHop] Cut points calculated`, {
      idealCutStart: { x: idealCutStart.x, z: idealCutStart.z },
      idealCutEnd: { x: idealCutEnd.x, z: idealCutEnd.z },
      cutStart: { x: cutStart.x, y: cutStart.y, z: cutStart.z },
      cutEnd: { x: cutEnd.x, y: cutEnd.y, z: cutEnd.z },
      segmentStart: { x: segment.start.x, y: segment.start.y, z: segment.start.z },
      segmentEnd: { x: segment.end.x, y: segment.end.y, z: segment.end.z },
      isHorizontal,
      cutStartDist: isHorizontal
        ? Math.abs(cutStart.x - intersection.x)
        : Math.abs(cutStart.z - intersection.z),
      cutEndDist: isHorizontal
        ? Math.abs(cutEnd.x - intersection.x)
        : Math.abs(cutEnd.z - intersection.z),
      cutLength: isHorizontal
        ? Math.abs(cutEnd.x - cutStart.x)
        : Math.abs(cutEnd.z - cutStart.z),
      segmentLength: isHorizontal
        ? Math.abs(segment.end.x - segment.start.x)
        : Math.abs(segment.end.z - segment.start.z),
    })

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
      // Ensure before segment ends exactly at cutStart, not beyond it
      // Use the exact cutStart reference to avoid floating point issues
      // CRITICAL: Use exact coordinates to prevent any overlap with arc region
      const beforeSegment = {
        start: {
          x: currentStart.x,
          y: currentStart.y,
          z: currentStart.z
        },
        end: {
          x: cutStart.x,  // Exact cutStart.x - must not exceed this
          y: cutStart.y,
          z: cutStart.z   // Exact cutStart.z - must not exceed this
        },
        type: segment.type,
      }

      // Verify the segment doesn't extend beyond cutStart
      // Use direction-aware validation
      if (isHorizontal) {
        const isIncreasing = segment.start.x < segment.end.x
        const segEndX = beforeSegment.end.x
        const cutStartX = cutStart.x
        const extendsBeyond = isIncreasing
          ? segEndX > cutStartX + TOLERANCE
          : segEndX < cutStartX - TOLERANCE

        if (Math.abs(segEndX - cutStartX) > TOLERANCE || extendsBeyond) {
          console.error(`[replaceSegmentWithHop] ERROR: Before segment end exceeds cutStart!`, {
            segEndX,
            cutStartX,
            isIncreasing,
            segmentDirection: isIncreasing ? 'increasing' : 'decreasing',
          })
          beforeSegment.end.x = cutStart.x
        }
      } else {
        const isIncreasing = segment.start.z < segment.end.z
        const segEndZ = beforeSegment.end.z
        const cutStartZ = cutStart.z
        const extendsBeyond = isIncreasing
          ? segEndZ > cutStartZ + TOLERANCE
          : segEndZ < cutStartZ - TOLERANCE

        if (Math.abs(segEndZ - cutStartZ) > TOLERANCE || extendsBeyond) {
          console.error(`[replaceSegmentWithHop] ERROR: Before segment end exceeds cutStart!`, {
            segEndZ,
            cutStartZ,
            isIncreasing,
            segmentDirection: isIncreasing ? 'increasing' : 'decreasing',
          })
          beforeSegment.end.z = cutStart.z
        }
      }
      console.log(`[replaceSegmentWithHop] Adding before segment`, {
        beforeSegment: { start: beforeSegment.start, end: beforeSegment.end, type: beforeSegment.type },
        cutStart: { x: cutStart.x, y: cutStart.y, z: cutStart.z },
        endsMatch: isHorizontal
          ? Math.abs(beforeSegment.end.x - cutStart.x) < TOLERANCE
          : Math.abs(beforeSegment.end.z - cutStart.z) < TOLERANCE,
      })
      result.push(beforeSegment)
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
    console.log(`[replaceSegmentWithHop] Generated arc`, {
      arcStart: { x: arc.start.x, z: arc.start.z },
      arcEnd: { x: arc.end.x, z: arc.end.z },
      cutStart: { x: cutStart.x, z: cutStart.z },
      cutEnd: { x: cutEnd.x, z: cutEnd.z },
      arcCenter: arc.arcCenter ? { x: arc.arcCenter.x, z: arc.arcCenter.z } : null,
      arcRadius: arc.arcRadius,
    })
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
    // Ensure after segment starts exactly at currentStart (which should be cutEnd), not before it
    // Use the exact currentStart reference to avoid floating point issues
    // CRITICAL: Use exact coordinates to prevent any overlap with arc region
    const afterSegment = {
      start: {
        x: currentStart.x,  // Exact cutEnd.x - must not be less than this
        y: currentStart.y,
        z: currentStart.z   // Exact cutEnd.z - must not be less than this
      },
      end: {
        x: segment.end.x,
        y: segment.end.y,
        z: segment.end.z
      },
      type: segment.type,
    }

    // Verify the segment doesn't start before cutEnd
    // Use direction-aware validation
    if (isHorizontal) {
      const isIncreasing = segment.start.x < segment.end.x
      const segStartX = afterSegment.start.x
      const cutEndX = currentStart.x // Should be cutEnd
      const startsBefore = isIncreasing
        ? segStartX < cutEndX - TOLERANCE
        : segStartX > cutEndX + TOLERANCE

      if (Math.abs(segStartX - cutEndX) > TOLERANCE || startsBefore) {
        console.error(`[replaceSegmentWithHop] ERROR: After segment start is before cutEnd!`, {
          segStartX,
          cutEndX,
          isIncreasing,
          segmentDirection: isIncreasing ? 'increasing' : 'decreasing',
        })
        afterSegment.start.x = cutEndX
      }
    } else {
      const isIncreasing = segment.start.z < segment.end.z
      const segStartZ = afterSegment.start.z
      const cutEndZ = currentStart.z // Should be cutEnd
      const startsBefore = isIncreasing
        ? segStartZ < cutEndZ - TOLERANCE
        : segStartZ > cutEndZ + TOLERANCE

      if (Math.abs(segStartZ - cutEndZ) > TOLERANCE || startsBefore) {
        console.error(`[replaceSegmentWithHop] ERROR: After segment start is before cutEnd!`, {
          segStartZ,
          cutEndZ,
          isIncreasing,
          segmentDirection: isIncreasing ? 'increasing' : 'decreasing',
        })
        afterSegment.start.z = cutEndZ
      }
    }
    console.log(`[replaceSegmentWithHop] Adding after segment`, {
      afterSegment: { start: afterSegment.start, end: afterSegment.end, type: afterSegment.type },
      currentStart: { x: currentStart.x, y: currentStart.y, z: currentStart.z },
      hasPassedEnd,
      distanceToEnd,
      startsMatch: isHorizontal
        ? Math.abs(afterSegment.start.x - currentStart.x) < TOLERANCE
        : Math.abs(afterSegment.start.z - currentStart.z) < TOLERANCE,
    })
    result.push(afterSegment)
    }
  }

  console.log(`[replaceSegmentWithHop] Final result`, {
    originalSegment: {
      start: { x: segment.start.x, y: segment.start.y, z: segment.start.z },
      end: { x: segment.end.x, y: segment.end.y, z: segment.end.z },
      type: segment.type
    },
    resultSegments: result.map((s) => ({
      start: { x: s.start.x, y: s.start.y, z: s.start.z },
      end: { x: s.end.x, y: s.end.y, z: s.end.z },
      type: s.type,
      isArc: s.type === 'arc',
    })),
    resultCount: result.length,
    // Verify segments connect properly
    segmentsConnect: result.length > 1 ? result.slice(0, -1).every((seg, i) => {
      const next = result[i + 1]
      const dx = Math.abs(seg.end.x - next.start.x)
      const dz = Math.abs(seg.end.z - next.start.z)
      return dx < TOLERANCE && dz < TOLERANCE
    }) : true,
  })

  // Verify the original segment is not in the result
  const originalSegmentInResult = result.some(
    (s) =>
      Math.abs(s.start.x - segment.start.x) < TOLERANCE &&
      Math.abs(s.start.z - segment.start.z) < TOLERANCE &&
      Math.abs(s.end.x - segment.end.x) < TOLERANCE &&
      Math.abs(s.end.z - segment.end.z) < TOLERANCE &&
      s.type === segment.type &&
      s.type !== 'arc'
  )

  if (originalSegmentInResult) {
    console.error(`[replaceSegmentWithHop] ERROR: Original segment found in result!`, {
      originalSegment: { start: segment.start, end: segment.end, type: segment.type },
      resultSegments: result,
    })
  }

  // Verify that the cut region (cutStart to cutEnd) is covered by the arc, not by before/after segments
  // Check for actual overlaps (not just touching at endpoints)
  // NOTE: "before" and "after" segments should touch the arc at endpoints - this is correct behavior
  const arcSegments = result.filter((s) => s.type === 'arc')
  const nonArcSegments = result.filter((s) => s.type !== 'arc')

  for (const arc of arcSegments) {
    // Check if any non-arc segment overlaps with the arc's region
    for (const seg of nonArcSegments) {
      // Skip overlap check if this is a legitimate before/after segment that should touch the arc
      // Before segments should end at arc.start, after segments should start at arc.end
      const segIsHorizontal = Math.abs(seg.start.z - seg.end.z) < TOLERANCE
      const arcIsHorizontal = Math.abs(arc.start.z - arc.end.z) < TOLERANCE

      // Only check overlap if segments are on the same line (same orientation)
      if (segIsHorizontal !== arcIsHorizontal) {
        continue // Different orientations, can't overlap
      }

      // Check if this is a before/after segment, but also verify it doesn't extend into arc region
      const segMinX = Math.min(seg.start.x, seg.end.x)
      const segMaxX = Math.max(seg.start.x, seg.end.x)
      const segMinZ = Math.min(seg.start.z, seg.end.z)
      const segMaxZ = Math.max(seg.start.z, seg.end.z)
      const arcMinX = Math.min(arc.start.x, arc.end.x)
      const arcMaxX = Math.max(arc.start.x, arc.end.x)
      const arcMinZ = Math.min(arc.start.z, arc.end.z)
      const arcMaxZ = Math.max(arc.start.z, arc.end.z)

      if (segIsHorizontal) {
        // Horizontal segment
        // Check if this is a before segment: ends at arc start
        const beforeSegmentEndsAtArcStart = Math.abs(seg.end.x - arc.start.x) < TOLERANCE &&
                                            Math.abs(seg.end.z - arc.start.z) < TOLERANCE &&
                                            Math.abs(seg.start.z - arc.start.z) < TOLERANCE
        // Check if this is an after segment: starts at arc end
        const afterSegmentStartsAtArcEnd = Math.abs(seg.start.x - arc.end.x) < TOLERANCE &&
                                          Math.abs(seg.start.z - arc.end.z) < TOLERANCE &&
                                          Math.abs(seg.end.z - arc.end.z) < TOLERANCE

        if (beforeSegmentEndsAtArcStart) {
          // Before segment should end exactly at arc start - verify it doesn't extend beyond
          // Use a stricter check: segment end should be <= arc start (with tolerance)
          if (segMaxX > arcMinX + TOLERANCE) {
            // Segment extends into arc region - trim it
            seg.end.x = arc.start.x
            seg.end.y = arc.start.y
            seg.end.z = arc.start.z
            console.warn(`[replaceSegmentWithHop] Fixed: Before segment extended into arc region, trimmed to arc start`, {
              originalEnd: { x: seg.end.x, z: seg.end.z },
              newEnd: { x: arc.start.x, z: arc.start.z },
              segMaxX,
              arcMinX,
            })
          } else {
            // Legitimate before segment - skip overlap check
            continue
          }
        } else if (afterSegmentStartsAtArcEnd) {
          // After segment should start exactly at arc end - verify it doesn't extend before
          // Use a stricter check: segment start should be >= arc end (with tolerance)
          if (segMinX < arcMaxX - TOLERANCE) {
            // Segment extends into arc region - trim it
            seg.start.x = arc.end.x
            seg.start.y = arc.end.y
            seg.start.z = arc.end.z
            console.warn(`[replaceSegmentWithHop] Fixed: After segment extended into arc region, trimmed to arc end`, {
              originalStart: { x: seg.start.x, z: seg.start.z },
              newStart: { x: arc.end.x, z: arc.end.z },
              segMinX,
              arcMaxX,
            })
          } else {
            // Legitimate after segment - skip overlap check
            continue
          }
        }
      } else {
        // Vertical segment
        // Determine direction for both segment and arc
        const segIsIncreasing = seg.start.z < seg.end.z
        const arcIsIncreasing = arc.start.z < arc.end.z

        // Check if this is a before segment: ends at arc start
        // For vertical segments, we need to check direction matches
        const beforeSegmentEndsAtArcStart = Math.abs(seg.end.z - arc.start.z) < TOLERANCE &&
                                            Math.abs(seg.end.x - arc.start.x) < TOLERANCE &&
                                            Math.abs(seg.start.x - arc.start.x) < TOLERANCE &&
                                            segIsIncreasing === arcIsIncreasing
        // Check if this is an after segment: starts at arc end
        const afterSegmentStartsAtArcEnd = Math.abs(seg.start.z - arc.end.z) < TOLERANCE &&
                                          Math.abs(seg.start.x - arc.end.x) < TOLERANCE &&
                                          Math.abs(seg.end.x - arc.end.x) < TOLERANCE &&
                                          segIsIncreasing === arcIsIncreasing

        if (beforeSegmentEndsAtArcStart) {
          // Before segment should end exactly at arc start - verify it doesn't extend beyond
          // Use direction-aware check
          const extendsBeyond = segIsIncreasing
            ? segMaxZ > arcMinZ + TOLERANCE
            : segMinZ < arcMaxZ - TOLERANCE

          if (extendsBeyond) {
            // Segment extends into arc region - trim it
            seg.end.z = arc.start.z
            seg.end.y = arc.start.y
            seg.end.x = arc.start.x
            console.warn(`[replaceSegmentWithHop] Fixed: Before segment extended into arc region, trimmed to arc start`, {
              originalEnd: { x: seg.end.x, z: seg.end.z },
              newEnd: { x: arc.start.x, z: arc.start.z },
              segMaxZ,
              arcMinZ,
              segIsIncreasing,
              arcIsIncreasing,
            })
          } else {
            // Legitimate before segment - skip overlap check
            continue
          }
        } else if (afterSegmentStartsAtArcEnd) {
          // After segment should start exactly at arc end - verify it doesn't extend before
          // Use direction-aware check
          const extendsBefore = segIsIncreasing
            ? segMinZ < arcMaxZ - TOLERANCE
            : segMaxZ > arcMinZ + TOLERANCE

          if (extendsBefore) {
            // Segment extends into arc region - trim it
            seg.start.z = arc.end.z
            seg.start.y = arc.end.y
            seg.start.x = arc.end.x
            console.warn(`[replaceSegmentWithHop] Fixed: After segment extended into arc region, trimmed to arc end`, {
              originalStart: { x: seg.start.x, z: seg.start.z },
              newStart: { x: arc.end.x, z: arc.end.z },
              segMinZ,
              arcMaxZ,
              segIsIncreasing,
              arcIsIncreasing,
            })
          } else {
            // Legitimate after segment - skip overlap check
            continue
          }
        }
      }

      const isHorizontal = segIsHorizontal
      if (isHorizontal) {
        // Horizontal segment - check if it overlaps with arc's x range
        const segMinX = Math.min(seg.start.x, seg.end.x)
        const segMaxX = Math.max(seg.start.x, seg.end.x)
        const arcMinX = Math.min(arc.start.x, arc.end.x)
        const arcMaxX = Math.max(arc.start.x, arc.end.x)

        // Check if segments are on the same line
        if (Math.abs(seg.start.z - arc.start.z) < TOLERANCE) {
          // Check for actual overlap (not just touching at endpoints)
          // Overlap means the segments share some interior points, not just endpoints
          // A segment touches the arc if:
          // - "before" segment: segMaxX == arcMinX (segment ends at arc start)
          // - "after" segment: segMinX == arcMaxX (segment starts at arc end)
          const segEndsAtArcStart = Math.abs(segMaxX - arcMinX) < TOLERANCE
          const segStartsAtArcEnd = Math.abs(segMinX - arcMaxX) < TOLERANCE

          // Only flag as overlap if there's actual interior overlap, not just endpoint touches
          // Interior overlap means the segment extends into the arc's region beyond just touching
          const hasInteriorOverlap = (segMinX < arcMinX && segMaxX > arcMinX + TOLERANCE) ||
                                     (segMinX < arcMaxX - TOLERANCE && segMaxX > arcMaxX) ||
                                     (segMinX >= arcMinX + TOLERANCE && segMaxX <= arcMaxX - TOLERANCE)

          // Allow touching at endpoints (this is correct behavior)
          const isTouchingOnly = (segEndsAtArcStart && segMaxX <= arcMinX + TOLERANCE) ||
                                 (segStartsAtArcEnd && segMinX >= arcMaxX - TOLERANCE)

          if (hasInteriorOverlap && !isTouchingOnly) {
            console.error(`[replaceSegmentWithHop] ERROR: Non-arc segment overlaps with arc region!`, {
              segment: { start: seg.start, end: seg.end, type: seg.type },
              arc: { start: arc.start, end: arc.end },
              overlapRange: { seg: { min: segMinX, max: segMaxX }, arc: { min: arcMinX, max: arcMaxX } },
              segEndsAtArcStart,
              segStartsAtArcEnd,
              hasInteriorOverlap,
              isTouchingOnly,
            })

            // Fix: Clamp the segment to not overlap with arc region
            // If segment extends into arc region, trim it
            if (segMinX < arcMinX && segMaxX > arcMinX + TOLERANCE) {
              // Segment starts before arc and extends into it - trim to arc start
              const newEndX = arcMinX
              const newLength = Math.abs(newEndX - seg.start.x)
              if (newLength > TOLERANCE) {
                seg.end.x = newEndX
                seg.end.y = arc.start.y
                seg.end.z = arc.start.z
                console.log(`[replaceSegmentWithHop] Fixed: Trimmed segment end to arc start`, {
                  originalEnd: { x: seg.end.x, z: seg.end.z },
                  newEnd: { x: newEndX, z: arc.start.z },
                  newLength,
                })
              } else {
                // Segment would be too short after trimming - remove it
                const index = result.indexOf(seg)
                if (index >= 0) {
                  result.splice(index, 1)
                  console.log(`[replaceSegmentWithHop] Fixed: Removed segment (would be too short after trimming)`, {
                    removedSegment: seg,
                  })
                }
              }
            } else if (segMinX < arcMaxX - TOLERANCE && segMaxX > arcMaxX) {
              // Segment extends beyond arc end - trim to arc end
              const newStartX = arcMaxX
              const newLength = Math.abs(seg.end.x - newStartX)
              if (newLength > TOLERANCE) {
                seg.start.x = newStartX
                seg.start.y = arc.end.y
                seg.start.z = arc.end.z
                console.log(`[replaceSegmentWithHop] Fixed: Trimmed segment start to arc end`, {
                  originalStart: { x: seg.start.x, z: seg.start.z },
                  newStart: { x: newStartX, z: arc.end.z },
                  newLength,
                })
              } else {
                // Segment would be too short after trimming - remove it
                const index = result.indexOf(seg)
                if (index >= 0) {
                  result.splice(index, 1)
                  console.log(`[replaceSegmentWithHop] Fixed: Removed segment (would be too short after trimming)`, {
                    removedSegment: seg,
                  })
                }
              }
            } else if (segMinX >= arcMinX + TOLERANCE && segMaxX <= arcMaxX - TOLERANCE) {
              // Segment is completely within arc region - this shouldn't happen, remove it
              const index = result.indexOf(seg)
              if (index >= 0) {
                result.splice(index, 1)
                console.log(`[replaceSegmentWithHop] Fixed: Removed segment completely within arc region`, {
                  removedSegment: seg,
                })
              }
            }
          }
        }
      } else {
        // Vertical segment - check if it overlaps with arc's z range
        const segMinZ = Math.min(seg.start.z, seg.end.z)
        const segMaxZ = Math.max(seg.start.z, seg.end.z)
        const arcMinZ = Math.min(arc.start.z, arc.end.z)
        const arcMaxZ = Math.max(arc.start.z, arc.end.z)

        // Check if segments are on the same line
        if (Math.abs(seg.start.x - arc.start.x) < TOLERANCE) {
          // Check for actual overlap (not just touching at endpoints)
          // A segment touches the arc if:
          // - "before" segment: segMaxZ == arcMinZ (segment ends at arc start)
          // - "after" segment: segMinZ == arcMaxZ (segment starts at arc end)
          const segEndsAtArcStart = Math.abs(segMaxZ - arcMinZ) < TOLERANCE
          const segStartsAtArcEnd = Math.abs(segMinZ - arcMaxZ) < TOLERANCE

          // Only flag as overlap if there's actual interior overlap, not just endpoint touches
          // Interior overlap means the segment extends into the arc's region beyond just touching
          const hasInteriorOverlap = (segMinZ < arcMinZ && segMaxZ > arcMinZ + TOLERANCE) ||
                                     (segMinZ < arcMaxZ - TOLERANCE && segMaxZ > arcMaxZ) ||
                                     (segMinZ >= arcMinZ + TOLERANCE && segMaxZ <= arcMaxZ - TOLERANCE)

          // Allow touching at endpoints (this is correct behavior)
          const isTouchingOnly = (segEndsAtArcStart && segMaxZ <= arcMinZ + TOLERANCE) ||
                                 (segStartsAtArcEnd && segMinZ >= arcMaxZ - TOLERANCE)

          if (hasInteriorOverlap && !isTouchingOnly) {
            console.error(`[replaceSegmentWithHop] ERROR: Non-arc segment overlaps with arc region!`, {
              segment: { start: seg.start, end: seg.end, type: seg.type },
              arc: { start: arc.start, end: arc.end },
              overlapRange: { seg: { min: segMinZ, max: segMaxZ }, arc: { min: arcMinZ, max: arcMaxZ } },
              segEndsAtArcStart,
              segStartsAtArcEnd,
              hasInteriorOverlap,
              isTouchingOnly,
            })

            // Fix: Clamp the segment to not overlap with arc region
            // If segment extends into arc region, trim it
            if (segMinZ < arcMinZ && segMaxZ > arcMinZ + TOLERANCE) {
              // Segment starts before arc and extends into it - trim to arc start
              const newEndZ = arcMinZ
              const newLength = Math.abs(newEndZ - seg.start.z)
              if (newLength > TOLERANCE) {
                seg.end.z = newEndZ
                seg.end.y = arc.start.y
                seg.end.x = arc.start.x
                console.log(`[replaceSegmentWithHop] Fixed: Trimmed segment end to arc start`, {
                  originalEnd: { x: seg.end.x, z: seg.end.z },
                  newEnd: { x: arc.start.x, z: newEndZ },
                  newLength,
                })
              } else {
                // Segment would be too short after trimming - remove it
                const index = result.indexOf(seg)
                if (index >= 0) {
                  result.splice(index, 1)
                  console.log(`[replaceSegmentWithHop] Fixed: Removed segment (would be too short after trimming)`, {
                    removedSegment: seg,
                  })
                }
              }
            } else if (segMinZ < arcMaxZ - TOLERANCE && segMaxZ > arcMaxZ) {
              // Segment extends beyond arc end - trim to arc end
              const newStartZ = arcMaxZ
              const newLength = Math.abs(seg.end.z - newStartZ)
              if (newLength > TOLERANCE) {
                seg.start.z = newStartZ
                seg.start.y = arc.end.y
                seg.start.x = arc.end.x
                console.log(`[replaceSegmentWithHop] Fixed: Trimmed segment start to arc end`, {
                  originalStart: { x: seg.start.x, z: seg.start.z },
                  newStart: { x: arc.end.x, z: newStartZ },
                  newLength,
                })
              } else {
                // Segment would be too short after trimming - remove it
                const index = result.indexOf(seg)
                if (index >= 0) {
                  result.splice(index, 1)
                  console.log(`[replaceSegmentWithHop] Fixed: Removed segment (would be too short after trimming)`, {
                    removedSegment: seg,
                  })
                }
              }
            } else if (segMinZ >= arcMinZ + TOLERANCE && segMaxZ <= arcMaxZ - TOLERANCE) {
              // Segment is completely within arc region - this shouldn't happen, remove it
              const index = result.indexOf(seg)
              if (index >= 0) {
                result.splice(index, 1)
                console.log(`[replaceSegmentWithHop] Fixed: Removed segment completely within arc region`, {
                  removedSegment: seg,
                })
              }
            }
          }
        }
      }
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
  })

  return result
}

