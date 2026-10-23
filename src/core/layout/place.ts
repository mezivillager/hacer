import type { Hint, NodeId } from '../spec/types'
import type { NodePlacement, Placements, Surface } from './types'

const fixed = (at: number): number => Math.round(at * 1000) / 1000 || 0
const onLattice = (slot: number, pitch: number): number => fixed(slot * pitch)
const nearest = (at: number, pitch: number): number => Math.round(at / pitch) || 0

/** Hinted nodes sit at their hints to 3 decimals and hold the cell nearest each; the rest take their layer's free cells in order. */
export function place(ids: NodeId[], layers: number[][], surface: Surface, pitch: number, hints: Partial<Record<NodeId, Hint>>): Placements['nodes'] {
  const placed: NodePlacement[] = []
  const taken = new Set<string>()
  ids.forEach((id, v) => {
    const hint = hints[id]
    if (hint === undefined) return
    const [x, y, z] = [fixed(hint.x), fixed(hint.y), fixed(hint.z)]
    const cell = { layer: nearest(x, pitch), index: nearest(surface === '3d' ? z : y, pitch) }
    taken.add(`${cell.layer}:${cell.index}`)
    placed[v] = { x, y, z, ...cell }
  })
  layers.forEach((layer, l) => {
    let index = 0
    for (const v of layer) {
      if (v >= ids.length || placed[v] !== undefined) continue
      while (taken.has(`${l}:${index}`)) index++
      const [x, along] = [onLattice(l, pitch), onLattice(index, pitch)]
      placed[v] = surface === '3d' ? { x, y: 0, z: along, layer: l, index } : { x, y: along, z: 0, layer: l, index }
      index++
    }
  })
  const nodes: Placements['nodes'] = {}
  ids.forEach((id, v) => (nodes[id] = placed[v]))
  return nodes
}
