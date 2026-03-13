# Testing Documentation

This folder contains all testing-related documentation for the HACER project.

## Quick Links

| Document | Description |
|----------|-------------|
| [standards.md](./standards.md) | TDD workflow, test quality principles, mutation testing |
| [stryker-evaluation.md](./stryker-evaluation.md) | Stryker setup evaluation, config, CI, gap-detection results |
| [structure.md](./structure.md) | Test file organization, unit vs E2E separation |
| [templates/](./templates/) | Copy-paste templates for new tests |

## Templates

| Template | Use Case |
|----------|----------|
| [tdd-unit.template.ts](./templates/tdd-unit.template.ts) | Pure logic functions (simulation, store actions) |
| [tdd-component.template.tsx](./templates/tdd-component.template.tsx) | React components with RTL |
| [tdd-e2e.template.ts](./templates/tdd-e2e.template.ts) | Playwright E2E tests (store + UI pairs) |

## TDD Quick Reference

```
1. RED    → Write failing test first
2. GREEN  → Write minimal code to pass
3. REFACTOR → Clean up, keep tests green
```

## Test Types

### Unit Tests (Vitest)
- Location: Co-located with source (`Component.test.tsx`)
- Run: `pnpm run test:run`
- Speed: Fast
- Use for: Pure logic, components, hooks

### E2E Tests (Playwright)
- Location: `e2e/specs/`
- **Store tests** (`@store`): Fast, run before every commit
  - `pnpm run test:e2e:store`
- **UI tests** (`@ui`): Slow, run manually or CI (2x/week)
  - `pnpm run test:e2e:ui`

### Mutation Tests (Stryker)
- Run: `pnpm run stryker`
- Purpose: Verify test quality by introducing bugs
- Config: `stryker.config.json` — extend the `mutate` array as the codebase grows
- When: CI on PRs (changed files only, max 3; ~3 min)
- See: [stryker-evaluation.md](./stryker-evaluation.md)

## AI Agent Notes

When implementing features:
1. Create test file FIRST (`.test.ts` or `.test.tsx`)
2. Run tests to see them FAIL
3. Implement minimal code to pass
4. For E2E: Create store test first (fast), UI test second

See [standards.md](./standards.md) for detailed workflow.
