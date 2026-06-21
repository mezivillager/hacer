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
 * Per-pin approach-lane constants (wire-routing Stage 1 — see
 * docs/superpowers/specs/2026-06-21-wire-routing-stage1-design.md and ADR-0007).
 *
 * Dense multi-input chips (Mux4Way16, Mux8Way16) pack their pins ~0.4u apart,
 * far finer than {@link SECTION_SIZE}. Routing every pin to the same coarse
 * section line collapses their approach paths onto one line and the overlap
 * check rejects the inner pins. Instead, each pin escapes the coarse grid onto
 * its **own** vertical/horizontal lane inside the gap between the pin and the
 * section line, so distinct pins resolve to distinct lanes (exclusivity
 * preserved — Finding 10) while the short connector at the shared confluence
 * line is treated as a shareable bus (Finding 2).
 */
// Distance of the first lane from the pin (toward the section line).
export const LANE_BASE = 0.3
// Spacing between consecutive per-pin lanes.
export const LANE_PITCH = 0.4

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
  crossedWireId?: string // ID of wire this arc hops over
  /**
   * Marks a per-pin **approach** segment (lane connector / lane / entry) that
   * fans a pin off the coarse grid (wire-routing Stage 1). Approach segments
   * are exempt from inter-wire overlap rejection *against other approach
   * segments* (a shared confluence bus is legitimate); they are otherwise
   * normal renderable segments. Ignored by the renderer and length math.
   */
  approach?: boolean
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

