import type { SerializedCircuit } from '../serialization/types'
import type { CircuitSpec, Sidecar } from './types'

export interface LegacyImport {
  doc: CircuitSpec | null
  sidecar: Sidecar
}

export function fromLegacyCircuit(saved: SerializedCircuit): LegacyImport {
  throw new Error(`fromLegacyCircuit is not implemented (${saved.name})`)
}
