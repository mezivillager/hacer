import { evaluateCircuit } from './topologicalEval'
import type { CircuitDocument, Pin } from '@/store/types'

/** Default cap on the summed width of all input nodes (2^8 = 256 rows). */
export const DEFAULT_MAX_INPUT_BITS = 8

export interface TruthTableRow {
  /** One value per input node, in `headers.inputs` order. */
  inputs: number[]
  /** One value per output node, in `headers.outputs` order; `null` when the node has no incoming wire. */
  outputs: Array<number | null>
}

/** A truth table as data: column names plus one row per input assignment. */
export interface TruthTable {
  headers: { inputs: string[]; outputs: string[] }
  rows: TruthTableRow[]
}

export interface GenerateTruthTableOptions {
  /** Refuse to enumerate when the summed input width exceeds this. Default {@link DEFAULT_MAX_INPUT_BITS}. */
  maxInputBits?: number
}

/** Outcome of {@link generateTruthTable}: the table, or a diagnostic (never thrown). */
export type TruthTableResult =
  | { ok: true; table: TruthTable }
  | { ok: false; reason: 'over-budget'; totalInputBits: number; maxInputBits: number }
  | { ok: false; reason: 'cycle'; involvedGateIds: string[] }

/** Copies the parts of a circuit that evaluation writes to; the read-only rest is shared. */
function scratchCopy(circuit: CircuitDocument): CircuitDocument {
  const withOwnPins = <T extends { inputs: Pin[]; outputs: Pin[] }>(entity: T): T => ({
    ...entity,
    inputs: entity.inputs.map((p) => ({ ...p })),
    outputs: entity.outputs.map((p) => ({ ...p })),
  })
  return {
    gates: circuit.gates.map(withOwnPins),
    busComponents: circuit.busComponents.map(withOwnPins),
    inputNodes: circuit.inputNodes.map((n) => ({ ...n })),
    outputNodes: circuit.outputNodes.map((n) => ({ ...n })),
    wires: circuit.wires,
    junctions: circuit.junctions,
  }
}

/**
 * Enumerates every assignment of the circuit's input nodes and evaluates the
 * circuit once per row, producing the truth table as data.
 *
 * Rows are in binary-counting order with the first input node most
 * significant, each input spanning its full `width`. A circuit with no inputs
 * yields exactly one row. An output node with no incoming wire reads `null`
 * (distinct from an evaluated `0`). The passed-in circuit is never mutated.
 *
 * @param circuit - The circuit document (a `CircuitState` or a deserialized save)
 * @param options - `maxInputBits` caps the summed input width (default 8 → 256 rows)
 * @returns The table, or an `over-budget` / `cycle` diagnostic
 */
export function generateTruthTable(
  circuit: CircuitDocument,
  { maxInputBits = DEFAULT_MAX_INPUT_BITS }: GenerateTruthTableOptions = {},
): TruthTableResult {
  const totalInputBits = circuit.inputNodes.reduce((sum, n) => sum + n.width, 0)
  if (totalInputBits > maxInputBits) {
    return { ok: false, reason: 'over-budget', totalInputBits, maxInputBits }
  }

  const scratch = scratchCopy(circuit)
  const wiredOutputIds = new Set(
    scratch.wires.filter((w) => w.to.type === 'output').map((w) => w.to.entityId),
  )
  const rowCount = 2 ** totalInputBits
  const rows: TruthTableRow[] = []

  for (let row = 0; row < rowCount; row++) {
    // Slice the row index into per-input fields, first input most significant.
    let shift = totalInputBits
    const inputs = scratch.inputNodes.map((node) => {
      shift -= node.width
      node.value = Math.floor(row / 2 ** shift) % 2 ** node.width
      return node.value
    })

    const result = evaluateCircuit(scratch)
    if (result.status === 'cycle') {
      return { ok: false, reason: 'cycle', involvedGateIds: result.involvedGateIds }
    }

    const outputs = scratch.outputNodes.map((node) =>
      wiredOutputIds.has(node.id) ? node.value : null,
    )
    rows.push({ inputs, outputs })
  }

  return {
    ok: true,
    table: {
      headers: {
        inputs: scratch.inputNodes.map((n) => n.name),
        outputs: scratch.outputNodes.map((n) => n.name),
      },
      rows,
    },
  }
}
