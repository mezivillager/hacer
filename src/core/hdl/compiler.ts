// src/core/hdl/compiler.ts
import type { HDLChip, HDLConnection, HDLPart, HDLSlice } from './types'
import type { ChipDefinition, ChipPin } from '../chips/types'
import type { ChipRegistry } from '../chips/registry'
import { isBuiltinChip } from '../chips/types'
import { maskForWidth, readSubBus, writeSubBus } from '@/simulation/busOps'
import { parseHDL } from './parser'
import { printPin, printPinRef } from './printer'

export interface EvalContext {
  registry: ChipRegistry
  depth: number
  maxDepth: number
  /** Recursion hook — injected by evaluateChip so compiler never imports it (no cycle). */
  evalChip: (chip: ChipDefinition, inputs: Record<string, number>, ctx: EvalContext) => Record<string, number>
}

export type CompiledEvaluator = (inputs: Record<string, number>, ctx: EvalContext) => Record<string, number>

export interface HDLCompileError {
  message: string
  partName?: string
  pinName?: string
  /** The line of the part that caused it, which `message` also leads with as `Line N: `; absent when no part with a source line did. */
  line?: number
}

export type HDLCompileResult =
  | { success: true; evaluate: CompiledEvaluator }
  | { success: false; errors: HDLCompileError[] }

/** Build a serializable hdl ChipDefinition from a parsed AST + its source. */
export function hdlChipDefinition(ast: HDLChip, source: string): ChipDefinition {
  return {
    name: ast.name,
    inputs: ast.inputs.map((p) => ({ name: p.name, width: p.width })),
    outputs: ast.outputs.map((p) => ({ name: p.name, width: p.width })),
    implementation: { type: 'hdl', source },
  }
}

const LITERALS = new Set(['true', 'false'])
/** Bits carried by an inclusive slice: `[3]` is 1, `[0..7]` is 8. */
const sliceBits = (slice: HDLSlice): number => slice.end - slice.start + 1
/** `web-ide`'s refusal of a slice past a signal's last bit; `null` when the slice fits or the width is unknown. */
export const subBusOutOfRange = (signal: string, slice: HDLSlice | undefined, width: number | undefined): string | null =>
  slice !== undefined && width !== undefined && slice.end >= width ? `sub-bus index out of range ("${signal}" has width ${width})` : null
/** An unsliced write covers a signal's whole width, however wide it later turns out to be. */
const WHOLE_SIGNAL = Number.MAX_SAFE_INTEGER

/** An inclusive bit range: both `first` and `last` are covered. */
interface BitRange {
  first: number
  last: number
}

/** Do two inclusive ranges share a bit? The one overlap test the whole file reasons with. */
const overlaps = (a: BitRange, b: BitRange): boolean => a.first <= b.last && b.first <= a.last

/** The bits two overlapping ranges share. Unbounded only when both cover a whole signal. */
const shared = (a: BitRange, b: BitRange): BitRange => ({ first: Math.max(a.first, b.first), last: Math.min(a.last, b.last) })

/**
 * Name the bits of a range — and name none when it reaches to `WHOLE_SIGNAL`, because then no
 * particular bit is what went wrong. One rule for every message that mentions bits: an index is
 * printed only where it is actually determined. (`web-ide` drops the index the same way,
 * ../web-ide/simulator/src/chip/builder.ts.)
 */
const describeBits = (range: BitRange): string =>
  range.last === WHOLE_SIGNAL ? '' : range.first === range.last ? ` bit ${range.first}` : ` bits ${range.first}..${range.last}`

/**
 * One bit, one source — the same rule on both sides of a connection (#355 out, #367 in).
 *
 * Claims `[first..last]` of `key` and returns the bits that were already claimed, or `null` when
 * nothing overlaps. Disjoint ranges are legal on both sides: several parts may each write
 * their own slice of a signal, and several connections may each feed their own slice of a part's
 * input pin. Overlap is not a value — which claim survived would depend on the order the parts or
 * the bindings happen to appear in the document. The reference simulator draws the same rule
 * across both sides, one `checkMultipleAssignments` over an input-pin map and an output-pin map
 * (../web-ide/simulator/src/chip/builder.ts).
 */
function claimBits(claimed: Map<string, BitRange[]>, key: string, first: number, last: number): BitRange | null {
  const ranges = claimed.get(key)
  if (!ranges) {
    claimed.set(key, [{ first, last }])
    return null
  }
  const clash = ranges.find((range) => overlaps({ first, last }, range))
  ranges.push({ first, last })
  return clash ? shared({ first, last }, clash) : null
}

