---
name: code-review
description: Use before marking any task complete and before requesting a PR merge
---

# Code Review for HACER

<instructions>
Use this skill to perform a rigorous self-review or peer review of code changes within the HACER project. The goal is to ensure all changes meet the project's high standards for correctness, TDD compliance, and architectural consistency before they reach CI or are merged into `main`. 

Before calling any task "Done", you must execute the full local verification suite and confirm all checks pass.
</instructions>

<rules>
### 1. Verification Requirements
- **Linting**: `pnpm run lint` must exit with code 0 (ESLint + Typecheck).
- **Unit Tests**: `pnpm run test:run` must pass all Vitest tests.
- **Store E2E**: `pnpm run test:e2e:store` must pass all Playwright store tests.
- **Build**: `pnpm run build` must succeed without errors.

### 2. TDD Iron Law
- **Red Phase**: Every production function must be written *after* a failing test.
- **Verification**: Tests must initially fail to prove they are testing the logic.
- **Behavioral Focus**: Assert real behavior, not internal implementation details or mocks.
- **Regressions**: Tests must be robust enough to catch future regressions.

### 3. HACER Code Conventions
- **Structure**: Exactly one React component per file; components must stay under 200 lines.
- **State Management**: 
  - Read via selectors: `useCircuitStore(s => s.x)`.
  - Mutate via `circuitActions.*()` only.
- **Optimization**: Do NOT use `useMemo`, `useCallback`, or `React.memo` (React Compiler handles this).
- **Feedback**: Use Ant Design `message`/`notification` instead of `console.log`.
- **Resources**: Explicitly dispose of Three.js resources on component unmount.
- **Typing**: No `any` types; use strict interfaces; JSDoc (`@param`, `@returns`) on all exports.

### 4. Phase & Documentation
- **Alignment**: Code must belong to the current development phase defined in `.cursorrules`.
- **Docs**: Update JSDoc for public API changes and `REPO_MAP.md` for structural changes.
- **Tracking**: Ensure `tasks/todo.md` accurately reflects the implementation state.
</rules>

<examples>
#### Critical Feedback (Must Fix)
- "The NAND gate logic is inverted compared to the spec; this breaks the half-adder circuit."
- "Missing test coverage for the null state when a wire is disconnected mid-simulation."
- "Zustand state is being mutated directly instead of using `circuitActions`."

#### Important Feedback (Should Fix)
- "This file contains two React components; please split `GateIcon` into its own file per HACER conventions."
- "Manual `useMemo` detected; please remove it to let the React Compiler manage memoization."

#### Minor Feedback (At Discretion)
- "Naming: `inputPinA` might be clearer as `leftInputPin` to match the 3D layout."
- "JSDoc for this helper is slightly outdated after the parameter rename."
</examples>

## PR Checklist Quick-Ref
- [ ] Red-Green-Refactor loop verified?
- [ ] Local verification suite (`lint`, `test`, `build`) passed?
- [ ] Phase compliance checked against `.cursorrules`?
- [ ] No `any` types or `console.log` remaining?
