# HACER

Hardware Architecture Circuit Editor and Runtime. A 3D circuit simulator inspired by nand2tetris.

## Quick Start for AI Agents

1. **Start here**: [AGENTS.md](../AGENTS.md) — cognitive protocols, CI quality gates, universal workflow
2. **Phase tracking**: [.cursorrules](../.cursorrules) — current phase, stack rules, TDD protocol
3. **Workflow**: [docs/llm-workflow.md](../docs/llm-workflow.md) — planning, subagents, verification
4. **Patterns**: [HACER_LLM_GUIDE.md](../HACER_LLM_GUIDE.md) — React, Zustand, R3F, testing
5. **Structure**: [REPO_MAP.md](../REPO_MAP.md) — directory layout, where files go

## Skills (load on demand)

| Skill | When to use |
|-------|-------------|
| `.claude/skills/brainstorming/SKILL.md` | Before any feature — HARD GATE: design before code |
| `.claude/skills/planning/SKILL.md` | After design approved — bite-sized task plans |
| `.claude/skills/tdd/SKILL.md` | During implementation — Iron Law TDD |
| `.claude/skills/debugging/SKILL.md` | On any bug or failure — 4-phase root cause |
| `.claude/skills/code-review/SKILL.md` | Before PR — full self-review checklist |
| `.claude/skills/hacer-patterns/SKILL.md` | Any HACER code — stack, architecture, patterns |

## Task Management

- **Plan & track**: [tasks/todo.md](../tasks/todo.md)
- **Capture lessons**: [tasks/lessons.md](../tasks/lessons.md)
- **Design specs**: [docs/specs/](../docs/specs/)
- **Implementation plans**: [docs/plans/](../docs/plans/)

## Verification Before Done

```bash
npm run lint              # TypeScript + ESLint — must exit 0
npm run test:run          # Vitest unit tests — must all pass
npm run test:e2e:store    # Playwright store tests — must all pass
npm run build             # Production build — must succeed
```
