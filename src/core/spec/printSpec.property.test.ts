import { describe, expect, it } from 'vitest'
import { printPinRef } from '../hdl/printer'
import { parseSpec } from './parseSpec'
import { printSpec } from './printSpec'
import { mulberry32, shuffle, specPrograms } from './specPrograms'
import type { CircuitSpec, Net, Ref, SpecDiagnostic } from './types'

/** Issue number, so a failure replays from this file alone: program k is `specProgram(mulberry32(SEED + k), ...)`. */
const SEED = 0x168
const DOCUMENTS = 200

function load(source: string): { doc: CircuitSpec; diagnostics: SpecDiagnostic[] } {
  const { doc, diagnostics } = parseSpec(source)
  if (doc === null) throw new Error(`refused: ${diagnostics.map((d) => d.message).join('; ')}\n${source}`)
  return { doc, diagnostics }
}

const refKey = (ref: Ref | null): string =>
  ref === null ? 'none' : ref.kind === 'constant' ? `constant:${ref.value}` : `${ref.kind}:${ref.kind === 'part-pin' ? ref.partId : ''}:${printPinRef(ref.pin, ref.slice)}`
const sinkSet = (net: Net): string => [...new Set(net.sinks.map(refKey))].sort().join(' ')

/** The first way `b` is not netlist-equal to `a`, or null when it is. */
function netlistDiff(a: CircuitSpec, b: CircuitSpec): string | null {
  for (const key of ['schemaVersion', 'name', 'ins', 'outs', 'parts'] as const) {
    if (JSON.stringify(a[key]) !== JSON.stringify(b[key])) return `${key}: ${JSON.stringify(a[key])} vs ${JSON.stringify(b[key])}`
  }
  const left = new Map(a.nets.map((n) => [n.id, n]))
  const right = new Map(b.nets.map((n) => [n.id, n]))
  if (left.size !== a.nets.length || right.size !== b.nets.length) return 'a net id repeats'
  for (const id of new Set([...left.keys(), ...right.keys()])) {
    const x = left.get(id)
    const y = right.get(id)
    if (!x || !y) return `net ${id} is only on one side`
    if (refKey(x.driver) !== refKey(y.driver)) return `net ${id}: driver ${refKey(x.driver)} vs ${refKey(y.driver)}`
    if (sinkSet(x) !== sinkSet(y)) return `net ${id}: sinks ${sinkSet(x)} vs ${sinkSet(y)}`
  }
  return null
}

const diagnosticSet = (diagnostics: SpecDiagnostic[]): string[] => diagnostics.map((d) => JSON.stringify(d)).sort()

/** Each failing program as `Gen<k>: reason`, so the count and the replay index show together. */
function failing(programs: string[], check: (source: string) => string | null): string[] {
  return programs.flatMap((source, k) => {
    const reason = check(source)
    return reason === null ? [] : [`Gen${k}: ${reason}`]
  })
}

const programs = specPrograms(DOCUMENTS, SEED)

