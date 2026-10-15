import { getBuiltinChipRegistry } from '../chips/appRegistry'
import type { ChipPin } from '../chips/types'
import { project1DependencyOrder } from '../hdl/project1HdlSources'
import type { HDLSlice } from '../hdl/types'

export type Rng = () => number

/** Deterministic PRNG (mulberry32), as in hdl/parser.fuzz.test.ts. */
export function mulberry32(seed: number): Rng {
  let s = seed >>> 0
  return () => {
    s = (s + 0x6d2b79f5) >>> 0
    let t = Math.imul(s ^ (s >>> 15), 1 | s)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export function shuffle<T>(rng: Rng, items: readonly T[]): T[] {
  const out = [...items]
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    ;[out[i], out[j]] = [out[j], out[i]]
  }
  return out
}

export interface SpecProgramOptions {
  /** Read `u0`, a signal nothing drives, once. */
  unfinished?: boolean
}

const CHIPS = ['Nand', ...project1DependencyOrder]
const WIDTHS = [1, 1, 1, 2, 3, 4, 8, 16, 16]

const ref = (name: string, slice?: HDLSlice): string =>
  slice === undefined ? name : slice.start === slice.end ? `${name}[${slice.start}]` : `${name}[${slice.start}..${slice.end}]`
const span = (start: number, width: number): HDLSlice => ({ start, end: start + width - 1 })
const portDecl = (p: ChipPin): string => (p.width > 1 ? `${p.name}[${p.width}]` : p.name)

/**
 * One seeded program over the Project 1 chips, every part marked and every part input bound. It stays inside
 * what the nand2tetris export lowers today: no OUT read or OUT-to-OUT alias, no internal-signal slice, no `_`.
 */
export function specProgram(rng: Rng, name: string, options: SpecProgramOptions = {}): string {
  const registry = getBuiltinChipRegistry()
  const int = (lo: number, hi: number): number => lo + Math.floor(rng() * (hi - lo + 1))
  const pick = <T>(items: readonly T[]): T => items[Math.floor(rng() * items.length)]
  const chance = (p: number): boolean => rng() < p

  const ports = (prefix: string): ChipPin[] => Array.from({ length: int(1, 4) }, (_, i) => ({ name: `${prefix}${i}`, width: pick(WIDTHS) }))
  const ins = ports('i')
  const outs = ports('o')
  const free = new Map(outs.map((p) => [p.name, Array.from({ length: p.width }, () => true)]))
  const internals: ChipPin[] = []
  let pendingUndriven = options.unfinished === true

  const freeRun = (port: ChipPin, max: number): HDLSlice | null => {
    const bits = free.get(port.name) ?? []
    const starts = bits.flatMap((isFree, i) => (isFree ? [i] : []))
    if (starts.length === 0) return null
    const start = pick(starts)
    let end = start
    while (end + 1 < bits.length && bits[end + 1] && end - start + 1 < max) end++
    return { start, end: int(start, end) }
  }
  const claim = (port: ChipPin, slice: HDLSlice): string => {
    const bits = free.get(port.name) ?? []
    for (let i = slice.start; i <= slice.end; i++) bits[i] = false
    return port.width === 1 || (slice.start === 0 && slice.end === port.width - 1 && chance(0.5)) ? port.name : ref(port.name, slice)
  }

  const fromIns = (width: number): string[] =>
    ins.flatMap((p) => (p.width === width ? [p.name] : p.width > width ? [ref(p.name, span(int(0, p.width - width), width))] : []))
  const source = (width: number): string => {
    if (pendingUndriven && chance(0.15)) {
      pendingUndriven = false
      return 'u0'
    }
    const found = [...fromIns(width), ...internals.filter((t) => t.width === width).map((t) => t.name)]
    return found.length > 0 && !chance(0.06) ? pick(found) : pick(['true', 'false'])
  }

  const bindInput = (pin: ChipPin): string[] => {
    let pieces: Array<HDLSlice | undefined> = [undefined]
    if (pin.width > 1 && chance(0.3)) {
      const cut = int(0, pin.width - 2)
      pieces = [span(0, cut + 1), { start: cut + 1, end: pin.width - 1 }]
    }
    return pieces.map((piece) => `${ref(pin.name, piece)}=${source(piece ? piece.end - piece.start + 1 : pin.width)}`)
  }

  const bindOutput = (pin: ChipPin, produced: ChipPin[]): string => {
    const open = outs.filter((p) => free.get(p.name)?.some(Boolean))
    if (open.length > 0 && chance(0.45)) {
      const port = pick(open)
      const run = freeRun(port, pin.width)
      if (run !== null) {
        const width = run.end - run.start + 1
        const own = width === pin.width ? pin.name : ref(pin.name, span(int(0, pin.width - width), width))
        return `${own}=${claim(port, run)}`
      }
    }
    const signal = `t${internals.length + produced.length}`
    if (pin.width > 1 && chance(0.25)) {
      const width = int(1, pin.width - 1)
      produced.push({ name: signal, width })
      return `${ref(pin.name, span(int(0, pin.width - width), width))}=${signal}`
    }
    produced.push({ name: signal, width: pin.width })
    return `${pin.name}=${signal}`
  }

  const parts: string[] = []
  for (let k = int(0, 7); k > 0; k--) {
    const chip = pick(CHIPS)
    const def = registry.get(chip)
    if (!def) throw new Error(`no builtin ${chip}`)
    const produced: ChipPin[] = []
    const bindings = def.inputs.flatMap(bindInput)
    for (const pin of def.outputs) {
      for (let n = pick([0, 1, 1, 1, 1, 2, 2]); n > 0; n--) bindings.push(bindOutput(pin, produced))
    }
    internals.push(...produced)
    parts.push(`${chip}(${shuffle(rng, bindings).join(', ')});`)
  }
  if (pendingUndriven) parts.push('Not(in=u0);')

  const ids = shuffle(rng, Array.from({ length: parts.length * 2 + 1 }, (_, i) => i + 1))
  const lines = parts.map((part, i) => `${part} // #p${ids[i]}`)

  for (const port of outs) {
    if (!chance(0.4)) continue
    const whole = free.get(port.name)?.every(Boolean) && chance(0.5)
    const run = whole ? span(0, port.width) : freeRun(port, 16)
    if (run === null) continue
    const width = run.end - run.start + 1
    const sources = fromIns(width)
    if (sources.length === 0) continue
    lines.splice(int(0, lines.length), 0, `wire ${claim(port, run)} = ${pick(sources)};`)
  }

  return [
    ...(chance(0.5) ? ['// hacer-spec 1'] : []),
    `CHIP ${name} {`,
    `    IN ${ins.map(portDecl).join(', ')};`,
    `    OUT ${outs.map(portDecl).join(', ')};`,
    '    PARTS:',
    ...lines.map((line) => `    ${line}`),
    '}',
    '',
  ].join('\n')
}

/** `count` programs, the k-th drawn from `seed + k` so each replays on its own. */
export function specPrograms(count: number, seed: number, options: SpecProgramOptions = {}): string[] {
  return Array.from({ length: count }, (_, k) => specProgram(mulberry32(seed + k), `Gen${k}`, options))
}
