import { createBusPins } from '@/core/buses/busPins'
import { getBuiltinChipRegistry, getUserChipRegistry } from '@/core/chips/appRegistry'
import type { BusComponent, GateInstance, InputNode, JunctionNode, OutputNode, Pin, Wire } from '@/store/types'
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
  busComponents: BusComponent[]
}

/**
 * A single thing the reader could not do, returned as data. `deserializeCircuit`
 * never shows anything to a person — the caller decides that. Every warning names
 * what was wrong *and where*: the version of the document, or the id and saved
 * type of the gate that was dropped.
 */
export type DeserializeWarning =
  | {
      code: 'unsupported-version'
      message: string
      /** The `version` field as written in the document. */
      version: number
      /** The one version this build reads. */
      supported: typeof CIRCUIT_FORMAT_VERSION
    }
  | {
      code: 'unsupported-gate-type'
      message: string
      /** Id of the gate that was dropped. */
      gateId: string
      /** The gate's `type` field as saved, e.g. `'NOR'`. */
      gateType: string
    }
  | {
      code: 'unknown-chip'
      message: string
      gateId: string
      gateType: string
      /** The chip name `gateType` migrated to, which no registry knows. */
      chipName: string
    }

export interface DeserializeResult {
  /**
   * The restored circuit, or `null` when the document could not be read at all
   * (today: any version this build does not know). A non-null document can still
   * carry warnings — parts of it were dropped.
   */
  document: DeserializedCircuit | null
  warnings: DeserializeWarning[]
}

/** The document versions this build reads. Everything else is reported, not thrown. */
const READABLE_VERSIONS: readonly number[] = [CIRCUIT_FORMAT_VERSION]

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

/** Rebuilds a saved gate, or `null` when no registry knows its chip. */
function reconstructGate(s: SerializedGate, chipName: string): GateInstance | null {
  // Read the chip definition directly rather than through the store's
  // `createGateInstance`: that import was the engine -> state edge this file
  // exists to remove (#181), and only the pin names and widths were ever used.
  const chip = getBuiltinChipRegistry().get(chipName) ?? getUserChipRegistry().get(chipName)
  if (!chip) return null
  // Pin widths come from the chip definition; never from `s.width` — the
  // gate-level width is a parametric multiplier for future chips, not a per-pin
  // override. For Project 1 builtins (Not16 etc.) the chip definition is the
  // single source of truth for bus widths.
  const inputs: Pin[] = chip.inputs.map((p, i) => ({
    id: `${s.id}-in-${i}`,
    name: p.name,
    type: 'input',
    value: 0,
    width: p.width,
  }))
  const outputs: Pin[] = chip.outputs.map((p, i) => ({
    id: `${s.id}-out-${i}`,
    name: p.name,
    type: 'output',
    value: 0,
    width: p.width,
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

export function deserializeCircuit(data: SerializedCircuit): DeserializeResult {
  // Version dispatch is a lookup, not a throw: this function survives as the
  // importer's private reader of version-1 documents (ADR-0020 §7.6), and a
  // document it does not read is a fact to report, not an exception.
  if (!READABLE_VERSIONS.includes(data.version)) {
    return {
      document: null,
      warnings: [
        {
          code: 'unsupported-version',
          version: data.version,
          supported: CIRCUIT_FORMAT_VERSION,
          message:
            `Unsupported circuit version: ${String(data.version)} — ` +
            `this build reads version ${String(CIRCUIT_FORMAT_VERSION)}.`,
        },
      ],
    }
  }

  const warnings: DeserializeWarning[] = []
  const gates: GateInstance[] = []
  // Track every gate ID that did not survive the load so we can prune wires
  // (and junction wireId entries) that reference them. Without this,
  // dangling wires would silently drive 0 into downstream gate inputs via
  // the simulation's missing-endpoint fallback.
  const skippedGateIds = new Set<string>()
  for (const s of data.gates) {
    const chipName = migrateGateTypeName(s.type)
    if (chipName === null) {
      warnings.push({
        code: 'unsupported-gate-type',
        gateId: s.id,
        gateType: s.type,
        message: `Skipped unsupported gate type "${s.type}" — NOR and XNOR are not supported in the builtin chip system.`,
      })
      skippedGateIds.add(s.id)
      continue
    }
    // `migrateGateTypeName` passes unknown names through unchanged, so a save
    // produced by a newer build with chips this one doesn't ship yet reaches
    // here. Drop that gate with a warning and let the rest of the circuit load.
    const gate = reconstructGate(s, chipName)
    if (gate === null) {
      warnings.push({
        code: 'unknown-chip',
        gateId: s.id,
        gateType: s.type,
        chipName,
        message:
          `Skipped unknown chip "${s.type}" while loading circuit — ` +
          `"${chipName}" is in neither the builtin nor the user chip registry.`,
      })
      skippedGateIds.add(s.id)
      continue
    }
    gates.push(gate)
  }

  const isLiveGateRef = (endpoint: SerializedWire['from']): boolean =>
    endpoint.type !== 'gate' || !skippedGateIds.has(endpoint.entityId)

  // Reconstruct bus components and build a live-id set for wire pruning.
  // Pins are regenerated from kind+width (deterministic, same as createBusPins)
  // rather than read from the saved pin arrays, mirroring how gates use createGateInstance.
  const liveBusIds = new Set<string>()
  const busComponents: BusComponent[] = []
  for (const s of data.busComponents ?? []) {
    const { inputs, outputs } = createBusPins(s.kind, s.width)
    busComponents.push({
      id: s.id,
      kind: s.kind,
      position: cloneVec3(s.position),
      rotation: cloneVec3(s.rotation),
      width: s.width,
      inputs,
      outputs,
      selected: false,
    })
    liveBusIds.add(s.id)
  }

  /** Prunes a wire whose 'bus' endpoint references a bus component not in the restored set. */
  const isLiveBusRef = (endpoint: SerializedWire['from']): boolean =>
    endpoint.type !== 'bus' || liveBusIds.has(endpoint.entityId)

  const wires: Wire[] = []
  const droppedWireIds = new Set<string>()
  for (const s of data.wires) {
    if (!isLiveGateRef(s.from) || !isLiveGateRef(s.to) || !isLiveBusRef(s.from) || !isLiveBusRef(s.to)) {
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
    document: {
      gates,
      wires,
      inputNodes: data.inputNodes.map(reconstructInputNode),
      outputNodes: data.outputNodes.map(reconstructOutputNode),
      junctions,
      busComponents,
    },
    warnings,
  }
}
