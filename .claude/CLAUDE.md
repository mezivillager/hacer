# HACER

Hardware Architecture Circuit Editor and Runtime. A 3D circuit simulator inspired by nand2tetris.

## Quick Start for AI Agents

See [llms.txt](../llms.txt) for document discovery order.

1. **Constitution (Step 0)**: [.claude/CONSTITUTION.md](../.claude/CONSTITUTION.md) — core behavioral guidelines and hard rules.
2. **Start here**: [AGENTS.md](../AGENTS.md) — cognitive protocols, CI quality gates, universal workflow, and Superpowers pipelines.
3. **Phase tracking**: [.cursorrules](../.cursorrules) — current phase, stack rules, TDD protocol
4. **Workflow**: [docs/llm-workflow.md](../docs/llm-workflow.md) — planning, subagents, and caching
5. **Patterns**: [HACER_LLM_GUIDE.md](../HACER_LLM_GUIDE.md) — React, Zustand, R3F, testing
6. **Structure**: [REPO_MAP.md](../REPO_MAP.md) — directory layout, where files go

## Skills (load on demand)

| Phase | Skill | When to use |
|-------|-------|-------------|
| Entry | `using-superpowers` | Start any conversation — skill discovery, invoke before action |
| Entry | `verification-before-completion` | Before claiming work complete — evidence before assertions |
| Design | `brainstorming` | Before any feature — HARD GATE: design before code |
| Plan | `planning` | After design approved — bite-sized task plans |
| Plan | `writing-plans` | Multi-step task — create implementation plan from spec |
| Execute | `using-git-worktrees` | Before feature work — isolated workspace |
| Execute | `subagent-driven-development` | Execute plan with subagents (same session) |
| Execute | `executing-plans` | Execute plan in current session (no subagents) |
| Execute | `tdd` / `test-driven-development` | During implementation — Iron Law TDD |
| Execute | `systematic-debugging` | On any bug or failure — root cause before fix |
| Review | `requesting-code-review` | After task or before merge — dispatch code reviewer |
| Review | `code-review` | Before PR — full self-review checklist |
| Finish | `finishing-a-development-branch` | Implementation complete — merge, PR, or cleanup |
| HACER | `hacer-patterns` | Any HACER code — stack, architecture, patterns |

Full list: `.claude/skills/` — each skill has a `SKILL.md` with frontmatter `name` and `description`.

**Skill equivalence:** `tdd` and `test-driven-development` are equivalent for HACER — use either for TDD. `systematic-debugging` extends `debugging` with a stricter 4-phase process; use `systematic-debugging` for bugs and test failures.

## Task Management

- **Plan & track**: [tasks/todo.md](../tasks/todo.md)
- **Capture lessons**: [tasks/lessons.md](../tasks/lessons.md)
- **Design specs**: [docs/specs/](../docs/specs/)
- **Implementation plans**: [docs/plans/](../docs/plans/)

## Verification Before Done

```bash
pnpm run lint              # TypeScript + ESLint — must exit 0
pnpm run test:run          # Vitest unit tests — must all pass
pnpm run test:e2e:store    # Playwright store tests — must all pass
pnpm run build             # Production build — must succeed
```
