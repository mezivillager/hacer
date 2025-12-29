/**
 * Simplified Wiring Scheme Types
 *
 * This module defines types for the simplified wiring scheme where wires
 * follow section lines (every 4.0 units) using a simple greedy pathfinding algorithm.
 */

import type { Position, GateInstance } from '@/store/types'

// Re-export for convenience
export type { Position, GateInstance }

/**
 * Section line constant (every 4.0 units = GRID_SIZE * 2).
 * Section lines divide the ground plane into sections where gates sit at centers.
 */
export const SECTION_SIZE = 4.0

/**
 * Standard wire height above ground plane (matches pin center Y coordinate for flat gates).
 * Grid-aligned wire routing types.
 */
export const WIRE_HEIGHT = 0.2

/**
 * Wire crossing resolution constants.
 */
export const MIN_CUT_DISTANCE = 0.05 // Minimum distance from segment end for a cut point
export const HOP_ARC_HEIGHT_OFFSET = 0.15 // How much the arc peaks above WIRE_HEIGHT
export const HOP_HEIGHT = WIRE_HEIGHT + HOP_ARC_HEIGHT_OFFSET // Peak height of arc (0.35)
// For a semi-circular arc, radius = half the arc height (vertical rise)
export const HOP_RADIUS = HOP_ARC_HEIGHT_OFFSET / 2 // Radius of the hop arc (0.075)

/**
 * Pin orientation: direction the pin faces (for entry/exit segment alignment).
 */
export interface PinOrientation {
  direction: { x: number; y: number; z: number } // Normalized direction vector
}

/**
 * A segment of a section-line-aligned wire path.
 * Simplified types: horizontal, vertical, entry, exit, and arc segments.
 */
export interface WireSegment {
  start: Position
  end: Position
  type: 'horizontal' | 'vertical' | 'entry' | 'exit' | 'arc'
  // For arc segments, add arc metadata:
  arcCenter?: Position // Center point of arc (at base height)
  arcRadius?: number // Radius of arc
}

/**
 * Complete wire path with segments.
 */
export interface WirePath {
  segments: WireSegment[]
  totalLength: number
}

/**
 * Destination type for wire path calculation.
 */
export type DestinationType =
  | { type: 'pin', pin: Position, orientation: PinOrientation }
  | { type: 'cursor', pos: Position }

/**
 * Options for wire path calculation.
 */
export interface WirePathOptions {
  sourceGateId?: string
  destinationGateId?: string
  checkExistingWires?: boolean
  existingSegments?: WireSegment[] // Existing wire segments to avoid overlapping with
}

/**
 * Section coordinates (row, col) where each unit = 4.0 world units.
 * Section lines are at even coordinates, section centers (gates) at odd coordinates.
 */
export interface SectionPosition {
  row: number
  col: number
}

