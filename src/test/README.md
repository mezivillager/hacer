# Test Utilities

This directory contains utilities and setup for **unit tests** (Vitest).

## Structure

- `setup.ts` - Global Vitest test setup (WebGL mocks, etc.)
- `testUtils.ts` - Unit test helper functions (e.g., `createMockStore`)

## Usage

### Setup

The setup file is automatically loaded by Vitest (configured in `vite.config.ts`).

### Test Utilities

```typescript
import { createMockStore } from '@/test/testUtils'

// Create a properly typed mock store
const mockStore = createMockStore({ wires: [wire1, wire2] })
vi.mocked(useCircuitStore.getState).mockReturnValue(mockStore)
```

## Notes

- **Unit tests only**: These utilities are for Vitest unit tests
- **E2E tests**: See `e2e/` directory for Playwright E2E test infrastructure
- **No type assertions**: Use `createMockStore()` instead of `as Partial<CircuitStore> as CircuitStore`
