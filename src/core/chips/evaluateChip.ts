// src/core/chips/evaluateChip.ts
import type { ChipDefinition } from './types'
import type { ChipRegistry } from './registry'
import { isBuiltinChip, isCircuitChip } from './types'
import { parseHDL } from '../hdl'
import { compileHDL, sourceDisagreements, type CompiledEvaluator, type EvalContext } from '../hdl/compiler'
import { compileSpec } from '../spec/compileSpec'

export const DEFAULT_MAX_DEPTH = 100

/** `chip`, or a part chip below it, does not compile; `refusals` name a part chip's by the chain from `chip`, as compileSpec does. */
export class ChipCompileError extends Error {
  readonly chip: string
  readonly refusals: readonly string[]

  constructor(chip: string, refusals: readonly string[]) {
    super(`evaluateChip: chip "${chip}" failed to compile: ${refusals.join('; ')}`)
    this.chip = chip
    this.refusals = refusals
  }

  /** The same refusal, met evaluating `parent`, of which this chip is a part. */
  reachedFrom(parent: string): ChipCompileError {
    // A refusal already chained from this chip, by a deeper part or by compileSpec, extends the chain rather than nesting it.
    return new ChipCompileError(parent, this.refusals.map((refusal) => (refusal.startsWith(`${this.chip} › `) ? `${parent} › ${refusal}` : `${parent} › ${this.chip}: ${refusal}`)))
  }
}

interface CachedEvaluator {
  evaluate: CompiledEvaluator
  lookedUp: ReadonlyArray<readonly [string, ChipDefinition | undefined]>
  checkedAgainst: ChipRegistry
  checkedAtVersion: number
}

// Keyed by definition, not registry, because callers build a fresh registry view per tick. The
// lookups are re-checked only when the registry object or its version differs from the last check.
const compiledCache = new WeakMap<ChipDefinition, CachedEvaluator>()

const stillResolves = (cached: CachedEvaluator, registry: ChipRegistry): boolean =>
  cached.lookedUp.every(([name, def]) => registry.get(name) === def)

/** `registry` as a view that notes what each name first resolved to. */
function recording(registry: ChipRegistry): { view: ChipRegistry; lookedUp: Map<string, ChipDefinition | undefined> } {
  const lookedUp = new Map<string, ChipDefinition | undefined>()
  const get = (name: string): ChipDefinition | undefined => {
    const def = registry.get(name)
    if (!lookedUp.has(name)) lookedUp.set(name, def)
    return def
  }
  const view: ChipRegistry = {
    get,
    has: (name) => get(name) !== undefined,
    list: () => registry.list(),
    version: () => registry.version(),
    register: (def) => registry.register(def),
  }
  return { view, lookedUp }
}

function compile(chip: ChipDefinition, registry: ChipRegistry): CompiledEvaluator {
  const refuse = (messages: string[]): never => {
    throw new ChipCompileError(chip.name, messages)
  }
  const disagrees = sourceDisagreements(chip)
  if (disagrees.length > 0) refuse(disagrees)
  if (isCircuitChip(chip)) {
    const result = compileSpec({ doc: chip.implementation.spec, diagnostics: [] }, registry)
    return result.success ? result.evaluate : refuse(result.diagnostics.map((d) => d.message))
  }
  if (chip.implementation.type !== 'hdl') {
    throw new Error(`evaluateChip: chip "${chip.name}" implementation type "${chip.implementation.type}" is not supported yet`)
  }
  const parsed = parseHDL(chip.implementation.source)
  if (!parsed.success) {
    throw new Error(`evaluateChip: chip "${chip.name}" HDL failed to parse: ${parsed.errors.map((e) => e.message).join('; ')}`)
  }
  const result = compileHDL(parsed.chip, registry)
  return result.success ? result.evaluate : refuse(result.errors.map((e) => e.message))
}

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
  let cached = compiledCache.get(chip)
  const version = ctx.registry.version()
  if (cached && (cached.checkedAgainst !== ctx.registry || cached.checkedAtVersion !== version)) {
    if (stillResolves(cached, ctx.registry)) {
      cached.checkedAgainst = ctx.registry
      cached.checkedAtVersion = version
    } else {
      cached = undefined
    }
  }
  if (!cached) {
    const { view, lookedUp } = recording(ctx.registry)
    cached = { evaluate: compile(chip, view), lookedUp: [...lookedUp], checkedAgainst: ctx.registry, checkedAtVersion: version }
    compiledCache.set(chip, cached)
  }
  try {
    return cached.evaluate(inputs, ctx)
  } catch (error) {
    throw error instanceof ChipCompileError ? error.reachedFrom(chip.name) : error
  }
}
