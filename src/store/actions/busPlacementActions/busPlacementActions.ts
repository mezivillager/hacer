import type {
  BusPlacementActions,
  BusComponentKind,
  Position,
  CircuitStore,
} from '../../types'
import { snapToGrid } from '@/utils/grid'

type SetState = (
  fn: (state: CircuitStore) => void,
  replace?: false,
  actionName?: string
) => void
type GetState = () => CircuitStore

/** Default bus width for first-slice placement (the common nand2tetris case). */
const DEFAULT_BUS_WIDTH = 16

export const createBusPlacementActions = (
  set: SetState,
  get: GetState,
): BusPlacementActions => ({
  startBusPlacement: (kind: BusComponentKind) => {
    set((state) => {
      state.busPlacementMode = kind
      state.placementMode = null
      state.nodePlacementMode = null
      state.junctionPlacementMode = null
      state.selectedGateId = null
      state.selectedWireId = null
      state.selectedNodeId = null
      state.selectedNodeType = null
      state.gates.forEach((g) => {
        g.selected = false
      })
    }, false, 'startBusPlacement')
  },

  cancelBusPlacement: () => {
    set((state) => {
      state.busPlacementMode = null
      state.placementPreviewPosition = null
    }, false, 'cancelBusPlacement')
  },

  placeBusComponent: (position: Position) => {
    const mode = get().busPlacementMode
    if (!mode) return
    const snapped = snapToGrid(position)
    if (mode === 'splitter') {
      get().placeBusSplitter(DEFAULT_BUS_WIDTH, snapped)
    } else {
      get().placeBusJoiner(DEFAULT_BUS_WIDTH, snapped)
    }
    set((state) => {
      state.busPlacementMode = null
      state.placementPreviewPosition = null
    }, false, 'placeBusComponent')
  },
})
