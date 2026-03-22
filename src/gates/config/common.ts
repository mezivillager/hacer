// Shared gate configuration constants and helpers
import { colors } from '@/theme'
import type { PinConfig } from '../types'

/**
 * Common gate dimensions used across most gates.
 * All values are in world units (Three.js coordinate space).
 */
export const COMMON_DIMENSIONS = {
  BODY_WIDTH: 1.0,
  BODY_HEIGHT: 0.8,
  BODY_DEPTH: 0.4,
  PIN_RADIUS: 0.1,
  BUBBLE_RADIUS: 0.12,
  WIRE_STUB_OFFSET: 0.15, // Distance from pin to wire stub
} as const

/**
 * Common gate colors - uses theme colors where available.
 * Individual gate types have their own colors defined in the theme.
 */
export const COMMON_COLORS = {
  BODY_SELECTED: colors.gate.bodySelected, // '#4a9eff' from theme
} as const

/**
 * Calculates the left and right boundary positions of a gate body.
 * The gate body is centered at the origin, so boundaries are symmetric.
 *
 * @param width - The total width of the gate body in world units
 * @returns Object containing LEFT (negative) and RIGHT (positive) boundary positions
 *
 * @example
 * const { LEFT, RIGHT } = calculateBodyBoundaries(1.0)
 * // LEFT = -0.5, RIGHT = 0.5
 */
export function calculateBodyBoundaries(width: number) {
  return {
    LEFT: -width / 2,
    RIGHT: width / 2,
  }
}

/**
 * Calculates the X position for an input pin on the left side of a gate.
 * The pin is positioned just outside the gate body boundary.
 *
 * @param bodyLeft - The left edge X coordinate of the gate body
 * @param pinRadius - The radius of the pin sphere in world units
 * @returns The X coordinate where the input pin should be centered
 *
 * @example
 * const inputX = calculateInputPinX(-0.5, 0.1)
 * // inputX = -0.6 (pin center is one radius outside the body)
 */
export function calculateInputPinX(bodyLeft: number, pinRadius: number): number {
  return bodyLeft - pinRadius
}

/**
 * Calculates the X position for an output pin on the right side of a gate.
 * The pin is positioned just outside the gate body boundary.
 *
 * @param bodyRight - The right edge X coordinate of the gate body
 * @param pinRadius - The radius of the pin sphere in world units
 * @returns The X coordinate where the output pin should be centered
 *
 * @example
 * const outputX = calculateOutputPinX(0.5, 0.1)
 * // outputX = 0.6 (pin center is one radius outside the body)
 */
export function calculateOutputPinX(bodyRight: number, pinRadius: number): number {
  return bodyRight + pinRadius
}

/**
 * Calculates the position of a negation bubble for inverting gates (NOT, NAND, NOR).
 * The bubble is placed just touching the right edge of the gate body.
 *
 * @param bodyRight - The right edge X coordinate of the gate body
 * @param bubbleRadius - The radius of the negation bubble sphere
 * @returns Object containing centerX (bubble center position) and right (rightmost edge of bubble)
 *
 * @example
 * const bubble = calculateBubblePosition(0.5, 0.12)
 * // bubble.centerX = 0.62, bubble.right = 0.74
 */
export function calculateBubblePosition(bodyRight: number, bubbleRadius: number) {
  const centerX = bodyRight + bubbleRadius
  const right = centerX + bubbleRadius
  return {
    centerX,
    right,
  }
}

/**
 * Calculates the output pin X position when the gate has a negation bubble.
 * The pin is positioned just outside the bubble's right edge.
 *
 * @param bubbleRight - The rightmost X coordinate of the negation bubble
 * @param pinRadius - The radius of the pin sphere in world units
 * @returns The X coordinate where the output pin should be centered
 *
 * @example
 * const outputX = calculateBubbleOutputPinX(0.74, 0.1)
 * // outputX = 0.84 (pin center is one radius outside the bubble)
 */
export function calculateBubbleOutputPinX(bubbleRight: number, pinRadius: number): number {
  return bubbleRight + pinRadius
}

/**
 * Generates the 3D position for a wire stub based on pin position.
 * Wire stubs are short wire segments that visually connect pins to wires.
 *
 * @param pinX - The X coordinate of the pin center
 * @param pinY - The Y coordinate of the pin center
 * @param direction - Which direction the stub extends ('left' for inputs, 'right' for outputs)
 * @param offset - Distance from pin center to stub position (defaults to WIRE_STUB_OFFSET)
 * @returns A 3D coordinate tuple [x, y, z] for the wire stub position
 *
 * @example
 * const stubPos = calculateWireStubPosition(-0.6, 0.2, 'left')
 * // stubPos = [-0.75, 0.2, 0]
 */
