# HACER Development Guide

**PURPOSE**: Ensure AI-generated code doesn't break existing functionality as the codebase scales.  
**SCOPE**: React Three Fiber 3D components, Zustand state, Ant Design UI, testing patterns.  
**REQUIREMENT**: Follow these patterns for ALL code changes - test coverage is mandatory.

> **📚 Related Documentation:**
> - [`.cursorrules`](.cursorrules) - **Start here!** Project rules, phase tracking, and architecture guidelines
> - [`REPO_MAP.md`](REPO_MAP.md) - Repository structure, directory organization, and file locations
> - [`docs/roadmap/`](docs/roadmap/) - Development roadmap, phases, and implementation plans

## Document Relationship

This guide provides **detailed patterns and examples** for development. For quick reference:
- **Quick rules & phase status**: See [`.cursorrules`](.cursorrules)
- **Where to put files**: See [`REPO_MAP.md`](REPO_MAP.md)
- **Detailed examples & patterns**: This document

All three documents are kept in sync and should be consulted together.

---

## 🚨 NON-NEGOTIABLE RULES

### ALWAYS
✅ Write tests BEFORE or WITH new features (unit, component, or E2E)
✅ Run existing tests before committing (`pnpm run test:run`)
✅ Use TypeScript with strict types (no `any`, no missing interfaces)
✅ Add JSDoc comments to all exported functions with `@param` and `@returns`
✅ Call hooks only at the top level (never in loops, conditions, or callbacks)
✅ Keep components under 200 lines (split if larger)
✅ **One component per file** - each React component gets its own file
✅ Import from `antd` directly for UI components
✅ Use Zustand `create()` for shared state, selectors for granular subscriptions
✅ Let React Compiler handle memoization automatically
✅ Dispose Three.js resources on unmount (geometries, materials, textures)
✅ Handle loading and error states explicitly
✅ Keep gate logic pure and testable (no side effects)
✅ Extract complex logic into custom hooks (separation of concerns)

### NEVER
❌ Skip tests for "simple" changes (simple changes cause regressions)
❌ Call hooks conditionally or in loops/callbacks (violates Rules of Hooks)
❌ Create components over 300 lines (split immediately)
❌ **Put multiple components in one file** - one component per file, use folders for related components
❌ Mix business logic with UI rendering (extract to hooks)
❌ Modify existing function signatures without updating all callers
❌ Use `console.log()` for user feedback (use Ant Design Message/Notification)
❌ Create new 3D geometries inside render loops
❌ Mutate Zustand state outside of action functions
❌ Import Three.js objects you don't dispose
❌ Add features without considering how they'll be tested
❌ Break existing E2E test flows
❌ Use inline object/function literals in JSX props (causes unnecessary re-renders)

---

## ⚛️ React Best Practices

### Component Size and Structure

**Component Line Limits:**
- **Target**: Keep components under **200 lines** of code
- **Maximum**: Components should never exceed **300 lines** - split immediately if they do
- **Ideal**: Aim for **100-150 lines** for optimal readability and maintainability

**When to Split a Component:**
```typescript
// ❌ TOO LARGE - 300+ lines, multiple responsibilities
export const App = () => {
  // 50 lines of hooks
  // 50 lines of handlers
  // 100 lines of JSX layout
  // 100 lines of JSX sidebar
  // 50 lines of JSX canvas
};

// ✅ CORRECT - Split into focused components
export const App = () => {
  return (
    <Layout>
      <Sidebar />
      <CanvasArea />
    </Layout>
  );
};

// Sidebar.tsx - ~100 lines
// CanvasArea.tsx - ~80 lines
// App.tsx - ~50 lines
```

**Single Responsibility Principle:**
- Each component should do ONE thing well
- If a component handles multiple concerns (state, rendering, business logic), extract them

```typescript
// ❌ WRONG - Component does too much
export const GateEditor = ({ gateId }) => {
  const [gate, setGate] = useState(null);
  const [loading, setLoading] = useState(false);
  
  useEffect(() => {
    fetchGate(gateId).then(setGate);
  }, [gateId]);
  
  const handleSave = async () => { /* ... */ };
  const handleDelete = async () => { /* ... */ };
  
  // 200+ lines of JSX for editing, validation, preview...
};

// ✅ CORRECT - Extract hooks and sub-components
export const GateEditor = ({ gateId }) => {
  const { gate, loading, saveGate, deleteGate } = useGate(gateId);
  
  if (loading) return <GateEditorSkeleton />;
  
  return (
    <>
      <GateEditorForm gate={gate} onSave={saveGate} />
      <GatePreview gate={gate} />
      <GateEditorActions onDelete={deleteGate} />
    </>
  );
};
```

### Hooks Best Practices

**Rules of Hooks (Non-Negotiable):**
```typescript
// ✅ CORRECT - Hooks at top level, same order
function Component({ id }) {
  const [state, setState] = useState(null); // Always first
  const gates = useCircuitStore((s) => s.gates); // Zustand selectors
  
  useEffect(() => { ... }, [id]);            // Effects last
  
  // Early returns AFTER all hooks
  if (!state) return null;
  
  return <div>...</div>;
}

// ❌ WRONG - Hooks in conditions
function BadComponent({ id }) {
  if (!id) return null; // ❌ Early return before hooks
  
  const [state, setState] = useState(null); // ❌ Hook after condition
}

// ❌ WRONG - Hooks in loops or callbacks
function BadComponent({ items }) {
  return items.map(item => {
    const [state, setState] = useState(null); // ❌ Hook in map
    return <div>...</div>;
  });
}
```

