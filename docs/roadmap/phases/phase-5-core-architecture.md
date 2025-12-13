# Phase 5: Core Architecture Refactor (Weeks 17-19)

**Part of:** [Comprehensive Development Roadmap](../../README.md)
**Priority:** 🟠 HIGH
**Timeline:** Weeks 17-19
**Dependencies:** Phase 4.5 complete (release management established), Phase 1.5 complete (design system foundation)

---

## Overview

This phase establishes the core architecture that enables all subsequent development. It creates a clean separation between business logic and UI, implements type safety, and builds the foundation for extensibility.

**Exit Criteria:**
- Clean separation: `src/core/` has ZERO React imports
- All branded types implemented and used
- Gate registry is single source of truth
- Zod schemas validate all circuit data
- Event system operational
- All existing tests pass
- Build succeeds with no type errors

---

## 1.1 Directory Structure

```
src/
├── core/           # Pure logic, no UI dependencies
│   ├── gates/      # Gate definitions and registry
│   ├── circuit/    # Circuit document types
│   ├── simulation/ # Simulation engine
│   ├── serialization/ # Data import/export
│   ├── analysis/   # Circuit analysis tools
│   ├── events/     # Event system
│   └── types/      # Shared type definitions
├── api/            # Public programmatic interface
├── plugins/        # Plugin system
├── workers/        # Web Workers
├── store/          # Zustand state management
├── components/     # React UI components
└── hooks/          # React hooks
```

---

## 1.2 Branded Types Implementation

```typescript
// src/core/types/branded.ts
declare const GateIdBrand: unique symbol;
declare const WireIdBrand: unique symbol;
declare const PinIdBrand: unique symbol;
declare const CircuitIdBrand: unique symbol;

// Branded type definitions
export type GateId = string & { readonly [GateIdBrand]: never };
export type WireId = string & { readonly [WireIdBrand]: never };
export type PinId = string & { readonly [PinIdBrand]: never };
export type CircuitId = string & { readonly [CircuitIdBrand]: never };

// Factory functions (the only way to create these IDs)
let gateCounter = 0;
let wireCounter = 0;

export const createGateId = (): GateId => `gate-${++gateCounter}` as GateId;
export const createWireId = (): WireId => `wire-${++wireCounter}` as WireId;

// For deserialization (validates format)
export const toGateId = (id: string): GateId => {
  if (!id.startsWith('gate-')) {
    throw new Error(`Invalid GateId format: ${id}`);
  }
  return id as GateId;
};

export const toWireId = (id: string): WireId => {
  if (!id.startsWith('wire-')) {
    throw new Error(`Invalid WireId format: ${id}`);
  }
  return id as WireId;
};

// Type guards
export const isGateId = (id: string): id is GateId => id.startsWith('gate-');
export const isWireId = (id: string): id is WireId => id.startsWith('wire-');
```

---

## 1.3 Gate Registry System

```typescript
// src/core/gates/types.ts
export type GateType = 'nand' | 'and' | 'or' | 'not' | 'nor' | 'xor' | 'xnor' | 'buffer' | 'dff' | 'register' | 'ram16k' | 'alu' | 'cpu';

export interface PinDefinition {
  id: PinId;
  name: string;
  type: 'input' | 'output';
  description?: string;
  busWidth?: number; // For multi-bit pins
}

export interface GateDefinition {
  type: GateType;
  name: string;
  description: string;
  inputs: PinDefinition[];
  outputs: PinDefinition[];
  evaluate: (inputs: Record<string, boolean>, currentState?: Record<string, boolean>) => Record<string, boolean>;
  clocked?: boolean;
  internalStateKeys?: string[];
  onClockEdge?: (
    currentInputs: Record<string, boolean>,
    currentState: Record<string, boolean>,
    edge: 'rising' | 'falling'
  ) => { newOutputs: Record<string, boolean>; newState: Record<string, boolean> };
  truthTable: Array<{
    inputs: Record<string, boolean>;
    outputs: Record<string, boolean>;
  }>;
  symbol?: string;
  color?: string;
}

export interface CompositeGateDefinition extends GateDefinition {
  type: 'composite';
  parts: Array<{
    gateId: string;
    type: GateType;
    position: Position3D;
    rotation: number;
  }>;
  internalWires: Array<{ from: PinRef; to: PinRef }>;
  inputMap: Record<string, PinRef>;
  outputMap: Record<string, PinRef>;
}
```

---

## 1.4 Circuit Document Schema

```typescript
// src/core/circuit/types.ts
export type Position3D = readonly [number, number, number];

export interface GateInstance {
  readonly id: GateId;
  readonly type: GateType;
  position: Position3D;
  rotation: number;
  inputValues: Record<string, boolean>;
  outputValues: Record<string, boolean>;
  internalState?: Record<string, boolean>; // For sequential gates
}

export interface PinRef {
  readonly gateId: GateId;
  readonly pinId: PinId;
}

export interface Wire {
  readonly id: WireId;
  readonly from: PinRef;
  readonly to: PinRef;
}

export interface CircuitMetadata {
  name: string;
  description?: string;
  author?: string;
  createdAt: string;
  updatedAt: string;
  tags: string[];
}

export interface CircuitDocument {
  readonly schemaVersion: 1;
  metadata: CircuitMetadata;
  gates: GateInstance[];
  wires: Wire[];
}
```

