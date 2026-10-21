# Harness inbox: proposals the inbox panel decides

The retro role (`retro-brief.md`, agent `.claude/agents/hacer-retro.md`) never changes policy and
never files an issue. It queues its proposals here. An entry is one of two kinds:

- **`mechanise`:** a recurring failure that has no mechanism yet, with a draft `agent-ready`
  `project:harness` issue body (the ledger's second-occurrence rule).
- **`policy`:** a change to a gate, a brief, the rotation, a tier, a budget or a cadence.

**The inbox panel decides each `proposed` entry of either kind (`inbox-panel-brief.md`):
`node scripts/inbox.mjs queue` files a review issue for it, Opus and Grok review it, and the panel
sets `approved`, `declined (<reason>)` or `deferred (<until>)`. The owner may override any status at
any time, by editing it or by saying "approve HRN-00N".** Only an approved entry is acted on, and the
entry then records the issue or PR number. An approved policy that outlives a run is recorded as an
ADR or an amendment.

Declined entries stay, so the same proposal is not made twice. Ids are sequential and never reused.

## Entry format

```markdown
### HRN-NNN · <one-line proposal>
- **Date:** YYYY-MM-DD · **Kind:** mechanise | policy · **Retro run:** <date in Runs>
- **Status:** proposed | approved | declined (<reason>) | deferred (<until>) | filed (#n)
- **Evidence:** <ledger ids, PRs, record sections; each number measured (with its command) or inferred>
- **Cost if wrong:** <what is wasted or broken if this is the wrong call>
- **Decides:** the inbox panel (`inbox-panel-brief.md`); the owner may override

**Draft issue body** (required for mechanise; optional for policy)
## Goal
## Acceptance criteria
## Verification command
## Blocked by
```

## Runs

One row per retro run. The next run's window starts at the last row's `to` time.

| Run | Window (`from` → `to`) | `main` at `to` | Merged | Numbers | Entries | Held |
|---|---|---|---|---|---|---|
| 2026-10-15 (first) | the three latest session records: 2026-09-29T09:00Z → 09-29T23:59Z, 2026-10-01T21:20Z → 10-02T03:00Z, 2026-10-04T16:50Z → 10-04T23:59Z | `1737e290` | 75 (65 + 10 dependabot) | median reviewable 73 · 2 BLOCK · 0 overturned · 0 reruns | mechanise HRN-001–004 · policy HRN-005–009 | three, listed below |
| 2026-10-21 | 2026-10-04T23:59Z → 2026-10-21T15:00Z, from the last row's `to`: 16.6 days, far past the cadence (below) | `204aa0b2` | 63 (49 + 14 dependabot) | median reviewable 66 · 9 BLOCK on 7 PRs · 0 overturned · 0 reruns | mechanise HRN-010–014 · policy HRN-015–017 | eight, listed below |

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
  the run files' start time was 17:37Z (2026-10-17 §3). This is two occurrences, but both were in
  uncommitted coordinator files that no repo check reads.
- **Backticks lost to the shell:** in #754's body (2026-10-15 §3), and in #780's inline `--summary`,
  which `--summary-file` now replaces (2026-10-17 §3). HRN-010's body-file criterion covers the PR
  half.
- **L068** (orphaned vitest workers) and **L072** (a hold in a comment) have one occurrence each.
- **#775** merged with no verdict, once.
- **P-005 is unverifiable here**, once, and only on this machine.
- **#705** (HRN-004) was filed at `risk:2`, although mechanise drafts are `risk:0` or `risk:1`. This
  happened once, and HRN-015 asks the same question.

**Not measured:** owner minutes, tokens per merged PR, and local re-run counts, as above. Also not
measured: whether any review counted here ran on a different tier from the one it names.

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
- **Status:** proposed
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
- **Status:** proposed
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
- **Status:** proposed
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
- **Status:** proposed
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
- **Status:** proposed
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
- **Status:** proposed
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
- **Status:** proposed
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
- **Status:** proposed
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
- **Status:** proposed
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
- **Status:** proposed
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
- **Status:** proposed
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
- **Status:** proposed
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
- **Status:** proposed
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
