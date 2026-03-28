# Project 1: Gap Analysis — HACER Validation for Boolean Logic

**Reference Specification:** Elementary Logic Gates
**Date:** 2026-03-21
**HACER Phase:** 0.25 (Complete) → 0.5 (In Progress)

---

## Validation Requirements

The platform must accurately simulate 15 standard logic components built from a single primitive gate (NAND). The components are built *hierarchically* — each component can use any previously-built component as a sub-part.

**File counts vs validation targets:** The validation suite includes 16 components (including the Nand primitive) across their respective `.hdl` stubs, `.tst` test scripts, and `.cmp` expected outputs. This gives a total of **16 + 16 + 16 = 48 validation files**.

| Category | Chips | Key Property |
|----------|-------|-------------|
| Single-bit | Not, And, Or, Xor, Mux, DMux | 1-bit inputs/outputs |
| 16-bit | Not16, And16, Or16, Mux16 | 16-bit buses (`in[16]`, `out[16]`) |
| Multi-way | Or8Way, Mux4Way16, Mux8Way16, DMux4Way, DMux8Way | Multiple inputs/outputs + buses |

The workflow for each chip:
1. Read the chip's interface specification (IN/OUT pin declarations)
2. Implement the chip using previously-built chips as parts
3. Run the provided `.tst` test script
4. Verify output matches the provided `.cmp` compare file

### Chip Interface Requirements (from web-ide stubs)

| Chip | Inputs | Outputs | Bus Widths |
|------|--------|---------|-----------|
| Not | `in` | `out` | all 1-bit |
| And | `a, b` | `out` | all 1-bit |
| Or | `a, b` | `out` | all 1-bit |
| Xor | `a, b` | `out` | all 1-bit |
| Mux | `a, b, sel` | `out` | all 1-bit |
| DMux | `in, sel` | `a, b` | all 1-bit |
| Not16 | `in[16]` | `out[16]` | 16-bit |
| And16 | `a[16], b[16]` | `out[16]` | 16-bit |
| Or16 | `a[16], b[16]` | `out[16]` | 16-bit |
| Mux16 | `a[16], b[16], sel` | `out[16]` | 16-bit + 1-bit sel |
| Or8Way | `in[8]` | `out` | 8-bit in, 1-bit out |
| Mux4Way16 | `a[16], b[16], c[16], d[16], sel[2]` | `out[16]` | 16-bit + 2-bit sel |
| Mux8Way16 | `a-h[16], sel[3]` | `out[16]` | 8×16-bit + 3-bit sel |
| DMux4Way | `in, sel[2]` | `a, b, c, d` | 1-bit + 2-bit sel |
| DMux8Way | `in, sel[3]` | `a, b, c, d, e, f, g, h` | 1-bit + 3-bit sel |

---

## Current HACER Capabilities

### What exists (Phase 0.25)

| Capability | Status | Details |
|-----------|--------|---------|
| Primitive gate logic | 7 types | NAND, AND, OR, NOT, NOR, XOR, XNOR in `gateLogic.ts` |
| 3D gate components | 5 types | NandGate, AndGate, OrGate, NotGate, XorGate (NOR/XNOR fall back to NAND visual) |
| Gate selector UI | 5 gates | NAND, AND, OR, NOT, XOR in sidebar |
| Input/Output nodes | Yes | `InputNode3D`, `OutputNode3D` with toggle and wiring |
| Junction nodes | Yes | `JunctionNode3D` for wire fan-out |
| Wire system | Single-bit | Grid-aligned routing with crossing detection |
| Simulation | Single-pass | Wires→gate inputs → gate eval → wires→output nodes |
| Grid placement | Yes | Section-based grid with 2.0 unit cells |
| Gate drag/rotate | Yes | Drag to move, 90° rotation increments |

### Partial HDL Groundwork (exists but non-functional)

Some data model fields anticipate future HDL support, but none are wired into simulation or UI:

| Field | Where | Purpose | Status |
|-------|-------|---------|--------|
| `width: number` | `InputNode`, `OutputNode` | Bus width (1-bit vs 16-bit) | Always `1` in UI; no multi-bit simulation |
| `signalId?: string` | `Wire` | HDL-style named signal grouping | Optional; not used by simulation |
| HDL comments | `store/types.ts` | Type comments reference HDL (`IN a, b;`) | Documentation only |

### What does NOT exist

