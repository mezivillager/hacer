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
const busEnd = (id: string, pinId: string): Endpoint => ({ type: 'bus', entityId: id, pinId })
const junctionEnd = (id: string): Endpoint => ({ type: 'junction', entityId: id })
const bus = (id: string, kind: 'splitter' | 'joiner', width: number) => ({ id, kind, position: ZERO, rotation: ZERO, width, inputs: [], outputs: [], selected: false })
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

const C10 = circuit('C10', {
  inputNodes: [node('ia', 'a'), node('ib', 'b')],
  outputNodes: [node('oo', 'out', 2)],
  gates: [gate('g1', 'Not'), gate('g2', 'Not')],
  busComponents: [bus('join', 'joiner', 2)],
  wires: [
    wire('w1', fromIn('ia'), pinIn('g1', 0), 1), wire('w2', fromIn('ib'), pinIn('g2', 0), 1),
    wire('w3', pinOut('g1'), busEnd('join', 'in0'), 1), wire('w4', pinOut('g2'), busEnd('join', 'in1'), 1),
    wire('w5', busEnd('join', 'out'), toOut('oo'), 2),
  ],
})
const C11 = circuit('C11', {
  inputNodes: [node('ia', 'a'), node('ib', 'b')],
  outputNodes: [node('oo', 'out', 2)],
  gates: [gate('g1', 'Not')],
  busComponents: [bus('join', 'joiner', 2)],
  wires: [
    wire('w1', fromIn('ia'), busEnd('join', 'in0'), 1), wire('w2', fromIn('ib'), pinIn('g1', 0), 1),
    wire('w3', pinOut('g1'), busEnd('join', 'in1'), 1), wire('w4', busEnd('join', 'out'), toOut('oo'), 2),
  ],
})
const JOINER_INTO_PART = circuit('JoinerIntoPart', {
  inputNodes: [node('ix', 'x', 4)],
  outputNodes: [node('oo', 'out', 16)],
  gates: [gate('g1', 'Not'), gate('g2', 'Not16')],
  busComponents: [bus('split', 'splitter', 4), bus('join', 'joiner', 4)],
  wires: [
    wire('w1', fromIn('ix'), busEnd('split', 'in'), 4), wire('w2', busEnd('split', 'out0'), pinIn('g1', 0), 1),
    wire('w3', pinOut('g1'), busEnd('join', 'in0'), 1),
    ...[1, 2, 3].map((i) => wire(`b${i}`, busEnd('split', `out${i}`), busEnd('join', `in${i}`), 1)),
    wire('w4', busEnd('join', 'out'), pinIn('g2', 0), 4), wire('w5', pinOut('g2'), toOut('oo'), 16),
  ],
})

const TWO_EMPTY_FEEDS = circuit('TwoEmptyFeeds', {
  inputNodes: [node('ia', 'a')],
  outputNodes: [node('oo', 'o', 16)],
  gates: [gate('g1', 'Not16')],
  busComponents: [bus('split', 'splitter', 2)],
  wires: [
    wire('w1', { type: 'input', entityId: 'ghost' }, junctionEnd('j1'), 4), wire('w2', busEnd('split', 'out0'), junctionEnd('j1'), 1),
    wire('w3', junctionEnd('j1'), pinIn('g1', 0), 4), wire('w4', pinOut('g1'), toOut('oo'), 16),
  ],
  junctions: [{ id: 'j1', position: ZERO, signalId: 'signal-j1', wireIds: ['w1', 'w2', 'w3'] }],
})
const LOOP_BESIDE_INPUT = circuit('LoopBesideInput', {
  inputNodes: [node('ia', 'a')],
  outputNodes: [node('oo', 'out')],
  busComponents: [bus('join', 'joiner', 2), bus('split', 'splitter', 2)],
  wires: [
    wire('w1', busEnd('join', 'out'), busEnd('split', 'in'), 2), wire('w2', busEnd('split', 'out0'), busEnd('join', 'in0'), 1),
    wire('w3', fromIn('ia'), busEnd('join', 'in0'), 1), wire('w4', busEnd('split', 'out0'), toOut('oo'), 1),
  ],
})

