import type { GateType, NodeType } from '@/store/types'

/**
 * Handle delete selected gate, wire, or node action.
 * Priority order: wire > gate > node
 */
export function handleDeleteSelected(
  selectedGateId: string | null,
  selectedWireId: string | null,
  selectedNodeId: string | null,
  selectedNodeType: NodeType | null,
  removeGate: (gateId: string) => void,
  removeWire: (wireId: string) => void,
  removeInputNode: (nodeId: string) => void,
  removeOutputNode: (nodeId: string) => void
): void {
  if (selectedWireId) {
    removeWire(selectedWireId)
  } else if (selectedGateId) {
    removeGate(selectedGateId)
  } else if (selectedNodeId && selectedNodeType) {
    switch (selectedNodeType) {
      case 'input':
        removeInputNode(selectedNodeId)
        break
      case 'output':
        removeOutputNode(selectedNodeId)
        break
    }
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
