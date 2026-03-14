# GitHub Copilot Instructions for HACER

See [AGENTS.md](../AGENTS.md) for the complete guide — it covers cognitive protocols, the mandatory development workflow, and how CI enforces quality.

## Quick Rules

- **Stack**: React 19 (React Compiler — no manual memoization), TypeScript strict, Zustand for state, React Three Fiber for 3D, Vitest + Playwright
- **TDD is mandatory**: write the test first, watch it fail, then implement
- **No `console.log`** for user feedback — use Ant Design Message/Notification
- **One component per file** — never put multiple React components in one file
- **State**: read via `useCircuitStore(state => ...)`, mutate via `circuitActions.*()` only
- **Types**: no `any`; use branded types (GateId, WireId, PinId) where available

## Before Completing Any Task

```bash
pnpm run lint             # must exit 0
pnpm run test:run         # all unit tests must pass
pnpm run test:e2e:store   # all store E2E tests must pass
```

## Phase Tracking

Check `.cursorrules` → "Phase Tracking" section before starting. Always implement for the current phase only.

## For More Detail

- `.cursorrules` — phase rules, TDD protocol, critical patterns
- `docs/llm-workflow.md` — planning, subagents, verification
- `HACER_LLM_GUIDE.md` — React, Zustand, R3F patterns + examples
- `REPO_MAP.md` — where files go
