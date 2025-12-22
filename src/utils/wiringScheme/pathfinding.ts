/**
 * Simple Greedy Pathfinding Along Section Lines
 * 
 * Routes wires along section lines (every 4.0 units) using a greedy algorithm.
 * At each step, moves to the nearest section corner that reduces distance to destination.
 */

import type { Position, WireSegment } from './types'
import { SECTION_SIZE, WIRE_HEIGHT } from './types'

/**
 * Calculate distance between two positions (Manhattan distance for pathfinding).
 * 
 * @param a - First position
 * @param b - Second position
 * @returns Manhattan distance
 */
function manhattanDistance(a: Position, b: Position): number {
  return Math.abs(a.x - b.x) + Math.abs(a.z - b.z)
}

/**
 * Check if a position is on a section line.
 * 
 * @param pos - Position to check
 * @param axis - Axis to check ('x' for vertical section lines, 'z' for horizontal)
 * @returns True if position is on a section line along the given axis
 * 
 * @internal Exported for testing only
 */
export function isOnSectionLine(pos: Position, axis: 'x' | 'z'): boolean {
  const coord = axis === 'x' ? pos.x : pos.z
  const snapped = Math.round(coord / SECTION_SIZE) * SECTION_SIZE
  return Math.abs(coord - snapped) < 0.001
}

/**
 * Get section corners reachable from current position.
 * 
 * Rules:
 * - If position is NOT at a section corner: return only 2 corners (the two ends of the section line)
 * - If position IS at a section corner: return 4 corners (one SECTION_SIZE away in each direction)
 * 
 * @param pos - Current position (must be on a section line)
 * @returns Array of reachable section corners
 * 
 * @internal Exported for testing only
 */
export function getReachableCorners(pos: Position): Position[] {
  const corners: Position[] = []
  
  // Determine which section lines the position is on
  const onVerticalLine = isOnSectionLine(pos, 'x')
  const onHorizontalLine = isOnSectionLine(pos, 'z')
  
  if (onVerticalLine && onHorizontalLine) {
    // Position is at a section corner intersection - can move in 4 directions
    // Each corner is exactly SECTION_SIZE away from the intersection
    const sectionX = Math.round(pos.x / SECTION_SIZE) * SECTION_SIZE
    const sectionZ = Math.round(pos.z / SECTION_SIZE) * SECTION_SIZE
    
    corners.push(
      { x: sectionX + SECTION_SIZE, y: WIRE_HEIGHT, z: sectionZ }, // Right
      { x: sectionX - SECTION_SIZE, y: WIRE_HEIGHT, z: sectionZ }, // Left
      { x: sectionX, y: WIRE_HEIGHT, z: sectionZ + SECTION_SIZE }, // Forward (Z+)
      { x: sectionX, y: WIRE_HEIGHT, z: sectionZ - SECTION_SIZE }  // Back (Z-)
    )
  } else if (onVerticalLine) {
    // On vertical section line but NOT at a corner - return only 2 corners
    // The two nearest section corners along this vertical line
    // 
    // Example: Position at (x=0, z=6) on vertical line x=0
    // - Lower section line: floor(6/4)*4 = 1*4 = 4
    // - Upper section line: ceil(6/4)*4 = 2*4 = 8
    // - Nearest corners: z=4 (distance 2) and z=8 (distance 2)
    const sectionX = Math.round(pos.x / SECTION_SIZE) * SECTION_SIZE
    const currentZ = pos.z
    
    // Find the two section lines that bracket the current position
    // Lower section line (floor division)
    const lowerSectionZ = Math.floor(currentZ / SECTION_SIZE) * SECTION_SIZE
    // Upper section line (ceiling division)
    const upperSectionZ = Math.ceil(currentZ / SECTION_SIZE) * SECTION_SIZE
    
    // Return the two nearest corners (at the section lines above and below)
    corners.push(
      { x: sectionX, y: WIRE_HEIGHT, z: upperSectionZ }, // Forward/upward corner
      { x: sectionX, y: WIRE_HEIGHT, z: lowerSectionZ }  // Back/downward corner
    )
  } else if (onHorizontalLine) {
    // On horizontal section line but NOT at a corner - return only 2 corners
    // The two nearest section corners along this horizontal line
    // 
    // Example: Position at (x=6, z=0) on horizontal line z=0
    // - Left section line: floor(6/4)*4 = 1*4 = 4
    // - Right section line: ceil(6/4)*4 = 2*4 = 8
    // - Nearest corners: x=4 (distance 2) and x=8 (distance 2)
    const currentX = pos.x
    const sectionZ = Math.round(pos.z / SECTION_SIZE) * SECTION_SIZE
    
    // Find the two section lines that bracket the current position
    // Left section line (floor division)
    const leftSectionX = Math.floor(currentX / SECTION_SIZE) * SECTION_SIZE
    // Right section line (ceiling division)
    const rightSectionX = Math.ceil(currentX / SECTION_SIZE) * SECTION_SIZE
    
    // Return the two nearest corners (at the section lines to the left and right)
    corners.push(
      { x: rightSectionX, y: WIRE_HEIGHT, z: sectionZ }, // Right corner
      { x: leftSectionX, y: WIRE_HEIGHT, z: sectionZ }   // Left corner
    )
  }
  
  return corners
}