/** An error in the reference's `createError` form, leading with its line when it has one. */
const atLine = (line: number | undefined, message: string): HDLCompileError => (line === undefined ? { message } : { message: `Line ${line}: ${message}`, line })

function partError(part: HDLPart, message: string, pinName?: string): HDLCompileError {
  const error: HDLCompileError = { ...atLine(part.line, message), partName: part.name }
  if (pinName !== undefined) error.pinName = pinName
  return error
}

/**
 * Report a message once. N parts driving one bit is one mistake, not N−1 of them, and the second
 * copy of a message tells a reader nothing the first did not. Scoped by the `seen` set the caller
 * owns, so two parts that happen to share a name still report separately. Keyed on the message
 * before its line, which differs between the N parts.
 */
function pushOnce(errors: HDLCompileError[], seen: Set<string>, part: HDLPart, message: string, pinName: string): void {
  if (seen.has(message)) return
  seen.add(message)
  errors.push(partError(part, message, pinName))
}

/** A signal, and the bits of it that one connection reads or writes. */
interface SignalRange extends BitRange {
  signal: string
}

/** The bits a connection touches on the *signal* side: its external slice, or the whole signal. */
const externalRange = (conn: HDLConnection): BitRange => ({
  first: conn.externalSlice?.start ?? 0,
  last: conn.externalSlice?.end ?? WHOLE_SIGNAL,
})

/**
 * The first part, in source order, that closes a cycle with the parts before it, and the signals
 * and bits on that cycle as `"w" bit 0 → "w" bit 1`, starting with what the part reads.
 *
 * The parts before it have no cycle, so every cycle among the parts up to it runs through it, and
 * a breadth-first walk from it over those parts finds the shortest. `null` on an acyclic graph.
 */
function firstCycle(adj: readonly number[][], edgeCarries: Map<string, string>): { part: number; trace: string } | null {
  for (let part = 0; part < adj.length; part++) {
    const reachedFrom = new Map<number, number>()
    const queue = [part]
    for (let head = 0; head < queue.length; head++) {
      const from = queue[head]
      for (const to of adj[from]) {
        if (to === part) {
          const path = [from]
          while (path[0] !== part) path.unshift(reachedFrom.get(path[0]) as number)
          const loop = [from, ...path.slice(0, -1)]
          const carried = loop.map((at, i) => edgeCarries.get(`${at}->${loop[(i + 1) % loop.length]}`) ?? '')
          return { part, trace: carried.filter((label, i) => label !== '' && carried.indexOf(label) === i).join(' → ') }
        }
        if (to < part && !reachedFrom.has(to)) {
          reachedFrom.set(to, from)
          queue.push(to)
        }
      }
    }
  }
  return null
}

const cannotUseItself = (chip: string): string => `Cannot use chip ${chip} to implement itself`

/** The names a definition's parts are looked up by; a builtin, or HDL that does not parse, has none. */
function partNames(def: ChipDefinition): string[] {
  switch (def.implementation.type) {
    case 'builtin':
      return []
    case 'circuit':
      return def.implementation.spec.parts.map((part) => part.chip)
    case 'hdl': {
      const parsed = parseHDL(def.implementation.source)
      return parsed.success ? parsed.chip.parts.map((part) => part.name) : []
    }
  }
}

/** A definition's name and pins as its source states them; `null` for a builtin, or HDL that does not parse. */
function sourceHeader(def: ChipDefinition): { name: string; inputs: readonly ChipPin[]; outputs: readonly ChipPin[] } | null {
  switch (def.implementation.type) {
    case 'builtin':
      return null
    case 'circuit': {
      const { name, ins, outs } = def.implementation.spec
      return { name, inputs: ins, outputs: outs }
    }
    case 'hdl': {
      const parsed = parseHDL(def.implementation.source)
      return parsed.success ? parsed.chip : null
    }
  }
}

/** The reference's `Wrong chip name`, naming the first of `names` that is not the source's CHIP name. */
const wrongChipName = (source: string, names: readonly string[]): string | null => {
  const holder = names.find((name) => name !== source)
  return holder === undefined ? null : `Wrong chip name: ${holder} holds CHIP ${source}`
}

const widths = (pins: readonly ChipPin[]): Map<string, number> => new Map(pins.map((p) => [p.name, p.width]))
const samePins = (a: readonly ChipPin[], b: readonly ChipPin[]): boolean => {
  const [x, y] = [widths(a), widths(b)]
  return x.size === y.size && [...x].every(([name, width]) => y.get(name) === width)
}