export function calculateWireStubPosition(
  pinX: number,
  pinY: number,
  direction: 'left' | 'right' = 'left',
  offset: number = COMMON_DIMENSIONS.WIRE_STUB_OFFSET
): [number, number, number] {
  const stubX = direction === 'left' ? pinX - offset : pinX + offset
  return [stubX, pinY, 0]
}

/**
 * Creates pin configuration objects for gates with two inputs (AND, NAND, OR, XOR).
 * Generates three pins: two inputs (inputA at y=0.2, inputB at y=-0.2) and one output (at y=0).
 *
 * @param gateId - Unique identifier for the gate instance
 * @param inputPinX - X coordinate for both input pins
 * @param outputPinX - X coordinate for the output pin
 * @param inputA - Current boolean value of the first input
 * @param inputB - Current boolean value of the second input
 * @param inputAConnected - Whether the first input is connected to a wire
 * @param inputBConnected - Whether the second input is connected to a wire
 * @param output - Current boolean value of the output
 * @param outputConnected - Whether the output is connected to a wire
 * @returns Array of three PinConfig objects for the gate's pins
 */
export function createTwoInputPinConfigs(
  gateId: string,
  inputPinX: number,
  outputPinX: number,
  inputA: number,
  inputB: number,
  inputAConnected: boolean,
  inputBConnected: boolean,
  output: number,
  outputConnected: boolean
): PinConfig[] {
  return [
    {
      pinId: `${gateId}-in-0`,
      position: [inputPinX, 0.2, 0],
      value: inputA,
      connected: inputAConnected,
      pinType: 'input',
      pinName: 'inputA',
    },
    {
      pinId: `${gateId}-in-1`,
      position: [inputPinX, -0.2, 0],
      value: inputB,
      connected: inputBConnected,
      pinType: 'input',
      pinName: 'inputB',
    },
    {
      pinId: `${gateId}-out-0`,
      position: [outputPinX, 0, 0],
      value: output,
      connected: outputConnected,
      pinType: 'output',
      pinName: 'output',
    },
  ]
}

/**
 * Creates pin configuration objects for gates with one input (NOT).
 * Generates two pins: one input (at y=0) and one output (at y=0).
 *
 * @param gateId - Unique identifier for the gate instance
 * @param inputPinX - X coordinate for the input pin
 * @param outputPinX - X coordinate for the output pin
 * @param input - Current boolean value of the input
 * @param inputConnected - Whether the input is connected to a wire
 * @param output - Current boolean value of the output
 * @param outputConnected - Whether the output is connected to a wire
 * @returns Array of two PinConfig objects for the gate's pins
 */
export function createSingleInputPinConfigs(
  gateId: string,
  inputPinX: number,
  outputPinX: number,
  input: number,
  inputConnected: boolean,
  output: number,
  outputConnected: boolean
): PinConfig[] {
  return [
    {
      pinId: `${gateId}-in-0`,
      position: [inputPinX, 0, 0],
      value: input,
      connected: inputConnected,
      pinType: 'input',
      pinName: 'input',
    },
    {
      pinId: `${gateId}-out-0`,
      position: [outputPinX, 0, 0],
      value: output,
      connected: outputConnected,
      pinType: 'output',
      pinName: 'output',
    },
  ]
}

/**
 * Creates wire stub positions for gates with two inputs.
 * Generates three stub positions corresponding to the three pins.
 *
 * @param inputPinX - X coordinate of the input pins
 * @param outputPinX - X coordinate of the output pin
 * @returns Array of three 3D coordinate tuples for wire stub positions
 */
export function createTwoInputWireStubs(
  inputPinX: number,
  outputPinX: number
): [number, number, number][] {
  return [
    calculateWireStubPosition(inputPinX, 0.2, 'left'),
    calculateWireStubPosition(inputPinX, -0.2, 'left'),
    calculateWireStubPosition(outputPinX, 0, 'right'),
  ]
}

/**
 * Creates wire stub positions for gates with one input.
 * Generates two stub positions corresponding to the two pins.
 *
 * @param inputPinX - X coordinate of the input pin
 * @param outputPinX - X coordinate of the output pin
 * @returns Array of two 3D coordinate tuples for wire stub positions
 */
export function createSingleInputWireStubs(
  inputPinX: number,
  outputPinX: number
): [number, number, number][] {
  return [
    calculateWireStubPosition(inputPinX, 0, 'left'),
    calculateWireStubPosition(outputPinX, 0, 'right'),
  ]
}
