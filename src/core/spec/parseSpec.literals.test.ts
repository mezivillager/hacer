import { describe, expect, it } from 'vitest'
import { parseSpec, undriven } from './parseSpec'
import type { Net, Ref } from './types'

const TRUE: Ref = { kind: 'constant', value: true }
const FALSE: Ref = { kind: 'constant', value: false }
const errors = (source: string) => parseSpec(source).diagnostics.filter((d) => d.severity === 'error')

// A literal is a constant source, as the reference's TRUE_BUS and FALSE_BUS are, and never a signal a
// part can write (the reference builder refuses `out=true`: "Internal pin name cannot be "true" or "false"").
describe('parseSpec — a literal is a constant driver', () => {
  it('gives net true the constant true and net false the constant false', () => {
    const source = 'CHIP X { IN a; OUT out, o; PARTS: And(a=a, b=true, out=out); Not(in=false, out=o); }'
    const { doc } = parseSpec(source)
    expect(errors(source)).toEqual([])
    expect(doc?.nets.find((n) => n.id === 'true')).toEqual({ id: 'true', driver: TRUE, sinks: [{ kind: 'part-pin', partId: 'p1', pin: 'b' }] })
    expect(doc?.nets.find((n) => n.id === 'false')).toEqual({ id: 'false', driver: FALSE, sinks: [{ kind: 'part-pin', partId: 'p2', pin: 'in' }] })
  })

  it('reads a part output bound to a literal as a second driver of its net, which keeps the constant', () => {
    const source = 'CHIP X { IN a; OUT out; PARTS: Not(in=a, out=true); And(a=a, b=true, out=out); }'
    expect(errors(source)).toEqual([{
      code: 'multiple-drivers',
      severity: 'error',
      netId: 'true',
      partId: 'p1',
      message: 'p1.out is bound to true, but a part output cannot drive a constant; p1.out is dropped',
    }])
    expect(parseSpec(source).doc?.nets.find((n) => n.id === 'true')).toEqual({ id: 'true', driver: TRUE, sinks: [{ kind: 'part-pin', partId: 'p2', pin: 'b' }] })
  })

  it('reports any driverless net undriven, whatever its id', () => {
    const nets: Net[] = [{ id: 'true', driver: null, sinks: [{ kind: 'part-pin', partId: 'p1', pin: 'b' }] }]
    expect(undriven(nets, new Set())).toEqual([{ code: 'undriven', severity: 'error', netId: 'true', message: 'Signal "true" is read but nothing drives it' }])
  })
})
