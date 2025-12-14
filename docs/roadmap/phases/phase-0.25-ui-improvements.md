# Phase 0.25: UI/UX Improvements & Grid-Based Circuit Design (Week 1.5)

**Part of:** [Comprehensive Development Roadmap](../../README.md)  
**Priority:** 🟠 HIGH - Improves User Experience Before Core Features  
**Timeline:** Week 1.5 (between Phase 0 and Phase 0.5)  
**Dependencies:** Phase 0 complete

---

## Overview

This phase improves the user experience of gate placement, movement, rotation, and wiring by implementing a professional grid-based circuit design system. It also optimizes E2E test performance and organization.

**Exit Criteria:**
- Gates snap to grid centers only
- Gates lie flat with names facing upward
- Rotation limited to 90-degree increments
- Gates cannot be placed in adjacent grid cells (spacing enforced)
- Wires follow grid lines (straight lines, 90-degree turns)
- Wire stubs removed when wires are connected
- Wires can be selected and deleted
- E2E tests organized with sensible naming
- E2E tests optimized (scene loaded once, reused across tests)
- Performance: <2s for E2E test suite execution

---

## 0.25.1 Grid-Based Gate Placement

**Problem:** Gates can be placed anywhere, making wiring difficult and wires can pass through gates.

**Solution:** Implement grid-based placement system.

### Grid System Design

```typescript
// src/utils/grid.ts
export const GRID_SIZE = 2.0; // Grid cell size in world units
export const MIN_GATE_SPACING = 1; // Minimum cells between gates (prevents adjacent placement)

export interface GridPosition {
  row: number;
  col: number;
}

export function worldToGrid(worldPos: Position): GridPosition {
  return {
    row: Math.round(worldPos.z / GRID_SIZE),
    col: Math.round(worldPos.x / GRID_SIZE),
  };
}

export function gridToWorld(gridPos: GridPosition): Position {
  return {
    x: gridPos.col * GRID_SIZE,
    y: 0, // Gates always on ground plane
    z: gridPos.row * GRID_SIZE,
  };
}

export function snapToGrid(worldPos: Position): Position {
  return gridToWorld(worldToGrid(worldPos));
}

export function canPlaceGateAt(gridPos: GridPosition, existingGates: GateInstance[]): boolean {
  // Check minimum spacing from all existing gates
  for (const gate of existingGates) {
    const gateGrid = worldToGrid(gate.position);
    const rowDiff = Math.abs(gateGrid.row - gridPos.row);
    const colDiff = Math.abs(gateGrid.col - gridPos.col);
    
    // Cannot place in same cell or adjacent cells
    if (rowDiff <= MIN_GATE_SPACING && colDiff <= MIN_GATE_SPACING) {
      return false;
    }
  }
  return true;
}
```

### Implementation Tasks

1. **Create grid utilities** (`src/utils/grid.ts`)
   - Grid position conversion functions
   - Snap-to-grid logic
   - Placement validation (spacing checks)

2. **Update placement actions** (`src/store/actions/placementActions/placementActions.ts`)
   - Snap placement preview to grid
   - Validate placement (check spacing)
   - Update `placeGate` to enforce grid snapping

3. **Update placement preview** (`src/components/canvas/Scene/PlacementPreview.tsx`)
   - Show grid-aligned preview
   - Visual feedback for invalid placement locations (no preview shown, cursor changes to not-allowed)

4. **Update gate movement actions** (`src/store/actions/gateActions/gateActions.ts`)
   - Ensure `updateGatePosition` snaps to grid
   - Note: Validation and wire position updates will be added in Phase 0.25.2 (gate dragging)

5. **Update visual grid** (`src/components/canvas/Scene/SceneGrid.tsx`)
   - Match visual grid cell size to logical grid (GRID_SIZE = 2.0)
   - Ensure grid aligns with gate placement positions

6. **Update cursor feedback** (`src/components/canvas/CanvasArea.tsx`, `src/App.css`)
   - Show `not-allowed` cursor when hovering over invalid placement positions

---

## 0.25.2 Flat Gate Orientation

**Problem:** Gates are currently oriented sideways (standing up), making gate names hard to read, causing pin overlap when multiple inputs/outputs exist, and making wiring more complex.

**Solution:** Rotate gates to lie flat on the grid with names facing upward. This ensures names are always visible, prevents pin overlap, simplifies wiring, and improves overall circuit clarity.

### Orientation Change Design

