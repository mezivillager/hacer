import { describe, expect, it } from 'vitest'

import { project1HdlSources } from '../hdl'
import { parseSpec } from '../spec'
import type { CircuitSpec, NodeId, PartId, Ref } from '../spec'
import { mulberry32 } from '../spec/specPrograms'
import type { Rng } from '../spec/specPrograms'
import { layout } from './layout'
import type { Placements, Surface } from './types'

function chip(name: string): CircuitSpec {
  const { doc, diagnostics } = parseSpec(project1HdlSources[name])
  if (doc === null) throw new Error(diagnostics.map((d) => d.message).join('; '))
  return doc
}

const pinOf = (partId: PartId, pin: string): Ref => ({ kind: 'part-pin', partId, pin })
const isPart = (ref: Ref, id: PartId): boolean => ref.kind === 'part-pin' && ref.partId === id

/** Appends a `Not` reading `net` and driving a new net nothing reads; every other id is unchanged. */
function addNot(doc: CircuitSpec, net: string): CircuitSpec {
  const id: PartId = `p${Math.max(0, ...doc.parts.map((p) => Number(p.id.slice(1)))) + 1}`
  const nets = doc.nets.map((n) => (n.id === net ? { ...n, sinks: [...n.sinks, pinOf(id, 'in')] } : n))
  return { ...doc, parts: [...doc.parts, { id, chip: 'Not' }], nets: [...nets, { id: `~${id}`, driver: pinOf(id, 'out'), sinks: [] }] }
}

function deletePart(doc: CircuitSpec, id: PartId): CircuitSpec {
  return {
    ...doc,
    parts: doc.parts.filter((p) => p.id !== id),
    nets: doc.nets.map((n) => ({
      ...n,
      driver: n.driver !== null && isPart(n.driver, id) ? null : n.driver,
      sinks: n.sinks.filter((s) => !isPart(s, id)),
    })),
  }
}

/** Moves part `id`'s reads of net `from` onto net `to`. */
function rewire(doc: CircuitSpec, from: string, id: PartId, to: string): CircuitSpec {
  const moved = doc.nets.find((n) => n.id === from)?.sinks.filter((s) => isPart(s, id)) ?? []
  const nets = doc.nets.map((n) => {
    if (n.id === from) return { ...n, sinks: n.sinks.filter((s) => !isPart(s, id)) }
    return n.id === to ? { ...n, sinks: [...n.sinks, ...moved] } : n
  })
  return { ...doc, nets }
}

/** Pairs that share a layer in both drawings and that the second puts in the other order. */
function reordered(before: Placements, after: Placements): string[] {
  const both = (Object.keys(after.nodes) as NodeId[]).filter((id) => before.nodes[id] !== undefined)
  return both.flatMap((u, i) =>
    both.slice(i + 1).flatMap((v) => {
      const [bu, bv, au, av] = [before.nodes[u], before.nodes[v], after.nodes[u], after.nodes[v]]
      if (!bu || !bv || !au || !av || bu.layer !== bv.layer || au.layer !== av.layer) return []
      return Math.sign(bu.index - bv.index) === Math.sign(au.index - av.index) ? [] : [`${u}/${v}`]
    }),
  )
}

function randomEdit(rng: Rng, doc: CircuitSpec): CircuitSpec {
  const pick = <T,>(items: readonly T[]): T | undefined => items[Math.floor(rng() * items.length)]
  const roll = rng()
  const part = pick(doc.parts)
  const read = pick(doc.nets.flatMap((n) => n.sinks.flatMap((s) => (s.kind === 'part-pin' ? [{ net: n.id, id: s.partId }] : []))))
  const target = pick(doc.nets.filter((n) => n.driver !== null))
  if (roll < 1 / 3 && part !== undefined) return deletePart(doc, part.id)
  if (roll < 2 / 3 && read !== undefined && target !== undefined) return rewire(doc, read.net, read.id, target.id)
  return target === undefined ? doc : addNot(doc, target.id)
}

