# Testing Standards

This document defines testing standards for AI-generated and human-written tests to ensure test quality and reliability.

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

## Test Structure

### File Organization
- Co-locate tests with implementation: `Component.tsx` → `Component.test.tsx`
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
