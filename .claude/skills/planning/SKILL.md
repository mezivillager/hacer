---
name: planning
description: Use after a design is approved, before writing any implementation code, to create a bite-sized task plan
---

# Implementation Planning for HACER

<instructions>
Turn an approved design into a sequence of 2–5 minute atomic tasks. Each task is self-contained: write test → watch it fail → implement → watch it pass → commit.

Save plans to docs/plans/YYYY-MM-DD-feature.md.
</instructions>

<rules>
- **Granularity**: Each task is ONE behavior, ONE test, ONE commit. If a task has "and" in its name, split it.
- **Verification**: Never mark a task as complete without concrete proof (test results, logs).
- **Plan First**: Write the plan into tasks/todo.md using checkable items.
- **Track Progress**: Mark items as complete in tasks/todo.md as progress is made.
- **HACER Stack**: Follow React 19, Zustand, and TDD protocols.
- **File Organization**: Refer to REPO_MAP.md for correct placement.
</rules>

<examples>
### Task N: Add `placeGate` action to store

**Files:**
- Create: src/store/actions/gates/placeGate.ts
- Modify: src/store/useCircuitStore.ts
- Test: src/store/actions/gates/placeGate.test.ts

- [ ] Write failing test:
```typescript
it('placeGate adds a gate to the store', () => {
  circuitActions.placeGate({ type: 'NAND', position: [0, 0, 0] })
  const gates = useCircuitStore.getState().gates
  expect(Object.keys(gates)).toHaveLength(1)
})
```

- [ ] Run test, confirm RED: `pnpm run test -- --run src/store/actions/gates/placeGate.test.ts`
- [ ] Implement minimal code.
- [ ] Run test, confirm GREEN.
- [ ] Run full suite: `pnpm run test:run`
- [ ] Commit: `feat: add placeGate action to store`

### Good vs Bad Task Names
- **Good**: "Add `placeGate` action to store", "Render gate as Box geometry when selected", "Clear selection on Escape key"
- **Bad**: "Add gate placement with selection and keyboard handling", "Implement all store actions"
</examples>

## Plan Structure (Required)

```markdown
# Implementation Plan: <Feature Name>
Date: YYYY-MM-DD
Spec: docs/specs/YYYY-MM-DD-<topic>.md

**Goal:** One sentence.
**Files:** List every file to create or modify.
**Run tests with:** `pnpm run test:run && pnpm run test:e2e:store`
```

## HACER-Specific Guidance

### Zustand Action Tasks
```typescript
beforeEach(() => {
  useCircuitStore.setState(useCircuitStore.getInitialState())
})
```

### React Component Tasks
```typescript
it('shows gate label when hovered', () => {
  render(<GateComponent hovered={true} gateId="g1" />)
  expect(screen.getByText('NAND')).toBeInTheDocument()
})
```

## After the Plan
Show the plan to the user and get confirmation before executing. Execute each task in order using the TDD skill. Commit after each passing task.
