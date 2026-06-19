# 0004. P05-18 re-scope: evaluateChip dispatch seam landed in P05-16

- **Status:** Accepted
- **Date:** 2026-06-19
- **Deciders:** Repo owner / P05-16 implementation session
- **Phase:** Phase 0.5

## Context
P05-16 (HDL compiler) was scoped to compile HDL source into an evaluable chip and register it in the
chip registry. During implementation (Tasks 3–4 of the P05-16 plan), two additional pieces landed:

1. **`src/core/chips/evaluateChip.ts`** — a central dispatch function that routes any `ChipDefinition`
   to its correct evaluator (builtin inline, HDL-compiled via a module-level `WeakMap` cache, or an
   explicit "not yet supported" error for `circuit` implementations). The module WeakMap provides
   parse-once-per-object caching with automatic GC.

2. **Engine routing** — `src/simulation/topologicalEval.ts` routes through `evaluateChipWithCtx` for
   every chip it resolves, so HDL/composite chips are evaluated on the canvas through the same seam
   as builtins.

P05-18 was originally titled "Chip hierarchy evaluation (recursive)" and listed as depending on P05-16.
Given that the seam and the engine routing are already in place, the original scope of P05-18 is largely
fulfilled by what landed in P05-16.

## Decision
P05-18 is **re-scoped** to cover user-chip authoring lifecycle and deeper composite scenarios that were
not part of P05-16:
- Allowing users to author and save their own chips as HDL (the packaging/authoring UX side).
- Supporting deeper or more complex composite hierarchies that require additional tooling beyond the
  current recursion depth guard.
- Any follow-on work on the `evaluateChip` seam itself (e.g. async evaluation, Web Worker offload).

**P05-18 must NOT re-introduce the `evaluateChip` dispatch seam** — it already exists in
`src/core/chips/evaluateChip.ts`. New work should extend or consume that seam.

## Consequences
- **P05-16 is DONE.** All 15 Project-1 chips compile bottom-up from NAND via HDL and evaluate
  correctly on the canvas.
- **P05-18 scope shrinks**: focus shifts to authoring-lifecycle features rather than re-implementing
  the dispatch infrastructure.
- The `evaluateChip` seam is the stable extension point for future chip types (e.g. `circuit`
  implementation, once that evaluator is built).
- Any session picking up P05-18 should read this ADR first to avoid duplicating work.

## Affected living docs
- `docs/plans/phase-0.5-tickets-CHECKLIST.md` — P05-16 marked DONE; P05-18 re-scope note added.
- `docs/plans/phase-0.5-tickets/README.md` — P05-16 Status → DONE; P05-18 note added.
- `REPO_MAP.md` — new files added (`evaluateChip.ts`, `combineRegistries.ts`, `compiler.ts`,
  `project1HdlSources.ts`); "Last Updated" refreshed.

## Links
- [[0003-design-for-longevity]] — `evaluateChip` seam is an application of the extensibility directive.
- P05-16 ticket: `docs/plans/phase-0.5-tickets/P05-16.md`
- P05-18 ticket: `docs/plans/phase-0.5-tickets/P05-18.md`
- Implementation plan: `docs/plans/2026-06-19-p05-16-hdl-compiler.md`
- Key files: `src/core/chips/evaluateChip.ts`, `src/core/hdl/compiler.ts`,
  `src/simulation/topologicalEval.ts`
