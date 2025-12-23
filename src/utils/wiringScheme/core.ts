/**
 * Core Wire Path Calculation
 * 
 * Simplified wiring scheme that routes wires along section lines using greedy pathfinding.
 * Entry/exit segments extend from pin centers to nearest section lines.
 */

import type { Position, PinOrientation, DestinationType, WirePath, WirePathOptions, GateInstance, WireSegment } from './types'
import { WIRE_HEIGHT } from './types'
import { calculateExitSegment, calculateEntrySegment } from './segments'
import { findPathAlongSectionLines } from './pathfinding'
import { SECTION_SIZE } from './types'
import { segmentsOverlap } from './overlap'


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
 * Calculate total length of all segments in a path.
 * 
 * @param segments - Array of wire segments
 * @returns Total length
 */
function calculateTotalLength(segments: Array<{ start: Position; end: Position }>): number {
  return segments.reduce((sum, seg) => {
    const dx = seg.end.x - seg.start.x
    const dy = seg.end.y - seg.start.y
    const dz = seg.end.z - seg.start.z
    return sum + Math.sqrt(dx * dx + dy * dy + dz * dz)
  }, 0)
}

const TOLERANCE = 0.001
const BACKTRACKING_TOLERANCE = 500 * TOLERANCE

/**
 * Trim overlapping portion from the end of a segment (for last path segment).
 * Removes the overlapping range from the end of the segment.
 * 
 * @param segment - Segment to trim from end
 * @param overlapStart - Start of overlapping range
 * @param overlapEnd - End of overlapping range
 * @param isHorizontal - Whether segment is horizontal (trim X) or vertical (trim Z)
 * @returns Trimmed segment, or null if entire segment is removed
 */
function trimSegmentFromEnd(
  segment: WireSegment,
  overlapStart: number,
  overlapEnd: number,
  isHorizontal: boolean
): WireSegment | null {
  const coord = isHorizontal ? 'x' : 'z'
  const segStart = segment.start[coord]
  const segEnd = segment.end[coord]
  
  // Normalize overlap range
  const overlapMin = Math.min(overlapStart, overlapEnd)
  const overlapMax = Math.max(overlapStart, overlapEnd)
  
  // Trim from end: keep the part before the overlap
  let newEnd: number
  if (segStart < segEnd) {
    // Segment goes in positive direction - trim end to overlap start
    newEnd = overlapMin
  } else {
    // Segment goes in negative direction - trim end to overlap max
    newEnd = overlapMax
  }
  
  // Check if trimmed segment has zero or negative length
  if (Math.abs(newEnd - segStart) < TOLERANCE) {
    return null
  }
  
  // Create trimmed segment
  const trimmed: WireSegment = {
    ...segment,
    end: { ...segment.end, [coord]: newEnd },
  }
  
  return trimmed
}

/**
 * Trim overlapping portion from the start of a segment (for first routing segment).
 * Removes the overlapping range from the start of the segment.
 * 
 * @param segment - Segment to trim from start
 * @param overlapStart - Start of overlapping range
 * @param overlapEnd - End of overlapping range
 * @param isHorizontal - Whether segment is horizontal (trim X) or vertical (trim Z)
 * @returns Trimmed segment, or null if entire segment is removed
 */
function trimSegmentFromStart(
  segment: WireSegment,
  overlapStart: number,
  overlapEnd: number,
  isHorizontal: boolean
): WireSegment | null {
  const coord = isHorizontal ? 'x' : 'z'
  const segStart = segment.start[coord]
  const segEnd = segment.end[coord]
  
  // Normalize overlap range
  const overlapMin = Math.min(overlapStart, overlapEnd)
  const overlapMax = Math.max(overlapStart, overlapEnd)
  
  // Trim from start: keep the part after the overlap
  let newStart: number
  if (segStart < segEnd) {
    // Segment goes in positive direction - trim start to overlap end
    newStart = overlapMax
  } else {
    // Segment goes in negative direction - trim start to overlap min
    newStart = overlapMin
  }
  
  // Check if trimmed segment has zero or negative length
  if (Math.abs(segEnd - newStart) < TOLERANCE) {
    return null
  }
  
  // Create trimmed segment
  const trimmed: WireSegment = {
    ...segment,
    start: { ...segment.start, [coord]: newStart },
  }
  
  return trimmed
}

/**
 * Calculate overlapping range between two segments on the same line.
 * 
 * @param seg1 - First segment
 * @param seg2 - Second segment
 * @param isHorizontal - Whether segments are horizontal (check X) or vertical (check Z)
 * @returns Object with overlap start and end, or null if no overlap
 */
function calculateOverlapRange(
  seg1: WireSegment,
  seg2: WireSegment,
  isHorizontal: boolean
): { start: number; end: number } | null {
  const coord = isHorizontal ? 'x' : 'z'
  const seg1Start = seg1.start[coord]
  const seg1End = seg1.end[coord]
  const seg2Start = seg2.start[coord]
  const seg2End = seg2.end[coord]
  
  const seg1Min = Math.min(seg1Start, seg1End)
  const seg1Max = Math.max(seg1Start, seg1End)
  const seg2Min = Math.min(seg2Start, seg2End)
  const seg2Max = Math.max(seg2Start, seg2End)
  
  // Calculate overlap range
  const overlapStart = Math.max(seg1Min, seg2Min)
  const overlapEnd = Math.min(seg1Max, seg2Max)
  
  // Check if there's actual overlap
  if (overlapEnd - overlapStart < TOLERANCE) {
    return null
  }
  
  return { start: overlapStart, end: overlapEnd }
}

