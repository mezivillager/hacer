# HACER

Hardware Architecture Circuit Editor and Runtime. A 3D circuit simulator inspired by nand2tetris.

## Quick Start for AI Agents

1. **Start here**: [.cursorrules](../.cursorrules) — phase tracking, TDD protocol, quick rules
2. **Workflow**: [docs/llm-workflow.md](../docs/llm-workflow.md) — plan mode, subagents, verification, task management
3. **Patterns**: [HACER_LLM_GUIDE.md](../HACER_LLM_GUIDE.md) — React, Zustand, R3F, testing, file organization
4. **Structure**: [REPO_MAP.md](../REPO_MAP.md) — directory layout, where files go

## Task Management

- **Plan & track**: [tasks/todo.md](../tasks/todo.md)
- **Capture lessons**: [tasks/lessons.md](../tasks/lessons.md)

## Verification Before Done

- `pnpm run test:run` — unit/component tests
- `pnpm run test:e2e:store` — fast E2E (run before commit)
- `pnpm run lint` — mandatory
- `pnpm run typecheck` — TypeScript
