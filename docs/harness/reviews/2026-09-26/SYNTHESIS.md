# Synthesis — cycle 2026-09-26

The coordinator's consolidation of the three reviews of `BRIEF.md`: `reviews/1.md` (2026-09-26),
`reviews/2.md` and `reviews/3.md` (2026-09-27). It was written 2026-09-27, in the run whose rulings
are `docs/decisions/rulings/2026-09-27-review-followups.md`.

Every finding appears once. **Raised by** names each review and its finding id; "notes" means review
2's evidence notes. **Valid** means reproduced or measured by a review and kept. **Partly** means the
part that holds is kept. **Not adopted** gives the reason. **Carried by** names the issue, PR or
ruling that does the work; *owner* means a decision in the table at the end.

## Where the three agree

- **The spine didn't move.** The flow moved the foundation and the engine; the spine is at one task of 16.
- **The merge step is the biggest risk to autonomy.** Two reviews independently measured the same
  cause (S1).
- **Keep:**
  - a fresh verifier that can block a green PR;
  - red-first commits;
  - `pr-hygiene` never executing PR code;
  - the computed foundation gate;
  - the ledger's second-occurrence rule;
  - the cloud lane for heavy builds.
- **Run a fresh-context review every two weeks.** That is this directory (`../README.md`).

## Findings

