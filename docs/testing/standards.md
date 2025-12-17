# Testing Standards

> **See also:** [structure.md](./structure.md) for file organization, [templates/](./templates/) for test templates

This document defines testing standards for AI-generated and human-written tests to ensure test quality and reliability.

---

## TDD Workflow (MANDATORY)

This project follows **Test-Driven Development**. All new features and bug fixes MUST follow the Red-Green-Refactor cycle.

### The Red-Green-Refactor Cycle

```
┌─────────────────────────────────────────────────────────────┐
│  1. RED: Write a failing test that defines the behavior     │
│     ↓                                                       │
│  2. GREEN: Write minimal code to make the test pass         │
│     ↓                                                       │
│  3. REFACTOR: Clean up code while keeping tests green       │
│     ↓                                                       │
│  (repeat)                                                   │
└─────────────────────────────────────────────────────────────┘
```

### TDD Step-by-Step

1. **Understand the requirement** - What behavior should the code exhibit?
2. **Write a test** - Create a test that describes the expected behavior
3. **Run the test** - Verify it FAILS (this confirms the test is valid)
4. **Write minimal code** - Just enough to make the test pass
5. **Run the test** - Verify it PASSES
6. **Refactor** - Improve code quality while keeping tests green
7. **Repeat** - Add more tests for additional behaviors

### TDD by Code Layer

#### Pure Logic (`src/simulation/`, `src/store/actions/`)

```typescript
// 1. Write the test FIRST
describe('calculateGateOutput', () => {
  it('returns true for NAND when both inputs are false', () => {
    expect(calculateGateOutput('NAND', [false, false])).toBe(true);
  });
});

// 2. Run test - it FAILS (function doesn't exist)
// 3. Write minimal implementation
// 4. Run test - it PASSES
// 5. Add more test cases, repeat
```

#### React Components (`src/gates/`, `src/components/`)

```typescript
// 1. Write RTL test describing user-visible behavior
describe('GateSelector', () => {
  it('displays NAND gate option', () => {
    render(<GateSelector />);
    expect(screen.getByText('NAND')).toBeInTheDocument();
  });

  it('calls onSelect when gate is clicked', async () => {
    const onSelect = vi.fn();
    render(<GateSelector onSelect={onSelect} />);
    await userEvent.click(screen.getByText('NAND'));
    expect(onSelect).toHaveBeenCalledWith('NAND');
  });
});

// 2. Run test - it FAILS
// 3. Create minimal component to pass
// 4. Run test - it PASSES
```

#### E2E Workflows (`e2e/`)

```typescript
// 1. Write Playwright test describing user workflow
test('user can add a NAND gate to the canvas', async ({ page }) => {
  await page.goto('/');
  await page.click('[data-testid="gate-nand"]');
  await page.click('[data-testid="canvas"]');
  await expect(page.locator('[data-testid="gate"]')).toHaveCount(1);
});

// 2. Run test - it FAILS
// 3. Implement the feature
// 4. Run test - it PASSES
```

### Verifying the Red Phase

**Critical**: Always verify your test fails before writing implementation. A test that passes immediately may be:
- Testing the wrong thing
- Not testing anything meaningful
- Already implemented (test after the fact)

```bash
# Run specific test to see it fail
npm test -- --run path/to/file.test.ts

# Temporarily break existing code to verify test catches it
```

### Common TDD Mistakes to Avoid

| Mistake | Problem | Solution |
|---------|---------|----------|
| Writing implementation first | Test just verifies existing code | Always write test first |
| Test passes immediately | Test doesn't test anything | Verify red phase |
| Testing implementation details | Brittle tests | Test behavior/outcomes |
| Skipping refactor phase | Code quality degrades | Refactor after each green |
| Writing too many tests at once | Lose focus | One test at a time |

---

## Core Principles

### 1. Each Test Has ONE Reason to Fail
A test should verify a single behavior. If a test has multiple assertions testing different behaviors, split it.

```typescript
// ❌ Bad: Multiple behaviors in one test
it('handles user input', () => {
  expect(validate('')).toBe(false);
  expect(validate('valid')).toBe(true);
  expect(format('input')).toBe('INPUT');
});

// ✅ Good: One behavior per test
it('rejects empty input', () => {
  expect(validate('')).toBe(false);
});

it('accepts valid input', () => {
  expect(validate('valid')).toBe(true);
});
```

### 2. Test Behavior, Not Implementation
Tests should verify outputs and observable effects, not how code achieves them.

