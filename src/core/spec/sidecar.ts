import { SPEC_SCHEMA_VERSION, type Sidecar, type SpecDiagnostic } from './types'

export function emptySidecar(): Sidecar {
  return { schemaVersion: SPEC_SCHEMA_VERSION, hints: { '3d': {}, '2d': {} }, meta: {}, tests: [], notes: [] }
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

const refuse = (code: SpecDiagnostic['code'], message: string) => ({
  diagnostics: [{ code, severity: 'error' as const, message }],
})

/** Read a sidecar's JSON; a version this build does not know is refused, never read best-effort. */
export function parseSidecar(json: string): { sidecar: Sidecar } | { diagnostics: SpecDiagnostic[] } {
  let value: unknown
  try {
    value = JSON.parse(json)
  } catch (error) {
    return refuse('invalid-sidecar', `Sidecar is not valid JSON: ${error instanceof Error ? error.message : String(error)}`)
  }
  if (!isRecord(value) || value.schemaVersion !== SPEC_SCHEMA_VERSION) {
    const version = isRecord(value) ? JSON.stringify(value.schemaVersion) : 'missing'
    return refuse('unknown-schema-version', `Sidecar schemaVersion ${version} is not one this build reads (${SPEC_SCHEMA_VERSION})`)
  }
  const { hints, meta, tests, notes } = value
  if (!isRecord(hints) || !isRecord(hints['3d']) || !isRecord(hints['2d']) || !isRecord(meta) || !Array.isArray(tests) || !Array.isArray(notes)) {
    return refuse('invalid-sidecar', "Sidecar must carry hints['3d'], hints['2d'], meta, tests and notes")
  }
  return { sidecar: value as unknown as Sidecar }
}
