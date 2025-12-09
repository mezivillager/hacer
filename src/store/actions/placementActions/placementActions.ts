import { circuitStore } from '../../circuitStore'
import type { GateType } from '../../types'
import { gateActions } from '../gateActions/gateActions'

export const placementActions = {
  startPlacement: (type: GateType) => {
    circuitStore.placementMode = type
    circuitStore.selectedGateId = null
  },

  cancelPlacement: () => {
    circuitStore.placementMode = null
  },

  placeGate: (position: { x: number; y: number; z: number }) => {
    if (circuitStore.placementMode) {
      gateActions.addGate(circuitStore.placementMode, position)
      circuitStore.placementMode = null
    }
  },
}