/** Where `def`'s name, `inputs` or `outputs` differ from its source's (ADR-0020 §1.11 rule 2); empty when they agree. */
export function sourceDisagreements(def: ChipDefinition): string[] {
  const source = sourceHeader(def)
  if (source === null) return []
  const sides = [['IN', def.inputs, source.inputs], ['OUT', def.outputs, source.outputs]] as const
  const pins = sides.flatMap(([kind, declared, stated]) =>
    samePins(declared, stated) ? [] : [`${def.name} declares ${kind} ${declared.map(printPin).join(', ')}, but its source declares ${kind} ${stated.map(printPin).join(', ')}`])
  const name = wrongChipName(source.name, [def.name])
  return name === null ? pins : [name, ...pins]
}

/**
 * The chips on a cycle reachable from the part named `start`, in order, or `null`; keyed by name, so it ends even if `get` builds a new definition per call.
 * `visit` sees each definition the walk enters, once, with the part names that led to it from `start`.
 */
export function registryCycle(start: string, registry: ChipRegistry, done: Set<string>, visit?: (path: string[], def: ChipDefinition) => void): string[] | null {
  const chain: Array<{ name: string; def: ChipDefinition; parts: string[]; next: number }> = []
  const onChain = new Map<string, number>()
  const enter = (name: string): void => {
    const def = registry.get(name)
    if (def === undefined) return
    onChain.set(name, chain.length)
    chain.push({ name, def, parts: partNames(def), next: 0 })
    visit?.(chain.map((link) => link.name), def)
  }
  if (!done.has(start)) enter(start)
  while (chain.length > 0) {
    const link = chain[chain.length - 1]
    if (link.next === link.parts.length) {
      chain.pop()
      onChain.delete(link.name)
      done.add(link.name)
      continue
    }
    const name = link.parts[link.next++]
    if (done.has(name)) continue
    const at = onChain.get(name)
    if (at !== undefined) return chain.slice(at).map(({ def }) => def.name)
    enter(name)
  }
  return null
}

/** A cycle read from the chip named `root` when it is on it, so a chip refused for its own cycle comes first. */
function usesItself(cycle: string[], root: string): string {
  const from = Math.max(cycle.indexOf(root), 0)
  const [chip, ...through] = [...cycle.slice(from), ...cycle.slice(0, from)]
  return through.length === 0 ? cannotUseItself(chip) : `${cannotUseItself(chip)} through ${through.join(' → ')}`
}

