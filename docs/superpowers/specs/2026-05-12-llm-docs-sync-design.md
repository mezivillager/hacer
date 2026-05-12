# LLM docs sync — design specification

**Status:** Approved for implementation planning  
**Date:** 2026-05-12  
**Scope:** Instructions for AI authors and AI/human reviewers so living documentation stays aligned with the codebase without automated grep CI.

---

## 1. Context

HACER previously explored an automated documentation drift script (`docs:check`) targeting removed stacks (e.g. Ant Design, Storybook). Those dependencies are gone from the repo; the guard added CI and local friction without proportional benefit and was removed.

The remaining problem is **process**: agents often finish code changes without reconciling **roadmaps**, **implementation checklists**, **ticket trackers**, and **entry-point docs** that humans and other agents rely on.

---

## 2. Goals

- Define a **canonical checklist** for **authors** (before claiming work complete) and **reviewers** (second pass).
- Scope updates to **living** documents only; preserve archival specs/plans as historical record.
- Avoid resurrecting **repo-wide mandatory greps** in CI for long-gone libraries.

## 3. Non-goals

- No requirement to edit frozen migration specs/planes unless explicitly in scope.
- No replacement “truth guard” CI step that scans the tree for banned strings.
- No obligation to rewrite historical Phase narratives beyond correcting **current status** claims when they become false.

---

## 4. Approach

**Canonical doc + pointers.**

1. Add **`docs/llm-docs-sync.md`** — full **Author pass** and **Reviewer pass** procedures and copy-paste checklist templates.
2. Add **short pointers** (3–8 lines each) in:
   - **`AGENTS.md`** — link + when to run author vs reviewer pass (near definition of done or section 5 quick reference).
   - **`.github/copilot-instructions.md`** — same link + “before completing” reminder.

Optional later: a Cursor skill or rule that invokes the checklist by name; not required for this design.

---

## 5. Living documentation set

Agents apply updates **only where the change logically applies**. Default inventory:

| Surface | Update when |
|---------|-------------|
| `REPO_MAP.md` | Directories renamed/moved/added; major entry points change; phase banner text changes |
| `docs/roadmap/implementation.md` | Phase sync table, stack rows, implementation checklist boxes, or quality gates change meaningfully |
| `docs/roadmap/README.md` | Phase navigation labels or definition-of-done commands change |
| `docs/roadmap/phases/*.md` | Phase status or “current truth” sections contradict shipped behavior |
| `docs/plans/phase-0.5-tickets-CHECKLIST.md` | A Phase 0.5 ticket is completed or materially rescoped |
| `docs/plans/phase-0.5-tickets/P05-*.md` | Ticket text (imports, mounting, evidence paths) no longer matches code |
| `README.md` | User-visible features, prerequisites (Node/pnpm), or high-level roadmap table contradict reality |
| `.cursorrules` | Phase-tracking banner must match agreed phase wording elsewhere |
| `HACER_LLM_GUIDE.md` | Stack patterns or mandatory examples change |
| `.github/copilot-instructions.md` | Same as agent-facing rule changes affecting Copilot users |

## 6. Frozen / low-touch paths

Do **not** edit unless the task explicitly includes them:

- `docs/specs/**` and dated archival migration plans marked “Do Not Modify”
- `tasks/lessons.md` except when recording a new lesson per project convention
- `docs/superpowers/plans/**` as historical execution artifacts (may add notes; avoid rewriting tasks unless superseding)

---

## 7. Author pass (before claiming complete)

**Audience:** Implementing agent.

**Procedure:**

1. List **which rows from §5** this diff touches (or **none**, with rationale).
2. For each applicable row: **updated** | **N/A** + one-line reason.
3. If completing a roadmap checklist item or Phase 0.5 ticket: cite **files updated** and **evidence paths** (tests or modules).

**Minimum bar:** If the change affects **phase status**, **public features**, or **where code lives**, at least one of `implementation.md`, `REPO_MAP.md`, `README.md`, or ticket/checklist docs must be reconciled.

---

## 8. Reviewer pass (second pair of eyes)

**Audience:** Reviewer agent or human reviewer focusing on doc truth.

**Procedure:**

1. **Cross-phase banners:** `.cursorrules` phase lines vs `docs/roadmap/implementation.md` AI Agent Phase Sync vs `README.md` “Current Status” — no contradiction.
2. **Toolchain/runtime:** `.nvmrc`, `package.json` engines, and workflow Node majors consistent with documented prerequisites.
3. **Phase 0.5:** `phase-0.5-tickets-CHECKLIST.md` matches linked `P05-*.md` claims and plausible code locations.
4. **User promises:** README “Available now” / stack table does not advertise removed or unimplemented capabilities.

**Optional:** If uncertainty remains, targeted manual search (`rg`) on paths from §5 — never mandatory in CI.

---

## 9. Relationship to definition of done

Code **definition of done** remains: `pnpm run lint`, `pnpm run test:run`, `pnpm run test:e2e:store`, `pnpm run build`.

The docs sync passes are **documentation correctness gates for agents**: authors complete §7; reviewers apply §8 before approving merges that materially affect product or structure.

---

## 10. Implementation deliverables (follow-up plan)

Not part of this spec’s approval artifact; tracked when executing:

1. Create **`docs/llm-docs-sync.md`** with expanded wording and markdown templates for §7–§8.
2. Insert pointers into **`AGENTS.md`** and **`.github/copilot-instructions.md`** (and optionally `.cursorrules` one-line pointer).
3. Add **`docs/llm-workflow.md`** cross-link if there is an existing “verification” subsection.

---

## 11. Spec self-review

- **Placeholders:** None intended; paths are exemplars — adjust filenames only if repo layout changes.
- **Consistency:** Author vs reviewer responsibilities are disjoint but complementary.
- **Scope:** Single spec; implementation plan may batch doc edits in one PR.
