// The round trip ADR-0020 §1.9 says must be re-measured on the shipped printer: the spike's "fixed
// point for all eleven cases" was taken without part-id markers and before nets, so it is not reused.
import { describe, expect, it } from 'vitest'
import { project1HdlSources } from '../hdl/project1HdlSources'
import { parseSpec } from './parseSpec'
import { printSpec } from './printSpec'
import { emptySidecar } from './sidecar'
import type { CircuitSpec, NodeId, Sidecar } from './types'

const SHAPES: Record<string, string> = {
  'a chip input sliced into an output (inferred slices)': 'CHIP S1 { IN bus[16]; OUT out[16]; PARTS: Not(in=bus[0], out=out[0]); }',
  'a 4-bit splitter and joiner, dissolved into slices': 'CHIP S2 { IN bus[4]; OUT out[4]; PARTS: Not(in=bus[0], out=out[3]); Not(in=bus[1], out=out[2]); Not(in=bus[2], out=out[1]); Not(in=bus[3], out=out[0]); }',
  'an unfinished circuit': 'CHIP S3 { IN a; OUT out; PARTS: Nand(a=a); Nand(); Not(in=t, out=out); }',
  'a pass-through': 'CHIP S4 { IN a; OUT out; PARTS: wire out = a; }',
  'one input pin bound twice': 'CHIP S5 { IN a, b; OUT out; PARTS: Not(in=a, in=b, out=out); }',
  'fan-out from a part': 'CHIP S6 { IN a, b; OUT x, y; PARTS: Nand(a=a, b=b, out=t); Not(in=t, out=x); Not(in=t, out=y); }',
  'a joiner fed by two parts': 'CHIP S7 { IN a, b; OUT out[2]; PARTS: Not(in=a, out=out[0]); Not(in=b, out=out[1]); }',
  'a joiner bit fed by a chip input': 'CHIP S8 { IN a, b; OUT out[2]; PARTS: Not(in=b, out=out[1]); wire out[0] = a; }',
  'a 16-bit pass-through': 'CHIP S9 { IN a[16]; OUT out[16]; PARTS: wire out = a; }',
  'an OUT-to-OUT alias chain': 'CHIP S10 { IN a; OUT x, y, z; PARTS: Not(in=a, out=z); wire y = z; wire x = y; }',
  'a part reading a mixed pass-through signal': 'CHIP S11 { IN a; OUT out[2], any; PARTS: Not(in=a, out=out[1]); wire out[0] = a; Or8Way(in[0..1]=out, out=any); }',
  'a literal input': 'CHIP S12 { IN a; OUT out; PARTS: Nand(a=a, b=true, out=out); }',
  'one output pin bound to two signals': 'CHIP S13 { IN a; OUT x, y; PARTS: Not(in=a, out=x, out=y); }',
}

const CASES = Object.entries({ ...project1HdlSources, ...SHAPES })

function load(text: string): { doc: CircuitSpec; sidecar: Sidecar } {
  const result = parseSpec(text)
  if (result.doc === null) throw new Error(result.diagnostics.map((d) => d.message).join('; '))
  return result
}

/** The document with net and sink order erased: what "the same netlist" means. */
function netlist(doc: CircuitSpec) {
  const nets = [...doc.nets].sort((a, b) => (a.id < b.id ? -1 : 1))
  return { ...doc, nets: nets.map((n) => ({ ...n, sinks: n.sinks.map((s) => JSON.stringify(s)).sort() })) }
}

/** A part's bindings as text, sorted: the identity a hint keyed by its id must keep. */
function bindingsOf(doc: CircuitSpec, partId: string): string[] {
  const out: string[] = []
  for (const net of doc.nets) {
    for (const ref of [net.driver, ...net.sinks]) {
      if (ref?.kind === 'part-pin' && ref.partId === partId) out.push(`${ref.pin}${JSON.stringify(ref.slice ?? null)}=${net.id}`)
    }
  }
  return out.sort()
}

function nodeOf(doc: CircuitSpec, id: NodeId): unknown {
  if (id.startsWith('in:')) return doc.ins.find((p) => `in:${p.name}` === id)
  if (id.startsWith('out:')) return doc.outs.find((p) => `out:${p.name}` === id)
  const part = doc.parts.find((p) => p.id === id)
  return part && { chip: part.chip, bindings: bindingsOf(doc, part.id) }
}

describe('the spec round trip, re-measured on the shipped printer (§1.9)', () => {
  it.each(CASES)('%s: print → parse → print is a fixed point, markers included', (_name, source) => {
    const first = load(source)
    const printed = printSpec(first.doc)
    const second = load(printed)
    expect(printSpec(second.doc)).toBe(printed)
    expect(netlist(second.doc)).toEqual(netlist(first.doc))
  })

  it.each(CASES)('%s: part ids are stable across two round trips', (_name, source) => {
    const first = load(source)
    const twice = load(printSpec(load(printSpec(first.doc)).doc))
    expect(twice.doc.parts).toEqual(first.doc.parts)
  })

  it('print → hand-edit → parse → print keeps every hint on its node', () => {
    const { doc } = load('CHIP Edit { IN a, b; OUT out, copy; PARTS: Nand(a=a, b=b, out=t); Not(in=t, out=out); wire copy = a; }')
    const hint = (x: number) => ({ x, y: 0, z: 0, origin: 'user' as const })
    const sidecar: Sidecar = {
      ...emptySidecar(),
      hints: { '3d': { p1: hint(0), p2: hint(2), 'in:a': hint(-2), 'out:copy': hint(4) }, '2d': { p2: hint(1) } },
    }
    const printed = printSpec(doc, { sidecar })
    const lines = printed.split('\n')
    const nand = lines.findIndex((l) => l.includes('// #p1'))
    const not = lines.findIndex((l) => l.includes('// #p2'))
    // Reorder the two parts, add an unmarked part above them, re-indent and comment by hand.
    ;[lines[nand], lines[not]] = [`\t// the inverter\n\t${lines[not].trim()}`, `\t${lines[nand].trim()}`]
    lines.splice(nand, 0, '\tAnd(a=a, b=b, out=extra);', '')
    const edited = load(lines.join('\n'))

    expect(edited.sidecar).toEqual(sidecar)
    for (const surface of ['3d', '2d'] as const) {
      for (const id of Object.keys(sidecar.hints[surface]) as NodeId[]) {
        expect(nodeOf(edited.doc, id)).toEqual(nodeOf(doc, id))
        expect(nodeOf(edited.doc, id)).toBeDefined()
      }
    }
    expect(edited.doc.parts).toEqual([
      { id: 'p3', chip: 'And' },
      { id: 'p2', chip: 'Not' },
      { id: 'p1', chip: 'Nand' },
    ])

    const reprinted = printSpec(edited.doc, { sidecar: edited.sidecar })
    expect(printSpec(load(reprinted).doc, { sidecar })).toBe(reprinted)
  })
})
