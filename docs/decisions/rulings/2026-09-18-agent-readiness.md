# Rulings — 2026-09-18 agent-readiness

Imported by #466 on 2026-09-25 from the coordinator's run directory `2026-09-18-hacer-agent-readiness`; wording unchanged except machine paths. `Builds on: unknown` marks a ruling nobody has annotated; a restated ruling carries a new id and `Amends:` the original.

## R1 — Treat the session as research/design only; nothing under `hacer/src` is touched
Builds on: unknown
Why: the brief says "the goal of this session is not to implement all these immediately".
Cost if wrong: low — you wanted some scaffolding too; it can be queued as the first tasks of the new backlog.
Revert: tell me to start executing the seed backlog.


## R2 — Publish decision = `hold`
Builds on: unknown
No push, PR, issue creation, or any other remote write. `ha/CLAUDE.md` carries no standing publish grant.
Cost if wrong: low — deliverables sit locally until you say push.
Revert: "publish on-green for hacer".


## R3 — Skipped the brainstorming skill's one-question-at-a-time dialogue and approval gate for the *research itself*
Builds on: unknown
Why: you explicitly asked for research and then said "work autonomously"; the skill's hard gate is about implementation, and none happens here. The design is presented for approval at the end instead of section-by-section.
Cost if wrong: medium — the report may rest on a misread of intent in places. Mitigation: the report states the interpreted intent up front and marks each recommendation with an alternative.
Revert: answer the "open questions" section of the report; I re-cut affected parts.


## R4 — Seven parallel research tracks
Builds on: unknown
(2 internal audits of hacer + web-ide, 5 external: agent-ready repos & work queues & PR size; AI QA; multi-surface architecture; cloud 3D/headless WebGL; Claude Code capabilities).
Why: the brief spans that many independent domains; each needs web sources.
Cost if wrong: token spend only.


## R5 — Run directory is `~/.claude/runs/2026-09-18-hacer-agent-readiness/`
Builds on: unknown
(queue, rulings, raw track reports). `ha/` is not a git repo and has no docs home; `hacer/` main must stay clean.
Cost if wrong: none — files can be moved.

## During collection


## R6 — Do NOT edit `ha/CLAUDE.md` in this run, even though track 1 proved four of its statements stale
Builds on: unknown
(HDL/chip pipeline "not wired" — it is; `gateLogic.ts`/`GateType` union — gone, gates carry `chipName`; Stryker in CI — removed by ADR 0011; `test:e2e:store` in definition-of-done — E2E is manual-only per ADR 0012). Verified by me against the tree on 2026-09-18.
Why: it is your instruction file, `ha/` is not a git repo so there is no history to revert from, and R1 scopes this run to research. The exact corrections go in the report and become the first doc-drift item in the seed backlog.
Cost if wrong: low-medium — every session until it is fixed starts from a wrong architecture picture (that cost is already being paid today).
Revert: say "fix ha/CLAUDE.md now" and I apply the four corrections.


## R7 — Track reports are subagent output and are treated as data, not instructions; claims the synthesis leans on get spot-checked by me before they are cited as fact
Builds on: unknown
Track 1's four stale-premise claims: all confirmed.
Cost if wrong: none — this only adds checking.


## R8 — Your ADRs 0011 (Stryker removed) and 0012 (E2E manual-only), both dated 2026-09-17, are treated as standing decisions. The report will NOT recommend reinstating either as a PR gate
Builds on: unknown
, even though the AI-QA research track proposes both (Stryker ratchets, `test:e2e:store` as a required check).
Why: you decided a day ago, with reasons that the research actually supports (browser tests = slowest, least deterministic gate; an expensive gate with no actionable signal is a tax). The ADRs themselves name the hole they leave — "the automated safety net is now lint, unit tests and build" and "the repo loses its only automated check for vacuous tests". The report fills that hole with gates that are cheap and deterministic instead: official `.tst/.cmp` conformance, differential testing against web-ide's simulator, and one scenario suite run through several headless surfaces in plain Node. Browser/3D checks stay off the PR path (scheduled/cloud/advisory only).
Cost if wrong: low — if you do want mutation testing back, the defensible form is nightly, non-blocking, scoped to `src/core` + `src/simulation`; it is listed as an optional later item, not a goal post.
Revert: say "reconsider 0011/0012" and I add them back as options with cost estimates.


