import { describe, it, expect, beforeEach } from 'vitest'
import { useCircuitStore } from '@/store/circuitStore'
import { parseCmp } from '@/core/testing/cmpParser'
import { project1CmpFixtures } from '@/core/testing/project1CmpFixtures'
import type { CircuitDocument, WireEndpoint } from '@/store/types'
import { generateTruthTable, DEFAULT_MAX_INPUT_BITS } from './truthTable'

const getState = () => useCircuitStore.getState()
const origin = { x: 0, y: 0, z: 0 }

const wire = (from: WireEndpoint, to: WireEndpoint) => getState().addWire(from, to, [])

/** Builds `chipName` with every pin wired to a same-named input/output node. */
function buildChipUnderTest(chipName: string) {
  const gate = getState().addGate(chipName, origin)
  gate.inputs.forEach((pin, i) => {
    const node = getState().addInputNode(pin.name, { x: -4, y: i * 2, z: 0 }, pin.width)
    wire({ type: 'input', entityId: node.id }, { type: 'gate', entityId: gate.id, pinId: pin.id })
  })
  gate.outputs.forEach((pin, i) => {
    const node = getState().addOutputNode(pin.name, { x: 4, y: i * 2, z: 0 }, pin.width)
    wire({ type: 'gate', entityId: gate.id, pinId: pin.id }, { type: 'output', entityId: node.id })
  })
  return gate
}

/** Official `.cmp` expectations as `{ headers, rows }` in the engine's shape. */
function expectedFromCmp(chipName: string, inputCount: number) {
  const parsed = parseCmp(project1CmpFixtures[chipName])
  if (!parsed.success) throw new Error(`fixture ${chipName} failed to parse`)
  const names = parsed.file.columns.map((c) => c.name)
  return {
    headers: { inputs: names.slice(0, inputCount), outputs: names.slice(inputCount) },
    rows: parsed.file.rows.map((r) => ({
      inputs: r.values.slice(0, inputCount),
      outputs: r.values.slice(inputCount),
    })),
  }
}

const snapshotOf = (c: CircuitDocument) =>
  JSON.stringify({
    gates: c.gates,
    wires: c.wires,
    inputNodes: c.inputNodes,
    outputNodes: c.outputNodes,
    junctions: c.junctions,
    busComponents: c.busComponents,
  })

beforeEach(() => {
  useCircuitStore.setState({
    gates: [],
    wires: [],
    inputNodes: [],
    outputNodes: [],
    junctions: [],
    busComponents: [],
    lastSimulationError: null,
  })
})

describe('generateTruthTable', () => {
  it('NAND: 4 rows in binary-counting order matching the canonical table', () => {
    buildChipUnderTest('Nand')

    const result = generateTruthTable(getState())

    expect(result).toEqual({
      ok: true,
      table: {
        headers: { inputs: ['a', 'b'], outputs: ['out'] },
        rows: [
          { inputs: [0, 0], outputs: [1] },
          { inputs: [0, 1], outputs: [1] },
          { inputs: [1, 0], outputs: [1] },
          { inputs: [1, 1], outputs: [0] },
        ],
      },
    })
  })

  it.each([
    ['Xor', 2],
    ['Mux', 3],
    ['DMux', 2],
  ])('%s built via circuitActions matches the official .cmp expectations', (chipName, inputCount) => {
    buildChipUnderTest(chipName)

    const result = generateTruthTable(getState())

    expect(result).toEqual({ ok: true, table: expectedFromCmp(chipName, inputCount) })
  })

  it('circuit with no inputs yields a single evaluated row', () => {
    const gate = getState().addGate('Nand', origin)
    const out = getState().addOutputNode('out', origin)
    wire({ type: 'gate', entityId: gate.id, pinId: gate.outputs[0].id }, { type: 'output', entityId: out.id })

    const result = generateTruthTable(getState())

    // Nand with both inputs floating (0, 0) → 1
    expect(result).toEqual({
      ok: true,
      table: { headers: { inputs: [], outputs: ['out'] }, rows: [{ inputs: [], outputs: [1] }] },
    })
  })

  it('refuses a circuit whose total input width exceeds the default budget', () => {
    getState().addInputNode('in', origin, 16)

    const result = generateTruthTable(getState())

    expect(result).toEqual({
      ok: false,
      reason: 'over-budget',
      totalInputBits: 16,
      maxInputBits: DEFAULT_MAX_INPUT_BITS,
    })
  })

  it('honors an explicit maxInputBits on either side of the budget', () => {
    getState().addInputNode('a', origin, 2)
    getState().addInputNode('b', origin, 1)

    expect(generateTruthTable(getState(), { maxInputBits: 2 })).toEqual({
      ok: false,
      reason: 'over-budget',
      totalInputBits: 3,
      maxInputBits: 2,
    })
    const ok = generateTruthTable(getState(), { maxInputBits: 3 })
    expect(ok.ok).toBe(true)
    if (ok.ok) expect(ok.table.rows).toHaveLength(8)
  })

  it('enumerates multi-bit inputs over their full range, first input most significant', () => {
    const a = getState().addInputNode('a', origin, 2)
    getState().addInputNode('b', origin, 1)
    const out = getState().addOutputNode('out', origin, 2)
    wire({ type: 'input', entityId: a.id }, { type: 'output', entityId: out.id })

    const result = generateTruthTable(getState())

    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.table.rows.map((r) => r.inputs)).toEqual([
      [0, 0], [0, 1], [1, 0], [1, 1], [2, 0], [2, 1], [3, 0], [3, 1],
    ])
    expect(result.table.rows.map((r) => r.outputs[0])).toEqual([0, 0, 1, 1, 2, 2, 3, 3])
  })

  it('reports a disconnected output as null in every row', () => {
    const a = getState().addInputNode('a', origin)
    const wired = getState().addOutputNode('wired', origin)
    getState().addOutputNode('floating', origin)
    wire({ type: 'input', entityId: a.id }, { type: 'output', entityId: wired.id })

    const result = generateTruthTable(getState())

    expect(result).toEqual({
      ok: true,
      table: {
        headers: { inputs: ['a'], outputs: ['wired', 'floating'] },
        rows: [
          { inputs: [0], outputs: [0, null] },
          { inputs: [1], outputs: [1, null] },
        ],
      },
    })
  })

  it('reports a combinational cycle instead of a stale table', () => {
    const gateA = getState().addGate('Nand', origin)
    const gateB = getState().addGate('Nand', origin)
    wire(
      { type: 'gate', entityId: gateA.id, pinId: gateA.outputs[0].id },
      { type: 'gate', entityId: gateB.id, pinId: gateB.inputs[0].id },
    )
    wire(
      { type: 'gate', entityId: gateB.id, pinId: gateB.outputs[0].id },
      { type: 'gate', entityId: gateA.id, pinId: gateA.inputs[0].id },
    )

    const result = generateTruthTable(getState())

    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.reason).toBe('cycle')
    if (result.reason === 'cycle') {
      expect(result.involvedGateIds.sort()).toEqual([gateA.id, gateB.id].sort())
    }
  })

  it('does not mutate the passed-in circuit', () => {
    buildChipUnderTest('Mux')
    const circuit = getState()
    const before = snapshotOf(circuit)

    generateTruthTable(circuit)

    expect(snapshotOf(getState())).toBe(before)
    expect(getState().inputNodes.map((n) => n.value)).toEqual([1, 1, 1])
  })
})
