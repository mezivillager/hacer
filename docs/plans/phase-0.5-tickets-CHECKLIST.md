# Phase 0.5 — Ticket checklist (Project 1)

**Purpose:** Single place to check off tickets as they land.  
**Specs:** Each row links to `docs/plans/phase-0.5-tickets/P05-NN.md`.  
**Master plan & dependency map:** [`2026-03-22-phase-0.5-tickets.md`](./2026-03-22-phase-0.5-tickets.md)

**When to mark done:** Change `[ ]` → `[x]` when the ticket is merged (or intentionally complete on your integration branch) **and** HACER definition of done passes:  
`pnpm run lint` · `pnpm run test:run` · `pnpm run test:e2e:store` · `pnpm run build`

**Last reviewed:** 2026-03-24 — checkboxes below match `main` (or current branch) + expected code paths.

**Verified this pass:** P05-01 `src/core/chips/` + Nand tests; P05-02 `Pin.value` / nodes `number` in `src/store/types.ts`; P05-03 `src/simulation/topologicalEval.ts`; P05-04 `src/core/hdl/`.

---

## Layer 0 — No cross-ticket dependencies

- [x] **P05-01** — ChipRegistry + Nand builtin — [P05-01.md](./phase-0.5-tickets/P05-01.md)
- [x] **P05-02** — Multi-bit data model (boolean → number) — [P05-02.md](./phase-0.5-tickets/P05-02.md)
- [x] **P05-03** — Topological sort simulation — [P05-03.md](./phase-0.5-tickets/P05-03.md)
- [x] **P05-04** — HDL parser — [P05-04.md](./phase-0.5-tickets/P05-04.md)
- [ ] **P05-05** — TST parser — [P05-05.md](./phase-0.5-tickets/P05-05.md)
- [ ] **P05-06** — CMP parser — [P05-06.md](./phase-0.5-tickets/P05-06.md)
- [ ] **P05-08** — Node rename + name display — [P05-08.md](./phase-0.5-tickets/P05-08.md)
- [ ] **P05-09** — StatusBar component — [P05-09.md](./phase-0.5-tickets/P05-09.md)
- [ ] **P05-10** — PinoutPanel component — [P05-10.md](./phase-0.5-tickets/P05-10.md)

## Layer 1 — Depends on one Layer 0 item

- [ ] **P05-11** — Bus simulation + multi-bit wires — needs P05-02 — [P05-11.md](./phase-0.5-tickets/P05-11.md)
- [ ] **P05-12** — Bus 3D components — needs P05-02 — [P05-12.md](./phase-0.5-tickets/P05-12.md)
- [ ] **P05-13** — Multi-bit I/O UI — needs P05-02 — [P05-13.md](./phase-0.5-tickets/P05-13.md)
- [ ] **P05-14** — Circuit persistence — needs P05-03 — [P05-14.md](./phase-0.5-tickets/P05-14.md)
- [ ] **P05-15** — Builtin chip implementations (16 chips) — needs P05-01 — [P05-15.md](./phase-0.5-tickets/P05-15.md)
- [ ] **P05-16** — HDL compiler — needs P05-04, P05-01 — [P05-16.md](./phase-0.5-tickets/P05-16.md)

## Layer 2 — Multiple dependencies

- [ ] **P05-17** — Test execution engine — needs P05-05, P05-06, P05-03 — [P05-17.md](./phase-0.5-tickets/P05-17.md)
- [ ] **P05-18** — Chip hierarchy evaluation — needs P05-01, P05-16 — [P05-18.md](./phase-0.5-tickets/P05-18.md)
- [ ] **P05-19** — Chip workflow browser UI — needs P05-01 — [P05-19.md](./phase-0.5-tickets/P05-19.md)
- [ ] **P05-20** — ChipDefinitionPanel + auto-IO — needs P05-01, P05-08 — [P05-20.md](./phase-0.5-tickets/P05-20.md)

## Layer 3 — Full feature UI

- [ ] **P05-21** — HDL editor UI — needs P05-16 — [P05-21.md](./phase-0.5-tickets/P05-21.md)
- [ ] **P05-22** — Test results panel — needs P05-17 — [P05-22.md](./phase-0.5-tickets/P05-22.md)
- [ ] **P05-23** — Builtin toggle UI — needs P05-15 — [P05-23.md](./phase-0.5-tickets/P05-23.md)
- [ ] **P05-24** — Composite chip 3D rendering — needs P05-01 — [P05-24.md](./phase-0.5-tickets/P05-24.md)

## Layer 4 — Integration

- [ ] **P05-26** — 3D/HDL interoperability — needs P05-16, P05-14 — [P05-26.md](./phase-0.5-tickets/P05-26.md)
- [ ] **P05-27** — End-to-end integration testing — needs prior layers — [P05-27.md](./phase-0.5-tickets/P05-27.md)
- [ ] **P05-28** — Documentation — needs P05-27 — [P05-28.md](./phase-0.5-tickets/P05-28.md)

---

_Note: There is no **P05-25** in the phase plan; numbering skips to P05-26._