```typescript
// ❌ Bad: Testing implementation details
it('calls internal helper', () => {
  const spy = vi.spyOn(module, '_internalHelper');
  doThing();
  expect(spy).toHaveBeenCalled();
});

// ✅ Good: Testing behavior
it('returns processed result', () => {
  expect(doThing()).toEqual(expectedOutput);
});
```

### 3. Descriptive Test Names
Test names should describe the expected behavior, readable as a sentence.

```typescript
// ❌ Bad: Vague names
it('works', () => {});
it('test gate', () => {});

// ✅ Good: Describes behavior
it('returns true when both inputs are false', () => {});
it('throws error when wire connects to itself', () => {});
```

### 4. No Logic in Tests
Tests should not contain conditionals, loops, or complex logic. If you need iteration, use property-based testing.

```typescript
// ❌ Bad: Logic in test
it('validates all inputs', () => {
  for (const input of inputs) {
    if (input.valid) {
      expect(validate(input)).toBe(true);
    }
  }
});

// ✅ Good: Explicit cases or property-based
it('validates email format', () => {
  expect(validate('user@example.com')).toBe(true);
});

// ✅ Good: Property-based for many cases
it('accepts any valid email', () => {
  fc.assert(fc.property(fc.emailAddress(), (email) => {
    return validate(email) === true;
  }));
});
```

### 5. Include Edge Cases
Every test suite should cover:
- Empty/null/undefined inputs
- Boundary values (0, -1, MAX_INT)
- Error paths and exceptions
- Single element vs multiple elements

### 6. Tests Must Be Able to Fail
A test that can never fail is useless. Verify by temporarily breaking the code.

```typescript
// ❌ Bad: Always passes (no assertion)
it('renders component', () => {
  render(<Component />);
});

// ❌ Bad: Tautology
it('returns what it returns', () => {
  const result = fn();
  expect(result).toEqual(result);
});

// ✅ Good: Can fail
it('renders with correct title', () => {
  render(<Component title="Hello" />);
  expect(screen.getByText('Hello')).toBeInTheDocument();
});
```

---

## Test Quality Verification

### Mutation Testing with Stryker

Mutation testing automatically verifies test quality by introducing bugs (mutants) and checking if tests catch them.

```bash
# Run mutation testing
npm run stryker

# View HTML report
open reports/mutation/html/index.html
```

**Interpreting Results:**
- **Killed mutants**: Tests caught the bug ✅
- **Survived mutants**: Tests missed the bug ❌ (weak tests)
- **Timeout/Error**: Mutant caused infinite loop or crash
- **No coverage**: Code not covered by any test

**Target Scores:**
- 80%+ mutation score for critical logic (simulation, core)
- 60%+ for UI components
- 50% minimum threshold (build fails below this)

### Common Survived Mutants and Fixes

| Mutant Type | Example | Fix |
|-------------|---------|-----|
| Boundary | `>` → `>=` | Add boundary test cases |
| Negation | `!x` → `x` | Test both true/false paths |
| Arithmetic | `+` → `-` | Verify calculation results |
| Return value | `return x` → `return null` | Assert on return value |

---

## E2E Test Strategy (Playwright)

E2E tests come in **pairs**: Store tests (fast) and UI tests (slow).

### Store vs UI Tests

| Aspect | Store Tests (`@store`) | UI Tests (`@ui`) |
|--------|------------------------|------------------|
| Speed | FAST (no render waits) | SLOW (waits for scene) |
| Actions | Direct store calls | UI interactions |
| When to run | Every commit, TDD | Manual, CI (2x/week) |
| AI agents | Preferred | After store tests pass |
| File suffix | `.store.spec.ts` | `.ui.spec.ts` |

### File Structure

```
e2e/
├── scenarios/           # Shared test data (used by both store & UI)
│   ├── circuitBuilding.ts
│   ├── simulation.ts
│   └── types.ts
├── specs/
│   ├── circuit-building.store.spec.ts  # FAST
│   ├── circuit-building.ui.spec.ts     # SLOW (paired)
│   ├── simulation.store.spec.ts        # FAST
│   └── simulation.ui.spec.ts           # SLOW (paired)
```

### Scenario Files

Both store and UI tests import the same scenario:

```typescript
// e2e/scenarios/featureName.ts
export const featureScenario = {
  placements: [
    { label: 'g1', position: { x: 0, y: 0, z: 0 } },
    { label: 'g2', position: { x: 2, y: 0, z: 0 } },
  ],
  wire: { fromGate: 0, fromPin: 'out-0', toGate: 1, toPin: 'in-0' },
};
```

### Store Test Pattern (FAST)

