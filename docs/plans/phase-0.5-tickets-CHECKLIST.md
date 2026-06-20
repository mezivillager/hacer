# Phase 0.5 — Ticket checklist (Project 1)

**Purpose:** Single place to check off tickets as they land.  
**Specs:** Each row links to `docs/plans/phase-0.5-tickets/P05-NN.md`.  
**Master plan & dependency map:** [`2026-03-22-phase-0.5-tickets.md`](./2026-03-22-phase-0.5-tickets.md)

**When to mark done:** Change `[ ]` → `[x]` when the ticket is merged (or intentionally complete on your integration branch) **and** HACER definition of done passes:  
`pnpm run lint` · `pnpm run test:run` · `pnpm run test:e2e:store` · `pnpm run build`

**Last reviewed:** 2026-05-23 — checkboxes below match `main` (or current branch) + expected code paths.

**Verified this pass:** P05-01 `src/core/chips/`; P05-02 `Pin.value` / nodes `number` in `src/store/types.ts`; P05-03 `src/simulation/topologicalEval.ts`; P05-04 `src/core/hdl/`; P05-05 `src/core/testing/tstParser.ts`; P05-06 `src/core/testing/cmpParser.ts`; P05-08 rename actions, PropertiesPanel, and node rename E2E; P05-09 status actions, StatusBar, and store E2E; P05-10 `src/components/ui/PinoutPanel.tsx`, `src/components/ui/RightActionBar.tsx`, `src/components/ui/PinoutPanel.test.tsx`, and `e2e/specs/ui-shell/pinout-panel.store.spec.ts`; P05-11 `src/simulation/busOps.ts`, `src/simulation/busOps.test.ts`, `src/simulation/topologicalEval.ts`, `src/simulation/topologicalEval.test.ts`, `src/store/types.ts`, `src/store/actions/wireActions/wireActions.ts`, `src/store/actions/wireActions/wireActions.test.ts`, `src/store/actions/wiringActions/wiringActions.ts`, and `src/store/actions/wiringActions/wiringActions.test.ts`; P05-14 `src/core/serialization/*`, `src/store/actions/persistenceActions/*`, `src/components/ui/CircuitLibrary.{tsx,test.tsx}`, `src/components/ui/RightActionBar.tsx`, and `e2e/specs/persistence/circuit-persistence.store.spec.ts`.

---

## Layer 0 — No cross-ticket dependencies

- [x] **P05-01** — ChipRegistry + Nand builtin — [P05-01.md](./phase-0.5-tickets/P05-01.md)
- [x] **P05-02** — Multi-bit data model (boolean → number) — [P05-02.md](./phase-0.5-tickets/P05-02.md)
- [x] **P05-03** — Topological sort simulation — [P05-03.md](./phase-0.5-tickets/P05-03.md)
- [x] **P05-04** — HDL parser — [P05-04.md](./phase-0.5-tickets/P05-04.md)
- [x] **P05-05** — TST parser — [P05-05.md](./phase-0.5-tickets/P05-05.md)
- [x] **P05-06** — CMP parser — [P05-06.md](./phase-0.5-tickets/P05-06.md)
- [x] **P05-08** — Node rename + name display — [P05-08.md](./phase-0.5-tickets/P05-08.md)
- [x] **P05-09** — StatusBar component — [P05-09.md](./phase-0.5-tickets/P05-09.md)
- [x] **P05-10** — PinoutPanel component — [P05-10.md](./phase-0.5-tickets/P05-10.md)

## Layer 1 — Depends on one Layer 0 item

- [x] **P05-11** — Bus simulation + multi-bit wires — needs P05-02 — [P05-11.md](./phase-0.5-tickets/P05-11.md)
- [ ] **P05-12** — Bus 3D components — needs P05-02 — [P05-12.md](./phase-0.5-tickets/P05-12.md)
- [x] **P05-13** — Multi-bit I/O UI — needs P05-02 — [P05-13.md](./phase-0.5-tickets/P05-13.md)
- [x] **P05-14** — Circuit persistence — needs P05-03 — [P05-14.md](./phase-0.5-tickets/P05-14.md)
- [x] **P05-15** — Builtin chip implementations (16 chips) — needs P05-01 — **completed via** [2026-05-24-builtin-chip-placement-standardization.md](../2026-05-24-builtin-chip-placement-standardization.md)
- [x] **P05-16** — HDL compiler — needs P05-04, P05-01 — [P05-16.md](./phase-0.5-tickets/P05-16.md)