**Current State:**
- Gates are "standing" with body oriented: width (X), height (Y), depth (Z)
- Text labels on front face (Z+ direction)
- Pins positioned along X axis (left/right sides)
- Input pins have Y offsets (0.2, -0.2) for vertical spacing

**New State:**
- Gates lie flat on grid (rotated 90° around X axis)
- Text labels on top face (Y+ direction, always visible from above)
- Pins positioned on edges (inputs on one side, output on opposite side)
- No vertical pin overlap - all pins visible from top view

### Gate Rotation

```typescript
// Default rotation for all gates
const DEFAULT_GATE_ROTATION = {
  x: Math.PI / 2,  // 90° rotation around X axis (lay flat)
  y: 0,            // No Y rotation (can be rotated later)
  z: 0             // No Z rotation
}

// In createGateInstance (src/store/actions/gateActions/gateActions.ts)
return {
  id,
  type,
  position,
  rotation: DEFAULT_GATE_ROTATION,  // Changed from { x: 0, y: 0, z: 0 }
  inputs,
  outputs,
  selected: false,
}
```

### Pin Position Updates

**New Pin Layout:**
- **Input pins:** Positioned on left edge (negative X) when gate is at 0° rotation
  - Input A: `[-INPUT_PIN_X, 0, INPUT_OFFSET_Z]` (front)
  - Input B: `[-INPUT_PIN_X, 0, -INPUT_OFFSET_Z]` (back) for two-input gates
  - Input: `[-INPUT_PIN_X, 0, 0]` (center) for single-input gates
  
- **Output pin:** Positioned on right edge (positive X) when gate is at 0° rotation
  - Output: `[OUTPUT_PIN_X, 0, 0]` (center)

**Coordinate System (after flat rotation):**
- X axis: Left/Right (inputs left, output right)
- Y axis: Up/Down (text on top, gate body below)
- Z axis: Front/Back (for pin spacing on two-input gates)

### Text Label Positioning

```typescript
// Text positioned on Z- face (becomes top after 90° X rotation), with 180° rotation for flat appearance
// drei/Text is billboarded, so this combination makes text appear flat on horizontal surface
<Text
  position={[0, 0, -BODY_DEPTH / 2 - 0.01]}  // Z- face in local space (becomes top after gate rotation)
  rotation={[Math.PI, 0, 0]}                 // 180° around X to make text lie flat
  fontSize={0.2}
  color="#ffffff"
  anchorX="center"
  anchorY="middle"
>
  {gateType}
</Text>
```

### Implementation Tasks

1. **Update default gate rotation** (`src/store/actions/gateActions/gateActions.ts`)
   - Change `createGateInstance` default rotation from `{ x: 0, y: 0, z: 0 }` to `{ x: Math.PI / 2, y: 0, z: 0 }`
   - This makes all new gates lie flat by default

2. **Update gate component rotations** (`src/gates/components/*.tsx`)
   - Gate group rotation comes from store: `rotation={[gate.rotation.x, gate.rotation.y, gate.rotation.z]}`
   - Default rotation is now `{ x: Math.PI / 2, y: 0, z: 0 }` (stored in gate instance)
   - User rotation (arrow keys) modifies Y component: `{ x: Math.PI / 2, y: userRotation, z: 0 }`
   - No changes needed to GateRenderer - it already passes rotation from store
   - Update all gate components: NandGate, AndGate, OrGate, NotGate, XorGate (verify they use rotation prop correctly)

3. **Reposition text labels** (`src/gates/components/*.tsx`)
   - Move text to Z- face (becomes top after 90° X rotation)
   - Position: `[0, 0, -BODY_DEPTH / 2 - 0.01]`
   - Rotate text: `rotation={[Math.PI, 0, 0]}` (180° around X) to make text lie flat
   - drei/Text is billboarded, so this combination makes text appear flat on horizontal surface
   - Ensure text is always readable from top-down view

4. **Reposition pins** (`src/gates/components/*.tsx`)
   - **Two-input gates (NAND, AND, OR, XOR):**
     - Keep Y offsets in local space (they become horizontal after 90° X rotation)
     - Input A: `[INPUT_PIN_X, 0.2, 0]` (left side, top in local, becomes front in world)
     - Input B: `[INPUT_PIN_X, -0.2, 0]` (left side, bottom in local, becomes back in world)
     - Output: `[OUTPUT_PIN_X, 0, 0]` (right side, center)
   
   - **Single-input gate (NOT):**
     - Input: `[INPUT_PIN_X, 0, 0]` (left side, center) - unchanged
     - Output: `[OUTPUT_PIN_X, 0, 0]` (right side, center) - unchanged

