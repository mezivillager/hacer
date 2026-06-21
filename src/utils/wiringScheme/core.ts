/**
 * Core Wire Path Calculation
 *
 * Main entry points for calculating wire paths.
 * Orchestrates segment creation, pathfinding, and path assembly.
 */

import type { Position, PinOrientation, DestinationType, WirePath, WirePathOptions, GateInstance } from './types'
import { SECTION_SIZE } from './types'
import { calculateExitSegment, calculateTotalLength } from './segments'
import { findPathAlongSectionLines } from './pathfinding'
import { snapCursorToSectionBoundary } from './extension'
import { computePinApproach } from './approach'

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
  existingSegments?: import('./types').WireSegment[]
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

  const fromGate = gates.find((g) => g.id === fromGateId)
  const toGate = gates.find((g) => g.id === toGateId)

  if (!fromGate || !toGate) {
    return null
  }

  const fromPin = fromGate.outputs.find((p) => p.id === fromPinId) || fromGate.inputs.find((p) => p.id === fromPinId)
  const toPin = toGate.outputs.find((p) => p.id === toPinId) || toGate.inputs.find((p) => p.id === toPinId)

  if (!fromPin || !toPin) {
    return null
  }

  const isFromOutput = fromPin.type === 'output'
  const outputGateId = isFromOutput ? fromGateId : toGateId
  const outputPinId = isFromOutput ? fromPinId : toPinId
  const inputGateId = isFromOutput ? toGateId : fromGateId
  const inputPinId = isFromOutput ? toPinId : fromPinId

  const outputPinPos = getPinWorldPosition(outputGateId, outputPinId)
  const inputPinPos = getPinWorldPosition(inputGateId, inputPinId)
  const outputPinOrientation = getPinOrientation(outputGateId, outputPinId)
  const inputPinOrientation = getPinOrientation(inputGateId, inputPinId)

  if (!outputPinPos || !inputPinPos || !outputPinOrientation || !inputPinOrientation) {
    return null
  }

  const destination: DestinationType = {
    type: 'pin',
    pin: inputPinPos,
    orientation: { direction: inputPinOrientation },
  }

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
  _gates: GateInstance[],
  options: WirePathOptions = {}
): WirePath {
  try {
    const exitSegment = calculateExitSegment(startPin, startOrientation)

    // Per-pin escape approach: for pin destinations, the coarse router only has
    // to reach a shared confluence point near the chip; the approach segments
    // then fan the wire onto the pin's own lane and into the pin. This keeps
    // dense, closely-spaced pins on distinct lanes (B-003/B-004, ADR-0007).
    let approachSegments: import('./types').WireSegment[] = []
    let routingEnd: Position

    if (destination.type === 'pin') {
      const approach = computePinApproach(destination.pin, destination.orientation)
      routingEnd = approach.routingEnd
      approachSegments = approach.segments
    } else {
      routingEnd = snapCursorToSectionBoundary(destination.pos)
    }

    const existingSegments = options.existingSegments || []
    // Pass the confluence point for pin destinations so the pathfinder can
    // pre-tag backbone segments as `approach` before the overlap check. This
    // lets concurrent wires to the same chip side share the confluence track
    // (approach-vs-approach sharing — Finding 2 / ADR-0007).
    const confluencePoint = destination.type === 'pin' ? routingEnd : undefined
    const routingPath = findPathAlongSectionLines(exitSegment.end, routingEnd, existingSegments, confluencePoint)

    // Tag backbone segments as approach for any that weren't already tagged
    // during pathfinding (e.g. the direct-segment path).
    const taggedRoutingPath =
      destination.type === 'pin'
        ? markConfluenceApproach(routingPath, routingEnd)
        : routingPath

    const allSegments = [exitSegment, ...taggedRoutingPath, ...approachSegments]

    const totalLength = calculateTotalLength(allSegments)

    return {
      segments: allSegments,
      totalLength,
    }
  } catch (error) {
    throw new Error(
      `Wire path calculation failed: ${error instanceof Error ? error.message : String(error)}.`
    )
  }
}

const CONFLUENCE_TOLERANCE = 0.001

/**
 * Tag the routing segments that form the fan-in bus into the shared confluence
 * as `approach` (shareable). Multiple wires destined for the same chip side all
 * converge on the chip-side section line, so the segments running *along that
 * section column* (`x === confluence.x`) are a legitimate shared backbone — not
 * a routing conflict (research Finding 2; B-003/B-004). Marking them lets
 * {@link wouldOverlapWithExisting} treat the shared track as a confluence bus.
 * Segments off the confluence column stay fully exclusive, so unrelated wires
 * are unaffected and distinct pins still resolve to distinct lanes (Finding 10).
 */