**Custom Hooks for Reusable Logic:**
```typescript
// ✅ CORRECT - Extract complex logic into custom hooks
// hooks/useGatePlacement.ts
export const useGatePlacement = (gateType: string) => {
  const [isPlacing, setIsPlacing] = useState(false);
  const [previewPos, setPreviewPos] = useState<[number, number, number] | null>(null);
  
  // React Compiler automatically memoizes these functions
  const startPlacement = () => {
    setIsPlacing(true);
    circuitActions.startPlacement(gateType);
  };
  
  const cancelPlacement = () => {
    setIsPlacing(false);
    circuitActions.cancelPlacement();
  };
  
  const placeGate = (position: [number, number, number]) => {
    circuitActions.placeGate(gateType, position);
    setIsPlacing(false);
  };
  
  return { isPlacing, previewPos, startPlacement, cancelPlacement, placeGate };
};
```

// Component uses clean hook interface
export const GatePlacer = ({ gateType }) => {
  const { isPlacing, startPlacement, cancelPlacement } = useGatePlacement(gateType);
  // Component is now simple and focused
};
```

**useEffect Dependency Arrays:**
```typescript
// ✅ CORRECT - All dependencies included
useEffect(() => {
  const timer = setInterval(() => {
    if (circuit.selectedGateId) {
      circuitActions.updateGate(circuit.selectedGateId);
    }
  }, 1000);
  
  return () => clearInterval(timer);
}, [circuit.selectedGateId]); // All dependencies listed

// ❌ WRONG - Missing dependencies
useEffect(() => {
  fetchData(circuit.selectedGateId, circuit.isSimulating);
  // Missing circuit.isSimulating in deps
}, [circuit.selectedGateId]); // ❌ Incomplete deps
```

**React Compiler Handles Memoization:**
```typescript
// ✅ CORRECT - React Compiler automatically memoizes
const ExpensiveComponent = ({ gates, selectedId }) => {
  // React Compiler automatically memoizes expensive computations
  const sortedGates = gates.sort((a, b) => a.position.y - b.position.y);
  
  // React Compiler automatically memoizes callbacks
  const handleGateClick = (id: string) => {
    circuitActions.selectGate(id);
  };
  
  // React Compiler tracks dependencies automatically
  const handlePinClick = (gateId: string, pinId: string) => {
    if (selectedId === gateId) {
      circuitActions.togglePin(gateId, pinId);
    }
  };
  
  return <GateList gates={sortedGates} onGateClick={handleGateClick} />;
};

// ❌ WRONG - Don't manually memoize (React Compiler handles it)
const BadComponent = ({ count }) => {
  // ❌ Don't use useMemo/useCallback - React Compiler does this automatically
  const doubled = useMemo(() => count * 2, [count]); // Unnecessary!
  const handleClick = useCallback(() => {}, []); // Unnecessary!
  
  // ✅ CORRECT - Just write normal code
  return <div>{count * 2}</div>;
};
```

> **⚠️ Important:** With React Compiler, you should NOT use `useMemo`, `useCallback`, or `React.memo` manually. The compiler handles all memoization automatically. See [`.cursorrules`](.cursorrules) for details.

### Component Composition and Props

**Props Destructuring:**
```typescript
// ✅ CORRECT - Destructure props with defaults
interface GateProps {
  id: string;
  position?: [number, number, number];
  selected?: boolean;
  onClick?: () => void;
}

export const Gate = ({ 
  id, 
  position = [0, 0, 0],  // Default values
  selected = false,
  onClick 
}: GateProps) => {
  // Component body
};

// ❌ WRONG - Accessing props directly
export const BadGate = (props: GateProps) => {
  return <div onClick={props.onClick}>{props.id}</div>; // Verbose
};
```

**Component Composition:**
```typescript
// ✅ CORRECT - Compose components instead of one large component
export const CircuitCanvas = () => {
  return (
    <Canvas>
      <Scene />
      <Gates />
      <Wires />
      <Grid />
    </Canvas>
  );
};

// ✅ CORRECT - Use children prop for flexible composition
interface CardProps {
  title: string;
  children: React.ReactNode;
}

export const Card = ({ title, children }: CardProps) => {
  return (
    <Card>
      <CardHeader>{title}</CardHeader>
      <CardBody>{children}</CardBody>
    </Card>
  );
};

// Usage:
<Card title="Gates">
  <GateList />
  <AddGateButton />
</Card>
```

### File Organization

**One Component Per File Rule:**
- Each React component must be in its own file
- When components are related, organize them in a folder
- Use barrel exports (`index.ts`) to re-export the main component for clean imports
- Extract shared types, utilities, and constants to separate files within the same folder

```typescript
// ❌ WRONG - Multiple components in one file
// Scene.tsx (279 lines, 8 components!)
export function Scene() { ... }
function SceneContent() { ... }
function GroundPlane() { ... }
function PlacementPreview() { ... }
// ... 4 more components

// ✅ CORRECT - One component per file, folder for related components
// Scene/Scene.tsx
export function Scene() { ... }

// Scene/SceneContent.tsx
export function SceneContent() { ... }

// Scene/GroundPlane.tsx
export function GroundPlane() { ... }

// Scene/PlacementPreview.tsx
export function PlacementPreview() { ... }

// Scene/index.ts (barrel export)
export { Scene } from './Scene';
export type { SceneProps } from './types';

