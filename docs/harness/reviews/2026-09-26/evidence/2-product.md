# Independent product, priorities and verification assessment

Measured 2026-09-27 on `eeb925320d50a1ef23c20aa12e6e67c9b411cdb9`. This assessment was formed
without reading the existing process review (`../reviews/1.md`). It distinguishes observations from
recommendations; no portfolio policy, issues, product code or external state were changed.

## Finding: useful foundation work, insufficient evidence of product progress

**Judgment:** the architecture and test evidence justify foundation-first work. They do not yet
justify treating the process's throughput as progress toward the full North Star. Nor does the
evidence establish that the process has become wholly self-serving. A small current-phase engine
already works; the missing proof is that a learner or another agent can consume it through the
declared surfaces, while the replacement architecture advances through executable exits.

Evidence:

- The North Star names agent parity, current Phase 0.5, the 0.5→0.7 ladder, below-NAND work and a
  research lab (`docs/north-star.md:10`, `:16`, `:20`). It explicitly says platform phases must not
  supersede that ladder.
- The foundation audit locates the tangle in state, not everywhere in the engine
  (`docs/research/2026-09-21-foundation-audit/REPORT.md:43`). Its own correction records that much
  of the existing state/core/simulation suite already ran headlessly (`:66`). The audit is a dated
  measurement, not a claim those exact counts remain current.
- Current code tests all 16 Project-1 chips as builtins and the 15 composite chips compiled from
  NAND (`src/core/testing/engine.test.ts:130`, `:151`). The focused verification below passed.
  Those are two implementations of a Project-1 catalogue, **not 31 distinct curriculum chips**.
- The shipped code does not contain the circuit-spec `parseSpec`, `compileSpec` or
  `fromLegacyCircuit` entry points. The identically named `parseSpec` under `scripts/wt-new` parses
  worktree branch specifications. Search scope was `src`, `scripts`, `package.json` and workflows.
  ADR-0020 itself identifies the unshipped parser/compiler as the weakest remaining assumption
  (`docs/decisions/0020-spec-only-writes-read-only-projections.md:1167`).
- Foundation Phase N has a user-visible exit: one scenario through CLI, MCP and a rendered view
  plus an imported legacy circuit rendered in 3D. Phase C has both capability-parity and deletion
  exits (`docs/research/2026-09-21-foundation-audit/REPORT.md:310`, `:313`, `:325`). Counting closed
  issues or shrink-only architectural violations does not establish these exits.

**Strongest counterargument:** the owner deliberately prioritized architecture and process, and an
architecture migration often delivers product value only when several preparatory changes meet.
The right response is a bounded outcome check, not a reversal of the architecture or a demand for
weekly new UI features. Preserve ADR-0020's declared circuit model, one engine and both renderers.

## A product path is already authorized before phase C

The brief's statement that the `surfaces` row is outside the cycle until C is accurate about the
row, but incomplete about what can ship. The foundation plan already names an unblocked path:
`#279 → #204 → #205 → #208`, scenario ids → file-based `hacer test` → CLI scenario driver →
read-only MCP. It explicitly avoids the store (`docs/research/2026-09-21-foundation-audit/REPORT.md:221`).
`project:foundation` pulls that work into the cycle without discarding its original project label
(`docs/portfolio.md:64`). This is execution of an existing plan, not a proposal to build a competing
surface architecture or a future full Agent API.

**Recommendation:** make this one bounded product outcome stream alongside the N.1 spec/compiler
stream and the most consequential autonomy repair. Do not spend another research cycle proving that
the CLI is allowed. Inspect actual issue dependencies before dispatch; do not infer readiness from
the research plan's dated issue status.

## Two-week discriminator and measures

At the next review, compare artifacts at the same revision, not PR counts:

| Measure | Baseline established here | Requested next evidence |
|---|---|---|
| Current-phase engine semantics | 16 builtin Project-1 chips and 15 composite variants pass the existing official-fixture tests | Retain the same cases and report exact case identifiers, failures and exclusions |
| Consumable surface capability | No `hacer` file-based CLI entry found; recovered pure scenarios have one driver in `src/scenarios/drivers` | A documented file-based CLI runs the Project-1 catalogue; one read-only MCP workflow runs the same fixtures |
| Replacement architecture | Spec parser/compiler absent from product source | First shipped N.1 path runs the ADR's pass-through, slice, split and alias-cycle fixtures through the actual lowering, not manually lowered HDL |
| Capability preservation | ADR-0020 freezes 24 rows, two explicitly nongating | Report runnable status per gating capability and driver, including unsupported status rather than a vacuous green |
| Human outcome | No learner success or learning result measured in this assessment | A repeatable task: load/design a chip, obtain its first correct test result, explain a failing vector; record interventions and failure points |

These are proposed acceptance outcomes, not predictions about delivery time. If dependencies make
one infeasible, record which dependency blocked it and its executable exit. More process PRs with
none of these artifacts would strengthen the self-consuming-process hypothesis. A working CLI/MCP
path plus an actual new-model fixture is stronger contrary evidence than a larger issue-close count.

Do not report zero Project-2/3 passes as a current-phase failure: those belong to Phase 0.6, while
current Phase 0.5 already has meaningful conformance. Equally, a stable Project-1 pass total alone
cannot show progress toward a new surface or a learner outcome. Report the dimensions separately.

## Priorities: an explicit, bounded reversal

**Proposed reversal of owner priority:** for the next two-week outcome window, reduce the three
process rows' guaranteed allocation from three of eight slots to one shared process slot, and use
the two released slots for the existing product path. This reverses the guaranteed equal footing
given to Lineage and Mission Control on 2026-09-25 and narrows the earlier equal priority for process
work (`docs/portfolio.md:27`, `:48`). It retains foundation-first and does not silently reinterpret
the owner's instructions.

An explicit candidate schedule is three foundation slots, three product slots, one shared
`harness`/`lineage`/`mission-control` slot, and one auxiliary slot. Here **product** means current-phase
spine plus the approved headless-surface chain; it does not authorize new legacy hand-editing work.
The foundation stream still owns the new spec path. Product tasks already carrying the foundation
label must be accounted once against their outcome stream, not twice to make the allocation look
better. Fix the scheduler's realized-pick accounting before claiming this ratio is enforced.

Use the shared process slot for a measured blocker to safe progress: merge validity, stopping,
portable resumption or stale-claim recovery. Dashboard features, historical lineage enrichment and
additional record formats wait unless they resolve that blocker. Preserve the existing visible
status and trace capabilities. The strongest objection is that unfinished process controls can
cause larger losses than delayed product work; retain an explicit critical-blocker exception with
the consumed slot and blocked product outcome recorded.

Phase C remains the right event for removing migration-specific restrictions, because a default
switch without capability parity risks regressions. It is the wrong single event for releasing all
headless product work: that work is already unblocked by item 0.6 of the foundation plan (distinct
from product Phase 0.6). Also
distinguish C.1's renderer switch from C.2's cleanup exit. The post-C policy must explicitly retain a
cleanup stream until `CircuitState`, junction entities and the known-violations baseline are gone;
switching renderers must not strand deletion work. The current prose's restoration of a six-slot
cycle while also retaining Lineage/Mission Control does not state a complete new ordered cycle
(`docs/portfolio.md:48`). Resolve that before the switch.

## Verification: keep what exists; finish the missing consumer loop

