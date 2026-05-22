/**
 * Schematic-style label sizing presets for 3D floating labels.
 *
 * Font sizes follow the KiCad/Altium reference-designator convention of
 * roughly 30–40% of the component's smaller body dimension. `offsetY` is
 * body half-height + a small (~0.20) gap, so labels sit just above the
 * bounding box instead of floating high above the scene.
 *
 * Kept in its own module so `FloatingLabel.tsx` stays HMR-clean
 * (react-refresh/only-export-components).
 */
export const LABEL_GEOMETRY = {
  /** Input/output node body is 0.5×0.5×0.5 (see `nodes/config/nodeConfig.ts`). */
  NODE: { fontSize: 0.18, offsetY: 0.45 },
  /** Gate body height ≈ 0.8 (see `gates/config/common.ts:COMMON_DIMENSIONS`). */
  GATE: { fontSize: 0.22, offsetY: 0.6 },
  /** Junction sphere radius 0.08. */
  JUNCTION: { fontSize: 0.14, offsetY: 0.32 },
  /** Wire labels float just above the wire line itself. */
  WIRE: { fontSize: 0.16, offsetY: 0.2 },
} as const