const CROSSED_LOOP = circuit('CrossedLoop', {
  outputNodes: [node('oo', 'o')],
  busComponents: [bus('join', 'joiner', 2), bus('split', 'splitter', 2)],
  wires: [
    wire('w1', busEnd('join', 'out'), busEnd('split', 'in'), 2), wire('w2', busEnd('split', 'out0'), busEnd('join', 'in0'), 1),
    wire('w3', busEnd('split', 'out1'), busEnd('join', 'in0'), 1), wire('w4', busEnd('split', 'out0'), busEnd('join', 'in1'), 1),
    wire('w5', busEnd('split', 'out1'), toOut('oo'), 1),
  ],
})

const seven = 7 as unknown as string
const NUMBER_BESIDE_STRING_JUNCTION = circuit('NumberBesideStringJunction', {
  inputNodes: [node('ia', 'a'), node('ib', 'b')],
  outputNodes: [node('oo', 'out')],
  gates: [gate('g1', 'Not')],
  wires: [
    wire('w0', fromIn('ib'), junctionEnd('7')), wire('w1', fromIn('ia'), junctionEnd(seven)),
    wire('w2', junctionEnd('7'), pinIn('g1', 0)), wire('w3', pinOut('g1'), toOut('oo')),
  ],
  junctions: [{ id: '7', position: ZERO, signalId: 'signal-7', wireIds: ['w0', 'w2'] }],
})
const NUMBER_BESIDE_STRING_JOINER = circuit('NumberBesideStringJoiner', {
  inputNodes: [node('ia', 'a'), node('ib', 'b')],
  outputNodes: [node('oo', 'out', 2)],
  busComponents: [bus('7', 'joiner', 2), bus(seven, 'joiner', 2)],
  wires: [wire('w0', fromIn('ib'), busEnd('7', 'in0'), 1), wire('w1', fromIn('ia'), busEnd(seven, 'in0'), 1), wire('w2', busEnd('7', 'out'), toOut('oo'), 2)],
})

const TWIN_JUNCTIONS = circuit('TwinJunctions', {
  inputNodes: [node('ib', 'b')],
  outputNodes: [node('oo', 'out')],
  gates: [gate('g1', 'Not')],
  wires: [wire('w0', fromIn('ib'), junctionEnd('7')), wire('w1', junctionEnd('7'), junctionEnd(seven)), wire('w2', junctionEnd(seven), pinIn('g1', 0)), wire('w3', pinOut('g1'), toOut('oo'))],
  junctions: [{ id: '7', position: ZERO, signalId: 'signal-7', wireIds: ['w0', 'w1'] }, { id: seven, position: ZERO, signalId: 'signal-seven', wireIds: ['w1', 'w2'] }],
})
const TWIN_JOINERS = circuit('TwinJoiners', {
  inputNodes: [node('ib', 'b')],
  outputNodes: [node('oo', 'out')],
  busComponents: [bus('7', 'joiner', 2), bus(seven, 'joiner', 2)],
  wires: [wire('w0', fromIn('ib'), busEnd('7', 'in0'), 1), wire('w1', busEnd('7', 'out'), busEnd(seven, 'in0'), 1), wire('w2', busEnd(seven, 'out'), toOut('oo'), 1)],
})
/** A splitter bit read back through twin `"7"`, which only loops, and through twin `7`, which `a` drives. */
function twinsInLoop(kind: 'junction' | 'joiner'): SerializedCircuit {
  const into = (id: string): Endpoint => (kind === 'junction' ? junctionEnd(id) : busEnd(id, 'in0'))
  const out = (id: string): Endpoint => (kind === 'junction' ? junctionEnd(id) : busEnd(id, 'out'))
  const wires = [
    wire('w1', busEnd('join', 'out'), busEnd('split', 'in'), 2), wire('w2', busEnd('split', 'out0'), into('7'), 1),
    wire('w3', out('7'), busEnd('join', 'in0'), 1), wire('w4', fromIn('ia'), into(seven), 1),
    wire('w5', out(seven), busEnd('join', 'in0'), 1), wire('w6', busEnd('split', 'out0'), toOut('oo'), 1),
  ]
  const twins = kind === 'joiner'
    ? { busComponents: [bus('join', 'joiner', 2), bus('split', 'splitter', 2), bus('7', 'joiner', 2), bus(seven, 'joiner', 2)] }
    : {
      busComponents: [bus('join', 'joiner', 2), bus('split', 'splitter', 2)],
      junctions: [{ id: '7', position: ZERO, signalId: 'signal-7', wireIds: ['w2', 'w3'] }, { id: seven, position: ZERO, signalId: 'signal-seven', wireIds: ['w4', 'w5'] }],
    }
  return circuit(`Twin${kind}sInLoop`, { inputNodes: [node('ia', 'a')], outputNodes: [node('oo', 'out')], wires, ...twins })
}