// Scene/types.ts (shared types)
export interface SceneProps { ... }

// Scene/utils.ts (shared utilities)
export const snapToGrid = (value: number) => ...;
```

**File Naming Conventions:**
- **Components**: PascalCase - `GateEditor.tsx`, `WireRenderer.tsx`
- **Hooks**: camelCase starting with "use" - `useGatePlacement.ts`, `useCircuitState.ts`
- **Utilities**: camelCase - `gateLogic.ts`, `simulationEngine.ts`
- **Types**: camelCase - `circuit.ts`, `gate.ts` (or co-located with component)
- **Tests**: Same name + `.test.ts` or `.spec.ts` - `GateEditor.test.tsx`

**File Co-location:**
```
✅ CORRECT - Keep related files together, one component per file
components/
  Scene/                       # Folder for related Scene components
    Scene.tsx                  # Main Scene component (one component)
    SceneContent.tsx           # Separate component file
    GroundPlane.tsx            # Separate component file
    PlacementPreview.tsx       # Separate component file
    SceneGrid.tsx              # Separate component file
    types.ts                   # Shared types
    utils.ts                   # Shared utilities
    index.ts                   # Barrel export (exports Scene)
  GateEditor/
    GateEditor.tsx             # Main component (one component)
    GateEditor.test.tsx        # Test file
    GateEditor.css             # Styles
    index.ts                   # Re-export component
    types.ts                   # Component-specific types

hooks/
  useGatePlacement.ts          # One hook per file
  useGatePlacement.test.ts     # Test file

❌ WRONG - Multiple components in one file
components/
  Scene.tsx                    # Contains 8 components! Too many!
    Scene, SceneContent, GroundPlane, PlacementPreview, etc.

❌ WRONG - Separating related files
components/
  GateEditor.tsx
  GateEditor.test.tsx          # In separate tests/ folder
  GateEditor.css               # In separate styles/ folder
```

**Barrel Exports (index.ts):**
```typescript
// ✅ CORRECT - Use index.ts for clean imports
// components/gates/index.ts
export { NandGate } from './NandGate';
export { AndGate } from './AndGate';
export { OrGate } from './OrGate';
export type { GateProps, GateType } from './types';

// Usage:
import { NandGate, AndGate, type GateProps } from '@/components/gates';

// ❌ WRONG - Direct imports from multiple files
import { NandGate } from '@/components/gates/NandGate';
import { AndGate } from '@/components/gates/AndGate';
import { OrGate } from '@/components/gates/OrGate';
```

### State Management Patterns

**Local vs Global State:**
```typescript
// ✅ CORRECT - Use local state for component-specific UI
const GateEditor = () => {
  const [isExpanded, setIsExpanded] = useState(false); // Local UI state
  const [editorValue, setEditorValue] = useState('');  // Local form state
  
  // Use Zustand selectors for shared state
  const gates = useCircuitStore((s) => s.gates);
  const selectedGateId = useCircuitStore((s) => s.selectedGateId);
  
  return (
    <Collapse expanded={isExpanded} onChange={setIsExpanded}>
      <TextArea value={editorValue} onChange={e => setEditorValue(e.target.value)} />
    </Collapse>
  );
};

// ❌ WRONG - Don't put UI state in global store
```

**Separating Logic from UI:**
```typescript
// ✅ CORRECT - Extract business logic to hooks
// hooks/useWiring.ts
export const useWiring = () => {
  const wiringFrom = useCircuitStore((s) => s.wiringFrom);
  const isWiring = wiringFrom !== null;
  
  const startWiring = (gateId: string, pinId: string, pinType: 'input' | 'output') => {
    circuitActions.startWiring(gateId, pinId, pinType);
  };
  
  const completeWiring = (gateId: string, pinId: string) => {
    circuitActions.completeWiring(gateId, pinId);
  };
  
  return { isWiring, startWiring, completeWiring };
};

// Component focuses on rendering
export const WiringCanvas = () => {
  const { isWiring, startWiring, completeWiring } = useWiring();
  
  return <Canvas onPinClick={isWiring ? completeWiring : startWiring} />;
};
```

### TypeScript with React

**Component Props Types:**
```typescript
// ✅ CORRECT - Explicit interface, exported for reuse
export interface GateProps {
  id: string;
  position: [number, number, number];
  selected?: boolean;
  onClick?: (id: string) => void;
  children?: React.ReactNode;
}

export const Gate: React.FC<GateProps> = ({ id, position, selected, onClick, children }) => {
  // Component implementation
};

// ✅ ALSO CORRECT - Function component with typed props
export function Gate({ id, position, selected, onClick, children }: GateProps) {
  // Component implementation
}

// ❌ WRONG - No types or inline types
export const Gate = ({ id, position, selected, onClick }) => { // ❌ No types
  // ...
};

export const Gate: React.FC<{ id: string }> = ({ id }) => { // ❌ Inline types, not reusable
  // ...
};
```

**Event Handler Types:**
```typescript
// ✅ CORRECT - Typed event handlers
interface GateProps {
  onPinClick: (gateId: string, pinId: string, event: React.MouseEvent) => void;
  onKeyDown?: (event: React.KeyboardEvent<HTMLDivElement>) => void;
}

