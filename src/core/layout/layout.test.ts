import { describe, expect, it } from 'vitest'

import { project1HdlSources } from '../hdl'
import { parseSpec } from '../spec'
import type { CircuitSpec, NodeId } from '../spec'
import { layered } from './layered'
import { layout } from './layout'
import type { Placements } from './types'

function read(source: string): CircuitSpec {
  const { doc, diagnostics } = parseSpec(source)
  if (doc === null) throw new Error(diagnostics.map((d) => d.message).join('; '))
  return doc
}

const chip = (name: string): CircuitSpec => read(project1HdlSources[name])

const SWAP = read('CHIP Swap { IN a, b; OUT x, y; PARTS: Not(in=b, out=x); Not(in=a, out=y); }')
const CHAIN = read('CHIP Chain { IN a; OUT out; PARTS: Not(in=a, out=t); Not(in=t, out=u); Not(in=u, out=out); }')
const LOOP = read('CHIP Loop { IN a; OUT out; PARTS: Nand(a=a, b=y, out=x); Nand(a=x, b=x, out=y); Not(in=y, out=out); }')
const PASS = read('CHIP Pass { IN a; OUT out; PARTS: wire out = a; }')
const IDLE = read('CHIP Idle { IN a, b; OUT out; PARTS: }')

const field = (placed: Placements, key: 'layer' | 'index'): Record<string, number | undefined> =>
  Object.fromEntries(Object.entries(placed.nodes).map(([id, node]) => [id, node?.[key]]))

