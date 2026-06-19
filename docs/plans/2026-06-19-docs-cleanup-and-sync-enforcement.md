# Docs Cleanup & Doc-Sync Enforcement Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove dead docs and fix stale claims across the HACER docs estate, then install an enforced mechanism that captures emergent decisions/directions (ADRs) and reconciles living docs at the end of every working session, so future sessions are never polluted by left-behind context.

**Architecture:** Two independently-mergeable parts. **Part 1 (Cleanup)** deletes the untracked zero-byte dirs and surgically corrects stale claims, reconciling status docs against the authoritative `docs/plans/phase-0.5-tickets-CHECKLIST.md` and the real `src/` tree. **Part 2 (Enforcement)** adds an ADR decision log (`docs/decisions/`), a `docs-sync` capture skill, and a Claude Code **Stop hook** (pure, unit-tested decision logic + thin I/O wrapper) that nudges/blocks once per session when code changed but no docs were touched. The hook detects work via `git status --porcelain` presence only — it does **not** grep doc contents (the repo deliberately rejected grep-CI; see Global Constraints).

**Tech Stack:** Node ≥22 ESM (`.mjs`) for the hook (no new deps), Vitest for the hook's unit tests, Markdown for ADRs/skill, JSON for `.claude/settings.json`. Bash for verification greps.

## Global Constraints

- **Runtime:** Node `>=22`; package manager `pnpm@10.12.1`. Run all commands from inside `hacer/`.
- **Definition of done (every task that touches code/config must end green):** `pnpm run lint` · `pnpm run test:run` · `pnpm run test:e2e:store` · `pnpm run build` — all exit 0.
- **TDD is the iron law:** for the hook (Part 2), write the failing test first.
- **No commits to `main`:** all work on branch `docs/cleanup-and-sync-enforcement` (Task 0).
- **Conventional commits** (semantic-release is active): use `docs:`, `chore:`, `test:`, `feat:`, `build:` prefixes.
- **Docs-sync must NOT reintroduce grep-CI:** `docs/llm-docs-sync.md` explicitly forbids "repo-wide banned-string CI checks." The Stop hook keys off git-change *presence* under `src/`/`e2e/`, never doc text content.
- **`scripts/sync-superpowers.sh` overwrites `.claude/skills/`** from upstream `obra/superpowers`, preserving only paths in its `--exclude` list (currently `hacer-patterns/`). Any new skill under `.claude/skills/` MUST be added to that exclude list or it will be clobbered (Task 8).
- **Branded ID types do NOT exist** in `src/` yet — any doc that states them as a current rule is stale and must be marked aspirational/Phase 5+.
- **Authoritative status source:** `docs/plans/phase-0.5-tickets-CHECKLIST.md`. As of this plan, **done:** P05-01..06, 08, 09, 10, 11, 13, 14. **Open:** P05-12, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 26, 27, 28, 29. (No P05-07, no P05-25.)

---

## File Structure

**Part 1 — modified (no new files):**
- Delete: `brainstorm/` (13 zero-byte files), `.temp/` (untracked scratch) — both gitignored & untracked.
- Edit: `CONTRIBUTING.md`, `docs/TESTING_SEMANTIC_RELEASE.md`, `.claude/CONSTITUTION.md`, `.github/copilot-instructions.md`, `docs/typescript-guidelines.md`, `docs/roadmap/phases/phase-24-ai-code-review.md`, `docs/roadmap/appendices.md`, `docs/plans/phase-0.5-tickets/README.md`, `tasks/todo.md`, `REPO_MAP.md`, `.claude/rules/workflow.md`, `docs/llm-integration-proposal.md`.
- Move: `docs/roadmap/phases/hacer.code-workspace` → repo root.

**Part 2 — created:**
- `docs/decisions/README.md` (index + conventions)
- `docs/decisions/0000-template.md` (ADR template)
- `docs/decisions/0001-adopt-adr-log-and-docs-sync-enforcement.md` (bootstrap ADR)
- `.claude/skills/docs-sync/SKILL.md` (capture skill)
- `scripts/hooks/docsSyncStop.logic.mjs` (pure decision logic)
- `scripts/hooks/docsSyncStop.logic.test.mjs` (unit tests)
- `scripts/hooks/docsSyncStop.mjs` (I/O wrapper)
- `.claude/settings.json` (Stop hook registration — create or merge)

**Part 2 — edited for wiring:** `vite.config.ts` (test include), `scripts/sync-superpowers.sh` (preserve skill), `docs/llm-docs-sync.md`, `AGENTS.md`, `.claude/CLAUDE.md`, `CLAUDE.md` (root pointer).

---

## Task 0: Create isolation branch

**Files:** none (git only)

- [ ] **Step 1: Create and switch to the feature branch**

Run:
```bash
cd /Users/villager/Documents/codelab/slow/hacer
git checkout -b docs/cleanup-and-sync-enforcement
```
Expected: `Switched to a new branch 'docs/cleanup-and-sync-enforcement'`

(Optional but preferred per project workflow: use the `using-git-worktrees` skill to isolate this in a worktree instead of a branch in the main checkout.)

- [ ] **Step 2: Confirm clean starting state**

Run: `git status`
Expected: `On branch docs/cleanup-and-sync-enforcement` / `nothing to commit, working tree clean` (the untracked `brainstorm/`, `.temp/`, `.stryker-tmp/` are gitignored and will not appear).

---

# PART 1 — CLEANUP

## Task 1: Delete dead, untracked scratch directories

**Files:**
- Delete: `brainstorm/` (13 × 0-byte `.md`)
- Delete: `.temp/` (4 × 0-byte `.md` + stray `console.log`, `console2.log`)

Both are listed in `.gitignore` and `git ls-files` returns nothing for them, so deletion is invisible to the repo (no tracked files removed).

- [ ] **Step 1: Verify they are untracked before deleting**

