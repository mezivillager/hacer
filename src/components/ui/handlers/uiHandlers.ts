import type { GateType } from '@/store/types'

/**
 * Handle delete selected gate or wire action
 */
export function handleDeleteSelected(
  selectedGateId: string | null,
  selectedWireId: string | null,
  removeGate: (gateId: string) => void,
  removeWire: (wireId: string) => void
): void {
  if (selectedWireId) {
    removeWire(selectedWireId)
  } else if (selectedGateId) {
    removeGate(selectedGateId)
  }
}

/**
 * Handle gate selection in gate selector - toggle placement mode
 */
export function handleGateSelect(
  type: GateType,
  placementMode: GateType | null,
  startPlacement: (type: GateType) => void,
  cancelPlacement: () => void
): void {
  if (placementMode === type) {
    // If already placing this type, cancel placement
    cancelPlacement()
  } else {
    // Start placement for this gate type
    startPlacement(type)
  }
}
