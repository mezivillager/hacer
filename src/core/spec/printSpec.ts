import type { ChipRegistry } from '../chips/registry'
import { printPinRef } from '../hdl/printer'
import type { HDLSlice } from '../hdl/types'
import { sliceWidth, splitNetId } from './netId'
import { SPEC_SCHEMA_VERSION } from './types'
import type { CircuitSpec, Net, Port, Ref, Sidecar } from './types'

export interface PrintSpecOptions {
  /** `nand2tetris` prints plain HDL: a pass-through becomes one buffer per 16-bit window, with no header and no sidecar. */
  dialect?: 'hacer' | 'nand2tetris'
  sidecar?: Sidecar
  /** Where `nand2tetris` reads an unsliced part pin's width; the Project 1 builtins by default. */
  chips?: ChipRegistry
}

type Alias = Net & { driver: Extract<Ref, { kind: 'chip-in' | 'chip-out' }> }

interface Binding {
  pin: string
  slice?: HDLSlice
  signal: string
  output: boolean
}

const INDENT = '    '
const compare = (a: string, b: string): number => (a < b ? -1 : a > b ? 1 : 0)
const printPort = (port: Port): string => (port.width > 1 ? `${port.name}[${port.width}]` : port.name)
const printRef = (ref: Ref): string => (ref.kind === 'constant' ? String(ref.value) : printPinRef(ref.pin, ref.slice))
const span = (slice: HDLSlice | undefined, from: number, width: number): HDLSlice => ({ start: (slice?.start ?? 0) + from, end: (slice?.start ?? 0) + from + width - 1 })

/** Classified by driver kind (§1): any chip-out driver is an alias, a chip-in one only if renamed. */
export function isAlias(net: Net): net is Alias {
  if (net.driver?.kind === 'chip-out') return true
  return net.driver?.kind === 'chip-in' && printRef(net.driver) !== net.id
}

/** One binding order, so the text never depends on net or sink order: inputs, then outputs, by pin. */
const byPin = (a: Binding, b: Binding): number =>
  Number(a.output) - Number(b.output) ||
  compare(a.pin, b.pin) ||
  (a.slice?.start ?? -1) - (b.slice?.start ?? -1) ||
  compare(a.signal, b.signal)

const WINDOW = 16

/** §1.5's export desugar: one buffer per 16-bit window from the low bit, `Or` at one bit and `Or16` from pin bit 0 above it. */
function buffers(net: Alias, outs: Port[], chip: string): string[] {
  const { signal, slice } = splitNetId(net.id)
  const width = slice ? sliceWidth(slice) : (outs.find((p) => p.name === signal)?.width ?? 1)
  const { pin, slice: from } = net.driver
  const printWindow = (lo: number, k: number): string[] => {
    // A chip named Or16 cannot use itself, so away from 16 bits it keeps one Or per bit.
    if (k > 1 && chip === 'Or16' && width !== WINDOW) return Array.from({ length: k }, (_, i) => printWindow(lo + i, 1)).flat()
    const whole = k === width
    const x = whole ? printRef(net.driver) : printPinRef(pin, span(from, lo, k))
    const y = whole ? net.id : printPinRef(signal, span(slice, lo, k))
    if (k === 1) return [`Or(a=${x}, b=${x}, out=${y});`]
    const pins = k === WINDOW ? '' : `[0..${k - 1}]`
    return [`Or16(a${pins}=${x}, b${pins}=${x}, out${pins}=${y});`]
  }
  return Array.from({ length: Math.ceil(width / WINDOW) }, (_, w) => printWindow(w * WINDOW, Math.min(WINDOW, width - w * WINDOW))).flat()
}

/**
 * Print a document as HDL-shaped text: each part's bindings raised from the nets, each part's id as a
 * trailing `// #p<n>`, pass-throughs as `wire`. The output depends on the parts' order, not the nets'.
 * Throws, naming the net, when a driverless net shares its id with a driven one: neither dialect has a form for it.
 */
export function printSpec(doc: CircuitSpec, options: PrintSpecOptions = {}): string {
  const driven = new Set(doc.nets.flatMap((n) => (n.driver === null ? [] : [n.id])))
  const twin = doc.nets.find((n) => n.driver === null && driven.has(n.id))
  if (twin) throw new Error(`printSpec: net "${twin.id}" has no driver beside a driven net of the same id, and neither dialect has a form for it`)
  const plain = options.dialect === 'nand2tetris'
  const bindings = new Map<string, Binding[]>()
  for (const net of doc.nets) {
    for (const ref of [net.driver, ...net.sinks]) {
      if (ref?.kind !== 'part-pin') continue
      const list = bindings.get(ref.partId) ?? []
      list.push({ pin: ref.pin, slice: ref.slice, signal: net.id, output: ref === net.driver })
      bindings.set(ref.partId, list)
    }
  }
  const aliases = doc.nets.filter(isAlias).sort((a, b) => compare(a.id, b.id))

  const lines = plain ? [] : [`// hacer-spec ${SPEC_SCHEMA_VERSION}`]
  const ports = (keyword: string, list: Port[]): string[] => (list.length > 0 ? [`${INDENT}${keyword} ${list.map(printPort).join(', ')};`] : [])
  lines.push(`CHIP ${doc.name} {`, ...ports('IN', doc.ins), ...ports('OUT', doc.outs), '', `${INDENT}PARTS:`)
  for (const part of doc.parts) {
    const conns = (bindings.get(part.id) ?? []).sort(byPin).map((b) => `${printPinRef(b.pin, b.slice)}=${b.signal}`)
    lines.push(`${INDENT}${part.chip}(${conns.join(', ')}); // #${part.id}`)
  }
  // Buffers are appended after every declared part, so the parts' ids keep their positions (§1.9).
  for (const net of aliases) lines.push(...(plain ? buffers(net, doc.outs, doc.name) : [`wire ${net.id} = ${printRef(net.driver)};`]).map((l) => INDENT + l))
  lines.push('}')

  const text = `${lines.join('\n')}\n`
  if (plain || !options.sidecar) return text
  return `${text}/* hacer-sidecar\n${JSON.stringify(options.sidecar, null, 2).replace(/\*\//g, '*\\/')}\n*/\n`
}
