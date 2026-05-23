import { createGateInstance } from '@/store/actions/gateActions/gateActions'
import type { GateInstance, GateType, InputNode, JunctionNode, OutputNode, Pin, Wire } from '@/store/types'
import type { WireSegment } from '@/utils/wiringScheme/types'
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

export interface DeserializedCircuit {
  gates: GateInstance[]
  wires: Wire[]
  inputNodes: InputNode[]
  outputNodes: OutputNode[]
  junctions: JunctionNode[]
}

const cloneVec3 = (v: { x: number; y: number; z: number }) => ({ x: v.x, y: v.y, z: v.z })

function reconstructGate(s: SerializedGate): GateInstance {
  const tmpl = createGateInstance(s.type as GateType, cloneVec3(s.position), s.width)
  const inputs: Pin[] = tmpl.inputs.map((p, i) => ({
    ...p,
    id: `${s.id}-in-${i}`,
    value: 0,
    width: s.width,
  }))
  const outputs: Pin[] = tmpl.outputs.map((p, i) => ({
    ...p,
    id: `${s.id}-out-${i}`,
    value: 0,
    width: s.width,
  }))
  return {
    id: s.id,
    type: s.type as GateType,
    position: cloneVec3(s.position),
    rotation: cloneVec3(s.rotation),
    inputs,
    outputs,
    selected: false,
    width: s.width,
  }
}

function reconstructSegment(s: SerializedWireSegment): WireSegment {
  const out: WireSegment = {
    start: cloneVec3(s.start),
    end: cloneVec3(s.end),
    type: s.type,
  }
  if (s.arcCenter) out.arcCenter = cloneVec3(s.arcCenter)
  if (s.arcRadius !== undefined) out.arcRadius = s.arcRadius
  if (s.crossedWireId) out.crossedWireId = s.crossedWireId
  return out
}

function reconstructWire(s: SerializedWire): Wire {
  const out: Wire = {
    id: s.id,
    from: { type: s.from.type, entityId: s.from.entityId, ...(s.from.pinId ? { pinId: s.from.pinId } : {}) },
    to: { type: s.to.type, entityId: s.to.entityId, ...(s.to.pinId ? { pinId: s.to.pinId } : {}) },
    segments: s.segments.map(reconstructSegment),
    crossesWireIds: [...s.crossesWireIds],
  }
  if (s.signalId) out.signalId = s.signalId
  if (s.width !== undefined) out.width = s.width
  return out
}

function reconstructInputNode(s: SerializedInputNode): InputNode {
  return {
    id: s.id,
    name: s.name,
    position: cloneVec3(s.position),
    rotation: cloneVec3(s.rotation),
    value: s.value,
    width: s.width,
  }
}

function reconstructOutputNode(s: SerializedOutputNode): OutputNode {
  return {
    id: s.id,
    name: s.name,
    position: cloneVec3(s.position),
    rotation: cloneVec3(s.rotation),
    value: s.value,
    width: s.width,
  }
}

function reconstructJunction(s: SerializedJunction): JunctionNode {
  return {
    id: s.id,
    position: cloneVec3(s.position),
    signalId: s.signalId,
    wireIds: [...s.wireIds],
  }
}

export function deserializeCircuit(data: SerializedCircuit): DeserializedCircuit {
  if (data.version !== CIRCUIT_FORMAT_VERSION) {
    throw new Error(`Unsupported circuit version: ${data.version}`)
  }
  return {
    gates: data.gates.map(reconstructGate),
    wires: data.wires.map(reconstructWire),
    inputNodes: data.inputNodes.map(reconstructInputNode),
    outputNodes: data.outputNodes.map(reconstructOutputNode),
    junctions: data.junctions.map(reconstructJunction),
  }
}
