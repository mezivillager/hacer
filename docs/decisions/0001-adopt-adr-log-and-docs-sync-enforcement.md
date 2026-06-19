# 0001. Adopt an ADR log and enforce docs-sync at session end

- **Status:** Accepted
- **Date:** 2026-06-19
- **Deciders:** Repo owner + planning session
- **Phase:** Phase 0.5

## Context
Docs drifted from code (stale "100% complete" claims in `docs/roadmap/appendices.md`, dead import
examples in `REPO_MAP.md`, branded-types asserted as current rules though none exist in `src/`). The
existing `docs/llm-docs-sync.md` author/reviewer passes reconcile *living docs after code changes* but
have no home for **emergent decisions / new directions** that arise mid-session, and rely on agent
goodwill rather than enforcement.

## Decision
We will (1) keep an ADR log under `docs/decisions/`, (2) add a `docs-sync` capture skill that writes
ADRs and runs the author pass, and (3) enforce it with a Claude Code **Stop hook** that prompts (and,
by default, blocks once per session) when code changed but no docs were touched. The hook keys off
git change-presence — committed (vs the `origin/main` merge-base) and uncommitted — it does **not** grep doc *contents* (the repo deliberately rejected
repo-wide grep-CI in `docs/llm-docs-sync.md`).

## Consequences
- Future sessions inherit decisions instead of rediscovering or contradicting them.
- One extra acknowledgement turn per substantive session (downgradable via `HACER_DOCS_SYNC_ENFORCE=0`,
  which makes the hook a non-blocking reminder).
- The new skill must be protected in `scripts/sync-superpowers.sh` or the upstream sync will delete it.

## Affected living docs
`docs/llm-docs-sync.md` (new inventory row + "Capturing emergent decisions" section), `AGENTS.md`,
`.claude/CLAUDE.md`, and the root `CLAUDE.md` pointer — all updated alongside this ADR.

## Links
- Plan: `docs/plans/2026-06-19-docs-cleanup-and-sync-enforcement.md`
- Skill: `.claude/skills/docs-sync/SKILL.md`
- Hook: `scripts/hooks/docsSyncStop.mjs` (+ `docsSyncStop.logic.mjs`)