5. **Update pin position calculations** (`src/store/actions/pinHelpers/pinHelpers.ts`)
   - Keep `INPUT_PIN_X` and `OUTPUT_PIN_X` constants (X positions unchanged)
   - Keep Y offsets in local space (they become horizontal/Z in world after 90° X rotation)
   - Ensure pin positions account for base rotation (90° around X)
   - Euler rotation transforms local Y offsets to world Z offsets (horizontal)
   - Test that `getPinWorldPosition` correctly calculates positions after rotation

6. **Update wire stub positions** (`src/gates/components/*.tsx`)
   - Reposition wire stubs to match new pin positions
   - Ensure stubs extend from pins in correct direction (away from gate body)

7. **Update gate Y position** (`src/components/canvas/Scene/GroundPlane.tsx`, `src/components/canvas/Scene/PlacementPreview.tsx`)
   - Gates are rotated 90° around X, so body extends from -BODY_DEPTH/2 to +BODY_DEPTH/2 in world Y
   - Place gates at `y: 0.2` (BODY_DEPTH/2) so gate bottom sits on grid at y=0
   - Update placement preview Y position to `0.2` and add rotation `[Math.PI / 2, 0, 0]`
   - Ensure gates sit flush on grid

8. **Update keyboard rotation** (`src/hooks/useKeyboardShortcuts.ts`)
   - With gates rotated 90° around X, local Y no longer corresponds to world Y (vertical)
   - Rotate around local Z axis to achieve world Y rotation (vertical)
   - Change rotation step from 45° to 90° for cleaner alignment
   - ArrowLeft: `rotateGate(selectedGateId, 'z', -Math.PI / 2)`
   - ArrowRight: `rotateGate(selectedGateId, 'z', Math.PI / 2)`

9. **Update camera position** (`src/components/canvas/Scene/Scene.tsx`)
   - Set initial camera position to `[0, 6, 6]` for better grid visibility
   - Grid lines appear horizontal/vertical on initial load
   - Improves initial visibility of gates, pins, and text

10. **Update base gate label** (`src/gates/common/BaseGateLabel.tsx`)
    - Adjust Html position to `[0, 0, -0.5]` for correct overlay placement with flat gates

11. **Update tests** (`src/store/actions/gateActions/gateActions.test.ts`, `src/store/actions/pinHelpers/pinHelpers.test.ts`)
    - Update tests to expect new default rotation `{ x: Math.PI / 2, y: 0, z: 0 }`
    - Update pin position tests: local Y offsets become world Z offsets after rotation
    - Verify pin positions are correct after rotation

12. **Visual verification**
    - Ensure all gate types render correctly when flat
    - Verify text labels are readable from top view (flat on horizontal surface)
    - Verify pins don't overlap and are all visible (arranged horizontally)
    - Verify wires can connect to pins correctly
    - Verify keyboard rotation works (90° steps, around vertical axis)

### Coordinate System Reference

**After flat rotation (90° around X axis):**
- Original X → New X (left/right)
- Original Y → New Z (front/back)  
- Original Z → New Y (up/down, inverted)

**Pin positions in local space (before group rotation):**
- Input pins: Negative X (left side)
- Output pins: Positive X (right side)
- Two-input spacing: Z axis (front/back)

### Benefits

1. **Always-visible names:** Gate labels face upward, always readable from top-down view
2. **No pin overlap:** Pins are spaced along Z axis (front/back) instead of Y axis (up/down)
3. **Clearer wiring:** All pins visible from top view, easier to see connections
4. **Simpler rotation:** Rotation around Y axis now changes which side pins face (N/S/E/W)
5. **Better circuit view:** Top-down view shows complete circuit layout clearly

### Rotation Behavior

- **Default rotation:** All new gates have `{ x: Math.PI / 2, y: 0, z: 0 }` stored in gate instance
- **User rotation:** Arrow keys rotate around local Z axis (which corresponds to world Y/vertical after 90° X rotation)
- **Rotation step:** 90° increments (`Math.PI / 2`) for clean alignment
- **Final rotation:** Applied directly to gate group: `[gate.rotation.x, gate.rotation.y, gate.rotation.z]`
- **Rotation axis:** Z rotation (local) achieves world Y rotation (vertical), changing pin orientation (N/S/E/W)

---

