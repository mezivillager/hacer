import { describe, expect, it } from 'vitest'
import { migrate, type SpecV1 } from './migrate'
import type { Net, Ref } from './types'

const pin = (partId: `p${number}`, name: string): Ref => ({ kind: 'part-pin', partId, pin: name })

const V1: SpecV1 = {
  doc: {
    schemaVersion: 1,
    name: 'L',
    ins: [{ name: 'a', width: 1 }],
    outs: [{ name: 'x', width: 1 }, { name: 'zeros', width: 16 }],
    parts: [{ id: 'p1', chip: 'And' }, { id: 'p2', chip: 'Not16' }, { id: 'p3', chip: 'Or' }],
    nets: [
      { id: 'a', driver: { kind: 'chip-in', pin: 'a' }, sinks: [pin('p1', 'a'), pin('p3', 'a')] },
      { id: 'true', driver: null, sinks: [pin('p1', 'b'), pin('p2', 'in')] },
      { id: 'false', driver: null, sinks: [pin('p3', 'b')] },
      { id: 'u', driver: null, sinks: [pin('p3', 'b')] },
      { id: 'x', driver: pin('p1', 'out'), sinks: [{ kind: 'chip-out', pin: 'x' }] },
      { id: 'zeros', driver: pin('p2', 'out'), sinks: [{ kind: 'chip-out', pin: 'zeros' }] },
    ],
  },
  sidecar: { schemaVersion: 1, hints: { '3d': { p1: { x: 1, y: 2, z: 3, origin: 'user' } }, '2d': {} }, meta: { title: 'L' }, tests: [], notes: [] },
}

function deepFreeze<T>(value: T): T {
  if (value !== null && typeof value === 'object' && !Object.isFrozen(value)) {
    Object.freeze(value)
    for (const inner of Object.values(value)) deepFreeze(inner)
  }
  return value
}

describe('migrate(1 → 2)', () => {
  it("gives each literal's driverless net its constant, and changes nothing else but the versions", () => {
    const constant = (net: Net): Net => (net.id === 'true' || net.id === 'false' ? { ...net, driver: { kind: 'constant', value: net.id === 'true' } } : net)
    expect(migrate(V1)).toEqual({
      doc: { ...V1.doc, schemaVersion: 2, nets: V1.doc.nets.map(constant) },
      sidecar: { ...V1.sidecar, schemaVersion: 2 },
    })
  })

  it('keeps any other driverless net driverless: it is unfinished, not a constant', () => {
    expect(migrate(V1).doc.nets.find((n) => n.id === 'u')?.driver).toBeNull()
  })

  it('is pure: it leaves its input as it was and gives the same output every time', () => {
    const input = deepFreeze(structuredClone(V1))
    const output = migrate(input)
    expect(input).toEqual(V1)
    expect(migrate(input)).toEqual(output)
  })
})
