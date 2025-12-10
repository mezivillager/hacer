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

export const DEFAULT_POSITIONS = {
  center: { x: 0, y: 0.4, z: 0 },
  left: { x: -1, y: 0.4, z: 0 },
  right: { x: 1, y: 0.4, z: 0 },
  farLeft: { x: -2, y: 0.4, z: 0 },
  farRight: { x: 2, y: 0.4, z: 0 },
} as const

export type Position3D = { x: number; y: number; z: number }
