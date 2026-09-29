/**
 * Characterization of the legacy evaluator (#331): what `evaluateCircuit` computes
 * on hand-built version-1 documents, before and after `serializeCircuit` → `deserializeCircuit`.
 *
 * It records today's behaviour, including what looks wrong, so it asserts nothing but the goldens.
 * ADR-0020 §7.5d deletes `topologicalEval.ts` and `serialize.ts`; from then on these goldens are
 * the importer's acceptance test, so each one carries its own document. They sit on a protected
 * path (`scripts/protected-paths.logic.mjs`): re-recording one with `vitest -u` is flagged on the PR.
 */
import { describe, it, expect } from 'vitest'
import { createBusPins } from '@/simulation'
import { evaluateCircuit, type EvaluateCircuitResult } from '@/simulation/topologicalEval'
import { serializeCircuit } from './serialize'
import { deserializeCircuit, type DeserializedCircuit } from './deserialize'
import {
  CIRCUIT_FORMAT_VERSION,
  type SerializedBusComponent,
  type SerializedCircuit,
  type SerializedGate,
  type SerializedInputNode,
  type SerializedJunction,
  type SerializedOutputNode,
  type SerializedWire,
} from './types'

type Endpoint = SerializedWire['from']
type Parts = Partial<Omit<SerializedCircuit, 'version' | 'name' | 'savedAt'>>

interface Fixture {
  name: string
  about: string
  document: SerializedCircuit
  /** Input-node values by name, applied to a fresh load before each evaluation. */
  vectors: Array<Record<string, number>>
}

// ── Building documents ────────────────────────────────────────────────────────────────────────────
// Wires carry no segments: evaluation never reads them, and rendered geometry is characterized apart.

const ZERO = { x: 0, y: 0, z: 0 }
const at = (x: number, z = 0) => ({ x, y: 0, z })

const gate = (id: string, type: string, x: number, z = 0): SerializedGate => ({
  id,
  type,
  position: at(x, z),
  rotation: ZERO,
  width: 1,
})
const input = (id: string, name: string, z: number, width = 1): SerializedInputNode => ({
  id,
  name,
  position: at(-12, z),
  rotation: ZERO,
  value: 0,
  width,
})
const output = (id: string, name: string, z: number, width = 1): SerializedOutputNode => ({
  id,
  name,
  position: at(12, z),
  rotation: ZERO,
  value: 0,
  width,
})
const junction = (id: string, wireIds: string[], x: number, z = 0): SerializedJunction => ({
  id,
  position: at(x, z),
  signalId: `signal-${id}`,
  wireIds,
})
const bus = (id: string, kind: 'splitter' | 'joiner', width: number, x: number): SerializedBusComponent => ({
  id,
  kind,
  position: at(x),
  rotation: ZERO,
  width,
  ...createBusPins(kind, width),
  selected: false,
})
const wire = (id: string, from: Endpoint, to: Endpoint, width?: number): SerializedWire => ({
  id,
  from,
  to,
  segments: [],
  crossesWireIds: [],
  ...(width === undefined ? {} : { width }),
})

// Gate pin ids follow the scheme `deserializeCircuit` rebuilds them with.
const gateIn = (gateId: string, index: number): Endpoint => ({ type: 'gate', entityId: gateId, pinId: `${gateId}-in-${index}` })
const gateOut = (gateId: string): Endpoint => ({ type: 'gate', entityId: gateId, pinId: `${gateId}-out-0` })
const busPin = (busId: string, pinId: string): Endpoint => ({ type: 'bus', entityId: busId, pinId })
const fromInput = (id: string): Endpoint => ({ type: 'input', entityId: id })
const toOutput = (id: string): Endpoint => ({ type: 'output', entityId: id })
const atJunction = (id: string): Endpoint => ({ type: 'junction', entityId: id })

const circuit = (name: string, parts: Parts): SerializedCircuit => ({
  version: CIRCUIT_FORMAT_VERSION,
  name,
  savedAt: '2026-09-29T00:00:00.000Z',
  gates: [],
  wires: [],
  inputNodes: [],
  outputNodes: [],
  junctions: [],
  busComponents: [],
  ...parts,
})

const bits2 = [
  { a: 0, b: 0 },
  { a: 0, b: 1 },
  { a: 1, b: 0 },
  { a: 1, b: 1 },
]

// ── The fixtures ──────────────────────────────────────────────────────────────────────────────────