export const Gate = ({ onPinClick, onKeyDown }: GateProps) => {
  const handleClick = (e: React.MouseEvent) => {
    onPinClick('gate-1', 'pin-1', e);
  };
  
  return <div onClick={handleClick} onKeyDown={onKeyDown}>...</div>;
};
```

### Performance Optimization

**React Compiler Handles Component Memoization:**
```typescript
// ✅ CORRECT - React Compiler automatically optimizes components
export const Gate3D = ({ id, position, selected, onClick }: Gate3DProps) => {
  // Expensive 3D rendering - React Compiler optimizes automatically
  return <mesh>...</mesh>;
};

// ❌ WRONG - Don't manually use React.memo
export const BadGate3D = memo<Gate3DProps>(({ id, position, selected, onClick }) => {
  // React Compiler already handles this - manual memo is unnecessary
  return <mesh>...</mesh>;
});
```

> **⚠️ Important:** React Compiler automatically memoizes components. Do NOT use `React.memo` manually. See [`.cursorrules`](.cursorrules) for React Compiler rules.

**Lazy Loading for Routes/Features:**
```typescript
// ✅ CORRECT - Lazy load heavy components
const ComplexChipEditor = lazy(() => import('./ComplexChipEditor'));

export const App = () => {
  return (
    <Suspense fallback={<ChipEditorSkeleton />}>
      <ComplexChipEditor />
    </Suspense>
  );
};
```

---

## 🧪 Testing Strategy

### Test Type Selection Matrix

| What to Test | Test Type | Tool | Priority |
|--------------|-----------|------|----------|
| Gate logic (NAND, OR, etc.) | Unit | Vitest | Critical |
| Simulation engine | Unit | Vitest | Critical |
| Zustand state mutations | Unit | Vitest | Critical |
| UI button clicks, forms | Component | RTL + Vitest | High |
| 3D component props | Component | RTL + Vitest | Medium |
| Add gate → wire → simulate | E2E | Playwright | Critical |
| Complex circuit workflows | E2E | Playwright | High |

### Unit Tests (Vitest)

```typescript
// ✅ CORRECT - Pure function, easy to test
// src/simulation/gateLogic.ts
export const nandGate = (a: boolean, b: boolean): boolean => !(a && b);

// src/simulation/gateLogic.test.ts
import { describe, it, expect } from 'vitest';
import { nandGate } from './gateLogic';

describe('nandGate', () => {
  it('returns true when both inputs are false', () => {
    expect(nandGate(false, false)).toBe(true);
  });
  it('returns true when one input is false', () => {
    expect(nandGate(true, false)).toBe(true);
    expect(nandGate(false, true)).toBe(true);
  });
  it('returns false only when both inputs are true', () => {
    expect(nandGate(true, true)).toBe(false);
  });
});
```

```typescript
// ✅ CORRECT - Testing Zustand store actions
// src/store/circuitStore.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { circuitStore, circuitActions } from './circuitStore';

describe('circuitStore', () => {
  beforeEach(() => {
    circuitActions.clearCircuit();
  });

  it('adds a gate with correct default values', () => {
    circuitActions.addGate('nand', [0, 0, 0]);
    expect(circuitStore.gates).toHaveLength(1);
    expect(circuitStore.gates[0].type).toBe('nand');
  });

  it('removes wire when gate is deleted', () => {
    circuitActions.addGate('nand', [0, 0, 0]);
    circuitActions.addGate('nand', [2, 0, 0]);
    const gate1 = circuitStore.gates[0].id;
    const gate2 = circuitStore.gates[1].id;
    
    circuitActions.addWire(gate1, 'output', gate2, 'inputA');
    expect(circuitStore.wires).toHaveLength(1);
    
    circuitActions.removeGate(gate1);
    expect(circuitStore.wires).toHaveLength(0);
  });
});
```

### Component Tests (React Testing Library)

```typescript
// ✅ CORRECT - Testing UI interactions
// src/components/Sidebar.test.tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { Sidebar } from './Sidebar';

describe('Sidebar', () => {
  it('starts placement mode when gate button clicked', () => {
    const onStartPlacement = vi.fn();
    render(<Sidebar onStartPlacement={onStartPlacement} />);
    
    fireEvent.click(screen.getByText('NAND'));
    expect(onStartPlacement).toHaveBeenCalledWith('nand');
  });
});
```

### E2E Tests (Playwright)

```typescript
// ✅ CORRECT - Testing complete user workflow
// e2e/circuit-building.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Circuit Building', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:5173');
  });

  test('can add a NAND gate to the canvas', async ({ page }) => {
    // Click NAND button in sidebar
    await page.click('button:has-text("NAND")');
    
    // Click on canvas to place gate
    await page.click('canvas', { position: { x: 400, y: 300 } });
    
    // Verify gate was added (check store or visual indicator)
    await expect(page.locator('[data-testid="gate-count"]')).toHaveText('1');
  });

  test('can wire two gates together', async ({ page }) => {
    // Add first gate
    await page.click('button:has-text("NAND")');
    await page.click('canvas', { position: { x: 300, y: 300 } });
    
    // Add second gate
    await page.click('button:has-text("NAND")');
    await page.click('canvas', { position: { x: 500, y: 300 } });
    
    // Start wiring from output pin
    await page.click('[data-testid="gate-0-output"]');
    
    // Complete wire to input pin
    await page.click('[data-testid="gate-1-inputA"]');
    
    // Verify wire exists
    await expect(page.locator('[data-testid="wire-count"]')).toHaveText('1');
  });

  test('simulation propagates signals through wires', async ({ page }) => {
    // Setup circuit...
    // Toggle input
    await page.keyboard.down('Shift');
    await page.click('[data-testid="gate-0-inputA"]');
    await page.keyboard.up('Shift');
    
    // Start simulation
    await page.click('button:has-text("Start")');
    
    // Verify output changed
    await expect(page.locator('[data-testid="gate-1-output"]')).toHaveClass(/active/);
  });
});
```

### Playwright Configuration

```typescript
// playwright.config.ts
import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  webServer: {
    command: 'pnpm run dev',
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env.CI,
  },
});
```

### Test Coverage Requirements

- **Gate Logic**: 100% coverage (pure functions, easy to test)
- **Store Actions**: 90%+ coverage (state mutations are critical)
- **UI Components**: 80%+ coverage (user interactions)
- **E2E Critical Paths**: Must cover: add gate, wire gates, run simulation

---

## 🎮 React Three Fiber Patterns

### Component Structure

```typescript
// ✅ CORRECT - 3D component with proper cleanup
// Note: Three.js objects (geometry, materials) are external objects, not React state
// useMemo is acceptable here ONLY for Three.js objects to prevent recreation
import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