/**
 * Remove overlapping portions from last path segment and first routing segment.
 * Specifically checks the last segment from lastPath and first segment from routingPath.
 * Trims the overlapping portion from both segments instead of removing them entirely.
 * 
 * @param lastPathSegments - Segments from the existing path
 * @param routingPath - Routing segments from findPathAlongSectionLines
 * @returns Object with trimmed path segments and routing segments
 */
function trimOverlappingSegments(
  lastPathSegments: WireSegment[],
  routingPath: WireSegment[]
): { trimmedPathSegments: WireSegment[], trimmedRoutingPath: WireSegment[] } {
  // Copy arrays to avoid mutating originals
  const trimmedPathSegments = [...lastPathSegments]
  const trimmedRoutingPath = [...routingPath]
  
  // Check if we have segments to compare
  if (trimmedPathSegments.length === 0 || trimmedRoutingPath.length === 0) {
    return { trimmedPathSegments, trimmedRoutingPath }
  }
  
  const lastPathSeg = trimmedPathSegments[trimmedPathSegments.length - 1]
  const firstRoutingSeg = trimmedRoutingPath[0]
  
  // Check if segments overlap using segmentsOverlap
  if (!segmentsOverlap(lastPathSeg, firstRoutingSeg)) {
    // No overlap - return as-is
    return { trimmedPathSegments, trimmedRoutingPath }
  }
  
  // Determine if segments are horizontal or vertical
  const isHorizontal = Math.abs(lastPathSeg.start.z - lastPathSeg.end.z) < TOLERANCE
  
  // Calculate overlapping range
  const overlapRange = calculateOverlapRange(lastPathSeg, firstRoutingSeg, isHorizontal)
  if (!overlapRange) {
    // No overlap range found - return as-is
    return { trimmedPathSegments, trimmedRoutingPath }
  }
  
  // Trim last path segment from its end (remove overlapping portion at end)
  const trimmedLastPathSeg = trimSegmentFromEnd(
    lastPathSeg,
    overlapRange.start,
    overlapRange.end,
    isHorizontal
  )
  
  // Trim first routing segment from its start (remove overlapping portion at start)
  const trimmedFirstRoutingSeg = trimSegmentFromStart(
    firstRoutingSeg,
    overlapRange.start,
    overlapRange.end,
    isHorizontal
  )
  
  // Replace segments with trimmed versions (or remove if null)
  if (trimmedLastPathSeg === null) {
    trimmedPathSegments.pop()
  } else {
    trimmedPathSegments[trimmedPathSegments.length - 1] = trimmedLastPathSeg
  }
  
  if (trimmedFirstRoutingSeg === null) {
    trimmedRoutingPath.shift()
  } else {
    trimmedRoutingPath[0] = trimmedFirstRoutingSeg
  }
  
  return { trimmedPathSegments, trimmedRoutingPath }
}

/**
 * Check if a position is on a section line along a specific axis.
 * 
 * @param pos - Position to check
 * @param axis - Axis to check ('x' for vertical section lines, 'z' for horizontal)
 * @returns True if position is on a section line along the given axis
 */
function isOnSectionLine(pos: Position, axis: 'x' | 'z'): boolean {
  const coord = axis === 'x' ? pos.x : pos.z
  const snapped = Math.round(coord / SECTION_SIZE) * SECTION_SIZE
  return Math.abs(coord - snapped) < TOLERANCE
}

/**
 * Check if two positions are on the same section line.
 * 
 * @param pos1 - First position
 * @param pos2 - Second position
 * @returns True if both positions are on the same section line (horizontal or vertical)
 * 
 * @internal Exported for testing only
 */
