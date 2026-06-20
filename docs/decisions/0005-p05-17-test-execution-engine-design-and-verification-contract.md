# 0005. P05-17 test execution engine: functional design + never-vacuous verification contract

- **Status:** Accepted
- **Date:** 2026-06-20
- **Deciders:** Repo owner / P05-17 implementation session
- **Phase:** Phase 0.5

## Context
P05-17 builds the test execution engine that runs a parsed `.tst` script against a chip and compares
its outputs against `.cmp` data — the capability that makes all 16 Project-1 chips verifiable against
the official nand2tetris tests. The ticket was authored **before** P05-16 landed, and its spec sketched
a stateful `ChipResolver` + `ChipEvaluator` (`setInput`/`evaluate`/`getOutput`/`getInput`) interface and
pseudocode for `repeat`/`while` control flow. By the time P05-17 was implemented, two realities had
changed:

1. P05-16 shipped a **functional** evaluator — `evaluateChip(def, inputs, registry)` — so a stateful
   4-method chip wrapper would be redundant indirection.
2. The real `parseTST` (P05-05) does **not** emit `repeat`/`while` commands, and the Project-1 corpus
   does not use them.

A PR review (Codex P2 on PR #121) additionally surfaced that a `compare-to` target the engine could not
resolve was being silently skipped, letting a broken chip report `passed: true` — a vacuous pass.

## Decision
We will implement the engine as a single pure function

```
runTest(script: TSTScript, options: RunTestOptions): TestResult
```

in `src/core/testing/engine.ts`, with these binding design choices:

- **Functional, not stateful.** The engine holds a plain `inputs` accumulator and calls the P05-16
  `evaluateChip` seam on each `eval`. The ticket's `ChipResolver`/`ChipEvaluator` interface is rejected.
  `load Foo.hdl` resolves the chip by `registry.get('Foo')` — the **registry is the resolver**.
- **`repeat`/`while` are out of scope.** The parser never emits them; we do not speculatively support
  them (YAGNI). The command dispatch is structured so a future `repeat` can be added without rework.
- **Never-vacuous verification contract** (the load-bearing decision):
  - `runTest` **never throws** across its boundary. Structural problems become `TestResult.error`
    (a string): unknown chip on `load`, `eval` before a chip is loaded, a throw inside `evaluateChip`,
    a row-count mismatch (in **both** directions — too few *and* too many output rows), and a
    `compare-to` target that cannot be resolved. Value mismatches go to `firstFailure`, not `error`.
  - A script that declares `compare-to X.cmp` but whose target cannot be resolved (the `loadCmpFile`
    resolver returns null, or none was supplied) **fails the run** rather than skipping comparison.
    Explicit `options.cmpData` still takes precedence (the `compare-to` is redundant in that path).

## Consequences
- **P05-17 is DONE.** All 16 Project-1 `.tst` pass against the builtins, and the 15 composites pass
  their official `.tst` when compiled bottom-up from a single NAND.
- `TestResult` is UI-agnostic and serializable — the future test-results panel (P05-22) consumes it
  without the engine importing any React/browser code (the `src/core/testing/` purity invariant holds).
- The verification contract closes the whole class of false-confidence failures: the engine cannot
  report `passed: true` for a run it did not actually verify. This directly serves the compatibility-
  baseline goal — "passing the official test" must mean the test really ran.
- **Rejected:** the stateful resolver/evaluator indirection, and `repeat`/`while` scope.
- **Seam for later:** `options.loadCmpFile` is the extension point for sourcing `.cmp` assets from a
  provider/disk source (today they come from in-repo fixtures) without changing the engine.
- Follow-on: P05-22 (results panel) is now unblocked and is the natural consumer of `TestResult`.

## Affected living docs
- `docs/plans/phase-0.5-tickets-CHECKLIST.md` — P05-17 marked DONE (done in the implementation branch).
- `REPO_MAP.md` — `src/core/testing/engine.ts` added to the testing layer; "Last Updated" refreshed.

## Links
- [[0004-p05-18-boundary-evaluatechip-seam-landed-in-p05-16]] — this engine consumes that seam.
- [[0003-design-for-longevity]] — functional design + the `loadCmpFile` provider seam are applications
  of the extensibility directive.
- Design spec: `docs/specs/2026-06-20-p05-17-test-execution-engine-design.md`
- Implementation plan: `docs/superpowers/plans/2026-06-20-p05-17-test-execution-engine.md`
- Ticket: `docs/plans/phase-0.5-tickets/P05-17.md`
- PR: https://github.com/mezivillager/hacer/pull/121 (compare-to verification fix: commit 76d10cf)
- Key files: `src/core/testing/engine.ts`, `src/core/testing/index.ts`,
  `src/core/chips/evaluateChip.ts`