| Capability | Status |
|-----------|--------|
| Chip hierarchy (sub-circuits) | Not implemented |
| Multi-bit buses | Data model only (`width` field unused) |
| HDL parser/compiler | Not implemented (`src/core/hdl/` does not exist) |
| HDL code editor | Not implemented |
| `.tst` test script execution | Not implemented (`src/core/testing/` does not exist) |
| `.cmp` compare file validation | Not implemented |
| Guided chip workflow browser | Not implemented |
| Built-in chip registry | Not implemented |
| Circuit save/load | Not implemented |
| Builtin toggle (experimentation) | Not implemented |
| Topological evaluation order | Not implemented |
| Node rename | Not implemented (names permanently auto-generated) |
| Node name display | Not implemented (3D nodes show value `0`/`1`, not name) |

---

## Gap Analysis: 3D Circuit Designer

This section details every gap that prevents the platform from accurately generating and validating the Project 1 component suite using HACER's 3D visual circuit designer.

### GAP-3D-1: No Chip Hierarchy (CRITICAL BLOCKER)

**Blocks:** All chips after Not (14 of 15 chips)
**Severity:** Project-blocking

**The problem:**
Project 1's validation methodology relies on *hierarchical composition*. After verifying NOT from NAND gates, the system must use NOT as a component when validating AND. Then AND and NOT when building OR. Then OR, AND, NOT when building Xor. This hierarchy continues through all 15 chips.

HACER has no concept of a user-defined composite chip. The only placeable components are the 5 primitive gate types (NAND, AND, OR, NOT, XOR) and I/O nodes. There is no way to:

- Package a completed circuit (e.g., a NOT built from NAND) into a reusable component
- Give that component a name and interface (inputs/outputs)
- Place instances of that component inside another circuit
- Recursively nest chips (e.g., Mux4Way16 uses Mux16, which uses Mux, which uses AND + OR + NOT)

**What the web-ide does:**
In HDL, `PARTS:` entries reference chip names. `ChipBuilder.wireParts()` resolves each name — checking builtins first, then loading `.hdl` files and recursively parsing/building. A chip built from other chips becomes available as a chip-part in subsequent chips.

**What HACER needs:**

1. **Chip definition system** — A way to declare "this circuit is chip X with inputs [a, b] and outputs [out]"
2. **Chip packaging** — Convert a completed circuit into a reusable component with a defined interface
3. **Chip instance placement** — Add user-defined chips to the gate selector so they can be placed on the 3D canvas
4. **Chip instance rendering** — A visual representation of a composite chip in 3D (e.g., a labeled box with pins)
5. **Recursive evaluation** — Simulation must evaluate chip internals when evaluating a circuit that contains chip instances
6. **Chip library/registry** — Track which chips have been defined and are available for use

**Concrete example of the problem:**
A user builds NOT using two NAND gates and wires:
```
InputNode(in) → NAND.a ─┐
                         ├─ NAND → OutputNode(out)
InputNode(in) → NAND.b ─┘
```
This works. But now they need to build AND:
```
CHIP And { IN a, b; OUT out; PARTS:
    Nand(a=a, b=b, out=nandOut);
    Not(in=nandOut, out=out);    // ← Uses the NOT they just built!
}
```
In HACER's 3D designer, there is no "Not" component to place. The user would have to manually re-create the NOT internals every time they need a NOT — and this compounds for every subsequent chip.

---

### GAP-3D-2: No Multi-bit Bus Support (CRITICAL BLOCKER)

**Blocks:** Not16, And16, Or16, Mux16, Or8Way, Mux4Way16, Mux8Way16, DMux4Way, DMux8Way (9 of 15 chips)
**Severity:** Project-blocking

**The problem:**
Nine of fifteen chips operate on 16-bit buses. The HACER data model has a `width: number` field on `InputNode` and `OutputNode`, but:

- The `addInputNode`/`addOutputNode` actions accept an optional `width` parameter (default `1`), but the UI placement flow (`placeNode` in `nodePlacementActions.ts`) always hardcodes `width: 1` — there is no UI to choose a different width
- All values are `boolean` (not multi-bit integers)
- Wires carry a single bit — no concept of a bus wire carrying 16 bits
- No bus splitting (taking `in[0..7]` from a 16-bit bus)
- No bus joining (combining individual bits into a bus)
- No visual distinction between 1-bit wires and multi-bit buses
- The simulation engine (`simulationTick`) only propagates `boolean` values

