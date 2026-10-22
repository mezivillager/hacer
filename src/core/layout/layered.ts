import type { CircuitSpec, NodeId, PartId, Ref } from '../spec/types'
import type { LayoutOrder } from './types'

export interface Layered {
  /** The document's nodes in canonical order; a graph node at or past `ids.length` is a dummy. */
  ids: NodeId[]
  /** Each layer's graph nodes, first slot first. */
  layers: number[][]
  crossings: number
}

const SWEEPS = 8

const partNumber = (id: PartId): number => {
  const n = Number(id.slice(1))
  return Number.isNaN(n) ? Number.POSITIVE_INFINITY : n
}
const byPartId = (a: PartId, b: PartId): number => partNumber(a) - partNumber(b) || (a < b ? -1 : a > b ? 1 : 0)

function canonicalNodes(doc: CircuitSpec): NodeId[] {
  const parts = [...new Set(doc.parts.map((p) => p.id))].sort(byPartId)
  return [...new Set<NodeId>([...doc.ins.map((p) => `in:${p.name}` as const), ...parts, ...doc.outs.map((p) => `out:${p.name}` as const)])]
}

function nodeOf(ref: Ref | null): NodeId | null {
  if (ref === null || ref.kind === 'constant') return null
  if (ref.kind === 'part-pin') return ref.partId
  return ref.kind === 'chip-in' ? `in:${ref.pin}` : `out:${ref.pin}`
}

/** Each node's successors by canonical rank, sorted; an end that names no node drops its edge. */
function successors(doc: CircuitSpec, ids: NodeId[]): number[][] {
  const rank = new Map(ids.map((id, i) => [id, i]))
  const rankOf = (ref: Ref | null): number | undefined => {
    const id = nodeOf(ref)
    return id === null ? undefined : rank.get(id)
  }
  const next = ids.map(() => new Set<number>())
  for (const net of doc.nets) {
    const from = rankOf(net.driver)
    if (from === undefined) continue
    for (const sink of net.sinks) {
      const to = rankOf(sink)
      if (to !== undefined && to !== from) next[from].add(to)
    }
  }
  return next.map((targets) => [...targets].sort((a, b) => a - b))
}

/** A depth-first walk in canonical order: the edges that do not close a cycle, and a topological order of them. */
function acyclic(next: number[][]): { forward: number[][]; topological: number[] } {
  const state = next.map((): 'unseen' | 'open' | 'done' => 'unseen')
  const forward = next.map((): number[] => [])
  const finished: number[] = []
  for (let root = 0; root < next.length; root++) {
    if (state[root] !== 'unseen') continue
    state[root] = 'open'
    const stack: Array<[number, number]> = [[root, 0]]
    while (stack.length > 0) {
      const top = stack[stack.length - 1]
      const [u, i] = top
      if (i === next[u].length) {
        stack.pop()
        state[u] = 'done'
        finished.push(u)
        continue
      }
      top[1] = i + 1
      const v = next[u][i]
      if (state[v] === 'open') continue
      forward[u].push(v)
      if (state[v] === 'unseen') {
        state[v] = 'open'
        stack.push([v, 0])
      }
    }
  }
  return { forward, topological: finished.reverse() }
}

function longestPathLayers(ids: NodeId[], next: number[][]): number[] {
  const { forward, topological } = acyclic(next)
  const layer = ids.map(() => 0)
  for (const u of topological) for (const v of forward[u]) layer[v] = Math.max(layer[v], layer[u] + 1)
  const isOut = (i: number): boolean => ids[i].startsWith('out:')
  const deepest = layer.reduce((max, l, i) => (isOut(i) ? max : Math.max(max, l)), -1)
  return layer.map((l, i) => (isOut(i) ? deepest + 1 : l))
}

/** Neighbours in the layer above and below, with a dummy in each layer a long edge crosses; an edge within one layer joins none. */
function adjacency(next: number[][], layer: number[]): { layerOf: number[]; up: number[][]; down: number[][] } {
  const layerOf = [...layer]
  const up = layer.map((): number[] => [])
  const down = layer.map((): number[] => [])
  const joined = new Set<string>()
  next.forEach((targets, u) => {
    for (const v of targets) {
      const [top, bottom] = layer[u] < layer[v] ? [u, v] : [v, u]
      if (layer[u] === layer[v] || joined.has(`${top}:${bottom}`)) continue
      joined.add(`${top}:${bottom}`)
      let above = top
      for (let l = layer[top] + 1; l < layer[bottom]; l++) {
        const dummy = layerOf.push(l) - 1
        up.push([above])
        down.push([])
        down[above].push(dummy)
        above = dummy
      }
      down[above].push(bottom)
      up[bottom].push(above)
    }
  })
  return { layerOf, up, down }
}

/** Segment pairs between adjacent layers whose ends sit in opposite order, counted with a Fenwick tree. */
function countCrossings(layers: number[][], down: number[][], pos: number[]): number {
  let crossings = 0
  for (let k = 0; k + 1 < layers.length; k++) {
    const width = layers[k + 1].length
    const tree = new Array<number>(width + 1).fill(0)
    const ends = layers[k].flatMap((u) => down[u].map((v): [number, number] => [pos[u], pos[v]]))
    ends.sort((a, b) => a[0] - b[0] || a[1] - b[1])
    ends.forEach(([, end], seen) => {
      for (let i = end + 1; i > 0; i -= i & -i) crossings -= tree[i]
      crossings += seen
      for (let i = end + 1; i <= width; i += i & -i) tree[i]++
    })
  }
  return crossings
}

/** Sorts each layer, in sweep direction, by the mean slot of its neighbours in the layer just placed. */
function sweep(layers: number[][], neighbours: number[][], pos: number[], downward: boolean): void {
  const weight: number[] = []
  const last = layers.length - 1
  for (let step = 1; step <= last; step++) {
    const layer = layers[downward ? step : last - step]
    for (const v of layer) {
      const around = neighbours[v]
      weight[v] = around.length === 0 ? pos[v] : around.reduce((sum, w) => sum + pos[w], 0) / around.length
    }
    layer.sort((a, b) => weight[a] - weight[b] || a - b)
    layer.forEach((v, i) => (pos[v] = i))
  }
}

/** Layers, within-layer order and crossings of the drawn graph: the part of `layout` that is not coordinates. */
export function layered(doc: CircuitSpec, order: LayoutOrder): Layered {
  const ids = canonicalNodes(doc)
  const next = successors(doc, ids)
  const { layerOf, up, down } = adjacency(next, longestPathLayers(ids, next))
  const current: number[][] = Array.from({ length: layerOf.reduce((max, l) => Math.max(max, l + 1), 0) }, () => [])
  layerOf.forEach((l, node) => current[l].push(node))
  const pos: number[] = []
  current.forEach((layer) => layer.forEach((v, i) => (pos[v] = i)))

  let best = { layers: current.map((layer) => [...layer]), crossings: countCrossings(current, down, pos) }
  if (order === 'id') return { ids, ...best }
  for (let s = 0; s < SWEEPS; s++) {
    sweep(current, s % 2 === 0 ? up : down, pos, s % 2 === 0)
    const crossings = countCrossings(current, down, pos)
    if (crossings < best.crossings) best = { layers: current.map((layer) => [...layer]), crossings }
  }
  return { ids, ...best }
}
