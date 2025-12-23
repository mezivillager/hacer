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
 * Pin orientation: direction the pin faces (for entry/exit segment alignment).
 */
export interface PinOrientation {
  direction: { x: number; y: number; z: number } // Normalized direction vector
}

/**
 * A segment of a section-line-aligned wire path.
 * Simplified types: only horizontal, vertical, entry, and exit segments.
 */
export interface WireSegment {
  start: Position
  end: Position
  type: 'horizontal' | 'vertical' | 'entry' | 'exit'
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

