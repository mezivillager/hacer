# HACER Development Roadmap

**Last Updated:** 2026-05-12  
**Project:** HACER - hardware architecture and constraints explorer & researcher  
**Current Product Phase:** Phase 0.5 - nand2tetris Project 1 foundation  
**Current Infrastructure Baseline:** Node 22, React 19, TypeScript 5.9, Vite 8, Zustand 5, React Three Fiber 9, Tailwind CSS v4, shadcn/ui-style primitives, Vitest 4, Playwright 1.57, Stryker, semantic-release

---

## Current Status

HACER is focused on finishing the nand2tetris Project 1 workflow: chip hierarchy, HDL parsing/compilation, `.tst`/`.cmp` execution, composite-chip UI, persistence, and Project 1 compatibility validation.

Already-completed infrastructure should not be re-planned as future work:

- Phase 0 and Phase 0.25 foundation work is complete.
- The Tailwind/shadcn design shell is implemented in `src/components/ui/`, `src/components/ui-kit/`, `src/styles/`, and `src/theme/`.
- CI, linting, Vitest, Playwright store E2E, scheduled UI E2E, mutation testing, commitlint, lint-staged, and semantic-release are present.
- Story-driven component tooling is not part of the selected roadmap.

Use [implementation.md](implementation.md) for the live checklist and `docs/plans/phase-0.5-tickets-CHECKLIST.md` for ticket-level Phase 0.5 status.

## Vision

HACER will let users and agents build complete computers from NAND gates, validate the work against nand2tetris-compatible artifacts, and later extend the platform into custom hardware, software-stack, plugin, and collaboration workflows.

```
NAND -> gates -> chips -> sequential logic -> CPU/memory -> software stack
```

The near-term product path is intentionally narrow:

1. Finish Project 1 Boolean Logic compatibility.
2. Add arithmetic and sequential logic for Projects 2-3.
3. Add CPU, memory, ROM, and I/O for Projects 4-5.
4. Revisit larger platform architecture once the Hack computer path is working end to end.

## Active Phase Sequence

| Phase | Status | Scope |
|-------|--------|-------|
| [0](phases/phase-0-critical-fixes.md) | Complete | Correct stack docs, React Compiler linting, agent entry docs |
| [0.25](phases/phase-0.25-ui-improvements.md) | Complete | Grid placement, flat gates, wire routing, I/O nodes, E2E optimization |
| [0.5](phases/phase-0.5-nand2tetris-foundation.md) | In progress | Project 1 chips, buses, HDL, `.tst`/`.cmp`, chip workflow UI |
| [0.6](phases/phase-0.6-arithmetic-sequential.md) | Planned | Projects 2-3 arithmetic, DFF, clock, registers, RAM |
| [0.7](phases/phase-0.7-computer-architecture.md) | Planned | Projects 4-5 CPU, memory map, ROM, screen, keyboard |
| [1.5](phases/phase-1.5-design-system.md) | Complete / maintain | Tailwind/shadcn design shell, theme tokens, compact app chrome |
| [2.5](phases/phase-2.5-developer-tooling.md) | Complete / maintain | CI, local hooks, release hygiene, agent docs |
| [3.5](phases/phase-3.5-testing-infrastructure.md) | Partial | Vitest, Playwright, Stryker, scheduled UI E2E; future coverage/property/visual work |
| [4.5](phases/phase-4.5-release-management.md) | Complete / maintain | semantic-release, changelog, GitHub releases |

## Future Platform Phases

| Phase | Status | Scope |
|-------|--------|-------|
| [5](phases/phase-5-core-architecture.md) | Future | Core/API/plugin architecture hardening |
| [6](phases/phase-6-plugin-system.md) | Future | Plugin framework and analyzers |
| [7](phases/phase-7-ai-integration.md) | Future | Agent API parity and examples |
| [8](phases/phase-8-enhanced-testing.md) | Future | Compatibility corpus expansion, integration and accessibility tests |
| [9](phases/phase-9-performance.md) | Future | Workers, scaling, benchmark dashboards |
| [10](phases/phase-10-software-stack.md) | Future | Assembler, VM, compiler, integrated debugger |
| [11](phases/phase-11-components.md) | Future | Built-in component browser and library |
| [12](phases/phase-12-backend.md) | Future | Backend, sharing, collaboration |
| [13](phases/phase-13-deployment-production.md) | Future | Production deployment and monitoring |
| [14](phases/phase-14-security-privacy.md) | Future | Security and privacy hardening |
| [15](phases/phase-15-authentication.md) | Future | Better Auth integration |
| [16](phases/phase-16-api-ecosystem.md) | Future | Developer API ecosystem |
| [17](phases/phase-17-mobile-touch.md) | Future | Mobile and touch workflows |
| [18](phases/phase-18-advanced-collaboration.md) | Future | Advanced collaboration |
| [19](phases/phase-19-analytics-insights.md) | Future | Analytics and learning insights |
| [20](phases/phase-20-accessibility-i18n.md) | Future | Accessibility and internationalization |
| [21](phases/phase-21-advanced-performance-pwa.md) | Future | PWA and offline support |
| [22](phases/phase-22-public-website.md) | Future | Public website and documentation platform |
| [23](phases/phase-23-docs-automation.md) | Future | Documentation automation |
| [24](phases/phase-24-ai-code-review.md) | Future | AI-assisted review and quality gates |

## Dependency Rules

- Finish Phase 0.5 before expanding into Projects 2-3.
- Finish Phase 0.6 before Projects 4-5.
- Revisit core/plugin/API architecture after the Hack computer path is coherent.
- Treat selected infrastructure as maintenance work, not as unstarted roadmap scope.
- Keep `README.md`, `REPO_MAP.md`, `.cursorrules`, and [implementation.md](implementation.md) aligned whenever a phase boundary changes.

## Definition of Done

Before work is complete, all required gates must pass:

```bash
pnpm run lint
pnpm run test:run
pnpm run test:e2e:store
pnpm run build
```
