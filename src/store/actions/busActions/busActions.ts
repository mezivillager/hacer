import { notify } from '@/lib/notify'
import type {
  BusActions,
  BusComponent,
  BusComponentKind,
  Position,
  CircuitStore,
  WireEndpoint,
} from '../../types'
import { createBusPins } from './busPins'
import { calculateWirePath } from '@/utils/wiringScheme/core'
import { collectWireSegments, combineAdjacentSegments } from '@/utils/wiringScheme/segments'
import { resolveCrossings } from '@/utils/wiringScheme/crossing'
import { calculateNodePinPosition } from '@/nodes/config'
import { preserveJunctions } from '../junctionUtils'

type SetState = (
  fn: (state: CircuitStore) => void,
  replace?: false,
  actionName?: string
) => void
type GetState = () => CircuitStore

function generateBusId(kind: BusComponentKind): string {
  return `bus-${kind}-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`
}

/** Bus width must be an integer >= 2 (a 1-bit "bus" is just a wire). */
function isValidBusWidth(width: number): boolean {
  return Number.isInteger(width) && width >= 2
}

function createBusComponent(
  kind: BusComponentKind,
  width: number,
  position: Position,
): BusComponent {
  const { inputs, outputs } = createBusPins(kind, width)
  return {
    id: generateBusId(kind),
    kind,
    position,
    rotation: { x: 0, y: 0, z: 0 },
    width,
    inputs,
    outputs,
    selected: false,
  }
}

export const createBusActions = (set: SetState, get: GetState): BusActions => ({
  placeBusSplitter: (width, position) => {
    if (!isValidBusWidth(width)) {
      notify.warning(`Invalid bus width ${width}: must be an integer >= 2`)
      return null
    }
    const component = createBusComponent('splitter', width, position)
    set((state) => {
      state.busComponents.push(component)
    }, false, 'placeBusSplitter')
    return component
  },

  placeBusJoiner: (width, position) => {
    if (!isValidBusWidth(width)) {
      notify.warning(`Invalid bus width ${width}: must be an integer >= 2`)
      return null
    }
    const component = createBusComponent('joiner', width, position)
    set((state) => {
      state.busComponents.push(component)
    }, false, 'placeBusJoiner')
    return component
  },

  updateBusComponentPosition: (id, position) => {
    set((state) => {
      const component = state.busComponents.find((c) => c.id === id)
      if (component) component.position = position
    }, false, 'updateBusComponentPosition')
    recalculateWiresForBusComponent(set, get, id)
  },

  removeBusComponent: (id) => {
    set((state) => {
      const index = state.busComponents.findIndex((c) => c.id === id)
      if (index === -1) return
      state.busComponents.splice(index, 1)
      state.wires = state.wires.filter(
        (w) =>
          !(w.from.type === 'bus' && w.from.entityId === id) &&
          !(w.to.type === 'bus' && w.to.entityId === id),
      )
    }, false, 'removeBusComponent')
  },

  selectBus: (busId) => {
    set((state) => {
      state.selectedBusId = busId
      state.busComponents.forEach((c) => { c.selected = (c.id === busId) })
      state.selectedGateId = null
      state.selectedWireId = null
      state.selectedNodeId = null
      state.selectedNodeType = null
      state.gates.forEach((g) => { g.selected = false })
    }, false, 'selectBus')
  },
})

function endpointWorldPosition(endpoint: WireEndpoint, state: CircuitStore): Position | null {
  switch (endpoint.type) {
    case 'gate':
    case 'bus':
      return endpoint.pinId ? state.getPinWorldPosition(endpoint.entityId, endpoint.pinId) : null
    case 'input': {
      const node = state.inputNodes.find((n) => n.id === endpoint.entityId)
      if (!node) return null
      const off = calculateNodePinPosition('input')
      return { x: node.position.x + off.x, y: 0.2, z: node.position.z + off.z }
    }
    case 'output': {
      const node = state.outputNodes.find((n) => n.id === endpoint.entityId)
      if (!node) return null
      const off = calculateNodePinPosition('output')
      return { x: node.position.x + off.x, y: 0.2, z: node.position.z + off.z }
    }
    case 'junction': {
      // I1: Resolve junction endpoints so bus↔junction wires are not silently
      // skipped when the bus moves.  The orientation is determined inline in
      // recalculateWiresForBusComponent based on which side (from/to) the
      // junction occupies.
      const junction = state.junctions.find((j) => j.id === endpoint.entityId)
      return junction ? { ...junction.position, y: 0.2 } : null
    }
    default:
      return null
  }
}

function endpointOrientation(
  endpoint: WireEndpoint,
  state: CircuitStore,
): { x: number; y: number; z: number } | null {
  switch (endpoint.type) {
    case 'gate':
    case 'bus':
      return endpoint.pinId ? state.getPinOrientation(endpoint.entityId, endpoint.pinId) : null
    case 'input':
      return { x: 1, y: 0, z: 0 }
    case 'output':
      return { x: -1, y: 0, z: 0 }
    default:
      return null
  }
}

