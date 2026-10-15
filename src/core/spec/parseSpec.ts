import { getBuiltinChipRegistry } from '../chips/appRegistry'
import type { ChipRegistry } from '../chips/registry'
import { parseHDL } from '../hdl/parser'
import { printPinRef } from '../hdl/printer'
import type { HDLChip, HDLPart, HDLSlice } from '../hdl/types'
import { sliceWidth, splitNetId } from './netId'
import { normalizeSpec } from './normalizeSpec'
import { emptySidecar, parseSidecar } from './sidecar'
import { SPEC_SCHEMA_VERSION } from './types'
import type { CircuitSpec, Net, ParseSpecResult, Part, PartId, Ref, Sidecar, SpecDiagnostic } from './types'

export interface ParseSpecOptions {
  /** Where part chips and their pin directions are looked up; the Project 1 builtins by default. */
  chips?: ChipRegistry
}

const IGNORABLE = '\\p{Default_Ignorable_Code_Point}*'
const spelled = (word: string): string => [...word].join(IGNORABLE)
/** Either tag in any case, through any default-ignorable character and lookalike dashes, ending where no letter follows. */
const TAG = new RegExp(`${spelled('hacer')}${IGNORABLE}[-\\u2010-\\u2015\\u2212\\uFE63\\uFF0D]${IGNORABLE}(?:(${spelled('spec')})|${spelled('sidecar')})(?![a-z])`, 'giu')
const CANONICAL_ID = /^p[1-9][0-9]*$/
const HEADER = /\/\/[ \t]*hacer-spec[ \t]+(\S+)/y
const SIDECAR_BLOCK = /\/\*[ \t]*hacer-sidecar\s([\s\S]*?)\*\/\s*$/
const LITERALS = new Set(['true', 'false'])
const COMMENT = /\/\*[\s\S]*?\*\/|\/\/[^\n]*/g
const WIRE = /\bwire\s+([A-Za-z_]\w*)\s*(\[[^\]]*\])?\s*=\s*([A-Za-z_]\w*)\s*(\[[^\]]*\])?\s*;/g
const SLICE = /^\[\s*(\d+)\s*(?:\.\.\s*(\d+)\s*)?\]$/

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

/** `wire` is the one statement plain HDL lacks (§1.5): lift each out of PARTS:, leaving the HDL to `parseHDL`. */
function extractWires(source: string): { hdl: string; wires: WireStatement[] } | { misplaced: number } {
  const code = source.replace(COMMENT, blank)
  const partsAt = code.search(/\bPARTS\s*:/)
  const wires: WireStatement[] = []
  let hdl = source
  for (const match of code.matchAll(WIRE)) {
    const at = match.index ?? 0
    const before = source.slice(0, at)
    const opened = code.slice(partsAt, at).split('(').length - code.slice(partsAt, at).split(')').length
    const line = before.split('\n').length
    if (partsAt === -1 || at < partsAt || at > code.lastIndexOf('}') || opened > 0) return { misplaced: line }
    const target = readSlice(match[2])
    const origin = readSlice(match[4])
    wires.push({ target: match[1], targetSlice: target.slice, source: match[3], sourceSlice: origin.slice, line, column: at - before.lastIndexOf('\n'), malformed: !target.ok || !origin.ok })
    hdl = hdl.slice(0, at) + blank(match[0]) + hdl.slice(at + match[0].length)
  }
  return { hdl, wires }
}

function wireProblem(wire: WireStatement, ins: Set<string>, outs: Set<string>, width: Map<string, number>): string | null {
  if (wire.malformed) return `wire ${wire.target} has a malformed slice`
  if (!outs.has(wire.target)) return `wire target "${wire.target}" is not a chip OUT`
  if (!ins.has(wire.source) && !outs.has(wire.source)) return `wire source "${wire.source}" is not a chip IN or OUT`
  const targetWidth = wire.targetSlice ? sliceWidth(wire.targetSlice) : width.get(wire.target)
  const sourceWidth = wire.sourceSlice ? sliceWidth(wire.sourceSlice) : width.get(wire.source)
  return targetWidth === sourceWidth ? null : `wire ${wire.target} is ${targetWidth} bits wide but its source is ${sourceWidth}`
}

