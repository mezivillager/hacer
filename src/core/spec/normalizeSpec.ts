import type { CircuitSpec } from './types'

/** The one normalisation (ADR-0020 §1): a net with no driver and no sinks has no printed form. */
export function normalizeSpec(doc: CircuitSpec): CircuitSpec {
  return { ...doc, nets: doc.nets.filter((net) => net.driver !== null || net.sinks.length > 0) }
}
