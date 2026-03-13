// NAND gate constants
import { colors } from '@/theme'
import { COMMON_DIMENSIONS, COMMON_COLORS } from './common'

/**
 * NAND gate specific colors (purple/magenta tint) - sourced from theme.
 */
export const NAND_COLORS = {
  body: colors.gate.nand.body,
  hover: colors.gate.nand.hover,
  selected: COMMON_COLORS.BODY_SELECTED,
} as const

/**
 * NAND gate text label configuration.
 * Defines the label text, position, and font size for the gate's visual label.
 */
export const NAND_TEXT_CONFIG = {
  label: 'NAND',
  position: [0, 0, -COMMON_DIMENSIONS.BODY_DEPTH / 2 - 0.01] as [number, number, number],
  fontSize: 0.2,
} as const

/**
 * NAND gate geometry configuration.
 * Defines the 3D box geometry dimensions for rendering the gate body.
 */
export const NAND_GEOMETRY = {
  type: 'box' as const,
  args: [
    COMMON_DIMENSIONS.BODY_WIDTH,
    COMMON_DIMENSIONS.BODY_HEIGHT,
    COMMON_DIMENSIONS.BODY_DEPTH,
  ] as [number, number, number],
} as const
