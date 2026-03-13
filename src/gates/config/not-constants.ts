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
 * Defines the label text, position, and font size for the gate's visual label.
 */
export const NOT_TEXT_CONFIG = {
  label: 'NOT',
  position: [0, 0, -0.21] as [number, number, number],
  fontSize: 0.22,
} as const
