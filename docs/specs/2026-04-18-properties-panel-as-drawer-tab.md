# Recommendation: Move PropertiesPanel into RightActionBar drawer tab

**Status:** Recommendation only \u2014 no implementation work scheduled.
**Date:** 2026-04-18
**Origin:** UX feedback during the design-system migration (PR #88). Floating
PropertiesPanel auto-opening on every selection was disruptive to common
flows (drag, delete) where the user doesn't need to inspect properties.

## What was done in PR #88 (immediate fix)

Selection alone no longer opens the PropertiesPanel. The user must
explicitly request it via:

- **CompactToolbar Properties button** (Info icon, between Axes and Delete)
- **`I` keyboard shortcut** (toggles panel for current selection)

Once opened, the panel persists across selection changes (its content
updates) until the user clicks the close button (X) or no element is
selected. This is the lightest-weight fix that addresses the immediate
annoyance without restructuring the UI architecture.

State: `propertiesPanelOpen: boolean` in the circuit store, with
`openPropertiesPanel`, `closePropertiesPanel`, `togglePropertiesPanel`
actions exposed on `circuitActions`.

## Recommended future change: move into RightActionBar as a 4th tab

The cleaner architectural fit is to make Properties a **tab inside the
existing RightActionBar drawer** alongside Info / Layers / History. This
matches the "drawer-as-inspector" pattern already established and
eliminates the floating panel entirely.

### Design sketch

| Current | Proposed |
|---|---|
| Floating PropertiesPanel anchored bottom-center, controlled by `propertiesPanelOpen` | RightActionBar drawer gains a 4th tab "Properties" between History and the separator |
| `Info` button in CompactToolbar opens the floating panel | Drop the toolbar Info button (moves into RightActionBar icon rail) |
| `I` key toggles the floating panel | `I` key opens/focuses the Properties tab in the drawer |
| Close button (X) closes the floating panel | Close button (X) collapses the drawer (existing behavior) |

The Properties tab content is identical to the current floating panel
(per-selection rendering: gate, wire, input, output). When no element is
selected, the tab content is an empty state ("Nothing selected") rather
than hiding entirely \u2014 the tab is always reachable.

### Why this is better long-term

1. **Architectural consistency**: Info / Layers / History / Properties
   are all "look at things about the circuit" surfaces. They belong in
   the same drawer pattern.
2. **Canvas always unobstructed**: The drawer is on the right edge; it
   never overlaps the gate-placement workspace the way the floating
   PropertiesPanel does at bottom-center.
3. **Persistent affordance**: The Properties icon is always visible in
   the right rail. Users learn "click the right rail icons to inspect
   things about the circuit" \u2014 one mental model.
4. **Free real estate in CompactToolbar**: Removing the toolbar Info
   button reclaims space and focus for primary-action tools.
5. **Pixel-perfect deviation is minimal**: The design-system mockup
   shows a floating PropertiesPanel, but adding a 4th tab to
   RightActionBar is a natural extension of the existing 3-tab pattern
   that the design system already uses.

### Why we didn't do this in PR #88

- The current PR is already large (15 commits, 100+ files); adding a UI
  restructure would inflate scope and risk
- The immediate user complaint ("auto-open is annoying") is fully
  resolved by the simpler explicit-toggle approach
- Properties-as-drawer-tab is a UX pattern shift worth its own brainstorm
  (e.g. should the Properties tab be reachable when no selection exists?
  should it auto-focus when selection happens? should the icon show a
  badge when selection exists?). These deserve a dedicated discussion
  rather than being decided mid-migration.

## Implementation outline (when ready)

1. **Add 4th tab to RightActionBar** \u2014 update `RightActionBar.tsx`'s
   `ActivePanel` type to include `'properties'`, add icon rail trigger,
   add panel content that wraps the existing PropertiesPanel render
   logic.

2. **Move PropertiesPanelInner content into a panel component** \u2014
   `RightActionBar/PropertiesTabPanel.tsx` (or similar). The
   `useSelectedElement` adapter is unchanged.

3. **Empty state** \u2014 when no selection, show a centered placeholder
   ("Nothing selected \u2014 click an element on the canvas to inspect").

4. **Drop the floating PropertiesPanel** \u2014 delete
   `src/components/ui/PropertiesPanel/index.tsx` and
   `src/App.tsx`'s mount of `<PropertiesPanel />`. Keep
   `useSelectedElement` (now consumed by the drawer tab).

5. **Remove the CompactToolbar Properties button** \u2014 affords go via the
   right rail icon. Keep the `I` keyboard shortcut, but rebind to
   "open Properties tab in RightActionBar drawer."

6. **Migrate `propertiesPanelOpen` state** \u2014 either keep it in the
   store (now meaning "Properties tab is the active drawer panel") or
   remove it in favor of RightActionBar's existing `activePanel` state.
   Recommend the latter for consistency.

7. **Update tests** \u2014 unit tests for the new `PropertiesTabPanel`,
   E2E specs in `e2e/specs/ui-shell/properties-panel.ui.spec.ts` updated
   to drive via the drawer trigger.

8. **Update `tasks/lessons.md`** with any UX learnings from the move.

Estimated scope: ~5\u201310 commits, ~500 LOC diff. Single PR feasible.

## Out of scope for this future change

- Per-tab badge indicators (e.g. dot on Properties icon when something
  is selected). Possible polish item but not required.
- Drawer auto-open on selection. Explicit user click should remain the
  trigger \u2014 the whole point of the migration is to keep selection silent.
- Renaming the Info tab (which currently shows circuit-wide stats). The
  two are complementary: Info = circuit-wide, Properties = per-selection.

## References

- Original spec: `docs/specs/2026-04-17-design-system-migration-design.md`
- PR #88 commit that introduced the explicit-toggle pattern: TBD on merge
- design-system reference: `design-system/components/circuit-designer/properties-panel.tsx`
