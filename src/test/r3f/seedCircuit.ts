import { useCircuitStore } from '@/store/circuitStore'
import { calculateWirePathFromConnection } from '@/utils/wiringScheme/core'
import type { Wire } from '@/store/types'
import type { WireSegment } from '@/utils/wiringScheme/types'

/** Reset the live store to an empty circuit between tests. */
export function resetCircuitStore(): void {
  useCircuitStore.setState({
    gates: [],
    wires: [],
    inputNodes: [],
    outputNodes: [],
    junctions: [],
    selectedGateId: null,
    selectedWireId: null,
    selectedNodeId: null,
    selectedNodeType: null,
    wiringFrom: null,
    simulationRunning: false,
  })
}

/**
 * Wire two gate pins using the SAME routing computation the app uses
 * (calculateWirePathFromConnection, deconflicting against all existing wire
 * segments), then commit the routed segments via addWire. Returns the Wire.
 *
 * Crossing-hop resolution (resolveCrossings) is intentionally NOT applied here:
 * it is a separate rendering concern with its own extensive unit coverage
 * (crossing.test.ts) and would inject arcs/junctions that obscure the routing
 * geometry these tests assert. These tests target routing-path geometry.
 */
export function wireGatePins(
  fromGateId: string,
  fromPinId: string,
  toGateId: string,
  toPinId: string,
): Wire {
  const state = useCircuitStore.getState()
  const existingSegments: WireSegment[] = state.wires.flatMap((w) => w.segments)
  const path = calculateWirePathFromConnection(fromGateId, fromPinId, toGateId, toPinId, {
    gates: state.gates,
    getPinWorldPosition: state.getPinWorldPosition,
    getPinOrientation: state.getPinOrientation,
    existingSegments,
  })
  if (!path) {
    throw new Error(`Failed to route wire ${fromGateId}.${fromPinId} -> ${toGateId}.${toPinId}`)
  }
  return state.addWire(
    { type: 'gate', entityId: fromGateId, pinId: fromPinId },
    { type: 'gate', entityId: toGateId, pinId: toPinId },
    path.segments,
  )
}