/**
 * Recompute segments for every wire touching a moved bus component so the wires
 * follow it.
 *
 * Mirrors nodeActions.recalculateWiresForNode:
 *   - Branch wires (those tracked by a junction) are skipped in the main loop
 *     and rebuilt by preserveJunctions instead, so moving a bus does not break
 *     junction topology.
 *   - I1: Junction endpoints are resolved (position + inline orientation) so
 *     bus↔junction wires are not silently skipped on re-route.
 *   - B-003 guard: an empty/failed re-route keeps existing segments rather than
 *     orphaning the wire.
 */
function recalculateWiresForBusComponent(set: SetState, get: GetState, busId: string): void {
  const connectedWires = get().wires.filter(
    (w) =>
      (w.from.type === 'bus' && w.from.entityId === busId) ||
      (w.to.type === 'bus' && w.to.entityId === busId),
  )
  if (connectedWires.length === 0) return

  // Build branch-wire → junction map (mirrors nodeActions.ts pattern).
  const initialState = get()
  const branchWireToJunctionId = new Map<string, string>()
  const trunkToBranches = new Map<string, Set<string>>()
  for (const junction of initialState.junctions) {
    const trunkId = junction.wireIds[0]
    if (trunkId) {
      const branches = new Set(junction.wireIds.slice(1))
      trunkToBranches.set(trunkId, branches)
    }
    for (const branchWireId of junction.wireIds.slice(1)) {
      branchWireToJunctionId.set(branchWireId, junction.id)
    }
  }

  const recalculatedTrunkIds = new Set<string>()

  for (const wire of connectedWires) {
    // Skip branch wires — they will be rebuilt by preserveJunctions below so
    // that junction topology is maintained after the bus moves.
    if (branchWireToJunctionId.has(wire.id)) continue

    try {
      const fresh = get()
      const fromPos = endpointWorldPosition(wire.from, fresh)
      const fromOri = endpointOrientation(wire.from, fresh)
      const toPos = endpointWorldPosition(wire.to, fresh)
      const toOri = endpointOrientation(wire.to, fresh)

      // I1: endpointOrientation returns null for junction endpoints; supply a
      //     reasonable orientation inline based on which side the junction is on.
      //     Junction-as-source (from) points rightward (+x); junction-as-destination
      //     (to) points leftward (-x) — matches the convention in nodeActions.ts.
      const resolvedFromOri = fromOri ?? (wire.from.type === 'junction' && fromPos ? { x: 1, y: 0, z: 0 } : null)
      const resolvedToOri = toOri ?? (wire.to.type === 'junction' && toPos ? { x: -1, y: 0, z: 0 } : null)

      if (!fromPos || !resolvedFromOri || !toPos || !resolvedToOri) continue

      const branchesToExclude = trunkToBranches.get(wire.id) ?? new Set<string>()
      const existingSegments = collectWireSegments(
        fresh.wires,
        (w) => w.id !== wire.id && !branchesToExclude.has(w.id),
      )

      const newPath = calculateWirePath(
        fromPos,
        { type: 'pin', pin: toPos, orientation: { direction: resolvedToOri } },
        { direction: resolvedFromOri },
        fresh.gates,
        { existingSegments },
      )

      let resolvedSegments = newPath.segments
      let crossedWireIds: string[] = []
      try {
        const nonBranchWires = fresh.wires.filter((w) => w.id !== wire.id && !branchesToExclude.has(w.id))
        const result = resolveCrossings(newPath.segments, nonBranchWires)
        resolvedSegments = result.segments
        crossedWireIds = result.crossedWireIds
      } catch {
        // keep unresolved segments
      }

      const combined = combineAdjacentSegments(resolvedSegments)
      if (combined.length > 0) {
        fresh.updateWireSegments(wire.id, combined, crossedWireIds)
        recalculatedTrunkIds.add(wire.id)
      } else {
        console.warn(
          `[recalculateWiresForBusComponent] Empty re-route for wire ${wire.id}; preserving existing segments.`,
        )
      }
    } catch (error) {
      console.error(
        `[recalculateWiresForBusComponent] Failed to recalculate wire ${wire.id}; preserving existing segments:`,
        error,
      )
    }
  }

  // Collect junctions whose branch wires were skipped above so preserveJunctions
  // can rebuild them after the trunk wires have been re-routed.
  const skippedBranchJunctionIds = new Set<string>()
  for (const wire of connectedWires) {
    const junctionId = branchWireToJunctionId.get(wire.id)
    if (junctionId) skippedBranchJunctionIds.add(junctionId)
  }

  // Preserve junctions — relocate + rebuild branches for affected junctions
  // (mirrors the call in recalculateWiresForNode).
  preserveJunctions(recalculatedTrunkIds, skippedBranchJunctionIds, set, get, 'recalculateWiresForBusComponent')
}
