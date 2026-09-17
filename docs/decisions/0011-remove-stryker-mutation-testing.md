# 0011. Remove Stryker mutation testing

- **Status:** Accepted
- **Date:** 2026-09-17
- **Deciders:** Repo owner
- **Phase:** Phase 0.5

## Context
Stryker mutation testing was adopted in Phase 3.5 and ran via `.github/workflows/mutation.yml` on every
PR touching `src/`. In practice it has not paid for itself: the owner's assessment is that it never
produced a finding that changed the code, while repeatedly blocking otherwise-green PRs.

Mutation testing is an unusually expensive gate — it re-runs the suite once per mutant — so a tool that
is not yielding actionable signal is not neutral. It is a tax on every `src/` change.

## Decision
Remove Stryker entirely:
1. Delete `stryker.config.json`, `scripts/stryker-changed.sh`, and `.github/workflows/mutation.yml`.
2. Drop the `stryker` / `stryker:changed` scripts and the `@stryker-mutator/*` devDependencies.
3. Drop `.stryker-tmp` from `.gitignore` and `eslint.config.js`.
4. Remove `docs/testing/stryker-evaluation.md` and every reference in living docs.

Test quality continues to be enforced by the remaining layers: TDD as the iron law, the pre-commit
hook, and CI (lint, docs paths, unit tests, build).

## Consequences
- PRs touching `src/` lose a merge gate; CI gets cheaper and less flaky.
- The repo loses its only automated check for vacuous tests. TDD discipline and code review now carry
  that weight alone. If a cheaper substitute is wanted later, coverage thresholds on `src/simulation/`
  and `src/core/` would be the natural first step — deliberately **not** adopted here.
- Historical documents that mention Stryker (`docs/plans/`, `docs/specs/`, `docs/superpowers/plans/`,
  `CHANGELOG.md`) are left untouched: they are dated records of what was true at the time, not living
  guidance. Only living docs were reconciled.
- `docs/testing/stryker-evaluation.md` is recoverable from git history if the decision is revisited.

## Affected living docs
`AGENTS.md` (CI layers renumbered, Layer 4 → Layer 3), `README.md`, `REPO_MAP.md`,
`HACER_LLM_GUIDE.md`, `docs/testing/README.md`, `docs/testing/standards.md`, `docs/roadmap/README.md`,
`docs/roadmap/implementation.md`, `docs/roadmap/phases/phase-2.5`, `phase-3.5`, `phase-8` —
updated alongside this ADR.

## Links
- [[0001-adopt-adr-log-and-docs-sync-enforcement]]
