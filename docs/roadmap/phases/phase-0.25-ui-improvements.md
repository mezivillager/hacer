# Phase 0.25: UI/UX Improvements & Grid-Based Circuit Design (Week 1.5) ✅

**Status:** ✅ **COMPLETED**  
**Completed:** 2025-12-17  
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
- Wires follow grid lines orthogonally (straight lines, 90-degree turns only)
- Wires avoid gate cells (no passing through gates)
- Wires enter/exit pins perpendicularly from facing grid side
- Wires maintain standard height and resolve crossings elegantly
- Wire stubs removed when wires are connected
- Wires can be selected and deleted
- Wire paths recalculate when gates move/rotate
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
    y: 0, // Base Y (snapToGrid preserves original Y, so gates at y: 0.2 for flat orientation)
    z: gridPos.row * GRID_SIZE,
  };
}

export function snapToGrid(worldPos: Position): Position {
  const snapped = gridToWorld(worldToGrid(worldPos));
  // Preserve Y coordinate so gates can be positioned above the grid (y: 0.2 for flat gates)
  return {
    ...snapped,
    y: worldPos.y,
  };
}

export function canPlaceGateAt(
  gridPos: GridPosition,
  existingGates: GateInstance[],
  excludeGateId?: string
): boolean {
  // Prevent placement on section lines
  // Section lines occur when either row OR col is even
  // Gates can only be placed in section interiors (both row and col must be odd)
  const isOnSectionLine = (gridPos.row % 2 === 0) || (gridPos.col % 2 === 0);
  if (isOnSectionLine) {
    return false;
  }

  // Check minimum spacing from all existing gates
  for (const gate of existingGates) {
    // Skip excluded gate (useful when dragging an existing gate)
    if (excludeGateId && gate.id === excludeGateId) {
      continue;
    }

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
      y: gate.position.y, // Preserve Y (0.2 for flat gates - BODY_DEPTH/2)
      z: gate.position.z + delta.z,
    };
    
    // Snap to grid (preserves Y coordinate)
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
      // Exclude the gate being dragged from validation
      if (canPlaceGateAt(gridPos, useCircuitStore.getState().gates.filter(g => g.id !== gateId), gateId)) {
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
   - Grid snapping during drag (preserves Y = 0.2 for flat gates)
   - Position validation (respects section line restrictions)
   - Exclude dragged gate from spacing validation

2. **Update gate components** (`src/gates/components/*.tsx`)
   - Add drag handlers to gate mesh
   - Visual feedback during drag (opacity, highlight)
   - Prevent drag when in placement mode
   - Ensure drag preserves flat orientation (Y = 0.2)

3. **Update GateRenderer** (`src/gates/GateRenderer.tsx`)
   - Integrate drag functionality
   - Handle drag state

4. **Update wire positions** (`src/store/actions/wireActions/wireActions.ts`)
   - Recalculate wire positions when gate moves
   - Update wire preview during drag
   - Account for flat gate positions (Y = 0.2) in wire calculations

---

## 0.25.4 90-Degree Rotation System

**Status:** ✅ **Already Implemented in Phase 0.25.2**

**Implementation:** 90-degree rotation is already implemented as part of flat gate orientation.

### Current Implementation

- **Rotation step:** 90° increments (`Math.PI / 2`) - already implemented
- **Rotation axis:** Z axis (local) for world Y rotation (vertical) - already implemented
- **Keyboard shortcuts:** Arrow keys rotate in 90° increments - already implemented in `useKeyboardShortcuts.ts`
- **Pin position calculation:** Handled by `pinHelpers.ts` which accounts for gate rotation (90° X base + user Z rotation)

### Notes

- No separate rotation utilities needed - rotation is handled directly in:
  - `src/hooks/useKeyboardShortcuts.ts` - 90° rotation step
  - `src/store/actions/gateActions/gateActions.ts` - `rotateGate` function
  - `src/store/actions/pinHelpers/pinHelpers.ts` - Pin position calculation with Euler rotation
- Gates rotate around vertical axis (world Y) via local Z rotation
- Rotation ensures pins align to grid sides (N/S/E/W) at 0°, 90°, 180°, 270°
- All rotation logic accounts for flat gate orientation (90° X base rotation)

---

## 0.25.5 Grid-Aligned Wire Routing

**Problem:** Curved wires can pass through gates, look unprofessional, make connections unclear, and create visual clutter. A grid-aligned orthogonal routing system is needed to ensure wires never intersect gate bodies and circuits remain readable.

**Solution:** Implement comprehensive grid-aligned orthogonal wire routing following industry-standard PCB routing principles adapted for 3D visualization. Wires follow grid lines with 90-degree turns, avoid gate bodies, maintain consistent height, and resolve crossings elegantly.

**CRITICAL RULE - Algorithm Consistency:** Wire preview and final wires must use the **exact same routing algorithm**. Both use the same BFS pathfinding (`findPathAvoidingGates`), the same 180-degree turn prevention logic, and the same gate avoidance rules. The only difference is the final destination (cursor position for preview, pin position for final wire).

**Standards Reference:** Based on orthogonal routing principles from PCB design (grid-based routing, layer directionality, spacing rules) adapted for 3D visualization with height-based crossing resolution.

### Wire Routing Rules

1. **No wire passing through gate cells:** Wires cannot pass through grid cells containing gates, except for entry/exit segments connecting to pins
2. **Orthogonal movement only:** Wires move only perpendicular or parallel to grid lines (horizontal/vertical, no diagonals)
3. **Input pin entry:** Wires enter input pins from the grid side facing the pin, perpendicular to grid line, straight from pin center to grid boundary
4. **Output pin exit:** Wires exit output pins straight from pin center to the grid side facing the pin, meeting grid side perpendicularly
5. **Standard wire height:** All wires maintain consistent height above ground plane (standardized pin center height)
6. **No wire overlap:** Wires cannot overlap horizontally/vertically; parallel wires maintain minimum spacing; crossings resolved with height differences
7. **Wire preview compliance:** Wire previews follow all routing rules and auto-adjust as cursor moves
8. **Dynamic maintenance:** Wiring rules apply and paths recalculate when gates are moved or rotated
9. **Gate placement blocking:** Gates cannot be placed on grid cells that have wires passing through them (inverse of rule 1)
10. **Wire stub visibility:** Gate wire stubs (segments extending from pin centers) must be hidden when wires are connected to prevent visual overlap

### Additional Rules (for Flawless Implementation)

10. **Multiple input wires:** When multiple wires connect to input pins, they run parallel maintaining pin-to-pin spacing
11. **Path optimization:** Choose shortest valid path that avoids gate cells
12. **Crossing resolution:** When wires cross, one wire elevates in a smooth arc to pass over the other
13. **Entry/exit segments:** Entry and exit segments extend from pin center straight to the nearest facing grid line (grid cell boundary)
14. **Grid alignment:** All wire segments (except entry/exit) snap to grid lines (no fractional grid positions)
15. **Height layering:** Wires at same height can run parallel with minimum spacing; different heights allow crossing
16. **Gate rotation handling:** Wire paths recalculate when gates rotate, maintaining perpendicular entry/exit
17. **Gate placement preview:** Gate placement preview shows valid/invalid states based on wire occupancy
18. **Wire stub removal:** Gate wire stubs hidden when connected to prevent overlap with routing wires

### Specification (TDD Approach)

#### 1. Orthogonal Grid-Aligned Movement Specification

**Behavior:** Wires move only along grid lines in horizontal (X-axis) or vertical (Z-axis) directions with 90-degree turns.

**Test Specifications:**
- **Given** a wire path from start to end position
- **When** the path is calculated
- **Then** all segments must be either horizontal (X changes, Z constant) or vertical (Z changes, X constant)
- **And** no segment may have both X and Z changing simultaneously
- **And** all segment endpoints must align to grid lines (snapped to grid)

**Edge Cases:**
- When start and end are on same grid line, path is single straight segment
- When start and end are diagonal, path uses L-shaped routing (horizontal then vertical, or vice versa)
- All coordinates must be multiples of GRID_SIZE (2.0 units)

#### 2. Gate Cell Avoidance Specification

**Behavior:** Wires cannot pass through grid cells containing gates, except for entry/exit segments at pin locations.

**Test Specifications:**
- **Given** a wire path calculation
- **When** the path would pass through a grid cell containing a gate
- **Then** the path must be rerouted around the gate cell
- **And** the rerouted path must still be orthogonal and grid-aligned
- **And** entry/exit segments at pin locations are allowed to pass through the gate's own cell

**Edge Cases:**
- Path must avoid all gate cells, not just the source/destination gates
- When gates block direct path, routing must find alternative path
- Entry segment from output pin and exit segment to input pin are exceptions (allowed in gate cell)

#### 3. Input Pin Entry Specification

**Behavior:** Wires enter input pins from the grid side facing the pin, perpendicular to the grid line, straight to pin center.

**Test Specifications:**
- **Given** a wire connecting to an input pin
- **When** the wire path is calculated
- **Then** the final segment must approach the pin from the grid side facing the pin
- **And** the final segment must be perpendicular to the grid line (straight into pin)
- **And** the segment must end exactly at the pin center
- **And** the segment must be straight (no turns in the entry segment)

**Edge Cases:**
- For gates at different rotations, entry direction adjusts to face the correct grid side
- Multiple input pins on same gate: wires maintain parallel paths with pin-to-pin spacing
- Entry segment must have minimum length before any turns occur

#### 4. Output Pin Exit Specification

**Behavior:** Wires exit output pins straight to the grid side facing the pin, meeting the grid side perpendicularly.

**Test Specifications:**
- **Given** a wire connecting from an output pin
- **When** the wire path is calculated
- **Then** the first segment must extend straight from pin center to the grid side facing the pin
- **And** the segment must be perpendicular to the grid line
- **And** the segment must start exactly at the pin center
- **And** the segment must be straight (no turns in the exit segment)

**Edge Cases:**
- For gates at different rotations, exit direction adjusts to face the correct grid side
- Exit segment must have minimum length before any turns occur
- Exit segment must reach grid boundary before turning

#### 5. Standard Wire Height Specification

**Behavior:** All wires maintain a consistent height above the ground plane, matching the standardized pin center height.

**Test Specifications:**
- **Given** any wire path
- **When** the path is calculated
- **Then** all segments must have Y coordinate equal to the standard wire height
- **And** the standard height must match pin center Y coordinate (currently 0.2 for flat gates)
- **And** the height must be consistent across all wires in the circuit

**Edge Cases:**
- Wire height must be defined as a constant (WIRE_HEIGHT = 0.2 or pin center Y)
- All wire segments must maintain this height (no vertical variation except for crossings)
- Height must account for flat gate orientation (gates at y: 0.2, wires at same height)

#### 6. 180-Degree Turn Prevention Specification

**Behavior:** Wires must never make immediate 180-degree turns that would cause them to reverse direction back into the source gate body.

**Test Specifications:**
- **Given** a wire exiting from an output pin
- **When** the destination requires routing backward (opposite to exit direction)
- **Then** the wire must extend forward at least one full grid cell (GRID_SIZE) before turning
- **And** the 180-degree turn check must compare exit direction to routing direction (gridEnd), not pin/cursor position
- **And** this prevention applies to both preview and final wires using the same logic
- **And** the extension creates a transition segment before the routing path begins

**Implementation Details:**
- Check dot product between exit direction and routing direction (from gridStart to gridEnd)
- If dot product < -0.3 (indicating backward routing), extend gridStart by at least GRID_SIZE * 1.0 in exit direction
- Both `calculateGridAlignedPath` and `calculatePreviewPath` use identical 180-degree turn prevention logic
- The check compares against `gridEnd` (entry boundary) for final wires, and against `gridEnd` (cursor boundary) for preview

**Edge Cases:**
- Prevents wires from exiting output pin and immediately reversing into gate body
- Applies when destination is behind the source gate (backward routing)
- Extension ensures wire clears source gate's cell before routing
- Works correctly for all gate orientations and rotations

#### 7. Wire Overlap and Crossing Resolution Specification

**Behavior:** Wires cannot overlap horizontally/vertically. Parallel wires maintain minimum spacing. Crossings resolved with height differences.

**Terminology:**
- **Overlap:** Two parallel wires (both horizontal or both vertical) that are too close together (within MIN_WIRE_SPACING). These must maintain minimum spacing.
- **Crossing:** Two wires that intersect at different angles (one horizontal, one vertical). These are resolved by elevating one wire.

**Test Specifications:**
- **Given** two wires that would overlap on the same grid line (parallel wires too close)
- **When** paths are calculated
- **Then** wires must maintain minimum spacing (e.g., 0.2 units apart) when parallel
- **And** if wires must cross (intersect at different angles), one wire elevates in a smooth arc to pass over
- **And** the elevated wire returns to standard height after crossing

**Crossing Resolution:**
- **Given** two wires that cross at a grid intersection (one horizontal, one vertical)
- **When** crossing resolution is applied
- **Then** one wire (e.g., the one created later) elevates to cross over
- **And** elevation uses smooth arc defined by three elevation segments: approach point (30% elevation), peak point (full elevation), and descend point (30% elevation back to standard height)
- **And** elevation height is sufficient to clear the lower wire (e.g., +0.1 units per crossing level)
- **And** wire returns to standard height after crossing

**Smooth Arc Definition:**
- Smooth arc is created using three-point curve with elevation segments:
  1. Approach segment: from crossing location to approach point (y = WIRE_HEIGHT + CROSSING_ELEVATION * 0.3)
  2. Peak segment: from approach point to peak point (y = WIRE_HEIGHT + CROSSING_ELEVATION * elevationLevel)
  3. Descend segment: from peak point to descend point (y = WIRE_HEIGHT + CROSSING_ELEVATION * 0.3)
  4. Return segment: from descend point back to crossing location at standard height

**Edge Cases:**
- Multiple wires crossing at same point: each subsequent wire elevates higher (elevationLevel increments)
- Parallel wires: maintain minimum spacing (3W rule: 3x wire width) - these do NOT cross, they overlap
- Wires on different grid lines can cross without elevation (no conflict if not at same intersection)

#### 8. Wire Preview Specification

**Behavior:** Wire previews follow all routing rules and auto-adjust as cursor moves. **CRITICAL:** Preview uses the exact same routing algorithm as final wires to ensure consistency.

**Test Specifications:**
- **Given** a wire preview being drawn
- **When** the cursor moves
- **Then** the preview path must follow grid-aligned orthogonal routing
- **And** the preview must avoid gate cells
- **And** the preview must show entry/exit segments correctly (pin center to grid boundary)
- **And** the preview must update in real-time as cursor moves
- **And** the preview must use the same BFS pathfinding algorithm (`findPathAvoidingGates`) as final wires
- **And** the preview must prevent 180-degree turns using the same logic as final wires (checking against `gridEnd`)
- **And** the preview final segment must be strictly orthogonal (horizontal or vertical only, never diagonal)
- **And** if cursor is over a gate, preview must route to gate boundary, not through gate body

**Algorithm Consistency:**
- Preview calls `findPathAvoidingGates` for middle routing, same as final wires
- Preview uses same 180-degree turn prevention (extends `gridStart` by GRID_SIZE * 1.0 when needed)
- Preview final segments break into strictly orthogonal segments (horizontal first, then vertical, or vice versa)
- Only difference: preview ends at cursor position (snapped to grid boundary if over gate), final wire ends at pin

**Edge Cases:**
- Preview must snap cursor position to grid for path calculation
- Preview must show crossing resolution if path would cross existing wire
- Preview must show gate avoidance routing if path would pass through gate
- Preview must route to nearest grid boundary when cursor is over a gate, avoiding gate body completely
- Preview final segments must be strictly orthogonal (horizontal first, then vertical, or vice versa)
- Preview must handle backward destinations (behind source gate) correctly, extending forward before routing

#### 9. Dynamic Wire Maintenance Specification

**Behavior:** Wire paths recalculate and maintain routing rules when gates are moved or rotated.

**Test Specifications:**
- **Given** a wire connected to gates
- **When** a gate is moved
- **Then** the wire path must recalculate to new pin positions
- **And** the path must still follow all routing rules
- **And** the path must avoid gate cells (including moved gate's new position)

- **Given** a wire connected to gates
- **When** a gate is rotated
- **Then** the wire path must recalculate entry/exit directions
- **And** entry/exit segments must adjust to new pin orientations
- **And** the path must still follow all routing rules

**Edge Cases:**
- Moving gate may require complete path recalculation if it blocks new route
- Rotating gate changes pin orientations, requiring entry/exit segment recalculation
- Multiple wires affected by gate movement must all recalculate

#### 10. Multiple Input Wires Parallel Routing Specification

**Behavior:** When multiple wires connect to input pins on the same gate, they run parallel maintaining pin-to-pin spacing.

**Test Specifications:**
- **Given** two wires connecting to input pins on the same gate
- **When** wire paths are calculated
- **Then** the entry segments must be parallel to each other
- **And** the spacing between parallel segments must match the pin-to-pin spacing
- **And** both wires must enter from the same grid side (facing the pins)

**Edge Cases:**
- For two-input gates: wires to inputA and inputB must maintain 0.4 unit spacing (pin centers at 0.2 and -0.2 in local space)
- Wires may share common routing segments before diverging to individual pins
- Parallel segments must maintain minimum spacing to avoid visual overlap

#### 11. Path Optimization Specification

**Behavior:** Wire routing algorithm chooses the shortest valid path that avoids gate cells. The BFS (Breadth-First Search) pathfinding algorithm inherently provides the shortest path by exploring cells in order of distance from the start.

**Test Specifications:**
- **Given** multiple possible paths between two pins
- **When** the path is calculated using `findPathAvoidingGates` (BFS algorithm)
- **Then** the algorithm must choose the shortest valid path
- **And** the path must avoid all gate cells
- **And** the path must be orthogonal and grid-aligned
- **And** BFS ensures shortest path by exploring nearest cells first

**Implementation Note:**
- The `optimizePath()` function is a pass-through wrapper - BFS in `findPathAvoidingGates` already provides optimal (shortest) paths
- BFS guarantees shortest path in unweighted grid graphs by exploring cells in distance order

**Edge Cases:**
- When direct path is blocked, algorithm must find alternative route
- Alternative routes may be longer but must still be optimized (shortest of valid options)
- Path optimization must consider gate positions and routing constraints
- BFS may find multiple paths of equal length - any shortest path is acceptable

#### 12. Entry/Exit Segment Specification

**Behavior:** Entry and exit segments extend straight from pin center to the nearest facing grid line (grid cell boundary). When overlaps with existing wires are detected, segments can extend beyond the minimum length to avoid overlaps.

**Test Specifications:**
- **Given** a wire connecting to a pin
- **When** the wire path is calculated
- **Then** the entry/exit segment must start exactly at pin center (x, y, z coordinates match pin center exactly)
- **And** the segment must extend straight from pin center to the nearest grid line facing the pin
- **And** the segment must be perpendicular to the grid line (strictly horizontal or vertical, no diagonal components)
- **And** the segment must end at or beyond the grid cell boundary (grid line)
- **And** the segment must be straight (no turns)

**Overlap Avoidance:**
- **Given** an entry/exit segment that would overlap with existing wire segments
- **When** the segment is calculated with `calculateEntrySegmentWithAvoidance` or `calculateExitSegmentWithAvoidance`
- **Then** the segment may extend beyond the minimum length (one grid cell boundary) to avoid overlaps
- **And** the extension should be at least GRID_SIZE in the direction of the segment
- **And** the extended segment must still be perpendicular to the grid line
- **And** if extension is insufficient, the routing algorithm will reroute the middle segments instead

**Edge Cases:**
- For input pins: entry segment extends from pin center to the grid side facing the pin (or beyond if avoiding overlaps)
- For output pins: exit segment extends from pin center to the grid side facing the pin (or beyond if avoiding overlaps)
- Entry/exit segments are the only wire segments allowed within gate cells
- After reaching grid boundary, wire can turn and follow grid-aligned routing
- Entry/exit segments must maintain perpendicularity even when extended for overlap avoidance

#### 13. Grid Alignment Specification

**Behavior:** All wire segments snap to grid lines with no fractional grid positions.

**Test Specifications:**
- **Given** any wire segment (except entry/exit segments)
- **When** the segment is created
- **Then** start and end positions must be on grid lines (X and Z multiples of GRID_SIZE)
- **And** no segment may have fractional grid positions
- **And** all intermediate waypoints must also be grid-aligned

**Edge Cases:**
- Entry/exit segments start at pin centers (may not be grid-aligned) and end at grid boundaries
- All segments after entry/exit must be grid-aligned
- Grid alignment must be maintained even when routing around obstacles

#### 14. Gate Placement Validation Specification

**Behavior:** Gates cannot be placed on grid cells that have wires passing through them.

**Test Specifications:**
- **Given** a gate placement attempt
- **When** the target grid cell contains wire segments (excluding entry/exit segments at pin locations)
- **Then** gate placement must be rejected (invalid placement)
- **And** the gate placement preview must indicate invalid placement (e.g., red highlight, disabled cursor)
- **And** the gate cannot be placed until the cell is clear of wires

**Edge Cases:**
- Gate can be placed on a cell if only entry/exit segments pass through (these are allowed)
- Moving a gate to a new position must validate the new cell is clear
- Rotating a gate doesn't change its cell, so no validation needed for rotation alone
- If a wire is deleted, previously blocked cells become available for gate placement

#### 14. Gate Placement Preview Specification

**Behavior:** Gate placement preview shows whether the target cell is valid (no wires) or invalid (wires present).

**Test Specifications:**
- **Given** a gate being dragged for placement
- **When** the cursor hovers over a grid cell
- **Then** the preview must check if the cell has wires passing through it
- **And** if wires are present, preview must show invalid state (e.g., red highlight, disabled appearance)
- **And** if cell is clear, preview must show valid state (e.g., normal highlight, enabled appearance)
- **And** preview must update in real-time as cursor moves

**Edge Cases:**
- Preview must account for entry/exit segments (these don't block placement)
- Preview must check all wire segments in the target cell
- Preview must update immediately when wires are added/removed

#### 16. Wire Stub Visibility Specification

**Behavior:** Gate wire stubs (small wire segments that are part of the gate component, extending from pin centers) must be hidden when a wire is connected to that pin to prevent visual overlap.

**Test Specifications:**
- **Given** a pin with no connected wire
- **When** the gate is rendered
- **Then** the pin's wire stub must be visible (rendered)

- **Given** a pin with a connected wire
- **When** the gate is rendered
- **Then** the pin's wire stub must be hidden (not rendered)
- **And** the connected wire must start/end at the pin's center position
- **And** there must be no visual overlap between the stub and the connected wire

**Edge Cases:**
- When a wire is disconnected from a pin, the stub must become visible again
- When multiple wires connect to the same pin (if supported), the stub must remain hidden
- The stub visibility must update immediately when wires are connected or disconnected
- Both input and output pin stubs must follow this behavior
- Stub visibility must work correctly for all gate rotations
- Stub visibility must work correctly for all gate types

### Implementation Tasks

1. **Define wire routing constants** (`src/utils/wireRouting.ts`)
   - `WIRE_HEIGHT`: Standard wire height (match pin center Y, currently 0.2)
   - `MIN_WIRE_SPACING`: Minimum spacing between parallel wires (e.g., 0.2 units)
   - `CROSSING_ELEVATION`: Height increase for wire crossings (e.g., 0.1 units)
   - `GRID_SIZE`: Grid cell size (2.0, imported from grid.ts)

2. **Create grid-aligned routing algorithm** (`src/utils/wireRouting.ts`)
   - `calculateGridAlignedPath()`: Main routing function
   - `findPathAvoidingGates()`: Pathfinding with gate avoidance
   - `resolveWireCrossings()`: Handle wire crossings with elevation
   - `calculateEntrySegment()`: Generate entry segment from pin center to nearest facing grid line
   - `calculateExitSegment()`: Generate exit segment from pin center to nearest facing grid line
   - `optimizePath()`: Choose shortest valid path
   - `getWireSegmentsInCell()`: Get all wire segments passing through a grid cell (for gate placement validation)

3. **Update Wire3D component** (`src/components/canvas/Wire3D.tsx`)
   - Replace curve-based rendering with segment-based rendering
   - Render multiple straight segments for grid-aligned paths
   - Handle crossing elevations (smooth arcs for elevated segments)
   - Visual style: straight lines, 90-degree corners, smooth crossing arcs

4. **Update wire preview** (`src/components/canvas/Scene/WirePreview.tsx`)
   - Use grid-aligned routing for preview
   - Snap preview to grid as cursor moves
   - Show gate avoidance in real-time
   - Show crossing resolution in preview

5. **Wire path recalculation** (`src/store/actions/wireActions/wireActions.ts`)
   - Recalculate wire paths when gates move
   - Recalculate wire paths when gates rotate
   - Maintain routing rules during recalculation

6. **Gate placement validation** (`src/store/actions/gateActions/gateActions.ts` or `src/hooks/useGateDrag.ts`)
   - Check if target grid cell has wires before allowing gate placement
   - Reject gate placement if cell contains wire segments (excluding entry/exit segments)
   - Update gate placement preview to show valid/invalid states

7. **Gate placement preview** (`src/components/canvas/Scene/GatePreview.tsx` or similar)
   - Check wire occupancy of target grid cell in real-time
   - Show visual feedback for invalid placement (red highlight, disabled cursor)
   - Show visual feedback for valid placement (normal highlight)

8. **Wire stub visibility** (`src/gates/common/BaseGate.tsx` and gate components)
   - Conditionally render wire stubs based on pin connection status
   - Hide stubs when `isConnected === true` for the corresponding pin
   - Show stubs when `isConnected === false` or no wire connected
   - Update stub visibility immediately when wires connect/disconnect

9. **Write tests** (TDD approach)
   - Unit tests for grid-aligned path calculation
   - Unit tests for gate cell avoidance
   - Unit tests for entry/exit segment generation (pin center to grid boundary)
   - Unit tests for crossing resolution
   - Unit tests for path optimization
   - Unit tests for gate placement validation (wire blocking)
   - Unit tests for wire segment detection in grid cells
   - Unit tests for wire stub visibility (hide when connected, show when disconnected)
   - Component tests for wire stub rendering based on connection status
   - Integration tests for wire path recalculation
   - Integration tests for gate placement with wire blocking
   - E2E tests for wire routing behavior
   - E2E tests for gate placement validation
   - E2E tests for wire stub visibility

### Acceptance Criteria

- ✅ Wires move only orthogonally (horizontal/vertical, 90-degree turns)
- ✅ Wires never pass through gate cells (except entry/exit segments)
- ✅ Input pins receive wires from facing grid side, perpendicular entry
- ✅ Output pins send wires to facing grid side, perpendicular exit
- ✅ All wires maintain standard height (consistent Y coordinate)
- ✅ Wires don't overlap; parallel wires maintain minimum spacing
- ✅ Wire crossings resolved with smooth elevation arcs
- ✅ Wire previews follow all routing rules
- ✅ Wire paths recalculate when gates move/rotate
- ✅ Multiple input wires maintain parallel routing with pin spacing
- ✅ Paths are optimized (shortest valid route)
- ✅ Entry/exit segments extend from pin center to nearest facing grid line
- ✅ All segments (except entry/exit) are grid-aligned
- ✅ Gates cannot be placed on cells with wires passing through
- ✅ Gate placement preview shows valid/invalid states
- ✅ Wire stubs are hidden when pins are connected (no visual overlap)
- ✅ Wire stubs reappear when wires are disconnected
- ✅ All tests pass (unit, integration, E2E)

---

## 0.25.6 Wire Stub Removal

**Problem:** Wire stubs remain visible even when pins are connected, creating visual clutter.

**Solution:** Conditionally render wire stubs only when pins are not connected.

### Implementation Tasks

1. **Update gate components** (`src/gates/components/*.tsx`)
   - Conditionally render `WireStub` components
   - Only show stubs when `isConnected === false`
   - Remove stubs for both input and output pins when connected
   - Wire stubs positioned correctly for flat gates (Y offsets in local space)

2. **Update GateRenderer** (`src/gates/GateRenderer.tsx`)
   - Pass connection status to gate components
   - Ensure stub visibility logic is consistent
   - Account for flat gate orientation when calculating stub positions

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
   - Account for flat gate positions (Y = 0.2) when rendering wires

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
| 0.25.3 Gate dragging and movement | 4h | Grid system, Flat orientation | Gates can be dragged, snap to grid, respect section lines ✅ |
| 0.25.4 90-degree rotation system | 2h | Grid system, Flat orientation | Rotation limited to 90° increments ✅ (Already implemented in 0.25.2) |
| 0.25.5 Grid-aligned wire routing | 8h | Grid system, Flat orientation | Orthogonal routing, gate avoidance, crossing resolution, dynamic recalculation ✅ |
| 0.25.6 Wire stub removal | 1h | - | Stubs hidden when pins connected ✅ |
| 0.25.7 Wire selection and deletion | 3h | - | Wires can be selected and deleted ✅ |
| 0.25.8 E2E test reorganization | 2h | - | Tests organized, consistent naming ✅ |
| 0.25.8 E2E test optimization | 3h | Test reorganization | Scene loaded once, tests <2s total ✅ |

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