---

## 1.5 Zod Validation Schemas

```typescript
// src/core/serialization/schema.ts
import { z } from 'zod';
import { isValidGateType } from '../gates/registry';

export const Position3DSchema = z.tuple([z.number(), z.number(), z.number()]);
export const GateTypeSchema = z.string().refine(isValidGateType, {
  message: 'Invalid gate type',
});
export const GateIdSchema = z.string().refine(s => s.startsWith('gate-'), {
  message: 'Gate ID must start with "gate-"',
});
export const WireIdSchema = z.string().refine(s => s.startsWith('wire-'), {
  message: 'Wire ID must start with "wire-"',
});

export const PinRefSchema = z.object({
  gateId: GateIdSchema,
  pinId: z.string(),
});

export const GateInstanceSchema = z.object({
  id: GateIdSchema,
  type: GateTypeSchema,
  position: Position3DSchema,
  rotation: z.number().default(0),
  inputValues: z.record(z.string(), z.boolean()).default({}),
  outputValues: z.record(z.string(), z.boolean()).default({}),
  internalState: z.record(z.string(), z.boolean()).optional(),
});

export const WireSchema = z.object({
  id: WireIdSchema,
  from: PinRefSchema,
  to: PinRefSchema,
});

export const CircuitMetadataSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(1000).optional(),
  author: z.string().optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  tags: z.array(z.string()).default([]),
});

export const CircuitDocumentV1Schema = z.object({
  schemaVersion: z.literal(1),
  metadata: CircuitMetadataSchema,
  gates: z.array(GateInstanceSchema),
  wires: z.array(WireSchema),
});

export type CircuitDocumentV1 = z.infer<typeof CircuitDocumentV1Schema>;

export type ValidationResult<T> =
  | { success: true; data: T }
  | { success: false; errors: z.ZodIssue[] };

export const validateCircuitDocument = (input: unknown): ValidationResult<CircuitDocumentV1> => {
  const result = CircuitDocumentV1Schema.safeParse(input);
  if (result.success) {
    return { success: true, data: result.data };
  }
  return { success: false, errors: result.error.issues };
};
```

---

## 1.6 Event System

```typescript
// src/core/events/types.ts
export type CircuitEvent =
  | { type: 'gate:added'; gate: GateInstance; timestamp: number }
  | { type: 'gate:removed'; gateId: GateId; timestamp: number }
  | { type: 'gate:moved'; gateId: GateId; from: Position3D; to: Position3D; timestamp: number }
  | { type: 'gate:rotated'; gateId: GateId; from: number; to: number; timestamp: number }
  | { type: 'wire:added'; wire: Wire; timestamp: number }
  | { type: 'wire:removed'; wireId: WireId; timestamp: number }
  | { type: 'input:set'; gateId: GateId; pinId: PinId; value: boolean; timestamp: number }
  | { type: 'simulation:tick'; tick: number; changes: Array<{ gateId: GateId; outputs: Record<string, boolean>; internalState?: Record<string, boolean> }>; timestamp: number }
  | { type: 'circuit:loaded'; timestamp: number }
  | { type: 'circuit:cleared'; timestamp: number };

export type CircuitEventHandler = (event: CircuitEvent) => void;
```

---

## 1.7 Phase 1 Checklist & Exit Criteria

| Task | Effort | Dependencies | Performance Budget | Exit Criteria |
|------|--------|--------------|-------------------|---------------|
| Create directory structure | 2h | Phase 0.5 complete | - | Clean separation established |
| Implement branded types | 2h | - | - | Type safety enforced |
| Create gate registry (primitive & composite) | 4h | Branded types | <1ms lookup | Single source of truth |
| Define circuit document types | 2h | Branded types | - | Schema stable |
| Implement Zod schemas | 4h | Circuit types | <10ms validation | 100% validation coverage |
| Create event system | 3h | Circuit types | <1ms emit | Event-driven architecture |
| Migrate existing code to new structure | 8h | All above | <5MB bundle increase | No breaking changes |
| Update imports throughout codebase | 4h | Migration | - | All imports resolve |
| Add comprehensive unit tests | 6h | All above | <100ms test suite | 90%+ coverage |
| Performance optimization | 4h | Tests pass | <16ms for 1000 gates | Budgets met |

**Total Estimated Effort:** ~39 hours (3 weeks with 1 developer)  
**Performance Budget:** <16ms simulation for 1000 gates, 100% TypeScript strict compliance

---

## Risk Mitigation

**Type Safety Migration:** Incremental migration with comprehensive testing to ensure no regressions.

**API Stability:** Event-driven architecture provides clean separation and extensibility.

**Performance Impact:** Careful monitoring of bundle size and runtime performance during refactoring.

---

**Part of:** [Comprehensive Development Roadmap](../../README.md)  
**Previous:** [Phase 0.5: Nand2Tetris Foundation](phase-0.5-nand2tetris-foundation.md)  
**Next:** [Phase 2: Plugin System](phase-2-plugin-system.md)
