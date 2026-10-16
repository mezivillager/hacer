// ADR-0020 §10's acceptance test. The legacy oracle is `evaluateCircuit`, whose junction trace is structural
// (`findJunctionFeedWire`), so this file writes no second trace.
import { describe, expect, it } from 'vitest'
import { clampToWidth } from '@/simulation/busOps'
import { evaluateCircuit, getSignalSourceValue } from '@/simulation/topologicalEval'
import { getBuiltinChipRegistry } from '../chips/appRegistry'
import { DEFAULT_MAX_DEPTH, evaluateChip, evaluateChipWithCtx } from '../chips/evaluateChip'
import { compileHDL, hdlChipDefinition, type EvalContext } from '../hdl/compiler'
import { parseHDL } from '../hdl/parser'
import { deserializeCircuit } from '../serialization/deserialize'
import { CIRCUIT_FORMAT_VERSION, type SerializedCircuit, type SerializedWire } from '../serialization/types'
import { compileSpec } from './compileSpec'
import { fromLegacyCircuit } from './fromLegacyCircuit'
import { splitNetId } from './netId'
import { printSpec } from './printSpec'
import { mulberry32, type Rng } from './specPrograms'
import type { CircuitSpec } from './types'

interface Outcome {
  result: { status: 'ok' } | { status: 'cycle'; involvedGateIds: string[] }
  outputs: Record<string, number>
}
interface Golden {
  fixture: string
  document: SerializedCircuit
  vectors: Array<{ inputs: Record<string, number>; before: Outcome }>
}
type Vector = Record<string, number>
type Endpoint = SerializedWire['from']

const GOLDENS = Object.values(
  import.meta.glob<Golden>('../serialization/__snapshots__/characterization/evaluation/*.json', { eager: true, import: 'default' }),
)
const BUS_FREE = GOLDENS.filter((g) => g.fixture !== 'bus-endpoints')

