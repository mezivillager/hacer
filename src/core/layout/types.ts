import type { Hint, NodeId } from '../spec/types'

/** Each surface keeps its own placements, as it keeps its own hints (ADR-0020 §1.4). */
export type Surface = '3d' | '2d'

/** `barycentre` reduces crossings; `id` keeps the canonical order, one drawing per document. */
export type LayoutOrder = 'barycentre' | 'id'

/** The strategy's own options, which `Placements` records with every default filled in. */
export interface LayoutOptions {
  order?: LayoutOrder
  /** The lattice spacing between neighbouring layers and slots: finite and at least 0.001. */
  pitch?: number
}

/** What `layout` reads besides its options; neither is recorded in `Placements.options`. */
export interface LayoutInputs extends LayoutOptions {
  /** An earlier result on this surface: advisory, never a source of truth (ADR-0020 §2). */
  previous?: Placements
  /** The sidecar's `hints[surface]`: a hinted node sits at its hint and is never moved. */
  hints?: Partial<Record<NodeId, Hint>>
}

/** `layer` and `index` are the lattice cell the node occupies; a hinted node's is the cell nearest its hint. */
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
  /** The strategy of the `previous` this result held to. */
  previous?: Pick<Placements, 'strategyId' | 'strategyVersion'>
  /** Set when a `previous` was given and ignored whole. */
  previousDiscarded?: true
  /** Every part and chip I/O terminal of the document, in canonical order. */
  nodes: Partial<Record<NodeId, NodePlacement>>
}