interface Gate3DProps {
  id: string;
  position: [number, number, number];
  rotation?: number;
  selected?: boolean;
  onClick?: () => void;
}

export const Gate3D = ({ 
  id, 
  position, 
  rotation = 0,
  selected,
  onClick 
}: Gate3DProps) => {
  const meshRef = useRef<THREE.Mesh>(null);
  
  // ✅ Exception: useMemo for Three.js objects (external, not React state)
  // React Compiler doesn't handle external object creation, so manual memoization is needed
  const geometry = useMemo(() => new THREE.BoxGeometry(1, 0.5, 0.8), []);
  
  // ✅ Exception: Material depends on props, useMemo prevents recreation
  const material = useMemo(
    () => new THREE.MeshStandardMaterial({ 
      color: selected ? '#4a9eff' : '#333333' 
    }),
    [selected]
  );

  return (
    <group position={position} rotation={[0, rotation, 0]}>
      <mesh
        ref={meshRef}
        geometry={geometry}
        material={material}
        onClick={onClick}
      />
    </group>
  );
};
```

> **⚠️ Important:** `useMemo` for Three.js objects is an exception. For React components and callbacks, React Compiler handles memoization automatically. Do NOT use `useMemo`/`useCallback` for React code.

### Resource Cleanup Pattern

```typescript
// ✅ CORRECT - Dispose Three.js resources on unmount
// Exception: useMemo for Three.js objects (external objects, not React state)
import { useEffect, useMemo } from 'react';
import * as THREE from 'three';

export const CustomMesh = () => {
  // Exception: useMemo for Three.js objects to prevent recreation
  const geometry = useMemo(() => new THREE.BufferGeometry(), []);
  const material = useMemo(() => new THREE.MeshStandardMaterial(), []);

  useEffect(() => {
    return () => {
      geometry.dispose();
      material.dispose();
    };
  }, [geometry, material]);

  return <mesh geometry={geometry} material={material} />;
};
```

> **⚠️ Note:** `useMemo` for Three.js objects is acceptable because they're external objects. For React components, props, and callbacks, React Compiler handles memoization automatically.

### Event Handling in 3D

```typescript
// ✅ CORRECT - Handle 3D events with proper typing
import { ThreeEvent } from '@react-three/fiber';

const handleClick = (e: ThreeEvent<MouseEvent>) => {
  e.stopPropagation(); // Prevent event bubbling through 3D objects
  const worldPosition = e.point; // THREE.Vector3
  onSelect(id, worldPosition);
};

const handlePointerOver = (e: ThreeEvent<PointerEvent>) => {
  e.stopPropagation();
  document.body.style.cursor = 'pointer';
};
```

### Performance: Instancing for Many Gates

```typescript
// ✅ CORRECT - Use instancing when rendering 50+ similar objects
import { useRef, useMemo } from 'react';
import { InstancedMesh, Object3D, Color } from 'three';

interface InstancedGatesProps {
  positions: [number, number, number][];
  colors: string[];
}

export const InstancedGates = ({ positions, colors }: InstancedGatesProps) => {
  const meshRef = useRef<InstancedMesh>(null);
  const tempObject = useMemo(() => new Object3D(), []);
  const tempColor = useMemo(() => new Color(), []);

  useEffect(() => {
    if (!meshRef.current) return;
    
    positions.forEach((pos, i) => {
      tempObject.position.set(...pos);
      tempObject.updateMatrix();
      meshRef.current!.setMatrixAt(i, tempObject.matrix);
      meshRef.current!.setColorAt(i, tempColor.set(colors[i]));
    });
    
    meshRef.current.instanceMatrix.needsUpdate = true;
    if (meshRef.current.instanceColor) {
      meshRef.current.instanceColor.needsUpdate = true;
    }
  }, [positions, colors]);

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, positions.length]}>
      <boxGeometry args={[1, 0.5, 0.8]} />
      <meshStandardMaterial />
    </instancedMesh>
  );
};
```

### Testing R3F Components

```typescript
// ✅ Mock WebGL for component tests
// src/test/setup.ts
import { vi } from 'vitest';

// Mock canvas and WebGL
HTMLCanvasElement.prototype.getContext = vi.fn(() => ({
  // Minimal WebGL mock
}));

// For testing R3F components, test the logic, not the rendering
// Extract business logic into hooks that can be tested independently
```

---

## 📦 Zustand State Management

### Store Organization

```typescript
// ✅ CORRECT - Organized store with typed actions
// src/store/circuitStore.ts
import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';

