/**
 * Per-pin Approach Lanes (wire-routing Stage 1 — B-003/B-004)
 *
 * Dense multi-input chips pack their pins ~0.4u apart, far finer than the coarse
 * routing grid (`SECTION_SIZE`). The old router routed every pin to the same
 * section line and travelled the shared section column to reach each pin, so the
 * inner pins' approach paths collapsed onto one line and the overlap check
 * rejected them ("all routing corners are blocked").
 *
 * This module builds an **escape-then-connect** approach for a pin destination:
 *
 * 1. The coarse router targets the section line at the pin's **own row** — a
 *    detour-free target that leaves single-wire routing unchanged.
 * 2. Multiple pins on the same chip side share the section **column** leading to
 *    that side (a legitimate confluence/bus); `core.ts` marks the column-incident
 *    routing segments as `approach` so the overlap check treats the shared track
 *    as a bus rather than a conflict (research Finding 2).
 * 3. From the section line each pin fans off **on its own row at its own lane**
 *    and into the pin. Distinct pins occupy distinct rows (and distinct lane
 *    offsets), so node-exclusivity is preserved — distinct pins resolve to
 *    distinct lanes (Finding 10), never relaxed globally.
 *
 * See docs/superpowers/specs/2026-06-21-wire-routing-stage1-design.md and
 * docs/decisions/0007-wire-routing-engine-direction.md.
 */

import type { Position, PinOrientation, WireSegment } from './types'
import { SECTION_SIZE, WIRE_HEIGHT, LANE_BASE, LANE_PITCH } from './types'

const TOLERANCE = 0.001

/**
 * Pin column spacing on a chip side (mirror of `PIN_SPACING` in
 * `chipBodyLayout.ts`). Used to quantize a pin's offset from its section line
 * into a stable, collision-free lane index so concurrent per-pin routing (which
 * knows only one pin at a time) still assigns distinct lanes deterministically.
 */
const PIN_COLUMN_SPACING = 0.4

/**
 * The coarse-grid point the router must reach for a pin approach (a shared
 * confluence on the chip-side section line), plus the short approach segments
 * that fan the wire off that line and into the pin. `segments` are appended
 * *after* the coarse routing path.
 */
export interface PinApproach {
  /** Coarse section-line point the router routes to. */
  routingEnd: Position
  /** Approach (lane + entry) segments from the section line into the pin. */
  segments: WireSegment[]
}

/** Snap a coordinate to the nearest coarse section line value. */
function snapToSection(coord: number): number {
  return Math.round(coord / SECTION_SIZE) * SECTION_SIZE
}

/**
 * Derive a deterministic, distinct lane index from a pin's signed offset along
 * its column from its section line. Each distinct pin coordinate maps to a
 * distinct non-negative index via a zigzag (0, 1, 2, … alternating sides), so
 * two pins symmetric about the section line never collide.
 */
function laneIndexFromOffset(offset: number): number {
  const steps = Math.round(offset / PIN_COLUMN_SPACING)
  if (steps === 0) return 0
  return steps > 0 ? 2 * steps - 1 : -2 * steps
}

/**
 * Build a horizontal-side approach (inputs/outputs on a chip's left/right edge):
 * pins share a world X and differ in Z. The router reaches `(sectionX, pinZ)`;
 * the wire then fans off on the pin's own row, via a short per-pin lane offset,
 * into the pin.
 */