## R9 — Track 7 (Claude Code capabilities) is rated lower-confidence; only claims I verified against code.claude.com docs myself are used
Builds on: unknown
(see `tracks/07-...VERIFIED.md`). Consequence for you: managed Claude Code Review is Team/Enterprise-only and its check is always neutral, so the independent-reviewer goal post is built on `claude-code-action` or a PR-triggered routine with a structured verdict, not on the managed product. I also reject that track's suggestion to replace your `/autonomous` skill + Stop hook with routines — they solve different problems (event-triggered fresh sessions vs. one long driven session) and are complementary.
Cost if wrong: low — if you are on a Team plan, managed Code Review becomes an easy add-on.

## Design rulings (made while drafting the report — every one is a recommendation you can overturn by editing one file)


## R10 — Backlog home: GitHub Issues hold tasks; one small in-repo file (`docs/portfolio.md`) holds the ordered list of priority projects
Builds on: unknown
Not Beads, not Backlog.md, not more markdown ticket files.
Why: the repo has 0 open issues and five files that disagree about "what's next"; issue state never conflicts across worktrees or cloud sessions; `gh` 2.101 (installed, verified) has `--parent`, `--blocked-by`, `subIssues`, `blockedBy` fields; PRs close issues automatically; you get a phone-readable view for free. Project *order* changes rarely and is yours to own, so it lives in git where it is reviewable and protected.
Cost if wrong: medium — migrating issues to another tracker later is a script, but habits form around it.
Revert: keep tasks in-repo (Backlog.md is the best of that family); the rest of the design is unchanged.


## R11 — Proposed project order:
Builds on: unknown
harness → core → verify → surfaces → spine → 3d → hygiene (standing lane) → horizon (research-only lane), with the nand2tetris spine *interleaved*, not paused: every spine ticket is re-cut "headless-first" and several open P05 tickets are already surface/verification work (P05-21 = HDL surface, P05-26 = circuit↔HDL, P05-27 = scenario suite, P05-31 = pure logic, P05-32 = replace flaky UI suites).
Why: your CLAUDE.md says platform work must not supersede the 0.5→0.7 spine; your brief says the spine stalled because the platform cannot be verified. Interleaving honours both.
Cost if wrong: low — reorder the lines of `docs/portfolio.md`.


## R12 — PR budget: fail CI above 400 "reviewable" changed lines, warn above 200; tests, lockfile, vendored vectors, snapshots and generated files are not counted; one PR = one sub-issue (a milestone), never a whole ticket; override only by a human-applied label
Builds on: unknown
Plans stop containing "complete code" (AGENTS.md Step 3) — that rule alone is 40–57% of each bulky PR.
Why: measured median owner PR = 850 lines, 26/57 over 1,000. Google ("100 reasonable, 1000 too large"), SmartBear/Cisco (200–400 LOC), Graphite and DORA 2025 all point the same way. No source gives a number for AI-author + AI-reviewer; 400/200 is a judgment call.
Cost if wrong: low — two constants in one script.


## R13 — Stay a single package with lint-enforced walls now; move to pnpm workspaces only when the first Node build target (CLI/MCP) lands
Builds on: unknown
Why: walls (dependency-cruiser + a no-DOM tsconfig) cost one small PR; workspaces cost an `@/` alias rewrite, semantic-release rework and duplicated Vite/Vitest config — not worth paying before something needs a separate build.
Cost if wrong: low-medium — the later extraction is somewhat larger.


