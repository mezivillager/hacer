# Phase 3.5: Testing and Quality Infrastructure

**Part of:** [Development Roadmap](../README.md)  
**Status:** Partial / maintain  
**Last Updated:** 2026-05-12  
**Depends on:** Phase 2.5 developer tooling

---

## Current Truth

HACER has a solid testing baseline, but the larger testing roadmap is not fully complete. Do not document property testing, visual regression, or coverage thresholds as already implemented until the corresponding packages, workflows, and tests exist.

## Completed

- Vitest unit tests with colocated `*.test.ts` and `*.test.tsx`
- Playwright store E2E tests under `e2e/specs/**/*.store.spec.ts`
- Scheduled Playwright UI tests through GitHub Actions
- Stryker mutation workflow for PRs touching `src/`
- Test standards and templates in `docs/testing/`
- Fast store fixtures and reusable scenarios in `e2e/`

## Remaining Work

- [ ] Select and install a property-testing library before adding invariant suites
- [ ] Define coverage thresholds that match current test shape
- [ ] Add visual regression only if it becomes necessary for a stable visual surface
- [ ] Expand compatibility fixtures as Phase 0.5-0.7 features land
- [ ] Add performance regression tests when larger circuits are supported
- [ ] Revisit accessibility automation for new panels and controls

## Required Gates

```bash
pnpm run lint
pnpm run test:run
pnpm run test:e2e:store
pnpm run build
```

## Optional / Situational Gates

```bash
pnpm run test:e2e:ui
pnpm run test:coverage
pnpm run stryker
```

Use optional gates when the changed code affects UI workflows, broad test quality, or coverage-sensitive areas.

**Previous:** [Phase 2.5: Developer Tooling and DX](phase-2.5-developer-tooling.md)  
**Next:** [Phase 4.5: Release Management and Automation](phase-4.5-release-management.md)
