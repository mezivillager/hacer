import { getBuiltinChipRegistry } from '../chips/appRegistry'
import type { ChipRegistry } from '../chips/registry'
import { parseHDL } from '../hdl/parser'
import { printPinRef } from '../hdl/printer'
import type { HDLChip, HDLPart, HDLSlice } from '../hdl/types'
import { splitNetId } from './netId'
import { normalizeSpec } from './normalizeSpec'
import { emptySidecar, parseSidecar } from './sidecar'
import { SPEC_SCHEMA_VERSION } from './types'
import type { CircuitSpec, Net, ParseSpecResult, Part, PartId, Ref, Sidecar, SpecDiagnostic } from './types'

export interface ParseSpecOptions {
  /** Where part chips and their pin directions are looked up; the Project 1 builtins by default. */
  chips?: ChipRegistry
}

const HEADER_LINE = /^\uFEFF?[ \t]*\/\/[ \t]*hacer-spec\b[ \t]*(\S*)/gm
const SIDECAR_TAG = /\/\*[ \t]*hacer-sidecar\b/g
const SIDECAR_BLOCK = /\/\*[ \t]*hacer-sidecar\s([\s\S]*?)\*\/\s*$/
const LITERALS = new Set(['true', 'false'])

const describeRef = (ref: Ref): string => (ref.kind === 'part-pin' ? `${ref.partId}.${printPinRef(ref.pin, ref.slice)}` : printPinRef(ref.pin, ref.slice))

/** The header is the file's first content (a BOM and whitespace may precede it), once, or it is refused. */
function headerProblem(source: string): SpecDiagnostic | null {
  const headers = [...source.matchAll(HEADER_LINE)]
  if (headers.length === 0) return null
  const placed = headers.length === 1 && (headers[0].index ?? 0) + headers[0][0].indexOf('/') === source.search(/\S/)
  if (placed && headers[0][1] === String(SPEC_SCHEMA_VERSION)) return null
  const message = placed ? `Spec schemaVersion "${headers[0][1]}" is not one this build reads (${SPEC_SCHEMA_VERSION})` : 'A // hacer-spec header must come once, as the first line of the file'
  return { code: 'unknown-schema-version', severity: 'error', message }
}

/** The sidecar block is the file's last content, once, on one line or several, or it is refused. */
function readSidecar(source: string): { sidecar: Sidecar } | { diagnostics: SpecDiagnostic[] } {
  const tags = [...source.matchAll(SIDECAR_TAG)]
  if (tags.length === 0) return { sidecar: emptySidecar() }
  const block = SIDECAR_BLOCK.exec(source)
  if (tags.length > 1 || block === null || block.index !== tags[0].index) {
    return { diagnostics: [{ code: 'invalid-sidecar', severity: 'error', message: 'A /* hacer-sidecar */ block must come once, as the last thing in the file' }] }
  }
  return parseSidecar(block[1])
}

/** Marked parts keep their ids; an unmarked one is keyed by its position, and that is reported. */
function assignPartIds(parts: HDLPart[], diagnostics: SpecDiagnostic[]): Part[] {
  const marked = parts.map((part, i) => (parts.findIndex((other) => other.id === part.id) === i ? part.id : undefined))
  const taken = new Set(marked.filter((id) => id !== undefined))
  let next = Math.max(0, ...[...taken].map((id) => Number(id.slice(1)))) + 1
  return parts.map((part, i) => {
    let id = marked[i]
    if (id === undefined) {
      id = `p${i + 1}`
      while (taken.has(id)) id = `p${next++}`
      taken.add(id)
      const lost = part.id === undefined ? 'has no // #p<n> id' : `repeats the id ${part.id}`
      diagnostics.push({ code: part.id === undefined ? 'part-id-assigned' : 'duplicate-part-id', severity: part.id === undefined ? 'info' : 'warning', partId: id as PartId, message: `${part.name} (part ${i + 1}) ${lost}; keyed by its position as ${id}` })
    }
    return { id: id as PartId, chip: part.name }
  })
}

const bitsOf = (slice: HDLSlice | undefined) => ({ first: slice?.start ?? 0, last: slice?.end ?? Number.POSITIVE_INFINITY })
const overlap = (a: HDLSlice | undefined, b: HDLSlice | undefined): boolean => bitsOf(a).first <= bitsOf(b).last && bitsOf(b).first <= bitsOf(a).last

/**
 * §1.8: one bit, one source — a signal bit written by two nets, or a part pin bit bound by two.
 * A chip input read many ways is fan-out (§1), and an unknown chip's pins have no known direction.
 */
function doubleSourced(nets: Net[], unknownParts: Set<PartId>): SpecDiagnostic[] {
  const found: SpecDiagnostic[] = []
  const claims = new Map<string, Array<{ label: string; slice?: HDLSlice }>>()
  const claim = (key: string, label: string, slice: HDLSlice | undefined, describe: (other: string) => SpecDiagnostic): void => {
    const held = claims.get(key) ?? []
    const clash = held.find((c) => overlap(c.slice, slice))
    if (clash) found.push(describe(clash.label))
    claims.set(key, [...held, { label, slice }])
  }
  for (const net of nets) {
    const { signal, slice } = splitNetId(net.id)
    const { driver } = net
    if (driver !== null && driver.kind !== 'chip-in') {
      const label = `${describeRef(driver)} (net "${net.id}")`
      claim(`signal:${signal}`, label, slice, (other) => ({ code: 'multiple-drivers', severity: 'error', netId: net.id, message: `Signal "${signal}" has bits driven by both ${other} and ${label}` }))
    }
    for (const sink of net.sinks) {
      if (sink.kind !== 'part-pin' || unknownParts.has(sink.partId)) continue
      claim(`pin:${sink.partId}.${sink.pin}`, `"${net.id}"`, sink.slice, (other) => ({ code: 'multiple-drivers', severity: 'error', netId: net.id, partId: sink.partId, message: `${sink.partId} pin "${sink.pin}" is bound by both ${other} and "${net.id}"` }))
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
  const unknownParts = new Set<PartId>()

  const nets = new Map<string, Net>()
  const netOf = (id: string): Net => {
    const net = nets.get(id) ?? { id, driver: null, sinks: [] }
    nets.set(id, net)
    return net
  }
  const drive = (id: string, ref: Ref, partId?: PartId): void => {
    const net = netOf(id)
    if (net.driver === null) net.driver = ref
    else diagnostics.push({ code: 'multiple-drivers', severity: 'error', netId: id, partId, message: `Signal "${id}" is driven by ${describeRef(net.driver)} and ${describeRef(ref)}; ${describeRef(ref)} is dropped` })
  }

  chip.parts.forEach((part, i) => {
    const partId = parts[i].id
    const def = chips.get(part.name)
    if (!def) {
      unknownParts.add(partId)
      diagnostics.push({ code: 'unknown-chip', severity: 'error', partId, message: `Unknown chip "${part.name}"` })
    }
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
  diagnostics.push(...undriven(doc.nets), ...doubleSourced(doc.nets, unknownParts))
  return doc
}

/**
 * Read a `.spec` document: HDL-shaped text (plain `.hdl` included) and an optional trailing sidecar.
 * Valid if it parses (§1.1): only non-HDL text, a BUILTIN chip or an unread version returns no doc.
 */
export function parseSpec(source: string, options: ParseSpecOptions = {}): ParseSpecResult {
  const refuse = (diagnostics: SpecDiagnostic[]): ParseSpecResult => ({ doc: null, sidecar: null, diagnostics })
  const header = headerProblem(source)
  if (header) return refuse([header])
  const sidecar = readSidecar(source)
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
