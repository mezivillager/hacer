import type { CircuitSpec, NodeId } from '../spec/types'
import { layered } from './layered'
import type { LayoutOptions, NodePlacement, Placements, Surface } from './types'

const STRATEGY_ID = 'layered'
const STRATEGY_VERSION = 1
const DEFAULTS: Required<LayoutOptions> = { order: 'barycentre', pitch: 2 }

const onLattice = (slot: number, pitch: number): number => Math.round(slot * pitch * 1000) / 1000 || 0

/**
 * Places every part and chip I/O terminal of `doc` on a lattice: pure, deterministic and synchronous (ADR-0020 §2).
 * Longest-path layers run along x; the within-layer slot runs along z in 3d and y in 2d.
 */
export function layout(doc: CircuitSpec, surface: Surface, options: LayoutOptions = {}): Placements {
  const resolved = { order: options.order ?? DEFAULTS.order, pitch: options.pitch ?? DEFAULTS.pitch }
  const { ids, layers } = layered(doc, resolved.order)
  const slots: Array<{ layer: number; index: number }> = []
  layers.forEach((layer, l) => layer.filter((v) => v < ids.length).forEach((v, index) => (slots[v] = { layer: l, index })))

  const nodes: Partial<Record<NodeId, NodePlacement>> = {}
  ids.forEach((id, v) => {
    const { layer, index } = slots[v]
    const x = onLattice(layer, resolved.pitch)
    const along = onLattice(index, resolved.pitch)
    nodes[id] = surface === '3d' ? { x, y: 0, z: along, layer, index } : { x, y: along, z: 0, layer, index }
  })
  return { surface, strategyId: STRATEGY_ID, strategyVersion: STRATEGY_VERSION, options: resolved, nodes }
}
