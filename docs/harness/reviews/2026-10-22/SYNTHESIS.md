# Synthesis — cycle 2026-10-22

The coordinator's consolidation of the two reviews of `BRIEF.md`: `reviews/1.md` and `reviews/2.md`, both
2026-10-22, at `origin/main` `68ded0de`. It was written the same day, in the run whose ruling R885
recorded the coordinator's decisions below.

Every finding appears once. **Raised by** names each review and its finding id (1·F5 is review 1's F5);
"brief" means the brief writer, who is the coordinator. Where the reviews rate a finding differently,
**Severity** keeps the higher. **Valid** means reproduced or measured by a review and kept. **Partly**
means the part that holds is kept. **Decision, carried by** names the issue, inbox entry, PR or ruling
that does the work; *owner* means a row of the table at the end, and until he answers nothing changes.

## Where the two agree

- **Forward, on a narrowing front.** The engine gained a spec model, one engine, an importer and a
  grading path checked against the reference. The ladder barely moved: the spine is at 4 of 16.
- **The biggest risk has one cause.** Review 1 names a loop that nothing starts or refills; review 2
  names a plan nobody shapes. Both trace it to shaping not being a stage (S1), and both rank it first.
- **Keep:**
  - claim → build → a fresh verifier that can block → `merge-on-green`, with its stale-green refusal;
  - the differential harness and the acceptance corpus;
  - rulings that state their cost if wrong;
  - the health lines in `ready`.
- **The brief held.** All eleven claims held, with the corrections below.

Where they differ:

- **#907's severity:** medium in review 1, high in review 2. Both say it waits for the owner (S9).
- **S1's trigger:** review 1 fires when fewer than three product tasks are pickable, review 2 when a
  foundation or spine slot has nothing pickable. The decision follows review 2.
- **The pick cycle:** review 1 gives the spine a second slot once it has pickable tasks, review 2 keeps
  the written cycle. It stays as written (see *Not carried*).

## Findings

| Id | Finding | Raised by | Severity | Valid | Decision, carried by |
|---|---|---|---|---|---|
| S1 | Shaping is not a stage of the loop, so the plan stalls while the loop stays busy. #379 was unblocked on 2026-10-15 and shaped on 2026-10-22, after 76 merges; at 09:13Z, 10 of 11 pickable tasks were inbox reviews; `ha-next` §1 says to stop when nothing is pickable | 1·F1, 2·F1 | high | valid: measured by both | filed: #949 |
| S2 | The verifier gate is held by memory: `merge-on-green` reads check runs, never a verdict. 19 of 204 agent PRs merged with no PASS posted, and 17 more had commits authored after it (four change code: #698, #721, #709, #711). Since 2026-10-17 both counts are 0 | 1·F3 | high | valid: measured (review 1, M1); review 2's 79 of 79 code PRs with a verdict in Mission Control's window agrees | HRN-021 (review issue #933) |
| S3 | Conformance progress is not computed: `runner: null` over 120 vendored files, while the Project 1 scenarios and the differential job already yield a count | 1·F9, 2·F7 | medium | valid: measured by both (C5) | filed: #950, from the scenario suite (16 of 16 in 5.9 s). Not `agent-ready`: `snapshot.ts` has 21 direct production importers |
| S4 | A review's evidence counts toward its PR's 400 lines: `classifyFile` exempts only `docs/research/*/evidence/`, and this cycle's two review PRs landed at +364 (#944) and +392 (#947). The standing brief §2 still lists the cloud lane, whose inbox has not changed since 2026-09-27 | brief (`BRIEF.md` §6) | low | valid: measured | filed: #951 |
| S5 | ADR-0018 §2 is not the rule practised: 13 rulings covered 14 core PRs in one run, and 15 of 43 semantic-path PRs had a fidelity verdict before merge. #914 and #920–#922 had none | 1·F4, 2·F4 | medium | valid: measured. The brief's 16 counts #911, whose only verdict is the digest posted 10 minutes after its merge. #904 changes no non-test file under `src/core/**`, so §2 did not ask for its review. R879's unmeasured premise (a pin declared twice) holds on reading: web-ide's `Pins.insert` asserts against it (read, not run) | HRN-023 (review issue #935) settles the rule. The four unreviewed PRs are covered by the digest posted 2026-10-22 on #922 (issuecomment-6337349284) |
| S6 | Verifiers judge one defect class two ways, so "0 BLOCK" measures temperament: #725's blocked on a non-terminating id walk, #826's passed one the PR introduced, as a nit | 1·F8 | low | valid: measured (review 1, M5) | HRN-024 (review issue #936) |
| S7 | The red-commit rule is applied to one kind of PR: R859 re-opened #837 so that a failing commit never reaches `main`, yet every red-first PR rebase-merges one (#753's `204c8c5f` is `23105d0e` on `main`, 18 of 57 tests failing) | 2·F9 | low | valid: measured | HRN-019 (review issue #929) |
| S8 | Ledger rows go stale after their fix merges: L069 and L070 say `no` after #886, #890 and #894, and L071 says nothing watches `main` while `ready` prints `main: workflows green` (#899) | 1·F10, 2·F8, C11 | low | valid: measured | fixed in this run's records PR |
| S9 | #907 (`sev:critical`) waits for the owner under `bot-filed`, though the pick rule's first step is any open `sev:critical` bug. The #867 panel found its shape while deciding FID-030 and the coordinator filed it; #906, from the same decision, was filed four minutes earlier and merged as #908 after 35 minutes | 1·F5, 2·F2 | high | valid: measured. The case against stands: `bot-filed` stops the loop granting itself work, and #907 is a false pass on one looping-wire shape, not data loss | owner (1) |
| S10 | The review roles feed a treadmill: the run decided 32 inbox entries while 31 arrived; HRN entries stand at 17 filed, 0 declined, 0 deferred and 10 proposed; panels took 24.5% of the run's subagent tokens (4.60M of 18.75M), before the 64 `run-reviews` sessions | 1·F6, 2·F3 | high | valid on the counts; the cost per approved one-line fix (about 455k tokens) is inferred. Partly: panels also shaped (FID-023 narrowed, FID-027 and PRD-003 folded) | owner (2) |
| S11 | The loop never starts itself: no PR of any author merged from 2026-10-05 to 2026-10-14T21:59Z, and none of the four scheduled workflows picks or builds work | 1·F7, 2·F6 | medium | valid: measured (C8) | owner (3) |
| S12 | #257 (browser QA for critical PRs), `agent-ready` since 2026-09-18, was passed over in four runs (10-04, 10-14, 10-17 by R845, 10-21 by R875), each time priced as one more run | 2·F5 | medium | valid: measured | owner (3) |
| S13 | The spine is held by three stacked gates, and `ready` names none: 12 of 12 open spine issues read `unshaped`; #177 is `risk:2` outside the gate's rows; ADR-0018 §2 wants a fidelity verdict on epic #139, which has none; its body predates ADR-0020 §6. Its blockers closed on 2026-09-27 and 2026-10-15 | 1·F2 | high | valid: measured. The case against stands: foundation first, and Project 2 work could be redone when N.4–N.11 land | owner (4). The next run dispatches the fidelity verdict on #139 |
| S14 | #801 (`sev:high`, an unsaved circuit is lost on reload) is filed under `project:polish`, which `ready` reads as `on-request`; the `bugs` row's "no `sev:high` open > 7 days" breaks on 2026-10-24 | 1·F11 | low | valid: measured | owner (5) |
| S15 | `size-override` is human-applied (`docs/harness/issue-form.md`), yet four rulings applied it (R784, R812, R833, R847) | 1·F10, C10 | low | valid: held by both | no change: the 2026-10-21 run declined to apply it and split the records PR instead (#924 into #925–#927) |

## Corrections to the brief

The reviews' checks changed these claims in `BRIEF.md`:

- **C3, "16 of 43":** 15 had a fidelity verdict before merge. The sixteenth, #911, is the post-merge digest (S5).
- **C2, "14 core PRs":** one of them, #904, changes no non-test file under `src/core/**`, so §2 did not require its review.
- **C9, "30 approved":** three of them (FID-023, FID-027, PRD-003) are folds into existing issues, not new ones.
- **C6:** Mission Control's list of PRs without a verdict also holds 14 Dependabot PRs and #775.
- **The pickable queue:** "4 pickable at 08:40Z" became 11 at 09:13Z, `agent-ready` went from 22 to 29 and open issues from 121 to 128 while the reviews ran. By 09:20Z, 7 foundation tasks were pickable. The next run starts from a different queue than the brief describes.
- **The cloud lane:** the brief's "last changed 2026-09-27" is the lane's inbox; `docs/harness/cloud-queue.md` itself changed on 2026-10-04.

Hypotheses: H1 held in part (an override cannot be measured, and the *against* is S10). H2, H3, H4, H5, H6, H8 and H9 held. H4 holds as a mis-specification more than erosion (review 1), and with four more unread PRs (review 2). H5 holds, and the cause is shaping (S1). H7 was not testable, since a subagent cannot read the meter.

## Tools

| Tool | Verdict | Why |
|---|---|---|
| A verdict check in `merge-on-green` | yes | S2: pure logic over data the tool already fetches |
| Scheduled cloud routines | owner (3) | Bounded by PR count, since a cloud session cannot read the meter |
| `differential` as a required check | not carried | A ruleset change, which only the owner makes; it is already on the brief's list of what waits for him (§3) |
| Generated HDL shapes through the harness | not carried | HRN-023 settles the rule; #200, the generated-circuits job, stays in the backlog |
| Mutation testing | no | ADR-0011 stands |

## Not carried

No action this cycle, each for the reason given:

| Proposal | Raised by | Why |
|---|---|---|
| Ratchet the foundation exit greps (`CircuitState` and `junction`, named by 6 and 51 non-test files) | 2·F7 | S3 covers conformance only; the foundation row's sub-issue count (22 of 33) shows on Mission Control meanwhile |
| A `passed over ×n` counter in `ready` | 2·F5 | S12 is the owner's call (3) |
| A standing retro check of `no — second occurrence` ledger rows | 1·F10 | This run's records PR fixes the three rows |
| The "queue up" rule putting plan slices ahead of follow-ups | 2·F1 | S1's line is the part carried |
| Batching the parity findings no official vector reaches; re-raising FID-001 and FID-002 when #177 is shaped | 2·F3 | S10's owner row covers the panel's load |
| An inbox inflow-against-outflow series on Mission Control | 2·§6 | Not decided |
| The README's "~2M subagent tokens per run" budget row | 2·§5 | Not decided; HRN-027 (proposed) covers how the token figure is counted |
| Review 1's cycle (the spine in the second `mission-control` slot) and its "stop reserving a slot" | 1·§5, §7 | The written cycle stands. Review 1 makes its change conditional on (4); review 2's change is S1 |
| A Phase 0.6 entry as a project, and re-scoping the 12 spine issues against ADR-0020 | 1·§8, 2·§8 | It is (4); its first tasks wait for the owner's answer |

## Owner decisions

Recommended by the coordinator; until he answers, nothing changes.

| # | Decision | Findings | Recommended | If unanswered |
|---|---|---|---|---|
| 1 | #907 and the `bot-filed` rule | S9 | A bug the loop measured from its own code may be made `agent-ready` by the panel or the coordinator; `bot-filed` stays for outside content | #907 waits for his label |
| 2 | The inbox treadmill and the panel's cost | S10 | One panel per run for HRN entries, and a cap on harness builds while product work is pickable | R844 unchanged: a panel per entry |
| 3 | The loop starts only by hand, and #257 | S11, S12 | Connect GitHub to the Claude account, which unblocks cloud routines and #257 | He starts every run; #257 stays passed over |
| 4 | The spine's three gates | S13 | Pull Project 2 forward under `project:foundation`, after a fidelity verdict on epic #139 | The spine waits for phase C |
| 5 | #801 and `sev:high` data loss under polish | S14 | Move it to bugs | It stays `on-request` |

## What the next cycle checks

- S1 fired: a `shape due:` line led to a shaped plan slice, and N.4–N.6 merged. Measure the share of
  merges from a plan slice rather than an inbox entry or a follow-up (the last run: 28 of 52 harness,
  23 foundation, 0 spine).
- The conformance count shows on Mission Control (S3).
- HRN-019, HRN-021, HRN-023 and HRN-024 landed or were declined, and #933, #935, #936 and #929 closed.
- Harness merges against product merges in a run where product work was pickable, and inbox inflow
  against outflow.
- Which owner decisions were answered, and whether a run began without the owner starting it.
