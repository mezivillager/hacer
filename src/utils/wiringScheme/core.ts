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

/**
 * Check if a segment is a routing segment (horizontal or vertical).
 * Entry and exit segments are not routing segments.
 * 
 * @param segment - Segment to check
 * @returns True if segment is horizontal or vertical
 */
function isRoutingSegment(segment: WireSegment): boolean {
  return segment.type === 'horizontal' || segment.type === 'vertical'
}

/**
 * Check if two segments are of the same routing type.
 * 
 * @param seg1 - First segment
 * @param seg2 - Second segment
 * @returns True if both are horizontal or both are vertical
 */
function areSameRoutingType(seg1: WireSegment, seg2: WireSegment): boolean {
  // Both must be routing segments
  if (!isRoutingSegment(seg1) || !isRoutingSegment(seg2)) {
    return false
  }
  
  // Check if both are horizontal or both are vertical
  const seg1IsHorizontal = seg1.type === 'horizontal' || Math.abs(seg1.start.z - seg1.end.z) < TOLERANCE
  const seg2IsHorizontal = seg2.type === 'horizontal' || Math.abs(seg2.start.z - seg2.end.z) < TOLERANCE
  
  return seg1IsHorizontal === seg2IsHorizontal
}

/**
 * Combine adjacent segments of the same type (horizontal or vertical) into single segments.
 * This removes backtracking and overlapping segments by creating combined segments from
 * the start of the first segment to the end of the last segment.
 * 
 * Entry and exit segments are preserved as-is and never combined.
 * 
 * @param segments - Array of wire segments
 * @returns Array of combined segments
 * 
 * @internal Exported for testing only
 */
export function combineAdjacentSegments(segments: WireSegment[]): WireSegment[] {
  if (segments.length === 0) {
    return []
  }
  
  if (segments.length === 1) {
    return [...segments]
  }
  
  const result: WireSegment[] = []
  let currentGroup: WireSegment[] = [segments[0]]
  
  for (let i = 1; i < segments.length; i++) {
    const currentSegment = segments[i]
    const lastGroupSegment = currentGroup[currentGroup.length - 1]
    
    // Check if we can combine: same routing type (routing algorithm ensures segments are adjacent)
    if (areSameRoutingType(lastGroupSegment, currentSegment)) {
      // Add to current group for combination
      currentGroup.push(currentSegment)
    } else {
      // Cannot combine - finalize current group and start new one
      if (currentGroup.length > 1) {
        // Combine the group: from first start to last end
        const firstSegment = currentGroup[0]
        const lastSegment = currentGroup[currentGroup.length - 1]
        
        result.push({
          start: firstSegment.start,
          end: lastSegment.end,
          type: firstSegment.type, // Preserve type (horizontal or vertical)
        })
      } else {
        // Single segment - add as-is
        result.push(currentGroup[0])
      }
      
      // Start new group with current segment
      currentGroup = [currentSegment]
    }
  }
  
  // Finalize the last group
  if (currentGroup.length > 1) {
    // Combine the group: from first start to last end
    const firstSegment = currentGroup[0]
    const lastSegment = currentGroup[currentGroup.length - 1]
    
    result.push({
      start: firstSegment.start,
      end: lastSegment.end,
      type: firstSegment.type, // Preserve type (horizontal or vertical)
    })
  } else {
    // Single segment - add as-is
    result.push(currentGroup[0])
  }
  
  return result
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

/**
 * Options for calculating wire path from wire connection information.
 */
export interface CalculateWirePathFromConnectionOptions {
  /** Array of all gate instances in the circuit */
  gates: GateInstance[]
  /** Function to get pin world position */
  getPinWorldPosition: (gateId: string, pinId: string) => Position | null
  /** Function to get pin orientation */
  getPinOrientation: (gateId: string, pinId: string) => { x: number; y: number; z: number } | null
  /** Existing wire segments to avoid overlapping with */
  existingSegments?: WireSegment[]
}

/**
 * Calculate wire path from wire connection information (gate IDs and pin IDs).
 * Handles determining output/input pins, getting positions/orientations, and calling calculateWirePath.
 * 
 * @param fromGateId - Source gate ID
 * @param fromPinId - Source pin ID
 * @param toGateId - Destination gate ID
 * @param toPinId - Destination pin ID
 * @param options - Options including gates, pin helpers, and existing segments
 * @returns Complete wire path, or null if pins/gates not found or positions unavailable
 * @throws Error if path calculation fails
 */
export function calculateWirePathFromConnection(
  fromGateId: string,
  fromPinId: string,
  toGateId: string,
  toPinId: string,
  options: CalculateWirePathFromConnectionOptions
): WirePath | null {
  const { gates, getPinWorldPosition, getPinOrientation, existingSegments = [] } = options

  // Find gates
  const fromGate = gates.find((g) => g.id === fromGateId)
  const toGate = gates.find((g) => g.id === toGateId)

  if (!fromGate || !toGate) {
    return null
  }

  // Find pins
  const fromPin = fromGate.outputs.find((p) => p.id === fromPinId) || fromGate.inputs.find((p) => p.id === fromPinId)
  const toPin = toGate.outputs.find((p) => p.id === toPinId) || toGate.inputs.find((p) => p.id === toPinId)

  if (!fromPin || !toPin) {
    return null
  }

  // Determine output and input pins (wires are always output -> input)
  const isFromOutput = fromPin.type === 'output'
  const outputGateId = isFromOutput ? fromGateId : toGateId
  const outputPinId = isFromOutput ? fromPinId : toPinId
  const inputGateId = isFromOutput ? toGateId : fromGateId
  const inputPinId = isFromOutput ? toPinId : fromPinId

  // Get pin positions and orientations
  const outputPinPos = getPinWorldPosition(outputGateId, outputPinId)
  const inputPinPos = getPinWorldPosition(inputGateId, inputPinId)
  const outputPinOrientation = getPinOrientation(outputGateId, outputPinId)
  const inputPinOrientation = getPinOrientation(inputGateId, inputPinId)

  if (!outputPinPos || !inputPinPos || !outputPinOrientation || !inputPinOrientation) {
    return null
  }

  // Construct destination
  const destination: DestinationType = {
    type: 'pin',
    pin: inputPinPos,
    orientation: { direction: inputPinOrientation },
  }

  // Calculate path
  return calculateWirePath(
    outputPinPos,
    destination,
    { direction: outputPinOrientation },
    gates,
    {
      sourceGateId: outputGateId,
      destinationGateId: inputGateId,
      existingSegments,
    }
  )
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

