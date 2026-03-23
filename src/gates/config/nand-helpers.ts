// NAND gate helper functions
import type { PinConfig } from '../types'
import {
  COMMON_DIMENSIONS,
  calculateBodyBoundaries,
  calculateInputPinX,
  calculateBubblePosition,
  calculateBubbleOutputPinX,
  createTwoInputPinConfigs,
  createTwoInputWireStubs,
} from './common'

/**
 * Calculates the input and output pin X positions for the NAND gate.
 * Accounts for the negation bubble on the output side.
 *
 * @returns Object with inputPinX, outputPinX, and bubbleCenterX coordinates
 */
export function calculateNandPinPositions() {
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
 * @param inputA - First input signal (0 or 1 for single-bit)
 * @param inputB - Second input signal (0 or 1 for single-bit)
 * @param inputAConnected - Whether the first input is connected to a wire
 * @param inputBConnected - Whether the second input is connected to a wire
 * @param output - Output signal from NAND preview (0 or 1 for single-bit)
 * @param outputConnected - Whether the output is connected to a wire
 * @returns Array of PinConfig objects for the NAND gate's three pins
 */
export function createNandPinConfigs(
  gateId: string,
  inputA: number,
  inputB: number,
  inputAConnected: boolean,
  inputBConnected: boolean,
  output: number,
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
