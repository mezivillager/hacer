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
- One decision per file. Use [`0000-template.md`](0000-template.md).
- Each ADR lists the living docs it affects and whether they were reconciled.

## When to add one
At the end of a session (or when the docs-sync Stop hook prompts), run the **`docs-sync`** skill.
It captures decisions here and then runs the author pass in [`../llm-docs-sync.md`](../llm-docs-sync.md).

## Index
| ADR | Title | Status | Date |
|-----|-------|--------|------|
| [0001](0001-adopt-adr-log-and-docs-sync-enforcement.md) | Adopt ADR log + enforced docs-sync | Accepted | 2026-06-19 |
| [0002](0002-commit-and-worktree-conventions.md) | Commit attribution & worktree location conventions | Accepted | 2026-06-19 |
| [0003](0003-design-for-longevity.md) | Design for long-term extensibility over near-term expedience | Accepted | 2026-06-19 |
