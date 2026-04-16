# Chunk 10: Phase F — Polish + PR open (commit 6)

> Spec ref: [`Phase F — Final polish`](../../specs/2026-04-17-design-system-migration-design.md#phase-f--final-polish-commit-6)

**Goal:** Finalize the branch with no functional changes — dependency audit, dead code sweep, documentation updates, PR description, and PR open.

**Skills to invoke:** `verification-before-completion`, `code-review`, `finishing-a-development-branch`.

---

## Tasks

### Task 1: Dependency audit

- [ ] **Step 1.1: Confirm zero Ant references in source**

```bash
rg "from ['\"]antd['\"]|from ['\"]@ant-design" src/ e2e/
```

Expected: zero matches.

- [ ] **Step 1.2: Confirm zero Ant references in package.json**

```bash
rg "antd|@ant-design" package.json
```

Expected: zero matches.

- [ ] **Step 1.3: Confirm zero leftover CSS module imports related to migration**

```bash
rg "import.*\\.module\\.css" src/components/ui/
```

Expected: zero matches in `src/components/ui/` (StatusBar's CSS module deleted in chunk 7). Other CSS module usage in the repo is unrelated and OK.

- [ ] **Step 1.4: Audit unused dependencies**

```bash
pnpm dlx knip --no-progress 2>&1 | head -40
```

(If `knip` not configured, do a manual eyeball pass over `package.json` checking each dep is consumed somewhere via `rg "from ['\"]<dep-name>['\"]" src/`.)

Remove any unused dep with `pnpm remove <name>`.

---

### Task 2: Dead code sweep

- [ ] **Step 2.1: Confirm all expected deletions stuck**

```bash
ls src/App.css 2>/dev/null && echo "FAIL: App.css still exists"
ls src/index.css 2>/dev/null && echo "FAIL: index.css still exists"
ls src/components/ui/handlers/ 2>/dev/null && echo "WARN: ui/handlers/ still exists"
ls src/components/ui/Sidebar.tsx 2>/dev/null && echo "FAIL: Sidebar.tsx still exists"
ls src/components/ui/GateSelector.tsx 2>/dev/null && echo "FAIL: GateSelector.tsx still exists"
ls src/components/ui/NodeSelector.tsx 2>/dev/null && echo "FAIL: NodeSelector.tsx still exists"
ls src/components/ui/NodeRenameControl.tsx 2>/dev/null && echo "FAIL: NodeRenameControl.tsx still exists"
ls src/theme/ThemeProvider.tsx 2>/dev/null && echo "FAIL: theme/ThemeProvider still exists"
ls src/components/ui/StatusBar.module.css 2>/dev/null && echo "FAIL: StatusBar.module.css still exists"
echo "Sweep done."
```

Expected: only "Sweep done." prints. Any FAIL means a chunk left a deletion incomplete — fix before continuing.

- [ ] **Step 2.2: Verify no orphan imports**

```bash
rg "from ['\"]@/components/ui/Sidebar['\"]|from ['\"]@/components/ui/GateSelector['\"]|from ['\"]@/components/ui/NodeSelector['\"]|from ['\"]@/components/ui/NodeRenameControl['\"]|from ['\"]@/theme/ThemeProvider['\"]" src/
```

Expected: zero matches.

---

### Task 3: Documentation updates

- [ ] **Step 3.1: Update `REPO_MAP.md`**

In the `### Current Structure (Phase 0.25 - Complete, Phase 0.5 - In Progress)` block:
- Update `src/components/ui/` description: now houses `CompactToolbar.tsx`, `RightActionBar.tsx`, `PropertiesPanel/`, `HelpBar/`, `KeyboardShortcutsModal/`, `StatusBar.tsx`, `DemoOverlay.tsx`, `coming-soon.tsx`, `icons/GateGlyphs.tsx`
- Add `src/components/ui-kit/` (shadcn primitives — Button, Tooltip, Popover, etc.)
- Add `src/components/canvas/hooks/` (`useThemeColor.ts`)
- Add `src/lib/` (now contains `notify.ts`, `utils.ts`, `demoTour.ts`)
- Add `src/styles/` (`globals.css`)
- Note removal of `src/theme/` (or what remains of it)
- Update `### Architecture Evolution` "Phase 0.25" UI Framework line: change `Ant Design components` → `shadcn/ui (Radix + Tailwind v4) components`

- [ ] **Step 3.2: Update `HACER_LLM_GUIDE.md`**

Replace any Ant Design patterns (Layout/Sider/Button/Space/Typography/Tooltip/Switch/message) with shadcn equivalents. Document new patterns:
- `notify.success/info/error/warning(...)` from `@/lib/notify`
- `useSelectedElement()` from `@/components/ui/PropertiesPanel/useSelectedElement`
- `useThemeColor('--var-name')` from `@/components/canvas/hooks/useThemeColor` for R3F materials
- `<ComingSoon><Button ...>...</Button></ComingSoon>` for stubbed UI surfaces
- shadcn primitives live under `@/components/ui-kit/...`; HACER shells live under `@/components/ui/...`

- [ ] **Step 3.3: Update `.cursorrules` Stack section**

Change:
> Stack: React 19 + React Compiler (NO manual memoization), TypeScript 5.9 strict, Zustand (NOT Valtio), React Three Fiber, Vitest + Playwright.

to (or similar):

> Stack: React 19 + React Compiler (NO manual memoization), TypeScript 5.9 strict, Zustand (NOT Valtio), React Three Fiber, Tailwind CSS v4 + shadcn/ui (NOT Ant Design), Sonner toasts via `notify` helper, next-themes tri-state, Vitest + Playwright.

- [ ] **Step 3.4: Update `tasks/lessons.md`**

Add a new entry capturing the migration lesson:

```md
### [2026-04-17] - Strip incompatible CSS-in-JS systems before installing the replacement

**What happened**: A prior incremental Ant Design \u2192 Tailwind/shadcn migration plan
(deleted in 4d691ab) failed because the two styling systems produce visual conflicts
when both render to the same screen.
**Rule**: When migrating between visually-incompatible CSS systems (Ant Design \u2194 Tailwind,
styled-components \u2194 emotion, etc.), strip the old system fully BEFORE installing the new
one. Accept an interim WIP state where the app is unstyled but functionally driveable.
**Context**: docs/specs/2026-04-17-design-system-migration-design.md \u00a72 (Phase A)
```

- [ ] **Step 3.5: Update `docs/typescript-guidelines.md` if it references Ant patterns**

Grep for `antd` in the file; replace any code examples with shadcn equivalents.

---

### Task 4: Draft PR description

- [ ] **Step 4.1: Create `docs/PR-DRAFT.md` (gitignored or deleted before merge)**

```md
# Migrate UI shell from Ant Design to shadcn/ui + Tailwind v4

## Summary

Replaces HACER's Ant Design UI shell with a pixel-perfect implementation of
the design defined in `design-system/`. The 3D scene continues unchanged
aside from color/grid retokenization.

- **Strip-first vertical slice** in a single PR. No coexistence on `main`.
- **Tri-state theme** (light / dark / system); 2D shell + 3D scene flip
  cohesively.
- **All existing capabilities preserved**: gate placement (all 7 types),
  I/O placement, junction placement, wiring, simulation, axes toggle,
  delete, clear, node rename (absorbed into PropertiesPanel), status
  messages, demo overlay.
- **30+ `message.*` calls** swapped 1:1 to a `notify` helper backed by
  Sonner.
- **Phase 0.5 panels** (HDLEditor, TestResults, Pinout, ChipDefinition,
  ChipWorkflowBrowser) explicitly out of scope; designed in a follow-up.

## Visual evidence

[Insert side-by-side screenshots: HACER vs design-system showcase, both
themes, each shell component.]

## Migration scope

\u2705 In:
- CompactToolbar (left rail, all 7 gates)
- RightActionBar (Info drawer wired to store; Layers/History stubbed)
- PropertiesPanel (selection-driven; I/O rename absorbed)
- HelpBar + KeyboardShortcutsModal (contextual hints + ? key)
- StatusBar (restyled, store binding preserved)
- DemoOverlay (rebuilt with Card primitive + Lucide X)
- ThemeProvider (next-themes tri-state)
- Sonner toasts via notify helper
- R3F retokenized (canvas-bg, canvas-grid, primary, foreground, etc.)

\u23ed Coming soon (stubbed with tooltip):
- Layers panel
- History panel + Undo/Redo
- Find / Cmd+F
- Fit-to-View
- Quick Actions: Export Circuit, Import Circuit, Generate Truth Table
- PropertiesPanel: Color, Position editor, Rotation +90 (verify if trivial),
  Default Value (input nodes), Duplicate
- Settings

\u274c Out of scope (separate brainstorms):
- Phase 0.5 panels (HDLEditor, TestResults, Pinout, ChipDefinition,
  ChipWorkflowBrowser)
- Automated visual regression (Playwright toHaveScreenshot)
- Plankton/Stryker tuning for new surface

## Test coverage

- 8 `@ui` Playwright specs ported to new selectors with `data-testid`
  discipline
- 6 new `@ui` specs covering theme toggle, PropertiesPanel, node rename via
  PropertiesPanel, RightActionBar Info, Coming soon regression, keyboard
  shortcuts modal
- All `@store` specs untouched and green
- Unit test count: \u2206 from baseline = (added shell tests) - (deleted Ant
  component tests). New tests added: notify, theme-provider,
  useThemeColor, useContextMode, useSelectedElement, ComingSoon,
  CompactToolbar, RightActionBar, PropertiesPanel, HelpBar,
  KeyboardShortcutsModal, DemoOverlay (12 new test files).

## Performance delta

- Bundle size: [measure before/after with `pnpm build` size output]
- Cold-load TTI: [measure if available via Lighthouse]
- Expected: net negative bundle (Ant ~750 KB removed; Tailwind+Radix
  +Sonner ~150 KB added).

## Breaking changes

None for downstream consumers. Store API unchanged. `@store` E2E
unchanged.

## Follow-up tickets to file

- [ ] Wire Phase 0.5 panels (HDLEditor, TestResults, Pinout,
      ChipDefinition, ChipWorkflowBrowser) into new shell
- [ ] Implement undo/redo (replace History panel stub)
- [ ] Implement layers (replace Layers panel stub)
- [ ] Implement gate duplication (replace Duplicate stub)
- [ ] Implement Export/Import circuit
- [ ] Implement Truth table generator
- [ ] Implement Find / Cmd+F
- [ ] Implement Fit-to-View
- [ ] Implement gate color customization
- [ ] Implement gate position editor in PropertiesPanel
- [ ] Wire Rotate +90 button in PropertiesPanel (if not already done)
- [ ] Wire Default Value toggle for input nodes
- [ ] Add automated visual regression baselines
- [ ] Brainstorm spec for Phase 0.5 panel slots in new shell

## Refs

- Spec: docs/specs/2026-04-17-design-system-migration-design.md
- Plan: docs/plans/2026-04-17-design-system-migration.md
```

---

### Task 5: Final verification

- [ ] **Step 5.1: Invoke `verification-before-completion` skill**

Re-read the skill, then execute:

```bash
pnpm run lint
pnpm run test:run
pnpm run test:e2e:store
pnpm run test:e2e:ui
pnpm run build
pnpm run preview              # smoke; open localhost preview
```

All green. Open the preview URL, confirm light + dark themes both render correctly.

- [ ] **Step 5.2: Invoke `code-review` skill**

Re-read the skill, run its full checklist over the branch's diff.

---

### Task 6: Commit polish + push branch

- [ ] **Step 6.1: Stage and commit**

```bash
git add -A
git status                    # final review

git commit -m "$(cat <<'EOF'
docs: update REPO_MAP, .cursorrules, HACER_LLM_GUIDE, lessons for shadcn migration

REPO_MAP gains src/components/ui-kit/ (shadcn primitives) and
src/components/canvas/hooks/ entries. .cursorrules Stack updated to
reference Tailwind v4 + shadcn/ui. HACER_LLM_GUIDE replaces Ant patterns
with shadcn/notify/useThemeColor patterns. tasks/lessons.md captures the
strip-before-install rule.

Adds docs/PR-DRAFT.md (gitignored or removed before merge) with
migration scope, follow-up ticket list, and visual evidence placeholder.

Closes the migration branch. Ready for PR open via finishing-a-development-branch.

Refs: docs/plans/2026-04-17-design-system-migration/10-phase-f-polish.md
EOF
)"
```

- [ ] **Step 6.2: Push the branch**

```bash
git push -u origin feat/design-system-migration
```

---

### Task 7: Open the PR

- [ ] **Step 7.1: Invoke `finishing-a-development-branch` skill**

Read the skill; follow its decision tree to choose merge / PR / cleanup.

- [ ] **Step 7.2: Open PR via `gh pr create`**

```bash
gh pr create \
  --title "Migrate UI shell from Ant Design to shadcn/ui + Tailwind v4" \
  --body "$(cat docs/PR-DRAFT.md)"
```

- [ ] **Step 7.3: Attach screenshots**

Take side-by-side screenshots (light + dark, each shell) and attach as PR comments or inline in the description.

- [ ] **Step 7.4: File the follow-up tickets**

For each item in the "Follow-up tickets to file" list in the PR description:

```bash
gh issue create --title "<title>" --body "<details>"
```

- [ ] **Step 7.5: Delete `docs/PR-DRAFT.md` before merge**

Either via `.gitignore` add OR commit a deletion to the branch before the merge button is clicked.

---

## Definition of done (per spec §6 final checklist)

- [ ] All four CI mandatory gates green (`lint`, `test:run`, `test:e2e:store`, `build`)
- [ ] `test:e2e:ui` green (no skipped specs from this migration)
- [ ] `rg "from ['\"]antd"` returns zero
- [ ] Side-by-side visual comparison with design-system showcase shows pixel-equivalent output in both themes
- [ ] Every existing pre-migration HACER capability is reachable through the new shell
- [ ] Every new-design surface without backing logic shows a "Coming soon" tooltip
- [ ] Bundle size measurably smaller than pre-migration baseline
- [ ] Documentation updated (REPO_MAP, HACER_LLM_GUIDE, .cursorrules, lessons.md)
- [ ] Follow-up tickets filed for every "Coming soon" stub
- [ ] PR description includes screenshots and migration checklist

Update todo list. Mark all chunks complete. Migration done.

---

## Migration complete

This is the final chunk. The branch is ready for review and merge.
