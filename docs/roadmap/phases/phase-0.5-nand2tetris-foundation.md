# Phase 0.5: Project 1 — Boolean Logic (Weeks 2-8)

**Part of:** [Comprehensive Development Roadmap](../README.md)
**Priority:** CRITICAL — Blocks All Subsequent Phases
**Timeline:** Weeks 2-8 (7 weeks; ~4 weeks with 2 parallel work streams)
**Dependencies:** Phase 0.25 complete (grid-based system improves UX before core features)
**Gap Analysis:** [Project 1 Gap Analysis](../../compatibility/nand2tetris/project1/gap-analysis.md)

---

## Overview

This phase delivers everything needed for users to complete [Nand2Tetris Project 1: Boolean Logic](https://www.nand2tetris.org/course) as a compatibility-validation baseline using either the 3D circuit designer or the HDL text editor. Project 1 requires building **15** combinatorial chips from a single NAND primitive (Not through DMux8Way). **Nand** remains the supplied primitive, and the compatibility corpus includes **16** `.hdl` + **16** `.tst` + **16** `.cmp` assets for validation (see [gap analysis appendix](../../compatibility/nand2tetris/project1/gap-analysis.md)).

Sequential logic (DFF, RAM), arithmetic (ALU), and computer architecture (CPU) are deferred to Phases 0.6 and 0.7 respectively.

**Exit Criteria:**
- All 15 Project 1 chips completable via 3D circuit designer
- All 15 Project 1 chips completable via HDL text editor
- All **16** official Project 1 `.tst` scripts (including Nand) pass with 100% accuracy in both modes
- Circuits persist across browser sessions
- Performance: <50ms for 100-gate combinatorial circuit evaluation

**Project 1 Chips (15 total):**

| Category | Chips |
|----------|-------|
| Single-bit | Not, And, Or, Xor, Mux, DMux |
| 16-bit | Not16, And16, Or16, Mux16 |
| Multi-way | Or8Way, Mux4Way16, Mux8Way16, DMux4Way, DMux8Way |

---

## 0.5.1 Chip Hierarchy System

> Resolves: GAP-3D-1 (No Chip Hierarchy)

**Requirements:** Enable composite chips — circuits that encapsulate sub-circuits and expose named I/O pins as reusable building blocks. This is the single most critical gap: without it, users cannot reuse a chip they've built as a part inside another chip.

**What must work:**
- Define a circuit as a named chip with typed inputs/outputs
- Package a completed 3D circuit into a reusable component
- Place instances of user-defined chips on the 3D canvas
- Render composite chips as labeled boxes with dynamic pin counts
- Recursively evaluate chip internals during simulation
- Resolve chip names in HDL `PARTS:` sections (builtins first, then user-defined)

**Data model additions:**

```typescript
// src/core/chips/types.ts
export interface ChipDefinition {
  name: string;
  inputs: ChipPin[];
  outputs: ChipPin[];
  implementation: ChipImplementation;
}

export interface ChipPin {
  name: string;
  width: number; // 1 for single-bit, 16 for buses
}

export type ChipImplementation =
  | { type: 'builtin'; evaluate: (inputs: Record<string, number>) => Record<string, number> }
  | { type: 'hdl'; source: string } // HDL source code
  | { type: 'circuit'; circuitData: SerializedCircuit } // 3D circuit

// src/core/chips/registry.ts
export interface ChipRegistry {
  get(name: string): ChipDefinition | undefined;
  register(chip: ChipDefinition): void;
  list(): ChipDefinition[];
  has(name: string): boolean;
}
```

**Built-in chip registry (minimum for Project 1):**
- `Nand` — the single primitive gate (2 inputs, 1 output, all 1-bit)

**3D rendering of composite chips:**
- Labeled box geometry with chip name on top face
- Dynamic pin spheres positioned based on input/output count
- Visual distinction from primitive gates (different color/shape)
- Expandable view to see internals (future enhancement, not required for 0.5)

**Performance budget:**
- Chip resolution: <10ms per chip instantiation
- Recursive evaluation: <50ms for 100-gate composite hierarchy

---

## 0.5.2 Multi-bit Bus Support

> Resolves: GAP-3D-2 (No Multi-bit Bus Support)

**Requirements:** Support multi-bit buses (up to 16-bit) for pins, wires, and simulation. Nine of fifteen Project 1 chips require buses.

**Data model changes:**
- `InputNode.value` and `OutputNode.value`: change from `boolean` to `number` (integer bitmask)
- `InputNode.width` and `OutputNode.width`: make functional (currently always `1`)
- `Wire`: add optional `width` field; simulation propagates `number` values for buses
- `Pin.value`: change from `boolean` to `number`

**3D components needed:**
- **Bus wire rendering** — thicker wires with width labels to distinguish from single-bit
- **Bus splitter** — 3D component that takes an N-bit bus and exposes individual bits as pins
- **Bus joiner** — 3D component that combines individual bit wires into an N-bit bus
- **Sub-bus connections** — when wiring, ability to connect to a specific bit range (e.g., `a[0..7]`)

**UI for multi-bit values:**
- InputNode: bit-toggle array or numeric input (binary/hex/decimal) instead of single 0/1 toggle
- OutputNode: display value in selectable format (binary, decimal, hex)
- Width selector when placing Input/Output nodes

**HDL support:**
- Parse `IN a[16];` pin declarations with width
- Parse `a[0..7]` sub-bus connections in PARTS wiring
- `true` and `false` literals in connections

**Simulation changes:**
- Propagate `number` values through buses using integer bitmask arithmetic
- Sub-bus read: `(value >> start) & mask(width)`
- Sub-bus write: clear target bits, OR in new bits shifted to position

**Performance budget:**
- Bus operations: <1ms per bus propagation step
- No additional memory overhead vs. single-bit (integers are native)

---

## 0.5.3 Chip I/O Definition & Node Identity

> Resolves: GAP-3D-3 (No Chip I/O Definition Workflow)

**Requirements:** Formal workflow for defining what chip is being built, with named and typed I/O that matches test script expectations.

**Current problems:**
- Node names are auto-generated (`in0`, `out0`) with no rename capability
- Node names are not visually displayed (3D nodes show `0`/`1`, not the name)
- No chip-level name declaration
- No validation that I/O matches the chip specification

**What must work:**

1. **Chip definition panel** — UI section where user declares: chip name, input pins (name + width), output pins (name + width). When a Project 1 chip is selected from the workflow browser, this is pre-filled from a starter template.

2. **Node rename** — Add `renameInputNode(nodeId, newName)` and `renameOutputNode(nodeId, newName)` actions to the store.

3. **Node name display** — Render the node name (e.g., `"a"`, `"sel"`, `"out"`) on the 3D node's top face instead of (or alongside) the current value.

4. **Auto-generated I/O nodes** — When a chip definition is set, automatically create and position InputNode/OutputNode instances with correct names and widths matching the chip interface.

5. **Interface validation** — Before running tests, verify that the circuit's I/O nodes match the chip specification (correct names, correct widths, all pins present).

---

## 0.5.4 HDL Parser & Compiler

> Resolves: GAP-UI-1 (No HDL Editor Panel), uses chip hierarchy from 0.5.1

**Requirements:** Parse and compile HACK HDL files into runnable chip instances. This enables the text-based workflow for Project 1.

**HDL Parser:**

```typescript
// src/core/hdl/types.ts
export interface HDLChip {
  name: string;
  inputs: HDLPin[];
  outputs: HDLPin[];
  parts: HDLPart[];
  clocked?: string[];  // For future phases (sequential logic)
}

export interface HDLPin {
  name: string;
  width: number;  // Default 1
}

export interface HDLPart {
  name: string;  // Chip name (e.g., "Nand", "Not")
  connections: HDLConnection[];
}

export interface HDLConnection {
  internal: string;  // Part pin name
  external: string;  // Wire name or chip pin name
  start?: number;    // Sub-bus start index
  end?: number;      // Sub-bus end index
}
```

**Parser scope (Project 1):**
- `CHIP Name { ... }` declarations
- `IN pinList; OUT pinList;` with optional width `[N]`
- `PARTS:` section with part instantiation and wiring
- `BUILTIN;` keyword for primitive chips
- Sub-bus syntax: `a[0]`, `a[0..7]`
- `true` and `false` literal connections
- Comments: `//` line comments, `/* */` block comments, `/** */` doc comments

**HDL Compiler:**
- Resolve chip-part names via `ChipRegistry` (0.5.1)
- Recursive resolution: if a part isn't builtin, look for user-defined HDL
- Wire part pins to chip pins, creating internal signals as needed
- Validate: all part pins connected, no dangling wires, width compatibility
- Topological ordering of parts for evaluation

**HDL Editor UI:**
- Code editor panel (Monaco or CodeMirror) with HDL syntax highlighting
- Side-by-side layout: HDL editor + 3D canvas (or tabbed)
- Auto-compile on edit with error highlighting
- Error messages with line/column numbers

**Performance budget:**
- Parse time: <100ms for typical Project 1 chips
- Compile time: <100ms for recursive chip resolution
- Memory: <10MB for complex chip hierarchies

---

## 0.5.5 Test Script Execution

> Resolves: GAP-3D-4 (No Test Script Execution)

**Requirements:** Parse `.tst` test scripts, execute them against chips (both 3D-built and HDL-built), compare output against `.cmp` files.

**Test script parser (`.tst`):**

Operations to support for Project 1:
- `load ChipName.hdl` — load a chip for testing
- `output-file Xxx.out` — set output file name
- `compare-to Xxx.cmp` — set expected output file
- `output-list pin1 pin2 ...` — define output columns with format specifiers (`%B`, `%D`, `%X`, width)
- `set pinName value` — set input pin value (decimal, `%B` binary, `%X` hex)
- `eval` — evaluate the chip (combinatorial)
- `output` — record current pin values to output
- `repeat N { ... }` — repeat a block
- `while condition { ... }` — conditional repeat

Note: `tick` and `tock` are parsed but produce errors for Project 1 (combinatorial only). Full clock support deferred to Phase 0.6.

**Compare file parser (`.cmp`):**
- Pipe-delimited cell format: `| value1 | value2 | ... |`
- Header row defines column names
- Cell-by-cell comparison with `*` wildcard support
- Error reporting: which row/column differs, expected vs. actual

**Test execution engine:**
- Map `load` to resolving the chip from `ChipRegistry` (builtin, HDL, or 3D-circuit)
- Map `set` commands to InputNode value updates (by pin name, handling multi-bit values)
- Map `eval` to simulation-until-stable (topological sort from 0.5.6)
- Map `output` to recording current pin values in the format specified by `output-list`
- Map `output-file` to creating an in-memory output buffer (no real filesystem needed)
- After all steps, compare recorded output to `.cmp` file loaded by `compare-to`
- Report first mismatch with row/column, expected vs. actual

**Compatibility fixture provisioning:**
- Provide all Project 1 validation assets: 15 user `.hdl` stubs + 1 Nand BUILTIN `.hdl` + 16 `.tst` scripts + 16 `.cmp` files = 48 files
- Source can be in-repo fixtures or a pluggable provider backed by nand2tetris test materials (CC BY-NC-SA 3.0 compliance required)

---

## 0.5.6 Simulation Engine Improvements

> Resolves: GAP-3D-5 (Simulation Engine Limitations)

**Requirements:** Ensure correct, single-pass evaluation for arbitrarily deep combinatorial circuits.

**Current problem:**
The three-step single-pass evaluation reads gate outputs from the previous tick in Step 1 before Step 2 computes new values. A circuit with N layers of gates requires N ticks to propagate a change. This makes `eval` produce wrong results for multi-layer circuits.

**Solution — Topological sort evaluation:**

```typescript
// src/simulation/topologicalEval.ts
export function evaluateCircuit(state: CircuitState): void {
  const order = topologicalSort(state.gates, state.wires);
  // Process gates in dependency order:
  // 1. Read input node values
  // 2. For each gate in topological order:
  //    a. Read inputs (from input nodes or upstream gate outputs — already computed)
  //    b. Evaluate gate logic
  //    c. Write outputs
  // 3. Write output node values
}
```

**Requirements:**
- Single `evaluateCircuit()` call produces correct, fully-propagated results
- Works for both continuous simulation and test script `eval` commands
- Cycle detection: combinatorial feedback loops are reported as errors
- Falls back to multi-pass convergence with max-iteration guard if topological sort is impractical for a given circuit topology

**Performance budget:**
- Topological sort: <5ms for 100 gates
- Full evaluation: <50ms for 100-gate circuit

---

## 0.5.7 Circuit Persistence

> Resolves: GAP-3D-6 (No Circuit Persistence)

**Requirements:** users must be able to save their work and return to it across browser sessions.

**What must work:**
- **Auto-save** — periodically save current circuit to `localStorage`
- **Named circuits** — save/load circuits with chip names (e.g., "Not", "And", "Mux")
- **Circuit library** — list saved circuits, load a circuit by name
- **Export/import** — export circuit as JSON file, import from file
- **Chip availability** — saved circuits registered in ChipRegistry so they can be used as chip-parts

**Serialization format:**
- JSON with version field for future migration
- Includes: chip definition (name, pins), gate instances, wires, node positions, metadata
- Excludes: runtime simulation state (recomputed on load)

---

## 0.5.8 Chip Workflow Browser UI

> Resolves: GAP-3D-7 (No Guided Chip Workflow)

**Requirements:** Guide users through Project 1 chip workflows with a structured interface.

**UI components:**
1. **Workflow scope selector** — dropdown or sidebar section showing "Project 1: Boolean Logic"
2. **Chip list** — ordered list of 15 chips with completion status icons (not started / in progress / passing)
3. **Chip spec display** — when a chip is selected, show: description, interface (IN/OUT pins with widths), truth table or behavior spec
4. **Chip starter loading** — selecting a chip pre-configures the canvas with the chip definition (I/O nodes) and loads corresponding test/template assets from the active fixture/provider source
5. **Recommended order** — visual ordering matching the Project 1 specification: Not, And, Or, Xor, Mux, DMux, Not16, And16, Or16, Mux16, Or8Way, Mux4Way16, Mux8Way16, DMux4Way, DMux8Way

---

## 0.5.9 Test Results & Pinout UI

> Resolves: GAP-UI-2 (No Test Panel), GAP-UI-3 (No Pinout Display), GAP-UI-4 (Multi-bit Value I/O), GAP-UI-5 (Error Reporting)

**Requirements:** UI panels for test execution feedback, chip pin inspection, and error display.

**Test results panel:**
- Run/stop test button
- Progress indicator (running test step N of M)
- Output table showing recorded values per step
- Diff view highlighting mismatches between actual output and `.cmp` expected values
- Summary: "Simulation successful" or "Simulation error at line N: expected X, got Y"

**Pinout panel:**
- Shows all chip I/O pins: name, width, current value
- Input pins: toggleable (1-bit) or editable (multi-bit with format selector)
- Output pins: read-only, updated in real-time during simulation
- Manual `Eval` button to evaluate once without continuous simulation

**Multi-bit value display:**
- Format selector: Binary (`%B`), Decimal (`%D`), Hex (`%X`)
- Consistent with `.tst` output-list format specifiers
- Bit-toggle array for visual binary input on multi-bit pins

**Status/error bar:**
- Bottom status bar with severity-colored messages
- Validation warnings: floating inputs, missing connections, interface mismatches
- Test execution errors with actionable descriptions

---

## 0.5.10 Builtin Toggle

> Resolves: GAP-3D-8 (No Builtin Toggle)

**Requirements:** Let users experiment with reference implementations before building their own.

Project 1 tips specifically recommend: *"Before implementing a chip, it is recommended to experiment with its builtin implementation."*

**What must work:**
- Each of the 15 Project 1 chips has a pre-built reference implementation (builtin)
- Toggle button switches between "user implementation" and "builtin implementation"
- In builtin mode: set inputs, eval, see outputs — chip works correctly as a black box
- The builtin serves as the fallback when a user hasn't implemented a chip yet but needs it as a chip-part

---

## 0.5.11 3D/HDL Interoperability

> Resolves: GAP-UI-6 (Internal Wire Naming), GAP-UI-7 (Extensible Type System)

**Requirements:** users can build chips in either mode (3D or HDL) and use them interchangeably.

**How it works:**
- Both 3D-built circuits and HDL-compiled chips register in the same `ChipRegistry`
- A user can build NOT in 3D, save it, then reference it in HDL: `Not(in=x, out=y);`
- A user can write AND in HDL, compile it, then place it as a composite chip in 3D
- The `GateType` union is no longer the sole type system — `ChipRegistry` holds user-defined types at runtime (resolves GAP-UI-7)

**3D-to-HDL export (resolves GAP-UI-6):**
- When packaging a 3D circuit, auto-generate internal wire names for connections between gate pins that aren't exposed as chip-level I/O
- The existing `Wire.signalId` field is used to store these names
- Export produces valid HDL that re-imports to an equivalent chip
- Wire labels optionally visible in 3D view for debugging

**HDL-to-3D visualization (optional, not required for 0.5):**
- When an HDL chip is compiled, optionally auto-layout its parts as 3D components
- This is a convenience feature; the core requirement is that HDL chips work as black-box components in 3D

---

## 0.5.12 Dependency Graph & Work Streams

### Task Dependency DAG

```
  ┌──────────────────────────────────────────────────────────────────┐
  │ STREAM A: Core Engine (no UI dependencies)                       │
  │                                                                  │
  │  T-REG ──────────► T-HIER ──────────► T-BUILT ──► T-TOGGLE-UI  │
  │  ChipRegistry      Chip hierarchy      Builtins    Builtin UI   │
  │       │             evaluation          (15 chips)               │
  │       │                                                          │
  │       ▼                                                          │
  │  T-HDL-PARSE ───► T-HDL-COMPILE ──────► T-HDL-UI               │
  │  HDL parser        Compiler              Editor panel            │
  │                    (needs T-REG)                                  │
  │                                                                  │
  │  T-TOPO ───────────────────────────────────────┐                │
  │  Topological sort                               │                │
  │                                                 ▼                │
  │  T-TST-PARSE ──► T-CMP-PARSE ──► T-TEST-ENG ──► T-TEST-UI     │
  │  .tst parser      .cmp parser     Test engine    Results panel   │
  │                                   (needs T-TOPO)                 │
  └──────────────────────────────────────────────────────────────────┘

  ┌──────────────────────────────────────────────────────────────────┐
  │ STREAM B: Data Model & 3D (parallel with Stream A)              │
  │                                                                  │
  │  T-BUS-MODEL ───► T-BUS-SIM ──────► T-BUS-3D                   │
  │  Multi-bit data    Bus simulation    Splitter/joiner            │
  │  model change      (bitmask ops)     3D components              │
  │       │                                                          │
  │       ▼                                                          │
  │  T-BUS-UI                                                        │
  │  Multi-bit I/O                                                   │
  │  (input/display)                                                 │
  │                                                                  │
  │  T-NODE-ID ────► T-CHIP-PANEL ──► T-AUTO-IO ──► T-VALIDATE     │
  │  Node rename +    Chip definition   Auto-gen     Interface       │
  │  name display     panel UI          I/O nodes    validation      │
  │                   (needs T-REG)                                  │
  │                                                                  │
  │  T-COMP-3D                                                       │
  │  Composite chip                                                  │
  │  3D rendering                                                    │
  │  (needs T-REG)                                                   │
  └──────────────────────────────────────────────────────────────────┘

  ┌──────────────────────────────────────────────────────────────────┐
  │ STREAM C: Infrastructure (parallel with A and B)                 │
  │                                                                  │
  │  T-SERIAL ──────► T-PERSIST-UI                                  │
  │  Circuit           Circuit library                               │
  │  serialization     save/load UI                                  │
  │                                                                  │
  │  T-NAV-UI           T-PINOUT         T-STATUS                   │
  │  Chip workflow      Pinout panel     Error/status bar            │
  │  browser                                                         │
  └──────────────────────────────────────────────────────────────────┘

  ┌──────────────────────────────────────────────────────────────────┐
  │ FINAL: Integration (after all streams)                           │
  │                                                                  │
  │  T-INTEROP ──► T-INTEGRATION ──► T-DOCS                        │
  │  3D/HDL         End-to-end        Documentation                  │
  │  interop        testing                                          │
  └──────────────────────────────────────────────────────────────────┘
```

### Parallel Work Streams

With 2 developers, the phase can be completed in ~4 weeks by running streams in parallel:

| Stream | Focus | Key Tasks | Estimated |
|--------|-------|-----------|-----------|
| **A: Core Engine** | HDL, test execution, chip hierarchy logic | T-REG, T-HIER, T-HDL-PARSE, T-HDL-COMPILE, T-TOPO, T-TST-PARSE, T-CMP-PARSE, T-TEST-ENG, T-BUILT | ~130h |
| **B: Data Model & 3D** | Bus support, node identity, 3D components | T-BUS-MODEL, T-BUS-SIM, T-BUS-3D, T-BUS-UI, T-NODE-ID, T-CHIP-PANEL, T-AUTO-IO, T-VALIDATE, T-COMP-3D | ~86h |
| **C: Infrastructure** | Persistence and UI panels | T-SERIAL, T-PERSIST-UI, T-NAV-UI, T-PINOUT, T-STATUS | ~38h |
| **Final** | Integration, interop, docs | T-INTEROP, T-HDL-UI, T-TEST-UI, T-TOGGLE-UI, T-INTEGRATION, T-DOCS | ~42h |

Stream C can be absorbed into A or B since its tasks are small and independent.

### Critical Path

The longest dependency chain determines the minimum timeline:

```
T-REG → T-HDL-COMPILE → T-TEST-ENG → T-TEST-UI → T-INTEGRATION
 12h        16h             16h          10h          16h        = 70h (~1.75 weeks)
```

However, the HDL parser (T-HDL-PARSE, 16h) must complete before the compiler, and topological sort (T-TOPO, 10h) must complete before the test engine. The realistic critical path including these:

```
T-REG(12h) + T-HDL-PARSE(16h) → T-HDL-COMPILE(16h) → T-TEST-ENG(16h) → T-INTEGRATION(16h) = 76h
```

### Tasks with No Dependencies (can start immediately)

These can begin on day 1, in any order:

| Task ID | Task | Effort | Gap |
|---------|------|--------|-----|
| T-REG | Design + implement ChipRegistry and ChipDefinition types | 20h | GAP-3D-1 |
| T-BUS-MODEL | Multi-bit data model (boolean→number, width functional) | 8h | GAP-3D-2 |
| T-NODE-ID | Node rename actions + name display on 3D nodes | 6h | GAP-3D-3 |
| T-HDL-PARSE | HDL parser (HACK HDL grammar) | 16h | GAP-UI-1 |
| T-TST-PARSE | Test script parser (.tst) | 12h | GAP-3D-4 |
| T-CMP-PARSE | Compare file parser (.cmp) | 6h | GAP-3D-4 |
| T-TOPO | Topological sort evaluation | 10h | GAP-3D-5 |
| T-SERIAL | Circuit serialization format + localStorage | 10h | GAP-3D-6 |
| T-NAV-UI | Chip workflow browser UI (project/chip browser) | 10h | GAP-3D-7 |
| T-PINOUT | Pinout panel (pin values, eval button) | 8h | GAP-UI-3 |
| T-STATUS | Error/status bar | 4h | GAP-UI-5 |

### Tasks with Dependencies

| Task ID | Task | Effort | Depends On | Gap |
|---------|------|--------|-----------|-----|
| T-HIER | Chip hierarchy evaluation (recursive) | 12h | T-REG | GAP-3D-1 |
| T-COMP-3D | Composite chip 3D rendering | 16h | T-REG | GAP-3D-1 |
| T-BUILT | Builtin implementations (15 Project 1 chips) | 8h | T-REG | GAP-3D-8 |
| T-BUS-SIM | Bus simulation (bitmask propagation, sub-bus) | 12h | T-BUS-MODEL | GAP-3D-2 |
| T-BUS-3D | Bus splitter/joiner 3D components | 12h | T-BUS-MODEL | GAP-3D-2 |
| T-BUS-UI | Multi-bit I/O UI (input fields, format display) | 8h | T-BUS-MODEL | GAP-UI-4 |
| T-CHIP-PANEL | Chip definition panel UI | 8h | T-REG | GAP-3D-3 |
| T-AUTO-IO | Auto-generate I/O nodes from chip spec | 4h | T-CHIP-PANEL | GAP-3D-3 |
| T-VALIDATE | Interface validation | 4h | T-CHIP-PANEL | GAP-3D-3 |
| T-HDL-COMPILE | HDL compiler (chip-part resolution, wiring) | 16h | T-HDL-PARSE, T-REG | GAP-UI-1 |
| T-HDL-UI | HDL editor UI panel (syntax highlighting) | 12h | T-HDL-PARSE | GAP-UI-1 |
| T-TEST-ENG | Test execution engine | 16h | T-TST-PARSE, T-CMP-PARSE, T-TOPO | GAP-3D-4 |
| T-PERSIST-UI | Circuit library UI (save/load/list) | 6h | T-SERIAL | GAP-3D-6 |
| T-TEST-UI | Test results panel (diff, progress, status) | 10h | T-TEST-ENG | GAP-UI-2 |
| T-TOGGLE-UI | Builtin toggle UI | 4h | T-BUILT | GAP-3D-8 |
| T-INTEROP | 3D/HDL interop (wire naming, export, registry bridge) | 8h | T-HDL-COMPILE, T-SERIAL | GAP-UI-6 |
| T-INTEGRATION | End-to-end integration testing | 16h | All above | — |
| T-DOCS | Documentation | 8h | All above | — |

**Total:** ~270h (~7 weeks solo, ~4 weeks with 2 developers)

---

## 0.5.13 Risk Mitigation

**Scope creep:** Phase 0.5 is strictly scoped to combinatorial logic (Project 1). Sequential logic, arithmetic, and computer architecture are in Phases 0.6 and 0.7. Do not add DFF, RAM, ALU, or CPU work here.

**Complexity of chip hierarchy:** Start with flat hierarchy (chips using only builtins and one level of user-defined chips). Deep nesting can be optimized incrementally.

**Multi-bit bus complexity in 3D:** The bus splitter/joiner approach may be visually overwhelming for Mux8Way16 (131 bits of I/O). Consider allowing composite chips to abstract away the bus wiring internally, so users only see the chip-level interface in the parent circuit.

**HDL parser robustness:** Use the web-ide's Ohm grammar as a reference for edge cases. The nand2tetris HDL dialect is small and well-specified.

**Performance:** Topological sort is O(V+E) and well-understood. For Project 1 circuits (typically <50 gates), performance is not a concern. Budget headroom is for future phases.

**Quality Gates:** All 16 Project 1 `.tst` scripts pass at 100% in both 3D and HDL modes.
**Performance Budget:** <50ms evaluation for 100-gate circuits, <100MB memory.

---

**Part of:** [Comprehensive Development Roadmap](../README.md)
**Previous:** [Phase 0.25: UI/UX Improvements](phase-0.25-ui-improvements.md)
**Next:** [Phase 0.6: Arithmetic & Sequential Logic](phase-0.6-arithmetic-sequential.md)