describe('printSpec round trip', () => {
  it('the generated documents cover 1- and 16-bit pins, part-pin slices, sliced reads, fan-out, pass-throughs and constants', () => {
    const docs = programs.map((p) => load(p).doc)
    const count = (has: (doc: CircuitSpec) => boolean): number => docs.filter(has).length
    const refs = (doc: CircuitSpec): Ref[] => doc.nets.flatMap((n) => [...(n.driver ? [n.driver] : []), ...n.sinks])
    const covered = {
      oneBit: count((d) => [...d.ins, ...d.outs].some((p) => p.width === 1)),
      sixteenBit: count((d) => [...d.ins, ...d.outs].some((p) => p.width === 16) && d.parts.some((p) => p.chip.endsWith('16'))),
      partPinSlice: count((d) => refs(d).some((r) => r.kind === 'part-pin' && r.slice !== undefined)),
      slicedRead: count((d) => d.nets.some((n) => n.driver?.kind === 'chip-in' && n.driver.slice !== undefined && n.sinks.some((s) => s.kind === 'part-pin'))),
      fanOut: count((d) => d.nets.some((n) => n.sinks.length > 1)),
      passThrough: count((d) => d.nets.some((n) => n.driver?.kind === 'chip-in' && n.sinks.some((s) => s.kind === 'chip-out'))),
      constant: count((d) => d.nets.some((n) => n.driver?.kind === 'constant')),
    }
    expect(Object.entries(covered).filter(([, n]) => n < DOCUMENTS / 10)).toEqual([])
  })

  it('parseSpec(printSpec(doc)) is netlist-equal to doc for 200 generated documents', () => {
    const failures = failing(programs, (source) => {
      const first = load(source)
      if (first.diagnostics.length > 0) return `diagnostics before: ${diagnosticSet(first.diagnostics).join('; ')}`
      const second = load(printSpec(first.doc))
      if (second.diagnostics.length > 0) return `diagnostics after: ${diagnosticSet(second.diagnostics).join('; ')}`
      return netlistDiff(first.doc, second.doc)
    })
    expect(failures).toEqual([])
  })

  it('printSpec is a fixed point after one round trip on every generated document', () => {
    const failures = failing(programs, (source) => {
      const printed = printSpec(load(source).doc)
      const again = printSpec(load(printed).doc)
      return again === printed ? null : `printed\n${printed}\nthen\n${again}`
    })
    expect(failures).toEqual([])
  })

  it("output does not depend on the order of nets or of a net's sinks", () => {
    const rng = mulberry32(SEED)
    const failures = failing(programs, (source) => {
      const { doc } = load(source)
      const printed = printSpec(doc)
      for (let round = 0; round < 3; round++) {
        const permuted = { ...doc, nets: shuffle(rng, doc.nets).map((n) => ({ ...n, sinks: shuffle(rng, n.sinks) })) }
        const text = printSpec(permuted)
        if (text !== printed) return `printed\n${printed}\nbut permuted\n${text}`
      }
      return null
    })
    expect(failures).toEqual([])
  })

  it('an unfinished document (a net with driver: null) round-trips with the same diagnostics', () => {
    const failures = failing(specPrograms(DOCUMENTS, SEED, { unfinished: true }), (source) => {
      const first = load(source)
      if (!first.doc.nets.some((n) => n.id === 'u0' && n.driver === null)) return 'no driverless u0 net'
      if (!first.diagnostics.some((d) => d.code === 'undriven' && d.netId === 'u0')) return 'u0 is not reported undriven'
      const second = load(printSpec(first.doc))
      const before = diagnosticSet(first.diagnostics)
      const after = diagnosticSet(second.diagnostics)
      if (before.join('\n') !== after.join('\n')) return `diagnostics ${before.join('; ')} became ${after.join('; ')}`
      return netlistDiff(first.doc, second.doc)
    })
    expect(failures).toEqual([])
  })

  it('netlist equality rejects a document with one sink moved to another net', () => {
    const rng = mulberry32(SEED)
    let moved = 0
    const failures = failing(programs, (source) => {
      const { doc } = load(source)
      const from = doc.nets.filter((n) => n.sinks.length > 0)
      if (from.length === 0 || doc.nets.length < 2) return null
      const donor = from[Math.floor(rng() * from.length)]
      const others = doc.nets.filter((n) => n !== donor)
      const target = others[Math.floor(rng() * others.length)]
      const sink = donor.sinks[Math.floor(rng() * donor.sinks.length)]
      const mutated: CircuitSpec = {
        ...doc,
        nets: doc.nets.map((n) =>
          n === donor ? { ...n, sinks: n.sinks.filter((s) => s !== sink) } : n === target ? { ...n, sinks: [...n.sinks, sink] } : n,
        ),
      }
      moved++
      return netlistDiff(doc, mutated) === null ? `moving ${refKey(sink)} from ${donor.id} to ${target.id} went unnoticed` : null
    })
    expect(failures).toEqual([])
    expect(moved).toBeGreaterThan(DOCUMENTS / 2)
  })
})