export function arePointsOnSameSectionLine(pos1: Position, pos2: Position): boolean {
  // Check if both are on the same horizontal line (same z coordinate, on a section line)
  const pos1OnHorizontal = isOnSectionLine(pos1, 'z')
  const pos2OnHorizontal = isOnSectionLine(pos2, 'z')
  
  if (pos1OnHorizontal && pos2OnHorizontal && Math.abs(pos1.z - pos2.z) < TOLERANCE) {
    return true // Both on same horizontal line
  }
  
  // Check if both are on the same vertical line (same x coordinate, on a section line)
  const pos1OnVertical = isOnSectionLine(pos1, 'x')
  const pos2OnVertical = isOnSectionLine(pos2, 'x')
  
  if (pos1OnVertical && pos2OnVertical && Math.abs(pos1.x - pos2.x) < TOLERANCE) {
    return true // Both on same vertical line
  }
  
  return false
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
 * Check if extending to destination would cause backtracking.
 * 
 * @param lastPathEnd - End position of the last calculated path
 * @param lastSegment - Last segment from the path
 * @param destinationPoint - Destination point to check
 * @returns True if backtracking would occur
 */
export function wouldBacktrack(
  lastPathEnd: Position,
  lastSegment: WireSegment,
  destinationPoint: Position
): boolean {
  const isLastHorizontal = lastSegment.type === 'horizontal'
  
  if (isLastHorizontal) {
    // Check if going backward on horizontal line
    const lastDir = lastSegment.end.x > lastSegment.start.x ? 1 : -1
    const deltaX = destinationPoint.x - lastPathEnd.x
    
    // Check if going backward (opposite direction)
    if (lastDir > 0 && deltaX < -BACKTRACKING_TOLERANCE) {
      return true // Going backwards (was going right, now going left)
    }
    if (lastDir < 0 && deltaX > BACKTRACKING_TOLERANCE) {
      return true // Going backwards (was going left, now going right)
    }
  } else {
    // Check if going backward on vertical line
    const lastDir = lastSegment.end.z > lastSegment.start.z ? 1 : -1
    const deltaZ = destinationPoint.z - lastPathEnd.z
    
    // Check if going backward (opposite direction)
    if (lastDir > 0 && deltaZ < -BACKTRACKING_TOLERANCE) {
      return true // Going backwards (was going forward, now going back)
    }
    if (lastDir < 0 && deltaZ > BACKTRACKING_TOLERANCE) {
      return true // Going backwards (was going back, now going forward)
    }
  }
  
  return false // No backtracking
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
  lastSegment: WireSegment,
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
  if (distance > SECTION_SIZE + TOLERANCE) {
    console.log('[CAN_EXTEND_PATH] Distance too large - cannot extend', { distance, SECTION_SIZE, lastPathEnd, destinationPoint })
    return false // Distance exceeds SECTION_SIZE
  }
  
  // Check if not going backward
  if (wouldBacktrack(lastPathEnd, lastSegment, destinationPoint)) {
    return false // Backtracking detected
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
  
  // Trim overlapping portions from last path segment and first routing segment
  // This prevents outlier segments that stick out from the main path
  const { trimmedPathSegments, trimmedRoutingPath } = trimOverlappingSegments(
    lastPath.segments,
    routingPath
  )
  
  // Build final extension segments: trimmed routing path + entry segment (if any)
  const extensionSegments: WireSegment[] = [...trimmedRoutingPath]
  
  // Combine trimmed path segments with extension segments
  const allSegments = [...trimmedPathSegments, ...extensionSegments]

  // Add entry segment at the end of the path
  if (entrySegment) {
    allSegments.push(entrySegment)
  }

  const totalLength = calculateTotalLength(allSegments)
  
  return {
    segments: allSegments,
    totalLength,
  }
}

/**
 * Calculate wire path from start pin to destination.
 * 
 * @param startPin - Start pin center position
 * @param destination - Destination (pin or cursor)
 * @param startOrientation - Start pin orientation
 * @param gates - Array of gates (for compatibility, not used in simplified scheme)
 * @param options - Path calculation options
 * @returns Complete wire path
 * @throws Error if path calculation fails at any step
 */
export function calculateWirePath(
  startPin: Position,
  destination: DestinationType,
  startOrientation: PinOrientation,
  gates: GateInstance[],
  options: WirePathOptions = {}
): WirePath {
  try {
    // Step 1: Calculate exit segment (pin center → section line)
    const exitSegment = calculateExitSegment(startPin, startOrientation)
    
    let entrySegment: ReturnType<typeof calculateEntrySegment> | null = null
    let routingEnd: Position
    
    if (destination.type === 'pin') {
      // Step 2: Calculate entry segment (section line → pin center)
      entrySegment = calculateEntrySegment(destination.pin, destination.orientation)
      routingEnd = entrySegment.start // Entry segment starts at section line
    } else {
      // Step 3: For cursor destination, snap to nearest section boundary
      routingEnd = snapCursorToSectionBoundary(destination.pos)
      // No entry segment for cursor destinations
    }
    
    // Step 4: Route from exit segment end to routing end using greedy algorithm
    const existingSegments = options.existingSegments || []
    const routingPath = findPathAlongSectionLines(exitSegment.end, routingEnd, existingSegments)
    
    // Step 5: Assemble complete path
    const allSegments = [exitSegment, ...routingPath]
    if (entrySegment) {
      allSegments.push(entrySegment)
    }
    
    const totalLength = calculateTotalLength(allSegments)
    
    return {
      segments: allSegments,
      totalLength,
    }
  } catch (error) {
    // Log diagnostic information
    const diagnosticInfo = {
      startPin,
      destination,
      startOrientation,
      gatesCount: gates.length,
      options,
    }
    
    console.error('[calculateWirePath] Path calculation failed:', error)
    console.error('[calculateWirePath] Diagnostic info:', JSON.stringify(diagnosticInfo, null, 2))
    
    // Re-throw with additional context
    throw new Error(
      `Wire path calculation failed: ${error instanceof Error ? error.message : String(error)}. ` +
      `See console for diagnostic information.`
    )
  }
}

