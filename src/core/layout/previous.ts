import type { NodeId } from '../spec/types'
import type { Placements } from './types'

/**
 * Within each layer, the nodes `previous` placed in one layer take back the order it gave them, in the slots they hold;
 * a node it does not place, and every dummy, keeps its slot.
 */
export function holdPrevious(layers: number[][], ids: NodeId[], previous: Placements['nodes']): number[][] {
  return layers.map((layer) => {
    const was = new Map<number, number>()
    const groups = new Map<number, number[]>()
    layer.forEach((v, slot) => {
      const node = v < ids.length ? previous[ids[v]] : undefined
      const [from, index] = [node?.layer, node?.index]
      if (from === undefined || index === undefined || !Number.isFinite(from) || !Number.isFinite(index)) return
      was.set(v, index)
      groups.set(from, [...(groups.get(from) ?? []), slot])
    })
    const held = [...layer]
    for (const slots of groups.values()) {
      const members = slots.map((slot) => layer[slot]).sort((a, b) => (was.get(a) ?? 0) - (was.get(b) ?? 0))
      slots.forEach((slot, k) => (held[slot] = members[k]))
    }
    return held
  })
}
