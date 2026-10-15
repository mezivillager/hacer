import { describe, expect, it } from 'vitest'
import { parseSpec } from './parseSpec'
import type { SpecDiagnostic } from './types'

const chip = (ports: string, parts: string): string => `CHIP X {\n    ${ports}\n    PARTS:\n${parts}\n}\n`

function diagnosticsOf(source: string): SpecDiagnostic[] {
  const result = parseSpec(source)
  if (result.doc === null) throw new Error(result.diagnostics.map((d) => d.message).join('; '))
  return result.diagnostics.filter((d) => d.code === 'multiple-drivers')
}

// §1.8: two sources on one bit parse, and the drawing shows the diagnostic compileSpec will refuse on.
describe('parseSpec — two sources on the same bit (§1.8)', () => {
  it('diagnoses two nets driving one bit of a signal, naming both', () => {
    const found = diagnosticsOf(chip('IN a[2], b; OUT out[2];', '    Not(in=b, out=out[0]); // #p1\n    wire out = a;'))
    expect(found).toEqual([expect.objectContaining({ severity: 'error', message: expect.stringMatching(/"out\[0\]".*"out"|"out".*"out\[0\]"/) })])
  })

  it('diagnoses C8, one input pin bound by two nets, and keeps both bindings', () => {
    const result = parseSpec(chip('IN a, b; OUT out;', '    Not(in=a, in=b, out=out); // #p1'))
    expect(result.diagnostics.filter((d) => d.code === 'multiple-drivers')).toEqual([expect.objectContaining({ partId: 'p1' })])
    expect(result.doc?.nets.filter((n) => n.sinks.some((s) => s.kind === 'part-pin' && s.pin === 'in')).map((n) => n.id)).toEqual(['a', 'b'])
  })

  it('accepts disjoint bits on either side: a dissolved joiner, and a pin bound in pieces', () => {
    expect(diagnosticsOf(chip('IN a, b; OUT out[2], any;', '    Not(in=a, out=out[0]); // #p1\n    Not(in=b, out=out[1]); // #p2\n    Or8Way(in[0]=a, in[1]=b, out=any); // #p3'))).toEqual([])
  })
})
