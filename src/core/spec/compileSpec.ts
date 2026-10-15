import type { ChipRegistry } from '../chips/registry'
import type { ChipDefinition } from '../chips/types'
import { compileHDL, type CompiledEvaluator } from '../hdl/compiler'
import { printPinRef } from '../hdl/printer'
import type { HDLChip, HDLConnection, HDLSlice } from '../hdl/types'
import { readSubBus, writeSubBus } from '@/simulation/busOps'
import { sliceWidth, splitNetId } from './netId'
import { aliasCycles, doubleSourced, undriven } from './parseSpec'
import { isAlias } from './printSpec'
import type { CircuitSpec, Net, PartId, Ref, SpecDiagnostic } from './types'

/** A `ParseSpecResult`, or any document with the diagnostics it was built with. */
export interface CompileSpecInput {
  doc: CircuitSpec | null
  diagnostics: readonly SpecDiagnostic[]
}

export type CompileSpecResult =
  | { success: true; evaluate: CompiledEvaluator; chip: ChipDefinition }
  | { success: false; diagnostics: SpecDiagnostic[] }

interface Bit {
  signal: string
  bit: number
  fromInput: boolean
}

interface AliasBit {
  signal: string
  bit: number
  root: Bit
}

type AliasBits = Map<string, AliasBit>

const bitKey = (signal: string, bit: number): string => `${signal}:${bit}`
const isError = (d: SpecDiagnostic): boolean => d.severity === 'error'
// parseSpec notes which driver its document dropped; a run is refused for the clash, not for the drop.
const asRefusal = (d: SpecDiagnostic): SpecDiagnostic => (d.code === 'multiple-drivers' ? { ...d, message: d.message.replace(/; [^;]+ is dropped$/, '') } : d)

/** §1.10.6 over nets: a wire targets a chip OUT from a chip IN or OUT of its width; only an IN's own net is fan-out. */
function invalidWires(doc: CircuitSpec): SpecDiagnostic[] {
  const ports = { 'chip-in': new Map(doc.ins.map((p) => [p.name, p.width])), 'chip-out': new Map(doc.outs.map((p) => [p.name, p.width])) }
  const problem = (net: Net, driver: Extract<Ref, { kind: 'chip-in' | 'chip-out' }>): string | null => {
    const from = ports[driver.kind].get(driver.pin)
    if (from === undefined) return `source "${driver.pin}" is not a chip ${driver.kind === 'chip-in' ? 'IN' : 'OUT'}`
    if (!isAlias(net)) return null
    const { signal, slice } = splitNetId(net.id)
    const to = ports['chip-out'].get(signal)
    if (to === undefined) return `target "${signal}" is not a chip OUT`
    const [targetWidth, sourceWidth] = [slice ? sliceWidth(slice) : to, driver.slice ? sliceWidth(driver.slice) : from]
    return targetWidth === sourceWidth ? null : `target is ${targetWidth} bits wide but its source is ${sourceWidth}`
  }
  return doc.nets.flatMap((net): SpecDiagnostic[] => {
    const { driver } = net
    if (driver === null || driver.kind === 'part-pin') return []
    const found = problem(net, driver)
    return found === null ? [] : [{ code: 'invalid-wire', severity: 'error', netId: net.id, message: `wire ${net.id} = ${printPinRef(driver.pin, driver.slice)}: ${found}` }]
  })
}

function repeatedNetIds(nets: readonly Net[]): SpecDiagnostic[] {
  const seen = new Set<string>()
  const repeated = new Set<string>()
  for (const { id } of nets) (seen.has(id) ? repeated : seen).add(id)
  return [...repeated].map((id) => ({ code: 'duplicate-net-id', severity: 'error', netId: id, message: `Net id "${id}" names more than one net; a document holds one net per id` }))
}