interface ChainShape { feed?: 'input' | 'missing' | 'loop'; closed?: boolean }

/** `a` into a Not through `stages` junctions or joiner/splitter pairs, each stage fed twice by the one before. */
function chain(kind: 'junction' | 'bus', stages: number, { feed = 'input', closed = false }: ChainShape = {}): SerializedCircuit {
  const wires: SerializedWire[] = []
  const add = (from: Endpoint, to: Endpoint, width?: number): void => void wires.push(wire(`w${wires.length + 1}`, from, to, width))
  const busComponents: Array<ReturnType<typeof bus>> = []
  if (feed === 'loop') {
    busComponents.push(bus('loopJoin', 'joiner', 2), bus('loopSplit', 'splitter', 2))
    add(busEnd('loopJoin', 'out'), busEnd('loopSplit', 'in'), 2)
    add(busEnd('loopSplit', 'out0'), busEnd('loopJoin', 'in0'), 1)
  }
  const first = { input: fromIn('ia'), missing: fromIn('ghost'), loop: busEnd('loopSplit', 'out0') }[feed]
  let feeds = [first, first]
  for (let s = 0; s < stages; s++) {
    if (kind === 'junction') {
      for (const from of feeds) add(from, junctionEnd(`j${s}`))
      feeds = [junctionEnd(`j${s}`), junctionEnd(`j${s}`)]
      continue
    }
    busComponents.push(bus(`join${s}`, 'joiner', 2), bus(`split${s}`, 'splitter', 2))
    for (const into of ['in0', 'in1']) for (const from of feeds) add(from, busEnd(`join${s}`, into), 1)
    add(busEnd(`join${s}`, 'out'), busEnd(`split${s}`, 'in'), 2)
    feeds = [busEnd(`split${s}`, 'out0'), busEnd(`split${s}`, 'out1')]
  }
  if (closed && kind === 'junction') add(junctionEnd(`j${stages - 1}`), junctionEnd('j0'))
  if (closed && kind === 'bus') add(busEnd(`split${stages - 1}`, 'out1'), busEnd('join0', 'in0'), 1)
  add(feeds[0], pinIn('g1', 0))
  add(pinOut('g1'), toOut('oo'))
  const junctions = kind === 'bus' ? [] : Array.from({ length: stages }, (_, s) => ({
    id: `j${s}`, position: ZERO, signalId: `signal-j${s}`, wireIds: wires.filter((w) => [w.from, w.to].some((e) => e.entityId === `j${s}`)).map((w) => w.id),
  }))
  const inputNodes = feed === 'loop' ? [] : [node('ia', 'a')]
  return circuit(`Chain${stages}`, { inputNodes, outputNodes: [node('oo', 'out')], gates: [gate('g1', 'Not')], busComponents, wires, junctions })
}

/** IN a through `stages` splitter→joiner pairs, `width` bits wide, to OUT out. */
function pipeline(stages: number, width: number): SerializedCircuit {
  const wires: SerializedWire[] = []
  const add = (from: Endpoint, to: Endpoint, bits: number): void => void wires.push(wire(`w${wires.length + 1}`, from, to, bits))
  const busComponents = Array.from({ length: stages }, (_, s) => [bus(`split${s}`, 'splitter', width), bus(`join${s}`, 'joiner', width)]).flat()
  let from = fromIn('ia')
  for (let s = 0; s < stages; s++) {
    add(from, busEnd(`split${s}`, 'in'), width)
    for (let i = 0; i < width; i++) add(busEnd(`split${s}`, `out${i}`), busEnd(`join${s}`, `in${i}`), 1)
    from = busEnd(`join${s}`, 'out')
  }
  add(from, toOut('oo'), width)
  return circuit(`Pipeline${stages}`, { inputNodes: [node('ia', 'a', width)], outputNodes: [node('oo', 'out', width)], busComponents, wires })
}