/** Every node on its own lattice cell at 3 decimals, and every node of `doc` placed. */
function latticeFaults(doc: CircuitSpec, placed: Placements, pitch: number): string[] {
  const round = (v: number): number => Math.round(v * 1000) / 1000 || 0
  const faults: string[] = []
  const cells = new Set<string>()
  for (const [id, node] of Object.entries(placed.nodes)) {
    if (node === undefined) continue
    const [along, flat] = placed.surface === '3d' ? [node.z, node.y] : [node.y, node.z]
    const onCell = node.x === round(node.layer * pitch) && along === round(node.index * pitch) && flat === 0
    const fixed = [node.x, node.y, node.z].every((v) => v === Number(v.toFixed(3)))
    if (!onCell || !fixed) faults.push(`${id} at ${JSON.stringify(node)}`)
    cells.add(`${node.layer}:${node.index}`)
  }
  const count = doc.ins.length + doc.parts.length + doc.outs.length
  if (cells.size !== count) faults.push(`${cells.size} cells for ${count} nodes`)
  return faults
}

describe('layout with previous (ADR-0020 §2)', () => {
  it('with no previous, returns exactly what order: \'barycentre\' returns', () => {
    for (const doc of [chip('Xor'), chip('Mux4Way16'), chip('DMux8Way')]) {
      expect(layout(doc, '3d', { previous: undefined })).toStrictEqual(layout(doc, '3d', { order: 'barycentre' }))
      expect(layout(doc, '2d', {})).toStrictEqual(layout(doc, '2d', { order: 'barycentre' }))
    }
    // Not vacuous: a previous is read, and the result names the strategy it held to.
    const xor = chip('Xor')
    const held = layout(addNot(xor, 'na'), '3d', { previous: layout(xor, '3d') })
    expect(held.nodes).not.toEqual(layout(addNot(xor, 'na'), '3d').nodes)
    expect(held.previous).toEqual({ strategyId: 'layered', strategyVersion: 1 })
  })

  it('one part added: any two nodes sharing a layer before and after keep their order, on Xor, Mux4Way16 and DMux8Way', () => {
    const added: Array<[string, string]> = [['Xor', 'na'], ['Mux4Way16', 'ab'], ['DMux8Way', 'abcd']]
    for (const [name, net] of added) {
      const before = layout(chip(name), '3d')
      const after = layout(addNot(chip(name), net), '3d', { previous: before })
      expect(reordered(before, after), name).toEqual([])
      expect(Object.keys(after.nodes)).toHaveLength(Object.keys(before.nodes).length + 1)
    }
    // Not vacuous: without previous, the sweeps reorder both of these.
    expect(reordered(layout(chip('Xor'), '3d'), layout(addNot(chip('Xor'), 'na'), '3d'))).not.toEqual([])
    expect(reordered(layout(chip('Mux4Way16'), '3d'), layout(addNot(chip('Mux4Way16'), 'ab'), '3d'))).not.toEqual([])
  })

  it('one connection rewired: any two nodes sharing a layer before and after keep their order', () => {
    // Xor's second And reads `a` for `b`; DMux8Way's first DMux4Way reads `in` for `abcd`.
    const rewired: Array<[string, string, PartId, string]> = [['Xor', 'b', 'p4', 'a'], ['DMux8Way', 'abcd', 'p2', 'in']]
    for (const [name, from, id, to] of rewired) {
      const before = layout(chip(name), '2d')
      const edited = rewire(chip(name), from, id, to)
      expect(reordered(before, layout(edited, '2d', { previous: before })), name).toEqual([])
      expect(reordered(before, layout(edited, '2d')), name).not.toEqual([])
    }
  })

  it('one part deleted: any two remaining nodes sharing a layer before and after keep their order', () => {
    for (const [name, id] of [['Mux4Way16', 'p3'], ['Mux', 'p2']] as const) {
      const before = layout(chip(name), '3d')
      const edited = deletePart(chip(name), id)
      const after = layout(edited, '3d', { previous: before })
      expect(reordered(before, after), name).toEqual([])
      expect(after.nodes[id]).toBeUndefined()
      expect(reordered(before, layout(edited, '3d')), name).not.toEqual([])
    }
  })

  it('an entry naming a part the document no longer has is ignored', () => {
    const doc = chip('Mux4Way16')
    const before = layout(doc, '3d')
    const edited = deletePart(doc, 'p3')
    const ghost = { x: 0, y: 0, z: 0, layer: 1, index: 0 }
    const stale: Placements = { ...before, nodes: { ...before.nodes, p99: ghost, 'in:gone': ghost, 'out:gone': ghost } }
    const live = Object.fromEntries(Object.entries(before.nodes).filter(([id]) => id !== 'p3'))
    const held = layout(edited, '3d', { previous: stale })
    expect(held).toStrictEqual(layout(edited, '3d', { previous: { ...before, nodes: live } }))
    expect(Object.keys(held.nodes)).toEqual(['in:a', 'in:b', 'in:c', 'in:d', 'in:sel', 'p1', 'p2', 'out:out'])
    // Not vacuous: the entries that still name a node are held.
    expect(held.nodes).not.toEqual(layout(edited, '3d').nodes)
  })

  it('a previous from another strategyId, an unknown strategyVersion or the other surface is discarded whole, and Placements says previousDiscarded', () => {
    const xor = chip('Xor')
    const edited = addNot(xor, 'na')
    const before = layout(xor, '3d')
    const fresh = layout(edited, '3d')
    const foreign: Placements[] = [{ ...before, strategyId: 'elk' }, { ...before, strategyVersion: 2 }, { ...before, strategyVersion: 0 }, layout(xor, '2d')]
    for (const previous of foreign) {
      const placed = layout(edited, '3d', { previous })
      expect(placed).toStrictEqual({ ...fresh, previousDiscarded: true })
      expect(placed).not.toHaveProperty('previous')
    }
    expect(layout(edited, '2d', { previous: before })).toStrictEqual({ ...layout(edited, '2d'), previousDiscarded: true })
    // Not vacuous: the same previous, unaltered, is held.
    expect(layout(edited, '3d', { previous: before }).nodes).not.toEqual(fresh.nodes)
  })

  it('the same (doc, surface, previous) twice gives deep-equal Placements', () => {
    const doc = chip('Mux4Way16')
    const before = layout(doc, '2d')
    const copy = structuredClone(before)
    const edited = deletePart(addNot(doc, 'ab'), 'p2')
    const once = layout(edited, '2d', { previous: before })
    const twice = layout(edited, '2d', { previous: before })
    expect(twice).toStrictEqual(once)
    expect(JSON.stringify(twice)).toBe(JSON.stringify(once))
    expect(before).toStrictEqual(copy)
    expect(once.previous).toEqual({ strategyId: 'layered', strategyVersion: 1 })
  })

  it('fuzz: 200 seeded edit sequences (add, delete, rewire) never throw, and every result keeps precondition 4\'s lattice and precision', () => {
    const names = Object.keys(project1HdlSources)
    const pitches = [2, 0.5, 1 / 3, 0.001]
    const faults: string[] = []
    for (let seed = 0; seed < 200; seed++) {
      const rng = mulberry32(seed)
      let doc = chip(names[Math.floor(rng() * names.length)])
      const surface: Surface = rng() < 0.5 ? '3d' : '2d'
      const pitch = pitches[Math.floor(rng() * pitches.length)]
      let previous = layout(doc, surface, { pitch })
      for (let step = 0; step < 5; step++) {
        doc = randomEdit(rng, doc)
        // A quarter of the time the previous names only some of the nodes it placed.
        const given = rng() < 0.25 ? { ...previous, nodes: Object.fromEntries(Object.entries(previous.nodes).filter(() => rng() < 0.6)) } : previous
        const placed = layout(doc, surface, { pitch, previous: given })
        for (const fault of [...latticeFaults(doc, placed, pitch), ...reordered(given, placed)]) faults.push(`seed ${seed} step ${step}: ${fault}`)
        previous = placed
      }
    }
    expect(faults).toEqual([])
  })
})