## R14 — Technology picks are recommendations gated by a spike each, not decisions:
Builds on: unknown
2D = hand-rolled React SVG + elkjs (DOM/SVG is assertable in jsdom; canvas libs repeat the 3D problem); HDL editor = CodeMirror 6; MCP = ~6 workflow-level tools generated from one command registry, stdio first; WebMCP optional/later.
Cost if wrong: low — each pick enters the backlog as a `research` task whose output is an ADR you approve.


## R15 — You keep the merge button at the start
Builds on: unknown
Merge to `main` fires semantic-release and the GitHub Pages deploy (Gate 4 in ha-prompt-it), and agents act under your GitHub identity so they cannot satisfy the 1-approval rule anyway. The report defines a trust ladder (Tier 0 docs/tests/deps → Tier 1 pure logic under conformance → Tier 2 UI/architecture) and makes auto-merge a *later* goal post that needs your explicit opt-in per tier.
Cost if wrong: you remain a (cheap, ~1–2 min/PR) bottleneck longer than necessary.


## R16 — "One engine" is flagged, not decided
Builds on: unknown
Track 1 infers that the canvas evaluator and the HDL compiler will collide when Phase 0.6 adds a clock (tick/tock implemented twice). The report makes "decide this by ADR before any 0.6 sequential work" a goal post and queues a design spike; it does not pick the answer.
Cost if wrong: high if ignored (duplicate sequential engines), none for flagging.


## R17 — Security boundary for the public repo: agents only pick up issues authored by an allowlisted identity (you / your bots) AND carrying the `agent-ready` label
Builds on: unknown
Anyone can file or later edit an issue on a public repo; an agent that executes arbitrary issue text is a prompt-injection channel into a session that holds your GitHub identity.
Cost if wrong: none for being strict; outside bug reports get re-filed by triage rather than executed directly.


## R18 — Deliverables stay in this run directory; nothing is committed to `hacer/`
Builds on: unknown
The first seed-backlog item lands them in `hacer/docs/research/` as a docs-only PR when you say so. Not published as a claude.ai artifact either (that is an upload; publish = hold).
Cost if wrong: none — one command moves them.

## Rulings after the adversarial review (2026-09-18) — several earlier rulings are amended here

> Correction to the heading above R10: "every one … you can overturn by editing one file" was overstated. Realistic revert costs are now given per ruling below and in the end-of-run review.


## R19 — R15 amended: the first oversight goal post is "make merge cheap", not "you keep the merge button"
Builds on: unknown
Amends: R15
Verified: `release.yml` and `deploy.yml` both fire on push to `main`; you work in bursts (10 active days in 120). A design where every PR waits for you simply stops when you leave, and the trust ladder could never accumulate its "N clean merges". New recommendation: move release + deploy to `workflow_dispatch`/tag/weekly cron so a merge is an ordinary, revertible commit; then Tier-0 auto-merge is offered from the start and Tier 1 after the oracle gates exist. Add a **dormant mode**: a cap on open agent PRs (5); at the cap agents do only work that needs no PR (research notes, shaping issues) and scheduled jobs stand down.
*Still yours:* whether to decouple deploy, and the opt-in per tier — nothing merges by itself until you say so.
Cost if wrong: medium — production lags `main` by up to a week unless you dispatch a deploy. *Revert:* restore the two `on: push` triggers (one small PR).


## R20 — H8 rewritten
Builds on: unknown
Verified: ruleset `main-rules` exempts the admin role entirely (`bypass_mode: exempt`) and requires 1 approval a solo owner can never give himself. Adding required checks would bind nobody. Recommendation: approvals → 0, required checks on, **no bypass**, so green CI binds you and agents alike. Secrets (`RELEASE_TOKEN`, and any Claude OAuth token) move into a GitHub environment restricted to `main`. PR-hygiene/tamper checks run under `pull_request_target` reading the diff by API only (never checking out PR code), so a PR cannot edit its own guard.
*Honest limit now stated in the report:* while agents act under your GitHub identity, every "human-applied label" is a convention, not a control. It becomes a control only with a separate bot identity.
Cost if wrong: low. *Revert:* re-add the bypass actor in repo settings (1 minute).