const FIXTURES: Fixture[] = [
  {
    name: 'xor-fanout-junctions',
    about:
      'Xor from four Nands. Each fan-out is a junction on a trunk that runs on to its own destination, ' +
      'with branches starting at the junction; jn1 lists its branch before its trunk (#356).',
    document: circuit('xor-fanout-junctions', {
      inputNodes: [input('ia', 'a', -2), input('ib', 'b', 2)],
      outputNodes: [output('oo', 'out', 0)],
      gates: [gate('n1', 'Nand', -4), gate('n2', 'Nand', 0, -3), gate('n3', 'Nand', 0, 3), gate('n4', 'Nand', 4)],
      wires: [
        wire('wa', fromInput('ia'), gateIn('n1', 0)),
        wire('wa-branch', atJunction('ja'), gateIn('n2', 0)),
        wire('wb', fromInput('ib'), gateIn('n1', 1)),
        wire('wb-branch', atJunction('jb'), gateIn('n3', 1)),
        wire('wn1', gateOut('n1'), gateIn('n2', 1)),
        wire('wn1-branch', atJunction('jn1'), gateIn('n3', 0)),
        wire('w2', gateOut('n2'), gateIn('n4', 0)),
        wire('w3', gateOut('n3'), gateIn('n4', 1)),
        wire('wo', gateOut('n4'), toOutput('oo')),
      ],
      junctions: [
        junction('ja', ['wa', 'wa-branch'], -8, -2),
        junction('jb', ['wb', 'wb-branch'], -8, 2),
        junction('jn1', ['wn1-branch', 'wn1'], -2),
      ],
    }),
    vectors: bits2,
  },
  {
    name: 'junction-chain',
    about:
      'A signal through two junctions in a row: the input wire ends at j1, j1 feeds a wire that ends ' +
      'at j2, and each junction branches on. A wire that ends at a junction is its feed.',
    document: circuit('junction-chain', {
      inputNodes: [input('ia', 'a', 0)],
      outputNodes: [output('o1', 'atJ1', -3), output('o2', 'atJ2', 0), output('o3', 'notJ2', 3)],
      gates: [gate('g1', 'Not', 4, 3)],
      wires: [
        wire('w1', fromInput('ia'), atJunction('j1')),
        wire('w2', atJunction('j1'), atJunction('j2')),
        wire('w3', atJunction('j1'), toOutput('o1')),
        wire('w4', atJunction('j2'), toOutput('o2')),
        wire('w5', atJunction('j2'), gateIn('g1', 0)),
        wire('w6', gateOut('g1'), toOutput('o3')),
      ],
      junctions: [junction('j1', ['w1', 'w2', 'w3'], -6), junction('j2', ['w2', 'w4', 'w5'], 0)],
    }),
    vectors: [{ a: 0 }, { a: 1 }],
  },
  {
    name: 'junction-gesture-shape',
    about:
      'The shape the live wiring gesture writes (#403): every wire listed on the junction copies the ' +
      "trunk's source, so evaluation never consults the junction.",
    document: circuit('junction-gesture-shape', {
      inputNodes: [input('ia', 'a', 0)],
      outputNodes: [output('o1', 'inverted', -2), output('o2', 'direct', 2)],
      gates: [gate('g1', 'Not', 0, -2)],
      wires: [
        wire('w1', fromInput('ia'), gateIn('g1', 0)),
        wire('w2', fromInput('ia'), toOutput('o2')),
        wire('w3', gateOut('g1'), toOutput('o1')),
      ],
      junctions: [junction('j1', ['w1', 'w2'], -6)],
    }),
    vectors: [{ a: 0 }, { a: 1 }],
  },
  {
    name: 'junction-loop',
    about:
      'Malformed: two junctions that only feed each other. The visited-set guard reads the loop as 0; ' +
      'the unrelated input still reaches its output.',
    document: circuit('junction-loop', {
      inputNodes: [input('ia', 'a', 4)],
      outputNodes: [output('o1', 'loop', -2), output('o2', 'notLoop', 0), output('o3', 'control', 4)],
      gates: [gate('g1', 'Not', 4)],
      wires: [
        wire('w1', atJunction('j2'), atJunction('j1')),
        wire('w2', atJunction('j1'), atJunction('j2')),
        wire('w3', atJunction('j1'), toOutput('o1')),
        wire('w4', atJunction('j1'), gateIn('g1', 0)),
        wire('w5', gateOut('g1'), toOutput('o2')),
        wire('w6', fromInput('ia'), toOutput('o3')),
      ],
      junctions: [junction('j1', ['w1', 'w2', 'w3', 'w4'], -4), junction('j2', ['w1', 'w2'], -4, -4)],
    }),
    vectors: [{ a: 0 }, { a: 1 }],
  },
  {
    name: 'junction-floating',
    about: 'Malformed: a junction whose listed wires all start at it. It has no feed, so it floats and reads 0.',
    document: circuit('junction-floating', {
      outputNodes: [output('o1', 'floating', -2), output('o2', 'notFloating', 2)],
      gates: [gate('g1', 'Not', 4, 2)],
      wires: [
        wire('w1', atJunction('j1'), toOutput('o1')),
        wire('w2', atJunction('j1'), gateIn('g1', 0)),
        wire('w3', gateOut('g1'), toOutput('o2')),
      ],
      junctions: [junction('j1', ['w1', 'w2'], -4)],
    }),
    vectors: [{}],
  },
  {
    name: 'gate-cycle',
    about:
      'Malformed: two Nots that feed each other. topologicalSort reports the cycle and evaluateCircuit ' +
      'writes nothing at all, not even the gate outside the loop.',
    document: circuit('gate-cycle', {
      inputNodes: [input('ia', 'a', 4)],
      outputNodes: [output('o1', 'loop', -2), output('o2', 'free', 4)],
      gates: [gate('c1', 'Not', -2, -2), gate('c2', 'Not', 2, -2), gate('g1', 'Not', 0, 4)],
      wires: [
        wire('w1', gateOut('c1'), gateIn('c2', 0)),
        wire('w2', gateOut('c2'), gateIn('c1', 0)),
        wire('w3', gateOut('c1'), toOutput('o1')),
        wire('w4', fromInput('ia'), gateIn('g1', 0)),
        wire('w5', gateOut('g1'), toOutput('o2')),
      ],
    }),
    vectors: [{ a: 0 }, { a: 1 }],
  },
  {
    name: 'dangling-endpoints',
    about:
      'Malformed: wires whose endpoints name nothing in the document. The reader keeps them (it prunes ' +
      'only wires to gates it skipped) and the evaluator reads a missing source as 0.',
    document: circuit('dangling-endpoints', {
      inputNodes: [input('ia', 'a', 0)],
      outputNodes: [
        output('o1', 'fromMissingGate', -4),
        output('o2', 'fromMissingInput', -2),
        output('o3', 'fromMissingJunction', 2),
        output('o4', 'orWithMissing', 4),
      ],
      gates: [gate('g1', 'Or', 0, 4)],
      wires: [
        wire('w1', gateOut('missing-gate'), toOutput('o1')),
        wire('w2', fromInput('missing-input'), toOutput('o2')),
        wire('w3', atJunction('missing-junction'), toOutput('o3')),
        wire('w4', fromInput('ia'), gateIn('g1', 0)),
        wire('w5', gateOut('missing-gate'), gateIn('g1', 1)),
        wire('w6', gateOut('g1'), toOutput('o4')),
        wire('w7', fromInput('ia'), gateIn('missing-sink', 0)),
      ],
    }),
    vectors: [{ a: 0 }, { a: 1 }],
  },
  {
    name: 'mixed-widths',
    about:
      'Values crossing wires and pins of different widths. The value delivered is clamped to ' +
      'min(wire width, destination width), and a wire saved without a width counts as 1 bit.',
    document: circuit('mixed-widths', {
      inputNodes: [input('i16', 'a16', -2, 16), input('i1', 'b1', 4)],
      outputNodes: [
        output('o1', 'not16', -4, 16),
        output('o2', 'narrow8', -2, 8),
        output('o3', 'noWidthWire', 0, 16),
        output('o4', 'widened', 2, 16),
        output('o5', 'notLsb', 4),
      ],
      gates: [gate('n16', 'Not16', 0, -4), gate('n1', 'Not', 0, 4)],
      wires: [
        wire('w1', fromInput('i16'), gateIn('n16', 0), 16),
        wire('w2', gateOut('n16'), toOutput('o1'), 16),
        wire('w3', fromInput('i16'), toOutput('o2'), 16),
        wire('w4', fromInput('i16'), toOutput('o3')),
        wire('w5', fromInput('i1'), toOutput('o4'), 1),
        wire('w6', fromInput('i16'), gateIn('n1', 0), 16),
        wire('w7', gateOut('n1'), toOutput('o5')),
      ],
    }),
    vectors: [
      { a16: 0, b1: 0 },
      { a16: 0xabcd, b1: 1 },
      { a16: 0xffff, b1: 0 },
      { a16: 0x1abcd, b1: 1 },
    ],
  },
  {
    name: 'bus-endpoints',
    about:
      "A 4-bit value through a splitter, bit 0 inverted by a gate, and back through a joiner, with 'bus' " +
      'endpoints on both sides of the gate. A wire to a bus component the document lacks is dropped on load.',
    document: circuit('bus-endpoints', {
      inputNodes: [input('ibus', 'bus', 0, 4)],
      outputNodes: [output('o1', 'joined', 0, 4), output('o2', 'bit3', 4)],
      gates: [gate('inv', 'Not', 0, -2)],
      busComponents: [bus('s1', 'splitter', 4, -6), bus('j1', 'joiner', 4, 6)],
      wires: [
        wire('w1', fromInput('ibus'), busPin('s1', 'in'), 4),
        wire('w2', busPin('s1', 'out0'), gateIn('inv', 0)),
        wire('w3', gateOut('inv'), busPin('j1', 'in0')),
        wire('w4', busPin('s1', 'out1'), busPin('j1', 'in1')),
        wire('w5', busPin('s1', 'out2'), busPin('j1', 'in2')),
        wire('w6', busPin('s1', 'out3'), busPin('j1', 'in3')),
        wire('w7', busPin('j1', 'out'), toOutput('o1'), 4),
        wire('w8', busPin('s1', 'out3'), toOutput('o2')),
        wire('w9', fromInput('ibus'), busPin('missing-bus', 'in'), 4),
      ],
    }),
    vectors: [{ bus: 0 }, { bus: 0b0101 }, { bus: 0b1010 }, { bus: 0b1111 }],
  },
]

