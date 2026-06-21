# Observed bugs (informal log)

Human- and agent-observed issues that are **not yet** guaranteed to have a GitHub issue or a failing automated test. Use this log to **capture repro** quickly; promote entries to dedicated tickets or delete when fixed.

## Conventions

| Column | Meaning |
|--------|---------|
| **ID** | `B-NNN` monotonic in this file |
| **Status** | Open / Investigating / Fixed |
| **Fixed in** | PR URL or commit when closed |

When an item is **Fixed**, add the **Fixed in** link and move the detailed row to **Resolved** below, or keep a one-line pointer in `tasks/lessons.md` — stay consistent per PR.

---

## Open

### B-001 — Gate placement preview lacks contrast in light mode

| Field | Detail |
|-------|--------|
| **Status** | Open |
| **Area** | `src/components/canvas/Scene/PlacementPreview.tsx`, theme (`semanticColors.success`), light-mode grid/background |
| **Symptom** | When placing or dragging a **gate**, the preview mesh is hard to see in **light** theme — not bold enough against the canvas. |
| **Expected** | Preview uses **high-contrast**, unambiguous colors in light (and remains acceptable in dark). |
| **Repro** | Set theme to light → choose a gate from toolbar → move cursor over grid to show placement preview. |
| **Notes** | Resolution tracked under **P05-29**; tune materials/colors and add regression-friendly tests where practical. |
| **Fixed in** | — |

### B-002 — Warning / toast UI overlaps the right action bar

| Field | Detail |
|-------|--------|
| **Status** | Fixed |
| **Area** | `App.tsx` (`Toaster` from Sonner), `RightActionBar`, `store/types.ts`, `store/actions/viewActions/viewActions.ts` |
| **Symptom** | Warning banners (e.g. “Cannot connect same pin types”) render **on top of** the vertical **right action bar** so the toast background and the top icons (e.g. Info) overlap — layout looks broken. Overlap occurred in both the closed (icon-column only) and open (icon column + 280 px drawer) states. |
| **Expected** | Toasts stay **clear of** the action bar in all states: closed → clear the ~44 px icon column; open → clear icon column + 280 px `PANEL_WIDTH` drawer. |
| **Repro** | Trigger a Sonner warning while the right bar is visible (e.g. invalid wiring / same pin types) — observe overlap at top-right. Open a panel drawer and repeat — observe overlap with the drawer. |
| **Root cause** | Sonner `<Toaster position=”top-right”>` uses `right: 24px` (its `VIEWPORT_OFFSET` default). The `RightActionBar` icon column is ~44 px wide (`absolute top-0 right-0`), and the panel drawer adds another 280 px when open (expanding leftward inside the same container). A static 60 px offset cleared the closed bar but still overlapped the open 280 px drawer. |
| **Fix** | **Reactive offset** via a store field (`rightPanelOpen: boolean` in `CircuitState`, set by `RightActionBar` via `circuitActions.setRightPanelOpen` inside a `useEffect` on `activePanel` changes). `App.tsx` reads `rightPanelOpen` with a narrow selector and passes `offset={{ right: rightPanelOpen ? '360px' : '60px' }}` to `<Toaster>` — closed state clears the icon bar, open state clears bar + drawer. No `useMemo`/`useCallback` (React-Compiler-clean). |
| **Fixed in** | `fix/toast-overlaps-action-bar` — see commit SHA in `.superpowers/b002-report.md` |

### B-003 — Wiring not preserved when dragging an input node wired to a multi-input chip

| Field | Detail |
|-------|--------|
| **Status** | Open |
| **Area** | `src/hooks/useNodeDrag.ts`, wiring rebuild path in `src/store/actions/wireActions/wireActions.ts`, `src/utils/wiringScheme/`, multi-input chip pin layouts (`src/components/scene/chipBodyLayout.ts`) |
| **Symptom** | Drag an `InputNode` that is wired into a 4-way Mux (`Mux4Way16`) and the wire disappears or fails to follow the node to its new position — the connection is effectively dropped. Single- and two-input chips don't repro. |
| **Expected** | Wires re-route during/after node drag and the existing source→destination connection is preserved regardless of how many inputs the destination chip has. |
| **Repro** | Place a Mux4Way16 → place an InputNode → wire InputNode to any of the Mux's `a`/`b`/`c`/`d` inputs → drag the InputNode. Observe wire loss. |
| **Notes** | Likely related to **B-004**: with 4+ inputs the per-pin spacing falls below the wire-router's minimum clearance, so the re-route during drag emits an empty/invalid path and the wire is dropped silently. Confirm by capturing the wire's `segments` array around the drag transition. |
| **Fixed in** | — |