**What the web-ide does:**
The `Bus` class stores voltage per bit via `busVoltage` (integer bitmask). `InSubBus` and `OutSubBus` handle sub-bus slicing using bitwise operations. HDL syntax supports `a[16]` for declarations and `a[0..7]` for connections.

For example, Not16 in HDL:
```hdl
CHIP Not16 {
    IN in[16];
    OUT out[16];
    PARTS:
    Not(in=in[0], out=out[0]);
    Not(in=in[1], out=out[1]);
    // ... 16 instances of Not
}
```

**What HACER needs for 3D mode:**

1. **Multi-bit node declarations** — InputNode and OutputNode must support widths > 1 with real multi-bit values (integers, not booleans)
2. **Bus wire rendering** — Visual distinction for multi-bit connections (thicker wires, width labels)
3. **Bus splitter component** — A 3D component that takes a 16-bit bus and exposes individual bits as separate pins
4. **Bus joiner component** — A 3D component that combines individual bit wires into a bus
5. **Sub-bus connections** — When wiring, ability to connect to a specific bit range of a bus
6. **Simulation of multi-bit values** — Propagate integer values through buses, not just booleans
7. **UI for setting multi-bit input values** — Currently, InputNode toggles between 0/1. A 16-bit input needs a way to set a 16-bit value (binary switches, hex input, etc.)

**Scale of the problem:**
Not16 alone requires 16 NOT gates with 16 individual bit connections from input bus and to output bus. Mux4Way16 has four 16-bit inputs, a 2-bit selector, and a 16-bit output — 66 bits of I/O. Mux8Way16 has eight 16-bit inputs plus a 3-bit selector — 131 bits of I/O. Without bus abstraction, wiring these in 3D would be impractical even if chip hierarchy existed.

---

### GAP-3D-3: No Chip I/O Definition Workflow (BLOCKER)

**Blocks:** All chips — no way to formally define what a chip IS
**Severity:** Project-blocking

**The problem:**
When a user starts building a chip, they need to know and declare the chip's interface: its name, input pins (with widths), and output pins (with widths). In HACER, users can place InputNode and OutputNode manually, but there is no:

- **Chip name declaration** — No way to say "I am building the Mux chip"
- **Interface contract** — No way to specify the required pin names and widths that must match the test script expectations
- **Validation** — No way to verify the placed I/O nodes match the chip specification
- **Guided setup** — No workflow that pre-creates the required I/O pins for a given chip
- **Node rename** — No action to rename a node after placement; names are permanently auto-assigned

Currently, `placeNode` generates sequential names (`in0`, `in1`, `out0`, `out1` via `generateNodeName` in `nodePlacementActions.ts`). There is no UI or action to rename them to match what the test scripts expect (`a`, `b`, `sel`, `out`, etc.).

Additionally, **node names are not visually displayed** on the 3D objects. Both `InputNode3D` and `OutputNode3D` accept a `name` prop but render only the current value (`"0"` or `"1"`) on the top face — the `name` prop is destructured but unused (`_name`). A user cannot even see which node is `in0` vs `in1` without selecting it.

**What the web-ide does:**
The HDL file explicitly defines the interface:
```hdl
CHIP Mux {
    IN a, b, sel;
    OUT out;
    PARTS: ...
}
```
The chip builder enforces that all declared pins exist and are properly wired.

**What HACER needs:**

1. **Chip definition panel** — UI to declare chip name, input pins (name + width), output pins (name + width)
2. **Auto-generated I/O nodes** — When a chip definition is set, automatically create and position the required InputNode and OutputNode instances with correct names
3. **Interface validation** — Verify that the circuit's I/O matches the chip specification before testing
4. **Stub loading** — Load chip specifications from Project 1 data (equivalent to the HDL stub files)

---

### GAP-3D-4: No Test Script Execution (BLOCKER)

**Blocks:** Verification of all chips
**Severity:** Project-blocking

**The problem:**
Every Project 1 chip comes with a `.tst` test script and `.cmp` compare file. The test script sets input values, evaluates the chip, and records outputs. The compare file contains the expected outputs. users verify their systems by running the test and seeing if the output matches.

HACER has no test infrastructure whatsoever:
- No `.tst` parser
- No `.cmp` parser
- No test execution engine
- No output recording
- No comparison logic
- No test results UI (pass/fail, diff view)

