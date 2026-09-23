// src/core/hdl/compiler.ts
import type { HDLChip, HDLConnection, HDLPart, HDLSlice } from './types'
import type { ChipDefinition } from '../chips/types'
import type { ChipRegistry } from '../chips/registry'
import { isBuiltinChip } from '../chips/types'
import { maskForWidth, readSubBus, writeSubBus } from '@/simulation/busOps'
import { printPinRef } from './printer'

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

/** Do any of these claims land on a pin `width` bits wide? Same overlap test, against the pin. */
const coversAnyBit = (ranges: BitRange[] | undefined, width: number): boolean =>
  (ranges ?? []).some((range) => overlaps(range, { first: 0, last: width - 1 }))

/**
 * Report a message once. N parts driving one bit is one mistake, not N−1 of them, and the second
 * copy of a message tells a reader nothing the first did not. Scoped by the `seen` set the caller
 * owns, so two parts that happen to share a name still report separately.
 */
function pushOnce(errors: HDLCompileError[], seen: Set<string>, error: HDLCompileError): void {
  if (seen.has(error.message)) return
  seen.add(error.message)
  errors.push(error)
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
 * The signals and bits on one real cycle, as `"w" bit 0 → "w" bit 1`, for the error message.
 *
 * Kahn leaves behind exactly the parts it could not place, and every one of those still has an
 * unplaced predecessor — so following any one predecessor from any of them must revisit a part,
 * and the walk between the two visits is a cycle. Returns `''` if the graph somehow offers no
 * predecessor, so a missing trace can never turn a rejection into a crash.
 */
function cycleTrace(unplaced: Set<number>, adj: readonly number[][], edgeCarries: Map<string, string>): string {
  const predecessor = new Map<number, number>()
  adj.forEach((consumers, from) => {
    if (!unplaced.has(from)) return
    for (const to of consumers) if (unplaced.has(to) && !predecessor.has(to)) predecessor.set(to, from)
  })
  const walk: number[] = []
  const visitedAt = new Map<number, number>()
  const [start] = unplaced
  if (start === undefined) return ''
  let part = start
  while (!visitedAt.has(part)) {
    visitedAt.set(part, walk.length)
    walk.push(part)
    const previous = predecessor.get(part)
    if (previous === undefined) return ''
    part = previous
  }
  // The walk runs backwards along the edges, so the loop it closed reads forwards reversed.
  const loop = walk.slice(visitedAt.get(part)).reverse()
  const carried = loop.map((from, i) => edgeCarries.get(`${from}->${loop[(i + 1) % loop.length]}`) ?? '')
  return carried.filter((label, i) => label !== '' && carried.indexOf(label) === i).join(' → ')
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
  const resolved: Array<{ part: HDLPart; def: ChipDefinition }> = []
  ast.parts.forEach((part) => {
    const def = registry.get(part.name)
    if (!def) {
      errors.push({ message: `Unknown chip-part: "${part.name}"`, partName: part.name })
      return
    }
    resolved.push({ part, def })
  })
  if (errors.length) return { success: false, errors }

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
        errors.push({ message: `Part "${part.name}" has no pin "${conn.internal}"`, partName: part.name, pinName: conn.internal })
        continue
      }
      const pin = inPin ?? outPin
      if (pin && conn.internalSlice && conn.internalSlice.end >= pin.width) {
        errors.push({ message: `Part "${part.name}" pin "${printPinRef(conn.internal, conn.internalSlice)}" is out of range; "${conn.internal}" has width ${pin.width}`, partName: part.name, pinName: conn.internal })
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
          errors.push({ message: `Part "${part.name}" pin "${printPinRef(conn.internal, conn.internalSlice)}" width ${internalWidth} != ${external} width ${externalWidth}`, partName: part.name, pinName: conn.internal })
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
          pushOnce(errors, reportedBindingClash, { message: `Part "${part.name}" pin "${inPin.name}" bit ${boundClash.first} is bound by more than one connection`, partName: part.name, pinName: inPin.name })
        }
        if (LITERALS.has(conn.external)) continue
        if (!chipInputNames.has(conn.external)) r.push({ signal: conn.external, ...externalRange(conn) })
      } else {
        if (LITERALS.has(conn.external)) {
          errors.push({ message: `Part "${part.name}" output "${conn.internal}" cannot connect to literal "${conn.external}"`, partName: part.name, pinName: conn.internal })
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
          pushOnce(errors, reportedDriverClash, { message: `Signal "${conn.external}"${describeBits(at)} is driven by more than one part`, partName: part.name, pinName: conn.internal })
        }
        w.push({ signal: conn.external, ...written })
      }
    }
    // Every input pin must be wired — an unconnected input would be silently read as 0. Since
    // #357 a pin may be bound in pieces, so this asks about bits, not about names: an unbound
    // *bit* is no longer evidence of a mistake, because `Or8Way(in[0]=a, in[1]=b)` is legal HDL
    // whose bits 2..7 read 0, and the reference simulator has no connectedness pass at all
    // (../web-ide/simulator/src/chip/builder.ts checks assignment, never coverage). A pin no
    // binding lands on anywhere is still a forgotten wire, so that stays an error.
    // (Output pins may legally be left unconnected when a chip doesn't use them.)
    for (const p of def.inputs) {
      if (!coversAnyBit(boundRanges.get(p.name), p.width)) {
        errors.push({ message: `Part "${part.name}" input pin "${p.name}" is not connected`, partName: part.name, pinName: p.name })
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
  reads.forEach((r, i) => {
    r.forEach((read) => {
      const producers = producersOf.get(read.signal)
      if (producers === undefined) {
        // Not a chip input, not a literal, and no part writes it → dangling/typo'd signal. Once
        // per part, as before: `reads` was a Set of names and is now a list of ranges, so a part
        // reading two slices of one missing signal would otherwise say so twice.
        const dangling = `${i}:${read.signal}`
        if (reportedDangling.has(dangling)) return
        reportedDangling.add(dangling)
        errors.push({ message: `Signal "${read.signal}" is read by part "${resolved[i].part.name}" but no part produces it`, partName: resolved[i].part.name })
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
    const placed = new Set(order)
    const unplaced = new Set<number>()
    for (let i = 0; i < n; i++) if (!placed.has(i)) unplaced.add(i)
    const carried = cycleTrace(unplaced, adj, edgeCarries)
    return {
      success: false,
      errors: [{ message: `Cyclic part dependency: parts cannot be topologically ordered (combinational cycle)${carried ? ` through ${carried}` : ''}` }],
    }
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
