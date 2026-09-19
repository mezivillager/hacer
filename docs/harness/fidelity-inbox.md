# Fidelity inbox — proposals waiting for the owner

The fidelity role (`fidelity-brief.md`, ADR-0018) never files an issue for a proposal. It queues
the proposal here, in the issue form, and waits. **The owner approves by changing `status` to
`approved` (or saying "approve FID-00N"); declines by setting `declined` with a one-line reason.**
Only an approved entry is filed — by the coordinator or triage, never by the fidelity agent — as an
issue labelled `fidelity` under the target epic, and the entry then records the issue number.
Declined entries stay, so the same proposal is not made twice.

## Entry format

```markdown
### FID-NNN · <one-line proposal>
- **Date:** YYYY-MM-DD · **Target epic:** #139 spine | #142 surfaces | #147 horizon | #140 core
- **Status:** proposed | approved | declined (<reason>) | deferred (<until>) | filed (#n)
- **Why:** <the finding, with its source — file:line, book section, URL and fetch date>
- **Review note:** docs/research/<note>.md

**Draft issue body**
## Goal
## Acceptance criteria
## Verification command
## Blocked by
```

Ids are sequential and never reused. Target epics: `#139` spine, `#142` surfaces, `#147` horizon,
`#140` core. An entry's draft body follows the agent-ready issue form in
`docs/research/2026-09-18-agent-readiness/WORK-SYSTEM.md` §2 so filing it is a copy, not a rewrite.

## Queue

