import type { CircuitSpec, NodeId } from '../spec/types'
import type { LayoutOrder } from './types'

export interface Layered {
  /** The document's nodes in canonical order; a graph node at or past `ids.length` is a dummy. */
  ids: NodeId[]
  /** Each layer's graph nodes, first slot first. */
  layers: number[][]
  crossings: number
}

export function layered(_doc: CircuitSpec, _order: LayoutOrder): Layered {
  return { ids: [], layers: [], crossings: 0 }
}
