# AGENTS.md — Universal AI Agent Guide for HACER

**HACER** = Hardware Architecture and Constraints Explorer & Researcher. A 3D logic-gate simulator built with React 19, React Three Fiber, Zustand, and Vitest/Playwright.

**This file is a table of contents** — it points to the file that owns each rule's full detail rather than restating it. Read automatically by OpenAI Codex, GitHub Copilot, and other AI agents; Claude Code users also read `.claude/CLAUDE.md` and `.claude/skills/`.

---

## 0. Rule precedence & definition of done

**When instructions conflict, follow this order (highest wins):**

1. The **user's current message**
2. **`.cursorrules`** — HACER stack (React 19, Zustand, React Compiler, no Valtio)
3. **This `AGENTS.md`** — workflow, CI, protocols
4. **`HACER_LLM_GUIDE.md`** — codebase patterns and examples
5. **`REPO_MAP.md`** — file locations; do not assume a directory that is not documented here

**Definition of done — mandatory before claiming work complete:** stated once, in full, at `docs/harness/implementer-brief.md` § Definition of done. No waivers — if a step fails, the task is **not** done.

**Documentation sync & ADRs:** author/reviewer passes → `docs/llm-docs-sync.md`; capture emergent decisions as ADRs in `docs/decisions/` via the `docs-sync` skill.

**Harness / MCP / hooks (Cursor):** `docs/llm-harness.md`.

---

## 1. Start every session here

Read in order: `llms.txt`. Task jump table → `REPO_MAP.md` § *Common tasks*. Patterns/examples → `HACER_LLM_GUIDE.md`. Cognitive protocols → §2 below. Current plan → `tasks/todo.md`; past mistakes → `tasks/lessons.md`. Claude Code skill map → `.claude/CLAUDE.md`. Cursor MCP/ECC hook tuning → `docs/llm-harness.md`.

**Git hygiene:** never commit to `main` — feature branch + worktree per workstream: `.cursor/rules/020-git-worktree-no-main.mdc`.

---

## 2. Cognitive protocols & the design tie-breaker

ReAct, Chain-of-Thought, Tree-of-Thoughts, Reflexion, the Generative-Agents memory model, and Toolformer — full detail with paper citations: `docs/cognitive-protocols.md`.

**Decision tie-breaker, for every design/scoping/review call:** favor HACER's long-term arc (extensibility, configurability, the AI-native North Star) over ease of shipping — [ADR-0003](docs/decisions/0003-design-for-longevity.md); also stated in `.claude/CONSTITUTION.md` §1.

---

## 3. Mandatory development workflow (Superpowers pipeline)

```
Validate Ticket  →  Brainstorm  →  Worktree  →  Plan  →  Execute (Subagents + TDD)  →  Review  →  Finish Branch
```

### Step 1 — Brainstorming & spec first (hard gate)
No code before an approved design. Any task with 3+ implementation steps → trigger `brainstorming`; save specs to `docs/specs/YYYY-MM-DD-<topic>.md`.

#### Step 1.0 — Ticket freshness (read-only validation, before you design)
Tickets are GitHub Issues (ADR-0013): `node scripts/backlog.mjs ready` lists what's pickable, order is `docs/portfolio.md`. Most `docs/plans/phase-0.5-tickets/*` specs were authored early and drift from the code — **trust the code over the ticket.** At pickup, read-only: validate the issue's claims (APIs, paths, dependencies) against the current codebase. In the worktree: revise the ticket file in place (merge/split as needed, never renumber), record a material re-scope as an ADR via `docs-sync`, and keep the issue plus `docs/portfolio.md` in sync — never the retired `docs/plans/phase-0.5-tickets-CHECKLIST.md` (#148).

### Step 2 — Branching / worktrees
Dedicated worktree **outside** the repo, named `hacer-wt-<topic>` — never nested inside the repo: `.cursor/rules/020-git-worktree-no-main.mdc`.

#### Step 2b — Writing docs
No machine-specific absolute paths in docs; every cited path must exist. Enforced by `scripts/check-doc-paths.mjs` in pre-commit and CI. Full rule and exemptions: `.cursor/rules/021-no-absolute-paths-in-docs.mdc`; ADR-0010 (absolute paths), ADR-0014 (path existence).

### Step 3 — Write a plan
Trigger `planning`. Break work into atomic tasks (2–5 min), each with an exact file path and a verification command. Save plans to `docs/plans/YYYY-MM-DD-<feature>.md`.

### Step 4 — Execution & TDD (iron law)
No production code without a failing test first. Trigger `subagent-driven-development` or `dispatching-parallel-agents` for concurrent tasks; enforce `test-driven-development` (Red → Green → Refactor), no exceptions. Templates: `docs/testing/`.

#### Step 4.1 — Non-3D UX testing rigor (mandatory for DOM-shell work)
Two areas share the Zustand store as their contract: the 3D scene (R3F `<Canvas>`) and the non-3D DOM shell (`<Shell>`), which is fully testable in jsdom via `renderShell()` (`src/test/renderShell.tsx`). For any non-3D UX feature or change: component RTL for each new/changed component, RTL integration tests for the user scenarios (the primary correctness gate here), and `@store` Playwright for store-contract behavior. Reserve full-Canvas `@ui` Playwright for genuinely 3D-dependent flows only. Full strategy and the store-vs-UI test split: `docs/testing/standards.md` § E2E Test Strategy.

### Step 5 — Systematic debugging
No fix without root-cause investigation first — trigger `debugging` or `systematic-debugging` and let its 4-phase process run before suggesting code.

### Step 6 — Review & finish
Trigger `requesting-code-review` and `finishing-a-development-branch` once the implementation meets the spec. Must pass §0's definition of done.

---

## 4. Quality gates

Enforced in layers, all without human involvement: the pre-commit hook (`.husky/pre-commit`), CI (`.github/workflows/ci.yml`), PR hygiene (`.github/workflows/pr-hygiene.yml`), browser QA (`.github/workflows/browser-qa.yml`, ADR-0016), and manual E2E (`.github/workflows/e2e.yml`, never automatic). What runs on which PR, what blocks a merge, and how to unstick a required check that reports green but won't merge: `docs/harness/README.md`. A CI failure names the failing step — reproduce that one command from §0's definition of done, locally.

---

## 5. Quick reference

| Concern | Where to look |
|---|---|
| Stack rules, current phase, TDD protocol | `.cursorrules` |
| Code patterns & examples | `HACER_LLM_GUIDE.md` |
| File layout, "add X" jump table | `REPO_MAP.md` |
| Testing patterns + templates | `docs/testing/` |
| Skills (TDD, debug, plan, review) | `.claude/skills/*/SKILL.md` |
| Current task plan / past mistakes | `tasks/todo.md` · `tasks/lessons.md` |
| Design specs / implementation plans | `docs/specs/` · `docs/plans/` |
| Decisions (ADR log) | `docs/decisions/` |
| Session failure patterns (kitchen-sink sessions, over-specified docs, …) | `docs/llm-workflow.md` § Failure patterns |
