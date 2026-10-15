import { describe, expect, it } from 'vitest'
import { parseSpec } from './parseSpec'

// A literal is a constant source, never a signal a part can write (the reference builder refuses
// `out=true`: "Internal pin name cannot be "true" or "false"").
describe('parseSpec — literals take no driver', () => {
  it('diagnoses a part output bound to a literal by name, and leaves the literal net driverless', () => {
    const result = parseSpec('CHIP X { IN a; OUT out; PARTS: Not(in=a, out=true); And(a=a, b=true, out=out); }')
    expect(result.diagnostics.filter((d) => d.severity === 'error')).toEqual([
      expect.objectContaining({ code: 'literal-output', partId: 'p1', message: expect.stringContaining('p1.out') }),
    ])
    expect(result.doc?.nets.find((n) => n.id === 'true')).toEqual({ id: 'true', driver: null, sinks: [{ kind: 'part-pin', partId: 'p2', pin: 'b' }] })
  })
})