## 0.25.3 Gate Dragging and Movement

**Problem:** Gates cannot be moved after placement, making circuit layout adjustments difficult.

**Solution:** Implement drag-and-drop gate movement with grid snapping.

### Drag System Design

```typescript
// src/hooks/useGateDrag.ts
export function useGateDrag(gateId: string) {
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState<Position | null>(null);
  
  const handleDragStart = (event: ThreeEvent<PointerEvent>) => {
    event.stopPropagation();
    setIsDragging(true);
    setDragStart(event.point);
  };
  
  const handleDrag = (event: ThreeEvent<PointerEvent>) => {
    if (!isDragging || !dragStart) return;
    
    const currentPos = event.point;
    const delta = {
      x: currentPos.x - dragStart.x,
      y: currentPos.y - dragStart.y,
      z: currentPos.z - dragStart.z,
    };
    
    // Calculate new position
    const gate = useCircuitStore.getState().gates.find(g => g.id === gateId);
    if (!gate) return;
    
    const newWorldPos = {
      x: gate.position.x + delta.x,
      y: gate.position.y,
      z: gate.position.z + delta.z,
    };
    
    // Snap to grid
    const snappedPos = snapToGrid(newWorldPos);
    
    // Update preview position (visual feedback)
    circuitActions.updatePlacementPreviewPosition(snappedPos);
  };
  
  const handleDragEnd = () => {
    if (!isDragging) return;
    
    const previewPos = useCircuitStore.getState().placementPreviewPosition;
    if (previewPos) {
      // Validate and move gate
      const gridPos = worldToGrid(previewPos);
      if (canPlaceGateAt(gridPos, useCircuitStore.getState().gates.filter(g => g.id !== gateId))) {
        circuitActions.updateGatePosition(gateId, previewPos);
      }
    }
    
    setIsDragging(false);
    setDragStart(null);
    circuitActions.updatePlacementPreviewPosition(null);
  };
  
  return {
    isDragging,
    onPointerDown: handleDragStart,
    onPointerMove: handleDrag,
    onPointerUp: handleDragEnd,
  };
}
```

### Implementation Tasks

1. **Create drag hook** (`src/hooks/useGateDrag.ts`)
   - Handle drag start, move, end events
   - Grid snapping during drag
   - Position validation

2. **Update gate components** (`src/gates/components/*.tsx`)
   - Add drag handlers to gate mesh
   - Visual feedback during drag (opacity, highlight)
   - Prevent drag when in placement mode

3. **Update GateRenderer** (`src/gates/GateRenderer.tsx`)
   - Integrate drag functionality
   - Handle drag state

4. **Update wire positions** (`src/store/actions/wireActions/wireActions.ts`)
   - Recalculate wire positions when gate moves
   - Update wire preview during drag

---

## 0.25.4 90-Degree Rotation System

**Problem:** Continuous rotation makes pin alignment unpredictable, wires can't align properly.

**Solution:** Limit rotation to 90-degree increments, ensure pins face grid sides.

### Rotation System Design

```typescript
// src/utils/rotation.ts
export type RotationAngle = 0 | 90 | 180 | 270; // Degrees

export function normalizeRotation(angle: number): RotationAngle {
  const normalized = ((angle % 360) + 360) % 360;
  // Snap to nearest 90-degree increment
  return Math.round(normalized / 90) * 90 as RotationAngle;
}

export function rotationToRadians(angle: RotationAngle): number {
  return (angle * Math.PI) / 180;
}

// Calculate pin positions based on rotation
export function getPinWorldPosition(
  gatePosition: Position,
  pinLocalPosition: Position,
  rotation: RotationAngle
): Position {
  const radians = rotationToRadians(rotation);
  const cos = Math.cos(radians);
  const sin = Math.sin(radians);
  
  // Rotate pin position around gate center
  const rotatedX = pinLocalPosition.x * cos - pinLocalPosition.z * sin;
  const rotatedZ = pinLocalPosition.x * sin + pinLocalPosition.z * cos;
  
  return {
    x: gatePosition.x + rotatedX,
    y: gatePosition.y + pinLocalPosition.y,
    z: gatePosition.z + rotatedZ,
  };
}
```

### Implementation Tasks

1. **Create rotation utilities** (`src/utils/rotation.ts`)
   - 90-degree rotation normalization
   - Pin position calculation based on rotation

2. **Update gate rotation** (`src/store/actions/gateActions/gateActions.ts`)
   - Replace continuous rotation with 90-degree increments
   - Update `rotateGate` to snap to 90-degree angles