// Types
export interface Gate {
  id: string;
  type: 'nand' | 'and' | 'or' | 'not' | 'nor' | 'xor';
  position: [number, number, number];
  rotation: number;
  inputs: { id: string; value: boolean }[];
  outputs: { id: string; value: boolean }[];
}

export interface Wire {
  id: string;
  fromGateId: string;
  fromPinId: string;
  toGateId: string;
  toPinId: string;
}

interface CircuitState {
  gates: Gate[];
  wires: Wire[];
  selectedGateId: string | null;
  isSimulating: boolean;
}

// Store with immer for immutable updates
export const useCircuitStore = create<CircuitState>()(
  immer((set) => ({
    gates: [],
    wires: [],
    selectedGateId: null,
    isSimulating: false,
  }))
);

// Actions - separate from store for stable references
export const circuitActions = {
  addGate: (type: Gate['type'], position: [number, number, number]) => {
    useCircuitStore.setState((state) => {
      const gate: Gate = {
        id: `gate-${Date.now()}`,
        type,
        position,
        rotation: 0,
        inputs: [{ id: 'in-0', value: false }],
        outputs: [{ id: 'out-0', value: false }],
      };
      state.gates.push(gate);
    });
  },

  removeGate: (id: string) => {
    useCircuitStore.setState((state) => {
      // Remove associated wires first
      state.wires = state.wires.filter(
        w => w.fromGateId !== id && w.toGateId !== id
      );
      state.gates = state.gates.filter(g => g.id !== id);
    });
  },

  // ... more actions
};
```

### Reading State in Components

```typescript
// ✅ CORRECT - Use selectors for granular subscriptions
import { useCircuitStore, circuitActions } from '@/store/circuitStore';

export const GateList = () => {
  // Subscribe only to what you need
  const gates = useCircuitStore((s) => s.gates);
  const selectedGateId = useCircuitStore((s) => s.selectedGateId);
  
  return (
    <>
      {gates.map(gate => (
        <Gate3D
          key={gate.id}
          {...gate}
          selected={gate.id === selectedGateId}
          onClick={() => circuitActions.selectGate(gate.id)}
        />
      ))}
    </>
  );
};

// ❌ WRONG - Subscribing to entire store causes unnecessary re-renders
export const BadGateList = () => {
  const store = useCircuitStore(); // Subscribes to everything!
  return store.gates.map(gate => <Gate3D key={gate.id} {...gate} />);
};
```

### Testing Zustand Stores

```typescript
// ✅ CORRECT - Test actions directly
import { useCircuitStore, circuitActions } from './circuitStore';

describe('circuitActions', () => {
  beforeEach(() => {
    // Reset store state
    useCircuitStore.setState({
      gates: [],
      wires: [],
      selectedGateId: null,
    });
  });

  it('addGate creates gate with unique id', () => {
    circuitActions.addGate('nand', [0, 0, 0]);
    circuitActions.addGate('nand', [1, 0, 0]);
    
    const { gates } = useCircuitStore.getState();
    expect(gates).toHaveLength(2);
    expect(gates[0].id).not.toBe(gates[1].id);
  });
});
```

### Common Pitfalls

```typescript
// ❌ WRONG - Mutating state directly
const BadComponent = () => {
  const gates = useCircuitStore((s) => s.gates);
  
  const handleClick = () => {
    // Don't do this! Use circuitActions
    gates.push({ ... }); // Won't trigger re-render
  };
};

// ❌ WRONG - Subscribing to entire store
const AnotherBadComponent = () => {
  const store = useCircuitStore(); // Re-renders on ANY change
  return <div>{store.gates.length}</div>;
};

// ✅ CORRECT - Use actions for mutations, selectors for reads
const GoodComponent = () => {
  const gateCount = useCircuitStore((s) => s.gates.length);
  
  const handleClick = () => {
    circuitActions.addGate('nand', [0, 0, 0]);
  };
  
  return <div onClick={handleClick}>{gateCount}</div>;
};
```

---

## 🎨 Ant Design Usage

### Import Pattern

```typescript
// ✅ CORRECT - Direct antd import
import { Button, Card, Space, Slider, Switch, Typography, message } from 'antd';
const { Text, Title } = Typography;

// ❌ WRONG - No wrapper library exists in this project
import { Button } from '@duro/components';
```

### Component Selection Matrix

| UI Need | Primary Choice | Alternative | Never Use |
|---------|---------------|-------------|-----------|
| **Sidebar panels** | Card | Collapse | custom divs |
| **Gate buttons** | Button | - | custom buttons |
| **Simulation controls** | Switch, Slider | - | html inputs |
| **Tooltips** | Tooltip | Popover | title attr |
| **Feedback** | message, notification | Alert | console.log |
| **Layout** | Space, Flex | Layout | manual CSS |
| **Lists** | List | Table | div loops |

### Styling Pattern

```typescript
// ✅ CORRECT - Use Ant Design's style props
<Card 
  styles={{ 
    body: { padding: 12 },
    header: { borderBottom: 'none' }
  }}
>
  <Space direction="vertical" size="small">
    <Button type="primary" block>Add NAND Gate</Button>
  </Space>
</Card>

