import { notify } from '@/lib/notify'
import type {
  BusActions,
  BusComponent,
  BusComponentKind,
  Position,
  CircuitStore,
} from '../../types'
import { createBusPins } from './busPins'

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

// `_get` becomes `get` in Task 5 (wire re-route on move).
export const createBusActions = (set: SetState, _get: GetState): BusActions => ({
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
