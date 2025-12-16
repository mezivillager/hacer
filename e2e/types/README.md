# E2E Test Types

This directory contains TypeScript types and Window interface augmentations for **E2E tests** (Playwright).

## Structure

- `globals.ts` - Window globals types and augmentation (imported in production code for side-effect)
- `window.ts` - Re-exports for convenience in E2E tests
- `window.d.ts` - TypeScript declaration file to ensure Window augmentation is picked up
- `index.ts` - Barrel export

## Usage

### In Production Code

Production code imports `globals.ts` for the side-effect of Window augmentation:

```typescript
import '../../e2e/types/globals' // Window augmentation side-effect
```

### In E2E Tests

Import types from the barrel export:

```typescript
import type { CircuitActionsAPI, SceneHelpers } from '../types'
```

## Notes

- **E2E tests only**: These types are for Playwright E2E tests
- **Unit tests**: See `src/test/` directory for Vitest unit test utilities
- **Window augmentation**: The `globals.ts` file augments the global `Window` interface to include E2E testing properties
