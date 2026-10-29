import { describe, expect, it } from 'vitest'
import { emptySidecar, parseSidecar } from './sidecar'

describe('the sidecar', () => {
  it('starts at version 2 with both surfaces present and empty', () => {
    expect(emptySidecar()).toEqual({ schemaVersion: 2, hints: { '3d': {}, '2d': {} }, meta: {}, tests: [], notes: [] })
  })

  it('reads a version 1 sidecar at its own version, for migrate(1 → 2) to move', () => {
    expect(parseSidecar('{ "schemaVersion": 1, "hints": { "3d": {}, "2d": {} }, "meta": { "title": "And" }, "tests": [], "notes": [] }')).toEqual({
      sidecar: { schemaVersion: 1, hints: { '3d': {}, '2d': {} }, meta: { title: 'And' }, tests: [], notes: [] },
    })
  })

  it('reads back what it was written as', () => {
    const sidecar = { ...emptySidecar(), meta: { title: 'And' }, tests: [{ tst: 'And.tst', cmp: 'And.cmp' }] }
    expect(parseSidecar(JSON.stringify(sidecar))).toEqual({ sidecar })
  })

  it('a hint coordinate that is not a finite number is refused with its node id', () => {
    const hint = (x: string, y: string) => `{ "x": ${x}, "y": ${y}, "z": 0, "origin": "user" }`
    const json = `{ "schemaVersion": 2, "hints": { "3d": { "p1": ${hint('1', '2')}, "p2": ${hint('1e400', '0')} }, "2d": { "in:a": ${hint('0', '-1e400')} } }, "meta": {}, "tests": [], "notes": [] }`
    expect(parseSidecar(json)).toEqual({
      diagnostics: [
        { code: 'invalid-sidecar', severity: 'error', message: "The '3d' hint for p2 has x = Infinity: a hint coordinate must be a finite number" },
        { code: 'invalid-sidecar', severity: 'error', message: "The '2d' hint for in:a has y = -Infinity: a hint coordinate must be a finite number" },
      ],
    })
  })

  it.each([
    ['a version this build does not know', '{ "schemaVersion": 3, "hints": { "3d": {}, "2d": {} }, "meta": {}, "tests": [], "notes": [] }', 'unknown-schema-version'],
    ['no version at all', '{ "hints": { "3d": {}, "2d": {} }, "meta": {}, "tests": [], "notes": [] }', 'unknown-schema-version'],
    ['a missing surface', '{ "schemaVersion": 1, "hints": { "3d": {} }, "meta": {}, "tests": [], "notes": [] }', 'invalid-sidecar'],
    ['text that is not JSON', '{ schemaVersion: 1 }', 'invalid-sidecar'],
    ['JSON that is not an object', '[]', 'invalid-sidecar'],
    ['a hint that is not a hint', '{ "schemaVersion": 1, "hints": { "3d": { "p1": "nope" }, "2d": {} }, "meta": {}, "tests": [], "notes": [] }', 'invalid-sidecar'],
  ])('refuses %s by name', (_what, json, code) => {
    const result = parseSidecar(json)
    expect('diagnostics' in result && result.diagnostics.map((d) => d.code)).toEqual([code])
  })
})
