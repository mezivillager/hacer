import { useCircuitStore } from '@/store/circuitStore'

export type ContextMode = 'default' | 'selecting' | 'wiring' | 'moving'

/**
 * Derives the current interaction mode from store state. Drives the
 * contextual hints shown in HelpBar.
 *
 * Priority: moving > wiring > selecting > default.
 */
export function useContextMode(): ContextMode {
  const placementMode = useCircuitStore((s) => s.placementMode)
  const nodePlacementMode = useCircuitStore((s) => s.nodePlacementMode)
  const junctionPlacementMode = useCircuitStore((s) => s.junctionPlacementMode)
  const wiringFrom = useCircuitStore((s) => s.wiringFrom)
  const hasSelection = useCircuitStore(
    (s) =>
      s.selectedGateId !== null || s.selectedWireId !== null || s.selectedNodeId !== null,
  )

  if (placementMode !== null || nodePlacementMode !== null || junctionPlacementMode === true) {
    return 'moving'
  }
  if (wiringFrom !== null) return 'wiring'
  if (hasSelection) return 'selecting'
  return 'default'
}
