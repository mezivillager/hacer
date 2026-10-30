---
name: ha-prompt-it
description: "Use when Mezi says \"prompt it\" or answers yes to \"Prompt it?\" in the hacer (ha) workspace, asks for a task prompt to review before work starts, or opens a multi-step hacer build, fix, or phase-0.5 ticket that should not begin until he has approved what will be built."
---

# HA Prompt It — the full pipeline, hacer edition

> **Moved into the repo 2026-09-18** (from the workspace `ha/.claude/skills/`) so cloud sessions and <!-- allow-missing-path -->
> routines have it and it is versioned. Copied as-is; the v2 amendments (issue-driven start,
> milestone = PR inside the size budget, plans without complete code, blocked exit, dormant mode,
> ~200-line budget) are tracked in #154. Two facts have changed since it was written: merges are
> permitted for agents when the definition of done and CI are green (owner grant, ADR-0013), and the
> Bash tool now resolves Node 22 by default — run `node -v` first; the v14 is a stray
> `/usr/local/bin/node`.


Turn a request into a reviewed spec, a reviewed plan, a gated TDD execution and a
reviewed PR. Mezi owns the gates; between them, rule and proceed — ledger every
ruling, and never stall on a question a coordinator can decide and a ledger can
make reversible.

**The repo's own docs are binding; this skill only sequences them.** Read in this
order and do not restate them here:

1. `.claude/CONSTITUTION.md` — non-negotiable boundaries (Zero Laziness, Root
   Cause, Evidence Over Claims, Design for Longevity, strict TS, React 19 without
   manual memoisation, Zustand mutated only via `circuitActions`, one component
   per file, TDD as iron law).
2. `AGENTS.md` §3 — the mandatory pipeline this skill implements: Validate Ticket
   → Brainstorm → Worktree → Plan → Execute → Review → Finish Branch, including
   Step 1.0 Ticket Freshness, Step 2b no-absolute-paths, and Step 4.1 non-3D UX
   rigor.
3. `.cursorrules` → **Phase Tracking** — build for the current phase only. The
   header itself is dated (2026-05-12, Phase 0.5), so confirm the live phase
   against `docs/roadmap/` and the code before trusting it, and say which phase
   you concluded.
4. `HACER_LLM_GUIDE.md` for patterns, `REPO_MAP.md` for "where does X go",
   `docs/testing/` for templates, `docs/decisions/` for the ADR log.

**Docs drift — validate before you build.** This repo's process docs were
written earlier than the code and drift in three specific ways, all expected and
all cheap to check: `docs/plans/phase-0.5-tickets/*` tickets (see Phase 1), the
phase header above, and `docs/llm-workflow.md`, whose platform sections describe
an older agent surface (Cursor `mcp_task` subagent names, "Loki mode", a
prompt-caching cookbook). Take its *principles* — plan first, one task per
subagent, verify before done, separate the reviewer from the author — and ignore
its mechanics in favour of this repo's own skills and the current harness. Where
a doc and the code disagree, the code wins and the doc gets fixed in the same
branch.

**Prefer this repo's own skills** in `.claude/skills/` — `planning`,
`executing-plans`, `tdd`, `debugging`, `dispatching-parallel-agents`, `code-review`, `docs-sync`, `hacer-patterns`,
`verification-before-completion`, `finishing-a-development-branch` — over the
global superpowers equivalents wherever both exist.

