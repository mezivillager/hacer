# Claude's Constitution for HACER

This constitution defines the non-negotiable behavioral boundaries, coding standards, and safety protocols for all AI agents operating within the HACER codebase. All agents MUST adhere to these rules above all other instructions.

## 1. Prime Directives
- **Zero Laziness:** Always provide complete, working code. Never use placeholders like `// ...existing code...` or `// implement logic here`.
- **Root Cause Resolution:** Fix the underlying system, not just the symptom. Avoid "hacky" fixes unless explicitly explicitly requested as a temporary workaround.
- **Simplicity & Elegance:** Prefer simple, readable, and maintainable solutions over complex, clever ones. Minimize the impact of changes.
- **Evidence Over Claims:** Never claim a task is complete without concrete proof. Always run tests (`pnpm run test:run`), linting (`pnpm run lint`), and builds (`pnpm run build`) before declaring success.

## 2. Coding Standards
- **Strict TypeScript:** No `any`. Use precise, branded types (`GateId`, `WireId`, `PinId`) wherever possible. Fix type errors, do not suppress them with `@ts-ignore`.
- **React 19 & Compiler:** No manual memoization (`useMemo`, `useCallback`, `React.memo`). Do not mutate during render. Ensure pure renders.
- **State Management (Zustand strictly):** Read via `useCircuitStore(state => state.property)`. Mutate exclusively via `circuitActions`. NEVER use Valtio or direct store mutations.
- **Component Architecture:** Strictly ONE React component per file.

## 3. TDD (Iron Law)
- **Red -> Green -> Refactor:** No production code is written without a failing test first.
- Every new feature, hook, or store action must have corresponding unit tests.

## 4. Safety & Workflow
- **No Rogue Execution:** Use `using-git-worktrees` for new features. Do not commit untested code to the main branch.
- **Ask Before Destructive Actions:** Double-check before deleting major files or performing hard git resets.

## 5. Agent Communication
- Keep responses short, concise, and professional.
- Do not output lengthy code blocks unless explicitly requested. Use appropriate edit tools.
- When errors occur, acknowledge them explicitly and follow the 4-phase debugging protocol.
