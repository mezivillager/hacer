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
type LegacyBus = DeserializedCircuit['busComponents'][number]
type Endpoint = LegacyWire['from']
type SinkRef = Ref & { kind: 'part-pin' | 'chip-out' }
/** `rank` orders a part output by part, then pin, so internal names never depend on wire order. */
interface Source { ref: Ref; width: number; rank: number }
/** Bits `at…` of a value: bits `offset…` of `source`, or 0s read at `lost` when there is no source. */
interface Piece { at: number; bits: number; offset: number; source: Source | null; lost?: string }
type Real = Piece & { source: Source }
/** One value a wire can carry, LSB first. A junction or bus input that reads two sources yields two. */
type Value = Piece[]
interface Delivery { wire: LegacyWire; pieces: Value; key: string }

const RESERVED = new Set(['CHIP', 'IN', 'OUT', 'PARTS', 'CLOCKED', 'BUILTIN', 'true', 'false', 'wire'])
const compare = (a: string, b: string): number => (a < b ? -1 : a > b ? 1 : 0)
const partNumber = (note: ImportNote): number => (note.partId ? Number(note.partId.slice(1)) : Number.POSITIVE_INFINITY)
const byNote = (a: ImportNote, b: ImportNote): number =>
  compare(a.kind, b.kind) || partNumber(a) - partNumber(b) || compare(a.pin ?? '', b.pin ?? '') || compare(a.detail, b.detail)
const describe = (ref: Ref): string => (ref.kind === 'part-pin' ? `${ref.partId}.` : '') + printPinRef(ref.pin, ref.slice)
const where = (ref: SinkRef) => (ref.kind === 'part-pin' ? { partId: ref.partId, pin: ref.pin } : { pin: ref.pin })
const narrowed = <R extends Ref>(ref: R, whole: number, start: number, bits: number): R =>
  start === 0 && bits >= whole ? ref : { ...ref, slice: { start, end: start + bits - 1 } }
const isReal = (p: Piece): p is Real => p.source !== null
const driverOf = (p: Real): Ref => narrowed(p.source.ref, p.source.width, p.offset, p.bits)
const byId = (a: LegacyWire, b: LegacyWire): number => compare(a.id, b.id)
const floating = (bits: number, lost?: string): Value => [{ at: 0, bits, offset: 0, source: null, ...(lost === undefined ? {} : { lost }) }]
/** Bits `from…from+bits-1` of a value, moved down to bit 0. */
const cut = (value: Value, from: number, bits: number): Value =>
  value.flatMap((p) => {
    const lo = Math.max(p.at, from)
    const hi = Math.min(p.at + p.bits, from + bits)
    return lo < hi ? [{ ...p, at: lo - from, bits: hi - lo, offset: p.offset + lo - p.at }] : []
  })
const pad = (value: Value, width: number, lost: string): Value => {
  const end = value.reduce((n, p) => Math.max(n, p.at + p.bits), 0)
  return end < width ? [...value, { at: end, bits: width - end, offset: 0, source: null, lost }] : value
}
const sourceName = (p: Piece): string => (p.source ? describe(p.source.ref) : `0 at ${p.lost}`)
const reading = (value: Value, pin: string): string =>
  value.filter(isReal).map((p, _, real) => describe(driverOf(p)) + (real.length === 1 && p.at === 0 ? '' : ` into ${printPinRef(pin, { start: p.at, end: p.at + p.bits - 1 })}`)).join(' and ') || 'nothing'
/** Pieces that continue one another become one run, so a joiner of one signal's bits reads as that signal. */
const merge = (value: Value): Value =>
  value.reduce<Value>((runs, p) => {
    const last = runs[runs.length - 1]
    if (last && last.at + last.bits === p.at && sourceName(last) === sourceName(p) && (!p.source || last.offset + last.bits === p.offset)) runs[runs.length - 1] = { ...last, bits: last.bits + p.bits }
    else runs.push(p)
    return runs
  }, [])