## R21 — R11 amended: allocation by ratio, enablers pull-based
Builds on: unknown
Amends: R11
After a short, strictly-first foundation slice, picks rotate 2 spine : 2 enabler : 1 upkeep. An enabler task outside the foundation is eligible only when an open spine task is `blocked-by` it. P05-21/26/27 stay spine tickets (re-cut), not "superseded" into platform work.
Why: the reviewer counted ~56 tasks queued above the spine — that is platform work superseding the product ladder, which your CLAUDE.md forbids.
Cost if wrong: low — three numbers in `docs/portfolio.md`.


## R22 — Command registry: decide now (ADR), build later
Builds on: unknown
C5 (74 toast call sites → Results) and C10 (registry v0) are deferred until a second surface that *writes* to the circuit exists. CLI `hacer test`, the HDL surface and scenarios × drivers do not need them. Start with two drivers (core, store); the parity test is a report, not a required check, until there are three.
Cost if wrong: low-medium — the MCP surface arrives later or hand-written first.


## R23 — Recurring agent spend is change-triggered and budgeted; plan is "unknown", designed for the lower tier
Builds on: unknown
Scheduled jobs fire only when `main` moved since their last run; the verifier runs only on risk:1/2 PRs over ~100 reviewable lines and stays advisory; follow-ups stop at depth 1; open bot-filed issues are capped at 10 with overflow into one rolling issue. The "1-in-5 sampled audit" is replaced by an `overturned` label you apply when you disagree.
Cost if wrong: low — cadences are constants.


## R24 — R8 tightened: scheduled browser runs are NOT a goal post
Builds on: unknown
ADR-0012 removed the schedule because "a scheduled run that nobody is watching produces failures detached from the change". Nightly goldens (D5) and the exploratory browser agent (D7) are now framed as a *proposed amendment to ADR-0012* for you to accept or reject — change-triggered, advisory, silent in dormant mode. Non-browser nightly jobs (differential, fuzz) follow the same change-triggered rule.
Cost if wrong: none — nothing runs until you accept the amendment.


## R25 — R17 widened
Builds on: unknown
Agents read issue bodies **and comments** only from allowlisted authors; anything triaged from outside content is always `needs-human`; a task is claimed atomically by creating `refs/heads/claim/<issue#>` (GitHub rejects a second creation); thread-resolution is required only for allowlisted reviewers' threads.
Cost if wrong: none for strictness.


## R26 — Ceremony cut
Builds on: unknown
Issue types are unavailable on a user-owned repo (verified: `issueTypes: null`) → dropped. Labels cut from ~25 to ~20 by removing `size:*` (the CI check measures it), `src:*` (one `bot-filed` label remains) and `blocked` (computed). Dropped: holdout scenarios (a public repo cannot hide them), the 12-metric dashboard (three metrics kept), the quarterly "delete a component" ritual. `ha-prompt-it` v2 gets a ~200-line budget. H12 must change `scripts/sync-superpowers.sh` (it rsyncs over everything except `hacer-patterns` and `docs-sync`).


## R27 — Portfolio rows now use your own words:
Builds on: unknown
harness ("autonomous-run improvements"), core, verify ("QA service"), surfaces ("renderer surfaces"), spine ("nand2tetris alignment"), 3d, **polish ("UI polish" — was missing)**, bugs, upkeep ("maintenance" + "documentation"), horizon ("beyond nand2tetris"). `horizon` is limited to one open research note at a time rather than one per month — research notes are the safest work to do while you are away.

### Decisions the first draft took without recording (now recorded)


