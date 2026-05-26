import { notify } from '@/lib/notify'
import { createGateInstance } from '@/store/actions/gateActions/gateActions'
import type { GateInstance, InputNode, JunctionNode, OutputNode, Pin, Wire } from '@/store/types'
import type { WireSegment } from '@/utils/wiringScheme/types'
import {
  CIRCUIT_FORMAT_VERSION,
  type SerializedCircuit,
  type SerializedGate,
  type SerializedInputNode,
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

/** Canonical mapping from legacy uppercase gate types to chip-registry names.
 *  Pre-Phase-5 saves used `GateType` (`'NAND' | 'AND' | …`); Phase 4 renamed
 *  the in-store field to `chipName` ('Nand', …). This table migrates the
 *  Project 1 builtin equivalents on load. */
const LEGACY_GATE_TYPE_MAP: Record<string, string> = {
  NAND: 'Nand',
  AND: 'And',
  OR: 'Or',
  NOT: 'Not',
  XOR: 'Xor',
}

/** Legacy gate types that have no Project 1 builtin equivalent. Saves
 *  containing these are loaded with the offending gates dropped + a warning. */
const UNSUPPORTED_LEGACY_TYPES = new Set(['NOR', 'XNOR'])

/** Returns the canonical chip name for a saved `type` field, or `null` to
 *  signal the gate should be skipped (unsupported legacy type). Modern saves
 *  pass through unchanged. */
function migrateGateTypeName(raw: string): string | null {
  if (Object.prototype.hasOwnProperty.call(LEGACY_GATE_TYPE_MAP, raw)) {
    return LEGACY_GATE_TYPE_MAP[raw]
  }
  if (UNSUPPORTED_LEGACY_TYPES.has(raw)) return null
  return raw
}

const cloneVec3 = (v: { x: number; y: number; z: number }) => ({ x: v.x, y: v.y, z: v.z })

function reconstructGate(s: SerializedGate, chipName: string): GateInstance {
  const tmpl = createGateInstance(chipName, cloneVec3(s.position), s.width)
  // Spread chip-def pin widths from tmpl; never overwrite with s.width — the
  // gate-level width is a parametric multiplier for future chips, not a per-pin
  // override. For Project 1 builtins (Not16 etc.) the chip definition is the
  // single source of truth for bus widths.
  const inputs: Pin[] = tmpl.inputs.map((p, i) => ({
    ...p,
    id: `${s.id}-in-${i}`,
    value: 0,
  }))
  const outputs: Pin[] = tmpl.outputs.map((p, i) => ({
    ...p,
    id: `${s.id}-out-${i}`,
    value: 0,
  }))
  return {
    id: s.id,
    chipName,
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

// Junction reconstruction is inlined inside `deserializeCircuit` so the
// orphan-wire pruning (PR #107 Codex P1) can filter each junction's
// `wireIds` against the just-built `droppedWireIds` set in the same pass.

export function deserializeCircuit(data: SerializedCircuit): DeserializedCircuit {
  if (data.version !== CIRCUIT_FORMAT_VERSION) {
    throw new Error(`Unsupported circuit version: ${String(data.version)}`)
  }

  const gates: GateInstance[] = []
  // Track every gate ID that did not survive the load so we can prune wires
  // (and junction wireId entries) that reference them. Without this,
  // dangling wires would silently drive 0 into downstream gate inputs via
  // the simulation's missing-endpoint fallback.
  const skippedGateIds = new Set<string>()
  for (const s of data.gates) {
    const chipName = migrateGateTypeName(s.type)
    if (chipName === null) {
      notify.warning(
        `Skipped unsupported gate type "${s.type}" — NOR and XNOR are not supported in the builtin chip system.`,
      )
      skippedGateIds.add(s.id)
      continue
    }
    // `migrateGateTypeName` passes unknown names through unchanged, but
    // `createGateInstance` (called from `reconstructGate`) throws when a
    // chip name is not in either the builtin or user registry — for
    // example, a save produced by a newer build with chips this build
    // doesn't ship yet. Catch and skip: warn + drop the gate so the rest
    // of the circuit still loads.
    try {
      gates.push(reconstructGate(s, chipName))
    } catch (err) {
      const reason = err instanceof Error ? err.message : String(err)
      notify.warning(
        `Skipped unknown chip "${s.type}" while loading circuit (${reason}).`,
      )
      skippedGateIds.add(s.id)
    }
  }

  const isLiveGateRef = (endpoint: SerializedWire['from']): boolean =>
    endpoint.type !== 'gate' || !skippedGateIds.has(endpoint.entityId)

  const wires: Wire[] = []
  const droppedWireIds = new Set<string>()
  for (const s of data.wires) {
    if (!isLiveGateRef(s.from) || !isLiveGateRef(s.to)) {
      droppedWireIds.add(s.id)
      continue
    }
    wires.push(reconstructWire(s))
  }

  // Prune dropped wireIds from each junction's wireIds; drop the junction
  // entirely if it ends up with zero live wireIds.
  const junctions: JunctionNode[] = []
  for (const s of data.junctions) {
    const liveWireIds = s.wireIds.filter((id) => !droppedWireIds.has(id))
    if (liveWireIds.length === 0) continue
    junctions.push({
      id: s.id,
      position: cloneVec3(s.position),
      signalId: s.signalId,
      wireIds: liveWireIds,
    })
  }

  return {
    gates,
    wires,
    inputNodes: data.inputNodes.map(reconstructInputNode),
    outputNodes: data.outputNodes.map(reconstructOutputNode),
    junctions,
  }
}