> **GATE 1 — the spec, and the publish decision.** Mezi approves what will be
> built, and confirms or overrides the publish default (below).
> **GATE 2 — each milestone's red contract.** He approves the committed failing
> tests before green work begins.
> **GATE 3 — each milestone's completion.** He reviews the evidence — the test
> output, the milestone's `diff-size-report` output and the milestone review's verdicts where a
> review ran (else the ledger's `review:` line with its trigger check), the round's
> delta-review verdicts and wall times — before the
> next milestone starts.
> **GATE 4 — the merge, and anything that speaks to people.** Canonical
> statement in Standing rules.

**The publish decision — asked once, at Gate 1.** End the Gate 1 message with one
question and the answer you will proceed on:

- **Publish on green** — when the definition of done passes, push the
  `hacer-wt-<topic>` branch and open the PR, then report. *Recommended here:
  hacer is Mezi's own repo, CI is the real gate, and the PR's preview deploy is
  how a change gets looked at.* Note that opening the PR triggers
  `.github/workflows/pr-preview.yml`, a Pages preview — an artifact that leaves this machine.
- **Hold** — commit in the worktree and draft the PR body; push nothing.

Record the answer in the ledger as `publish: on-green` or `publish: hold`, restate
it in the first execution message, and treat an unanswered question as **hold**.
hacer's `docs/` travels with the branch and its PR under that decision and is
never pushed on its own.

**Merging is Gate 4.** A push to `main` runs `.github/workflows/release.yml` (semantic-release cuts
a version and a changelog from the conventional-commit types) and `.github/workflows/deploy.yml`
(GitHub Pages). Merge is therefore a release and a deployment: it waits for the round to close green
(Phase 3, fix rounds) and for a verifier PASS on the PR's latest fix-wave head, then goes on green
through `node scripts/merge-on-green.mjs <pr>`; any other merge needs its own explicit go, every
time, however Gate 1 was answered.

**Delegated gates.** When Mezi hands a task over to run autonomously — the
`autonomous` skill (`~/.claude/skills/autonomous/`) does this for a whole queue —
the coordinator rules Gates 1–3 itself, writes every decision to the ledger with
its cost if wrong, and raises only the questions that matter, up front, each with
the default it will proceed on. Every "wait for Mezi" becomes *present, ledger,
proceed*. Gate 4 stays gated, exactly as Standing rules state it.

**Milestones.** A group of plan tasks shipping one coherent, checkable slice.
Size each to be worth a human checkpoint; Gates 2 and 3 fire at milestone
boundaries, never at every task. Draw the boundaries for parallelism too: group
tasks by what they depend on rather than by narrative order, so each milestone
opens with as wide a first wave as the work allows.

## Sizing — ask before Phase 1; the tier is Mezi's call

Recommend a tier in one line with the reason, then ask and wait for the answer.
Never size silently. Under the `autonomous` skill the question goes in the run's
opening message with the recommendation as the default (when the call is close, size
down — Light over Standard, Standard over Full); a tier named in the hand-over is
the answer.

- **One-liner** — a single small edit, a question, a lookup. Do it directly, no
  question.
- **Light** — about one milestone's worth, no new cross-system seam. The spec,
  its fresh-eyes review and the publish decision, then TDD in this session with
  Gate 2 before implementing, then ONE whole-branch review before the definition
  of done. No plan document and no staffing table. Phase 3's lanes-by-default
  rule applies once the red contract is committed (Mezi 2026-09-28, narrowing
  his 2026-09-22 "no implementer agents"): the lane split — the lanes and
  their `Writes` sets — is declared in the ledger before dispatch, since there
  is no plan to declare it. The spec reviewer (plus a delta reviewer for a contract revision after
  Gate 1), the whole-branch reviewer and a fix-diff delta reviewer after each fix wave are the only
  review seats the run dispatches unasked; the PR-level verifier is not a tier seat (Phase 3).
  **AGENTS.md Step 1 is still a hard gate:** anything with 3+ implementation steps gets a
  `docs/specs/` design approved before code, at every tier above one-liner.
- **Standard** — several milestones, no new seam: Phase 1 and Gate 1 as in Full,
  without the staffing table; the plan with milestones, waves, each milestone's
  `review:` mark and the read-only plan review (Phase 2); Gates 2 and 3 at every
  milestone boundary, and a milestone reviewer only where a trigger fires (Phase 3)
  — a milestone that touches a named risk class buys its reviewer through trigger
  (ii); Phase 4 in full. The spec reviewer (plus a delta reviewer for a contract
  revision after Gate 1), the plan reviewer, the whole-branch reviewer, a triggered milestone
  reviewer and a fix-diff delta reviewer after each fix wave are the only review seats the run
  dispatches unasked; the PR-level verifier is not a tier seat (Phase 3).
  A Standard run re-sizes when it changes class (Phase 3). Standing rules bind in
  full.
- **Full** — a new seam at any size, or when Mezi asks for it: the whole pipeline
  below, a reviewer after every milestone.

Mezi can change the tier with "light", "standard" or "full" at any point; a tier
named mid-run takes effect from the next milestone (Phase 3).

**Ultracode — suggest it for discovery work, never switch it on** (Mezi 2026-09-29). When the
task is an investigation, an audit or a sweep ("is X safe everywhere"), forensics across many
files, repos or transcripts, or a review of a large diff, add one line to the sizing message: why
ultracode fits, and how to launch with it while keeping the effort level —
`claude --settings '{"ultracode": true}'` (or `/effort ultracode on` in the session — since CLI 2.1.286 it
no longer changes the effort level; `/effort` shows what is active). Build work stays as it is: ultracode's
default of a workflow for every substantive task fights in-session TDD and the single-author red
contract. If ultracode is on anyway, single-author steps stay single-author, verification attaches
to the existing review seats' findings rather than adding seats, and the lane cap stands. Workflow
agents get the standing orders too: the dispatch guard wraps each script's `agent()`.

## Phase 1 — The spec. Do not write code.

1. **Ticket freshness first** (AGENTS.md Step 1.0), read-only, before designing:
   when the work comes from `docs/plans/phase-0.5-tickets/*`, validate its claims
   — APIs, paths, dependencies, "files to create" — against current code. Trust
   the code over the ticket. Carry the stale points into the design and reconcile
   the ticket *in the worktree* later (revise in place, merge or split, never
   renumber, keep `docs/plans/phase-0.5-tickets-CHECKLIST.md` in sync).
2. **Ask the questions whose wrong answers waste the most work**, and wait.
3. **Name what already exists to reuse** — `REPO_MAP.md` and
   `HACER_LLM_GUIDE.md` first; reuse by default and justify any duplicate.
4. **Surface the real forks** as a decision table with a recommendation per row.
   Where the expedient and the extensible option diverge, say so and prefer
   extensible — that is Constitution §1, Design for Longevity, and ADR-0003.
5. **Step-zero checks:** when a cheap read-only probe settles an assumption (a
   store selector's shape, an existing test's behaviour, a render count), run it
   now and put the numbers in the spec.
6. **Phase discipline:** state which phase the work belongs to. If it only makes
   sense in 0.6+, say so and propose the 0.5-shaped slice instead.

**Full tier only: also produce the staffing table** (format at the bottom of
this file) at the end of Phase 1, with `Depends on`, `Writes` and `Wave` filled
in — it is what makes the parallel schedule reviewable before a single agent is
dispatched. Light and Standard have none.

The spec's shape:

```markdown
# <Task title>

## Goal
<the outcome in one or two sentences, in Mezi's terms>

## The contract
<the binding decisions: APIs, store shape, component boundaries, phase scope —
every later ruling resolves against this section>

## Context
<what exists today, cited as file paths and the measured numbers from step-zero>

## Out of scope
<what this deliberately does not do, and which phase it belongs to instead>

## Success criteria
<observable, command-provable statements — never "works correctly">

## Open questions
<each with the default it will proceed on if nobody answers>
```

**Fresh-eyes spec review.** Before Gate 1, dispatch a reviewer with NO prior
context (`subagent_type: prompt-reviewer`) that reads only the spec and the code
it cites: does the contract match the code as it stands, is anything named that
does not exist, does it build for the current phase, and is any success
criterion unprovable? Fold its must-fixes before presenting. When the spec
changes semantics under `src/core/**` or `src/simulation/**`, or shapes an epic
or ADR in `spine`, `surfaces` or `horizon`, the same review includes the
fidelity check (`docs/harness/fidelity-brief.md`, ADR-0018): the contract is
checked against the oracle vectors and the book, not only against the code. Its
proposals go to `docs/harness/fidelity-inbox.md`; they are never applied here.

**A contract revision after Gate 1 gets a delta review, not a second full
review** (Mezi 2026-09-28; measured that day: two full fresh-eyes re-reviews
after stakeholder changes, 21 minutes each). Dispatch a fresh reviewer
(`subagent_type: prompt-reviewer`) that attacks only the change: it receives
the changed items, their success criteria, the code they touch and the
previous review's findings, plus the full current contract read-only, to catch
knock-on effects on the items that did not change. When the changed items meet the fidelity
condition above, the delta review carries the fidelity check for them. A fix-diff delta review
carries the fidelity check the same way when the fix meets the condition; its verdicts go inside the
report and the coordinator queues the proposals. A full fresh-eyes re-review runs instead when the
revision changes the goal or more than a third of the contract's items. The initial fresh-eyes
review is unchanged; a fix round ends with the coordinator's delta-read and a fix-diff delta review
(Phase 3, fix rounds).

**The spec is the prompt.** Save it as `docs/specs/YYYY-MM-DD-<topic>.md` — one
artifact, not two. Its contract section is the authority every later ruling
resolves against.

**Bind the session's topic file in the same step.** The day's session record,
`docs/harness/sessions/YYYY-MM-DD.md`, is already this repo's committed memory of <!-- allow-missing-path -->
a session; bind it: `topic-bind docs/harness/sessions/YYYY-MM-DD.md --label
<topic>` (or `topic-bind --new …` for a new day, then reshape it to the session
record's sections). Keep one `## Current state` block at its head — rewritten in
place as the run moves, never a second one appended, with the next action,
in-flight work and the paths to spec, plan and PR — and append the owner's
rulings and what happened below it. The topic hooks
(`~/.claude/hooks/topic-*.sh`) nudge, gate and re-orient from that file: a turn
that does work without touching it is blocked once, and after every compaction
the whole file is pushed back to the session. The spec is never the binding — approved at
Gate 1, then mostly static. **If `topic-bind --show` reports a live binding**
(an autonomous run bound its `state.md` at arm time), keep it and link the <!-- allow-missing-path -->
session record from the bound file's Paths instead of re-binding. A binding it reports as `complete`
belongs to a finished run: bind the day's session record instead. A later day's session record
continues the fix-round count from the previous day's record for the same PR.

## Phase 2 — The plan.

Use the repo's `planning` skill, with these amendments:

- **Spec header:** point `Spec:` at the approved `docs/specs/` path.
- **Atomic tasks:** 2–5 minutes each, with exact file path, complete code, and the
  verification command that proves it (AGENTS.md Step 3).
- **Declare milestones**, and **hoist the reds**: each milestone opens with one
  task that writes and commits every failing test for it; later tasks are
  green-only and may not touch test files.
- **Mark each milestone's review** (Standard): `review: yes <trigger>` or `review:
  no` against Phase 3's triggers; the plan review checks the marks.
- **Schedule for parallelism — while chunking, not at dispatch.** Annotate every
  task with `Depends on` and `Writes` (exact files), then lay them out in
  **waves**: wave 1 is everything with no unmet dependency and no file shared
  with another wave-1 task. Record the widest wave per milestone. **If it is 1,
  say why in one line** — sequential is a finding, not a default. Natural wave
  boundaries here: one React component per file makes component work genuinely
  disjoint, and `src/simulation/`, `src/components/`, `e2e/specs/` and `docs/`
  rarely collide. `circuitActions` and the store slices are one shared surface —
  tasks touching them serialize.
- **Save as** `docs/plans/YYYY-MM-DD-<feature>.md`.
- **Names are locked in here** — treat naming as API design. Renaming after a red
  gate costs a review round; naming well in the plan costs nothing. When Mezi
  rules on vocabulary, propagate it to tests, plan, spec, code and docs at once.
- **Plan code follows the comment rule** (Standing rules): the verbatim implementation and
  test code in plan tasks carries no comment the rule would not allow.
- **Plan and code never diverge.** Whenever a later ruling changes what ships,
  sync the plan in the same turn — a stale plan is worse than no plan, because
  the next agent believes it.

Run the planning skill's self-review yourself (spec coverage, placeholder scan, type
consistency), checking every cited selector, fixture and store shape against the
tree as you go. Then dispatch **the plan review** (Standard and Full):
`subagent_type: prompt-reviewer` with no prior context, its brief's Goal saying
plainly that it reviews a plan, handed the plan's path, the spec's path and the
paths the plan cites — read-only, runs no test and no project code, builds nothing
(the *executable* plan review was cut on 2026-09-22 at 45–106 minutes per run), and
runs to completion like the spec review. It checks the plan against the contract:
every success criterion has a red in a milestone's hoisted contract; milestone
boundaries and their `review:` marks follow Phase 3's triggers; the shared fixtures,
helpers and interfaces a later milestone builds on are built first and named; names
follow the naming rule; waves' `Writes` sets are disjoint; the verbatim test code
tests what the plan builds and places each red as *where a test goes* says.
Findings return MUST-FIX / SHOULD-FIX / NIT and are
ruled like the spec review's, in the ledger.

**The plan is not a gate.** Present its path and the review verdict in one line and
proceed — Gate 2 is where Mezi sees what the plan produced.

## Phase 3 — Gated execution.

**Before any dispatch:**

- **Node** — verified on-machine (2026-09-21): the Bash tool's PATH already puts
  nvm's default alias (22) ahead of `/usr/local/bin`, so a fresh shell resolves
  `node -v` to 22.x with no `nvm use` needed. Run `node -v` first anyway to
  confirm. If it ever prints v14, that's the stray `/usr/local/bin/node` (a 2020
  Homebrew install nvm's PATH entry normally shadows) — recover with
  `export NVM_DIR="$HOME/.nvm"; . "$NVM_DIR/nvm.sh"; nvm use 22`.
- **Worktree, install, verify — one command:** `bash scripts/wt-new <type>/<n>-<topic>`
  fetches, branches from `origin/main` (never a stale base), creates the
  sibling `hacer-wt-<topic>`, installs with `--frozen-lockfile`, and verifies
  the @babel helper symlinks and a chosen command before it says ready (#157).
  Falls back to the manual sequence only if the script itself is unavailable:
  `git worktree add ../hacer-wt-<topic> -b <type>/<topic>`, then
  `rm -rf node_modules && pnpm install --frozen-lockfile` and check
  `ls node_modules/.pnpm/@babel+helper-compilation-targets@*/node_modules/`
  lists `browserslist`, `lru-cache`, `semver` (a plain install fixes only the
  top level and leaves every test failing on `_lruCache is not a constructor`).
- **Baseline** — run the unit suite once now, so later numbers compare against
  measured ones.
- **Stack drift (checked 2026-09-17):** the pins are behind — vitest ^4.1.2 vs
  5.0.1, `@playwright/test` ^1.60.0 vs 1.63.0. Some current guidance needs those
  upgrades (Playwright's isolated retry strategy landed in 1.62; Vitest 5 changes
  defaults — `clearMocks` on, strict browser locators), so check that a flag
  exists before relying on it, and treat upgrading as its own ticket rather than
  a side effect of feature work.

Execute with the repo's `executing-plans` / `dispatching-parallel-agents` skills.
Gates 2 and 3 are additional mandatory stops at milestone boundaries; inside a
milestone, rule and proceed, ledger every ruling, never stall.

- **One review per milestone in Full; in Standard only when a trigger fires; never per task.** In Full,
  when a milestone's tasks are all green, dispatch ONE fresh reviewer (`subagent_type: reviewer`), handed the
  milestone's brief, the implementers' reports and the milestone diff as file paths,
  returning both verdicts (spec compliance AND quality) over the whole milestone. Quality includes
  the whole-branch review's passes 3 to 9 (Phase 3's whole-branch bullet) over the milestone diff —
  correctness and safety, reuse, simplification, efficiency, altitude, the comment rule and the size
  check, each under its own heading, from the `diff-size-report` output in the reviewer's brief; a
  duplication finding (pass 4's, or pass 5's copy-paste) is fixed in the milestone, never parked.
  Task completions still land with their hash in the ledger; they do not each
  buy a reviewer.

  In Standard a milestone buys that reviewer when it is marked `review: yes <trigger>`. The plan
  marks every milestone `review: yes <trigger>` or `review: no` against the triggers below, and the
  plan review checks the marks. At green the coordinator re-checks the triggers against the
  milestone's actual diff — (iii) always, (i) and (ii) whenever the green work added shared code or
  touched the risk list beyond the plan — and a trigger found true there turns the mark to `review:
  yes <trigger>` in the plan and the ledger before the review is dispatched. The triggers: (i) it
  ships a shared fixture, helper, interface or schema that a later milestone's reds or code build
  on; (ii) it touches a named risk class: an ADR'd seam in `spine`, `surfaces` or `horizon`;
  semantics under `src/core/**` or `src/simulation/**` (the fidelity condition, ADR-0018); the
  store's mutation surface (`circuitActions` and the store slices); or an issue labelled `risk:2`;
  (iii) the unreviewed diff — every change since the head the ledger recorded when the last
  milestone review's round closed (converged, or at the cap or the bound; a milestone review that
  opened no round records its reviewed HEAD), or since the branch base when none has run; a fix-diff
  delta review covers only its fix diff and never moves this head — exceeds 400 lines added plus
  removed,
  or 20 files, in any one category of `diff-size-report <that head> HEAD`; (iv) the spec or Mezi
  asks for it. A milestone review in Standard is handed that whole unreviewed diff, not only this
  milestone's, so nothing before it counts toward (iii) again. On the last milestone a fired trigger
  is met by the whole-branch review. Otherwise the ledger records `review: no` with the trigger
  check, (iii)'s numbers included, and Gate 3 presents that line with the evidence and no review
  verdict; the whole-branch review covers the milestone.
  In every tier the PR-level `hacer-verifier` (`docs/harness/verifier-brief.md`) runs on every PR
  Phase 4 opens, and its PASS is what merge-on-green waits for — `scripts/merge-on-green.mjs` checks
  CI only, so the PASS on the latest fix-wave head and a round closed green stay the coordinator's
  preconditions. It is not one of a tier's review seats.
  Inside Phase 3 its brief is the milestone reviewer's brief for a harness ticket when a milestone
  review runs; a Standard harness ticket with no fired trigger meets the verifier only at the PR.
  When `docs/harness/verifier-brief.md` is the reviewer's brief, the coordinator appends the
  `diff-size-report` output and the milestone pass headings to its inputs and maps each pass's
  should-fix to a Blocker or a Nit by ruling.
- **A Standard run re-sizes when it changes class.** A contract revision after Gate 1 that
  introduces a new seam — and green work that needs one is such a revision — makes the run Full from
  the next milestone: the ledger records the re-size with its cost if wrong; every remaining
  milestone is marked `review: yes (Full)` (the Full-only staffing table is not back-filled); the
  milestones already closed without a reviewer stay on the whole-branch brief's list; the plan is
  synced and its changed marks go to the delta reviewer with the changed items, with no second plan
  review; and the next Gate 3 says so — under delegation, present, ledger, proceed. Work that newly
  touches a named risk class changes that milestone's mark through (ii), not the tier. A tier Mezi
  names mid-run takes effect from the next milestone the same way.
- **Fix rounds.** Every fix round ends with the coordinator's delta-read and then fresh eyes on the
  fix diff (2026-10-30; replaces the 2026-09-22 delta-read-only rule). A *round* opens when the
  coordinator rules fix on the findings of one review event — a review seat (milestone, whole-branch
  or cross-stack), a multi-review of parallel reviewers (one event), the PR-level verifier's
  verdict, a PR bot's or a human's comment batch ruled together, a Devin iteration, a fix Mezi asks
  for, or — after a review has read the code — a red CI run, repo gate, browser test or DevTools
  diagnostics run whose fix changes code (one event per failing run; inside a fix wave, part of that
  wave; a formatter's own output excepted). Not a review event: `/simplify` on request, plan-review
  findings, spec-review folds, and a fix-diff delta review (below) — whatever of it is ruled fix
  goes to the
  next wave of the same round. All findings ruled fix in the event go to **one fix wave**; nits ride
  only in a wave already going (a duplication nit is never parked and opens one), and after a round
  closes there is no nit-only wave — remaining nits are ledgered no-change or owed. **Who fixes:**
  the implementer that wrote the code, continued — a seat by `SendMessage` to the agent id the
  ledger recorded at dispatch (stopping an agent under "no parked agents" does not make it gone) —
  with a six-slot fix brief (below) as the message; a fresh dispatch only when it cannot be
  continued: a new coordinator session or no agent id in the ledger. When the green work ran
  in-session (Light without lanes; judgment-heavy work kept in-session in any tier) the coordinator
  is that work's implementer for its fix waves: it makes the fixes and reverts, writes the Report
  with callers, and runs the Tests to files — besides `/simplify` on request, the one case where the
  coordinator makes fixes itself; its suites are among those "no coordinator-run suites" allows. A
  continued seat works in the integration checkout when it is the wave's only writer, in its lane
  worktree rebased on the integration head when the wave runs lanes; lanes within a wave only when
  the round's findings split into disjoint Writes and after one author committed all the round's
  reds in one commit; a fix wave's lanes never trigger the consolidation pass — the delta reviewer
  reads the integrated diff. **The delta-read has three parts:** (A) each finding marked addressed
  or open; (B) the regression read — every hunk mapped to the finding id it serves, an unmapped hunk
  reverted (by the implementer, before Part C) or kept with the reason ledgered, and the
  implementer's caller list read against the diff; (C) `diff-size-report` on the fix diff
  (`--direct <old> <new>` across an amend; `git diff --no-index --numstat` by category for files
  outside git, prose share owed). Then the coordinator writes the round's cumulative diff to
  `<run folder>/fix-round-<r>-wave-<n>.diff` — `git diff <pre-round base> <HEAD after the wave>`
  whether the wave committed or amended, taken before any rebase, fold or squash, the integrated
  diff after the last lane merge; `diff -u <pre-round copy> <file>` for a file outside git, copied
  to `<run folder>/pre-round-<r>/` when the round opened — and dispatches the fix-diff delta
  reviewer (below). A round closes when it converges or exits at the cap or the bound; the
  coordinator ledgers its HEAD. A fix-diff delta review covers only its fix diff and never moves
  trigger (iii)'s head. In hacer `<run folder>` is `${TMPDIR:-/tmp}/hacer-review-fix/<branch>/`; the
  ranges, verdicts and finding ids go in the session record; `docs/harness/sessions/` is excluded
  from the fix diff, from Part B and from the delta review
  (`git diff … ':(exclude)docs/harness/sessions/*'`), and ledger lines are committed in their own
  `docs(harness):` commit.
- **A fix brief bounds the diff.** The six slots, as a dispatch or as the continue message. Read:
  the findings by id and the rulings they touch, and the Goal line "fix diff only — minimal diff, no
  refactor or cleanup mixed in". Writes: the files the findings name plus, per finding that needs a
  red, the one test file holding its red→green pair; a file outside that set needs a ruling first —
  a module outside the branch's Writes is Mezi's call or a ledgered PR-body follow-up, a shared
  module for a duplication fix a coordinator ruling. Measured facts: the finding texts and the
  delta-read's Part A/B results so far. Parallel with: nothing else on that branch.
  Tests: the narrowest red per finding that needs one — the search of *where a test
  goes* first, then tighten, a row of a named table, a sibling in the named file, or a
  new file, in that order, additive only, never an adapted assertion; the coordinator
  names the table or file when the finding makes it plain,
  the implementer's search otherwise; run failing first, its failing line ledgered before the
  fix hunk — and the full suite once per wave. Report: per finding, the hunk; its closing
  evidence — a red→green pair for a behavioural change, the suite staying green for a
  behaviour-preserving reuse, simplification or efficiency fix or a prose cut (a removal), a
  captured baseline (the exact command and its before/after output) for a prose correction (a
  PR-body claim, CHANGELOG or docs content); the files touched with the finding id that
  justifies each; the step *where a test goes* took, the nearest existing test (`path::name` in
  pytest, `path > describe > name` in JS) and why the earlier steps did not fit — more than one
  new node (a row counts) for one finding said and justified, and each consolidation candidate
  named as a pair; the one-line explanation that goes in the
  PR body, and in the commit message until the squash, never a new comment block; the
  `diff-size-report` output; and the callers of every changed symbol (`command grep -r` or
  `rg -uuu`, never the bare grep shim; gitnexus `impact` only when its index is at the wave's HEAD)
  with what the change does to each.
- **Converge: fresh eyes on every fix wave, over the fix diff only.** Dispatch
  `subagent_type: reviewer` with the six slots — Read: the Goal line "fix-diff delta review: the fix
  diff only, never the branch", the diff file, the findings the wave claims to close, the round's
  full findings list, the previous delta review's findings when there is one, the PR-body text
  whenever the wave touched it, the rulings (a decision the ledger records is reported as a
  decision, never as a defect), and the branch read-only for knock-on effects; Writes: its report,
  `<run folder>/fix-round-<r>-wave-<n>-review.md`, and a progress file beside it; Measured facts:
  base and head, Part C's output, each closed finding's red failing line or baseline, the
  wave's `steps`, the suite's summary line; Parallel with: nothing on that branch; Tests:
  `none — read-only`; Report: seven headings in this order — **Mapping** (every hunk to a
  finding id or unmapped; each claimed finding closed or not), **Callers** (the
  implementer's list verified), then the whole-branch review's
  passes **2 Proof**, **3 Correctness and safety** (including whether a fix claimed as
  behaviour-preserving preserved behaviour), **4 Reuse** (logic the wave wrote twice — across
  its lanes or against the repository — any helper it re-implemented, and a test that
  re-proves a condition an existing test proves or re-creates an arrangement it already
  builds, as the whole-branch pass 4 reads), **8 Comment rule**, **9 Size
  check**; every finding with blocker / should-fix / nit and a cause tag (below). **Bound: 30
  minutes** — a background wait started at dispatch ends when the report file appears or at 1,800 s;
  on expiry the reviewer is stopped and dispatched once more with its Read cut to the diff file, the
  claimed findings and the rulings, that dispatch counting toward the cap (when the third review
  expires the round exits at the bound); a second expiry ledgers the wave "fresh eyes owed" and says
  so at the next gate and, as a follow-up line, in the PR body. **Routing by cause.** A blocker or
  should-fix the fix diff caused — a defect in its hunks, or code or text it made false — goes to
  the next wave of the same round, tagged `fix:<round.wave>`, and so does any never-parked finding,
  whatever caused it: a blocker, a duplication finding at any severity, a should-fix of the comment
  rule or the size check, and so does a blocker or should-fix of this round's event that Part A or the
  Mapping shows not closed. A fix-caused nit and a sibling of the fixed site (tagged `pre-existing`)
  ride that wave when one runs. The rest is parked for the next review that runs — the next
  milestone review (Full, or Standard when a trigger fires), else the whole-branch review — and
  named in its brief; in the whole-branch round and in every round after it (bots, humans, Devin
  iterations, the verifier, a fix Mezi asks for in Phase 4 or later) nothing is parked: each finding
  is fixed in the next wave, ruled no-change with the reason, made a ledgered PR-body follow-up when
  its fix lies outside the branch's Writes (unless Mezi widens them), or sent to a contract revision
  when an altitude change alters contracted behaviour. A delta reviewer that disputes a ledgered
  ruling is re-ruled once, with the reason — a ruling Mezi made goes to Mezi; a rejected dispute
  does not hold the round open. **A round converges** when a delta review returns nothing that goes
  to the next wave by these rules: no fix-caused blocker or should-fix, no never-parked finding, no
  claimed blocker or should-fix left open and, in the whole-branch round and after, no finding ruled
  fix; a
  fix-caused nit, a sibling, or a
  finding parked, ruled no-change, made a follow-up, sent to a contract revision or rejected as a
  dispute does not hold it open. **Cap: three delta reviews per round.** After the third, an open
  should-fix that is not never-parked is ledgered owed and listed in the PR body's Follow-ups; an
  open blocker or never-parked finding stops that PR's outward actions — push, PR update, re-push,
  merge — and its next milestone until Mezi rules, under delegation and under `publish: on-green`
  alike; other queue items continue and it is surfaced at once. **A round closes green** when it
  converged, or exited at the cap or the bound with no open blocker or never-parked finding, the
  owed items named in the PR body and at the next gate. A fix wave is pushed, re-pushed, put in a PR
  update or merged only after its round closed green, and then under the workspace's Gate 4 and
  publish decision. A review event on a merged PR opens no round on it: the fix is a new branch and
  PR (issue first where the workspace requires one), its findings tagged `fix:<pr>#<round.wave>`.
- **The ledger makes the cascade measurable.** Every implementer's agent id (or lane session id) is
  recorded at dispatch. Each round records `round:`, `pre-round base:` and `closed at:` (its HEAD
  and how: converged, cap, bound). Each fix wave records one line with the labelled fields `round`,
  `wave`, `findings`, `commits` (old→new when amended), `size` (Part C), `suite` (which ran; summary
  line), `reds` (each fix red's failing line — the red commit stays), `partA` (addressed / open),
  `partB` (unmapped hunks; the caller list read), `delta` (verdict; wall time), `steps` (per red:
  its finding id, tighten / row / sibling / new file, its nearest existing test, and `candidate`
  when the Report named a consolidation pair). Round numbers
  continue across sessions on the same PR: a later session reads the count from the ledger. **Every
  finding raised after the first fix wave, by any seat, bot or human, carries one cause tag in its
  ruling:** `fix:<round.wave>`, `pre-existing`, `new-scope` or `unknown`; the fix-introduced share
  is count(`fix:*`) / count(tagged). Gate 3 presents the round's delta-review verdicts and wall
  times; a round after the last Gate 3 puts its verdict line in the push or merge report and in the
  PR body. The seat is re-judged after two measured runs — total delta-review minutes per run,
  rounds per run, the fix-introduced share, and whether any delta review returned a blocker — in the
  coordinator's re-judge note, kept outside this repository. The test-placement rule is
  re-judged after two runs with at least 30 fix-wave test nodes in the repository the
  coordinator's re-judge note names, after their PRs merge, by a
  data lane running the saved duplication scan over the wave diffs and commits the ledger
  records — new nodes (functions and rows), the duplicate labels with a permitted sibling
  labelled as such, whether a row was available at the parent, lines — in the coordinator's
  test-placement re-judge note, kept outside this repository.
- **`/simplify` only on request, never as a stage.** The built-in skill's four cleanup agents are
  passes 4 to 7 without the contract, and its session applies their edits itself: no verification
  pass, no test run, no record outside the chat; with no upstream it diffs against `main`, and with
  no `main` against `HEAD~1` alone. When Mezi asks for it, or accepts the coordinator's offer —
  offered at the end of Phase 3 of a Light run whose diff exceeds trigger (iii)'s numbers — run it
  on a clean, committed tree with the run's base as its argument,
  `/simplify origin/<default>...HEAD`, before the whole-branch review, so the fresh eyes see its
  result; the skill documents a PR number, a branch or a path as its target, so check the diff
  command its Phase 0 ran (the session's own tool call) and discard a run that diffed anything
  else. Like the integration run after a lane merge, this is an exception to the coordinator
  running no suite and leaving fixes to the implementer, because the skill applies its edits in
  the session: read its summary against the contract and the rulings; revert every edit that
  touches a ruled item, a test file or a module outside Writes; land what is left as one
  `refactor` commit; at the squash it folds into the commit of the code it simplifies when that is
  one milestone's and stays its own commit otherwise; re-run the milestone suite to a file; and
  ledger its skips and the reverts as rulings.
- **The whole-branch review — one fresh reviewer, nine named passes, one report shape.** Never
  skipped, in any tier; it runs before the definition of done, after `/simplify` when that was
  asked for. Dispatch ONE `subagent_type: reviewer` with a six-slot brief: Read names the contract
  (the spec), the rulings, the plan where the tier has one, the ledger's parked findings
  and deferrals, the fix waves' ledger lines, and in Standard each milestone no reviewer
  saw and the plan review's findings ruled no-change or deferred, with the rulings;
  Measured facts carry base and head, the `diff-size-report <base> <head>` output, every
  red's recorded failing line and step and the result file of the last full suite run
  before dispatch (after `/simplify` when it ran); Writes is the report
  file the brief names, only; Tests is `none — read-only` (the suite runs to a file before the
  review, never inside it). The reviewer reads the rulings before the diff, so a decision the
  ledger records is reported as a decision, never as a defect: that is the one thing a reviewer
  handed only a diff cannot tell from an accident (measured 2026-10-22: the built-in `/simplify`,
  handed a merged branch's diff without its contract, reversed two ruled items with every test
  green). It then takes the passes below in order, over `git diff <base>...HEAD` and the unchanged
  lines around every hunk, and reports under one heading per pass, in this order, so a missing
  heading is a visible gap:

  1. **Contract** — each contract item and success criterion: met at `file:line` and proved by
     which test, or not met; every deviation, and whether a ruling covers it; then the
     declined-to-judge list — design choices outside the contract it chose not to grade, one line
     each, for the coordinator to rule on.
  2. **Proof** — every red's recorded failing line against the test as it stands; tests that
     assert behaviour, not mocks; unchanged neighbouring lines the change made false; what the
     suite's result file shows.
  3. **Correctness and safety** — failure paths and what they log, return or persist (a secret,
     PHI or PII in a log or an output is a blocker); data loss; concurrency; auth; a migration or
     rollback; backward compatibility; and the named risk classes of Phase 3's trigger (ii).
  4. **Reuse** — new code that re-implements what the repository already has (grep the shared and
     utility modules and the files adjacent to the change), naming the existing helper to call
     instead; and logic the branch wrote twice across its lanes. Also a test that re-creates
     an arrangement a reachable fixture, helper or existing test already builds, or re-proves
     a condition an existing test proves for the same function (same given, when and then) —
     naming the row, the tightening or the sibling it should have been: data-only differences
     are a row, a different *then* is a legitimate sibling, an old *then* plus more is
     subsumption, and the new test is trimmed to the new condition while the old test stays.
     A consolidation candidate an implementer's Report or the ledger's `steps` names, or one
     this pass finds, is a duplication finding; its fix, in the next wave, is a
     behaviour-preserving reuse fix — the shared arrangement extracted into a helper beside
     the tests, or the same-shape siblings folded into one table, every input, expected value
     and assertion kept and each folded test's name kept as its row id — proved by the suite
     staying green and limited to tests this branch added; a test on the base is folded only
     under a ruling. Checks, all read-only: the test-pathspec `git diff --numstat` with each
     non-zero-deletion file read hunk by hunk against the freeze's list, the freeze's
     added-line grep, nodes per finding from the fix waves' ledger lines (in this
     brief's Read), the search of *where a test goes* per new test, normalized test-name
     collisions in a file; a clone detector may seed the pass but never is the check.
  5. **Simplification** — redundant or derivable state, copy-paste with slight variation, deep
     nesting, dead code left behind; naming the simpler form that does the same job.
  6. **Efficiency** — redundant computation or repeated I/O, independent operations run
     sequentially, blocking work added to startup or a hot path, a long-lived object built from a
     closure that keeps a large scope alive; naming the cheaper alternative, with the lines
     compared, since this seat runs nothing.
  7. **Altitude** — whether each change fixes the root cause at the right depth: a special case
     layered on shared infrastructure is a sign the fix is not deep enough, so name the general
     change, and name the ruling, if any, that chose the shallower one.
  8. **Comment rule** (Standing rules).
  9. **Size check** (Standing rules).

  Every finding is blocker / should-fix / nit with its `file:line`, its evidence (a measurement
  where one was possible, otherwise the lines compared) and the fix; a pass with no finding says
  what it compared; the report ends with what could not be verified; the final message is the two
  verdicts (contract and quality) and the counts per pass, in at most six lines, the report file
  holding the rest. The coordinator rules on every finding, fix or no-change with the reason,
  ledgered and resurfaced at the next gate, and three dispositions follow from the passes
  themselves: a reuse, simplification or efficiency fix that preserves behaviour carries no red test
  and is proved by the suite staying green; an altitude finding whose general change alters
  behaviour the contract names is a contract revision — the delta review, never a quiet rewrite; a
  finding whose fix lives in a module outside the branch's Writes is a ledgered follow-up for the PR
  body unless Mezi widens Writes for that fix — never fixed silently. Duplication (pass 4's findings
  and pass 5's copy-paste) and the should-fixes of the comment rule and the size check are fixed
  before closing, never parked; a duplication fix that needs a shared module widens Writes, ledgered
  as a ruling. The whole-branch review's fix round runs as every fix round does — the delta-read,
  then the fix-diff delta review — until the round closes (Phase 3, fix rounds); nothing is parked
  here.
- **No parked agents, no coordinator-run suites.** An agent whose handback you
  have read is resumed or stopped in that same turn — an agent waiting on a
  `SendMessage` is dead wall time. The coordinator reads reports and diffs, not
  transcripts, and runs no suite itself: its context is the run's latency
  multiplier. A coordinator's only suites are the integration run after a lane merge (to a file — exit code checked,
  summary line read, never through a pipe), a `/simplify` run on request and the fix waves of green work it wrote
  in-session (Phase 3, fix rounds); every other run belongs to a lane or a verification agent
  (`subagent_type: data-lane`). A fix-diff delta review is bounded at 30 minutes (Phase 3, fix rounds). Scripted checks
  (probes, smoke calls, comparators) belong to a data lane as well; a coordinator runs one
  only when it is a single command whose output goes to a file and only its summary line is read.

- **Red tests are COMMITTED** before any green work exists. A test that passes
  before the implementation is a vacuous passer: name it at the gate with the
  reason; never alter it to manufacture a red. Present every red with its failure
  line AND the single change that flips it — a red whose flipping change you
  cannot name in one clause is testing something the plan does not build. Present
  with each red the step *where a test goes* took — tighten, row, sibling with its
  nearest existing test, or new file with the reason; a red whose arrangement
  re-creates one a reachable fixture builds is rewritten before the gate, and a
  vacuous passer that duplicates an existing passing test is dropped, not kept. Red
  tests follow the comment rule too — no docstring unless the setup is unusual, no
  provenance comment; a red's provenance goes in its commit message, and its failing
  line and its step under *where a test goes* (`candidate` included) in the ledger. The
  red commit stays through the final squash (Phase 4) as its own
  `test(<scope>):` commit, because the verifier checks it out. A fix wave's red is committed alone
  as `test(<scope>):` before the fix, because the verifier checks the commit sequence.
- **Where a test goes.** Before writing a red for a condition — a milestone's or a fix wave's —
  search the tests, fixtures and helpers the module's test file can reach (its own file, the
  class or `describe` that groups the function, the `conftest` or setup files, the shared test
  helpers) for the changed symbol and for the distinctive expected value (`command grep -n` or
  `rg -uuu`). An existing test that runs, passes and already proves the condition is reported
  with its node id — in a fix wave as the finding's premise contradicted, for the coordinator's
  no-change ruling; for a milestone red at Gate 2 as already proven — and no red is written.
  Otherwise take the first step that fits, additive only: **(0)
  tighten** — an assertion added to the existing test that claims this condition but asserts it only
  partly; **(1) row** — a row appended to an existing `parametrize` / `test.each` / `it.each` /
  `test.for` / `describe.each` table that exercises the same function with the same setup and the same
  assertion shape, with a behaviour-named id (the `ids=` list or title template grows with the rows;
  when several tables cover the function, the one whose rows share the new row's setup; a row whose
  expected value an existing row contradicts is a decision change, not a row); **(2) sibling** — a new
  test in the module's existing test file, in the class or `describe` that groups the function: a new
  condition of an existing function, a new function of the module, or a same-shape case whose neighbours
  are not parametrized (never converted while writing a red); built from the fixtures and helpers the
  file can reach — when the nearest test builds its arrangement inline, the sibling copies it and the
  Report names the pair as a consolidation candidate; a case whose arrangement no reachable fixture
  builds gets a new fixture or helper beside its test, in the same file; a sibling that covers several
  data cases is one table where the file already has tables, and separate tests where it has none
  (a first table in such a file is a style change the Report names); **(3) new file** — only when
  the unit has no test file at the right level, or the fixture the case needs is autouse or
  module-wide and would have to behave differently (it is not edited without a coordinator ruling:
  a new fixture beside it, or a new file, with the reason). One condition, one test, usually one
  red per finding (a red that tightens one test and adds a condition is two steps, labelled
  separately), at the lowest level that can fail; names and ids describe the behaviour, never the
  finding. Readability wins inside a test body (duplicate a line before you obscure a scenario;
  share mechanics through fixtures and helpers); the rule never forces a test that asserts two
  conditions, and never a forced row. The plan's verbatim test code follows this bullet, and a
  brief that asks for or checks a red carries this bullet's text, not only its name.
- **Test files freeze at green.** An assertion that looks wrong is a BLOCKED
  report, not an adaptation. A ruling that changes the contract lands as an honest
  red→green pair in working history and in the ledger; the final squash folds it into
  the logical commit it changes, announced in the ledger — never a quiet rewrite that
  pretends the contract always said so. A red — a milestone's or a fix wave's —
  extends existing tests additively (where a test goes, above) and never changes
  what an existing test demands beyond step (0)'s added assertion — no edited
  assertion, input or expected value, matcher, row or id, shared fixture, helper
  or parametrized body other than that assertion, and no deleted row or test —
  except under a ruling below. Every removed line in a test file (test modules,
  `conftest` and fixture files, test helpers) is either the trailing comma,
  closing bracket, import or formatter re-flow of an appended row, or covered by a
  ruling: a decision change, a prose cut, a duplication fix or the consolidation
  pass — its fold or its shared-helper refactor (no input, expected value or
  assertion changed; the suite stays green), or a finding about the test itself
  landing as its own red→green pair; anything else is a freeze violation. An added
  line that changes what an existing test sees or runs counts the same way: a
  skip, xfail or only marker, an autouse or shadowing fixture, a `setUp` or
  `beforeEach` line, a line inside a parametrized or `describe.each` body other
  than step (0)'s assertion. Editing a shared fixture is a coordinator ruling (the
  fix brief's shared-module rule), proved by every consumer staying green. Cheap
  check: `git diff --numstat <base> <head> -- <test pathspecs>`, each pathspec
  starting with `*` (Python: `'*test_*.py' '*_test.py' '*conftest.py'`; JS:
  `'*.test.*' '*.spec.*' '*__tests__/*' '*__mocks__/*'` plus the repo's setup
  files); every file with a non-zero second column is read hunk by hunk against
  that list; and `git diff -U0 <base> <head> -- <test pathspecs> | command grep
  -nE '^\+.*(skip|xfail|\.only|autouse|fixture|setUp|beforeEach|parametrize|\.each)'`
  lists the added lines that can change what an existing test sees, each read
  against the same list.
- **Red-first is the mutation; a flip is the rare exception.** A test committed
  failing and turned green by the implementation has already proved it can
  fail: it is never mutation-checked again — not at the gate, not in a review,
  not in a fix round — and a review finding is closed by a red→green pair,
  which is its own mutation. No brief asks for "the mutation that proves it".
  Gate 2 asks you to *name* the change that would flip each red, in one clause.
  **Execute a flip only for a test that did not go red-first** — a pre-existing
  test whose coverage of a changed guard is in doubt, or a vacuous passer kept
  because it pins a decision, money, eligibility, PHI/PII placement or
  persisted state — and only when its silent failure would corrupt a decision
  or persisted data. When you do: the single test node (`pnpm vitest run <file> -t "<name>"`),
  never a suite; restore with `git checkout -- <file>`; report the test's NAME;
  a handful per PR at most. Reviewers name flips; they do not run them. When
  a flip is warranted, the brief carries a line
  `flip-exception: <test> — <why>`; without it the dispatch guard's standing
  orders tell the agent not to flip.
  (Measured 2026-09-23: after the 09-19 selection memo, mutation-style runs
  rose from 216 to 302 with 20–46 suite-wide runs a day — the trigger, not the
  selection, is what costs.)
- **Testing rigour — pick the cheapest tool that can actually fail.** The repo
  already has a harness for each layer; use it rather than inventing one:

  | What you are proving | Tool | Where |
  |---|---|---|
  | A component renders and responds | component RTL, isolated | `src/**/*.test.tsx` |
  | A user scenario through the DOM shell | RTL integration via `renderShell()`, store driven by `circuitActions` | primary correctness gate for non-3D UX |
  | Scene-graph shape, prop wiring, frame logic | `@react-three/test-renderer` via `src/test/r3f/renderCircuitScene.tsx`, stepped with `advance()` | no GPU, deterministic |
  | Store contract | vanilla store + unit tests locally; `@store` Playwright on demand | not a local gate |
  | Pixels, materials, pointer-on-canvas | `@ui` Playwright, manual dispatch | the only thing that can prove them |

  The rule of thumb: **graph structure → test-renderer; pixels and pointer →
  Playwright.** AGENTS.md Step 4.1 is mandatory for shell work — component RTL
  *and* a `renderShell()` integration test per user scenario, not just widgets.

  **Playwright runs remotely and on demand, not in your loop.** E2E is
  deliberately out of the local definition of done — too expensive to run per
  change on this machine — and it is out of CI's automatic path too: `.github/workflows/e2e.yml`
  has `workflow_dispatch` only, no push, PR or schedule trigger. So a suite runs
  when someone asks for it (`gh workflow run e2e.yml -f suite=store|ui|all`,
  results in the uploaded `playwright-report/` artifact), and **how e2e coverage <!-- allow-missing-path -->
  gets validated regularly is an open question — a daily remote cron is the
  current thinking, nothing is decided.** Don't design a milestone's evidence
  around e2e, and don't quietly re-add it to a gate to compensate. What you owe
  locally is that the specs you touched are *written* to be deterministic: `reducedMotion:
  'reduce'`, time frozen with `page.clock`, volatile regions `mask`ed, and a
  small `maxDiffPixelRatio` (~0.01–0.02) rather than a loosened `threshold` for
  GPU dither. Worker contention is the flake, so never raise worker counts for
  canvas suites. If you must skip a spec, that is a ledger entry with a ticket,
  never a silent decision — and never a reason to call a milestone done.

- **Compiler-era assertions.** Do not assert render counts or referential
  identity: with React Compiler 1.0 those test compilation output, not behaviour.
  If you need a perf number, take it with `<Profiler onRender>` as a probe, never
  as a gate. And do not strip existing `useMemo`/`useCallback`/`React.memo` to
  "let the compiler do it" — React's own 1.0 guidance is to leave existing
  memoisation in place or test carefully before removing, which narrows
  Constitution §2 to *new* code. Flag any case where the two read differently and
  let Mezi rule; do not quietly pick one.

- **Zustand contracts.** Multi-field selectors go through `useShallow`; keep
  selectors trivial and derive outside. The `useFrame`/imperative bridge uses
  `subscribeWithSelector` so per-frame updates don't re-render the DOM shell. A
  store contract is testable with zero React through the vanilla store — prefer
  that for action-level tests.

- **Mutation testing was removed from this repo.** Don't reintroduce Stryker as a
  gate or propose it as evidence; if coverage of a branch-heavy function is the
  worry, write the missing cases as ordinary unit tests.

**Parallel lanes are the default once the contract is fixed** (Mezi 2026-09-28,
replacing "earned, not assumed; serialized on one worktree by default"). When a
milestone's red contract is committed and its green work divides into disjoint
`Writes` sets, that work splits into concurrent `subagent_type: implementer` lanes
dispatched in one message; doing it serially instead needs a one-line reason in the
ledger (a single file, the shared store surface, judgment-heavy work kept in-session).
The split — the lanes and their `Writes` sets — is declared before dispatch: in the
plan's waves (Standard and Full) or in the ledger (Light). Every lane still needs all five:

1. the milestone's **red contract is committed** — a fixed contract is what stops
   two lanes making conflicting implicit decisions;
2. the lanes' `Writes` sets are **disjoint at file granularity**;
3. each lane gets **its own `hacer-wt-<topic>-l<n>` worktree**, each with its
   `node_modules` repaired as above — never two file-writing agents in one
   checkout; and
4. **integration is serial and mine**: merge lane by lane, run the unit suite
   after each, the full definition of done after the last. A conflict ends
   parallel mode for that milestone — finish it serially and ledger why.
5. **shared code is settled before the lanes start.** List every helper, type,
   constant or fixture two lanes would each need, and build it first as a serial
   task committed before dispatch — or give it to one lane whose interface the
   others consume, with the commit they wait for named in the lane split. Each
   brief's Parallel-with slot names that shared code and its owner. If two lanes
   would still end up writing the same logic, do not split — unless duplicating
   now and consolidating in the pass below is genuinely faster, which is then a
   ruling in the ledger (Mezi 2026-09-28: duplication that is never consolidated
   is unacceptable).

**Consolidation pass — mandatory after any milestone that ran two or more
implementer lanes**, after the last merge and before the milestone review, or before Gate 3 when none runs; it is
the safety net for condition 5, never a substitute for it. One fresh agent
(`subagent_type: implementer`) gets the lanes' combined diff, the lane split and
the shared-able code each lane listed in its report, and folds every piece of
logic written twice — across the lanes, or between the new code and what the
repository already has — into one implementation. It reads the lanes' diffs side
by side: a clone detector finds only near-literal copies (measured 2026-09-28:
`npx jscpd` missed a planted duplicate whose only change was a renamed parameter),
so it may seed the pass but never is the check. It refactors production code and
shared test helpers, and folds same-shape tests this branch added into tables, each
folded test's name kept as its row id, never changing an assertion, an input or an
expected value, and runs the milestone's suite before and
after (to a file, summary line). A pass that finds nothing says what it compared. A fix wave's lanes
never trigger this pass: the fix-diff delta reviewer reads their integrated diff (Phase 3, fix
rounds).

**Suite runs at integration** go to a file in the run folder: check the exit
code, then read the summary line from the file — never the full output, never through a pipe. A
coordinator's only suites are the integration run after a lane merge, a `/simplify` run on request
and the fix waves of green work it wrote in-session (Phase 3, fix rounds); every other run belongs
to a lane or a verification agent (`subagent_type: data-lane`).

Cap at **three or four implementer lanes**: the limit is how many lanes' evidence
I can verify before the next wave lands. **Always parallel:** read-only fan-out
(Explore for searches; `subagent_type: researcher` for blast-radius enumeration
and step-zero probes) and reviewers of *different* tasks, dispatched in one
message. **Never parallel:** red-writing inside a milestone, `@ui` Playwright
(flaky, and headed runs are single-worker — and it is a dispatched remote run,
not a lane you own), and anything touching `circuitActions` or the store slices.

**Split verification by resource, not by step order.** QA and evidence work divides by what
each check needs, not by the order the steps were written in. Scriptable checks — vitest suites, headless core runs, comparators —
go to a data lane (or one per backend); browser checks — a Claude in Chrome pass or a local Playwright run — share one browser lane,
because only one agent can drive the browser at a time. Both are `subagent_type: data-lane`. Run the variants side by side
(branch, baseline, simulated) on separate ports instead of restarting one server per
variant, and name the real limits in the brief's Parallel-with slot (one browser driver; `@ui` Playwright stays a dispatched remote run; the store slices and `circuitActions` as one shared surface). Latency is
not contention: a read-only call that waits tens of seconds on a remote backend runs
concurrently with its siblings, so fan the requests out. What runs one at a time is what
writes or holds an exclusive handle — the singletons above, and the browser. (Measured
2026-09-28: one serial QA brief ran over an hour; split this way it was about 30–35 min.)

## Phase 4 — Closing.

**Definition of done:** stated once, in full, at `docs/harness/implementer-brief.md` §
Definition of done — five commands, all exiting 0, run in the worktree:

```
pnpm run lint          # typecheck + eslint
pnpm run test:run      # vitest
pnpm run build
pnpm run lint:docs     # no machine-specific absolute paths — CI enforces it
# + the issue's verification command
```

The first four are exactly what `.github/workflows/ci.yml` runs, so a green local gate predicts a
green PR. The closing evidence carries the branch's `diff-size-report origin/main HEAD`
output beside them.

**E2E is not in the gate — local or CI.** `.github/workflows/e2e.yml` is manual-dispatch only, so
Playwright evidence exists only when someone asks for a run; regular remote
validation is TBD (see Phase 3). Report the commands you actually ran, and if a
change plausibly moves store contracts or the canvas, say that e2e is unrun
rather than implying the gate covered it — offering `gh workflow run e2e.yml -f
suite=store` is the useful move.

- **Conventional commits, because they cut releases.** `feat:` is a minor,
  `fix:`/`revert:` a patch, `!` or `BREAKING CHANGE:` a major; commitlint
  validates. Scope them like the existing history (`feat(nodes):`,
  `fix(wiring):`). **No AI attribution** — no `Co-Authored-By`, no "Generated
  with" trailer; a husky `commit-msg` guard enforces it.
- **Docs-sync before finishing:** run the `docs-sync` skill, record material
  decisions as ADRs in `docs/decisions/`, update the living docs the change
  touched, and reconcile the ticket plus the phase checklist.
- **Squash before the PR is opened** (Mezi 2026-10-01), so CI and the verdict run on the commits that merge. Rewrite
  the branch into a handful of logical commits — one per milestone or coherent change, each red kept as its own
  `test(<scope>):` commit before the green it proves (`test` cuts no release; the verifier checks it out), every fix
  folded into the commit it fixes — with messages that describe the change, never the review process.
  `scripts/merge-on-green.mjs` merges with `--rebase`, so each kept commit lands on `main` and its conventional type is
  its release line. A fix wave's commits on an open PR are conventional commits typed by what they change (`fix`,
  `refactor`, `test`, `docs`), each a release line under the rebase merge; never folded once the PR is open (a rewrite
  is Gate 4). First `git branch backup/<topic>-pre-squash HEAD`; after the rewrite
  `git diff --quiet backup/<topic>-pre-squash HEAD` must exit 0, or restore from the backup and ledger a finding,
  never push. Delete the backup branch once the push has landed. The ledger records old head → new head and each task
  hash → its new commit. A branch pushed earlier is rewritten only when every commit on `origin/<branch>` is this
  run's own (`git log --format='%h %ae %s' $(git merge-base origin/main origin/<branch>)..origin/<branch>` names no
  other author or agent; otherwise keep the history and ledger why): record the remote head and push with
  `git push --force-with-lease=<branch>:<recorded-sha> --force-if-includes` — a bare lease is defeated by any fetch in
  between. Once the PR is opened, a rewrite is Gate 4.
- **Publish per the Gate 1 decision** — push the branch and open the PR under
  `on-green`, naming the definition-of-done commands you ran and their results, and
  the branch's `diff-size-report` totals in one line (lines by category, prose share), and a
  Follow-ups section listing should-fixes left open at the cap; the verifier's nits the coordinator
  files as follow-up issues are hacer's owed.
  **Then stop:** the round closes green and a verifier PASS stands for the PR's latest fix-wave head
  — a fix wave pushed after a PASS makes it stale, and the coordinator dispatches the verifier again
  on the new head (a fresh verifier after a BLOCK; the coordinator's own verdict only for a `risk:0`
  docs-only PR); merge-on-green's own rebase when `main` moved changes nothing the PR wrote and does
  not stale the PASS; after that, merge on green with `node scripts/merge-on-green.mjs <pr>`
  (Gate 4).
- **Prune the worktree** once its PR is merged or closed:
  `git worktree remove ../hacer-wt-<topic> && git worktree prune`.

## Standing rules — all phases, all tiers

> **GATE 4 — the merge, the release, and anything a person reads.** Merging to
> `main` (or `beta`/`alpha`) cuts a semantic-release version and deploys Pages. A
> merge on green through `node scripts/merge-on-green.mjs` after the round closed green and the
> verifier's PASS on the latest head needs no per-merge go (ADR-0013); any other merge needs an
> explicit go for
> that specific merge, every time. So does any message a human reads, and anything
> destructive (a hard reset, deleting major files, rewriting published history
> other than squashing this run's own branch before its PR is opened). A prior go
> never carries forward.

- **Evidence over claims** (Constitution §1). Never call something done without
  the command and its output. "Should pass" is not evidence.
- **Measure a premise before agreeing with it** (Mezi 2026-09-28: "if I assumed
  wrong, don't take my words for it … challenge them"). A claim from Mezi, a
  reviewer or an agent about what is broken or what is costing time is checked
  against the transcript, the code or the data before the session acts on it,
  and the reply says what was measured. A premise the measurement contradicts
  is said so, with the numbers, before any work builds on it.
- **Reuse a harness before building one.** Before building a local stack, a
  fixture seeder or a probe kit, check `scripts/` (`REPO_MAP.md` lists what is
  there) and extend what is there. A new one is built in `scripts/`,
  parameterised — paths and labels as arguments or env vars, never hardcoded —
  in its neighbours' shape (a thin `<name>.mjs` over a tested
  `<name>.logic.mjs`), with its runtime output kept out of the working tree.
- **No absolute machine paths in docs** (AGENTS.md Step 2b) — repo-relative
  paths, `../web-ide/…` for siblings, `<!-- allow-abs-path -->` for a deliberate
  exception. `pnpm run lint:docs` is the gate.
- **Build for the current phase**, and leave the seam open for the next
  (Constitution §1, ADR-0003). YAGNI still holds: don't build unused features, do
  refuse shortcuts that foreclose growth.
- **Strict TypeScript, no `any`, no `@ts-ignore`; one component per file; no
  manual memoisation; Zustand only through `circuitActions`.** These are
  Constitution §2 — a reviewer rejects on them, so don't ship them.
- **Findings get documented as they're hit** — an ADR for a decision, the living
  doc for behaviour, the ticket for scope; never the conversation alone.
- **Descriptive names over short ones.** A bare generic word as a whole name
  (`data`, `result`, `item`, `handle`) is a red flag: name the domain concept —
  gate, pin, wire, junction, bus.
- **Comments: none by default** (Mezi 2026-10-01; the dispatch guard's order 8 is the canonical text and reaches every
  agent that writes code). Self-explanatory code gets no comment. One is written only for a non-obvious why, at most
  two lines; longer reasoning goes into a committed document the comment names. No history or provenance — a past
  bug's lesson stays as the present constraint, and the story goes in the commit message — and nothing not committed
  in the repo is cited. Docstrings (JSDoc): none on a non-exported function, or one line; none on a test unless its
  setup is unusual; an exported function gets none, or one summary line plus what a caller needs, never more than
  three. Tests never assert the wording of comments, docstrings or READMEs. No ALL-CAPS emphasis, no multi-paragraph
  prose.
- **The size check** (Mezi 2026-10-01). Every milestone review and whole-branch review reports, under its own
  heading and from the `diff-size-report <base> <head>` output in its brief's Measured facts: is the size justified by
  the behaviour shipped (the behaviours, and the production lines each needs); what could be removed or simplified
  without losing quality or robustness (each cut with file:line and a line estimate); above 400 changed lines or 20
  files in a category, whether it splits into separately reviewable changes; at a test:prod ratio above 2:1, the
  properties proven more than once, citing pass 4's duplication findings by id rather than raising them again;
  after the diff has grown more than 50% since the first review, a consolidation
  pass. Prose above 25% of added production lines or 15% of added test lines, in a category with at least 200 added
  lines, is a should-fix "justify or cut"; a prompt may override the defaults with a reason (hacer's tree
  measures 15–17% production prose and 8% in tests, 2026-10-01). When `diff-size-report` is absent, report
  `git diff --numstat` by category and mark the prose share owed. A reviewer that proposes no cut says what it compared.

## Staffing table (Full tier: produced in Phase 1, kept current)

| # | Subtask | Lane | Depends on | Writes | Wave |
|---|---|---|---|---|---|

Lanes: Coordinator (main thread — judgment, architecture, phase and seam
decisions, never delegated); five seats, each dispatched by its `subagent_type`
in place of `general-purpose`, a repo skill's template included —
`prompt-reviewer`, `researcher` (research and code-facts lanes before Gate 1),
`implementer`, `reviewer`, `data-lane`; Explore (read-only search fan-out).
Independent dispatches go out in one message so they run concurrently; same wave
means dispatched together. Every inter-stage artifact — spec, plan, brief,
report, diff — travels as a FILE PATH, never pasted text.
Effort comes from the seat definitions — max for `prompt-reviewer` and
`researcher`, xhigh for `implementer`, `reviewer` and `data-lane`. The
coordinator's own drafting and planning run at the session effort: the sizing
message reports it (`$CLAUDE_EFFORT` in the Bash tool), and the owner sets
`/effort max` for Phase 1 when they want it. If a seat type does not resolve (a
cloud session has no user-level agents), dispatch `general-purpose` with
`model: opus` and ledger the effort shortfall once.

**A seat or general-purpose brief, in every tier, is written from
`~/.claude/hooks/agent-brief-template.md`** — reviewers' briefs included — with
its slots in order: Goal; Read (anchors: `file:line`, function and test names);
Writes (exact files, or `none — read-only`); Measured facts; Parallel with (the
sibling agents running now, or `none — <reason>`); Tests (exact commands,
narrowest first); Report (its shape, and where to write it). A slot with nothing
to say reads `none — <reason>`. Lanes may share one brief file, named by path in
each prompt; the hook counts a referenced file's slots only when its name
contains `brief` (`lanes-brief.md`), and naming the template fills none. <!-- allow-missing-path -->
hacer's own agents — `hacer-builder`, `hacer-verifier`, `hacer-fidelity`,
`hacer-product` — keep their briefs in `docs/harness/*-brief.md`. The dispatch
hook (`~/.claude/hooks/dispatch-guard.sh`) holds this at the moment of
dispatch: in this workspace a `general-purpose`, `claude` or untyped dispatch, or
one of the five seats, missing a slot is bounced, naming the missing slots, once
per description (it re-arms after a complete brief passes); re-dispatching with the
same description proceeds as-is, and hacer's own agents are never bounced. It also
appends standing orders to every dispatch, theirs included, and read-only
agent types (Explore, Plan, claude-code-guide) get orders 2, 6 and 7 only. The
hook's text is canonical, and a brief must not contradict it. The scope order
reads: "the brief's measured facts are given and its Read anchors are where to
start — do not re-derive the facts or survey the repository. Read what the
work itself needs: the code you change and what calls it, or, as a reviewer
or a search, wherever a finding leads. If a fact the brief should have given
you is missing, measure it once and say so in the report." The tests order
says "Run a whole suite only when the brief's Tests slot names it, once", so
**name the suite there whenever an implementer must run it before
committing**; without a Tests slot, as in hacer's own agents' briefs, "the
checks your own instructions require still run as they say". Order 8 is the comment
rule: a brief never restates it and never asks an agent to match the surrounding
comment density. The template's Report slot asks every lane for its diff's
`diff-size-report` output.

**Every brief carries a measured-facts table**, not prose about state: one row
per fact the agent will lean on — the value, the exact command that produced it,
and when. Those rows are GIVEN: the agent re-runs the command when it doubts one
and otherwise does not rediscover it; only the agent's own new claims must be
measured. Never write "treat as verified" and "prove every load-bearing claim" in
the same brief — an agent facing both re-derives everything. Reviewers get the
same table: fresh eyes means no inherited conclusions, not no inherited facts.
Tell every subagent: flag what you cannot verify as an open question, never fill
the gap with a plausible answer.
