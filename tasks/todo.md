# Current Focus

## Documentation Refresh (2026-05-12)

Bring living docs into alignment with the current codebase (no automated doc grep guard — removed as unnecessary overhead).

- [x] Create isolated worktree and branch: `docs/documentation-refresh-2026-05-12`
- [x] Align local/runtime docs and workflows on Node 22
- [x] Refresh README, `HACER_LLM_GUIDE.md`, `REPO_MAP.md`, `.cursorrules`, and Copilot instructions
- [x] Refresh roadmap index, implementation guide, and stale phase pages
- [x] Remove active roadmap/ticket references to removed UI tooling and old stack majors
- [x] Update Phase 0.5 checklist status for P05-01 through P05-06, P05-08, and P05-09
- [x] Refresh release and testing docs against current workflow/package state
- [x] Run final verification gates (`lint`, `test:run`, `test:e2e:store`, `build`)

## Phase 0.5 Product Work

After this docs branch, resume Phase 0.5 from `docs/plans/phase-0.5-tickets-CHECKLIST.md`.

Next unchecked Layer 1 ticket:

- [ ] P05-12 - Bus 3D components

## P05-11 — Bus Simulation + Multi-bit Wire Propagation (2026-05-18)

- `src/simulation/busOps.ts` + tests landed; `clampToWidth` is the canonical clamp helper.
- `Pin` and `Wire` carry optional `width` (default 1 for legacy data); primitive gate pins explicitly set `width: 1`.
- `addWire` infers `wire.width = min(sourceWidth, destWidth)` and allows direct input→output pass-through when widths match; throws on mismatch.
- `completeWiringToNode` no longer rejects input-source → output-destination wires; it constructs the input endpoint and delegates to `addWire`.
- `topologicalEval` clamps every value written to a gate input pin and every value written to an output node using `min(wire.width ?? 1, destination.width ?? 1)`.
- Legacy wires with missing `width` continue to behave as width 1 (covered by test).
- Verification: lint, 1194 unit tests, 89 store E2E specs, and production build all green.

## P05-13 — Multi-bit I/O UI (2026-05-19)

- Pure helpers in `src/components/ui/multiBitFormat.ts`: `formatValue(value, width, 'B'|'D'|'X')` masks to width via `widthMask` (`0xFFFFFFFF` at width ≥ 32 to dodge `1 << 32` UB); `parseValue` accepts `0x`/`0X`/`0b`/`0B` and decimal, returns `null` on empty/whitespace/negative/non-numeric.
- `MultiBitInput.tsx` renders width-many bit toggles (MSB on left) for `width ≤ 8` and a click-to-edit numeric input for wider buses; embedded `FormatSelector` (B/D/X) keeps format state local via `useState` per node — not in Zustand.
- `PinoutPanel` branches on `node.width`: width=1 keeps the legacy single-bit toggle; width>1 renders `MultiBitInput`, with outputs passing `readOnly` (no-op `onValueChange`).
- `formatSignalLabel(value, width = 1)` now delegates to `formatValue(value, width, 'X')` for `width > 1`; `width` default keeps every legacy call site working. `InputNode3D`/`OutputNode3D` receive `width` via `NodeRenderer` prop drilling so 3D labels read `0x..` for buses.
- Pre-commit lint-staged runs `eslint --fix`, which strips `as HTMLInputElement` casts via `@typescript-eslint/no-unnecessary-type-assertion` — use `@testing-library/jest-dom` matchers (`toHaveValue`, `toBeDisabled`) instead of casts in DOM tests.
- Verification: lint, 1231 unit tests, 89 store E2E specs (one wiring-junction flake passed on re-run; unrelated to this UI ticket), production build all green.

## P05-13 follow-up — Floating label polish (2026-05-22)

- Centralised label sizing in `src/components/canvas/labelGeometry.ts` as `LABEL_GEOMETRY`: NODE `0.18`, GATE `0.22`, JUNCTION `0.14`, WIRE `0.16`. Roughly half the previous defaults (`0.35`/`0.25`), matching the KiCad/Altium ~30–40% body-height convention for reference designators. Constants split into a sibling module so `FloatingLabel.tsx` stays HMR-clean (`react-refresh/only-export-components`).
- `offsetY` shrunk to `bodyHalfHeight + 0.20` gap (NODE `0.45`, GATE `0.6`, JUNCTION `0.32`, WIRE `0.2`) so labels sit just above the bounding box instead of floating 1.2–1.4 units above it.
- `FloatingLabel` gained a `lowPowerVariant: 'hide' | 'html'` prop. Node, gate, junction, and wire call sites opt into `'html'`, rendering a Drei `<Html>` overlay (monospace, 11 px, dark translucent bg, `pointerEvents: none`) when `performanceMode === 'low-power'`. Cheaper than SDF `<Text>` + Billboard rotation per frame, but keeps labels legible.
- Gate label no longer guards on `performanceMode` locally — `FloatingLabel` owns the low-power branch end-to-end. The dead `useCircuitStore(s => s.performanceMode)` subscription in `BaseGate.tsx` was dropped.
- Wire labels decoupled from `simulationRunning`: `CanvasArea` prefers `wire.signalId` (so HDL-named wires stay identifiable on a paused canvas) and falls back to the live formatted value only when the sim runs. Emits `undefined` when neither is available (no "0" noise on an unwired canvas).
- BaseGate test mock extended with `Html` alongside `Text`/`Billboard`; the "hides text in low-power" case became "shows crude DOM label in low-power" — asserts `gate-html` present and `gate-text` absent.
- Verification: lint, 1268 unit tests, store E2E (3 specs flaked in the long 17.9-min sequential run but all 19 passed on targeted re-run — same wiring-junction-style timing flake noted earlier in this todo), production build all green.
- Known limitation: junction labels at `offsetY=0.32` may visually clip very short wires; ship-as-is and revisit if smoke surfaces a real problem.

