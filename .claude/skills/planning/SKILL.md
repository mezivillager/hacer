---
name: planning
description: Use after a design is approved, before writing any implementation code, to create a bite-sized task plan
---

# Implementation Planning for HACER

## Overview

Turn an approved design into a sequence of 2–5 minute atomic tasks. Each task is self-contained: write test → watch it fail → implement → watch it pass → commit.

Save plans to `docs/plans/YYYY-MM-DD-<feature>.md`.

---

## Plan Structure

### Header (required)

```markdown
# Implementation Plan: <Feature Name>
Date: YYYY-MM-DD
Spec: docs/specs/YYYY-MM-DD-<topic>.md

**Goal:** One sentence.
**Files:** List every file to create or modify.
**Run tests with:** `npm run test:run && npm run test:e2e:store`
```

### Task Format

Each task follows this exact structure:

````markdown
### Task N: <Name>

**Files:**
- Create: `src/exact/path/file.ts`
- Modify: `src/exact/path/existing.ts`
- Test: `src/exact/path/file.test.ts`

- [ ] Write failing test:
```typescript
it('should do X when Y', () => {
  // complete test code here
  expect(actual).toEqual(expected)
})
```

- [ ] Run test, confirm RED: `npm run test -- --run src/exact/path/file.test.ts`
  Expected: FAIL — "X is not defined" (or similar)

- [ ] Implement minimal code:
```typescript
// complete implementation here — only what's needed to pass the test
```

- [ ] Run test, confirm GREEN: `npm run test -- --run src/exact/path/file.test.ts`
  Expected: PASS

- [ ] Run full suite: `npm run test:run`
  Expected: all pass

- [ ] Commit:
```bash
git add src/exact/path/file.ts src/exact/path/file.test.ts
git commit -m "feat: <what this task adds>"
```
````

---

## Granularity Rules

**Each task is ONE behavior, ONE test, ONE commit.** If a task has "and" in its name, split it.

Good task names:
- "Add `placeGate` action to store"
- "Render gate as Box geometry when selected"
- "Clear selection on Escape key"

Bad task names:
- "Add gate placement with selection and keyboard handling"
- "Implement all store actions"

---

## HACER-Specific Guidance

### Zustand Action Tasks
```typescript
// Test pattern for store actions
beforeEach(() => {
  useCircuitStore.setState(useCircuitStore.getInitialState())
})

it('placeGate adds a gate to the store', () => {
  circuitActions.placeGate({ type: 'NAND', position: [0, 0, 0] })
  const gates = useCircuitStore.getState().gates
  expect(Object.keys(gates)).toHaveLength(1)
})
```

### React Component Tasks
```typescript
// Test pattern for components
it('shows gate label when hovered', () => {
  render(<GateComponent hovered={true} gateId="g1" />)
  expect(screen.getByText('NAND')).toBeInTheDocument()
})
```

### E2E Store Tasks
If the task involves multi-action store workflows, add an `@store`-tagged Playwright test.  
See `e2e/specs/` for examples. Run with `npm run test:e2e:store`.

---

## File Organization (check REPO_MAP.md)

| What | Where |
|------|-------|
| Store actions | `src/store/actions/<feature>/` |
| Gate config | `src/gates/config/<gate>-constants.ts`, `<gate>-helpers.ts`, `<gate>.tsx` |
| UI components | `src/components/<ComponentName>/index.tsx` |
| Tests | Co-located with source file |
| E2E specs | `e2e/specs/<feature>.spec.ts` |

---

## After the Plan

Show the plan to the user and get confirmation before executing.  
Then execute each task in order using the TDD skill. Commit after each passing task.
