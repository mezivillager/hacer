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

  // Find gates
  const fromGate = gates.find((g) => g.id === fromGateId)
  const toGate = gates.find((g) => g.id === toGateId)

  if (!fromGate || !toGate) {
    return null
  }

  // Find pins
  const fromPin = fromGate.outputs.find((p) => p.id === fromPinId) || fromGate.inputs.find((p) => p.id === fromPinId)
  const toPin = toGate.outputs.find((p) => p.id === toPinId) || toGate.inputs.find((p) => p.id === toPinId)

  if (!fromPin || !toPin) {
    return null
  }

  // Determine output and input pins (wires are always output -> input)
  const isFromOutput = fromPin.type === 'output'
  const outputGateId = isFromOutput ? fromGateId : toGateId
  const outputPinId = isFromOutput ? fromPinId : toPinId
  const inputGateId = isFromOutput ? toGateId : fromGateId
  const inputPinId = isFromOutput ? toPinId : fromPinId

  // Get pin positions and orientations
  const outputPinPos = getPinWorldPosition(outputGateId, outputPinId)
  const inputPinPos = getPinWorldPosition(inputGateId, inputPinId)
  const outputPinOrientation = getPinOrientation(outputGateId, outputPinId)
  const inputPinOrientation = getPinOrientation(inputGateId, inputPinId)

  if (!outputPinPos || !inputPinPos || !outputPinOrientation || !inputPinOrientation) {
    return null
  }

  // Construct destination
  const destination: DestinationType = {
    type: 'pin',
    pin: inputPinPos,
    orientation: { direction: inputPinOrientation },
  }

  // Calculate path
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
    // Step 1: Calculate exit segment (pin center → section line)
    const exitSegment = calculateExitSegment(startPin, startOrientation)
    
    let entrySegment: ReturnType<typeof calculateEntrySegment> | null = null
    let routingEnd: Position
    
    if (destination.type === 'pin') {
      // Step 2: Calculate entry segment (section line → pin center)
      entrySegment = calculateEntrySegment(destination.pin, destination.orientation)
      routingEnd = entrySegment.start // Entry segment starts at section line
    } else {
      // Step 3: For cursor destination, snap to nearest section boundary
      routingEnd = snapCursorToSectionBoundary(destination.pos)
      // No entry segment for cursor destinations
    }
    
    // Step 4: Route from exit segment end to routing end using greedy algorithm
    const existingSegments = options.existingSegments || []
    const routingPath = findPathAlongSectionLines(exitSegment.end, routingEnd, existingSegments)
    
    // Step 5: Assemble complete path
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
    // Log diagnostic information
    const diagnosticInfo = {
      startPin,
      destination,
      startOrientation,
      gatesCount: gates.length,
      options,
    }
    
    console.error('[calculateWirePath] Path calculation failed:', error)
    console.error('[calculateWirePath] Diagnostic info:', JSON.stringify(diagnosticInfo, null, 2))
    
    // Re-throw with additional context
    throw new Error(
      `Wire path calculation failed: ${error instanceof Error ? error.message : String(error)}. ` +
      `See console for diagnostic information.`
    )
  }
}