**What the web-ide does:**
Full test pipeline:
1. Ohm grammar (`tst.ohm`) parses `.tst` files into structured operations
2. `TestBuilder` converts operations into executable instructions (`set`, `eval`, `output`, `compare-to`)
3. `ChipTest.step()` executes instructions against the chip
4. `compare()` function validates output against `.cmp` using cell-by-cell comparison
5. UI shows test status, output file, and diff highlighting

**Example `.tst` file (Mux):**
```
load Mux.hdl,
compare-to Mux.cmp,
output-list a b sel out;

set a 0, set b 0, set sel 0, eval, output;
set sel 1, eval, output;
// ... 8 test cases
```

**What HACER needs:**

1. **Test script parser** — Parse `.tst` files (operations: `load`, `set`, `eval`, `output`, `compare-to`, `output-list`, `repeat`, `while`)
2. **Test execution engine** — Execute test operations against the current circuit:
   - `set` → update InputNode values by pin name
   - `eval` → run simulation until stable
   - `output` → record current output values
   - `compare-to` → load `.cmp` file for validation
3. **Compare file parser** — Parse pipe-delimited `.cmp` files
4. **Output comparison** — Cell-by-cell comparison with error highlighting
5. **Test results UI** — Panel showing: test progress, pass/fail status, output table, diff against expected output
6. **Test data bundling** — Ship the full Project 1 bundle: **16** `.tst` and **16** `.cmp` files (15 standard components + Nand), **48 files** total with `.hdl` stubs

---

### GAP-3D-5: Simulation Engine Limitations (SIGNIFICANT)

**Blocks:** Correct evaluation of deep composite circuits
**Severity:** High — produces wrong results silently

**The problem:**
HACER's simulation engine (`simulationTick` in `simulationActions.ts`) uses a **three-step single-pass evaluation** within one Immer transaction:

```
Step 1: For each wire → if destination is gate input, copy source value (reads gate outputs from PREVIOUS tick)
Step 2: For each gate → evaluate logic function, write new output values
Step 3: For each wire → if destination is output node, copy source value (reads gate outputs from THIS tick)
```

Step 1 reads all gate output values *before* Step 2 updates them. This means gate inputs are always based on the *previous tick's* gate outputs. For a single-layer circuit (InputNode → Gate → OutputNode) this works fine in one tick. But for **multi-layer circuits**, each layer adds one tick of propagation delay.

**Example of failure:**
Building AND from NAND + NOT (2 layers):
```
InputNode(a) ──→ NAND ──→ NOT ──→ OutputNode(out)
InputNode(b) ──→ NAND ─┘
```
- **Tick 1:** Step 1 copies InputNode values to NAND's inputs AND copies NAND's *previous* output to NOT's input. Step 2 evaluates both gates — NAND produces the correct result, but NOT operates on NAND's stale value. OutputNode gets NOT's wrong output.
- **Tick 2:** Step 1 now copies NAND's correct output to NOT's input. Step 2 evaluates NOT correctly. OutputNode is correct.

A circuit with N layers of gates requires **N ticks** to propagate a change from input to output. This has two consequences:

1. **Continuous simulation looks glitchy** — intermediate wrong states are visible for `N × simulationSpeed` milliseconds before settling.
2. **Test script `eval` command** — If `eval` maps to a single `simulationTick()`, multi-layer circuits produce incorrect results. The web-ide's `eval` always produces the correct result in a single call because of topological ordering.

**The web-ide avoids this by:**
Using topological sorting in `Chip.wire()` — parts are evaluated in dependency order so upstream gates always run before downstream gates. A single `eval()` call produces the correct, fully-propagated result.

**What HACER needs (choose one approach):**

1. **Topological sort** — Order gate evaluation by dependency. Step 1 and Step 2 are merged: process gates in topological order, each reading its inputs (already updated by upstream gates) and writing its outputs. This is the web-ide approach and guarantees single-pass correctness.
2. **Multi-pass convergence** — Repeat the full three-step loop until no values change. Simpler to implement but slower; risks infinite loops in feedback circuits (requires a max-iteration guard).
3. **Hybrid** — Use topological sort for the `eval` command (test scripts), and either approach for continuous simulation.

---

### GAP-3D-6: No Circuit Persistence (SIGNIFICANT)

**Blocks:** Multi-session work on any chip
**Severity:** High — all work is lost on page refresh

**The problem:**
HACER stores circuit state in Zustand (in-memory). Refreshing the browser or closing the tab destroys the entire circuit. Since Project 1 has 15 components and each may take 15–60 minutes to design, users need to work across multiple sessions.

