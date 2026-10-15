// Documents the legacy writer wrote: drawn through the store's actions, saved with `saveCircuit` and recorded
// as `localStorage` holds them. `src/core/spec/fromLegacyCircuit.vectors.test.ts` imports them.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { parseHDL, project1HdlSources, type HDLChip, type HDLConnection } from '@/core'
import { notify } from '@/lib/notify'
import { expectOneGoldenPerCase } from '@/test/characterizationGoldens'
import type { WireSegment } from '@/utils/wiringScheme/types'
import { STORAGE_PREFIX } from './actions/persistenceActions/storageKeys'
import { circuitActions as a, useCircuitStore } from './circuitStore'
import type { Position, WireEndpoint } from './types'

const SEED = 0x377
const DAGS = 32
const CHIPS = ['Not', 'And', 'Or', 'Xor', 'Mux', 'DMux']
const GOLDENS = '__snapshots__/characterization/legacy-writer'
const EPOCH = new Date('2026-10-16T00:00:00.000Z')

function mulberry32(seed: number): () => number {
  let s = seed >>> 0
  return () => {
    s = (s + 0x6d2b79f5) >>> 0
    let t = Math.imul(s ^ (s >>> 15), 1 | s)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const at = (x: number, z: number, y = 0.2): Position => ({ x, y, z })
const seg = (type: WireSegment['type'], x1: number, z1: number, x2: number, z2: number): WireSegment => ({ type, start: at(x1, z1), end: at(x2, z2) })
/** A trunk with a corner at (4, -4) for the junction, and a branch path leaving that corner. */
const TRUNK = [seg('exit', 0.7, 0, 4, 0), seg('vertical', 4, 0, 4, -4), seg('horizontal', 4, -4, 8, -4), seg('entry', 8, -4, 8.7, -4)]
const BRANCH = [seg('horizontal', 4, -4, 11.5, -4)]

type Edge = [WireEndpoint, WireEndpoint]
const same = (x: WireEndpoint, y: WireEndpoint): boolean => x.type === y.type && x.entityId === y.entityId && x.pinId === y.pinId

/** Draws the edges in order; the first source read again by a later gate input reaches it through the junction gesture. */
function draw(edges: Edge[]): void {
  const branchOf = (i: number) => edges.findIndex(([from, to], k) => k > i && same(from, edges[i][0]) && to.type === 'gate')
  const trunk = edges.findIndex((_, i) => branchOf(i) >= 0)
  const branch = trunk < 0 ? -1 : branchOf(trunk)
  let trunkId = ''
  edges.forEach(([from, to], i) => {
    if (i !== branch) {
      const wire = a.addWire(from, to, i === trunk ? TRUNK : [])
      if (i === trunk) trunkId = wire.id
      return
    }
    const junction = a.placeJunctionOnWire(at(4, -4), trunkId)
    a.startWiringFromJunction(junction.id, junction.position)
    // The path `WirePreview` computes in the browser; no action sets it.
    useCircuitStore.setState((s) => {
      if (s.wiringFrom) s.wiringFrom.segments = BRANCH
    })
    a.completeWiringFromJunction(to.entityId, to.pinId ?? '', 'input')
  })
}

/** One gate per part, one input or output node per port, and one wire per connection. */
function layOut(chip: HDLChip): void {
  const outs = new Map(chip.outputs.map((p, i): [string, WireEndpoint] => [p.name, { type: 'output', entityId: a.addOutputNode(p.name, at(4 * chip.parts.length + 4, 3 * i)).id }]))
  const signals = new Map(chip.inputs.map((p, i): [string, WireEndpoint] => [p.name, { type: 'input', entityId: a.addInputNode(p.name, at(-8, 3 * i)).id }]))
  const gates = chip.parts.map((part, g) => a.addGate(part.name, at(4 * g, 3 * (g % 3))))
  const pin = (g: number, name: string): WireEndpoint => {
    const found = [...gates[g].inputs, ...gates[g].outputs].find((p) => p.name === name)
    if (!found) throw new Error(`${chip.parts[g].name} has no pin ${name}`)
    return { type: 'gate', entityId: gates[g].id, pinId: found.id }
  }
  const drives = (g: number, c: HDLConnection) => gates[g].outputs.some((p) => p.name === c.internal)
  chip.parts.forEach((part, g) => {
    for (const c of part.connections) if (drives(g, c) && !outs.has(c.external)) signals.set(c.external, pin(g, c.internal))
  })
  const source = (name: string): WireEndpoint => {
    const found = signals.get(name)
    if (!found) throw new Error(`${chip.name} reads ${name}, which nothing drives`)
    return found
  }
  draw(chip.parts.flatMap((part, g) => part.connections.flatMap((c): Edge[] => {
    if (!drives(g, c)) return [[source(c.external), pin(g, c.internal)]]
    const out = outs.get(c.external)
    return out ? [[pin(g, c.internal), out]] : []
  })))
}

const PINS: Record<string, { ins: string[]; outs: string[] }> = {
  Nand: { ins: ['a', 'b'], outs: ['out'] },
  Not: { ins: ['in'], outs: ['out'] },
  And: { ins: ['a', 'b'], outs: ['out'] },
  Or: { ins: ['a', 'b'], outs: ['out'] },
  Xor: { ins: ['a', 'b'], outs: ['out'] },
  Mux: { ins: ['a', 'b', 'sel'], outs: ['out'] },
  DMux: { ins: ['in', 'sel'], outs: ['a', 'b'] },
}

/** 1 to 8 inputs and 1 to 8 gates; every gate input reads an input or an earlier gate's output. */
function randomDag(name: string, rng: () => number): HDLChip {
  const count = (max: number) => 1 + Math.floor(rng() * max)
  const pick = <T,>(items: T[]): T => items[Math.floor(rng() * items.length)]
  const inputs = 'abcdefgh'.slice(0, count(8)).split('')
  const signals = [...inputs]
  const parts = Array.from({ length: count(8) }, (_, g) => {
    const name = pick(Object.keys(PINS))
    const connections: HDLConnection[] = PINS[name].ins.map((internal) => ({ internal, external: pick(signals) }))
    for (const internal of PINS[name].outs) connections.push({ internal, external: `g${String(g)}${internal}` })
    signals.push(...PINS[name].outs.map((p) => `g${String(g)}${p}`))
    return { name, connections }
  })
  const driven = parts.flatMap((part, g) => PINS[part.name].outs.map((pin) => ({ g, pin })))
  const outputs = Array.from({ length: count(3) }, (_, k) => {
    const { g, pin } = k === 0 ? driven[driven.length - 1] : pick(driven)
    parts[g].connections.push({ internal: pin, external: `out${String(k)}` })
    return { name: `out${String(k)}`, width: 1 }
  })
  return { name, inputs: inputs.map((n) => ({ name: n, width: 1 })), outputs, parts }
}

function parsed(source: string): HDLChip {
  const result = parseHDL(source)
  if (!result.success) throw new Error(result.errors.map((e) => e.message).join('; '))
  return result.chip
}

const CASES: Array<[string, HDLChip]> = [
  ...CHIPS.map((chip): [string, HDLChip] => [chip, parsed(project1HdlSources[chip])]),
  ...Array.from({ length: DAGS }, (_, i): [string, HDLChip] => {
    const name = `dag-${String(i).padStart(2, '0')}`
    return [name, randomDag(name, mulberry32(SEED + i))]
  }),
]

describe('legacy writer corpus', () => {
  const notified: string[] = []

  beforeEach(() => {
    vi.useFakeTimers({ now: EPOCH })
    vi.spyOn(Math, 'random').mockImplementation(mulberry32(SEED))
    for (const kind of ['success', 'info', 'warning', 'error'] as const) {
      vi.spyOn(notify, kind).mockImplementation((message) => notified.push(`${kind}: ${message}`))
    }
    localStorage.clear()
    a.clearCircuit()
  })

  afterEach(() => {
    vi.restoreAllMocks()
    vi.useRealTimers()
    notified.length = 0
  })

  it('has one golden per case', () => {
    const onDisk = import.meta.glob('./__snapshots__/characterization/legacy-writer/**/*')
    expectOneGoldenPerCase(onDisk, CASES.map(([name]) => name), `./${GOLDENS}`)
  })

  it.each(CASES)('%s: what saveCircuit writes, recorded', async (name, chip) => {
    layOut(chip)
    a.saveCircuit(name)
    expect(notified).toEqual([`success: Saved circuit "${name}"`])
    const saved: unknown = JSON.parse(localStorage.getItem(`${STORAGE_PREFIX}${name}`) ?? 'null')
    await expect(`${JSON.stringify(saved, null, 2)}\n`).toMatchFileSnapshot(`${GOLDENS}/${name}.json`)
  })
})