/**
 * Snap a position to the nearest section line.
 * 
 * If the position is not on a section line, snaps it to the nearest one.
 * Prefers horizontal lines if distances are equal.
 * 
 * @param pos - Position to snap
 * @returns Position snapped to nearest section line (with y set to WIRE_HEIGHT)
 * 
 * @internal Exported for testing only
 */
export function snapToNearestSectionLine(pos: Position): Position {
  // If already on a section line, return as-is (with correct y)
  if (isOnSectionLine(pos, 'x') || isOnSectionLine(pos, 'z')) {
    return { ...pos, y: WIRE_HEIGHT }
  }
  
  // Find nearest section lines
  const nearestX = Math.round(pos.x / SECTION_SIZE) * SECTION_SIZE
  const nearestZ = Math.round(pos.z / SECTION_SIZE) * SECTION_SIZE
  
  // Snap to nearest section line (prefer horizontal if equal distance)
  const distToVertical = Math.abs(pos.x - nearestX)
  const distToHorizontal = Math.abs(pos.z - nearestZ)
  
  if (distToHorizontal <= distToVertical) {
    return { x: pos.x, y: WIRE_HEIGHT, z: nearestZ }
  } else {
    return { x: nearestX, y: WIRE_HEIGHT, z: pos.z }
  }
}

/**
 * Check if we can reach the destination directly along the current section line
 * without going past it to a corner.
 * 
 * Current position is always on a section line (exit segment end or corner).
 * We can reach directly if:
 * 1. Destination is on the same section line
 * 2. Distance is less than one section cell length (SECTION_SIZE)
 * 
 * @param current - Current position (on a section line)
 * @param end - Destination position
 * @returns True if destination is reachable directly without overshooting
 * 
 * @internal Exported for testing only
 */
export function checkCanReachDirectly(current: Position, end: Position): boolean {
  // Check if destination is on the same vertical line (same X coordinate)
  // This works whether or not the X coordinate is on a section line
  if (Math.abs(current.x - end.x) < 0.001) {
    const distance = Math.abs(end.z - current.z)
    // Allow distance up to and including SECTION_SIZE (exactly one section cell length)
    return distance <= SECTION_SIZE + 0.001
  }
  
  // Check if destination is on the same horizontal line (same Z coordinate)
  // This works whether or not the Z coordinate is on a section line
  if (Math.abs(current.z - end.z) < 0.001) {
    const distance = Math.abs(end.x - current.x)
    // Allow distance up to and including SECTION_SIZE (exactly one section cell length)
    return distance <= SECTION_SIZE + 0.001
  }
  
  // Not on same line - cannot reach directly
  return false
}

/**
 * Create a wire segment between two positions.
 * Segment type is determined by whether movement is horizontal or vertical.
 * 
 * @param start - Start position
 * @param end - End position
 * @returns Wire segment
 */
function createSegment(start: Position, end: Position): WireSegment {
  const isHorizontal = Math.abs(start.z - end.z) < 0.001
  
  return {
    start,
    end,
    type: isHorizontal ? 'horizontal' : 'vertical',
  }
}