function horizontalApproach(
  pinCenter: Position,
  dirX: number,
  laneIndex?: number,
): PinApproach {
  const sectionX = dirX > 0
    ? Math.ceil(pinCenter.x / SECTION_SIZE) * SECTION_SIZE
    : Math.floor(pinCenter.x / SECTION_SIZE) * SECTION_SIZE
  const dirToSection = Math.sign(sectionX - pinCenter.x) || (dirX > 0 ? 1 : -1)

  const resolvedIndex = laneIndex ?? laneIndexFromOffset(pinCenter.z - snapToSection(pinCenter.z))
  const laneDistance = LANE_BASE + resolvedIndex * LANE_PITCH

  // Per-pin lane X, strictly between the pin and the section line. The lane
  // offset keeps closely-spaced pins visually distinct and deterministic.
  let laneX = pinCenter.x + dirToSection * laneDistance
  const gap = Math.abs(sectionX - pinCenter.x)
  if (Math.abs(laneX - pinCenter.x) > gap - TOLERANCE) {
    laneX = pinCenter.x + dirToSection * (gap * 0.5)
  }

  const routingEnd: Position = { x: sectionX, y: WIRE_HEIGHT, z: pinCenter.z }

  const lane: WireSegment = {
    start: { x: sectionX, y: WIRE_HEIGHT, z: pinCenter.z },
    end: { x: laneX, y: WIRE_HEIGHT, z: pinCenter.z },
    type: 'horizontal',
    approach: true,
  }
  const entry: WireSegment = {
    start: { x: laneX, y: WIRE_HEIGHT, z: pinCenter.z },
    end: { ...pinCenter, y: WIRE_HEIGHT },
    type: 'entry',
    approach: true,
  }

  const segments = [lane, entry].filter(
    (s) => Math.abs(s.start.x - s.end.x) > TOLERANCE || Math.abs(s.start.z - s.end.z) > TOLERANCE,
  )
  return { routingEnd, segments }
}

/**
 * Build a vertical-side approach (rare; pins on a chip's top/bottom edge share a
 * world Z and differ in X). Symmetric to {@link horizontalApproach}.
 */
function verticalApproach(
  pinCenter: Position,
  dirZ: number,
  laneIndex?: number,
): PinApproach {
  const sectionZ = dirZ > 0
    ? Math.ceil(pinCenter.z / SECTION_SIZE) * SECTION_SIZE
    : Math.floor(pinCenter.z / SECTION_SIZE) * SECTION_SIZE
  const dirToSection = Math.sign(sectionZ - pinCenter.z) || (dirZ > 0 ? 1 : -1)

  const resolvedIndex = laneIndex ?? laneIndexFromOffset(pinCenter.x - snapToSection(pinCenter.x))
  const laneDistance = LANE_BASE + resolvedIndex * LANE_PITCH

  let laneZ = pinCenter.z + dirToSection * laneDistance
  const gap = Math.abs(sectionZ - pinCenter.z)
  if (Math.abs(laneZ - pinCenter.z) > gap - TOLERANCE) {
    laneZ = pinCenter.z + dirToSection * (gap * 0.5)
  }

  const routingEnd: Position = { x: pinCenter.x, y: WIRE_HEIGHT, z: sectionZ }

  const lane: WireSegment = {
    start: { x: pinCenter.x, y: WIRE_HEIGHT, z: sectionZ },
    end: { x: pinCenter.x, y: WIRE_HEIGHT, z: laneZ },
    type: 'vertical',
    approach: true,
  }
  const entry: WireSegment = {
    start: { x: pinCenter.x, y: WIRE_HEIGHT, z: laneZ },
    end: { ...pinCenter, y: WIRE_HEIGHT },
    type: 'entry',
    approach: true,
  }

  const segments = [lane, entry].filter(
    (s) => Math.abs(s.start.x - s.end.x) > TOLERANCE || Math.abs(s.start.z - s.end.z) > TOLERANCE,
  )
  return { routingEnd, segments }
}

/**
 * Compute the per-pin approach (confluence routing-end + fan-out segments) for a
 * pin destination. Picks the horizontal or vertical layout from the pin's
 * facing direction.
 *
 * @param pinCenter - True pin center position
 * @param orientation - Pin facing direction
 * @param laneIndex - Optional explicit lane index. When omitted, derived
 *   deterministically from the pin's offset from its section line so distinct
 *   pins on a side resolve to distinct lanes without enumerating the other pins.
 */
export function computePinApproach(
  pinCenter: Position,
  orientation: PinOrientation,
  laneIndex?: number,
): PinApproach {
  const dir = orientation.direction
  return Math.abs(dir.x) >= Math.abs(dir.z)
    ? horizontalApproach(pinCenter, dir.x, laneIndex)
    : verticalApproach(pinCenter, dir.z, laneIndex)
}
