import { useCircuitStore, circuitActions } from '@/store/circuitStore'
import type { Position } from '@/store/types'

/**
 * Check if a pin is connected to any wire
 */
export function isPinConnected(gateId: string, pinId: string): boolean {
  const wires = useCircuitStore.getState().wires
  return wires.some(
    w =>
      (w.fromGateId === gateId && w.fromPinId === pinId) ||
      (w.toGateId === gateId && w.toPinId === pinId)
  )
}

/**
 * Handle pin click - either complete wiring or start wiring
 */
export function handlePinClick(
  gateId: string,
  pinId: string,
  pinType: 'input' | 'output',
  worldPosition: Position
): void {
  // Get current wiring state from store to avoid stale closure
  const currentWiringFrom = useCircuitStore.getState().wiringFrom
  if (currentWiringFrom) {
    circuitActions.completeWiring(gateId, pinId, pinType)
  } else {
    circuitActions.startWiring(gateId, pinId, pinType, worldPosition)
  }
}

/**
 * Handle input pin toggle (shift+click)
 */
export function handleInputToggle(gateId: string, pinId: string): void {
  const currentGates = useCircuitStore.getState().gates
  const gate = currentGates.find(g => g.id === gateId)
  if (gate) {
    const pin = gate.inputs.find(p => p.id === pinId)
    if (pin) {
      circuitActions.setInputValue(gateId, pinId, !pin.value)
    }
  }
}

/**
 * Handle gate body click - select gate if not wiring
 */
export function handleGateClick(gateId: string): void {
  const currentWiringFrom = useCircuitStore.getState().wiringFrom
  if (!currentWiringFrom) {
    circuitActions.selectGate(gateId)
  }
}
