# 0002. Commit attribution and worktree-location conventions

- **Status:** Accepted
- **Date:** 2026-06-19
- **Deciders:** Repo owner
- **Phase:** Phase 0.5

## Context
The owner set governance rules for AI-assisted work: commits must carry no AI authorship attribution,
and all new work must be isolated in git worktrees that live outside the repo.

## Decision
1. **No AI authorship attribution in commits.** Messages must not contain "Co-Authored-By: Claude" or
   "Generated with Claude Code" trailers. Enforced two ways: Claude Code's `includeCoAuthoredBy: false`
   setting (`.claude/settings.json`) stops the trailer at the source, and a `.husky/commit-msg` guard
   rejects any message matching the attribution patterns. (Legitimate product references — e.g. naming
   a "Claude Code Stop hook" — are allowed; the guard only matches attribution phrasing.)
2. **All new work happens in a dedicated git worktree** (one per effort), never directly on `main`.
3. **Worktrees live OUTSIDE the repo** as sibling folders named `hacer-wt-<topic>`
   (e.g. `git worktree add ../hacer-wt-<topic> -b <type>/<topic>`), never nested inside the repo
   (no `.worktrees/`).

## Consequences
- Cleaner, vendor-neutral history; worktrees no longer clutter the repo tree.
- The existing in-repo worktree `.worktrees/builtin-chip-placement` is migrated to
  `../hacer-wt-builtin-chip-placement` (branch and commits preserved via `git worktree move`).
- Worktree *location* is a convention (documented in `.cursor/rules/020-git-worktree-no-main.mdc` and
  `AGENTS.md` §3 Step 2); only the attribution rule is hook-enforced.

## Affected living docs
`.cursor/rules/020-git-worktree-no-main.mdc`, `AGENTS.md` (§3 Step 2), `.claude/settings.json`,
`.husky/commit-msg` — updated alongside this ADR.

## Links
- [[0001-adopt-adr-log-and-docs-sync-enforcement]]
