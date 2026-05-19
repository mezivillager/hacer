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
