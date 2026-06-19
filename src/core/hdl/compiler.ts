// src/core/hdl/compiler.ts
import type { HDLChip, HDLPart } from './types'
import type { ChipDefinition } from '../chips/types'
import type { ChipRegistry } from '../chips/registry'
import { isBuiltinChip } from '../chips/types'
import { readSubBus, writeSubBus } from '@/simulation/busOps'

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

  // 3. Validate connections + classify reads/writes per part
  // reads[i] = internal signals part i consumes (external names, minus literals & chip inputs)
  // writes[i] = signals part i produces
  const reads: Set<string>[] = []
  const writes: Set<string>[] = []
  for (const { part, def } of resolved) {
    const r = new Set<string>()
    const w = new Set<string>()
    for (const conn of part.connections) {
      const inPin = def.inputs.find((p) => p.name === conn.internal)
      const outPin = def.outputs.find((p) => p.name === conn.internal)
      if (!inPin && !outPin) {
        errors.push({ message: `Part "${part.name}" has no pin "${conn.internal}"`, partName: part.name, pinName: conn.internal })
        continue
      }
      const pin = inPin ?? outPin
      if (pin && conn.start !== undefined) {
        const sliceWidth = (conn.end ?? conn.start) - conn.start + 1
        if (sliceWidth !== pin.width) {
          errors.push({ message: `Part "${part.name}" pin "${conn.internal}" width ${pin.width} != slice width ${sliceWidth}`, partName: part.name, pinName: conn.internal })
        }
      }
      if (inPin) {
        if (LITERALS.has(conn.external)) continue
        if (!chipInputNames.has(conn.external)) r.add(conn.external)
      } else {
        if (LITERALS.has(conn.external)) {
          errors.push({ message: `Part "${part.name}" output "${conn.internal}" cannot connect to literal "${conn.external}"`, partName: part.name, pinName: conn.internal })
          continue
        }
        w.add(conn.external)
      }
    }
    reads.push(r)
    writes.push(w)
  }
  if (errors.length) return { success: false, errors }

  // 4. Topological order (Kahn) — part A depends on B if A reads a signal B writes (internal wire).
  const n = resolved.length
  const producerOf = new Map<string, number>() // signal -> producing part index
  writes.forEach((w, i) => w.forEach((sig) => producerOf.set(sig, i)))
  const adj: number[][] = Array.from({ length: n }, () => []) // producer -> consumers
  const indegree = new Array(n).fill(0)
  reads.forEach((r, i) => {
    r.forEach((sig) => {
      const p = producerOf.get(sig)
      if (p !== undefined && p !== i) {
        adj[p].push(i)
        indegree[i]++
      }
    })
  })
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
        if (!def.inputs.some((p) => p.name === conn.internal)) continue // not an input pin
        if (conn.external === 'true') partInputs[conn.internal] = 1
        else if (conn.external === 'false') partInputs[conn.internal] = 0
        else {
          const sig = signals[conn.external] ?? 0
          partInputs[conn.internal] =
            conn.start !== undefined ? readSubBus(sig, conn.start, (conn.end ?? conn.start) - conn.start + 1) : sig
        }
      }
      const partOutputs = ctx.evalChip(def, partInputs, { ...ctx, depth: ctx.depth + 1 })
      for (const conn of part.connections) {
        if (!def.outputs.some((p) => p.name === conn.internal)) continue // not an output pin
        const v = partOutputs[conn.internal]
        if (typeof v === 'number') {
          signals[conn.external] =
            conn.start !== undefined
              ? writeSubBus(signals[conn.external] ?? 0, v, conn.start, (conn.end ?? conn.start) - conn.start + 1)
              : v
        }
      }
    }

    const result: Record<string, number> = {}
    for (const pin of ast.outputs) result[pin.name] = signals[pin.name] ?? 0
    return result
  }

  return { success: true, evaluate }
}
