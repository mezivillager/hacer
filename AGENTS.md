# AGENTS.md — Universal AI Agent Guide for HACER

**HACER** = Hardware Architecture Circuit Editor and Runtime. A 3D logic-gate simulator built with React 19, React Three Fiber, Zustand, and Vitest/Playwright.

> This file is read automatically by OpenAI Codex, GitHub Copilot, and other AI agents.  
> Claude Code users: also see `.claude/CLAUDE.md` and `.claude/skills/`.  
> Cursor users: also see `.cursorrules`, `.cursor/rules/000-hacer-precedence.mdc`, and `.cursor/AGENTS.md` (trimmed ECC hints).

---

## 0. Rule precedence & definition of done

**When instructions conflict, follow this order (highest wins):**

1. The **user’s current message**  
2. **`.cursorrules`** — HACER stack (React 19, Zustand, React Compiler, no Valtio)  
3. **This `AGENTS.md`** — workflow, CI, protocols  
4. **`HACER_LLM_GUIDE.md`** — codebase patterns and examples  
5. **`REPO_MAP.md`** — file locations; do not assume directories that are not documented here  
6. **`.cursor/rules/`** (ECC-derived) — general quality only where it does **not** contradict 2–5  

**Definition of done — mandatory before claiming work is complete:** all of the following must succeed with **exit code 0**:

`pnpm run lint` · `pnpm run test:run` · `pnpm run test:e2e:store` · `pnpm run build`

No waivers. If a step fails, the task is **not** done.

**Harness / MCP / hooks (Cursor):** see **`docs/llm-harness.md`**.

---

## 1. Start every session here

### All agents

- **Patterns & examples** → `HACER_LLM_GUIDE.md`  
- **Where files live + task jump table** → `REPO_MAP.md` (section *Common tasks → start here*)  
- **Planning / verification workflow** → `docs/llm-workflow.md`  
- **Current task plan** → `tasks/todo.md`  
- **Past mistakes** → `tasks/lessons.md`  

### Claude Code track

```
0. Read .claude/CONSTITUTION.md     → if present: foundational rules of engagement (skip if missing)
1. Read AGENTS.md (this file)
2. Read .cursorrules
3. Read docs/llm-workflow.md
4. Read tasks/todo.md
5. Read tasks/lessons.md
```

### Cursor track

```
1. Read .cursorrules
2. Read AGENTS.md (this file)
3. Read docs/llm-harness.md          → MCP + ECC hook tuning, session hygiene
4. Read docs/llm-workflow.md         → when planning / multi-step work
5. Read tasks/todo.md and tasks/lessons.md
```

Do **not** require missing paths: if `.claude/CONSTITUTION.md` or other Claude-only files are absent, continue with the Cursor track.

---

## 2. Cognitive Protocols

On every non-trivial task, follow: **ReAct** (Reason → Act → Observe), **Chain-of-Thought** (explicit numbered steps), **Tree-of-Thoughts** (propose 2–3 alternatives before committing), **Reflexion** (capture lessons in `tasks/lessons.md`), **Toolformer** (cheapest tool that works).

Full details with paper citations: **[`docs/cognitive-protocols.md`](docs/cognitive-protocols.md)**

---

## 3. Mandatory Development Workflow (Superpowers Pipeline)

```
Brainstorm  →  Worktree  →  Plan  →  Execute (Subagents + TDD)  →  Review  →  Finish Branch
```

### Step 1 — Brainstorming & Spec First (HARD GATE)
**Do NOT write code until a design is approved.**
- For any task with 3+ implementation steps, trigger the `brainstorming` skill.
- Save specs to `docs/specs/YYYY-MM-DD-<topic>.md`.
- Present the design; get approval; then proceed.

### Step 2 — Branching / Worktrees
**Do NOT push directly to main without isolating your work.**
- Trigger `using-git-worktrees` to establish a parallel dev stream.

### Step 3 — Write a Plan
- Trigger the `planning` skill.
- Break implementation into 2–5 minute atomic tasks.
- Each task: exact file path, complete code snippet, verification command.
- Save plans to `docs/plans/YYYY-MM-DD-<feature>.md`.

### Step 4 — Execution & TDD (IRON LAW)
```
NO production code without a failing test first.
```
- Trigger `subagent-driven-development` or `dispatching-parallel-agents` for concurrent tasks.
- Enforce the `test-driven-development` skill loop (Red → Green → Refactor). No exceptions.
- See `docs/testing/` for HACER-specific templates.

### Step 5 — Systematic Debugging
```
NO fix without root-cause investigation first.
```
- Upon bugs or failure, trigger the `debugging` skill. Let it run its 4-phase root cause process before suggesting code.

### Step 6 — Review & Finish
- Trigger `requesting-code-review` and `finishing-a-development-branch` when implementations meet the spec (Claude Code / Superpowers).
- Code must pass: **`pnpm run lint`**, **`pnpm run test:run`**, **`pnpm run test:e2e:store`**, **`pnpm run build`** — see §0 *Definition of done*.

---

## 4. How GitHub Actions Enforce Quality

This section directly answers: *"How does the GitHub Action enforce quality?"*

Quality is enforced in **four automated layers**, all of which run without human involvement:

### Layer 1 — Pre-commit Hook (local, every `git commit`)
File: `.husky/pre-commit`

