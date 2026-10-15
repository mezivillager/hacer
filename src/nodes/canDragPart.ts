import type { CircuitStore } from '@/store/types'

export type DragLockState = Pick<
  CircuitStore,
  'wiringFrom' | 'placementMode' | 'nodePlacementMode' | 'junctionPlacementMode' | 'busPlacementMode'
>

/** Input nodes, output nodes and bus components drag only while no wire is drawn and nothing is being placed. */
export function canDragPart(state: DragLockState): boolean {
  return (
    state.wiringFrom === null &&
    state.placementMode === null &&
    state.nodePlacementMode === null &&
    state.junctionPlacementMode === null &&
    state.busPlacementMode === null
  )
}
