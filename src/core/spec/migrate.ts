import type { CircuitSpec, Sidecar } from './types'

/** A version-1 document: §1's shape before `Ref` had a constant kind, when a literal's net had no driver. */
export interface SpecV1 {
  doc: Omit<CircuitSpec, 'schemaVersion'> & { schemaVersion: 1 }
  sidecar: Omit<Sidecar, 'schemaVersion'> & { schemaVersion: 1 }
}

export function migrate(v1: SpecV1): { doc: CircuitSpec; sidecar: Sidecar } {
  throw new Error(`migrate(1 → 2) is not implemented for ${v1.doc.name}`)
}