export function compileHDL(ast: HDLChip, registry: ChipRegistry): HDLCompileResult {
  const errors: HDLCompileError[] = []

  // 1. BUILTIN passthrough
  if (ast.builtin) {
    const existing = registry.get(ast.builtin)
    if (!existing) return { success: false, errors: [{ message: `Builtin chip "${ast.builtin}" not found in registry` }] }
    if (!isBuiltinChip(existing)) return { success: false, errors: [{ message: `Chip "${ast.builtin}" is not a builtin` }] }
    const ev = existing.implementation.evaluate
    return { success: true, evaluate: (inputs) => ev(inputs) }
  }

  // 2. Resolve parts
  const itself = ast.parts.find((part) => part.name === ast.name)
  if (itself) return { success: false, errors: [partError(itself, cannotUseItself(ast.name))] }
  const resolved: Array<{ part: HDLPart; def: ChipDefinition }> = []
  ast.parts.forEach((part) => {
    const def = registry.get(part.name)
    if (!def) {
      errors.push(partError(part, `Unknown chip-part: "${part.name}"`))
      return
    }
    const misnamed = isBuiltinChip(def) || def.name === part.name ? null : wrongChipName(sourceHeader(def)?.name ?? def.name, [part.name, def.name])
    if (misnamed !== null) {
      errors.push(partError(part, misnamed))
      return
    }
    resolved.push({ part, def })
  })
  if (errors.length) return { success: false, errors }
  const walked = new Set<string>()
  for (const { part } of resolved) {
    const cycle = registryCycle(part.name, registry, walked)
    if (cycle) return { success: false, errors: [partError(part, usesItself(cycle, ast.name))] }
  }

  const chipInputNames = new Set(ast.inputs.map((p) => p.name))

  // Signal widths: chip I/O are declared; internal wires are inferred from the (unsliced)
  // output pin that produces them. Used to reject full-width bus↔scalar pin mismatches below.
  const signalWidth = new Map<string, number>()
  for (const p of ast.inputs) signalWidth.set(p.name, p.width)
  for (const p of ast.outputs) signalWidth.set(p.name, p.width)
  for (const { part, def } of resolved) {
    for (const conn of part.connections) {
      if (conn.externalSlice || LITERALS.has(conn.external)) continue // sliced writes don't pin total width
      const outPin = def.outputs.find((p) => p.name === conn.internal)
      // A part-pin slice narrows what is written: `Not16(in=a, out[0..3]=nib)` makes `nib` 4 bits
      // wide, not 16 — the transfer width, not the whole pin, is what reaches the signal.
      if (outPin && !signalWidth.has(conn.external)) {
        signalWidth.set(conn.external, conn.internalSlice ? sliceBits(conn.internalSlice) : outPin.width)
      }
    }
  }

  // 3. Validate connections + classify reads/writes per part
  // reads[i] = the signal BITS part i consumes (external names, minus literals & chip inputs)
  // writes[i] = the signal bits part i produces
  // Bits, not names: a read of `t[1]` and a write of `t[0]` touch the same signal and no common
  // bit, so step 4 must be able to tell them apart (#363).
  const reads: SignalRange[][] = []
  const writes: SignalRange[][] = []
  // Every bit range already driven, per signal — one bit may have only one driver.
  const drivenRanges = new Map<string, BitRange[]>()
  const reportedDriverClash = new Set<string>()
  for (const { part, def } of resolved) {
    const r: SignalRange[] = []
    const w: SignalRange[] = []
    const reportedBindingClash = new Set<string>()
    // Every bit range already bound, per input pin of THIS part — one bit may have only one
    // source. Per part, like the reference simulator's `inPins` (cleared for each part); the
    // driven map above is per chip, because a signal is shared and a pin is not.
    const boundRanges = new Map<string, BitRange[]>()
    for (const conn of part.connections) {
      const inPin = def.inputs.find((p) => p.name === conn.internal)
      const outPin = def.outputs.find((p) => p.name === conn.internal)
      if (!inPin && !outPin) {
        errors.push(partError(part, `Part "${part.name}" has no pin "${conn.internal}"`, conn.internal))
        continue
      }
      const pin = inPin ?? outPin
      const pastEnd = subBusOutOfRange(conn.external, conn.externalSlice, signalWidth.get(conn.external))
      if (pin && conn.internalSlice && conn.internalSlice.end >= pin.width) {
        errors.push(partError(part, `Part "${part.name}" pin "${printPinRef(conn.internal, conn.internalSlice)}" is out of range; "${conn.internal}" has width ${pin.width}`, conn.internal))
      } else if (pin && pastEnd !== null) {
        errors.push(partError(part, `Part "${part.name}" pin "${printPinRef(conn.internal, conn.internalSlice)}" is wired to "${printPinRef(conn.external, conn.externalSlice)}": ${pastEnd}`, conn.internal))
      } else if (pin) {
        // The two sides are sized independently: the part's pin (sliced or whole) has to carry
        // exactly as many bits as the signal it is wired to (sliced, or whole when its width is
        // known). A literal takes the width of the side it is bound to.
        const internalWidth = conn.internalSlice ? sliceBits(conn.internalSlice) : pin.width
        const externalWidth = conn.externalSlice
          ? sliceBits(conn.externalSlice)
          : LITERALS.has(conn.external)
            ? internalWidth
            : signalWidth.get(conn.external)
        if (externalWidth !== undefined && externalWidth !== internalWidth) {
          const external = conn.externalSlice ? `slice "${printPinRef(conn.external, conn.externalSlice)}"` : `signal "${conn.external}"`
          errors.push(partError(part, `Part "${part.name}" pin "${printPinRef(conn.internal, conn.internalSlice)}" width ${internalWidth} != ${external} width ${externalWidth}`, conn.internal))
        }
      }
      if (inPin) {
        // One bit, one source — the twin of the one-driver rule below. Two connections feeding
        // the same pin bit is not a value: which one survived would depend on the order the
        // bindings appear in the document, which is the order-dependence #355 removed on the
        // other side of the connection.
        //
        // The bits claimed are the PIN's, not the signal's: a part-pin slice claims only what it
        // feeds, so `Or8Way(in[0]=a, in[1]=b)` is two disjoint claims, while an unsliced binding
        // claims the pin whole and so collides with any slice of it (`Not16(in=a, in[0]=b)`).
        // That is the same rule WHOLE_SIGNAL states below, spelled out rather than sentinelled: a
        // pin's width is always known from its chip definition, while a signal's may still be
        // waiting to be inferred.
        const boundClash = claimBits(boundRanges, inPin.name, conn.internalSlice?.start ?? 0, conn.internalSlice?.end ?? inPin.width - 1)
        if (boundClash !== null) {
          pushOnce(errors, reportedBindingClash, part, `Part "${part.name}" pin "${inPin.name}" bit ${boundClash.first} is bound by more than one connection`, inPin.name)
        }
        if (LITERALS.has(conn.external)) continue
        if (!chipInputNames.has(conn.external)) r.push({ signal: conn.external, ...externalRange(conn) })
      } else {
        if (LITERALS.has(conn.external)) {
          errors.push(partError(part, `Part "${part.name}" output "${conn.internal}" cannot connect to literal "${conn.external}"`, conn.internal))
          continue
        }
        if (chipInputNames.has(conn.external)) {
          errors.push(partError(part, `Part "${part.name}" output "${conn.internal}" cannot write to chip input "${conn.external}"`, conn.internal))
          continue
        }
        // One bit, one driver. Two parts writing the same bit is a short circuit, not a value,
        // and which one survived would depend on the part order — exactly what step 4 stops
        // depending on. Matches the reference simulator (../web-ide, `ChipBuilder`).
        const written = externalRange(conn)
        const drivenClash = claimBits(drivenRanges, conn.external, written.first, written.last)
        if (drivenClash !== null) {
          // The message names one bit, so it names the first shared one — and names none when the
          // overlap has no end, because two whole-signal writes clash at no particular bit.
          const at = drivenClash.last === WHOLE_SIGNAL ? drivenClash : { first: drivenClash.first, last: drivenClash.first }
          pushOnce(errors, reportedDriverClash, part, `Signal "${conn.external}"${describeBits(at)} is driven by more than one part`, conn.internal)
        }
        w.push({ signal: conn.external, ...written })
      }
    }
    // An input pin no connection names is a forgotten wire, the pins bindUnconnectedInputs binds (ADR-0020 §1.1).
    // A pin named only out of range has its range refusal alone; bits no binding covers read 0 (R338).
    for (const p of def.inputs) {
      if (!boundRanges.has(p.name)) {
        errors.push(partError(part, `Part "${part.name}" input pin "${p.name}" is not connected: the nand2tetris simulator reads it as 0; bind ${p.name}=false to do the same`, p.name))
      }
    }
    reads.push(r)
    writes.push(w)
  }
  if (errors.length) return { success: false, errors }

  // 4. Topological order (Kahn) — part A depends on B if A reads BITS that B writes.
  const n = resolved.length
  /** signal -> every part that writes it, with the bits that part writes. */
  const producersOf = new Map<string, Array<{ part: number; bits: BitRange }>>()
  writes.forEach((w, i) =>
    w.forEach(({ signal, first, last }) => {
      const producer = { part: i, bits: { first, last } }
      const producers = producersOf.get(signal)
      if (producers) producers.push(producer)
      else producersOf.set(signal, [producer])
    }),
  )
  const adj: number[][] = Array.from({ length: n }, () => []) // producer -> consumers
  const indegree = new Array(n).fill(0)
  /** `producer->consumer` -> the signal and shared bits that edge carries, for the cycle message. */
  const edgeCarries = new Map<string, string>()
  const reportedDangling = new Set<string>()
  const reportDangling = (i: number, message: string): void => {
    const dangling = `${i}:${message}`
    if (reportedDangling.has(dangling)) return
    reportedDangling.add(dangling)
    errors.push(partError(resolved[i].part, message))
  }
  reads.forEach((r, i) => {
    r.forEach((read) => {
      const producers = producersOf.get(read.signal)
      if (producers === undefined) {
        // Not a chip input, not a literal, and no part writes it → dangling/typo'd signal. Once
        // per part, as before: `reads` was a Set of names and is now a list of ranges, so a part
        // reading two slices of one missing signal would otherwise say so twice.
        reportDangling(i, `Signal "${read.signal}" is read by part "${resolved[i].part.name}" but no part produces it`)
        return
      }
      // Touching one driven bit is enough, as the spec path's `undriven` rule has it: a whole read
      // of a slice-assembled signal stays legal (#355), and its unwritten bits read 0.
      if (!producers.some((producer) => overlaps(read, producer.bits))) {
        reportDangling(i, `Signal "${read.signal}"${describeBits(read)} is read by part "${resolved[i].part.name}" but no part drives it`)
        return
      }
      // An edge from EVERY producer whose bits this read actually touches. Every producer, because
      // a signal assembled from several slice writes is only complete once all of them have run
      // (#355); only the overlapping ones, because bits a read never looks at cannot make it wait
      // (#363). An unsliced read covers the whole signal and so still overlaps every write, which
      // is why #355's rule is not a second case here but this one's widest instance. A part is a
      // producer of its own reads like any other: an edge from a part to itself is a combinational
      // loop of length one, and Kahn leaves it unplaced and traces it like any other cycle. The
      // self-edge used to be skipped outright, because per-SIGNAL edges made a part that writes
      // `t[0]` and reads `t[1]` wait for itself; now that edges follow bits, `overlaps` keeps that
      // legitimate disjoint self-reference and only rejects a read that reaches the part's own
      // written bits — which at `main` read the value the signal held before the part ran (#397).
      for (const producer of producers) {
        if (!overlaps(read, producer.bits)) continue
        const edge = `${producer.part}->${i}`
        if (edgeCarries.has(edge)) continue // one edge per pair; a second read adds no ordering
        edgeCarries.set(edge, `"${read.signal}"${describeBits(shared(read, producer.bits))}`)
        adj[producer.part].push(i)
        indegree[i]++
      }
    })
  })
  if (errors.length) return { success: false, errors }
  const queue: number[] = []
  for (let i = 0; i < n; i++) if (indegree[i] === 0) queue.push(i)
  const order: number[] = []
  while (queue.length) {
    const i = queue.shift() as number
    order.push(i)
    for (const j of adj[i]) {
      indegree[j]--
      if (indegree[j] === 0) queue.push(j)
    }
  }
  if (order.length !== n) {
    const cycle = firstCycle(adj, edgeCarries)
    const message = `Cyclic part dependency: parts cannot be topologically ordered (combinational cycle)${cycle?.trace ? ` through ${cycle.trace}` : ''}`
    return { success: false, errors: [atLine(cycle === null ? undefined : resolved[cycle.part].part.line, message)] }
  }
  const orderedParts = order.map((i) => resolved[i])

  // 5. Build evaluator closure
  const evaluate: CompiledEvaluator = (inputs, ctx) => {
    const signals: Record<string, number> = {}
    for (const pin of ast.inputs) signals[pin.name] = inputs[pin.name] ?? 0

    for (const { part, def } of orderedParts) {
      const partInputs: Record<string, number> = {}
      for (const conn of part.connections) {
        const inPin = def.inputs.find((p) => p.name === conn.internal)
        if (!inPin) continue // not an input pin
        // Bits moved by this wire: its part-pin slice, or the whole pin. Validation has already
        // proved the external side carries the same number.
        const bits = conn.internalSlice ? sliceBits(conn.internalSlice) : inPin.width
        let value: number
        if (LITERALS.has(conn.external)) {
          value = conn.external === 'true' ? maskForWidth(bits) : 0
        } else {
          const sig = signals[conn.external] ?? 0
          value = conn.externalSlice ? readSubBus(sig, conn.externalSlice.start, bits) : sig
        }
        // A sliced part pin is assembled bit-group by bit-group (`Or8Way(in[0]=a, in[1]=b)`),
        // so each wire writes into the pin instead of replacing it. Unbound bits stay 0.
        partInputs[conn.internal] = conn.internalSlice
          ? writeSubBus(partInputs[conn.internal] ?? 0, value, conn.internalSlice.start, bits)
          : value
      }
      const partOutputs = ctx.evalChip(def, partInputs, { ...ctx, depth: ctx.depth + 1 })
      for (const conn of part.connections) {
        const outPin = def.outputs.find((p) => p.name === conn.internal)
        if (!outPin) continue // not an output pin
        const v = partOutputs[conn.internal]
        if (typeof v !== 'number') continue
        const bits = conn.internalSlice ? sliceBits(conn.internalSlice) : outPin.width
        // Read the part's own pin through its slice first, then place the result on the signal.
        const value = conn.internalSlice ? readSubBus(v, conn.internalSlice.start, bits) : v
        signals[conn.external] = conn.externalSlice
          ? writeSubBus(signals[conn.external] ?? 0, value, conn.externalSlice.start, bits)
          : value
      }
    }

    const result: Record<string, number> = {}
    for (const pin of ast.outputs) result[pin.name] = signals[pin.name] ?? 0
    return result
  }

  return { success: true, evaluate }
}
