/**
 * Core Wire Path Calculation
 *
 * Main entry points for calculating wire paths.
 * Orchestrates segment creation, pathfinding, and path assembly.
 */

import type { Position, PinOrientation, DestinationType, WirePath, WirePathOptions, GateInstance } from './types'
import { calculateExitSegment, calculateEntrySegment, calculateTotalLength } from './segments'
import { findPathAlongSectionLines } from './pathfinding'
import { snapCursorToSectionBoundary } from './extension'

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
  gates: GateInstance[],
  options: WirePathOptions = {}
): WirePath {
  try {
    const exitSegment = calculateExitSegment(startPin, startOrientation)

    let entrySegment: ReturnType<typeof calculateEntrySegment> | null = null
    let routingEnd: Position

    if (destination.type === 'pin') {
      entrySegment = calculateEntrySegment(destination.pin, destination.orientation)
      routingEnd = entrySegment.start
    } else {
      routingEnd = snapCursorToSectionBoundary(destination.pos)
    }

    const existingSegments = options.existingSegments || []
    const routingPath = findPathAlongSectionLines(exitSegment.end, routingEnd, existingSegments)

    const allSegments = [exitSegment, ...routingPath]
    if (entrySegment) {
      allSegments.push(entrySegment)
    }

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
  gates: GateInstance[],
  options: JunctionWirePathOptions = {}
): WirePath {
  try {
    let entrySegment: ReturnType<typeof calculateEntrySegment> | null = null
    let routingEnd: Position

    if (destination.type === 'pin') {
      entrySegment = calculateEntrySegment(destination.pin, destination.orientation)
      routingEnd = entrySegment.start
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
    const routingPath = findPathAlongSectionLines(junctionPosition, routingEnd, existingSegments)

    const allSegments = [...routingPath]
    if (entrySegment) {
      allSegments.push(entrySegment)
    }

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
