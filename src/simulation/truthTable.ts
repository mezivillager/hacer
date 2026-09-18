import { evaluateCircuit } from './topologicalEval'
import type { CircuitDocument, Pin } from '@/store/types'

/** Default cap on the summed width of all input nodes (2^8 = 256 rows). */
export const DEFAULT_MAX_INPUT_BITS = 8

/** Hard ceiling on `maxInputBits`, whatever the caller asks for (2^16 = 65,536 rows). */
export const MAX_INPUT_BITS_CEILING = 16

/** One table column: the node's name and bit width (for formatting multi-bit cells). */
export interface TruthTableColumn {
  name: string
  width: number
}

export interface TruthTableRow {
  /** One value per input node, in `headers.inputs` order. */
  inputs: number[]
  /** One value per output node, in `headers.outputs` order; `null` when the node has no incoming wire. */
  outputs: Array<number | null>
}

/** A truth table as data: column descriptors plus one row per input assignment. */
export interface TruthTable {
  headers: { inputs: TruthTableColumn[]; outputs: TruthTableColumn[] }
  rows: TruthTableRow[]
}

export interface GenerateTruthTableOptions {
  /**
   * Refuse to enumerate when the summed input width exceeds this. Default
   * {@link DEFAULT_MAX_INPUT_BITS}; clamped to `[0, MAX_INPUT_BITS_CEILING]`, and `NaN` means no budget.
   */
  maxInputBits?: number
}

/**
 * Outcome of {@link generateTruthTable}: the table, or a diagnostic (never thrown).
 * In `over-budget`, `maxInputBits` is the budget actually applied after clamping.
 */
export type TruthTableResult =
  | { ok: true; table: TruthTable }
  | { ok: false; reason: 'over-budget'; totalInputBits: number; maxInputBits: number }
  | { ok: false; reason: 'cycle'; involvedGateIds: string[] }

/**
 * Copies the parts of a circuit that evaluation writes to; the read-only rest is shared.
 * Pin values restart at 0 so the table depends on the circuit, not on whatever a
 * previous simulation left on a pin that has since been disconnected.
 */
function scratchCopy(circuit: CircuitDocument): CircuitDocument {
  const withFreshPins = <T extends { inputs: Pin[]; outputs: Pin[] }>(entity: T): T => ({
    ...entity,
    inputs: entity.inputs.map((p) => ({ ...p, value: 0 })),
    outputs: entity.outputs.map((p) => ({ ...p, value: 0 })),
  })
  return {
    gates: circuit.gates.map(withFreshPins),
    busComponents: circuit.busComponents.map(withFreshPins),
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
 * @param options - `maxInputBits` caps the summed input width (default 8 → 256 rows, ceiling 16)
 * @returns The table, or an `over-budget` / `cycle` diagnostic
 */
export function generateTruthTable(
  circuit: CircuitDocument,
  { maxInputBits = DEFAULT_MAX_INPUT_BITS }: GenerateTruthTableOptions = {},
): TruthTableResult {
  const budget = Number.isNaN(maxInputBits)
    ? 0
    : Math.min(Math.max(0, Math.trunc(maxInputBits)), MAX_INPUT_BITS_CEILING)
  const totalInputBits = circuit.inputNodes.reduce((sum, n) => sum + n.width, 0)
  if (totalInputBits > budget) {
    return { ok: false, reason: 'over-budget', totalInputBits, maxInputBits: budget }
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
        inputs: scratch.inputNodes.map(({ name, width }) => ({ name, width })),
        outputs: scratch.outputNodes.map(({ name, width }) => ({ name, width })),
      },
      rows,
    },
  }
}
