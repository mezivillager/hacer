# Documentation Refresh Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use Superpowers **`subagent-driven-development`** or **`executing-plans`** (exact invocation name depends on your harness; in Cursor Claude Code parity plugins the names are commonly prefixed like `superpowers:subagent-driven-development` — map to the equivalent skill in your environment).

> **Outcome:** `scripts/check-docs-truth.sh` and `pnpm run docs:check` were **removed**. Ant Design and Storybook are not dependencies anymore; an automated grep guard added CI/local friction without enough benefit. **Skip Task 1** — it is a one-line stub. Node 22 alignment and substantive documentation edits remain valid.

**Goal:** Bring HACER's living documentation back into alignment with the current codebase and remove de-scoped Storybook guidance from active docs.

**Architecture:** Treat `package.json`, active source paths, active workflows, and current tests as the source of truth. Update living docs and active Phase 0.5 ticket docs; preserve historical migration plans/specs as archival records unless they are still used as current agent guidance. **Unify GitHub Actions on the same Node major as local `.nvmrc`** so “supported runtime” is not release-only.

**Convention — shell commands:** Run the commands exactly as shown (e.g. `pnpm`, `git`). Do not prefix with sandbox wrappers (`rtk`, etc.) unless your local harness requires it; those prefixes are intentionally omitted here for copy-paste compatibility.

**Tech Stack:** React 19.2, TypeScript 5.9, Vite 8, Zustand 5, React Three Fiber 9, Three 0.183, Tailwind CSS v4, shadcn/ui primitives in `src/components/ui-kit/` (Radix primitives via `@radix-ui/react-*`; the umbrella `radix-ui` package may also appear in `package.json`), Sonner, next-themes, Vitest 4, Playwright 1.57, Stryker, semantic-release.

---

## Current Truth Snapshot

Use these facts to resolve documentation conflicts:

| Area | Current repo truth |
|------|--------------------|
| UI stack | Tailwind CSS v4 + shadcn/ui-style primitives in `src/components/ui-kit/`, Radix UI, lucide-react icons, Sonner via `@/lib/notify`, next-themes tri-state theme provider |
| Removed UI stack | No `antd`, no `@ant-design/icons`, no Ant Design source imports |
| Component shell | `CompactToolbar`, `RightActionBar`, `PropertiesPanel`, `HelpBar`, `KeyboardShortcutsModal`, `StatusBar`, `DemoOverlay` |
| Design reference | `design-system/` exists as a reference/source for the shadcn migration, while copied primitives live in `src/components/ui-kit/` |
| Release | `.releaserc.json`, `commitlint.config.js`, `.github/workflows/release.yml`, `docs/semantic-release.md`, and `CHANGELOG.md` exist; semantic-release is already installed |
| Storybook | No `.storybook/`, no Storybook scripts, no Storybook packages; remove it from active scope |
| Testing | Vitest, Playwright, Stryker, CI, scheduled UI E2E exist; `fast-check`, Prettier, and Zod are not installed |
| Runtime | Align **all** workflows (CI, mutation, scheduled UI E2E, deploy, PR preview — not only release) plus `.nvmrc` and `package.json` `engines` on **Node 22**. Today `release.yml` is already on 22 while other workflows and `.nvmrc` still say 20. Vitest/jsdom startup is clean on Node 22; under Node 20, `html-encoding-sniffer@6` may fail while requiring ESM-only `@exodus/bytes`. |
| Phase 0.5 complete code | P05-01 through P05-06, P05-08, and P05-09 have code evidence in `src/core/chips/`, `src/core/hdl/`, `src/core/testing/`, `src/simulation/topologicalEval.ts`, node rename actions/UI, and `src/components/ui/StatusBar.tsx` |
| Phase 0.5 not yet present | No `PinoutPanel`, `ChipDefinitionPanel`, `HDLEditor`, `TestResultsPanel`, `ChipWorkflowBrowser`, `CompositeChip3D`, `BusSplitter3D`, `BusJoiner3D`, persistence action slice, HDL compiler, or test execution engine |

## Documentation Gaps Found

- `README.md` still says Ant Design is the UI library, lists old `Sidebar`/`GateSelector`/`NodeSelector` structure, says HDL parser/test script support is "coming next" even though parsers exist, lists design system and semantic-release as planned, and says `pnpm 9+` while the repo pins `pnpm@10.12.1`.
- Runtime guidance is split: `.nvmrc` and most workflows pin Node **20**, while `release.yml` uses Node **22** — inconsistent with real pass/fail behavior for current test deps under Node 20.
- `HACER_LLM_GUIDE.md` still has Ant Design scope, Ant Design import rules, Ant Design examples, and an Ant Design reference link.
- `.github/copilot-instructions.md` still tells agents to use Ant Design Message/Notification instead of `notify`.
- `REPO_MAP.md` is mostly current at the top, but still has future/current sections that mention Ant Design and the old `src/core/testing/nand2tetris/` path.
- `docs/roadmap/README.md` and `docs/roadmap/implementation.md` still present Phase 1.5 design system, Phase 2.5 Storybook, and Phase 4.5 semantic-release as future work; stack blocks mention Zustand 4, Vite 5, React Three Fiber 6, and fast-check.
- `docs/roadmap/phases/phase-1.5-design-system.md` describes an unrealized Figma-driven design-system project instead of the completed Tailwind/shadcn migration and the remaining maintenance work.
- `docs/roadmap/phases/phase-2.5-developer-tooling.md` is dominated by Storybook setup. That entire direction is de-scoped.
- `docs/roadmap/phases/phase-3.5-testing-infrastructure.md` claims fast-check/property tests/visual regression are complete, but `package.json` does not include fast-check and visual regression is not configured.
- `docs/roadmap/phases/phase-4.5-release-management.md` describes a much larger future release system with Slack and artifact publishing. The repo has a simpler working semantic-release setup.
- `docs/plans/phase-0.5-tickets-CHECKLIST.md` is stale: P05-05, P05-06, P05-08, and P05-09 are still unchecked despite code and task-review evidence.
- Active Phase 0.5 tickets P05-10, P05-13, P05-19, P05-21, P05-22, and P05-23 still include Ant Design imports or Ant Design-specific mounting guidance.
- `docs/semantic-release.md` and `docs/TESTING_SEMANTIC_RELEASE.md` need a pass against the current release workflow, current version `2.0.0`, and actual `RELEASE_TOKEN` usage.
- `tasks/todo.md` still leads with old Phase 0.5 work and should be reset to the documentation refresh while execution is underway.
- **Secondary agent surfaces:** `docs/llm-harness.md`, `docs/llm-workflow.md`, and `.cursor/AGENTS.md` were not fully audited when this plan was written; spot-check them for the same staleness signals (antd, Storybook-as-current, old stack majors, Node 20 as the recommended prerequisite).

