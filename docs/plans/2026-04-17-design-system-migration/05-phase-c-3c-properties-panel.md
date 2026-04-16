# Chunk 5: Phase C-3c — PropertiesPanel (commit 3c)

> Spec ref: [`Commit 3c — PropertiesPanel`](../../specs/2026-04-17-design-system-migration-design.md#commit-3c--propertiespanel)

**Goal:** Build the floating contextual panel anchored bottom-center over the canvas. Selection-driven, per-element-type rendering. Absorbs `NodeRenameControl` rename logic for I/O nodes. All other fields stubbed with "Coming soon".

---

## File inventory

### Add (shadcn primitives)

```bash
npx shadcn@latest add input label
```

### Create

| Path | Purpose |
|---|---|
| `src/components/ui/PropertiesPanel/index.tsx` | Main panel component |
| `src/components/ui/PropertiesPanel/index.test.tsx` | Per-kind rendering + rename flow tests |
| `src/components/ui/PropertiesPanel/useSelectedElement.ts` | Discriminated-union adapter over store selection |
| `src/components/ui/PropertiesPanel/useSelectedElement.test.ts` | Adapter tests |

### Modify

| Path | Change |
|---|---|
| `src/App.tsx` | Mount `<PropertiesPanel />` inside the canvas-relative wrapper |

### Verify (no-op if already correct)

| Path | Expected state |
|---|---|
| `src/store/actions/.../*` | Confirm `circuitActions.deselectAll()` exists (added in chunk 3 if it didn't). Confirm `renameInputNode` and `renameOutputNode` exist (used by chunk 1 NodeRenameControl test before deletion). |

---

## Tasks

### Task 1: Add primitives and verify rename actions exist

- [ ] **Step 1.1: Add primitives**

```bash
npx shadcn@latest add input label
```

- [ ] **Step 1.2: Grep store for rename actions**

```bash
rg "renameInputNode|renameOutputNode" src/store/
```

Expected: both present in store action exports. If missing, add the missing action(s) following the pattern of existing rename code (likely already exists per the deleted `NodeRenameControl` consumer).

---

### Task 2: Build `useSelectedElement` adapter (TDD)

**Files:**
- Create: `src/components/ui/PropertiesPanel/useSelectedElement.ts`
- Create: `src/components/ui/PropertiesPanel/useSelectedElement.test.ts`

- [ ] **Step 2.1: Write the failing test**

```ts
// src/components/ui/PropertiesPanel/useSelectedElement.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useSelectedElement } from './useSelectedElement';
import { useCircuitStore, circuitActions } from '@/store/circuitStore';

describe('useSelectedElement', () => {
  beforeEach(() => {
    circuitActions.clearCircuit();
    circuitActions.deselectAll();
  });

  it('returns null when nothing is selected', () => {
    const { result } = renderHook(() => useSelectedElement());
    expect(result.current).toBeNull();
  });

  it('returns gate-shaped object when a gate is selected', () => {
    circuitActions.placeGate('AND', { x: 1, y: 0, z: 1 });
    const id = useCircuitStore.getState().gates[0].id;
    circuitActions.selectGate(id);
    const { result } = renderHook(() => useSelectedElement());
    expect(result.current?.kind).toBe('gate');
    if (result.current?.kind === 'gate') {
      expect(result.current.gateType).toBe('AND');
      expect(result.current.id).toBe(id);
    }
  });

  // ...similar for wire, input, output, junction kinds...

  it('priority: gate > wire > node when multiple slots are populated (defensive)', () => {
    circuitActions.placeGate('AND', { x: 1, y: 0, z: 1 });
    const gid = useCircuitStore.getState().gates[0].id;
    // Force-set both selections directly to test invariant
    useCircuitStore.setState((s) => {
      s.selectedGateId = gid;
      s.selectedWireId = 'fake-wire';
    });
    const { result } = renderHook(() => useSelectedElement());
    expect(result.current?.kind).toBe('gate');
  });
});
```

- [ ] **Step 2.2: Run, fail**

```bash
pnpm vitest run src/components/ui/PropertiesPanel/useSelectedElement.test.ts
```

- [ ] **Step 2.3: Implement adapter**

```ts
// src/components/ui/PropertiesPanel/useSelectedElement.ts
import { useCircuitStore } from '@/store/circuitStore';
import type { GateInstance, Wire, InputNode, OutputNode, Junction } from '@/store/types';

export type SelectedElement =
  | { kind: 'gate'; id: string; gateType: GateInstance['type']; name: string; position: GateInstance['position']; rotation: GateInstance['rotation'] }
  | { kind: 'wire'; id: string; from: Wire['from']; to: Wire['to'] }
  | { kind: 'input'; id: string; name: string; position: InputNode['position'] }
  | { kind: 'output'; id: string; name: string; position: OutputNode['position'] }
  | { kind: 'junction'; id: string; position: Junction['position'] };

export function useSelectedElement(): SelectedElement | null {
  const selectedGateId = useCircuitStore((s) => s.selectedGateId);
  const selectedWireId = useCircuitStore((s) => s.selectedWireId);
  const selectedNodeId = useCircuitStore((s) => s.selectedNodeId);
  const selectedNodeType = useCircuitStore((s) => s.selectedNodeType);
  const gates = useCircuitStore((s) => s.gates);
  const wires = useCircuitStore((s) => s.wires);
  const inputNodes = useCircuitStore((s) => s.inputNodes);
  const outputNodes = useCircuitStore((s) => s.outputNodes);
  const junctions = useCircuitStore((s) => s.junctions);

  if (selectedGateId) {
    const g = gates.find((x) => x.id === selectedGateId);
    if (g) return { kind: 'gate', id: g.id, gateType: g.type, name: g.name ?? `${g.type}_${g.id.slice(0, 4)}`, position: g.position, rotation: g.rotation };
  }
  if (selectedWireId) {
    const w = wires.find((x) => x.id === selectedWireId);
    if (w) return { kind: 'wire', id: w.id, from: w.from, to: w.to };
  }
  if (selectedNodeId && selectedNodeType) {
    if (selectedNodeType === 'input') {
      const n = inputNodes.find((x) => x.id === selectedNodeId);
      if (n) return { kind: 'input', id: n.id, name: n.name ?? '', position: n.position };
    }
    if (selectedNodeType === 'output') {
      const n = outputNodes.find((x) => x.id === selectedNodeId);
      if (n) return { kind: 'output', id: n.id, name: n.name ?? '', position: n.position };
    }
    if (selectedNodeType === 'junction') {
      const n = junctions.find((x) => x.id === selectedNodeId);
      if (n) return { kind: 'junction', id: n.id, position: n.position };
    }
  }
  return null;
}
```

(Verify exact field names against `src/store/types.ts` at impl. The field accessors above are best-guesses based on the spec.)

- [ ] **Step 2.4: Run, pass**

```bash
pnpm vitest run src/components/ui/PropertiesPanel/useSelectedElement.test.ts
```

---

### Task 3: Build PropertiesPanel (TDD)

**Files:**
- Create: `src/components/ui/PropertiesPanel/index.test.tsx`
- Create: `src/components/ui/PropertiesPanel/index.tsx`

- [ ] **Step 3.1: Write tests covering**

- Renders nothing when no selection
- Per kind: header type label, name field state (read-only with ComingSoon for gate/wire; editable for input/output)
- Input/output rename: type new name + Enter dispatches `renameInputNode`/`renameOutputNode`; Escape reverts; empty + Enter triggers `notify.error`
- Position read-out reflects `position.x` / `position.z`
- Rotation read-out, +90 button stubbed (or wired if `rotateGate` exists — verify at impl)
- Color, Default Value, Duplicate, Position editor all stubbed with `<ComingSoon>`
- Wire connection pills render `from`/`to` text
- Delete button dispatches correct removal action per `kind`
- Close (X) dispatches `circuitActions.deselectAll()`

- [ ] **Step 3.2: Run, fail**

- [ ] **Step 3.3: Implement**

Direct port of `design-system/components/circuit-designer/properties-panel.tsx` per spec §4c adaptations. Add `data-testid` attrs:
- Root: `properties-panel`
- Type label: `properties-type-label`
- Name field: `properties-name-field`
- Delete: `properties-delete`
- Close: `properties-close`

The component reads `useSelectedElement()` and switches on `.kind`. For gate/wire kinds the name displays as a read-only `<button>` wrapped in `<ComingSoon label="Renaming gates/wires coming soon">`. For input/output, the existing rename UX (Enter commits, Escape reverts) ports verbatim from the deleted `NodeRenameControl`.

- [ ] **Step 3.4: Run, pass**

---

### Task 4: Mount in App.tsx + verification + commit

```tsx
<div className="flex-1 relative">
  <CanvasArea />
  <RightActionBar />
  <PropertiesPanel />
</div>
```

- [ ] **Step 4.1: All four CI gates**

- [ ] **Step 4.2: Manual QA**: select gate, wire, input, output, junction → panel content per kind. Rename input → panel updates → store updates.

- [ ] **Step 4.3: Commit**

```bash
git add -A
git commit -m "$(cat <<'EOF'
feat(ui): add PropertiesPanel with NodeRenameControl absorbed

Ports design-system properties-panel.tsx as a contextual floating panel
anchored bottom-center. Adds useSelectedElement adapter that maps HACER's
three selection slots (selectedGateId / selectedWireId / selectedNodeId
+ selectedNodeType) into a discriminated union for per-kind rendering.

Input/Output node rename UX (Enter commits, Escape reverts, empty
triggers notify.error) ports verbatim from the deleted NodeRenameControl.
Gate/wire rename is read-only with Coming soon tooltip. Position and
rotation read-only displays wire to selected element. Color, Default
Value, Duplicate, Position editor, +90 rotate all stubbed with
ComingSoon (verify at impl whether rotateGate is trivial to wire \u2014
prefer wiring if so).

Delete button dispatches the right removal action per kind. Close (X)
dispatches deselectAll.

CI gates green.

Refs: docs/plans/2026-04-17-design-system-migration/05-phase-c-3c-properties-panel.md
EOF
)"
```

Move to chunk 6.

---

## Phase C-3c complete

Move to [`06-phase-c-3d-help-bar.md`](./06-phase-c-3d-help-bar.md).
