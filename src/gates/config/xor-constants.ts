// XOR gate constants
import { colors } from '@/theme'
import { COMMON_COLORS } from './common'

/**
 * XOR gate specific colors (cyan/teal tint) - sourced from theme.
 */
export const XOR_COLORS = {
  body: colors.gate.xor.body,
  hover: colors.gate.xor.hover,
  selected: COMMON_COLORS.BODY_SELECTED,
} as const

/**
 * XOR gate text label configuration.
 * Defines the label text, position, and font size for the gate's visual label.
 */
export const XOR_TEXT_CONFIG = {
  label: 'XOR',
  position: [0, 0, -0.21] as [number, number, number],
  fontSize: 0.24,
} as const
