import { READABLE_VERSIONS, type SpecV1 } from './migrate'
import { SPEC_SCHEMA_VERSION, type Sidecar, type SpecDiagnostic } from './types'

export function emptySidecar(): Sidecar {
  return { schemaVersion: SPEC_SCHEMA_VERSION, hints: { '3d': {}, '2d': {} }, meta: {}, tests: [], notes: [] }
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

const isHint = (value: unknown): boolean =>
  isRecord(value) &&
  ['x', 'y', 'z'].every((axis) => typeof value[axis] === 'number') &&
  (value.rotation === undefined || typeof value.rotation === 'number') &&
  (value.origin === 'user' || value.origin === 'tidy')

const refuse = (code: SpecDiagnostic['code'], message: string) => ({
  diagnostics: [{ code, severity: 'error' as const, message }],
})

/** Read a sidecar's JSON at the version it was written at; a version this build does not know is refused, never read best-effort. */
export function parseSidecar(json: string): { sidecar: Sidecar | SpecV1['sidecar'] } | { diagnostics: SpecDiagnostic[] } {
  let value: unknown
  try {
    value = JSON.parse(json)
  } catch (error) {
    return refuse('invalid-sidecar', `Sidecar is not valid JSON: ${error instanceof Error ? error.message : String(error)}`)
  }
  if (!isRecord(value)) return refuse('invalid-sidecar', 'Sidecar must be a JSON object')
  const { schemaVersion, hints, meta, tests, notes } = value
  if (!READABLE_VERSIONS.some((version) => version === schemaVersion)) {
    return refuse('unknown-schema-version', `Sidecar schemaVersion ${JSON.stringify(schemaVersion) ?? 'missing'} is not one this build reads (${READABLE_VERSIONS.join(', ')})`)
  }
  const surfaces = isRecord(hints) ? [hints['3d'], hints['2d']] : []
  if (surfaces.length === 0 || !surfaces.every(isRecord) || !isRecord(meta) || !Array.isArray(tests) || !Array.isArray(notes)) {
    return refuse('invalid-sidecar', "Sidecar must carry hints['3d'], hints['2d'], meta, tests and notes")
  }
  if (!surfaces.every((surface) => Object.values(surface).every(isHint))) {
    return refuse('invalid-sidecar', 'Every hint needs numeric x, y and z and an origin of user or tidy')
  }
  return { sidecar: value as unknown as Sidecar | SpecV1['sidecar'] }
}
