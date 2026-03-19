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

/**
 * App entry with demo tour suppressed (`DemoOverlay` reads `notour=1`).
 * Keeps Playwright clicks on sidebar/canvas from competing with the tour card.
 */
export const APP_ENTRY_URL = '/?notour=1'

/** Grid cell size in world units */
export const GRID_SIZE = 2.0

/** Y position for flat gates (BODY_DEPTH / 2) */
export const GATE_Y = 0.2

/**
 * Default positions for gate placement in tests.
 * All positions use odd grid coordinates (section interiors)
 * to comply with grid placement rules.
 *
 * Grid conversion: row = Math.round(z / GRID_SIZE), col = Math.round(x / GRID_SIZE)
 * Valid positions require both row and col to be odd.
 * Examples: {x: 2, z: 2} → {row: 1, col: 1} ✓, {x: -2, z: -2} → {row: -1, col: -1} ✓
 */
export const DEFAULT_POSITIONS = {
  center: { x: 2, y: GATE_Y, z: 2 }, // {row: 1, col: 1}
  left: { x: -2, y: GATE_Y, z: 2 }, // {row: 1, col: -1}
  right: { x: 6, y: GATE_Y, z: 2 }, // {row: 1, col: 3}
  farLeft: { x: -6, y: GATE_Y, z: 2 }, // {row: 1, col: -3}
  farRight: { x: 10, y: GATE_Y, z: 2 }, // {row: 1, col: 5}
  top: { x: 2, y: GATE_Y, z: -2 }, // {row: -1, col: 1}
  bottom: { x: 2, y: GATE_Y, z: 6 }, // {row: 3, col: 1}
  topLeft: { x: -2, y: GATE_Y, z: -2 }, // {row: -1, col: -1}
  topRight: { x: 6, y: GATE_Y, z: -2 }, // {row: -1, col: 3}
  bottomLeft: { x: -2, y: GATE_Y, z: 6 }, // {row: 3, col: -1}
  bottomRight: { x: 6, y: GATE_Y, z: 6 }, // {row: 3, col: 3}
} as const

export type Position3D = { x: number; y: number; z: number }

/** All available gate types for parameterized tests */
export const ALL_GATE_TYPES = ['NAND', 'AND', 'OR', 'NOT', 'XOR'] as const

/** Two-input gate types */
export const TWO_INPUT_GATES = ['NAND', 'AND', 'OR', 'XOR'] as const

/** Single-input gate types */
export const SINGLE_INPUT_GATES = ['NOT'] as const

export type GateType = (typeof ALL_GATE_TYPES)[number]
