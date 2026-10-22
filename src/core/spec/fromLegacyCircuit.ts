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
type LegacyJunction = DeserializedCircuit['junctions'][number]
type Parts = Map<string, { gate: DeserializedCircuit['gates'][number]; index: number; id: PartId }>
type Endpoint = LegacyWire['from']
type PinRef = Exclude<Ref, { kind: 'constant' }>
type SinkRef = Ref & { kind: 'part-pin' | 'chip-out' }
/** `rank` orders a part output by part, then pin, so internal names never depend on wire order. */
interface Source { ref: PinRef; width: number; rank: number }
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
const describe = (ref: PinRef): string => (ref.kind === 'part-pin' ? `${ref.partId}.` : '') + printPinRef(ref.pin, ref.slice)
const where = (ref: SinkRef) => (ref.kind === 'part-pin' ? { partId: ref.partId, pin: ref.pin } : { pin: ref.pin })
const narrowed = <R extends PinRef>(ref: R, whole: number, start: number, bits: number): R =>
  start === 0 && bits >= whole ? ref : { ...ref, slice: { start, end: start + bits - 1 } }
const isReal = (p: Piece): p is Real => p.source !== null
const driverOf = (p: Real): PinRef => narrowed(p.source.ref, p.source.width, p.offset, p.bits)
const byId = (a: LegacyWire, b: LegacyWire): number => compare(a.id, b.id)
const floating = (bits: number, lost?: string): Value => [{ at: 0, bits, offset: 0, source: null, ...(lost === undefined ? {} : { lost }) }]
const distinct = (values: Value[]): Value[] => (values.length < 2 ? values : [...new Map(values.map((v) => [JSON.stringify(v), v])).values()])
/** Bits `from…from+bits-1` of a value, moved down to bit 0. */
const cut = (value: Value, from: number, bits: number): Value =>
  value.flatMap((p) => {
    const lo = Math.max(p.at, from)
    const hi = Math.min(p.at + p.bits, from + bits)
    return lo < hi ? [{ ...p, at: lo - from, bits: hi - lo, offset: p.offset + lo - p.at }] : []
  })
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

interface Walk { open: Set<string>; done: Set<string> }
const walk = (): Walk => ({ open: new Set(), done: new Set() })
/**
 * Reads a key once per walk; a key the walk is inside reads as `loop`. A finished key adds only readings the
 * walk already holds, or a 0 after the walk's first 0, and the import keeps the first reading of each driver.
 */
function once(trace: Walk, key: string, loop: () => Value, read: () => Value[]): Value[] {
  if (trace.open.has(key)) return [loop()]
  if (trace.done.has(key)) return []
  trace.open.add(key)
  const values = distinct(read())
  trace.open.delete(key)
  trace.done.add(key)
  return values
}

interface Wiring { buses: Map<string, LegacyBus>; junctions: Map<string, LegacyJunction>; into: (bus: LegacyBus, pinId: string) => LegacyWire[]; feeds: (junction: LegacyJunction) => LegacyWire[] }
/** Ids match by their JSON value, as deserializeCircuit keeps them: the number 7 and the string "7" are two entities. */
function wiring(legacy: DeserializedCircuit): Wiring {
  const first = <T extends { id: string }>(items: T[]): Map<string, T> => new Map([...items].reverse().map((item) => [item.id, item]))
  const ends = new Map<string, Map<string, LegacyWire[]>>()
  for (const w of legacy.wires) {
    const owners = ends.get(w.to.type) ?? new Map<string, LegacyWire[]>()
    owners.set(w.to.entityId, [...(owners.get(w.to.entityId) ?? []), w])
    ends.set(w.to.type, owners)
  }
  const fed = (type: string, id: string): LegacyWire[] => ends.get(type)?.get(id) ?? []
  return {
    buses: first(legacy.busComponents),
    junctions: first(legacy.junctions),
    into: (bus, pinId) => fed('bus', bus.id).filter((w) => w.to.pinId === pinId).sort(byId),
    feeds: (junction) => {
      const feeds = fed('junction', junction.id)
      return (feeds.length > 0 ? [...feeds] : legacy.wires.filter((w) => junction.wireIds.includes(w.id) && !(w.from.type === 'junction' && w.from.entityId === junction.id))).sort(byId)
    },
  }
}

/** Whether a part output or an IN reaches a bit of a bus input, through wires, junctions and bus components. */
function driverCheck(legacy: DeserializedCircuit, partOf: Parts, { buses, junctions, into, feeds }: Wiring) {
  const drivenBit = (bus: LegacyBus, pinId: string, width: number, bit: number, seen: Set<string>): boolean => {
    const key = `${bus.id}:${pinId}:${bit}`
    if (seen.has(key)) return false
    seen.add(key)
    return into(bus, pinId).some((w) => bit < Math.min(w.width ?? 1, width) && driven(w.from, bit, seen))
  }
  const driven = (end: Endpoint, bit: number, seen: Set<string>): boolean => {
    if (end.type === 'input') return legacy.inputNodes.some((n) => n.id === end.entityId && bit < n.width)
    if (end.type === 'gate') return partOf.get(end.entityId)?.gate.outputs.some((p) => p.id === end.pinId && bit < (p.width ?? 1)) ?? false
    const bus = end.type === 'bus' ? buses.get(end.entityId) : undefined
    const out = bus?.outputs.findIndex((p) => p.id === end.pinId) ?? -1
    if (bus && out >= 0) return bus.kind === 'joiner' ? bit < bus.inputs.length && drivenBit(bus, bus.inputs[bit].id, 1, 0, seen) : bit === 0 && drivenBit(bus, 'in', bus.width, out, seen)
    const junction = end.type === 'junction' ? junctions.get(end.entityId) : undefined
    if (!junction || seen.has(`${junction.id}:${bit}`)) return false
    seen.add(`${junction.id}:${bit}`)
    return feeds(junction).some((w) => driven(w.from, bit, seen))
  }
  const known = new Map<string, boolean>()
  return (bus: LegacyBus, pinId: string, width: number, bit: number): boolean => {
    const key = JSON.stringify([bus.id, pinId, bit])
    if (!known.has(key)) known.set(key, drivenBit(bus, pinId, width, bit, new Set()))
    return known.get(key) === true
  }
}

