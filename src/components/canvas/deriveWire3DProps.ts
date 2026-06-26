import type { CircuitStore, Wire, Position } from '@/store/types'
import type { WirePath } from '@/utils/wiringScheme/types'
import { calculateNodePinPosition } from '@/nodes/config'

export interface DerivedWire3DProps {
  start: Position | null
  end: Position | null
  precomputedPath: WirePath
}

/**
 * Pure wire → Wire3D geometry props. Single source of truth shared by the
 * production CanvasArea and the test-only TestScene so the two cannot drift.
 * Resolves gate endpoints via getPinWorldPosition and node/junction endpoints
 * via their stored positions (matching CanvasArea's prior inline mapping).
 */
export function deriveWire3DProps(wire: Wire, state: CircuitStore): DerivedWire3DProps {
  const precomputedPath: WirePath = {
    segments: wire.segments,
    totalLength: wire.segments.reduce((sum, seg) => {
      const dx = seg.end.x - seg.start.x
      const dy = seg.end.y - seg.start.y
      const dz = seg.end.z - seg.start.z
      return sum + Math.sqrt(dx * dx + dy * dy + dz * dz)
    }, 0),
  }

  let start: Position | null = null
  if (wire.from.type === 'gate' && wire.from.pinId) {
    start = state.getPinWorldPosition(wire.from.entityId, wire.from.pinId)
  } else if (wire.from.type === 'input') {
    const node = state.inputNodes.find((n) => n.id === wire.from.entityId)
    if (node) {
      const off = calculateNodePinPosition('input')
      start = { x: node.position.x + off.x, y: 0.2, z: node.position.z + off.z }
    }
  } else if (wire.from.type === 'junction') {
    const j = state.junctions.find((j) => j.id === wire.from.entityId)
    if (j) start = { ...j.position, y: 0.2 }
  }

  let end: Position | null = null
  if (wire.to.type === 'gate' && wire.to.pinId) {
    end = state.getPinWorldPosition(wire.to.entityId, wire.to.pinId)
  } else if (wire.to.type === 'output') {
    const node = state.outputNodes.find((n) => n.id === wire.to.entityId)
    if (node) {
      const off = calculateNodePinPosition('output')
      end = { x: node.position.x + off.x, y: 0.2, z: node.position.z + off.z }
    }
  } else if (wire.to.type === 'junction') {
    const j = state.junctions.find((j) => j.id === wire.to.entityId)
    if (j) end = { ...j.position, y: 0.2 }
  }

  return { start, end, precomputedPath }
}
