import { useCircuitStore, circuitActions } from '@/store/circuitStore'
import type { Position, NodeType } from '@/store/types'

/**
 * Check if a pin is connected to any wire
 */
export function isPinConnected(gateId: string, pinId: string): boolean {
  const wires = useCircuitStore.getState().wires
  return wires.some(
    w =>
      (w.from.type === 'gate' && w.from.entityId === gateId && w.from.pinId === pinId) ||
      (w.to.type === 'gate' && w.to.entityId === gateId && w.to.pinId === pinId)
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
    // Check source type to route to appropriate completion action
    const source = currentWiringFrom.source
    if (source && (source.type === 'input' || source.type === 'constant')) {
      // Node-to-gate wiring
      circuitActions.completeWiringFromNodeToGate(gateId, pinId, pinType)
    } else if (source && source.type === 'junction') {
      // Junction-to-gate wiring
      circuitActions.completeWiringFromJunction(gateId, pinId, pinType)
    } else {
      // Gate-to-gate wiring (or no source specified, fallback to gate-to-gate)
      circuitActions.completeWiring(gateId, pinId, pinType)
    }
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

/**
 * Handle input node toggle - flip the value of an input node
 */
export function handleInputNodeToggle(nodeId: string): void {
  const currentInputNodes = useCircuitStore.getState().inputNodes
  const node = currentInputNodes.find(n => n.id === nodeId)
  if (node) {
    circuitActions.updateInputNodeValue(nodeId, !node.value)
  }
}

/**
 * Handle node body click - select node if not wiring
 */
export function handleNodeClick(nodeId: string, nodeType: NodeType): void {
  const currentWiringFrom = useCircuitStore.getState().wiringFrom
  if (!currentWiringFrom) {
    circuitActions.selectNode(nodeId, nodeType)
  }
}

/**
 * Handle node pin click - start or complete wiring from/to node pins
 *
 * @param nodeId - The node's ID
 * @param nodeType - The type of node (input, output, constant)
 * @param worldPosition - The pin's position in world coordinates
 */
export function handleNodePinClick(
  nodeId: string,
  nodeType: NodeType,
  worldPosition: Position
): void {
  const currentWiringFrom = useCircuitStore.getState().wiringFrom
  if (currentWiringFrom) {
    // Check source type
    const source = currentWiringFrom.source
    if (source && source.type === 'junction') {
      // Junction-to-node wiring
      if (nodeType === 'output') {
        circuitActions.completeWiringFromJunctionToNode(nodeId, nodeType)
      }
    } else {
      // Complete wiring to node (only output nodes can be wire destinations)
      if (nodeType === 'output') {
        circuitActions.completeWiringToNode(nodeId, nodeType)
      }
    }
    // If not an output node, do nothing (wiring continues)
  } else {
    // Start wiring from node (only input and constant nodes can be wire sources)
    if (nodeType === 'input' || nodeType === 'constant') {
      circuitActions.startWiringFromNode(nodeId, nodeType, worldPosition)
    }
    // If output node, do nothing (can't start wiring from output)
  }
}

/**
 * Handle junction click - start wiring from junction
 *
 * @param junctionId - The junction's ID
 * @param position - The junction's position in world coordinates
 */
export function handleJunctionClick(junctionId: string, position: Position): void {
  const currentWiringFrom = useCircuitStore.getState().wiringFrom
  const isPlacingJunction = useCircuitStore.getState().junctionPlacementMode === true

  // Don't start wiring if in junction placement mode
  if (isPlacingJunction) {
    return
  }

  // Don't start wiring if already wiring
  if (currentWiringFrom) {
    return
  }

  // Start wiring from junction
  circuitActions.startWiringFromJunction(junctionId, position)
}
