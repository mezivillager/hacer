import { LITERALS, SPEC_SCHEMA_VERSION } from './types'
import type { CircuitSpec, Net, Sidecar } from './types'

/** A version-1 document: §1's shape before `Ref` had a constant kind, when a literal's net had no driver. */
export interface SpecV1 {
  doc: Omit<CircuitSpec, 'schemaVersion'> & { schemaVersion: 1 }
  sidecar: Omit<Sidecar, 'schemaVersion'> & { schemaVersion: 1 }
}

/** The versions a file may be written at: the current one, and every one a migration reads up to it. */
export const READABLE_VERSIONS: readonly number[] = [1, SPEC_SCHEMA_VERSION]

/** `migrate(1 → 2)`, ADR-0020 §1.10.9: each driverless `true` or `false` net takes its constant; nothing else changes. */
export function migrate({ doc, sidecar }: SpecV1): { doc: CircuitSpec; sidecar: Sidecar } {
  const nets = doc.nets.map((net): Net => {
    const value = LITERALS.get(net.id)
    return net.driver === null && value !== undefined ? { ...net, driver: { kind: 'constant', value } } : net
  })
  return { doc: { ...doc, schemaVersion: 2, nets }, sidecar: { ...sidecar, schemaVersion: 2 } }
}