Run: `git ls-files brainstorm/ .temp/`
Expected: empty output (confirms nothing tracked is being removed).

- [ ] **Step 2: Verify the brainstorm files are all empty**

Run: `find brainstorm -name '*.md' -size +0c`
Expected: empty output (every file is 0 bytes).

- [ ] **Step 3: Delete the directories**

Run:
```bash
rm -rf brainstorm .temp
```

- [ ] **Step 4: Verify deletion and clean tree**

Run: `ls -d brainstorm .temp 2>&1; git status --porcelain`
Expected: `ls` reports both missing; `git status --porcelain` shows no changes (they were untracked/ignored).

- [ ] **Step 5: Commit (records intent even though no tracked files changed — use an allow-empty marker only if desired)**

Skip the commit if `git status` is empty (nothing tracked changed). Otherwise:
```bash
git add -A && git commit -m "chore: remove dead untracked scratch dirs (brainstorm, .temp)"
```
Note: because these dirs are gitignored, this task usually produces **no commit**. That is expected — its value is local-session hygiene. Proceed to Task 2.

---

## Task 2: Mark branded-types as aspirational (not current)

Branded types (`GateId`, `WireId`, `PinId`) are stated as present-tense rules but do not exist in `src/`. Soften all three occurrences to "Phase 5+ / aspirational."

**Files:**
- Modify: `.claude/CONSTITUTION.md:12`
- Modify: `.github/copilot-instructions.md:13`
- Modify: `docs/typescript-guidelines.md` (Branded Types section, ~L12 and ~L186-209)

- [ ] **Step 1: Fix the Constitution**

In `.claude/CONSTITUTION.md`, replace the line:
```
- **Strict TypeScript:** No `any`. Use precise, branded types (`GateId`, `WireId`, `PinId`) wherever possible. Fix type errors, do not suppress them with `@ts-ignore`.
```
with:
```
- **Strict TypeScript:** No `any`. Fix type errors; never suppress with `@ts-ignore`. Branded ID types (`GateId`, `WireId`, `PinId`) are a **Phase 5+ aspiration** — IDs are plain `string` today; do not assume branded types exist.
```

- [ ] **Step 2: Fix the Copilot instructions**

In `.github/copilot-instructions.md`, replace the line:
```
- **Types**: no `any`; use branded types (GateId, WireId, PinId) where available
```
with:
```
- **Types**: no `any`. IDs are plain `string` today; branded types (GateId, WireId, PinId) are a Phase 5+ aspiration, not yet implemented
```

- [ ] **Step 3: Flag the TypeScript guidelines Branded Types section**

In `docs/typescript-guidelines.md`, read the "Branded Types" section (~L186-209) and prepend, immediately under its heading, the line:
```
> **Status: NOT YET IMPLEMENTED (Phase 5+).** No branded types exist in `src/` today; IDs are plain `string`. This section documents the intended future convention.
```
Also adjust any earlier present-tense reference (~L12) to read "(planned, Phase 5+)".

- [ ] **Step 4: Verify the stale present-tense claims are gone**

Run:
```bash
grep -rn "branded types" .claude/CONSTITUTION.md .github/copilot-instructions.md docs/typescript-guidelines.md
```
Expected: every remaining hit is qualified with "Phase 5+", "aspiration", "planned", or "NOT YET IMPLEMENTED" — no unqualified present-tense claim.

- [ ] **Step 5: Commit**

```bash
git add .claude/CONSTITUTION.md .github/copilot-instructions.md docs/typescript-guidelines.md
git commit -m "docs: mark branded ID types as Phase 5+ aspiration (not current)"
```

---

## Task 3: Fix single-value stale literals (version, prereq, typo, phase title)

**Files:**
- Modify: `CONTRIBUTING.md:14`
- Modify: `docs/TESTING_SEMANTIC_RELEASE.md:4`
- Modify: `.claude/CONSTITUTION.md:7`
- Modify: `docs/roadmap/phases/phase-24-ai-code-review.md:1`

- [ ] **Step 1: Node prerequisite 20 → 22**

In `CONTRIBUTING.md`, replace `Node.js 20 or higher` with `Node.js 22 or higher` (matches `.nvmrc`=22, `package.json` engines `>=22`, and all CI workflows).

- [ ] **Step 2: Drop the hardcoded package version**

In `docs/TESTING_SEMANTIC_RELEASE.md`, replace the line containing `Current package version: 2.0.0` with:
```
Current package version: see `package.json` (`version` field) — do not hardcode here.
```

- [ ] **Step 3: Fix the doubled word typo**

In `.claude/CONSTITUTION.md`, replace `explicitly explicitly requested` with `explicitly requested`.

- [ ] **Step 4: Fix the mis-numbered phase title**

In `docs/roadmap/phases/phase-24-ai-code-review.md`, the first-line `#` heading mis-numbers this as "Phase 20". Change the phase number in that H1 to **24** (filename and `docs/roadmap/README.md` both say 24). Leave the rest of the title text intact.

- [ ] **Step 5: Verify**

Run:
```bash
grep -n "Node.js 22 or higher" CONTRIBUTING.md
grep -rn "2.0.0\|explicitly explicitly" docs/TESTING_SEMANTIC_RELEASE.md .claude/CONSTITUTION.md
head -1 docs/roadmap/phases/phase-24-ai-code-review.md
```
Expected: line 1 prints the Node-22 prereq; the second grep returns **no** hits; the heading shows "Phase 24".

- [ ] **Step 6: Commit**

```bash
git add CONTRIBUTING.md docs/TESTING_SEMANTIC_RELEASE.md .claude/CONSTITUTION.md docs/roadmap/phases/phase-24-ai-code-review.md
git commit -m "docs: fix stale Node prereq, hardcoded version, typo, and phase-24 title"
```

---

## Task 4: Reconcile status contradictions against the CHECKLIST

