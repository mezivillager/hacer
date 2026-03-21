# ECC agent hints (HACER — TypeScript / React)

This folder is a **trimmed** [Everything Claude Code](https://github.com/affaan-m/everything-claude-code) bundle for **this repo**. For **stack-specific gates** (Zustand, React Compiler, Vitest, Playwright), prefer the repo root **`AGENTS.md`** and **`.cursorrules`**.

**Trimmed counts (this project):** ~17 skills, **15** slash commands (core workflow only), **15** subagent files (TypeScript + general workflows).

## Core principles

1. **Agent-first** — Delegate focused work to the right subagent when useful  
2. **Test-driven** — Align with project test commands (`pnpm run test:run`, etc.)  
3. **Security-first** — No secrets in source; validate inputs at boundaries  
4. **Immutability** — Prefer new objects over mutating shared state (matches HACER store patterns)  
5. **Plan before large changes** — Break work into verifiable steps  

## Subagents available in `.cursor/agents/`

| Agent | Purpose |
|-------|---------|
| **planner** | Implementation planning, phased breakdown |
| **architect** | System design tradeoffs |
| **tdd-guide** | Test-first workflow |
| **code-reviewer** | Quality / maintainability after edits |
| **typescript-reviewer** | TS/JS-specific review |
| **security-reviewer** | Security-sensitive changes |
| **build-error-resolver** | Typecheck / build failures |
| **e2e-runner** | Playwright / E2E flows |
| **refactor-cleaner** | Dead code / cleanup |
| **doc-updater** | Docs and codemaps |
| **docs-lookup** | Library / API documentation research |
| **database-reviewer** | SQL / schema / query review (if applicable) |
| **chief-of-staff** | Communication triage / drafts |
| **loop-operator** | Long-running agent loops |
| **harness-optimizer** | Tooling / harness tuning |

## When to delegate

- Non-trivial feature → **planner** (then implement with tests)  
- After substantive edits → **code-reviewer** or **typescript-reviewer**  
- Failing `pnpm run build` / `typecheck` → **build-error-resolver**  
- Auth, parsing untrusted input, or crypto → **security-reviewer**  
- Flaky or missing E2E coverage → **e2e-runner**  

## Slash commands

**`.cursor/commands/`** (15): `plan`, `tdd`, `verify`, `e2e`, `code-review`, `build-fix`, `refactor-clean`, `test-coverage`, `update-docs`, `update-codemaps`, `quality-gate`, `checkpoint`, `harness-audit`, `learn`, `setup-pm`. Restore others from [ECC](https://github.com/affaan-m/everything-claude-code) if needed.

## Security (short)

- No hardcoded secrets; use env / secret manager  
- Validate external input; parameterized SQL; sanitize HTML where relevant  
- On suspected leak: stop, review, rotate credentials  

## Project layout (this `.cursor/` tree)

```
agents/       — Subagent prompts (trimmed)
commands/     — Slash commands (trimmed)
hooks/        — Cursor hook scripts
rules/        — common-* + typescript-* only
skills/       — Trimmed workflow skills
```

## Success criteria (align with CI)

Match **HACER** checks: `pnpm run lint`, `pnpm run test:run`, `pnpm run test:e2e:store`, `pnpm run build` — see root **`AGENTS.md`** for the full checklist.
