import { NandIcon } from './NandIcon'
import { AndIcon } from './AndIcon'
import { OrIcon } from './OrIcon'
import { NotIcon } from './NotIcon'
import { XorIcon } from './XorIcon'

export { NandIcon } from './NandIcon'
export { AndIcon } from './AndIcon'
export { OrIcon } from './OrIcon'
export { NotIcon } from './NotIcon'
export { XorIcon } from './XorIcon'

/**
 * Map of canonical chip names to their 2D icon components. Names match the
 * builtin chip registry (`Nand`, `And`, `Or`, `Not`, `Xor`).
 */
export const gateIcons: Record<string, React.ComponentType<{ size?: number; color?: string }>> = {
  Nand: NandIcon,
  And: AndIcon,
  Or: OrIcon,
  Not: NotIcon,
  Xor: XorIcon,
}

/** Look up the 2D icon for a chip name, falling back to the Nand glyph. */
export function getGateIcon(chipName: string) {
  return gateIcons[chipName] ?? NandIcon
}
