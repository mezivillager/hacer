/**
 * Incremental Path Extension
 * 
 * Functions for extending existing wire paths incrementally to new destinations.
 * Used for interactive wire drawing where paths are built up step by step.
 */

import type { Position, DestinationType, WirePath, WirePathOptions, WireSegment } from './types'
import { SECTION_SIZE, WIRE_HEIGHT } from './types'
import { calculateEntrySegment, combineAdjacentSegments, calculateTotalLength } from './segments'
import { findPathAlongSectionLines } from './pathfinding'

const TOLERANCE = 0.001

/**
 * Snap cursor position to nearest point on one of the four surrounding section lines.
 * For cursor destinations, we route to the nearest point on a section line.
 * 
 * Section lines are at multiples of SECTION_SIZE (4.0 units).
 * We find the 4 surrounding section lines (north, south, east, west) and pick the closest one,
 * then project the cursor position onto that line.
 * 
 * @param cursorPos - Cursor world position
 * @returns Position on the nearest surrounding section line
 */
export function snapCursorToSectionBoundary(cursorPos: Position): Position {
  // Find the 4 surrounding section lines
  // Section lines are at multiples of SECTION_SIZE (4.0 units)
  
  // Calculate surrounding horizontal section lines (constant Z)
  const horizontalLineZBottom = Math.floor(cursorPos.z / SECTION_SIZE) * SECTION_SIZE
  const horizontalLineZTop = horizontalLineZBottom + SECTION_SIZE
  
  // Calculate surrounding vertical section lines (constant X)
  const verticalLineXLeft = Math.floor(cursorPos.x / SECTION_SIZE) * SECTION_SIZE
  const verticalLineXRight = verticalLineXLeft + SECTION_SIZE
  
  // Calculate orthogonal distances to each of the 4 lines
  const distToHorizontalBottom = Math.abs(cursorPos.z - horizontalLineZBottom)
  const distToHorizontalTop = Math.abs(cursorPos.z - horizontalLineZTop)
  const distToVerticalLeft = Math.abs(cursorPos.x - verticalLineXLeft)
  const distToVerticalRight = Math.abs(cursorPos.x - verticalLineXRight)
  
  // Find the closest line
  const minDist = Math.min(
    distToHorizontalBottom,
    distToHorizontalTop,
    distToVerticalLeft,
    distToVerticalRight
  )
  
  // Snap to the closest line and project cursor onto it
  let snappedPos: Position
  
  if (minDist === distToHorizontalBottom) {
    // Snap to bottom horizontal line - keep cursor's X, use line's Z
    snappedPos = {
      x: cursorPos.x,
      y: WIRE_HEIGHT,
      z: horizontalLineZBottom,
    }
  } else if (minDist === distToHorizontalTop) {
    // Snap to top horizontal line - keep cursor's X, use line's Z
    snappedPos = {
      x: cursorPos.x,
      y: WIRE_HEIGHT,
      z: horizontalLineZTop,
    }
  } else if (minDist === distToVerticalLeft) {
    // Snap to left vertical line - use line's X, keep cursor's Z
    snappedPos = {
      x: verticalLineXLeft,
      y: WIRE_HEIGHT,
      z: cursorPos.z,
    }
  } else {
    // Snap to right vertical line - use line's X, keep cursor's Z
    snappedPos = {
      x: verticalLineXRight,
      y: WIRE_HEIGHT,
      z: cursorPos.z,
    }
  }
  
  return snappedPos
}

/**
 * Calculate 2D distance in XZ plane (ignoring Y coordinate).
 * 
 * @param a - First position
 * @param b - Second position
 * @returns Euclidean distance in XZ plane
 */
function distance2D(a: Position, b: Position): number {
  const dx = b.x - a.x
  const dz = b.z - a.z
  return Math.sqrt(dx * dx + dz * dz)
}

