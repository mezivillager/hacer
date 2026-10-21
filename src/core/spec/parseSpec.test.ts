import { describe, expect, it } from 'vitest'
import { parseSpec } from './parseSpec'
import type { CircuitSpec, Net, SpecDiagnostic } from './types'

const chip = (ports: string, parts: string): string => `CHIP X {\n    ${ports}\n    PARTS:\n${parts}\n}\n`

function parsed(source: string): { doc: CircuitSpec; diagnostics: SpecDiagnostic[] } {
  const result = parseSpec(source)
  if (result.doc === null) throw new Error(result.diagnostics.map((d) => d.message).join('; '))
  return result
}

const net = (doc: CircuitSpec, id: string): Net | undefined => doc.nets.find((n) => n.id === id)
const codes = (diagnostics: SpecDiagnostic[]): string[] => diagnostics.map((d) => d.code)
const errors = (diagnostics: SpecDiagnostic[]): SpecDiagnostic[] => diagnostics.filter((d) => d.severity === 'error')

describe('parseSpec', () => {
  describe("a net's id is its sliced signal reference (§1)", () => {
    it("keys C10's two slice writes of one signal as two nets, each with one driver", () => {
      const { doc, diagnostics } = parsed(chip('IN a, b; OUT out[2];', '    Not(in=a, out=out[0]); // #p1\n    Not(in=b, out=out[1]); // #p2'))
      expect(net(doc, 'out[0]')).toEqual({
        id: 'out[0]',
        driver: { kind: 'part-pin', partId: 'p1', pin: 'out' },
        sinks: [{ kind: 'chip-out', pin: 'out', slice: { start: 0, end: 0 } }],
      })
      expect(net(doc, 'out[1]')).toEqual({
        id: 'out[1]',
        driver: { kind: 'part-pin', partId: 'p2', pin: 'out' },
        sinks: [{ kind: 'chip-out', pin: 'out', slice: { start: 1, end: 1 } }],
      })
      expect(net(doc, 'out')).toBeUndefined()
      expect(errors(diagnostics)).toEqual([])
    })

    it('keys t, out, low and t[3..7] as written, and keeps the pin side of a binding on its ref', () => {
      const { doc, diagnostics } = parsed(
        chip(
          'IN bus[16]; OUT out, low[5];',
          '    Not16(in=bus, out=t); // #p1\n    Or8Way(in[0..4]=t[3..7], out=out); // #p2\n    Not16(in=t, out[0..4]=low); // #p3',
        ),
      )
      expect(doc.nets.map((n) => n.id).sort()).toEqual(['bus', 'low', 'out', 't', 't[3..7]'])
      expect(net(doc, 't')).toEqual({
        id: 't',
        driver: { kind: 'part-pin', partId: 'p1', pin: 'out' },
        sinks: [{ kind: 'part-pin', partId: 'p3', pin: 'in' }],
      })
      expect(net(doc, 't[3..7]')).toEqual({
        id: 't[3..7]',
        driver: null,
        sinks: [{ kind: 'part-pin', partId: 'p2', pin: 'in', slice: { start: 0, end: 4 } }],
      })
      expect(net(doc, 'low')?.driver).toEqual({ kind: 'part-pin', partId: 'p3', pin: 'out', slice: { start: 0, end: 4 } })
      // t[3..7] has no driver of its own, but the bits it reads are written: it is not unfinished.
      expect(errors(diagnostics)).toEqual([])
    })

    it('drives a net reading a chip input, whole or sliced, from its chip-in ref, with no error', () => {
      const { doc, diagnostics } = parsed(chip('IN a[4]; OUT out, o2[4];', '    Not(in=a[3], out=out); // #p1\n    Not16(in[0..3]=a, out[0..3]=o2); // #p2'))
      expect(net(doc, 'a[3]')?.driver).toEqual({ kind: 'chip-in', pin: 'a', slice: { start: 3, end: 3 } })
      expect(net(doc, 'a')?.driver).toEqual({ kind: 'chip-in', pin: 'a' })
      expect(errors(diagnostics)).toEqual([])
    })

    it('keeps a literal as a net of its own, driven by its constant', () => {
      const { doc, diagnostics } = parsed(chip('IN a; OUT out;', '    Nand(a=a, b=true, out=out); // #p1'))
      expect(net(doc, 'true')).toEqual({ id: 'true', driver: { kind: 'constant', value: true }, sinks: [{ kind: 'part-pin', partId: 'p1', pin: 'b' }] })
      expect(errors(diagnostics)).toEqual([])
    })
  })

  describe('the one normalisation clause (§1)', () => {
    it('keeps a net with only a driver and a net with only sinks', () => {
      const { doc } = parsed(chip('IN a; OUT out;', '    Not(in=a, out=t); // #p1\n    Not(in=u, out=out); // #p2'))
      expect(net(doc, 't')).toEqual({ id: 't', driver: { kind: 'part-pin', partId: 'p1', pin: 'out' }, sinks: [] })
      expect(net(doc, 'u')).toEqual({ id: 'u', driver: null, sinks: [{ kind: 'part-pin', partId: 'p2', pin: 'in' }] })
    })
  })

  describe('valid if it parses (§1.1)', () => {
    it('returns an unfinished circuit with driver: null, and its error as a diagnostic', () => {
      const { doc, diagnostics } = parsed(chip('IN a; OUT out;', '    Not(in=t, out=out); // #p1'))
      expect(net(doc, 't')?.driver).toBeNull()
      expect(errors(diagnostics)).toEqual([expect.objectContaining({ code: 'undriven', netId: 't' })])
    })

    it("parses C6's unconnected parts, which only the compile rejects", () => {
      const { doc } = parsed(chip('IN a; OUT out;', '    Nand(a=a); // #p1\n    Nand(); // #p2'))
      expect(doc.parts).toEqual([
        { id: 'p1', chip: 'Nand' },
        { id: 'p2', chip: 'Nand' },
      ])
    })

    it('names an unknown chip and an unknown pin, and still returns the document', () => {
      const { doc, diagnostics } = parsed(chip('IN a; OUT out;', '    Mystery(x=a, y=out); // #p1\n    Not(in=a, inn=a, out=out); // #p2'))
      expect(doc.parts.map((p) => p.chip)).toEqual(['Mystery', 'Not'])
      expect(diagnostics).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ code: 'unknown-chip', partId: 'p1' }),
          expect.objectContaining({ code: 'unknown-pin', partId: 'p2' }),
        ]),
      )
    })

    it('diagnoses a second driver of one net and keeps the first', () => {
      const { doc, diagnostics } = parsed(chip('IN a, b; OUT out;', '    Not(in=a, out=out); // #p1\n    Not(in=b, out=out); // #p2'))
      expect(net(doc, 'out')?.driver).toEqual({ kind: 'part-pin', partId: 'p1', pin: 'out' })
      expect(errors(diagnostics)).toEqual([
        expect.objectContaining({ code: 'multiple-drivers', netId: 'out', partId: 'p2', message: expect.stringMatching(/p1\.out.*p2\.out/) }),
      ])
    })

    it('returns no document, only syntax diagnostics, for text that is not HDL-shaped', () => {
      const result = parseSpec('CHIP X { IN a; OUT out; PARTS: Not(in=a out=out); }')
      expect(result.doc).toBeNull()
      expect(codes(result.diagnostics)).toEqual(['syntax'])
      expect(result.diagnostics[0]).toEqual(expect.objectContaining({ line: 1 }))
    })

    it('refuses a BUILTIN chip, which has no parts and no nets to be a spec of', () => {
      const result = parseSpec('CHIP Nand { IN a, b; OUT out; BUILTIN; }')
      expect(result.doc).toBeNull()
      expect(codes(result.diagnostics)).toEqual(['builtin-chip'])
    })
  })

  describe('part ids (§1.9)', () => {
    it("reads each part's trailing // #p<n> back as its id, in any order", () => {
      const { doc, diagnostics } = parsed(chip('IN a, b; OUT out;', '    Nand(a=a, b=b, out=t); // #p7\n    Not(in=t, out=out); // #p2'))
      expect(doc.parts).toEqual([
        { id: 'p7', chip: 'Nand' },
        { id: 'p2', chip: 'Not' },
      ])
      expect(diagnostics).toEqual([])
    })

    it('keys a part that lost its marker by its position, without colliding, and says so', () => {
      const { doc, diagnostics } = parsed(chip('IN a, b; OUT out;', '    Nand(a=a, b=b, out=t);\n    Not(in=t, out=u); // #p1\n    Not(in=u, out=out);'))
      expect(doc.parts.map((p) => p.id)).toEqual(['p2', 'p1', 'p3'])
      expect(diagnostics.filter((d) => d.code === 'part-id-assigned')).toEqual([
        expect.objectContaining({ severity: 'info', partId: 'p2' }),
        expect.objectContaining({ severity: 'info', partId: 'p3' }),
      ])
    })

    it('keeps a duplicated id on the first part only', () => {
      const { doc, diagnostics } = parsed(chip('IN a; OUT out;', '    Not(in=a, out=t); // #p1\n    Not(in=t, out=out); // #p1'))
      expect(doc.parts.map((p) => p.id)).toEqual(['p1', 'p2'])
      expect(codes(diagnostics)).toContain('duplicate-part-id')
    })
  })

  describe('schemaVersion is read on every load (§1)', () => {
    const sidecarAt = (version: number): string => `/* hacer-sidecar\n{ "schemaVersion": ${version}, "hints": { "3d": {}, "2d": {} }, "meta": {}, "tests": [], "notes": [] }\n*/\n`

    it.each([
      ['a version 2 header', '// hacer-spec 2\n', ''],
      ['a version 1 header, through migrate(1 → 2)', '// hacer-spec 1\n', ''],
      ['a version 1 header and sidecar, through migrate(1 → 2)', '// hacer-spec 1\n', sidecarAt(1)],
      ['a version 1 sidecar with no header, through migrate(1 → 2)', '', sidecarAt(1)],
    ])('reads %s as a version 2 document', (_what, header, sidecar) => {
      const result = parseSpec(`${header}${chip('IN a; OUT out;', '    Not(in=a, out=out); // #p1')}${sidecar}`)
      expect(result.diagnostics).toEqual([])
      expect([result.doc?.schemaVersion, result.sidecar?.schemaVersion]).toEqual([2, 2])
    })

    it.each([
      ['a version 1 header beside a version 2 sidecar', '// hacer-spec 1\n', sidecarAt(2)],
      ['a version 2 header beside a version 1 sidecar', '// hacer-spec 2\n', sidecarAt(1)],
    ])('refuses %s: a file is at one version', (_what, header, sidecar) => {
      const result = parseSpec(`${header}${chip('IN a; OUT out;', '    Not(in=a, out=out); // #p1')}${sidecar}`)
      expect(result.doc).toBeNull()
      expect(codes(result.diagnostics)).toEqual(['unknown-schema-version'])
    })

    it.each(['3', '0', 'banana', ''])('refuses header version "%s" with unknown-schema-version, never best-effort', (version) => {
      const result = parseSpec(`// hacer-spec ${version}\n${chip('IN a; OUT out;', '    Not(in=a, out=out); // #p1')}`)
      expect(result.doc).toBeNull()
      expect(result.diagnostics).toEqual([expect.objectContaining({ code: 'unknown-schema-version', severity: 'error' })])
    })

    it('refuses a document whose sidecar carries a version this build does not know', () => {
      const result = parseSpec(`${chip('IN a; OUT out;', '    Not(in=a, out=out); // #p1')}${sidecarAt(3)}`)
      expect(result.doc).toBeNull()
      expect(codes(result.diagnostics)).toEqual(['unknown-schema-version'])
    })

    it('refuses a sidecar block that is not a valid sidecar, rather than dropping its hints', () => {
      const result = parseSpec(`${chip('IN a; OUT out;', '    Not(in=a, out=out); // #p1')}/* hacer-sidecar\n{ "schemaVersion": 1, "hints": \n*/\n`)
      expect(result.doc).toBeNull()
      expect(codes(result.diagnostics)).toEqual(['invalid-sidecar'])
    })

    it('reads official .hdl, which has no header and no sidecar, as current text with an empty sidecar', () => {
      const result = parseSpec('CHIP And { IN a, b; OUT out; PARTS: Nand(a=a, b=b, out=n); Not(in=n, out=out); }')
      expect(result.doc?.schemaVersion).toBe(2)
      expect(result.sidecar).toEqual({ schemaVersion: 2, hints: { '3d': {}, '2d': {} }, meta: {}, tests: [], notes: [] })
    })
  })
})