## Automated drift checker (removed)

Originally this plan described `scripts/check-docs-truth.sh` and CI enforcement via `pnpm run docs:check`. That approach was dropped after implementation — keep docs accurate through normal review and the existing quality gates (`lint`, tests, `build`).

## File Structure

### Modify

- `.github/workflows/ci.yml` - Node 22 (documentation follows code review and existing CI gates).
- `.github/workflows/mutation.yml` - Node 22.
- `.github/workflows/e2e-ui.yml` - Node 22.
- `.github/workflows/deploy.yml` - Node 22.
- `.github/workflows/pr-preview.yml` - Node 22.
- `.nvmrc` - align local Node version with CI/release and working test runtime (22).
- `package.json` - align `engines.node` with the working test runtime (`>=22`).
- `README.md` - public status, feature list, stack, structure, and roadmap summary.
- `HACER_LLM_GUIDE.md` - replace Ant Design guidance with shadcn/ui, Tailwind, Radix, Sonner, next-themes, and current component-shell patterns.
- `.github/copilot-instructions.md` - replace Ant Design notification guidance with `notify`.
- `docs/llm-harness.md` / `docs/llm-workflow.md` / `.cursor/AGENTS.md` - only if a spot-check finds stale stack or UI-library guidance (see Task 2).
- `REPO_MAP.md` - remove stale Ant Design and old testing-path references, refresh phase sync.
- `.cursorrules` - update phase-sync date only if `docs/roadmap/implementation.md` and `REPO_MAP.md` change phase status wording.
- `docs/roadmap/README.md` - update phase navigation and quick status.
- `docs/roadmap/implementation.md` - update technology stack evolution and implementation checklist.
- `docs/roadmap/phases/phase-1.5-design-system.md` - rewrite as completed design-system migration plus maintenance scope.
- `docs/roadmap/phases/phase-2.5-developer-tooling.md` - rewrite as DX tooling without Storybook.
- `docs/roadmap/phases/phase-3.5-testing-infrastructure.md` - correct actual testing status.
- `docs/roadmap/phases/phase-4.5-release-management.md` - replace speculative release architecture with current semantic-release setup.
- `docs/plans/phase-0.5-tickets-CHECKLIST.md` - mark completed tickets and refresh evidence notes.
- `docs/plans/phase-0.5-tickets/README.md` - align status rows with checklist.
- `docs/plans/phase-0.5-tickets/P05-08.md` - mark complete and replace Ant Design feedback wording with `notify`/status feedback.
- `docs/plans/phase-0.5-tickets/P05-09.md` - mark complete and replace old layout assumptions with current `StatusBar` placement.
- `docs/plans/phase-0.5-tickets/P05-10.md` - update PinoutPanel plan to current shell patterns.
- `docs/plans/phase-0.5-tickets/P05-13.md` - update UI imports and test examples.
- `docs/plans/phase-0.5-tickets/P05-19.md` - update workflow browser UI imports and mounting plan.
- `docs/plans/phase-0.5-tickets/P05-21.md` - update HDL editor UI imports and mounting plan.
- `docs/plans/phase-0.5-tickets/P05-22.md` - update test results panel UI imports and mounting plan.
- `docs/plans/phase-0.5-tickets/P05-23.md` - update builtin toggle UI imports and test examples.
- `docs/plans/phase-0.5-tickets/P05-28.md` - update the documentation ticket to match this refresh plan.
- `docs/semantic-release.md` - reconcile with `.releaserc.json` and `.github/workflows/release.yml`.
- `docs/TESTING_SEMANTIC_RELEASE.md` - add archival/current-status note and remove first-release assumptions.
- `docs/testing/standards.md` - move fast-check/property testing wording from current status to optional future scope.
- `tasks/todo.md` - set current focus to documentation refresh execution and final review.

### Do Not Modify

- `docs/specs/2026-04-17-design-system-migration-design.md`
- `docs/plans/2026-04-17-design-system-migration.md`
- `docs/plans/2026-04-17-design-system-migration/**`
- `tasks/lessons.md` entries that describe the historical Ant Design to shadcn migration

These are historical records and should keep their original context.

---

### Task 1 (historical — skip): Automated documentation drift check

This task originally added `scripts/check-docs-truth.sh`, `pnpm run docs:check`, and CI wiring for it. **Do not implement.** Align `.nvmrc`, `package.json` engines, and workflow `node-version` fields via the substantive documentation / infra commits instead.

---

### Task 2: Refresh Root And Agent-Facing Docs

**Files:**
- Modify: `README.md`
- Modify: `HACER_LLM_GUIDE.md`
- Modify: `.github/copilot-instructions.md`
- Modify: `REPO_MAP.md`
- Modify: `.cursorrules`
- Modify (if spot-check finds drift): `docs/llm-harness.md`, `docs/llm-workflow.md`, `.cursor/AGENTS.md`

- [ ] **Step 2.1: Update `README.md` project identity and current status**

Replace the H1 with:

```markdown
# HACER (Hardware Architecture Circuit Editor and Runtime)
```

Replace the `## Current Status` body with:

```markdown
HACER is in active development. Phase 0.25 (interactive 3D circuit building) is complete, and Phase 0.5 (nand2tetris Project 1 foundation) is in progress.

Completed Phase 0.5 building blocks include the chip registry/Nand primitive, numeric node values, topological evaluation, HACK HDL parsing, Project 1 HDL fixtures, `.tst` parsing, `.cmp` parsing, node rename/name display, and status messaging. Remaining Phase 0.5 work focuses on HDL compilation, test execution, chip workflow UI, pinout/test-results panels, persistence, buses, and composite chip rendering.
```

