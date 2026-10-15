import { printPinRef } from '../hdl/printer'
import { deserializeCircuit, type DeserializedCircuit } from '../serialization/deserialize'
import type { SerializedCircuit } from '../serialization/types'
import { emptySidecar } from './sidecar'
import { SPEC_SCHEMA_VERSION } from './types'
import type { CircuitSpec, Hint, ImportNote, Net, Part, PartId, Port, Ref, Sidecar } from './types'

export interface LegacyImport {
  doc: CircuitSpec | null
  sidecar: Sidecar
}

type LegacyWire = DeserializedCircuit['wires'][number]
type Endpoint = LegacyWire['from']
type SinkRef = Ref & { kind: 'part-pin' | 'chip-out' }
/** `rank` orders a part output by part, then pin, so internal names never depend on wire order. */
interface Source { ref: Ref; width: number; rank: number }
interface Delivery { wire: LegacyWire; source: Source | null; width: number; key: string }

const RESERVED = new Set(['CHIP', 'IN', 'OUT', 'PARTS', 'CLOCKED', 'BUILTIN', 'true', 'false', 'wire'])
const compare = (a: string, b: string): number => (a < b ? -1 : a > b ? 1 : 0)
const partNumber = (note: ImportNote): number => (note.partId ? Number(note.partId.slice(1)) : Number.POSITIVE_INFINITY)
const byNote = (a: ImportNote, b: ImportNote): number =>
  compare(a.kind, b.kind) || partNumber(a) - partNumber(b) || compare(a.pin ?? '', b.pin ?? '') || compare(a.detail, b.detail)
const describe = (ref: Ref): string => (ref.kind === 'part-pin' ? `${ref.partId}.` : '') + printPinRef(ref.pin, ref.slice)
const where = (ref: SinkRef) => (ref.kind === 'part-pin' ? { partId: ref.partId, pin: ref.pin } : { pin: ref.pin })
const narrowed = <R extends Ref>(ref: R, whole: number, width: number): R => (width < whole ? { ...ref, slice: { start: 0, end: width - 1 } } : ref)
const hint = (at: { position: { x: number; y: number; z: number }; rotation: { y: number } }): Hint =>
  ({ x: at.position.x, y: at.position.y, z: at.position.z, rotation: at.rotation.y, origin: 'user' })

/** A saved name camel-cased into `[A-Za-z][A-Za-z0-9]*`, then numbered from 2 until it is free. */
function rename(raw: string, prefix: string, taken: Set<string>): { name: string; why: string } {
  const words = raw.split(/[^A-Za-z0-9]+/).filter(Boolean)
  const camel = words.map((w, i) => (i === 0 ? w : w[0].toUpperCase() + w.slice(1))).join('')
  const base = /^[A-Za-z]/.test(camel) ? camel : prefix + camel
  let name = base
  for (let n = 2; taken.has(name) || RESERVED.has(name); n++) name = `${base}${n}`
  taken.add(name)
  return { name, why: base !== raw ? 'not an HDL identifier' : RESERVED.has(base) ? 'a reserved word' : 'the name repeats' }
}

/**
 * Import a version-1 canvas document as a spec (ADR-0020 §1, §10), one way. Everything inferred, kept or
 * lost is an `ImportNote` in `sidecar.notes`; `doc` is null when the document cannot be imported at all.
 */
