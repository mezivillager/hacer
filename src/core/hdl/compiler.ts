// src/core/hdl/compiler.ts
import type { HDLChip, HDLPart, HDLSlice } from './types'
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

/**
 * One bit, one source — the same rule on both sides of a connection (#355 out, #367 in).
 *
 * Claims `[first..last]` of `key` and returns the first bit that was already claimed, or `null`
 * when nothing overlaps. Disjoint ranges are legal on both sides: several parts may each write
 * their own slice of a signal, and several connections may each feed their own slice of a part's
 * input pin. Overlap is not a value — which claim survived would depend on the order the parts or
 * the bindings happen to appear in the document. The reference simulator draws the same rule
 * across both sides, one `checkMultipleAssignments` over an input-pin map and an output-pin map
 * (../web-ide/simulator/src/chip/builder.ts).
 */
function claimBits(claimed: Map<string, BitRange[]>, key: string, first: number, last: number): number | null {
  const ranges = claimed.get(key)
  if (!ranges) {
    claimed.set(key, [{ first, last }])
    return null
  }
  const clash = ranges.find((range) => overlaps({ first, last }, range))
  ranges.push({ first, last })
  return clash ? Math.max(first, clash.first) : null
}

/** Do any of these claims land on a pin `width` bits wide? Same overlap test, against the pin. */
const coversAnyBit = (ranges: BitRange[] | undefined, width: number): boolean =>
  (ranges ?? []).some((range) => overlaps(range, { first: 0, last: width - 1 }))

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
  // reads[i] = internal signals part i consumes (external names, minus literals & chip inputs)
  // writes[i] = signals part i produces
  const reads: Set<string>[] = []
  const writes: Set<string>[] = []
  // Every bit range already driven, per signal — one bit may have only one driver.
  const drivenRanges = new Map<string, BitRange[]>()
  for (const { part, def } of resolved) {
    const r = new Set<string>()
    const w = new Set<string>()
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
          errors.push({ message: `Part "${part.name}" pin "${inPin.name}" bit ${boundClash} is bound by more than one connection`, partName: part.name, pinName: inPin.name })
        }
        if (LITERALS.has(conn.external)) continue
        if (!chipInputNames.has(conn.external)) r.add(conn.external)
      } else {
        if (LITERALS.has(conn.external)) {
          errors.push({ message: `Part "${part.name}" output "${conn.internal}" cannot connect to literal "${conn.external}"`, partName: part.name, pinName: conn.internal })
          continue
        }
        // One bit, one driver. Two parts writing the same bit is a short circuit, not a value,
        // and which one survived would depend on the part order — exactly what step 4 stops
        // depending on. Matches the reference simulator (../web-ide, `ChipBuilder`).
        const drivenClash = claimBits(drivenRanges, conn.external, conn.externalSlice?.start ?? 0, conn.externalSlice?.end ?? WHOLE_SIGNAL)
        if (drivenClash !== null) {
          errors.push({ message: `Signal "${conn.external}" bit ${drivenClash} is driven by more than one part`, partName: part.name, pinName: conn.internal })
        }
        w.add(conn.external)
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

  // 4. Topological order (Kahn) — part A depends on B if A reads a signal B writes (internal wire).
  const n = resolved.length
  const producersOf = new Map<string, number[]>() // signal -> every part index that writes it
  writes.forEach((w, i) =>
    w.forEach((sig) => {
      const producers = producersOf.get(sig)
      if (producers) producers.push(i)
      else producersOf.set(sig, [i])
    }),
  )
  const adj: number[][] = Array.from({ length: n }, () => []) // producer -> consumers
  const indegree = new Array(n).fill(0)
  reads.forEach((r, i) => {
    r.forEach((sig) => {
      const producers = producersOf.get(sig)
      if (producers === undefined) {
        // Not a chip input, not a literal, and no part writes it → dangling/typo'd signal.
        errors.push({ message: `Signal "${sig}" is read by part "${resolved[i].part.name}" but no part produces it`, partName: resolved[i].part.name })
        return
      }
      // An edge from EVERY producer, not just the last one: a signal assembled from several slice
      // writes is only complete once all of them have run, so all of them must precede the read.
      for (const p of producers) {
        if (p !== i) {
          adj[p].push(i)
          indegree[i]++
        }
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
    return { success: false, errors: [{ message: 'Cyclic part dependency: parts cannot be topologically ordered (combinational cycle)' }] }
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
