import type { Pin } from '../../types'

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
): { inputs: Pin[]; outputs: Pin[] } {
  if (kind === 'splitter') {
    const inputs: Pin[] = [{ id: 'in', name: 'in', type: 'input', value: 0, width }]
    const outputs: Pin[] = Array.from({ length: width }, (_unused, i) => ({
      id: `out${i}`,
      name: `out${i}`,
      type: 'output' as const,
      value: 0,
      width: 1,
    }))
    return { inputs, outputs }
  }
  const inputs: Pin[] = Array.from({ length: width }, (_unused, i) => ({
    id: `in${i}`,
    name: `in${i}`,
    type: 'input' as const,
    value: 0,
    width: 1,
  }))
  const outputs: Pin[] = [{ id: 'out', name: 'out', type: 'output', value: 0, width }]
  return { inputs, outputs }
}
