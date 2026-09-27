# Process review findings — 2026-09-27

Independent review of `BRIEF.md`. Numbers are *measured* on 2026-09-27 unless marked *inferred*.
Command output is in `evidence/2026-09-27-independent.md`. The 2026-09-26 review is `REPORT.md`;
this file does not treat it as an input.

## 1. Verdict

- The flow is moving the foundation and the engine, and it is not yet moving the spine. In eight
  days, 16 of 113 agent PRs touched `src/core` or `src/simulation`, ADR-0020 merged, and Project 1
  is vendored as 16 chips under `conformance/vectors/01/`. One PR carries `project:spine`.
- The single biggest risk to autonomy is the merge step. #517 has been `mergeable_state: blocked`
  since its checks finished at 2026-09-25T07:22Z, with every named required check run green and the
  newest PR Hygiene check suite cancelled and empty. The recovery tool lives on the laptop.
- The highest-leverage change is to stop that empty cancelled suite from being the newest one:
  drop the shared concurrency group on `pr-hygiene.yml` and `browser-qa.yml`, or give each run its
  own group. Until that lands, a green PR is not a merged PR.
- Keep the red-first commit and a fresh verifier that can BLOCK. Both are visible on the traced
  PRs, and #432 and #444 were real catches.

What separates "foundation first, process alongside" from "the process became the product" over
the next two weeks: the spine slot actually fires, and `conformance/vectors/` gains Projects 2–3.
A fortnight of harness, lineage, and mission-control merges with the spine still at one PR would
decide it the other way. Today the written cycle cannot be the explanation either way, because
successive top-picks do not follow it (F3) and the current top pick is another lane's claim (F2).

## 2. Scorecard

| Stage | Rating | Evidence |
|---|---|---|
| Priorities | fragile | One `planReady` listing matches the cycle (foundation, lineage, harness, foundation, mission-control, spine, …). Eight successive top-picks drain one bucket before the next (`backlog.logic.mjs:139`) |
| Task shape | fragile | 76 unshaped, 64 open `risk:2`; blast radius is a command someone has to remember |
| Pick | fragile | `ready` does not see claim refs. Its first pick is #193, whose `claim/193` still points at a 2026-09-23 commit and which has no `in-progress` label |
| Claim | fragile | `ha-next` says a second creation is rejected (`.claude/skills/ha-next/SKILL.md:39`). A second push of the same HEAD exits 0; a descendant fast-forwards |
| Build | works | #365, #432, #459, #488, and #303 each commit a test before the change |
| PR | works | `pr-hygiene` runs on `pull_request_target`, checks out the base, and `contents: read` (`pr-hygiene.yml:47`, `:81`, `:58`). #432's three rounds closed holes in that check |
| Correctness | fragile | `ci`, `pr-hygiene`, and `browser-qa` are required. `strict_required_status_checks_policy` is false, and #407 is still open |
| Judgment | fragile | `ha-next` §4 sends every PR to a fresh verifier. #303 merged on "Coordinator review: PASS". #444's BLOCK was closed by the coordinator's rewrite, with no second verdict |
| Merge | broken | #517 is blocked with green check runs. The newest PR Hygiene suite (`97776650607`) is cancelled and has zero check runs |
| Release | works | `ha-next` §5 cuts a release on every `feat`/`fix` merge. The window's titles include 22 `feat` and 16 `fix` |
| Learning | works | Ledger: 55 rows, 42 mechanised (40 plain yes plus two qualified yes), 4 partly, 8 no, 1 n/a |
| Stop | fragile | Ceilings are a browser read (`docs/harness/usage-rationing.md`). No hook refuses the next turn |
| Memory | fragile | `LINEAGE: 370 decisions · 299 unlinked · 0 unresolved · 9 superseded-cited` |
| Visibility | works | `/control/data/snapshot.json` `generatedAt` 2026-09-27T07:39:13Z; `backlog projects` and `lint:lineage` both run |

## 3. Findings

Severity: **critical** (the loop stops), **high** (a run or the spine stalls), **medium**, **low**.
Effort: S (one PR), M (a few), L (a project). Decider: C coordinator, O owner.

