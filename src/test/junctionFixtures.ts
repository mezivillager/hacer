import { useCircuitStore } from '@/store/circuitStore'
import type { Position } from '@/store/types'
import { SECTION_SIZE, WIRE_HEIGHT } from '@/utils/wiringScheme/types'
import type { WireSegment } from '@/utils/wiringScheme/types'

export type BranchTarget =
  | { type: 'gate'; gateId: string; pinId: string }
  | { type: 'output'; nodeId: string }
  | { type: 'bus'; busId: string; pinId: string }

export interface Branch {
  to: BranchTarget
  /** The route from the junction on, as the wire preview stores it on `wiringFrom.segments`. */
  tail: WireSegment[]
}

export interface PlacedJunction {
  junctionId: string
  trunkId: string
  branchIds: string[]
}

/** A trunk route whose vertical and horizontal runs meet at `Z_CORNER`, where `placeJunctionOnWire` accepts a click. */
export function zSegments(): WireSegment[] {
  return [
    { type: 'exit', start: { x: 0.7, y: WIRE_HEIGHT, z: 0 }, end: { x: SECTION_SIZE, y: WIRE_HEIGHT, z: 0 } },
    { type: 'vertical', start: { x: SECTION_SIZE, y: WIRE_HEIGHT, z: 0 }, end: { x: SECTION_SIZE, y: WIRE_HEIGHT, z: -SECTION_SIZE } },
    { type: 'horizontal', start: { x: SECTION_SIZE, y: WIRE_HEIGHT, z: -SECTION_SIZE }, end: { x: 2 * SECTION_SIZE, y: WIRE_HEIGHT, z: -SECTION_SIZE } },
    { type: 'entry', start: { x: 2 * SECTION_SIZE, y: WIRE_HEIGHT, z: -SECTION_SIZE }, end: { x: 2 * SECTION_SIZE + 0.7, y: WIRE_HEIGHT, z: -SECTION_SIZE } },
  ]
}

export const Z_CORNER: Position = { x: SECTION_SIZE, y: WIRE_HEIGHT, z: -SECTION_SIZE }

/** Draws one branch from an existing junction with the app's gesture and returns the new wire's id; throws if the gesture made none. */
export function drawBranch(junctionId: string, branch: Branch): string {
  const store = useCircuitStore.getState()
  const junction = store.junctions.find((j) => j.id === junctionId)
  if (!junction) throw new Error(`drawBranch: no junction ${junctionId}`)
  const before = new Set(store.wires.map((w) => w.id))

  store.startWiringFromJunction(junctionId, junction.position)
  useCircuitStore.setState((state) => {
    if (state.wiringFrom) state.wiringFrom.segments = branch.tail
  })
  const { to } = branch
  if (to.type === 'gate') store.completeWiringFromJunction(to.gateId, to.pinId, 'input')
  else if (to.type === 'output') store.completeWiringFromJunctionToNode(to.nodeId, 'output')
  else store.completeWiringFromJunctionToBus(to.busId, to.pinId)

  const created = useCircuitStore.getState().wires.filter((w) => !before.has(w.id))
  if (created.length !== 1) {
    throw new Error(`drawBranch: the junction gesture created ${created.length} wires, expected 1`)
  }
  return created[0].id
}

/** Places a junction on `trunkId` at `corner` and draws each branch from it, all through the store's actions. */
export function placeJunction(trunkId: string, corner: Position, branches: Branch[] = []): PlacedJunction {
  const junction = useCircuitStore.getState().placeJunctionOnWire(corner, trunkId)
  return {
    junctionId: junction.id,
    trunkId,
    branchIds: branches.map((branch) => drawBranch(junction.id, branch)),
  }
}