Three docs claim statuses that contradict `docs/plans/phase-0.5-tickets-CHECKLIST.md` (the authoritative tracker). Bring them in line.

**Files:**
- Modify: `docs/roadmap/appendices.md` (project-completion + file-format + benchmark tables, ~L13-64)
- Modify: `docs/plans/phase-0.5-tickets/README.md` (Status column, ~L41-50)
- Modify: `tasks/todo.md` ("Current Focus" / next-ticket pointer, ~L20-22)

- [ ] **Step 1: Reset the appendices status claims to reality**

In `docs/roadmap/appendices.md`, read the status tables (~L13-64) and correct them so they reflect Phase 0.5-in-progress instead of "everything complete":
- nand2tetris **Projects**: Project 1 → `In Progress`; Projects 2–12 → `Planned` (remove all "✅ Complete / 100%").
- **File formats**: `.hdl/.tst/.cmp` parsers → `Implemented (integration in progress)`; `.hack/.vm/.jack` → `Planned`. (Live simulation today is the primitive-gate engine; HDL/chips parse but are not yet wired — do not claim format support that isn't shipped.)
- **Benchmarks**: relabel the "✅ Achieved" column header/values to `Target` (these are goals, not measured results).

- [ ] **Step 2: Sync the ticket-index Status column**

In `docs/plans/phase-0.5-tickets/README.md`, set the Status column so it matches the CHECKLIST: **P05-10, P05-11, P05-13, P05-14 → Done** (they are currently marked TODO). Leave genuinely-open tickets (P05-12, P05-15+) as TODO.

- [ ] **Step 3: Refresh the todo pointer**

In `tasks/todo.md`, update the "Current Focus" / "next ticket" line that still names **P05-12** as next: per the CHECKLIST, the next *unblocked* open ticket is **P05-12** (Bus 3D components, needs only P05-02 ✓) — confirm this is still accurate against the CHECKLIST and correct it if a different ticket has since landed; otherwise update the surrounding "done so far" text so it no longer contradicts the CHECKLIST (which shows P05-13/14 done).

- [ ] **Step 4: Verify no "complete" contradictions remain**

Run:
```bash
grep -n "100%\|✅ Complete\|Achieved" docs/roadmap/appendices.md || echo "appendices: clean"
grep -n "P05-1[0134]" docs/plans/phase-0.5-tickets/README.md
```
Expected: appendices prints `clean` (or only legitimately-complete items like Phase 0/0.25); the P05 grep shows P05-10/11/13/14 as Done, not TODO.

- [ ] **Step 5: Run the docs-sync reviewer pass for status consistency**

Per `docs/llm-docs-sync.md` reviewer checklist, confirm `.cursorrules` banner ↔ `implementation.md` ↔ `README.md` ↔ appendices are mutually consistent (all "Phase 0.5 In Progress"). Fix any straggler.

- [ ] **Step 6: Commit**

```bash
git add docs/roadmap/appendices.md docs/plans/phase-0.5-tickets/README.md tasks/todo.md
git commit -m "docs: reconcile phase/ticket status with the Phase 0.5 checklist"
```

---

## Task 5: Update REPO_MAP.md to match the real `src/` tree

`REPO_MAP.md` omits `src/core/` (which exists), lists already-shipped modules as "Next Phase," and has two dead import examples.

**Files:**
- Modify: `REPO_MAP.md` (Current-Structure tree ~L60-112; "Next Phase" notes ~L184, L194; import examples L509 & L551; banner date L25)

- [ ] **Step 1: Confirm the real tree before editing**

Run:
```bash
ls src/core
ls src/simulation/topologicalEval.ts src/store/actions/persistenceActions 2>&1
ls src/components/ui/Sidebar.tsx src/components/ui/GateSelector.tsx 2>&1
```
Expected: `src/core` lists `chips hdl serialization testing`; `topologicalEval.ts` and `persistenceActions/` exist; `Sidebar.tsx` and `GateSelector.tsx` do **not** exist.

- [ ] **Step 2: Add `src/core/` to the Current Structure tree**

In the "Current Structure" tree (~L60-112), add the `src/core/` subtree with its four children and one-line responsibilities:
```
core/            # Pure, non-React infra
  chips/         # ChipDefinition + createChipRegistry (builtin/hdl/circuit impls)
  hdl/           # HACK HDL tokenizer + parser (parseHDL), AST types, Project-1 fixtures
  serialization/ # Versioned serialize/deserialize (wired via persistence/autosave)
  testing/       # .tst/.cmp parsers + Project-1 compatibility fixtures
```
Add a one-line note that `core/hdl` and `core/chips` are **built but not yet wired** into the live store/simulation (Phase 0.5 bridging work); only `core/serialization` is currently consumed.

- [ ] **Step 3: Move shipped modules out of "Next Phase"**

At ~L184 and ~L194, `src/simulation/topologicalEval.ts` and `src/store/actions/persistenceActions/` are listed as "Next Phase / Expected additions." Remove them from those sections and reflect them as present in the Current tree.

- [ ] **Step 4: Replace the dead import examples**

Replace the example referencing `@/components/ui/Sidebar` (~L509) and `src/components/ui/GateSelector.tsx` (~L551) with real components that exist, e.g. `@/components/ui/CompactToolbar` and `src/components/ui/PropertiesPanel/`. Verify the replacements exist:
```bash
ls src/components/ui/CompactToolbar.tsx src/components/ui/PropertiesPanel 2>&1
```

- [ ] **Step 5: Align the banner date**

At ~L25, change the "Last Updated" date so it is not older/newer-inconsistent with `.cursorrules` (set both contexts to the same date you are doing this work, `2026-06-19`).

- [ ] **Step 6: Verify dead references are gone**

Run:
```bash
grep -n "Sidebar\|GateSelector" REPO_MAP.md || echo "no dead component refs"
grep -n "src/core" REPO_MAP.md | head
```
Expected: first prints `no dead component refs`; second shows `src/core` now documented.

- [ ] **Step 7: Commit**

```bash
git add REPO_MAP.md
git commit -m "docs: sync REPO_MAP with real src/ tree (add core/, fix dead examples)"
```

---

## Task 6: Remove duplicated/superseded doc content

**Files:**
- Overwrite: `.claude/rules/workflow.md` (≈90% verbatim duplicate of `docs/llm-workflow.md`; not in any reading track)
- Modify: `docs/llm-integration-proposal.md` (add HISTORICAL banner — it's implemented/superseded)
- Move: `docs/roadmap/phases/hacer.code-workspace` → repo root (misplaced VS Code workspace file inside `phases/`)

- [ ] **Step 1: Replace the duplicate workflow doc with a pointer**

Overwrite `.claude/rules/workflow.md` entirely with:
```markdown
# LLM Workflow Orchestration

> **Moved.** This content now lives in a single canonical source to prevent drift:
> [`docs/llm-workflow.md`](../../docs/llm-workflow.md).
>
> See also: [`AGENTS.md`](../../AGENTS.md) §3 (mandatory workflow) and
> [`docs/llm-docs-sync.md`](../../docs/llm-docs-sync.md) (keeping docs aligned with code).
```

- [ ] **Step 2: Banner the implemented proposal as historical**

Insert at the very top of `docs/llm-integration-proposal.md` (above its current first line):
```markdown
> **HISTORICAL — IMPLEMENTED.** This proposal was adopted (Alternative A). The described pre-skills
> state no longer holds. For the live workflow see `AGENTS.md`, `.claude/skills/`, and
> `docs/llm-workflow.md`. Kept for provenance; do not treat as current architecture.
```

- [ ] **Step 3: Move the misplaced workspace file**

Run:
```bash
git mv docs/roadmap/phases/hacer.code-workspace ./hacer.phases.code-workspace 2>/dev/null || mv docs/roadmap/phases/hacer.code-workspace ./hacer.phases.code-workspace
```
(If it is untracked, the `mv` fallback runs. Rename avoids clobbering the existing root workspace file.)

- [ ] **Step 4: Verify**

Run:
```bash
wc -l .claude/rules/workflow.md          # now a short pointer (<15 lines)
head -1 docs/llm-integration-proposal.md # HISTORICAL banner
ls docs/roadmap/phases/*.code-workspace 2>&1 # should be gone
```
Expected: pointer file is tiny; banner present; no workspace file left in `phases/`.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "docs: dedupe workflow doc, banner historical proposal, relocate workspace file"
```

- [ ] **Step 6: Part 1 definition-of-done gate**

Run: `pnpm run lint && pnpm run build`
Expected: both exit 0 (doc-only changes must not break type/lint/build). Tests unaffected, but run `pnpm run test:run` to confirm no incidental breakage.

> **Part 1 is independently mergeable here.** If executing the two parts as separate PRs, open the cleanup PR now and run the docs-sync reviewer pass before merge.

---

# PART 2 — DOC-SYNC ENFORCEMENT

## Task 7: Create the ADR decision log

**Files:**
- Create: `docs/decisions/README.md`
- Create: `docs/decisions/0000-template.md`
- Create: `docs/decisions/0001-adopt-adr-log-and-docs-sync-enforcement.md`
- Modify: `docs/llm-docs-sync.md` (add inventory row + new section)

**Interfaces:**
- Produces: the `docs/decisions/NNNN-*.md` surface and numbering convention that the `docs-sync` skill (Task 8) writes into, and that the Stop hook (Tasks 9-10) treats as "decision recorded."

- [ ] **Step 1: Create the ADR template**

Create `docs/decisions/0000-template.md`:
```markdown
# NNNN. <Short decision title>

- **Status:** Proposed | Accepted | Superseded by [ADR-XXXX](XXXX-...md) | Deprecated
- **Date:** YYYY-MM-DD
- **Deciders:** <who / which session>
- **Phase:** <e.g. Phase 0.5>

## Context
<What forces are at play? What problem, new idea, or direction emerged? Link the session, PR, or issue.>

## Decision
<State it plainly and actively: "We will …">

## Consequences
<Positive, negative, and follow-on work. What gets easier or harder? What did we explicitly reject?>

## Affected living docs
<Which rows of the docs/llm-docs-sync.md inventory this touches (REPO_MAP, roadmap, README, .cursorrules, HACER_LLM_GUIDE …) and whether they were updated. "none" is valid.>

## Links
<Related ADRs ([[NNNN]]), specs in docs/specs/, plans in docs/plans/, code paths.>
```

- [ ] **Step 2: Create the index/README**

Create `docs/decisions/README.md`:
```markdown
# Architecture Decision Records (ADRs)

Durable home for **emergent decisions and direction changes** — the kind that surface mid-session
and would otherwise be lost between Claude/Cursor sessions, silently polluting future context.

## How this differs from neighbouring docs
- **`docs/specs/`** — design for a *specific planned feature* (output of brainstorming).
- **`docs/plans/`** — *execution* steps for a feature.
- **`docs/roadmap/`** — *what* we will build and *when* (phases).
- **`docs/decisions/` (here)** — *cross-cutting decisions, new directions, and rejected approaches*,
  often discovered while doing something else. An ADR records the "why we changed course."

## Conventions
- Filename: `NNNN-kebab-title.md`, zero-padded sequential (`0001`, `0002`, …). **Never renumber.**
- Never delete an ADR — supersede it (set Status, link the replacement).
- One decision per file. Use `0000-template.md`.
- Each ADR lists the living docs it affects and whether they were reconciled.

## When to add one
At the end of a session (or when the docs-sync Stop hook prompts), run the **`docs-sync`** skill.
It captures decisions here and then runs the author pass in [`../llm-docs-sync.md`](../llm-docs-sync.md).

## Index
| ADR | Title | Status | Date |
|-----|-------|--------|------|
| [0001](0001-adopt-adr-log-and-docs-sync-enforcement.md) | Adopt ADR log + enforced docs-sync | Accepted | 2026-06-19 |
```

- [ ] **Step 3: Create the bootstrap ADR (also serves as a worked example)**

Create `docs/decisions/0001-adopt-adr-log-and-docs-sync-enforcement.md`:
```markdown
# 0001. Adopt an ADR log and enforce docs-sync at session end

- **Status:** Accepted
- **Date:** 2026-06-19
- **Deciders:** Repo owner + planning session
- **Phase:** Phase 0.5

## Context
Docs drifted from code (stale "100% complete" claims, dead import examples, branded-types that don't
exist). The existing `docs/llm-docs-sync.md` author/reviewer passes reconcile *living docs after code
changes* but have no home for **emergent decisions/directions** that arise mid-session, and rely on
agent goodwill rather than enforcement.

## Decision
We will (1) keep an ADR log under `docs/decisions/`, (2) add a `docs-sync` capture skill that writes
ADRs and runs the author pass, and (3) enforce it with a Claude Code **Stop hook** that prompts (and,
by default, blocks once per session) when code changed but no docs were touched. The hook keys off
`git status` change-presence only — it does not grep doc contents (the repo rejected grep-CI).

## Consequences
- Future sessions inherit decisions instead of rediscovering or contradicting them.
- One extra acknowledgement turn per substantive session (downgradable via `HACER_DOCS_SYNC_ENFORCE=0`).
- New skill must be protected in `scripts/sync-superpowers.sh` or upstream sync will delete it.

## Affected living docs
`docs/llm-docs-sync.md` (new inventory row + section), `AGENTS.md`, `.claude/CLAUDE.md`, root `CLAUDE.md` — all updated in this change.

## Links
- Plan: `docs/plans/2026-06-19-docs-cleanup-and-sync-enforcement.md`
- Skill: `.claude/skills/docs-sync/SKILL.md`
- Hook: `scripts/hooks/docsSyncStop.mjs`
```

- [ ] **Step 4: Register the surface in the docs-sync inventory**

In `docs/llm-docs-sync.md`, add this row to the "Living documentation inventory" table:
```
| `docs/decisions/*.md` | A cross-cutting decision, new direction, or rejected approach emerged this session (add a new ADR via the `docs-sync` skill) |
```
Then add this section just before "## Author pass — template":
```markdown
## Capturing emergent decisions (ADRs)

Living-doc reconciliation keeps docs aligned with **code**. But sessions also produce **decisions and
new directions** that aren't tied to a single file. Capture those as ADRs in
[`docs/decisions/`](./decisions/README.md) so they aren't lost between sessions.

Run the **`docs-sync`** skill at session end (the Stop hook will prompt you). It writes any ADRs, then
runs the author pass below. If no doc-relevant decision was made, say so explicitly — that is a valid outcome.
```

- [ ] **Step 5: Verify**

Run:
```bash
ls docs/decisions/
grep -n "docs/decisions" docs/llm-docs-sync.md
```
Expected: three files present; inventory references `docs/decisions`.

- [ ] **Step 6: Commit**

```bash
git add docs/decisions docs/llm-docs-sync.md
git commit -m "docs: add ADR decision log and wire it into llm-docs-sync"
```

---

## Task 8: Create the `docs-sync` capture skill (and protect it from upstream sync)

**Files:**
- Create: `.claude/skills/docs-sync/SKILL.md`
- Modify: `scripts/sync-superpowers.sh` (add to `--exclude` preserve list)

**Interfaces:**
- Consumes: the ADR surface from Task 7 and the author pass in `docs/llm-docs-sync.md`.
- Produces: the skill named `docs-sync` referenced by the Stop hook reminder (Task 9 `REMINDER` text) and the wiring docs (Task 11).

- [ ] **Step 1: Write the skill**

Create `.claude/skills/docs-sync/SKILL.md`:
```markdown
---
name: docs-sync
description: Use at the end of a work session, or when the docs-sync Stop hook prompts, to capture emergent decisions/directions as ADRs and reconcile living docs so future sessions inherit them.
---

# docs-sync

Run this before wrapping up a session that changed code or made decisions.

## Steps

1. **Scan the session for decisions.** Did anything change direction, settle a trade-off, adopt or
   reject an approach, or alter an assumption recorded in the docs? List each candidate.

2. **Record each decision as an ADR.** For every material decision, create
   `docs/decisions/NNNN-kebab-title.md` from `docs/decisions/0000-template.md`
   (next zero-padded number; never renumber). Add a row to `docs/decisions/README.md`'s index.

3. **Run the author pass.** Follow the author pass in `docs/llm-docs-sync.md`: for each affected row of
   the living-documentation inventory (`REPO_MAP.md`, `docs/roadmap/*`, `README.md`, `.cursorrules`
   banner, `HACER_LLM_GUIDE.md`, `.github/copilot-instructions.md`), update it or mark it N/A with a reason.

4. **If no doc-relevant decision was made,** state that explicitly (e.g. "No ADR — this session was a
   routine bugfix, living docs unaffected"). That is a valid, complete outcome.

5. **Verify.** `git status` should show your ADR and any living-doc edits staged together with the code.

## Notes
- This is the capture half of the enforcement loop; the Stop hook (`scripts/hooks/docsSyncStop.mjs`) is
  the reminder half. Touching any doc (or adding an ADR) satisfies the hook for the session.
- Do NOT add repo-wide grep-CI for banned strings — `docs/llm-docs-sync.md` deliberately forbids it.
```

- [ ] **Step 2: Protect the skill from `sync-superpowers.sh`**

In `scripts/sync-superpowers.sh`, change the rsync exclude block from:
```bash
rsync -rv --update \
  --exclude='hacer-patterns/' \
  "$TEMP_DIR/skills/" "$DEST_DIR/"
```
to:
```bash
rsync -rv --update \
  --exclude='hacer-patterns/' \
  --exclude='docs-sync/' \
  "$TEMP_DIR/skills/" "$DEST_DIR/"
```
And update the final echo line to mention both preserved skills:
```bash
echo "✅ Superpowers skills updated successfully! Your 'hacer-patterns' and 'docs-sync' skills were preserved."
```

- [ ] **Step 3: Verify the script still parses and lists both excludes**

Run:
```bash
bash -n scripts/sync-superpowers.sh && echo "syntax OK"
grep -n "exclude" scripts/sync-superpowers.sh
```
Expected: `syntax OK`; two `--exclude` lines (`hacer-patterns/`, `docs-sync/`).

- [ ] **Step 4: Commit**

```bash
git add .claude/skills/docs-sync/SKILL.md scripts/sync-superpowers.sh
git commit -m "feat: add docs-sync capture skill; preserve it in superpowers sync"
```

---

## Task 9: TDD the Stop-hook decision logic

**Files:**
- Create: `scripts/hooks/docsSyncStop.logic.mjs`
- Test: `scripts/hooks/docsSyncStop.logic.test.mjs`
- Modify: `vite.config.ts` (widen the Vitest `include` so `scripts/**` tests run)

**Interfaces:**
- Produces: `evaluateStopHook(input) -> { remind, block, reason }`, `isCodePath(path)`, `isDocPath(path)`, and the exported `REMINDER` string — all consumed by the wrapper in Task 10.

- [ ] **Step 1: Widen the Vitest include glob (so the new test is discovered)**

In `vite.config.ts`, change:
```ts
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
```
to:
```ts
    include: ['src/**/*.{test,spec}.{ts,tsx}', 'scripts/**/*.{test,spec}.mjs'],
```

- [ ] **Step 2: Write the failing test**

Create `scripts/hooks/docsSyncStop.logic.test.mjs`:
```js
import { describe, it, expect } from 'vitest'
import {
  evaluateStopHook,
  isCodePath,
  isDocPath,
  REMINDER,
} from './docsSyncStop.logic.mjs'

describe('evaluateStopHook', () => {
  it('does not block when the stop hook is already active (loop guard)', () => {
    expect(evaluateStopHook({ stopHookActive: true, changedPaths: ['src/a.ts'] }))
      .toEqual({ remind: false, block: false, reason: '' })
  })

  it('does not block when already reminded this session', () => {
    expect(evaluateStopHook({ alreadyReminded: true, changedPaths: ['src/a.ts'] }))
      .toEqual({ remind: false, block: false, reason: '' })
  })

  it('does not block when nothing changed', () => {
    expect(evaluateStopHook({ changedPaths: [] }).block).toBe(false)
  })

  it('blocks once when code changed but no docs were touched', () => {
    const r = evaluateStopHook({ changedPaths: ['src/store/circuitStore.ts'] })
    expect(r).toEqual({ remind: true, block: true, reason: REMINDER })
  })

  it('treats e2e changes as code', () => {
    expect(evaluateStopHook({ changedPaths: ['e2e/specs/x.store.spec.ts'] }).block).toBe(true)
  })

  it('does not block when a decision was recorded (docs/decisions touched)', () => {
    expect(evaluateStopHook({ changedPaths: ['src/a.ts', 'docs/decisions/0002-x.md'] }).block)
      .toBe(false)
  })

  it('does not block when any living doc was touched', () => {
    expect(evaluateStopHook({ changedPaths: ['src/a.ts', 'REPO_MAP.md'] }).block).toBe(false)
    expect(evaluateStopHook({ changedPaths: ['src/a.ts', '.cursorrules'] }).block).toBe(false)
  })

  it('ignores CHANGELOG.md as a doc touch (it is auto-generated)', () => {
    expect(evaluateStopHook({ changedPaths: ['src/a.ts', 'CHANGELOG.md'] }).block).toBe(true)
  })

  it('reminds but does not block when enforcement is disabled', () => {
    const r = evaluateStopHook({ changedPaths: ['src/a.ts'], enforce: false })
    expect(r.remind).toBe(true)
    expect(r.block).toBe(false)
    expect(r.reason).toBe(REMINDER)
  })
})

describe('path classifiers', () => {
  it('classifies code paths', () => {
    expect(isCodePath('src/x.ts')).toBe(true)
    expect(isCodePath('e2e/x.spec.ts')).toBe(true)
    expect(isCodePath('docs/x.md')).toBe(false)
  })

  it('classifies doc paths (except CHANGELOG.md)', () => {
    expect(isDocPath('docs/roadmap/vision.md')).toBe(true)
    expect(isDocPath('README.md')).toBe(true)
    expect(isDocPath('.cursorrules')).toBe(true)
    expect(isDocPath('CHANGELOG.md')).toBe(false)
    expect(isDocPath('src/x.ts')).toBe(false)
  })
})
```

- [ ] **Step 3: Run the test to verify it fails**

Run: `pnpm exec vitest run scripts/hooks/docsSyncStop.logic.test.mjs`
Expected: FAIL — `Failed to resolve import "./docsSyncStop.logic.mjs"` (module does not exist yet).

- [ ] **Step 4: Implement the logic**

Create `scripts/hooks/docsSyncStop.logic.mjs`:
```js
// Pure decision logic for the docs-sync Stop hook. No I/O — fully unit tested.

const CODE_PREFIXES = ['src/', 'e2e/']

export const REMINDER = [
  'Docs-sync checkpoint: this session changed code (src/ or e2e/) but touched no documentation.',
  'Before wrapping up, run the `docs-sync` skill to:',
  '  1. Record any emergent decisions / new directions as an ADR in docs/decisions/.',
  '  2. Run the author pass in docs/llm-docs-sync.md to reconcile living docs.',
  'If no doc-relevant decision was made, say so explicitly and continue.',
].join('\n')

/** Product/behaviour code that may embody a decision. */
export function isCodePath(p) {
  return CODE_PREFIXES.some((prefix) => p.startsWith(prefix))
}

/** Documentation (so the session already touched docs). CHANGELOG.md is auto-generated, not a doc touch. */
export function isDocPath(p) {
  if (p === 'CHANGELOG.md') return false
  if (p.startsWith('docs/')) return true
  if (p === '.cursorrules') return true
  return p.endsWith('.md')
}

/**
 * Decide whether the Stop hook should remind/block to prompt a docs-sync.
 * @param {{ stopHookActive?: boolean, alreadyReminded?: boolean, changedPaths?: string[], enforce?: boolean }} input
 * @returns {{ remind: boolean, block: boolean, reason: string }}
 */
export function evaluateStopHook(input) {
  const {
    stopHookActive = false,
    alreadyReminded = false,
    changedPaths = [],
    enforce = true,
  } = input

  const quiet = { remind: false, block: false, reason: '' }
  if (stopHookActive || alreadyReminded) return quiet

  const codeChanged = changedPaths.some(isCodePath)
  const docsTouched = changedPaths.some(isDocPath)

  if (codeChanged && !docsTouched) {
    return { remind: true, block: enforce, reason: REMINDER }
  }
  return quiet
}
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `pnpm exec vitest run scripts/hooks/docsSyncStop.logic.test.mjs`
Expected: PASS (all assertions green).

- [ ] **Step 6: Confirm the widened glob doesn't break the full suite**

Run: `pnpm run test:run`
Expected: full suite PASSES, now including the new `scripts/hooks` test.

- [ ] **Step 7: Commit**

```bash
git add vite.config.ts scripts/hooks/docsSyncStop.logic.mjs scripts/hooks/docsSyncStop.logic.test.mjs
git commit -m "test: add tested decision logic for docs-sync Stop hook"
```

---

## Task 10: Implement the hook wrapper and register the Stop hook

**Files:**
- Create: `scripts/hooks/docsSyncStop.mjs` (I/O wrapper)
- Create or modify: `.claude/settings.json` (register the Stop hook)

**Interfaces:**
- Consumes: `evaluateStopHook` from Task 9.
- Produces: a runnable hook command `node "$CLAUDE_PROJECT_DIR/scripts/hooks/docsSyncStop.mjs"`.

- [ ] **Step 1: Write the wrapper**

Create `scripts/hooks/docsSyncStop.mjs`:
```js
#!/usr/bin/env node
// Claude Code Stop hook: reminds (and by default blocks once per session) to run docs-sync
// when code changed but no docs were touched. Pure logic lives in ./docsSyncStop.logic.mjs.
import { execFileSync } from 'node:child_process'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { evaluateStopHook } from './docsSyncStop.logic.mjs'

function readStdin() {
  try {
    return JSON.parse(readFileSync(0, 'utf-8') || '{}')
  } catch {
    return {}
  }
}

function gitChangedPaths(cwd) {
  try {
    const out = execFileSync('git', ['-C', cwd, 'status', '--porcelain'], {
      encoding: 'utf-8',
      stdio: ['ignore', 'pipe', 'ignore'],
    })
    return out
      .split('\n')
      .filter(Boolean)
      .map((line) => line.slice(3)) // strip the 2 status chars + space
      .map((p) => (p.includes(' -> ') ? p.split(' -> ')[1] : p)) // rename: take new path
      .map((p) => p.replace(/^"|"$/g, '').trim())
      .filter(Boolean)
  } catch {
    return [] // not a git repo (e.g. workspace root) or git unavailable → no nudge
  }
}

function markerFile(sessionId) {
  return join(tmpdir(), 'hacer-docs-sync', `${sessionId || 'unknown'}.reminded`)
}

const input = readStdin()
const sessionId = input.session_id ?? 'unknown'
const cwd = input.cwd ?? process.cwd()
const stopHookActive = Boolean(input.stop_hook_active)
const enforce = process.env.HACER_DOCS_SYNC_ENFORCE !== '0'

const marker = markerFile(sessionId)
const alreadyReminded = existsSync(marker)
const changedPaths = gitChangedPaths(cwd)

const { remind, block, reason } = evaluateStopHook({
  stopHookActive,
  alreadyReminded,
  changedPaths,
  enforce,
})

if (remind) {
  try {
    mkdirSync(join(tmpdir(), 'hacer-docs-sync'), { recursive: true })
    writeFileSync(marker, new Date().toISOString())
  } catch {
    // best-effort marker; never fail the hook on fs errors
  }
}

if (block) {
  process.stdout.write(JSON.stringify({ decision: 'block', reason }))
} else if (remind) {
  process.stdout.write(JSON.stringify({ systemMessage: reason }))
}
process.exit(0)
```

- [ ] **Step 2: Smoke-test the wrapper directly (block path)**

Run from a state where `src/` has an uncommitted change (create a throwaway one if needed):
```bash
printf '{"session_id":"smoke1","cwd":"%s","stop_hook_active":false}' "$PWD" \
  | node scripts/hooks/docsSyncStop.mjs; echo
```
Expected (only if `git status` shows a `src/` or `e2e/` change and no doc change): a JSON line `{"decision":"block","reason":"Docs-sync checkpoint: ..."}`. If the working tree is clean or docs were touched, expect empty output. Re-running with the same `session_id` prints nothing (marker set).

- [ ] **Step 3: Smoke-test the loop guard and non-git safety**

Run:
```bash
printf '{"session_id":"smoke2","cwd":"%s","stop_hook_active":true}' "$PWD" \
  | node scripts/hooks/docsSyncStop.mjs; echo "exit=$?"
printf '{"session_id":"smoke3","cwd":"/tmp","stop_hook_active":false}' \
  | node scripts/hooks/docsSyncStop.mjs; echo "exit=$?"
```
Expected: both print no JSON and `exit=0` (loop guard; and `/tmp` is not a git repo → no nudge).

- [ ] **Step 4: Register the Stop hook**

If `.claude/settings.json` does not exist, create it:
```json
{
  "hooks": {
    "Stop": [
      {
        "hooks": [
          {
            "type": "command",
            "command": "node \"$CLAUDE_PROJECT_DIR/scripts/hooks/docsSyncStop.mjs\""
          }
        ]
      }
    ]
  }
}
```
If it already exists, merge this `Stop` entry into the existing `hooks` object (do not clobber other keys). Verify it is valid JSON:
```bash
node -e "JSON.parse(require('fs').readFileSync('.claude/settings.json','utf8')); console.log('settings.json OK')"
```
Expected: `settings.json OK`.

- [ ] **Step 5: Clean up any throwaway change from Step 2, then run definition-of-done**

Run:
```bash
pnpm run lint && pnpm run test:run && pnpm run test:e2e:store && pnpm run build
```
Expected: all exit 0.

- [ ] **Step 6: Commit**

```bash
git add scripts/hooks/docsSyncStop.mjs .claude/settings.json
git commit -m "feat: enforce docs-sync via Claude Code Stop hook"
```

---

## Task 11: Wire discovery so future sessions find the mechanism

**Files:**
- Modify: `AGENTS.md` (§0 docs-sync paragraph + §6 task management)
- Modify: `.claude/CLAUDE.md` (skill table + task management)
- Modify: `CLAUDE.md` (root pointer — mention the decision log)

- [ ] **Step 1: Reference the mechanism in AGENTS.md**

In `AGENTS.md` §0, in the "Documentation sync" paragraph, append:
```
Additionally, capture emergent decisions/new directions as ADRs in `docs/decisions/` via the
**`docs-sync`** skill before claiming work complete; a Stop hook (`scripts/hooks/docsSyncStop.mjs`)
prompts when code changed but no docs were touched.
```
In §6 "Task Management", add the bullet:
```
- `docs/decisions/` → ADR log of cross-cutting decisions & direction changes (run `docs-sync` to add)
```

- [ ] **Step 2: Add the skill to the Claude skill table**

In `.claude/CLAUDE.md`, add a row to the Skills table:
```
| Finish | `docs-sync` | Session end — capture emergent decisions as ADRs + reconcile living docs |
```
And under "Task Management", add:
```
- **Decisions**: [docs/decisions/](../docs/decisions/) — ADR log (use the `docs-sync` skill)
```

- [ ] **Step 3: Mention the log in the root pointer**

In `CLAUDE.md` (hacer root), under "Canonical entry docs", add:
```
5. `docs/decisions/` — ADR log of emergent decisions; run the `docs-sync` skill at session end.
```

- [ ] **Step 4: Run the docs-sync author pass on this very change**

This change adds public mechanism + repo layout, so per `docs/llm-docs-sync.md` reconcile: confirm `docs/decisions/README.md` index lists 0001, and that AGENTS.md / `.claude/CLAUDE.md` references resolve. (You may dogfood the new `docs-sync` skill here.)

- [ ] **Step 5: Verify cross-references resolve**

Run:
```bash
grep -rn "docs-sync\|docs/decisions" AGENTS.md .claude/CLAUDE.md CLAUDE.md
```
Expected: each file references the skill and/or the ADR log.

- [ ] **Step 6: Final definition-of-done gate + commit**

```bash
pnpm run lint && pnpm run test:run && pnpm run test:e2e:store && pnpm run build
git add AGENTS.md .claude/CLAUDE.md CLAUDE.md
git commit -m "docs: wire docs-sync skill and ADR log into agent entry docs"
```

---

## Self-Review

**Spec coverage:**
- "Remove if completely useless" → Task 1 (dead dirs), Task 6 (duplicate `workflow.md`, misplaced workspace file). ✓
- "Update if simply stale" → Tasks 2–5 (branded types, version/prereq/typo/title, status contradictions, REPO_MAP drift) + Task 6 (historical banner). ✓
- "Mechanism of doc-sync enforcement following LLM best practices" → Tasks 9–10 (Stop hook, harness-enforced). ✓
- "Whenever new ideas/decisions/directions emerge … offline docs updated, not left behind" → Task 7 (ADR log) + Task 8 (capture skill) + Task 11 (discovery wiring). ✓

**Decisions honored:** Hook + capture skill (Tasks 8–10); ADR-style log (Task 7); Conservative cleanup — no future-phase archiving, no `.cursor` sprawl pruning (those audit findings intentionally excluded).

**Constraint checks:** No grep-CI (hook keys off git-change presence only) ✓; new skill protected from `sync-superpowers.sh` (Task 8 Step 2) ✓; Vitest scope widened so the hook test runs under `test:run` (Task 9 Step 1) ✓; all code tasks end on the four-command definition of done ✓.

**Type/name consistency:** `evaluateStopHook`, `isCodePath`, `isDocPath`, `REMINDER` are defined in Task 9 and consumed unchanged in Tasks 9–10. The `{ remind, block, reason }` shape is identical across the implementation, tests, and wrapper.

**Residual placeholders:** Tasks 4 (appendices/README reconciliation) and 5 (REPO_MAP tree) specify exact target states and authoritative sources rather than literal full-file diffs, because they are multi-line reconciliations against `phase-0.5-tickets-CHECKLIST.md` and the real `src/` tree; each ends with a concrete verification grep and the reviewer pass. This is intentional, not a vague "fix appropriately."

---

## Execution Handoff

This plan is two independently-mergeable parts. **Part 1 (Tasks 0–6)** can ship as its own PR before Part 2 begins.
