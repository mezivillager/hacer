import { getBuiltinChipRegistry } from '../chips/appRegistry'
import type { ChipRegistry } from '../chips/registry'
import { parseHDL } from '../hdl/parser'
import { printPinRef } from '../hdl/printer'
import type { HDLChip, HDLPart, HDLSlice } from '../hdl/types'
import { splitNetId } from './netId'
import { normalizeSpec } from './normalizeSpec'
import { emptySidecar, parseSidecar } from './sidecar'
import { SPEC_SCHEMA_VERSION } from './types'
import type { CircuitSpec, Net, ParseSpecResult, Part, PartId, Ref, SpecDiagnostic } from './types'

export interface ParseSpecOptions {
  /** Where part chips and their pin directions are looked up; the Project 1 builtins by default. */
  chips?: ChipRegistry
}

const HEADER = /^\/\/[ \t]*hacer-spec\b[ \t]*(\S*)/
const SIDECAR_BLOCK = /\/\*[ \t]*hacer-sidecar[ \t]*\r?\n([\s\S]*?)\*\/\s*$/
const LITERALS = new Set(['true', 'false'])

/** Marked parts keep their ids; an unmarked one is keyed by its position, and that is reported. */
function assignPartIds(parts: HDLPart[], diagnostics: SpecDiagnostic[]): Part[] {
  const taken = new Set<string>()
  const marked = parts.map((part) => {
    if (part.id === undefined || !taken.has(part.id)) {
      if (part.id !== undefined) taken.add(part.id)
      return part.id
    }
    diagnostics.push({ code: 'duplicate-part-id', severity: 'warning', partId: part.id as PartId, message: `Part id ${part.id} is used twice; the second ${part.name} gets a new one` })
    return undefined
  })
  let next = Math.max(0, ...[...taken].map((id) => Number(id.slice(1)))) + 1
  return parts.map((part, i) => {
    let id = marked[i]
    if (id === undefined) {
      id = `p${i + 1}`
      while (taken.has(id)) id = `p${next++}`
      taken.add(id)
      diagnostics.push({ code: 'part-id-assigned', severity: 'info', partId: id as PartId, message: `${part.name} (part ${i + 1}) has no // #p<n> id; keyed by its position as ${id}` })
    }
    return { id: id as PartId, chip: part.name }
  })
}

const bitsOf = (slice: HDLSlice | undefined) => ({ first: slice?.start ?? 0, last: slice?.end ?? Number.POSITIVE_INFINITY })
const overlap = (a: HDLSlice | undefined, b: HDLSlice | undefined): boolean => bitsOf(a).first <= bitsOf(b).last && bitsOf(b).first <= bitsOf(a).last

/** §1.8: one bit, one source — a signal bit written by two nets, or a part pin bit bound by two. */
function doubleSourced(nets: Net[]): SpecDiagnostic[] {
  const found: SpecDiagnostic[] = []
  const claims = new Map<string, Array<{ netId: string; slice?: HDLSlice }>>()
  const claim = (key: string, netId: string, slice: HDLSlice | undefined, describe: (other: string) => SpecDiagnostic): void => {
    const held = claims.get(key) ?? []
    const clash = held.find((c) => overlap(c.slice, slice))
    if (clash) found.push(describe(clash.netId))
    claims.set(key, [...held, { netId, slice }])
  }
  for (const net of nets) {
    const { signal, slice } = splitNetId(net.id)
    if (net.driver !== null) claim(`signal:${signal}`, net.id, slice, (other) => ({ code: 'multiple-drivers', severity: 'error', netId: net.id, message: `Nets "${other}" and "${net.id}" both drive bits of "${signal}"` }))
    for (const sink of net.sinks) {
      if (sink.kind !== 'part-pin') continue
      claim(`pin:${sink.partId}.${sink.pin}`, net.id, sink.slice, (other) => ({ code: 'multiple-drivers', severity: 'error', netId: net.id, partId: sink.partId, message: `${sink.partId} pin "${sink.pin}" is bound by both "${other}" and "${net.id}"` }))
    }
  }
  return found
}

/** A driverless net is unfinished (§1.1) unless another net's driver writes bits it reads. */
function undriven(nets: Net[]): SpecDiagnostic[] {
  const written = nets.filter((n) => n.driver !== null).map((n) => splitNetId(n.id))
  return nets
    .filter((n) => n.driver === null && !LITERALS.has(n.id))
    .filter((n) => {
      const { signal, slice } = splitNetId(n.id)
      return !written.some((w) => w.signal === signal && overlap(w.slice, slice))
    })
    .map((n) => ({ code: 'undriven', severity: 'error', netId: n.id, message: `Signal "${n.id}" is read but nothing drives it` }))
}