- [ ] **Step 2.2: Update `README.md` feature lists**

Replace the `Available now` and `Coming next` lists with:

```markdown
**Available now:**
- Interactive 3D circuit canvas powered by React Three Fiber
- Tailwind/shadcn UI shell with compact toolbar, right action drawer, properties panel, help bar, status bar, and theme switching
- Real-time logic simulation with visual feedback (red = 0, green = 1)
- Grid-aligned wire routing with junctions and I/O nodes
- Gate types: NAND, AND, OR, NOT, XOR, NOR, XNOR with placement controls
- Gate movement, rotation, selection, and deletion
- Wire selection and deletion
- HACK HDL parser for Project 1 syntax
- `.tst` and `.cmp` parsers plus Project 1 fixture corpora
- Automated CI, mutation testing workflow, scheduled UI E2E, and semantic-release

**Coming next:**
- HDL compiler for runnable chip definitions
- Test execution engine that runs `.tst` scripts against `.cmp` expectations
- Chip workflow browser, chip definition panel, pinout panel, HDL editor, and test results panel
- Circuit persistence and 3D/HDL interoperability
- Multi-bit bus rendering and composite chip rendering
```

- [ ] **Step 2.3: Update `README.md` prerequisites and stack**

Change the runtime prerequisites to:

```markdown
- **Node.js** 22 or higher (`.nvmrc` provided -- run `nvm use` if you have [nvm](https://github.com/nvm-sh/nvm))
- **pnpm** 10.x (`packageManager` pins `pnpm@10.12.1`)
```

Replace the tech stack table with:

```markdown
| Technology | Purpose |
|-----------|---------|
| React 19 | UI framework |
| TypeScript 5.9 | Type safety (strict mode) |
| Vite 8 | Build tool |
| React Three Fiber 9 + Three.js | 3D rendering |
| Zustand 5 + Immer | State management |
| React Compiler | Automatic memoization |
| Tailwind CSS v4 + shadcn/ui primitives | UI styling and component primitives |
| Radix UI | Accessible headless primitives under shadcn components |
| lucide-react | Icon system |
| Sonner | Toast notifications through `@/lib/notify` |
| next-themes | Light/dark/system theme handling |
| Vitest | Unit testing |
| Playwright | E2E testing |
| Stryker | Mutation testing |
| semantic-release | Automated releases |
```

- [ ] **Step 2.4: Update `README.md` project structure**

Replace the `src/components` portion of the structure block with:

```markdown
src/
├── components/
│   ├── ui/           # HACER shell components (CompactToolbar, RightActionBar, PropertiesPanel, HelpBar, StatusBar)
│   ├── ui-kit/       # shadcn/ui-style primitives copied into the app
│   └── canvas/       # React Three Fiber 3D (Scene, Wire3D, handlers, hooks)
├── core/             # Chip registry, HDL parser, test parsers, Project 1 fixtures
├── gates/            # Gate components, icons, config, and handlers
├── nodes/            # Input, output, and junction nodes
├── simulation/       # Circuit simulation engine (pure logic)
├── store/            # Zustand state and domain-organized actions
├── hooks/            # Custom hooks (keyboard shortcuts, drag, release version)
├── lib/              # notify, utils, demo tour, GitHub release helpers
├── styles/           # Tailwind v4 globals and CSS variables
├── theme/            # Shared theme tokens consumed by canvas utilities
├── utils/            # Wiring, pathfinding, grid, hit-testing utilities
├── App.tsx           # Main application
└── main.tsx          # Entry point
```

- [ ] **Step 2.5: Update `README.md` roadmap summary**

In the roadmap tables, use these statuses for Phases 1.5 through 4.5:

```markdown
| 1.5 | Complete | Tailwind v4 + shadcn/ui shell, tokens, theme switching |
| 2.5 | Re-scoped | Developer tooling, CI, hooks, and agent harness without a separate component explorer |
| 3.5 | Partially Complete | Vitest, Playwright, Stryker, CI, and scheduled UI E2E are active; property/visual regression tooling remains unselected |
| 4.5 | Complete | semantic-release, conventional commits, changelog, release workflow |
```

- [ ] **Step 2.6: Replace Ant Design guidance in `HACER_LLM_GUIDE.md`**

Change the scope line to:

```markdown
**SCOPE**: React Three Fiber 3D components, Zustand state, Tailwind/shadcn UI, testing patterns.
```

Change the task table UI row to:

```markdown
| UI with shadcn/Tailwind | **shadcn/ui + Tailwind Usage** (search heading) |
```

Replace the old `ALWAYS` bullets for UI imports/notifications with:

```markdown
✅ Import shadcn/ui primitives from `@/components/ui-kit/<primitive>`
✅ Use lucide-react icons for tool buttons and compact controls
✅ Use `notify` from `@/lib/notify` for toast-style user feedback
```

Replace the old `NEVER` notification bullet with:

```markdown
❌ Use `console.log()` or UI-library globals for user feedback (use `notify` or store-backed status messages)
❌ Import from `antd` or `@ant-design/icons`
```

Replace the `## 🎨 Ant Design Usage` section with:

````markdown
## shadcn/ui + Tailwind Usage

HACER owns its UI primitives in `src/components/ui-kit/`. These are shadcn/ui-style files copied into the repo, not imports from a versioned `shadcn` runtime package.

```typescript
import { Button } from '@/components/ui-kit/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui-kit/tooltip'
import { notify } from '@/lib/notify'
import { Trash2 } from 'lucide-react'

export function DeleteCircuitButton() {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={() => notify.info('Delete circuit is not wired yet')}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </TooltipTrigger>
      <TooltipContent>Delete circuit</TooltipContent>
    </Tooltip>
  )
}
```

Use Tailwind classes and CSS variables from `src/styles/globals.css`. Keep HACER-owned shell components in `src/components/ui/`, and keep reusable primitives in `src/components/ui-kit/`.
````

Remove the Ant Design reference link from the resources section and add:

```markdown
- shadcn/ui: https://ui.shadcn.com/docs
- Radix UI: https://www.radix-ui.com/primitives
- Tailwind CSS v4: https://tailwindcss.com/docs
```

- [ ] **Step 2.7: Update `.github/copilot-instructions.md`**

Replace:

```markdown
- **No `console.log`** for user feedback — use Ant Design Message/Notification
```

with:

```markdown
- **No `console.log`** for user feedback — use `notify` from `@/lib/notify` or store-backed status messages
- **No Ant Design** — UI primitives live under `@/components/ui-kit/`; HACER shell components live under `@/components/ui/`
```

- [ ] **Step 2.8: Update `REPO_MAP.md` stale references**

Make these concrete replacements:

```markdown
`src/core/testing/nand2tetris/` -> `src/core/testing/`
`Ant Design UI components` -> `HACER shell UI components`
`Ant Design components` -> `shadcn/ui + Radix UI primitives`
```

Update the top phase banner:

```markdown
**Last Updated:** 2026-05-12
**Current Phase:** Phase 0.5 (In Progress)
**Completed Infrastructure:** Phase 0.25 UI/canvas, Tailwind/shadcn design shell, semantic-release
**Next Product Phase:** Phase 0.6: Arithmetic & Sequential Logic
```

- [ ] **Step 2.9: Update `.cursorrules` phase date if wording changed**

If `REPO_MAP.md` and `docs/roadmap/implementation.md` both use the new phase banner wording, update `.cursorrules` to:

```markdown
**Last Updated:** 2026-05-12
**Current Phase:** Phase 0.5 (In Progress)
**Completed Infrastructure:** Phase 0.25 UI/canvas, Tailwind/shadcn design shell, semantic-release
**Next Product Phase:** Phase 0.6: Arithmetic & Sequential Logic
```

- [ ] **Step 2.10: Quick consistency pass**

Skim the files touched in Steps 2.1–2.7 for internal consistency (terminology matches the README stack table).

- [ ] **Step 2.11: Commit root docs refresh**

Run:

```bash
git add README.md HACER_LLM_GUIDE.md .github/copilot-instructions.md REPO_MAP.md .cursorrules
git commit -m "docs: align root guides with current stack"
```

(Optional execution order: run Steps 2.12–2.13 *before* Step 2.11 if you want harness fixes in the same `git commit`; otherwise use a follow-up commit with `git add docs/llm-harness.md docs/llm-workflow.md .cursor/AGENTS.md`.)

Expected: commit succeeds when hooks pass.

- [ ] **Step 2.12: Spot-check agent harness and workflow docs**

Run a targeted scan if `rg` is available (optional):

```bash
rg -n "from ['\"]antd|from ['\"]@ant-design|Ant Design UI|Storybook|storybook|@storybook|Zustand 4|Vite 5|React Three Fiber 6|semantic-release.*[Pp]lan" \
  docs/llm-harness.md docs/llm-workflow.md .cursor/AGENTS.md || true
```

If any hit is **current** guidance (not historical context), rewrite that section to match Tasks 2.1–2.7 and the README stack table. If the files are already clean, skip edits.

- [ ] **Step 2.13: Optional lint sanity**

```bash
pnpm run lint
```

Expected: passes (documentation edits should not affect TypeScript, but confirms the tree is healthy).

---

### Task 3: Rewrite Roadmap Status Around Completed And De-Scoped Work

**Files:**
- Modify: `docs/roadmap/README.md`
- Modify: `docs/roadmap/implementation.md`
- Modify: `docs/roadmap/phases/phase-1.5-design-system.md`
- Modify: `docs/roadmap/phases/phase-2.5-developer-tooling.md`
- Modify: `docs/roadmap/phases/phase-3.5-testing-infrastructure.md`
- Modify: `docs/roadmap/phases/phase-4.5-release-management.md`

- [ ] **Step 3.1: Update roadmap phase navigation**

In `docs/roadmap/README.md`, use this active status wording for Phases 1.5 through 4.5:

```markdown
- **[Phase 1.5: Design System & Visual Consistency](phases/phase-1.5-design-system.md)** - Complete: Tailwind v4, shadcn/ui primitives, Radix, Sonner, next-themes, OKLch/HEX tokens
- **[Phase 2.5: Developer Tooling & DX](phases/phase-2.5-developer-tooling.md)** - Re-scoped: current CI, hooks, agent harness, docs checks, and local DX
- **[Phase 3.5: Testing & Quality Infrastructure](phases/phase-3.5-testing-infrastructure.md)** - Partially complete: Vitest, Playwright, Stryker, CI, scheduled UI E2E
- **[Phase 4.5: Release Management & Automation](phases/phase-4.5-release-management.md)** - Complete: semantic-release, commitlint, changelog, GitHub releases
```

In the quick navigation table, use:

```markdown
| [1.5](phases/phase-1.5-design-system.md) | Completed early | 🟠 HIGH | Tailwind/shadcn UI shell, tokens, themes |
| [2.5](phases/phase-2.5-developer-tooling.md) | Active maintenance | 🟠 HIGH | CI, hooks, agent harness |
| [3.5](phases/phase-3.5-testing-infrastructure.md) | Active maintenance | 🟠 HIGH | Vitest, Playwright, Stryker, scheduled UI E2E |
| [4.5](phases/phase-4.5-release-management.md) | Complete | 🟠 HIGH | semantic-release, commitlint, changelog, release workflow |
```

- [ ] **Step 3.2: Update `docs/roadmap/implementation.md` stack blocks**

Replace every occurrence of stale stack versions with current generalized versions:

```markdown
State:        Zustand 5 + Immer
Build:        Vite 8
3D:           React Three Fiber 9 + Drei + Three.js 0.183
Design:       Tailwind CSS v4 + shadcn/ui primitives + Radix UI + Sonner + next-themes
Testing:      Vitest 4 + Playwright 1.57 + Stryker
CI/CD:        GitHub Actions + semantic-release
```

Remove `DX: Storybook + developer tooling` and replace it with:

```markdown
DX:           Husky hooks + commitlint + docs checks + agent harness docs
```

Replace the Phase 1.5 checklist section with:

```markdown
### Phase 1.5: Design System & Visual Consistency ✅
- [x] Remove Ant Design runtime dependencies
- [x] Add Tailwind CSS v4 foundation and global tokens
- [x] Add shadcn/ui-style primitives under `src/components/ui-kit/`
- [x] Add Sonner-backed `notify` helper
- [x] Add next-themes provider with light/dark/system modes
- [x] Rebuild shell as `CompactToolbar`, `RightActionBar`, `PropertiesPanel`, `HelpBar`, `StatusBar`, and `DemoOverlay`
- [x] Retokenize React Three Fiber canvas colors
```

Replace the Phase 2.5 checklist section with:

```markdown
### Phase 2.5: Developer Tooling & DX Foundation 🔄
- [x] GitHub Actions CI workflow
- [x] Husky pre-commit hook
- [x] Conventional commit linting
- [x] Agent-facing workflow and harness docs
- [ ] Revisit formatter/tooling choices after Phase 0.5 stabilizes
```

Replace the Phase 3.5 checklist section with:

```markdown
### Phase 3.5: Testing & Quality Infrastructure Foundation 🔄
- [x] Vitest unit/integration test setup
- [x] Playwright store E2E setup
- [x] Scheduled Playwright UI workflow
- [x] Stryker mutation workflow for PRs touching `src/`
- [x] Testing standards and templates in `docs/testing/`
- [ ] Decide whether property-based testing belongs in this repo before adding a dependency
- [ ] Decide whether screenshot visual regression belongs in regular CI or scheduled-only checks
```

Replace the Phase 4.5 checklist section with:

```markdown
### Phase 4.5: Release Management & Automation Foundation ✅
- [x] semantic-release dependencies installed
- [x] `.releaserc.json` configured for `main`, `beta`, and `alpha`
- [x] `commitlint.config.js` configured for Conventional Commits
- [x] `.github/workflows/release.yml` runs lint, tests, build, and release
- [x] `CHANGELOG.md` generated by release automation
- [x] `docs/semantic-release.md` explains the workflow and `RELEASE_TOKEN`
```

- [ ] **Step 3.3: Replace `phase-1.5-design-system.md` with a current-state phase**

Keep the title, then replace the body with this structure:

```markdown
## Overview

Phase 1.5 has been completed early through the April 2026 design-system migration. HACER now uses Tailwind CSS v4, shadcn/ui-style primitives copied into `src/components/ui-kit/`, Radix primitives, lucide-react icons, Sonner notifications, next-themes, and a compact application shell.

## Completed

- Removed `antd` and `@ant-design/icons`
- Added `components.json` for shadcn CLI placement into `src/components/ui-kit/`
- Added Tailwind v4 tokens in `src/styles/globals.css`
- Added `ThemeProvider` via `next-themes`
- Added `notify` via Sonner
- Rebuilt the shell components in `src/components/ui/`
- Preserved `design-system/` as a reference implementation

## Maintenance Scope

- Add new primitives through shadcn CLI only when a feature needs them
- Keep copied primitives in `src/components/ui-kit/`
- Keep product shell components in `src/components/ui/`
- Keep 3D-consumed color tokens compatible with Three.js; use HEX for tokens read by `THREE.Color`
- Verify UI changes with Vitest and Playwright rather than a separate component explorer

## Exit Criteria

- `rg "from ['\"]antd|from ['\"]@ant-design" src e2e` returns no matches
- `pnpm run lint` exits 0
- `pnpm run test:run` exits 0
- `pnpm run test:e2e:store` exits 0
- `pnpm run build` exits 0
```

- [ ] **Step 3.4: Replace `phase-2.5-developer-tooling.md` with current DX scope**

Replace the body with:

```markdown
## Overview

Phase 2.5 now covers the developer tooling HACER actively uses: GitHub Actions, Husky hooks, commitlint, lint-staged, agent workflow docs, and Cursor harness docs.

## In Scope

- Keep CI aligned with the definition of done
- Keep pre-commit hooks fast and useful
- Keep commit message validation aligned with semantic-release
- Keep `docs/llm-workflow.md`, `docs/llm-harness.md`, `AGENTS.md`, `.cursorrules`, and `HACER_LLM_GUIDE.md` in sync
- Add small repository-specific checks when they catch repeated drift

## Explicitly Out Of Scope

- A separate component explorer server
- A second visual documentation runtime
- Tooling that duplicates Vitest, Playwright, or the checked-in `design-system/` reference

## Current Tooling

| Tool | Status | Source |
|------|--------|--------|
| CI | Active | `.github/workflows/ci.yml` |
| Release workflow | Active | `.github/workflows/release.yml` |
| Mutation testing | Active | `.github/workflows/mutation.yml` |
| Scheduled UI E2E | Active | `.github/workflows/e2e-ui.yml` |
| Husky | Active | `.husky/` |
| commitlint | Active | `commitlint.config.js` |
| lint-staged | Active | `package.json` |
| CI gates | Active | PR CI matches definition of done (`lint`, `test:run`, `build`, `test:e2e:store`) |
```

- [ ] **Step 3.5: Correct `phase-3.5-testing-infrastructure.md`**

Replace the implementation status table with:

```markdown
| Component | Status | Details |
|-----------|--------|---------|
| Vitest | Active | Unit and integration tests colocated with source |
| Playwright store E2E | Active | `pnpm run test:e2e:store` |
| Scheduled UI E2E | Active | `.github/workflows/e2e-ui.yml` |
| Stryker mutation testing | Active | `.github/workflows/mutation.yml`, `stryker.conf.json`, `scripts/stryker-changed.sh` |
| Testing standards/templates | Active | `docs/testing/` |
| Property-based testing dependency | Not selected | No dependency is installed; decide before adding one |
| Screenshot visual regression | Not selected | UI E2E exists, but screenshot baselines are not configured |
| Coverage reporting | Available | `pnpm run test:coverage`; no hard threshold is enforced in CI |
```

- [ ] **Step 3.6: Replace speculative `phase-4.5-release-management.md` with actual release setup**

Condense the file around the current setup:

````markdown
## Overview

Phase 4.5 is complete for the current web app. HACER uses semantic-release with Conventional Commits to update `CHANGELOG.md`, `package.json`, `pnpm-lock.yaml`, git tags, and GitHub releases.

