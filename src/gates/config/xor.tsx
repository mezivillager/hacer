// XOR gate configuration
import { Shape, ExtrudeGeometry, type BufferGeometry } from 'three'
import { colors, materials } from '@/theme'
import type { PinConfig } from '../types'
import type { ReactNode } from 'react'
import {
  COMMON_DIMENSIONS,
  COMMON_COLORS,
  createTwoInputPinConfigs,
} from './common'

/**
 * XOR gate specific colors (cyan/teal tint) - sourced from theme.
 */
export const XOR_COLORS = {
  body: colors.gate.xor.body,
  hover: colors.gate.xor.hover,
  selected: COMMON_COLORS.BODY_SELECTED,
} as const

/**
 * XOR gate dimensions.
 * Uses custom shield shape with extra line, so only depth and pin radius are needed.
 */
export const XOR_DIMENSIONS = {
  depth: COMMON_DIMENSIONS.BODY_DEPTH,
  pinRadius: COMMON_DIMENSIONS.PIN_RADIUS,
} as const

/**
 * Creates the shield-shaped geometry for the XOR gate body.
 * Similar to OR gate but will have an additional line element.
 *
 * @returns BufferGeometry for the extruded XOR gate shape
 */
function createXorGateGeometry(): BufferGeometry {
  const shape = new Shape()
  // Shield/rocket shape - curved back, pointed front
  shape.moveTo(-0.5, 0.4) // Top left
  shape.quadraticCurveTo(-0.3, 0, -0.5, -0.4) // Curved left side (concave)
  shape.lineTo(0.3, -0.4) // Bottom edge
  shape.quadraticCurveTo(0.6, 0, 0.3, 0.4) // Pointed right side
  shape.lineTo(-0.5, 0.4) // Back to top

  const extrudeSettings = {
    depth: XOR_DIMENSIONS.depth,
    bevelEnabled: false,
  }

  return new ExtrudeGeometry(shape, extrudeSettings)
}

// Memoize the geometry to avoid recreating it on each render
const xorGateGeometry = createXorGateGeometry()

/**
 * Calculates the input and output pin X positions for the XOR gate.
 * Input pins are further out than OR gate due to the extra curved line.
 *
 * @returns Object with inputPinX and outputPinX coordinates
 */
function calculateXorPinPositions() {
  // Input pins on left side of shield (further out due to extra line)
  const inputPinX = -0.75
  // Output pin on right side of shield
  const outputPinX = 0.55
  return { inputPinX, outputPinX }
}

/**
 * Creates pin configuration objects for an XOR gate instance.
 * Generates configurations for two input pins and one output pin.
 *
 * @param gateId - Unique identifier for the gate instance
 * @param inputA - Current boolean value of the first input
 * @param inputB - Current boolean value of the second input
 * @param inputAConnected - Whether the first input is connected to a wire
 * @param inputBConnected - Whether the second input is connected to a wire
 * @param output - Current boolean value of the output (result of XOR operation)
 * @param outputConnected - Whether the output is connected to a wire
 * @returns Array of PinConfig objects for the XOR gate's three pins
 */
export function createXorPinConfigs(
  gateId: string,
  inputA: boolean,
  inputB: boolean,
  inputAConnected: boolean,
  inputBConnected: boolean,
  output: boolean,
  outputConnected: boolean
): PinConfig[] {
  const { inputPinX, outputPinX } = calculateXorPinPositions()
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
 * Creates wire stub positions for an XOR gate.
 * Returns positions for three wire stubs (two inputs, one output).
 *
 * @returns Array of 3D coordinate tuples for wire stub positions
 */
export function createXorWireStubs(): [number, number, number][] {
  const { inputPinX, outputPinX } = calculateXorPinPositions()
  return [
    [inputPinX - 0.15, 0.2, 0],
    [inputPinX - 0.15, -0.2, 0],
    [outputPinX + 0.15, 0, 0],
  ]
}

/**
 * XOR gate text label configuration.
 * Defines the label text, position, and font size for the gate's visual label.
 */
export const XOR_TEXT_CONFIG = {
  label: 'XOR',
  position: [0, 0, -0.21] as [number, number, number],
  fontSize: 0.24,
} as const

/**
 * XOR gate geometry configuration.
 * Uses pre-built extruded geometry for the custom shield shape.
 */
export const XOR_GEOMETRY = {
  type: 'extrude' as const,
  geometry: xorGateGeometry,
  position: [0, 0, -0.2] as [number, number, number],
} as const

/**
 * Creates the extra curved line element that distinguishes XOR from OR gate.
 * This line is positioned to the left of the main shield shape.
 *
 * @returns React node containing the 3D mesh for the additional line
 */
export function createXorAdditionalElements(): ReactNode {
  return (
    <mesh position={[-0.65, 0, 0]}>
      <boxGeometry args={[0.05, 0.7, 0.4]} />
      <meshStandardMaterial
        color={XOR_COLORS.body}
        metalness={materials.gate.metalness}
        roughness={materials.gate.roughness}
      />
    </mesh>
  )
}