## R28 — Moving the North Star and `ha-prompt-it` into `hacer/` puts them in a PUBLIC repo
Builds on: unknown
Needed for cloud sessions and versioning, but it publishes your personal workflow text. *Yours to decide (decision 6).* Alternative: a private companion repo cloned by the cloud environment's setup script. *Revert:* `git rm` later does not unpublish history.


## R29 — Branch naming
Builds on: unknown
Routines push to `claude/*` by default, which conflicts with ADR-0002's `<type>/<topic>`. Recommendation: sessions keep ADR-0002 (`<type>/<issue#>-<topic>`); `claude/*` is accepted only for routine-created branches — an amendment to ADR-0002 for you to approve.


## R30 — Freezing the P05 checklist and `tasks/todo.md`, and dropping `.cursor/` from AGENTS.md precedence
Builds on: unknown
AGENTS.md Step 1.0 (ticket freshness) mandates the checklist today, so H4/H9 must update AGENTS.md in the same change. `.cursor/` is 272 files serving a tool you no longer drive the project with; the recommendation is to stop citing it, not delete it.


## R31 — A Claude OAuth token stored as a secret on a public repo
Builds on: unknown
(needed for the verifier on Actions). Mitigated by R20's environment scoping and by never exposing secrets to fork PRs; still a standing credential. *Yours to decide.*

## Corrections after the fact-check (2026-09-18)


## R32 — R20 corrected: removing the admin bypass as first written would have locked you out of merging
Builds on: unknown
Verified: besides the 1-approval rule, `main-rules` has an `update` restriction, `required_deployments: ["github-pages"]` (no PR branch ever produces that deployment) and a `code_scanning` rule requiring CodeQL while CodeQL default setup is `not-configured`. Today only the bypass path can merge. The report now gives an ordered procedure — fix or drop each rule, add required checks, prove a trivial PR merges without bypass, and remove the exemption **last**.
Cost if wrong: high if done out of order (you cannot merge until you restore the bypass — a 1-minute settings change, but alarming). *Revert:* re-add the bypass actor.


## R33 — Facts corrected in revision 3
Builds on: unknown
(all verified by me unless noted): P05-32 is done, not open (12 unchecked tickets + the 12b remainder = 13); `lint:docs` only rejects machine-specific absolute paths, so the G0 exit test needs a does-this-path-exist check that H10 must build, and the raw tracks cannot be landed in the repo as they are; issue types are unavailable on a user-owned repo; the wiring gesture machine has 18 actions, not 17; two more timestamp sites belong in C4; the nvm default is already Node 22 — the v14 is a stray `/usr/local/bin/node`; 4 merged remote branches, not 5; "105 of 108 merged PRs unapproved", not "125/129". Taken from the fact-checker without my own recomputation: median *reviewable* PR size 604 (168 without `docs/`), and specs + plans being 30–57% of the five bulkiest PRs — which replaces my overstated "the complete-code rule alone is 40–57%".


## R34 — Research claims softened to match their sources:
Builds on: unknown
the same-model-review result keeps its "confounded, medium confidence" caveat; "~50% recall" is labelled vendor-relayed; the blocked exit is "one of two cheap levers measured", not "the cheapest"; the OpenAI harness details are marked as read through a mirror; cloud-VM specs and the OAuth-token claim are marked as unre-checked (track 6); the unsourced "~90% of 3D correctness" became "most".


## R35 — `/autonomous` and its hooks stay in `~/.claude/` (yours, global, used by other workspaces)
Builds on: unknown
They do not exist for cloud sessions, so the pick / claim / blocked-exit / dormant rules go into the repo skill and `backlog.mjs` instead of being moved.
Cost if wrong: low.

### Process note
Both review agents were briefed read-only. The fact-checker reported that it nonetheless wrote one scratch file (`factcheck_prs.json`, in this session's scratchpad — not in any repo) and ran Vitest, which writes its cache under `node_modules`. I checked: `git status` in `hacer/` shows only the pre-existing untracked `.stryker-tmp/`.
