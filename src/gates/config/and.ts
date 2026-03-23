// AND gate configuration
import { colors } from '@/theme'
import type { PinConfig } from '../types'
import {
  COMMON_DIMENSIONS,
  COMMON_COLORS,
  calculateBodyBoundaries,
  calculateInputPinX,
  calculateOutputPinX,
  createTwoInputPinConfigs,
  createTwoInputWireStubs,
} from './common'

/**
 * AND gate specific colors (green tint) - sourced from theme.
 */
export const AND_COLORS = {
  body: colors.gate.and.body,
  hover: colors.gate.and.hover,
  selected: COMMON_COLORS.BODY_SELECTED,
} as const

/**
 * Calculates the input and output pin X positions for the AND gate.
 * Uses standard body dimensions from common configuration.
 *
 * @returns Object with inputPinX and outputPinX coordinates
 */
function calculateAndPinPositions() {
  const { LEFT, RIGHT } = calculateBodyBoundaries(COMMON_DIMENSIONS.BODY_WIDTH)
  const inputPinX = calculateInputPinX(LEFT, COMMON_DIMENSIONS.PIN_RADIUS)
  const outputPinX = calculateOutputPinX(RIGHT, COMMON_DIMENSIONS.PIN_RADIUS)
  return { inputPinX, outputPinX }
}

/**
 * Creates pin configuration objects for an AND gate instance.
 * Generates configurations for two input pins and one output pin.
 *
 * @param gateId - Unique identifier for the gate instance
 * @param inputA - First input signal (0 or 1 for single-bit)
 * @param inputB - Second input signal (0 or 1 for single-bit)
 * @param inputAConnected - Whether the first input is connected to a wire
 * @param inputBConnected - Whether the second input is connected to a wire
 * @param output - Output signal from AND preview (0 or 1 for single-bit)
 * @param outputConnected - Whether the output is connected to a wire
 * @returns Array of PinConfig objects for the AND gate's three pins
 */
export function createAndPinConfigs(
  gateId: string,
  inputA: number,
  inputB: number,
  inputAConnected: boolean,
  inputBConnected: boolean,
  output: number,
  outputConnected: boolean
): PinConfig[] {
  const { inputPinX, outputPinX } = calculateAndPinPositions()
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
 * Creates wire stub positions for an AND gate.
 * Returns positions for three wire stubs (two inputs, one output).
 *
 * @returns Array of 3D coordinate tuples for wire stub positions
 */
export function createAndWireStubs(): [number, number, number][] {
  const { inputPinX, outputPinX } = calculateAndPinPositions()
  return createTwoInputWireStubs(inputPinX, outputPinX)
}

/**
 * AND gate text label configuration.
 * Defines the label text, position, and font size for the gate's visual label.
 */
export const AND_TEXT_CONFIG = {
  label: 'AND',
  position: [0, 0, -COMMON_DIMENSIONS.BODY_DEPTH / 2 - 0.01] as [number, number, number],
  fontSize: 0.25,
} as const

/**
 * AND gate geometry configuration.
 * Defines the 3D box geometry dimensions for rendering the gate body.
 */
export const AND_GEOMETRY = {
  type: 'box' as const,
  args: [
    COMMON_DIMENSIONS.BODY_WIDTH,
    COMMON_DIMENSIONS.BODY_HEIGHT,
    COMMON_DIMENSIONS.BODY_DEPTH,
  ] as [number, number, number],
} as const
