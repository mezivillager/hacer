---
name: code-review
description: Use before marking any task complete and before requesting a PR merge
---

# Code Review for HACER

## Before Calling Anything "Done"

Run the full local verification suite:

```bash
npm run lint              # TypeScript type check + ESLint — MUST exit 0
npm run test:run          # All Vitest unit/component tests — MUST all pass
npm run test:e2e:store    # Playwright store tests — MUST all pass
npm run build             # Production build — MUST succeed
```

If any of these fail, fix it before continuing. Never open a PR with a failing suite.

---

## Self-Review Checklist

Go through each item for your diff before pushing:

### Correctness
- [ ] Does the code actually do what was specified in the plan/spec?
- [ ] Are all edge cases handled (empty state, null/undefined, concurrent actions)?
- [ ] Does it work for the cases covered in the tests?

### TDD Compliance
- [ ] Was every production function written *after* a failing test?
- [ ] Do the tests assert real behavior, not implementation details?
- [ ] Would the tests catch a regression if someone broke this code tomorrow?
- [ ] No test that passes trivially (empty assertion, tests a mock)?

### HACER Code Conventions
- [ ] One React component per file
- [ ] Components under 200 lines
- [ ] Zustand state read via selectors: `useCircuitStore(s => s.x)`
- [ ] State mutations via `circuitActions.*()` only
- [ ] No `useMemo` / `useCallback` / `React.memo` (React Compiler handles this)
- [ ] No `console.log` for user feedback (use Ant Design `message`/`notification`)
- [ ] Three.js resources disposed on unmount
- [ ] JSDoc on all exported functions (`@param`, `@returns`)
- [ ] No `any` types; no missing interfaces
- [ ] Hooks called only at top level

### Phase Compliance
- [ ] Does this change belong in the current phase? (check `.cursorrules`)
- [ ] No features from future phases snuck in?

### Documentation
- [ ] JSDoc updated for changed public APIs
- [ ] `REPO_MAP.md` updated if new directories/files added?
- [ ] `tasks/todo.md` reflects current state?

---

## PR Checklist (mirrors `.github/PULL_REQUEST_TEMPLATE.md`)

- [ ] Tests written BEFORE implementation (Red phase)
- [ ] Tests initially FAILED (verified Red phase)
- [ ] Tests define behavior, not implementation details
- [ ] Implementation is minimal to pass tests (Green phase)
- [ ] Code refactored while tests remained green (Refactor phase)
- [ ] `npm run lint` exits 0
- [ ] `npm run test:run` all pass
- [ ] `npm run test:e2e:store` all pass
- [ ] `npm run build` succeeds

---

## What CI Will Check After You Push

| CI Step | Command | Blocks merge? |
|---------|---------|--------------|
| Lint | `npm run lint` | ✅ Yes |
| Unit tests | `npm run test:run` | ✅ Yes |
| Build | `npm run build` | ✅ Yes |
| E2E store tests | `npm run test:e2e:store` | ✅ Yes |
| Mutation testing | Stryker (changed files) | ✅ Yes |

Run everything locally first so CI is a safety net, not a surprise.

---

## Reviewing Someone Else's Code

Focus on:
1. **Does it match the spec?** Nothing more, nothing less.
2. **Are tests meaningful?** Would they catch a real regression?
3. **HACER conventions?** Use the checklist above.
4. **Phase compliance?** No future-phase code.

Feedback levels:
- **Critical**: wrong behavior, broken tests, security issue → must fix before merge
- **Important**: convention violation, missing test coverage → fix before merge
- **Minor**: style, naming, small improvement → fix at discretion
