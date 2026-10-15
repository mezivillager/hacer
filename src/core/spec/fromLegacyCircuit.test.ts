import { describe, expect, it } from 'vitest'
import { printPinRef } from '../hdl/printer'
import { deserializeCircuit } from '../serialization/deserialize'
import { CIRCUIT_FORMAT_VERSION, type SerializedCircuit, type SerializedWire } from '../serialization/types'
import { fromLegacyCircuit } from './fromLegacyCircuit'
import { splitNetId } from './netId'
import { parseSpec } from './parseSpec'
import { printSpec } from './printSpec'
import { emptySidecar } from './sidecar'
import { mulberry32, shuffle } from './specPrograms'
import type { CircuitSpec, ImportNote } from './types'

interface Golden {
  fixture: string
  document: SerializedCircuit
}
type Endpoint = SerializedWire['from']

const GOLDENS = Object.values(
  import.meta.glob<Golden>('../serialization/__snapshots__/characterization/evaluation/*.json', { eager: true, import: 'default' }),
)

function golden(name: string): SerializedCircuit {
  const found = GOLDENS.find((g) => g.fixture === name)
  if (!found) throw new Error(`no #331 golden named ${name}`)
  return found.document
}

const ZERO = { x: 0, y: 0, z: 0 }
const node = (id: string, name: string, width = 1) => ({ id, name, position: ZERO, rotation: ZERO, value: 0, width })
const gate = (id: string, type: string) => ({ id, type, position: ZERO, rotation: ZERO, width: 1 })
const wire = (id: string, from: Endpoint, to: Endpoint, width?: number): SerializedWire => ({
  id, from, to, segments: [], crossesWireIds: [], ...(width === undefined ? {} : { width }),
})
const fromIn = (id: string): Endpoint => ({ type: 'input', entityId: id })
const toOut = (id: string): Endpoint => ({ type: 'output', entityId: id })
const pinIn = (gateId: string, i: number): Endpoint => ({ type: 'gate', entityId: gateId, pinId: `${gateId}-in-${i}` })
const pinOut = (gateId: string): Endpoint => ({ type: 'gate', entityId: gateId, pinId: `${gateId}-out-0` })
const circuit = (name: string, parts: Partial<SerializedCircuit>): SerializedCircuit => ({
  version: CIRCUIT_FORMAT_VERSION, name, savedAt: '2026-10-15T00:00:00.000Z',
  gates: [], wires: [], inputNodes: [], outputNodes: [], junctions: [], busComponents: [], ...parts,
})

