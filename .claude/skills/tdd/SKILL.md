---
name: test-driven-development
description: Use when implementing any feature or bug fix — before writing any production code
---

# Test-Driven Development (TDD) for HACER

## The Iron Law

```
NO PRODUCTION CODE WITHOUT A FAILING TEST FIRST
```

Write code before the test? Delete it. Start over.

## Red → Green → Refactor

### RED — Write the failing test

Write one test that describes the behavior you want. Run it. Watch it fail.

```bash
npm run test -- --run path/to/file.test.ts
```

Confirm:
- The test **fails** (not errors out)
- It fails because the feature is **missing** (not a typo)
- The failure message is **exactly what you expected**

If the test passes immediately → you are testing existing behavior, not new behavior. Fix the test.

### GREEN — Write minimal code to pass

Write the **smallest amount of production code** that makes the test pass. No extra features. No refactoring. Just pass the test.

```bash
npm run test -- --run path/to/file.test.ts
```

### REFACTOR — Clean up while staying green

Remove duplication, improve names, extract helpers. Run tests after every change. Never add behavior during refactor.

---

## HACER Test Patterns

### Pure logic (store actions, simulation)
```typescript
// tests/store/actions/myAction.test.ts
import { describe, it, expect, beforeEach } from 'vitest'
import { useCircuitStore } from '@/store/circuitStore'

beforeEach(() => {
  useCircuitStore.setState(useCircuitStore.getInitialState())
})

it('should do X when Y', () => {
  const { doX } = circuitActions
  doX(input)
  const result = useCircuitStore.getState().someSlice
  expect(result).toEqual(expected)
})
```

### React components (React Testing Library)
```typescript
// src/components/MyComponent.test.tsx
import { render, screen } from '@testing-library/react'
import { MyComponent } from './MyComponent'

it('renders label when visible', () => {
  render(<MyComponent visible={true} />)
  expect(screen.getByText('Expected Label')).toBeInTheDocument()
})
```

### E2E store test (Playwright)
See `e2e/specs/` for examples. Run with:
```bash
npm run test:e2e:store
```

---

## HACER Test File Conventions

| Source file | Test file |
|-------------|-----------|
| `src/store/actions/myAction.ts` | `src/store/actions/myAction.test.ts` |
| `src/components/MyComponent.tsx` | `src/components/MyComponent.test.tsx` |
| `src/utils/helpers.ts` | `src/utils/helpers.test.ts` |
| Store integration | `e2e/specs/feature.spec.ts` (tagged `@store`) |
| UI interaction | `e2e/specs/feature.spec.ts` (tagged `@ui`) |

Templates: `docs/testing/templates/`

---

## Common Rationalizations to Reject

| Excuse | Truth |
|--------|-------|
| "It's too simple to test" | Simple code still breaks. Test takes 30 seconds. |
| "I'll write tests after" | Tests written after pass immediately — proving nothing. |
| "I already manually tested it" | Ad-hoc ≠ systematic. Can't re-run it next week. |
| "TDD will slow me down" | Debugging production bugs is slower. TDD finds them in seconds. |

---

## Verification Checklist

Before marking any task complete:

- [ ] Test written **before** implementation
- [ ] Watched test **fail** for the right reason
- [ ] Wrote **minimal** code to pass
- [ ] All tests pass: `npm run test:run`
- [ ] E2E store tests pass: `npm run test:e2e:store`
- [ ] No TypeScript errors: `npm run lint`