| Check | Command | Blocks commit? |
|-------|---------|---------------|
| ESLint auto-fix + verify | `lint-staged` | ✅ Hard — commit fails |
| TypeScript type check | `pnpm run typecheck` | ✅ Hard — commit fails |
| Test file presence check | `./scripts/check-test-files.sh` | ⚠️ Soft — warns only |

**What it catches:** Style violations, type errors, and missing test files — *before the code ever leaves your machine.*

### Layer 2 — CI Workflow (remote, every push + every PR to `main`)
File: `.github/workflows/ci.yml`

| Step | Command | What it catches |
|------|---------|-----------------|
| Lint | `pnpm run lint` | TypeScript errors + ESLint violations |
| Unit tests | `pnpm run test:run` | Failing Vitest tests |
| Build | `pnpm run build` | Compilation errors, broken imports |
| E2E store tests | `pnpm run test:e2e:store` | Store/state integration failures |

**Enforcement mechanism:** If *any* of these steps returns a non-zero exit code, the workflow fails. With branch protection rules requiring the `CI` status check, the PR **cannot be merged** until all steps pass.

### Layer 3 — Mutation Testing (remote, every PR touching `src/`)
File: `.github/workflows/mutation.yml`

Stryker mutates your source code (changes `+` to `-`, flips `&&` to `||`, etc.) and runs your tests against each mutation. If a test suite passes on a mutated version, that test is not actually verifying the behavior it claims to verify.

**What it catches:** Tests that always pass regardless of what the code does. This is the strongest quality signal — it catches copy-paste test boilerplate and tests that verify mocks instead of real behavior.

### Layer 4 — Scheduled Full E2E (Wed + Sat at 4am UTC)
File: `.github/workflows/e2e-ui.yml`

Full Playwright UI tests (`@ui` tag) run on a schedule to catch regressions that only appear in end-to-end browser scenarios. These are too slow for every PR but run regularly enough to catch drift.

---

### How to Read a CI Failure

```
CI fails at "Lint"       → TypeScript error or ESLint violation. Run `pnpm run lint` locally.
CI fails at "Unit tests" → A Vitest test failed. Run `pnpm run test:run` locally.
CI fails at "Build"      → Compilation error. Run `pnpm run build` locally.
CI fails at "E2E store"  → Playwright store test failed. Run `pnpm run test:e2e:store` locally.
Mutation test fails      → A test always passes regardless of code. Fix the test to assert real behavior.
```

---

## 5. HACER-Specific Quick Reference

| Concern | Where to look |
|---------|--------------|
| Stack rules (React 19, Zustand, R3F) | `.cursorrules` → Stack section |
| Rule precedence (Cursor) | `.cursor/rules/000-hacer-precedence.mdc` |
| Phase tracking | `.cursorrules` → Phase Tracking; `REPO_MAP.md`; `docs/roadmap/implementation.md` → *AI agent phase sync* |
| Testing patterns + templates | `docs/testing/` |
| File organization + task entry points | `REPO_MAP.md` |
| Detailed code examples | `HACER_LLM_GUIDE.md` |
| Skills (TDD, debug, plan, review) | `.claude/skills/*/SKILL.md` · `.cursor/skills/` (project) |
| MCP, ECC hooks, session hygiene | `docs/llm-harness.md` |

### Key Commands
```bash
pnpm run dev              # Dev server
pnpm run lint             # TypeScript + ESLint (MANDATORY before commit)
pnpm run typecheck        # TypeScript only
pnpm run test             # Vitest watch mode
pnpm run test:run         # Vitest (single run)
pnpm run test:coverage    # Vitest + coverage report
pnpm run test:e2e:store   # Playwright store tests (fast, use this pre-commit)
pnpm run test:e2e:ui      # Playwright UI tests (slow, use selectively)
pnpm run build            # Production build
```

---

## 6. Task Management

- `tasks/todo.md` → current task plan (update before and during work)
- `tasks/lessons.md` → lessons from corrections (always read at session start; always update after mistakes)
- `docs/specs/` → design documents (output of brainstorming)
- `docs/plans/` → implementation plans (output of planning)

---

## 7. Session Management and Failure Patterns

*From Claude Code Best Practices: avoid common failure modes.*

| Pattern | Fix |
|---------|-----|
| **Kitchen sink session** — one task, then unrelated questions, then back to the first | Clear context between unrelated tasks. Start fresh for each distinct workstream. |
| **Correcting over and over** — same issue, multiple failed corrections, context polluted | After 2+ failed corrections on the same issue, clear context and re-prompt with a better initial prompt that incorporates what you learned. |
| **Trust-then-verify gap** — plausible-looking implementation that doesn't handle edge cases | Always provide verification (tests, lint, build). Run `pnpm run lint`, `pnpm run test:run`, `pnpm run test:e2e:store` before marking done. Never ship without proof. |
| **Infinite exploration** — "investigate" without scoping; reads hundreds of files | Scope investigations narrowly. Use subagents so exploration doesn't consume your main context. One focused task per subagent. |
| **Over-specified docs** — rules get lost in noise, agent ignores half of them | Keep AGENTS.md and .cursorrules concise. Ruthlessly prune. If the agent already does something correctly without the instruction, delete it. |
