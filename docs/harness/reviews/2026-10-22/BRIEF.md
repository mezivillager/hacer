# Process review brief — cycle 2026-10-22

Issued over the standing brief, `docs/harness/process-review-brief.md`, which has the questions (§3),
the method (§4), the constraints (§5) and the report's shape (§6). This page carries what that one
leaves to each cycle: the measured evidence, the runs since the last cycle, and the coordinator's
hypotheses in both directions. **The coordinator whose runs are under review issued it and supplied
its hypotheses**, so every framing here, including what it says works, is a claim to test.

Measured 2026-10-22 between 08:35Z and 08:57Z at `origin/main` `d2f58ea0`. The GitHub numbers
re-measure with `node docs/harness/reviews/2026-10-22/evidence/brief-measure-flow.mjs` (output:
`evidence/brief-measurements.txt`). Every other number names its command or source. *Inferred* marks
what was not measured.

## 1. Since the last cycle

The first cycle (`docs/harness/reviews/2026-09-26/SYNTHESIS.md`) asked the next one to check four
things. Where they stand:

- **S1–S5 landed** (`docs/harness/sessions/2026-09-27.md` §3): the merge tool moved into the repo
  (#553), claims are exclusive (#549), `ready` resumes the cycle across calls (#555), and Projects
  2–5 are vendored (#193 closed). No session record from 2026-09-29 on mentions a stuck merge box
  (`command grep -il stuck` over them: no hits).
- **The conformance count on Mission Control** is a file count: 120 vendored files over Projects
  1–5, with `"runner": null` (`node scripts/mission-control/collect.mjs --json`,
  `metrics.conformance`).
  No pass count is computed; #194, the file-based suite that would record one, is unshaped.
- **Whether the spine moved:** its sub-issues went from 1/16 to 4/16 (`collect.mjs --json`,
  `portfolio.projects`). Two of the 204 non-Dependabot merges since 2026-09-26 carry
  `project:spine`: #730 and #739, both on 2026-10-15.
- **Which SYNTHESIS rows are still open:** S1–S20 were carried by merged PRs (2026-09-27 record §3);
  #156, S8's tokens per PR, is open, with a run average standing in (#854). The owner decisions
  were taken at their defaults (record §6), and one has since moved: the coordinator, not the owner,
  starts a cycle (HRN-016, #834, standing brief §7).

## 2. The runs

Merge counts come from the script's run windows, which are each record's `run-prs` window cut at
the close. They sum to 213; 16 more merged outside the runs. The 2026-10-02 record says 24 where its
own `run-prs` command prints 27.

| Date | Run | Stop; meter at start → close | Merged | What it turned on |
|---|---|---|---|---|
| 09-27 | review follow-through | queue, 30% guard; 21% → 28% | 24 | S1–S20 carried; `run-prs`; Scorecard |
| 09-29 | loop-60 | 60%; 50% → 57% | 36 | `hacer test` and `run-tst` on files; the read-only MCP tool (#631); the thermal cap (R776) |
| 10-01/02 | loop-92 | 92% or the reset; 82% → 89% | 27 | `merge-on-green` refuses a stale green (#651, #672) |
| 10-04 | loop-20 | 20%; 16% → 18% | 12 | `lint:docs` over every doc, `lint:case`, `issue-facts` |
| 10-05 → 10-14 | none | — | 0 | nothing merged for 9.9 days (`run-prs --from 2026-10-05T00:00:00Z --to 2026-10-14T21:59:00Z`) |
| 10-14/15 | loop-50 | 50%; 30% → 47% | 38 | the Project 1 scenario suite (#730); ADR-0020's spec model, one engine and importer; the retro role (#700) |
| 10-15/16 | loop-reset | the reset; 57% → 63% | 20 | the importer complete; a release break found after 20 failed runs (L071) |
| 10-17 | loop-to-20 | 20%; 13% → 16% | 4 | the inbox panel (R844, #780); product review 1 (#806) |
| 10-21/22 | loop-to-70 | 70%; 35% → 64% at 05:34Z | 52 | 32 panel decisions; the core fidelity chain; the differential harness (#917, #923) |

The owner started every run, and bounded all but the first by a meter reading. The cycle was due on
2026-10-10, inside the gap; `ready` has printed `process review due:` only since #902 merged in the
last run, and R870 then deferred the cycle by one run.

## 3. The evidence

**Throughput and mix** (`brief-measurements.txt`):

- 229 PRs merged 2026-09-26..10-22: 204 by agents, 25 by Dependabot. Open to merge: median 0.2 h,
  p90 1.6 h.
- By project label: harness 95 · foundation 69 · upkeep 9 · mission-control 7 · core 4 · lineage 4
  · spine 2 · verify 1.
- By files touched: tooling 57 · engine 48 · docs only 36 · other `src/` 28 · other 26 · Mission
  Control app 9.
- The last run's 52: harness 28 (13 HRN approvals built, 4 harness follow-ups, 7 fidelity review
  notes, the retro, 3 records PRs) · foundation 23 · verify 1 · spine 0. 27 of the 52 carry the
  `fidelity` label (`node scripts/run-prs.mjs --from 2026-10-21T14:30:00Z --to 2026-10-22T06:58:00Z
  --json`). Of the 24 foundation and verify PRs, all but #917 (#338, the differential harness the
  last cycle recommended) trace to an approved inbox entry or a builder's or verifier's follow-up.

**The product** (`collect.mjs --json`): foundation 22/33 sub-issues (12/33 at the last cycle), core
32/35, surfaces 10/14, spine 4/16, verify 5/13, horizon 0/4. The layer ratchet went 71 → 69. 48
releases, v2.43.0 → v2.66.8 (`gh release list`). The roadmap's last update is still read as
2026-05-12.

**Judgment**

- 181 agent PRs carry a `## Verifier verdict:` comment, 4 carry only `## Verdict: PASS` (#913,
  #925–#927, which Mission Control therefore lists without a verdict), and 19 carry neither: ten of
  the last cycle's own PRs (#517–#553), eight merged between runs from 09-28 to 10-01 (#571–#640),
  and #775.
- 12 BLOCKs on 10 PRs, the last on #774 (2026-10-15). The last run returned none in 38 verifier
  verdicts; its verifiers filed follow-ups instead (#836, #855, #912, #916, #918), all built in the
  same run.
- **Fidelity.** ADR-0018 §2 gives "a PR that changes semantics under `src/core/**` or
  `src/simulation/**`" a fidelity verdict before merge. Of the PRs changing a non-test file there,
  16 of 43 carry a `## Fidelity verdict:` comment, by run 09-29 0/5 · 10-02 1/1 · 10-14 7/12 · 10-15
  1/5 · 10-21 7/20 (the path filter is a proxy for "changes semantics"). In the last run, 14 merged on
  their verifier alone under 13 rulings (R860, R862–R864, R867, R869, R871–R874, R876, R877, R879),
  and the digest after the last core merge covered ten of them (2026-10-21 record §2).
- **The inbox panel** (R844): in the last run, 32 decisions, 30 approved (filed or folded into an
  issue), 1 declined (FID-020), 1 deferred (PRD-002) (2026-10-21 record §2). Across all 55 inbox
  entries: 45 filed, 1 declined, 6 deferred (5 by the owner on 2026-09-19), 3 proposed
  (`node scripts/inbox.mjs list --json`). The panel's reviewers run through `multi-review`, which
  lives on the owner's machine (ADR-0018, Decision 4 as amended).

**Backlog.** 175 issues opened and 206 closed since 2026-09-26; 121 open (152 at the last cycle), 22
`agent-ready` (62). `node scripts/backlog.mjs ready` at 08:40Z: 4 pickable — #257 and the three
review issues #928–#930 that `inbox.mjs queue` filed for HRN-018–020 at 08:37Z. The 103 others: 82
unshaped, 9 on-request, 6 foundation-gate, 2 needs-human, 1 not-pulled, 1 claimed, 1 blocked, 1
author. All 12 open spine issues are unshaped, and all were filed on 2026-09-18, before ADR-0020.

**Cost.** The last run: 18,682,568 subagent tokens over 119 agents, 381,277 per merged work PR
(2026-10-21 record §2). By role, from the run directory's `tokens.md`
(`evidence/brief-hypotheses.txt`, H6): builders 41 · 6.71M, verifiers 37 · 5.44M, panels 32 ·
4.60M, fidelity 6 · 1.19M, retro 0.24M, digest 0.19M, records 0.38M. Not in it: the 64
`run-reviews` reviewer sessions (Opus and Grok) and the coordinator. The first cycle's only reading
was about 175k per verified PR (tracer bullet).

**The owner.** Waiting now: #907 (`sev:critical`, `bot-filed`, needs the owner's `agent-ready`,
while the pick rule's step 1 is "any open `sev:critical` bug"); #870 and #677 (`needs-human`, #677
since 2026-10-02); making `differential` a required check (`main` requires `ci`, `pr-hygiene` and
`browser-qa`: `gh api repos/mezivillager/hacer/rules/branches/main`); #893's wording. The cloud lane's
inbox was last changed 2026-09-27 (`git log -1 -- docs/harness/sessions/cloud-queue-inbox.md`).

**Not measured:** the coordinator's own tokens; the `run-reviews` sessions; the owner's minutes;
escaped defects (`overturned` has never been applied: `harness-inbox.md` § Runs); the share of the
weekly meter taken by sessions outside the loop; whether anyone reads the records.

## 4. The coordinator's hypotheses — read after your own first pass

Test the first list as hard as the second. Each says what was measured, with the raw output in
`evidence/brief-hypotheses.txt`; the rest is inferred.

**Believed to work**

1. **The inbox panel decides without the owner,** and none of its 32 decisions in the last run was
   overridden. *Measured:* 32 decided, 30 approved. Every commit to the three inbox files since
   2026-10-17 came from an agent PR: records, fidelity reviews, the retro, product review 1 and #780
   (`git log --since=2026-10-17 -- docs/harness/*-inbox.md`). *Inferred:* "no override", since an
   override and an agent's edit come from the same account. *Against:* with 30 of 32 approved, ask
   what the panel would decline; the three proposals now queued are the coordinator's own.
2. **The loop ran 16.5 h without the owner.** *Measured:* 14:30Z → 06:58Z; merges never more than
   81 min apart (22:48Z → 00:09Z, from `run-prs --json`); the run log's close line reads "no retry
   log (no API-error pauses)"; two owner steering lines (2026-10-21 record §1). *Against:* one meter
   read failed on a permission prompt nobody answered (record §1), and the loop never starts itself:
   nothing merged in the 9.9 days between the 10-04 and 10-14 runs (§2).
3. **The differential harness gives the core an oracle.** *Measured:* #917's Opus verifier changed
   the builtin `And` to `a | b`, and 4 chips failed (#917, issuecomment-6333125742); CI's job ran
   20/20 in 33 s. *Against:* it runs HACER's own HDL for the 15 Project 1 chips
   (`docs/testing/differential.md`), so an acceptance gap like #907's, HDL the reference refuses and
   HACER grades as a pass, is outside its inputs; and it is not a required check.

**Suspected weak**

4. **The fidelity gate is ruled around routinely:** 14 core PRs in one run (not ten), and 16 of 43
   since the last cycle reviewed (§3). Either ADR-0018 §2 is mis-specified for small reader fixes,
   or the coordinator erodes it one ruling at a time. *Against:* each ruling names what stood in
   (verifier sweeps against the reference, the digest), and the digest found all ten sound.
5. **The loop runs dry of product work and feeds itself.** At 08:40Z only #257 and three reviews of
   the loop's own proposals were pickable; of the last run's 52 merges, all but #917 came from the
   inbox, a follow-up or the records, and none from the spine (§3). *Against:* the fidelity chain
   hardens the grading path Project 1's conformance runs on, and foundation-first is the owner's order.
6. **Review overhead is out of proportion for `risk:0/1`:** an inbox entry costs a panel (mean 144k
   tokens) plus two unreported reviewer sessions, and panels took a quarter of the run's subagent
   tokens; a merged PR averages 381k, about twice the first reading, on a wider base. *Against:* the
   panel took decisions off the owner (R844), which is the owner's stated aim (R95).
7. **The coordinator's long context is a large unmeasured cost.** The meter went 64% → 70% between
   05:34Z and 08:34Z. *Correction to the hypothesis as drafted:* not only the close ran. Under R878
   three build and verify chains ran after 05:34Z (#921–#923), and the subagent total went from
   17.56M (run log, 05:34Z) to 18.75M, about 2 points at the run's own rate (29 points for 17.56M).
   *Inferred:* the other 4 points are the coordinator's context or other sessions on the account,
   which the meter does not separate (the 5-hour meter read 2% at 05:34Z and 28% at the next run's
   first reading, 08:34Z).
8. **The 400-line budget makes the close cost more.** *Measured:* #924 (845 reviewable lines) was
   split into #925–#927 in 23 minutes and 14k tokens; 2 of the last 8 closes went over 400 (#750,
   709 changed lines, and #924). *Against:* that is small next to a 52-merge run, and three short PRs
   are easier to check than one long one. *Also:* `docs/harness/issue-form.md:21` calls
   `size-override` human-applied, yet coordinators applied it by ruling four times (R784, R812, R833,
   R847); the last run declined to.
9. **The stop condition goes blind with the browser.** *Measured:* in 2 of the 8 runs: the usage
   API's 500s for about 30 minutes on 2026-09-29 (R774), and on 2026-10-21 two failed reads covered
   by estimates and no reading from about 06:10Z, when the extension disconnected, until the next
   run. *Against:* each time, nothing started that the missing reading would have stopped.

## 5. Claims to check

Check at least five (standing brief §4.4). Each is one command or one source.

| # | Claim | Source |
|---|---|---|
| C1 | 52 PRs merged in the 2026-10-21 run, none labelled `project:spine` | `run-prs` line in §3 |
| C2 | 14 core PRs merged without a fidelity review, under 13 rulings | `docs/decisions/rulings/2026-10-21-hacer-loop-to-70.md` |
| C3 | 16 of 43 semantic-path PRs since 2026-09-26 carry a fidelity verdict | `brief-measurements.txt`, FIDELITY |
| C4 | Breaking `And` fails 4 chips in the differential harness | #917, issuecomment-6333125742 |
| C5 | The spine's progress measure is not computed (`runner: null`) | `collect.mjs --json`, `metrics.conformance` |
| C6 | #913 and #925–#927 have `## Verdict: PASS`, so Mission Control counts them unverified | the PRs' comments; `metrics.flow.coverage` |
| C7 | 0 BLOCK in the last run's 38 verifier verdicts | 2026-10-21 record §2; `brief-measurements.txt` |
| C8 | Nothing merged from 2026-10-05 to 2026-10-14T22:00Z | `run-prs` line in §2 |
| C9 | 30 of the 32 panel decisions approved | 2026-10-21 record §2, *Inbox panel decisions* |
| C10 | `size-override` is human-applied, and four coordinator rulings applied it | `docs/harness/issue-form.md:21`; R784, R812, R833, R847 |
| C11 | Ledger rows L069 and L070 say `no` mechanism after #886, #890 and #894 merged | `docs/harness/ledger.md` |

## 6. For this cycle

- **Trace** (standing brief §4.2): needing more than one pass, #725 (four Opus verifiers) and #753
  (a BLOCK, then 48,000 documents); #837 → #841 (a squash GitHub refused); passing first time, #917
  and #843 (merged without a fidelity review, R860); an inbox chain, FID-030: #867 → #906 → #908; and
  two at random. The whole run: 2026-10-21, from the coordinator's run queue (local, not committed)
  to `docs/harness/sessions/2026-10-21.md`. Quote nothing from the run directory that is not already
  in this repo.
- **Your PR's budget.** `pr-hygiene` exempts only `docs/research/*/evidence/` from the 400 lines
  (`classifyFile`, `scripts/pr-hygiene.logic.mjs`), so here your review and its evidence share them,
  and `size-override` is not yours to apply. Keep raw output terse.
- **Parallel work.** A retro runs beside this cycle, on `docs/harness/harness-inbox.md`; a later
  `harness-inbox.md` § Runs row may postdate this brief.
- **Your ceiling** is in the launch line (standing brief §5, §7).
