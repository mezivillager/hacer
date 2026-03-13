// NOT gate helper functions
import { Shape, ExtrudeGeometry, type BufferGeometry } from 'three'
import type { PinConfig } from '../types'
import {
  COMMON_DIMENSIONS,
  calculateInputPinX,
  calculateBubblePosition,
  calculateBubbleOutputPinX,
  createSingleInputPinConfigs,
  createSingleInputWireStubs,
} from './common'

/**
 * NOT gate dimensions.
 * Uses a triangle shape pointing right with a negation bubble.
 */
export const NOT_DIMENSIONS = {
  triangleLeft: -0.4,
  triangleTip: 0.4,
  depth: COMMON_DIMENSIONS.BODY_DEPTH,
  pinRadius: COMMON_DIMENSIONS.PIN_RADIUS,
  bubbleRadius: COMMON_DIMENSIONS.BUBBLE_RADIUS, // Use common bubble radius for consistency with NAND gates
} as const

/**
 * Creates the triangle-shaped geometry for the NOT gate body.
 * The triangle points to the right with the base on the left.
 *
 * @returns BufferGeometry for the extruded NOT gate triangle shape
 */
function createTriangleGeometry(): BufferGeometry {
  const shape = new Shape()
  // Triangle pointing right
  shape.moveTo(NOT_DIMENSIONS.triangleLeft, 0.4) // Top left
  shape.lineTo(NOT_DIMENSIONS.triangleTip, 0) // Right point
  shape.lineTo(NOT_DIMENSIONS.triangleLeft, -0.4) // Bottom left
  shape.lineTo(NOT_DIMENSIONS.triangleLeft, 0.4) // Back to top

  const extrudeSettings = {
    depth: NOT_DIMENSIONS.depth,
    bevelEnabled: false,
  }

  return new ExtrudeGeometry(shape, extrudeSettings)
}

// Memoize the geometry to avoid recreating it on each render
const triangleGeometry = createTriangleGeometry()

/**
 * NOT gate geometry configuration.
 * Uses pre-built extruded geometry for the triangle shape.
 */
export const NOT_GEOMETRY = {
  type: 'extrude' as const,
  geometry: triangleGeometry,
  position: [0, 0, -0.2] as [number, number, number],
} as const

/**
 * Calculates the input and output pin X positions for the NOT gate.
 * Accounts for the negation bubble on the output side.
 *
 * @returns Object with inputPinX, outputPinX, and bubbleCenterX coordinates
 */
export function calculateNotPinPositions() {
  const inputPinX = calculateInputPinX(NOT_DIMENSIONS.triangleLeft, NOT_DIMENSIONS.pinRadius)
  const bubble = calculateBubblePosition(NOT_DIMENSIONS.triangleTip, NOT_DIMENSIONS.bubbleRadius)
  const outputPinX = calculateBubbleOutputPinX(bubble.right, NOT_DIMENSIONS.pinRadius)
  return { inputPinX, outputPinX, bubbleCenterX: bubble.centerX }
}

/**
 * Creates pin configuration objects for a NOT gate instance.
 * Generates configurations for one input pin and one output pin.
 *
 * @param gateId - Unique identifier for the gate instance
 * @param input - Current boolean value of the input
 * @param inputConnected - Whether the input is connected to a wire
 * @param output - Current boolean value of the output (inverted input)
 * @param outputConnected - Whether the output is connected to a wire
 * @returns Array of PinConfig objects for the NOT gate's two pins
 */
export function createNotPinConfigs(
  gateId: string,
  input: boolean,
  inputConnected: boolean,
  output: boolean,
  outputConnected: boolean
): PinConfig[] {
  const { inputPinX, outputPinX } = calculateNotPinPositions()
  return createSingleInputPinConfigs(
    gateId,
    inputPinX,
    outputPinX,
    input,
    inputConnected,
    output,
    outputConnected
  )
}

/**
 * Creates wire stub positions for a NOT gate.
 * Returns positions for two wire stubs (one input, one output).
 *
 * @returns Array of 3D coordinate tuples for wire stub positions
 */
export function createNotWireStubs(): [number, number, number][] {
  const { inputPinX, outputPinX } = calculateNotPinPositions()
  return createSingleInputWireStubs(inputPinX, outputPinX)
}
