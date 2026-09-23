/**
 * Bus pin generation — pure logic, no store, no React, no browser.
 *
 * Lives in `src/core` because `core/serialization/deserialize.ts` rebuilds a saved bus
 * component's pins on load; importing it from `src/store` was one of the engine→state
 * edges the layer ratchet records (#181, #329).
 */

/**
 * A single pin on a bus component. Structurally identical to the store's `Pin`
 * (`src/store/types.ts`), and deliberately declared here instead of imported: the engine
 * may not depend on the store. Callers assign these straight into `Pin[]`.
 */
export interface BusPin {
  id: string
  name: string
  type: 'input' | 'output'
  value: number
  /** Bit width of the pin. Defaults to 1 for primitive gates when omitted. */
  width?: number
}

/**
 * Generate the input/output pin arrays for a bus component from its kind+width.
 *
 * - splitter: input `in` (width N), outputs `out0..out{N-1}` (width 1 each).
 * - joiner:   inputs `in0..in{N-1}` (width 1 each), output `out` (width N).
 *
 * Pin ids are component-local; uniqueness across the circuit comes from the
 * wire endpoint's `entityId` (same contract gate pins rely on).
 *
 * NOTE: the `kind` literal `'splitter' | 'joiner'` is structurally identical to
 * the `BusComponentKind` union added in Task 2, so callers may pass either.
 */
export function createBusPins(
  kind: 'splitter' | 'joiner',
  width: number,
): { inputs: BusPin[]; outputs: BusPin[] } {
  if (kind === 'splitter') {
    const inputs: BusPin[] = [{ id: 'in', name: 'in', type: 'input', value: 0, width }]
    const outputs: BusPin[] = Array.from({ length: width }, (_unused, i) => ({
      id: `out${i}`,
      name: `out${i}`,
      type: 'output' as const,
      value: 0,
      width: 1,
    }))
    return { inputs, outputs }
  }
  const inputs: BusPin[] = Array.from({ length: width }, (_unused, i) => ({
    id: `in${i}`,
    name: `in${i}`,
    type: 'input' as const,
    value: 0,
    width: 1,
  }))
  const outputs: BusPin[] = [{ id: 'out', name: 'out', type: 'output', value: 0, width }]
  return { inputs, outputs }
}