| Mechanism | Observed state and source | Recommendation |
|---|---|---|
| Official vectors | Only Project 1 is vendored; upstream commit is pinned (`scripts/sync-vectors.logic.mjs:11`, `:14`) | Complete the existing vector work as phases require; do not call the oracle nonexistent |
| Official-fixture execution | 16 builtin and 15 composite variants execute `.tst`/`.cmp` fixtures (`src/core/testing/engine.test.ts:130`, `:151`) | Expose this existing engine through files and surfaces |
| Fixture fidelity | A test compares all 16 embedded test/compare fixtures to vendored files (`scripts/sync-vectors.logic.test.mjs:68`) | Preserve that linkage; the current runner's embedded fixtures are not wholly unconnected to official files |
| Compiler properties | Exhaustive small permutations and 400 seeded samples at mixed dependency depths exist (`src/core/hdl/compiler.test.ts:251`, `:308`, `:322`) | Extend around real spec-lowering risks; do not recommend starting property testing from zero |
| Parser fuzz / negative controls | Grammar and mutation corpus, diagnostic-count checks and deliberately bad-parser checks exist (`src/core/hdl/parser.fuzz.test.ts:325`, `:353`, `:390`) | Preserve reproducibility and nonvacuity controls; parser rejection alone is not compiler semantic correctness |
| Pure scenarios | Four recovered NAND scenarios run through the core adapter (`src/scenarios/drivers/core.ts:32`, `:123`) | Add generalized capability ids and CLI/MCP adapters as planned; four NAND-shaped scenarios do not prove all 24 ADR rows |
| Differential execution | No executable harness comparing HACER to web-ide found in product code, scripts or workflows; references point to planned work | Finish the existing differential issue; use a pinned public clone in CI rather than a laptop sibling as its runtime dependency |
| Mutation framework | Stryker was removed after the owner reported no actionable findings and repeated blocking (`docs/decisions/0011-remove-stryker-mutation-testing.md:8`) | No broad reinstatement. First use narrow fault injection against known semantic defects; a bounded nonblocking tool trial needs an explicit yield/runtime stop condition |

The historical readiness report called the vector materials MIT
(`docs/research/2026-09-18-agent-readiness/REPORT.md:134`); the actual vendoring code explicitly
records a different materials licence and distinguishes it from web-ide's code licence
(`scripts/sync-vectors.logic.mjs:62`). This is a source discrepancy, not a new legal conclusion.

## Research proposals: small experiments, not three new platforms

Keep one active `horizon` note at a time, as the portfolio already says (`docs/portfolio.md:20`).
A product consumer and a falsifiable question are more useful than expanding the permanent rows.

1. **Below-NAND abstraction experiment.** Research whether a bounded transistor-level reference
   experiment can reproduce the Boolean NAND interface while making the digital abstraction's
   limitations explicit. Deliver a reproducible reference experiment, interface proposal and
   account of where the digital and device models disagree. Keep device simulation out of the
   existing digital evaluator until the question is settled. Success is reproducibility and a
   justified interface; a functioning four-row truth table alone is not device-physics fidelity.
2. **AI design/debug and tutor experiment.** Use the first CLI/MCP loop on a small, versioned set of
   Project-1 design and intentionally broken-chip tasks. Record oracle-correct completions,
   invalid edits, tool calls, interventions and independently checked explanations. Keep design
   success separate from tutoring: a model's correct answer does not establish that a learner
   learned. A small consenting learner study with a later transfer task is the evidence needed
   for the latter. No full in-app assistant is prerequisite.
3. **Research reproducibility packet.** Reuse those design tasks to produce replayable experiments:
   initial spec, oracle/version, model/configuration, allowed tools, seed where applicable, action
   trace, result and measured resource use. A second runner must reproduce deterministic results;
   stochastic AI trials report their variation. The deliverable is an experiment someone else can
   rerun, not another process dashboard. Gate a larger research platform on an external researcher
   successfully reusing a packet.

These serve the three forward intents in `docs/north-star.md:16` without inventing user demand,
learning gains, silicon fidelity, token costs or return-on-investment numbers. Schedule the first
note after the bounded product path is in motion; switch to the next question when its predecessor
has a result or an explicit stop reason.

## Repeatable focused verification

Using the repo's required Node 22 runtime, run from the repo root:

```sh
pnpm exec vitest run --project node src/core/testing/engine.test.ts src/core/hdl/compiler.test.ts src/core/hdl/parser.fuzz.test.ts src/scenarios/drivers/core.test.ts scripts/sync-vectors.logic.test.mjs scripts/backlog.logic.test.mjs
```

Observed: **6 files, 176 tests passed**, Vitest reported 883 ms. This is a focused audit result,
not a full-suite or browser result. The initial attempt selected shell-default Node 14 and pnpm
rejected it; the successful retry selected installed Node 22.22.3. No dev server, browser, 3D render,
package installation or external write was used.
