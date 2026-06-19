# P05-16 — HDL Compiler (HDL → evaluable chip) — Design

- **Date:** 2026-06-19
- **Status:** Approved (brainstorming) — pending spec review
- **Ticket:** [`docs/plans/phase-0.5-tickets/P05-16.md`](../plans/phase-0.5-tickets/P05-16.md)
- **Phase:** 0.5
- **Depends:** P05-04 (HDL parser), P05-01 (ChipRegistry), P05-15 (Project-1 builtins)
- **Guiding principle:** [`docs/decisions/0003`](../decisions/0003-design-for-longevity.md) — design for long-term extensibility

## Goal

Compile a parsed `HDLChip` AST into an **evaluable** chip and run it, closing the gap where HDL parses
(P05-04) and a chip registry exists (P05-01) but nothing turns HDL into something the simulator can
evaluate. **Acceptance:** all 15 Project-1 chips compile from authored canonical HDL sources — bottom-up from a
single `Nand` builtin — and evaluate identically to the builtin references.

## Non-goals

- HDL editor UI → P05-21.
- `.tst`/`.cmp` test-execution engine → P05-17.
- Sequential / `CLOCKED` chips → Phase 0.6 (the design leaves a seam, does not implement them).
- User-chip authoring UI and deep composite lifecycle → P05-18 (builds on the seam introduced here).

## Background — verified current APIs

- `parseHDL(source) → { success: true; chip: HDLChip } | { success: false; errors }`.
- `HDLChip { name, inputs: HDLPin[], outputs: HDLPin[], parts: HDLPart[], builtin?, clocked? }`;
  `HDLPart { name, connections: HDLConnection[] }`;
  `HDLConnection { internal /*part pin*/, external /*signal | 'true' | 'false'*/, start?, end? /*sub-bus*/ }`.
- `ChipDefinition { name, inputs: ChipPin[], outputs: ChipPin[], implementation }`;
  `ChipImplementation = {type:'builtin'; evaluate} | {type:'hdl'; source} | {type:'circuit'; circuitData}`;
  `BuiltinEvalFn = (Record<string,number>) => Record<string,number>`; `ChipPin { name, width }`.
- Registry: `createChipRegistry()`, `registry.get/has/register/list`, `registerBuiltin(...)`,
  `isBuiltinChip/isHDLChip/isCircuitChip`; app registries `getBuiltinChipRegistry()` (16 Project-1 chips), `getUserChipRegistry()`.
- `busOps`: `maskForWidth`, `readSubBus(value,startBit,numBits)`, `writeSubBus(target,sub,startBit,numBits)`, `clampToWidth(value,width)`.
- `topologicalEval.ts` currently evaluates **builtin chips only**; HDL/user chips were explicitly deferred to "a later ticket". **No `compiler.ts` exists yet.**
- ⚠️ `project1HdlFixtures.ts` is a **parser-regression corpus** (empty `PARTS:` stubs like `//// imagination required`) — **not** real implementations, and unusable for compilation. P05-16 authors the canonical Project-1 HDL in a new `src/core/hdl/project1HdlSources.ts`.

## Architecture

### 1. Representation — preserve identity, derive the evaluator
Compiled HDL chips keep `implementation: { type: 'hdl', source, ast? }` — **serializable, editable,
AI-readable** — rather than being flattened into anonymous `builtin` closures. The executable is a
**derived runtime artifact** (a closure), cached, never persisted. One small type change: add optional
`ast?: HDLChip` to the `hdl` variant of `ChipImplementation` (plain data; keeps it serializable).

*Rationale (ADR-0003):* source identity is needed by the HDL editor (P05-21), re-compilation, persistence
(P05-14), and AI manipulation. Flattening to a builtin closure would be the expedient choice and would
foreclose those.

### 2. The evaluation seam — `evaluateChip()`
New `src/core/chips/evaluateChip.ts`:
```ts
export interface EvalContext {
  registry: ChipRegistry
  depth: number
  maxDepth: number                 // default 100
  cache: WeakMap<ChipDefinition, BuiltinEvalFn>  // compiled-evaluator cache
}
export function evaluateChip(
  chip: ChipDefinition,
  inputs: Record<string, number>,
  registry: ChipRegistry,
  ctx?: Partial<EvalContext>,
): Record<string, number>
```
Single dispatch point by implementation type:
- `builtin` → `chip.implementation.evaluate(inputs)`
- `hdl` → compiled evaluator from cache, else `compileHDL(ast, registry)` and cache it, then run
- `circuit` → throw a clear "circuit chips not evaluable yet" error (future)
- depth guard → throw on exceeding `maxDepth` (guards cycles / runaway nesting)

Internally the compiled evaluator has signature `(inputs, ctx) => outputs` so recursion threads
`depth`/`cache`/`registry`; `evaluateChip` exposes the external `BuiltinEvalFn` form `(inputs) => outputs`
by creating a fresh `ctx` (depth 0). Tests and the canvas engine call `evaluateChip(chip, inputs, registry)`
(or `compileHDL(...).evaluate(inputs)`), never `implementation.evaluate` (HDL chips have no such field).

