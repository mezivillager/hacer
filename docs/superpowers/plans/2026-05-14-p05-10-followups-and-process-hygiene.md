# P05-10 follow-ups, scene naming visibility, and process hygiene — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Land documentation and process artifacts: (1) revise **P05-10** so it matches the current shell and store APIs, (2) add **P05-29** follow-up ticket(s) for **effective** in-scene naming and label surfacing (explicitly acknowledging that naming is **not usefully visible today** despite partial `Text` usage in code), (3) add **`docs/development/observed-bugs.md`** with **B-001** gate preview contrast in light mode, (4) add a **Cursor always-on rule** forbidding direct commits to `main` and requiring **feature branches + git worktrees** for substantive work.

**Architecture:** All changes are **docs + Cursor rules + optional ticket index updates** — no production feature code in this plan. New Phase 0.5 ticket **P05-29** is documented as **post–P05-10** (or parallel if P05-10 is only docs) so implementers do not block PinoutPanel on full 3D naming refactors.

**Tech Stack:** Markdown, Git worktrees, `.cursor/rules/*.mdc` (YAML frontmatter `alwaysApply: true`), existing `docs/plans/phase-0.5-tickets/` layout.

---

## File structure (this effort)

| Path | Role |
|------|------|
| `docs/plans/phase-0.5-tickets/P05-29.md` | **Create** — follow-up ticket: scene naming visibility + repair existing label/preview surfacing |
| `docs/plans/phase-0.5-tickets/P05-10.md` | **Modify** — remove Sidebar references, align integration with `RightActionBar` / `PropertiesPanel`, fix test plan (`clearCircuit`), drop obsolete P05-03/P05-09 caveats |
| `docs/plans/phase-0.5-tickets/README.md` | **Modify** — index row for P05-29 + dependency note |
| `docs/plans/phase-0.5-tickets-CHECKLIST.md` | **Modify** — new Layer 0.5 / “Follow-ups” row for P05-29 (unchecked) OR a short “Deferred / follow-up” section — pick one style and stay consistent with existing checklist tone |
| `docs/plans/2026-03-22-phase-0.5-tickets.md` | **Modify** — dependency map: add P05-29 under a **Follow-ups** subtree linking to P05-10 and 3D labeling |
| `docs/development/observed-bugs.md` | **Create** — informal bug log + **B-001** |
| `.cursor/rules/020-git-worktree-no-main.mdc` | **Create** — enforce worktree + no direct `main` commits for agents |
| `REPO_MAP.md` | **Modify** — one row in “Common tasks” or “Where files live” pointing to `docs/development/observed-bugs.md` |
| `AGENTS.md` (optional, one sentence) | **Modify** — cross-link the new Cursor rule under Cursor track if you want redundancy beyond `alwaysApply` |

**Dedicated worktree:** Branch `docs/p05-10-followups-plan-2026-05-14` at  
`.worktrees/p05-10-followups-plan`  
(create with `git worktree add .worktrees/p05-10-followups-plan -b docs/p05-10-followups-plan-2026-05-14 origin/main` from repo root if missing).

---

### Task 1: Add P05-29 ticket file (scene naming not effectively visible)

**Files:**
- Create: `docs/plans/phase-0.5-tickets/P05-29.md`

**Purpose:** Formalize follow-up work so **PinoutPanel (P05-10)** is not overloaded with 3D typography, gate-instance naming, wire/signal labels, and preview contrast. Ticket title must state that **chip/node/pin/wire names are not effectively visible in the scene** today (users rely on Properties / counts), and that **existing code paths that attempt scene naming** (`@react-three/drei` `Text` on I/O nodes, gate `textLabel`, `PlacementPreview` colors, etc.) must be **audited and fixed** until labels meet readability and design targets.

- [ ] **Step 1: Create the ticket file with the content below**

Save exactly as `P05-29.md`:

```markdown
# P05-29: Scene naming not effectively visible — fix in-view labels, previews, and signal surfacing

**Effort:** 8h (split across 2 PRs if desired)  
**Gap:** GAP-UI-3 (partial), GAP-UI-6 (wire/signal naming — later tranche), general UX  
**Depends on:** **P05-10** recommended first (PinoutPanel gives usable off-canvas I/O); this ticket may start in parallel only for **preview contrast** and **font sizing** subtasks that do not depend on PinoutPanel.

---

## Problem statement (why this ticket exists)

Despite **some** R3F `Text` usage on **input/output** nodes (name + value) and gate bodies showing **type** labels, **users still cannot reliably read chip-level naming in the scene** at a glance: labels are small, occluded, or low-contrast; **gates** have no user-facing **instance** name (only `GateType`); **wires** have no visible human-readable names (`signalId` is optional and unused in scene UI). **Placement / drag preview** (see `PlacementPreview.tsx`) uses theme-derived colors that are **insufficiently bold in light mode** for gate preview — tracked also as **B-001** in `docs/development/observed-bugs.md`.

This ticket explicitly covers **repairing and extending existing scene naming surfacing** so that “code shows Text” becomes “**users see names**.”

---

## Goals (verifiable)

1. **I/O nodes:** From a typical camera distance in **light** and **dark** themes, **node names** and **values** remain readable (size, contrast, outline or billboard policy documented in ticket PR).
2. **Gate instances:** Either (a) document that only **type** is shown until `GateInstance` gains optional `label`, or (b) add optional **display label** + minimal UI to edit it — pick one in implementation PR; default (a) if timeboxed.
3. **Placement preview:** Gate/node preview uses **high-contrast** colors in light mode (addresses **B-001**); add or extend `PlacementPreview.test.tsx` if behavior is testable without WebGL.
4. **Wires / internal signals (stretch):** Spike: list what is required for **GAP-UI-6**; full implementation may be **P05-26** — do not block P05-29 closure on full HDL-style naming unless scoped small (e.g. dev-only wire label toggle).

---

## Files likely touched

- `src/nodes/components/InputNode3D.tsx`, `OutputNode3D.tsx` — font size, color, outline
- `src/gates/common/BaseGate.tsx` and per-gate configs — `textLabel` / contrast
- `src/components/canvas/Scene/PlacementPreview.tsx` — preview material colors (`semanticColors.success` today)
- `src/theme/` tokens — ensure semantic success has accessible contrast on `SceneGrid` / background
- `docs/development/observed-bugs.md` — mark **B-001** fixed when done

---

## Verifiability

| Layer | Requirement |
|-------|----------------|
| **Vitest** | Extend `PlacementPreview.test.tsx` and/or node/gate component tests for color class / material props where stable |
| **Manual** | Light theme: place gate, drag gate, place I/O — labels and previews readable |
| **Store E2E** | Only if new `data-testid` hooks are added for preview state |

---

## Out of scope (defer)

- Full **truth table** UI (optional future ticket).
- Complete **GAP-UI-6** HDL export naming — coordinate with **P05-26**.

---

## Done when

- PR merged + definition of done green (`pnpm run lint`, `pnpm run test:run`, `pnpm run test:e2e:store`, `pnpm run build`).
- **B-001** in `observed-bugs.md` updated to **Fixed** with PR link, or superseded by this ticket’s PR.
```

- [ ] **Step 2: Commit**

```bash
git add docs/plans/phase-0.5-tickets/P05-29.md
git commit -m "docs(phase-0.5): add P05-29 scene naming visibility follow-up ticket"
```

---

### Task 2: Index P05-29 in Phase 0.5 ticket README

**Files:**
- Modify: `docs/plans/phase-0.5-tickets/README.md`

- [ ] **Step 1: Insert a new table section after Layer 4 (or append “Follow-ups” table)**

Add:

```markdown
### Follow-ups — Post Layer 0–4 polish (optional ordering)

| ID | Title | Effort | Depends | Gap(s) | Status |
|----|-------|--------|---------|--------|--------|
| [P05-29](P05-29.md) | Scene naming not effectively visible — fix in-view labels, previews, and signal surfacing | 8h | P05-10 (recommended) | GAP-UI-3 (partial), UX | TODO |
```

- [ ] **Step 2: In the ASCII dependency map at file bottom, append:**

```
  P05-10  PinoutPanel ─────► P05-29 (scene naming / preview contrast)
```

- [ ] **Step 3: Commit**

```bash
git add docs/plans/phase-0.5-tickets/README.md
git commit -m "docs(phase-0.5): index P05-29 follow-up in ticket README"
```

---

### Task 3: Extend master Phase 0.5 plan dependency map

**Files:**
- Modify: `docs/plans/2026-03-22-phase-0.5-tickets.md`

- [ ] **Step 1: After the existing `LAYER 4` block in the dependency map, add:**

```
FOLLOW-UPS (documentation / UX hardening — not blocking P05-11–28 core chain)
  P05-29  Scene naming visibility + preview contrast  [after P05-10 recommended]
```

- [ ] **Step 2: In “Gap Coverage Summary” or a short new subsection, add one row:**

| Gap | Severity | Tickets | Note |
|-----|----------|---------|------|
| In-scene label readability | Medium | P05-29 | Complements P05-10 shell pinout |

- [ ] **Step 3: Commit**

```bash
git add docs/plans/2026-03-22-phase-0.5-tickets.md
git commit -m "docs(plans): link P05-29 in phase 0.5 master dependency map"
```

---

### Task 4: Update phase checklist for P05-29

**Files:**
- Modify: `docs/plans/phase-0.5-tickets-CHECKLIST.md`

- [ ] **Step 1: After Layer 4 section, add:**

```markdown
## Follow-ups (UX / labeling — optional ordering)

- [ ] **P05-29** — Scene naming not effectively visible — fix in-view labels, previews, and signal surfacing — [P05-29.md](./phase-0.5-tickets/P05-29.md)
```

- [ ] **Step 2: Bump `**Last reviewed:**` date to the commit day**

- [ ] **Step 3: Commit**

```bash
git add docs/plans/phase-0.5-tickets-CHECKLIST.md
git commit -m "docs(phase-0.5): add P05-29 to ticket checklist"
```

---

### Task 5: Fix P05-10 ticket gaps (align with codebase)

**Files:**
- Modify: `docs/plans/phase-0.5-tickets/P05-10.md`

- [ ] **Step 1: Replace the “Current node data” bullet** so `value` is **`number` only** (P05-02 merged). Remove the “boolean or number” dual-path paragraph; replace with:

```markdown
### Current node data

- `InputNode` / `OutputNode`: `value: number` (bitmask / integer signal). Use `formatSignalLabel` from `@/simulation/signalDisplay` where 3D parity matters.
- `updateInputNodeValue(nodeId, value: number)` in `src/store/actions/nodeActions/nodeActions.ts`
- `circuitActions.simulationTick()` in `src/store/actions/simulationActions/simulationActions.ts` (topological eval via P05-03)
```

- [ ] **Step 2: Delete the entire subsection** `### src/components/ui/Sidebar.tsx — Add PinoutPanel` **and** implementation step “Add `<PinoutPanel />` to `Sidebar.tsx`”. Replace integration instructions with:

```markdown
### Integration (current shell — 2026-05)

1. **Preferred:** Add `<PinoutPanel />` inside `RightActionBar` drawer content next to or below `CircuitInfoPanel` when `activePanel === 'info'`, file `src/components/ui/RightActionBar.tsx` (fixed width `PANEL_WIDTH = 280`).
2. **Optional secondary:** Add a collapsible “Chip I/O” region inside `src/components/ui/PropertiesPanel/index.tsx` when the selection is null or always visible — pick one UX; document the choice in the implementing PR.
3. Do **not** reference `Sidebar.tsx` — it does not exist in this repo layout.
```

