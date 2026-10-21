import { describe, expect, it } from 'vitest'
import { normalizeSpec } from './normalizeSpec'
import { SPEC_SCHEMA_VERSION } from './types'
import type { CircuitSpec } from './types'

const DOC: CircuitSpec = {
  schemaVersion: SPEC_SCHEMA_VERSION,
  name: 'X',
  ins: [{ name: 'a', width: 1 }],
  outs: [{ name: 'out', width: 1 }],
  parts: [{ id: 'p1', chip: 'Not' }],
  nets: [
    { id: 'gone', driver: null, sinks: [] },
    { id: 'written', driver: { kind: 'part-pin', partId: 'p1', pin: 'out' }, sinks: [] },
    { id: 'read', driver: null, sinks: [{ kind: 'part-pin', partId: 'p1', pin: 'in' }] },
  ],
}

describe('normalizeSpec — the one normalisation clause (§1)', () => {
  it('drops a net with neither a driver nor a sink, and keeps a net with either', () => {
    expect(normalizeSpec(DOC).nets.map((n) => n.id)).toEqual(['written', 'read'])
  })

  it('changes nothing else', () => {
    const { nets, ...rest } = normalizeSpec(DOC)
    expect(rest).toEqual({ schemaVersion: SPEC_SCHEMA_VERSION, name: 'X', ins: DOC.ins, outs: DOC.outs, parts: DOC.parts })
    expect(nets).toEqual(DOC.nets.slice(1))
    expect(normalizeSpec(normalizeSpec(DOC))).toEqual(normalizeSpec(DOC))
  })
})
