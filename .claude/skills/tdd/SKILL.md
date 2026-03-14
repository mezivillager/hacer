---
name: tdd
description: Use when implementing any feature or bug fix — before writing any production code
---

# Test-Driven Development (TDD) for HACER

<instructions>
You are an expert TDD practitioner.
THE IRON LAW: NO PRODUCTION CODE WITHOUT A FAILING TEST FIRST. Write code before the test? Delete it. Start over.

## Process: Red → Green → Refactor

### RED — Write the failing test
Write one test that describes the behavior you want. Run it. Watch it fail.
`pnpm run test -- --run path/to/file.test.ts`
Confirm: The test fails (not errors out), it fails because the feature is missing, and the failure message is exactly what you expected.

### GREEN — Write minimal code to pass
Write the *smallest amount of production code* that makes the test pass. No extra features. No refactoring. Just pass the test.
`pnpm run test -- --run path/to/file.test.ts`

### REFACTOR — Clean up while staying green
Remove duplication, improve names, extract helpers. Run tests after every change. Never add behavior during refactor.

### Verification Checklist Before Marking Done
- [ ] Test written **before** implementation
- [ ] Watched test **fail** for the right reason
- [ ] Wrote **minimal** code to pass
- [ ] All tests pass: `pnpm run test:run`
- [ ] E2E store tests pass: `pnpm run test:e2e:store`
- [ ] No TypeScript errors: `pnpm run lint`
</instructions>

<examples>
<example>
### Pure logic (store actions, simulation)
```typescript
import { describe, it, expect, beforeEach } from 'vitest'
import { useCircuitStore, circuitActions } from '@/store/circuitStore'

beforeEach(() => {
  useCircuitStore.setState({ /* copy from canonical or derive from initialState */ })
})

it('should do X when Y', () => {
  circuitActions.someAction(/* args */)
  const state = useCircuitStore.getState()
  expect(state.someSlice).toBe(expected)
})
```
</example>
<example>
### React components (React Testing Library)
```typescript
import { render, screen } from '@testing-library/react'
import { MyComponent } from './MyComponent'

it('renders label when visible', () => {
  render(<MyComponent visible={true} />)
  expect(screen.getByText('Expected Label')).toBeInTheDocument()
})
```
</example>
</examples>

<rules>
## HACER Test File Conventions
- Store actions: `src/store/actions/myAction.test.ts`
- React components: Co-located `src/components/MyComponent.test.tsx`
- Generic logic: Co-located `src/utils/helpers.test.ts`
- E2E Store tests: `e2e/specs/feature.spec.ts` (tagged `@store`)

## Common Rationalizations to Reject
- "It's too simple to test" -> Simple code breaks. Test takes 30s.
- "I'll write tests after" -> Tests written after pass immediately, proving nothing.
- "I already manually tested it" -> Not systematic. Can't re-run in CI.
</rules>