| Id | Finding | Raised by | Severity | Valid | Carried by |
|---|---|---|---|---|---|
| S1 | A pending run dropped by a required workflow's concurrency group leaves an empty cancelled suite. When that suite is the newest, the merge box waits forever while every check is green (#486, #511, #517, #525). | 1·F1, 3·F1 | critical | valid: measured on #517 and #525; the body-edit recovery was proven on #517 | #530, R746 |
| S2 | The merge tool lives on the laptop, untested, and a cloud session cannot finish a PR | 1·F2, 3·F7 | high | valid | #536 |
| S3 | A claim ref is not an exclusive claim, and `ready` ignores claim refs | 3·F2, 2·F13, 1·F7 | high | valid: reproduced | #531 |
| S4 | The eight-slot cycle exists within one listing and resets on every call, so successive top picks drain buckets in order | 3·F3, 2·F14 | high | valid: reproduced on a fixture. Not shown to have caused the one-spine-PR week | #535 |
| S5 | #193, the spine's oracle (Projects 2–5 vectors), was held by the cloud lane from 09-23 | 1·F4, 3·F4 | high | valid | R743; Project 2 is building under R749 |
| S6 | Runs stop on a browser-read meter, with no hard stop | 1·F3, notes | high | valid | #537 for the repo rule; the global run skill is an owner decision |
| S7 | Rule and practice disagree: docs PRs merge on the coordinator's review, and fixes after a BLOCK merged without a second verdict (#319, #444) | 1·F5, 3·F5 | medium | valid | #537 |
| S8 | No tool counts escaped defects, and the four numbers of `docs/harness/README.md` § What to measure are not printed | 1·F6 | medium | valid | #539, #156 |
| S9 | Run merge totals are hand-counted. The brief's 13 for 2026-09-23 is 17 distinct, or 15 without the two record PRs. | 3·F6, 2·F16 | medium | valid: the brief was wrong | #538 |
| S10 | The per-run ceremony has one writer and few readers, and the end-of-run file repeats the session record | 1·F8, notes | medium | valid | #537; #471 ratchets the unlinked rulings |
| S11 | The ruleset is the only hard control, and its extra-approval flag covers Copilot PRs only | 1·F9 | medium | valid | #537 (P-008); a bot identity is an owner decision |
| S12 | Every `feat`/`fix` merge cuts a release (48 in eight days, 31 minor versions); process PRs are titled `feat(harness)` | 1·F10, 3 §5 | low | valid | #537 |
| S13 | The docs agents read first are heavy: `AGENTS.md` is 298 lines, `.claude/CLAUDE.md` points at `tasks/todo.md`, and one README row runs 836 words | 1·F11, 3·F8 | low | valid | #152, #148 |
| S14 | The backlog outgrows shaping: after the seeding day, 132 opened against 106 closed; 76 unshaped, 64 `risk:2` | 1·F12 | medium | valid | #540, plus a close-or-shape pass each cycle |
| S15 | `projects` counts `on-request` and `not-pulled` tasks as ready, while `ready` does not | notes | medium | valid | #540 |
| S16 | Dormant mode is not computed. Its PR-count half is manual, and its "no human merge" half cannot be measured while agents act as the owner | notes | medium | valid | #540 |
| S17 | Product progress is read from process counts. Report product exits separately: vendored projects and their conformance count, a file-based `hacer test`, a read-only MCP workflow, the first spec-compiler path | 2·F15, notes, 1 §7, 3 §7 | medium | valid | #539. The product path (#279 → #204 → #205 → #208) stays in the foundation picks |
| S18 | #519 (DL-3) has been blocked by the cloud lane's own verifier since 09-25 | the coordinator, from S5 | medium | valid | R745 |
| S19 | The cycle after the foundation plan's phase C is not fully stated | notes | low | valid | owner, when phase C approaches |
| S20 | husky prints a v10 deprecation, and the `lint-staged` major (#496) waits because CI never runs the hooks | `BRIEF.md` §5, 1 §10 | low | valid | #541 |
| S21 | Mission Control's hourly refresh is best-effort (an archive from 16:17Z was the latest at 18:44Z) | 1 §2 | low | partly: GitHub's cron is best-effort by design | not carried; the freshness banner already shows it |
| S22 | Stop labelling a PR in a second call, since the burst feeds S1 | 1 §5, 3 §5 | low | not adopted: `gh pr create --label` still delivers `labeled` after `opened`, and S1's fix removes the harm | — |

## Corrections to the brief

The reviews' checks overturned these claims in `BRIEF.md`:

- **The 09-23 run's merge count:** it was 17 distinct PRs, not 13 (S9).
- **Minor versions:** "30 minor versions" is 31, across 48 releases.
- **#459's verification:** it did not merge "on its third verification attempt". Its thread has one PASS; the two earlier attempts were interrupted before posting.
- **Required-check cancellation:** `cancel-in-progress: false` did not fix it. #517 is the counterexample (S1).
- **The extra-approval flag:** "nobody has examined the flag" no longer holds. Review 1 examined it and found it inert (S11).

## Tools

| Tool | Verdict | Why |
|---|---|---|
| Merge queue | not available | GitHub offers merge queues to organization-owned repositories; this one is user-owned |
| Bot identity or GitHub App | defer (owner) | It adds a credential to guard, and the required checks already gate every merge |
| Differential testing against `../web-ide/` | yes, after #193 | #338 stays in the cloud lane as verification (R744) |
| Mutation testing | not adopted | ADR-0011 stands. Review 1 suggested one timed spike on `src/core/hdl`; not scheduled |
| Flow metrics: lead time, blocked-once | yes | #539 |
| release-please, changesets | no | Fix the commit types instead (S12) |
| Renovate | no | Dependabot groups and merges |
| OpenSSF Scorecard | yes, advisory | #542 |
| knip | not now | It overlaps `lint:e2e-exports`; one run can come with a later cycle |
| OpenTelemetry for tokens per PR | not now | Sum `usage` from the session transcripts first (#156) |
| Scheduled cloud agents | after S2 | A scheduled review is an owner decision |
| Evals for the briefs | not now | Keep the phrase pins in `scripts/skills.logic.mjs`, and add a replay when a pin misses a real miss |

## Priorities and new projects

The reviews disagree on how to share the pick slots, and that decision is the owner's:

- **Review 1:** give the spine two slots; lineage and mission-control share one.
- **Review 2:** a bounded two-week reversal — 3 foundation, 3 product (spine plus the headless
  chain), 1 shared process slot, 1 aux.
- **Review 3:** keep the written cycle, fix S3, S4 and S5 first, and reverse only if the spine is
  still at one PR after two weeks of a picker that honours the cycle.

All three agree that S3–S5 come first, so the run fixes them whatever is decided.

**New projects:** none. The agent API review 1 sketched is the foundation chain above. Below the
NAND is #230 in `horizon`, picked when the owner asks. The research lab is served by publishing the
numbers (S17).

## Owner decisions

| Decision | Reviews | Recommended | If unanswered |
|---|---|---|---|
| The pick slots for the next two weeks | 1 and 2 reverse; 3 keeps | keep the cycle until #535 lands, then decide on two weeks of evidence | keep the written cycle |
| Outcome-bounded runs in the global run skill | 1 | yes | the repo rule only (#537) |
| Run this review on a schedule, in the cloud | 1, 2, 3 | yes, once #536 lands | the owner starts each cycle |
| A bot identity | 1, 3 | defer | defer |
| Bring back mutation testing | 1: one spike; 3: no | no | ADR-0011 stands |
| The cycle after phase C | 2 | decide when phase C approaches | unchanged |

## What the next cycle checks

- S1–S5 landed and measured: no stuck merge box, exclusive claims, picks that follow the cycle,
  and Projects 2–5 vendored.
- The conformance count on Mission Control.
- Whether the spine moved.
- Which of this synthesis's rows are still open.
