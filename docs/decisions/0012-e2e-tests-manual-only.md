# 0012. E2E tests run on manual invocation only

- **Status:** Accepted
- **Date:** 2026-09-17
- **Deciders:** Repo owner
- **Phase:** Phase 0.5

## Context
Playwright E2E ran in two automatic places: the `@store` suite on every push and PR (`ci.yml`), and the
full `@ui` suite on a Wednesday/Saturday schedule (`e2e-ui.yml`). `pnpm run test:e2e:store` was also one
of the four mandatory definition-of-done commands, repeated across roughly twenty living documents.

Browser-level tests are the slowest and least deterministic gate in the repo. Requiring them on every
change taxes every commit and every PR, and a scheduled run that nobody is watching produces failures
detached from the change that caused them.

## Decision
1. **E2E never runs automatically.** `ci.yml` drops the Playwright install and `@store` step; CI is now
   lint → docs paths → unit tests → build.
2. **`e2e-ui.yml` becomes `e2e.yml`**, `workflow_dispatch` only, with a `suite` input
   (`all` | `store` | `ui`). The schedule is removed. Run it from the Actions tab or
   `gh workflow run e2e.yml -f suite=store`.
3. **E2E leaves the definition of done.** It is now `pnpm run lint` · `pnpm run test:run` ·
   `pnpm run build`, reconciled across every living doc, cursor rule and HACER-authored skill.
4. **The `test:e2e*` package scripts stay.** Manual invocation is the whole point; nothing about
   running them locally changes except that they are no longer required.

## Consequences
- CI gets faster and markedly less flaky; PRs stop being blocked by browser timing.
- Store/UI regressions are no longer caught automatically. Nothing watches for them until someone
  dispatches the workflow, so E2E has to be run deliberately when a change is browser-level —
  wiring, canvas interaction, rendering, persistence.
- Combined with ADR-0011 (Stryker removed), the automated safety net is now lint, unit tests and
  build. Unit and component coverage carries proportionally more weight.
- `.claude/skills/finishing-a-development-branch/` still cites the old four-command checklist. It is
  vendored from obra/superpowers and `scripts/sync-superpowers.sh` overwrites it, so it is left alone
  deliberately; the HACER-authored skills (`code-review`, `planning`, `tdd`, `hacer-patterns`) are updated.
- Historical documents (`docs/plans/`, `docs/specs/`, `docs/superpowers/`, `tasks/`, `CHANGELOG.md`)
  keep the old gate list as a dated record.

## Affected living docs
`AGENTS.md`, `CLAUDE.md`, `.claude/CLAUDE.md`, `.cursorrules`, `.cursor/AGENTS.md`,
`.cursor/rules/000-hacer-precedence.mdc`, `README`-adjacent `CONTRIBUTING.md`, `REPO_MAP.md`,
`HACER_LLM_GUIDE.md`, `.github/copilot-instructions.md`, `docs/cognitive-protocols.md`,
`docs/llm-docs-sync.md`, `docs/llm-workflow.md`, `docs/testing/` (README, standards, E2E template),
`docs/roadmap/` (README, implementation, phase-2.5, phase-3.5), and the HACER-authored
`.claude/skills/{code-review,planning,tdd,hacer-patterns}` — updated alongside this ADR.

## Links
- [[0011-remove-stryker-mutation-testing]]