**What HACER needs:**

1. **Auto-save to localStorage** — Periodically save circuit state
2. **Named circuits** — Save circuits with chip names (e.g., "Not", "And")
3. **Circuit library** — List of saved circuits that can be loaded
4. **Export/import** — Export circuit as JSON or HDL; import from file

---

### GAP-3D-7: No Guided Chip Workflow Browser (MODERATE)

**Blocks:** User orientation and progress tracking
**Severity:** Medium — users can work without it but the experience is poor

**The problem:**
There is no guided chip workflow in HACER. The user sees a blank canvas with a gate selector. There is no:

- Project selector dropdown
- Chip list for the current project
- Progress tracking (which chips are completed)
- Chip specification display (what does this chip do?)
- Ordering guidance (recommended build order)

**What the web-ide does:**
Two dropdowns: project picker ("Project 1", "Project 2", ...) and chip picker ("Not", "And", ...). Selecting a chip loads its HDL stub, test script, and compare file. The chip list defines the recommended order.

**What HACER needs:**

1. **Workflow scope browser** — Sidebar section showing available compatibility scopes/projects
2. **Chip list** — Ordered list of chips in the active scope with completion status
3. **Chip spec display** — Show the chip's description, truth table, and expected interface when selected
4. **Chip stub loading** — When a chip is selected, pre-configure the canvas with the required I/O nodes

---

### GAP-3D-8: No Builtin Toggle for Experimentation (MINOR)

