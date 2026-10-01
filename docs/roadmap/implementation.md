# HACER Implementation Guide

**Part of:** [Development Roadmap](README.md)  
**Focus:** Stack truth, quality gates, and success metrics — live phase/ticket status lives elsewhere now  
**Last aligned:** 2026-09-27 - phase/ticket status retired to `docs/portfolio.md` + Mission Control (#148);
keep stack/metrics in sync with `README.md`, `REPO_MAP.md`, and `.cursorrules`

---

## Live Status

**This file is the single source for phase status.** Current phase: **0.5** (nand2tetris Project 1 foundation, in progress); product spine 0.5 -> 0.6 -> 0.7. What is done is tracked in the epics [#139](https://github.com/mezivillager/hacer/issues/139) (spine), [#138](https://github.com/mezivillager/hacer/issues/138), [#140](https://github.com/mezivillager/hacer/issues/140)-[#147](https://github.com/mezivillager/hacer/issues/147) and [#260](https://github.com/mezivillager/hacer/issues/260), via `docs/portfolio.md`; do not restate it here. `.cursorrules`, the P05 ticket index and `tasks/todo.md` link here.

Phase and ticket status is tracked outside this file now (ADR-0013): `docs/portfolio.md` for priority
projects and the pick rule (`node scripts/backlog.mjs ready` lists what's pickable), and
[Mission Control](https://mezivillager.github.io/hacer/control/) for the live dashboard.

## Current Stack

| Area | Current choice |
|------|----------------|
| Runtime | Node 22, pnpm 10.12.1 |
| App | React 19 + React Compiler + TypeScript 6.0 strict |
| State | Zustand 5 + Immer |
| 3D | React Three Fiber 9 + Drei + Three 0.183 |
| Build | Vite 8 |
| UI | Tailwind CSS v4, shadcn/ui-style primitives in `src/components/ui-kit/`, Radix UI primitives, lucide-react |
| Feedback | Sonner through `notify` at `@/lib/notify` |
| Theme | `next-themes` plus CSS variables consumed by React Three Fiber helpers |
| Testing | Vitest 4, Playwright 1.57 |
| Release | semantic-release with conventional commits and GitHub releases |

Removed or unselected tooling should not appear in active implementation tasks.

## Success Metrics

### Near-Term Product Metrics

| Phase | Metric | Target | Measurement |
|-------|--------|--------|-------------|
| 0.5 | Project 1 chip coverage | All 15 chips | Built-in/reference implementations and user-created equivalents |
| 0.5 | HDL parsing | Project 1-compatible syntax | Parser/compiler fixtures and UI error states |
| 0.5 | Test script support | `.tst`/`.cmp` execution | Compatibility fixtures and test-result UI |
| 0.5 | Composite chips | Package, instantiate, evaluate | Unit, store, and E2E tests |
| 0.6 | Sequential primitives | DFF, clock, registers, RAM | Tick/tock-compatible tests |
| 0.7 | Hack computer | CPU, memory, ROM, I/O | Project 4-5 compatibility tests |

### Quality Gates

- `pnpm run lint`
- `pnpm run test:run`
- `pnpm run build`

## Risk Assessment

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Phase 0.5 scope creep | High | Medium | Keep tickets capability-first; defer polished panels until parser/test/compiler foundations exist |
| Simulation correctness drift | Medium | High | Prefer pure logic tests and compatibility fixtures before UI wiring |
| Runtime mismatch | Medium | High | Keep `.nvmrc`, `package.json` engines, and workflows on Node 22 |
| Documentation drift | Medium | Medium | Update `README.md`, `REPO_MAP.md`, roadmap pages, and agent guides when paths or phase state change |
| Performance pressure from buses/chips | Medium | Medium | Keep evaluation deterministic and add benchmarks when circuits grow beyond Project 1 scale |

## Quality Assurance Process

### Automated Gates

- ESLint and TypeScript checks through `pnpm run lint`
- Unit tests through `pnpm run test:run`
- Production build through `pnpm run build`

### Manual Review Focus

- Does the implementation match the active phase?
- Did new paths get documented in `REPO_MAP.md`?
- Are docs describing code that exists, or clearly labeling planned work?
- Are unselected tools avoided in active tasks?
- Are new UI surfaces using `src/components/ui-kit/`, `src/components/ui/`, `notify`, and current theme primitives?

## Documentation Maintenance

Update these together when stack, metrics, or process wording changes:

- `README.md`
- `.cursorrules`
- `REPO_MAP.md`
- `docs/roadmap/README.md`

Phase and ticket status itself is edited in `docs/portfolio.md` and GitHub Issues — not here, and not
in the retired `docs/plans/phase-0.5-tickets-CHECKLIST.md`.
