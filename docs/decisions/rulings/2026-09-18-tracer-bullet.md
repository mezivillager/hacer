# Rulings — 2026-09-18 tracer-bullet

Imported by #466 on 2026-09-25 from the coordinator's run directory `2026-09-18-hacer-tracer-bullet`; wording unchanged except machine paths. `Builds on: unknown` marks a ruling nobody has annotated; a restated ruling carries a new id and `Amends:` the original.

## R36 — Grant interpretation
Builds on: unknown
"All necessary permissions are granted, no restriction on github pushing, deploying, releasing … personal project" + "nothing is private, it's an open project" = `publish: on-green` for `mezivillager/hacer` **including merges to `main`** (which release and deploy) and repo-settings changes. `ha-prompt-it`'s "a prior go never carries forward" for merges is overridden for this run by the explicit blanket grant; each merge still requires the definition of done + green CI.
Cost if wrong: a release/deploy you did not want — revertible (revert commit, redeploy).


## R37 — Release + deploy stay on `push: main` (R19 amended)
Builds on: unknown
Amends: R19
R19 proposed decoupling them to make merging cheap for a human; the grant makes merging cheap directly, the site is static, and semantic-release already skips docs/test/chore commits. Decoupling is dropped as YAGNI; revisit if release noise becomes a problem.
Cost if wrong: many small releases. *Revert:* one small workflow PR.


## R38 — `RELEASE_TOKEN` is not moved into an environment in this run
Builds on: unknown
because a secret's value cannot be read back; moving it needs you to re-enter it. Filed as an issue instead. The exposure (a same-repo PR adding a `pull_request` workflow that reads the secret) stays; mitigated by the tamper flag on `.github/**` (item 9) and by you reviewing workflow-touching PRs.
Cost if wrong: token exposure by a malicious PR — but only same-repo branches get secrets, and only you (and agents acting as you) can push those.


## R39 — Ruleset rewrite (R20/R32 executed):
Builds on: unknown
drop `update`, `required_deployments`, `code_scanning`; approvals 1 → 0; add `required_status_checks: [ci]` (strict); keep `pull_request`, linear history, non-fast-forward/deletion protection; remove the admin bypass **after** the first PR has merged without `--admin`. CodeQL default setup is filed as an upkeep issue rather than enabled now (it adds a slow check to every PR).
Cost if wrong: if anything still blocks merges, re-add the bypass actor (1 minute).


## R40 — One reusable worktree `hacer-wt-tracer`
Builds on: unknown
for the sequential PRs of this run, branches per ADR-0002 (`<type>/<topic>`), instead of one worktree per PR (saves a `node_modules` repair per PR).
Cost if wrong: none; ADR-0002's one-per-topic is about isolation between *parallel* lanes.


## R41 — Defaults taken for REPORT §7 decisions 2–5, 7–10:
Builds on: unknown
Issues as backlog (2, yes); portfolio rows + 2:2:1 (3, as listed); PR budget 400/200 and plans without complete code (4, yes); ruleset rewrite yes, release decoupling no (5, see R37); Tier-0 auto-merge — *enabled by the grant*: docs/tests/deps PRs merge on green without a human (7); ADR-0012 amendment for browser runs — no (8); OAuth token secret for a verifier on Actions — no for now, the verifier runs as a fresh-context session/subagent per PR (9); plan unknown (10).
Revert: say so; each is one file or one setting.


## R42 — Verifier for this run = a fresh-context review subagent
Builds on: unknown
(repo `code-review` skill / `/code-review` semantics) that never sees the builder's transcript, writes its verdict on the PR as a comment, and blocks only with `file:line` evidence.
Cost if wrong: low.


## R43 — Process artifacts move into the repo
Builds on: unknown
Mezi (2026-09-18): everything needed to move forward must be PR'd and merged; the process must be reviewable and adjustable; its maintenance gets its own queue. So: this run's rulings land as `docs/research/2026-09-18-agent-readiness/DECISIONS.md`; from item 3 on, new rulings go to `docs/harness/ledger.md` in the repo (this file mirrors them until that exists); the `harness` portfolio row is the queue for the process itself; the "what can you do next?" entry point is a repo skill (`ha-next`) so cloud sessions have it too.
Cost if wrong: none — files.


