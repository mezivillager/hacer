import type { Sidecar, SpecDiagnostic } from './types'

export function emptySidecar(): Sidecar {
  throw new Error('not implemented')
}

export function parseSidecar(_json: string): { sidecar: Sidecar } | { diagnostics: SpecDiagnostic[] } {
  throw new Error('not implemented')
}
