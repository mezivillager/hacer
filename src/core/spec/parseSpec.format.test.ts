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
      ['after a BOM', '\uFEFF'],
      ['after blank lines', '\n\n'],
      ['indented', '  '],
    ])('is read %s', (_where, lead) => {
      expect(parseSpec(`${lead}// hacer-spec 1\n${BODY}`).doc?.schemaVersion).toBe(2)
      expect(codes(`${lead}// hacer-spec 3\n${BODY}`)).toEqual(['unknown-schema-version'])
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
      expect(codes(`${BODY}/* hacer-sidecar ${sidecarJson(3)} */\n`)).toEqual(['unknown-schema-version'])
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

// Every occurrence of either tag, in any case, is either the one canonical header first or the one
// canonical sidecar block last; anything else is refused by name.
describe('the .spec format: a version tag is never read past', () => {
  const LAST = BODY.trimEnd()
  const NBSP = '\u00A0'

  it('reads a header indented with any Unicode space, and refuses its unknown version', () => {
    expect(parseSpec(`${NBSP}// hacer-spec 1\n${BODY}`).doc?.schemaVersion).toBe(2)
    expect(codes(`${NBSP}// hacer-spec 3\n${BODY}`)).toEqual(['unknown-schema-version'])
  })

  it.each([
    ['after the HDL, on the line of the closing brace', `${LAST} // hacer-spec 2\n`],
    ['after a comment on its own first line', `/* licence */ // hacer-spec 2\n${BODY}`],
    ['twice, the second after the HDL', `// hacer-spec 1\n${LAST} // hacer-spec 2\n`],
    ['run together with its version', `// hacer-spec2\n${BODY}`],
    ['in upper case', `// HACER-SPEC 2\n${BODY}`],
    ['inside an ordinary comment', `${BODY}// see hacer-spec 2\n`],
  ])('refuses a header %s', (_shape, source) => {
    expect(codes(source)).toEqual(['unknown-schema-version'])
  })

  it.each([
    ['opened with /**', `${BODY}/** hacer-sidecar ${sidecarJson(2)} */\n`],
    ['with a newline after /*', `${BODY}/*\nhacer-sidecar\n${sidecarJson(1)}\n*/\n`],
    ['in upper case', `${BODY}/* HACER-SIDECAR ${sidecarJson(2)} */\n`],
  ])('refuses a sidecar block %s', (_shape, source) => {
    expect(codes(source)).toEqual(['invalid-sidecar'])
  })

  it("reads a tag inside the sidecar's own data as data", () => {
    const sidecar = JSON.stringify({ schemaVersion: 1, hints: { '3d': {}, '2d': {} }, meta: { description: 'from a hacer-spec 2 draft, hacer-sidecar and all' }, tests: [], notes: [] })
    const result = parseSpec(`// hacer-spec 1\n${BODY}/* hacer-sidecar\n${sidecar}\n*/\n`)
    expect(result.diagnostics).toEqual([])
    expect(result.sidecar?.meta.description).toBe('from a hacer-spec 2 draft, hacer-sidecar and all')
  })
})

// A tag ends at a letter boundary, a disguised tag is still a tag, and only a real block comment can
// be the sidecar.
describe('the .spec format: what counts as a tag', () => {
  it('reads an ordinary comment whose word merely begins with the tag, like HACER-specific', () => {
    const result = parseSpec(`// hacer-spec 1\n${BODY}// HACER-specific: hacer-sidecars live at the end\n`)
    expect(result.doc?.schemaVersion).toBe(2)
    expect(result.diagnostics).toEqual([])
  })

  it.each([
    ['a zero-width space', `// hacer\u200B-spec 1\n${BODY}`, 'unknown-schema-version'],
    ['a non-breaking hyphen', `// hacer\u2011spec 2\n${BODY}`, 'unknown-schema-version'],
    ['a soft hyphen', `// hacer-\u00ADspec 2\n${BODY}`, 'unknown-schema-version'],
    ['a zero-width space in the sidecar tag', `${BODY}/* hacer\u200B-sidecar ${sidecarJson(2)} */\n`, 'invalid-sidecar'],
  ])('recognises a tag disguised with %s, and refuses it rather than reading plain v1', (_disguise, source, code) => {
    expect(codes(source)).toEqual([code])
  })

  it('does not read a sidecar block commented out with //', () => {
    const result = parseSpec(`${BODY}// /* hacer-sidecar ${sidecarJson(1)} */\n`)
    expect(result.doc).toBeNull()
    expect(result.diagnostics.map((d) => d.code)).toEqual(['invalid-sidecar'])
  })

  it('says where a header belongs when it refuses one out of place', () => {
    expect(parseSpec(`/* licence */\n// hacer-spec 1\n${BODY}`).diagnostics[0]?.message).toContain('first thing in the file (after a BOM or blank lines)')
  })
})

describe('the .spec format: the tag scan in depth', () => {
  it.each([
    ['a Hangul filler (U+3164)', `// hacer\u3164-spec 2\n${BODY}`, 'unknown-schema-version'],
    ['a tag character (U+E0020)', `// hacer\u{E0020}-spec 2\n${BODY}`, 'unknown-schema-version'],
    ['a Hangul filler in the sidecar tag', `${BODY}/* hacer\u3164-sidecar ${sidecarJson(1)} */\n`, 'invalid-sidecar'],
  ])('recognises a tag disguised with any Default_Ignorable_Code_Point, here %s, and refuses it', (_disguise, source, code) => {
    expect(codes(source)).toEqual([code])
  })

  it('scans a long run of soft hyphens in linear time', () => {
    const started = performance.now()
    parseSpec(`// hacer${'\u00AD'.repeat(20000)}x\n${BODY}`)
    expect(performance.now() - started).toBeLessThan(150)
  })

  it('says a tag in an ordinary comment is the cause when it refuses one', () => {
    expect(parseSpec(`${BODY}// see hacer-spec 2\n`).diagnostics[0]?.message).toContain('comments included')
  })

  it("refuses a sidecar whose JSON carries a raw */, which would end the comment where the HDL reader ends it", () => {
    const smuggled = JSON.stringify({ schemaVersion: 1, hints: { '3d': {}, '2d': {} }, meta: { title: '*/ CHIP Y { IN a; OUT out; PARTS: Not(in=a, out=out); } //' }, tests: [], notes: [] })
    expect(codes(`/* hacer-sidecar ${smuggled} */\n`)).toEqual(['invalid-sidecar'])
  })
})