## R44 — For a Light-tier task that starts from an `agent-ready` issue, the issue body IS the spec; no `docs/specs/` file is written
Builds on: unknown
AGENTS.md Step 1 / ha-prompt-it ask for a `docs/specs/` design for anything with 3+ steps; the new work system puts goal, acceptance criteria, verification command, scope and files on the issue instead, which is the same content in the place agents read. To be codified in ha-prompt-it v2 (#154) and AGENTS.md. Full-tier work still gets a spec file.
Cost if wrong: low — a spec file can be added to any issue after the fact.


## R45 — P05-31 is split for the tracer bullet:
Builds on: unknown
the engine (#164, pure function + tests, ≤200 reviewable lines) is the PR; the store action and the drawer UI become two follow-up sub-issues of the same ticket. The ticket file gets a note in the engine PR. This is the "one sub-issue per PR" rule applied to a ticket written before it.
Cost if wrong: none — the follow-ups are filed immediately.


## R46 — `ha/CLAUDE.md` edited in place (R6 lifted by the grant)
Builds on: unknown
The four verified-stale statements were corrected and the file now points at `docs/north-star.md` as the canonical copy. Backup: `ha/CLAUDE.md.bak-2026-09-18` (the file is not under version control).
Cost if wrong: none — restore the backup.


## R47 — Builder judgment calls accepted as-is
Builds on: unknown
PR #238: `{ok:false, reason:'cycle'}` variant added (a stale table on a feedback loop would violate the criteria); flat `src/simulation/truthTable.ts`; `topologicalEval` parameter type widened to a new `CircuitDocument` (type-only). PR #239: `ready` prints the full pick order with harness first (head = next pick); extra reasons `not-pulled` and `on-request`; lanes read from the portfolio table; test file named `backlog.logic.test.mjs` (issue #149's verification command updated to match).
Cost if wrong: low — each is a few lines.


## R48 — Red-commit mechanics under the pre-commit `tsc -b`:
Builds on: unknown
a red is "tests + the smallest compiling stub that fails", never `--no-verify`. Written into `docs/harness/implementer-brief.md` (PR #240) and the ledger; ha-prompt-it v2 (#154) must say the same.


## R49 — On a BLOCK, the same builder fixes on the same branch; nits that change a contract other issues will consume (#235/#236) are taken in the same fix round; purely internal nits are optional
Builds on: unknown
Applied to PR #238: blocker (stale pin state) + headers `{name,width}` + `maxInputBits` sanity bound; "sort once" left optional.
Cost if wrong: low — a few more lines in one PR.


## R50 — The run follows its own pick rule
Builds on: unknown
Queue item 10 (C1, Vitest node/jsdom split) was queued before the pick rule existed; `backlog.mjs ready` shows it is not pulled by any spine task, so it is not picked. The run works foundation items (#150, #153) and then the pick order — the run does not get to jump the queue it just built.
Cost if wrong: C1 waits until a spine task depends on it (or you re-order the portfolio).


## R51 — `strict_required_status_checks_policy: true` means every PR must be rebased onto current `main` (fresh CI run) before merging
Builds on: unknown
Kept: tests run against the real merge base, which matters with several agents landing PRs. Cost: one extra CI cycle (~2 min) per PR when `main` moved; `gh pr update-branch --rebase` does it. Ledger candidate if it becomes the bottleneck.


## R52 — PR #238 fix-round rulings accepted:
Builds on: unknown
the `over-budget` diagnostic reports the budget actually applied (clamped), and `NaN` maps to budget 0 (fails closed). Sort-once deferred with a stated reason (would make the evaluator touch a runtime change).
Cost if wrong: one line each.


## R53 — Verifier nits on a PASS are filed as one depth-1 follow-up issue, not fixed in-PR
Builds on: unknown
(PR #244 → #247). Follows `verifier-brief.md`; a fix round would cost another verify + CI cycle for two two-line changes.
Cost if wrong: the gaps live on `main` until #247 is picked (harness foundation → soon).


## R54 — `pr-hygiene` becomes a required check only after one green run on `main`
Builds on: unknown
(the workflow cannot execute from its own PR). Verified: `gh api actions/workflows` did not list it before merge.


## R55 — A stack was accepted for #153
Builds on: unknown
(three PRs each under budget, one logical sequence) although the work system says "avoid stacks". Merge order is enforced by me: verify and merge #245, rebase #246 onto `main` (`gh pr update-branch --rebase` drops the already-applied commits), verify, merge, then #248. Ledger candidate: the builder split correctly because a single PR measured 454 reviewable lines — the budget did its job.
Cost if wrong: a mis-rebased stack (PR #135's accident); mitigated by rebase-only merges and CI on each.


## R56 — `claude/migrate-hacer-app-ui` deleted
Builds on: unknown
(tip `ead6d83`, 2026-04-02, already an ancestor of `main`, no PR); the four merged-but-undeleted branches (#135, #134, #119, #132) deleted; `delete_branch_on_merge` prevents recurrence.
Cost if wrong: none — every deleted tip is reachable from `main`.


## R57 — Making `pr-hygiene` required exposed a gap the verifier's nits did not: bot PRs cannot link an issue
Builds on: unknown
Fix is #249 (skip the linked-issue rule for `*[bot]` authors / `dependencies` label; size rule still applies). Until it lands, dependabot PRs cannot merge — acceptable for an hour. Ledger row to add: "a required check must be run against every *kind* of PR that exists (human, agent, bot) before it is required".


## R58 — #248 BLOCK upheld, not overturned
Builds on: unknown
The verifier itself flagged that AC 2 could be read as conditional; I read it literally: the PR body claims CONTRIBUTING.md links to the recipe and the diff does not, and two pre-chipName framing lines remain. A three-line fix; the builder still has context.

## R59 — REPO_MAP's fenced aspirational trees: delete (follow-up issue), agreeing with the verifier
Builds on: unknown
They contradict the corrected current tree and cannot be linted.
Cost if wrong: the roadmap specs still carry that layout; nothing is lost.


## R60 — Ledger row to land: the `gh` OAuth token cannot update a PR branch that changes `.github/workflows/
Builds on: unknown
` (`workflow` scope missing), so agent sessions cannot rebase such PRs; dependabot can (`@dependabot rebase`). For agent-authored workflow PRs, the fix is `gh auth refresh -s workflow` (owner action) — filed in the end-of-run review rather than done now (changes the token's scope).


## R61 — Coordinator made a one-word doc fix directly on PR #245's verified branch
Builds on: unknown
(AGENTS.md:211 `pr-hygiene.logic.mjs` → `scripts/pr-hygiene.logic.mjs`), a One-liner tier: the new path-exists check caught a dead citation that a *later* PR (#244) introduced on `main`. No re-verification: the change is one path string and `lint:docs` is the proof. Ledger row: the check paid for itself before it even merged.
Cost if wrong: none.


## R62 — Recipe sweep outside the four named docs:
Builds on: unknown
`docs/plans/phase-0-critical-fixes.md` is a dated plan (historical); `phase-0.5-tickets/README.md` and `docs/testing/standards.md` are living → fix (#253).


## R63 — R51 amended: `strict_required_status_checks_policy` → false
Builds on: unknown
Amends: R51
With 10 PRs landing in two hours, every merge put every other green PR BEHIND and cost a rebase + ~2 min CI; dependabot PRs re-triggered each other. Non-strict means checks are judged on the PR head as tested; `ci.yml` still runs on every push to `main` and would flag a semantic conflict within minutes, and rebase-only linear history is unchanged.
Cost if wrong: a red `main` for one cycle (revert commit). *Revert:* flip the flag back (one API call).


## R64 — Releases stop committing to `main` (ADR-0015, PR #254)
Builds on: unknown
Removing the bypass made `@semantic-release/git`'s push fail on every release (5 failures today). Options weighed: a bypass-granted GitHub App or deploy key (owner setup, more moving parts) vs. dropping the in-repo CHANGELOG/version commit (tags + GitHub Releases carry the notes). Chose the latter; the ADR names the alternative.
Cost if wrong: `CHANGELOG.md` and `package.json` version stop tracking releases on `main`. *Revert:* restore the two plugins and grant a bypass to a non-human actor.


## R65 — Agent PRs must not touch `.github/workflows/
Builds on: unknown
` until the `gh` token has the `workflow` scope** (owner action: `gh auth refresh -s workflow`). The cosmetic `ci.yml` step rename was dropped from #245 for this reason. Ledger row.


## R66 — Item 12 (cloud spike) marked blocked, not forced
Builds on: unknown
`claude --cloud` refuses non-interactive shells and a pseudo-TTY hits the trust prompt; driving that prompt from a script would be a hack around a deliberate guard. Left as a one-line command for Mezi.


## R67 — Cost
Builds on: unknown
Mezi (2026-09-18): careful about cost; explore open/free models. Filed as a `harness` research task (model tiering per role, open-model evaluation, tokens-per-PR metric) rather than changing models mid-run. Measured today: ~1.4M subagent tokens / 8 verified PRs. Verifiers already skip PRs < ~100 reviewable lines.

## R68 — Browser testing stays off the PR path (ADR-0012); #220 remains `needs-human`
Builds on: unknown
— the owner's "is browser testing baked in?" is answered honestly as "no, by your ADR; the GPU-free 3D lane is queued; #220 is your call".


## R69 — Browser QA policy (owner, 2026-09-18):
Builds on: unknown
"all critical features/fixes have to pass through an independent QA that does browser testing"; 3D browser runs in the cloud only, 2D/other may run locally. Overrides ADR-0012's "never automatically" → ADR-0016 (#220, re-scoped and agent-ready), a `browser-qa` required check on critical paths, and an independent QA agent brief (#257). "Critical" is defined mechanically by paths/labels so the check needs no judgment.
Cost if wrong: browser CI minutes (free on the public repo) and some flake; the check starts advisory until one green run.


## R70 — Cursor lane (owner has two subscriptions):
Builds on: unknown
filed #258 (Bugbot advisory review; Cursor cloud agents as extra builders/QA under the same briefs). Never a required check.


## R71 — Portfolio priority (owner):
Builds on: unknown
surfaces (2D · HDL · MCP) catch up with 3D and grow hand in hand → row order and rotation change (2 surfaces : 1 spine : 1 enabler : 1 upkeep), enablers pulled by surfaces or spine, and a hand-in-hand readiness rule for surface tasks. Amends R21. Implemented by an agent as a PR, not by hand, so the change is reviewable.
Cost if wrong: the spine slows to 1 in 5 picks; one number to change.


## R72 — "Surfaces first" means "design first."
Builds on: unknown
Owner: opening the platform for 2D/HDL/MCP needs core refactoring and architectural decisions. Ruled: the surfaces epic starts with the five architecture ADRs (#188 #189 #190 #209 #210) at the Full tier, each an ADR the owner reviews; core enablers are then pulled by those ADRs; surfaces land hand in hand via the scenario × driver matrix. Posted on #142; the portfolio PR (#259) carries the ordering. R11/R21 stand except for the row order.
Cost if wrong: a week of design before new surface code — which is what he asked for.


## R73 — R71 amended: features and process are equal
Builds on: unknown
Amends: R71
Owner: surfaces catch up *feature-wise*; process and auxiliary work are of equal priority. Rotation becomes a 6-slot cycle `surfaces → harness → spine → aux → surfaces → harness` (aux = verify/upkeep/bugs in turn): features 3/6 with surfaces double-weighted, process/aux 3/6 with harness double-weighted. The "harness-only foundation" step is dropped.
Cost if wrong: one line in `docs/portfolio.md` and one array in `backlog.logic.mjs`.


## R74 — Public documentation is a portfolio row (`pubdocs`, epic #260) that shares the surfaces' pick slots and is bound to them by rule:
Builds on: unknown
a surface capability is not done until its `docs/public/` page exists; references are generated from the registry/MCP/CLI definitions so they cannot drift; `pr-hygiene` warns when surface code changes without a `docs/public` change. Published with the app at `/docs/`.
Cost if wrong: a row and a label; the docs themselves are wanted regardless.


## R75 — Docs platform decided by research + ADR-0017 before any docs are written
Builds on: unknown
, then taken live on the existing GitHub Pages under `/docs/` (owner: research state of the art, deploy it). #262 (skeleton) now waits on it. Dispatched as a research agent whose first PR is the note + ADR; the deploy PRs follow through the normal loop.
Cost if wrong: a day of research; the alternative (pick VitePress by reflex) is what the owner asked us not to do.


## R76 — R&D / product-fidelity role added to the harness
Builds on: unknown
(owner): a standing brief + agent definition (like the verifier), ADR-0018 making a fidelity review a gate on spine/surfaces/horizon epics and ADRs, ground truth named per domain (the `.tst/.cmp` oracle today; physics/EE references for below-NAND), proposals filed as `rd-review` issues the owner accepts — the agent never rewrites the roadmap itself. First job: fact-check the current roadmap and the below-NAND ambition.
Cost if wrong: one more review per epic/ADR (research-tier tokens), and a set of proposals you can ignore.


## R77 — R&D proposals require owner approval (owner):
Builds on: unknown
the R&D agent queues proposals in `docs/harness/rd-inbox.md` (status proposed/approved/declined) and never files issues; approval by the owner (status change or "approve RD-00N") is what turns an entry into issues. Exception kept: an actual defect found by fact-checking shipped behaviour goes through the bot issue contract (repro required, `bot-filed`, never `agent-ready` without the owner).
Cost if wrong: proposals wait for the owner — which is the intent.


## R78 — Names (owner):
Builds on: unknown
the engineering-truth role is **fidelity** (`hacer-fidelity`, `fidelity-brief.md`, `fidelity-inbox.md`, label `fidelity`); **product** is reserved for a separate usability/design role (filed as its own research task with the same approval inbox, `product-inbox.md`). Both never file issues themselves.


## R79 — The team is a versioned roster
Builds on: unknown
(`docs/harness/team.md` + `.claude/agents/hacer-<role>.md`), filed as an umbrella issue blocked by the three role PRs in flight and the model-tiering task, rather than dispatched now: four agents are already running, and the roster should describe briefs that exist.


## R80 — Continual refinement is a role with an inbox
Builds on: unknown
(owner): retro role + `harness-inbox.md` (proposals for policy changes, owner-approved) on top of the existing ledger + second-occurrence rule; the team roster (#270) starts with research that refines the owner's suggested roles from evidence rather than copying them. Neither dispatched yet: four agents are in flight and both depend on #255 (model tiers) and the role PRs.


## R81 — Docs-only process PRs that encode owner rulings are reviewed by the coordinator
Builds on: unknown
, not a fresh-context verifier (applied to #274, 312 lines): the coordinator holds the rulings the PR must honour, and a verifier would need them spelled out to judge the same thing; saves a ~150k-token dispatch. Code, workflows and anything security-relevant still get a fresh verifier (#273).
Cost if wrong: a process doc merges with a flaw the coordinator shares; the ledger/retro role catches it on use.


## R82 — An agent regressed its own branch to a superseded spec
Builds on: unknown
(the portfolio agent reset to `origin/main` and rebuilt the original 2:1:1:1 rotation after three addenda had moved it to the six-slot cycle), most likely because the addenda lived only in messages and an issue comment while the issue body still carried the first spec. Fixed by rewriting #259's body to the final spec and telling the agent to restore its six-slot commits from the reflog. Ledger row: **steering changes go into the issue body, not only into messages or comments** — the issue is what an agent re-reads.
Cost if wrong: none; one resumed agent.


## R83 — ADR-0017 (docs platform: Astro Starlight at `/hacer/docs/` on the existing Pages deploy) accepted by delegation
Builds on: unknown
— the owner said "do everything needed to take that live, deployment, etc", so the choice is delegated; accepting it leaves #262 (implementation) directly pickable on resume. Coordinator review of #276: the recommendation is evidence-backed (Astro 7 on Vite 8, $0, one `BASE_PATH` drives both builds, generated references gated by `git diff --exit-code`, llms.txt with an honest note that it only pays when agents are pointed at it). ADR-0018 (fidelity gate) stays Proposed — no delegation was given for it.
Cost if wrong: the owner prefers VitePress (the named runner-up) — a config folder to swap per the ADR. *Revert:* status → Superseded.


## R84 — Wrap-up (owner: "wrap up current ongoing PRs and tasks, and call it a day"; "make sure there's committed context … so nothing is lost")
Builds on: unknown
No new work is dispatched; the four in-flight items finish (verifier #273, portfolio #259, fidelity PR 2 #268, docs #276); the session is recorded in a committed file `docs/harness/sessions/2026-09-18.md` + the later rulings appended to the committed DECISIONS.md; the workspace CLAUDE.md and memory gain a resume pointer.


## R85 — PR #278 (portfolio six-slot cycle) reviewed by the coordinator (R81), PASS; builder's six questions ruled
Builds on: unknown
(tiebreak stays surfaces/core; hand-in-hand shaping → #279; keep WORK-SYSTEM §2 note; retire WORK-SYSTEM live sections → #280; title ok; direct pull only). First `project:surfaces` pick sits at position 11 today because the design-first ADRs (#188/#189/#190, labelled `core`) take the surfaces slots first — intended.
Cost if wrong: the surfaces bucket fills slowly until #279 shapes its issues.


## R86 — Fidelity PR 2 (#281) reviewed by the coordinator, PASS
Builds on: unknown
Its five proposals stay `proposed` in `fidelity-inbox.md` for the owner (R77). Its #190 finding is posted on #190 as a verdict comment (allowed by the role), because #190 is the next design ADR to be picked and must not be built against the rising-edge model.


## R87 — #273 BLOCK upheld; fix (a):
Builds on: unknown
browser-qa reads the `sev:*`/`critical` labels of the issues the PR links (`Fixes/Closes/Part of #n`, reusing `findLinkedIssues`), which needs `issues: read` (read-only on a public repo — acceptable). Fix (b) (builders copy labels onto PRs) was rejected: it relies on a convention the owner's ruling ("all critical features/fixes") should not depend on. The builder also pushes its two local commits (merge-ref + per-event concurrency for manual runs). To prove the browser path before merge, the coordinator applies the new `critical` label to #273 so `@store` actually runs in CI. The definition gap the verifier found (store/simulation/utils/e2e changes are not "critical") is left for the owner — noted on #220.
Cost if wrong: one more permission scope on a read-only workflow.


## R88 — #273 fix reviewed by the coordinator
Builds on: unknown
(small, targeted: linked-issue `sev:*`/`critical` via `findLinkedIssues` imported from pr-hygiene, `issues: read`, `previous_filename` for renames, `edited` trigger, fail-closed on unreadable issues; `gh` called with an argv array — no shell interpolation of PR text). Not re-sent to the verifier: the security surface did not change beyond one read scope, and the real proof is the `critical`-labelled run of the actual browser suites.


## R89 — #273 merged after proof; `browser-qa` required
Builds on: unknown
Critical-labelled run 35349510882: `BROWSER-QA: PASS suites=store passed=107 failed=0 flaky=0` in 2.1 min on the built bundle with SwiftShader in Actions — the first real cloud browser run. Required checks are now `ci`, `pr-hygiene`, `browser-qa` (non-strict); non-critical PRs pass it with the skip line. The owner's "what counts as critical" question moved to an open needs-human issue (282) with a stated default.
Cost if wrong: flaky browser runs block merges — mitigated by retries 2 / 1 worker; revert = drop `browser-qa` from the required list (one API call).


## R90 — Stopped the browser-qa builder agent after its PR merged
Builds on: unknown
(it kept polling its own background work, ~300k tokens total). Its work is on `main`; nothing in its worktree was unpushed (pruned earlier). Ledger candidate: builder agents should end once their PR is handed back, not keep watching CI.