### B-004 — Multi-input chips (n > 2) have insufficient pin spacing for the current wiring rule

| Field | Detail |
|-------|--------|
| **Status** | Open |
| **Area** | `src/components/scene/chipBodyLayout.ts` (pin slot spacing & body sizing), `src/utils/wiringScheme/` (segment clearance / orthogonal routing rules) |
| **Symptom** | 4-way and 8-way (any `n > 2`) chips can't actually have all of their inputs wired up: with the chip body sized to match the legacy AND footprint, neighbouring input pins sit too close for the wire router's right-angle/clearance rules to find a valid path to anything past the outer two pins. |
| **Expected** | Wiring should be possible to every input pin of every Project 1 chip, including Mux4Way16 / Mux8Way16. |
| **Repro** | Place a Mux4Way16 → place 4 InputNodes around it → attempt to wire each InputNode into a distinct Mux input. The inner two inputs reject wiring or route to the wrong pin. |
| **Notes** | Likely needs `chipBodyLayout.ts` to scale `sizeY` (pin-column length) with pin count beyond a small floor — current sizing was tuned for the 1- and 2-input legacy footprint. Pair fix with **B-003**: once spacing is fixed, drag-rerouting should also recover. Until splitter/joiner ships (see [P05-30](../plans/phase-0.5-tickets/P05-30.md) → [P05-12](../plans/phase-0.5-tickets/P05-12.md)) this is the only access path for the inner bits. |
| **Fixed in** | — |


---

## Resolved

### B-005 — `circuitStore.autosave.test.ts` bootstrap test times out under parallel full-suite load

| Field | Detail |
|-------|--------|
| **Status** | Fixed |
| **Area** | `src/store/circuitStore.autosave.test.ts` (test design) |
| **Symptom** | `does not subscribe autosave at module load in test mode` timed out at 5000ms under `pnpm run test:run` parallel load; passed alone. |
| **Expected** | Test completes well within the timeout under any parallel load. |
| **Repro** | `pnpm run test:run` (intermittent under CPU load) vs `pnpm exec vitest run src/store/circuitStore.autosave.test.ts` (always passed). |
| **Notes** | Root cause: `vi.resetModules()` + two dynamic `import()` calls caused the full module graph (Zustand + Immer + devtools + all action factories) to be re-evaluated on every run. Test body alone took ~1290ms even in isolation; under parallel CPU contention this exceeded the 5000ms default. Fix: rewrote the test to use static imports + `__resetAutosaveForTests()` (the same pattern as `autosave.test.ts`), eliminating the module-reset overhead. Test body now takes ~10ms. |
| **Fixed in** | `c7c3ae8` — test: replace vi.resetModules()+dynamic import with static imports+__resetAutosaveForTests |
| **Guard test** | PR #125 review finding resolved: `isAutosaveSubscribed()` is now captured at module scope (before any `beforeEach` cleanup) and asserted `false`. Guard removal causes `subscribedAtModuleLoad` to be `true` → test fails. The MODE guard in `circuitStore.ts` is now genuinely tested, not vacuously. |
### B-002 (moved from Open — see entry above for full detail)

**Root cause**: Sonner default `right: 24px` overlapped the ~44 px icon column; a static 60 px fix cleared the closed bar but not the 280 px open drawer. **Fix**: reactive `rightPanelOpen` store field; `RightActionBar` syncs it via `useEffect`; `App.tsx` selects it and passes `offset={{ right: rightPanelOpen ? '360px' : '60px' }}` to `<Toaster>`. **Regression tests**: `e2e/specs/ui-shell/toast-no-overlap.ui.spec.ts` — two cases: (a) drawer closed → `toast.right ≤ bar.left`; (b) drawer open → `toast.right ≤ drawer.left`.