- [ ] **Step 3: Replace the test plan `resetStore` block** with store-backed reset:

```typescript
import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { circuitActions } from '@/store/circuitStore'
import { PinoutPanel } from './PinoutPanel'

beforeEach(() => {
  circuitActions.clearCircuit()
})
```

Note: `clearCircuit` resets `gates`, `wires`, `inputNodes`, `outputNodes`, `statusMessages`, and related wiring/placement flags — see `src/store/actions/simulationActions/simulationActions.ts` lines 26–45.

- [ ] **Step 4: Remove pitfall** “If P05-03 hasn’t run…” **and** “After P05-09 merges” comment in test snippet.

- [ ] **Step 5: Add one “Truth table” paragraph** under Pitfalls or Goal:

```markdown
- **Truth table:** Intentionally out of scope for P05-10 (see gap-analysis GAP-UI-3 item 4). Optional follow-up: capped truth table for small `n` inputs after P05-10 ships.
```

- [ ] **Step 6: Add explicit note** that **in-scene** name readability is **P05-29**, not P05-10.

- [ ] **Step 7: Commit**

```bash
git add docs/plans/phase-0.5-tickets/P05-10.md
git commit -m "docs(phase-0.5): align P05-10 with RightActionBar and post-P05-02 store"
```

---

### Task 6: Create observed-bugs document with B-001

**Files:**
- Create: `docs/development/observed-bugs.md`

- [ ] **Step 1: Write file**

```markdown
# Observed bugs (informal log)

Human- and agent-observed issues that are **not yet** guaranteed to have a GitHub issue or a failing automated test. Use this log to **capture repro** quickly; promote entries to dedicated tickets or delete when fixed.

## Conventions

| Column | Meaning |
|--------|---------|
| **ID** | `B-NNN` monotonic in this file |
| **Status** | Open / Investigating / Fixed |
| **Fixed in** | PR URL or commit when closed |

When an item is **Fixed**, keep one line in a “Resolved” appendix **or** move narrative to `tasks/lessons.md` — pick one convention per PR and stay consistent.

---

## Open

### B-001 — Gate placement preview lacks contrast in light mode

| Field | Detail |
|-------|--------|
| **Status** | Open |
| **Area** | `src/components/canvas/Scene/PlacementPreview.tsx`, theme (`semanticColors.success`), light-mode grid/background |
| **Symptom** | When placing or dragging a **gate**, the preview mesh is hard to see in **light** theme — not bold enough against the canvas. |
| **Expected** | Preview uses **high-contrast**, unambiguous colors in light (and remains acceptable in dark). |
| **Repro** | Set theme to light → choose a gate from toolbar → move cursor over grid to show placement preview. |
| **Notes** | Tracked for resolution under **P05-29**; implementation should tune materials/colors and, if possible, add a regression-friendly assertion. |
| **Fixed in** | — |

---

## Resolved

_(None yet.)_
```

- [ ] **Step 2: Commit**

```bash
git add docs/development/observed-bugs.md
git commit -m "docs: add observed-bugs log with B-001 gate preview contrast"
```

---

### Task 7: Add Cursor rule — no direct `main` commits; use worktrees

**Files:**
- Create: `.cursor/rules/020-git-worktree-no-main.mdc`

- [ ] **Step 1: Create file with frontmatter + body**

