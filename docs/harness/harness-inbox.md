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
