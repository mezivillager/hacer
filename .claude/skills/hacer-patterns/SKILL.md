---
name: hacer-patterns
description: Use when working on any HACER feature — covers the full stack, architecture layers, state management, and gate patterns
---

# HACER Patterns and Conventions

HACER = Hardware Architecture and Constraints Explorer & Researcher. A 3D logic-gate circuit simulator inspired by nand2tetris.

<instructions>
## ⚡ Before Writing Any Code: Discover, Don't Assume

Type definitions, API signatures, and state field names change as the codebase evolves.
**Always read the source before writing code** — never rely on doc examples for specific values.

| What you need | Canonical source |
|--------------|-----------------|
| Store types (GateInstance, Position, Wire, etc.) | `src/store/types.ts` |
| Chip definitions + registries | `src/core/chips/types.ts`, `src/core/chips/registry.ts`, `src/core/chips/appRegistry.ts` |
| Available `circuitActions` methods + signatures | `src/store/circuitStore.ts` → `circuitActions` export |
| Store state shape and initial values | `src/store/circuitStore.ts` → `initialState` |
| Store reset pattern for tests | `src/store/actions/gateActions/gateActions.test.ts` → `beforeEach` |
| E2E test patterns | `e2e/specs/` — pick a spec in the same domain |
| Gate rendering (data-driven, any chip) | `src/gates/GateRenderer.tsx` → `src/components/scene/ChipBody3D.tsx` |
| Node component structure | `src/nodes/components/InputNode3D.tsx` |
| Wire routing utilities | `src/utils/wiringScheme/` |

## Adding a New Gate (= a builtin chip, Phase 0.5)

Canonical recipe: `HACER_LLM_GUIDE.md` → *Adding a builtin chip*. A gate is a `GateInstance` with a
`chipName`; there is no gate type union, no per-gate logic file and no per-gate component.

1. `registerBuiltin(registry, name, inputs, outputs, evaluate)` in `src/core/chips/builtins/project01.ts` — pure, width-masked
2. Red first: `.cmp` fixture in `src/core/testing/project1CmpFixtures.ts` + `CHIP_NAMES`/`PIN_SCHEMA` entry in `src/core/chips/builtins/project01.test.ts`
3. Icon: `CHIP_ICON_MAP` entry in `src/components/ui/icons/ChipIcons.tsx` (fallback icon otherwise)
4. Nothing else — toolbar, placement (`circuitActions.startPlacement(chipName)`), 3D body (`src/components/scene/ChipBody3D.tsx` + `src/components/scene/chipBodyLayout.ts`) and evaluation (`src/simulation/topologicalEval.ts` → `evaluateChipWithCtx`) are registry-driven

## Phase Tracking (check before implementing)

Always read `.cursorrules` → "Phase Tracking" section first.

| Symbol | Meaning |
|--------|---------|
| ✅ Current/Active | Implement this |
| 🔄 Next Phase | Ready but not yet |
| ⏸️ Future Phase | Do not implement |

**Current Phase:** See `.cursorrules` → "⚠️ IMPORTANT: Phase Tracking"
</instructions>

<rules>
## Architecture Layers

