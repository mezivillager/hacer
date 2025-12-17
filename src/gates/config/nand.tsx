// NAND gate configuration
import { colors, materials } from '@/theme'
import type { PinConfig } from '../types'
import type { ReactNode } from 'react'
import {
  COMMON_DIMENSIONS,
  COMMON_COLORS,
  calculateBodyBoundaries,
  calculateInputPinX,
  calculateBubblePosition,
  calculateBubbleOutputPinX,
  createTwoInputPinConfigs,
  createTwoInputWireStubs,
} from './common'

/**
 * NAND gate specific colors (purple/magenta tint) - sourced from theme.
 */
export const NAND_COLORS = {
  body: colors.gate.nand.body,
  hover: colors.gate.nand.hover,
  selected: COMMON_COLORS.BODY_SELECTED,
} as const

/**
 * Calculates the input and output pin X positions for the NAND gate.
 * Accounts for the negation bubble on the output side.
 *
 * @returns Object with inputPinX, outputPinX, and bubbleCenterX coordinates
 */
function calculateNandPinPositions() {
  const { LEFT, RIGHT } = calculateBodyBoundaries(COMMON_DIMENSIONS.BODY_WIDTH)
  const inputPinX = calculateInputPinX(LEFT, COMMON_DIMENSIONS.PIN_RADIUS)
  const bubble = calculateBubblePosition(RIGHT, COMMON_DIMENSIONS.BUBBLE_RADIUS)
  const outputPinX = calculateBubbleOutputPinX(bubble.right, COMMON_DIMENSIONS.PIN_RADIUS)
  return { inputPinX, outputPinX, bubbleCenterX: bubble.centerX }
}

/**
 * Creates pin configuration objects for a NAND gate instance.
 * Generates configurations for two input pins and one output pin.
 *
 * @param gateId - Unique identifier for the gate instance
 * @param inputA - Current boolean value of the first input
 * @param inputB - Current boolean value of the second input
 * @param inputAConnected - Whether the first input is connected to a wire
 * @param inputBConnected - Whether the second input is connected to a wire
 * @param output - Current boolean value of the output (result of NAND operation)
 * @param outputConnected - Whether the output is connected to a wire
 * @returns Array of PinConfig objects for the NAND gate's three pins
 */
export function createNandPinConfigs(
  gateId: string,
  inputA: boolean,
  inputB: boolean,
  inputAConnected: boolean,
  inputBConnected: boolean,
  output: boolean,
  outputConnected: boolean
): PinConfig[] {
  const { inputPinX, outputPinX } = calculateNandPinPositions()
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
 * Creates wire stub positions for a NAND gate.
 * Returns positions for three wire stubs (two inputs, one output).
 *
 * @returns Array of 3D coordinate tuples for wire stub positions
 */
export function createNandWireStubs(): [number, number, number][] {
  const { inputPinX, outputPinX } = calculateNandPinPositions()
  return createTwoInputWireStubs(inputPinX, outputPinX)
}

/**
 * NAND gate text label configuration.
 * Defines the label text, position, and font size for the gate's visual label.
 */
export const NAND_TEXT_CONFIG = {
  label: 'NAND',
  position: [0, 0, -COMMON_DIMENSIONS.BODY_DEPTH / 2 - 0.01] as [number, number, number],
  fontSize: 0.2,
} as const

/**
 * NAND gate geometry configuration.
 * Defines the 3D box geometry dimensions for rendering the gate body.
 */
export const NAND_GEOMETRY = {
  type: 'box' as const,
  args: [
    COMMON_DIMENSIONS.BODY_WIDTH,
    COMMON_DIMENSIONS.BODY_HEIGHT,
    COMMON_DIMENSIONS.BODY_DEPTH,
  ] as [number, number, number],
} as const

/**
 * Creates the negation bubble element for the NAND gate.
 * The bubble is positioned just to the right of the gate body.
 *
 * @returns React node containing the 3D mesh for the negation bubble
 */
export function createNandAdditionalElements(): ReactNode {
  const { bubbleCenterX } = calculateNandPinPositions()
  return (
    <mesh position={[bubbleCenterX, 0, 0]}>
      <sphereGeometry args={[COMMON_DIMENSIONS.BUBBLE_RADIUS, 16, 16]} />
      <meshStandardMaterial
        color={NAND_COLORS.body}
        metalness={materials.gate.metalness}
        roughness={materials.gate.roughness}
      />
    </mesh>
  )
}