const WITH_NOR = circuit('WithNor', {
  inputNodes: [node('ia', 'a')],
  outputNodes: [node('oo', 'out')],
  gates: [gate('g1', 'NOR'), gate('g2', 'Not')],
  wires: [wire('w1', fromIn('ia'), pinIn('g1', 0)), wire('w2', fromIn('ia'), pinIn('g2', 0)), wire('w3', pinOut('g2'), toOut('oo'))],
})
const PARTS = circuit('Parts', {
  inputNodes: [node('ia', 'a'), node('ib', 'b'), node('ix', 'x', 16)],
  outputNodes: [node('oo', 'out'), node('on', 'notX', 16)],
  gates: [gate('g1', 'AND'), gate('g2', 'Not16'), gate('g3', 'Nand')],
  wires: [
    wire('w1', fromIn('ia'), pinIn('g1', 0)), wire('w2', fromIn('ib'), pinIn('g1', 1)),
    wire('w3', fromIn('ix'), pinIn('g2', 0), 16), wire('w4', pinOut('g2'), toOut('on'), 16),
    wire('w5', pinOut('g1'), pinIn('g3', 0)), wire('w6', fromIn('ia'), pinIn('g3', 1)), wire('w7', pinOut('g3'), toOut('oo')),
  ],
})
const PLACED = circuit('Placed', {
  inputNodes: [{ ...node('ia', 'a'), position: { x: -12, y: 0, z: 4 } }],
  outputNodes: [{ ...node('oo', 'out'), position: { x: 12, y: 0.5, z: -4 }, rotation: { x: 0, y: -1.25, z: 0 } }],
  gates: [{ ...gate('g1', 'Not'), position: { x: 1, y: 2, z: 3 }, rotation: { x: 0.25, y: 1.5, z: 0.75 } }],
  wires: [wire('w1', fromIn('ia'), pinIn('g1', 0)), wire('w2', pinOut('g1'), toOut('oo'))],
  junctions: [{ id: 'j1', position: { x: 9, y: 9, z: 9 }, signalId: 's', wireIds: ['w1'] }],
})
const NAMES = circuit('two inputs a', {
  inputNodes: [node('i1', 'a'), node('i2', 'a'), node('i3', 'true')],
  outputNodes: [node('o1', 'my_out'), node('o2', '2nd')],
  gates: [gate('g1', 'And'), gate('g2', 'Not')],
  wires: [
    wire('w1', fromIn('i1'), pinIn('g1', 0)), wire('w2', fromIn('i2'), pinIn('g1', 1)), wire('w3', pinOut('g1'), toOut('o1')),
    wire('w4', fromIn('i3'), pinIn('g2', 0)), wire('w5', pinOut('g2'), toOut('o2')),
  ],
})
const C7 = circuit('C7', {
  inputNodes: [node('ia', 'a')],
  outputNodes: [node('oo', 'out')],
  wires: [wire('w1', fromIn('ia'), toOut('oo'), 1)],
})
const OUTPUT_AS_SOURCE = circuit('OutputAsSource', {
  inputNodes: [node('ia', 'unused')],
  outputNodes: [node('o1', 'first'), node('o2', 'second')],
  gates: [gate('g1', 'Not')],
  wires: [wire('w1', { type: 'output', entityId: 'o1' }, pinIn('g1', 0)), wire('w2', pinOut('g1'), toOut('o2'))],
})
const FAN_OUT = circuit('FanOut', {
  inputNodes: [node('ia', 'a'), node('ix', 'x', 16)],
  outputNodes: [node('oo', 'out'), node('on', 'notOut'), node('ol', 'lsb')],
  gates: [gate('g1', 'Not'), gate('g2', 'Not'), gate('g3', 'Not16'), gate('g4', 'Not')],
  wires: [
    wire('w1', fromIn('ia'), pinIn('g1', 0)), wire('w2', pinOut('g1'), toOut('oo')), wire('w3', pinOut('g1'), pinIn('g2', 0)),
    wire('w4', pinOut('g2'), toOut('on')), wire('w5', fromIn('ix'), pinIn('g3', 0), 16), wire('w6', pinOut('g3'), pinIn('g4', 0), 16),
    wire('w7', pinOut('g4'), toOut('ol')),
  ],
})
const DUPLICATE = circuit('Duplicate', {
  inputNodes: [node('ia', 'a')],
  outputNodes: [node('oo', 'out')],
  gates: [gate('g1', 'Not')],
  wires: [wire('w1', fromIn('ia'), pinIn('g1', 0)), wire('w2', fromIn('ia'), pinIn('g1', 0)), wire('w3', pinOut('g1'), toOut('oo'))],
})
const C8b = circuit('C8b', {
  inputNodes: [node('ia', 'a'), node('ib', 'b')],
  outputNodes: [node('oo', 'out')],
  gates: [gate('g1', 'Not')],
  wires: [wire('w1', fromIn('ia'), pinIn('g1', 0)), wire('w2', pinOut('g1'), toOut('oo')), wire('w3', fromIn('ib'), toOut('oo'))],
})

const LOCAL = [WITH_NOR, PARTS, PLACED, NAMES, C7, OUTPUT_AS_SOURCE, FAN_OUT, DUPLICATE, C8b]
const DOCUMENTS = [...GOLDENS.filter((g) => g.fixture !== 'bus-endpoints').map((g) => g.document), ...LOCAL]

function load(saved: SerializedCircuit) {
  const { doc, sidecar } = fromLegacyCircuit(saved)
  if (doc === null) throw new Error(`${saved.name} returned no document: ${JSON.stringify(sidecar.notes)}`)
  return { doc, sidecar }
}

