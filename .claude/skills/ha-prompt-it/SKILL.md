---
name: ha-prompt-it
description: "Use when Mezi says \"prompt it\" or answers yes to \"Prompt it?\" in the hacer (ha) workspace, asks for a task prompt to review before work starts, or opens a multi-step hacer build, fix, or phase-0.5 ticket that should not begin until he has approved what will be built."
---

# HA Prompt It — the full pipeline, hacer edition

> **Moved into the repo 2026-09-18** (from the workspace `ha/.claude/skills/`) so cloud sessions and
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
`writing-plans`, `executing-plans`, `tdd`, `test-driven-development`,
`dispatching-parallel-agents`, `code-review`, `docs-sync`, `hacer-patterns`,
`verification-before-completion`, `finishing-a-development-branch` — over the
global superpowers equivalents wherever both exist.

> **GATE 1 — the spec, and the publish decision.** Mezi approves what will be
> built, and confirms or overrides the publish default (below).
> **GATE 2 — each milestone's red contract.** He approves the committed failing
> tests before green work begins.
> **GATE 3 — each milestone's completion.** He reviews the evidence before the
> next milestone starts.
> **GATE 4 — the merge, and anything that speaks to people.** Canonical
> statement in Standing rules.

**The publish decision — asked once, at Gate 1.** End the Gate 1 message with one
question and the answer you will proceed on:

- **Publish on green** — when the definition of done passes, push the
  `hacer-wt-<topic>` branch and open the PR, then report. *Recommended here:
  hacer is Mezi's own repo, CI is the real gate, and the PR's preview deploy is
  how a change gets looked at.* Note that opening the PR triggers
  `pr-preview.yml`, a Pages preview — an artifact that leaves this machine.
- **Hold** — commit in the worktree and draft the PR body; push nothing.

Record the answer in the ledger as `publish: on-green` or `publish: hold`, restate
it in the first execution message, and treat an unanswered question as **hold**.

**Merging is never covered by it.** A push to `main` runs `release.yml`
(semantic-release cuts a version and a changelog from the conventional-commit
types) and `deploy.yml` (GitHub Pages). Merge is therefore a release and a
deployment: it needs its own explicit go, every time, however Gate 1 was answered.

**Delegated gates.** When Mezi hands a task over to run autonomously — the
`autonomous` skill (`~/.claude/skills/autonomous/`) does this for a whole queue —
the coordinator rules Gates 1–3 itself, writes every decision to the ledger with
its cost if wrong, and raises only the questions that matter, up front, each with
the default it will proceed on. Every "wait for Mezi" becomes *present, ledger,
proceed*. Gate 4 stays gated: the merge, and any message a person reads.

**Milestones.** A group of plan tasks shipping one coherent, checkable slice.
Size each to be worth a human checkpoint; Gates 2 and 3 fire at milestone
boundaries, never at every task. Draw the boundaries for parallelism too: group
tasks by what they depend on rather than by narrative order, so each milestone
opens with as wide a first wave as the work allows.

## Sizing — decide before Phase 1; say which tier and why, in one line

- **One-liner** — a single small edit, a question, a lookup. Do it directly.
- **Light** — about one milestone's worth, no new cross-system seam. Spec plus
  TDD in this session; no plan document, no fan-out. **AGENTS.md Step 1 is still a
  hard gate:** anything with 3+ implementation steps gets a `docs/specs/` design
  approved before code, at every tier above one-liner.
- **Full** — several milestones, a new seam, or parallel agents: the whole
  pipeline below.

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

**Also produce the staffing table** (format at the bottom of this file) at the
end of Phase 1, with `Depends on`, `Writes` and `Wave` filled in — it is what
makes the parallel schedule reviewable before a single agent is dispatched.

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
context, Opus or better, that reads only the spec and the code it cites: does the
contract match the code as it stands, is anything named that does not exist, does
it build for the current phase, and is any success criterion unprovable? Fold its
must-fixes before presenting. When the spec changes semantics under `src/core/**` or
`src/simulation/**`, or shapes an epic or ADR in `spine`, `surfaces` or `horizon`, the
same review includes the fidelity check (`docs/harness/fidelity-brief.md`, ADR-0018):
the contract is checked against the oracle vectors and the book, not only against the
code. Its proposals go to `docs/harness/fidelity-inbox.md`; they are never applied here.

**The spec is the prompt.** Save it as `docs/specs/YYYY-MM-DD-<topic>.md` — one
artifact, not two. Its contract section is the authority every later ruling
resolves against.

## Phase 2 — The plan.

Use the repo's `planning` / `writing-plans` skills, with these amendments:

- **Spec header:** point `Spec:` at the approved `docs/specs/` path.
- **Atomic tasks:** 2–5 minutes each, with exact file path, complete code, and the
  verification command that proves it (AGENTS.md Step 3).
- **Declare milestones**, and **hoist the reds**: each milestone opens with one
  task that writes and commits every failing test for it; later tasks are
  green-only and may not touch test files.
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
- **Plan and code never diverge.** Whenever a later ruling changes what ships,
  sync the plan in the same turn — a stale plan is worse than no plan, because
  the next agent believes it.

