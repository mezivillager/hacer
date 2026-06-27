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
    default:
      return null // junction endpoints are preserved (not re-routed here)
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
 * follow it. B-003 guard: an empty/failed re-route keeps existing segments
 * rather than orphaning the wire.
 */
function recalculateWiresForBusComponent(set: SetState, get: GetState, busId: string): void {
  const connectedWires = get().wires.filter(
    (w) =>
      (w.from.type === 'bus' && w.from.entityId === busId) ||
      (w.to.type === 'bus' && w.to.entityId === busId),
  )
  if (connectedWires.length === 0) return

  for (const wire of connectedWires) {
    try {
      const fresh = get()
      const fromPos = endpointWorldPosition(wire.from, fresh)
      const fromOri = endpointOrientation(wire.from, fresh)
      const toPos = endpointWorldPosition(wire.to, fresh)
      const toOri = endpointOrientation(wire.to, fresh)
      if (!fromPos || !fromOri || !toPos || !toOri) continue

      const existingSegments = collectWireSegments(fresh.wires, (w) => w.id !== wire.id)
      const newPath = calculateWirePath(
        fromPos,
        { type: 'pin', pin: toPos, orientation: { direction: toOri } },
        { direction: fromOri },
        fresh.gates,
        { existingSegments },
      )

      let resolvedSegments = newPath.segments
      let crossedWireIds: string[] = []
      try {
        const result = resolveCrossings(newPath.segments, fresh.wires.filter((w) => w.id !== wire.id))
        resolvedSegments = result.segments
        crossedWireIds = result.crossedWireIds
      } catch {
        // keep unresolved segments
      }

      const combined = combineAdjacentSegments(resolvedSegments)
      if (combined.length > 0) {
        fresh.updateWireSegments(wire.id, combined, crossedWireIds)
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
}
