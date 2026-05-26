/**
 * Schematic-style label sizing presets for 3D floating labels.
 *
 * `fontSize` is retained for parity with the previous SDF Billboard renderer
 * (which scaled in world units); the current DOM-overlay implementation in
 * `FloatingLabel.tsx` ignores it but the presets keep it documented in case
 * we re-introduce a world-space variant later. `offsetY` is body half-height
 * plus a small (~0.20) gap so labels sit just above the bounding box.
 *
 * Kept in its own module so `FloatingLabel.tsx` stays HMR-clean
 * (react-refresh/only-export-components).
 */
export const LABEL_GEOMETRY = {
  /** Input/output node body is 0.5×0.5×0.5 (see `nodes/config/nodeConfig.ts`). */
  NODE: { fontSize: 0.18, offsetY: 0.45 },
  /** Gate body height ≈ 0.8 (see `gates/config/common.ts:COMMON_DIMENSIONS`). */
  GATE: { fontSize: 0.22, offsetY: 0.6 },
  // Junction labels intentionally absent: junctions are tap points on a
  // shared net, not user-meaningful entities, and a per-junction label
  // adds noise without distinguishing one tap from another.
} as const