describe('layout', () => {
  it('places every part and every chip I/O terminal exactly once, and no constant or dummy node', () => {
    // Xor's IN-to-And edges span two layers, so its drawing has dummy nodes.
    expect(Object.keys(layout(chip('Xor'), '3d').nodes)).toEqual(['in:a', 'in:b', 'p1', 'p2', 'p3', 'p4', 'p5', 'out:out'])

    const constant = read('CHIP K { IN a; OUT out; PARTS: Nand(a=true, b=a, out=out); }')
    expect(Object.keys(layout(constant, '3d').nodes)).toEqual(['in:a', 'p1', 'out:out'])

    const dangling: CircuitSpec = {
      ...SWAP,
      nets: [...SWAP.nets, { id: 'q', driver: { kind: 'chip-in', pin: 'q' }, sinks: [{ kind: 'part-pin', partId: 'p99', pin: 'in' }] }],
    }
    expect(Object.keys(layout(dangling, '2d').nodes)).toEqual(['in:a', 'in:b', 'p1', 'p2', 'out:x', 'out:y'])
  })

  it('layers by longest path: IN terminals in layer 0, OUT terminals one past the deepest part', () => {
    expect(field(layout(chip('Xor'), '3d'), 'layer')).toEqual({ 'in:a': 0, 'in:b': 0, p1: 1, p2: 1, p3: 2, p4: 2, p5: 3, 'out:out': 4 })

    // `x` is driven from layer 1, yet both OUTs share the layer past the deepest part.
    const uneven = read('CHIP Uneven { IN a; OUT x, y; PARTS: Not(in=a, out=x); Not(in=a, out=t); Not(in=t, out=y); }')
    expect(field(layout(uneven, '3d'), 'layer')).toEqual({ 'in:a': 0, p1: 1, p2: 1, p3: 2, 'out:x': 3, 'out:y': 3 })
  })

  it('lays out a cyclic document, a pass-through with no parts, and an empty PARTS: without throwing', () => {
    // p2 → p1 closes the cycle; it is the edge the depth-first walk ignores for layering.
    expect(field(layout(LOOP, '3d'), 'layer')).toEqual({ 'in:a': 0, p1: 1, p2: 2, p3: 3, 'out:out': 4 })
    expect(layout(PASS, '3d').nodes).toEqual({
      'in:a': { x: 0, y: 0, z: 0, layer: 0, index: 0 },
      'out:out': { x: 2, y: 0, z: 0, layer: 1, index: 0 },
    })
    expect(layout(IDLE, '2d').nodes).toEqual({
      'in:a': { x: 0, y: 0, z: 0, layer: 0, index: 0 },
      'in:b': { x: 0, y: 2, z: 0, layer: 0, index: 1 },
      'out:out': { x: 2, y: 0, z: 0, layer: 1, index: 0 },
    })
  })

  it('permuting doc.parts or doc.nets returns deep-equal Placements', () => {
    for (const doc of [chip('Xor'), chip('Mux4Way16'), LOOP, SWAP]) {
      const placed = layout(doc, '3d')
      expect(Object.keys(placed.nodes)).toHaveLength(doc.ins.length + doc.parts.length + doc.outs.length)
      const rotated = [...doc.nets.slice(1), ...doc.nets.slice(0, 1)]
      for (const permuted of [
        { ...doc, parts: [...doc.parts].reverse() },
        { ...doc, nets: [...doc.nets].reverse() },
        { ...doc, parts: [...doc.parts].reverse(), nets: rotated },
      ]) {
        const again = layout(permuted, '3d')
        expect(again).toEqual(placed)
        expect(JSON.stringify(again)).toBe(JSON.stringify(placed))
      }
    }
  })

  it('keys every placement by the document\'s own part id or terminal id, never by array position or chip name', () => {
    const marked = read(`CHIP Marked { IN a; OUT out;
      PARTS:
      Not(in=a, out=t); // #p10
      Not(in=t, out=u); // #p2
      Not(in=u, out=out); // #p7
    }`)
    const placed = layout(marked, '3d')
    expect(Object.keys(placed.nodes)).toEqual(['in:a', 'p2', 'p7', 'p10', 'out:out'])
    expect(field(placed, 'layer')).toEqual({ 'in:a': 0, p10: 1, p2: 2, p7: 3, 'out:out': 4 })
  })

  it('records { strategyId, strategyVersion, options } with every default filled in', () => {
    const placed = layout(SWAP, '3d')
    expect(Object.keys(placed)).toEqual(['surface', 'strategyId', 'strategyVersion', 'options', 'nodes'])
    expect(placed).toMatchObject({ surface: '3d', strategyId: 'layered', strategyVersion: 1, options: { order: 'barycentre', pitch: 2 } })
    expect(layout(SWAP, '2d', { order: 'id' }).options).toEqual({ order: 'id', pitch: 2 })
    expect(layout(SWAP, '2d', { pitch: 0.5 }).options).toEqual({ order: 'barycentre', pitch: 0.5 })
  })

  it('lands on the lattice at fixed precision: pitch 0.1 gives 0.3, not 0.30000000000000004, and JSON round-trips byte-identical', () => {
    const tenth = layout(CHAIN, '3d', { pitch: 0.1 })
    expect(tenth.nodes.p3?.x).toBe(0.3)
    expect(tenth.nodes['out:out']?.x).toBe(0.4)
    const text = JSON.stringify(tenth)
    expect(text).not.toContain('0.30000000000000004')
    expect(JSON.stringify(JSON.parse(text))).toBe(text)

    const third = layout(CHAIN, '2d', { pitch: 1 / 3 })
    expect([third.nodes.p1?.x, third.nodes.p2?.x, third.nodes.p3?.x]).toEqual([0.333, 0.667, 1])
    for (const node of Object.values(third.nodes)) {
      for (const v of [node?.x, node?.y, node?.z]) expect(v).toBe(Number(v?.toFixed(3)))
    }
  })

  it('refuses a pitch that is not finite or is below 0.001', () => {
    // Coordinates keep 3 decimals: at pitch 0.0004 layer 1 rounds to x 0, as layer 0 does.
    for (const pitch of [Number.NaN, Number.POSITIVE_INFINITY, 0, -2, 0.0004]) {
      expect(() => layout(CHAIN, '3d', { pitch }), String(pitch)).toThrow(RangeError)
      expect(() => layout(CHAIN, '3d', { pitch })).toThrow(`layout: pitch must be finite and at least 0.001, got ${String(pitch)}`)
    }
    expect(layout(CHAIN, '3d', { pitch: 0.001 }).nodes['out:out']?.x).toBe(0.004)
  })

  it('maps axes per surface: 3d is layer→x, index→z, depth→y; 2d is layer→x, index→y, z = 0', () => {
    const solid = layout(SWAP, '3d', { pitch: 1 })
    const flat = layout(SWAP, '2d', { pitch: 1 })
    expect(solid.nodes.p1).toEqual({ x: 1, y: 0, z: 1, layer: 1, index: 1 })
    expect(flat.nodes.p1).toEqual({ x: 1, y: 1, z: 0, layer: 1, index: 1 })
    expect(Object.keys(flat.nodes)).toEqual(Object.keys(solid.nodes))
    for (const id of Object.keys(solid.nodes) as NodeId[]) {
      const s = solid.nodes[id]
      const f = flat.nodes[id]
      expect(s).toEqual({ x: s?.layer, y: 0, z: s?.index, layer: s?.layer, index: s?.index })
      expect(f).toEqual({ x: s?.layer, y: s?.index, z: 0, layer: s?.layer, index: s?.index })
    }
  })

  it('with no order, returns exactly what order: \'barycentre\' returns', () => {
    for (const doc of [SWAP, chip('Xor'), chip('Mux8Way16'), LOOP]) {
      expect(layout(doc, '3d')).toEqual(layout(doc, '3d', { order: 'barycentre' }))
      expect(layout(doc, '2d', {})).toEqual(layout(doc, '2d', { order: 'barycentre' }))
    }
    // Not vacuous: on Swap the barycentre drawing is not the canonical one.
    expect(layout(SWAP, '3d').nodes).not.toEqual(layout(SWAP, '3d', { order: 'id' }).nodes)
    expect(field(layout(SWAP, '3d'), 'index')).toEqual({ 'in:a': 0, 'in:b': 1, p1: 1, p2: 0, 'out:x': 1, 'out:y': 0 })
  })

  it('a node with no neighbour in the layer just placed is sorted by its own current slot, so the sort can move it aside', () => {
    // `wire y = x` joins two OUTs inside one layer, so out:y has no neighbour in the layer above.
    const alias = read('CHIP Alias { IN a, b; OUT x, y, z; PARTS: Not(in=b, out=x); Not(in=a, out=z); wire y = x; }')
    expect(field(layout(alias, '3d', { order: 'id' }), 'index')).toMatchObject({ 'out:x': 0, 'out:y': 1, 'out:z': 2 })
    // out:y weighs its slot, 1: out:z (0) sorts ahead of it and out:x (1) ties it and keeps canonical rank.
    expect(field(layout(alias, '3d'), 'index')).toMatchObject({ 'out:x': 1, 'out:y': 2, 'out:z': 0 })
  })

  it('order: \'id\' keeps the canonical order in every layer', () => {
    expect(field(layout(SWAP, '3d', { order: 'id' }), 'index')).toEqual({ 'in:a': 0, 'in:b': 1, p1: 0, p2: 1, 'out:x': 0, 'out:y': 1 })
    for (const name of Object.keys(project1HdlSources)) {
      const placed = layout(chip(name), '3d', { order: 'id' })
      const byLayer = new Map<number, string[]>()
      for (const [id, node] of Object.entries(placed.nodes)) {
        if (node === undefined) continue
        byLayer.set(node.layer, [...(byLayer.get(node.layer) ?? []), id])
      }
      for (const ids of byLayer.values()) expect(ids.map((id) => placed.nodes[id as NodeId]?.index)).toEqual(ids.map((_, i) => i))
    }
  })

  it('barycentre never crosses more than order: \'id\' on any of the 15 Project-1 chips', () => {
    const names = Object.keys(project1HdlSources)
    expect(names).toHaveLength(15)
    for (const name of names) {
      expect(layered(chip(name), 'barycentre').crossings, name).toBeLessThanOrEqual(layered(chip(name), 'id').crossings)
    }
    // Not vacuous: Xor's long IN edges cross under the canonical order, and the sweeps uncross one.
    expect(layered(chip('Xor'), 'id').crossings).toBe(3)
    expect(layered(chip('Xor'), 'barycentre').crossings).toBe(2)
  })
})