function markConfluenceApproach(
  routingPath: import('./types').WireSegment[],
  confluence: Position,
): import('./types').WireSegment[] {
  // The confluence sits on a section line on one axis (the chip-side backbone):
  // x for left/right pins, z for top/bottom pins. Tag routing segments lying on
  // that backbone line.
  const onSection = (coord: number) =>
    Math.abs(coord - Math.round(coord / SECTION_SIZE) * SECTION_SIZE) < CONFLUENCE_TOLERANCE
  const backboneIsColumn = onSection(confluence.x)
  const onBackbone = (seg: import('./types').WireSegment) =>
    backboneIsColumn
      ? Math.abs(seg.start.x - confluence.x) < CONFLUENCE_TOLERANCE &&
        Math.abs(seg.end.x - confluence.x) < CONFLUENCE_TOLERANCE
      : Math.abs(seg.start.z - confluence.z) < CONFLUENCE_TOLERANCE &&
        Math.abs(seg.end.z - confluence.z) < CONFLUENCE_TOLERANCE
  const coord = backboneIsColumn ? confluence.x : confluence.z
  return routingPath.map((seg) =>
    onBackbone(seg) ? { ...seg, approach: true, confluenceCoord: coord } : seg,
  )
}

/**
 * Options specific to junction path calculation.
 */
export interface JunctionWirePathOptions extends WirePathOptions {
  /** Segments of the source wire (junction's parent wire) to exclude from overlap detection */
  sourceWireSegments?: import('./types').WireSegment[]
}

/**
 * Calculate wire path from a junction position to destination.
 * Junction is already on a section line (at a corner), so we skip exit segment calculation
 * and route directly from the junction position.
 *
 * @param junctionPosition - Junction position (already on section line)
 * @param destination - Destination (pin or cursor)
 * @param gates - Array of gates (for compatibility, not used in simplified scheme)
 * @param options - Path calculation options including optional source wire segments to exclude
 * @returns Complete wire path
 * @throws Error if path calculation fails at any step
 */
export function calculateWirePathFromJunction(
  junctionPosition: Position,
  destination: DestinationType,
  _gates: GateInstance[],
  options: JunctionWirePathOptions = {}
): WirePath {
  try {
    let approachSegments: import('./types').WireSegment[] = []
    let routingEnd: Position

    if (destination.type === 'pin') {
      const approach = computePinApproach(destination.pin, destination.orientation)
      routingEnd = approach.routingEnd
      approachSegments = approach.segments
    } else {
      routingEnd = snapCursorToSectionBoundary(destination.pos)
    }

    // Exclude the source wire's segments that touch the junction position
    // to allow branching without self-overlap detection
    const allExistingSegments = options.existingSegments || []
    const sourceWireSegments = options.sourceWireSegments || []
    const TOLERANCE = 0.001

    const existingSegments = allExistingSegments.filter((seg) => {
      // Check if this segment belongs to the source wire by reference equality
      const isSourceSegment = sourceWireSegments.some((srcSeg) =>
        Math.abs(srcSeg.start.x - seg.start.x) < TOLERANCE &&
        Math.abs(srcSeg.start.z - seg.start.z) < TOLERANCE &&
        Math.abs(srcSeg.end.x - seg.end.x) < TOLERANCE &&
        Math.abs(srcSeg.end.z - seg.end.z) < TOLERANCE
      )
      if (!isSourceSegment) return true

      // For source wire segments, only exclude those touching the junction
      const distToStart = Math.sqrt(
        (junctionPosition.x - seg.start.x) ** 2 +
        (junctionPosition.y - seg.start.y) ** 2 +
        (junctionPosition.z - seg.start.z) ** 2
      )
      const distToEnd = Math.sqrt(
        (junctionPosition.x - seg.end.x) ** 2 +
        (junctionPosition.y - seg.end.y) ** 2 +
        (junctionPosition.z - seg.end.z) ** 2
      )
      return distToStart > TOLERANCE && distToEnd > TOLERANCE
    })
    const confluencePoint = destination.type === 'pin' ? routingEnd : undefined
    const routingPath = findPathAlongSectionLines(junctionPosition, routingEnd, existingSegments, confluencePoint)

    const allSegments = [...routingPath, ...approachSegments]

    const totalLength = calculateTotalLength(allSegments)

    return {
      segments: allSegments,
      totalLength,
    }
  } catch (error) {
    throw new Error(
      `Wire path calculation from junction failed: ${error instanceof Error ? error.message : String(error)}.`
    )
  }
}
