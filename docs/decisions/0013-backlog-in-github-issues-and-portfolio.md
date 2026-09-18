# 0013. Backlog in GitHub Issues, project order in `docs/portfolio.md`, one sub-issue per PR

- **Status:** Accepted
- **Date:** 2026-09-18
- **Deciders:** Repo owner (delegated to the agent-readiness run; rulings R10–R12, R21, R36–R43 in
  `docs/research/2026-09-18-agent-readiness/DECISIONS.md`)
- **Phase:** Phase 0.5

## Context
Nothing in the repo answered "what's next" for an agent: 0 open issues, and five files
(`docs/roadmap/implementation.md`, `docs/plans/phase-0.5-tickets-CHECKLIST.md`, `tasks/todo.md`,
`.cursorrules`, `docs/development/observed-bugs.md`) that disagreed. PRs had a median of 850 changed
lines (604 reviewable), one ticket = one PR, with specs and plans making up 30–57% of the largest.
The `main-rules` ruleset could only be merged through by admin bypass, and CI was not a required
check. The research in `docs/research/2026-09-18-agent-readiness/` proposes a work system that
lets an agent answer "what can you do next?", pick it up, and get it merged with little oversight.

## Decision
1. **Tasks live in GitHub Issues.** One epic issue per portfolio row; tasks are its sub-issues;
   dependencies use `blocked-by`. A task is pickable when open, `agent-ready`, not `in-progress`,
   unblocked, and authored by an allowlisted identity. Labels: `project:*`, `agent-ready`,
   `in-progress`, `needs-human`, `risk:0/1/2`, `research`, `bug`, `sev:*`, `bot-filed`,
   `overturned`, `epic`.
2. *Amended 2026-09-18 (#259): the rotation below is superseded by the six-slot cycle `surfaces → harness → spine → aux → surfaces → harness` (`pubdocs` shares the `surfaces` slot, `aux` = `verify → upkeep → bugs`, `core`/`3d` pulled by any bucket, no foundation-first step) plus the hand-in-hand and design-first rules — `docs/portfolio.md` is authoritative.*
   **Project order lives in `docs/portfolio.md`** (owner-owned, in git) with the pick rule:
   `sev:critical` first; the `harness` foundation slice strictly first; then 2 spine : 2 enabler :
   1 upkeep, enablers only when a spine task is blocked by them.
3. **One PR = one sub-issue**, inside a budget of 400 reviewable changed lines (warn at 200; tests,
   lockfile, vendored vectors, snapshots and generated files excluded). Plans carry contracts and
   test names, not complete code — AGENTS.md Step 3's "complete code snippet" is amended by this ADR.
4. **The ruleset binds everyone.** `main-rules`: 0 approvals, required status check `ci` (strict),
   rebase-only linear history, **no bypass actors**. The `update`, `required_deployments` and
   `code_scanning` rules were dropped (none could be satisfied by a PR branch).
   `delete_branch_on_merge` and `allow_auto_merge` are on. Merges are permitted for agents when the
   definition of done and CI are green (owner grant, 2026-09-18).
5. **The process is itself a project** (`harness` row): its docs, skills, checks and ledger are
   changed by PRs like anything else.

## Consequences
- `tasks/todo.md`, the P05 checklist and `implementation.md`'s status become historical pointers
  (issue H4 / #148); AGENTS.md Step 1.0 will point at issues.
- Release and deploy stay on `push: main` (a merge still releases and deploys); revisit if release
  noise becomes a problem.
- Labels are conventions while agents act under the owner's GitHub identity; a separate bot
  identity (harness epic) turns them into controls.
- `RELEASE_TOKEN` remains a repo-level secret until the owner moves it into a `main`-restricted
  environment (#162).
- Rejected: Beads / Backlog.md / more in-repo ticket files (state edited inside branches goes stale
  across worktrees and inflates PRs); Stryker or E2E on the PR path (ADR-0011/0012 stand).

## Affected living docs
`docs/portfolio.md` (new) · `AGENTS.md` (Step 1.0, Step 3 — reconciled by #148 / #154) ·
`docs/plans/phase-0.5-tickets-CHECKLIST.md`, `tasks/todo.md` (historical headers — #148) ·
`docs/decisions/README.md` (index updated here).

## Links
- `docs/research/2026-09-18-agent-readiness/{REPORT,WORK-SYSTEM,DECISIONS}.md`
- Epics #138–#147 · [[0002]] worktree conventions · [[0011]] · [[0012]]