## Current Files

| File | Purpose |
|------|---------|
| `.releaserc.json` | Branches, release rules, changelog, npm version update, git commit, GitHub release |
| `commitlint.config.js` | Conventional Commit validation |
| `.github/workflows/release.yml` | Release workflow on `main`, `beta`, `alpha`, and manual dispatch |
| `docs/semantic-release.md` | Human-facing release guide |
| `CHANGELOG.md` | Generated changelog |

## Release Channels

| Branch | Channel |
|--------|---------|
| `main` | stable |
| `beta` | prerelease |
| `alpha` | prerelease |

## Verification

The release workflow runs:

```bash
pnpm run lint
pnpm run test:run
pnpm run build
pnpm exec semantic-release
```

Store E2E remains part of HACER's full local definition of done and CI quality gate.
````

- [ ] **Step 3.7: Run roadmap drift checks**

Run:

```bash
rg -n "Zustand 4\\.x|Vite 5\\.x|React Three Fiber 6\\.x|Storybook|storybook|@storybook|fast-check.*configured|fast-check implemented|Semantic release.*Planned|Implement semantic release|Design system.*Planned|node-version: ['\"]20['\"]|\"node\": \">=20\"" \
  docs/roadmap README.md package.json .github/workflows
```

Expected: **no matches** once Tasks 1–3 edits are applied (optional check if `rg` is installed locally).

- [ ] **Step 3.8: Commit roadmap refresh**

Run:

```bash
git add docs/roadmap/README.md docs/roadmap/implementation.md docs/roadmap/phases/phase-1.5-design-system.md docs/roadmap/phases/phase-2.5-developer-tooling.md docs/roadmap/phases/phase-3.5-testing-infrastructure.md docs/roadmap/phases/phase-4.5-release-management.md
git commit -m "docs(roadmap): align roadmap with current tooling"
```

Expected: commit succeeds when hooks pass.

---

### Task 4: Refresh Phase 0.5 Checklist And Active Ticket Docs

**Files:**
- Modify: `docs/plans/phase-0.5-tickets-CHECKLIST.md`
- Modify: `docs/plans/phase-0.5-tickets/README.md`
- Modify: `docs/plans/phase-0.5-tickets/P05-08.md`
- Modify: `docs/plans/phase-0.5-tickets/P05-09.md`
- Modify: `docs/plans/phase-0.5-tickets/P05-10.md`
- Modify: `docs/plans/phase-0.5-tickets/P05-13.md`
- Modify: `docs/plans/phase-0.5-tickets/P05-19.md`
- Modify: `docs/plans/phase-0.5-tickets/P05-21.md`
- Modify: `docs/plans/phase-0.5-tickets/P05-22.md`
- Modify: `docs/plans/phase-0.5-tickets/P05-23.md`
- Modify: `docs/plans/phase-0.5-tickets/P05-28.md`

- [ ] **Step 4.1: Update the Phase 0.5 checklist review banner**

In `docs/plans/phase-0.5-tickets-CHECKLIST.md`, replace the review notes with:

```markdown
**Last reviewed:** 2026-05-12 — checkboxes below match current code paths observed in this working tree.

**Verified this pass:** P05-01 `src/core/chips/`; P05-02 numeric `Pin.value`, `InputNode.value`, `OutputNode.value`; P05-03 `src/simulation/topologicalEval.ts`; P05-04 `src/core/hdl/`; P05-05 `src/core/testing/tstParser.ts`; P05-06 `src/core/testing/cmpParser.ts`; P05-08 node rename actions/UI/3D labels; P05-09 `src/components/ui/StatusBar.tsx`.
```

- [ ] **Step 4.2: Mark completed Phase 0.5 tickets**

In the checklist and index, mark these rows complete:

```markdown
- [x] **P05-05** — TST parser — [P05-05.md](./phase-0.5-tickets/P05-05.md)
- [x] **P05-06** — CMP parser — [P05-06.md](./phase-0.5-tickets/P05-06.md)
- [x] **P05-08** — Node rename + name display — [P05-08.md](./phase-0.5-tickets/P05-08.md)
- [x] **P05-09** — StatusBar component — [P05-09.md](./phase-0.5-tickets/P05-09.md)
```

Keep P05-10 and later unchecked unless code exists in `src/`.

- [ ] **Step 4.3: Add completion notes to P05-08 and P05-09**

At the top of `P05-08.md`, add:

```markdown
> **Status:** Complete in current code. Evidence: `renameInputNode`/`renameOutputNode` in `src/store/actions/nodeActions/nodeActions.ts`, properties-panel rename UI, 3D node labels, and `e2e/specs/wiring/node-rename.store.spec.ts`.
```

Replace "Ant Design feedback patterns" with:

```markdown
Validation feedback must be visible through the current UI path using `notify` and/or store-backed status messages.
```

At the top of `P05-09.md`, add:

```markdown
> **Status:** Complete in current code. Evidence: `src/components/ui/StatusBar.tsx`, `src/store/actions/statusActions/`, and `StatusBar` mounted in `src/App.tsx`.
```

Replace the old layout assumption with:

```markdown
The StatusBar is mounted as an absolute overlay in `App.tsx` and uses Tailwind/shadcn styling. It is not an Ant Design layout footer.
```

- [ ] **Step 4.4: Update P05-10 PinoutPanel plan for current shell**

Replace old mounting/import guidance in `P05-10.md` with:

```markdown
The PinoutPanel should use the current shell:

- Mount as a `RightActionBar` drawer panel or as a dedicated `PropertiesPanel` section, based on which interaction is more ergonomic for selected chips/nodes.
- Use primitives from `@/components/ui-kit/`.
- Use lucide-react icons where icon buttons are needed.
- Use `notify` for transient validation feedback and `statusActions` for persistent simulation/test status.
```

Replace Ant Design imports with:

```typescript
import { Button } from '@/components/ui-kit/button'
import { Separator } from '@/components/ui-kit/separator'
```

Replace Ant Design test mocks with real primitive rendering. If a mock is required, mock only HACER-owned modules:

```typescript
vi.mock('@/lib/notify', () => ({
  notify: {
    error: vi.fn(),
    info: vi.fn(),
    success: vi.fn(),
    warning: vi.fn(),
  },
}))
```

- [ ] **Step 4.5: Update remaining Phase 0.5 UI ticket imports**

Make these replacements:

```markdown
P05-13.md:
`import { Button } from 'antd'`
->
`import { Button } from '@/components/ui-kit/button'`

P05-19.md:
`import { Button, Divider, List, Typography } from 'antd'`
->
`import { Button } from '@/components/ui-kit/button'
import { Separator } from '@/components/ui-kit/separator'
import { ScrollArea } from '@/components/ui-kit/scroll-area'`

P05-21.md:
`import { Tabs } from 'antd'`
->
`import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui-kit/tabs'`

P05-22.md:
`import { Button, Typography } from 'antd'`
->
`import { Button } from '@/components/ui-kit/button'`

P05-23.md:
`import { Switch, Typography } from 'antd'`
->
`import { Switch } from '@/components/ui-kit/switch'`
```

Remove every `vi.mock('antd', ...)` block from those files and replace it with either no mock or the `notify` mock shown in Step 4.4.

- [ ] **Step 4.6: Update Phase 0.5 mounting guidance**

Where active ticket docs mention old sidebar/layout patterns, replace them with:

```markdown
Mount new Phase 0.5 panels into the existing shell:

- Primary tools belong in `CompactToolbar` only when they are mode/tool activators.
- Inspectors and secondary panels belong in `RightActionBar` drawer panels.
- Selection-specific fields belong in `PropertiesPanel`.
- Persistent status belongs in `StatusBar` via `statusActions`.
- Compact help copy belongs in `HelpBar` or `KeyboardShortcutsModal`.
```

- [ ] **Step 4.7: Refresh P05-28 documentation ticket**

Replace its current scope summary with:

```markdown
P05-28 captures completed Phase 0.5 state after implementation lands. The documentation refresh in `docs/superpowers/plans/2026-05-12-documentation-refresh.md` handles current truth debt before the rest of Phase 0.5 resumes. When P05-28 executes, it should update user-facing chip-building docs, not repeat the stack/tooling cleanup.
```

- [ ] **Step 4.8: Run Phase 0.5 doc scan**

Run:

```bash
rg -n "from ['\"]antd|from ['\"]@ant-design|vi\\.mock\\(['\"]antd|Ant Design's|Ant Design UI|Ant Design based|Antd mock|Layout\\.Sider|Import from `antd`|Ant Design Message/Notification" docs/plans/phase-0.5-tickets docs/plans/phase-0.5-tickets-CHECKLIST.md
```

Expected: the `rg` command returns no matches once ticket edits land (optional if `rg` is installed).

- [ ] **Step 4.9: Commit Phase 0.5 docs refresh**

Run:

```bash
git add docs/plans/phase-0.5-tickets-CHECKLIST.md docs/plans/phase-0.5-tickets/README.md docs/plans/phase-0.5-tickets/P05-08.md docs/plans/phase-0.5-tickets/P05-09.md docs/plans/phase-0.5-tickets/P05-10.md docs/plans/phase-0.5-tickets/P05-13.md docs/plans/phase-0.5-tickets/P05-19.md docs/plans/phase-0.5-tickets/P05-21.md docs/plans/phase-0.5-tickets/P05-22.md docs/plans/phase-0.5-tickets/P05-23.md docs/plans/phase-0.5-tickets/P05-28.md
git commit -m "docs(phase-0.5): refresh ticket status and UI guidance"
```

Expected: commit succeeds when hooks pass.

---

### Task 5: Refresh Release, Testing, And Task-Tracking Docs

**Files:**
- Modify: `docs/semantic-release.md`
- Modify: `docs/TESTING_SEMANTIC_RELEASE.md`
- Modify: `docs/testing/standards.md`
- Modify: `tasks/todo.md`

- [ ] **Step 5.1: Correct `docs/semantic-release.md` workflow details**

Update the automatic release process section so it matches `.github/workflows/release.yml`:

```markdown
The release workflow runs on pushes to `main`, `beta`, and `alpha`, plus manual dispatch. It installs dependencies, runs `pnpm run lint`, `pnpm run test:run`, and `pnpm run build`, configures the release bot git identity, then runs `pnpm exec semantic-release`.

The workflow checks out with `secrets.RELEASE_TOKEN`, because protected branches may reject pushes from the default token. `GITHUB_TOKEN` for semantic-release is also set to `secrets.RELEASE_TOKEN`.
```

Add this definition-of-done note:

```markdown
The release workflow verifies lint, unit tests, and build. HACER's local definition of done remains stricter and also requires `pnpm run test:e2e:store`.
```

- [ ] **Step 5.2: Archive or update `docs/TESTING_SEMANTIC_RELEASE.md`**

Add this note immediately below the title:

```markdown
> **Current status (2026-05-12):** semantic-release is already active and the package version is `2.0.0`. This document is retained as historical setup verification. Use `docs/semantic-release.md` for current release operations.
```

Replace the first-release expectation section with:

````markdown
### Current Verification

Use these checks when release automation changes:

```bash
pnpm exec semantic-release --dry-run
pnpm run lint
pnpm run test:run
pnpm run build
```

For HACER's full local definition of done, also run:

```bash
pnpm run test:e2e:store
```
````

- [ ] **Step 5.3: Move fast-check language out of current testing status**

In `docs/testing/standards.md`, replace current fast-check recommendations with this framing:

```markdown
## Property-Based Testing

Property-based testing is not currently configured in HACER. Do not import `fast-check` or add property tests until the dependency and CI cost are approved for a specific feature.

When approved, property tests should focus on pure functions such as HDL parsing, bus bit operations, wire routing invariants, and serialization round-trips.
```

Keep any existing examples only under a heading named:

```markdown
### Candidate Pattern For A Future Property-Testing Decision
```

- [ ] **Step 5.4: Reset `tasks/todo.md` current focus**

Replace the top current-focus section with:

```markdown
# Current focus

## In Progress: Documentation truth refresh (2026-05-12)