/** IN a through `stages` junctions, each fed twice by the one before and once by a splitter of it joined one bit rotated. */
function lattice(stages: number, width: number): SerializedCircuit {
  const wires: SerializedWire[] = []
  const add = (from: Endpoint, to: Endpoint, bits: number): void => void wires.push(wire(`w${wires.length + 1}`, from, to, bits))
  const busComponents = Array.from({ length: stages }, (_, s) => [bus(`split${s}`, 'splitter', width), bus(`join${s}`, 'joiner', width)]).flat()
  let from = fromIn('ia')
  for (let s = 0; s < stages; s++) {
    add(from, junctionEnd(`j${s}`), width)
    add(from, junctionEnd(`j${s}`), width)
    add(from, busEnd(`split${s}`, 'in'), width)
    for (let i = 0; i < width; i++) add(busEnd(`split${s}`, `out${i}`), busEnd(`join${s}`, `in${(i + 1) % width}`), 1)
    add(busEnd(`join${s}`, 'out'), junctionEnd(`j${s}`), width)
    from = junctionEnd(`j${s}`)
  }
  add(from, toOut('oo'), width)
  const junctions = Array.from({ length: stages }, (_, s) => ({
    id: `j${s}`, position: ZERO, signalId: `signal-j${s}`, wireIds: wires.filter((w) => [w.from, w.to].some((e) => e.entityId === `j${s}`)).map((w) => w.id),
  }))
  return circuit(`Lattice${stages}`, { inputNodes: [node('ia', 'a', width)], outputNodes: [node('oo', 'out', width)], busComponents, wires, junctions })
}