**Blocks:** Project 1 recommended workflow (tip #0)
**Severity:** Low — convenience feature

**The problem:**
Project 1 implementation tips specifically recommend:
> "Before implementing a chip, it is recommended to experiment with its builtin implementation."

HACER has no way to load a pre-built "reference" version of a chip for experimentation. Users can only build circuits from scratch.

**What HACER needs:**

1. **Builtin chip implementations** — Pre-built reference implementations for all 15 Project 1 chips
2. **Builtin toggle** — A button to switch between "custom implementation" and "builtin implementation" for any chip
3. **Interactive testing of builtins** — Set inputs, evaluate, see outputs for the builtin version

---

## Gap Analysis: HACER UI & General Infrastructure

This section covers UI and infrastructure gaps that affect both the 3D designer and any future HDL mode.

### GAP-UI-1: No HDL Editor Panel (BLOCKS HDL MODE)

**The problem:**
HACER's layout is: Sidebar (gate selector, I/O nodes, controls) + 3D Canvas. There is no text editor panel for writing HDL code. For HDL mode to work, the UI needs a code editor with:

- HDL syntax highlighting
- Auto-completion for chip names and pin names
- Error highlighting from the HDL parser
- Side-by-side view with 3D visualization (optional)

**What the web-ide does:**
Monaco editor with HDL mode. Edit HDL → auto-compile → see chip in pinout panel.

---

### GAP-UI-2: No Test Panel (BLOCKS VERIFICATION)

**The problem:**
The web-ide has a dedicated test panel with tabs for: Test Script (.tst), Compare File (.cmp), Output, and Diff. HACER has no equivalent. Even if test execution were implemented, there's no UI to:

- Display test scripts
- Show test progress (running test N of M)
- Show output table
- Show diff between actual and expected output
- Report pass/fail with error messages

---

### GAP-UI-3: No Pinout / Truth Table Display

**The problem:**
When working on a chip, users benefit from seeing:
- The chip's pin interface (inputs and outputs with current values)
- A truth table for the chip
- Real-time pin value updates during manual testing

The web-ide shows a `FullPinout` component with toggleable input pins and read-only output pins. HACER shows Circuit Info (counts of gates, wires, inputs, outputs) but no pin-level detail.

**What HACER needs:**

1. **Chip pinout panel** — Shows all I/O pins with names, widths, and current values
2. **Input value controls** — Toggle single-bit inputs, enter multi-bit values
3. **Manual eval button** — Evaluate the circuit and update output values without running continuous simulation
4. **Truth table generator** — Auto-generate and display the truth table for the current chip

---

### GAP-UI-4: No Multi-bit Value Display/Input

**The problem:**
When working with 16-bit chips, users need to:
- Set 16-bit input values (binary, decimal, or hex)
- See 16-bit output values in multiple formats
- The test scripts use formats like `%B0001001000110100` (binary) and `%D1234` (decimal)

Currently, InputNode3D shows "0" or "1" and toggles on shift+click. There is no way to input or display multi-bit values.

**What HACER needs:**

1. **Multi-format value display** — Show node values in binary, decimal, and hex
2. **Multi-bit input UI** — Input field or bit-toggle array for entering multi-bit values
3. **Format selector** — Let users choose display format (matching `.tst` output-list format specifiers like `%B1.16.1`)

---

### GAP-UI-5: No Error Reporting System

**The problem:**
When things go wrong (invalid wiring, missing connections, test failures), the user needs clear feedback. HACER has no error/status reporting system:

- No status bar with success/error messages
- No validation of incomplete circuits
- No warning for floating (unconnected) inputs
- No error messages from test execution

**What the web-ide does:**
Status bar with severity-colored messages: "Simulation successful: The output file is identical to the compare file" or "Simulation error: The output file differs from the compare file."

---

### GAP-UI-6: No Internal/Intermediate Wire Naming

**The problem:**
In HDL, chip implementations use **internal wires** — named signals that connect one part's output to another part's input without being exposed as chip-level I/O. For example:

```hdl
CHIP And { IN a, b; OUT out; PARTS:
    Nand(a=a, b=b, out=nandOut);  // nandOut is an internal wire
    Not(in=nandOut, out=out);
}
```

`nandOut` is neither an input nor an output of the chip — it's an intermediate connection. In the web-ide, internal wires are implicitly created by the chip builder when the same wire name appears in multiple parts' connections.

In HACER's 3D designer, wires connect pin-to-pin directly and have no user-visible names. The `Wire` type has an optional `signalId` field that could serve this purpose, but it's not used by any UI or simulation logic. For HDL round-tripping (converting a 3D circuit to/from HDL), internal wire naming is essential.

**What HACER needs:**

1. **Wire naming** — Ability to name wires (signals) in the 3D designer, especially for clarity and HDL export
2. **Internal signal tracking** — When converting a 3D circuit to HDL, automatically generate internal wire names for connections that aren't chip-level I/O
3. **Signal labels** — Optional visual labels on wires in the 3D view for debugging

---

### GAP-UI-7: Gate Types Missing from Type System

**The problem:**
HACER's `GateType` is `'NAND' | 'AND' | 'OR' | 'NOT' | 'NOR' | 'XOR' | 'XNOR'`. This is a fixed set of primitive gates. Project 1 requires users to *create* new chip types (Mux, DMux, Not16, etc.) that become available as building blocks.

The type system has no concept of:
- User-defined chip types
- Chips with variable numbers of inputs/outputs (DMux has 2 outputs, DMux4Way has 4, DMux8Way has 8)
- Chips with mixed-width pins (Mux16 has 16-bit `a`/`b` but 1-bit `sel`)

This is fundamentally tied to GAP-3D-1 (chip hierarchy) but manifests in the type system as an inflexible `GateType` union that cannot grow at runtime.

---

## Chip-by-Chip Readiness Assessment

### Chips Partially Possible in 3D (with major caveats)

| Chip | Can build from primitives? | Can test? | Can reuse? | Blocker |
|------|---------------------------|-----------|------------|---------|
| Not | Yes (1 NAND gate, both inputs tied) | No | No | GAP-3D-4, GAP-3D-1 |
| And | Yes (2 NANDs: NAND then NOT) | No | No | GAP-3D-4, GAP-3D-1, GAP-3D-5 |
| Or | Yes (~3 NANDs: NOT each input, then NAND) | No | No | GAP-3D-4, GAP-3D-1, GAP-3D-5 |
| Xor | Yes (~4+ NANDs) | No | No | GAP-3D-4, GAP-3D-1, GAP-3D-5 |

These chips CAN be physically wired in 3D from NAND gates, but:
- Without chip hierarchy, the user must rebuild NOT/AND/OR internals inside every chip (manually expanding the hierarchy — tedious and error-prone)
- Without test execution, the user cannot verify correctness using the official tests
- Multi-layer chips (And, Or, Xor) require multiple simulation ticks to converge due to the single-pass propagation model (GAP-3D-5) — a single `eval` would produce wrong results

### Chips Partially Possible (extremely tedious without hierarchy)

| Chip | Can build? | Notes |
|------|-----------|-------|
| Mux | Theoretically | Needs ~4 NAND gates + manual NOT expansions. No builtin Mux component. |
| DMux | Theoretically | Needs ~5 NAND gates + manual NOT expansions. |

### Chips Impossible in Current State

| Chip | Why | Primary Blockers |
|------|-----|-----------------|
| Not16 | Requires 16-bit I/O | GAP-3D-2 |
| And16 | Requires 16-bit I/O | GAP-3D-2 |
| Or16 | Requires 16-bit I/O | GAP-3D-2 |
| Mux16 | Requires 16-bit I/O + 1-bit sel | GAP-3D-2 |
| Or8Way | Requires 8-bit input | GAP-3D-2 |
| Mux4Way16 | 4×16-bit + 2-bit sel = 66 bits I/O | GAP-3D-2, GAP-3D-1 |
| Mux8Way16 | 8×16-bit + 3-bit sel = 131 bits I/O | GAP-3D-2, GAP-3D-1 |
| DMux4Way | Requires 2-bit sel bus | GAP-3D-2 |
| DMux8Way | Requires 3-bit sel bus | GAP-3D-2 |

### Summary Scorecard

```
Project 1 Chips:          15 total
Fully completable:         0  (no test verification possible)
Partially buildable:       6  (Not, And, Or, Xor, Mux, DMux — 3D wiring only, no reuse, no testing)
Impossible:                9  (require multi-bit buses)
```

---

## Priority Matrix

Gaps are ordered by the number of chips they unlock and the depth of the blocking dependency.

| Priority | Gap | Unlocks | Effort | Phase 0.5 Planned? |
|----------|-----|---------|--------|-------------------|
| P0 | GAP-3D-1: Chip hierarchy | All 15 chips become practical | High (design 6h + impl 10h+) | Yes (design + expansion) |
| P0 | GAP-3D-2: Multi-bit buses | 9 chips become possible | High | Implicitly via HDL |
| P0 | GAP-3D-4: Test execution | Verification of all chips | High (design 4h + impl 36h) | Yes |
| P1 | GAP-3D-3: Chip I/O definition | Formal chip creation in 3D | Medium | Partially (via HDL) |
| P1 | GAP-3D-5: Simulation engine | Correct results for deep circuits | Medium | Not explicitly |
| P1 | GAP-UI-2: Test panel | Displaying test results | Medium | Not explicitly |
| P1 | GAP-UI-3: Pinout display | Manual testing workflow | Medium | Not explicitly |
| P2 | GAP-3D-6: Circuit persistence | Multi-session work | Medium | Not in 0.5 |
| P2 | GAP-3D-7: Guided chip workflow browsing | User orientation | Medium | Not explicitly |
| P2 | GAP-UI-4: Multi-bit value I/O | Working with 16-bit chips | Medium | Not explicitly |
| P2 | GAP-UI-5: Error reporting | User feedback | Low-Medium | Not explicitly |
| P2 | GAP-UI-1: HDL editor | HDL mode | Medium | Yes (parser/compiler) |
| P2 | GAP-UI-6: Internal wire naming | HDL round-tripping, clarity | Low-Medium | Not explicitly |
| P3 | GAP-3D-8: Builtin toggle | Experimentation aid | Low | Not explicitly |
| P3 | GAP-UI-7: Extensible type system | Runtime chip types | Low (follows from GAP-3D-1) | Implicitly |

---

## Comparison with Web-IDE

| Capability | Web-IDE | HACER 3D | HACER HDL (planned) |
|-----------|---------|----------|-------------------|
| NAND as primitive | Built-in class | NAND gate component | Planned |
| Chip hierarchy | `ChipBuilder.wireParts()` recursive resolution | Not implemented | Planned in Phase 0.5 |
| 16-bit buses | `Bus` class with `busVoltage` bitmask, `InSubBus`/`OutSubBus` slicing | `width` field exists but unused | Planned in Phase 0.5 |
| HDL parsing | Ohm grammar (`hdl.ohm`) → AST → `ChipBuilder` | Not implemented | Planned in Phase 0.5 |
| Test scripts | Ohm grammar (`tst.ohm`) → instructions → `ChipTest` execution | Not implemented | Planned in Phase 0.5 |
| Compare files | Ohm grammar (`cmp.ohm`) → cell comparison | Not implemented | Planned in Phase 0.5 |
| Project organization | `CHIP_PROJECTS` map, project/chip dropdowns | Not implemented | Not planned |
| Chip interface | HDL `IN`/`OUT` declarations | InputNode/OutputNode (auto-named `in0`/`out0`, names not displayed, no rename) | Planned via HDL |
| Internal wires | Implicit named signals in HDL | `signalId` field exists but unused | Not planned |
| Evaluation order | Topological sort in `Chip.wire()` | Three-step single-pass (N ticks for N layers) | Not planned |
| Builtin toggle | `BUILTIN` keyword + registry toggle | Not implemented | Not planned |
| Circuit persistence | In-browser filesystem | Not implemented | Not planned in 0.5 |
| Multi-bit display | Binary/decimal/hex in pinout and output | Single-bit toggle only | Not planned |
| Error messages | Status bar with severity | Not implemented | Not planned |

---

## Recommendations

### Minimum Viable for Project 1 (3D Designer)

To allow users to complete all 15 chips via 3D designer:

1. **Chip hierarchy system** — Define, package, instantiate, and evaluate composite chips
2. **Multi-bit bus system** — Bus nodes, bus wires, bus splitters/joiners, multi-bit simulation
3. **Chip I/O definition** — Declare chip interface, auto-place I/O nodes
4. **Test execution** — Parse and run `.tst` scripts, compare against `.cmp` files
5. **Topological simulation** — Correct evaluation order for multi-layer circuits
6. **Test results UI** — Display pass/fail, output diff
7. **Circuit persistence** — Save/load circuits (at minimum localStorage)

### Minimum Viable for Project 1 (HDL Mode)

To allow users to complete all 15 chips via HDL text:

1. **HDL parser** — Parse HACK HDL (already planned in Phase 0.5)
2. **HDL compiler** — Build chips from parsed HDL with recursive chip-part resolution
3. **Built-in chip registry** — At minimum: Nand
4. **Multi-bit bus support** — Core simulation of bus values
5. **Test execution** — Same as 3D mode
6. **HDL editor UI** — Code editor panel with syntax highlighting
7. **Test results UI** — Same as 3D mode

### What's Missing from the Phase 0.5 Roadmap

The Phase 0.5 roadmap (`docs/roadmap/phases/phase-0.5-nand2tetris-foundation.md`) plans HDL parsing, test execution, and sequential logic. However, it does not explicitly address:

- **3D-specific gaps:** Chip I/O definition workflow for 3D, visual bus support, bus splitter/joiner components, composite chip rendering in 3D
- **UI panels:** Test results panel, pinout panel, chip definition panel, error reporting
- **Simulation ordering:** Topological sort or multi-pass convergence
- **Guided chip workflow browsing:** Scope/project browser, chip list, progress tracking
- **Persistence:** Circuit save/load
- **Multi-bit value I/O:** UI for entering/displaying 16-bit values

These are critical for the 3D designer use case and should be incorporated into Phase 0.5 planning.

---

## Appendix: Project 1 Test Data Requirements

HACER must bundle or generate the following files for Project 1:

| Chip | `.hdl` stub | `.tst` script | `.cmp` compare | Test cases |
|------|-----------|-------------|--------------|-----------|
| Nand | BUILTIN | Yes | Yes | 4 |
| Not | Yes | Yes | Yes | 2 |
| And | Yes | Yes | Yes | 4 |
| Or | Yes | Yes | Yes | 4 |
| Xor | Yes | Yes | Yes | 4 |
| Mux | Yes | Yes | Yes | 8 |
| DMux | Yes | Yes | Yes | 4 |
| Not16 | Yes | Yes | Yes | 5 |
| And16 | Yes | Yes | Yes | 5 |
| Or16 | Yes | Yes | Yes | 5 |
| Mux16 | Yes | Yes | Yes | 5 |
| Mux4Way16 | Yes | Yes | Yes | 8 |
| Mux8Way16 | Yes | Yes | Yes | 12 |
| DMux4Way | Yes | Yes | Yes | 8 |
| DMux8Way | Yes | Yes | Yes | 16 |
| Or8Way | Yes | Yes | Yes | 5 |

**Total:** 16 HDL stubs + 16 test scripts + 16 compare files = **48 validation files** (15 standard component chips + Nand primitive row in the table above).

These are available in the web-ide's `projects/src/project_01/` directory. The nand2tetris test materials are licensed under [Creative Commons Attribution-NonCommercial-ShareAlike 3.0 Unported](https://creativecommons.org/licenses/by-nc-sa/3.0/) (CC BY-NC-SA 3.0). Any redistribution must comply with this license.
