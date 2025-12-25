import type { Position, GateInstance, Wire } from '@/store/types'
import { calculateWirePath } from './wiringScheme'
import type { WireSegment as GridAlignedSegment } from './wiringScheme/types'

/**
 * Grid cell coordinates (row, col)
 * Same as GridPosition, kept as alias for compatibility
 */
export interface GridCell {
  row: number
  col: number
}

/**
 * Grid cell size in world units.
 * Gates snap to centers of 2.0-unit grid cells.
 */
export const GRID_SIZE = 2.0

/**
 * Minimum cells between gates (prevents adjacent placement).
 * A value of 1 means gates cannot be placed in the same cell or adjacent cells.
 */
export const MIN_GATE_SPACING = 1

/**
 * Grid position in row/column coordinates.
 * Row corresponds to Z-axis, column corresponds to X-axis.
 */
export interface GridPosition {
  row: number
  col: number
}

/**
 * Convert world coordinates to grid coordinates.
 * Uses Math.round() to snap to nearest grid cell.
 * 
 * @param worldPos - World position (x, y, z)
 * @returns Grid position (row, col) where row = z, col = x
 */
export function worldToGrid(worldPos: Position): GridPosition {
  // Normalize -0 to 0 to avoid negative zero issues
  const normalizeZero = (n: number): number => (n === 0 ? 0 : n)
  
  return {
    row: normalizeZero(Math.round(worldPos.z / GRID_SIZE)),
    col: normalizeZero(Math.round(worldPos.x / GRID_SIZE)),
  }
}

/**
 * Convert grid coordinates to world coordinates.
 * Gates are always placed on the ground plane (y = 0).
 * 
 * @param gridPos - Grid position (row, col)
 * @returns World position with y = 0
 */
export function gridToWorld(gridPos: GridPosition): Position {
  return {
    x: gridPos.col * GRID_SIZE,
    y: 0, // Gates always on ground plane
    z: gridPos.row * GRID_SIZE,
  }
}

/**
 * Snap a world position to the nearest grid center.
 * Preserves the Y coordinate from the input position.
 * 
 * @param worldPos - World position to snap
 * @returns Snapped world position at grid center (with original Y preserved)
 */
export function snapToGrid(worldPos: Position): Position {
  const snapped = gridToWorld(worldToGrid(worldPos))
  // Preserve Y coordinate so gates can be positioned above the grid
  return {
    ...snapped,
    y: worldPos.y,
  }
}

/**
 * Check if a gate can be placed at the given grid position.
 * Validates minimum spacing from all existing gates, prevents placement on section lines,
 * and checks for wires passing through the cell.
 * 
 * @param gridPos - Grid position to check
 * @param existingGates - Array of existing gate instances
 * @param excludeGateId - Optional gate ID to exclude from validation (useful for dragging)
 * @param wires - Optional array of wire instances to check for blocking
 * @param getPinWorldPosition - Optional function to get pin world positions (required if wires provided)
 * @param getPinOrientation - Optional function to get pin orientations (required if wires provided)
 * @returns true if placement is valid, false otherwise
 */
export function canPlaceGateAt(
  gridPos: GridPosition,
  existingGates: GateInstance[],
  excludeGateId?: string,
  wires?: Wire[],
  getPinWorldPosition?: (gateId: string, pinId: string) => Position | null,
  getPinOrientation?: (gateId: string, pinId: string) => { x: number; y: number; z: number } | null
): boolean {
  // Prevent placement on section lines
  // Section lines appear every GRID_SIZE * 2 units (4.0 units)
  // In grid coordinates, this means sections are every 2 cells
  // Section lines occur when either row OR col is even (0, 2, 4, 6, ...)
  // Section intersections occur when both row AND col are even
  // We allow placement only in the interior of sections (both row and col must be odd)
  const isOnSectionLine = (gridPos.row % 2 === 0) || (gridPos.col % 2 === 0)
  if (isOnSectionLine) {
    return false
  }

  // Check minimum spacing from all existing gates
  for (const gate of existingGates) {
    // Skip excluded gate (useful when dragging an existing gate)
    if (excludeGateId && gate.id === excludeGateId) {
      continue
    }

    const gateGrid = worldToGrid(gate.position)
    const rowDiff = Math.abs(gateGrid.row - gridPos.row)
    const colDiff = Math.abs(gateGrid.col - gridPos.col)

    // Cannot place in same cell or adjacent cells
    // MIN_GATE_SPACING = 1 means rowDiff and colDiff must both be > 1
    if (rowDiff <= MIN_GATE_SPACING && colDiff <= MIN_GATE_SPACING) {
      return false
    }
  }

  // Check for wires passing through the cell
  if (wires && getPinWorldPosition && getPinOrientation) {
    if (hasWiresInCell(gridPos, wires, existingGates, getPinWorldPosition, getPinOrientation)) {
      return false
    }
  }

  return true
}

/**
 * Check if a position is within a grid cell's bounds.
 * 
 * @param position - World position to check
 * @param cell - Grid cell (row, col)
 * @returns True if position is within cell bounds
 */
export function isPositionInCell(position: Position, cell: GridCell): boolean {
  const cellCenter = gridToWorld(cell)
  const cellMinX = cellCenter.x - GRID_SIZE / 2
  const cellMaxX = cellCenter.x + GRID_SIZE / 2
  const cellMinZ = cellCenter.z - GRID_SIZE / 2
  const cellMaxZ = cellCenter.z + GRID_SIZE / 2
  
  return (
    position.x >= cellMinX &&
    position.x <= cellMaxX &&
    position.z >= cellMinZ &&
    position.z <= cellMaxZ
  )
}

