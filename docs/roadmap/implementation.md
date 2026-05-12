# HACER Implementation Guide

**Part of:** [Development Roadmap](README.md)  
**Focus:** Live status, stack truth, phase gates, and implementation checklists  
**Last aligned:** 2026-05-12 - keep in sync with `README.md`, `REPO_MAP.md`, and `.cursorrules`

---

## AI Agent Phase Sync

| Field | Value |
|-------|-------|
| Completed product work | Phase 0, Phase 0.25 |
| Completed infrastructure | Tailwind/shadcn design shell, CI, hooks, mutation workflow, scheduled UI E2E, semantic-release |
| In progress | Phase 0.5 - nand2tetris Project 1 foundation |
| Next product phase | Phase 0.6 - Projects 2-3 arithmetic and sequential logic |
| Ticket tracker | `docs/plans/phase-0.5-tickets-CHECKLIST.md` |

## Current Stack

| Area | Current choice |
|------|----------------|
| Runtime | Node 22, pnpm 10.12.1 |
| App | React 19 + React Compiler + TypeScript 5.9 strict |
| State | Zustand 5 + Immer |
| 3D | React Three Fiber 9 + Drei + Three 0.183 |
| Build | Vite 8 |
| UI | Tailwind CSS v4, shadcn/ui-style primitives in `src/components/ui-kit/`, Radix UI primitives, lucide-react |
| Feedback | Sonner through `notify` at `@/lib/notify` |
| Theme | `next-themes` plus CSS variables consumed by React Three Fiber helpers |
| Testing | Vitest 4, Playwright 1.57, Stryker |
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
- `pnpm run test:e2e:store`
- `pnpm run build`

## Risk Assessment

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Phase 0.5 scope creep | High | Medium | Keep tickets capability-first; defer polished panels until parser/test/compiler foundations exist |
| Simulation correctness drift | Medium | High | Prefer pure logic tests and compatibility fixtures before UI wiring |
| Runtime mismatch | Medium | High | Keep `.nvmrc`, `package.json` engines, and workflows on Node 22 |
| Documentation drift | Medium | Medium | Update `README.md`, `REPO_MAP.md`, roadmap pages, and agent guides when paths or phase state change |
| Performance pressure from buses/chips | Medium | Medium | Keep evaluation deterministic and add benchmarks when circuits grow beyond Project 1 scale |

## Implementation Checklist

### Phase 0: Critical Fixes - Complete

- [x] Correct stack documentation after state-management migration
- [x] Add React Compiler ESLint coverage
- [x] Create `.cursorrules`
- [x] Update README and repository map

### Phase 0.25: UI/UX Improvements and Circuit Editing - Complete

- [x] Grid-based gate placement
- [x] Flat gate orientation with readable labels
- [x] Gate dragging and movement
- [x] 90-degree rotation
- [x] Grid-aligned wire routing
- [x] Wire stub removal when connected
- [x] Wire selection and deletion
- [x] E2E store test reorganization
- [x] Circuit input/output nodes
- [x] Junction nodes and fan-out wiring

### Phase 0.5: Project 1 Boolean Logic - In Progress

Ticket-level truth lives in `docs/plans/phase-0.5-tickets-CHECKLIST.md`.

- [x] Chip definition and registry foundation
- [x] Multi-bit bus data model and simulation propagation foundation
- [x] HDL lexer/parser foundation
- [x] Test-script and comparison-file parser foundation
- [x] Topological simulation evaluation and cycle error reporting
- [x] Node rename/display workflow
- [x] Status/error feedback foundation
- [ ] Chip definition panel and package workflow
- [ ] Pinout panel
- [ ] HDL compiler and chip-part resolution
- [ ] HDL editor panel
- [ ] Test execution engine
- [ ] Test results panel
- [ ] Chip workflow browser
- [ ] Composite chip 3D rendering
- [ ] Bus splitter/joiner 3D components
- [ ] Circuit persistence
- [ ] Built-in Project 1 implementations and toggle
- [ ] Project 1 integration validation