3. **Update keyboard shortcuts** (`src/hooks/useKeyboardShortcuts.ts`)
   - Arrow keys rotate in 90-degree increments
   - Visual feedback for rotation

4. **Update gate components**
   - Ensure pins align to grid sides at 0°, 90°, 180°, 270°
   - Update pin position calculations

---

## 0.25.5 Grid-Aligned Wire Routing

**Problem:** Curved wires can pass through gates, look unprofessional, and make connections unclear.

**Solution:** Implement grid-aligned wire routing with straight lines and 90-degree turns.

### Wire Routing Algorithm

```typescript
// src/utils/wireRouting.ts
export interface WireSegment {
  start: Position;
  end: Position;
  type: 'horizontal' | 'vertical';
}

export interface WirePath {
  segments: WireSegment[];
  totalLength: number;
}

export function calculateWirePath(
  start: Position,
  end: Position,
  gridSize: number
): WirePath {
  // Snap start and end to grid
  const startGrid = worldToGrid(snapToGrid(start));
  const endGrid = worldToGrid(snapToGrid(end));
  
  // Simple L-shaped routing (prefer horizontal-first)
  const segments: WireSegment[] = [];
  
  // Horizontal segment
  if (startGrid.col !== endGrid.col) {
    segments.push({
      start: gridToWorld(startGrid),
      end: { ...gridToWorld(endGrid), z: gridToWorld(startGrid).z },
      type: 'horizontal',
    });
  }
  
  // Vertical segment
  if (startGrid.row !== endGrid.row) {
    segments.push({
      start: segments.length > 0 ? segments[segments.length - 1].end : gridToWorld(startGrid),
      end: gridToWorld(endGrid),
      type: 'vertical',
    });
  }
  
  return {
    segments,
    totalLength: segments.reduce((sum, seg) => {
      const dx = seg.end.x - seg.start.x;
      const dz = seg.end.z - seg.start.z;
      return sum + Math.sqrt(dx * dx + dz * dz);
    }, 0),
  };
}
```

### Implementation Tasks

1. **Create wire routing utilities** (`src/utils/wireRouting.ts`)
   - Grid-aligned path calculation
   - L-shaped routing algorithm
   - Path optimization (shortest path)

2. **Update Wire3D component** (`src/components/canvas/Wire3D.tsx`)
   - Replace curved wire (CatmullRomCurve3) with grid-aligned segments
   - Render multiple straight segments for L-shaped paths
   - Visual style: straight lines, 90-degree corners

3. **Update wire preview** (`src/components/canvas/Scene/WirePreview.tsx`)
   - Show grid-aligned preview path
   - Snap preview to grid as user moves mouse

---

## 0.25.6 Wire Stub Removal

**Problem:** Wire stubs remain visible even when pins are connected, creating visual clutter.

**Solution:** Conditionally render wire stubs only when pins are not connected.

### Implementation Tasks

1. **Update gate components** (`src/gates/components/*.tsx`)
   - Conditionally render `WireStub` components
   - Only show stubs when `isConnected === false`
   - Remove stubs for both input and output pins when connected

2. **Update GateRenderer** (`src/gates/GateRenderer.tsx`)
   - Pass connection status to gate components
   - Ensure stub visibility logic is consistent

---

## 0.25.7 Wire Selection and Deletion

**Problem:** Users cannot select or delete wires, making it impossible to undo connections.

**Solution:** Implement wire selection and deletion functionality.

### Implementation Tasks

1. **Add wire selection state** (`src/store/types.ts`)
   ```typescript
   export interface CircuitState {
     // ... existing fields
     selectedWireId: string | null;
   }
   ```

2. **Add wire selection actions** (`src/store/actions/wireActions/wireActions.ts`)
   ```typescript
   selectWire: (wireId: string | null) => void;
   ```

3. **Update Wire3D component** (`src/components/canvas/Wire3D.tsx`)
   - Add click handler for wire selection
   - Visual feedback for selected wires
   - Support keyboard deletion (Delete/Backspace keys)

4. **Update keyboard shortcuts** (`src/hooks/useKeyboardShortcuts.ts`)
   - Delete key removes selected wire
   - Wire selection via click

5. **Update UI** (`src/components/ui/Sidebar.tsx`)
   - Show selected wire info
   - Delete button for selected wire

---

## 0.25.8 E2E Test Organization and Optimization

