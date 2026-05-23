import type { CircuitState } from '@/store/types'
import {
  CIRCUIT_FORMAT_VERSION,
  type SerializedCircuit,
  type SerializedGate,
  type SerializedInputNode,
  type SerializedJunction,
  type SerializedOutputNode,
  type SerializedWire,
  type SerializedWireSegment,
} from './types'

const cloneVec3 = (v: { x: number; y: number; z: number }) => ({ x: v.x, y: v.y, z: v.z })

function cloneSegment(s: {
  start: { x: number; y: number; z: number }
  end: { x: number; y: number; z: number }
  type: 'horizontal' | 'vertical' | 'entry' | 'exit' | 'arc'
  arcCenter?: { x: number; y: number; z: number }
  arcRadius?: number
  crossedWireId?: string
}): SerializedWireSegment {
  const out: SerializedWireSegment = {
    start: cloneVec3(s.start),
    end: cloneVec3(s.end),
    type: s.type,
  }
  if (s.arcCenter) out.arcCenter = cloneVec3(s.arcCenter)
  if (s.arcRadius !== undefined) out.arcRadius = s.arcRadius
  if (s.crossedWireId) out.crossedWireId = s.crossedWireId
  return out
}

export function serializeCircuit(state: CircuitState, name: string): SerializedCircuit {
  const gates: SerializedGate[] = state.gates.map((g) => ({
    id: g.id,
    type: g.type,
    position: cloneVec3(g.position),
    rotation: cloneVec3(g.rotation),
    width: g.width,
  }))

  const wires: SerializedWire[] = state.wires.map((w) => {
    const out: SerializedWire = {
      id: w.id,
      from: { type: w.from.type, entityId: w.from.entityId, ...(w.from.pinId ? { pinId: w.from.pinId } : {}) },
      to: { type: w.to.type, entityId: w.to.entityId, ...(w.to.pinId ? { pinId: w.to.pinId } : {}) },
      segments: w.segments.map(cloneSegment),
      crossesWireIds: [...w.crossesWireIds],
    }
    if (w.signalId) out.signalId = w.signalId
    if (w.width !== undefined) out.width = w.width
    return out
  })

  const inputNodes: SerializedInputNode[] = state.inputNodes.map((n) => ({
    id: n.id,
    name: n.name,
    position: cloneVec3(n.position),
    rotation: cloneVec3(n.rotation),
    value: n.value,
    width: n.width,
  }))

  const outputNodes: SerializedOutputNode[] = state.outputNodes.map((n) => ({
    id: n.id,
    name: n.name,
    position: cloneVec3(n.position),
    rotation: cloneVec3(n.rotation),
    value: n.value,
    width: n.width,
  }))

  const junctions: SerializedJunction[] = state.junctions.map((j) => ({
    id: j.id,
    position: cloneVec3(j.position),
    signalId: j.signalId,
    wireIds: [...j.wireIds],
  }))

  return {
    version: CIRCUIT_FORMAT_VERSION,
    name,
    savedAt: new Date().toISOString(),
    gates,
    wires,
    inputNodes,
    outputNodes,
    junctions,
  }
}