/**
 * Check if a wire segment intersects a grid cell.
 * 
 * @param segment - Wire segment to check
 * @param cell - Grid cell
 * @returns True if segment intersects cell
 */
function segmentIntersectsCell(segment: GridAlignedSegment, cell: GridCell): boolean {
  const cellCenter = gridToWorld(cell)
  const cellMinX = cellCenter.x - GRID_SIZE / 2
  const cellMaxX = cellCenter.x + GRID_SIZE / 2
  const cellMinZ = cellCenter.z - GRID_SIZE / 2
  const cellMaxZ = cellCenter.z + GRID_SIZE / 2
  
  // Check if segment passes through cell bounds
  const segMinX = Math.min(segment.start.x, segment.end.x)
  const segMaxX = Math.max(segment.start.x, segment.end.x)
  const segMinZ = Math.min(segment.start.z, segment.end.z)
  const segMaxZ = Math.max(segment.start.z, segment.end.z)
  
  // Segment intersects if it overlaps with cell bounds
  return (
    segMaxX >= cellMinX &&
    segMinX <= cellMaxX &&
    segMaxZ >= cellMinZ &&
    segMinZ <= cellMaxZ
  )
}

/**
 * Get wire segments passing through a grid cell.
 * Excludes entry/exit segments at pin locations.
 * 
 * @param cell - Grid cell to check
 * @param segments - All wire segments to check
 * @param pinLocations - Optional array of pin locations in the cell (to exclude entry/exit segments)
 * @returns Array of segments passing through the cell
 */
function getWireSegmentsInCell(
  cell: GridCell,
  segments: GridAlignedSegment[],
  pinLocations?: Array<{ gateId: string; pinId: string; position: Position }>
): GridAlignedSegment[] {
  return segments.filter(segment => {
    // Check if segment intersects cell
    if (!segmentIntersectsCell(segment, cell)) {
      return false
    }
    
    // Exclude entry/exit segments at pin locations
    if (pinLocations && (segment.type === 'entry' || segment.type === 'exit')) {
      // Check if segment start or end is at a pin location in this cell
      const isAtPinLocation = pinLocations.some(pin => {
        const pinInCell = isPositionInCell(pin.position, cell)
        if (!pinInCell) return false
        // Check if segment connects to this pin
        const pinMatchesStart = Math.abs(segment.start.x - pin.position.x) < 0.01 &&
                                Math.abs(segment.start.y - pin.position.y) < 0.01 &&
                                Math.abs(segment.start.z - pin.position.z) < 0.01
        const pinMatchesEnd = Math.abs(segment.end.x - pin.position.x) < 0.01 &&
                              Math.abs(segment.end.y - pin.position.y) < 0.01 &&
                              Math.abs(segment.end.z - pin.position.z) < 0.01
        return pinMatchesStart || pinMatchesEnd
      })
      if (isAtPinLocation) {
        return false // Exclude this segment
      }
    }
    
    return true
  })
}

/**
 * Check if a grid cell has wire segments passing through it.
 * Excludes entry/exit segments at pin locations.
 * 
 * @param cell - Grid cell to check
 * @param wires - Array of wire instances
 * @param gates - Array of gate instances (for calculating wire paths and pin locations)
 * @param getPinWorldPosition - Function to get pin world positions
 * @param getPinOrientation - Function to get pin orientations
 * @returns True if cell has wire segments, false otherwise
 */
export function hasWiresInCell(
  cell: GridCell,
  wires: Wire[],
  gates: GateInstance[],
  getPinWorldPosition: (gateId: string, pinId: string) => Position | null,
  getPinOrientation: (gateId: string, pinId: string) => { x: number; y: number; z: number } | null
): boolean {
  if (wires.length === 0) return false
  
  // Collect all wire segments
  const allSegments: GridAlignedSegment[] = []
  const pinLocations: Array<{ gateId: string; pinId: string; position: Position }> = []
  
  for (const wire of wires) {
    const fromPos = getPinWorldPosition(wire.fromGateId, wire.fromPinId)
    const toPos = getPinWorldPosition(wire.toGateId, wire.toPinId)
    if (!fromPos || !toPos) continue
    
    const fromOrientation = getPinOrientation(wire.fromGateId, wire.fromPinId)
    const toOrientation = getPinOrientation(wire.toGateId, wire.toPinId)
    if (!fromOrientation || !toOrientation) continue
    
    // Calculate path for this wire
    const path = calculateWirePath(
      fromPos,
      { type: 'pin', pin: toPos, orientation: { direction: toOrientation } },
      { direction: fromOrientation },
      gates,
      {}
    )
    
    allSegments.push(...path.segments)
    
    // Collect pin locations for this wire (only pins in the target cell)
    const fromInCell = isPositionInCell(fromPos, cell)
    const toInCell = isPositionInCell(toPos, cell)
    if (fromInCell) {
      pinLocations.push({ gateId: wire.fromGateId, pinId: wire.fromPinId, position: fromPos })
    }
    if (toInCell) {
      pinLocations.push({ gateId: wire.toGateId, pinId: wire.toPinId, position: toPos })
    }
  }
  
  // Check if any segments pass through the cell (excluding entry/exit at pins)
  const segmentsInCell = getWireSegmentsInCell(cell, allSegments, pinLocations)
  return segmentsInCell.length > 0
}

