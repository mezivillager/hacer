# HACER work system — how work is queued, picked up, gated and merged

Revision 3 · 2026-09-18 · companion to `REPORT.md`. This is the design that makes these sentences work:

> "Claude, list the priority projects." · "What's open in *surfaces*?" · "What can you pick up?" · "Work the next five items." · "Queue up: a truth-table export for the CLI."

Design constraint throughout: **you work in bursts.** Everything here must keep working, or stand down quietly, when you are gone for weeks.

---

## 1. Two layers, split by how fast they change

| Layer | Lives in | Changes | Owner |
|---|---|---|---|
| **Portfolio** — ordered priority projects, the pick ratio | `docs/portfolio.md` (in git) | rarely | you |
| **Tasks** — epics → tasks → follow-ups, dependencies, readiness | GitHub Issues | constantly | agents, under your rules |

Task state edited inside feature branches goes stale across worktrees and cloud sessions and inflates PRs; project *order* is a decision worth versioning. (R10)

### `docs/portfolio.md` (shape) — rows use your words

```markdown
| # | slug     | Project (your name for it)                     | Epic | Lane    | Progress is…                                  |
|---|----------|------------------------------------------------|------|---------|-----------------------------------------------|
| 1 | harness  | Autonomous-run improvements & agent-readiness  | #…   | enabler | G0 + G1 exit tests pass                       |
| 2 | spine    | nand2tetris alignment 0.5 → 0.7                | #…   | spine   | conformance pass count for the current phase  |
| 3 | core     | Headless core                                  | #…   | enabler | `vitest --project node` green; `hacer test`   |
| 4 | verify   | QA service                                     | #…   | enabler | capability matrix; differential green         |
| 5 | surfaces | Renderer surfaces: CLI/HDL · MCP · 2D          | #…   | enabler | scenarios pass through ≥3 headless drivers    |
| 6 | 3d       | 3D sustainability                              | #…   | enabler | scene-graph coverage; draw-call budget held   |
| 7 | polish   | UI polish                                      | #…   | taste   | batches you approved                          |
| 8 | bugs     | Bugs                                           | #…   | upkeep  | no sev:high open > 7 days                     |
| 9 | upkeep   | Maintenance & documentation                    | #…   | upkeep  | 0 stale dependabot PRs; 0 dead doc paths      |
|10 | horizon  | Beyond nand2tetris (research notes only)       | #…   | research| one open note at a time                       |

## Pick rule
1. Any `sev:critical` bug.
2. Until G0 and G1 exit tests pass: `harness` only (the foundation slice — short, strictly first).
3. Afterwards rotate 2 spine : 2 enabler : 1 upkeep.
   An enabler task is eligible only if an open spine task is blocked-by it (pull, don't push).
4. `polish` and `horizon` are picked only when you ask, or in dormant mode (horizon only).
```

Why a ratio and not strict order: a strict walk put ~56 platform tasks ahead of the product, which is exactly the "platform work superseding the spine" your CLAUDE.md forbids. (R21)

---

## 2. Task model (GitHub Issues)

- **Hierarchy:** one *epic* per portfolio row → *task* sub-issues (`gh issue create --parent`) → dependencies via `--blocked-by`. Verified in the installed `gh` 2.101. Issue *types* are not available on a user-owned repo, so kinds are labels.
- **Labels — about twenty:**

| Group | Values |
|---|---|
| project | `project:harness` … `project:horizon` (10) |
| state | `agent-ready` · `in-progress` · `needs-human` (absent = still being shaped; "blocked" is computed from `blockedBy`, not labelled) |
| risk | `risk:0` docs/tests/deps · `risk:1` pure logic under conformance · `risk:2` store/UI/architecture/harness |
| kind | `bug` · `research` (default = task) |
| severity | `sev:critical` · `sev:high` (bugs only) |
| misc | `bot-filed` · `overturned` |

Size is not a label — the PR-hygiene check measures it.

### "Ready" is computed
Pickable = open · `agent-ready` · no `in-progress` · every `blockedBy` closed · **author on the allowlist**.

**Security boundary (R17, R25).** The repo is public and the agent holds your GitHub identity, so:
- agents read issue bodies **and comments** only from allowlisted authors;
- anything triaged from outside content is filed `needs-human`, never `agent-ready`;
- review threads must be resolved only when the reviewer is allowlisted;
- `bot-filed` issues never become `agent-ready` without you.

*Honest limit:* labels are applied by whoever holds your identity — including agents. Until agents run under a separate bot identity (G6), these are conventions enforced by the skill and visible in the audit trail, not access controls.

