# AGENTS.md — Universal AI Agent Guide for HACER

**HACER** = Hardware Architecture Circuit Editor and Runtime. A 3D logic-gate simulator built with React 19, React Three Fiber, Zustand, and Vitest/Playwright.

> This file is read automatically by OpenAI Codex, GitHub Copilot, and other AI agents.  
> Claude Code users: also see `.claude/CLAUDE.md` and `.claude/skills/`.  
> Cursor users: also see `.cursorrules`.

---

## 1. Start Every Session Here

```
1. Read AGENTS.md (this file)         → cognitive protocols + CI gates
2. Read .cursorrules                   → phase tracking + stack rules
3. Read docs/llm-workflow.md           → planning/subagent/verification workflow
4. Read tasks/todo.md                  → current task plan
5. Read tasks/lessons.md               → past mistakes to avoid
```

For patterns & examples → `HACER_LLM_GUIDE.md`  
For directory layout   → `REPO_MAP.md`

---

## 2. Cognitive Protocols (from AI Research)

These protocols are derived from six foundational papers on LLM reasoning and agent behavior. Follow them on every non-trivial task.

### ReAct (Reason + Act + Observe)
*Source: [Yao et al., 2022](https://arxiv.org/abs/2210.03629)*

Before every tool call or code change:
1. **Reason**: State what you believe is true and why
2. **Act**: Execute the smallest possible action to test the belief
3. **Observe**: Read the actual output; update your belief

> Never act without reasoning. Never assume the output without observing.

### Chain-of-Thought
*Source: [Wei et al., 2022](https://arxiv.org/abs/2201.11903)*

Break every multi-step problem into explicit numbered intermediate steps. Write them out. Do not skip steps mentally. "Think step by step" is not a slogan — it is the execution model.

### Tree-of-Thoughts
*Source: [Yao et al., 2023](https://arxiv.org/abs/2305.10601)*

Before committing to any approach, **propose 2–3 alternatives** with trade-offs. Evaluate them explicitly. Pick the best one. Do not take the first idea that sounds reasonable.

### Reflexion
*Source: [Shinn et al., 2023](https://arxiv.org/abs/2303.11366)*

After any correction from the user, or any bug you caused, write a short lesson to `tasks/lessons.md`. Re-read lessons at session start. Verbal reflection without code changes is not enough — **capture it in writing**.

### Generative Agents (Memory Model)
*Source: [Park et al., 2023](https://arxiv.org/abs/2304.03442)*

Treat context as a memory hierarchy:
- **Working memory** → `.claude/CLAUDE.md` (active session context, ~always loaded)
- **Semantic memory** → `.claude/skills/*.md` (loaded on demand, ~5k tokens each)
- **Episodic memory** → `tasks/lessons.md` (past events, reviewed at session start)
- **Long-term plan** → `docs/plans/` (implementation plans, persisted in git)

### Toolformer (Tool Selection)
*Source: [Schick et al., 2023](https://arxiv.org/abs/2302.04761)*

Use the cheapest tool that gets the job done. Tool use has costs (tokens, latency, side-effects):
- Reading a file → use `view` or `grep`, not `bash cat`
- Finding a pattern → use `grep`, not opening every file
- Running tests → `npm run test:run` for fast, `npm run test:e2e:store` for store, full suite only when needed
- Exploring directories → `glob`, not `find`

---

## 3. Mandatory Development Workflow

```
Design  →  Plan  →  TDD  →  Debug  →  Review  →  Merge
```

### Step 1 — Design First (HARD GATE)
**Do NOT write code until a design is approved.**
- For any task with 3+ implementation steps, write a spec first
- Save specs to `docs/specs/YYYY-MM-DD-<topic>.md`
- Present the design; get approval; then proceed
- Claude Code users: see `.claude/skills/brainstorming/SKILL.md`

### Step 2 — Write a Plan
- Break implementation into 2–5 minute atomic tasks
- Each task: exact file path, complete code snippet, verification command
- Save plans to `docs/plans/YYYY-MM-DD-<feature>.md`
- Claude Code users: see `.claude/skills/planning/SKILL.md`

### Step 3 — Test-Driven Development (IRON LAW)
```
NO production code without a failing test first.
```
Red → Green → Refactor. Every time. No exceptions.
- See `.claude/skills/tdd/SKILL.md` for the complete protocol
- See `docs/testing/` for HACER-specific templates

### Step 4 — Systematic Debugging
```
NO fix without root-cause investigation first.
```
Four phases: Read errors → Reproduce → Hypothesize → Fix.
- See `.claude/skills/debugging/SKILL.md`

### Step 5 — Code Review Before Merge
Run the full verification suite, then self-review:
```bash
npm run lint          # TypeScript + ESLint
npm run test:run      # Vitest unit tests
npm run test:e2e:store # Playwright store tests
npm run build         # tsc + Vite build
```
- See `.claude/skills/code-review/SKILL.md`

---

## 4. How GitHub Actions Enforce Quality

This section directly answers: *"How does the GitHub Action enforce quality?"*

Quality is enforced in **four automated layers**, all of which run without human involvement:

### Layer 1 — Pre-commit Hook (local, every `git commit`)
File: `.husky/pre-commit`

| Check | Command | Blocks commit? |
|-------|---------|---------------|
| ESLint auto-fix + verify | `lint-staged` | ✅ Hard — commit fails |
| TypeScript type check | `npm run typecheck` | ✅ Hard — commit fails |
| Test file presence check | `./scripts/check-test-files.sh` | ⚠️ Soft — warns only |

**What it catches:** Style violations, type errors, and missing test files — *before the code ever leaves your machine.*

### Layer 2 — CI Workflow (remote, every push + every PR to `main`)
File: `.github/workflows/ci.yml`

| Step | Command | What it catches |
|------|---------|-----------------|
| Lint | `npm run lint` | TypeScript errors + ESLint violations |
| Unit tests | `npm run test:run` | Failing Vitest tests |
| Build | `npm run build` | Compilation errors, broken imports |
| E2E store tests | `npm run test:e2e:store` | Store/state integration failures |

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
CI fails at "Lint"       → TypeScript error or ESLint violation. Run `npm run lint` locally.
CI fails at "Unit tests" → A Vitest test failed. Run `npm run test:run` locally.
CI fails at "Build"      → Compilation error. Run `npm run build` locally.
CI fails at "E2E store"  → Playwright store test failed. Run `npm run test:e2e:store` locally.
Mutation test fails      → A test always passes regardless of code. Fix the test to assert real behavior.
```

---

## 5. HACER-Specific Quick Reference

| Concern | Where to look |
|---------|--------------|
| Stack rules (React 19, Zustand, R3F) | `.cursorrules` → Stack section |
| Phase tracking | `.cursorrules` → Phase Tracking section |
| Testing patterns + templates | `docs/testing/` |
| File organization | `REPO_MAP.md` |
| Detailed code examples | `HACER_LLM_GUIDE.md` |
| Skills (TDD, debug, plan, review) | `.claude/skills/*/SKILL.md` |

### Key Commands
```bash
npm run dev              # Dev server
npm run lint             # TypeScript + ESLint (MANDATORY before commit)
npm run typecheck        # TypeScript only
npm run test             # Vitest watch mode
npm run test:run         # Vitest (single run)
npm run test:coverage    # Vitest + coverage report
npm run test:e2e:store   # Playwright store tests (fast, use this pre-commit)
npm run test:e2e:ui      # Playwright UI tests (slow, use selectively)
npm run build            # Production build
```

---

## 6. Task Management

- `tasks/todo.md` → current task plan (update before and during work)
- `tasks/lessons.md` → lessons from corrections (always read at session start; always update after mistakes)
- `docs/specs/` → design documents (output of brainstorming)
- `docs/plans/` → implementation plans (output of planning)
