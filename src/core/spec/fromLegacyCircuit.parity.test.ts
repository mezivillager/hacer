// ADR-0020 §10's acceptance test. The legacy oracle is `evaluateCircuit`, whose junction trace is structural
// (`findJunctionFeedWire`), so this file writes no second trace.
import { describe, expect, it } from 'vitest'
import { evaluateCircuit } from '@/simulation/topologicalEval'
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
const circuit = (name: string, parts: Partial<SerializedCircuit>): SerializedCircuit => ({
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

const BIT: Vector[] = [{ a: 0 }, { a: 1 }]
const ALIASES = ['junction-chain', 'xor-fanout-junctions', 'junction-loop', 'mixed-widths']
const SPIKE: Array<[string, SerializedCircuit, Vector[]]> = [
  ['C6', C6, BIT],
  ['C7 at width 1', C7(1), BIT],
  ['C7 at width 4', C7(4), Array.from({ length: 16 }, (_, a) => ({ a }))],
  ['C7 at width 16', C7(16), [0, 1, 0x8000, 0xabcd, 0xffff].map((a) => ({ a }))],
  ['C9', C9, BIT],
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
  ['multiple-drivers', /is bound by more than one connection|is driven by more than one part/],
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
    const run = viaExport(doc, inputs)
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
    expect(doc && viaCompileSpec(doc, { a: 1 })).toEqual({ refused: ['Part "Nand" input pin "b" is not connected'] })
  })

  it('C8: two wires into one gate input keep both drivers, one multiple-drivers note names both, and the export is refused', () => {
    const { doc, sidecar } = fromLegacyCircuit(C8)
    const notes = sidecar.notes.filter((n) => n.kind === 'multiple-drivers')
    expect(notes).toEqual([{ kind: 'multiple-drivers', partId: 'p1', pin: 'in', detail: expect.stringContaining('a (wire "w1")') }])
    expect(notes[0].detail).toContain('b (wire "w2")')
    expect(doc?.nets.filter((n) => n.sinks.some((s) => s.kind === 'part-pin' && s.pin === 'in')).map((n) => n.id).sort()).toEqual(['a', 'b'])
    expect(doc && viaExport(doc, { a: 1, b: 0 })).toEqual({ refused: ['Part "Not" pin "in" bit 0 is bound by more than one connection'] })
    expect(doc && viaCompileSpec(doc, { a: 1, b: 0 })).toEqual({ refused: ['p1 pin "in" is bound by both "a" and "b"'] })
  })

  it('C8b: two wires into one output node keep both drivers, and the export is refused', () => {
    const { doc, sidecar } = fromLegacyCircuit(C8b)
    expect(sidecar.notes).toEqual([{ kind: 'multiple-drivers', pin: 'out', detail: expect.stringContaining('p1.out (wire "w3")') }])
    expect(sidecar.notes[0].detail).toContain('p2.out (wire "w4")')
    expect(doc?.nets.filter((n) => n.id === 'out').map((n) => n.driver)).toEqual([
      { kind: 'part-pin', partId: 'p1', pin: 'out' },
      { kind: 'part-pin', partId: 'p2', pin: 'out' },
    ])
    expect(doc && viaExport(doc, { a: 1, b: 0 })).toEqual({ refused: ['Signal "out" is driven by more than one part'] })
    expect(doc && viaCompileSpec(doc, { a: 1, b: 0 })).toEqual({
      refused: [
        'Net id "out" names more than one net; a document holds one net per id',
        'Signal "out" has bits driven by both p1.out (net "out") and p2.out (net "out")',
      ],
    })
  })

  it("a junction fed by two wires is C8's case", () => {
    const { doc, sidecar } = fromLegacyCircuit(TWO_FEEDS)
    expect(sidecar.notes).toEqual([{ kind: 'multiple-drivers', partId: 'p1', pin: 'in', detail: expect.stringContaining('a (wire "w3")') }])
    expect(sidecar.notes[0].detail).toContain('b (wire "w3")')
    expect(doc && viaExport(doc, { a: 1, b: 0 })).toEqual({ refused: ['Part "Not" pin "in" bit 0 is bound by more than one connection'] })
    expect(doc && viaCompileSpec(doc, { a: 1, b: 0 })).toEqual({ refused: ['p1 pin "in" is bound by both "a" and "b"'] })
    expect(parityFailures(TWO_FEEDS, BIT, BIT.map((v) => legacy(TWO_FEEDS, v)))).toEqual([])
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

  it('bus-endpoints returns no document, with an unsupported-bus-component note', () => {
    const { doc, sidecar } = fromLegacyCircuit(golden('bus-endpoints').document)
    expect(doc).toBeNull()
    expect(sidecar.notes.filter((n) => n.kind === 'unsupported-bus-component').map((n) => n.detail)).toEqual([
      expect.stringContaining('"j1"'),
      expect.stringContaining('"s1"'),
    ])
  })
})
