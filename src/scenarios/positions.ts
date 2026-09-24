/** World-space point. Placement only — the core driver does not read it. */
export interface Position3D {
  x: number
  y: number
  z: number
}

/** Flat-gate Y (half the body depth), from the deleted e2e constants. */
export const GATE_Y = 0.2

/** Points the recovered build and simulation scenarios place gates on. */
export const DEFAULT_POSITIONS = {
  center: { x: 2, y: GATE_Y, z: 2 },
  left: { x: -2, y: GATE_Y, z: 2 },
  right: { x: 6, y: GATE_Y, z: 2 },
} as const
