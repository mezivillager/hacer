import type { Position, GateInstance } from '@/store/types'

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
 * Validates minimum spacing from all existing gates.
 * 
 * @param gridPos - Grid position to check
 * @param existingGates - Array of existing gate instances
 * @param excludeGateId - Optional gate ID to exclude from validation (useful for dragging)
 * @returns true if placement is valid, false otherwise
 */
export function canPlaceGateAt(
  gridPos: GridPosition,
  existingGates: GateInstance[],
  excludeGateId?: string
): boolean {
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

  return true
}

