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
 * Transit-lane (nudging) constants — lane-level exclusivity (closes CASE1 and the
 * transit-vs-transit collision).
 *
 * When an unrelated net's trunk must transit a chip's approach backbone column,
 * the coarse grid offers no alternative corner, so the trunk used to ride the
 * backbone's exact track and merge with it visually (CASE1). Instead the trunk
 * is **nudged** onto its own parallel lane — a small deterministic offset from
 * the section line — so the two wires physically coexist (libavoid nudging,
 * research Finding 2; ADR-0007).
 *
 * `TRANSIT_LANE_PITCH` is the spacing between consecutive transit lanes. It is
 * deliberately tiny — the nudge must move a run only just OFF the section line so
 * the two wires stop sharing one physical track, WITHOUT reshaping the path's
 * corner topology (a large lateral shift would relocate crossings and corners).
 * The maximum offset (`MAX_TRANSIT_LANE_OFFSET`) is kept well under one pin
 * spacing so a nudged transit still crosses the same perpendicular segments at
 * essentially the same points (hops are preserved).
 *
 * `TRANSIT_LANE_SLOTS` is the number of distinct physical lanes available within
 * the safe offset cap (`SLOTS · PITCH = MAX_TRANSIT_LANE_OFFSET`). The per-net
 * hash maps into `1..SLOTS` as a *starting* index only — `nudgeTransitRun` then
 * **probes** outward from that index to the first lane that is actually free of
 * every other wire already on that track (other transit runs AND foreign
 * backbones), so two distinct transit nets that hash to the same starting index
 * still resolve to distinct lanes rather than silently merging. The probe is what
 * guarantees separation; the slot count and hash spread only minimize probing.
 *
 * Lane 0 (the exact section line) is reserved for the confluence that OWNS the
 * backbone, so transit indices start at 1 and the owner's fan-in bus is never
 * nudged (B-003/B-004).
 *
 * Residual: if probing within `MAX_TRANSIT_LANE_OFFSET` cannot find a free lane
 * (extreme transit density crowding a single column past the safe offset cap),
 * the run stays on its last safe lane rather than being pushed far enough to
 * reshape the path — a narrow, documented Stage-3 (visibility-graph) concern, not
 * the general case. The other residual is order-of-construction: a transit routed
 * *before* its target chip's backbone exists has no backbone to avoid yet and
 * falls back to the pre-existing greedy reject-and-reroute.
 */
export const TRANSIT_LANE_PITCH = 0.06
export const TRANSIT_LANE_SLOTS = 6
/**
 * Hard cap on a transit lane's offset from the section line
 * (= `TRANSIT_LANE_SLOTS · TRANSIT_LANE_PITCH`). Kept strictly under one pin
 * spacing (~0.4u, see {@link LANE_PITCH}) so a nudged transit still crosses the
 * same perpendicular segments at essentially the same points (hops preserved) and
 * never reshapes corner topology. Probing stops here; a run that cannot find a
 * free lane within this cap stays on its last safe lane.
 */
export const MAX_TRANSIT_LANE_OFFSET = TRANSIT_LANE_SLOTS * TRANSIT_LANE_PITCH

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
   * are shareable against other approach segments on the SAME confluence
   * backbone (confluenceCoord must match). Non-approach transit wires may
   * also traverse the backbone (approach-vs-non-approach is always allowed).
   * Ignored by the renderer and length math.
   */
  approach?: boolean
  /**
   * The backbone coordinate of the confluence this approach segment belongs to
   * (x for vertical backbone, z for horizontal backbone). Two approach segments
   * may share a track only when their confluenceCoord values match.
   * Set by `markConfluenceApproach` in core.ts.
   */
  confluenceCoord?: number
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