/** Every chip-OUT bit an alias writes, followed down its chain to a chip-IN bit or a bit no alias writes. */
function aliasBits(doc: CircuitSpec): AliasBits {
  const outWidth = new Map(doc.outs.map((p) => [p.name, p.width]))
  const bits: AliasBits = new Map()
  for (const net of doc.nets) {
    if (!isAlias(net)) continue
    const { driver } = net
    const { signal, slice } = splitNetId(net.id)
    for (let i = 0; i < (slice ? sliceWidth(slice) : (outWidth.get(signal) ?? 0)); i++) {
      const bit = (slice?.start ?? 0) + i
      bits.set(bitKey(signal, bit), { signal, bit, root: { signal: driver.pin, bit: (driver.slice?.start ?? 0) + i, fromInput: driver.kind === 'chip-in' } })
    }
  }
  for (const alias of bits.values()) {
    for (let hops = bits.size; hops > 0; hops--) {
      const next = alias.root.fromInput ? undefined : bits.get(bitKey(alias.root.signal, alias.root.bit))
      if (!next) break
      alias.root = next.root
    }
  }
  return bits
}

/** §1.1: a part that reads alias bits whose root nothing writes is unfinished, named by the signal it bound. */
function undrivenRoots(doc: CircuitSpec, aliases: AliasBits): SpecDiagnostic[] {
  const outWidth = new Map(doc.outs.map((p) => [p.name, p.width]))
  const written = doc.nets.filter((n) => n.driver?.kind === 'part-pin').map((n) => splitNetId(n.id))
  const driven = ({ signal, bit, fromInput }: Bit): boolean =>
    fromInput || written.some((w) => w.signal === signal && (w.slice === undefined || (w.slice.start <= bit && bit <= w.slice.end)))
  return doc.nets.flatMap((net): SpecDiagnostic[] => {
    if (!net.sinks.some((s) => s.kind === 'part-pin')) return []
    const { signal, slice } = splitNetId(net.id)
    const count = slice ? sliceWidth(slice) : (outWidth.get(signal) ?? 0)
    const roots = Array.from({ length: count }, (_, i) => aliases.get(bitKey(signal, (slice?.start ?? 0) + i))?.root)
    const lost = roots.find((root) => root !== undefined && !driven(root))
    return lost ? [{ code: 'undriven', severity: 'error', netId: net.id, message: `Signal "${net.id}" is read but nothing drives it: it is an alias of "${lost.signal}", which nothing drives` }] : []
  })
}

const binding = (ref: Extract<Ref, { kind: 'part-pin' }>, signal: string, slice: HDLSlice | undefined): HDLConnection =>
  ({ internal: ref.pin, external: signal, ...(ref.slice && { internalSlice: { ...ref.slice } }), ...(slice && { externalSlice: { ...slice } }) })

/** §1.5 rule 1: a read of alias bits binds their roots, split on the part's own pin where the roots change. */
function readBindings(net: Net, ref: Extract<Ref, { kind: 'part-pin' }>, pinWidth: number | undefined, outWidth: Map<string, number>, aliases: AliasBits): HDLConnection[] {
  const { signal, slice } = splitNetId(net.id)
  const count = slice ? sliceWidth(slice) : outWidth.get(signal)
  const first = slice?.start ?? 0
  const aliased = Array.from({ length: count ?? 0 }, (_, i) => aliases.get(bitKey(signal, first + i)))
  // A read whose width does not match its pin stays unsplit, so the engine still refuses it.
  if (count !== (ref.slice ? sliceWidth(ref.slice) : pinWidth) || !aliased.some(Boolean)) return [binding(ref, signal, slice)]
  const bits = aliased.map((alias, i) => alias?.root ?? { signal, bit: first + i, fromInput: false })
  const starts = bits.flatMap((b, i) => (i > 0 && bits[i - 1].signal === b.signal && bits[i - 1].bit + 1 === b.bit ? [] : [i]))
  const pinFirst = ref.slice?.start ?? 0
  return starts.map((from, r) => {
    const to = (starts[r + 1] ?? count) - 1
    return { internal: ref.pin, internalSlice: { start: pinFirst + from, end: pinFirst + to }, external: bits[from].signal, externalSlice: { start: bits[from].bit, end: bits[to].bit } }
  })
}

