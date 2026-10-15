import { printPinRef } from '../hdl/printer'
import type { HDLSlice } from '../hdl/types'
import { sliceWidth, splitNetId } from './netId'
import { SPEC_SCHEMA_VERSION } from './types'
import type { CircuitSpec, Net, Port, Ref, Sidecar } from './types'

export interface PrintSpecOptions {
  /** `nand2tetris` prints plain HDL: pass-throughs become buffers, with no header and no sidecar. */
  dialect?: 'hacer' | 'nand2tetris'
  sidecar?: Sidecar
}

interface Binding {
  pin: string
  slice?: HDLSlice
  signal: string
  output: boolean
}

const INDENT = '    '
const compare = (a: string, b: string): number => (a < b ? -1 : a > b ? 1 : 0)
const printPort = (port: Port): string => (port.width > 1 ? `${port.name}[${port.width}]` : port.name)
const printRef = (ref: Ref): string => printPinRef(ref.pin, ref.slice)
const bit = (slice: HDLSlice | undefined, i: number): HDLSlice => ({ start: (slice?.start ?? 0) + i, end: (slice?.start ?? 0) + i })

/** Classified by driver kind (§1): any chip-out driver is an alias, a chip-in one only if renamed. */
export function isAlias(net: Net): net is Net & { driver: Ref } {
  if (net.driver?.kind === 'chip-out') return true
  return net.driver?.kind === 'chip-in' && printRef(net.driver) !== net.id
}

/** One binding order, so the text never depends on net or sink order: inputs, then outputs, by pin. */
const byPin = (a: Binding, b: Binding): number =>
  Number(a.output) - Number(b.output) ||
  compare(a.pin, b.pin) ||
  (a.slice?.start ?? -1) - (b.slice?.start ?? -1) ||
  compare(a.signal, b.signal)

/** §1.5's export desugar, width-generic: `Or` at one bit, `Or16` at sixteen, one `Or` per bit otherwise. */
function buffers(net: Net & { driver: Ref }, outs: Port[]): string[] {
  const { signal, slice } = splitNetId(net.id)
  const width = slice ? sliceWidth(slice) : (outs.find((p) => p.name === signal)?.width ?? 1)
  if (width === 1 || width === 16) {
    const from = printRef(net.driver)
    return [`${width === 1 ? 'Or' : 'Or16'}(a=${from}, b=${from}, out=${net.id});`]
  }
  return Array.from({ length: width }, (_, i) => {
    const from = printPinRef(net.driver.pin, bit(net.driver.slice, i))
    return `Or(a=${from}, b=${from}, out=${printPinRef(signal, bit(slice, i))});`
  })
}

/**
 * Print a document as HDL-shaped text: each part's bindings raised from the nets, each part's id as a
 * trailing `// #p<n>`, pass-throughs as `wire`. The output depends on the parts' order, not the nets'.
 */
export function printSpec(doc: CircuitSpec, options: PrintSpecOptions = {}): string {
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
  for (const net of aliases) lines.push(...(plain ? buffers(net, doc.outs) : [`wire ${net.id} = ${printRef(net.driver)};`]).map((l) => INDENT + l))
  lines.push('}')

  const text = `${lines.join('\n')}\n`
  if (plain || !options.sidecar) return text
  return `${text}/* hacer-sidecar\n${JSON.stringify(options.sidecar, null, 2).replace(/\*\//g, '*\\/')}\n*/\n`
}
