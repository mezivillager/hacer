import { describe, it, expect } from 'vitest'
import type { WiringState } from '@/store/types'
import { canDragPart, type DragLockState } from './canDragPart'

const A_WIRE: WiringState = {
  fromGateId: 'g1',
  fromPinId: 'out',
  fromPinType: 'output',
  fromPosition: { x: 0, y: 0, z: 0 },
  previewEndPosition: null,
  destinationGateId: null,
  destinationPinId: null,
  destinationNodeId: null,
  destinationNodeType: null,
  segments: null,
}

const IDLE: DragLockState = {
  wiringFrom: null,
  placementMode: null,
  nodePlacementMode: null,
  junctionPlacementMode: null,
  busPlacementMode: null,
}

const NOTHING: Partial<DragLockState> = {}
const GATE: Partial<DragLockState> = { placementMode: 'Nand' }
const NODE: Partial<DragLockState> = { nodePlacementMode: 'INPUT' }
const JUNCTION: Partial<DragLockState> = { junctionPlacementMode: true }
const BUS: Partial<DragLockState> = { busPlacementMode: 'splitter' }

const TABLE = [
  { placing: 'nothing', mode: NOTHING, wiring: false, canDrag: true },
  { placing: 'nothing', mode: NOTHING, wiring: true, canDrag: false },
  { placing: 'a gate', mode: GATE, wiring: false, canDrag: false },
  { placing: 'a gate', mode: GATE, wiring: true, canDrag: false },
  { placing: 'a node', mode: NODE, wiring: false, canDrag: false },
  { placing: 'a node', mode: NODE, wiring: true, canDrag: false },
  { placing: 'a junction', mode: JUNCTION, wiring: false, canDrag: false },
  { placing: 'a junction', mode: JUNCTION, wiring: true, canDrag: false },
  { placing: 'a bus component', mode: BUS, wiring: false, canDrag: false },
  { placing: 'a bus component', mode: BUS, wiring: true, canDrag: false },
]

describe('canDragPart, the one drag lock for input nodes, output nodes and bus components', () => {
  it.each(TABLE)('placing $placing, wire being drawn: $wiring → can drag: $canDrag', ({ mode, wiring, canDrag }) => {
    expect(canDragPart({ ...IDLE, ...mode, wiringFrom: wiring ? A_WIRE : null })).toBe(canDrag)
  })
})
