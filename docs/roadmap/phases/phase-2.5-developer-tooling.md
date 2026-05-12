# Phase 2.5: Developer Tooling and DX

**Part of:** [Development Roadmap](../README.md)  
**Status:** Complete / maintain  
**Last Updated:** 2026-05-12  
**Depends on:** Phase 1.5 design shell and active Phase 0.5 delivery

---

## Current Truth

The selected developer-tooling baseline is present. This phase should be maintained, not treated as a large unstarted tooling project.

## Completed

- GitHub Actions CI in `.github/workflows/ci.yml`
- Mutation workflow in `.github/workflows/mutation.yml`
- Scheduled UI E2E workflow in `.github/workflows/e2e-ui.yml`
- Deploy and PR preview workflows
- Node 22 alignment across local runtime and workflows
- Husky/lint-staged pre-commit flow
- Commitlint and conventional commit conventions
- Vitest, Playwright, and Stryker commands
- Agent-facing docs in `AGENTS.md`, `.cursorrules`, `HACER_LLM_GUIDE.md`, `REPO_MAP.md`, `docs/llm-workflow.md`, and `docs/llm-harness.md`

## Active Maintenance Scope

- [ ] Keep workflow Node versions aligned with `.nvmrc`
- [ ] Keep commands in docs synchronized with `package.json`
- [ ] Add automation only when it protects active work
- [ ] Keep local hooks fast enough for normal commits
- [ ] Keep CI gates consistent with the repo definition of done
- [ ] Document new agent workflow rules in `AGENTS.md` and `docs/llm-workflow.md`

## Out of Scope For Now

- Additional component-preview tooling
- Developer dashboards
- Large code-generation systems
- Tooling that requires new services or secrets without an active product need

## Exit Criteria

This phase remains healthy when:

- `pnpm run lint` passes
- `pnpm run test:run` passes
- `pnpm run test:e2e:store` passes
- `pnpm run build` passes
- `pnpm run docs:check` passes for documentation changes
- The same Node major is used locally and in CI

**Previous:** [Phase 1.5: Design System](phase-1.5-design-system.md)  
**Next:** [Phase 3.5: Testing and Quality Infrastructure](phase-3.5-testing-infrastructure.md)
