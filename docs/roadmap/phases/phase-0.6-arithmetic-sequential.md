# Phase 0.6: Projects 2-3 — Arithmetic & Sequential Logic (Weeks 9-12)

**Part of:** [Comprehensive Development Roadmap](../README.md)
**Priority:** CRITICAL — Required for Computer Architecture
**Timeline:** Weeks 9-12 (4 weeks; ~2 weeks with 2 parallel work streams)
**Dependencies:** Phase 0.5 complete (Project 1 Boolean Logic)

---

## Overview

This phase delivers everything needed for students to complete [Nand2Tetris Project 2: Boolean Arithmetic](https://www.nand2tetris.org/course) and [Project 3: Memory](https://www.nand2tetris.org/course) using either the 3D circuit designer or the HDL text editor.

Project 2 introduces arithmetic chips built from Project 1 gates. Project 3 introduces sequential logic — the first chips that maintain state across clock cycles.

**Exit Criteria:**
- All Project 2 chips completable and verified (HalfAdder, FullAdder, Add16, Inc16, ALU)
- All Project 3 chips completable and verified (Bit, Register, RAM8..RAM16K, PC)
- Clock signals propagate deterministically
- `tick`/`tock` test script commands functional
- RAM16K: <50MB memory via sparse storage
- Performance: <100ms for 1000-gate circuit with sequential logic

**Project 2 Chips (5 total):**

| Chip | Inputs | Outputs |
|------|--------|---------|
| HalfAdder | `a, b` | `sum, carry` |
| FullAdder | `a, b, c` | `sum, carry` |
| Add16 | `a[16], b[16]` | `out[16]` |
| Inc16 | `in[16]` | `out[16]` |
| ALU | `x[16], y[16], zx, nx, zy, ny, f, no` | `out[16], zr, ng` |

**Project 3 Chips (9 total):**

| Chip | Inputs | Outputs | Key Property |
|------|--------|---------|-------------|
| Bit | `in, load` | `out` | 1-bit register (uses DFF) |
| Register | `in[16], load` | `out[16]` | 16-bit register |
| RAM8 | `in[16], load, address[3]` | `out[16]` | 8-word RAM |
| RAM64 | `in[16], load, address[6]` | `out[16]` | 64-word RAM |
| RAM512 | `in[16], load, address[9]` | `out[16]` | 512-word RAM |
| RAM4K | `in[16], load, address[12]` | `out[16]` | 4K-word RAM |
| RAM16K | `in[16], load, address[14]` | `out[16]` | 16K-word RAM |
| PC | `in[16], load, inc, reset` | `out[16]` | Program counter |

---

## 0.6.1 Sequential Logic Foundation

**Requirements:** Support clocked components that maintain state across clock cycles. This is the fundamental new capability beyond Phase 0.5's combinatorial logic.

**DFF (D Flip-Flop) — the sequential primitive:**
- DFF is to sequential logic what NAND is to combinatorial logic
- On rising clock edge: output takes the input value
- Between clock edges: output holds its previous value
- DFF is provided as a builtin (students do not build it)

**Clock system:**
- Global clock signal: alternates between tick (0→1) and tock (1→0)
- Clock UI: tick/tock buttons, auto-clock with adjustable frequency
- Clock visualization: indicator showing current clock phase

**Gate definition extensions:**

```typescript
export interface GateDefinition {
  // ... existing fields from Phase 0.5 ...

  clocked?: boolean;
  internalStateKeys?: string[];
  onClockEdge?: (
    currentInputs: Record<string, number>,
    currentState: Record<string, number>,
    edge: 'rising' | 'falling'
  ) => { newOutputs: Record<string, number>; newState: Record<string, number> };
}
```

**Simulation changes:**
- Two-phase evaluation: combinatorial propagation (eval), then clock edge processing (tick/tock)
- State persistence: sequential gates maintain internal state between clock cycles
- Deterministic ordering: clock edge effects apply simultaneously to all clocked components

---

## 0.6.2 Memory System Architecture

**Requirements:** RAM chips that scale from 8 words to 16K words efficiently.

**Sparse memory implementation:**

```typescript
export class SparseMemory {
  private data = new Map<number, number>();

  constructor(public size: number, public wordSize: number = 16) {}

  read(address: number): number {
    return this.data.get(address) ?? 0;
  }

  write(address: number, value: number): void {
    if (value === 0) {
      this.data.delete(address); // Sparse: don't store zeros
    } else {
      this.data.set(address, value);
    }
  }
}
```

**Why sparse storage matters:**
- RAM16K = 16,384 x 16-bit words = 32KB if fully allocated
- Typical usage: <1% of addresses written during testing
- Sparse Map: only stores non-zero entries, <1MB for typical test runs

---

## 0.6.3 Test Infrastructure Extensions

**Requirements:** Extend the Phase 0.5 test engine to support sequential test commands.

**New `.tst` operations:**
- `tick` — advance clock from low to high (rising edge)
- `tock` — advance clock from high to low (falling edge)
- `ticktock` — shorthand for tick followed by tock

**Timing semantics:**
- `eval` — evaluate combinatorial logic only (no clock change)
- `tick` — set clock high, propagate, apply rising-edge state changes
- `tock` — set clock low, propagate, apply falling-edge state changes
- `ticktock` — complete one clock cycle

**Bundle Project 2-3 curriculum files** (stubs, .tst, .cmp for all 14 chips)

---

## 0.6.4 Builtin Implementations

**Project 2 builtins:** HalfAdder, FullAdder, Add16, Inc16, ALU
**Project 3 builtins:** DFF (primitive), Bit, Register, RAM8, RAM64, RAM512, RAM4K, RAM16K, PC

All builtins registered in ChipRegistry and available via builtin toggle (from Phase 0.5).

---

## 0.6.5 Dependency Graph & Work Streams

### Parallel Work Streams

| Stream | Focus | Tasks | Estimated |
|--------|-------|-------|-----------|
| **A: Sequential Engine** | DFF, clock, simulation | T6-DFF, T6-CLOCK, T6-SIM, T6-STATE, T6-TST | ~48h |
| **B: Memory** | SparseMemory, RAM chips | T6-SPARSE, T6-RAM, T6-REG-PC | ~32h |
| **C: Builtins + Data** | Reference implementations, curriculum | T6-BUILT2, T6-BUILT3, T6-DATA | ~32h |
| **Final** | Integration, docs | T6-INTEGRATION, T6-DOCS | ~18h |

Streams A and B can run in parallel. Stream B's RAM tasks depend on T6-DFF from Stream A. Stream C depends on the chip registry from Phase 0.5.

### Tasks with No Dependencies (can start immediately)

| Task ID | Task | Effort |
|---------|------|--------|
| T6-DFF | DFF gate definition and builtin implementation | 8h |
| T6-SPARSE | SparseMemory implementation | 8h |
| T6-DATA | Bundle Project 2-3 curriculum files | 4h |
| T6-BUILT2 | Project 2 builtin implementations (HalfAdder, FullAdder, Add16, Inc16, ALU) | 12h |

### Tasks with Dependencies

| Task ID | Task | Effort | Depends On |
|---------|------|--------|-----------|
| T6-CLOCK | Clock system (signal, UI controls, visualization) | 12h | T6-DFF |
| T6-SIM | Two-phase simulation (combinatorial + clock edge) | 12h | T6-CLOCK |
| T6-STATE | State persistence for sequential gates | 8h | T6-SIM |
| T6-RAM | RAM gate definitions (RAM8 through RAM16K) | 16h | T6-SPARSE, T6-DFF |
| T6-REG-PC | Register and PC implementations | 8h | T6-DFF |
| T6-TST | Extend test engine for tick/tock/ticktock | 8h | T6-CLOCK |
| T6-BUILT3 | Project 3 builtin implementations (DFF, Bit, Register, RAM8..16K, PC) | 16h | T6-DFF, T6-SPARSE |
| T6-INTEGRATION | Integration testing | 12h | All above |
| T6-DOCS | Documentation | 6h | All above |

### Critical Path

```
T6-DFF(8h) → T6-CLOCK(12h) → T6-SIM(12h) → T6-STATE(8h) → T6-INTEGRATION(12h) = 52h
```

**Total Estimated Effort:** ~130h (~3-4 weeks solo, ~2 weeks with 2 developers)
**Performance Budget:** <100ms for 1000-gate sequential circuits, <50MB memory for RAM16K
**Quality Gates:** All Project 2 and 3 `.tst` scripts pass at 100%

---

## 0.6.6 Risk Mitigation

**Sequential logic complexity:** Start with DFF as a black-box builtin, then build Bit and Register on top. RAM chips follow the same pattern with address decoding.

**Memory scalability:** SparseMemory avoids allocating 32KB for RAM16K upfront. Monitor memory usage during test runs to ensure <50MB budget.

**Clock determinism:** All clocked components must see the same clock edge simultaneously. The two-phase simulation model (combinatorial then clock) guarantees this.

---

**Part of:** [Comprehensive Development Roadmap](../README.md)
**Previous:** [Phase 0.5: Project 1 — Boolean Logic](phase-0.5-nand2tetris-foundation.md)
**Next:** [Phase 0.7: Projects 4-5 — Computer Architecture](phase-0.7-computer-architecture.md)
