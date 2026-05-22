// NOT gate constants
import { colors } from '@/theme'
import { COMMON_COLORS } from './common'

/**
 * NOT gate specific colors (orange/red tint) - sourced from theme.
 */
export const NOT_COLORS = {
  body: colors.gate.not.body,
  hover: colors.gate.not.hover,
  selected: COMMON_COLORS.BODY_SELECTED,
} as const

/**
 * NOT gate text label configuration.
 *
 * `labelOffsetY` is smaller than the default box-gate value (0.6) because the
 * NOT triangle's visible top at the label's X position (centre) is at world
 * y ≈ 0.2 — interpolated between vertices (-0.4, 0.4) and (0.4, 0) — rather
 * than the theoretical max-Y of 0.4. Using 0.4 here yields the same ~0.2 unit
 * visual gap that I/O nodes have above their cube bodies.
 *
 * `position` and `fontSize` are retained for backward compatibility; the
 * current DOM-overlay label renderer ignores them.
 */
export const NOT_TEXT_CONFIG = {
  label: 'NOT',
  position: [0, 0, -0.21] as [number, number, number],
  fontSize: 0.22,
  labelOffsetY: 0.4,
} as const
