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
