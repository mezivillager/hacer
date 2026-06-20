# Non-3D UX Test Foundation — `<Shell>` boundary + RTL integration harness — Design

- **Date:** 2026-06-20
- **Status:** Approved (brainstorming) — pending spec review
- **Phase:** 0.5 (cross-cutting test infrastructure)
- **Guiding principle:** [`docs/decisions/0003`](../decisions/0003-design-for-longevity.md) — long-term arc over ease (AGENTS.md §2)

## Problem (evidence-based)

An audit of the 3D-scene vs DOM-shell boundary found:
- **The store is already the clean contract** — zero `@react-three/*` / `three` imports in `src/components/ui/` or `ui-kit/`; shell components communicate only via `useCircuitStore` selectors + `circuitActions`.
- **Component-level RTL is strong** — 10/11 shell components have isolated colocated tests.
- **Gap 1 — no RTL *integration* layer:** `App.tsx` is never rendered in any vitest test; nothing mounts multiple shell panels together to exercise a cross-component *user scenario*. That middle ground (between one isolated component and full Playwright) does not exist.
- **Gap 2 — the 3D scene poisons full-app E2E:** 4 of 15 Playwright `@ui` suites are `.skip`-ped citing flakiness/slowdowns rooted in scene-readiness/WebGL. Cross-component scenarios that belong there go untested.

This is **not** a coupling problem (no re-architecture needed) but a **missing mid-level test fixture** + missing enforced rigor.

## Goals (this ticket — small + focused)

1. Make the boundary a **first-class, named contract**: extract `<Shell>` (the DOM shell) that takes the 3D scene as an **injected prop**, so `App = providers → <Shell scene={<CanvasArea/>} />`.
2. Add an **RTL integration harness** `renderShell()` that mounts the shell (scene omitted) with the app's providers, against the real store — enabling cross-panel scenario tests in jsdom with no WebGL.
3. Ship **one proof integration test** exercising multiple panels in one tree.
4. **Enforce the rigor** as a standing rule in AGENTS.md.
5. File a **follow-up ticket (P05-32)** to replace the 4 skipped `@ui` suites with equivalent RTL integration tests under the rigor.

## Non-goals

- Re-architecting the 3D/non-3D split (the store contract already provides it).
- Fixing/de-flaking the skipped `@ui` suites now → **P05-32** (this ticket only files it).
- Changing any shell component's behavior — `<Shell>` is a pure structural extraction.

## Design

### `src/components/Shell.tsx` — the DOM-shell boundary
```tsx
interface ShellProps {
  /** The 3D scene area, injected by the app. Tests omit it (or pass a stub). */
  scene?: ReactNode
}
export function Shell({ scene = null }: ShellProps) {
  useKeyboardShortcuts()
  return (
    <div className="flex h-screen w-screen overflow-hidden bg-background text-foreground">
      <CompactToolbar />
      <div className="flex-1 relative">
        {scene}
        <RightActionBar /><PropertiesPanel /><StatusBar /><HelpBar /><DemoOverlay />
      </div>
    </div>
  )
}
```
The markup is moved **verbatim** from `AppContent` (same classes/order) so layout is byte-identical; the only change is `{scene}` replacing the literal `<CanvasArea/>` and `useKeyboardShortcuts()` moving into `Shell`.

### `src/App.tsx` — composes scene + shell
```tsx
function App() {
  return (
    <ThemeProvider><TooltipProvider>
      <Shell scene={<CanvasArea />} />
      <Toaster position="top-right" richColors closeButton />
    </TooltipProvider></ThemeProvider>
  )
}
```
`AppContent` is removed (its body is now `Shell`).

### `src/test/renderShell.tsx` — RTL integration harness
```tsx
export function renderShell(options?: { scene?: ReactNode }) {
  return render(
    <ThemeProvider><TooltipProvider>
      <Shell scene={options?.scene ?? null} />
    </TooltipProvider></ThemeProvider>,
  )
}
```
Mirrors the app's provider stack (minus `Toaster`) so integration tests are realistic. No Canvas → no WebGL. (If `ThemeProvider`/next-themes needs `matchMedia` in jsdom, ensure `src/test/setup.ts` mocks it.)

### Rigor rule (AGENTS.md)
Add a standing rule: **every non-3D UX feature ships RTL integration tests** (via `renderShell()`) covering its user scenarios; `@store` Playwright for store contracts; reserve full-Canvas `@ui` specs for genuinely 3D-dependent flows. Same enforcement style as the Ticket Freshness Protocol.

## Testing (TDD)
- `src/components/Shell.test.tsx` — `<Shell/>` (no scene) renders `compact-toolbar` + `right-action-bar` + status bar together; passing a `scene` stub renders it.
- `src/test/renderShell.test.tsx` (proof integration) — `renderShell()` mounts the shell without a Canvas; opening the RightActionBar info panel works across the tree (cross-panel interaction).
- Regression: existing shell component tests unchanged; full DoD (`lint` · `test:run` · `test:e2e:store` · `build`).

## Files
- **Create:** `src/components/Shell.tsx` (+`Shell.test.tsx`), `src/test/renderShell.tsx` (+`renderShell.test.tsx`), `docs/plans/phase-0.5-tickets/P05-32.md`.
- **Edit:** `src/App.tsx` (use `<Shell>`), `AGENTS.md` (rigor rule), `REPO_MAP.md` (Shell + harness), `docs/plans/phase-0.5-tickets-CHECKLIST.md` (add P05-32 row), `src/test/setup.ts` (matchMedia mock only if needed).

## Risks
- **Layout regression:** mitigated by moving the markup verbatim and keeping `App`'s provider stack; `build` + a visual check guard it.
- **Provider quirks in jsdom:** `ThemeProvider` may need `matchMedia`; add the mock to `setup.ts` if a test surfaces it.
- **Scope creep:** de-flaking `@ui` is explicitly deferred to P05-32.
