/**
 * E2E Test Constants
 *
 * Centralized configuration values for timeouts, positions,
 * and other frequently used constants across e2e tests.
 */

export const TIMEOUTS = {
  default: 30000,
  selector: 10000,
  scene: 10000,
  store: 5000,
  animation: 100,
  simulation: 200,
  simulationSettle: 500,
} as const

/** Grid cell size in world units */
export const GRID_SIZE = 2.0

/** Y position for flat gates (BODY_DEPTH / 2) */
export const GATE_Y = 0.2

/**
 * Default positions for gate placement in tests.
 * All positions use odd grid coordinates (section interiors)
 * to comply with grid placement rules.
 */
export const DEFAULT_POSITIONS = {
  center: { x: 1, y: GATE_Y, z: 1 },
  left: { x: -1, y: GATE_Y, z: 1 },
  right: { x: 3, y: GATE_Y, z: 1 },
  farLeft: { x: -3, y: GATE_Y, z: 1 },
  farRight: { x: 5, y: GATE_Y, z: 1 },
  top: { x: 1, y: GATE_Y, z: -1 },
  bottom: { x: 1, y: GATE_Y, z: 3 },
  topLeft: { x: -1, y: GATE_Y, z: -1 },
  topRight: { x: 3, y: GATE_Y, z: -1 },
  bottomLeft: { x: -1, y: GATE_Y, z: 3 },
  bottomRight: { x: 3, y: GATE_Y, z: 3 },
} as const

export type Position3D = { x: number; y: number; z: number }

/** All available gate types for parameterized tests */
export const ALL_GATE_TYPES = ['NAND', 'AND', 'OR', 'NOT', 'XOR'] as const

/** Two-input gate types */
export const TWO_INPUT_GATES = ['NAND', 'AND', 'OR', 'XOR'] as const

/** Single-input gate types */
export const SINGLE_INPUT_GATES = ['NOT'] as const

export type GateType = (typeof ALL_GATE_TYPES)[number]
