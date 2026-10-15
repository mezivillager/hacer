import { getBuiltinChipRegistry } from '../chips/appRegistry'
import type { ChipRegistry } from '../chips/registry'
import { parseHDL } from '../hdl/parser'
import { printPinRef } from '../hdl/printer'
import type { HDLChip, HDLPart, HDLSlice } from '../hdl/types'
import { sliceWidth, splitNetId } from './netId'
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
const COMMENT = /\/\*[\s\S]*?\*\/|\/\/[^\n]*/g
const WIRE = /\bwire\s+([A-Za-z_]\w*)\s*(\[[^\]]*\])?\s*=\s*([A-Za-z_]\w*)\s*(\[[^\]]*\])?\s*;/g
const SLICE = /^\[\s*(\d+)\s*(?:\.\.\s*(\d+)\s*)?\]$/
const LITERALS = new Set(['true', 'false'])

interface WireStatement {
  target: string
  targetSlice?: HDLSlice
  source: string
  sourceSlice?: HDLSlice
  line: number
  column: number
  malformed: boolean
}

const blank = (text: string): string => text.replace(/[^\n]/g, ' ')

function readSlice(text: string | undefined): { slice?: HDLSlice; ok: boolean } {
  if (text === undefined) return { ok: true }
  const match = SLICE.exec(text)
  if (!match) return { ok: false }
  const slice = { start: Number(match[1]), end: Number(match[2] ?? match[1]) }
  return { slice, ok: slice.start <= slice.end }
}

/** `wire` is the one statement plain HDL lacks (§1.5): lift each out, leaving the HDL to `parseHDL`. */
function extractWires(source: string): { hdl: string; wires: WireStatement[] } {
  const code = source.replace(COMMENT, blank)
  const wires: WireStatement[] = []
  let hdl = source
  for (const match of code.matchAll(WIRE)) {
    const at = match.index ?? 0
    const before = source.slice(0, at)
    const target = readSlice(match[2])
    const origin = readSlice(match[4])
    wires.push({
      target: match[1],
      targetSlice: target.slice,
      source: match[3],
      sourceSlice: origin.slice,
      line: before.split('\n').length,
      column: at - before.lastIndexOf('\n'),
      malformed: !target.ok || !origin.ok,
    })
    hdl = hdl.slice(0, at) + blank(match[0]) + hdl.slice(at + match[0].length)
  }
  return { hdl, wires }
}

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

function wireProblem(wire: WireStatement, ins: Set<string>, outs: Set<string>, width: Map<string, number>): string | null {
  if (wire.malformed) return `wire ${wire.target} has a malformed slice`
  if (!outs.has(wire.target)) return `wire target "${wire.target}" is not a chip OUT`
  if (!ins.has(wire.source) && !outs.has(wire.source)) return `wire source "${wire.source}" is not a chip IN or OUT`
  const targetWidth = wire.targetSlice ? sliceWidth(wire.targetSlice) : width.get(wire.target)
  const sourceWidth = wire.sourceSlice ? sliceWidth(wire.sourceSlice) : width.get(wire.source)
  return targetWidth === sourceWidth ? null : `wire ${wire.target} is ${targetWidth} bits wide but its source is ${sourceWidth}`
}

const bitsOf = (slice: HDLSlice | undefined) => ({ first: slice?.start ?? 0, last: slice?.end ?? Number.POSITIVE_INFINITY })

/** A driverless net is unfinished (§1.1) unless another net's driver writes bits it reads. */
function undriven(nets: Net[]): SpecDiagnostic[] {
  const written = nets.filter((n) => n.driver !== null).map((n) => splitNetId(n.id))
  return nets
    .filter((n) => n.driver === null && !LITERALS.has(n.id))
    .filter((n) => {
      const { signal, slice } = splitNetId(n.id)
      const read = bitsOf(slice)
      return !written.some((w) => w.signal === signal && bitsOf(w.slice).first <= read.last && read.first <= bitsOf(w.slice).last)
    })
    .map((n) => ({ code: 'undriven', severity: 'error', netId: n.id, message: `Signal "${n.id}" is read but nothing drives it` }))
}

/**
 * An alias rooted at a chip OUT can close a loop that never resolves (§1.5); walk it bit by bit.
 * Classified by driver kind, so `wire x = x;` is a cycle of one rather than an identity to drop.
 */
function aliasCycles(nets: Net[], width: Map<string, number>): SpecDiagnostic[] {
  const node = (signal: string, bit: number): string => (width.get(signal) === 1 ? signal : `${signal}[${bit}]`)
  const next = new Map<string, string>()
  for (const { id, driver } of nets) {
    if (driver?.kind !== 'chip-out') continue
    const { signal, slice } = splitNetId(id)
    const count = slice ? sliceWidth(slice) : (width.get(signal) ?? 1)
    for (let i = 0; i < count; i++) next.set(node(signal, (slice?.start ?? 0) + i), node(driver.pin, (driver.slice?.start ?? 0) + i))
  }
  const done = new Set<string>()
  const found = new Map<string, string[]>()
  for (const start of next.keys()) {
    const path: string[] = []
    let at: string | undefined = start
    while (at !== undefined && !done.has(at) && !path.includes(at)) {
      path.push(at)
      at = next.get(at)
    }
    if (at !== undefined && path.includes(at)) {
      const members = [...path.slice(path.indexOf(at)), at]
      const signals = members.map((m) => splitNetId(m).signal).join()
      if (!found.has(signals)) found.set(signals, members)
    }
    path.forEach((p) => done.add(p))
  }
  return [...found.values()].map((members) => ({ code: 'alias-cycle', severity: 'error', netId: members[0], members, message: `Alias cycle: ${members.join(' → ')}` }))
}

function lower(chip: HDLChip, wires: WireStatement[], chips: ChipRegistry, diagnostics: SpecDiagnostic[]): CircuitSpec {
  const ins = chip.inputs.map(({ name, width }) => ({ name, width }))
  const outs = chip.outputs.map(({ name, width }) => ({ name, width }))
  const width = new Map([...ins, ...outs].map((p) => [p.name, p.width]))
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

  for (const wire of wires) {
    const id = printPinRef(wire.target, wire.targetSlice)
    netOf(id)
    const problem = wireProblem(wire, inNames, outNames, width)
    if (problem) diagnostics.push({ code: 'invalid-wire', severity: 'error', netId: id, line: wire.line, column: wire.column, message: problem })
    else drive(id, { kind: inNames.has(wire.source) ? 'chip-in' : 'chip-out', pin: wire.source, ...(wire.sourceSlice && { slice: wire.sourceSlice }) })
  }

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
  diagnostics.push(...undriven(doc.nets), ...aliasCycles(doc.nets, width))
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

  const { hdl, wires } = extractWires(source)
  const parsed = parseHDL(hdl)
  if (!parsed.success) return refuse(parsed.errors.map((e) => ({ code: 'syntax', severity: 'error', line: e.line, column: e.column, message: e.message })))
  if (parsed.chip.builtin !== undefined) {
    return refuse([{ code: 'builtin-chip', severity: 'error', message: `${parsed.chip.name} is a BUILTIN chip: it has no parts and nets to be a spec of` }])
  }
  const diagnostics: SpecDiagnostic[] = []
  const doc = lower(parsed.chip, wires, options.chips ?? getBuiltinChipRegistry(), diagnostics)
  return { doc, sidecar: sidecar.sidecar, diagnostics }
}