### The agent-ready issue form
1. **Goal** — one sentence, user-visible outcome.
2. **Acceptance criteria** — as *named tests or scenario ids to add*, not prose.
3. **Verification command** — the exact command whose exit code proves it.
4. **In scope / out of scope.**
5. **Files likely touched.** Run `node scripts/blast-radius.mjs` on them before `agent-ready` is applied (`docs/harness/README.md`).
6. **Risk** label; **blocked-by**.
7. *Added 2026-09-18 (#259):* a `surfaces` task also names the **scenario ids** it covers and the **drivers** it adds (`hdl` / `mcp` / `svg2d` / `cli`), and links its sibling issues for the other non-3D surfaces — `docs/portfolio.md` "Hand in hand".
8. *Added 2026-09-25 (#469), both optional:* **Introduced by:** the decision (`ADR-NNNN`, `R<n>` or
   `P-<n>`) this issue traces to, when it is a defect a decision caused. **Decisions:** the decision
   ids this issue exists to carry out, when it is scoped from one — mirrors the PR body's
   `Decisions:` line (`docs/harness/implementer-brief.md`). Most issues carry neither.

Evidence: across 3,180 agent PRs, well-scoped (+16.4%), self-contained (+16.7%) and reproduction-bearing (+11.5%) issues merged markedly more often (track 3). An issue whose estimate exceeds the PR budget is split into sub-issues before it is ready.

---

## 3. The commands

One script, `scripts/backlog.mjs` (pure Node over `gh … --json`, unit-tested; starts life as ~60 lines with `ready` only), wrapped by one skill.

| You say | It runs | You get |
|---|---|---|
| "list the priority projects" | `backlog projects` | portfolio rows with live counts: open · ready · in-progress · needs-human, and the next ready task per project |
| "what's open in *surfaces*?" / "…in docs?" | `backlog tasks <slug or alias>` | the epic's tree with dependencies, state, risk (`docs`, `maintenance` → `upkeep`) |
| "what can you pick up?" | `backlog ready` | pickable tasks in pick order — and for the rest, *why not* (blocked by #n · needs-human · unshaped) |
| "work the next N" | `backlog next` → locally `/autonomous`; in the cloud, N single-issue `claude --cloud` sessions | claims, runs each through `ha-prompt-it`, opens PRs, reports at the end |
| "queue up: …" | triage agent | issue(s) in the form above, split to fit the budget; `needs-human` if risk:2, from outside content, or if the criteria need your call |

Output is terse and greppable; detail goes to a file.

`/autonomous` and its hooks live in `~/.claude/` and do not exist for cloud sessions or routines. So the pick, claim, blocked-exit and dormant-mode rules must live in the **repo** skill (`ha-prompt-it` v2) and in `backlog.mjs`, not in `/autonomous`.

---

## 4. The loop an agent follows for every task

```
orient   scripts/agent-orient → phase, portfolio top, `backlog ready`, CI status of main, open agent
         PRs ordered by mergeability, last 5 failure-ledger entries          (SessionStart hook)
claim    create ref refs/heads/claim/<issue#> — atomic: GitHub rejects a second creation;
         then label in-progress. Working branch follows ADR-0002: <type>/<issue#>-<topic>
tier     ha-prompt-it: One-liner | Light | Full (the "when close, take Light" rule lives in /autonomous today → copy it in)
red      failing test / scenario committed first — the acceptance criteria become tests
green    smallest change that passes; stay inside the issue's scope
prove    run the issue's verification command + the definition of done; paste exit codes
PR       "Fixes #n"; one sub-issue per PR; inside the size budget; evidence in the body
gates    CI → PR hygiene → (advisory verifier).  Blocker → fix.  Other findings → ≤3 follow-ups, depth 1
merge    per tier (§7)
retro    one line in docs/harness/ledger.md if anything went wrong; second occurrence → mechanise it
next     `backlog next`
```

**The blocked exit is first-class.** Ambiguous, impossible, or needs a harness change → label `needs-human`, write the question *and a recommended answer* on the issue, release the claim, take the next task. It is the cheapest anti-reward-hacking lever measured.

**Dormant mode.** At 5 open agent PRs, or 7 days without a human merge: no new PR-producing work; only `horizon` notes and issue shaping; scheduled jobs stand down. `agent-orient` opens with a welcome-back digest.

**Stale claims** (claim ref with no push for 48 h) are released by the next `agent-orient`, not by a calendar job.

---

## 5. PR policy

- **One PR = one sub-issue = one milestone.** A four-milestone ticket is four PRs landed in sequence to `main`, each green, unwired or flagged if incomplete (land the core → land the surface binding → wire the UI).
- **Budget (R12):** warn > 200, fail > 400 *reviewable* changed lines (today's median by that same measure: 604; without `docs/`: 168 — so the budget is mostly about how specs and plans ship). Not counted: test files, lockfile, vendored vectors, snapshots, `linguist-generated`. Tests reported separately, never capped. ≤ ~15 files. Override: a `size-override` label with a one-line reason (a convention, see §2).
- **Plans stop containing complete code** — contracts, test names, milestone list; ≤ ~150 lines, or just the issue body. (Specs + plans were 30–57% of the five bulkiest PRs sampled.) A spec or plan that needs a file ships as its own docs-only `risk:0` PR.
- **No refactors inside feature PRs.**
- **Avoid stacks.** Sequential small PRs to `main` beat stacked branches (PR #135 landed on the wrong base and was redone as #136).

---

## 6. Checks

("Gates 1–4" remain `ha-prompt-it`'s approval gates; these are CI checks.) Every PR, cheap → expensive, all in Node/jsdom — **no browser on the PR path** (ADR-0012 stands).

| # | Check | Catches |
|---|---|---|
| 1 | `lint`: typecheck, ESLint, **layer walls** (dependency-cruiser), doc paths, AGENTS.md line budget | architecture and doc drift |
| 2 | unit — `node` project (core, simulation, utils; store files join as they shed `localStorage`/`window`) · `jsdom` project (store, components, r3f scene graph) | logic, scene-graph regressions |
| 3 | **conformance** — official `.tst`/`.cmp` for every in-phase chip; pass count may only rise | the oracle |
| 4 | **scenarios × drivers** (+ generated `capability-matrix.json`; a report until ≥3 drivers exist) | a surface falling behind |
| 5 | `build` | bundling |
| 6 | **PR hygiene** under `pull_request_target`, diff read by API only: linked issue, size budget, **tamper flag** (protected paths touched; `expect(` removed; `.skip`/`.only`/`passWithNoTests` added) | bulk, reward hacking |
| 7 | **advisory verifier** — `claude-code-action`, fresh context, inputs = issue criteria + diff + CI artifacts, read-only, JSON verdict; only on risk:1/2 PRs over ~100 reviewable lines | scope creep, mocked-away behaviour, convention breaks |

The verifier never sees the builder's transcript, never blocks, and is tuned by your `overturned` labels.

Protected paths (flagged, not gated): vendored vectors · `.github/**` · `package.json` (where `lint`, `test:run`, `build` are defined) · `eslint.config.js` · `vite.config.ts` (holds the Vitest block) · `tsconfig*.json` · `playwright.config.ts` · `.husky/**` · `lint-staged`/`commitlint` config · `.releaserc.json` · dependency-cruiser config · `scripts/hooks/**`, `scripts/check-*`, `scripts/backlog*` · `docs/portfolio.md` · `AGENTS.md` · `.claude/**`.

**Off the PR path, change-triggered** (fire only if `main` moved since the last run; silent in dormant mode; each carries a usage-budget line):

| Job | Runs on |
|---|---|
| differential vs web-ide on generated circuits · command fuzz · HDL parser fuzz · flake hunt · `pnpm audit` | GitHub Actions cron — no Claude usage |
| doc gardening (small PRs) · dependabot triage | a routine, weekly at most |
| 3D goldens · exploratory browser agent | **only if you accept the ADR-0012 amendment** (R24) |

**Bot issue contract:** executable repro or no issue · fingerprint in an HTML comment, searched against open *and* closed · ≤3 per run · ≤10 open `bot-filed` issues, overflow into one rolling issue · never `agent-ready` without you.

---

## 7. Merge authority

| Tier | What | Available when | Needs |
|---|---|---|---|
| 0 | docs, tests-only, dependency patches | G1 exit test passes | your opt-in |
| 1 | pure logic in `src/core`, `src/simulation`, under conformance | G3 exit test passes | your opt-in |
| 2 | store, UI, R3F, architecture, anything touching a protected path, all `polish` | — | your ~90-second concept review, always |

Tier = risk. The issue's `risk:` label is a forecast; the value **computed from the diff's paths wins** and is never declared by the author. This only makes sense once a merge is cheap — release and deploy decoupled from `push: main`, and a ruleset with required checks and no bypass (G1).

---

## 8. `ha-prompt-it` v2 — what changes, what stays

Stays: tiers, gates 1–4, fresh-context spec review, disjoint-write-set lanes, the testing-tool matrix, publish decision defaulting to `hold`.

| Change | Why |
|---|---|
| Reachable by cloud agents and versioned (public repo or private companion — decision 6) | today it is outside any repo |
| Starts from an **issue** | criteria and verification command already exist |
| **Milestone = PR**, inside the size budget | today ticket = PR, median 850 changed lines (604 reviewable) |
| Plans: contracts + test names, no complete code | halves PR size; no duplicated code to rot |
| Evidence on the issue/PR; failures in `docs/harness/ledger.md` | the ledger has no home today |
| Explicit **blocked** exit; dormant mode | graceful degradation |
| Retro step: second occurrence → lint, test or hook; only the un-mechanisable goes to AGENTS.md | keeps the doc pile from regrowing |
| **~200-line budget**; environment lore moves into `scripts/wt-new` | it is 370 lines today |

Improvement stays bounded: append deltas, never rewrite the playbook wholesale.

---

## 9. What to measure (three numbers, printed by `agent-orient`)

Median reviewable lines per PR · **your minutes per merged PR** · escaped defects (found after the gates passed — each must add a test at the layer that missed it). Conformance pass count is already a gate.
