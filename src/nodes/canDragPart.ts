import type { CircuitStore } from '@/store/types'

export type DragLockState = Pick<
  CircuitStore,
  'wiringFrom' | 'placementMode' | 'nodePlacementMode' | 'junctionPlacementMode' | 'busPlacementMode'
>

export function canDragPart(_state: DragLockState): boolean {
  throw new Error('not implemented')
}