### FID-001 · Adopt the reference clock contract for Phase 0.6: tick samples, tock commits
- **Date:** 2026-09-18 · **Target epic:** #139 spine
- **Status:** deferred (owner, 2026-09-19: "they need to wait until other surfaces have caught up first" — revisit when the surfaces epic #142 exits)
- **Why:** `docs/roadmap/phases/phase-0.6-arithmetic-sequential.md` §0.6.1 says a DFF's output changes on the rising edge and §0.6.3 applies state changes on both edges. The book's Appendix A §A.7 says outputs "stabilize to new values only at tocks"; the reference `../web-ide/simulator/src/chip/builtins/sequential/dff.ts` reads `in` on `tick()` and writes `out` on `tock()`; official `Bit.cmp` row `3+` has `out=0` after tick and row `4` has `out=1` after tock. A rising-edge DFF fails the oracle at its first sequential row.
- **Review note:** docs/research/2026-09-fidelity-review-roadmap.md §3.2

**Draft issue body**
## Goal
Phase 0.6's clock model is the reference's: `tick` = evaluate, then every clocked part samples its inputs into internal state; `tock` = every clocked part commits state to its outputs, the time counter increments, then evaluate; the `.cmp` `time` column reads `N` after tock and `N+` after tick.
## Acceptance criteria
- Rewrite §0.6.1 and §0.6.3 to the two-phase sample/commit model; remove `onClockEdge(edge: 'rising' | 'falling')`.
- Tests named in the phase page: `DFF`, `Bit`, `Register`, `PC`, `RAM8` official vectors pass through `runTest`, including the `time` column.
## Verification command
`pnpm exec vitest run src/core/testing` (once #207 lands the parser constructs)
## Blocked by
#190 (one engine ADR), FID-002

### FID-002 · A chip *instance* model with clocked pins, before the one-engine lowering (#190)
- **Date:** 2026-09-18 · **Target epic:** #140 core
- **Status:** deferred (owner, 2026-09-19: "they need to wait until other surfaces have caught up first" — revisit when the surfaces epic #142 exits)
- **Why:** `src/core/chips/types.ts:7` makes a builtin a pure function and `src/core/chips/evaluateChip.ts:12` caches one compiled closure per *definition*; two DFF parts have nowhere to keep separate state. `src/core/hdl/compiler.ts` step 4 rejects `Bit.hdl`'s `Mux → DFF → Mux` loop as a cycle, while Appendix A allows a loop "through a clocked pin" and the reference cuts dependency edges at clocked inputs (`../web-ide/simulator/src/chip/chip.ts:614-618, 675-679`) and infers a composite's clocked pins as those with no in→out path (`../web-ide/simulator/src/chip/builder.ts:242-246`). Project 5 vectors also address internal parts by name (`ARegister[0]`, `RAM16K[0]`, `ROM32K load`).
- **Review note:** docs/research/2026-09-fidelity-review-roadmap.md §3.2, §3.3, §4

**Draft issue body**
## Goal
#190's ADR decides the instance model first: a compiled chip is instantiated into a part tree with per-instance state; `CLOCKED` is parsed (`src/core/hdl/types.ts:30`) and inferred; both schedulers cut edges at clocked inputs; internal parts are addressable by name for `output-list`, `set` and `load`.
## Acceptance criteria
- ADR names the instance model, the clocked-pin rule (declared for builtins, inferred for composites), and the addressing scheme; the spike compiles `Bit.hdl` and `PC.hdl` without a cycle error.
- Test: `compileHDL` of a chip with a loop through a DFF succeeds; the same loop through a `Not` fails.
## Verification command
`pnpm exec vitest run src/core/hdl src/core/chips`
## Blocked by
—

### FID-003 · Roadmap corrections where the text contradicts the oracle or the code
- **Date:** 2026-09-18 · **Target epic:** #139 spine
- **Status:** deferred (owner, 2026-09-19: "they need to wait until other surfaces have caught up first" — revisit when the surfaces epic #142 exits)
- **Why:** (1) `phase-0.5` §0.5.6 promises a "multi-pass convergence" fallback that would accept combinational loops Appendix A rejects ("to avoid uncontrolled data races") and the code refuses (`src/simulation/topologicalEval.ts:117-123`); (2) `phase-0.7` §0.7.5 says reset "clear[s] registers" while `ComputerAdd.cmp` row 7 shows `PC=0` and `DRegister=5` after `reset=1`; (3) `vision.md` lists "Propagation delays and setup/hold times" under a zero-delay model ("The operation of combinational chips is instantaneous").
- **Review note:** docs/research/2026-09-fidelity-review-roadmap.md §1, §3.1, §3.3

**Draft issue body**
## Goal
The phase pages state what the N2T engine does and does not do: combinational loops are rejected by design; a DFF built from NANDs, delays and setup/hold belong to a separate delay-model engine (FID-004); chip-level `reset` resets PC only.
## Acceptance criteria
- §0.5.6 fallback sentence removed; §0.7.5 reset wording corrected; `vision.md` Phase 2 timing bullet moved under the horizon engine with a pointer.
- `implementation.md` stale rows (Stryker, scheduled E2E, unchecked compiler/engine boxes) reconciled or the file demoted per ADR-0013 / #148.
## Verification command
`pnpm run lint:docs`
## Blocked by
—

### FID-004 · "Below the NAND" as three engine tiers; first step a delay-model engine
- **Date:** 2026-09-18 · **Target epic:** #147 horizon
- **Status:** deferred (owner, 2026-09-19: "they need to wait until other surfaces have caught up first" — revisit when the surfaces epic #142 exits)
- **Why:** `docs/north-star.md` names transistors and device physics as the direction with no model behind it. Three honest tiers exist — gate level with delays and X (Logisim, DigitalJS), switch level (Bryant 1984), circuit level (SPICE-class) — and each has a test that separates real from fake. The first tier already has an oracle: a NAND-built master–slave DFF must pass the builtin DFF's `.cmp` vectors through the delay engine.
- **Review note:** docs/research/2026-09-fidelity-review-roadmap.md §5

**Draft issue body**
## Goal
A research note (no product code) that defines the three tiers, what each can show honestly, what would be fake at each, and the acceptance test for tier 1: an SR latch from two NANDs holds state and a NAND-built DFF passes `DFF.cmp`/`Bit.cmp` through an event-driven unit-delay engine with 0/1/X and an oscillation cap.
## Acceptance criteria
- Note under `docs/research/` with cited sources for each tier (switch-level papers read, not recalled).
- A proposed engine-mode seam that leaves the N2T engine untouched.
## Verification command
`pnpm run lint:docs`
## Blocked by
FID-002

### FID-005 · Honest scale and performance budgets for 0.6/0.7
- **Date:** 2026-09-18 · **Target epic:** #139 spine
- **Status:** deferred (owner, 2026-09-19: "they need to wait until other surfaces have caught up first" — revisit when the surfaces epic #142 exits)
- **Why:** `phase-0.6` §0.6.2 justifies a sparse `Map` with "<50MB" when a dense `Uint16Array(16384)` is 32 KB; the real cost is a hierarchical RAM16K of 262 144 DFF instances per eval, which the reference avoids by shipping RAM chips as builtins. `phase-0.7`'s "<200ms per instruction" and `vision.md`'s "<16ms for 1000 gates" have no benchmark in the repo.
- **Review note:** docs/research/2026-09-fidelity-review-roadmap.md §1, §3.2, §3.3

**Draft issue body**
## Goal
Budgets are measured, and scale comes from a stated builtin-substitution policy (a user chip used as a part may run as its builtin, as the reference does), not from sparse storage.
## Acceptance criteria
- A benchmark fixture (1000-gate Project-1 netlist; `RAM8` through `RAM16K` hierarchical vs builtin) with numbers recorded in the phase page.
- §0.6.2 rewritten around the substitution policy; §0.7 exit tied to `ComputerAdd/Max/Rect` vectors plus an interactive `Fill` run.
## Verification command
`pnpm exec vitest run src/simulation src/core/testing`
## Blocked by
FID-002
