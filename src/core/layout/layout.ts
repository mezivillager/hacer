import type { CircuitSpec } from '../spec/types'
import type { LayoutOptions, Placements, Surface } from './types'

export function layout(_doc: CircuitSpec, surface: Surface, _options: LayoutOptions = {}): Placements {
  return { surface, strategyId: 'unimplemented', strategyVersion: 0, options: { order: 'barycentre', pitch: 0 }, nodes: {} }
}
