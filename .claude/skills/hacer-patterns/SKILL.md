---
name: hacer-patterns
description: Use when working on any HACER feature — covers the full stack, architecture layers, state management, and gate patterns
---

# HACER Patterns and Conventions

HACER = Hardware Architecture Circuit Editor and Runtime. A 3D logic-gate circuit simulator inspired by nand2tetris.

---

## Stack

| Layer | Technology | Notes |
|-------|-----------|-------|
| **UI** | React 19 + React Compiler | NO `useMemo`/`useCallback`/`React.memo` |
| **3D** | React Three Fiber + Three.js | Dispose geometries/materials/textures on unmount |
| **State** | Zustand | Selectors for reads, `circuitActions.*()` for writes |
| **UI components** | Ant Design | Use `message`/`notification`, never `console.log`, for user feedback |
| **Types** | TypeScript 5.9 strict | No `any`; use branded types (GateId, WireId, PinId) |
| **Tests** | Vitest (unit) + Playwright (E2E) | TDD mandatory; test before implement |
| **Build** | Vite + tsc | `npm run build` = `tsc -b && vite build` |

---

## Architecture Layers

```
src/
├── components/          # React UI components (Canvas, UI, gates)
│   ├── canvas/          # Three.js/R3F scene components
│   └── ui/              # Ant Design interface components
├── gates/               # Gate definitions
│   ├── components/      # Gate React components
│   ├── icons/           # Gate icon components
│   └── config/          # Gate configs split into 3 files per gate:
│       ├── nand-constants.ts  # colors, text
│       ├── nand-helpers.ts    # pin/wire helpers, geometry
│       └── nand.tsx           # React component (only export components here)
├── nodes/               # Circuit I/O nodes and junctions
│   ├── components/      # InputNode3D, OutputNode3D, JunctionNode3D
│   └── config/          # nodeConfig.ts (node dimensions, pin positions)
├── simulation/          # Pure logic (no React, no Three.js)
│   └── gateLogic.ts
├── store/               # Zustand state
│   ├── circuitStore.ts  # Store definition + circuitActions export
│   ├── types.ts         # GateInstance, Wire, WireEndpoint, InputNode, etc.
│   └── actions/         # One folder per action group
│       └── gateActions/ # gateActions.ts + gateActions.test.ts
├── hooks/               # Custom React hooks
├── theme/               # ThemeProvider, tokens
└── utils/               # Utility functions
    ├── grid.ts          # Grid snap helpers
    ├── wirePosition.ts  # Wire geometry
    └── wiringScheme/    # Wire routing algorithm
```

### Key Rule: Gate Config File Split
Gate configs use exactly three files per gate to satisfy React Fast Refresh (TSX files must only export React components):
- `*-constants.ts` → colors, text, non-React constants
- `*-helpers.ts` → pin/wire helper functions, geometry utilities
- `*.tsx` → React components only

---

## State Management

### Reading State (always use selectors)
```typescript
// ✅ Correct — selector re-renders only when this slice changes
const gates = useCircuitStore(state => state.gates)
const selectedId = useCircuitStore(state => state.selectedGateId)

// ❌ Wrong — subscribes to entire store
const { gates } = useCircuitStore()
```

### Writing State (always through actions)
```typescript
// ✅ Correct — direct add (type is always UPPERCASE)
circuitActions.addGate('NAND', { x: 0, y: 0, z: 0 })
circuitActions.selectGate(gateId)

// ✅ Also correct — placement mode (user clicks to place; placeGate fires at click position)
circuitActions.startPlacement('NAND')          // enters placement mode
circuitActions.placeGate({ x: 1, y: 0, z: 2 }) // finalizes at position

// ❌ Wrong — never mutate directly
useCircuitStore.setState({ gates: [...newGates] })
```

> **GateType is always uppercase:** `'NAND' | 'AND' | 'OR' | 'NOT' | 'NOR' | 'XOR' | 'XNOR'`  
> **Position is an object:** `{ x: number, y: number, z: number }` (not a tuple)

### Action File Pattern
```typescript
// src/store/actions/gateActions/gateActions.ts
// Actions are factory functions called by the store initializer.
// External code uses circuitActions.* (exported from circuitStore.ts).
export function createGateActions(set: SetState, get: GetState) {
  return {
    addGate: (type: GateType, position: Position): GateInstance => {
      // ...
    },
  }
}

// Usage from components or tests:
import { circuitActions } from '@/store/circuitStore'
circuitActions.addGate('NAND', { x: 0, y: 0, z: 0 })
```

---

## Phase Tracking (check before implementing)

Always read `.cursorrules` → "Phase Tracking" section first.

| Symbol | Meaning |
|--------|---------|
| ✅ Current/Active | Implement this |
| 🔄 Next Phase | Ready but not yet |
| ⏸️ Future Phase | Do not implement |

**Current Phase:** See `.cursorrules` → "⚠️ IMPORTANT: Phase Tracking"

---

## Adding a New Gate (current phase 0–4)

1. Add gate logic → `src/simulation/gateLogic.ts`
2. Add unit tests → `src/simulation/gateLogic.test.ts`
3. Create component → `src/gates/components/`
4. Create icon → `src/gates/icons/`
5. Create 3-file config split:
   - `src/gates/config/<gate>-constants.ts` — colors, text, non-React constants
   - `src/gates/config/<gate>-helpers.ts` — pin/wire helpers, geometry
   - `src/gates/config/<gate>.tsx` — React component (exports ONLY React components)
6. Export from barrel files (`index.ts`)

---

## React Component Rules

```typescript
// ✅ One component per file
// src/components/ui/GateLabel.tsx
export function GateLabel({ text }: { text: string }) {
  return <div className="gate-label">{text}</div>
}

// ❌ Multiple components in one file — never
export function GateLabel() { ... }
export function GateIcon() { ... }  // put this in its own file
```

- Components must stay under 200 lines; split if larger
- Extract complex logic into custom hooks
- No side effects during render
- Three.js resources: create once, dispose in `useEffect` cleanup

---

## TypeScript Conventions

```typescript
// Use JSDoc on all exported functions
/**
 * Places a gate at the given position.
 * @param payload - Gate type and world-space position
 * @returns The ID of the newly placed gate
 */
export function placeGate(payload: PlaceGatePayload): GateId { ... }

// No 'any' — define interfaces
interface PlaceGatePayload {
  type: GateType
  position: [number, number, number]
}
```

---

## Test Commands Quick Reference

```bash
npm run test:run           # All Vitest tests (fast, use during TDD)
npm run test:e2e:store     # Playwright @store tests (pre-commit)
npm run test:e2e:ui        # Playwright @ui tests (slow, skip unless needed)
npm run test:coverage      # Coverage report
npm run lint               # TypeScript + ESLint (must exit 0)
npm run typecheck          # TypeScript only
npm run build              # Full production build
```

---

## Common Anti-Patterns (reject these in code review)

| Anti-Pattern | Correct Pattern |
|-------------|-----------------|
| `useCircuitStore().gates` | `useCircuitStore(s => s.gates)` |
| `useCircuitStore.setState({ gates: ... })` | `circuitActions.addGate('NAND', { x, y, z })` |
| `useMemo(() => ..., [deps])` | Remove — React Compiler handles it |
| `console.log("Error:", e)` | `message.error("User-facing message")` |
| `new BoxGeometry()` in render body | Create in `useMemo` or module scope, dispose on unmount |
| Valtio `proxy(state)` / `useSnapshot()` | Zustand only |
