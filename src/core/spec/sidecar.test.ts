import { describe, expect, it } from 'vitest'
import { emptySidecar, parseSidecar } from './sidecar'

describe('the sidecar', () => {
  it('starts at version 1 with both surfaces present and empty', () => {
    expect(emptySidecar()).toEqual({ schemaVersion: 1, hints: { '3d': {}, '2d': {} }, meta: {}, tests: [], notes: [] })
  })

  it('reads back what it was written as', () => {
    const sidecar = { ...emptySidecar(), meta: { title: 'And' }, tests: [{ tst: 'And.tst', cmp: 'And.cmp' }] }
    expect(parseSidecar(JSON.stringify(sidecar))).toEqual({ sidecar })
  })

  it.each([
    ['a version this build does not know', '{ "schemaVersion": 2, "hints": { "3d": {}, "2d": {} }, "meta": {}, "tests": [], "notes": [] }', 'unknown-schema-version'],
    ['no version at all', '{ "hints": { "3d": {}, "2d": {} }, "meta": {}, "tests": [], "notes": [] }', 'unknown-schema-version'],
    ['a missing surface', '{ "schemaVersion": 1, "hints": { "3d": {} }, "meta": {}, "tests": [], "notes": [] }', 'invalid-sidecar'],
    ['text that is not JSON', '{ schemaVersion: 1 }', 'invalid-sidecar'],
  ])('refuses %s by name', (_what, json, code) => {
    const result = parseSidecar(json)
    expect('diagnostics' in result && result.diagnostics.map((d) => d.code)).toEqual([code])
  })
})
