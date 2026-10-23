import type { Hint, NodeId } from '../spec/types'
import type { NodePlacement, Placements, Surface } from './types'

const onLattice = (slot: number, pitch: number): number => Math.round(slot * pitch * 1000) / 1000 || 0
const nearest = (at: number, pitch: number): number => Math.round(at / pitch) || 0

/** Hinted nodes sit at their hints and hold the cell nearest each; the rest take their layer's free cells in order. */
export function place(ids: NodeId[], layers: number[][], surface: Surface, pitch: number, hints: Partial<Record<NodeId, Hint>>): Placements['nodes'] {
  const placed: NodePlacement[] = []
  const taken = new Set<string>()
  ids.forEach((id, v) => {
    const hint = hints[id]
    if (hint === undefined) return
    const cell = { layer: nearest(hint.x, pitch), index: nearest(surface === '3d' ? hint.z : hint.y, pitch) }
    taken.add(`${cell.layer}:${cell.index}`)
    placed[v] = { x: hint.x, y: hint.y, z: hint.z, ...cell }
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
