/**
 * Wire Branching and Signal System
 *
 * This module provides support for HDL-style circuits where signals can
 * fan out from one source to multiple destinations. This is essential for
 * implementing circuits like XOR from basic gates.
 *
 * Key concepts:
 * - Signal: A logical connection from one source to one or more destinations
 * - SignalEndpoint: A connection point (gate pin, input node, output node, constant)
 * - Junction: A visual branch point where a wire splits to multiple destinations
 */

import type { Position } from '@/store/types'
import type { WireSegment, PinOrientation } from './types'
import { WIRE_HEIGHT, SECTION_SIZE } from './types'
import { findPathAlongSectionLines, snapToNearestSectionLine } from './pathfinding'
import { calculateEntrySegment } from './segments'

/**
 * Type of entity that can be a signal endpoint.
 */
export type SignalEndpointType = 'gate' | 'input' | 'output' | 'junction'

/**
 * Represents a connection point for a signal.
 * Can be a gate pin, circuit input/output node, or junction.
 */
export interface SignalEndpoint {
  /** Type of the endpoint entity */
  type: SignalEndpointType
  /** ID of the entity (gate ID, input node ID, etc.) */
  entityId: string
  /** Pin ID for gates; undefined for other types */
  pinId?: string
}

/**
 * Represents a logical signal connection.
 * A signal has one source and can have multiple destinations (fan-out).
 */
export interface Signal {
  /** Unique identifier for this signal */
  id: string
  /** Optional name for internal HDL signals (e.g., 'notA', 'notB') */
  name?: string
  /** Single source endpoint (output pin, input node, or constant) */
  source: SignalEndpoint
  /** Array of destination endpoints (supports fan-out) */
  destinations: SignalEndpoint[]
}

/**
 * Create a new signal with a source endpoint.
 *
 * @param id - Unique identifier for the signal
 * @param source - Source endpoint (where the signal originates)
 * @param name - Optional name for internal signals (e.g., 'notA')
 * @returns New Signal object with empty destinations array
 *
 * @example
 * // Create signal from input node
 * const signalA = createSignal('sig-a', { type: 'input', entityId: 'input-a' }, 'a')
 *
 * @example
 * // Create signal from gate output
 * const signalNotA = createSignal('sig-notA', { type: 'gate', entityId: 'not-1', pinId: 'out' }, 'notA')
 */
export function createSignal(
  id: string,
  source: SignalEndpoint,
  name?: string
): Signal {
  return {
    id,
    name,
    source,
    destinations: [],
  }
}

/**
 * Add a destination endpoint to a signal (enables fan-out).
 * Returns a new Signal object with the destination added.
 *
 * @param signal - The signal to add a destination to
 * @param destination - The destination endpoint to add
 * @returns New Signal object with the destination added
 *
 * @example
 * // Fan-out: input 'a' goes to both Not gate and And gate
 * let signal = createSignal('sig-a', { type: 'input', entityId: 'input-a' })
 * signal = addDestinationToSignal(signal, { type: 'gate', entityId: 'not-1', pinId: 'in' })
 * signal = addDestinationToSignal(signal, { type: 'gate', entityId: 'and-1', pinId: 'a' })
 */
export function addDestinationToSignal(
  signal: Signal,
  destination: SignalEndpoint
): Signal {
  return {
    ...signal,
    destinations: [...signal.destinations, destination],
  }
}

/**
 * Calculate the optimal position for a junction where a wire branches.
 *
 * The junction should be placed at a section line intersection that minimizes
 * the total wire length to all destinations.
 *
 * @param sourcePos - Position of the signal source
 * @param destPositions - Array of destination positions
 * @param existingSegments - Existing wire segments to avoid overlapping
 * @returns Optimal junction position on section line intersection
 *
 * @example
 * const junction = calculateJunctionPosition(
 *   inputAPos,
 *   [notGateInputPos, andGateInputPos],
 *   existingWireSegments
 * )
 */
export function calculateJunctionPosition(
  sourcePos: Position,
  destPositions: Position[],
  _existingSegments: WireSegment[]
): Position {
  // If only one destination, no junction needed - return source position
  if (destPositions.length <= 1) {
    return sourcePos
  }

  // Find the centroid of all destinations
  const centroidX = destPositions.reduce((sum, p) => sum + p.x, 0) / destPositions.length
  const centroidZ = destPositions.reduce((sum, p) => sum + p.z, 0) / destPositions.length

  // Calculate the point between source and centroid that's on a section line
  // Use the midpoint weighted toward the source for optimal branching
  const midX = sourcePos.x + (centroidX - sourcePos.x) * 0.3
  const midZ = sourcePos.z + (centroidZ - sourcePos.z) * 0.3

  // Snap to nearest section line intersection
  const snappedX = Math.round(midX / SECTION_SIZE) * SECTION_SIZE
  const snappedZ = Math.round(midZ / SECTION_SIZE) * SECTION_SIZE

  // Ensure junction is at least at source X position (don't go backwards)
  const junctionX = Math.max(snappedX, Math.ceil(sourcePos.x / SECTION_SIZE) * SECTION_SIZE)

  return {
    x: junctionX,
    y: WIRE_HEIGHT,
    z: snappedZ,
  }
}

/**
 * Generate wire segments from a junction point to a destination.
 *
 * Uses the pathfinding algorithm to route from the junction to the
 * destination, respecting the destination's pin orientation for entry.
 *
 * @param junctionPos - Position of the junction (branch point)
 * @param destPos - Position of the destination pin
 * @param destOrientation - Orientation of the destination pin
 * @param existingSegments - Existing wire segments to avoid overlapping
 * @returns Array of wire segments forming the branch path
 *
 * @example
 * const segments = generateBranchSegments(
 *   junctionPos,
 *   gateInputPos,
 *   { direction: { x: -1, y: 0, z: 0 } },
 *   existingWireSegments
 * )
 */
export function generateBranchSegments(
  junctionPos: Position,
  destPos: Position,
  destOrientation: PinOrientation,
  existingSegments: WireSegment[]
): WireSegment[] {
  // Calculate the entry segment for the destination (section line → pin)
  const entrySegment = calculateEntrySegment(destPos, destOrientation)
  const routingEnd = entrySegment.start // Route to where entry segment begins

  // Ensure junction is on a section line
  const snappedJunction = snapToNearestSectionLine(junctionPos)

  // Use pathfinding to route from junction to routing end
  try {
    const routingPath = findPathAlongSectionLines(
      snappedJunction,
      routingEnd,
      existingSegments
    )

    // Combine routing path with entry segment
    return [...routingPath, entrySegment]
  } catch {
    // If pathfinding fails, return a simple direct path
    // This shouldn't happen in well-formed circuits but provides a fallback
    console.warn('[generateBranchSegments] Pathfinding failed, using direct path')
    return [
      {
        start: junctionPos,
        end: destPos,
        type: 'horizontal',
      },
    ]
  }
}

/**
 * Check if a signal has fan-out (more than one destination).
 *
 * @param signal - The signal to check
 * @returns True if the signal has multiple destinations
 */
export function hasFanOut(signal: Signal): boolean {
  return signal.destinations.length > 1
}

/**
 * Get all signals that require junctions for visual rendering.
 *
 * @param signals - Array of signals to check
 * @returns Array of signals with fan-out (requiring junctions)
 */
export function getSignalsWithFanOut(signals: Signal[]): Signal[] {
  return signals.filter(hasFanOut)
}