### Phase 0.6: Projects 2-3 Arithmetic and Sequential Logic - Planned

- [ ] DFF gate definition and built-in implementation
- [ ] Clock system and visualization
- [ ] Two-phase simulation for clocked chips
- [ ] Register, PC, RAM8 through RAM16K
- [ ] HalfAdder, FullAdder, Add16, Inc16, ALU
- [ ] Tick/tock-compatible test execution
- [ ] Project 2-3 compatibility fixture packs

### Phase 0.7: Projects 4-5 Computer Architecture - Planned

- [ ] Hack CPU and instruction decode
- [ ] Memory chip with RAM, screen, and keyboard map
- [ ] ROM32K and `.hack` program loading
- [ ] Computer chip integration
- [ ] Step/run debugging UI
- [ ] Project 4-5 compatibility fixture packs

### Phase 1.5: Design System and Visual Consistency - Complete / Maintain

- [x] Tailwind CSS v4 app styling
- [x] shadcn/ui-style primitives copied into `src/components/ui-kit/`
- [x] Radix primitives, lucide-react icons, and Sonner feedback
- [x] `next-themes` light/dark/system support
- [x] Compact HACER shell components in `src/components/ui/`
- [ ] Continue documenting new primitives as they are added
- [ ] Add accessibility audits for new interactive panels

### Phase 2.5: Developer Tooling and DX - Complete / Maintain

- [x] GitHub Actions CI
- [x] Local commit hooks through Husky/lint-staged
- [x] Conventional commit linting
- [x] Node 22 workflow/runtime alignment
- [x] Agent-facing workflow docs
- [ ] Keep new automation small and tied to active delivery needs

### Phase 3.5: Testing and Quality Infrastructure - Partial

- [x] Vitest unit test suite
- [x] Playwright store E2E suite
- [x] Scheduled Playwright UI suite
- [x] Stryker mutation workflow
- [x] Testing standards and templates
- [ ] Property-testing library selection and invariant suite
- [ ] Visual regression strategy
- [ ] Coverage thresholds after Phase 0.5 stabilizes
- [ ] Compatibility corpus expansion beyond Project 1 parser fixtures

### Phase 4.5: Release Management and Automation - Complete / Maintain

- [x] `.releaserc.json`
- [x] `commitlint.config.js`
- [x] `.github/workflows/release.yml`
- [x] `CHANGELOG.md`
- [x] `docs/semantic-release.md`
- [ ] Keep branch/channel strategy intentionally simple until there is a real beta or prerelease need

### Phase 5+: Future Platform Work

Future phases remain useful directionally, but do not supersede Phase 0.5-0.7 product work. Revalidate scope before starting any of the following:

- Core/API/plugin architecture hardening
- AI agent APIs and examples
- Worker-based simulation and benchmark dashboards
- Software stack integration
- Component library and backend collaboration
- Production platform, auth, API ecosystem, mobile, analytics, i18n, PWA, documentation automation, and AI-assisted review

## Quality Assurance Process

### Automated Gates

- ESLint and TypeScript checks through `pnpm run lint`
- Unit tests through `pnpm run test:run`
- Store-level E2E through `pnpm run test:e2e:store`
- Production build through `pnpm run build`

### Manual Review Focus

- Does the implementation match the active phase?
- Did new paths get documented in `REPO_MAP.md`?
- Are docs describing code that exists, or clearly labeling planned work?
- Are unselected tools avoided in active tasks?
- Are new UI surfaces using `src/components/ui-kit/`, `src/components/ui/`, `notify`, and current theme primitives?

## Documentation Maintenance

Update these together when phase status changes:

- `README.md`
- `.cursorrules`
- `REPO_MAP.md`
- `docs/roadmap/README.md`
- This file
- `docs/plans/phase-0.5-tickets-CHECKLIST.md` while Phase 0.5 is active
