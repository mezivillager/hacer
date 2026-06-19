// src/core/chips/evaluateChip.ts
import type { ChipDefinition } from './types'
import type { ChipRegistry } from './registry'
import { isBuiltinChip, isHDLChip } from './types'
import { parseHDL } from '../hdl'
import { compileHDL, type CompiledEvaluator, type EvalContext } from '../hdl/compiler'

export const DEFAULT_MAX_DEPTH = 100

// Persistent compiled-evaluator cache (keyed by ChipDefinition identity; auto-evicts on GC).
const compiledCache = new WeakMap<ChipDefinition, CompiledEvaluator>()

export function evaluateChip(
  chip: ChipDefinition,
  inputs: Record<string, number>,
  registry: ChipRegistry,
  opts?: { maxDepth?: number },
): Record<string, number> {
  const ctx: EvalContext = {
    registry,
    depth: 0,
    maxDepth: opts?.maxDepth ?? DEFAULT_MAX_DEPTH,
    evalChip: evaluateChipWithCtx,
  }
  return evaluateChipWithCtx(chip, inputs, ctx)
}

export function evaluateChipWithCtx(
  chip: ChipDefinition,
  inputs: Record<string, number>,
  ctx: EvalContext,
): Record<string, number> {
  if (ctx.depth > ctx.maxDepth) {
    throw new Error(`evaluateChip: max recursion depth ${ctx.maxDepth} exceeded at chip "${chip.name}"`)
  }
  if (isBuiltinChip(chip)) {
    return chip.implementation.evaluate(inputs)
  }
  if (isHDLChip(chip)) {
    let compiled = compiledCache.get(chip)
    if (!compiled) {
      const parsed = parseHDL(chip.implementation.source)
      if (!parsed.success) {
        throw new Error(`evaluateChip: chip "${chip.name}" HDL failed to parse: ${parsed.errors.map((e) => e.message).join('; ')}`)
      }
      const result = compileHDL(parsed.chip, ctx.registry)
      if (!result.success) {
        throw new Error(`evaluateChip: chip "${chip.name}" failed to compile: ${result.errors.map((e) => e.message).join('; ')}`)
      }
      compiled = result.evaluate
      compiledCache.set(chip, compiled)
    }
    return compiled(inputs, ctx)
  }
  throw new Error(`evaluateChip: chip "${chip.name}" implementation type "${chip.implementation.type}" is not supported yet`)
}
