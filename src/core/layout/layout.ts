import type { CircuitSpec } from '../spec/types'
import { layered } from './layered'
import { place } from './place'
import { holdPrevious } from './previous'
import type { LayoutInputs, LayoutOptions, Placements, Surface } from './types'

const STRATEGY_ID = 'layered'
const STRATEGY_VERSION = 1
const KNOWN_VERSIONS: readonly number[] = [STRATEGY_VERSION]
const DEFAULTS: Required<LayoutOptions> = { order: 'barycentre', pitch: 2 }
// Coordinates keep 3 decimals, so a finer pitch puts neighbouring slots on one coordinate.
const MIN_PITCH = 0.001

function resolve(options: LayoutOptions): Required<LayoutOptions> {
  const pitch = options.pitch ?? DEFAULTS.pitch
  if (!Number.isFinite(pitch) || pitch < MIN_PITCH) {
    throw new RangeError(`layout: pitch must be finite and at least ${String(MIN_PITCH)}, got ${String(pitch)}`)
  }
  return { order: options.order ?? DEFAULTS.order, pitch }
}

const honours = (previous: Placements, surface: Surface): boolean =>
  previous.strategyId === STRATEGY_ID && KNOWN_VERSIONS.includes(previous.strategyVersion) && previous.surface === surface

/**
 * Places every part and chip I/O terminal of `doc` on a lattice: pure, deterministic and synchronous (ADR-0020 §2).
 * Longest-path layers run along x; the within-layer slot runs along z in 3d and y in 2d.
 * Throws a `RangeError` for a pitch that is not finite or is below 0.001; no `previous` makes it throw.
 */
export function layout(doc: CircuitSpec, surface: Surface, options: LayoutInputs = {}): Placements {
  const resolved = resolve(options)
  const { previous } = options
  const held = previous !== undefined && honours(previous, surface)
  const { ids, layers } = layered(doc, resolved.order)
  const ordered = held ? holdPrevious(layers, ids, previous.nodes) : layers
  const record =
    previous === undefined ? {} : held ? { previous: { strategyId: previous.strategyId, strategyVersion: previous.strategyVersion } } : { previousDiscarded: true as const }
  const nodes = place(ids, ordered, surface, resolved.pitch, options.hints ?? {})
  return { surface, strategyId: STRATEGY_ID, strategyVersion: STRATEGY_VERSION, options: resolved, ...record, nodes }
}
