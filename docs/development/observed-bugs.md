# Observed bugs (informal log)

Human- and agent-observed issues that are **not yet** guaranteed to have a GitHub issue or a failing automated test. Use this log to **capture repro** quickly; promote entries to dedicated tickets or delete when fixed.

## Conventions

| Column | Meaning |
|--------|---------|
| **ID** | `B-NNN` monotonic in this file |
| **Status** | Open / Investigating / Fixed / **Closed — machinery removed** |
| **Fixed in** | PR URL or commit when closed; for a *machinery removed* entry, the issue that closed it and what replaces the capability |

When an item is **Fixed**, add the **Fixed in** link and move the detailed row to **Resolved** below, or keep a one-line pointer in `tasks/lessons.md` — stay consistent per PR.

## Closing a bug in machinery that is being removed (ADR-0020)

Since [ADR-0020](../decisions/0020-spec-only-writes-read-only-projections.md) (Accepted 2026-09-23) the rendered
surfaces are read-only and the hand-editing machinery is **removed, not frozen**. An entry in this log whose only
beneficiary is that machinery — wire drawing, junction placement, dragging, placement previews, or their polish — is
**closed rather than fixed**, and closing it is never silent:

- its GitHub issue is closed with a comment that **quotes the owner's direction** and **names what replaces the
  capability**;
