/**
 * Core Wire Path Calculation
 * 
 * Simplified wiring scheme that routes wires along section lines using greedy pathfinding.
 * Entry/exit segments extend from pin centers to nearest section lines.
 */

import type { Position, PinOrientation, DestinationType, WirePath, WirePathOptions, GateInstance } from './types'
import { WIRE_HEIGHT } from './types'
import { calculateExitSegment, calculateEntrySegment } from './segments'
import { findPathAlongSectionLines } from './pathfinding'
import { SECTION_SIZE } from './types'

/**
 * Snap cursor position to nearest point on one of the four surrounding section lines.
 * For cursor destinations, we route to the nearest point on a section line.
 * 
 * Section lines are at multiples of SECTION_SIZE (4.0 units).
 * We find the 4 surrounding section lines (north, south, east, west) and pick the closest one,
 * then project the cursor position onto that line.
 * 
 * @param cursorPos - Cursor world position
 * @param _exitSegmentEnd - End of exit segment (on a section line) - unused, kept for API compatibility
 * @returns Position on the nearest surrounding section line
 */
function snapCursorToSectionBoundary(cursorPos: Position, _exitSegmentEnd: Position): Position {
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
      routingEnd = snapCursorToSectionBoundary(destination.pos, exitSegment.end)
      // No entry segment for cursor destinations
    }
    
    // Step 4: Route from exit segment end to routing end using greedy algorithm
    const routingPath = findPathAlongSectionLines(exitSegment.end, routingEnd)
    
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