```markdown
---
description: Git hygiene — no direct commits to main; use feature branches and worktrees
alwaysApply: true
---

# Git: worktrees and branch isolation

1. **Do not commit directly to `main`.** All substantive work (features, fixes, docs batches, ticket updates that are part of a deliverable) happens on a **dedicated branch**.
2. **Prefer a dedicated git worktree** per parallel effort (see `git worktree add`), especially for doc sweeps or long-running refactors, so `main` stays clean and switch-cost stays low.
3. **Before starting multi-file work**, create or attach to a branch: `git checkout -b <type>/<short-topic>` from current `origin/main` (or rebase as per team policy).
4. **Integrate via PR** (or explicit maintainer merge policy) — never `git push origin main` from agent sessions unless the user explicitly orders an emergency hotfix and owns the risk.

This rule sits under HACER precedence: it does **not** override the user’s explicit instruction for a one-off operation, but agents should **warn** before direct `main` writes.
```

- [ ] **Step 2: Commit**

```bash
git add .cursor/rules/020-git-worktree-no-main.mdc
git commit -m "chore(cursor): add rule requiring branches and worktrees over main"
```

---

### Task 8: Point REPO_MAP at observed-bugs

**Files:**
- Modify: `REPO_MAP.md`

- [ ] **Step 1: In “Common tasks → start here” table, add row:**

```markdown
| **Observed bugs (informal)** | `docs/development/observed-bugs.md` |
```

- [ ] **Step 2: Commit**

```bash
git add REPO_MAP.md
git commit -m "docs: link REPO_MAP to observed-bugs log"
```

---

### Task 9: Optional AGENTS.md one-liner (Cursor track)

**Files:**
- Modify: `AGENTS.md` (Cursor track block only, ~3 lines)

- [ ] **Step 1: After the Cursor track bullet list, append:**

```markdown
- **Git hygiene for agents:** `.cursor/rules/020-git-worktree-no-main.mdc` — avoid committing directly to `main`; use a branch and preferably a **git worktree** per workstream.
```

- [ ] **Step 2: Commit**

```bash
git add AGENTS.md
git commit -m "docs(agents): reference worktree/no-main cursor rule"
```

---

### Task 10: Verification (docs-only branch)

**Files:** —

- [ ] **Step 1: Run gates (should be unchanged by Markdown / mdc only)**

```bash
pnpm run lint
pnpm run test:run
pnpm run test:e2e:store
pnpm run build
```

Expected: all exit **0** (MDC and markdown should not affect TS build).

- [ ] **Step 2: Push branch and open PR**

```bash
git push -u origin docs/p05-10-followups-plan-2026-05-14
```

Then open a PR titled e.g. `docs: P05-10 ticket fixes, P05-29 follow-up, observed bugs log, git worktree rule`.

---

## Self-review (plan author)

**1. Spec coverage**

| User ask | Task covering it |
|----------|------------------|
| Follow-up tickets; naming must say “not visible” + fix surfacing | Task 1–4 (`P05-29` title + index) |
| Fix P05-10 gaps | Task 5 |
| Observed bugs doc + gate preview light mode | Task 6 (`B-001`) |
| LLM rule: no `main`, worktrees | Task 7–8–9 |

**2. Placeholder scan:** No `TBD` / empty steps; ticket body is complete; commits are concrete.

**3. Type consistency:** `clearCircuit` / `simulationTick` / `value: number` match `src/store` as of 2026-05-14 `main`.

**Gap:** If team policy forbids new `alwaysApply` rules, drop Task 7 `alwaysApply` or set `false` and link from `AGENTS.md` only — adjust in PR review.

---

**Plan complete and saved to**  
`docs/superpowers/plans/2026-05-14-p05-10-followups-and-process-hygiene.md`  
(on branch `docs/p05-10-followups-plan-2026-05-14` in worktree  
`.worktrees/p05-10-followups-plan`).

**Two execution options:**

1. **Subagent-driven (recommended)** — Dispatch a fresh subagent per task; review after Tasks 5–7 (ticket + P05-10 + rule) before push. **Required sub-skill:** superpowers:subagent-driven-development.

2. **Inline execution** — Run tasks 1–10 in one session with human checkpoints before `git push`. **Required sub-skill:** superpowers:executing-plans.

**Which approach?**