export function fromLegacyCircuit(saved: SerializedCircuit): LegacyImport {
  const sidecar = emptySidecar()
  const notes = sidecar.notes
  const note = (kind: string, detail: string, at: { partId?: PartId; pin?: string } = {}): void => {
    notes.push({ kind, ...at, detail })
  }
  const finish = (doc: CircuitSpec | null): LegacyImport => {
    notes.sort(byNote)
    return { doc, sidecar }
  }

  const { document: legacy, warnings } = deserializeCircuit(saved)
  for (const w of warnings) note(w.code, w.message)
  if (legacy === null) return finish(null)
  for (const bus of legacy.busComponents) note('unsupported-bus-component', `Bus component "${bus.id}" (${bus.kind}) has no import yet, so the document is not imported`)
  if (legacy.busComponents.length > 0) return finish(null)

  const chip = rename(saved.name, 'Chip', new Set())
  if (chip.name !== saved.name) note('renamed', `Chip "${saved.name}" is named ${chip.name}: ${chip.why}`)
  const taken = new Set<string>()
  const port = (n: { id: string; name: string; width: number }, role: 'input' | 'output'): Port => {
    const { name, why } = rename(n.name, role === 'input' ? 'in' : 'out', taken)
    if (name !== n.name) note('renamed', `The ${role} "${n.name}" (${n.id}) is named ${name}: ${why}`, { pin: name })
    return { name, width: n.width }
  }
  const ins = legacy.inputNodes.map((n) => port(n, 'input'))
  const outs = legacy.outputNodes.map((n) => port(n, 'output'))
  const parts: Part[] = legacy.gates.map((g, i) => ({ id: `p${i + 1}`, chip: g.chipName }))
  const partOf = new Map(legacy.gates.map((gate, index) => [gate.id, { gate, index, id: parts[index].id }]))
  legacy.gates.forEach((g, i) => (sidecar.hints['3d'][parts[i].id] = hint(g)))
  legacy.inputNodes.forEach((n, i) => (sidecar.hints['3d'][`in:${ins[i].name}`] = hint(n)))
  legacy.outputNodes.forEach((n, i) => (sidecar.hints['3d'][`out:${outs[i].name}`] = hint(n)))

  const resolve = (end: Endpoint, path: string[]): Array<Source | null> => {
    if (end.type === 'input') {
      const at = legacy.inputNodes.findIndex((n) => n.id === end.entityId)
      return [at < 0 ? null : { ref: { kind: 'chip-in', pin: ins[at].name }, width: ins[at].width, rank: -1 }]
    }
    if (end.type === 'gate') {
      const part = partOf.get(end.entityId)
      const at = part?.gate.outputs.findIndex((p) => p.id === end.pinId) ?? -1
      if (!part || at < 0) return [null]
      const pin = part.gate.outputs[at]
      return [{ ref: { kind: 'part-pin', partId: part.id, pin: pin.name }, width: pin.width ?? 1, rank: part.index * 1024 + at }]
    }
    const junction = end.type === 'junction' && !path.includes(end.entityId) ? legacy.junctions.find((j) => j.id === end.entityId) : undefined
    if (!junction) return [null]
    const at = (e: Endpoint): boolean => e.type === 'junction' && e.entityId === junction.id
    const feeds = legacy.wires.filter((w) => at(w.to))
    const candidates = feeds.length > 0 ? feeds : legacy.wires.filter((w) => junction.wireIds.includes(w.id) && !at(w.from))
    return candidates.length === 0 ? [null] : candidates.flatMap((w) => resolve(w.from, [...path, junction.id]))
  }

  const sinkKey = ({ type, entityId, pinId }: Endpoint): string | null => {
    if (type === 'gate') return partOf.get(entityId)?.gate.inputs.some((p) => p.id === pinId) ? `gate:${entityId}:${pinId}` : null
    return type === 'output' && legacy.outputNodes.some((n) => n.id === entityId) ? `output:${entityId}` : null
  }
  const feedsJunction = (to: Endpoint): boolean => to.type === 'junction' && legacy.junctions.some((j) => j.id === to.entityId)
  const into = new Map<string, LegacyWire[]>()
  for (const w of legacy.wires) {
    const key = sinkKey(w.to)
    if (key !== null) into.set(key, [...(into.get(key) ?? []), w])
    else if (!feedsJunction(w.to)) note('dangling-sink', `Wire "${w.id}" ends at ${w.to.type} "${w.to.entityId}"${w.to.pinId ? ` pin "${w.to.pinId}"` : ''}, which nothing reads, so it is dropped`)
  }
  const sites: Array<{ ref: SinkRef; width: number; wires: LegacyWire[] }> = [
    ...legacy.gates.flatMap((g, i) => g.inputs.map((p) => ({ ref: { kind: 'part-pin' as const, partId: parts[i].id, pin: p.name }, width: p.width ?? 1, wires: into.get(`gate:${g.id}:${p.id}`) ?? [] }))),
    ...legacy.outputNodes.map((n, i) => ({ ref: { kind: 'chip-out' as const, pin: outs[i].name }, width: n.width, wires: into.get(`output:${n.id}`) ?? [] })),
  ]

  const plan = sites.map((site) => {
    const byKey = new Map<string, { delivery: Delivery; wires: string[] }>()
    for (const wire of [...site.wires].sort((a, b) => compare(a.id, b.id))) {
      for (const source of resolve(wire.from, [])) {
        const width = Math.min(wire.width ?? 1, site.width, source?.width ?? Number.POSITIVE_INFINITY)
        const key = source ? `${describe(source.ref)}/${width}` : 'false'
        const seen = byKey.get(key) ?? { delivery: { wire, source, width, key }, wires: [] }
        if (!seen.wires.includes(wire.id)) seen.wires.push(wire.id)
        byKey.set(key, seen)
      }
    }
    const found = [...byKey.values()]
    const label = describe(site.ref)
    const quoted = (ids: string[]): string => ids.map((id) => `"${id}"`).join(', ')
    if (site.ref.kind === 'part-pin' && site.wires.length === 0) {
      note('unconnected-input', `${label} input "${site.ref.pin}" has no wire: it read 0 on the canvas, and the compile refuses it`, where(site.ref))
    }
    if (found.length > 1) {
      const drivers = found.map(({ delivery: d, wires }) => `${d.source ? describe(d.source.ref) : 'nothing'} (wire ${quoted(wires)})`)
      note('multiple-drivers', `${label} has ${found.length} drivers: ${drivers.join(', ')}; every one is kept`, where(site.ref))
    }
    for (const { wires } of found) {
      if (wires.length > 1) note('duplicate-wire', `Wires ${quoted(wires)} deliver the same bits to ${label}, kept as one connection`, where(site.ref))
    }
    return { site, deliveries: found.map((f) => f.delivery) }
  })

  const runs = plan.flatMap(({ site, deliveries }) => (site.ref.kind === 'part-pin' ? deliveries : [])).filter((d) => d.source?.ref.kind === 'part-pin')
  runs.sort((a, b) => (a.source?.rank ?? 0) - (b.source?.rank ?? 0) || b.width - a.width)
  const internal = new Map<string, string>()
  let counter = 0
  for (const run of runs) {
    if (internal.has(run.key)) continue
    while (taken.has(`t${++counter}`)) continue
    taken.add(`t${counter}`)
    internal.set(run.key, `t${counter}`)
  }

  const nets: Net[] = []
  const shared = new Map<string, Net>()
  const netFor = (id: string, driver: Ref | null): Net => {
    const net = shared.get(id) ?? { id, driver, sinks: [] }
    if (!shared.has(id)) nets.push(net)
    shared.set(id, net)
    return net
  }
  for (const { site, deliveries } of plan) {
    const anchor = deliveries.find((d) => d.source !== null)
    const anchorSink = anchor && narrowed(site.ref, site.width, anchor.width)
    for (const d of deliveries) {
      if (d.source === null) {
        const beside = site.ref.kind === 'chip-out' && anchorSink ? printPinRef(anchorSink.pin, anchorSink.slice) : null
        const outcome = site.ref.kind === 'part-pin' ? `${describe(site.ref)} is bound to false` : beside ? `it is kept as a driverless net on ${beside} beside the other drivers` : `OUT ${site.ref.pin} is left undriven`
        note('floating-source', `Wire "${d.wire.id}" reads nothing at ${d.wire.from.type} "${d.wire.from.entityId}", so ${outcome}`, where(site.ref))
        if (site.ref.kind === 'part-pin') netFor('false', null).sinks.push(site.ref)
        // Same id as a real driver's net, so compileSpec refuses the repeat; the export has no form for a driverless net.
        else if (beside !== null && anchorSink) nets.push({ id: beside, driver: null, sinks: [anchorSink] })
        continue
      }
      const sink = narrowed(site.ref, site.width, d.width)
      const driver = narrowed(d.source.ref, d.source.width, d.width)
      if (sink !== site.ref || driver !== d.source.ref) note('slice-inferred', `Wire "${d.wire.id}" carries ${d.width} bit${d.width === 1 ? '' : 's'}: ${describe(driver)} → ${describe(sink)}`, where(site.ref))
      if (sink.kind === 'chip-out') {
        nets.push({ id: printPinRef(sink.pin, sink.slice), driver, sinks: [sink] })
        continue
      }
      const id = driver.kind === 'part-pin' ? (internal.get(d.key) ?? d.key) : printPinRef(driver.pin, driver.slice)
      netFor(id, driver).sinks.push(sink)
    }
  }
  return finish({ schemaVersion: SPEC_SCHEMA_VERSION, name: chip.name, ins, outs, parts, nets })
}