/**
 * An alias rooted at a chip OUT can close a loop that never resolves (§1.5); walk it bit by bit.
 * Classified by driver kind, so `wire x = x;` is a cycle of one rather than an identity to drop.
 */
export function aliasCycles(nets: Net[], width: Map<string, number>): SpecDiagnostic[] {
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

const describeRef = (ref: Ref): string => (ref.kind === 'part-pin' ? `${ref.partId}.${printPinRef(ref.pin, ref.slice)}` : printPinRef(ref.pin, ref.slice))

/** The version lives in one canonical header first and one sidecar block last; any other tag is refused. */
function readVersions(source: string): { sidecar: Sidecar } | { diagnostics: SpecDiagnostic[] } {
  const refuse = (code: 'unknown-schema-version' | 'invalid-sidecar', message: string) => ({ diagnostics: [{ code, severity: 'error' as const, message }] })
  HEADER.lastIndex = Math.max(0, source.search(/\S/))
  const header = HEADER.exec(source)
  const found = SIDECAR_BLOCK.exec(source)
  const block = found && source.slice(source.lastIndexOf('\n', found.index) + 1, found.index).trim() === '' ? found : null
  const headerTag = header ? header.index + header[0].indexOf('hacer') : -1
  const blockTag = block ? block.index + block[0].indexOf('hacer') : Number.POSITIVE_INFINITY
  for (const tag of source.matchAll(TAG)) {
    const at = tag.index ?? 0
    if (at === headerTag || at >= blockTag) continue
    const where = `line ${source.slice(0, at).split('\n').length}`
    if (tag[1] !== undefined) return refuse('unknown-schema-version', `"${tag[0]}" at ${where} is not a "// hacer-spec <version>" header as the first thing in the file (after a BOM or blank lines); a tag anywhere else is refused, comments included`)
    return refuse('invalid-sidecar', `"${tag[0]}" at ${where} is not a /* hacer-sidecar */ block opening its own line at the end of the file`)
  }
  if (block?.[1].includes('*/')) return refuse('invalid-sidecar', 'The sidecar JSON holds a raw */, which ends the comment early; write it as *\\/')
  if (header && header[1] !== String(SPEC_SCHEMA_VERSION)) return refuse('unknown-schema-version', `Spec schemaVersion "${header[1]}" is not one this build reads (${SPEC_SCHEMA_VERSION})`)
  return block ? parseSidecar(block[1]) : { sidecar: emptySidecar() }
}

/** Keeps a marker p1..p(2^53 - 1) seen once; keys any other part by position, from a size-independent counter. */
function assignPartIds(parts: HDLPart[], diagnostics: SpecDiagnostic[]): Part[] {
  const taken = new Set<string>()
  const lost = parts.map(({ id }): [SpecDiagnostic['code'], string] | null => {
    if (id === undefined) return ['part-id-assigned', 'has no // #p<n> id']
    if (!CANONICAL_ID.test(id) || Number(id.slice(1)) > Number.MAX_SAFE_INTEGER) return ['invalid-part-id', `has the id ${id.length > 24 ? `${id.slice(0, 24)}…` : id}, which is not p1 to p${Number.MAX_SAFE_INTEGER}`]
    if (taken.has(id)) return ['duplicate-part-id', `repeats the id ${id}`]
    taken.add(id)
    return null
  })
  let next = 1
  return parts.map((part, i) => {
    const reason = lost[i]
    if (reason === null) return { id: part.id as PartId, chip: part.name }
    let id = `p${i + 1}`
    while (taken.has(id)) id = `p${next++}`
    taken.add(id)
    diagnostics.push({ code: reason[0], severity: part.id === undefined ? 'info' : 'warning', partId: id as PartId, message: `${part.name} (part ${i + 1}) ${reason[1]}; keyed by its position as ${id}` })
    return { id: id as PartId, chip: part.name }
  })
}

const bitsOf = (slice: HDLSlice | undefined) => ({ first: slice?.start ?? 0, last: slice?.end ?? Number.POSITIVE_INFINITY })
const overlap = (a: HDLSlice | undefined, b: HDLSlice | undefined): boolean => bitsOf(a).first <= bitsOf(b).last && bitsOf(b).first <= bitsOf(a).last

/**
 * §1.8: one bit, one source — a signal bit written by two nets, or a part pin bit bound by two.
 * A chip input read many ways is fan-out (§1), and an unknown chip's pins have no known direction.
 */
export function doubleSourced(nets: Net[], unknownParts: Set<PartId>): SpecDiagnostic[] {
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
    if (driver !== null && !(driver.kind === 'chip-in' && driver.pin === signal)) {
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

/** A driverless net is unfinished (§1.1) unless another net writes bits it reads, or an unknown chip may. */
export function undriven(nets: Net[], unknownParts: Set<PartId>): SpecDiagnostic[] {
  const written = nets.filter((n) => n.driver !== null).map((n) => splitNetId(n.id))
  return nets
    .filter((n) => n.driver === null && !LITERALS.has(n.id) && !n.sinks.some((s) => s.kind === 'part-pin' && unknownParts.has(s.partId)))
    .filter((n) => {
      const { signal, slice } = splitNetId(n.id)
      return !written.some((w) => w.signal === signal && overlap(w.slice, slice))
    })
    .map((n) => ({ code: 'undriven', severity: 'error', netId: n.id, message: `Signal "${n.id}" is read but nothing drives it` }))
}

function lower(chip: HDLChip, wires: WireStatement[], chips: ChipRegistry, diagnostics: SpecDiagnostic[]): CircuitSpec {
  const ins = chip.inputs.map(({ name, width }) => ({ name, width }))
  const outs = chip.outputs.map(({ name, width }) => ({ name, width }))
  const width = new Map([...ins, ...outs].map((p) => [p.name, p.width]))
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
        if (LITERALS.has(id)) diagnostics.push({ code: 'literal-output', severity: 'error', partId, message: `${describeRef(ref)} is bound to ${id}; a part output cannot drive a constant, so the binding is dropped` })
        else drive(id, ref, partId)
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
      else diagnostics.push({ code: 'multiple-drivers', severity: 'error', netId: net.id, ...(net.driver.kind === 'part-pin' && { partId: net.driver.partId }), message: `Chip input "${signal}" is written by ${describeRef(net.driver)}` })
    }
    if (outNames.has(signal) && net.driver !== null) net.sinks.push({ kind: 'chip-out', ...port })
  }

  const doc = normalizeSpec({ schemaVersion: SPEC_SCHEMA_VERSION, name: chip.name, ins, outs, parts, nets: [...nets.values()] })
  diagnostics.push(...undriven(doc.nets, unknownParts), ...doubleSourced(doc.nets, unknownParts), ...aliasCycles(doc.nets, width))
  return doc
}

/**
 * Read a `.spec` document: HDL-shaped text (plain `.hdl` included) and an optional trailing sidecar.
 * Valid if it parses (§1.1): only non-HDL text, a BUILTIN chip or an unread version returns no doc.
 */
export function parseSpec(source: string, options: ParseSpecOptions = {}): ParseSpecResult {
  const refuse = (diagnostics: SpecDiagnostic[]): ParseSpecResult => ({ doc: null, sidecar: null, diagnostics })
  const sidecar = readVersions(source)
  if ('diagnostics' in sidecar) return refuse(sidecar.diagnostics)

  const lifted = extractWires(source)
  if ('misplaced' in lifted) {
    return refuse([{ code: 'syntax', severity: 'error', line: lifted.misplaced, message: `The wire at line ${lifted.misplaced} stands outside PARTS: or inside a part's bindings; a wire goes between parts` }])
  }
  const { hdl, wires } = lifted
  const parsed = parseHDL(hdl)
  if (!parsed.success) return refuse(parsed.errors.map((e) => ({ code: 'syntax', severity: 'error', line: e.line, column: e.column, message: e.message })))
  if (parsed.chip.builtin !== undefined) {
    return refuse([{ code: 'builtin-chip', severity: 'error', message: `${parsed.chip.name} is a BUILTIN chip: it has no parts and nets to be a spec of` }])
  }
  const diagnostics: SpecDiagnostic[] = []
  const doc = lower(parsed.chip, wires, options.chips ?? getBuiltinChipRegistry(), diagnostics)
  return { doc, sidecar: sidecar.sidecar, diagnostics }
}