**Problem:** E2E tests are slow (wait for scene in each test) and naming/organization is inconsistent.

**Solution:** Reorganize tests with consistent naming and optimize by reusing scene.

### Test Organization Structure

```
e2e/specs/
├── ui/
│   ├── gate-placement.ui.spec.ts      # Gate placement tests
│   ├── gate-movement.ui.spec.ts       # Gate movement and rotation tests
│   ├── wire-connection.ui.spec.ts     # Wire connection tests
│   ├── wire-selection.ui.spec.ts      # Wire selection and deletion tests
│   └── circuit-building.ui.spec.ts    # End-to-end circuit building
├── store/
│   ├── gate-actions.store.spec.ts     # Gate action tests
│   ├── wire-actions.store.spec.ts     # Wire action tests
│   └── simulation.store.spec.ts       # Simulation tests
└── integration/
    └── full-circuit.integration.spec.ts # Full circuit workflows
```

### Test Optimization Strategy

1. **Scene Reuse Pattern**
   ```typescript
   // e2e/helpers/scene.ts
   export async function setupScene(page: Page) {
     // Load scene once
     await page.goto('/');
     await waitForSceneReady(page);
     return page;
   }
   
   export async function resetScene(page: Page) {
     // Use clear button instead of reloading
     await clearAllViaUI(page);
     await waitForSceneStable(page);
   }
   ```

2. **Test Structure**
   ```typescript
   test.describe('Gate Placement @ui', () => {
     test.beforeAll(async ({ browser }) => {
       // Load scene once for all tests in this suite
       const page = await browser.newPage();
       await setupScene(page);
       // Store page for reuse
     });
     
     test.afterEach(async ({ page }) => {
       // Reset scene between tests (faster than reload)
       await resetScene(page);
     });
     
     test('can place gate on grid', async ({ page }) => {
       // Test implementation
     });
   });
   ```

### Implementation Tasks

1. **Reorganize test files**
   - Group by feature (placement, wiring, movement)
   - Consistent naming: `{feature}.{type}.spec.ts`
   - Separate UI, store, and integration tests

2. **Create scene management helpers** (`e2e/helpers/scene.ts`)
   - `setupScene()` - Load scene once
   - `resetScene()` - Clear and reset
   - `waitForSceneReady()` - Wait for 3D scene initialization

3. **Update test structure**
   - Use `beforeAll` to load scene once per suite
   - Use `afterEach` to reset scene (faster than reload)
   - Remove redundant `waitForSceneStable` calls

4. **Update existing tests**
   - Rename files to match new structure
   - Refactor to use scene reuse pattern
   - Group related tests together

---

## Phase 0.25 Checklist & Exit Criteria

| Task | Effort | Dependencies | Exit Criteria |
|------|--------|--------------|---------------|
| 0.25.1 Grid-based placement system | 4h | - | Gates snap to grid, spacing enforced, visual feedback ✅ |
| 0.25.2 Flat gate orientation | 6h | Grid system | Gates lie flat, names face up, pins don't overlap ✅ |
| 0.25.3 Gate dragging and movement | 4h | Grid system, Flat orientation | Gates can be dragged, snap to grid |
| 0.25.4 90-degree rotation system | 2h | Grid system, Flat orientation | Rotation limited to 90° increments |
| 0.25.5 Grid-aligned wire routing | 4h | Grid system, Flat orientation | Wires follow grid lines, 90° turns |
| 0.25.6 Wire stub removal | 1h | - | Stubs hidden when pins connected |
| 0.25.7 Wire selection and deletion | 3h | - | Wires can be selected and deleted |
| 0.25.8 E2E test reorganization | 2h | - | Tests organized, consistent naming |
| 0.25.8 E2E test optimization | 3h | Test reorganization | Scene loaded once, tests <2s total |

**Total Estimated Effort:** ~29 hours  
**Performance Budget:** <2s E2E test suite, 60fps with 100+ gates

---

## Risk Mitigation

**Grid System Complexity:** Start with simple L-shaped routing, optimize later if needed.

**Test Performance:** Monitor test execution time, optimize scene loading if still slow.

**User Experience:** Test grid-based system with users to ensure it feels natural.

---

**Part of:** [Comprehensive Development Roadmap](../../README.md)  
**Previous:** [Phase 0: Critical Fixes](phase-0-critical-fixes.md)  
**Next:** [Phase 0.5: Nand2Tetris Foundation](phase-0.5-nand2tetris-foundation.md)