// ❌ WRONG - Inline styles with hardcoded values
<div style={{ padding: '12px', backgroundColor: '#f0f0f0' }}>
```

---

## 📁 File Organization

> **📚 For detailed repository structure, see [`REPO_MAP.md`](REPO_MAP.md)**

### Naming Conventions

- **Components**: PascalCase - `GateEditor.tsx`, `WireRenderer.tsx`
- **Hooks**: camelCase with "use" prefix - `useGatePlacement.ts`, `useCircuitState.ts`
- **Utilities**: camelCase - `gateLogic.ts`, `simulationEngine.ts`
- **Types**: camelCase - `circuit.ts`, `gate.ts` (or co-located with component)
- **Tests**: Component name + `.test.tsx` - `GateEditor.test.tsx`
- **Folders**: PascalCase for feature folders - `components/GateEditor/`

### Quick Reference: Where to Put New Features

| Feature Type | Location | Example |
|--------------|----------|---------|
| New basic gate | `src/gates/components/` | XorGate.tsx |
| Gate logic function | `src/simulation/gateLogic.ts` | `xorGate()` |
| New UI panel | `src/components/ui/` | ChipLibrary.tsx |
| 3D helper | `src/components/canvas/` | PinConnector.tsx |
| Shared types | `src/types/` | chip.ts |

> **📚 For complete directory structure, current vs. future phases, and architecture evolution, see [`REPO_MAP.md`](REPO_MAP.md)**

---

## ⚡ Performance Patterns

### R3F Optimizations

```typescript
// ✅ Disable auto-clear for complex scenes
<Canvas gl={{ antialias: true, autoClear: false }}>

// ✅ Use frameloop="demand" for static scenes
<Canvas frameloop="demand">

// ✅ Limit re-renders with invalidation
import { invalidate } from '@react-three/fiber';
// Only call invalidate() when something actually changes
```

### Large Circuit Handling (100+ Gates)

1. **Instancing**: Use `InstancedMesh` for identical gates
2. **Level of Detail**: Simplify distant gates
3. **Frustum Culling**: Enable by default in R3F
4. **Debounce Updates**: Batch rapid state changes

```typescript
// ✅ Debounce rapid simulation updates
import { useDebouncedCallback } from 'use-debounce';

const debouncedUpdate = useDebouncedCallback(
  (gates) => circuitActions.updateAllGates(gates),
  16 // ~60fps
);
```

### Performance Testing

```typescript
// e2e/performance.spec.ts
test('renders 100 gates without frame drops', async ({ page }) => {
  // Add 100 gates programmatically
  for (let i = 0; i < 100; i++) {
    await page.evaluate((i) => {
      window.circuitActions.addGate('nand', [i % 10, 0, Math.floor(i / 10)]);
    }, i);
  }
  
  // Measure frame rate
  const fps = await page.evaluate(() => {
    return new Promise(resolve => {
      let frames = 0;
      const start = performance.now();
      const count = () => {
        frames++;
        if (performance.now() - start < 1000) {
          requestAnimationFrame(count);
        } else {
          resolve(frames);
        }
      };
      requestAnimationFrame(count);
    });
  });
  
  expect(fps).toBeGreaterThan(30);
});
```

---

## 🤖 AI Modification Guidelines

### Before Modifying Existing Code

1. **Read the existing tests** - Understand what behavior is expected
2. **Run tests first** - Ensure they pass before changes
3. **Understand callers** - Search for all usages of functions you modify
4. **Preserve signatures** - Don't change function parameters without updating callers

### Safe Modification Pattern

```typescript
// ❌ DANGEROUS - Changing function signature
// Before
export const addGate = (type: string, position: [number, number, number]) => { ... };

// After - This breaks all callers!
export const addGate = (config: GateConfig) => { ... };

// ✅ SAFE - Backward compatible change
// Add new function, deprecate old one
export const addGate = (type: string, position: [number, number, number]) => {
  return addGateWithConfig({ type, position, rotation: 0 });
};

export const addGateWithConfig = (config: GateConfig) => { ... };
```

### Adding New Features

1. **Add tests first** (or with the feature)
2. **Create new files** rather than bloating existing ones
3. **Export from index.ts** for clean imports
4. **Follow existing patterns** - look at similar code

```typescript
// ✅ CORRECT - New gate follows existing pattern
// src/gates/XorGate.tsx
import { memo } from 'react';
import { BaseGate, BaseGateProps } from './BaseGate';

export const XorGate = memo<BaseGateProps>((props) => {
  return <BaseGate {...props} gateType="xor" />;
});

