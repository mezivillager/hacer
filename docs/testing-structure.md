# Testing Structure

This document describes the organization of test utilities, types, and infrastructure in the codebase.

## Overview

The codebase has two distinct testing layers:
1. **Unit Tests** (Vitest) - Fast, isolated tests for individual functions/components
2. **E2E Tests** (Playwright) - Integration tests that run in a real browser

Each layer has its own utilities and types, kept separate to avoid confusion.

## Directory Structure

```
src/
├── test/                    # Unit test utilities (Vitest)
│   ├── setup.ts            # Global Vitest setup (WebGL mocks, etc.)
│   ├── testUtils.ts        # Unit test helper functions
│   └── README.md           # Unit test documentation
│
└── types/                  # Production types (NO test types here)

e2e/
├── types/                  # E2E test types (Playwright)
│   ├── globals.ts          # Window globals types & augmentation
│   ├── window.ts           # Type re-exports for convenience
│   ├── window.d.ts         # TypeScript declarations
│   ├── index.ts            # Barrel export
│   └── README.md           # E2E types documentation
│
├── fixtures/               # Playwright test fixtures
├── helpers/                # Playwright helper functions
├── selectors/              # CSS selectors for E2E tests
└── specs/                  # E2E test specifications
```

## Unit Tests (`src/test/`)

### Purpose
Utilities and setup for **Vitest unit tests**.

### Files

- **`setup.ts`**: Global test setup (runs before all tests)
  - WebGL context mocks for Three.js
  - Testing Library setup
  
- **`testUtils.ts`**: Helper functions for unit tests
  - `createMockStore()` - Type-safe store mocking (replaces `as Partial<CircuitStore> as CircuitStore`)

### Usage

```typescript
import { createMockStore } from '@/test/testUtils'

const mockStore = createMockStore({ wires: [wire1, wire2] })
vi.mocked(useCircuitStore.getState).mockReturnValue(mockStore)
```

### Guidelines

- ✅ Use `createMockStore()` instead of type assertions
- ✅ Keep utilities focused on unit testing needs
- ❌ Don't put E2E-specific code here
- ❌ Don't use `as` type assertions for mocks

## E2E Tests (`e2e/types/`)

### Purpose
TypeScript types and Window interface augmentation for **Playwright E2E tests**.

### Files

- **`globals.ts`**: 
  - Defines types for window globals (`__SCENE_HELPERS__`, `__CIRCUIT_ACTIONS__`, etc.)
  - Augments the global `Window` interface
  - **Imported in production code** for the side-effect of Window augmentation

- **`window.ts`**: Re-exports types for convenience in E2E tests

- **`window.d.ts`**: Ensures TypeScript picks up Window augmentation

### Usage

**In Production Code** (for Window augmentation side-effect):
```typescript
import '../../e2e/types/globals' // Window augmentation
```

**In E2E Tests**:
```typescript
import type { CircuitActionsAPI, SceneHelpers } from '../types'
```

### Guidelines

- ✅ Keep E2E-specific types here
- ✅ Window augmentation is imported in production code (side-effect)
- ❌ Don't put unit test utilities here
- ❌ Don't put production types here

## Migration Notes

### Before (Old Structure)
- ❌ `src/types/testingGlobals.ts` - Mixed location, unclear purpose
- ❌ `e2e/types/` just re-exported from `src/types/`

### After (New Structure)
- ✅ `e2e/types/globals.ts` - Clear location, E2E-specific
- ✅ `src/test/testUtils.ts` - Clear location, unit test-specific
- ✅ Clear separation of concerns

## Best Practices

1. **Separation**: Unit test utilities ≠ E2E test utilities
2. **Location**: 
   - Unit test code → `src/test/`
   - E2E test code → `e2e/`
3. **Types**:
   - Production types → `src/types/` or co-located with code
   - E2E test types → `e2e/types/`
4. **Imports**:
   - Unit tests import from `@/test/testUtils`
   - E2E tests import from `../types` (relative to e2e/)
   - Production code imports `e2e/types/globals` for Window augmentation

## See Also

- `src/test/README.md` - Unit test utilities documentation
- `e2e/types/README.md` - E2E types documentation