```
src/
├── components/          # React UI components
│   ├── canvas/          # Three.js/R3F scene components
│   ├── scene/           # ChipBody3D + chipBodyLayout — data-driven 3D body for any chip
│   ├── ui/              # HACER shell components (toolbar, panels, icons/ChipIcons.tsx)
│   └── ui-kit/          # shadcn/ui primitives
├── core/                # Pure logic, no React
│   ├── chips/           # ChipDefinition, registry, appRegistry, evaluateChip seam
│   │   └── builtins/    # project01.ts — definition + evaluate (+ .cmp-driven test)
│   ├── hdl/             # HACK HDL parser + compiler
│   ├── serialization/   # save/load format
│   └── testing/         # .tst/.cmp parsers, test engine, fixtures
├── gates/               # GateRenderer (dispatches to ChipBody3D), shared 3D primitives, handlers
├── nodes/               # Circuit I/O nodes, junctions, bus splitter/joiner
│   ├── components/      # InputNode3D, OutputNode3D, JunctionNode3D
│   └── config/          # nodeConfig.ts (node dimensions, pin positions)
├── simulation/          # topologicalEval.ts (evaluates every placed chip), busLogic, busOps
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

### Key Rule: React Fast Refresh
TSX files export React components only; constants and helpers live in sibling `.ts` files
(e.g. `src/components/scene/chipBodyLayout.ts` next to `src/components/scene/ChipBody3D.tsx`).

## Stack Rules

| Layer | Technology | Notes |
|-------|-----------|-------|
| **UI** | React 19 + React Compiler | NO `useMemo`/`useCallback`/`React.memo` |
| **3D** | React Three Fiber + Three.js | Dispose geometries/materials/textures on unmount |
| **State** | Zustand | Selectors for reads, `circuitActions.*()` for writes |
| **UI components** | shadcn/ui primitives (`@/components/ui-kit/`) | Use `notify` from `@/lib/notify`, never `console.log`, for user feedback |
| **Types** | TypeScript 6.0 strict | No `any`; IDs are plain `string` today (branded types are a Phase 5+ aspiration) |
| **Tests** | Vitest (unit) + Playwright (E2E) | TDD mandatory; test before implement |
| **Build** | Vite + tsc | `pnpm run build` = `tsc -b && vite build` |

## Test Commands Quick Reference

```bash
pnpm run test:run           # All Vitest tests (fast, use during TDD)
pnpm run test:e2e:store     # Playwright @store tests — manual only
pnpm run test:e2e:ui        # Playwright @ui tests (slow, skip unless needed)
pnpm run test:coverage      # Coverage report
pnpm run lint               # TypeScript + ESLint (must exit 0)
pnpm run typecheck          # TypeScript only
pnpm run build              # Full production build
```
</rules>

<examples>
## State Management Patterns

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
// ✅ Correct — all mutations go through circuitActions
// (verify current method signatures in src/store/circuitStore.ts)
circuitActions.someAction(args)

// ✅ Placement mode (user click-to-place UI)
circuitActions.startPlacement(gateType)   // enters placement mode
circuitActions.placeGate(position)         // finalizes at position

// ❌ Wrong — never mutate directly
useCircuitStore.setState({ gates: ... })
```

> **Always verify action signatures and type shapes at their canonical source** before using them.
> See the Discovery Protocol table above.

### Action File Pattern
```typescript
// src/store/actions/<domain>Actions/<domain>Actions.ts
// Actions are factory functions called by the store initializer.
// External code uses circuitActions.* (exported from circuitStore.ts).
export function createSomeActions(set: SetState, get: GetState) {
  return {
    someAction: (/* args — see src/store/types.ts for correct types */): ReturnType => {
      set(draft => { /* immer mutation */ })
    },
  }
}
```

## React Component Patterns

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

## TypeScript Conventions

```typescript
// Use JSDoc on all exported functions
/**
 * Places a gate at the given position.
 * @param chipName - Registered chip name, e.g. 'Nand' (see src/core/chips/appRegistry.ts)
 * @param position - World-space position (see Position in src/store/types.ts)
 * @returns The newly placed gate instance
 */
export function addGate(chipName: string, position: Position): GateInstance { ... }
```

## Common Anti-Patterns (reject these in code review)

| Anti-Pattern | Correct Pattern |
|-------------|-----------------|
| `useCircuitStore().gates` | `useCircuitStore(s => s.gates)` |
| `useCircuitStore.setState({ gates: ... })` | `circuitActions.<action>(args)` |
| `useMemo(() => ..., [deps])` | Remove — React Compiler handles it |
| `console.log("Error:", e)` | `notify.error("User-facing message")` (`@/lib/notify`) |
| `new BoxGeometry()` in render body | Create in `useMemo` or module scope, dispose on unmount |
| Valtio `proxy(state)` / `useSnapshot()` | Zustand only |
</examples>