function lower(doc: CircuitSpec, registry: ChipRegistry, aliases: AliasBits): HDLChip {
  const outWidth = new Map(doc.outs.map((p) => [p.name, p.width]))
  const chipOf = new Map(doc.parts.map((p) => [p.id, p.chip]))
  const connections = new Map<PartId, HDLConnection[]>(doc.parts.map((p) => [p.id, []]))
  for (const net of doc.nets) {
    const { signal, slice } = splitNetId(net.id)
    for (const ref of [net.driver, ...net.sinks]) {
      if (ref?.kind !== 'part-pin') continue
      const pinWidth = registry.get(chipOf.get(ref.partId) ?? '')?.inputs.find((p) => p.name === ref.pin)?.width
      const bound = ref === net.driver ? [binding(ref, signal, slice)] : readBindings(net, ref, pinWidth, outWidth, aliases)
      connections.get(ref.partId)?.push(...bound)
    }
  }
  return {
    name: doc.name,
    inputs: doc.ins.map((p) => ({ ...p })),
    outputs: doc.outs.map((p) => ({ ...p })),
    parts: doc.parts.map((p) => ({ name: p.chip, connections: connections.get(p.id) ?? [] })),
  }
}

/**
 * A spec document, through its parse result, becomes an evaluator (ADR-0020 §1.5, §1.11).
 * Refuses on any parse error, then on §1.8's checks re-run over the document; never throws.
 */
export function compileSpec(parsed: CompileSpecInput, registry: ChipRegistry): CompileSpecResult {
  const { doc } = parsed
  if (doc === null || parsed.diagnostics.some(isError)) return { success: false, diagnostics: parsed.diagnostics.filter(isError).map(asRefusal) }

  const width = new Map([...doc.ins, ...doc.outs].map((p) => [p.name, p.width]))
  const unknownParts = new Set(doc.parts.filter((p) => !registry.has(p.chip)).map((p) => p.id))
  const doubles = doubleSourced(doc.nets, unknownParts)
  const doubled = new Set(doubles.map((d) => d.netId))
  const repeated = repeatedNetIds(doc.nets).filter((d) => !doubled.has(d.netId))
  const found = [...invalidWires(doc), ...repeated, ...doubles, ...aliasCycles(doc.nets, width), ...undriven(doc.nets, unknownParts)]
  if (found.length > 0) return { success: false, diagnostics: found }

  const aliases = aliasBits(doc)
  const unread = undrivenRoots(doc, aliases)
  if (unread.length > 0) return { success: false, diagnostics: unread }
  const compiled = compileHDL(lower(doc, registry, aliases), registry)
  if (!compiled.success) return { success: false, diagnostics: compiled.errors.map((e) => ({ code: 'compile', severity: 'error', message: e.message })) }

  const chip: ChipDefinition = { name: doc.name, inputs: doc.ins.map((p) => ({ ...p })), outputs: doc.outs.map((p) => ({ ...p })), implementation: { type: 'circuit', spec: doc } }
  const writeBack = [...aliases.values()]
  if (writeBack.length === 0) return { success: true, evaluate: compiled.evaluate, chip }
  return {
    success: true,
    chip,
    evaluate: (inputs, ctx) => {
      const out = compiled.evaluate(inputs, ctx)
      for (const { signal, bit, root } of writeBack) {
        const source = (root.fromInput ? inputs[root.signal] : out[root.signal]) ?? 0
        out[signal] = writeSubBus(out[signal] ?? 0, readSubBus(source, root.bit, 1), bit, 1)
      }
      return out
    },
  }
}