This is the one place new implementation kinds plug in later (clocked/sequential, sub-NAND levels,
plugins) — without touching call sites.

### 3. `compileHDL()`
New `src/core/hdl/compiler.ts`:
```ts
export interface HDLCompileError { message: string; partName?: string; pinName?: string }
export type HDLCompileResult =
  | { success: true; evaluate: BuiltinEvalFn; chip: ChipDefinition }
  | { success: false; errors: HDLCompileError[] }
export function compileHDL(ast: HDLChip, registry: ChipRegistry): HDLCompileResult
```
Pipeline:
1. **BUILTIN passthrough:** if `ast.builtin`, resolve it from the registry (error if missing).
2. **Resolve parts:** `registry.get(part.name)` for each; collect "unknown chip-part" errors.
3. **Signal graph:** chip inputs = sources, chip outputs = sinks, everything else = internal wire; map producer/consumer per signal (distinguish part-pin direction via the part's `ChipDefinition.inputs`/`.outputs`).
4. **Topological order:** Kahn's over the part dependency graph (a part depends on parts producing the signals it reads); detect cycles → error.
5. **Validate:** unconnected required part pins, undefined/dangling signals, sub-bus width vs pin width mismatch.
6. **Build evaluator closure:** seed `signals` with `inputs`; for each part in order — gather part inputs from `signals` (sub-bus via `readSubBus`; `true`/`false` → 1/0), call `evaluateChip(partChip, partInputs, registry, ctx)` (recursion), write part outputs back into `signals` (sub-bus via `writeSubBus`), `clampToWidth` to each pin width; finally collect chip outputs.

### 4. Engine routing
`topologicalEval.ts` routes placed-chip evaluation through `evaluateChip(...)` instead of its
builtin-only check, so HDL/composite chips evaluate on the 3D canvas. *Boundary:* P05-16 delivers the
seam + single/nested HDL evaluation; P05-18 extends it to user-chip authoring lifecycle and deeper
composites — P05-18 should be re-scoped to not re-introduce the seam.

## Data flow
```
HDL source → parseHDL → HDLChip → compileHDL → evaluator (cached) ─┐
placed chip on canvas → topologicalEval → evaluateChip ───────────┴→ outputs
```

## Error model
- `compileHDL` returns `{ success:false, errors }` with clear `message` (+ `partName`/`pinName`):
  unknown chip-part, unconnected pin, undefined/dangling signal, width mismatch, cyclic parts.
- `evaluateChip` throws on: unknown chip name, `circuit` type (not yet), depth exceeded.
- Engine: surface compile failures via the existing `lastSimulationError` path (consistent with
  `topologicalEval`'s cycle handling).

## Acceptance & testing (TDD)
- `src/core/hdl/compiler.test.ts` — Not (uses Nand), And (internal wire `nandOut`, nesting), and error
  cases (unknown part, unconnected pin, width mismatch, cycle).
- `src/core/chips/evaluateChip.test.ts` — builtin dispatch; hdl dispatch (compile + cache hit); depth
  guard; `circuit` → clear error.
- `src/core/hdl/project1-bottom-up.test.ts` — compile all 15 Project-1 chips from the authored `project1HdlSources`
  in dependency order starting from **Nand only**, registering each compiled chip; assert each matches
  its builtin reference (full truth table for ≤4-input 1-bit chips; representative vectors for 16-bit /
  multi-way). Proves the whole Project-1 hierarchy builds from a single NAND.
- Regression: `pnpm run lint` · `pnpm run test:run` · `pnpm run test:e2e:store` · `pnpm run build`.

## Staged build (drives the implementation plan)
a. `evaluateChip` dispatch + builtin passthrough (green).
b. `compileHDL` 1-bit core (Not/And/Or/Xor/Mux/DMux) + internal wires + nesting + `true`/`false`.
c. Engine routing through `evaluateChip`.
d. Sub-bus + 16-bit (Not16/And16/Or16/Mux16).
e. Multi-way (Mux4Way16/Mux8Way16/DMux4Way/DMux8Way).
f. Full 15-chip bottom-up acceptance test.
g. Compiled-evaluator caching, depth guard, error-message polish.

## Files
- **Create:** `src/core/hdl/compiler.ts` (+ `compiler.test.ts`); `src/core/chips/evaluateChip.ts`
  (+ `evaluateChip.test.ts`); `src/core/hdl/project1HdlSources.ts` (canonical Project-1 HDL — the existing
  `project1HdlFixtures.ts` are parser stubs); `src/core/hdl/project1-bottom-up.test.ts`.
- **Edit:** `src/simulation/topologicalEval.ts` (route via `evaluateChip`); `src/core/chips/types.ts`
  (add `ast?: HDLChip` to the `hdl` implementation variant).

## Risks / open boundaries
- **P05-18 overlap:** engine routing + the seam are introduced here; coordinate so P05-18 narrows to
  user-chip lifecycle. Flag in the docs-sync author pass.
- **Performance:** cache compiled evaluators (WeakMap keyed by `ChipDefinition`) so a chip isn't
  recompiled on every tick.
- **Serializability:** `implementation` stays JSON-serializable (`ast` is plain data; the evaluator
  closure is runtime-only, never persisted).
