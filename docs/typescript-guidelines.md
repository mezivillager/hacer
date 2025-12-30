# TypeScript Guidelines

> This document defines TypeScript best practices for the HACER project.

---

## Core Principles

1. **Strict mode always** - No `any`, no implicit any, strict null checks
2. **Prefer inference** - Let TypeScript infer types when possible
3. **Avoid type assertions** - Use type guards and narrowing instead
4. **Use branded types for IDs** - Prevent ID confusion (Phase 5+)

---

## Type Assertions (`as`)

### Avoid Type Assertions

Type assertions bypass TypeScript's type checking. Prefer alternatives:

```typescript
// ❌ BAD - Assertion hides potential bugs
const user = data as User;

// ✅ GOOD - Runtime validation
function isUser(data: unknown): data is User {
  return typeof data === 'object' && data !== null && 'name' in data;
}
if (isUser(data)) {
  // TypeScript knows data is User
}

// ✅ GOOD - Zod validation (Phase 5+)
const user = UserSchema.parse(data);
```

### Never Use Double Assertions

```typescript
// ❌ NEVER - Completely bypasses type safety
const mock = data as unknown as SomeType;
const mock = data as Partial<Type> as Type;

// ✅ GOOD - Use type-safe helpers
const mock = createMockStore({ wires: [] });
```

### Acceptable `as` Usage

#### 1. Literal Type Narrowing (`as const`)

```typescript
// ✅ GOOD - Creates literal/readonly types
const colors = { primary: '#1890ff' } as const;
const directions = ['up', 'down', 'left', 'right'] as const;
type Direction = (typeof directions)[number]; // 'up' | 'down' | 'left' | 'right'
```

#### 2. Tuple Types for Three.js

```typescript
// ✅ GOOD - Ensures tuple type
const position: [number, number, number] = [x, y, z];
// or
position={[x, y, z] as [number, number, number]}
```

#### 3. Initial State with Empty Arrays

```typescript
// ✅ GOOD - Helps inference
const state = {
  gates: [] as GateInstance[],
  wires: [] as WireInstance[],
};
```

#### 4. Type-Safe Test Helpers (Document Why)

```typescript
// ✅ ACCEPTABLE - Documented and contained in helper
export function createMockThreeEvent<T extends Event>(
  point: Vector3Like
): ThreeEvent<T> {
  // Single place for assertion, used by many tests
  return { point: new Vector3(point.x, point.y, point.z) } as ThreeEvent<T>;
}
```

---

## Type Guards

Prefer type guards over assertions:

```typescript
// Type guard function
function isGateInstance(obj: unknown): obj is GateInstance {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'id' in obj &&
    'type' in obj &&
    'position' in obj
  );
}

// Usage
if (isGateInstance(data)) {
  console.log(data.id); // TypeScript knows the type
}
```

### Common Type Guards

```typescript
// Null check
if (value !== null && value !== undefined) { ... }

// Array check
if (Array.isArray(value)) { ... }

// Property narrowing
if ('type' in obj && obj.type === 'NAND') { ... }

// Discriminated unions
type Result = { ok: true; value: T } | { ok: false; error: Error };
if (result.ok) {
  result.value; // TypeScript knows this exists
}
```

---

## Generic Types

### Constrain Generics

```typescript
// ❌ BAD - Too permissive
function process<T>(data: T): T { ... }

// ✅ GOOD - Constrained
function process<T extends GateType>(data: T): T { ... }
```

### Use `satisfies` for Validation

```typescript
// ✅ GOOD - Validates shape, preserves literal types
const config = {
  gates: ['NAND', 'AND', 'OR'],
  maxWires: 100,
} satisfies CircuitConfig;
```

---

## Utility Types

Use built-in utility types:

```typescript
// Partial - all properties optional
type PartialGate = Partial<GateInstance>;

// Required - all properties required
type RequiredGate = Required<GateInstance>;

// Pick - select properties
type GatePosition = Pick<GateInstance, 'position' | 'rotation'>;

// Omit - exclude properties
type GateWithoutId = Omit<GateInstance, 'id'>;

// Record - typed object
type GatesById = Record<string, GateInstance>;

// ReturnType - extract return type
type StoreState = ReturnType<typeof useCircuitStore.getState>;
```

---

## Branded Types (Phase 5+)

Prevent ID confusion with branded types:

```typescript
// Define branded types
type GateId = string & { readonly __brand: 'GateId' };
type WireId = string & { readonly __brand: 'WireId' };

// Factory functions
function createGateId(id: string): GateId {
  return id as GateId;
}

// Type-safe usage
function getGate(id: GateId): GateInstance { ... }
function getWire(id: WireId): WireInstance { ... }

// Prevents mistakes
const gateId = createGateId('g1');
const wireId = createWireId('w1');
getGate(wireId); // ❌ Type error!
getGate(gateId); // ✅ OK
```

---

## Event Handler Types

### React Events

```typescript
// ✅ Use React event types
const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => { ... };
const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => { ... };
```

### React Three Fiber Events

```typescript
import type { ThreeEvent } from '@react-three/fiber';

// ✅ Use ThreeEvent with the underlying event type
const handlePointerDown = (e: ThreeEvent<PointerEvent>) => {
  e.stopPropagation();
  const point = e.point; // Vector3
};
```

---

## Store Types (Zustand)

### Selector Types

```typescript
// ✅ Type-safe selectors
const gates = useCircuitStore((state) => state.gates);
const addGate = useCircuitStore((state) => state.actions.addGate);

// ✅ Derived selectors
const gateCount = useCircuitStore((state) => Object.keys(state.gates).length);
```

### Action Types

```typescript
// ✅ Define action types explicitly
interface CircuitActions {
  addGate: (type: GateType, position: Vector3Like) => void;
  removeGate: (id: string) => void;
  connectWire: (from: PinRef, to: PinRef) => void;
}
```

---

## Import Types

Use `import type` for type-only imports:

```typescript
// ✅ GOOD - Type-only import (removed at runtime)
import type { GateInstance, WireInstance } from './types';

// ✅ GOOD - Mixed import
import { createGate, type GateConfig } from './gates';
```

---

## Linter Rules

The following ESLint rules enforce these guidelines:

```jsonc
{
  "@typescript-eslint/no-explicit-any": "error",
  "@typescript-eslint/no-non-null-assertion": "warn",
  "@typescript-eslint/consistent-type-assertions": ["error", {
    "assertionStyle": "as",
    "objectLiteralTypeAssertions": "never"
  }],
  "@typescript-eslint/consistent-type-imports": ["error", {
    "prefer": "type-imports"
  }]
}
```

---

## Anti-Patterns Summary

| Anti-Pattern | Problem | Solution |
|--------------|---------|----------|
| `as any` | Disables type checking | Use proper types or `unknown` |
| `data as Type` | May hide bugs | Use type guards |
| `as unknown as Type` | Complete bypass | Create type-safe helpers |
| `!` non-null assertion | May crash at runtime | Use optional chaining or guards |
| `// @ts-ignore` | Hides errors | Fix the underlying type issue |
| Implicit `any` | Loses type safety | Enable strict mode |

