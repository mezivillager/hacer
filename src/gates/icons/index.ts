import type { GateType } from '@/store/types'
import { NandIcon } from './NandIcon'
import { AndIcon } from './AndIcon'
import { OrIcon } from './OrIcon'
import { NotIcon } from './NotIcon'

export { NandIcon } from './NandIcon'
export { AndIcon } from './AndIcon'
export { OrIcon } from './OrIcon'
export { NotIcon } from './NotIcon'

// Map gate types to their icon components
export const gateIcons: Record<string, React.ComponentType<{ size?: number; color?: string }>> = {
  NAND: NandIcon,
  AND: AndIcon,
  OR: OrIcon,
  NOT: NotIcon,
}

// Get icon component for a gate type
export function getGateIcon(type: GateType) {
  return gateIcons[type] ?? NandIcon
}
