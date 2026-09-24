/**
 * Placement constants the recovered scenarios imported from e2e config.
 * Geometry only — the core driver does not read it.
 */

/** World-space point. */
export interface Position3D {
  x: number
  y: number
  z: number
}

/** Y for a flat gate body (half its depth). */
export const GATE_Y = 0.2

/** The points `circuitBuilding` and `simulation` place gates on. */
export const DEFAULT_POSITIONS = {
  center: { x: 2, y: GATE_Y, z: 2 },
  left: { x: -2, y: GATE_Y, z: 2 },
  right: { x: 6, y: GATE_Y, z: 2 },
} as const