/**
 * Find path along section lines from start to end using greedy algorithm.
 * 
 * @param start - Start position (must be on a section line)
 * @param end - End position (destination)
 * @returns Array of segments forming the path
 * @throws Error if pathfinding fails (cannot make progress or exceeds max iterations)
 */
export function findPathAlongSectionLines(start: Position, end: Position): WireSegment[] {
  const path: WireSegment[] = []
  let current: Position = { ...start }
  const maxIterations = 1000
  let iteration = 0
  
  // Verify start is on a section line
  if (!isOnSectionLine(start, 'x') && !isOnSectionLine(start, 'z')) {
    throw new Error(
      `Pathfinding failed: start position is not on a section line. Start: ${JSON.stringify(start)}, End: ${JSON.stringify(end)}`
    )
  }
  
  // Ensure end is on a section line - if not, snap it to the nearest
  const routingEnd = snapToNearestSectionLine(end)
  
  // If start and end are the same or very close, return empty path
  const initialDistance = manhattanDistance(current, routingEnd)
  if (initialDistance < 0.001) {
    return []
  }
  
  while (manhattanDistance(current, routingEnd) > 0.001) {
    iteration++
    if (iteration > maxIterations) {
      throw new Error(
        `Pathfinding failed: exceeded maximum iterations (${maxIterations}). ` +
        `The pathfinding algorithm could not find a valid route within the iteration limit. ` +
        `This may indicate an issue with the routing configuration or an unreachable destination. ` +
        `Start: ${JSON.stringify(start)}, End: ${JSON.stringify(end)}, ` +
        `Current: ${JSON.stringify(current)}, Iterations: ${iteration}`
      )
    }
    
    const currentDistance = manhattanDistance(current, routingEnd)
    
    // Check if we can reach destination directly along current section line
    // (without going past it to reach a corner)
    const canReachDirectly = checkCanReachDirectly(current, routingEnd)
    
    if (canReachDirectly) {
      // Destination is on the same section line and closer than any corner
      // Move directly to destination
      const directSegment = createSegment(current, routingEnd)
      path.push(directSegment)
      break
    }
    
    // Destination is beyond - need to move to next corner
    // Get reachable section corners
    const corners = getReachableCorners(current)
    
    if (corners.length === 0) {
      throw new Error(
        `Pathfinding failed: no reachable corners from current position. ` +
        `The algorithm cannot find any valid routing corners to continue the path. ` +
        `This may indicate the current position is invalid or the routing grid is misconfigured. ` +
        `Start: ${JSON.stringify(start)}, End: ${JSON.stringify(end)}, ` +
        `Current: ${JSON.stringify(current)}, RoutingEnd: ${JSON.stringify(routingEnd)}`
      )
    }
    
    // Filter corners that reduce distance to routingEnd
    const closerCorners = corners.filter(corner => {
      const cornerDistance = manhattanDistance(corner, routingEnd)
      return cornerDistance < currentDistance - 0.001 // Allow small epsilon for floating point
    })
    
    if (closerCorners.length === 0) {
      // Cannot make progress with corners - this should not happen with section line routing
      // All cases should be handled by checkCanReachDirectly (for direct paths) or
      // getReachableCorners (for paths through corners)
      throw new Error(
        `Pathfinding failed: no progress possible toward destination. ` +
        `The algorithm cannot find any routing corners that reduce the distance to the destination. ` +
        `This may indicate the destination is unreachable or there is a routing conflict. ` +
        `Start: ${JSON.stringify(start)}, End: ${JSON.stringify(end)}, ` +
        `Current: ${JSON.stringify(current)}, RoutingEnd: ${JSON.stringify(routingEnd)}, ` +
        `Reachable corners: ${JSON.stringify(corners)}, ` +
        `Current distance: ${currentDistance}`
      )
    }
    
    // Find nearest corner that gets us closer
    let nearestCorner = closerCorners[0]
    let nearestDistance = manhattanDistance(closerCorners[0], current)
    
    for (const corner of closerCorners) {
      const dist = manhattanDistance(corner, current)
      if (dist < nearestDistance) {
        nearestDistance = dist
        nearestCorner = corner
      }
    }
    
    // Create segment from current to nearest corner
    const segment = createSegment(current, nearestCorner)
    path.push(segment)
    current = nearestCorner
  }
  
  return path
}