- its row moves to **Closed with the machinery** below, with `Status: Closed — machinery removed`;
- **a bug that corrupts evaluation is never closed this way.** It is fixed in the evaluation layer, as B-008 (#222 /
  PR #312) and #355, #356, #363 and #367 were. The test is whether the defect produces a *wrong value*, not whether it
  lives in legacy code.

The sweep that applied this rule to every open issue is [#340](https://github.com/mezivillager/hacer/issues/340);
its per-issue verdicts are in `docs/research/2026-09-21-foundation-audit/BACKLOG-SWEEP.md`.

---

## Open

### B-009 — `removeJunction` deletes wires by position, not by structure

| Field | Detail |
|-------|--------|
| **Status** | **Partly fixed** — corrected 2026-09-23 after [#396](https://github.com/mezivillager/hacer/pull/396)'s verifier measured the claim. An earlier revision of this entry read *Fixed / measured end to end through the real actions*; that was wrong for the documents the app writes, and is restated honestly below. |
| **Area** | `src/store/actions/signalActions/signalActions.ts` (`removeJunction`), `src/simulation/topologicalEval.ts:43-53` (`findJunctionFeedWire`) |
| **Symptom** | `removeJunction` kept one of a junction's wires and deleted the rest, choosing by position: `wireIds.slice(1)`. `removeWire` splices the trunk out of `wireIds` and re-attaching a redrawn wire appends it **last**, so a branch can sit at `wireIds[0]`; the deletion then removed **the trunk and kept a branch** — data loss in a saved document, not a cosmetic defect. |
| **Expected** | Removing a junction never deletes a wire that has two real endpoints, and never decides anything from array order. |
| **Fixed for** | Documents that carry **junction-endpoint wires** — a branch whose `from`, or a feed wire whose `to`, *is* the junction. `findJunctionFeedWire` reads the structure outright there. Serialization permits that shape, `deserialize.ts` preserves it, and the legacy importer ([#377](https://github.com/mezivillager/hacer/issues/377)) will read documents of it. Tests: `signalActions.test.ts`, `describe('removeJunction — the feed wire survives, not wireIds[0] (#364)')`. |
| **NOT fixed for** | **Documents the app writes today.** `completeJunctionWiring` copies the trunk's source into every branch it creates (`wiringActions.ts:859`) and is the only appender to `wireIds` (`:959`), so every listed wire shares one `from` and nothing in the document distinguishes trunk from branch. `topologicalEval.ts:49` is then false and `:50` falls back to the first listed wire in `state.wires` order — which is creation order, the same wire `wireIds[0]` named. Measured at both `2f52456` (merge base) and `e2f6f87` (#396 head): the reproduction with gesture-shaped branches gives survivors `[branch1]` on **both**, losing `trunk'` and `branch2`. Pinned in the repo as `gesture-shaped branches: two user-drawn wires are still lost (known limit, #403)` — run it, don't take this table's word for it. |
| **Reachability** | `removeJunction` has no UI caller. Its in-app path is `junctionUtils.ts:126` `applyJunctionRelocations`, reached from `recalculateWiresForGate` / `recalculateWiresForNode` — i.e. dragging a gate or a node ([#395](https://github.com/mezivillager/hacer/issues/395)). Also the programmatic actions facade (`circuitStore.ts:285`). |
| **Carried by** | [#403](https://github.com/mezivillager/hacer/issues/403) — the remaining, reachable data loss, with the measurement. [#395](https://github.com/mezivillager/hacer/issues/395) inherits the same hole: its suggested fix reuses `findJunctionFeedWire`. The acceptance criterion on [#376](https://github.com/mezivillager/hacer/issues/376) — *capture the corpus before exercising `removeJunction`* — **still stands**, for every document, not just ones saved before the partial fix. |
| **Partly fixed in** | [#364](https://github.com/mezivillager/hacer/issues/364) / [#396](https://github.com/mezivillager/hacer/pull/396). |

### B-008 — Disconnected input pins retain stale values (gates and bus components)

| Field | Detail |
|-------|--------|
| **Status** | Fixed |
| **Area** | `src/simulation/topologicalEval.ts` (`evaluateCircuit`) — where the fix landed; `removeWire` was the other candidate site and was not used |
| **Symptom** | When a wire is removed from a destination input pin (gate or bus component), that pin retains its last driven value. The gate/bus component therefore continues to evaluate using the stale value instead of treating the undriven pin as 0. |
| **Expected** | After a wire is disconnected, the destination input pin's value resets to 0 so the component evaluates correctly with no incoming signal. |
| **Notes** | Pre-existing gate behavior: the simulation loop in `evaluateCircuit` only overwrites input pins that have an incoming wire; undriven pins are left unchanged. Bus components share this behavior after the bus-splitter/joiner feature (P05-12a). Fixing bus-only would create an inconsistency with gates. The proper cross-cutting fix is either: (a) reset undriven input pins to 0 before applying incoming wires in `evaluateCircuit`, or (b) reset the destination pin value in `removeWire` when the last wire to that pin is removed. Either approach changes existing gate simulation behavior and requires full-suite validation. |
| **Fixed in** | Issue #222 / PR #312 — option (a): `evaluateCircuit` clears every input pin no wire drives, so the rule holds for the live tick, the truth table and a deserialised document alike. The clear is **lazy**: the pin still reads the old value between `removeWire` and the next tick, which matters only to a reader of the store in that window. Gate pins driven by hand via `setInputValue` (shift+click on an unconnected pin) no longer survive a tick — follow-up [#309](https://github.com/mezivillager/hacer/issues/309). |

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

---

## Closed with the machinery

Rows whose only beneficiary is hand editing, closed under the rule above. Kept here rather than deleted, because a
characterization golden (#331) must record what the legacy app did — including its bugs — before it is replaced.

### B-004b (CASE2) — Same-column confluences are not distinguished, so unrelated chip fan-ins can merge

| Field | Detail |
|-------|--------|
| **Status** | Closed — machinery removed |
| **Area** | `src/utils/wiringScheme/approach.ts` (`markConfluenceApproach`), `src/utils/wiringScheme/overlap.ts` (`isShareableConfluence`); also the scene-graph oracle `src/test/r3f/wireGeometry.ts` (`isLegitimateApproachOverlap`) shares the limitation |
| **Symptom** | A confluence backbone is identified only by its `confluenceCoord` (a single coordinate). When two **separate** chips are placed so their input sides snap to the **same** section column/row (e.g. both backbones at `x = -4`), both fan-ins get the same `confluenceCoord`, so `isShareableConfluence` treats their unrelated approach backbones as one shareable bus — unrelated chip fan-ins can silently merge on one physical track. |
| **Expected** | Two distinct chips that happen to share a section column must keep distinct confluence identities and must NOT share an approach backbone. |
| **Repro** | Place two multi-input chips so their input sides align on the same world X (same section column); wire each chip's inputs; observe the two fan-in backbones share a track. The existing CASE2 unit test uses *different* coordinates (−4 vs −8), so it does not cover the same-column case. |
| **Notes** | Found by the automated reviewer on PR #128 (P1). Root cause: confluence identity is a coordinate, not an owner. Proper fix needs a confluence **owner identity** (e.g. the chip/gate id or a unique confluence id) carried on approach segments, threaded through `markConfluenceApproach` → `WireSegment` metadata → `isShareableConfluence`, **and** the scene-graph oracle's `isLegitimateApproachOverlap` (which keys on `confluenceCoord` too). Add a same-column CASE2 test at both the router and render levels. Sibling of [B-004a (CASE1)](#b-004a-case1--unrelated-trunk-merged-visually-onto-a-chips-approach-backbone-lane-level-exclusivity). Latent — requires specific same-column placement to trigger. |
| **Closed in** | [#223](https://github.com/mezivillager/hacer/issues/223), by the backlog sweep [#340](https://github.com/mezivillager/hacer/issues/340), 2026-09-23. `src/utils/wiringScheme` and `wireSharing.ts` (3,640 lines) are deleted at ADR-0020 §7.5c. **Replaced by** `route` — channel routing (N.5, [#380](https://github.com/mezivillager/hacer/issues/380)), under which ADR-0008's assertions 3, 4, 5 and 7 collapse into one invariant — *no two nets with different sources share a collinear track* — satisfied **by construction**, because a lane is a net's position in the canonical order restricted to one channel. The bug class cannot recur. **#331 still records this entry beside the characterization golden**, so the golden does not enshrine the bug. |

### B-001 — Gate placement preview lacks contrast in light mode

| Field | Detail |
|-------|--------|
| **Status** | Closed — machinery removed |
| **Area** | `src/components/canvas/Scene/PlacementPreview.tsx`, theme (`semanticColors.success`), light-mode grid/background |
| **Symptom** | When placing or dragging a **gate**, the preview mesh is hard to see in **light** theme — not bold enough against the canvas. |
| **Expected** | Preview uses **high-contrast**, unambiguous colors in light (and remains acceptable in dark). |
| **Repro** | Set theme to light → choose a gate from toolbar → move cursor over grid to show placement preview. |
| **Notes** | Resolution tracked under **P05-29**; tune materials/colors and add regression-friendly tests where practical. |
| **Closed in** | [#224](https://github.com/mezivillager/hacer/issues/224), by the backlog sweep [#340](https://github.com/mezivillager/hacer/issues/340), 2026-09-23. ADR-0020 §6 names **placement previews** in the non-goals, so there is no preview to give contrast to. **Replaced by** `setHint` (capability row 19) — a declared position on a fixed lattice in the sidecar, reached from the shell, the CLI, MCP or a prompt — drawn read-only by N.8 ([#383](https://github.com/mezivillager/hacer/issues/383)) and N.9 ([#384](https://github.com/mezivillager/hacer/issues/384)). |

### B-010 — Shift+click drive of a floating gate input pin does not survive a tick

| Field | Detail |
|-------|--------|
| **Status** | Closed — machinery removed |
| **Area** | `src/components/canvas/handlers/canvasHandlers.ts`, `src/gates/handlers/gateHandlers.ts` |
| **Symptom** | The follow-up named in B-008's *Fixed in* row: after #222 / PR #312, `evaluateCircuit` clears every input pin no wire drives, which is the correct invariant, so a value written by shift+clicking an **unconnected** gate input pin is erased by the next tick. |
| **Expected** | Either the affordance is removed, or a hand-held pin value is a real driver the evaluation layer respects. |
| **Notes** | **Not the evaluation-corruption class** — #222 made evaluation *correct*; what is left is a missing affordance, not a wrong value. Its option (b) would add a `driven`/`held` field to `CircuitState` for a gesture that is being removed. |
| **Closed in** | [#309](https://github.com/mezivillager/hacer/issues/309), by the backlog sweep [#340](https://github.com/mezivillager/hacer/issues/340), 2026-09-23. ADR-0020 §6: *"Toggling an input by clicking its 3D pin is dropped at the switch and reopenable as a shortcut that emits `setInput`."* **Replaced by** `setInput` (capability row 11) from the shell's pins panel ([#386](https://github.com/mezivillager/hacer/issues/386)), the CLI, MCP or a prompt — *"driving the simulation is not editing the design, but it moves off the drawing"*. |


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

**Root cause**: Sonner default `right: 24px` overlapped the ~44 px icon column; a static 60 px fix cleared the closed bar but not the 280 px open drawer. **Fix**: reactive `rightPanelOpen` store field; `RightActionBar` syncs it via `useEffect`; `App.tsx` selects it and passes `offset={{ right: rightPanelOpen ? '360px' : '60px' }}` (and matching `mobileOffset`) to `<Toaster>`. **Regression tests**: `e2e/specs/ui-shell/toast-no-overlap.ui.spec.ts` — three cases: (a) drawer closed → `toast.right ≤ bar.left`; (b) drawer open → `toast.right ≤ drawer.left`; (c) mobile width (<=600px) → `toast.right ≤ bar.left`.

### B-003 — Wiring not preserved when dragging an input node wired to a multi-input chip

| Field | Detail |
|-------|--------|
| **Status** | Fixed |
| **Area** | `src/store/actions/nodeActions/nodeActions.ts` (`recalculateWiresForNode`), `src/utils/wiringScheme/` |
| **Cause** | Downstream of B-004: dragging a node wired to an inner pin re-routed via `calculateWirePath`, which threw (or emitted an empty path) for inner pins; `recalculateWiresForNode`'s catch-and-ignore then left the wire's segments stale/empty — the connection looked dropped. |
| **Fix** | The router now reaches every inner pin (see B-004), so the re-route succeeds; and `recalculateWiresForNode` no longer overwrites a wire with an empty/invalid path — a failed or empty re-route preserves the wire's existing segments instead of orphaning it. |
| **Fixed in** | Routing-engine Stage 1 (this branch), per [ADR-0007](../decisions/0007-wire-routing-engine-direction.md). |

### B-004 — Multi-input chips (n > 2) could not have all inputs wired (router rejected inner pins)

| Field | Detail |
|-------|--------|
| **Status** | Fixed |
| **Area** | `src/utils/wiringScheme/` (`core.ts`, `approach.ts`, `overlap.ts`, `types.ts`) |
| **Cause** | Architectural, not pin spacing: the router did uniform coarse-grid maze running (`SECTION_SIZE = 4.0`) while pins sit ~0.4u apart. Every pin's approach snapped to the same section line and travelled the shared section column, so inner pins' approach paths collapsed onto one line and the overlap check rejected them ("all routing corners are blocked"). |
| **Fix** | Per-pin **escape-then-connect** approach: the coarse router targets the chip-side section line at the pin's own row (detour-free for single wires); the shared section column is treated as a confluence **bus** (collinear `approach` segments are shareable — research Finding 2); each pin fans off on its own row + lane into the pin so distinct pins resolve to distinct lanes (node-exclusivity preserved — Finding 10). Pin spacing/chip size were **not** changed (the "huge chips" stopgap was rejected). |
| **Fixed in** | Routing-engine Stage 1 (this branch), per [ADR-0007](../decisions/0007-wire-routing-engine-direction.md). |

### B-004a (CASE1) — Unrelated trunk merged visually onto a chip's approach backbone (lane-level exclusivity)

| Field | Detail |
|-------|--------|
| **Status** | Fixed |
| **Area** | `src/utils/wiringScheme/` (`lanes.ts` new, `core.ts`, `types.ts`) |
| **Cause** | The overlap relaxation let an unrelated net's ordinary trunk *transit* a chip's `approach` backbone on the **same physical track** (`if (!potential.approach) return true`). The transit is genuinely required (the coarse grid has no alternative corner — relied on by `gateActions › arc segments lost after moving gate`), but sharing the **exact** track made the two distinct nets visually merge. The strict fix (reject all non-approach overlap on a backbone) is infeasible — it re-breaks that transit test ("all routing corners are blocked"). So the trunk must be **separated, not rejected**. A first nudge keyed purely on a per-net hash then *re-introduced* the same merge class one lane over: two distinct **transit** nets that hash to the same lane index landed on the identical offset coordinate and merged with **each other**, because the nudge only deconflicted against approach backbones, not against other already-placed transit runs. |
| **Fix** | **Lane-level exclusivity / nudging with free-lane probing** (libavoid ordering + nudging, Finding 2): a post-pathfinding pass (`nudgeTransitRun`) detects a routing run that rides a *different* confluence's backbone collinearly and shifts that run onto a tiny parallel lane (`sectionCoord + δ`), stitching the adjoining corners so the path stays orthogonal and still crosses (hops) perpendicular backbones. The lane is chosen by **probing**: a per-net hash (`laneIndexForNet`, FNV-1a + Murmur3 `fmix` avalanche for good spread) gives the *starting* index, then `probeLaneCoord` walks outward to the first lane FREE of every other wire already on that track — both foreign backbones (lane 0) AND already-placed transit runs — so two distinct transit nets never merge. Deterministic for a given circuit state; order-dependent across the initial build order (the accepted ordering+nudging trade-off — separation beats a silent merge). The owner's fan-in bus keeps lane 0 (CASE2 + B-003/B-004 untouched). The nudge is **collinear-only** — a perpendicular crossing is hopped, never nudged. **Residuals:** (a) extreme single-column transit density that exhausts the free lanes within the safe offset cap (`MAX_TRANSIT_LANE_OFFSET`) leaves the last run on its last safe lane — a Stage-3 visibility-graph concern; (b) a transit routed *before* its target chip's backbone exists has no backbone to avoid yet and falls back to the pre-existing greedy reject-and-reroute. |
| **Fixed in** | Routing-engine Stage 1 lane-exclusivity (this branch), per [ADR-0007](../decisions/0007-wire-routing-engine-direction.md). See `docs/superpowers/specs/2026-06-21-wire-routing-lane-exclusivity-design.md`. |