- [ ] Refresh root and agent-facing docs
- [ ] Refresh roadmap phase status
- [ ] Refresh Phase 0.5 checklist and ticket docs
- [ ] Refresh release/testing docs
- [ ] Run full HACER definition of done (`lint`, tests, store E2E, `build`)

### Review

- Pending completion.
```

Move older completed Phase 0.5 entries below this section without deleting their review notes.

- [ ] **Step 5.5: Run release/testing doc scan**

Run:

```bash
rg -n "first version:|Expected first version|fast-check.*configured|fast-check implemented|Property Tests.*Complete|Semantic release.*Planned|Implement semantic release" docs/semantic-release.md docs/TESTING_SEMANTIC_RELEASE.md docs/testing docs/roadmap
```

Expected: **no stale matches** (optional if `rg` is installed).

- [ ] **Step 5.6: Commit release/testing/task docs**

Run:

```bash
git add docs/semantic-release.md docs/TESTING_SEMANTIC_RELEASE.md docs/testing/standards.md tasks/todo.md
git commit -m "docs: refresh release testing and task tracking"
```

Expected: commit succeeds when hooks pass.

---

### Task 6: Full Verification

**Files:**
- Optionally modify: `tasks/todo.md` — short verification notes when wrapping the refresh branch.

- [ ] **Step 6.1: Run lint**

```bash
pnpm run lint
```

- [ ] **Step 6.2: Run unit tests**

```bash
pnpm run test:run
```

- [ ] **Step 6.3: Run store E2E tests**

```bash
pnpm run test:e2e:store
```

Expected: exit code 0. If Playwright opens an HTML reporter during debugging, rerun with `-- --reporter=line`, then run the command above again before completion.

- [ ] **Step 6.4: Run build**

```bash
pnpm run build
```

- [ ] **Step 6.5 (optional): Record verification in `tasks/todo.md`**

Example review bullets:

```markdown
- Updated root, agent-facing, roadmap, Phase 0.5, release, and testing docs against the current codebase.
- Verified:
  - `pnpm run lint` (pass)
  - `pnpm run test:run` (pass)
  - `pnpm run test:e2e:store` (pass)
  - `pnpm run build` (pass)
```

---

### Task 7: Self-Review And Final Diff Check

**Files:**
- No edits unless the checks reveal a missed stale reference.

- [ ] **Step 7.1: Check git status**

Run:

```bash
git status --short
```

Expected: no unstaged changes. If intended staged changes remain because an earlier commit was blocked, commit them with the messages from the relevant task after verification passes.

- [ ] **Step 7.2: Review the complete diff**

Prefer a **merge-base diff** so the number of commits on the branch does not matter (replace `main` with your default branch if needed):

```bash
BASE=$(git merge-base HEAD main 2>/dev/null || git merge-base HEAD origin/main)
git log --oneline "${BASE}"..HEAD
git diff "${BASE}"...HEAD -- \
  README.md HACER_LLM_GUIDE.md REPO_MAP.md .cursorrules \
  .github/copilot-instructions.md .github/workflows \
  docs/roadmap docs/plans/phase-0.5-tickets docs/plans/phase-0.5-tickets-CHECKLIST.md \
  docs/semantic-release.md docs/TESTING_SEMANTIC_RELEASE.md docs/testing/standards.md \
  docs/llm-harness.md docs/llm-workflow.md .cursor/AGENTS.md \
  package.json tasks/todo.md
```

Expected: changes match documentation and workflow/runtime alignment from this plan (no drift script).

- [ ] **Step 7.3: Final stale-reference sweep (optional)**

If `rg` is installed, optionally verify obvious stale stack strings:

```bash
rg -n "from ['\"]antd|from ['\"]@ant-design|vi\\.mock\\(['\"]antd|Ant Design's|Ant Design UI|Ant Design based|Antd mock|Layout\\.Sider|Import from \`antd\`|Ant Design Message/Notification|Storybook|storybook|@storybook|Zustand 4\\.x|Vite 5\\.x|React Three Fiber 6\\.x|pnpm\\s+9\\+|fast-check.*configured|fast-check implemented|Property Tests.*Complete|Semantic release.*Planned|Implement semantic release|Design system.*Planned|node-version: ['\"]20['\"]|\"node\": \">=20\"" \
  README.md package.json HACER_LLM_GUIDE.md REPO_MAP.md .cursorrules \
  .github/copilot-instructions.md docs/roadmap docs/testing \
  docs/semantic-release.md docs/TESTING_SEMANTIC_RELEASE.md \
  docs/plans/phase-0.5-tickets docs/plans/phase-0.5-tickets-CHECKLIST.md \
  docs/llm-harness.md docs/llm-workflow.md .cursor/AGENTS.md \
  .github/workflows \
  --glob '!docs/plans/2026-04-17-design-system-migration/**'
```

Expected: command prints nothing.

- [ ] **Step 7.4: Summarize residual documentation decisions**

Add this short section to the final handoff message:

```markdown
Residual decisions:
- Whether to add property-based testing remains unselected; docs now say so instead of claiming it is configured.
- Screenshot visual regression remains unselected; docs now distinguish scheduled UI E2E from screenshot baselines.
- Historical migration specs/plans still mention Ant Design by design; active docs no longer prescribe it.
- `docs/superpowers/**` and the frozen `2026-04-17-design-system-migration` tree may still name legacy tooling in prose during reviews; spot-check when those files change.
```

---

## Self-Review Checklist

- Spec coverage: Roadmap phases, implementation checklist, Phase 0.5 tickets, README, Copilot/agent guides, harness docs spot-check, semantic-release/testing standards, unified Node/runtime story.
- Honesty boundary: Steps that paste **replacement snippets** into long Markdown files still require a full-file read afterward for orphaned sections or duplicate headings—not every paragraph in every phase file can be enumerated here without drowning the executor.
- Type consistency: UI examples in this plan reference `@/components/ui-kit/*`, `@/lib/notify`, and `lucide-react`.

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-05-12-documentation-refresh.md`. Two execution options:

**1. Subagent-Driven (recommended)** - dispatch a fresh subagent per task, review between tasks, fast iteration

**2. Inline Execution** - execute tasks in this session using executing-plans, batch execution with checkpoints

Which approach?
