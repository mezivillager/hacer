// The first committed `.spec` fixture is the version boundary (ADR-0020 §1): from that commit on, v1
// may change only through a `migrate(1 → 2)` that turns these files into their v2 form.
import { describe, expect, it } from 'vitest'
import { parseSpec } from './parseSpec'
import { printSpec } from './printSpec'

const V1 = Object.entries(import.meta.glob<string>('./fixtures/v1/*.spec', { query: '?raw', import: 'default', eager: true }))

describe('the committed v1 .spec fixtures', () => {
  it('include at least one real version-1 document', () => {
    expect(V1.length).toBeGreaterThan(0)
  })

  it.each(V1)('%s parses with no errors and prints back byte for byte, sidecar included', (_path, text) => {
    const result = parseSpec(text)
    expect(result.diagnostics.filter((d) => d.severity === 'error')).toEqual([])
    if (result.doc === null) throw new Error('fixture refused')
    expect(result.doc.schemaVersion).toBe(1)
    expect(result.sidecar.schemaVersion).toBe(1)
    expect(printSpec(result.doc, { sidecar: result.sidecar })).toBe(text)
  })
})