## P05-13 follow-up — Label uniform DOM style (2026-05-22)

- `FloatingLabel` now renders a Drei `<Html>` DOM overlay in **both** performance modes. The SDF `<Text>` + `<Billboard>` branch is gone. Style is monospace 11 px on a dark translucent background, mirroring the KiCad/Altium reference-designator look the user preferred.
- Removed the `lowPowerVariant` prop (always-HTML now); every call site drops it.
- Gate label orientation fix: `BaseGate.tsx`, `InputNode3D.tsx`, `OutputNode3D.tsx`, and `JunctionNode3D.tsx` now render their `<FloatingLabel>` as a **sibling** of the rotated `<group>` (using world-space `position`), so `offsetY` is always world-space up — independent of the entity's `rotation`. Previously, rotated gates pushed the label off to the side.
- Wire labels removed entirely. `CanvasArea` no longer computes a `signalLabel`; `Wire3D` no longer accepts the prop. Wire color (active vs idle) still indicates state, and the connected output node label shows the value.
- `LABEL_GEOMETRY.WIRE` preset dropped from `labelGeometry.ts`.
- Test mocks updated: `BaseGate.test.tsx`, `InputNode3D.test.tsx`, `OutputNode3D.test.tsx`, and `FloatingLabel.test.tsx` mock only `Html` now (drop `Text`/`Billboard`); assertions look up the rendered label DOM via `data-testid`.
- Verification: lint, 1263 unit tests, production build all green.

## PropertiesPanel width editor (2026-05-21)

- Added `updateInputNodeWidth(id, width)` and `updateOutputNodeWidth(id, width)` actions in `src/store/actions/nodeActions/nodeActions.ts`, following the simpler `updateInputNodeValue` Immer-mutation pattern (no validation analog to `validateNodeName`). Wired into the `circuitActions` facade (`src/store/circuitStore.ts`) and the `NodeActions` interface (`src/store/types.ts`).
- `PropertiesPanel` now renders a `<select>` of standard widths (1, 2, 4, 8, 16, 32) for selected input/output nodes; dispatches the matching update action on change. `useSelectedElement` discriminated union extended to expose `width` on `input`/`output` variants.
- Test mock store in `src/test/testUtils.ts` stubs the two new actions so production `build` (TS strict) stays green.
- Unblocks manual smoke testing of P05-13 (multi-bit I/O UI) without needing a placement-time width dialog.
- ~~Known limitation: changing a node's width does NOT re-infer the width of wires already connected to it.~~ **Resolved 2026-05-22 — see "Width cascade + NOT label gap" below.**
- Verification: lint, 1241 unit tests, 89 store E2E specs, production build all green.

## P05-13 follow-up — Width cascade + NOT label gap (2026-05-22)

User-reported issues against the merged P05-13 changes:

1. **NOT gate label sat too high.** The triangle's visible top edge at the label's X-coordinate (centre) is `y ≈ 0.2`, not the theoretical max-Y of `0.4` — the top edge interpolates between vertices `(-0.4, 0.4)` and `(0.4, 0)`. So the default `LABEL_GEOMETRY.GATE.offsetY=0.6` produced a `0.4`-unit gap, double the `0.2` gap I/O node labels have above their cube bodies.
2. **NOT eval did not flip bits.** With `in0[4]=0xB`, output was `0x0` instead of the expected `0x4`. Root cause: the user set the input node's width to 4 **after** wiring; the connected wire and the NOT gate stayed at width 1, so `topologicalEval` clamped the incoming `11` down to `1` before `notGate(1, 1)=0`.

Fixes:

- `BaseGate` gained an optional `labelOffsetY?: number` prop (defaults to `LABEL_GEOMETRY.GATE.offsetY`). `NotGate.tsx` passes `labelOffsetY={NOT_TEXT_CONFIG.labelOffsetY}` (= `0.4`). Box-shaped gates keep the `0.6` default since their top edge is flat at `y=0.4`. `NOT_TEXT_CONFIG` gained a `labelOffsetY` field with a comment explaining the triangle-interpolation reasoning.
- `updateInputNodeWidth` and `updateOutputNodeWidth` now BFS across the wire graph (treating gates/junctions/I/O nodes as nodes and wires as undirected edges) and propagate the new width to every wire, every connected gate (plus all its pins), and every connected I/O node in the same component. Junctions don't carry width but signals flow through them. Disconnected circuits are untouched.
- Added `propagateWidthFrom` helper in `src/store/actions/nodeActions/nodeActions.ts`. Mutates the Immer draft directly — Zustand middleware picks it up.
- Tests: four new cascade cases in `nodeActions.test.ts` (direct, full-chain, disconnected-component isolation, output-side cascade) plus an integration case in `topologicalEval.test.ts` exercising the exact user workflow (`NOT 0b1011 → 0b0100` after `updateInputNodeWidth` post-wiring).
- Verification: lint, 1268 unit tests, 89 store E2E specs, production build all green.