**Executable plan review — the load-bearing step.** Dispatch a fresh-context
reviewer, Opus or better, that BUILDS the plan in a throwaway `hacer-wt-*`
worktree off the same base: type the plan's test and implementation code, run the
suites, verify the selectors and fixtures exist as cited, and enumerate the blast
radius on existing tests one by one (breaks / survives, with the reason). Demand
measured claims ("8 fail, 5 pass, here are the names"). It leaves nothing behind.
Fold must-fixes. **The plan is not a gate** — present it in one line with the
verdict and proceed.

## Phase 3 — Gated execution.

**Before any dispatch:**

- **Node, in every single command** — the Bash tool starts on Node v14 and pnpm
  refuses to run: `export NVM_DIR="$HOME/.nvm"; . "$NVM_DIR/nvm.sh"; nvm use 22`.
  Shell state does not persist between calls, so repeat it each time.
- **Worktree** — `git worktree add ../hacer-wt-<topic> -b <type>/<topic>`, a
  sibling of the repo, never nested, never committing to `main`.
- **Repair `node_modules` on arrival** — every `hacer-wt-*` has lost its unscoped
  symlinks: `rm -rf node_modules && pnpm install --frozen-lockfile`, then verify
  `ls node_modules/.pnpm/@babel+helper-compilation-targets@*/node_modules/` lists
  `browserslist`, `lru-cache`, `semver`. A plain install fixes only the top level
  and leaves every test failing on `_lruCache is not a constructor`.
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

- **Red tests are COMMITTED** before any green work exists. A test that passes
  before the implementation is a vacuous passer: name it at the gate with the
  reason; never alter it to manufacture a red. Present every red with its failure
  line AND the single change that flips it — a red whose flipping change you
  cannot name in one clause is testing something the plan does not build.
- **Test files freeze at green.** An assertion that looks wrong is a BLOCKED
  report, not an adaptation. Rulings that change the contract land as honest new
  commits.
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
  change on this machine — and it is out of CI's automatic path too: `e2e.yml`
  has `workflow_dispatch` only, no push, PR or schedule trigger. So a suite runs
  when someone asks for it (`gh workflow run e2e.yml -f suite=store|ui|all`,
  results in the uploaded `playwright-report/` artifact), and **how e2e coverage
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

**Parallel lanes are earned, not assumed.** Serialized on one worktree by default,
until all four hold and the plan said so:

1. the milestone's **red contract is committed** — a fixed contract is what stops
   two lanes making conflicting implicit decisions;
2. the lanes' `Writes` sets are **disjoint at file granularity**;
3. each lane gets **its own `hacer-wt-<topic>-l<n>` worktree**, each with its
   `node_modules` repaired as above — never two file-writing agents in one
   checkout; and
4. **integration is serial and mine**: merge lane by lane, run the unit suite
   after each, the full definition of done after the last. A conflict ends
   parallel mode for that milestone — finish it serially and ledger why.

Cap at **three or four implementer lanes**: the limit is how many lanes' evidence
I can verify before the next wave lands. **Always parallel:** read-only fan-out
(Explore, blast-radius enumeration, step-zero probes) and reviewers of *different*
tasks, dispatched in one message. **Never parallel:** red-writing inside a
milestone, `@ui` Playwright (flaky, and headed runs are single-worker — and it
is a dispatched remote run, not a lane you own), and anything touching
`circuitActions` or the store slices.

## Phase 4 — Closing.

**Definition of done, all exiting 0** (hacer `CLAUDE.md`), run in the worktree:

```
pnpm run lint          # typecheck + eslint
pnpm run test:run      # vitest
pnpm run build
pnpm run lint:docs     # no machine-specific absolute paths — CI enforces it
```

Those four are exactly what `ci.yml` runs, so a green local gate predicts a
green PR.

**E2E is not in the gate — local or CI.** `e2e.yml` is manual-dispatch only, so
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
- **Publish per the Gate 1 decision** — push the branch and open the PR under
  `on-green`, naming the definition-of-done commands you ran and their results.
  **Then stop:** the merge is Gate 4.
- **Prune the worktree** once its PR is merged or closed:
  `git worktree remove ../hacer-wt-<topic> && git worktree prune`.

## Standing rules — all phases, all tiers

> **GATE 4 — the merge, the release, and anything a person reads.** Merging to
> `main` (or `beta`/`alpha`) cuts a semantic-release version and deploys Pages —
> it needs an explicit go for that specific merge, every time. So does any
> message a human reads, and anything destructive (a hard reset, deleting major
> files, rewriting published history). A prior go never carries forward.

- **Evidence over claims** (Constitution §1). Never call something done without
  the command and its output. "Should pass" is not evidence.
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

## Staffing table (produced in Phase 1, kept current)

| # | Subtask | Lane | Depends on | Writes | Wave |
|---|---|---|---|---|---|

Lanes: Coordinator (main thread — judgment, architecture, phase and seam
decisions, never delegated); implementer agents (Opus or better); Explore
(read-only fan-out). Independent dispatches go out in one message so they run
concurrently; same wave means dispatched together. Every inter-stage artifact —
spec, plan, brief, report, diff — travels as a FILE PATH, never pasted text. Tell
every subagent: flag what you cannot verify as an open question, never fill the
gap with a plausible answer.
