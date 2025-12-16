# Type Assertions Audit

This document summarizes the audit and cleanup of type assertions (`as`) in the codebase.

## Summary

**Fixed Issues:**
- ✅ Removed all 14 instances of `as Partial<CircuitStore> as CircuitStore` double assertions
- ✅ Replaced with type-safe `createMockStore()` helper
- ✅ Replaced `as unknown as ThreeEvent<T>` with `createMockThreeEvent()` helper
- ✅ All tests pass after refactoring

## Changes Made

### 1. Created Test Utilities (`src/test/testUtils.ts`)

**`createMockStore(partial)`**
- Replaces `as Partial<CircuitStore> as CircuitStore`
- Type-safe store mocking with sensible defaults
- Uses `satisfies CircuitStore` for validation

**`createMockThreeEvent(point, overrides)`**
- Replaces `as unknown as ThreeEvent<T>`
- Type-safe event mocking for React Three Fiber handlers
- Supports custom properties via `overrides` parameter

### 2. Updated Test Files

**`groundPlaneHandlers.test.ts`**
- Fixed 14 instances of double assertions
- Now uses `createMockStore()` and `createMockThreeEvent()`

**`gateHandlers.test.ts`**
- Fixed 6 instances of `as unknown as ThreeEvent<MouseEvent>`
- Now uses `createMockThreeEvent()`

**`canvasHandlers.test.ts`**
- Already fixed in previous refactoring

## Legitimate `as` Usages

The following `as` usages are **legitimate** and should remain:

### 1. Literal Type Narrowing (`as const`)

```typescript
// ✅ Good - Creates literal types
const colors = { primary: '#1890ff' } as const
const display = 'block' as const
```

**Files:**
- `src/theme/tokens.ts` - Theme token definitions
- `src/components/ui/Sidebar.tsx` - Inline styles
- `src/gates/common/BaseGateLabel.tsx` - CSS properties
- `e2e/selectors/*.ts` - Selector constants

### 2. Tuple Type Assertions

```typescript
// ✅ Good - Ensures tuple type for Three.js
position: [x, y, z] as [number, number, number]
```

**Files:**
- `src/gates/GateRenderer.tsx` - Three.js position/rotation arrays

### 3. Type Annotations in Initial State

```typescript
// ✅ Good - Helps TypeScript infer correct types
gates: [] as import('./types').GateInstance[]
```

**Files:**
- `src/store/circuitStore.ts` - Initial state definitions

### 4. Mock DOM Elements (Test Files)

```typescript
// ✅ Acceptable - Necessary for mocking DOM APIs
const mockCanvas = { ... } as unknown as HTMLElement
```

**Files:**
- `src/hooks/useGateDrag.test.ts` - DOM element mocking

### 5. Function Parameter Type Assertions

```typescript
// ✅ Good - Type-safe parameter passing
return originalGetContext.apply(this, [type, ...args] as Parameters<typeof originalGetContext>)
```

**Files:**
- `src/test/setup.ts` - WebGL context mocking

## Anti-Patterns to Avoid

### ❌ Double Assertions

```typescript
// ❌ BAD - Bypasses type checking
const mock = { wires: [] } as Partial<CircuitStore> as CircuitStore

// ✅ GOOD - Type-safe
const mock = createMockStore({ wires: [] })
```

### ❌ Unknown Assertions for Events

```typescript
// ❌ BAD - Unclear type safety
const event = { point: { x: 1, y: 2, z: 3 } } as unknown as ThreeEvent<MouseEvent>

// ✅ GOOD - Type-safe helper
const event = createMockThreeEvent<MouseEvent>({ x: 1, y: 2, z: 3 })
```

## Best Practices

1. **Use helpers instead of assertions**: Prefer `createMockStore()` and `createMockThreeEvent()` over manual assertions
2. **`as const` is fine**: Use for literal type narrowing
3. **Tuple assertions are fine**: Use for ensuring tuple types (e.g., Three.js arrays)
4. **Avoid double assertions**: Always use type-safe helpers
5. **Document exceptions**: If you must use `as unknown as`, document why

## Verification

All tests pass after refactoring:
- ✅ `groundPlaneHandlers.test.ts` - 15 tests passing
- ✅ `gateHandlers.test.ts` - 18 tests passing
- ✅ `canvasHandlers.test.ts` - 11 tests passing
- ✅ TypeScript compilation successful
- ✅ No linter errors

## See Also

- `src/test/testUtils.ts` - Test utility functions
- `src/test/README.md` - Unit test utilities documentation
- `docs/testing-structure.md` - Testing structure overview
