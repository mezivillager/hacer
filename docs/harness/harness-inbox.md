# Harness inbox: proposals the inbox panel decides

The retro role (`retro-brief.md`, agent `.claude/agents/hacer-retro.md`) never changes policy and
never files an issue. It queues its proposals here. An entry is one of two kinds:

- **`mechanise`:** a recurring failure that has no mechanism yet, with a draft `agent-ready`
  `project:harness` issue body (the ledger's second-occurrence rule).
- **`policy`:** a change to a gate, a brief, the rotation, a tier, a budget or a cadence.

**The inbox panel decides each `proposed` entry of either kind (`inbox-panel-brief.md`), in
batches: `node scripts/inbox.mjs queue` files one review issue for at most five new entries, Opus
and Grok review them, and the panel sets each one `approved`, `declined (<reason>)` or
`deferred (<until>)` on its own. An entry marked `**Review:** own` gets a review issue of its own.
The owner may override any status at any time, by editing it or by saying "approve HRN-00N".** Only
an approved entry is acted on, and the entry then records the issue or PR number. An approved
policy that outlives a run is recorded as an ADR or an amendment.

Declined entries stay, so the same proposal is not made twice. Ids are sequential and never reused.

## Entry format

```markdown
### HRN-NNN · <one-line proposal>
- **Date:** YYYY-MM-DD · **Kind:** mechanise | policy · **Retro run:** <date in Runs>
- **Status:** proposed | approved | declined (<reason>) | deferred (<until>) | filed (#n)
- **Review:** own
- **Evidence:** <ledger ids, PRs, record sections; each number measured (with its command) or inferred>
- **Cost if wrong:** <what is wasted or broken if this is the wrong call>
- **Decides:** the inbox panel (`inbox-panel-brief.md`); the owner may override

**Draft issue body** (required for mechanise; optional for policy)
## Goal
## Acceptance criteria
## Verification command
## Blocked by
```

**`**Review:** own` is optional.** Only a `policy` entry that changes a correctness gate carries it,
which means any of:

- the verifier's verdict or block rule (`verifier-brief.md`);
- ADR-0018's fidelity review before merge;
- what `merge-on-green` or a required check accepts.

Such an entry gets a review issue and a panel of its own. Every other entry is reviewed in a batch;
a `mechanise` entry always is, because its draft still goes to a builder and a fresh verifier.
`scripts/inbox.mjs` refuses any other value of the field.

## Runs

One row per retro run. The next run's window starts at the last row's `to` time.

| Run | Window (`from` → `to`) | `main` at `to` | Merged | Numbers | Entries | Held |
|---|---|---|---|---|---|---|
| 2026-10-15 (first) | the three latest session records: 2026-09-29T09:00Z → 09-29T23:59Z, 2026-10-01T21:20Z → 10-02T03:00Z, 2026-10-04T16:50Z → 10-04T23:59Z | `1737e290` | 75 (65 + 10 dependabot) | median reviewable 73 · 2 BLOCK · 0 overturned · 0 reruns | mechanise HRN-001–004 · policy HRN-005–009 | three, listed below |
| 2026-10-21 | 2026-10-04T23:59Z → 2026-10-21T15:00Z, from the last row's `to`: 16.6 days, far past the cadence (below) | `204aa0b2` | 63 (49 + 14 dependabot) | median reviewable 66 · 9 BLOCK on 7 PRs · 0 overturned · 0 reruns | mechanise HRN-010–014 · policy HRN-015–017 | eight, listed below |
| 2026-10-22 | 2026-10-21T15:00Z → 2026-10-22T08:37Z, from the last row's `to` to this run's start | `d2f58ea0` | 51 (48 + 3 records PRs; 0 dependabot) | median reviewable 69 · 0 BLOCK · 0 overturned (candidates: #826, #886, #910, #914, #917) · 0 reruns | mechanise HRN-021–022 · policy HRN-023–027 | six, listed below |
| 2026-10-22, second | 2026-10-22T08:37Z → 2026-10-22T21:16Z, from the last row's `to` to this run's start | `c62a4e71` | 18 (7 code + 11 docs PRs; 0 dependabot) | median reviewable 217.5 (code 47, docs 295) · 1 BLOCK · 0 overturned (candidates: #959, #964) · 0 reruns | mechanise HRN-028 · policy HRN-029–030 | seven, listed below |
| 2026-10-29 | 2026-10-22T21:16Z → 2026-10-29T18:19Z, from the last row's `to` to this run's start | `e76c7da6` | 21 (14 code + 7 docs PRs; 0 dependabot) | median reviewable 95 (code 87.5, docs 197) · 0 BLOCK · 0 overturned (candidates: #995, #1013) · 0 reruns (2026-10-22 split: 157 in its last slice, the window's) | mechanise HRN-032–033 · policy HRN-031 | seven, listed below |

### First run: 2026-10-15

#271 names the tracer-bullet day, 2026-09-18. This run uses the three latest completed runs
instead, because they show the process as it is now: 75 merges and ledger rows L058–L067. Older
rows count only as earlier occurrences of a class. The numbers, with their commands and the script
that measured them, are in `docs/research/2026-09-continual-refinement/evidence/first-retro-run.md`.

**Held** (found, but no entry this run):

- **Ledger ids colliding between parallel PRs** (2026-10-02 §3, R789, R792): `lint:lineage`, which
  fails since #471 (PR #697), is the check. No entry needed.
- **The ledger's merge fallback**, #607, open since 2026-09-29: an issue already exists, so it is a
  pick, not a proposal.
- **L057's own gap:** the implementer brief does not say to run `node scripts/pr-hygiene.mjs` on a
  drafted body. One recurrence since then is a different rule (#688, linked-issue), so the class is
  not yet seen twice.

### Second run: 2026-10-21

**Window.** The last row's `to` is 2026-10-04T23:59Z (`1737e290`), although that run is dated
2026-10-15: it read older records. The brief's rule was kept, so this window holds 63 merges over
16.6 days, about twelve windows at "every 5 merged PRs". It covers the 2026-10-14, 2026-10-15 and
2026-10-17 records and #817. Nothing merged from 2026-10-05 to 2026-10-14T22:00Z.

**Numbers.** Each is `measured` with its command, `inferred`, or `unmeasured`.

| Number | Value | How |
|---|---|---|
| merged PRs | 63: 38 · 20 · 5 by run (the 2026-10-14, 2026-10-15 and 2026-10-17 runs, the last with #817); 14 dependabot | measured: `node scripts/run-prs.mjs --from 2026-10-04T23:59:00Z --to 2026-10-21T15:00:00Z` |
| median reviewable lines | **66** (by run: 68 · 46 · 150); over 400: 3, all `size-override`: #700 (640), #750 (709), #780 (474) | measured: the first run's script (`docs/research/2026-09-continual-refinement/evidence/first-retro-run.md`), `measure()` over the paginated files of the 49 non-dependabot PRs |
| verdicts | 48 of 49 with a verdict; #775 has none. 9 BLOCKs on 7 PRs: #725 (three), #700, #727, #732, #743, #753 and #774, each passed by a fresh verifier. 7 of the 9 were on `risk:2` PRs | measured: verdict headings in each PR's comments, same script |
| overturned | **0**: the label has never been applied. One candidate under HRN-006's rule: #780 (below) | measured: `gh pr list --state all --label overturned --limit 200` printed `[]` |
| escaped defects | **2, inferred.** #765: dependabot #693's bump (`28f6cbd1`) broke 20 `Release` runs (L071). #780's panel brief filed approved FID issues in `core`; the FID-008 panel found it after the merge, and R851 fixed it in #815, with no issue. Another 11 issues name defects that were on `main` before the window, found by its reviews: #724, #729, #734, #736, #742, #745, #746, #749, #752, #776 and #801 | inferred: reading the window's 63 issues |
| tokens per merged PR | **unmeasured**: none of the three records reports it. The only figure is one unmerged build, #781, about 158k (2026-10-17 §3) | measured absence: `grep -i token` over the three records |
| owner minutes per merged PR | **unmeasured**. Proxy: 0 `needs-human` issues opened. The proxy's other half, the owner's comments on PRs, cannot be counted: agents comment as the owner's account (#817's verdict is posted by `mezivillager`) | measured: `gh issue list --state all --search "created:2026-10-04..2026-10-21 label:needs-human"` printed `[]`; `gh api repos/mezivillager/hacer/issues/817/comments --jq '.[].user.login'` |
| follow-up volume | 63 issues opened, 32 still open. 22 are inbox-review issues, 16 of them open; 41 others, 16 open | measured: `gh issue list --state all --search "created:2026-10-04..2026-10-21" --limit 200`, filtered to the window's times |
| flake reruns | **0** re-runs (`run_attempt > 1`) in 2,668 workflow runs, 2026-10-05..10-21. 2026-10-15's day query returned exactly 1,000, the API's cap, and four six-hour queries returned 1,021 (HRN-017). The records name one flaky local test, `src/lib/chipCompletionStorage.test.ts:62` under a load of about 29 (2026-10-15 §5), and no local re-run count | measured: the brief's `actions/runs?created=<day>` query, one day at a time |
| stalled reviews | **0**: the oldest `proposed` entries are dated 2026-10-15. 16 are `proposed` | measured: `node scripts/inbox.mjs list --status proposed` |
| Mission Control `metrics.flow` | the same 63 merges (14 days from 2026-10-07T15:14Z): open-to-merge median 0.4 h, p90 2.4 h; `blockedOnce` 7 of 48; verdict coverage, code 43 of 43, non-code 5 of 20 (the 15 without are 14 dependabot PRs and #775) | measured: `node scripts/mission-control/collect.mjs --json` |
| premises | 5 hold, 1 expired, 1 unverifiable, 1 manual. P-001 has been marked expired since 2026-09-22 (#569). P-005 could not run on this machine: its scratch install resolves a pnpm 12.3.4 that corepack has not cached (`MODULE_NOT_FOUND`) | measured: `node scripts/lineage.mjs verify` |

**Recurrences.**
- L069, L070, L013 and L012 with L071 are each seen twice with no mechanism, so they are HRN-010 to
  HRN-013. A future `--to` in a record's `run-prs` line is seen twice (2026-10-14 §2, 2026-10-15 §2),
  and is HRN-014.
- Three records' "How to resume" steps repeat the same standing practices: L068's `ps` check,
  L069's scratch folder and L070's tier (2026-10-14 §5, 2026-10-15 §5, 2026-10-17 §5). No committed
  brief states them. #677, `needs-human` since 2026-10-02, is the open issue for a standing-rules file,
  so this is a line here and not an entry.

**For the entries under review.** This is evidence only; their text is unchanged.
- **HRN-005 (#796):** tokens per merged PR are unreported again, in 3 of 3 records. Its proxy (b)
  cannot be counted from GitHub, because agents comment as the owner's account (the numbers above).
- **HRN-006 (#797):** one candidate, #780. Its Sonnet PASS (issuecomment-6238455110) passed the
  panel brief's `core` bucket, and R851 corrected it in #815. A design call the panel later reversed
  may not be an overturn; the entry's decision covers that.
- **HRN-007 (#798):** all three runs ran two agents at a time throughout (2026-10-14 §1, 2026-10-15 §1,
  2026-10-17 §1).
- **HRN-008 (#799):** this run was dispatched again as a general-purpose agent handed the role file.
- **HRN-009 (#800):** the cadence never fired. 63 merges and three run closes (#750, #775, #815) passed
  with no retro until this one. "Every 5" would have meant 12 retros (63 / 5, inferred).

**Prune check:** the per-PR Cursor second opinion: `scripts/second-opinion.mjs`,
`scripts/lane-budget.mjs`, `docs/harness/cursor-lane.md` §1.6 and the two Cursor rows in `README.md`
§ *Budgets*. Its audit log, `<git-common-dir>/hacer-lane-runs/second-opinion.jsonl`, has 14 rows,
the last on 2026-09-21T09:52Z, and none in the window, although 42 of the window's PRs were
`risk:1` or `risk:2` (measured). This is not a quarter's first run, so the component is named here
and not proposed. The first quarterly prune, in the week of 2026-12-18, can start from it.

**Held** (found, but no entry this run):

- **Unmeasured claims in briefs and issues** (L046, L059) recurred after #716: four briefs
  (2026-10-14 §3) and two issue texts, #752 and #768 (2026-10-15 §3). Each was caught before a build,
  and what remains is what L046 leaves to a Measured-facts row.
- **L073**, `run-reviews`' `source_changes`, is seen twice. Its launcher is the `multi-review` skill
  outside this repo, so no issue here can fix it.
- **Times written from estimates:** the staged rulings ran up to nine hours ahead (2026-10-14 §3), and
  the run files' start time was 17:37Z (2026-10-17 §3). The 2026-10-21 run added two: log times typed
  as estimates and corrected within the hour, and the dates of R865–R868, staged a day ahead and
  corrected in its records PR (2026-10-21 §3). This is four occurrences, but all were in uncommitted
  coordinator files that no repo check reads.
- **Backticks lost to the shell:** in #754's body (2026-10-15 §3), and in #780's inline `--summary`,
  which `--summary-file` now replaces (2026-10-17 §3). HRN-010 covers the builders' and verifiers'
  half and was built as #881 (PR #886): their PR bodies go through `--body-file`. The coordinator's
  own bodies (`ha-next`, `inbox-panel-brief.md` §2) stay held.
- **L068** (orphaned vitest workers) and **L072** (a hold in a comment) have one occurrence each.
- **#775** merged with no verdict, once.
- **P-005 is unverifiable here**, once, and only on this machine.
- **#705** (HRN-004) was filed at `risk:2`, although mechanise drafts are `risk:0` or `risk:1`. This
  happened once, and HRN-015 asks the same question.

**Not measured:** owner minutes, tokens per merged PR, and local re-run counts, as above. Also not
measured: whether any review counted here ran on a different tier from the one it names.

### Third run: 2026-10-22

**Window.** The first run under HRN-009's cadence: `node scripts/backlog.mjs ready` printed
`retro due: 51 merges since 2026-10-21T15:00Z (run closed: docs/harness/sessions/2026-10-21.md)` at
the first orient after the record landed. The window holds the 2026-10-21 run less #817, which merged
at 14:54Z, inside the last window. `to` is this run's start, from `date -u`.

**Numbers.** Each is `measured` with its command, `inferred`, or `unmeasured`.

| Number | Value | How |
|---|---|---|
| merged PRs | 51: 48 work PRs and the three records PRs #925–#927; 0 dependabot | measured: `node scripts/run-prs.mjs --from 2026-10-21T15:00:00Z --to 2026-10-22T08:37:45Z` |
| median reviewable lines | **69** (the 48 work PRs: 68); largest #917 (380); over 400: 0. The records PR #924 failed `pr-hygiene` at 845, closed unmerged, and was split into #925 (345), #926 (308) and #927 (192) | measured: the first run's script (`docs/research/2026-09-continual-refinement/evidence/first-retro-run.md`) over the paginated files of the 51 PRs |
| verdicts | 51 of 51 have a verdict heading the script reads; **0 BLOCK** (the last window: 9 on 7 PRs). 25 Opus verifier verdicts, one carried by tree identity (#841, from #837's), 11 Sonnet, 14 coordinator reviews. Mission Control counts four of these without a verdict: #913, #925, #926 and #927 open `## Verdict: PASS` (HRN-021) | measured: verdict headings and `Verified on:` lines in each PR's comments, same script |
| overturned | **0**: the label has never been applied. Candidates: #826, #886, #910, #914 and #917. Each PASS named a reproduced defect in the PR's own new lines as a nit, and a later PR fixed it: #843, #890, #921, #922 and #923 (HRN-024). Not listed: four PASSes that a panel's FID decision later changed, #818 (FID-025, #885), #853 (FID-029, #914), #862 (FID-030, #908) and #869 (FID-031, #911) | measured: `gh pr list --state all --label overturned --limit 200` printed `[]`; candidates from the verdicts and the window's issues |
| escaped defects | **1, inferred:** #907 (`sev:critical`) is in `src/core/testing/gradingRefusal.ts:44-46`, which #869 added (`6ee66227`); its verifier and its fidelity review passed, and the #867 panel found it after the merge. Five more defects in the window's own PRs were known at merge, as verifier nits: #836, #887, #912, #916 and #918. #855, #868 and #878 name defects that were on `main` before the window | inferred: reading the window's 55 issues |
| tokens per merged PR | **381,277** as 2026-10-21 §2 reports it: 18,682,568 over 119 agents, divided by 49. Under README § *What to measure* it is `unmeasured`, because the sum leaves out the 32 `run-reviews` launches, which report no count (HRN-027) | measured: 2026-10-21 §2 |
| owner minutes per merged PR | **unmeasured**. Proxy: 1 `needs-human` issue opened, #870 | measured: `gh issue list --state all --search "created:2026-10-21..2026-10-22 label:needs-human"` |
| follow-up volume | 55 issues opened, 5 still open (#870, #878, #879, #889, #907). 16 are inbox-review issues, all closed; 39 others, 5 open. #928–#930 were filed seconds after `to` | measured: `gh issue list --state all --search "created:2026-10-21..2026-10-22" --limit 200`, filtered to the window's times |
| flake reruns | **0** re-runs in 1,352 workflow runs: 764 from 2026-10-21T15:00:00Z to the day's end, and 588 on 2026-10-22 to `to`; neither query reached the cap. The record names four load failures in three verifiers' local runs, each passing alone: the collects test in #842's and #860's, and `src/core/spec/parseSpec.partIds.test.ts` (184.6 ms against 100) and `scripts/backlog.logic.test.mjs` (5 s) in #908's (2026-10-21 §3). No local re-run count | measured: the brief's `actions/runs?created=<range>` query, one per day part |
| stalled reviews | **0**: the three `proposed` entries, HRN-018 to HRN-020, are dated 2026-10-22 | measured: `node scripts/inbox.mjs list --status proposed` |
| Mission Control `metrics.flow` | 14 days from 2026-10-08T08:42Z, 114 merges: open-to-merge median 0.3 h, p90 1.6 h; `blockedOnce` 7 of 95, none in this window; verdict coverage, code 79 of 79, non-code 16 of 35 (the 19 without are 14 dependabot PRs, #775, and #913, #925, #926 and #927). `belowTier` is empty | measured: `node scripts/mission-control/collect.mjs --json` |
| premises | 5 hold, 1 expired, 1 unverifiable, 1 manual, as last run. P-001 is still expired, with #569 open | measured: `node scripts/lineage.mjs verify` |

**Recurrences.**
- A merged PR whose verdict the collector cannot read is seen twice: #775 (last run's Held) and
  #913, #925, #926 and #927. It is HRN-021.
- A test that runs a child process synchronously timed out on a loaded laptop twice in the 2026-10-21
  run: the collects test, which #877 fixed in that file, and `scripts/backlog.logic.test.mjs`. L049's
  decision has no check. It is HRN-022.
- Policy: the fidelity review waived by ruling 14 times (HRN-023), reproduced defects passed as nits
  (HRN-024), four standing rules outside the committed briefs (HRN-025), the meter rule (HRN-026), and
  the token figure's gap (HRN-027).
- HRN-018 to HRN-020 already cover the run's other recurrences. Times written from estimates add no
  occurrence in a committed file, so the Held line above stands.

**For the entries under review.** This is evidence only; their text is unchanged.
- **HRN-019 (#929):** every PR has a red commit that fails on purpose (`implementer-brief.md` step
  2), and the rebase-only ruleset puts each on `main`. #917's `7e62d857` records
  `scripts/layer-ratchet.logic.test.mjs` failing, a file `pnpm run test:run` runs. Option (a)'s trigger,
  a `test(` title with more than one commit, would also have refused #904 (two commits), #917 (two)
  and #923 (four), which merged on green.
- **HRN-020 (#930):** `node scripts/lineage.mjs parse --github` still exits 1 at `d2f58ea0`.
- **HRN-018 (#928):** nothing new; one coordinator ran in the window.

**For the filed entries.**
- **HRN-009 (#873, PR #880):** the cadence fired at the first orient after a run's close, as built.
- **HRN-008 (#870):** this run was dispatched again as a general-purpose agent handed the role file.
- **HRN-011 (#884, PR #894):** Mission Control's `belowTier` list is empty.
- **HRN-017 (#898, PR #900):** no query reached the cap, so nothing was split.
- **HRN-005 (#850, PR #854)** and **HRN-006 (#852, PR #858)** were first applied in this window;
  HRN-027 and HRN-024 report what that showed.

**Prune check:** the per-PR Cursor second opinion again. Its audit log still has 14 rows, the last
on 2026-09-21T09:52Z, and none for this window's 51 merges, 33 of them `risk:1` or `risk:2`
(measured). That is two windows unexercised. This is not a quarter's first run; the first quarterly
prune, in the week of 2026-12-18, can start from it.

**Held** (found, but no entry this run):

- **Records PRs over the size budget:** #750 (709, `size-override`, the 2026-10-14 run) and #924 (845,
  split into #925–#927 instead of a self-applied override). `pr-hygiene` caught both. The split cost
  two more merges of records that the coordinator reviews itself either way. It ranks below the five.
- **README § *Budgets*' "~2M" subagent tokens per run:** this run used 18.7M under the owner's "until
  70%", which the row's "unless the owner asked for a longer run" allows. Every run since 2026-10-14
  has stopped on the meter instead. It ranks below the five.
- **#907 is the first `bot-filed` issue.** It waits for the owner as ADR-0018 §4 designs, once.
- **A fidelity digest is owed** for #914, #920, #921 and #922, which merged after the run's digest
  (ADR-0018 §5). It is the next coordinator's step, not a proposal; HRN-023 cites it.
- **#878 and #889** are open follow-ups that need shaping: picks, not proposals.
- **P-001**, expired since 2026-09-22 with #569 open, as last run.

**Not measured:** owner minutes; the tokens of the 32 `run-reviews` launches; local re-run counts;
this retro's own tokens, which join the next run's total.

### Fourth run: 2026-10-22, second

**Window.** `node scripts/backlog.mjs ready` printed `retro due: 18 merges since 2026-10-22T08:37Z
(run closed: docs/harness/sessions/2026-10-22.md)` at 21:15Z. The window holds three runs, the loop
to 80%, the judge run and the loop to 90%, and #962, which another session merged at 12:00Z. `to` is
this run's start, from `date -u`. The line was due from #961's merge at 11:28Z, and two orients passed
it (HRN-030).

**Numbers.** Each is `measured` with its command, `inferred`, or `unmeasured`.

| Number | Value | How |
|---|---|---|
| merged PRs | 18: 7 code PRs (#948, #952, #954, #956, #957, #959, #964) and 11 docs PRs; 0 dependabot | measured: `node scripts/run-prs.mjs --from 2026-10-22T08:37:45Z --to 2026-10-22T21:16:00Z` |
| median reviewable lines | **217.5**: code PRs 47, docs PRs 295 (the last window: 69, with 3 records PRs among 51). Over 400: 0. The largest, #947 (392) and #944 (364), are process reviews whose evidence counts toward the 400 (S4, #951) | measured: the first run's script (`docs/research/2026-09-continual-refinement/evidence/first-retro-run.md`) over the paginated files of the 18 PRs |
| verdicts | 18 of 18 open `## Verifier verdict:`. **1 BLOCK**: #959 (issuecomment-6339464842), fixed and passed by a fresh Opus verifier. 6 Opus verdicts on 5 PRs, 2 Sonnet (#948, #954), 11 coordinator reviews. #964 ran on Opus where `backlog.mjs tier` gave Sonnet, by the coordinator's choice | measured: verdict headings and `Verified on:` lines in each PR's comments, same script |
| overturned | **0**: the label has never been applied. Candidates: #959's second PASS and #964's PASS, each naming a reproduced defect in the PR's own lines as a nit that a later issue carries, #979 and #965 (HRN-024, below) | measured: `gh pr list --state all --label overturned --limit 200` printed `[]` |
| escaped defects | **1, inferred:** #977. #964 moved owner decisions to the judge, while `fidelity-brief.md`'s Permissions and the `bot-filed` label still said the owner alone. Its verifier's grep for owner routes did not reach that phrase; JDG-001's judge found it after the merge. Two more were known at merge, as verifier nits: #965 (from #964) and #979 (from #959) | inferred: reading the window's 41 issues |
| tokens per merged PR | **402,501** for the 80% run (4,427,514 over 22 agents, 11 PRs) and **771,136** for the judge and 90% runs (2,313,408 over 10 agents, 3 PRs), as the record's two §2 report them. Under README § *What to measure* both are `unmeasured`: 12 `run-reviews` sessions, 4 for two inbox reviews and 8 for four judge reviews, report no count (HRN-027) | measured: 2026-10-22, both §2 |
| owner minutes per merged PR | **unmeasured**. Proxy: 0 `needs-human` issues opened. Since R889 that label marks owner actions only; the decisions he would have made are the 10 JDG entries, 4 of them decided | measured: `gh issue list --state all --search "created:2026-10-22..2026-10-22 label:needs-human"` |
| follow-up volume | 41 issues opened, 34 still open: 12 inbox reviews (10 open), 10 judge reviews (6 open) and 19 others (18 open) | measured: `gh issue list --state all --search "created:2026-10-22..2026-10-23" --limit 200`, filtered to the window's times |
| flake reruns | **0** re-runs in 455 workflow runs, one query for the window, under the cap. The records name one local load failure: two 5 s timeouts in `scripts/backlog.logic.test.mjs` at a load of 32 in #959's re-verification, passing alone (issuecomment-6343306427). No local re-run count | measured: the brief's `actions/runs?created=<range>` query |
| stalled reviews | **0**: the 16 `proposed` entries (HRN-020 to HRN-027, FID-033, FID-034, JDG-005 to JDG-010) are dated 2026-10-22 | measured: `node scripts/inbox.mjs list --status proposed` |
| Mission Control `metrics.flow` | 14 days from 2026-10-08T21:21Z, 132 merges: open-to-merge median 0.3 h, p90 1.5 h; `blockedOnce` 8 of 113, #959 the new one; verdict coverage, code 86 of 86, non-code 27 of 46 (the same 19 without as last run). `belowTier` is empty | measured: `node scripts/mission-control/collect.mjs --json` |
| premises | 5 hold, 1 expired, 1 unverifiable, 1 manual, as last run. P-006's manual check still names the browser endpoint that R891 replaced (HRN-029) | measured: `node scripts/lineage.mjs verify` |

**Recurrences.**
- L077 is reproduced: the pre-commit hook does not stop at a failing typecheck. Two builders reported
  it (L077), so it is HRN-028.
- HRN-024's class twice more: #959 → #979 and #964 → #965 (below).
- A route to the owner left after R889 was found twice: by #964's verifier (`process-review-brief.md`,
  #965) and by JDG-001's judge (`fidelity-brief.md` and the label, #977). Both have issues, so this is
  a line here.
- Policy: README § *Budgets* against four rulings the runs practised (HRN-029), and the retro trigger
  with the due line passed at two orients (HRN-030).

**For the entries under review.** This is evidence only; their text is unchanged.
- **HRN-020 (#930):** `node scripts/lineage.mjs parse --github` still exits 1 at `c62a4e71`. Nine of
  its `malformed` errors cite a `JDG-` id, on #907, #977 and #980–#985, which the judges filed or
  rewrote; option (a) names `FID-`, `HRN-` and `PRD-` only.
- **HRN-021 (#933):** no recurrence. All 18 PRs open with the brief's heading, the coordinator's 11
  docs reviews included.
- **HRN-022 (#934):** `scripts/backlog.logic.test.mjs` timed out again in #959's re-verification
  ("ready and next print the line after the retro…" and "a tree read git refuses…"), its second time
  after #908's.
- **HRN-023 (#935):** R886 and R887 waived the review for both semantic core PRs of the window, #956
  and #957, each on reference runs. The first section's resume step 6 now states the practice: "unless
  a ruling says why not (R854)".
- **HRN-024 (#936):** #959's re-verification (issuecomment-6343306427) passed with nit 1, `driverCheck`'s
  keys contradicting the docstring the PR wrote, and nit 2, wide loop-free lattices three times slower
  (393 against 137 ms at 20 stages); #979 carries both. #964's (issuecomment-6341494864) passed with
  nit 2, reproduced through the CLI, and a test-11 half that does not discriminate; #965 carries both.
  Under R893 this entry keeps its own panel, since it changes the verdict rule.
- **HRN-025 (#937):** unchanged at `c62a4e71`: `inbox-panel-brief.md` still launches `--models
  opus,grok` and files "`agent-ready` at any risk", and no brief names `PPID` or artificial load. R865's
  owner-action form is in `judge-brief.md` §3 item 6, for the judge's decisions only.
- **HRN-026 (#938):** R891 moved the read to the status-line capture. The 90% run's §1 lists eight
  readings from it and no failure; both failures this entry cites were the browser's.
- **HRN-027 (#939):** 12 more uncounted sessions (above). The 771,136 figure is 3 merges over 10
  agents, four of them judges.

**For the filed entries.**
- **HRN-009 (#873):** the line fired at 11:28Z, and two orients passed it (HRN-030).
- **HRN-016 (#895):** the process review ran in the window, 26 days after the last (2026-10-22 §2).
- **HRN-018 (#955):** another session merged #962 during the judge run, with a coordinator review;
  nothing collided. #955 is open.
- **HRN-008 (#870):** this run was dispatched again as a general-purpose agent handed the role file.

**Prune check:** the per-PR Cursor second opinion, a third window. Its audit log still has 14 rows,
the last on 2026-09-21T09:52Z, and none for this window's 18 merges, 6 of them `risk:1` (measured).
The first quarterly prune, in the week of 2026-12-18, can start from it.

**Held** (found, but no entry this run):

- **L073** twice more, on #928 and #929 (2026-10-22 §3): four occurrences. The launcher is outside
  this repo. R889 now gives such a change a route, an owner action the coordinator files, and HRN-027's
  option (b) needs the same launcher.
- **Times written from estimates** again: the 80% run's log stamps and R886's time (2026-10-22 §3).
  R882 and R883 are committed as "about" times. Each was corrected or marked before merge.
- **An unmeasured premise** held #257 over in five runs: R881's "GitHub is not connected" came from a
  2026-09-19 ruling and a skill note (2026-10-22, second §3). JDG-003's probe, #980, measures it.
- **L076** (`inbox.mjs queue` on a stale checkout), once.
- **`inbox.mjs set`** writes only the bare status form (second §3), once.
- **A second `merge-on-green`** printed `needs-person` on a merged PR (2026-10-22 §3), once.
- **P-001**, expired since 2026-09-22 with #569 open, as last run.

**Not measured:** owner minutes; the 12 `run-reviews` sessions' tokens and the coordinator's own;
whether `ready` printed `retro due:` at the judge and 90% runs' orients, computed from `main` and not
read from a log; local re-run counts; this retro's own tokens.

### Fifth run: 2026-10-29

**Window.** `node scripts/backlog.mjs ready` printed `retro due: 21 merges since 2026-10-22T21:16Z
(run closed: docs/harness/sessions/2026-10-23.md)` at 18:22Z. The window holds two runs. The loop to
97% ran from 21:16Z on 2026-10-22, paused at 22:29Z, and closed with #1004 on 2026-10-23 at 20:25Z,
which appended a third part to `docs/harness/sessions/2026-10-22.md`. The loop to 12% ran from
2026-10-23T20:06Z and closed with #1035 at 2026-10-24T00:55Z, which added
`docs/harness/sessions/2026-10-23.md`. Nothing merged after that until `to`, because the owner starts
every run (R903). `to` is this run's start. The line was due from #1035's merge; the 97% run's close
never made it due (HRN-030, below).

**Numbers.** Each is `measured` with its command, `inferred`, or `unmeasured`.

| Number | Value | How |
|---|---|---|
| merged PRs | 21: 14 code PRs (#987, #995, #1013, #1015, #1016, #1019, #1020, #1022, #1025, #1027, #1028, #1030, #1031, #1033) and 7 docs PRs (#988, #996, #1004, #1005, #1008, #1021, #1035); 0 dependabot | measured: `node scripts/run-prs.mjs --from 2026-10-22T21:16Z --to 2026-10-29T18:19Z` |
| median reviewable lines | **95**: code PRs 87.5, docs PRs 197 (the last window: 217.5, code 47, docs 295). Over 400: 0. The largest are the two records PRs, #1035 (378) and #1004 (318). Every PR's `HYGIENE:` line gives the count `measure()` gives | measured: the first run's script (`docs/research/2026-09-continual-refinement/evidence/first-retro-run.md`) over the paginated files of the 21 PRs, and the 21 `pr-hygiene` job logs |
| verdicts | 21 of 21 open `## Verifier verdict:`. **0 BLOCK.** 10 Opus verdicts, 4 Sonnet (#1015, #1020, #1022, #1031), 7 coordinator reviews of `risk:0` docs PRs. Mission Control's `belowTier` is empty | measured: verdict headings and `Verified on:` lines in each PR's comments, same script; `node scripts/mission-control/collect.mjs --json` |
| overturned | **0**: the label has never been applied. Candidates: #995, whose verifier's nit (a restored cycle's error dropped before the Toaster listens) #1030 fixed, and #1013, whose verifier's finding (a hint's coordinates copied unrounded, against ADR-0020 §2's fixed precision) #1025 fixed (HRN-024, below) | measured: `gh pr list --state all --label overturned --limit 200` printed `[]` |
| escaped defects | **2, inferred:** #1006 (D1, `sev:critical`): a correct HalfAdder failed its official vectors, because `runTest` bound `.cmp` columns by header text from `babd3e36` (2026-06-20) on; the differential agreed with the reference, and #982's fidelity review found it (HRN-033). #1018: a `.cmp` shorter than the output list passes, which predates #1016. D2 (#1007) is not counted, since #207's Out section already named it. Nine more were known at merge, as verifier findings filed as follow-ups (HRN-024, below) | inferred: reading the window's 22 issues; `git log -S` for the binding |
| tokens per merged PR | **491,677** for the 97% run (1,966,707 over 11 agents, 4 PRs) and **342,176** for the 12% run (5,816,985 over 34 agents, 17 PRs), as each record's §2 reports them. Under README § *What to measure* both are `unmeasured`: 16 `run-reviews` sessions, 8 per run for the judge reviews, report no count (HRN-027). Over the window, inferred: 7,783,692 over 21 merges, 370,652 | measured: 2026-10-22 third part §2, 2026-10-23 §2 |
| owner minutes per merged PR | **unmeasured**. Proxy: 1 `needs-human` issue opened, #993 (add `differential` to `main-rules`' required checks, JDG-006), open for 7 days with #994 waiting on it. #870 is open from before the window | measured: `gh issue list --state all --search "created:2026-10-22..2026-10-29 label:needs-human"`, filtered to the window's times |
| follow-up volume | 22 issues opened, 13 still open: 5 inbox reviews (#989 to #991 closed as covered by R917; #1009 and #1010 open), 2 judge reviews (#1011, #1012, closed), 1 owner action (#993, open) and 14 others (10 open) | measured: `gh issue list --state all --search "created:2026-10-22..2026-10-29" --limit 200`, filtered to the window's times |
| flake reruns | **0** re-runs in 1,047 workflow runs. The 2026-10-22 query was cut off (1,000 runs of a `total` of 1,191), so the window's part of that day was re-run as its last slice, `T18:00:00Z..T23:59:59Z`: 157 runs, 148 of them from 21:16Z. Each later day was one query under the cap: 388 · 167 · 73 · 69 · 73 · 73, and 56 on 2026-10-29 up to `to`. The records name one local load failure: two 5 s timeouts in #1016's verification, at a load of 25 to 42 from the parallel #1007 suite, which pass alone (issuecomment-6375412078; 2026-10-23 §3). No local re-run count | measured: the brief's `actions/runs?created=<range>` query |
| stalled reviews | **0**: the 15 `proposed` entries (HRN-020 to HRN-030, FID-033 to FID-036) are dated 2026-10-22 or 2026-10-23. None was decided in the window: R915 built #978 first, and R917 put the HRN reviews into two batches, #930 and #939. The 2026-10-22 entries pass 14 days on 2026-11-05 | measured: `node scripts/inbox.mjs list --status proposed` |
| Mission Control `metrics.flow` | 14 days from 2026-10-15T18:38Z, 116 merges: open-to-merge median 0.3 h, p90 1.2 h; #995 took 22.2 h, across the 97% run's pause. `blockedOnce` 3 of 102 (#753, #774, #959), none new. Verdict coverage: code 68 of 68, non-code 34 of 48 | measured: `node scripts/mission-control/collect.mjs --json` |
| premises | 5 hold, 1 expired, 1 unverifiable, 1 manual, as last run. P-003 (`main-rules` requires exactly `ci`, `pr-hygiene`, `browser-qa`) holds until the owner does #993; #994 then rewrites it | measured: `node scripts/lineage.mjs verify` |

**Recurrences.**
- No ledger row in two runs, while their records' §3 name eleven things that went wrong or slow
  (HRN-031).
- `inbox.mjs set` writes only the bare status form, in a third record: five judge entries since
  2026-10-22, so it is HRN-032.
- The differential agrees where HACER's grading fails: D1 shipped through it, and four verifiers ran
  the reference's grader by hand to cover the grading path (HRN-033).
- HRN-024's class on nine PRs, HRN-023's waiver five more times, HRN-022's timeout a third time and
  HRN-030's blind spot again (below).

**For the entries under review.** This is evidence only; their text is unchanged.
- **HRN-020 (#930):** `node scripts/lineage.mjs parse --github` still exits 1 at `e76c7da6`, with 95
  `malformed` errors, 10 of them citing a `JDG-` id. Three are on the window's issues: #992 ("and the
  ruling that records JDG-007's decision.") and #1003 ("PR #995 (#801)" under Introduced by, "as
  amended by the judge on #1012" under Decisions).
- **HRN-021 (#930):** no recurrence. All 21 PRs open with the brief's heading, the 7 coordinator
  reviews included.
- **HRN-022 (#930):** a third time, after #908 and #959: #1016's verifier had two 5 s timeouts under
  the parallel #1007 suite (local 5,086 passed and 2 failed; CI 5,096 and 0), both passing alone.
- **HRN-023 (#935):** five more waivers by ruling: R899 (#987), R911 (#1016), R912 (#1019), R913
  (#1027) and R914 (#1028). Every PR of the window that changes grading or evaluation merged on its
  verifier's hand-run of the reference (25, 7, 9, 8 and 12 cases). The one separate fidelity review,
  #982, on the epic and its plan rather than on a PR, found D1 and D2, both `sev:critical` and both
  shipped. HRN-033 would turn the grading half of those hand-runs into a check.
- **HRN-024 (#936):** 9 of the 14 code PRs passed with a verifier finding that a follow-up carries:
  #995 → #1003, #1013 → #1014, #1016 → #1018, #1020 → #1023, #1022 → #1024, #1025 → #1026, #1028 →
  #1029, #1031 → #1032 and #1033 → #1034. Two more left theirs unfiled: #1030's three nits (R916) and
  #1027's, posted on #985. Two were fixed within the window, #1003 by #1030 and #1014 by #1025, so
  #995 and #1013 are this run's candidates. #1013's chain ran one PR further: #1025's own verifier
  filed #1026.
- **HRN-025 (#930):** unchanged at `e76c7da6`: `inbox-panel-brief.md` still launches `--models
  opus,grok` and files "`agent-ready` at any risk".
- **HRN-026 (#930):** both runs read the meter from the status-line capture (R891), with no failure
  (2026-10-22 third part §1, 2026-10-23 §1).
- **HRN-027 (#939):** 16 more uncounted `run-reviews` sessions. The two runs' denominators also
  overlap: the 12% run's `run-prs` window starts at 20:06Z, before the 97% run's ends at 20:20:17Z, so
  #995 counts in both. #1004, the 97% run's records PR, counts in the 12% run, and #1035, the 12% run's
  own, in neither.
- **HRN-028 (#939):** `.husky/pre-commit` is unchanged at `e76c7da6`: no shebang and no `set -e`.
- **HRN-029 (#939):** README § *Budgets* is unchanged, and both runs practised (i) to (iii) again (each
  §1). On (iv), R906 scaled R896's margins to a 9-point run: no new chain two points below the stop and
  the records one below, not three and two. A margin fixed in points would have been wrong for this
  run.
- **HRN-030 (#939):** the 97% run's close was the third on 2026-10-22's record (#1004), and its own §3
  names this entry's case. Computed with `retroLine` (`scripts/backlog.logic.mjs`) over `main`: from
  #1004's merge the line read `retro:`, not due, until #1035 added the 2026-10-23 record. It cost nothing
  this time, because the 12% run's orient at 20:06Z came before #1004 landed and no orient came between
  #1035 and this run's.

**For the filed entries.**
- **HRN-008 (#871):** this run was dispatched as a general-purpose agent handed the role file again.
  The owner's `ln -s`, #870, is still open.
- **HRN-009 (#873):** the line was due from #1035's merge, and this run was dispatched at the first
  orient after it.
- **HRN-016 (#895):** `ready` prints `process review: 7 days since 2026-10-22`.

**Prune check:** the per-PR Cursor second opinion, a fourth window. Its audit log still has 14 rows,
the last on 2026-09-21T09:52Z, and none for this window's 21 merges, 14 of them `risk:1` or `risk:2`
(measured). The first quarterly prune, in the week of 2026-12-18, can start from it.

**Held** (found, but no entry this run):

- **Times written from estimates**, a third run: R903 to R905 were staged at 2026-10-22T22:40Z to
  22:50Z, and #981 and #980 closed at 2026-10-23T09:25Z and 09:31Z; R895's time was fixed the same way
  (2026-10-22 third part §3). Each was corrected before merge by reading GitHub, and no check found
  here would catch an estimate earlier.
- **L073** on all four judge reviews of the 12% run (2026-10-23 §3). The launcher is outside this
  repo, and R889's owner-action route for it is still unused.
- **Slots and picks decided by ruling:** R897 and R900 gave a bug build a slot beside the judge queue,
  and R910 and R915 passed over what `next` named. Pick rule 0 orders one pick, while the runs fill
  three slots.
- **#978's after-merge step** named six entries for a batch of five (R917), once.
- **#995's `Decisions:` line** left R898 off because the ruling was in a records PR not yet merged,
  and nothing added it afterwards, once.
- **A record's count disagrees with its source:** 2026-10-23 §2 gives #1031 178 reviewable lines,
  where its `HYGIENE:` line gives 184, once.
- **P-001**, expired since 2026-09-22 with #569 open, as last run.

**Not measured:** owner minutes; the 16 `run-reviews` sessions' tokens and the coordinators' own;
2026-10-22's first three slices, which fall before the window; local re-run counts beyond the one the
records name; this retro's own tokens.

## Queue

### HRN-001 · `backlog.mjs ready` flags an issue that a merged PR already references, so "already delivered" is found at pick time
- **Date:** 2026-10-15 · **Kind:** mechanise · **Retro run:** 2026-10-15
- **Status:** filed (#702), closed by PR #711 on 2026-10-15
- **Evidence:** issues closed without a PR as already delivered, in all three records:
  #153 and #335 (2026-09-29 §2), #159 (2026-10-02 §2) and #304 (2026-10-04 §2). Each was found by
  a builder or the coordinator after the pick. None has a ledger row, because the session records'
  recurrences do not reach the ledger.
- **Cost if wrong:** a false flag makes a pickable issue look done. It is mitigated by flagging the
  issue with a reason, never hiding it.
- **Decides:** owner decides; the coordinator files it unless the owner declines.

**Draft issue body**
## Goal
`backlog.mjs ready` and `next` say when an open issue is cited by a merged PR's body or title, so a
coordinator checks for delivery before claiming, not after a builder has started.
## Acceptance criteria
- A pure function in `scripts/backlog.logic.mjs` takes the open tasks and the merged PRs' numbers,
  titles and bodies, and returns, per task, the merged PRs citing it (`#<n>` at a word boundary).
- `ready` prints `possibly-delivered: #<pr>` beside such a task and keeps it in the list.
- Tests: a task cited by a merged PR's `Part of #n` is flagged; a task cited only by an open PR is
  not; `#1530` does not match task 153.
## Verification command
`pnpm exec vitest run scripts/backlog.logic.test.mjs`
## Blocked by
—

### HRN-002 · `backlog.mjs claim` prints what changed under the issue's "Files likely touched" since the issue was written
- **Date:** 2026-10-15 · **Kind:** mechanise · **Retro run:** 2026-10-15
- **Status:** filed (#703), closed by PR #716 on 2026-10-15
- **Evidence:** premises that no longer held, each found by a builder before building:
  - 2026-09-29 §3: R769, R770;
  - 2026-10-02 §3: #632, #407, #368, #481;
  - 2026-10-04 §3: #516, #392, #547, #418.

  The ledger has the class as L046, L048 and L059, all `partly`. `scripts/issue-facts.mjs` (#394)
  checks only package and path claims, which "catches one" of the seven occurrences that #394 and
  L059 record (`README.md`, the measured-facts row).
- **Cost if wrong:** claim output gets noisier. A long list is a hint, not a gate. A builder may
  still miss a premise that changed in a file the issue never named.
- **Decides:** owner decides; the coordinator files it unless the owner declines.

**Draft issue body**
## Goal
At claim time the builder sees how far the code under an issue has moved since the issue was
written, so a stale premise is measured first, not discovered mid-build.
## Acceptance criteria
- `claim` reads the issue's `createdAt` and its "Files likely touched", using `parseFilesLikelyTouched`
  from `scripts/blast-radius.logic.mjs`. It prints the merged commits touching those paths since then
  (`git log --since=<createdAt> --oneline -- <paths>`), with a count, or `no seed files named`.
- The commit selection is a pure function with tests: no commits, some commits, no seeds.
- The claim still succeeds whatever the count.
## Verification command
`pnpm exec vitest run scripts/backlog.logic.test.mjs`
## Blocked by
—

### HRN-003 · L055 is due a mechanism: junction test fixtures are built through the store's own gesture
- **Date:** 2026-10-15 · **Kind:** mechanise · **Retro run:** 2026-10-15
- **Status:** filed (#704), closed by PR #718 on 2026-10-15
- **Evidence:** L055 says of itself, "Second occurrence (#365, #396), so it is due a mechanism". No
  open issue covers it. 12 test files under `src/` hand-write a `wireIds: [` literal
  (`command grep -rl "wireIds: \[" src --include=*.test.ts --include=*.test.tsx`). #403's guard
  tests drive the real gesture, but nothing stops the next fixture from hand-writing a shape no
  action produces.
- **Cost if wrong:** test churn in up to 12 files, for a class that has escaped twice (B-009).
- **Decides:** owner decides; the coordinator files it unless the owner declines.

**Draft issue body**
## Goal
A junction in a store test exists only as the app creates one, so a fix cannot pass on a shape no
action writes.
## Acceptance criteria
- A test helper builds a junction through `startWiringFromJunction` → `completeWiringFromJunction`
  and returns its ids.
- A unit test fails when a store-action test file (`src/store/**/*.test.ts`) constructs a junction
  object literal with `wireIds`. Existing sites are migrated or listed with a reason.
## Verification command
`pnpm exec vitest run src/store`
## Blocked by
—

### HRN-004 · `scripts/merge-on-green.mjs` ends with one greppable outcome line
- **Date:** 2026-10-15 · **Kind:** mechanise · **Retro run:** 2026-10-15
- **Status:** filed (#705), closed by PR #709 on 2026-10-15
- **Evidence:** two coordinator slips in one run (2026-10-04 §3), both about reading a merge's
  outcome.
  - #688 was recorded as merged when its merge had failed: `pr-hygiene` found no linked issue.
  - A chain of background merges deadlocked for about 15 minutes, because each wait grepped a log
    for an `exit=` marker that only the task output carried.

  The tool prints timestamped progress lines and exits `0`/`2`/`3`/`4`
  (`scripts/merge-on-green.mjs:11`), but no single line states the outcome. Other gates here end
  with one (`HYGIENE:`, `CASE-COLLISIONS:`, `LINEAGE:`). This relates to the measurement rule "exit
  0 is not acceptance".
- **Cost if wrong:** one more output line. A coordinator that reads nothing gains nothing.
- **Decides:** owner decides; the coordinator files it unless the owner declines.

**Draft issue body**
## Goal
A merge's outcome can be read from its log alone.
## Acceptance criteria
- The last line is
  `MERGE-ON-GREEN: <merged|check-failed|timeout|needs-person> pr=<n> head=<sha> exit=<code>`. On
  `merged` it also carries the merge commit, and the `exit` field always matches the process exit
  code.
- The line is formatted by a pure function in `scripts/merge-on-green.logic.mjs`, with a test per
  outcome. The CLI test asserts it is the final stdout line.
## Verification command
`pnpm exec vitest run scripts/merge-on-green.logic.test.mjs scripts/merge-on-green.cli.test.mjs`
## Blocked by
—

### HRN-005 · Measure the four numbers or retire two of them: tokens and owner minutes have no source
- **Date:** 2026-10-15 · **Kind:** policy · **Retro run:** 2026-10-15
- **Status:** filed (#850)
- **Evidence:**
  - `README.md` § *What to measure* says the coordinator reports tokens per merged PR "when it
    reports the run" until `scripts/agent-orient` (#156, open) exists. <!-- allow-missing-path -->
    None of the three records does.
  - Owner minutes have no source anywhere.
  - This run could measure the other two: median reviewable lines (73) and escaped defects (2,
    inferred).
  - The coordinator already sums subagent tokens for its ~2M run budget (`README.md` § *Budgets*).
- **Proposal:**
  - **(a)** A session record's §2 gains one line: subagent tokens for the run divided by its merges,
    from the same task-notification sum the budget uses.
  - **(b)** Owner minutes are replaced by a countable proxy: `needs-human` issues opened, plus the
    owner's comments on PRs in the window.
  - **(c)** Otherwise, the two unmeasured numbers come off the list until #156 measures them. A
    metric nobody reports is a component nobody exercised (the prune rule).
- **Cost if wrong:** with (a), one line per record. With (c), the cost signal #255 asked for is gone
  until #156 lands.
- **Decides:** owner decides.

### HRN-006 · Say who applies `overturned`, and apply it to the PASS whose defect a later PR fixed
- **Date:** 2026-10-15 · **Kind:** policy · **Retro run:** 2026-10-15
- **Status:** filed (#852)
- **Evidence:**
  - `model-tiering.md` §2 makes "one `overturned` Sonnet verdict" the condition for moving
    `risk:0`/`risk:1` verification off Sonnet. The label exists, but it has never been applied
    (measured above), and no brief says who applies it.
  - The window has one candidate: #651 passed on Opus, and #667 then found its update path could
    never complete (L065). Its verifier had called that path unproven, so whether this counts as an
    overturn is itself the owner's call.
- **Proposal:** the retro role reports each candidate in its run row. The coordinator applies
  `overturned` to the PR, naming the later PR, unless the owner declines.
- **Cost if wrong:** a label applied too freely moves a tier on noise. Never applied, the tier rule's
  revert condition can never fire.
- **Decides:** owner decides.

### HRN-007 · Align the concurrent-subagent cap with the owner's rulings: 4 in config, 2–3 in practice
- **Date:** 2026-10-15 · **Kind:** policy · **Retro run:** 2026-10-15
- **Status:** filed (#857)
- **Evidence:**
  - `.claude/settings.json` sets `CLAUDE_CODE_MAX_CONCURRENT_SUBAGENTS=4`, and `README.md`
    § *Budgets* says 4.
  - The owner's rulings say two at a time: R777 (2026-09-29), R782 (2026-10-02) and R798
    (2026-10-04). `process-review-brief.md` §5 says "at most three at once".
  - The machine overloaded twice: thermal throttling in L060, and load 76 with three builders
    installing (2026-10-02 §3).
- **Proposal:** set the README row and the env value to 3, the owner's ceiling. Keep "2 when the
  machine is hot" as the coordinator's call, citing R777.
- **Cost if wrong:** a lower cap slows a run on a cool machine. L019 is why the retro proposes this
  and does not change it.
- **Decides:** owner decides.

### HRN-008 · Register the `hacer-*` agent types where sessions start: the parent workspace
- **Date:** 2026-10-15 · **Kind:** policy · **Retro run:** 2026-10-15
- **Status:** filed (#871), with #870 as the owner's one `ln -s` (R865)
- **Evidence:** 2026-10-02 §5: agent types under this repo's `.claude/agents/` are not registered
  when a session starts in the parent workspace, so the fidelity review of #643 ran as a general-purpose agent handed the
  file. 2026-09-29 §5 recorded the same root cause for `.mcp.json`. Both records call it "the
  owner's call", and nothing tracks it. This role is affected too: `retro-brief.md` § *Cadence*
  carries the general-purpose fallback.
- **Proposal:** a workspace-level link from the parent workspace's agents folder to the five `hacer-*` files, set up
  on the owner's machine, outside this repo.
- **Cost if wrong:** a stale link dispatches an old role file. Without it, every role keeps running
  through the hand-the-file fallback.
- **Decides:** owner decides.

### HRN-009 · Run the retro at each coordinator run's close, not every 5 merges
- **Date:** 2026-10-15 · **Kind:** policy · **Retro run:** 2026-10-15
- **Status:** filed (#873)
- **Evidence:** at the measured rate (36, 27 and 12 merges in the three runs), "every 5 merged PRs"
  means 7, 5 and 2 retros per run. Each run spends ~110–190k tokens on Opus, if it costs what one
  Opus verifier does (`model-tiering.md` §4); that is inferred, not measured. A recurrence inside a run is
  already caught by the one-line retro after each PR (`ha-next` §6).
- **Proposal:** the coordinator runs one retro at each run's close, over that run's merges. It also
  runs one after 7 days whenever `main` has moved, which covers cloud-lane merges between runs. The
  due check becomes a line in `backlog.mjs next` ("retro due: N merges since <date>").
- **Cost if wrong:** a recurrence that a mid-run retro would have caught waits until the close, at
  most one run.
- **Decides:** owner decides. Until then the brief's cadence stands.

### HRN-010 · Each worktree gets its own scratch folder, printed when it is made, and PR bodies go through it
- **Date:** 2026-10-21 · **Kind:** mechanise · **Retro run:** 2026-10-21
- **Status:** filed (#881)
- **Evidence:**
  - L069 has two occurrences. In 2026-10-14 §3, #740 showed #741's body for about a minute, because
    both builders wrote one file name, pr-body.md, in the shared scratchpad. In 2026-10-15 §3, the #753 and #754
    verifiers wrote the same `dod-*.log` names.
  - The row says it is "due a mechanism" and "the committed briefs do not say it yet". The fix lives
    only in dispatch prose, repeated in 2026-10-14 §5, 2026-10-15 §5 and 2026-10-17 §5.
  - Related: an inline body edit lost a word of #754's body to backtick substitution (2026-10-15 §3).
  - No open issue covers it (searched "scratch").
- **Cost if wrong:** one more printed line and two pinned brief lines. A folder under git's admin
  directory is unfamiliar, so a builder may choose a temp-directory path instead.
- **Decides:** the inbox panel (`inbox-panel-brief.md`); the owner may override

**Draft issue body** (`risk:1`)
## Goal
Two agents working at once never write the same scratch file. Each worktree's scratch folder is
unique, and every brief says to use it.
## Acceptance criteria
- `scripts/wt-new` creates a folder unique to the worktree and outside its work tree, for example
  under `git rev-parse --git-dir`, and prints `SCRATCH: <path>`. Lint, tests and `git status` never
  see it.
- A pure function in `scripts/wt-new.logic.mjs` computes the path. A test shows that two worktrees
  get different paths.
- `implementer-brief.md` and `verifier-brief.md` say to write scratch files (PR bodies, logs) there,
  and to pass a body with `--body-file`, never inline. `scripts/skills.logic.mjs` pins both
  sentences.
- The verifier's worktree step makes the same folder.
## Verification command
`pnpm exec vitest run scripts/wt-new.logic.test.mjs scripts/skills.logic.test.mjs`
## Blocked by
—

### HRN-011 · `backlog.mjs tier <pr>` gives the verifier's tier from the PR's paths, and Mission Control lists a verdict given on a cheaper tier
- **Date:** 2026-10-21 · **Kind:** mechanise · **Retro run:** 2026-10-21
- **Status:** filed (#884)
- **Evidence:**
  - L070 has two occurrences in one run (2026-10-14 §3). #739 changed tests under `src/core/spec`,
    was verified on Sonnet, and merged on R824. #748 changed production code under
    `src/core/serialization`; its tier was picked from its `risk:1` label, and an Opus second pass
    followed.
  - The row says "due a mechanism: the tier computed from the changed paths at dispatch".
  - Today the rule is text only: the model line in `verifier-brief.md`, which
    `scripts/skills.logic.mjs` pins, and `model-tiering.md` §2. All three records repeat it as a
    resume step.
  - `scripts/mission-control/collect.logic.mjs` already reads each verdict's `Verified on:`.
  - No open issue covers it. #201 is an advisory CI verifier, which is a different thing.
- **Cost if wrong:** one command per dispatch. A wrong function would mis-tier every dispatch the
  same way, so its tests use the brief's own cases.
- **Decides:** the inbox panel (`inbox-panel-brief.md`); the owner may override

**Draft issue body** (`risk:1`)
## Goal
The verifier's model is worked out from the PR, not read from its label, and a mis-tiered verdict
shows up after the merge.
## Acceptance criteria
- A pure function in `scripts/backlog.logic.mjs` takes a PR's changed paths and labels. It returns
  `opus`, with the reason, when a path is under `src/core/` or `src/simulation/` or the PR is
  `risk:2`. Otherwise it returns `sonnet`. Tests:
  - a `risk:1` change under `src/core/serialization` is `opus`;
  - a tests-only change under `src/core/spec` is `opus`;
  - a `risk:0` docs change is `sonnet`.
- `node scripts/backlog.mjs tier <pr>` reads the files with pagination and prints
  `VERIFIER-TIER: <opus|sonnet> pr=<n> because=<path or label>`.
- Mission Control's verdict coverage lists each merged PR whose `Verified on:` names Sonnet where the
  function gives Opus.
## Verification command
`pnpm exec vitest run scripts/backlog.logic.test.mjs scripts/mission-control/collect.logic.test.mjs`
## Blocked by
—

### HRN-012 · `merge-on-green` reports a missing `workflow` token scope before it touches a PR that changes `.github/workflows/`
- **Date:** 2026-10-21 · **Kind:** mechanise · **Retro run:** 2026-10-21
- **Status:** filed (#883)
- **Evidence:**
  - L013 has two occurrences:
    - 2026-09-18: dependabot #118 and #131, and a `.github/workflows/ci.yml` hunk in #245.
    - 2026-10-16: the merge tool could not update dependabot #755 and #758 (exit 4), and #768's CI
      job became a suite test (R841; 2026-10-15 §3).
  - The row says "the session-start scope check is due".
  - The token has the scope again today (`gh auth status` lists `workflow`), and nothing would say
    when it lapses next.
  - No open issue covers it (searched "workflow scope" and "token scope"). #156's session-start
    screen names no scope check.
- **Cost if wrong:** one header read per merge. It does not restore the scope: the refresh stays the
  owner's.
- **Decides:** the inbox panel (`inbox-panel-brief.md`); the owner may override

**Draft issue body** (`risk:1`)
## Goal
A lapsed `workflow` scope is reported as itself, at the first PR it blocks, and not as a failed
update.
## Acceptance criteria
- A pure function in `scripts/merge-on-green.logic.mjs` takes the token's scopes (the
  `x-oauth-scopes` header of `gh api -i user`) and the PR's changed paths. When a path is under
  `.github/workflows/`, it returns the missing scope. Tests cover a present scope, an absent one,
  and a PR with no workflow path.
- On a missing scope, the run stops before any update. It exits 4 with
  `MERGE-ON-GREEN: needs-person …`, and the reason names `gh auth refresh -s workflow`.
## Verification command
`pnpm exec vitest run scripts/merge-on-green.logic.test.mjs`
## Blocked by
—

### HRN-013 · `backlog.mjs next` prints each workflow failing on `main`, so a broken release is seen at the next pick
- **Date:** 2026-10-21 · **Kind:** mechanise · **Retro run:** 2026-10-21
- **Status:** filed (#888)
- **Evidence:**
  - L012 (2026-09-18): five release runs failed before anyone looked.
  - L071 (2026-10-15 §3): 20 `Release` runs failed between 03:23Z and 23:41Z, about 20 hours across
    the end of one run and the start of the next. The row says "Nothing watches `main`'s post-merge
    runs yet" and is `partly`.
  - #772 catches only the preset class, at PR time. 2026-10-15 §5 asks each run to read
    `gh run list --workflow Release --branch main --limit 5` by hand.
  - #156 would print "CI status of main" at session start. But it is `risk:2`, blocked by H5 and not
    `agent-ready` since 2026-09-24. A line at session start would also have missed the eight hours
    of the break that fell inside the 2026-10-14 run.
- **Cost if wrong:** one `gh run list` call per `next`, and one more line to read. A failed fetch
  must not break `next`; `possibly-delivered` already works that way.
- **Decides:** the inbox panel (`inbox-panel-brief.md`); the owner may override

**Draft issue body** (`risk:1`)
## Goal
Every pick shows a workflow that is failing on `main`.
## Acceptance criteria
- A pure function in `scripts/backlog.logic.mjs` takes `main`'s recent runs
  (`gh run list --branch main --limit 100 --json databaseId,workflowName,conclusion,createdAt`).
  For each workflow whose newest completed run failed, it returns how many failed in a row, with
  the first failure's time and id. Tests:
  - every workflow green;
  - a workflow whose latest runs failed in a row;
  - a newest run still in progress is skipped;
  - no runs at all.
- `next` prints `main: <workflow> failing, <n> in a row since <time> (run <id>)` for each failing
  workflow, or `main: workflows green` when none fails. A failed fetch prints
  `main: unread (<reason>)`, and `next` still exits 0.
## Verification command
`pnpm exec vitest run scripts/backlog.logic.test.mjs`
## Blocked by
—

### HRN-014 · `run-prs` says when its `--to` is still in the future, so a record's merge count can be reproduced
- **Date:** 2026-10-21 · **Kind:** mechanise · **Retro run:** 2026-10-21
- **Status:** filed (#892)
- **Evidence:**
  - 2026-10-14 §2 reports "37 PRs" from `--from 2026-10-14T22:00:00Z --to 2026-10-15T23:59:00Z`.
    The record merged at 2026-10-15T11:17Z (#750). The same command now prints 41, because it also
    counts the next run's merges (measured today).
  - 2026-10-15 §2 used `--to 2026-10-16T03:00:00Z`, after the record merged at 02:04Z (#775). It
    still prints 20 only because nothing merged in between.
  - #538 made the count derived, not hand-counted. A `--to` in the future undoes that, and nothing
    says so.
  - No open issue covers it (searched "run-prs").
- **Cost if wrong:** one line of output. A record may still mean "until the reset"; the output then
  says the window is still open.
- **Decides:** the inbox panel (`inbox-panel-brief.md`); the owner may override

**Draft issue body** (`risk:1`)
## Goal
A `run-prs` count whose window is still open says so.
## Acceptance criteria
- A pure function in `scripts/run-prs.logic.mjs` takes `--to` and the current time, and returns a
  note when `--to` is later. Tests cover a `--to` that is past, equal to now and in the future.
- In that case the console's last line becomes `<n> PRs merged (window open until <to>)`. `--json`
  is unchanged.
## Verification command
`pnpm exec vitest run scripts/run-prs.logic.test.mjs`
## Blocked by
—

### HRN-015 · Write the coordinator's `risk:2` `agent-ready` practice into the queue-up rule, or stop it (R816)
- **Date:** 2026-10-21 · **Kind:** policy · **Retro run:** 2026-10-21
- **Status:** filed (#893)
- **Evidence:**
  - The rule: the queue-up row of `README.md` § *The five sentences it answers* gives `agent-ready`
    "only if risk:0/1". Its one exception is product-role polish.
  - The practice: in the window, nine `risk:2` issues outside polish became `agent-ready` without the
    owner's triage. Measured from their labels and the rulings:
    - #374, #377 and #378, by R815, R825 and R826;
    - #699, #705, #713, #714 and #715, by R816;
    - #814, filed by the inbox panel for FID-009 (2026-10-17 §2).
  - The open question: R816 asks "whether the queue-up rule binds follow-ups, or the practice is
    written into it" (`docs/decisions/rulings/2026-10-14-hacer-loop-50.md`). 2026-10-14 §4 raised
    it for the owner, and neither later record carries it forward.
  - What it led to: 21 `risk:2` PRs merged. 7 of the window's 9 BLOCKs were on them, and each was
    fixed and passed by a fresh Opus verifier. No escaped defect traces to one (inferred, from the
    numbers above).
- **Proposal:**
  - **(a)** The queue-up row allows `agent-ready` at `risk:2` when all of these hold:
    - the issue is a slice or follow-up of an owner-approved plan, or an inbox-panel approval;
    - a ruling names it;
    - an Opus builder builds it and an Opus verifier checks it, with an ADR-0018 fidelity review when
      it changes engine semantics.

    This is what the window did. Anything else stays `needs-human`.
  - **(b)** Otherwise the rule stands, and such issues go `needs-human`.
- **Cost if wrong:** with (a), a `risk:2` change ships that the owner never read, guarded only by
  the reviews. With (b), every spine slice waits on the owner, against "nothing waits for me" (R844,
  2026-10-17 §1).
- **Decides:** the inbox panel (`inbox-panel-brief.md`); the owner may override

### HRN-016 · The fortnightly process review has not run since 2026-09-26: print when it is due, and give it default reviewers
- **Date:** 2026-10-21 · **Kind:** policy · **Retro run:** 2026-10-21
- **Status:** filed (#895)
- **Evidence:**
  - `docs/harness/reviews/` holds one cycle, `2026-09-26`, whose
    `docs/harness/reviews/2026-09-26/SYNTHESIS.md` was added on 2026-09-27.
  - `process-review-brief.md` and `docs/harness/reviews/README.md` say "at least every two weeks",
    so the next cycle was due by 2026-10-10. At this window's `to` it has been 25 days, with 63
    merges and three runs since.
  - Nothing prompts it. No skill names it (`grep -rln -i "process review" .claude/skills/` finds
    nothing). A cycle's step 2 runs "on any model or tool the owner picks"
    (`docs/harness/reviews/README.md`), so each cycle waits on the owner.
  - The retro's cadence lapsed the same way (HRN-009).
- **Proposal:**
  - **(a)** The due line that HRN-009 proposes for `backlog.mjs next` also prints
    `process review due: <n> days since <cycle>` once the latest cycle is 14 or more days old.
  - **(b)** Step 2 gets default reviewers: the inbox panel's pair, Opus (verify) and Grok
    (read-only), through `multi-review`. The owner may pick others.
- **Cost if wrong:** a cycle costs a brief, two reviews and a synthesis. Its tokens are unmeasured,
  because the 2026-09-26 cycle reports none. Left as it is, nothing asks whether the flow moves the
  platform forward.
- **Decides:** the inbox panel (`inbox-panel-brief.md`); the owner may override

### HRN-017 · Split a rerun query that hits the API's 1,000-run cap, as 2026-10-15 did
- **Date:** 2026-10-21 · **Kind:** policy · **Retro run:** 2026-10-21
- **Status:** filed (#898)
- **Evidence:**
  - `retro-brief.md` input 6 queries one day at a time, "because the API stops at 1,000 runs per
    query, and a busy day here has had 775".
  - On 2026-10-15, the day query returned exactly 1,000 runs. Four six-hour queries returned 447,
    363, 18 and 193, which is 1,021 (measured). A day cut off at the cap reads as fewer runs, and
    perhaps fewer reruns, with no error.
- **Proposal:** input 6 says to re-run a query that returns exactly 1,000 runs in six-hour slices
  (`created=<day>T00:00:00Z..<day>T05:59:59Z`, and so on), and to record the split in the run row.
- **Cost if wrong:** four more queries on a busy day. Left as it is, the busiest day's reruns go
  uncounted.
- **Decides:** the inbox panel (`inbox-panel-brief.md`); the owner may override

### HRN-018 · A second coordinator collides in four places that nothing guards: allow one only with guards, or say there is one
- **Date:** 2026-10-22 · **Kind:** policy · **Retro run:** none (filed at the close of the 2026-10-21 coordinator run)
- **Status:** filed (#955)
- **Evidence:**
  - The owner asked on 2026-10-21 whether another session can run the loop beside the running one "to
    clear the queue faster" (R855). The run fixed one gap and left four.
  - What held. A claim is an exclusive `refs/heads/claim/<n>` ref, so two coordinators never claim one
    issue. The core order lived only in the first coordinator's run files, so R855 wrote it as GitHub
    blocked-by links, which `scripts/backlog.mjs` reads: #816 and #811 behind #813, #814 behind both, each link
    clearing when its blocker closed. The run used the same links for #820 (behind #816, #811, #836, #821
    and #814), #873 (behind #871), #884 (behind #881 and #887), #888 (behind #884), #895 (behind #888) and
    #903 (behind #901).
  - Ruling ids. `node scripts/lineage.mjs next-id` reads `docs/decisions/rulings/`, so two coordinators
    both read the same next id. This run read R852 at its start and staged R852–R876 outside the repo
    until its records PR. A second coordinator staging at the same time would use the same ids, and the
    later records PR would renumber (R855's cost if wrong).
  - The session record. `docs/harness/sessions/` holds one file per date (`README.md` § *sessions*), so
    two closes on one date write one path.
  - The agent cap. R866's three is per laptop, from the owner's "you can raise the number of parallel
    agents to 3", and so is the heat; the caps count one coordinator's agents. On 2026-10-21 the load read
    16.45 / 66.67 / 50.70 at 17:12Z with a `codex` process and headless Chromium shells that were not this
    run's (R861). A second coordinator's agents add to that load unseen.
  - `node scripts/inbox.mjs queue`. Its dedupe reads GitHub's search index, which lags. At 15:54Z it filed
    #827–#835; a dry run seconds later still listed 2 to file, and one a minute later listed 0
    (2026-10-21 §3). Two coordinators running it within a minute can each file a review
    for one entry.
- **Proposal:**
  - **(a)** One coordinator per repository at a time stays the rule. `ha-next` and the loop's README
    section say so, and the owner's "another session" is answered with that sentence. Claims and blocked-by
    links still guard a stray second session.
  - **(b)** A second coordinator is allowed, with four guards, each a check or a rule:
    - rulings are numbered at close only, from `next-id` at that moment, and a collision is a renumbering in
      the later records PR (already R855's rule);
    - the session record is `sessions/<date>-<run>.md` when a second run closes on the same date;
    - the agent cap is read from the machine, not counted per coordinator: the 5-minute load average
      above 12 means no third agent, whoever started the others (R866);
    - `queue` re-reads after a minute, or the coordinator runs it alone, so one entry gets one review.
- **Cost if wrong:** with (a), the queue clears at one coordinator's pace, as now. With (b), a
  collision lands as a renumbering in a records PR, a duplicate review issue (closed by hand), or a hot
  laptop; none reaches `main`, since every merge still goes through `merge-on-green`.
- **Decides:** the inbox panel (`inbox-panel-brief.md`); the owner may override

### HRN-019 · `merge-on-green` rebase-merges a test-only PR whose red commit fails on purpose, against the implementer brief's one-commit rule
- **Date:** 2026-10-22 · **Kind:** policy · **Retro run:** none (filed at the close of the 2026-10-21 coordinator run)
- **Status:** filed (#958)
- **Evidence:**
  - `docs/harness/implementer-brief.md` (Test-only issues): the PR "lands as one `test(<scope>): …`
    commit with the red recorded in its message". #837 (#811) had four commits, and `a227f2b4` failed
    three tests on purpose, which is how the red was shown.
  - `scripts/merge-on-green.mjs` always merges with `--rebase` (line 167), so it would have put
    `a227f2b4` on `main`. The coordinator noticed at the verifier's nit and did not run the tool (R858).
  - A squash is not available. R858 took the tool's freshness steps by hand and then ran
    `gh pr merge --squash`; GitHub refused with "Squash merges are not allowed on this repository".
    The ruleset allows rebase merges only, whatever the repository's own flag says (R859).
  - What worked, by hand: R790's recipe. The squash of the rebased head `68faf6ba` onto its parent
    gave tree `8d525080`, identical to the verified head's, so the branch was re-opened as #841 with
    one commit and the PASS carried by tree identity (R859). #841 merged as one commit on `main`;
    #837 closed unmerged.
  - One occurrence. No other test-only PR in the window had a deliberate red commit.
- **Proposal:**
  - **(a)** `merge-on-green` refuses before it updates the branch, with its own exit code and a line
    that names R790's recipe, when the PR's title starts `test(` and the PR holds more than one commit.
    A builder then opens a test-only PR as one commit, as the brief says.
  - **(b)** The tool does R859's steps itself: it squashes the rebased head onto its parent, checks the
    tree equals the verified head's, opens the single-commit PR and closes the old one, and prints both
    numbers. The verifier's PASS carries over only when the tree is identical.
  - Not proposed: a `--squash` flag. It needs the ruleset to allow squash merges, which is the
    owner's change, and the repository flag already says squash while GitHub refuses.
- **Cost if wrong:** with (a), a test-only PR the builder shaped as several commits waits for a
  re-open before it merges. With (b), the tool makes a branch and a PR on the coordinator's behalf, and
  a wrong tree comparison would carry a PASS to a head nobody reviewed. Left as it is, the next
  several-commit test-only PR can put a failing commit on `main` if the coordinator does not catch it.
- **Decides:** the inbox panel (`inbox-panel-brief.md`); the owner may override

### HRN-020 · A PR's `Decisions:` line takes only decision ids or a bare `none`, so the inbox ids and the prose builders write make `lineage parse --github` report it malformed
- **Date:** 2026-10-22 · **Kind:** mechanise · **Retro run:** none (filed at the close of the 2026-10-21 coordinator run)
- **Status:** proposed
- **Evidence:**
  - Measured at `origin/main` `74ee3461` on 2026-10-22, `node scripts/lineage.mjs parse --github`
    exits 1 with 78 `malformed` errors on 28 PRs and issues, each "in Decisions is not a decision id (ADR-NNNN,
    R<n> or P-<n>, optionally then §section)". `lint:lineage` does not pass `--github`, so CI is green.
  - The inbox id. #902's line is `Decisions: HRN-016 (#834)`. A PR that implements a panel-approved
    entry has no ruling id to cite, since R844 is the panel's rule and the approval is a comment
    (`implementer-brief.md` asks for ids or `none`).
  - `none` plus prose does not parse either: `refList` (`scripts/lineage.logic.mjs`) takes the whole
    line as `none`, `unknown` or a comma-separated list of refs. #880's line, "none. This implements the
    inbox panel's approval of HRN-009 on #800, which has no decision id.", is reported twice, and so are
    #896, #858, #841, #837, #780, #718, #707 and #689. Of the 78 errors, 13 are on a line that opens with
    `none`.
  - Ranges and notes fail the same way: `R843–R851` (#815, #775, #750, #691) and an id followed by a
    parenthetical (#735, #731, #726, #690).
- **Proposal:**
  - **(a)** `parseGithub` accepts an inbox id (`FID-`, `HRN-` or `PRD-` and digits, optionally followed
    by `(#n)`) as an artefact the PR cites, and ends the value at the first sentence after `none`.
  - **(b)** The parser stays strict. `implementer-brief.md` says the line holds ids or the bare word
    `none` and nothing else, the PR's prose and any inbox id go in the body, and `pr-hygiene` warns when
    the line would be malformed.
- **Cost if wrong:** with (a), the parser takes a looser line, so a typo after `none` is no longer
  caught. With (b), builders lose the place that names the panel's approval on the PR's lineage. Left
  as it is, `parse --github` stays red and the 28 PRs' implements edges are partly missing.
- **Decides:** the inbox panel (`inbox-panel-brief.md`); the owner may override

**Draft issue body** (`risk:1`; for option (a), or for (b)'s check)
## Goal
`node scripts/lineage.mjs parse --github` exits 0 on the PRs this repository writes, and a builder
knows what the `Decisions:` line may hold.
## Acceptance criteria
- Tests in `scripts/lineage.logic.test.mjs` for the chosen option: `Decisions: HRN-016 (#834)` and
  `Decisions: none. <sentence>` are not `malformed` under (a); under (b), `pr-hygiene` reports both and
  `implementer-brief.md` states the rule, pinned in `scripts/skills.logic.mjs`.
- The 28 PRs and issues now reported are listed in the PR body with their outcome (fixed in the
  parser, or left as history).
## Verification command
`pnpm exec vitest run scripts/lineage.logic.test.mjs scripts/skills.logic.test.mjs`
## Blocked by
—

### HRN-021 · `merge-on-green` refuses a PR that has no `## Verifier verdict: PASS` the collector can read
- **Date:** 2026-10-22 · **Kind:** mechanise · **Retro run:** 2026-10-22
- **Status:** proposed
- **Evidence:**
  - The rule: `verifier-brief.md` says the heading `## Verifier verdict: PASS | BLOCK` "is what a
    verdict collector counts, so a differently worded PASS/BLOCK is invisible to it". `ha-next`'s
    docs exception posts the coordinator's review "with the verdict heading".
  - First occurrence: #775 merged with no verdict at all (the 2026-10-21 run's Numbers and Held).
  - Second: #913, #925, #926 and #927 carry `## Verdict: PASS`, the coordinator's reviews at 04:30Z
    and 06:39Z, while its #822 carries `## Verifier verdict: PASS`. Mission Control lists all four
    without a verdict (`metrics.flow.coverage.nonCode.without`, measured), because the `VERDICT`
    pattern in `scripts/mission-control/collect.logic.mjs` reads only the brief's heading.
  - Nothing at merge looks: `scripts/merge-on-green.mjs` reads the PR's checks, never its comments.
  - No open issue covers it (searched "verdict"; #201 and #584 are other things).
- **Cost if wrong:** one paginated comment read per merge. A PR merged by hand outside the tool
  still escapes, and dependabot PRs, which get no verdict, must stay exempt.
- **Decides:** the inbox panel (`inbox-panel-brief.md`); the owner may override

**Draft issue body** (`risk:1`)
## Goal
A PR merges only when a verdict the collectors can count says PASS.
## Acceptance criteria
- `VERDICT` is exported from `scripts/mission-control/collect.logic.mjs`, so the collector and the
  merge read one pattern.
- A pure function in `scripts/merge-on-green.logic.mjs` takes the PR's author and comments and
  returns `pass`, `missing` (no comment opens with the heading) or `block` (the newest verdict is a
  BLOCK). A dependabot PR returns `pass`. Tests:
  - `## Verifier verdict: PASS` is `pass`;
  - `## Verdict: PASS` alone is `missing`;
  - a BLOCK after a PASS is `block`, and a PASS after a BLOCK is `pass`;
  - a dependabot PR with no comment is `pass`.
- `merge-on-green` reads the comments before it updates the branch. On `missing` or `block` it exits
  4 with its outcome line naming the reason, and touches nothing.
## Verification command
`pnpm exec vitest run scripts/merge-on-green.logic.test.mjs scripts/mission-control/collect.logic.test.mjs`
## Blocked by
—

### HRN-022 · A test that runs a child process synchronously names its own limits, so a loaded laptop stops failing it
- **Date:** 2026-10-22 · **Kind:** mechanise · **Retro run:** 2026-10-22
- **Status:** proposed
- **Evidence:**
  - L049's decision is "explicit per-test timeouts, sized from measurement, never the 5s default".
    #313 and #434 applied it to the seven tests they measured. Nothing applies it to a new test.
  - First occurrence: `scripts/mission-control/vitest-collects.cli.test.mjs` timed out in #842's
    verifier run, at a load of 45 to 130, and in #860's (2026-10-21 §3). Its `execFileSync` blocked
    the worker, so its 45 s limit could not fire. #877 (#861) made it asynchronous with a child kill,
    and gave `scripts/release-config.test.mjs` 30 s (its commit message).
  - Second: `scripts/backlog.logic.test.mjs` ("ready and next print the line after the retro…")
    timed out at 5 s in #908's verifier run and passed alone (#908's verdict). Its `runBacklog`
    helper calls `spawnSync` under the 5 s default.
  - What it cost: #861's builder reproduced the collects timeout by running 40 `yes` spinners on the
    owner's laptop (L074).
  - Six test files call `spawnSync` and name no time limit: `scripts/backlog.logic.test.mjs`,
    `scripts/case-collisions.logic.test.mjs`, `scripts/hooks/docPathExists.logic.test.mjs`,
    `scripts/inbox.logic.test.mjs`, `scripts/peer-range.logic.test.mjs` and
    `scripts/sync-vectors.cli.test.mjs` (measured: `command grep` for the calls and for `timeout`).
  - #435 asks for a way to see a test getting slower, which is a different gap.
- **Cost if wrong:** a lint and six files' limits. A limit sized too generously hides a slowdown,
  which is #435's point.
- **Decides:** the inbox panel (`inbox-panel-brief.md`); the owner may override

**Draft issue body** (`risk:1`)
## Goal
A test that runs a child process has room on a loaded laptop, and a hung child cannot hang the run.
## Acceptance criteria
- A pure function in a new `scripts/test-timeouts.logic.mjs` takes a test file's source. It returns each `it` or `test` that reaches `spawnSync`, `execFileSync` or `execSync`, directly or through a helper defined in the same file, with no test limit, or whose child call passes no `timeout` option. <!-- allow-missing-path -->
- Its tests: a bare `spawnSync` in an `it` is reported; one with a test limit and a child `timeout`
  is not; a helper defined in the file and called from an `it` is followed.
- `pnpm run lint` runs it over the test files under `src/`, `scripts/` and `conformance/`. The six
  files it reports today are fixed in the same PR, each limit sized from a measured run as L049
  asks, or listed in a shrink-only baseline.
## Verification command
`pnpm exec vitest run scripts/test-timeouts.logic.test.mjs` <!-- allow-missing-path -->
## Blocked by
—

### HRN-023 · ADR-0018's fidelity review before a core merge was waived 14 times by ruling in one run: write the waiver into the ADR, or stop waiving
- **Date:** 2026-10-22 · **Kind:** policy · **Retro run:** 2026-10-22
- **Status:** proposed
- **Review:** own
- **Evidence:**
  - The rule: ADR-0018 §2, "A PR that changes semantics under `src/core/**` or `src/simulation/**`
    gets one before merge". `ha-next` dispatches it. Neither names an exception.
  - The practice: of the 2026-10-21 run's 20 semantic core PRs, 6 had the review (#818, #826, #845,
    #853, #862, #869). The other 14 merged on their verifier alone, each by its own ruling: R860,
    R862–R864, R867, R869, R871–R874, R876, R877 and R879 (2026-10-21 §2). That is 13 of the run's
    28 rulings. The reason repeats: the builder, the verifier or a panel had already run the web IDE
    at `91ef428`, so a reviewer "would run the same check a third time" (R864), or the change touched
    no evaluation (R867, R871).
  - What the reviews found: each of the six produced at least one FID entry, FID-025 to FID-031, and
    the panels turned six of them into issues the run built (#882, #901, #903, #905, #906, #909).
    The one digest, after #911, found the ten waived PRs before it sound, and filed FID-032 (#919,
    built as #920).
  - What none covered: #914, #920, #921 and #922 merged after the digest, and ADR-0018 §5's digest
    has not run for them. R879 says the web IDE's reading of a pin declared twice "was not measured".
  - One defect passed both gates: #907 (`sev:critical`) is in code #869 added. #869 had its verifier
    and its fidelity review (FID-031), and the #867 panel found the defect after the merge.
  - Tokens: a fidelity review cost 198,805 on average over the six, and the digest 194,955
    (measured from the run's per-agent list, the source of 2026-10-21 §2's total). At that rate the
    14 waivers saved about 2.8M (inferred).
- **Proposal:**
  - **(a)** ADR-0018 §2 gains the exception the run used, stated once. A semantic core PR may merge
    on its verifier when two agents (the builder or a panel, and the verifier) each ran the
    reference at a pinned commit on every claim the PR makes about it, cited in the PR; or when it
    changes no evaluation. The coordinator names the case in the merge line instead of writing a
    ruling, and the digest covers each such PR before the run's records PR.
  - **(b)** §2 stands. Every semantic core PR gets its review, and only the owner waives one.
- **Cost if wrong:** with (a), a divergence a review would have found waits for the digest; all six
  reviews that ran found something. With (b), about 200k tokens and one more serial step per core
  PR, for a check that repeats what two agents measured.
- **Decides:** the inbox panel (`inbox-panel-brief.md`); the owner may override

### HRN-024 · A defect the verifier reproduces in the PR's own new lines passes as a nit: say when it blocks, and whether that PASS can be overturned
- **Date:** 2026-10-22 · **Kind:** policy · **Retro run:** 2026-10-22
- **Status:** proposed
- **Review:** own
- **Evidence:**
  - The rule: `verifier-brief.md` § *Verdict rules* gives a BLOCK "only with `file:line` plus a
    failing command or a concrete input/output", and says nits "never block". It does not say when
    a reproduced defect must block.
  - The practice: the window's 51 PRs had 0 BLOCKs; the last window had 9 on 7 PRs. Five PASSes named
    a reproduced defect in lines the PR added as a nit, and a later PR fixed each:
    - #826 (issuecomment-6320423980, nit 1): `compileHDL` never returns on a registry whose `get`
      returns a fresh object, "200,001 calls in 1.6 s"; #836, fixed by #843.
    - #886 (issuecomment-6329377996, nit 1): a symlinked `hacer-scratch` makes `wt-new` empty a
      worktree, its git file included; #887, fixed by #890.
    - #910 (nit 3): `samePins` collapses a repeated pin name through a registry view; #912, fixed by
      #921.
    - #914 (nit 1): a sliced wide `true` on a chip the registry lacks exports as written, which the
      verifier says breaks ADR-0020 §1.5; #916, fixed by #922.
    - #917 (nits 1 and 2): the harness copies `runTst` and installs with no lockfile; #918, fixed by
      #923.
  - Two verdicts argue why the defect was not reachable: #826's "No registry in the repo does this",
    and #886's, that on macOS "the only realistic way to get there is the user's own symlink". Each
    fix then cost a claim, a builder and a verifier, 163,730 and 146,993 tokens on average in the run
    (measured from the per-agent list).
  - The overturn definition (`verifier-brief.md` § *Overturned verdicts*) excludes a defect in a path
    marked `unproven` or listed under `Not covered`. A nit is neither, so all five are candidates, and
    the coordinator classifies each by hand.
- **Proposal:**
  - **(a)** The verdict rules say a reproduced defect in lines the PR adds is a BLOCK when a caller
    on `main` reaches it, and a nit when the verifier shows none does, with that argument in the
    nit. The overturn definition adds the nit case to what is not overturned.
  - **(b)** Any reproduced defect in lines the PR adds is a BLOCK, fixed in the same PR by a fixer
    and passed by a fresh verifier.
- **Cost if wrong:** with (a), a wrong reachability argument lands the defect on `main`; #886's held
  only where `TMPDIR` is private to the user. With (b), a fixer round for defects nobody reaches
  today, and PRs that grow past their issue.
- **Decides:** the inbox panel (`inbox-panel-brief.md`); the owner may override

### HRN-025 · Four standing rules the 2026-10-21 run applied are not in the committed briefs: R865 and R868 contradict `inbox-panel-brief.md`, and L068 and L074 are in no brief
- **Date:** 2026-10-22 · **Kind:** policy · **Retro run:** 2026-10-22
- **Status:** proposed
- **Evidence:**
  - R868 runs PRD reviews with `--models opus:read-only,grok`. `inbox-panel-brief.md` §2 still
    launches `--models opus,grok` for every entry. L075 is `partly` for this reason: "The committed
    panel brief still says `--models opus,grok`".
  - R865 files an approved entry's step on the owner's machine `needs-human`. The brief's step 5
    still files every approved entry "`agent-ready` at any risk".
  - L068 (check for vitest workers with PPID 1 before reporting) and L074 (never generate artificial
    CPU load) each say "The committed briefs do not say it yet". Neither `implementer-brief.md` nor
    `verifier-brief.md` names them (measured: `command grep` for `PPID` and `artificial` over
    `docs/harness/` and `.claude/agents/`). 2026-10-21 §5 carries both as resume steps, as three
    earlier records carried L068 to L070.
  - A ruling binds one run, and a change that outlives it lands as an amendment (README § *How this
    process changes*, path 3). #677, a standing-rules file, has waited on the owner since
    2026-10-02 and covers the general case, not these four lines.
- **Proposal:** the panel decides each of the four: adopt it into the brief named, pinned in
  `scripts/skills.logic.mjs`, or let it lapse with the run. Adopted, §2 gives PRD entries
  `opus:read-only`; step 5 files an owner's-machine step `needs-human` and any in-repo part
  `agent-ready`; the implementer and verifier briefs each gain the two lines.
- **Cost if wrong:** four pinned lines and one launch flag. Left as it is, a PRD reviewer in verify
  mode can render the 3D canvas on the laptop again (L075), and a builder can load the laptop again
  (L074).
- **Decides:** the inbox panel (`inbox-panel-brief.md`); the owner may override

### HRN-026 · README says dispatch stops while the meter will not read, and the 2026-10-21 run dispatched on estimates twice: restate the rule as practised, or follow it
- **Date:** 2026-10-22 · **Kind:** policy · **Retro run:** 2026-10-22
- **Status:** proposed
- **Evidence:**
  - The rule: README § *Budgets*, "Run length": "A meter that will not read is retried once; if it
    is still unreadable, dispatch stops and in-flight work finishes" (R741, R747).
  - At 20:49Z the read failed twice, on a permission prompt nobody could answer; the next reading was
    51% at 21:37Z (2026-10-21 §1). In between, #800 and #871 were claimed (claim comments at
    21:18:04Z and 21:32:06Z), and #799's panel ran (verdict at 21:17:24Z).
  - At 03:26Z the read failed on a bot-check page. #906 was claimed at 03:26:06Z, and its builder
    opened #908 at 03:39:46Z, before the next reading, 62% at 03:45Z.
  - The coordinator worked from an estimate each time, the last reading plus its rate: 47% and 62%.
    Both were within about two points of the readings either side (inferred). At 20:49Z the run had
    about 20 points left before R852's no-new-chain line at 67%.
  - The meter went dark for good at about 06:10Z, when no new chain was planned, so the rule cost
    nothing there.
- **Proposal:**
  - **(a)** After a failed read and one retry, dispatch continues on a labelled estimate, the last
    reading plus the run's measured rate, while the estimate is more than three points below the
    run's no-new-chain line (R852's margin). Otherwise dispatch stops until a read succeeds.
  - **(b)** The rule stands, and the coordinator stops dispatching until a read succeeds.
- **Cost if wrong:** with (a), a run can pass its stop if the rate jumps while the meter is dark; it
  ran from about 1 to 2.8 points an hour in this run. With (b), a run waits on a browser prompt
  with most of its budget left, as it would have at 20:49Z.
- **Decides:** the inbox panel (`inbox-panel-brief.md`); the owner may override

### HRN-027 · Tokens per merged PR leave out every `run-reviews` session, which README's rule says makes the figure `unmeasured`: count them, or name them outside it
- **Date:** 2026-10-22 · **Kind:** policy · **Retro run:** 2026-10-22
- **Status:** proposed
- **Evidence:**
  - The rule: README § *What to measure* counts "every subagent usage report in the run (builders,
    verifiers, fixers, reviewers, panels, retros, …)", and "A sum missing any dispatched agent's
    count is `unmeasured`, never a partial figure".
  - The first record to report it, 2026-10-21 §2, gives 381,277 per merged PR (18,682,568 over 119
    agents, divided by 49). It names the gap: "The reviewers of the 32 inbox reviews ran through
    `run-reviews`, which reports no count", nor does the records builder's second phase. Each launch
    runs an Opus reviewer, a Grok reviewer and a Claude combiner (`inbox-panel-brief.md` §2).
  - The launcher's manifest has no usage field (measured: the keys of one of the run's manifests).
    The launcher belongs to the `multi-review` skill, outside this repo, as for L073.
  - The size of the gap, inferred: if an Opus (verify) reviewer costs what a verifier did (146,993
    on average over 37), the 32 add about 4.7M, a quarter of the reported sum.
  - The denominator is 49; the run merged 52 with its records PRs (README: merged PRs less
    dependabot). The coordinator's per-agent list later added the records builder's second phase and
    the split, 55,990 and 14,061, so it reads 18,752,619 over 121 (measured).
- **Proposal:**
  - **(a)** README names `run-reviews` launches as outside the figure. A record reports their count
    beside it, as in "plus 32 `run-reviews` launches, uncounted", and divides by the run's merges,
    records PRs included.
  - **(b)** The figure stays `unmeasured` until the launcher reports usage. That is a change to the
    `multi-review` skill, which is the owner's, since no `agent-ready` issue here can make it.
- **Cost if wrong:** with (a), the figure reads below the run's cost, by a share the count beside it
  flags but does not size. With (b), the number #850 made reportable goes back to `unmeasured` for
  every run with inbox reviews.
- **Decides:** the inbox panel (`inbox-panel-brief.md`); the owner may override

### HRN-028 · `.husky/pre-commit` stops at its first failing command, so a failing typecheck blocks the commit (L077)
- **Date:** 2026-10-22 · **Kind:** mechanise · **Retro run:** 2026-10-22, second
- **Status:** proposed
- **Evidence:**
  - L077: two builders reported that the pre-commit `pnpm run typecheck` did not block a commit,
    #919's (around 05:22Z) and #773's (10:59Z). The row was left unproven because husky's generated
    runner runs a hook with `sh -e`, and it asks this retro to reproduce it or retire it.
  - Reproduced. `core.hooksPath` is `.husky` in the owner's checkout, and its worktrees share it
    (`git config --show-origin core.hooksPath`), so git runs `.husky/pre-commit` itself. Husky's runner
    lives one directory down and runs only when the hooks path names that directory.
  - `.husky/pre-commit` has no shebang and no `set -e`. It runs four commands, `lint-staged`,
    `pnpm run typecheck`, `./scripts/check-test-files.sh` and `node scripts/check-doc-paths.mjs
    --staged`, and the shell git runs it with returns the last command's status.
  - Measured with git 2.49.0 in a scratch repository: a hook with no shebang whose first command fails
    and whose last succeeds lets `git commit` exit 0; with the failing command last, it exits 1.
  - So only the doc-path check can stop a commit. CI's `ci` job still runs lint, so no type error
    reaches `main`. What is lost is the first layer AGENTS.md names: a builder learns of a type error,
    a lint-staged failure or a stray test file from its DoD run or from CI.
  - No open issue covers it (searched `pre-commit` and `husky`; #541, closed by #562, removed husky's
    deprecated lines from `.husky/commit-msg`, whose failing check exits 1 itself).
- **Cost if wrong:** one line in a protected path. A commit that a lint-staged or test-file failure
  used to let through now stops.
- **Decides:** the inbox panel (`inbox-panel-brief.md`); the owner may override

**Draft issue body** (`risk:1`; `.husky/**` is a protected path)
## Goal
A failing command in `.husky/pre-commit` stops the commit, whichever directory `core.hooksPath` names.
## Acceptance criteria
- `.husky/pre-commit` opens with `#!/usr/bin/env sh` and `set -e`, so git running the file directly
  stops at the first failing command, as husky's runner already does.
- A new `scripts/husky-hooks.test.mjs` runs the hook in a temporary directory with each command it calls stubbed: `pnpm` fails on `run typecheck`, and the stubs after it record that they ran. The hook exits non-zero and nothing after the typecheck runs, red first against today's hook. With every stub passing, it exits 0. <!-- allow-missing-path -->
- L077's Mechanised cell names this PR.
## Verification command
`pnpm exec vitest run --project node --maxWorkers=3 scripts/husky-hooks.test.mjs` <!-- allow-missing-path -->
## Blocked by
—

### HRN-029 · README § *Budgets* disagrees with four rulings the 2026-10-22 runs practised: the agent cap, what it counts, where the meter is read, and where a run stops
- **Date:** 2026-10-22 · **Kind:** policy · **Retro run:** 2026-10-22, second
- **Status:** proposed
- **Evidence:**
  - The cap. README's "Agents at once on the laptop" row gives 2 while the owner is awake and 3 only
    after his going-to-bed message (R782), as #857 left it at 20:42Z on 2026-10-21. 67 minutes later
    the owner said "you can raise the number of parallel agents to 3", and R866 made it three at once,
    two while the 5-minute load average is above 12. Both sections of 2026-10-22 ran R866 with the
    owner awake (§1, "Agents"), and their resume steps carry it (step 5, and step 4 of the second).
  - What it counts. README's "What the cap counts" row counts the session's own subagents, not the
    `run-reviews` reviewers. R861 counts a `run-reviews` launch as one of the slots and R866 keeps it;
    both §1 lines say "three of {subagent, `run-reviews`}".
  - The meter. README says the meters come from a JSON endpoint that needs a real browser session
    (`usage-rationing.md`), and P-006's manual check names it. R891 reads `seven_day` from Claude
    Code's status-line capture, with the browser as the fallback. The second section's §1 has eight
    readings from it, none failed, and its resume step 3 carries it. No harness doc names the status
    line (measured: `command grep -rn -i 'status.line'` over `docs/harness/*.md` and `ha-next`).
  - The stop. README's "Subagent tokens per coordinator run" row stops at ~2M "unless the owner asked
    for a longer run". The 2026-10-21 run used 18.7M and the 80% run 4.4M (each §2), both under the
    owner's "until N%", which that exception allows; the judge and 90% runs used 2.3M together (second
    §2). In none was ~2M the stop. Each stop was a margin restated by ruling per run, no new chain three
    points below the owner's line and the records two below (R843, R852, R880, R890), which no
    committed brief states (measured: `command grep -rln 'no new chain'` finds rulings and this inbox).
  - HRN-025 (proposed) is the same class for four other rules. HRN-026 (proposed) is the
    unreadable-meter rule, whose two failures were browser failures that R891 removes.
- **Proposal:** the panel decides each of the four: adopt it into README § *Budgets*, with
  `usage-rationing.md` and P-006's Verify cell for the meter, or let the ruling lapse. Adopted:
  - **(i)** three agents at once, two while the 5-minute load average is above 12 (R866);
  - **(ii)** a `run-reviews` launch is one of them (R861);
  - **(iii)** the meter is the status-line capture's `seven_day`, and the browser endpoint only when
    the capture is older than 5 minutes (R891);
  - **(iv)** a run the owner gives a meter line stops there: no new chain from three points below it,
    the records from two below; ~2M stays for a run with no line.
- **Cost if wrong:** (i) runs the laptop hotter while the owner works, as R866's own cost says. (iii)
  reads the wrong number if `seven_day` is not `weekly_all`, which R891 checked once. Left as it is, a
  coordinator that reads README runs two agents, leaves `run-reviews` out of the count and needs a
  browser, against the owner's word in R866.
- **Decides:** the inbox panel (`inbox-panel-brief.md`); the owner may override

### HRN-030 · A second close on one date appends to the dated record, which the retro trigger cannot see; and two orients passed a due retro
- **Date:** 2026-10-22 · **Kind:** policy · **Retro run:** 2026-10-22, second
- **Status:** proposed
- **Evidence:**
  - The trigger: `retroLine` in `scripts/backlog.logic.mjs` counts a close only when a file matching
    `RUN_RECORD`, a date-named record under `docs/harness/sessions/`, is added after `to`;
    `scripts/backlog.mjs` lists them with `git log --diff-filter=A`.
  - 2026-10-22 closed twice. #961 added `docs/harness/sessions/2026-10-22.md` at 11:28Z, and #986
    appended the judge and 90% runs' section to it (`e2877d5c`, `002a6784`). Computed with `retroLine`
    over today's `main`: had a retro closed its window at 13:51Z, the line after #986 reads
    `retro: 2 merges since 2026-10-22T13:51Z`, not due, until a new date's record lands or 7 days
    pass. HRN-018's panel (#928) found the same blind spot for a `<date>-<run>.md` name.
  - The due line went unread twice. From 11:28Z `ready` gives `retro due:` (computed the same way).
    The judge run claimed #963 at 12:32Z and #967 at 13:42Z, and the 90% run claimed #968 at 13:51Z
    (claim comments), with no retro dispatched. `ha-next` §1 dispatches the retro "before the first
    claim", and a `judge due:` pick "before the first other claim". The first section's resume steps
    put "Fix #959 first" (step 1) ahead of "The next run starts with the retro" (step 2).
  - What it cost here: one retro over three runs and 18 merges instead of two (inferred). The blind
    spot cost nothing only because the due retro was skipped.
- **Proposal:**
  - **(a)** `retroLine` counts a close as any commit after `to` that adds or changes a dated record
    whose date is `to`'s date or later. `ha-next` §1 says the retro is dispatched before the first
    claim, a judge review's included.
  - **(b)** A second close on one date writes `sessions/<date>-2.md`, which `RUN_RECORD` accepts, and
    README § *sessions* says so; §1's order as in (a).
- **Cost if wrong:** with (a), a correction to the day's record after a retro starts another, about
  300k subagent tokens (inferred from the last one). With (b), a second record name for readers and
  the lineage parser. Left as it is, a same-date second close waits for the next date's record, and
  the order between the two due lines stays the coordinator's call.
- **Decides:** the inbox panel (`inbox-panel-brief.md`); the owner may override

### HRN-031 · The ledger took no row in two runs whose records name eleven things that went wrong or slow: ledger §3 at close, or make §3 the ledger's input
- **Date:** 2026-10-29 · **Kind:** policy · **Retro run:** 2026-10-29
- **Status:** proposed
- **Evidence:**
  - The rule: `ha-next` §6 (`.claude/skills/ha-next/SKILL.md`), "Retro — one line, every time",
    appends to `docs/harness/ledger.md` "if anything in the loop was wrong or slow". README § *How this
    process changes* path 1 rests on it: "Each failure gets one line in `ledger.md`".
  - Measured: `git log c62a4e71..e76c7da6 -- docs/harness/ledger.md` prints nothing. The ledger last
    changed in `289a606c` (2026-10-22T11:15Z), and its last row is L077. The window holds two runs and
    21 merges.
  - The two records' §3 name eleven such things. The 97% run's (2026-10-22 third part): the third
    close on one date, `inbox.mjs set` writing the bare form, the session pausing before its records,
    and staged ruling times that were wrong (R903 to R905). The 12% run's (2026-10-23): D1 and D2
    shipped where the differential could not see them, two timeouts under load, L073 on all four judge
    reviews, `inbox.mjs set` again, `next` naming a review where a build was due (R915), #978's
    after-merge step over its own limit (R917), and #257 passed over again (R910).
  - Three of them are second occurrences, which this retro promotes only because `retro-brief.md`
    Inputs 2 counts a recurrence "named there but never ledgered": `inbox.mjs set` (HRN-032), the
    timeouts (HRN-022) and L073 (held). Without a row, a recurrence has no id to cite and no Decision
    cell for `node scripts/lineage.mjs parse` to read.
  - The drift is older than the window: the three 2026-10-22 sections added two rows, L076 and L077
    (measured: the ledger's rows by date), against their own §3 lists.
- **Proposal:**
  - **(a)** At close, the records builder writes one ledger row for each §3 bullet that names
    something wrong or slow, with its Decision cell, in the records PR. `ha-next` §6 says so; the
    per-PR line stays for a coordinator with time for it.
  - **(b)** §3 is the ledger's input. `ha-next` §6 drops the per-PR line, the ledger takes a row when
    the retro promotes a §3 bullet or a mechanism lands, and README path 1 says so.
- **Cost if wrong:** with (a), a records PR grows by up to about ten rows, which `.gitattributes`
  merges by union, and one-off slowness adds rows nobody promotes. With (b), a one-off failure is
  findable only in its record's §3 and is cited by record section, as this retro already does. Left as
  it is, the ledger stays at L077 while the second-occurrence rule runs on whatever the retro reads.
- **Decides:** the inbox panel (`inbox-panel-brief.md`); the owner may override

### HRN-032 · `inbox.mjs set` writes a status with its note, as the file's grammar already reads it, so a decided status needs no hand edit
- **Date:** 2026-10-29 · **Kind:** mechanise · **Retro run:** 2026-10-29
- **Status:** proposed
- **Evidence:**
  - Three records name it, five entries in all: 2026-10-22's second part §3 (JDG-001 and JDG-003), its
    third part §3 (JDG-005) and 2026-10-23 §3 (JDG-011 and JDG-012). Each line was set bare and its note
    added by hand. The last retro held it at one occurrence.
  - Read: in `scripts/inbox.logic.mjs`, `fitsGrammar` accepts a `filed`, `declined` or `deferred`
    status followed by `, <note>` (`TAKES_A_NOTE`), so `list` and the grammar check read JDG-011's
    `filed (#1006), with #1007; A by the judge on #1011`. `setStatus` tests a new value against the
    bare forms only, and the code says "`set` writes the bare form".
  - Measured at `e76c7da6`: `setStatus` over `docs/harness/judge-inbox.md` accepts `filed (#1006)` for
    JDG-011 and refuses `filed (#1006), with #1007; A by the judge on #1011` as "outside
    docs/harness/judge-inbox.md's status grammar".
  - No open issue covers it (searched `inbox.mjs set` and `bare status`; the hits are inbox reviews
    whose steps run the command).
- **Cost if wrong:** the command checks a note's form and not its words, as the hand edit already
  does not; a status line could carry a wrong note through `set`.
- **Decides:** the inbox panel (`inbox-panel-brief.md`); the owner may override

**Draft issue body** (`risk:1`)
## Goal
`node scripts/inbox.mjs set <id> <status>` writes any status its file's grammar reads, including a
note after a `filed`, `declined` or `deferred` form, so no decided status needs a hand edit.
## Acceptance criteria
- `setStatus` in `scripts/inbox.logic.mjs` accepts exactly the values `fitsGrammar` accepts: `filed
  (#n), <note>`, `declined (<reason>), <note>` and `deferred (<until>), <note>`, and still refuses a
  note after any other form.
- In `scripts/inbox.logic.test.mjs`, `set writes a filed, declined or deferred status with its note`:
  JDG-011's line set to `filed (#1006), with #1007; A by the judge on #1011` reads back verbatim
  through `listEntries`. Red first against today's `setStatus`.
- Every existing `setStatus` test passes unchanged, and the `set` usage line in `scripts/inbox.mjs`
  says a note may follow.
## Verification command
`pnpm exec vitest run --project node --maxWorkers=3 scripts/inbox.logic.test.mjs`
## Blocked by
—

### HRN-033 · The differential grades too: HACER's grading of each vector must pass or fail as the reference does, so a divergence such as D1 fails `test:differential`
- **Date:** 2026-10-29 · **Kind:** mechanise · **Retro run:** 2026-10-29
- **Status:** proposed
- **Evidence:**
  - D1 (#1006, `sev:critical`): `runTest` bound each `.cmp` column by header text in
    `src/core/testing/engine.ts` from `babd3e36` (2026-06-20) on, so a correct HalfAdder failed its
    official vectors at row 4. On the same chip the differential agreed with the reference:
    `differential()` in `conformance/differential/harness.ts` compares the output `hacer run-tst`
    prints with the reference's, then the reference's output with the `.cmp`, and never runs HACER's
    grading. The fidelity review that found D1 applied the differential's rule by hand beside
    `testChip`: HalfAdder fails under `testChip` where the rule gives AGREE
    (`docs/research/2026-10-fidelity-review-spine-0.6.md`, Measured results). #1016 fixed it.
  - The grading half was run by hand four times in the window. Each time the verifier built the web
    IDE and scored as the web IDE's runner scores, and the run stood in for ADR-0018's review: R911
    (#1016, 7 shapes), R912 (#1019, 9 scripts), R913 (#1027, 8 cases) and R914 (#1028, 12 cases).
    R899's 25 loop shapes for #987 compared grading refusals the same way.
  - Read at `e76c7da6`, and unchanged in `conformance/differential/harness.ts` at `cc797c92`:
    `Verdict` has no grading status, while the reference's own pass, `expected.out.trim() ===
    vector.cmp.trim()`, is already computed as `agree` or `rejected`.
  - A decided divergence exists: R913 records a bare `BUILTIN;` body that HACER's grading refuses as a
    stand-in while the reference grades it.
  - No open issue covers it (searched `differential runTest`, `differential testChip` and
    `differential grading`; the one hit, #1017, is about `run-tst`'s print). FID-035 concerns which
    builtins each path holds, not the comparison.
- **Cost if wrong:** one more HACER call per vector in `test:differential`, which takes 32 to 35 s
  per CI run (JDG-006). A decided divergence needs a named exception, or the check fails on it.
- **Decides:** the inbox panel (`inbox-panel-brief.md`); the owner may override

**Draft issue body** (`risk:1`; `conformance/differential/**` is a protected path)
## Goal
`pnpm run test:differential` fails when HACER's grading of a vector (`testChip`, the path `hacer
test` and the MCP `hacer_hdl` tool take) passes where the reference fails, or fails where it passes.
## Acceptance criteria
- `differential()` in `conformance/differential/harness.ts` also grades each vector, with `testChip`
  from `src/core/testing/testChip.ts` by default, and compares pass or fail with the reference's
  (`agree` is a pass, `rejected` a fail). A mismatch is a new `Verdict` status naming the script, both
  results and HACER's first failing row, and `describeVerdict` prints it.
- In `conformance/differential/harness.test.ts`, a stand-in grader that fails where a stand-in
  reference passes gives that status, and one that passes where it fails gives it too. Red first
  against today's harness.
- A divergence a decision records, as R913's bare `BUILTIN;` body, is listed by script with its
  decision id in one exceptions list that the test pins; every other vector grades the same on both
  sides.
- `pnpm run test:differential` passes on today's corpus.
## Verification command
`pnpm run test:differential`
## Blocked by
—
