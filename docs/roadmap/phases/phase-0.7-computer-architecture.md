# Phase 0.7: Projects 4-5 — Computer Architecture (Weeks 13-17)

**Part of:** [Comprehensive Development Roadmap](../README.md)
**Priority:** CRITICAL — Completes Hardware Platform
**Timeline:** Weeks 13-17 (5 weeks; ~3 weeks with 2 parallel work streams)
**Dependencies:** Phase 0.6 complete (Projects 2-3 Arithmetic & Sequential Logic)

---

## Overview

This phase delivers everything needed for users to complete [Nand2Tetris Project 4: Machine Language](https://www.nand2tetris.org/course) and [Project 5: Computer Architecture](https://www.nand2tetris.org/course).

Project 4 introduces the Hack machine language — users write assembly programs that run on the hardware they built. Project 5 is the culmination of the hardware track: users build a complete computer (CPU + Memory + ROM) from the chips developed in Projects 1-3.

After this phase, users have a working computer built entirely from NAND gates.

**Exit Criteria:**
- All Project 5 chips completable and verified (Memory, CPU, Computer)
- Hack assembly programs executable on the simulated computer
- Memory-mapped I/O functional (screen output, keyboard input)
- ROM32K loads and executes .hack binary programs
- All official `.tst` scripts for Projects 4 and 5 pass at 100%
- Performance: <200ms per instruction cycle for the complete Computer chip

**Project 4:** Machine Language (no chips to build — assembly programming exercises)

**Project 5 Chips (3 total):**

| Chip | Inputs | Outputs | Description |
|------|--------|---------|------------|
| Memory | `in[16], load, address[15]` | `out[16]` | RAM16K + Screen + Keyboard memory map |
| CPU | `inM[16], instruction[16], reset` | `outM[16], writeM, addressM[15], pc[15]` | Hack CPU (ALU + registers + control) |
| Computer | `reset` | (none — outputs via memory-mapped I/O) | Top-level: CPU + Memory + ROM32K |

---

## 0.7.1 CPU Implementation

**Requirements:** The Hack CPU decodes 16-bit instructions, routes data through the ALU, manages the A and D registers, and controls the program counter.

**CPU architecture (from nand2tetris spec):**
- **A Register** — 16-bit, holds address or data
- **D Register** — 16-bit, holds data only
- **Program Counter (PC)** — 16-bit, auto-increments, can load/reset
- **ALU** — from Project 2, computes based on instruction bits
- **Instruction decode** — A-instruction (load constant) vs C-instruction (compute)

**Instruction set:**
- **A-instruction** (`0vvvvvvvvvvvvvvv`): Load 15-bit value into A register
- **C-instruction** (`111accccccdddjjj`): Compute, destination, jump

**Builtin CPU:** Pre-built reference implementation available via builtin toggle.

---

## 0.7.2 Memory System

**Requirements:** Unified memory map combining RAM, Screen, and Keyboard.

**Memory map (16-bit address space):**

| Address Range | Size | Component |
|--------------|------|-----------|
| 0x0000-0x3FFF | 16K words | RAM16K (data memory) |
| 0x4000-0x5FFF | 8K words | Screen (256 x 512 pixels, 1 bit per pixel) |
| 0x6000 | 1 word | Keyboard (current key code) |

**Screen I/O:**
- 8K words of memory-mapped display buffer
- Each word = 16 pixels (1 bit per pixel)
- 256 rows x 32 words per row = 512 pixels wide
- Visual rendering: canvas element showing black/white pixels
- Update display on every screen memory write

**Keyboard I/O:**
- Single memory-mapped register at address 0x6000
- Returns current key code (0 = no key pressed)
- Map browser keyboard events to Hack key codes

---

## 0.7.3 ROM and Program Loading

**Requirements:** Load Hack machine code (.hack files) into ROM for execution.

**ROM32K:**
- 32K x 16-bit read-only memory
- Pre-loaded with program binary before execution
- CPU reads instructions from ROM via program counter

**.hack file format:**
- Plain text, one instruction per line
- Each line: 16 characters of `0` and `1` (binary instruction)

**Program loading UI:**
- File picker to load `.hack` files
- Text area showing loaded program (address + instruction)
- Reset button to restart execution from address 0

---

## 0.7.4 Machine Language Support (Project 4)

**Requirements:** While Project 4 doesn't require building chips, it requires running Hack assembly programs on the simulated computer.

**What must work:**
- Load `.hack` binary programs into ROM
- Step-by-step execution with visible register/memory state
- Run-to-completion mode
- Program visualization: highlight current instruction in ROM

**Project 4 test programs:**
- Mult.asm (multiplication via repeated addition)
- Fill.asm (keyboard-controlled screen fill)
- These are tested by running them on the Computer chip

**Note:** An assembler (translating `.asm` to `.hack`) is part of Project 6 and belongs in Phase 10 (Software Stack), not here. For Project 4, users write assembly by hand and the pre-assembled `.hack` files are provided.

---

## 0.7.5 Execution & Debugging UI

**Requirements:** UI for running and debugging programs on the simulated computer.

**Execution controls:**
- Step (execute one instruction)
- Run (continuous execution at adjustable speed)
- Pause / Stop
- Reset (set PC to 0, clear registers)

**Debugging views:**
- **ROM view:** instruction listing with current PC highlighted
- **CPU state:** A register, D register, PC values (decimal and binary)
- **Memory inspector:** view/edit RAM values at specific addresses
- **Screen output:** live rendering of the 256x512 pixel display
- **Keyboard input:** show current key code, capture keyboard events

---

## 0.7.6 Dependency Graph & Work Streams

### Parallel Work Streams

| Stream | Focus | Tasks | Estimated |
|--------|-------|-------|-----------|
| **A: CPU** | CPU implementation and instruction decode | T7-CPU, T7-DECODE | ~32h |
| **B: Memory & I/O** | Memory map, screen, keyboard | T7-MEM, T7-SCREEN, T7-KBD | ~40h |
| **C: ROM & Programs** | ROM, file loading, test programs | T7-ROM, T7-HACK, T7-P4-TEST, T7-DATA | ~26h |
| **D: Integration** | Computer chip, execution UI, debugging, builtins | T7-COMPUTER, T7-EXEC-UI, T7-DEBUG, T7-BUILT, T7-INTEGRATION, T7-DOCS | ~72h |

Streams A, B, and C can run in parallel. Stream D depends on all three.

### Tasks with No Dependencies (can start immediately)

| Task ID | Task | Effort |
|---------|------|--------|
| T7-ROM | ROM32K implementation | 8h |
| T7-DATA | Prepare Project 4-5 compatibility fixture packs | 4h |

### Tasks with External Dependencies (Phase 0.6)

| Task ID | Task | Effort | Depends On |
|---------|------|--------|-----------|
| T7-CPU | CPU chip definition and builtin implementation | 20h | Phase 0.6: ALU, Register, PC |
| T7-MEM | Memory chip (RAM16K + Screen + Keyboard map) | 16h | Phase 0.6: RAM16K |

### Tasks with Internal Dependencies

| Task ID | Task | Effort | Depends On |
|---------|------|--------|-----------|
| T7-DECODE | Instruction decode logic (A/C-instruction) | 12h | T7-CPU |
| T7-SCREEN | Screen I/O rendering (canvas display) | 16h | T7-MEM |
| T7-KBD | Keyboard I/O handling (event capture, key codes) | 8h | T7-MEM |
| T7-HACK | .hack file loader and parser | 6h | T7-ROM |
| T7-COMPUTER | Computer chip (CPU + Memory + ROM integration) | 12h | T7-CPU, T7-MEM, T7-ROM |
| T7-EXEC-UI | Execution controls UI (step, run, pause, reset) | 10h | T7-COMPUTER |
| T7-DEBUG | Debugging views (ROM, registers, memory inspector) | 16h | T7-EXEC-UI |
| T7-P4-TEST | Project 4 test programs and validation | 8h | T7-COMPUTER |
| T7-BUILT | Builtin implementations (Memory, CPU, Computer) | 12h | T7-CPU, T7-MEM |
| T7-INTEGRATION | Integration testing | 16h | All above |
| T7-DOCS | Documentation | 8h | All above |

### Critical Path

```
T7-CPU(20h) → T7-COMPUTER(12h) → T7-EXEC-UI(10h) → T7-DEBUG(16h) → T7-INTEGRATION(16h) = 74h
```

**Total Estimated Effort:** ~170h (~4-5 weeks solo, ~3 weeks with 2 developers)
**Performance Budget:** <200ms per instruction cycle, <100MB total memory
**Quality Gates:** All Project 5 `.tst` scripts pass at 100%, Project 4 test programs execute correctly

---

## 0.7.7 Risk Mitigation

**CPU complexity:** The Hack CPU is well-documented with a clear specification. Start with the builtin implementation, then let users build it from the ALU and registers they already have.

**Screen rendering performance:** Use `requestAnimationFrame` to batch screen updates. Don't re-render on every memory write — buffer changes and render at 30-60fps.

**Keyboard handling:** Browser keyboard events can be tricky (key repeat, modifier keys). Map to the Hack key code table and handle edge cases (no key = 0, only one key at a time).

**Integration testing:** The Computer chip integrates everything from Projects 1-5. Test with simple programs first (constant output), then the official Project 4 test programs.

---

**Part of:** [Comprehensive Development Roadmap](../README.md)
**Previous:** [Phase 0.6: Projects 2-3 — Arithmetic & Sequential Logic](phase-0.6-arithmetic-sequential.md)
**Next:** [Phase 1.5: Design System & Visual Consistency](phase-1.5-design-system.md)
