import type { ChipRegistry } from '../chips/registry'
import type { CircuitSpec, Net, PartId, Ref } from './types'

export interface BoundInput {
  partId: PartId
  pin: string
}

export interface BindUnconnectedInputsResult {
  doc: CircuitSpec
  bound: BoundInput[]
}

/**
 * Binds every input pin of a registered part that no net sinks at any bit to the net the constant false drives,
 * which is how the nand2tetris simulator reads it. `bound` lists those pins in part order, for a caller to show.
 */
export function bindUnconnectedInputs(doc: CircuitSpec, registry: ChipRegistry): BindUnconnectedInputsResult {
  const sunk = new Set(doc.nets.flatMap((net) => net.sinks.flatMap((s) => (s.kind === 'part-pin' ? [`${s.partId}:${s.pin}`] : []))))
  const bound = doc.parts.flatMap((part) =>
    (registry.get(part.chip)?.inputs ?? []).filter((p) => !sunk.has(`${part.id}:${p.name}`)).map((p) => ({ partId: part.id, pin: p.name })),
  )
  if (bound.length === 0) return { doc: { ...doc }, bound }
  const sinks: Ref[] = bound.map(({ partId, pin }) => ({ kind: 'part-pin', partId, pin }))
  const at = doc.nets.findIndex((net) => net.driver?.kind === 'constant' && !net.driver.value)
  const nets: Net[] =
    at < 0
      ? [...doc.nets, { id: 'false', driver: { kind: 'constant', value: false }, sinks }]
      : doc.nets.map((net, i) => (i === at ? { ...net, sinks: [...net.sinks, ...sinks] } : net))
  return { doc: { ...doc, nets }, bound }
}
