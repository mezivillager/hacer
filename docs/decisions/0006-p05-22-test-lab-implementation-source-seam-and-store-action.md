# 0006. P05-22 Test Lab: pluggable implementation-source seam + test execution as a store action

- **Status:** Accepted
- **Date:** 2026-06-20
- **Deciders:** Repo owner / P05-22 implementation session
- **Phase:** 0.5

## Context
P05-22 wraps the P05-17 test engine in a UI ("Test Lab"). Two realities shaped the design:

1. The original ticket assumed the panel tests "the user's implementation," but there is **no
   user-authored chip at runtime** (the user registry is empty — P05-18) and **no canvas→chip bridge**
   (P05-26). So today the only testable targets are *reference* implementations.
2. The North Star includes **AI-Agent Parity** — every action a human can take, an AI agent can take
   programmatically — and the standing decision rule (AGENTS.md §2 / [ADR-0003](0003-design-for-longevity.md))
   to prefer the flexible, future-proof option over what is quickest to ship.

## Decision
1. **Pluggable implementation-source seam.** `src/core/testing/implementationSources.ts` defines
   `ChipImplementationSource { id; label; resolve(chipName) → { chip, registry } | null }` with a small
   registry (`getImplementationSources`/`getImplementationSource`/`registerImplementationSource`/
   `resetImplementationSourcesForTests`). Today it ships `builtin` and `hdl-from-nand` (compiled bottom-up
   from a single NAND). User-authored chips (P05-18) and the live canvas (P05-26) **register as additional
   sources with no panel or store changes** — the panel runs each chip's official `.tst` against whichever
   source is selected. This is the long-term-over-ease choice made concrete.
2. **Test execution is a store action, not a click handler.** `circuitActions.runChipTest(chipName,
   sourceId)` resolves the source, runs `runTest`, and writes `testResult`/`testColumns`/`completedChips`
   to the store; `TestResultsPanel` is a thin view. This makes test runs **programmatically invokable by
   an AI agent** (AI-Agent Parity) and gives the `@store` E2E a clean entry point. The action upholds the
   engine's never-throw contract (ADR-0005): structural problems — including a source `resolve()` that
   throws — become `testResult.error`; value mismatches become `firstFailure`.
3. **Completion contract.** Passing a test persists the chip to `localStorage['hacer-completed-chips']`
   (JSON `string[]`) via `chipCompletion.ts` — the contract the future P05-19 chip browser reuses; the
   panel's `✓` marker is the immediate consumer.

## Consequences
- **P05-22 is DONE.** The Test Lab runs the 16 Project-1 chips' official tests against builtin or
  HDL-from-NAND, with a diff-highlighted output table and pass/fail summary.
- This is the **first feature built under the non-3D UX testing rigor** (AGENTS.md §3 Step 4.1): it ships
  component RTL tests, an RTL **integration** test via `renderShell()` (full shell, no Canvas), and `@store`
  E2E. The integration test proved the rigor works end-to-end.
- **"Always green today":** with only reference sources, real runs pass; the red-diff/`firstFailure` path
  is exercised by a deliberately-broken registered source in tests, and lights up when a fallible source
  (user/canvas) registers.
- **Deferred to P05-18/P05-26** (when dynamic sources first land): the panel reads
  `getImplementationSources()` at render, so the source dropdown must become reactive (a Zustand slice or
  `useSyncExternalStore`); and a fallible source's `resolve()` is now guarded but its evaluation path
  should be revisited. Documented in a code comment and tracked.
- **Rejected:** a self-contained component with local `useState` and no store/agent surface (would
  foreclose AI parity); hardcoding a single test target.

## Affected living docs
- `docs/plans/phase-0.5-tickets-CHECKLIST.md` — P05-22 marked DONE.
- `docs/plans/phase-0.5-tickets/P05-22.md` — revised to match this design (the original `runTest(script,
  resolver, options)` / `ChipResolver` API never shipped).
- `REPO_MAP.md` — new files (`implementationSources.ts`, `chipCompletion.ts`, `testActions/`,
  `TestResultsPanel.tsx`).

## Links
- [[0005-p05-17-test-execution-engine-design-and-verification-contract]] — the engine this UI drives.
- [[0003-design-for-longevity]] — the source seam + AI-parity action apply the extensibility directive.
- Design spec: `docs/specs/2026-06-20-p05-22-test-results-panel-design.md`
- Plan: `docs/superpowers/plans/2026-06-20-p05-22-test-results-panel.md`
- Non-3D UX testing rigor: `AGENTS.md` §3 Step 4.1; follow-up `docs/plans/phase-0.5-tickets/P05-32.md`.
- Key files: `src/core/testing/implementationSources.ts`, `src/store/actions/testActions/testActions.ts`,
  `src/components/ui/TestResultsPanel.tsx`.
