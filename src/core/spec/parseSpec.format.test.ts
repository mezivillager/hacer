import { describe, expect, it } from 'vitest'
import { parseSpec } from './parseSpec'

const BODY = 'CHIP X {\n    IN a;\n    OUT out;\n    PARTS:\n    Not(in=a, out=out); // #p1\n}\n'
const sidecarJson = (version: number): string =>
  JSON.stringify({ schemaVersion: version, hints: { '3d': { p1: { x: 1, y: 2, z: 3, origin: 'user' } }, '2d': {} }, meta: {}, tests: [], notes: [] })
const codes = (source: string): string[] => parseSpec(source).diagnostics.map((d) => d.code)

// What the .spec format allows, exactly (ADR-0020 §1): the header is the first thing in the file,
// after an optional BOM and whitespace; the sidecar block is the last, followed by whitespace only.
// A tag found anywhere else is refused by name, never read past as plain HDL.
describe('the .spec format: where the version is read from', () => {
  describe('the // hacer-spec header', () => {
    it.each([
      ['after a BOM', '﻿'],
      ['after blank lines', '\n\n'],
      ['indented', '  '],
    ])('is read %s', (_where, lead) => {
      expect(parseSpec(`${lead}// hacer-spec 1\n${BODY}`).doc?.schemaVersion).toBe(1)
      expect(codes(`${lead}// hacer-spec 2\n${BODY}`)).toEqual(['unknown-schema-version'])
    })

    it.each([
      ['after a comment', `/* licence */\n// hacer-spec 1\n${BODY}`],
      ['after the chip', `${BODY}// hacer-spec 1\n`],
      ['twice', `// hacer-spec 1\n// hacer-spec 1\n${BODY}`],
    ])('is refused by name when it comes %s', (_where, source) => {
      const result = parseSpec(source)
      expect(result.doc).toBeNull()
      expect(result.diagnostics.map((d) => d.code)).toEqual(['unknown-schema-version'])
    })
  })

  describe('the /* hacer-sidecar */ block', () => {
    it.each([
      ['on one line', `${BODY}/* hacer-sidecar ${sidecarJson(1)} */\n`],
      ['across lines', `${BODY}/* hacer-sidecar\n${sidecarJson(1)}\n*/\n`],
      ['with CRLF line ends', `${BODY.replace(/\n/g, '\r\n')}/* hacer-sidecar\r\n${sidecarJson(1)}\r\n*/\r\n`],
    ])('is read %s', (_form, source) => {
      expect(parseSpec(source).sidecar?.hints['3d']).toEqual({ p1: { x: 1, y: 2, z: 3, origin: 'user' } })
    })

    it('refuses an unknown sidecar version on one line, as it does across lines', () => {
      expect(codes(`${BODY}/* hacer-sidecar ${sidecarJson(2)} */\n`)).toEqual(['unknown-schema-version'])
    })

    it.each([
      ['followed by more text', `${BODY}/* hacer-sidecar\n${sidecarJson(1)}\n*/\n// end\n`],
      ['before the chip', `/* hacer-sidecar\n${sidecarJson(1)}\n*/\n${BODY}`],
      ['twice', `${BODY}/* hacer-sidecar\n${sidecarJson(1)}\n*/\n/* hacer-sidecar\n${sidecarJson(1)}\n*/\n`],
    ])('is refused by name, not dropped, when it comes %s', (_where, source) => {
      const result = parseSpec(source)
      expect(result.doc).toBeNull()
      expect(result.diagnostics.map((d) => d.code)).toEqual(['invalid-sidecar'])
    })
  })
})
