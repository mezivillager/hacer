import { useCircuitStore } from '@/store/circuitStore'
import type { JunctionNode, Position, Wire, WireEndpoint } from '@/store/types'
import type { WireSegment } from '@/utils/wiringScheme/types'

// Records in the saved document's shape, typed from the store: the layer rules keep
// `src/core/serialization` out of reach from here, and the document travels as JSON anyway.
export interface GateRecord {
  id: string
  type: string
  position: Position
  rotation: Position
  width: number
}

export interface DocumentParts {
  gates?: GateRecord[]
  wires?: Wire[]
  junctions?: JunctionNode[]
}

const ORIGIN: Position = { x: 0, y: 0, z: 0 }

/** A saved gate; the loaded gate's pins are `${id}-in-${i}` and `${id}-out-${i}`. */
export function gateRecord(id: string, position: Position = ORIGIN, type = 'Nand'): GateRecord {
  return { id, type, position: { ...position }, rotation: { ...ORIGIN }, width: 1 }
}

export function wireRecord(id: string, from: WireEndpoint, to: WireEndpoint, segments: WireSegment[] = []): Wire {
  return { id, from, to, segments, crossesWireIds: [] }
}

const shapeOf = (doc: { wires: Wire[]; junctions: JunctionNode[] }) =>
  JSON.stringify({ wires: doc.wires.map((w) => w.id), junctions: doc.junctions.map((j) => [j.id, j.wireIds]) })

/** Loads `parts` as a saved document through `importCircuitJSON`; throws unless every wire and junction arrives as written. */
export function importDocument(parts: DocumentParts): void {
  const doc = {
    version: 1,
    name: 'fixture',
    savedAt: '2026-01-01T00:00:00.000Z',
    gates: parts.gates ?? [],
    wires: parts.wires ?? [],
    inputNodes: [],
    outputNodes: [],
    junctions: parts.junctions ?? [],
  }
  if (!useCircuitStore.getState().importCircuitJSON(JSON.stringify(doc))) {
    throw new Error('importDocument: importCircuitJSON refused the document')
  }
  const loaded = shapeOf(useCircuitStore.getState())
  if (loaded !== shapeOf(doc)) {
    throw new Error(`importDocument: the document loaded as ${loaded}, written as ${shapeOf(doc)}`)
  }
}