function lower(chip: HDLChip, chips: ChipRegistry, diagnostics: SpecDiagnostic[]): CircuitSpec {
  const ins = chip.inputs.map(({ name, width }) => ({ name, width }))
  const outs = chip.outputs.map(({ name, width }) => ({ name, width }))
  const inNames = new Set(ins.map((p) => p.name))
  const outNames = new Set(outs.map((p) => p.name))
  const parts = assignPartIds(chip.parts, diagnostics)

  const nets = new Map<string, Net>()
  const netOf = (id: string): Net => {
    const net = nets.get(id) ?? { id, driver: null, sinks: [] }
    nets.set(id, net)
    return net
  }
  const drive = (id: string, ref: Ref, partId?: PartId): void => {
    const net = netOf(id)
    if (net.driver === null) net.driver = ref
    else diagnostics.push({ code: 'multiple-drivers', severity: 'error', netId: id, partId, message: `Signal "${id}" has more than one driver; the first is kept` })
  }

  chip.parts.forEach((part, i) => {
    const partId = parts[i].id
    const def = chips.get(part.name)
    if (!def) diagnostics.push({ code: 'unknown-chip', severity: 'error', partId, message: `Unknown chip "${part.name}"` })
    for (const conn of part.connections) {
      const id = printPinRef(conn.external, conn.externalSlice)
      const ref: Ref = { kind: 'part-pin', partId, pin: conn.internal, ...(conn.internalSlice && { slice: conn.internalSlice }) }
      if (def?.outputs.some((p) => p.name === conn.internal)) {
        drive(id, ref, partId)
        continue
      }
      if (def && !def.inputs.some((p) => p.name === conn.internal)) {
        diagnostics.push({ code: 'unknown-pin', severity: 'error', partId, message: `${part.name} has no pin "${conn.internal}"` })
      }
      netOf(id).sinks.push(ref)
    }
  })

  for (const net of nets.values()) {
    const { signal, slice } = splitNetId(net.id)
    const port = { pin: signal, ...(slice && { slice }) }
    if (inNames.has(signal)) {
      if (net.driver === null) net.driver = { kind: 'chip-in', ...port }
      else diagnostics.push({ code: 'multiple-drivers', severity: 'error', netId: net.id, message: `Chip input "${signal}" is written by a part` })
    }
    if (outNames.has(signal) && net.driver !== null) net.sinks.push({ kind: 'chip-out', ...port })
  }

  const doc = normalizeSpec({ schemaVersion: SPEC_SCHEMA_VERSION, name: chip.name, ins, outs, parts, nets: [...nets.values()] })
  diagnostics.push(...undriven(doc.nets), ...doubleSourced(doc.nets))
  return doc
}

/**
 * Read a `.spec` document: HDL-shaped text (plain `.hdl` included) and an optional trailing sidecar.
 * Valid if it parses (§1.1): an unfinished circuit returns its document with its diagnostics; only
 * text that is not HDL-shaped, a BUILTIN chip, or a version this build does not know returns none.
 */
export function parseSpec(source: string, options: ParseSpecOptions = {}): ParseSpecResult {
  const refuse = (diagnostics: SpecDiagnostic[]): ParseSpecResult => ({ doc: null, sidecar: null, diagnostics })
  const header = HEADER.exec(source)
  if (header && header[1] !== String(SPEC_SCHEMA_VERSION)) {
    return refuse([{ code: 'unknown-schema-version', severity: 'error', line: 1, column: 1, message: `Spec schemaVersion "${header[1]}" is not one this build reads (${SPEC_SCHEMA_VERSION})` }])
  }
  const block = SIDECAR_BLOCK.exec(source)
  const sidecar = block ? parseSidecar(block[1]) : { sidecar: emptySidecar() }
  if ('diagnostics' in sidecar) return refuse(sidecar.diagnostics)

  const parsed = parseHDL(source)
  if (!parsed.success) return refuse(parsed.errors.map((e) => ({ code: 'syntax', severity: 'error', line: e.line, column: e.column, message: e.message })))
  if (parsed.chip.builtin !== undefined) {
    return refuse([{ code: 'builtin-chip', severity: 'error', message: `${parsed.chip.name} is a BUILTIN chip: it has no parts and nets to be a spec of` }])
  }
  const diagnostics: SpecDiagnostic[] = []
  const doc = lower(parsed.chip, options.chips ?? getBuiltinChipRegistry(), diagnostics)
  return { doc, sidecar: sidecar.sidecar, diagnostics }
}