**F1 · critical · A dropped pending run can be the newest required suite, and the PR stays blocked.**
*Claim:* with `cancel-in-progress: false`, the `opened` + `labeled` burst still produces a
cancelled workflow run that has no check run. When that run's check suite is the newest for the
workflow, GitHub reports the required context as not satisfied while every check run of that name
is success. *Evidence:* `pr-hygiene.yml:61-72` and `browser-qa.yml:40-52` describe the burst and
assert that a dropped pending run creates no check run and that the last run decides. On #517 the
cancelled PR Hygiene run's suite id (`97776650607`) is higher than the successful PR Hygiene suite
(`97776650604`); the cancelled suite's `latest_check_runs_count` is 0; `mergeable_state` is
`blocked`. #525 merged the same day under the same ruleset, so the failure is intermittent
*(measured)*. *Cost:* the session record and anything else caught this way waits on a person at the
laptop. #517 has waited since 2026-09-25T07:22Z. *Fix:* remove the `concurrency` block on those two
workflows, or set the group to a value unique per run, so nothing is dropped. Amend
`scripts/required-checks.logic.mjs` to the new shape. Interim recovery that needs no new SHA: an
`edited` event (an HTML comment on the PR body) starts one fresh run of each workflow.
*Effort:* S. *Decider:* C.
*Strongest case against:* the sample of stuck PRs is small, and the "newest suite" rule is read
off #517's ids plus the workflow's own comment, not off a GitHub guarantee. Removing the group
lets a superseded push finish, which costs minutes when `browser-qa` runs Playwright.

**F2 · high · A claim ref does not exclude a second claimant, and the picker ignores it.**
*Claim:* `git push origin HEAD:refs/heads/claim/<n>` is an atomic ref update. It is not an
exclusive create. `backlog.mjs ready` never reads those refs, so a claimed issue with no
`in-progress` label is offered as the next pick. *Evidence:* local repro, same HEAD exit 0
("Everything up-to-date"), descendant HEAD fast-forwards (`evidence/2026-09-27-independent.md`).
Live: four claim refs, three `in-progress` labels; #193 is the missing label and the first row of
`ready`. Its ref points at `712a0360` (2026-09-23T22:47:46Z). The cloud inbox still marks it
`building`. *Cost:* two lanes can build #193, or the local lane waits forever on a pick it should
skip. #338 is the one issue `ready` reports as `blocked:#193`, so the differential oracle waits
with it. *Fix:* create the ref with the GitHub create-ref API, which fails when the ref exists,
and record the claimant in the claim comment. Teach `ready` to treat an open `claim/*` ref as
`in-progress`. Release only when the deleter matches that claimant. *Effort:* S. *Decider:* C.
*Strongest case against:* `ha-next` lists refs before pushing (`SKILL.md:16`, `:50`), and no
duplicate production build showed up in this pass. The pre-check does not close the race, and it
does not help a later session whose `ready` output leads with the held issue.