## Layer 2 — Multiple dependencies

- [x] **P05-17** — Test execution engine — needs P05-05, P05-06, P05-03 — [P05-17.md](./phase-0.5-tickets/P05-17.md)
- [ ] **P05-18** — Chip hierarchy evaluation — needs P05-01, P05-16 — [P05-18.md](./phase-0.5-tickets/P05-18.md) — **re-scoped per ADR-0004**: the evaluateChip dispatch seam and engine routing landed in P05-16; P05-18 now focuses on user-chip authoring lifecycle and deeper composites
- [ ] **P05-19** — Chip workflow browser UI — needs P05-01 — [P05-19.md](./phase-0.5-tickets/P05-19.md)
- [ ] **P05-20** — ChipDefinitionPanel + auto-IO — needs P05-01, P05-08 — [P05-20.md](./phase-0.5-tickets/P05-20.md)

## Layer 3 — Full feature UI

- [ ] **P05-21** — HDL editor UI — needs P05-16 — [P05-21.md](./phase-0.5-tickets/P05-21.md)
- [x] **P05-22** — Test results panel — needs P05-17 — [P05-22.md](./phase-0.5-tickets/P05-22.md)
- [ ] **P05-24** — Composite chip 3D rendering — needs P05-01 — [P05-24.md](./phase-0.5-tickets/P05-24.md)

## Layer 4 — Integration

- [ ] **P05-26** — 3D/HDL interoperability — needs P05-16, P05-14 — [P05-26.md](./phase-0.5-tickets/P05-26.md)
- [ ] **P05-27** — End-to-end integration testing — needs prior layers — [P05-27.md](./phase-0.5-tickets/P05-27.md)
- [ ] **P05-28** — Documentation — needs P05-27 — [P05-28.md](./phase-0.5-tickets/P05-28.md)

## Follow-ups (UX / labeling — optional ordering)

- [ ] **P05-29** — Scene naming not effectively visible — fix in-view labels, previews, and signal surfacing — [P05-29.md](./phase-0.5-tickets/P05-29.md)
- [ ] **P05-30** — P05-15 follow-up: splitter / joiner for bit-level access on placed chips — [P05-30.md](./phase-0.5-tickets/P05-30.md)
  - **Status (2026-05-26):** Queued behind P05-15. Promotes [P05-12](./phase-0.5-tickets/P05-12.md) to "next up." Cross-links observed bugs [B-003](../development/observed-bugs.md#b-003--wiring-not-preserved-when-dragging-an-input-node-wired-to-a-multi-input-chip) and [B-004](../development/observed-bugs.md#b-004--multi-input-chips-n--2-have-insufficient-pin-spacing-for-the-current-wiring-rule), which are likely de-risked once splitter/joiner lands.
- [ ] **P05-31** — Truth-table generator for the current canvas circuit — [P05-31.md](./phase-0.5-tickets/P05-31.md)
  - **Status (2026-05-26):** Closes GAP-UI-3 item 4 (the last open item under "No Pinout / Truth Table Display"). Replaces the stub `Generate Truth Table` Quick Action in `RightActionBar` with a live engine + drawer table; coordinate UI primitive sharing with [P05-22](./phase-0.5-tickets/P05-22.md) if it lands first.
- [ ] **P05-32** — Replace skipped flaky `@ui` Playwright suites with RTL integration tests — [P05-32.md](./phase-0.5-tickets/P05-32.md)
  - **Status (2026-06-20):** Filed by the non-3D UX test foundation (`<Shell>` boundary + `renderShell()` harness + AGENTS.md §3 Step 4.1 rigor). Migrates the 4 `.skip`-ped `@ui` suites (render-sanity, signal-propagation, simulation-control, wire-persistence) to RTL integration / `@store` coverage; keeps only genuinely 3D-dependent smokes in `@ui`.

## Deferred — requires composite/user chips first

- [ ] **P05-23** — Builtin toggle UI — needs P05-15 — [P05-23.md](./phase-0.5-tickets/P05-23.md)
  - **Why deferred (2026-05-24):** User-defined chips do not exist yet; the builtin/user toggle is meaningless until at least one user chip-source ships. Revisit once P05-16/P05-18/P05-24 composite-chip work begins.

---

_Note: There is no **P05-25** in the phase plan; numbering skips to P05-26._
