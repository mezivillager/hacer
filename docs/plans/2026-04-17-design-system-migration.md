# Design System Migration — Implementation Plan (Index)

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace HACER's Ant Design + custom CSS UI shell with a pixel-perfect implementation of the design defined in `design-system/` (shadcn/ui + Radix + Tailwind v4 + OKLch tokens + Sonner + Lucide). Keep R3F 3D scene; retokenize colors only. One PR, no coexistence with Ant Design.

**Architecture:** Strip-first vertical slice. Commit 1 deletes all Ant code in one shot (intentionally ugly intermediate state). Commit 2 lays the Tailwind/shadcn/Sonner/ThemeProvider foundation. Commits 3a–3f build each shell component with TDD and wire to the real Zustand store. Commit 4 retokens R3F materials to read CSS variables. Commit 5 restores `@ui` Playwright specs. Commit 6 polishes and prepares the PR.

**Tech Stack:** React 19 + React Compiler · TypeScript 5.9 · Vite 8 · Zustand 5 + Immer · React Three Fiber + Three.js 0.183 · Tailwind CSS v4 · shadcn/ui · Radix UI primitives · Lucide React · Sonner · `next-themes` · Geist font · Vitest 4 · Playwright 1.57.

**Spec:** [`docs/specs/2026-04-17-design-system-migration-design.md`](../specs/2026-04-17-design-system-migration-design.md)

**Branch:** `feat/design-system-migration` (fresh, off `main`, in current workspace per user preference)

---

## Pre-flight (do once, before any chunk)

- [ ] **Step P1: Verify clean working tree on main**

```bash
git status                    # must be clean
git checkout main
git pull --ff-only
```

- [ ] **Step P2: Create migration branch**

```bash
git checkout -b feat/design-system-migration
git status                    # confirm on new branch, clean
```

- [ ] **Step P3: Verify baseline CI gates green before any change**

```bash
pnpm install                  # ensure lockfile is honored
pnpm run lint                 # green
pnpm run test:run             # green
pnpm run test:e2e:store       # green
pnpm run build                # green
```

If any gate fails on `main` BEFORE we touch anything, stop and fix the baseline first. Do not start the migration on a red baseline.

- [ ] **Step P4: Read the spec**

Read `docs/specs/2026-04-17-design-system-migration-design.md` end-to-end. Confirm understanding of: rip-and-replace strategy, Phase 0.5 deferral, NodeRenameControl absorption, tri-state theme requirement, Sonner+notify pattern, the "Coming soon" tooltip discipline, the data-testid contract for Phase E.

---

## Chunks

Each chunk is one commit. Implement in order; each chunk's verification gate must be green before moving to the next. Chunk files reference the spec for context — read them together.

| # | Commit | File | Spec section |
|---|---|---|---|
| 1 | Phase A: Ant Design strip | [`01-phase-a-ant-strip.md`](./2026-04-17-design-system-migration/01-phase-a-ant-strip.md) | Phase A |
| 2 | Phase B: Tailwind/shadcn/Sonner/ThemeProvider foundation | [`02-phase-b-foundation.md`](./2026-04-17-design-system-migration/02-phase-b-foundation.md) | Phase B |
| 3 | Phase C-3a: CompactToolbar | [`03-phase-c-3a-compact-toolbar.md`](./2026-04-17-design-system-migration/03-phase-c-3a-compact-toolbar.md) | Phase C — 3a |
| 4 | Phase C-3b: RightActionBar | [`04-phase-c-3b-right-action-bar.md`](./2026-04-17-design-system-migration/04-phase-c-3b-right-action-bar.md) | Phase C — 3b |
| 5 | Phase C-3c: PropertiesPanel | [`05-phase-c-3c-properties-panel.md`](./2026-04-17-design-system-migration/05-phase-c-3c-properties-panel.md) | Phase C — 3c |
| 6 | Phase C-3d: HelpBar + KeyboardShortcutsModal | [`06-phase-c-3d-help-bar.md`](./2026-04-17-design-system-migration/06-phase-c-3d-help-bar.md) | Phase C — 3d |
| 7 | Phase C-3e + 3f: StatusBar restyle + DemoOverlay rebuild | [`07-phase-c-3e-3f-statusbar-demo-overlay.md`](./2026-04-17-design-system-migration/07-phase-c-3e-3f-statusbar-demo-overlay.md) | Phase C — 3e + 3f |
| 8 | Phase D: R3F retoken | [`08-phase-d-r3f-retoken.md`](./2026-04-17-design-system-migration/08-phase-d-r3f-retoken.md) | Phase D |
| 9 | Phase E: `@ui` Playwright restoration | [`09-phase-e-ui-spec-restoration.md`](./2026-04-17-design-system-migration/09-phase-e-ui-spec-restoration.md) | Phase E |
| 10 | Phase F: Polish + PR open | [`10-phase-f-polish.md`](./2026-04-17-design-system-migration/10-phase-f-polish.md) | Phase F |

---

## Mandatory CI gates (per HACER `AGENTS.md` §0)

Run these AFTER every chunk's commit, BEFORE starting the next chunk:

```bash
pnpm run lint                 # TypeScript + ESLint
pnpm run test:run             # Vitest unit tests
pnpm run test:e2e:store       # Playwright @store
pnpm run build                # Production build
```

`pnpm run test:e2e:ui` is `.skip`-ped in chunk 1 and remains skipped through chunk 8. Restored fully in chunk 9.

If any gate fails for a chunk, fix the failure inside that chunk's commit (or follow-up commit on the same branch). Do not move to the next chunk on a red gate.

---

## Skill invocations during execution

Per `.cursorrules` and `AGENTS.md`:

- **@tdd / @test-driven-development** — every step that adds production code must be preceded by a failing test
- **@hacer-patterns** — for store selectors, action dispatch, R3F patterns
- **@verification-before-completion** — before claiming any chunk is complete
- **@systematic-debugging** — if a step fails unexpectedly, do not propose a fix without root cause investigation
- **@code-review** — invoke before opening the PR (chunk 10)

---

## Conventions used across all chunk files

### File path format

- `Create:` — file does not exist yet
- `Modify:` — file exists; specific lines indicated where useful (`path/to/file.ts:42-60`)
- `Delete:` — file is removed in this chunk
- `Test:` — co-located test file path (e.g. `Component.test.tsx` next to `Component.tsx`)

### TDD step format

Each task uses this 5-step rhythm (skip steps that don't apply, e.g. for sweep edits):

1. **Write the failing test** — paste the complete test file or new test block
2. **Run the test, confirm it fails** — exact command + expected error message
3. **Write the minimal implementation** — paste the complete implementation
4. **Run the test, confirm it passes** — exact command + expected output
5. **Commit** — exact `git add` + `git commit` invocation with message

For sweep edits (e.g. `message.*` → `notify.*` across 30 files), the format collapses to: edit, lint, run all tests, commit.

### Commit message convention

Following HACER's existing convention (semantic-release): `type(scope): subject`. Use multi-line bodies for non-trivial commits via heredoc.

### Verification command shorthand

Each chunk file ends with a verification gate section. Re-running this between chunks is mandatory.

---

## Execution handoff

After each chunk's verification gate is green:
1. Update todo list (mark chunk complete; mark next chunk in-progress)
2. Open the next chunk file
3. Begin its first task

After chunk 10 completes, follow `finishing-a-development-branch` to open the PR.