// ── Recording ─────────────────────────────────────────────────────────────────────────────────────

interface PinValue {
  name: string
  value: number
}

const byName = (pins: PinValue[]): Record<string, number> => Object.fromEntries(pins.map((p) => [p.name, p.value]))
const pinsOf = (entity: { inputs: PinValue[]; outputs: PinValue[] }) => ({
  in: byName(entity.inputs),
  out: byName(entity.outputs),
})

/** What one evaluation leaves behind: every output node, and every gate and bus pin. */
function observe(doc: DeserializedCircuit, result: EvaluateCircuitResult) {
  return {
    result,
    outputs: byName(doc.outputNodes),
    gates: Object.fromEntries(doc.gates.map((g) => [g.id, pinsOf(g)])),
    buses: Object.fromEntries(doc.busComponents.map((b) => [b.id, pinsOf(b)])),
  }
}

function load(saved: SerializedCircuit) {
  const { document: doc, warnings } = deserializeCircuit(saved)
  if (doc === null) throw new Error(`${saved.name} did not load: ${JSON.stringify(warnings)}`)
  return { doc, warnings }
}

// `serializeCircuit` reads only the six document fields; its parameter is typed as the whole store.
const asSaveable = (doc: DeserializedCircuit) => doc as Parameters<typeof serializeCircuit>[0]

function characterize(fixture: Fixture) {
  return {
    fixture: fixture.name,
    about: fixture.about,
    document: fixture.document,
    loadWarnings: load(fixture.document).warnings,
    vectors: fixture.vectors.map((inputs) => {
      const { doc } = load(fixture.document)
      for (const node of doc.inputNodes) {
        const value = inputs[node.name]
        if (value !== undefined) node.value = value
      }
      const before = observe(doc, evaluateCircuit(doc))
      const reloaded = load(serializeCircuit(asSaveable(doc), fixture.name))
      const after = observe(reloaded.doc, evaluateCircuit(reloaded.doc))
      return {
        inputs,
        before,
        after,
        unchangedByRoundTrip: JSON.stringify(before) === JSON.stringify(after),
        roundTripWarnings: reloaded.warnings,
      }
    }),
  }
}

describe('legacy evaluation, before and after serialize → deserialize (characterization)', () => {
  it.each(FIXTURES.map((f) => [f.name, f] as const))('%s', async (name, fixture) => {
    const golden = `${JSON.stringify(characterize(fixture), null, 2)}\n`
    await expect(golden).toMatchFileSnapshot(`__snapshots__/characterization/evaluation/${name}.json`)
  })
})