const kinds = (notes: ImportNote[]) => notes.map((n) => n.kind)
const multiplyDriven = (saved: SerializedCircuit) => kinds(load(saved).sidecar.notes).includes('multiple-drivers')

/** The document with net and sink order erased: what "the same netlist" means (#168). */
function netlist(doc: CircuitSpec) {
  const nets = [...doc.nets].sort((a, b) => (a.id < b.id ? -1 : 1))
  return { ...doc, nets: nets.map((n) => ({ ...n, sinks: n.sinks.map((s) => JSON.stringify(s)).sort() })) }
}

describe('fromLegacyCircuit', () => {
  it('a version deserializeCircuit does not read returns no document and its unsupported-version warning as a note', () => {
    const saved = { ...circuit('Later', {}), version: 2 } as unknown as SerializedCircuit
    expect(fromLegacyCircuit(saved)).toEqual({
      doc: null,
      sidecar: { ...emptySidecar(), notes: [{ kind: 'unsupported-version', detail: 'Unsupported circuit version: 2 — this build reads version 1.' }] },
    })
  })

  it('every DeserializeWarning becomes one note, its code as kind', () => {
    const { warnings } = deserializeCircuit(WITH_NOR)
    expect(warnings.map((w) => w.code)).toEqual(['unsupported-gate-type', 'dropped-wire'])
    const { doc, sidecar } = load(WITH_NOR)
    expect(sidecar.notes).toHaveLength(2)
    expect(sidecar.notes).toEqual(expect.arrayContaining(warnings.map((w) => ({ kind: w.code, detail: w.message }))))
    expect(doc.parts).toEqual([{ id: 'p1', chip: 'Not' }])
  })

  it('gates become parts p1…pn in document order with their chip names', () => {
    expect(fromLegacyCircuit).toHaveLength(1)
    const { doc } = load(PARTS)
    expect(doc.parts).toEqual([{ id: 'p1', chip: 'And' }, { id: 'p2', chip: 'Not16' }, { id: 'p3', chip: 'Nand' }])
    expect(printSpec(doc)).toBe([
      '// hacer-spec 1',
      'CHIP Parts {',
      '    IN a, b, x[16];',
      '    OUT out, notX[16];',
      '',
      '    PARTS:',
      '    And(a=a, b=b, out=t1); // #p1',
      '    Not16(in=x, out=notX); // #p2',
      '    Nand(a=t1, b=a, out=out); // #p3',
      '}',
      '',
    ].join('\n'))
  })

  it("positions become '3d' hints with origin 'user'", () => {
    const { sidecar } = load(PLACED)
    expect(sidecar.hints).toEqual({
      '3d': {
        p1: { x: 1, y: 2, z: 3, rotation: 1.5, origin: 'user' },
        'in:a': { x: -12, y: 0, z: 4, rotation: 0, origin: 'user' },
        'out:out': { x: 12, y: 0.5, z: -4, rotation: -1.25, origin: 'user' },
      },
      '2d': {},
    })
  })

  it('a name that is not an HDL identifier, or that repeats, is renamed deterministically, with a renamed note', () => {
    const xor = load(golden('xor-fanout-junctions'))
    expect(xor.doc.name).toBe('xorFanoutJunctions')
    expect(xor.sidecar.notes).toEqual([{ kind: 'renamed', detail: expect.stringContaining('"xor-fanout-junctions"') }])

    const { doc, sidecar } = load(NAMES)
    expect(doc.name).toBe('twoInputsA')
    expect(doc.ins.map((p) => p.name)).toEqual(['a', 'a2', 'true2'])
    expect(doc.outs.map((p) => p.name)).toEqual(['myOut', 'out2nd'])
    expect(sidecar.notes.filter((n) => n.kind === 'renamed').map((n) => n.pin)).toEqual([undefined, 'a2', 'myOut', 'out2nd', 'true2'])
    expect(Object.keys(sidecar.hints['3d'])).toEqual(['p1', 'p2', 'in:a', 'in:a2', 'in:true2', 'out:myOut', 'out:out2nd'])
    expect(printSpec(doc, { sidecar })).toBe(printSpec(load(NAMES).doc, { sidecar: load(NAMES).sidecar }))
  })

  it('every slice the importer invents is a slice-inferred note', () => {
    const { doc, sidecar } = load(golden('mixed-widths'))
    const sliced = sidecar.notes.filter((n) => n.kind === 'slice-inferred')
    expect(sliced).toEqual([
      { kind: 'slice-inferred', partId: 'p2', pin: 'in', detail: expect.stringContaining('a16[0] → p2.in') },
      { kind: 'slice-inferred', pin: 'narrow8', detail: expect.stringContaining('a16[0..7] → narrow8') },
      { kind: 'slice-inferred', pin: 'noWidthWire', detail: expect.stringContaining('a16[0] → noWidthWire[0]') },
      { kind: 'slice-inferred', pin: 'widened', detail: expect.stringContaining('b1 → widened[0]') },
    ])
    expect(printSpec(doc)).toContain([
      '    Not16(in=a16, out=not16); // #p1',
      '    Not(in=a16[0], out=notLsb); // #p2',
      '    wire narrow8 = a16[0..7];',
      '    wire noWidthWire[0] = a16[0];',
      '    wire widened[0] = b1;',
    ].join('\n'))
  })

  it('a pass-through is one net, driver chip-in, sink chip-out (§1.5)', () => {
    const { doc } = load(C7)
    expect(doc.nets).toEqual([{ id: 'out', driver: { kind: 'chip-in', pin: 'a' }, sinks: [{ kind: 'chip-out', pin: 'out' }] }])
    expect(printSpec(doc)).toContain('    PARTS:\n    wire out = a;\n}')
  })

  it('a floating or dangling source follows ruling 3, each with its note', () => {
    const dangling = load(golden('dangling-endpoints'))
    expect(printSpec(dangling.doc)).toContain('    Or(a=a, b=false, out=orWithMissing); // #p1\n}')
    expect(dangling.sidecar.notes.map((n) => [n.kind, n.partId, n.pin])).toEqual([
      ['dangling-sink', undefined, undefined],
      ['floating-source', 'p1', 'b'],
      ['floating-source', undefined, 'fromMissingGate'],
      ['floating-source', undefined, 'fromMissingInput'],
      ['floating-source', undefined, 'fromMissingJunction'],
      ['renamed', undefined, undefined],
    ])
    expect(dangling.sidecar.notes[0].detail).toContain('"w7"')

    const floating = load(golden('junction-floating'))
    expect(printSpec(floating.doc)).toContain('    Not(in=false, out=notFloating); // #p1\n}')
    expect(kinds(floating.sidecar.notes)).toEqual(['floating-source', 'floating-source', 'renamed'])

    const fromOutput = load(OUTPUT_AS_SOURCE)
    expect(printSpec(fromOutput.doc)).toContain('    Not(in=false, out=second); // #p1\n}')
    expect(fromOutput.sidecar.notes).toEqual([{ kind: 'floating-source', partId: 'p1', pin: 'in', detail: expect.stringContaining('"w1"') }])
  })

  it('two wires from one source are one connection, with a duplicate-wire note', () => {
    const { doc, sidecar } = load(DUPLICATE)
    expect(sidecar.notes).toEqual([{ kind: 'duplicate-wire', partId: 'p1', pin: 'in', detail: expect.stringContaining('"w1", "w2"') }])
    expect(doc.nets.find((n) => n.id === 'a')?.sinks).toEqual([{ kind: 'part-pin', partId: 'p1', pin: 'in' }])
  })

  it('no import contains a #722 construct', () => {
    expect(printSpec(load(FAN_OUT).doc)).toContain([
      '    Not(in=a, out=out, out=t1); // #p1',
      '    Not(in=t1, out=notOut); // #p2',
      '    Not16(in=x, out[0]=t2); // #p3',
      '    Not(in=t2, out=lsb); // #p4',
    ].join('\n'))
    const found = DOCUMENTS.flatMap((saved) => {
      const { doc } = load(saved)
      const outs = new Set(doc.outs.map((p) => p.name))
      const ports = new Set([...doc.ins, ...doc.outs].map((p) => p.name))
      return doc.nets.flatMap((net) => {
        const { signal, slice } = splitNetId(net.id)
        return [
          ...(outs.has(signal) && net.sinks.some((s) => s.kind === 'part-pin') ? [`${saved.name}: a part reads OUT ${net.id}`] : []),
          ...(net.driver?.kind === 'chip-out' ? [`${saved.name}: OUT-to-OUT alias ${net.id}`] : []),
          ...(slice && !ports.has(signal) ? [`${saved.name}: subscripted internal signal ${net.id}`] : []),
        ]
      })
    })
    expect(found).toEqual([])
  })

  it('net ids are sliced signal references (§1)', () => {
    const wrong = DOCUMENTS.flatMap((saved) => {
      const { doc, sidecar } = load(saved)
      const ports = new Set([...doc.ins, ...doc.outs].map((p) => p.name))
      const ids = doc.nets.map((n) => n.id)
      const repeats = ids.filter((id, i) => ids.indexOf(id) !== i)
      const shapes = doc.nets.flatMap((net) => {
        const out = net.sinks.find((s) => s.kind === 'chip-out')
        const expected =
          out ? printPinRef(out.pin, out.slice)
            : net.driver?.kind === 'chip-in' ? printPinRef(net.driver.pin, net.driver.slice)
              : net.driver === null ? 'false' : splitNetId(net.id).signal
        const named = /^[A-Za-z][A-Za-z0-9]*(\[\d+(\.\.\d+)?\])?$/.test(net.id)
        const internal = net.driver?.kind === 'part-pin' && !out ? !ports.has(net.id) : true
        return net.id === expected && named && internal ? [] : [`${saved.name}: net ${net.id} ${JSON.stringify(net)}`]
      })
      const allowed = kinds(sidecar.notes).includes('multiple-drivers') ? [] : repeats.map((id) => `${saved.name}: ${id} repeats`)
      return [...shapes, ...allowed]
    })
    expect(wrong).toEqual([])
    const { doc, sidecar } = load(C8b)
    expect(doc.nets.filter((n) => n.id === 'out')).toHaveLength(2)
    expect(sidecar.notes).toEqual([{ kind: 'multiple-drivers', pin: 'out', detail: expect.stringContaining('b (wire "w3")') }])
    expect(sidecar.notes[0].detail).toContain('p1.out (wire "w2")')
  })

  it('an import without a multiple-drivers note round-trips', () => {
    const unread = DOCUMENTS.filter((saved) => saved.inputNodes.length === 0)
    expect(unread.map((saved) => saved.name)).toEqual(['junction-floating'])
    for (const saved of unread) expect(parseSpec(printSpec(load(saved).doc)).diagnostics[0]?.message, `${saved.name} until #742`).toBe("Expected 'IN' but got 'OUT'")
    const cases = DOCUMENTS.filter((saved) => !multiplyDriven(saved) && !unread.includes(saved))
    expect(cases).toHaveLength(DOCUMENTS.length - 2)
    for (const saved of cases) {
      const { doc, sidecar } = load(saved)
      const back = parseSpec(printSpec(doc, { sidecar }))
      expect(back.diagnostics, saved.name).toEqual([])
      expect(back.doc && netlist(back.doc), saved.name).toEqual(netlist(doc))
      expect(back.sidecar, saved.name).toEqual(sidecar)
    }
  })

  it('the import does not depend on the order of wires', () => {
    const rng = mulberry32(0x377)
    for (const saved of DOCUMENTS.filter((s) => !multiplyDriven(s))) {
      const { doc, sidecar } = load(saved)
      const text = printSpec(doc, { sidecar })
      for (let round = 0; round < 5; round++) {
        const shuffled = load({ ...saved, wires: shuffle(rng, saved.wires) })
        expect(printSpec(shuffled.doc, { sidecar: shuffled.sidecar }), saved.name).toBe(text)
      }
    }
  })
})
