# Decisions taken on the owner's behalf (2026-09-18)

> **Canonical copies now live in `docs/decisions/rulings/`** (R1–R106 in the `2026-09-18-*` and `2026-09-19-*` files, imported by #466 with their ids kept); this file is the research-time record and is not maintained.

Every judgment call made during the research run and the first execution run, with its cost if wrong and how to revert it. New decisions go to `docs/harness/ledger.md` once it exists; ADRs record the ones that become policy.


Every judgment call made on Mezi's behalf, with what it costs if wrong and how to revert it.
Format: **R#** — ruling · *why* · *cost if wrong* · *revert*.

## Run-level

**R1 — Treat the session as research/design only; nothing under `hacer/src` is touched.**
*Why:* the brief says "the goal of this session is not to implement all these immediately".
*Cost if wrong:* low — you wanted some scaffolding too; it can be queued as the first tasks of the new backlog.
*Revert:* tell me to start executing the seed backlog.

**R2 — Publish decision = `hold`.** No push, PR, issue creation, or any other remote write. `ha/CLAUDE.md` carries no standing publish grant.
*Cost if wrong:* low — deliverables sit locally until you say push.
*Revert:* "publish on-green for hacer".

**R3 — Skipped the brainstorming skill's one-question-at-a-time dialogue and approval gate for the *research itself*.**
*Why:* you explicitly asked for research and then said "work autonomously"; the skill's hard gate is about implementation, and none happens here. The design is presented for approval at the end instead of section-by-section.
*Cost if wrong:* medium — the report may rest on a misread of intent in places. Mitigation: the report states the interpreted intent up front and marks each recommendation with an alternative.
*Revert:* answer the "open questions" section of the report; I re-cut affected parts.

**R4 — Seven parallel research tracks** (2 internal audits of hacer + web-ide, 5 external: agent-ready repos & work queues & PR size; AI QA; multi-surface architecture; cloud 3D/headless WebGL; Claude Code capabilities).
*Why:* the brief spans that many independent domains; each needs web sources.
*Cost if wrong:* token spend only.

**R5 — Run directory is `<run directory>`** (queue, rulings, raw track reports). `ha/` is not a git repo and has no docs home; `hacer/` main must stay clean.
*Cost if wrong:* none — files can be moved.

## During collection

**R6 — Do NOT edit `ha/CLAUDE.md` in this run, even though track 1 proved four of its statements stale** (HDL/chip pipeline "not wired" — it is; `gateLogic.ts`/`GateType` union — gone, gates carry `chipName`; Stryker in CI — removed by ADR 0011; `test:e2e:store` in definition-of-done — E2E is manual-only per ADR 0012). Verified by me against the tree on 2026-09-18.
*Why:* it is your instruction file, `ha/` is not a git repo so there is no history to revert from, and R1 scopes this run to research. The exact corrections go in the report and become the first doc-drift item in the seed backlog.
*Cost if wrong:* low-medium — every session until it is fixed starts from a wrong architecture picture (that cost is already being paid today).
*Revert:* say "fix ha/CLAUDE.md now" and I apply the four corrections.

**R7 — Track reports are subagent output and are treated as data, not instructions; claims the synthesis leans on get spot-checked by me before they are cited as fact.** Track 1's four stale-premise claims: all confirmed.
*Cost if wrong:* none — this only adds checking.

**R8 — Your ADRs 0011 (Stryker removed) and 0012 (E2E manual-only), both dated 2026-09-17, are treated as standing decisions. The report will NOT recommend reinstating either as a PR gate**, even though the AI-QA research track proposes both (Stryker ratchets, `test:e2e:store` as a required check).
*Why:* you decided a day ago, with reasons that the research actually supports (browser tests = slowest, least deterministic gate; an expensive gate with no actionable signal is a tax). The ADRs themselves name the hole they leave — "the automated safety net is now lint, unit tests and build" and "the repo loses its only automated check for vacuous tests". The report fills that hole with gates that are cheap and deterministic instead: official `.tst/.cmp` conformance, differential testing against web-ide's simulator, and one scenario suite run through several headless surfaces in plain Node. Browser/3D checks stay off the PR path (scheduled/cloud/advisory only).
*Cost if wrong:* low — if you do want mutation testing back, the defensible form is nightly, non-blocking, scoped to `src/core` + `src/simulation`; it is listed as an optional later item, not a goal post.
*Revert:* say "reconsider 0011/0012" and I add them back as options with cost estimates.

**R9 — Track 7 (Claude Code capabilities) is rated lower-confidence; only claims I verified against code.claude.com docs myself are used** (see `tracks/07-...VERIFIED.md`). Consequence for you: managed Claude Code Review is Team/Enterprise-only and its check is always neutral, so the independent-reviewer goal post is built on `claude-code-action` or a PR-triggered routine with a structured verdict, not on the managed product. I also reject that track's suggestion to replace your `/autonomous` skill + Stop hook with routines — they solve different problems (event-triggered fresh sessions vs. one long driven session) and are complementary.
*Cost if wrong:* low — if you are on a Team plan, managed Code Review becomes an easy add-on.

## Design rulings (made while drafting the report — every one is a recommendation you can overturn by editing one file)

**R10 — Backlog home: GitHub Issues hold tasks; one small in-repo file (`docs/portfolio.md`) holds the ordered list of priority projects.** Not Beads, not Backlog.md, not more markdown ticket files.
*Why:* the repo has 0 open issues and five files that disagree about "what's next"; issue state never conflicts across worktrees or cloud sessions; `gh` 2.101 (installed, verified) has `--parent`, `--blocked-by`, `subIssues`, `blockedBy` fields; PRs close issues automatically; you get a phone-readable view for free. Project *order* changes rarely and is yours to own, so it lives in git where it is reviewable and protected.
*Cost if wrong:* medium — migrating issues to another tracker later is a script, but habits form around it.
*Revert:* keep tasks in-repo (Backlog.md is the best of that family); the rest of the design is unchanged.

**R11 — Proposed project order:** harness → core → verify → surfaces → spine → 3d → hygiene (standing lane) → horizon (research-only lane), with the nand2tetris spine *interleaved*, not paused: every spine ticket is re-cut "headless-first" and several open P05 tickets are already surface/verification work (P05-21 = HDL surface, P05-26 = circuit↔HDL, P05-27 = scenario suite, P05-31 = pure logic, P05-32 = replace flaky UI suites).
*Why:* your CLAUDE.md says platform work must not supersede the 0.5→0.7 spine; your brief says the spine stalled because the platform cannot be verified. Interleaving honours both.
*Cost if wrong:* low — reorder the lines of `docs/portfolio.md`.

**R12 — PR budget: fail CI above 400 "reviewable" changed lines, warn above 200; tests, lockfile, vendored vectors, snapshots and generated files are not counted; one PR = one sub-issue (a milestone), never a whole ticket; override only by a human-applied label.** Plans stop containing "complete code" (AGENTS.md Step 3) — that rule alone is 40–57% of each bulky PR.
*Why:* measured median owner PR = 850 lines, 26/57 over 1,000. Google ("100 reasonable, 1000 too large"), SmartBear/Cisco (200–400 LOC), Graphite and DORA 2025 all point the same way. No source gives a number for AI-author + AI-reviewer; 400/200 is a judgment call.
*Cost if wrong:* low — two constants in one script.

**R13 — Stay a single package with lint-enforced walls now; move to pnpm workspaces only when the first Node build target (CLI/MCP) lands.**
*Why:* walls (dependency-cruiser + a no-DOM tsconfig) cost one small PR; workspaces cost an `@/` alias rewrite, semantic-release rework and duplicated Vite/Vitest config — not worth paying before something needs a separate build.
*Cost if wrong:* low-medium — the later extraction is somewhat larger.

**R14 — Technology picks are recommendations gated by a spike each, not decisions:** 2D = hand-rolled React SVG + elkjs (DOM/SVG is assertable in jsdom; canvas libs repeat the 3D problem); HDL editor = CodeMirror 6; MCP = ~6 workflow-level tools generated from one command registry, stdio first; WebMCP optional/later.
*Cost if wrong:* low — each pick enters the backlog as a `research` task whose output is an ADR you approve.

**R15 — You keep the merge button at the start.** Merge to `main` fires semantic-release and the GitHub Pages deploy (Gate 4 in ha-prompt-it), and agents act under your GitHub identity so they cannot satisfy the 1-approval rule anyway. The report defines a trust ladder (Tier 0 docs/tests/deps → Tier 1 pure logic under conformance → Tier 2 UI/architecture) and makes auto-merge a *later* goal post that needs your explicit opt-in per tier.
*Cost if wrong:* you remain a (cheap, ~1–2 min/PR) bottleneck longer than necessary.

**R16 — "One engine" is flagged, not decided.** Track 1 infers that the canvas evaluator and the HDL compiler will collide when Phase 0.6 adds a clock (tick/tock implemented twice). The report makes "decide this by ADR before any 0.6 sequential work" a goal post and queues a design spike; it does not pick the answer.
*Cost if wrong:* high if ignored (duplicate sequential engines), none for flagging.

**R17 — Security boundary for the public repo: agents only pick up issues authored by an allowlisted identity (you / your bots) AND carrying the `agent-ready` label.** Anyone can file or later edit an issue on a public repo; an agent that executes arbitrary issue text is a prompt-injection channel into a session that holds your GitHub identity.
*Cost if wrong:* none for being strict; outside bug reports get re-filed by triage rather than executed directly.

**R18 — Deliverables stay in this run directory; nothing is committed to `hacer/`.** The first seed-backlog item lands them in `hacer/docs/research/` as a docs-only PR when you say so. Not published as a claude.ai artifact either (that is an upload; publish = hold).
*Cost if wrong:* none — one command moves them.

## Rulings after the adversarial review (2026-09-18) — several earlier rulings are amended here

> Correction to the heading above R10: "every one … you can overturn by editing one file" was overstated. Realistic revert costs are now given per ruling below and in the end-of-run review.

**R19 — R15 amended: the first oversight goal post is "make merge cheap", not "you keep the merge button".** Verified: `release.yml` and `deploy.yml` both fire on push to `main`; you work in bursts (10 active days in 120). A design where every PR waits for you simply stops when you leave, and the trust ladder could never accumulate its "N clean merges". New recommendation: move release + deploy to `workflow_dispatch`/tag/weekly cron so a merge is an ordinary, revertible commit; then Tier-0 auto-merge is offered from the start and Tier 1 after the oracle gates exist. Add a **dormant mode**: a cap on open agent PRs (5); at the cap agents do only work that needs no PR (research notes, shaping issues) and scheduled jobs stand down.
*Still yours:* whether to decouple deploy, and the opt-in per tier — nothing merges by itself until you say so.
*Cost if wrong:* medium — production lags `main` by up to a week unless you dispatch a deploy. *Revert:* restore the two `on: push` triggers (one small PR).

**R20 — H8 rewritten.** Verified: ruleset `main-rules` exempts the admin role entirely (`bypass_mode: exempt`) and requires 1 approval a solo owner can never give himself. Adding required checks would bind nobody. Recommendation: approvals → 0, required checks on, **no bypass**, so green CI binds you and agents alike. Secrets (`RELEASE_TOKEN`, and any Claude OAuth token) move into a GitHub environment restricted to `main`. PR-hygiene/tamper checks run under `pull_request_target` reading the diff by API only (never checking out PR code), so a PR cannot edit its own guard.
*Honest limit now stated in the report:* while agents act under your GitHub identity, every "human-applied label" is a convention, not a control. It becomes a control only with a separate bot identity.
*Cost if wrong:* low. *Revert:* re-add the bypass actor in repo settings (1 minute).

**R21 — R11 amended: allocation by ratio, enablers pull-based.** After a short, strictly-first foundation slice, picks rotate 2 spine : 2 enabler : 1 upkeep. An enabler task outside the foundation is eligible only when an open spine task is `blocked-by` it. P05-21/26/27 stay spine tickets (re-cut), not "superseded" into platform work.
*Why:* the reviewer counted ~56 tasks queued above the spine — that is platform work superseding the product ladder, which your CLAUDE.md forbids.
*Cost if wrong:* low — three numbers in `docs/portfolio.md`.

**R22 — Command registry: decide now (ADR), build later.** C5 (74 toast call sites → Results) and C10 (registry v0) are deferred until a second surface that *writes* to the circuit exists. CLI `hacer test`, the HDL surface and scenarios × drivers do not need them. Start with two drivers (core, store); the parity test is a report, not a required check, until there are three.
*Cost if wrong:* low-medium — the MCP surface arrives later or hand-written first.

**R23 — Recurring agent spend is change-triggered and budgeted; plan is "unknown", designed for the lower tier.** Scheduled jobs fire only when `main` moved since their last run; the verifier runs only on risk:1/2 PRs over ~100 reviewable lines and stays advisory; follow-ups stop at depth 1; open bot-filed issues are capped at 10 with overflow into one rolling issue. The "1-in-5 sampled audit" is replaced by an `overturned` label you apply when you disagree.
*Cost if wrong:* low — cadences are constants.

**R24 — R8 tightened: scheduled browser runs are NOT a goal post.** ADR-0012 removed the schedule because "a scheduled run that nobody is watching produces failures detached from the change". Nightly goldens (D5) and the exploratory browser agent (D7) are now framed as a *proposed amendment to ADR-0012* for you to accept or reject — change-triggered, advisory, silent in dormant mode. Non-browser nightly jobs (differential, fuzz) follow the same change-triggered rule.
*Cost if wrong:* none — nothing runs until you accept the amendment.

**R25 — R17 widened.** Agents read issue bodies **and comments** only from allowlisted authors; anything triaged from outside content is always `needs-human`; a task is claimed atomically by creating `refs/heads/claim/<issue#>` (GitHub rejects a second creation); thread-resolution is required only for allowlisted reviewers' threads.
*Cost if wrong:* none for strictness.

**R26 — Ceremony cut.** Issue types are unavailable on a user-owned repo (verified: `issueTypes: null`) → dropped. Labels cut from ~25 to ~20 by removing `size:*` (the CI check measures it), `src:*` (one `bot-filed` label remains) and `blocked` (computed). Dropped: holdout scenarios (a public repo cannot hide them), the 12-metric dashboard (three metrics kept), the quarterly "delete a component" ritual. `ha-prompt-it` v2 gets a ~200-line budget. H12 must change `scripts/sync-superpowers.sh` (it rsyncs over everything except `hacer-patterns` and `docs-sync`).

**R27 — Portfolio rows now use your own words:** harness ("autonomous-run improvements"), core, verify ("QA service"), surfaces ("renderer surfaces"), spine ("nand2tetris alignment"), 3d, **polish ("UI polish" — was missing)**, bugs, upkeep ("maintenance" + "documentation"), horizon ("beyond nand2tetris"). `horizon` is limited to one open research note at a time rather than one per month — research notes are the safest work to do while you are away.

### Decisions the first draft took without recording (now recorded)

**R28 — Moving the North Star and `ha-prompt-it` into `hacer/` puts them in a PUBLIC repo.** Needed for cloud sessions and versioning, but it publishes your personal workflow text. *Yours to decide (decision 6).* Alternative: a private companion repo cloned by the cloud environment's setup script. *Revert:* `git rm` later does not unpublish history.

**R29 — Branch naming.** Routines push to `claude/*` by default, which conflicts with ADR-0002's `<type>/<topic>`. Recommendation: sessions keep ADR-0002 (`<type>/<issue#>-<topic>`); `claude/*` is accepted only for routine-created branches — an amendment to ADR-0002 for you to approve.

**R30 — Freezing the P05 checklist and `tasks/todo.md`, and dropping `.cursor/` from AGENTS.md precedence.** AGENTS.md Step 1.0 (ticket freshness) mandates the checklist today, so H4/H9 must update AGENTS.md in the same change. `.cursor/` is 272 files serving a tool you no longer drive the project with; the recommendation is to stop citing it, not delete it.

**R31 — A Claude OAuth token stored as a secret on a public repo** (needed for the verifier on Actions). Mitigated by R20's environment scoping and by never exposing secrets to fork PRs; still a standing credential. *Yours to decide.*

## Corrections after the fact-check (2026-09-18)

**R32 — R20 corrected: removing the admin bypass as first written would have locked you out of merging.** Verified: besides the 1-approval rule, `main-rules` has an `update` restriction, `required_deployments: ["github-pages"]` (no PR branch ever produces that deployment) and a `code_scanning` rule requiring CodeQL while CodeQL default setup is `not-configured`. Today only the bypass path can merge. The report now gives an ordered procedure — fix or drop each rule, add required checks, prove a trivial PR merges without bypass, and remove the exemption **last**.
*Cost if wrong:* high if done out of order (you cannot merge until you restore the bypass — a 1-minute settings change, but alarming). *Revert:* re-add the bypass actor.

**R33 — Facts corrected in revision 3** (all verified by me unless noted): P05-32 is done, not open (12 unchecked tickets + the 12b remainder = 13); `lint:docs` only rejects machine-specific absolute paths, so the G0 exit test needs a does-this-path-exist check that H10 must build, and the raw tracks cannot be landed in the repo as they are; issue types are unavailable on a user-owned repo; the wiring gesture machine has 18 actions, not 17; two more timestamp sites belong in C4; the nvm default is already Node 22 — the v14 is a stray `/usr/local/bin/node`; 4 merged remote branches, not 5; "105 of 108 merged PRs unapproved", not "125/129". Taken from the fact-checker without my own recomputation: median *reviewable* PR size 604 (168 without `docs/`), and specs + plans being 30–57% of the five bulkiest PRs — which replaces my overstated "the complete-code rule alone is 40–57%".

**R34 — Research claims softened to match their sources:** the same-model-review result keeps its "confounded, medium confidence" caveat; "~50% recall" is labelled vendor-relayed; the blocked exit is "one of two cheap levers measured", not "the cheapest"; the OpenAI harness details are marked as read through a mirror; cloud-VM specs and the OAuth-token claim are marked as unre-checked (track 6); the unsourced "~90% of 3D correctness" became "most".

**R35 — `/autonomous` and its hooks stay in `~/.claude/` (yours, global, used by other workspaces).** They do not exist for cloud sessions, so the pick / claim / blocked-exit / dormant rules go into the repo skill and `backlog.mjs` instead of being moved.
*Cost if wrong:* low.

### Process note
Both review agents were briefed read-only. The fact-checker reported that it nonetheless wrote one scratch file (`factcheck_prs.json`, in this session's scratchpad — not in any repo) and ran Vitest, which writes its cache under `node_modules`. I checked: `git status` in `hacer/` shows only the pre-existing untracked `.stryker-tmp/`.


---

# Execution run


Continues the numbering of `../2026-09-18-hacer-agent-readiness/rulings.md` (R1–R35). Every judgment call made on Mezi's behalf, with cost-if-wrong and how to revert.

**R36 — Grant interpretation.** "All necessary permissions are granted, no restriction on github pushing, deploying, releasing … personal project" + "nothing is private, it's an open project" = `publish: on-green` for `mezivillager/hacer` **including merges to `main`** (which release and deploy) and repo-settings changes. `ha-prompt-it`'s "a prior go never carries forward" for merges is overridden for this run by the explicit blanket grant; each merge still requires the definition of done + green CI.
*Cost if wrong:* a release/deploy you did not want — revertible (revert commit, redeploy).

**R37 — Release + deploy stay on `push: main` (R19 amended).** R19 proposed decoupling them to make merging cheap for a human; the grant makes merging cheap directly, the site is static, and semantic-release already skips docs/test/chore commits. Decoupling is dropped as YAGNI; revisit if release noise becomes a problem.
*Cost if wrong:* many small releases. *Revert:* one small workflow PR.

**R38 — `RELEASE_TOKEN` is not moved into an environment in this run** because a secret's value cannot be read back; moving it needs you to re-enter it. Filed as an issue instead. The exposure (a same-repo PR adding a `pull_request` workflow that reads the secret) stays; mitigated by the tamper flag on `.github/**` (item 9) and by you reviewing workflow-touching PRs.
*Cost if wrong:* token exposure by a malicious PR — but only same-repo branches get secrets, and only you (and agents acting as you) can push those.

**R39 — Ruleset rewrite (R20/R32 executed):** drop `update`, `required_deployments`, `code_scanning`; approvals 1 → 0; add `required_status_checks: [ci]` (strict); keep `pull_request`, linear history, non-fast-forward/deletion protection; remove the admin bypass **after** the first PR has merged without `--admin`. CodeQL default setup is filed as an upkeep issue rather than enabled now (it adds a slow check to every PR).
*Cost if wrong:* if anything still blocks merges, re-add the bypass actor (1 minute).

**R40 — One reusable worktree `hacer-wt-tracer`** for the sequential PRs of this run, branches per ADR-0002 (`<type>/<topic>`), instead of one worktree per PR (saves a `node_modules` repair per PR).
*Cost if wrong:* none; ADR-0002's one-per-topic is about isolation between *parallel* lanes.

**R41 — Defaults taken for REPORT §7 decisions 2–5, 7–10:** Issues as backlog (2, yes); portfolio rows + 2:2:1 (3, as listed); PR budget 400/200 and plans without complete code (4, yes); ruleset rewrite yes, release decoupling no (5, see R37); Tier-0 auto-merge — *enabled by the grant*: docs/tests/deps PRs merge on green without a human (7); ADR-0012 amendment for browser runs — no (8); OAuth token secret for a verifier on Actions — no for now, the verifier runs as a fresh-context session/subagent per PR (9); plan unknown (10).
*Revert:* say so; each is one file or one setting.

**R42 — Verifier for this run = a fresh-context review subagent** (repo `code-review` skill / `/code-review` semantics) that never sees the builder's transcript, writes its verdict on the PR as a comment, and blocks only with `file:line` evidence.
*Cost if wrong:* low.

**R43 — Process artifacts move into the repo.** Mezi (2026-09-18): everything needed to move forward must be PR'd and merged; the process must be reviewable and adjustable; its maintenance gets its own queue. So: this run's rulings land as `docs/research/2026-09-18-agent-readiness/DECISIONS.md`; from item 3 on, new rulings go to `docs/harness/ledger.md` in the repo (this file mirrors them until that exists); the `harness` portfolio row is the queue for the process itself; the "what can you do next?" entry point is a repo skill (`ha-next`) so cloud sessions have it too.
*Cost if wrong:* none — files.

---

# Execution run, continued (R44–R84)

Judgment calls from the rest of 2026-09-18: the tracer bullet, the foundation PRs, and the owner's steering during the run. Each has its cost if wrong and how to revert it.

**R44 — For a Light-tier task that starts from an `agent-ready` issue, the issue body IS the spec; no `docs/specs/` file is written.** AGENTS.md Step 1 / ha-prompt-it ask for a `docs/specs/` design for anything with 3+ steps; the new work system puts goal, acceptance criteria, verification command, scope and files on the issue instead, which is the same content in the place agents read. To be codified in ha-prompt-it v2 (#154) and AGENTS.md. Full-tier work still gets a spec file.
*Cost if wrong:* low — a spec file can be added to any issue after the fact.

**R45 — P05-31 is split for the tracer bullet:** the engine (#164, pure function + tests, ≤200 reviewable lines) is the PR; the store action and the drawer UI become two follow-up sub-issues of the same ticket. The ticket file gets a note in the engine PR. This is the "one sub-issue per PR" rule applied to a ticket written before it.
*Cost if wrong:* none — the follow-ups are filed immediately.

**R46 — `ha/CLAUDE.md` edited in place (R6 lifted by the grant).** The four verified-stale statements were corrected and the file now points at `docs/north-star.md` as the canonical copy. Backup: a local backup (the file is not under version control).
*Cost if wrong:* none — restore the backup.

**R47 — Builder judgment calls accepted as-is.** PR #238: `{ok:false, reason:'cycle'}` variant added (a stale table on a feedback loop would violate the criteria); flat `src/simulation/truthTable.ts`; `topologicalEval` parameter type widened to a new `CircuitDocument` (type-only). PR #239: `ready` prints the full pick order with harness first (head = next pick); extra reasons `not-pulled` and `on-request`; lanes read from the portfolio table; test file named `backlog.logic.test.mjs` (issue #149's verification command updated to match).
*Cost if wrong:* low — each is a few lines.

**R48 — Red-commit mechanics under the pre-commit `tsc -b`:** a red is "tests + the smallest compiling stub that fails", never `--no-verify`. Written into `docs/harness/implementer-brief.md` (PR #240) and the ledger; ha-prompt-it v2 (#154) must say the same.

**R49 — On a BLOCK, the same builder fixes on the same branch; nits that change a contract other issues will consume (#235/#236) are taken in the same fix round; purely internal nits are optional.** Applied to PR #238: blocker (stale pin state) + headers `{name,width}` + `maxInputBits` sanity bound; "sort once" left optional.
*Cost if wrong:* low — a few more lines in one PR.

**R50 — The run follows its own pick rule.** Queue item 10 (C1, Vitest node/jsdom split) was queued before the pick rule existed; `backlog.mjs ready` shows it is not pulled by any spine task, so it is not picked. The run works foundation items (#150, #153) and then the pick order — the run does not get to jump the queue it just built.
*Cost if wrong:* C1 waits until a spine task depends on it (or you re-order the portfolio).

**R51 — `strict_required_status_checks_policy: true` means every PR must be rebased onto current `main` (fresh CI run) before merging.** Kept: tests run against the real merge base, which matters with several agents landing PRs. Cost: one extra CI cycle (~2 min) per PR when `main` moved; `gh pr update-branch --rebase` does it. Ledger candidate if it becomes the bottleneck.

**R52 — PR #238 fix-round rulings accepted:** the `over-budget` diagnostic reports the budget actually applied (clamped), and `NaN` maps to budget 0 (fails closed). Sort-once deferred with a stated reason (would make the evaluator touch a runtime change).
*Cost if wrong:* one line each.

**R53 — Verifier nits on a PASS are filed as one depth-1 follow-up issue, not fixed in-PR** (PR #244 → #247). Follows `verifier-brief.md`; a fix round would cost another verify + CI cycle for two two-line changes.
*Cost if wrong:* the gaps live on `main` until #247 is picked (harness foundation → soon).

**R54 — `pr-hygiene` becomes a required check only after one green run on `main`** (the workflow cannot execute from its own PR). Verified: `gh api actions/workflows` did not list it before merge.

**R55 — A stack was accepted for #153** (three PRs each under budget, one logical sequence) although the work system says "avoid stacks". Merge order is enforced by me: verify and merge #245, rebase #246 onto `main` (`gh pr update-branch --rebase` drops the already-applied commits), verify, merge, then #248. Ledger candidate: the builder split correctly because a single PR measured 454 reviewable lines — the budget did its job.
*Cost if wrong:* a mis-rebased stack (PR #135's accident); mitigated by rebase-only merges and CI on each.

**R56 — `claude/migrate-hacer-app-ui` deleted** (tip `ead6d83`, 2026-04-02, already an ancestor of `main`, no PR); the four merged-but-undeleted branches (#135, #134, #119, #132) deleted; `delete_branch_on_merge` prevents recurrence.
*Cost if wrong:* none — every deleted tip is reachable from `main`.

**R57 — Making `pr-hygiene` required exposed a gap the verifier's nits did not: bot PRs cannot link an issue.** Fix is #249 (skip the linked-issue rule for `*[bot]` authors / `dependencies` label; size rule still applies). Until it lands, dependabot PRs cannot merge — acceptable for an hour. Ledger row to add: "a required check must be run against every *kind* of PR that exists (human, agent, bot) before it is required".

**R58 — #248 BLOCK upheld, not overturned.** The verifier itself flagged that AC 2 could be read as conditional; I read it literally: the PR body claims CONTRIBUTING.md links to the recipe and the diff does not, and two pre-chipName framing lines remain. A three-line fix; the builder still has context.
**R59 — REPO_MAP's fenced aspirational trees: delete (follow-up issue), agreeing with the verifier.** They contradict the corrected current tree and cannot be linted.
*Cost if wrong:* the roadmap specs still carry that layout; nothing is lost.

**R60 — Ledger row to land: the `gh` OAuth token cannot update a PR branch that changes `.github/workflows/**` (`workflow` scope missing), so agent sessions cannot rebase such PRs; dependabot can (`@dependabot rebase`). For agent-authored workflow PRs, the fix is `gh auth refresh -s workflow` (owner action) — filed in the end-of-run review rather than done now (changes the token's scope).

**R61 — Coordinator made a one-word doc fix directly on PR #245's verified branch** (AGENTS.md:211 `pr-hygiene.logic.mjs` → `scripts/pr-hygiene.logic.mjs`), a One-liner tier: the new path-exists check caught a dead citation that a *later* PR (#244) introduced on `main`. No re-verification: the change is one path string and `lint:docs` is the proof. Ledger row: the check paid for itself before it even merged.
*Cost if wrong:* none.

**R62 — Recipe sweep outside the four named docs:** `docs/plans/phase-0-critical-fixes.md` is a dated plan (historical); `phase-0.5-tickets/README.md` and `docs/testing/standards.md` are living → fix (#253).

**R63 — R51 amended: `strict_required_status_checks_policy` → false.** With 10 PRs landing in two hours, every merge put every other green PR BEHIND and cost a rebase + ~2 min CI; dependabot PRs re-triggered each other. Non-strict means checks are judged on the PR head as tested; `ci.yml` still runs on every push to `main` and would flag a semantic conflict within minutes, and rebase-only linear history is unchanged.
*Cost if wrong:* a red `main` for one cycle (revert commit). *Revert:* flip the flag back (one API call).

**R64 — Releases stop committing to `main` (ADR-0015, PR #254).** Removing the bypass made `@semantic-release/git`'s push fail on every release (5 failures today). Options weighed: a bypass-granted GitHub App or deploy key (owner setup, more moving parts) vs. dropping the in-repo CHANGELOG/version commit (tags + GitHub Releases carry the notes). Chose the latter; the ADR names the alternative.
*Cost if wrong:* `CHANGELOG.md` and `package.json` version stop tracking releases on `main`. *Revert:* restore the two plugins and grant a bypass to a non-human actor.

**R65 — Agent PRs must not touch `.github/workflows/**` until the `gh` token has the `workflow` scope** (owner action: `gh auth refresh -s workflow`). The cosmetic `ci.yml` step rename was dropped from #245 for this reason. Ledger row.

**R66 — Item 12 (cloud spike) marked blocked, not forced.** `claude --cloud` refuses non-interactive shells and a pseudo-TTY hits the trust prompt; driving that prompt from a script would be a hack around a deliberate guard. Left as a one-line command for Mezi.

**R67 — Cost.** Mezi (2026-09-18): careful about cost; explore open/free models. Filed as a `harness` research task (model tiering per role, open-model evaluation, tokens-per-PR metric) rather than changing models mid-run. Measured today: ~1.4M subagent tokens / 8 verified PRs. Verifiers already skip PRs < ~100 reviewable lines.
**R68 — Browser testing stays off the PR path (ADR-0012); #220 remains `needs-human`** — the owner's "is browser testing baked in?" is answered honestly as "no, by your ADR; the GPU-free 3D lane is queued; #220 is your call".

**R69 — Browser QA policy (owner, 2026-09-18):** "all critical features/fixes have to pass through an independent QA that does browser testing"; 3D browser runs in the cloud only, 2D/other may run locally. Overrides ADR-0012's "never automatically" → ADR-0016 (#220, re-scoped and agent-ready), a `browser-qa` required check on critical paths, and an independent QA agent brief (#257). "Critical" is defined mechanically by paths/labels so the check needs no judgment.
*Cost if wrong:* browser CI minutes (free on the public repo) and some flake; the check starts advisory until one green run.

**R70 — Cursor lane (owner has two subscriptions):** filed #258 (Bugbot advisory review; Cursor cloud agents as extra builders/QA under the same briefs). Never a required check.

**R71 — Portfolio priority (owner):** surfaces (2D · HDL · MCP) catch up with 3D and grow hand in hand → row order and rotation change (2 surfaces : 1 spine : 1 enabler : 1 upkeep), enablers pulled by surfaces or spine, and a hand-in-hand readiness rule for surface tasks. Amends R21. Implemented by an agent as a PR, not by hand, so the change is reviewable.
*Cost if wrong:* the spine slows to 1 in 5 picks; one number to change.

**R72 — "Surfaces first" means "design first."** Owner: opening the platform for 2D/HDL/MCP needs core refactoring and architectural decisions. Ruled: the surfaces epic starts with the five architecture ADRs (#188 #189 #190 #209 #210) at the Full tier, each an ADR the owner reviews; core enablers are then pulled by those ADRs; surfaces land hand in hand via the scenario × driver matrix. Posted on #142; the portfolio PR (#259) carries the ordering. R11/R21 stand except for the row order.
*Cost if wrong:* a week of design before new surface code — which is what he asked for.

**R73 — R71 amended: features and process are equal.** Owner: surfaces catch up *feature-wise*; process and auxiliary work are of equal priority. Rotation becomes a 6-slot cycle `surfaces → harness → spine → aux → surfaces → harness` (aux = verify/upkeep/bugs in turn): features 3/6 with surfaces double-weighted, process/aux 3/6 with harness double-weighted. The "harness-only foundation" step is dropped.
*Cost if wrong:* one line in `docs/portfolio.md` and one array in `backlog.logic.mjs`.

**R74 — Public documentation is a portfolio row (`pubdocs`, epic #260) that shares the surfaces' pick slots and is bound to them by rule:** a surface capability is not done until its `docs/public/` page exists; references are generated from the registry/MCP/CLI definitions so they cannot drift; `pr-hygiene` warns when surface code changes without a `docs/public` change. Published with the app at `/docs/`.
*Cost if wrong:* a row and a label; the docs themselves are wanted regardless.

**R75 — Docs platform decided by research + ADR-0017 before any docs are written**, then taken live on the existing GitHub Pages under `/docs/` (owner: research state of the art, deploy it). #262 (skeleton) now waits on it. Dispatched as a research agent whose first PR is the note + ADR; the deploy PRs follow through the normal loop.
*Cost if wrong:* a day of research; the alternative (pick VitePress by reflex) is what the owner asked us not to do.

**R76 — R&D / product-fidelity role added to the harness** (owner): a standing brief + agent definition (like the verifier), ADR-0018 making a fidelity review a gate on spine/surfaces/horizon epics and ADRs, ground truth named per domain (the `.tst/.cmp` oracle today; physics/EE references for below-NAND), proposals filed as `rd-review` issues the owner accepts — the agent never rewrites the roadmap itself. First job: fact-check the current roadmap and the below-NAND ambition.
*Cost if wrong:* one more review per epic/ADR (research-tier tokens), and a set of proposals you can ignore.

**R77 — R&D proposals require owner approval (owner):** the R&D agent queues proposals in `docs/harness/rd-inbox.md` (status proposed/approved/declined) and never files issues; approval by the owner (status change or "approve RD-00N") is what turns an entry into issues. Exception kept: an actual defect found by fact-checking shipped behaviour goes through the bot issue contract (repro required, `bot-filed`, never `agent-ready` without the owner).
*Cost if wrong:* proposals wait for the owner — which is the intent.

**R78 — Names (owner):** the engineering-truth role is **fidelity** (`hacer-fidelity`, `fidelity-brief.md`, `fidelity-inbox.md`, label `fidelity`); **product** is reserved for a separate usability/design role (filed as its own research task with the same approval inbox, `product-inbox.md`). Both never file issues themselves.

**R79 — The team is a versioned roster** (`docs/harness/team.md` + `.claude/agents/hacer-<role>.md`), filed as an umbrella issue blocked by the three role PRs in flight and the model-tiering task, rather than dispatched now: four agents are already running, and the roster should describe briefs that exist.

**R80 — Continual refinement is a role with an inbox** (owner): retro role + `harness-inbox.md` (proposals for policy changes, owner-approved) on top of the existing ledger + second-occurrence rule; the team roster (#270) starts with research that refines the owner's suggested roles from evidence rather than copying them. Neither dispatched yet: four agents are in flight and both depend on #255 (model tiers) and the role PRs.

**R81 — Docs-only process PRs that encode owner rulings are reviewed by the coordinator**, not a fresh-context verifier (applied to #274, 312 lines): the coordinator holds the rulings the PR must honour, and a verifier would need them spelled out to judge the same thing; saves a ~150k-token dispatch. Code, workflows and anything security-relevant still get a fresh verifier (#273).
*Cost if wrong:* a process doc merges with a flaw the coordinator shares; the ledger/retro role catches it on use.

**R82 — An agent regressed its own branch to a superseded spec** (the portfolio agent reset to `origin/main` and rebuilt the original 2:1:1:1 rotation after three addenda had moved it to the six-slot cycle), most likely because the addenda lived only in messages and an issue comment while the issue body still carried the first spec. Fixed by rewriting #259's body to the final spec and telling the agent to restore its six-slot commits from the reflog. Ledger row: **steering changes go into the issue body, not only into messages or comments** — the issue is what an agent re-reads.
*Cost if wrong:* none; one resumed agent.

**R83 — ADR-0017 (docs platform: Astro Starlight at `/hacer/docs/` on the existing Pages deploy) accepted by delegation** — the owner said "do everything needed to take that live, deployment, etc", so the choice is delegated; accepting it leaves #262 (implementation) directly pickable on resume. Coordinator review of #276: the recommendation is evidence-backed (Astro 7 on Vite 8, $0, one `BASE_PATH` drives both builds, generated references gated by `git diff --exit-code`, llms.txt with an honest note that it only pays when agents are pointed at it). ADR-0018 (fidelity gate) stays Proposed — no delegation was given for it.
*Cost if wrong:* the owner prefers VitePress (the named runner-up) — a config folder to swap per the ADR. *Revert:* status → Superseded.

**R84 — Wrap-up (owner: "wrap up current ongoing PRs and tasks, and call it a day"; "make sure there's committed context … so nothing is lost").** No new work is dispatched; the four in-flight items finish (verifier #273, portfolio #259, fidelity PR 2 #268, docs #276); the session is recorded in a committed file `docs/harness/sessions/2026-09-18.md` + the later rulings appended to the committed DECISIONS.md; the workspace CLAUDE.md and memory gain a resume pointer.

## Execution run, late 2026-09-18 and 2026-09-19 (R85–R106)

**R85 — PR #278 (portfolio six-slot cycle) reviewed by the coordinator (R81), PASS; builder's six questions ruled** (tiebreak stays surfaces/core; hand-in-hand shaping → #279; keep WORK-SYSTEM §2 note; retire WORK-SYSTEM live sections → #280; title ok; direct pull only). First `project:surfaces` pick sits at position 11 today because the design-first ADRs (#188/#189/#190, labelled `core`) take the surfaces slots first — intended.
*Cost if wrong:* the surfaces bucket fills slowly until #279 shapes its issues.

**R86 — Fidelity PR 2 (#281) reviewed by the coordinator, PASS.** Its five proposals stay `proposed` in `fidelity-inbox.md` for the owner (R77). Its #190 finding is posted on #190 as a verdict comment (allowed by the role), because #190 is the next design ADR to be picked and must not be built against the rising-edge model.

**R87 — #273 BLOCK upheld; fix (a):** browser-qa reads the `sev:*`/`critical` labels of the issues the PR links (`Fixes/Closes/Part of #n`, reusing `findLinkedIssues`), which needs `issues: read` (read-only on a public repo — acceptable). Fix (b) (builders copy labels onto PRs) was rejected: it relies on a convention the owner's ruling ("all critical features/fixes") should not depend on. The builder also pushes its two local commits (merge-ref + per-event concurrency for manual runs). To prove the browser path before merge, the coordinator applies the new `critical` label to #273 so `@store` actually runs in CI. The definition gap the verifier found (store/simulation/utils/e2e changes are not "critical") is left for the owner — noted on #220.
*Cost if wrong:* one more permission scope on a read-only workflow.

**R88 — #273 fix reviewed by the coordinator** (small, targeted: linked-issue `sev:*`/`critical` via `findLinkedIssues` imported from pr-hygiene, `issues: read`, `previous_filename` for renames, `edited` trigger, fail-closed on unreadable issues; `gh` called with an argv array — no shell interpolation of PR text). Not re-sent to the verifier: the security surface did not change beyond one read scope, and the real proof is the `critical`-labelled run of the actual browser suites.

**R89 — #273 merged after proof; `browser-qa` required.** Critical-labelled run 35349510882: `BROWSER-QA: PASS suites=store passed=107 failed=0 flaky=0` in 2.1 min on the built bundle with SwiftShader in Actions — the first real cloud browser run. Required checks are now `ci`, `pr-hygiene`, `browser-qa` (non-strict); non-critical PRs pass it with the skip line. The owner's "what counts as critical" question moved to an open needs-human issue (282) with a stated default.
*Cost if wrong:* flaky browser runs block merges — mitigated by retries 2 / 1 worker; revert = drop `browser-qa` from the required list (one API call).

**R90 — Stopped the browser-qa builder agent after its PR merged** (it kept polling its own background work, ~300k tokens total). Its work is on `main`; nothing in its worktree was unpushed (pruned earlier). Ledger candidate: builder agents should end once their PR is handed back, not keep watching CI.

**R91 — Publish = on-green** for mezivillager/hacer, relying on the owner's grants ("all necessary permissions are granted, no restriction on github pushing, deploying, releasing", 2026-09-18; "I have given you the permission", 2026-09-19). Recorded as a standing grant in `ha/CLAUDE.md` so future runs stop asking.
*Revert:* delete that line.

**R92 — Browser QA per the owner (2026-09-19):** browser suites run automatically only in CI, for PRs that change the UI (DOM shell, app flows, store, routing, e2e config) — the `@store` suite as a UI-regression net; the `@ui` canvas suite (3D browser testing) never runs automatically and becomes a far-future, cloud-only research task; local browser tests are allowed only for suites that do not mount the 3D canvas (the future 2D surface, the DOM shell). `src/simulation/**` and `src/core/**` stay out (the conformance oracle covers them).
*Cost if wrong:* a UI regression in a 3D-only change slips past CI until the research lands.

**R93 — Fidelity proposals FID-001…005 deferred (owner: "they need to wait until other surfaces have caught up first").** Status set to `deferred`; the #190 finding stays posted on #190 as a verdict comment, so the design-first ADR still sees it without any issue being filed.
*Cost if wrong:* 0.6 clock work is not scheduled — it is not scheduled anyway until the spine reaches 0.6.

**R94 — RELEASE_TOKEN is removed, not moved.** Since ADR-0015 the release job only pushes a tag and creates a GitHub Release, which the job's own short-lived `GITHUB_TOKEN` can do; a long-lived personal token readable by any workflow on any branch of the repo is the risk, and deleting it is strictly better than fencing it.
*Cost if wrong:* a release run fails for lack of permission — caught by the first release run after merge; revert is one workflow line.

**R95 — The product agent files UI-polish issues itself** (≤5 per review, evidence required, `agent-ready` when concrete), while product *strategy* proposals (roadmap/epic changes) still queue for the owner. Owner 2026-09-19: "you are supposed to find that out, not me … for me to not be a blocker"; his earlier approval rule ("when product agents want to create tasks … it should get my approval") is read as covering roadmap-level proposals, not UI defects.
*Cost if wrong:* up to five polish issues per review the owner would not have picked — cheap to close. *Revert:* route polish through `product-inbox.md` too.

**R96 — The product agent's eyes are a cloud UI tour** (Playwright `@tour` spec + `workflow_dispatch` workflow uploading screenshots and accessibility snapshots), never a local browser: the app mounts the 3D canvas, and the owner's rule is no 3D rendering on his laptop.

**R97 — CodeQL enabled via the API (default setup, default suite), advisory only.** First scan: 2 medium alerts (`actions/missing-workflow-permissions` on `ci.yml`, `e2e.yml`) → fixed in the same run (#287). The ruleset's `code_scanning` rule stays off; revisit after a few weeks of alert volume.
*Cost if wrong:* an extra ~5-min CodeQL check on PRs; free on a public repo.

**R98 — Cloud spike #158 blocked on one owner step:** the owner's Claude account has no GitHub connection, so a cloud routine cannot clone the repo; `/web-setup` (or https://claude.ai/connect-github) is the only fix and only he can run it. The routine prompt is drafted; creating it is one call once connected.
*Resolved the same day:* the owner connected GitHub and granted the Claude GitHub App write access; the routine ran the spike (#293) and a second routine proved `git push` works.

**R99 — `ha/CLAUDE.md` records the standing publish grant and the owner's minimal-involvement preference; memory `owner-minimal-involvement` saved.**

**R100 — "Let only active tasks and PRs finish" defers the rest of #269.** The UI-tour workflow run and
PR 2 (the first usability review) are new work, even though they belong to the running #269 item.
They start tomorrow. Cost if wrong: the first usability review is one day later.

**R101 — #258's research PR gets a coordinator review, not a separate verifier,** if it is docs plus
the `.cursor/BUGBOT.md` deletion. It gets an Opus verifier if it adds code or a workflow. Cost if
wrong: a doc error reaches main, and that is cheap to fix.

**R102 — A verifier BLOCK on #294 is fixed tonight only if the fix is small** (≤ ~30 lines, same
scope), by resuming its builder. Otherwise the PR stays open for tomorrow. Cost if wrong: #294
waits a day.

**R103 — #294 BLOCK upheld (the verifier's self-escalation finding). The fix keeps the owner out of
the loop.** The verifier's option (a), "never `agent-ready` without the owner", was rejected because
it contradicts R95 and the owner's "for me to not be a blocker". Instead: the product agent never
sets `sev:critical`, since that label pre-empts the whole queue. It may set `bug` + `sev:high`,
which doesn't change picking. A suspected data-loss defect is flagged in the Evidence and in its
report, and the coordinator reproduces it and applies `sev:critical`. The three nits ride along:
a CI-only `test.skip`, the README exception line, and the source wording. The builder fixes it
tonight (R102, under 30 lines). Cost if wrong: a real data-loss bug waits one coordinator pass
before it pre-empts.

**R104 — Polish found by the product agent stays on request** (portfolio pick rule 3), for now.
It is revisited when the first usability review shows the volume. Cost if wrong: polish issues
wait until the owner or a dormant cycle picks them.

**R105 — #297, the Cursor lane, is coordinator-reviewed and passes** (R101: docs plus a config
deletion). #258 closes on merge. Adopted: Composer 2.5, run locally, as an advisory second opinion
on included usage. The note says honestly that it caught 0 of 2 blockers in the trial, so it is a
cheap reading pass, and a Claude verifier must reproduce any BLOCK before it counts. Cloud agents,
Grok Bot, MCP and the APIs are skipped as usage-based. Cost if wrong: about $0.15–0.28 of included
usage per risk:1/2 PR for little signal. Revert: delete the Budgets row, or close #296.

**R106 — #296 (the second-opinion wrapper) stays `agent-ready` at `risk:2`.** The triage rule's
`needs-human` is satisfied by the owner's explicit 2026-09-19 request for this exact capability.
Cost if wrong: an agent builds a local script the owner didn't want yet. It is bounded by the
verified deny-all config and a fresh verifier.