```typescript
// e2e/specs/feature.store.spec.ts
import { featureScenario } from '../scenarios';

test.describe('Feature @store', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    // NO waitForSceneStable - keep it fast
  });

  test('updates state correctly', async ({ page }) => {
    const { placements } = featureScenario;
    await page.evaluate((pos) => {
      window.__STORE__.getState().actions.addGate('NAND', pos);
    }, placements[0].position);

    const count = await page.evaluate(() =>
      Object.keys(window.__STORE__.getState().gates).length
    );
    expect(count).toBe(1);
  });
});
```

### UI Test Pattern (SLOW)

```typescript
// e2e/specs/feature.ui.spec.ts
import { featureScenario } from '../scenarios';
import { addGateViaUI } from '../helpers/actions';
import { waitForSceneStable } from '../helpers/waits';

test.describe('Feature @ui', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await waitForSceneStable(page); // Required for UI tests
  });

  test('user can add gate via UI', async ({ page }) => {
    const { placements } = featureScenario;
    await addGateViaUI(page, {
      type: 'NAND',
      position: placements[0].position,
    });
    await expectGateCount(page, 1);
  });
});
```

### Running E2E Tests

```bash
# TDD workflow (fast, run often)
npm run test:e2e:store

# Full validation (slow, run manually or CI)
npm run test:e2e:ui

# All tests
npm run test:e2e
```

---

## Test Structure

### File Organization
- Co-locate tests with implementation: `Component.tsx` → `Component.test.tsx`
- E2E tests in pairs: `feature.store.spec.ts` + `feature.ui.spec.ts`
- Use descriptive describe blocks for grouping
- Order: setup → happy path → edge cases → error cases

### Standard Test Template

```typescript
import { describe, it, expect, beforeEach, vi } from 'vitest';

describe('ComponentName', () => {
  // Setup shared across tests
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('methodName', () => {
    it('returns expected result for valid input', () => {
      // Arrange
      const input = createValidInput();
      
      // Act
      const result = method(input);
      
      // Assert
      expect(result).toEqual(expectedOutput);
    });

    it('throws error for invalid input', () => {
      expect(() => method(null)).toThrow('Input required');
    });

    it('handles edge case: empty array', () => {
      expect(method([])).toEqual([]);
    });
  });
});
```

---

## AI Test Generation Guidelines

When generating tests, AI agents should:

1. **Read the implementation first** - understand what the code does
2. **Identify all code paths** - branches, error handling, edge cases
3. **Write one test per behavior** - not one test per function
4. **Use realistic test data** - avoid `"test"`, `"foo"`, `"bar"`
5. **Assert on specific values** - not just truthiness
6. **Include negative tests** - what should NOT happen
7. **Avoid over-mocking** - mock boundaries, not internals

### Checklist for AI-Generated Tests

Before submitting AI-generated tests, verify:

- [ ] Each test has a descriptive name explaining the behavior
- [ ] Tests have meaningful assertions (not just `toBeDefined()`)
- [ ] Edge cases are covered (null, empty, boundaries)
- [ ] Error cases are tested
- [ ] No implementation details are tested (private methods, internal state)
- [ ] Tests are independent (no shared mutable state)
- [ ] Mocks are minimal and at system boundaries

---

## Property-Based Testing (Phase 3.5+)

Use fast-check for testing invariants that should hold for all inputs:

```typescript
import fc from 'fast-check';

describe('gateLogic invariants', () => {
  it('NAND is self-dual', () => {
    fc.assert(fc.property(fc.boolean(), fc.boolean(), (a, b) => {
      // NAND(a,b) = NOT(AND(a,b))
      return nand(a, b) === !(a && b);
    }));
  });

  it('double NOT is identity', () => {
    fc.assert(fc.property(fc.boolean(), (a) => {
      return not(not(a)) === a;
    }));
  });
});
```

**When to use property-based testing:**
- Mathematical properties (associativity, commutativity)
- Invariants that must hold for all inputs
- Serialization round-trips
- Parser/formatter pairs

---

## Coverage Requirements

| Layer | Line Coverage | Mutation Score |
|-------|---------------|----------------|
| `src/simulation/` | 90%+ | 80%+ |
| `src/core/` (Phase 5+) | 90%+ | 80%+ |
| `src/store/` | 80%+ | 60%+ |
| `src/components/` | 70%+ | 50%+ |

---

## References

- [Stryker Mutator](https://stryker-mutator.io/)
- [fast-check](https://fast-check.dev/)
- [Testing Trophy](https://kentcdodds.com/blog/the-testing-trophy-and-testing-classifications)
- [Vitest Documentation](https://vitest.dev/)