function golden(name: string): Golden {
  const found = GOLDENS.find((g) => g.fixture === name)
  if (!found) throw new Error(`no #331 golden named ${name}`)
  return found
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
const junctionEnd = (id: string): Endpoint => ({ type: 'junction', entityId: id })
const busEnd = (id: string, pinId: string): Endpoint => ({ type: 'bus', entityId: id, pinId })
const bus = (id: string, kind: 'splitter' | 'joiner', width: number) => ({ id, kind, position: ZERO, rotation: ZERO, width, inputs: [], outputs: [], selected: false })
const circuit =(name: string, parts: Partial<SerializedCircuit>): SerializedCircuit => ({
  version: CIRCUIT_FORMAT_VERSION, name, savedAt: '2026-10-15T00:00:00.000Z',
  gates: [], wires: [], inputNodes: [], outputNodes: [], junctions: [], busComponents: [], ...parts,
})

const C6 = circuit('C6', {
  inputNodes: [node('ia', 'a')],
  outputNodes: [node('oo', 'out')],
  gates: [gate('g1', 'Nand')],
  wires: [wire('w1', fromIn('ia'), pinIn('g1', 0)), wire('w2', pinOut('g1'), toOut('oo'))],
})
const C7 = (width: number) => circuit(`C7w${width}`, {
  inputNodes: [node('ia', 'a', width)],
  outputNodes: [node('oo', 'out', width)],
  wires: [wire('w1', fromIn('ia'), toOut('oo'), width)],
})
const C9 = circuit('C9', {
  inputNodes: [node('ia', 'a')],
  outputNodes: [node('oo', 'out', 16)],
  gates: [gate('g1', 'Not16')],
  wires: [wire('w1', fromIn('ia'), pinIn('g1', 0), 1), wire('w2', pinOut('g1'), toOut('oo'), 16)],
})
const C8 = circuit('C8', {
  inputNodes: [node('ia', 'a'), node('ib', 'b')],
  outputNodes: [node('oo', 'out')],
  gates: [gate('g1', 'Not')],
  wires: [wire('w1', fromIn('ia'), pinIn('g1', 0)), wire('w2', fromIn('ib'), pinIn('g1', 0)), wire('w3', pinOut('g1'), toOut('oo'))],
})
const C8b = circuit('C8b', {
  inputNodes: [node('ia', 'a'), node('ib', 'b')],
  outputNodes: [node('oo', 'out')],
  gates: [gate('g1', 'Not'), gate('g2', 'Not')],
  wires: [
    wire('w1', fromIn('ia'), pinIn('g1', 0)), wire('w2', fromIn('ib'), pinIn('g2', 0)),
    wire('w3', pinOut('g1'), toOut('oo')), wire('w4', pinOut('g2'), toOut('oo')),
  ],
})
const TWO_FEEDS = circuit('TwoFeeds', {
  inputNodes: [node('ia', 'a'), node('ib', 'b')],
  outputNodes: [node('oo', 'out')],
  gates: [gate('g1', 'Not')],
  wires: [
    wire('w1', fromIn('ia'), junctionEnd('j1')), wire('w2', fromIn('ib'), junctionEnd('j1')),
    wire('w3', junctionEnd('j1'), pinIn('g1', 0)), wire('w4', pinOut('g1'), toOut('oo')),
  ],
  junctions: [{ id: 'j1', position: ZERO, signalId: 'signal-j1', wireIds: ['w1', 'w2', 'w3'] }],
})

const ghost: Endpoint = { type: 'input', entityId: 'ghost' }
const FLOATING_BESIDE_INPUT = circuit('FloatingBesideInput', {
  inputNodes: [node('ia', 'a')],
  outputNodes: [node('oo', 'out')],
  wires: [wire('w1', fromIn('ia'), toOut('oo')), wire('w2', ghost, toOut('oo'))],
})
const FLOATING_JUNCTION_BESIDE_PART = circuit('FloatingJunctionBesidePart', {
  inputNodes: [node('ia', 'a')],
  outputNodes: [node('oo', 'out')],
  gates: [gate('g1', 'Not')],
  wires: [wire('w1', fromIn('ia'), pinIn('g1', 0)), wire('w2', pinOut('g1'), toOut('oo')), wire('w3', junctionEnd('j1'), toOut('oo'))],
  junctions: [{ id: 'j1', position: ZERO, signalId: 'signal-j1', wireIds: ['w3'] }],
})
const FLOATING_INTO_PIN = circuit('FloatingIntoPin', {
  inputNodes: [node('ia', 'a')],
  outputNodes: [node('oo', 'out')],
  gates: [gate('g1', 'Not')],
  wires: [wire('w1', fromIn('ia'), pinIn('g1', 0)), wire('w2', ghost, pinIn('g1', 0)), wire('w3', pinOut('g1'), toOut('oo'))],
})

const C5 = circuit('C5', {
  inputNodes: [node('ia', 'a', 4)],
  outputNodes: [node('oo', 'out', 4)],
  busComponents: [bus('split', 'splitter', 4), bus('join', 'joiner', 4)],
  wires: [
    wire('w1', fromIn('ia'), busEnd('split', 'in'), 4),
    ...[0, 1, 2, 3].map((i) => wire(`b${i}`, busEnd('split', `out${i}`), busEnd('join', `in${i}`), 1)),
    wire('w2', busEnd('join', 'out'), toOut('oo'), 4),
  ],
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
const SPLITTER_ON_PART = circuit('SplitterOnPart', {
  inputNodes: [node('ix', 'x', 16)],
  outputNodes: [node('ol', 'lo'), node('ob', 'both'), node('ot', 'top')],
  gates: [gate('g1', 'Not16'), gate('g2', 'And')],
  busComponents: [bus('split', 'splitter', 4)],
  wires: [
    wire('w1', fromIn('ix'), pinIn('g1', 0), 16), wire('w2', pinOut('g1'), busEnd('split', 'in'), 4),
    wire('w3', busEnd('split', 'out0'), toOut('ol'), 1), wire('w4', busEnd('split', 'out1'), pinIn('g2', 0), 1),
    wire('w5', busEnd('split', 'out2'), pinIn('g2', 1), 1), wire('w6', pinOut('g2'), toOut('ob'), 1),
    wire('w7', busEnd('split', 'out3'), toOut('ot'), 1),
  ],
})
const JOINER_BIT_TWICE = circuit('JoinerBitTwice', {
  inputNodes: [node('ia', 'a'), node('ib', 'b')],
  outputNodes: [node('oo', 'out', 2)],
  busComponents: [bus('join', 'joiner', 2)],
  wires: [
    wire('w1', fromIn('ia'), busEnd('join', 'in0'), 1), wire('w2', fromIn('ib'), busEnd('join', 'in0'), 1),
    wire('w3', fromIn('ib'), busEnd('join', 'in1'), 1), wire('w4', busEnd('join', 'out'), toOut('oo'), 2),
  ],
})
const SPLITTER_FED_TWICE = circuit('SplitterFedTwice', {
  inputNodes: [node('ia', 'a', 2), node('ib', 'b')],
  outputNodes: [node('oo', 'top')],
  gates: [gate('g1', 'Not')],
  busComponents: [bus('split', 'splitter', 2)],
  wires: [
    wire('w1', fromIn('ia'), busEnd('split', 'in'), 2), wire('w2', fromIn('ib'), busEnd('split', 'in'), 1),
    wire('w3', busEnd('split', 'out1'), pinIn('g1', 0), 1), wire('w4', pinOut('g1'), toOut('oo'), 1),
  ],
})

const loop = (name: string, intoJoin: Endpoint, extra: Partial<SerializedCircuit> = {}): SerializedCircuit => circuit(name, {
  inputNodes: [node('ia', 'a')],
  outputNodes: [node('oo', 'out')],
  gates: [gate('g1', 'Not')],
  busComponents: [bus('join', 'joiner', 2), bus('split', 'splitter', 2)],
  wires: [
    wire('w1', intoJoin, busEnd('join', 'in0'), 1), wire('w2', busEnd('join', 'out'), busEnd('split', 'in'), 2),
    wire('w3', busEnd('split', 'out0'), busEnd('join', 'in1'), 1), wire('w4', busEnd('split', 'out1'), pinIn('g1', 0), 1),
    wire('w5', pinOut('g1'), toOut('oo'), 1),
  ],
  ...extra,
})
const FED_BACK = loop('FedBack', pinOut('g1'))
const ROUND_THE_BUS = loop('RoundTheBus', fromIn('ia'))
const INDEPENDENT_BITS = circuit('IndependentBits', {
  inputNodes: [node('ix', 'x')],
  outputNodes: [node('oo', 'out')],
  gates: [gate('g1', 'Not')],
  busComponents: [bus('join', 'joiner', 2), bus('split', 'splitter', 2)],
  wires: [
    wire('w1', fromIn('ix'), busEnd('join', 'in0'), 1), wire('w2', pinOut('g1'), busEnd('join', 'in1'), 1),
    wire('w3', busEnd('join', 'out'), busEnd('split', 'in'), 2), wire('w4', busEnd('split', 'out0'), pinIn('g1', 0), 1),
    wire('w5', pinOut('g1'), toOut('oo'), 1),
  ],
})
const BUS_ONLY_LOOP = circuit('BusOnlyLoop', {
  inputNodes: [node('ia', 'a')],
  outputNodes: [node('oo', 'out'), node('ol', 'looped')],
  busComponents: [bus('join', 'joiner', 2), bus('split', 'splitter', 2)],
  wires: [
    wire('w1', busEnd('join', 'out'), busEnd('split', 'in'), 2), wire('w2', busEnd('split', 'out0'), busEnd('join', 'in0'), 1),
    wire('w3', fromIn('ia'), busEnd('join', 'in1'), 1), wire('w4', busEnd('split', 'out1'), toOut('oo'), 1),
    wire('w5', busEnd('split', 'out0'), toOut('ol'), 1),
  ],
})

const BIT: Vector[] = [{ a: 0 }, { a: 1 }]
const every = (names: Record<string, number>): Vector[] =>
  Object.entries(names).reduce<Vector[]>((acc, [name, width]) => acc.flatMap((v) => Array.from({ length: 2 ** width }, (_, n) => ({ ...v, [name]: n }))), [{}])
const BUS: Array<[string, SerializedCircuit, Vector[]]> = [
  ['C5, a 4-bit splitter and joiner', C5, every({ a: 4 })],
  ['C10, a joiner fed by two parts', C10, every({ a: 1, b: 1 })],
  ['C11, a joiner bit fed by an input node', C11, every({ a: 1, b: 1 })],
  ['a joiner that feeds a part', JOINER_INTO_PART, every({ x: 4 })],
  ['a splitter on a part\'s output', SPLITTER_ON_PART, [0, 1, 2, 6, 9, 0xf, 0xabcd, 0xfff0].map((x) => ({ x }))],
  ['a joiner bit fed by two wires', JOINER_BIT_TWICE, every({ a: 1, b: 1 })],
  ['a splitter fed by two wires', SPLITTER_FED_TWICE, every({ a: 2, b: 1 })],
  ['a part fed back to itself through a joiner and a splitter, every bit carried', FED_BACK, BIT],
]
const BIT_LEVEL: Array<[string, SerializedCircuit, Vector[], (v: Vector) => Record<string, number>]> = [
  ['a bit carried round a joiner and a splitter into a part', ROUND_THE_BUS, BIT, ({ a }) => ({ out: 1 - a })],
  ['independent bits merged in a joiner and split back', INDEPENDENT_BITS, [{ x: 0 }, { x: 1 }], ({ x }) => ({ out: 1 - x })],
  ['a bit that only loops through bus components', BUS_ONLY_LOOP, BIT, ({ a }) => ({ out: a, looped: 0 })],
]
const ALIASES = ['junction-chain', 'xor-fanout-junctions', 'junction-loop', 'mixed-widths']
const SPIKE: Array<[string, SerializedCircuit, Vector[]]> = [
  ['C6', C6, BIT],
  ['C7 at width 1', C7(1), BIT],
  ['C7 at width 4', C7(4), Array.from({ length: 16 }, (_, a) => ({ a }))],
  ['C7 at width 16', C7(16), [0, 1, 0x8000, 0xabcd, 0xffff].map((a) => ({ a }))],
  ['C9', C9, BIT],
  ['an output node fed by an input and a missing entity', FLOATING_BESIDE_INPUT, BIT],
  ['an output node fed by a part and a floating junction', FLOATING_JUNCTION_BESIDE_PART, BIT],
  ['a part pin fed by an input and a missing entity', FLOATING_INTO_PIN, BIT],
  ...ALIASES.map((name, i): [string, SerializedCircuit, Vector[]] => [`C${i + 1} (${name})`, golden(name).document, golden(name).vectors.map((v) => v.inputs)]),
]

const registry = getBuiltinChipRegistry()
const ctx: EvalContext = { registry, depth: 0, maxDepth: DEFAULT_MAX_DEPTH, evalChip: evaluateChipWithCtx }

type Run = { outputs: Record<string, number> } | { refused: string[] }

/** The import evaluated through the export: `printSpec` → `parseHDL` → `compileHDL` → `evaluateChip`. */
function viaExport(doc: CircuitSpec, inputs: Vector): Run {
  const text = printSpec(doc, { dialect: 'nand2tetris' })
  const parsed = parseHDL(text)
  if (!parsed.success) throw new Error(`the export does not parse: ${parsed.errors.map((e) => e.message).join('; ')}\n${text}`)
  const compiled = compileHDL(parsed.chip, registry)
  if (!compiled.success) return { refused: compiled.errors.map((e) => e.message) }
  return { outputs: evaluateChip(hdlChipDefinition(parsed.chip, text), inputs, registry) }
}

/** The import evaluated as a spec: no parse step precedes it, so `compileSpec` takes the document as built. */
function viaCompileSpec(doc: CircuitSpec, inputs: Vector): Run {
  const compiled = compileSpec({ doc, diagnostics: [] }, registry)
  if (!compiled.success) return { refused: compiled.diagnostics.map((d) => d.message) }
  return { outputs: compiled.evaluate(inputs, ctx) }
}

function legacy(saved: SerializedCircuit, inputs: Vector): Outcome {
  const { document } = deserializeCircuit(saved)
  if (document === null) throw new Error(`${saved.name} does not load`)
  for (const n of document.inputNodes) if (inputs[n.name] !== undefined) n.value = inputs[n.name]
  const result = evaluateCircuit(document)
  return { result, outputs: Object.fromEntries(document.outputNodes.map((n) => [n.name, n.value])) }
}

/** #722's three constructs web-ide rejects; the import must emit none. */
function webIdeRejected(doc: CircuitSpec): string[] {
  const outs = new Set(doc.outs.map((p) => p.name))
  const ports = new Set([...doc.ins, ...doc.outs].map((p) => p.name))
  return doc.nets.flatMap((net) => {
    const { signal, slice } = splitNetId(net.id)
    return [
      ...(outs.has(signal) && net.sinks.some((s) => s.kind === 'part-pin') ? [`a part reads OUT ${net.id}`] : []),
      ...(net.driver?.kind === 'chip-out' ? [`OUT-to-OUT alias ${net.id}`] : []),
      ...(slice && !ports.has(signal) ? [`subscripted internal signal ${net.id}`] : []),
    ]
  })
}

/** §10's named outcomes that are not a value: the note, and the refusal it must come with. */
const REFUSALS = new Map([
  ['multiple-drivers', /is bound by both|has bits driven by both|names more than one net/],
  ['unconnected-input', /input pin "\w+" is not connected/],
])

/** Every vector on which the import is not in parity with `expected`, in one of §10's three ways. */
function parityFailures(saved: SerializedCircuit, vectors: Vector[], expected: Outcome[]): string[] {
  const { doc, sidecar } = fromLegacyCircuit(saved)
  if (doc === null) return [`no document: ${JSON.stringify(sidecar.notes)}`]
  const rejected = webIdeRejected(doc)
  if (rejected.length > 0) return rejected
  const named = sidecar.notes.map((n) => REFUSALS.get(n.kind)).find((r) => r !== undefined)
  return vectors.flatMap((vector, i) => {
    const inputs = Object.fromEntries(saved.inputNodes.map((n, k) => [doc.ins[k].name, vector[n.name] ?? 0]))
    const run = viaCompileSpec(doc, inputs)
    const want = named ?? (expected[i].result.status === 'cycle' ? /^Cyclic part dependency/ : null)
    const at = `${JSON.stringify(vector)}: `
    if (want) return 'refused' in run && run.refused.some((m) => want.test(m)) ? [] : [`${at}expected a refusal matching ${want}, got ${JSON.stringify(run)}`]
    if ('refused' in run) return [`${at}refused: ${run.refused.join('; ')}`]
    return saved.outputNodes.flatMap((n, k) => {
      const got = run.outputs[doc.outs[k].name]
      return got === expected[i].outputs[n.name] ? [] : [`${at}${n.name} is ${got}, legacy ${expected[i].outputs[n.name]}`]
    })
  })
}

/** The web-IDE-rejected constructs read off the nand2tetris export, then its values: what a learner takes to the web IDE. */
function exportFailures(saved: SerializedCircuit, vectors: Vector[], expected: Outcome[]): string[] {
  const { doc, sidecar } = fromLegacyCircuit(saved)
  if (doc === null) return ['no document']
  const parsed = parseHDL(printSpec(doc, { dialect: 'nand2tetris' }))
  if (!parsed.success) return [`the export does not parse: ${parsed.errors.map((e) => e.message).join('; ')}`]
  const outs = new Set(doc.outs.map((p) => p.name))
  const ports = new Set([...doc.ins, ...doc.outs].map((p) => p.name))
  const rejected = parsed.chip.parts.flatMap((part) => part.connections.flatMap((c) => [
    ...(registry.get(part.name)?.inputs.some((p) => p.name === c.internal) && outs.has(c.external) ? [`${part.name}.${c.internal} reads OUT ${c.external}`] : []),
    ...(c.externalSlice && !ports.has(c.external) ? [`subscripted internal signal ${c.external}`] : []),
  ]))
  if (rejected.length > 0 || sidecar.notes.some((n) => REFUSALS.has(n.kind))) return rejected
  return vectors.flatMap((vector, i) => {
    const run = viaExport(doc, Object.fromEntries(saved.inputNodes.map((n, k) => [doc.ins[k].name, vector[n.name] ?? 0])))
    if (expected[i].result.status === 'cycle') return 'refused' in run && run.refused.some((m) => /^Cyclic part dependency/.test(m)) ? [] : [`${JSON.stringify(vector)}: expected the export to be refused as cyclic, got ${JSON.stringify(run)}`]
    if ('refused' in run) return [`${JSON.stringify(vector)}: the export is refused: ${run.refused.join('; ')}`]
    return saved.outputNodes.flatMap((n, k) => (run.outputs[doc.outs[k].name] === expected[i].outputs[n.name] ? [] : [`${JSON.stringify(vector)}: the export gives ${n.name} = ${run.outputs[doc.outs[k].name]}, legacy ${expected[i].outputs[n.name]}`]))
  })
}

/** Random parts, inputs and OUTs of 1–16 bits and buses of 2–16; a deferred pin is wired last, from any source, so loops form. */
function randomBusDocument(rng: Rng, n: number): SerializedCircuit {
  const pick = <T,>(list: readonly T[]): T => list[Math.floor(rng() * list.length)]
  const ins = Array.from({ length: 1 + Math.floor(rng() * 3) }, (_, k) => node(`i${k}`, `in${k}`, pick([1, 2, 4, 8, 16])))
  const sources: Array<{ end: Endpoint; width: number }> = ins.map((x) => ({ end: fromIn(x.id), width: x.width }))
  const wires: SerializedWire[] = []
  const deferred: Array<[Endpoint, number]> = []
  const connect = (to: Endpoint, width: number): void => {
    const from = pick(sources)
    wires.push(wire(`w${wires.length + 1}`, from.end, to, rng() < 0.1 ? undefined : Math.min(from.width, width)))
  }
  const pin = (to: Endpoint, width: number, later: number): void => void (rng() < later ? deferred.push([to, width]) : connect(to, width))
  const gates: Array<ReturnType<typeof gate>> = []
  const buses: Array<ReturnType<typeof bus>> = []
  for (let k = 0; k < 2 + Math.floor(rng() * 6); k++) {
    const kind = pick(['Not', 'And', 'Not16', 'splitter', 'joiner', 'splitter', 'joiner', 'ring'] as const)
    if (kind === 'ring') {
      const [j, s, g, width] = [`j${k}`, `s${k}`, `n${k}`, 2 + Math.floor(rng() * 4)]
      buses.push(bus(j, 'joiner', width), bus(s, 'splitter', width))
      gates.push(gate(g, 'Not'))
      const split = Array.from({ length: width }, (_, i) => busEnd(s, `out${i}`))
      wires.push(wire(`w${wires.length + 1}`, busEnd(j, 'out'), busEnd(s, 'in'), width))
      for (let i = 0; i < width; i++) wires.push(wire(`w${wires.length + 1}`, rng() < 0.3 ? pinOut(g) : rng() < 0.6 ? pick(split) : pick(sources).end, busEnd(j, `in${i}`), 1))
      wires.push(wire(`w${wires.length + 1}`, pick(split), pinIn(g, 0), 1))
      sources.push({ end: pinOut(g), width: 1 }, ...split.map((end) => ({ end, width: 1 })))
      continue
    }
    if (kind === 'splitter' || kind === 'joiner') {
      const id = `b${k}`
      const width = pick([2, 3, 4, 8, 16])
      buses.push(bus(id, kind, width))
      for (const into of kind === 'splitter' ? ['in'] : Array.from({ length: width }, (_, i) => `in${i}`)) {
        if (rng() < 0.9) pin(busEnd(id, into), kind === 'splitter' ? width : 1, 0.3)
        if (rng() < 0.05) connect(busEnd(id, into), kind === 'splitter' ? width : 1)
      }
      sources.push(...(kind === 'splitter' ? Array.from({ length: width }, (_, i) => ({ end: busEnd(id, `out${i}`), width: 1 })) : [{ end: busEnd(id, 'out'), width }]))
      continue
    }
    const id = `g${k}`
    gates.push(gate(id, kind))
    for (let p = 0; p < (kind === 'And' ? 2 : 1); p++) pin(pinIn(id, p), kind === 'Not16' ? 16 : 1, 0.2)
    sources.push({ end: pinOut(id), width: kind === 'Not16' ? 16 : 1 })
  }
  for (const [to, width] of deferred) connect(to, width)
  const outs = Array.from({ length: 1 + Math.floor(rng() * 3) }, (_, k) => node(`o${k}`, `out${k}`, pick([1, 2, 4, 8, 16])))
  for (const o of outs) connect(toOut(o.id), o.width)
  return circuit(`random${n}`, { inputNodes: ins, outputNodes: outs, gates, busComponents: buses, wires })
}

const bitKey = (end: Endpoint, bit: number): string => `${end.entityId}:${end.pinId ?? ''}:${bit}`

/** Whether a part reads its own output, traced bit by bit through wires and bus components: the cycle the spec refuses. */
function partCycle(saved: SerializedCircuit): boolean {
  const { document } = deserializeCircuit(saved)
  if (document === null) throw new Error(`${saved.name} does not load`)
  const widthAt = (end: Endpoint, side: 'inputs' | 'outputs'): number => {
    const owner = end.type === 'gate' ? document.gates.find((g) => g.id === end.entityId) : end.type === 'bus' ? document.busComponents.find((b) => b.id === end.entityId) : undefined
    if (owner) return owner[side].find((p) => p.id === end.pinId)?.width ?? 1
    return (end.type === 'input' ? document.inputNodes : document.outputNodes).find((x) => x.id === end.entityId)?.width ?? 0
  }
  const edges = new Map<string, string[]>()
  const edge = (from: string, to: string): void => void edges.set(from, [...(edges.get(from) ?? []), to])
  for (const w of document.wires) {
    for (let b = 0; b < Math.min(w.width ?? 1, widthAt(w.to, 'inputs'), widthAt(w.from, 'outputs')); b++) edge(bitKey(w.from, b), bitKey(w.to, b))
  }
  for (const b of document.busComponents) {
    for (let i = 0; i < b.width; i++) {
      if (b.kind === 'splitter') edge(`${b.id}:in:${i}`, `${b.id}:out${i}:0`)
      else edge(`${b.id}:in${i}:0`, `${b.id}:out:${i}`)
    }
  }
  const bits = (pins: Array<{ id: string; width?: number }>, id: string): string[] => pins.flatMap((p) => Array.from({ length: p.width ?? 1 }, (_, b) => `${id}:${p.id}:${b}`))
  for (const g of document.gates) for (const from of bits(g.inputs, g.id)) for (const to of bits(g.outputs, g.id)) edges.set(from, [...(edges.get(from) ?? []), to])
  return document.gates.some((g) => {
    const own = new Set(bits(g.inputs, g.id))
    const seen = new Set<string>()
    const stack = bits(g.outputs, g.id)
    while (stack.length > 0) {
      const at = stack.pop() as string
      if (own.has(at)) return true
      if (seen.has(at)) continue
      seen.add(at)
      stack.push(...(edges.get(at) ?? []))
    }
    return false
  })
}

/** Whether a bus input bit is driven by a part output or an IN, traced back through wires and bus components. */
function driven(saved: SerializedCircuit, busId: string, pinId: string, bit: number): boolean {
  const { document } = deserializeCircuit(saved)
  if (document === null) throw new Error(`${saved.name} does not load`)
  const seen = new Set<string>()
  const stack: Array<[string, string, number]> = [[busId, pinId, bit]]
  while (stack.length > 0) {
    const [id, pin, b] = stack.pop() as [string, string, number]
    if (seen.has(`${id}:${pin}:${b}`)) continue
    seen.add(`${id}:${pin}:${b}`)
    const width = document.busComponents.find((x) => x.id === id)?.inputs.find((p) => p.id === pin)?.width ?? 1
    for (const { from, to, width: carried } of document.wires) {
      if (to.type !== 'bus' || to.entityId !== id || to.pinId !== pin || b >= Math.min(carried ?? 1, width)) continue
      const node = from.type === 'input' ? document.inputNodes.find((x) => x.id === from.entityId) : undefined
      const out = from.type === 'gate' ? document.gates.find((g) => g.id === from.entityId)?.outputs.find((p) => p.id === from.pinId) : undefined
      if ((node && b < node.width) || (out && b < (out.width ?? 1))) return true
      const source = from.type === 'bus' ? document.busComponents.find((x) => x.id === from.entityId) : undefined
      const at = source?.outputs.findIndex((p) => p.id === from.pinId) ?? -1
      if (source?.kind === 'joiner' && at >= 0 && b < source.inputs.length) stack.push([source.id, source.inputs[b].id, 0])
      if (source?.kind === 'splitter' && at >= 0 && b === 0) stack.push([source.id, 'in', at])
    }
  }
  return false
}

/** Legacy's own reads and clamps, repeated to a fixed point instead of run in order: the value each bit carries when no part loops. */
function relaxed(saved: SerializedCircuit, inputs: Vector): Record<string, number> {
  const { document } = deserializeCircuit(saved)
  if (document === null) throw new Error(`${saved.name} does not load`)
  for (const x of document.inputNodes) x.value = inputs[x.name] ?? 0
  const last = (to: Endpoint, pinId?: string) => document.wires.filter((w) => w.to.entityId === to.entityId && w.to.type === to.type && w.to.pinId === pinId).pop()
  const read = (to: Endpoint, pinId: string | undefined, width: number): number => {
    const w = last(to, pinId)
    return w ? clampToWidth(getSignalSourceValue(w.from, document), Math.min(w.width ?? 1, width)) : 0
  }
  let changed = true
  for (let round = 0; changed && round < 500; round++) {
    changed = false
    const set = (p: { value: number }, value: number): void => {
      if (p.value !== value) [p.value, changed] = [value, true]
    }
    for (const b of document.busComponents) {
      for (const p of b.inputs) set(p, read({ type: 'bus', entityId: b.id }, p.id, p.width ?? 1))
      if (b.kind === 'splitter') b.outputs.forEach((p, i) => set(p, (b.inputs[0].value >>> i) & 1))
      else set(b.outputs[0], b.inputs.reduce((acc, p, i) => (acc | ((p.value & 1) << i)) >>> 0, 0))
    }
    for (const g of document.gates) {
      for (const p of g.inputs) set(p, read({ type: 'gate', entityId: g.id }, p.id, p.width ?? 1))
      const chip = registry.get(g.chipName)
      const out = chip ? evaluateChip(chip, Object.fromEntries(g.inputs.map((p) => [p.name, p.value])), registry) : {}
      for (const p of g.outputs) set(p, clampToWidth(out[p.name] ?? 0, p.width ?? 1))
    }
  }
  return Object.fromEntries(document.outputNodes.map((o) => [o.name, read({ type: 'output', entityId: o.id }, undefined, o.width)]))
}

describe('legacy parity', () => {
  it('reads the eight bus-free #331 goldens', () => {
    expect(BUS_FREE.map((g) => g.fixture).sort()).toEqual([
      'dangling-endpoints', 'gate-cycle', 'junction-chain', 'junction-floating', 'junction-gesture-shape', 'junction-loop', 'mixed-widths', 'xor-fanout-junctions',
    ])
  })

  it.each(BUS_FREE.map((g) => [g.fixture, g] as const))('%s: the import evaluates as its #331 golden recorded', (_name, g) => {
    expect(parityFailures(g.document, g.vectors.map((v) => v.inputs), g.vectors.map((v) => v.before))).toEqual([])
  })

  it('junction-floating: the nand2tetris export is refused for its missing IN line until #742', () => {
    const { doc } = fromLegacyCircuit(golden('junction-floating').document)
    expect(doc?.ins).toEqual([])
    expect(() => doc && viaExport(doc, {})).toThrow("Expected 'IN' but got 'OUT'")
  })

  it("the oracle reads xor-fanout-junctions' branch-first junction structurally", () => {
    const xor = golden('xor-fanout-junctions')
    expect(xor.document.junctions.find((j) => j.id === 'jn1')?.wireIds[0]).toBe('wn1-branch')
    expect(xor.vectors.map((v) => v.inputs)).toEqual([{ a: 0, b: 0 }, { a: 0, b: 1 }, { a: 1, b: 0 }, { a: 1, b: 1 }])
    expect(xor.vectors.map((v) => legacy(xor.document, v.inputs).outputs.out)).toEqual([0, 1, 1, 0])
  })

  it.each(SPIKE)('%s: the import evaluates as evaluateCircuit does', (_name, saved, vectors) => {
    expect(parityFailures(saved, vectors, vectors.map((v) => legacy(saved, v)))).toEqual([])
  })

  it('C6: an unwired gate input is refused by name, with an unconnected-input note', () => {
    const { doc, sidecar } = fromLegacyCircuit(C6)
    expect(sidecar.notes).toEqual([{ kind: 'unconnected-input', partId: 'p1', pin: 'b', detail: expect.stringContaining('"b"') }])
    expect(doc && viaExport(doc, { a: 1 })).toEqual({ refused: ['Part "Nand" input pin "b" is not connected'] })
    expect(doc && viaCompileSpec(doc, { a: 1 })).toEqual({ refused: expect.arrayContaining(['Part "Nand" input pin "b" is not connected']) })
  })

  it('C8: two wires into one gate input keep both drivers, one multiple-drivers note names both, and the export is refused', () => {
    const { doc, sidecar } = fromLegacyCircuit(C8)
    const notes = sidecar.notes.filter((n) => n.kind === 'multiple-drivers')
    expect(notes).toEqual([{ kind: 'multiple-drivers', partId: 'p1', pin: 'in', detail: expect.stringContaining('a (wire "w1")') }])
    expect(notes[0].detail).toContain('b (wire "w2")')
    expect(doc?.nets.filter((n) => n.sinks.some((s) => s.kind === 'part-pin' && s.pin === 'in')).map((n) => n.id).sort()).toEqual(['a', 'b'])
    expect(doc && webIdeRejected(doc)).toEqual([])
    expect(doc && viaExport(doc, { a: 1, b: 0 })).toEqual({ refused: ['Part "Not" pin "in" bit 0 is bound by more than one connection'] })
    expect(doc && viaCompileSpec(doc, { a: 1, b: 0 })).toEqual({ refused: expect.arrayContaining(['p1 pin "in" is bound by both "a" and "b"']) })
  })

  it('C8b: two wires into one output node keep both drivers, and the export is refused', () => {
    const { doc, sidecar } = fromLegacyCircuit(C8b)
    expect(sidecar.notes).toEqual([{ kind: 'multiple-drivers', pin: 'out', detail: expect.stringContaining('p1.out (wire "w3")') }])
    expect(sidecar.notes[0].detail).toContain('p2.out (wire "w4")')
    expect(doc?.nets.filter((n) => n.id === 'out').map((n) => n.driver)).toEqual([
      { kind: 'part-pin', partId: 'p1', pin: 'out' },
      { kind: 'part-pin', partId: 'p2', pin: 'out' },
    ])
    expect(doc && webIdeRejected(doc)).toEqual([])
    expect(doc && viaExport(doc, { a: 1, b: 0 })).toEqual({ refused: ['Signal "out" is driven by more than one part'] })
    expect(doc && viaCompileSpec(doc, { a: 1, b: 0 })).toEqual({
      refused: expect.arrayContaining(['Signal "out" has bits driven by both p1.out (net "out") and p2.out (net "out")']),
    })
  })

  it("a junction fed by two wires is C8's case", () => {
    const { doc, sidecar } = fromLegacyCircuit(TWO_FEEDS)
    expect(sidecar.notes).toEqual([{ kind: 'multiple-drivers', partId: 'p1', pin: 'in', detail: expect.stringContaining('a (wire "w3")') }])
    expect(sidecar.notes[0].detail).toContain('b (wire "w3")')
    expect(doc && viaExport(doc, { a: 1, b: 0 })).toEqual({ refused: ['Part "Not" pin "in" bit 0 is bound by more than one connection'] })
    expect(doc && viaCompileSpec(doc, { a: 1, b: 0 })).toEqual({ refused: expect.arrayContaining(['p1 pin "in" is bound by both "a" and "b"']) })
    expect(parityFailures(TWO_FEEDS, BIT, BIT.map((v) => legacy(TWO_FEEDS, v)))).toEqual([])
  })

  it('an output node fed by a real wire and a floating one keeps both drivers, and compileSpec refuses it', () => {
    const { doc, sidecar } = fromLegacyCircuit(FLOATING_BESIDE_INPUT)
    expect(sidecar.notes).toEqual([
      { kind: 'floating-source', pin: 'out', detail: expect.stringContaining('a driverless net on out') },
      { kind: 'multiple-drivers', pin: 'out', detail: 'out has 2 drivers: a (wire "w1"), nothing (wire "w2"); every one is kept' },
    ])
    expect(doc?.nets.filter((n) => n.id === 'out').map((n) => n.driver)).toEqual([{ kind: 'chip-in', pin: 'a' }, null])
    expect(doc && viaCompileSpec(doc, { a: 1 })).toEqual({ refused: expect.arrayContaining(['Net id "out" names more than one net; a document holds one net per id']) })
  })

  it('the nand2tetris export has no form for a driverless net on an OUT, so it prints the real driver alone', () => {
    const { doc } = fromLegacyCircuit(FLOATING_BESIDE_INPUT)
    expect(doc && printSpec(doc, { dialect: 'nand2tetris' })).toContain('    Or(a=a, b=a, out=out);\n}')
    expect(doc && viaExport(doc, { a: 1 })).toEqual({ outputs: { out: 1 } })
  })

  it('the comparator fails an import with one wire dropped', () => {
    const xor = golden('xor-fanout-junctions')
    const vectors = xor.vectors.map((v) => v.inputs)
    const recorded = xor.vectors.map((v) => v.before)
    const dropped = { ...xor.document, wires: xor.document.wires.filter((w) => w.id !== 'wo') }
    expect(parityFailures(xor.document, vectors, recorded)).toEqual([])
    expect(parityFailures(dropped, vectors, recorded)).toEqual([
      '{"a":0,"b":1}: out is 0, legacy 1',
      '{"a":1,"b":0}: out is 0, legacy 1',
    ])
  })

  it('bus-endpoints: the import evaluates as its #331 golden recorded', () => {
    const g = golden('bus-endpoints')
    const vectors = g.vectors.map((v) => v.inputs)
    expect(vectors.length).toBeGreaterThan(0)
    expect(parityFailures(g.document, vectors, g.vectors.map((v) => v.before))).toEqual([])
    expect(exportFailures(g.document, vectors, g.vectors.map((v) => v.before))).toEqual([])
  })

  it.each(BUS)('%s: the import evaluates as evaluateCircuit does', (_name, saved, vectors) => {
    const expected = vectors.map((v) => legacy(saved, v))
    expect(parityFailures(saved, vectors, expected)).toEqual([])
    expect(exportFailures(saved, vectors, expected)).toEqual([])
  })

  it('a joiner or splitter input fed by two wires keeps both drivers, and compileSpec refuses it', () => {
    for (const saved of [JOINER_BIT_TWICE, SPLITTER_FED_TWICE]) {
      const { doc, sidecar } = fromLegacyCircuit(saved)
      expect(sidecar.notes.filter((n) => n.kind === 'multiple-drivers'), saved.name).toHaveLength(1)
      expect(doc && viaCompileSpec(doc, {}), saved.name).toEqual({ refused: expect.arrayContaining([expect.stringMatching(/is bound by both|has bits driven by both|names more than one net/)]) })
    }
  })

  it.each(BIT_LEVEL)('%s: legacy calls it a cycle, and the import evaluates as the bits flow', (_name, saved, vectors, truth) => {
    expect(vectors.map((v) => legacy(saved, v).result.status)).toEqual(vectors.map(() => 'cycle'))
    expect(partCycle(saved)).toBe(false)
    const expected = vectors.map((v) => ({ result: { status: 'ok' as const }, outputs: truth(v) }))
    expect(vectors.map((v) => relaxed(saved, v))).toEqual(expected.map((e) => e.outputs))
    expect(parityFailures(saved, vectors, expected)).toEqual([])
    expect(exportFailures(saved, vectors, expected)).toEqual([])
  })

  it('a bit is traced through a bus component by its index, so only a bit that loops onto itself reads nothing', () => {
    expect(partCycle(FED_BACK)).toBe(true)
    for (const saved of [FED_BACK, ROUND_THE_BUS]) expect(fromLegacyCircuit(saved).sidecar.notes.filter((n) => n.kind === 'floating-source'), saved.name).toEqual([])
    expect(fromLegacyCircuit(BUS_ONLY_LOOP).sidecar.notes.filter((n) => n.kind === 'floating-source')).toEqual([
      { kind: 'floating-source', pin: 'looped', detail: expect.stringContaining('loops back') },
    ])
  })

  it('a seeded random corpus with splitters, joiners and loops evaluates as its bits flow', () => {
    const rng = mulberry32(0x377b)
    const corpus = Array.from({ length: 200 }, (_, n) => randomBusDocument(rng, n))
    const singly = corpus.filter((saved) => new Set(saved.wires.map((w) => JSON.stringify(w.to))).size === saved.wires.length)
    const cyclic = corpus.filter((saved) => legacy(saved, {}).result.status === 'cycle')
    const looping = cyclic.filter(partCycle)
    expect(singly.filter((saved) => saved.busComponents?.length).length).toBeGreaterThan(100)
    expect(looping.length).toBeGreaterThan(30)
    expect(cyclic.length - looping.length).toBeGreaterThan(40)
    const failures = corpus.flatMap((saved) => {
      const vectors = Array.from({ length: 8 }, () => Object.fromEntries(saved.inputNodes.map((x) => [x.name, Math.floor(rng() * 2 ** x.width)])))
      const ran = vectors.map((v) => legacy(saved, v))
      const oracle = singly.includes(saved) ? ran.flatMap((r, i) => (r.result.status === 'ok' && JSON.stringify(relaxed(saved, vectors[i])) !== JSON.stringify(r.outputs) ? [`the relaxed oracle disagrees with evaluateCircuit on ${JSON.stringify(vectors[i])}`] : [])) : []
      const expected = ran.map((r, i) => (r.result.status === 'ok' || looping.includes(saved) ? r : { result: { status: 'ok' as const }, outputs: relaxed(saved, vectors[i]) }))
      return [...oracle, ...parityFailures(saved, vectors, expected), ...exportFailures(saved, vectors, expected)].map((f) => `${saved.name}: ${f}`)
    })
    expect(failures).toEqual([])
    const valued = corpus.filter((saved) => !fromLegacyCircuit(saved).sidecar.notes.some((n) => REFUSALS.has(n.kind)))
    expect(valued.length).toBeGreaterThanOrEqual(singly.length)
  })

  it('every loops-back note in a seeded random corpus names a bit that no part output or IN drives', () => {
    const rng = mulberry32(0x767)
    const noted = Array.from({ length: 600 }, (_, n) => randomBusDocument(rng, n)).flatMap((saved) => fromLegacyCircuit(saved).sidecar.notes.flatMap((note) => {
      const m = /(?:splitter|joiner) "([^"]+)" pin "([^"]+)", whose bit (\d+) only loops back to itself/.exec(note.detail)
      return m ? [{ saved, bus: m[1], pin: m[2], bit: Number(m[3]) }] : []
    }))
    expect(noted.length).toBeGreaterThan(20)
    expect(noted.filter((n) => driven(n.saved, n.bus, n.pin, n.bit)).map((n) => `${n.saved.name}: ${n.bus}.${n.pin}[${n.bit}]`)).toEqual([])
  })
})