const LOCAL = [WITH_NOR, PARTS, PLACED, NAMES, C7, OUTPUT_AS_SOURCE, FAN_OUT, DUPLICATE, C8b]
const WITH_BUSES = [golden('bus-endpoints'), C10, C11, JOINER_INTO_PART]
const DOCUMENTS = [...GOLDENS.filter((g) => g.fixture !== 'bus-endpoints').map((g) => g.document), ...LOCAL, ...WITH_BUSES]

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
      '// hacer-spec 2',
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

  it('a floating part input reads the false net, which the constant false drives', () => {
    const { doc } = load(golden('junction-floating'))
    expect(doc.nets.filter((n) => n.id === 'false')).toEqual([{ id: 'false', driver: { kind: 'constant', value: false }, sinks: [{ kind: 'part-pin', partId: 'p1', pin: 'in' }] }])
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
          out?.kind === 'chip-out' ? printPinRef(out.pin, out.slice)
            : net.driver?.kind === 'chip-in' ? printPinRef(net.driver.pin, net.driver.slice)
              : net.driver?.kind === 'constant' ? String(net.driver.value)
                : net.driver === null ? '(no driver)' : splitNetId(net.id).signal
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

  it('a joiner dissolves by rewriting its producers: C10 gives nets out[0] and out[1], each driven by a part pin', () => {
    const { doc } = load(C10)
    expect(doc.nets.filter((n) => n.sinks.some((s) => s.kind === 'chip-out'))).toEqual([
      { id: 'out[0]', driver: { kind: 'part-pin', partId: 'p1', pin: 'out' }, sinks: [{ kind: 'chip-out', pin: 'out', slice: { start: 0, end: 0 } }] },
      { id: 'out[1]', driver: { kind: 'part-pin', partId: 'p2', pin: 'out' }, sinks: [{ kind: 'chip-out', pin: 'out', slice: { start: 1, end: 1 } }] },
    ])
    expect(printSpec(doc)).toContain('    Not(in=a, out=out[0]); // #p1\n    Not(in=b, out=out[1]); // #p2\n}')
  })

  it('a joiner bit driven by an input node is wire out[0] = a (C11, §1.6)', () => {
    const { doc } = load(C11)
    expect(doc.nets.find((n) => n.id === 'out[0]')).toEqual({ id: 'out[0]', driver: { kind: 'chip-in', pin: 'a' }, sinks: [{ kind: 'chip-out', pin: 'out', slice: { start: 0, end: 0 } }] })
    expect(printSpec(doc)).toContain('    Not(in=b, out=out[1]); // #p1\n    wire out[0] = a;\n}')
  })

  it('a bus feeding a part splits the reader\'s binding, and no internal signal is subscripted', () => {
    const { doc } = load(JOINER_INTO_PART)
    expect(printSpec(doc)).toContain('    Not(in=x[0], out=t1); // #p1\n    Not16(in[0]=t1, in[1..3]=x[1..3], out=out); // #p2\n}')
    const internal = doc.nets.filter((n) => n.driver?.kind === 'part-pin' && !n.sinks.some((s) => s.kind === 'chip-out')).map((n) => n.id)
    expect(internal).toEqual(['t1'])
  })

  it('no part, net or hint names a bus component', () => {
    for (const saved of WITH_BUSES) {
      const { doc, sidecar } = load(saved)
      const ids = (saved.busComponents ?? []).map((b) => b.id)
      expect(ids.length, saved.name).toBeGreaterThan(0)
      expect(Object.keys(doc).sort(), saved.name).toEqual(['ins', 'name', 'nets', 'outs', 'parts', 'schemaVersion'])
      const named = JSON.stringify([doc, sidecar.hints])
      expect(ids.filter((id) => new RegExp(`\\b${id}\\b`).test(named)), saved.name).toEqual([])
      expect(sidecar.notes.filter((n) => n.kind === 'bus-dissolved').map((n) => ids.find((id) => n.detail.includes(`"${id}"`))).sort(), saved.name).toEqual([...ids].sort())
    }
  })

  it('a junction whose two feeds both read nothing imports the same in either wire order', () => {
    const [first, second, ...rest] = TWO_EMPTY_FEEDS.wires
    const [saved, swapped] = [[first, second, ...rest], [second, first, ...rest]].map((wires) => load({ ...TWO_EMPTY_FEEDS, wires }))
    expect(printSpec(swapped.doc, { sidecar: swapped.sidecar })).toBe(printSpec(saved.doc, { sidecar: saved.sidecar }))
    expect(swapped.sidecar.notes).toEqual(saved.sidecar.notes)
  })

  it.each(['junction', 'bus'] as const)('a chain of 20 two-feed %s stages imports in under 100 ms', (kind) => {
    const saved = chain(kind, 20)
    const started = performance.now()
    const { doc } = load(saved)
    expect(performance.now() - started).toBeLessThan(100)
    expect(printSpec(doc)).toContain('    Not(in=a, out=out); // #p1\n}')
  })

  it.each(['junction', 'bus'] as const)('a chain of 20 two-feed %s stages closed into a loop imports in under 100 ms', (kind) => {
    const saved = chain(kind, 20, { closed: true })
    const started = performance.now()
    const { doc } = load(saved)
    expect(performance.now() - started).toBeLessThan(100)
    expect(printSpec(doc)).toContain('    Not(in=a, in=false, out=out); // #p1\n}')
  })

  it.each(['junction', 'bus'] as const)('a chain of 20 two-feed %s stages fed from a missing input and closed imports in under 100 ms', (kind) => {
    const saved = chain(kind, 20, { feed: 'missing', closed: true })
    const started = performance.now()
    const { doc } = load(saved)
    expect(performance.now() - started).toBeLessThan(100)
    expect(printSpec(doc)).toContain('    Not(in=false, out=out); // #p1\n}')
  })

  it.each(['junction', 'bus'] as const)('a chain of 20 two-feed %s stages fed by a bus-only loop imports in under 100 ms', (kind) => {
    const saved = chain(kind, 20, { feed: 'loop' })
    const started = performance.now()
    const { doc } = load(saved)
    expect(performance.now() - started).toBeLessThan(100)
    expect(printSpec(doc)).toContain('    Not(in=false, out=out); // #p1\n}')
  })

  it('a 64-stage, 16-bit loop-free bus pipeline imports in under 100 ms', () => {
    const saved = pipeline(64, 16)
    const started = performance.now()
    const { doc } = load(saved)
    expect(performance.now() - started).toBeLessThan(100)
    expect(printSpec(doc)).toContain('    wire out = a;\n}')
  })

  it('a 40-stage, 16-bit loop-free lattice imports in under 500 ms', () => {
    const saved = lattice(40, 16)
    const started = performance.now()
    const { doc, sidecar } = load(saved)
    expect(performance.now() - started).toBeLessThan(500)
    expect(printSpec(doc)).toContain('    wire out = a;\n')
    expect(sidecar.notes.filter((n) => n.kind === 'multiple-drivers').map((n) => n.detail.split(':')[0])).toEqual(['out has 307 drivers'])
  })

  it('a bit is noted as looping back to itself only when it has no other driver', () => {
    const loopsBack = (saved: SerializedCircuit) => load(saved).sidecar.notes.filter((n) => n.detail.includes('loops back'))
    expect(kinds(load(LOOP_BESIDE_INPUT).sidecar.notes)).toContain('multiple-drivers')
    expect(loopsBack(LOOP_BESIDE_INPUT)).toEqual([])
    expect(loopsBack({ ...LOOP_BESIDE_INPUT, wires: LOOP_BESIDE_INPUT.wires.filter((w) => w.id !== 'w3') })).toEqual([
      { kind: 'floating-source', pin: 'out', detail: expect.stringContaining('whose bit 0 only loops back to itself') },
    ])
  })

  it('a bit whose every route loops back through other undriven bits keeps its loops-back note', () => {
    expect(load(CROSSED_LOOP).sidecar.notes.filter((n) => n.kind === 'floating-source')).toEqual([
      { kind: 'floating-source', pin: 'o', detail: 'Wire "w5" reads nothing at splitter "split" pin "in", whose bit 0 only loops back to itself, so OUT o is left undriven' },
    ])
  })

  it.each([
    ['junction', NUMBER_BESIDE_STRING_JUNCTION, '    Not(in=b, out=out); // #p1\n}', ['dangling-sink']],
    ['joiner', NUMBER_BESIDE_STRING_JOINER, '    wire out[0] = b;\n}', ['bus-dissolved', 'bus-dissolved', 'floating-source', 'slice-inferred']],
  ] as const)('a wire into the number 7 never reaches the %s whose id is the string "7"', (_, saved, line, notes) => {
    const { doc, sidecar } = load(saved)
    expect(printSpec(doc)).toContain(line)
    expect(kinds(sidecar.notes)).toEqual(notes)
  })

  it.each([
    ['junctions', TWIN_JUNCTIONS, '    Not(in=b, out=out); // #p1\n}', []],
    ['joiners', TWIN_JOINERS, '    wire out = b;\n}', ['bus-dissolved', 'bus-dissolved']],
  ] as const)('%s 7 and "7" are traced as two, so one reading the other is no loop', (_, saved, line, notes) => {
    const { doc, sidecar } = load(saved)
    expect(printSpec(doc)).toContain(line)
    expect(kinds(sidecar.notes)).toEqual(notes)
  })

  it('driverCheck keys junctions and buses by JSON value, so twins 7 and "7" never share a seen entry', () => {
    for (const kind of ['junction', 'joiner'] as const) {
      const { doc, sidecar } = load(twinsInLoop(kind))
      expect(doc.nets.filter((n) => n.id === 'out').map((n) => n.driver), kind).toEqual([{ kind: 'chip-in', pin: 'a' }, null])
      expect(sidecar.notes.filter((n) => n.kind === 'floating-source'), kind).toEqual([
        { kind: 'floating-source', pin: 'out', detail: 'Wire "w6" reads nothing at splitter "split" pin "in", so it is kept as a driverless net on out beside the other drivers' },
      ])
    }
  })
})