/**
 * Check if path can be extended from last path end to new destination.
 * Validates distance and backtracking checks.
 * 
 * @param lastPathEnd - End position of the last calculated path
 * @param lastSegment - Last segment from the path
 * @param newDestination - New destination (cursor or pin)
 * @param options - Path calculation options (not used for overlap checks anymore)
 * @returns True if destination can be extended to (distance <= SECTION_SIZE and no backtracking)
 */
export function canExtendPath(
  lastPathEnd: Position,
  _lastSegment: WireSegment,
  newDestination: DestinationType,
  _options: WirePathOptions = {}
): boolean {
  let destinationPoint: Position
  
  if (newDestination.type === 'pin') {
    // For pin destinations, use entry segment start as the destination point
    const entrySegment = calculateEntrySegment(newDestination.pin, newDestination.orientation)
    destinationPoint = entrySegment.start
  } else {
    // For cursor destinations, snap to nearest section line
    destinationPoint = snapCursorToSectionBoundary(newDestination.pos)
  }
  
  // Check if distance between lastPathEnd and destinationPoint is <= SECTION_SIZE
  const distance = distance2D(lastPathEnd, destinationPoint)
  if (distance > 2 * SECTION_SIZE + TOLERANCE) {
    console.log('[ ⚠️ CAN_EXTEND_PATH] Distance too large - cannot extend', { distance, SECTION_SIZE, lastPathEnd, destinationPoint })
    return false // Distance exceeds SECTION_SIZE
  }
  
  // All checks passed - extension is valid
  return true
}

/**
 * Extend path from last path end to new destination.
 * Uses findPathAlongSectionLines to find the routing path.
 * Validation should be done by canExtendPath before calling this.
 * 
 * @param lastPath - Last calculated path
 * @param newDestination - New destination (cursor or pin)
 * @param options - Path calculation options (for existing segments)
 * @returns Extended path
 */
export function extendPathFromEnd(
  lastPath: WirePath,
  newDestination: DestinationType,
  options: WirePathOptions = {}
): WirePath {
  console.debug('[extendPathFromEnd] Extending path from end', {
    lastPath,
    newDestination,
    options,
  })
  if (lastPath.segments.length === 0) {
    throw new Error('Cannot extend empty path')
  }
  
  const lastSegment = lastPath.segments[lastPath.segments.length - 1]
  const lastPathEnd = lastSegment.end
  let routingPath: WireSegment[] = []
  let entrySegment: WireSegment | null = null
  
  if (newDestination.type === 'cursor') {
    // For cursor: find path along section lines to snapped destination
    const snappedDestination = snapCursorToSectionBoundary(newDestination.pos)
    const existingSegments = options.existingSegments || []
    routingPath = findPathAlongSectionLines(lastPathEnd, snappedDestination, existingSegments)
  } else {
    // For pin: calculate entry segment and trim last segment if needed
    entrySegment = calculateEntrySegment(newDestination.pin, newDestination.orientation)
    
    // Check if we need to trim last segment
    const lastSegmentNeedsTrimming = 
      Math.abs(lastPathEnd.x - entrySegment.start.x) > TOLERANCE ||
      Math.abs(lastPathEnd.z - entrySegment.start.z) > TOLERANCE
    
    if (lastSegmentNeedsTrimming) {
      lastSegment.end = entrySegment.start
      lastPath.segments[lastPath.segments.length - 1] = lastSegment
    }
  }

  console.debug('[extendPathFromEnd] Routing path', {
    routingPath,
  })
  
  // Concatenate lastPath.segments with routingPath
  const allSegments = [...lastPath.segments, ...routingPath]
  
  // Combine adjacent segments of the same type
  // This automatically removes backtracking and overlapping segments
  const combinedSegments = combineAdjacentSegments(allSegments)

  // Add entry segment at the end of the path
  if (entrySegment) {
    combinedSegments.push(entrySegment)
  }

  const totalLength = calculateTotalLength(combinedSegments)
  
  console.debug('[extendPathFromEnd] All segments', {
    combinedSegments
  })
  
  return {
    segments: combinedSegments,
    totalLength,
  }
}