**F3 · high · The eight-slot cycle exists inside one listing and resets on the next call.**
*Claim:* `planReady` builds the full rotation every time and stores no cursor.
`ha-next` tells a session to take the top pick (`.claude/skills/ha-next/SKILL.md:19`). Doing that,
merging, and calling `ready` again drains the first non-empty bucket. *Evidence:* on a fixture,
one listing begins `foundation, lineage, harness, foundation, mission-control, spine`. Eight
successive top-picks are `foundation, foundation, foundation, lineage, lineage, lineage, harness,
harness`. Live `ready` has 12 foundation, 2 lineage, 22 harness, 4 mission-control, and 1 spine
(#175, `risk:1`, `agent-ready`). Successive top-picks reach that spine issue after those 40
*(inferred from the fixture plus the live counts)*. The merge sequence for 09-18..25 is
queue-shaped (09-18 is almost all harness; 09-25 is harness, lineage, and mission-control), which
matches run queues rather than the printed cycle. *Cost:* a coordinator who follows the skill
literally does not give the spine its slot while foundation or harness still has a ready issue.
*Fix:* start `rotate` at the slot after the project of the latest merged PR, still putting
`sev:critical` first and still applying the foundation gate. Add a test that eight successive
top-picks, with the previous pick removed, equal the first eight of one listing.
*Effort:* M. *Decider:* C.
*Strongest case against:* one listing is already correct and tested
(`scripts/backlog.logic.test.mjs`). The eight days do not prove the reset caused the single spine
PR; those runs followed `queue.json`. The cost is the next run that uses `ha-next` as written.

**F4 · high · The spine's remaining oracle is the picker's first recommendation and another lane's four-day claim.**
*Evidence:* #193 is `project:foundation` and `risk:2`, so the foundation gate does not hold it
(`GATE_EXEMPT_ROWS` includes foundation, `backlog.logic.mjs:56`). Project 1 is already in
`conformance/vectors/01/` (16 chips). Projects 2–5 are not in that tree. The inbox says #193 has
been `building` in the cloud lane since 2026-09-23 and that #338 must wait for it.
*Cost:* Phase 0.6's conformance count stays at zero however many local PRs merge.
*Fix:* post a claim comment that releases the cloud claim, delete `claim/193`, and vendor
Projects 2–5 locally, one PR per project, in the shape of #443. Then #338.
*Effort:* M. *Decider:* C.
*Strongest case against:* the row was queued to spend included cloud usage, and the contract
allows the local lane to take it back. The cost so far is calendar time.

**F5 · medium · The verifier rule and the practice disagree on who may close a review.**
*Evidence:* 63 of 125 merged PRs have no contract verdict. Of the traced set, #303 is a
coordinator self-PASS, and #444 was rewritten and merged on the BLOCK thread. #459 has one PASS
comment; the brief's "two interrupted attempts" are not in that thread. *Cost:* the verdict count
measures the heading, and the commit that answers a BLOCK is the least reviewed commit in the
loop. *Fix:* write the rule that matches the safe half of the practice — a docs-only `risk:0` PR
may merge on the coordinator's review, posted with the contract heading — and make one line hard:
the fix for a BLOCK goes back to a fresh verifier. *Effort:* S. *Decider:* C.

**F6 · medium · Run merge totals in the brief do not match the session record or the calendar day.**
*Evidence:* the brief gives the 09-23 foundation run 13 merges. `docs/harness/sessions/2026-09-23.md:19`
says ten, and its table has ten. The same record later names five more product PRs and two record
PRs. GitHub shows 26 merges that calendar day, nine of them from 10:44Z onward. *Cost:* throughput
arguments that use the run table are off by enough to change the story. *Fix:* attribute merges
with `mergedAt` and the run's start and end, and store that list in the session record.
*Effort:* S. *Decider:* C.

**F7 · medium · The merge tool is outside the repo, and a cloud session cannot finish the loop.**
*Evidence:* `~/.local/bin/gh-merge-on-green` is 128 lines and has no in-repo test. The cloud-queue
contract stops at "Grok Bot will not merge". *Cost:* every merge needs the laptop, on top of F1.
*Fix:* `scripts/merge-on-green.mjs` with a pure logic module and fixtures for pending, cancelled
suite, behind, and a real failure. The local binary becomes a one-line call. *Effort:* M.
*Decider:* C.

**F8 · low · Docs the agent reads first are still the long ones.**
`AGENTS.md` is 298 lines. `docs/harness/README.md:27` is one 836-word row.
`.claude/CLAUDE.md:42` still points at `tasks/todo.md`. #152 and #148 are the harness row's next
work. *Effort:* S. *Decider:* C.

## 4. Keep

A change has to leave these standing.

- **A fresh verifier can refuse a green suite.** #432 round 2 found a new hole in the ratchet
  rule the PR was adding, with the suite at 2278 passed. #444's BLOCK saved `main` from a commit
  that shifts every parse column by +100_000 and from a patch release for a bug that never
  shipped. #365's PASS still forced a correction: the defect did not reproduce through the real
  store actions.
- **Red first is in the history.** Five of the six traced code PRs commit the test before the
  change. #409 is a 23-line Dependabot config with a single commit and a contract PASS.
- **`pr-hygiene` reads and does not run PR code.** `pull_request_target`, base checkout,
  `contents: read`. `ci.yml:13-15` is `contents: read`.
- **The foundation gate is computed.** Eight open issues come back as `foundation-gate`, not as
  a remembered exception. `sev:critical` stays ahead of it.
- **One listing of the cycle is the right specification.** `PICK_ROTATION` matches the line in
  `docs/portfolio.md`, and the test keeps them together. F3 is about persisting that listing, not
  about replacing it.
- **The ledger's second-occurrence rule.** 42 of 55 rows are mechanised.

## 5. Improvements, ranked

1. **F1.** No shared concurrency group on the two required workflows. (S)
2. **F3.** The next `ready` call continues the cycle. (M)
3. **F2.** Exclusive claim create, and `ready` skips an open claim ref. (S)
4. **F4.** #193 local, one PR per remaining project, then #338. This is the item that moves the spine. (M)
5. **F7.** The merge tool in `scripts/`, with tests, so a cloud session can finish. (M)
6. **F5.** Docs-only coordinator PASS in the contract format; a fresh verifier after every BLOCK. (S)
7. **F6.** Session records list the PRs they actually merged. (S)
8. **Stop.** `feat(harness)` on process-only commits, which cuts a minor of the Pages app
   (`ha-next` §5). Use `chore` or `docs` for those. Stop opening a PR and labelling it in a second
   call: that burst is what feeds F1.
9. **A standing review.** Yes, fortnightly, one session, this brief copied forward with §3–§5
   rewritten from a fresh `measure-flow.mjs` run, ten points of meter if the coordinator is on
   Claude. Its value here was F1 still open two days later, and F2 and F3, which the loop's own
   counters do not show.

## 6. Tools

| Problem | Tool | Practice | Cost and fit | First step | Replaces |
|---|---|---|---|---|---|
| F1, and #407 (checks are not strict) | GitHub merge queue | GitHub's own queue re-runs required checks on the combined result | This repo's owner type is `User`. GitHub's merge-queue post says the feature is for public repositories owned by organizations. Not available here | none | — |
| Labels are conventions (F2) | GitHub App / bot identity | A second identity so grants are not the owner's | A credential to guard, and the owner has to create it. The required checks already gate merge | defer | nothing yet |
| No oracle past Project 1 | Differential tests against `web-ide`, after the vectors exist | #338, already filed | One CI job. Fits | F4, then #338 | hand-written expectations for those chips |
| A guard that can pass while wrong (#432 round 2) | Mutation testing on `src/core` | ADR-0011 removed Stryker after it found nothing actionable and blocked runs | A project-wide return is an owner reversal of ADR-0011. A weekly cron off the PR path is the only shape that would fit | do not adopt; the parser fuzz #444 added is the cheaper net | — |
| Flow numbers are a one-off script | Lead time, rework, change-failure from the GitHub data `measure-flow.mjs` already pulls | DORA's four numbers, trimmed to what one owner can read | S, fits | Fold lead time and "blocked at least once" into `collect.mjs` | the hand-counted brief |
| A release on every `feat`/`fix` | release-please or changesets | Batching | Another moving part on a Pages deploy | no — change commit types (improvement 8) | — |
| Dependency drift | Renovate | — | Dependabot is already grouping and merging | none | — |
| Supply-chain posture | OpenSSF Scorecard | Scorecard action, advisory | Free, fits a public repo | add the action, read it once | — |
| Dead exports | knip | A baseline ratchet, same shape as `lint:e2e-exports` | S. Overlaps the e2e-export check | run once, record the count | — |
| Tokens per PR unknown | OpenTelemetry from Claude Code | `CLAUDE_CODE_ENABLE_TELEMETRY` | Infra, and only the local lane | sum `usage` from session transcripts in a run directory | self-reported totals |
| The laptop is the runtime | Scheduled cloud agents | `docs/harness/README.md` on cloud sessions | Same usage meter; needs F7 first | the weekly sweep as a routine after the merge tool is in the repo | `/autonomous` for sweeps |
| Briefs can rot | Replay the verifier on a frozen PR | #303 already pins load-bearing sentences in `scripts/skills.logic.mjs` | S–M | keep the pins; add a replay only after a pin misses a real miss | — |

## 7. Priorities

Written cycle, in force: `foundation → lineage → harness → foundation → mission-control → spine →
foundation → aux`.

Recommended cycle for the next two weeks: the same one, once F3 makes successive picks follow it
and F2 stops offering #193 as if it were free. That is not a reversal of the 2026-09-25
equal-footing amendment (#482) or of foundation-first (#330). The spine already has a slot; one
listing places #175 sixth. The slot is what the implementation drops.

Expected effect if F2, F3, and F4 land: Projects 2 and 3 vendored, and a conformance count for
Phase 0.6 above zero. Expected effect if the picker stays as it is: the next forty top-picks are
foundation, lineage, harness, and mission-control, and the spine slot does not come up *(inferred)*.

An explicit reversal — three foundation slots, one shared process slot, and the freed slots given
to spine and the headless surface chain — is reasonable only after two weeks of a picker that
actually honors the written cycle and the spine is still at one PR. The owner decides that
reversal. Unanswered, the next coordinator keeps the written cycle and fixes F2 and F3.

Phase C (the default renderer switch) remains the right time to lift the foundation amendment.
It is the wrong gate for the headless path the plan already pulled forward: #279 is inside the
current foundation picks.

## 8. New projects

No new portfolio row.

- **Below the NAND.** `horizon` already has #230, and `ready` lists it. The row is picked when
  the owner asks. One note, then stop, which is the row's own exit.
- **AI-native design and tutoring.** The write path ADR-0020 describes is the agent API. The
  tasks are already `surfaces` / foundation work (`hacer test` on files, then MCP), and they sit
  in the foundation picks (#279 is eighth in the current listing). A separate row would schedule
  the same work twice.
- **The research lab.** Publish the conformance count and the lead-time / blocked-once pair in
  Mission Control (improvement 6's first step). A lab project before there is a number to
  publish adds a dashboard.

Exit for the two-week window: `conformance/vectors/02` and `03` present, and Mission Control
shows that count. A learner study and a transistor model wait on that.

## 9. Owner decisions

| Decision | Recommended | If the owner does not answer |
|---|---|---|
| Land F1 under the on-green grant | yes | the coordinator does it |
| Land F2 and F3 under the same grant | yes | the coordinator does them |
| Pull #193 back and vendor Projects 2–5 locally (F4) | yes | yes, after a claim comment on #193 |
| Reverse #482 so process rows share one slot | no, not yet | keep the written cycle |
| A bot identity | defer | defer |
| Bring Stryker back | no | ADR-0011 stands |
| Fortnightly fresh-context review | yes | yes, as a harness routine |
| Unstick #517 | yes | `edited` on the PR body, then merge; no force-push |

## 10. This brief, checked

Re-measured and **held:** 125 merged, 113 non-Dependabot, 18 touching `src/` (16 engine, 2 other);
median 0.3 h and p90 12.1 h; median 233 changed lines; 62 verdicts, 63 without, 19 blocked once;
the 11 code PRs without a verdict; 258 opened, 106 closed, 152 open, 62 `agent-ready`, 0
`needs-human`, 0 `idea`; 126 opened on 09-18; `LINEAGE: 370 · 299 unlinked`; ledger 42 / 4 / 8 / 1;
`AGENTS.md` 298 lines; the 836-word README row; `tasks/todo.md` at `.claude/CLAUDE.md:42`; four
claim refs and three `in-progress` labels, with #193 the odd one out; `strict_required_status_checks_policy`
false; the extra-approval flag true; `ci` `contents: read`; `pr-hygiene` on `pull_request_target`.

**Held on the traced PRs:** the verifier catches real defects before merge (#432, #444). Red-first
holds on #365, #432, #459, #488, #303. Spikes before ADR-0020 hold by `sessions/2026-09-23.md`
and the engine PRs that followed (#362, #365, #370, #375).

**Not held:** the 09-23 run's "13" merges (F6). "A second creation is rejected" (`ha-next` §2).
#459 as a third verification attempt — the thread has one PASS. The claim that required-check
cancellation was fixed by `cancel-in-progress: false` — #517 is the counterexample (F1).

**Not re-measured here:** tokens per PR, owner minutes, whether anyone reads rulings after they
are written, and the layer-ratchet's current 71. The brief's "30 minor versions" was corrected
to 31 across 48 releases in `REPORT.md`; this pass did not recount tags.
