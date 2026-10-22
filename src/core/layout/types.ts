import type { NodeId } from '../spec/types'

/** Each surface keeps its own placements, as it keeps its own hints (ADR-0020 §1.4). */
export type Surface = '3d' | '2d'

/** `barycentre` reduces crossings; `id` keeps the canonical order, one drawing per document. */
export type LayoutOrder = 'barycentre' | 'id'

export interface LayoutOptions {
  order?: LayoutOrder
  /** The lattice spacing between neighbouring layers and slots. */
  pitch?: number
}

export interface NodePlacement {
  x: number
  y: number
  z: number
  layer: number
  index: number
}

export interface Placements {
  surface: Surface
  strategyId: string
  strategyVersion: number
  options: Required<LayoutOptions>
  /** Every part and chip I/O terminal of the document, in canonical order. */
  nodes: Partial<Record<NodeId, NodePlacement>>
}