/** A joiner's values: every input's first reading in place, then each further reading of one input. */
function join(inputs: Value[][]): Value[] {
  const place = (values: Value[]): Value => merge(values.flatMap((v, i) => v.map((p) => ({ ...p, at: p.at + i }))))
  const first = inputs.map((readings) => readings[0])
  return [place(first), ...inputs.flatMap((readings, i) => readings.slice(1).map((r) => place(first.map((v, k) => (k === i ? r : v)))))]
}
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
  for (const bus of legacy.busComponents) note('bus-dissolved', `The ${bus.kind} "${bus.id}" (${bus.width} bits) is dissolved into slices of the signals it carries`)

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

  const whole = (source: Source): Value[] => [[{ at: 0, bits: source.width, offset: 0, source }]]
  const resolve = (end: Endpoint, path: string[]): Value[] => {
    if (end.type === 'input') {
      const at = legacy.inputNodes.findIndex((n) => n.id === end.entityId)
      return at < 0 ? [floating(Infinity)] : whole({ ref: { kind: 'chip-in', pin: ins[at].name }, width: ins[at].width, rank: -1 })
    }
    if (end.type === 'gate') {
      const part = partOf.get(end.entityId)
      const at = part?.gate.outputs.findIndex((p) => p.id === end.pinId) ?? -1
      if (!part || at < 0) return [floating(Infinity)]
      const pin = part.gate.outputs[at]
      return whole({ ref: { kind: 'part-pin', partId: part.id, pin: pin.name }, width: pin.width ?? 1, rank: part.index * 1024 + at })
    }
    if (path.includes(end.entityId)) return [floating(Infinity)]
    const next = [...path, end.entityId]
    const bus = end.type === 'bus' ? legacy.busComponents.find((b) => b.id === end.entityId) : undefined
    const out = bus?.outputs.findIndex((p) => p.id === end.pinId) ?? -1
    if (bus && out >= 0) return bus.kind === 'splitter' ? busInput(bus, 'in', bus.width, next).map((v) => cut(v, out, 1)) : join(bus.inputs.map((p) => busInput(bus, p.id, 1, next)))
    const junction = end.type === 'junction' ? legacy.junctions.find((j) => j.id === end.entityId) : undefined
    if (!junction) return [floating(Infinity)]
    const at = (e: Endpoint): boolean => e.type === 'junction' && e.entityId === junction.id
    const feeds = legacy.wires.filter((w) => at(w.to))
    const candidates = feeds.length > 0 ? feeds : legacy.wires.filter((w) => junction.wireIds.includes(w.id) && !at(w.from))
    return candidates.length === 0 ? [floating(Infinity)] : candidates.flatMap((w) => resolve(w.from, next))
  }
  /** What legacy writes to a bus input: each wire's value cut to `min(wire, pin)` bits, the rest 0. */
  const busInput = (bus: LegacyBus, pinId: string, width: number, path: string[]): Value[] => {
    const pin = `${bus.kind} "${bus.id}" pin "${pinId}"`
    const readings = legacy.wires
      .filter((w) => w.to.type === 'bus' && w.to.entityId === bus.id && w.to.pinId === pinId)
      .sort(byId)
      .flatMap((w) => resolve(w.from, path).map((v) => cut(v, 0, Math.min(w.width ?? 1, width)).map((p) => (p.source || p.lost ? p : { ...p, lost: `${w.from.type} "${w.from.entityId}"` }))))
    return readings.length > 0 ? readings.map((v) => pad(v, width, pin)) : [floating(width, pin)]
  }

  const sinkKey = ({ type, entityId, pinId }: Endpoint): string | null => {
    if (type === 'gate') return partOf.get(entityId)?.gate.inputs.some((p) => p.id === pinId) ? `gate:${entityId}:${pinId}` : null
    return type === 'output' && legacy.outputNodes.some((n) => n.id === entityId) ? `output:${entityId}` : null
  }
  const readLater = (to: Endpoint): boolean =>
    to.type === 'junction' ? legacy.junctions.some((j) => j.id === to.entityId) : to.type === 'bus' && legacy.busComponents.some((b) => b.id === to.entityId && b.inputs.some((p) => p.id === to.pinId))
  const into = new Map<string, LegacyWire[]>()
  for (const w of legacy.wires) {
    const key = sinkKey(w.to)
    if (key !== null) into.set(key, [...(into.get(key) ?? []), w])
    else if (!readLater(w.to)) note('dangling-sink', `Wire "${w.id}" ends at ${w.to.type} "${w.to.entityId}"${w.to.pinId ? ` pin "${w.to.pinId}"` : ''}, which nothing reads, so it is dropped`)
  }
  const sites: Array<{ ref: SinkRef; width: number; wires: LegacyWire[] }> = [
    ...legacy.gates.flatMap((g, i) => g.inputs.map((p) => ({ ref: { kind: 'part-pin' as const, partId: parts[i].id, pin: p.name }, width: p.width ?? 1, wires: into.get(`gate:${g.id}:${p.id}`) ?? [] }))),
    ...legacy.outputNodes.map((n, i) => ({ ref: { kind: 'chip-out' as const, pin: outs[i].name }, width: n.width, wires: into.get(`output:${n.id}`) ?? [] })),
  ]

  const plan = sites.map((site) => {
    const byKey = new Map<string, { delivery: Delivery; wires: string[] }>()
    for (const wire of [...site.wires].sort(byId)) {
      for (const value of resolve(wire.from, [])) {
        const pieces = cut(value, 0, Math.min(wire.width ?? 1, site.width))
        // Legacy writes the whole pin, so readings that differ only in 0s are one connection.
        const key = pieces.filter(isReal).map((p) => `${p.at}:${describe(driverOf(p))}`).join(' ') || 'false'
        const seen = byKey.get(key) ?? { delivery: { wire, pieces, key }, wires: [] }
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
      const drivers = found.map(({ delivery: d, wires }) => `${reading(d.pieces, site.ref.pin)} (wire ${quoted(wires)})`)
      note('multiple-drivers', `${label} has ${found.length} drivers: ${drivers.join(', ')}; every one is kept`, where(site.ref))
    }
    for (const { wires } of found) {
      if (wires.length > 1) note('duplicate-wire', `Wires ${quoted(wires)} deliver the same bits to ${label}, kept as one connection`, where(site.ref))
    }
    return { site, deliveries: found.map((f) => f.delivery) }
  })

  const runs = plan.flatMap(({ site, deliveries }) => (site.ref.kind === 'part-pin' ? deliveries.flatMap((d) => d.pieces.filter(isReal)) : []))
  runs.sort((a, b) => a.source.rank - b.source.rank || a.offset - b.offset || b.bits - a.bits)
  const internal = new Map<string, string>()
  let counter = 0
  for (const run of runs.filter((p) => p.source.ref.kind === 'part-pin')) {
    const key = describe(driverOf(run))
    if (internal.has(key)) continue
    while (taken.has(`t${++counter}`)) continue
    taken.add(`t${counter}`)
    internal.set(key, `t${counter}`)
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
    const outNets: Array<{ net: Net; at: number; bits: number }> = []
    const floats: Array<{ wire: LegacyWire; piece: Piece; sink: SinkRef }> = []
    for (const d of deliveries) {
      for (const p of d.pieces) {
        const sink = narrowed(site.ref, site.width, p.at, p.bits)
        if (!isReal(p)) {
          if (sink.kind === 'part-pin') netFor('false', null).sinks.push(sink)
          floats.push({ wire: d.wire, piece: p, sink })
          continue
        }
        const driver = driverOf(p)
        if (sink !== site.ref || driver !== p.source.ref) note('slice-inferred', `Wire "${d.wire.id}" carries ${p.bits} bit${p.bits === 1 ? '' : 's'}: ${describe(driver)} → ${describe(sink)}`, where(site.ref))
        if (sink.kind === 'chip-out') {
          const net = { id: printPinRef(sink.pin, sink.slice), driver, sinks: [sink] }
          nets.push(net)
          outNets.push({ net, at: p.at, bits: p.bits })
          continue
        }
        const id = driver.kind === 'part-pin' ? (internal.get(describe(driver)) ?? describe(driver)) : printPinRef(driver.pin, driver.slice)
        netFor(id, driver).sinks.push(sink)
      }
    }
    const first = outNets[0]
    const bare = deliveries.length > 1 && first !== undefined && deliveries.some((d) => !d.pieces.some((p) => isReal(p) && p.at < first.at + first.bits && first.at < p.at + p.bits))
    // Same id as a real driver's net, so compileSpec refuses the repeat; the export has no form for a driverless net.
    if (bare) nets.push({ id: first.net.id, driver: null, sinks: [...first.net.sinks] })
    for (const { wire, piece, sink } of floats) {
      const outcome = sink.kind === 'part-pin' ? `${describe(sink)} is bound to false` : bare ? `it is kept as a driverless net on ${first.net.id} beside the other drivers` : `OUT ${printPinRef(sink.pin, sink.slice)} is left undriven`
      note('floating-source', `Wire "${wire.id}" reads nothing at ${piece.lost ?? `${wire.from.type} "${wire.from.entityId}"`}, so ${outcome}`, where(site.ref))
    }
  }
  return finish({ schemaVersion: SPEC_SCHEMA_VERSION, name: chip.name, ins, outs, parts, nets })
}