// src/gates/index.ts
export { NandGate } from './NandGate';
export { XorGate } from './XorGate'; // Add export
```

### Test Requirements for AI Changes

| Change Type | Required Tests |
|-------------|----------------|
| New gate type | Unit test for logic + E2E test for wiring |
| Store action | Unit test for mutation |
| UI component | Component test for interactions |
| Bug fix | Regression test that would have caught the bug |
| Refactor | Existing tests must still pass |

---

## 🔄 Workflow Orchestration

For non-trivial tasks (3+ steps or architectural decisions), follow structured workflow practices:

- **Plan first**: Enter plan mode; write detailed specs; re-plan if the task deviates.
- **Use subagents**: Offload research, exploration, and parallel analysis; one focused task per subagent.
- **Self-improvement**: After any correction, update `tasks/lessons.md`; review lessons at session start.
- **Verify before done**: Never mark complete without proof; run tests, check logs; "Would a staff engineer approve?"
- **Demand elegance**: For non-trivial changes, consider more elegant solutions; avoid over-engineering simple fixes.
- **Autonomous bug fixing**: Fix bugs directly using logs, errors, failing tests; fix CI without being asked.

**Task management**: Plan in `tasks/todo.md`, track progress, document results, capture lessons in `tasks/lessons.md`.

**Full details**: See [docs/llm-workflow.md](docs/llm-workflow.md).

---

## ✅ Code Review Checklist

Before submitting ANY code change, verify:

```typescript
interface CodeReviewCriteria {
  react: {
    □ Hooks called only at top level (no conditionals/loops)?
    □ Component under 200 lines (split if larger)?
    □ Complex logic extracted to custom hooks?
    □ Props properly typed with interfaces?
    □ No inline object/function literals in JSX props?
    □ React Compiler handles memoization (no manual useMemo/useCallback for React code)?
    □ useEffect dependencies complete and correct?
  };
  testing: {
    □ All existing tests pass (`pnpm run test:run`)?
    □ New tests added for new functionality?
    □ Edge cases covered?
    □ E2E test updated if user workflow changed?
  };
  types: {
    □ No `any` types?
    □ All props/params typed?
    □ Interfaces defined for complex objects?
    □ Event handlers properly typed?
  };
  performance: {
    □ Three.js objects memoized (exception: external objects)?
    □ React Compiler handles component/callback memoization?
    □ No new objects created in render loops?
    □ React Compiler optimizes components automatically?
  };
  state: {
    □ Mutations only in circuitActions?
    □ Zustand selectors used for reads?
    □ No direct store mutation in components?
    □ Local UI state not in global store?
  };
  regressions: {
    □ Existing functionality still works?
    □ No function signatures changed without updating callers?
    □ Wire/gate interactions still work?
    □ Simulation still propagates correctly?
  };
}
```

---

## 🚫 Anti-Patterns to Avoid

```typescript
// ❌ ANTI-PATTERN: Modifying state directly
const BadComponent = () => {
  circuitStore.gates.push(newGate); // Will cause bugs
};

// ✅ CORRECT: Use actions
const GoodComponent = () => {
  circuitActions.addGate('nand', [0, 0, 0]);
};

// ❌ ANTI-PATTERN: Creating Three.js objects in render
const BadGate = ({ selected }) => {
  // Creates new BoxGeometry EVERY render!
  return <mesh geometry={new THREE.BoxGeometry(1, 1, 1)} />;
};

// ✅ CORRECT: Memoize Three.js objects (exception for external objects)
const GoodGate = ({ selected }) => {
  // Exception: useMemo for Three.js objects (external, not React state)
  const geometry = useMemo(() => new THREE.BoxGeometry(1, 1, 1), []);
  return <mesh geometry={geometry} />;
};

// ❌ ANTI-PATTERN: Skipping tests
// "It's just a small change, I'll test manually"

// ✅ CORRECT: Always add tests
it('small change works correctly', () => {
  expect(smallChange()).toBe(expectedResult);
});

// ❌ ANTI-PATTERN: Hooks in conditions
const BadComponent = ({ show }) => {
  if (!show) return null; // ❌ Early return before hooks
  const [state, setState] = useState(null); // ❌ Violates Rules of Hooks
};

// ✅ CORRECT: All hooks before any returns
const GoodComponent = ({ show }) => {
  const [state, setState] = useState(null);
  if (!show) return null; // ✅ Early return after hooks
};

// ❌ ANTI-PATTERN: Inline functions/objects in JSX
// Note: React Compiler handles this automatically, but it's still cleaner to extract
<GateComponent 
  onClick={() => handleClick(id)}  // React Compiler optimizes, but less readable
  style={{ color: 'blue' }}        // React Compiler optimizes, but less readable
/>

// ✅ CORRECT: Extract for readability (React Compiler optimizes automatically)
const handleClick = () => handleClick(id);
const style = { color: 'blue' };
<GateComponent onClick={handleClick} style={style} />
```

> **⚠️ Note:** React Compiler automatically optimizes inline functions/objects, but extracting them improves code readability. Do NOT use `useCallback`/`useMemo` for this - React Compiler handles it.
```

---

## 📚 Quick References

### pnpm Scripts
```bash
pnpm run dev          # Start dev server
pnpm run test:run     # Run Vitest unit/component tests
pnpm run test:e2e     # Run Playwright E2E tests
pnpm run test:coverage # Generate coverage report
```

### External Resources
- React Three Fiber: https://docs.pmnd.rs/react-three-fiber
- Drei (R3F helpers): https://github.com/pmndrs/drei
- Zustand: https://github.com/pmndrs/zustand
- Ant Design: https://ant.design/components/overview
- Playwright: https://playwright.dev/docs/intro
- Vitest: https://vitest.dev/guide/

### Debug Helpers
```typescript
// Log store state changes
useCircuitStore.subscribe((state) => console.log('State:', state));

// Access store in browser console
window.__CIRCUIT_STORE__   // Current state
window.__CIRCUIT_ACTIONS__ // Actions

// Inspect 3D scene
// In browser console with React DevTools + R3F
window.__THREE_DEVTOOLS__ // Three.js inspector
```

---

## 🎯 Review as Sr. Staff Engineer

When reviewing generated code, ask:

1. **Regression Risk**: Could this break existing wire/gate/simulation behavior?
2. **Test Coverage**: Are there tests that would catch future breaks?
3. **Performance**: Will this scale to 100+ gates?
4. **Maintainability**: Will this be easy to modify in 6 months?
5. **Consistency**: Does this follow existing patterns in the codebase?

If any answer is concerning, add tests or refactor before merging.

---

## 🤖 AI Agent Notes

- Use shell commands (`cat`, `echo`) to edit dotfiles (`.cursorrules`, `.env`, etc.) - file tools often fail on them