/** Bits `from…from+bits-1` of what an endpoint carries, in each value it can take. A loop is caught per bit, not per entity. */
function tracer(legacy: DeserializedCircuit, ins: Port[], partOf: Parts): (end: Endpoint, from: number, bits: number) => Value[] {
  const lines = wiring(legacy)
  const { buses, junctions, into, feeds } = lines
  const isDriven = driverCheck(legacy, partOf, lines)
  const whole = (source: Source, from: number, bits: number): Value[] => [cut([{ at: 0, bits: source.width, offset: 0, source }], from, bits)]
  const resolve = (end: Endpoint, trace: Walk, from: number, bits: number): Value[] => {
    if (end.type === 'input') {
      const at = legacy.inputNodes.findIndex((n) => n.id === end.entityId)
      return at < 0 ? [floating(bits)] : whole({ ref: { kind: 'chip-in', pin: ins[at].name }, width: ins[at].width, rank: -1 }, from, bits)
    }
    if (end.type === 'gate') {
      const part = partOf.get(end.entityId)
      const at = part?.gate.outputs.findIndex((p) => p.id === end.pinId) ?? -1
      if (!part || at < 0) return [floating(bits)]
      const pin = part.gate.outputs[at]
      return whole({ ref: { kind: 'part-pin', partId: part.id, pin: pin.name }, width: pin.width ?? 1, rank: part.index * 1024 + at }, from, bits)
    }
    const bus = end.type === 'bus' ? buses.get(end.entityId) : undefined
    const out = bus?.outputs.findIndex((p) => p.id === end.pinId) ?? -1
    if (bus && out >= 0) return bus.kind === 'joiner' ? joined(bus, trace, from, bits) : from > 0 ? [[]] : busBit(bus, 'in', bus.width, out, trace)
    const junction = end.type === 'junction' ? junctions.get(end.entityId) : undefined
    if (!junction) return [floating(bits)]
    return once(trace, JSON.stringify([junction.id, from, bits]), () => floating(bits), () => {
      const candidates = feeds(junction)
      return candidates.length === 0 ? [floating(bits)] : candidates.flatMap((w) => resolve(w.from, trace, from, bits))
    })
  }
  /** `join` needs every reading of each input, so a window wider than one bit reads each input on a walk of its own. */
  const joined = (bus: LegacyBus, trace: Walk, from: number, bits: number): Value[] => {
    const inputs = bus.inputs.slice(from, from + bits).map((p) => busBit(bus, p.id, 1, 0, bits === 1 ? trace : walk()))
    return inputs.some((readings) => readings.length === 0) ? [] : join(inputs)
  }
  /** One bit of a bus input, as each wire into it reads: a wire carries the bits below `min(wire, pin)`, the rest read 0. */
  const busBit = (bus: LegacyBus, pinId: string, width: number, bit: number, trace: Walk): Value[] => {
    const pin = `${bus.kind} "${bus.id}" pin "${pinId}"`
    const self = `${pin}, whose bit ${bit} only loops back to itself`
    return once(trace, JSON.stringify([bus.id, pinId, bit]), () => floating(1, self), () => {
      const wires = into(bus, pinId)
      if (wires.length === 0) return [floating(1, pin)]
      const readings = wires.flatMap((w) => (bit < Math.min(w.width ?? 1, width) ? resolve(w.from, trace, bit, 1) : [[]]).map((v) =>
        v.length === 0 ? floating(1, pin) : v.map((p) => (p.source || p.lost ? p : { ...p, lost: `${w.from.type} "${w.from.entityId}"` }))))
      const selfLoop = (v: Value): boolean => v.some((p) => p.lost === self)
      return readings.some(selfLoop) && isDriven(bus, pinId, width, bit) ? readings.map((v) => (selfLoop(v) ? floating(1, pin) : v)) : readings
    })
  }
  return (end, from, bits) => resolve(end, walk(), from, bits)
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

  const resolve = tracer(legacy, ins, partOf)

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
      const carried = Math.min(wire.width ?? 1, site.width)
      for (const value of resolve(wire.from, 0, carried)) {
        const pieces = cut(value, 0, carried)
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
      note('unconnected-input', `${label} input "${site.ref.pin}" has no wire: it read 0 on the canvas, it reads 0 in the nand2tetris simulator, and HACER's compile refuses it until it is bound`, where(site.ref))
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
          if (sink.kind === 'part-pin') netFor('false', { kind: 'constant', value: false }).sinks.push(sink)
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
