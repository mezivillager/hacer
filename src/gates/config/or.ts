// OR gate configuration
import { Shape, ExtrudeGeometry, type BufferGeometry } from 'three'
import { colors } from '@/theme'
import type { PinConfig } from '../types'
import {
  COMMON_DIMENSIONS,
  COMMON_COLORS,
  createTwoInputPinConfigs,
} from './common'

/**
 * OR gate specific colors (blue tint) - sourced from theme.
 */
export const OR_COLORS = {
  body: colors.gate.or.body,
  hover: colors.gate.or.hover,
  selected: COMMON_COLORS.BODY_SELECTED,
} as const

/**
 * OR gate dimensions.
 * Uses custom shield shape so only depth and pin radius are needed.
 */
export const OR_DIMENSIONS = {
  depth: COMMON_DIMENSIONS.BODY_DEPTH,
  pinRadius: COMMON_DIMENSIONS.PIN_RADIUS,
} as const

/**
 * Creates the shield-shaped geometry for the OR gate body.
 * The shape has a curved concave left side and a pointed right side.
 *
 * @returns BufferGeometry for the extruded OR gate shape
 */
function createOrGateGeometry(): BufferGeometry {
  const shape = new Shape()
  // Shield/rocket shape - curved back, pointed front
  shape.moveTo(-0.5, 0.4) // Top left
  shape.quadraticCurveTo(-0.3, 0, -0.5, -0.4) // Curved left side (concave)
  shape.lineTo(0.3, -0.4) // Bottom edge
  shape.quadraticCurveTo(0.6, 0, 0.3, 0.4) // Pointed right side
  shape.lineTo(-0.5, 0.4) // Back to top

  const extrudeSettings = {
    depth: OR_DIMENSIONS.depth,
    bevelEnabled: false,
  }

  return new ExtrudeGeometry(shape, extrudeSettings)
}

// Memoize the geometry to avoid recreating it on each render
const orGateGeometry = createOrGateGeometry()

/**
 * Calculates the input and output pin X positions for the OR gate.
 * Uses hardcoded positions to match the custom shield shape.
 *
 * @returns Object with inputPinX and outputPinX coordinates
 */
function calculateOrPinPositions() {
  // Input pins on left side of shield
  const inputPinX = -0.55
  // Output pin on right side of shield
  const outputPinX = 0.55
  return { inputPinX, outputPinX }
}

/**
 * Creates pin configuration objects for an OR gate instance.
 * Generates configurations for two input pins and one output pin.
 *
 * @param gateId - Unique identifier for the gate instance
 * @param inputA - Current boolean value of the first input
 * @param inputB - Current boolean value of the second input
 * @param inputAConnected - Whether the first input is connected to a wire
 * @param inputBConnected - Whether the second input is connected to a wire
 * @param output - Current boolean value of the output (result of OR operation)
 * @param outputConnected - Whether the output is connected to a wire
 * @returns Array of PinConfig objects for the OR gate's three pins
 */
export function createOrPinConfigs(
  gateId: string,
  inputA: boolean,
  inputB: boolean,
  inputAConnected: boolean,
  inputBConnected: boolean,
  output: boolean,
  outputConnected: boolean
): PinConfig[] {
  const { inputPinX, outputPinX } = calculateOrPinPositions()
  return createTwoInputPinConfigs(
    gateId,
    inputPinX,
    outputPinX,
    inputA,
    inputB,
    inputAConnected,
    inputBConnected,
    output,
    outputConnected
  )
}

/**
 * Creates wire stub positions for an OR gate.
 * Returns positions for three wire stubs (two inputs, one output).
 *
 * @returns Array of 3D coordinate tuples for wire stub positions
 */
export function createOrWireStubs(): [number, number, number][] {
  const { inputPinX, outputPinX } = calculateOrPinPositions()
  return [
    [inputPinX - 0.15, 0.2, 0],
    [inputPinX - 0.15, -0.2, 0],
    [outputPinX + 0.15, 0, 0],
  ]
}

/**
 * OR gate text label configuration.
 * Defines the label text, position, and font size for the gate's visual label.
 */
export const OR_TEXT_CONFIG = {
  label: 'OR',
  position: [0, 0, -0.21] as [number, number, number],
  fontSize: 0.28,
} as const

/**
 * OR gate geometry configuration.
 * Uses pre-built extruded geometry for the custom shield shape.
 */
export const OR_GEOMETRY = {
  type: 'extrude' as const,
  geometry: orGateGeometry,
  position: [0, 0, -0.2] as [number, number, number],
} as const
