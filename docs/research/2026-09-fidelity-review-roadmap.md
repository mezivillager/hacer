# Fidelity review — the roadmap against digital logic and device physics

**Date:** 2026-09-18 · **Role:** `hacer-fidelity` (`docs/harness/fidelity-brief.md`, ADR-0018) ·
**Issue:** #268 · **Artifacts:** `docs/roadmap/vision.md`, `docs/roadmap/implementation.md`, the
0.5 → 0.7 ladder (`docs/roadmap/phases/phase-0.5-nand2tetris-foundation.md`,
`phase-0.6-arithmetic-sequential.md`, `phase-0.7-computer-architecture.md`), the "one engine"
question (#190), and the below-the-NAND ambition in `docs/north-star.md`.

Verdicts: `sound` · `unsound: why` · `hand-wavy: what is missing` · `unverified`. Each names its
frame: **N2T** (the nand2tetris model: zero delay, two-valued, tick/tock), **DD** (standard digital
design: delays, setup/hold, feedback) or **PHY** (device physics). Proposals are queued in
`docs/harness/fidelity-inbox.md` as FID-001…005; nothing is filed or applied.

## Ground truth used

| Domain | Source (fetched / read 2026-09-18) |
|---|---|
| Oracle | Official vectors as shipped with the reference: `../web-ide/projects/src/project_03/01_bit.ts` (`Bit.cmp`), `../web-ide/projects/src/project_05/03_computer.ts` (`ComputerAdd.cmp`); HACER's runner `src/core/testing/engine.ts` |
| N2T spec | Nisan & Schocken, *The Elements of Computing Systems*, **Appendix A: HDL**, §A.7 "Sequential Chips" / "The Clock" / "Clocked Chips and Pins" / "Feedback Loops" (PDF from nand2tetris.org). nand2tetris.org/software: "We recommend using the new IDE" — so the web IDE is the current reference |
| N2T reference code | `../web-ide/simulator/src/chip/clock.ts`, `chip.ts` (`sortParts`, `wireInPin`, `ClockedChip`), `builtins/sequential/dff.ts`, `builder.ts` (clocked-pin inference), `../web-ide/simulator/src/test/chiptst.ts` (`tick`/`tock`) |
| DD | Logisim user guide, "Value propagation → Gate delays / Oscillation errors" (cburch.com, 2.7 docs); Verilator 5.052 docs, "Input languages" (2-state, `--timing`); DigitalJS `src/cells/base.mjs` (`propagation: 1`, `3vl`); Wikipedia "Flip-flop (electronics)" and "Logic simulation" as secondary locators only |
| PHY | Bryant, "A Switch-Level Model and Simulator for MOS Digital Systems", *IEEE Trans. Computers* C-33(2), 1984, pp. 160–177; "MOSSIM", DAC 1981; "COSMOS", DAC 1987 — citations verified on cs.cmu.edu/~bryant/pubs.html; **PDF text not extractable this session**, so the model description below is from the papers' well-known abstracts and is marked `unverified` where it matters |
| Current practice | Tiny Tapeout FAQ (sky130 / IHP sg13g2, OpenLane + Yosys, shuttles through 2026); NVlabs VerilogEval README (v2, Aug 2024, iverilog testbench vs reference) |

## 1. `docs/roadmap/vision.md`

| Claim (where) | Verdict | Ground truth |
|---|---|---|
| "Build complete computers from NAND gates … nand2tetris as a compatibility baseline" (Vision) | sound (N2T) | The 12 projects bottom out at a builtin `Nand`; Project 1–5 vectors exist in `../web-ide/projects/src/` |
| "Phase 2 … Timing Analysis: Propagation delays and setup/hold times" (Core Evolution Path) | **hand-wavy** (DD): names a capability the chosen model cannot produce | Appendix A §A.7: "The operation of combinational chips is instantaneous." A zero-delay two-phase model has no propagation delay, so no setup/hold. This needs a delay-model engine (Logisim: "Every component has a delay associated with it") or a timing library — a separate engine mode, not a feature of the N2T engine |
| "Deterministic execution … Predictable timing behavior" (Principle 9) | sound (N2T) once "timing" means tick count, not nanoseconds | `../web-ide/simulator/src/chip/clock.ts`: time is an integer `ticks` plus a `+` for the high phase |
| "Worker-based simulation for parallel execution" (Principle 8) | hand-wavy: parallelism is over independent sub-DAGs or over test vectors, not over one topologically ordered pass | `src/simulation/topologicalEval.ts:255` evaluates one order sequentially; nothing in the repo measures a worker split |
| "<16ms simulation for 1000 gates", "60fps ≤1000 gates, 30fps ≤10K gates" (Standards, Budgets) | **unverified**: no benchmark exists in `src/` or `scripts/` | Would need a measured fixture (e.g. a 1000-gate Project-1 netlist through `evaluateCircuit`) |
| "Sequential Logic: Clocked components and state management" listed as a Phase 0.5 gap | sound as a gap; see §3 for what closing it requires | `src/core/chips/types.ts:7` — `BuiltinEvalFn = (inputs) => outputs`, no state |

## 2. `docs/roadmap/implementation.md` and `docs/roadmap/README.md`

| Claim | Verdict | Ground truth |
|---|---|---|
| "Completed infrastructure … mutation workflow, scheduled UI E2E" | unsound (stale) | ADR-0011 removed Stryker; ADR-0012 made E2E manual-only |
| Phase 0.5 checklist: "[ ] HDL compiler and chip-part resolution", "[ ] Test execution engine" | unsound (stale): both exist and are wired | `src/core/hdl/compiler.ts` (`compileHDL`), `src/core/testing/engine.ts` (`runTest`), used from `src/simulation/topologicalEval.ts:3-5` |
| "0.6 Sequential primitives … Tick/tock-compatible tests" as a metric | sound as a metric; the semantics it must match are in §3 | `Bit.cmp` rows below |
| "Simulation correctness drift — mitigate with compatibility fixtures before UI wiring" | sound; it is the fidelity gate in one line | ADR-0018 §3 |

ADR-0013 already demotes this file's status to a historical pointer (#148); the stale rows above
are evidence for finishing that, not a new proposal.

## 3. The 0.5 → 0.7 ladder

### 3.1 Phase 0.5 — combinational evaluation and cycles

| Claim | Verdict | Ground truth |
|---|---|---|
| §0.5.6 "Cycle detection: combinational feedback loops are reported as errors" | sound (N2T) — and it is what the code does | Appendix A "Feedback Loops": a loop that does not pass through a clocked pin → "the simulator stops processing and issues an error message … to avoid uncontrolled data races." Reference: `chip.ts:681-687` rejects the wire ("Circular pin dependency"). HACER: `topologicalEval.ts:117-123` returns `cycle` with `involvedGateIds`; `compiler.ts:155-157` fails compilation ("Cyclic part dependency") |
| §0.5.6 "Falls back to multi-pass convergence with max-iteration guard if topological sort is impractical" | **unsound as a plan** (N2T): a convergence fallback would *accept* loops the oracle rejects, i.e. diverge from the reference on exactly the inputs it refuses | Same passage; not implemented (`evaluateCircuit` returns without mutating, `topologicalEval.ts:220-224`), and should stay unimplemented in the N2T engine. Iteration-to-convergence is the Logisim model ("If the circuit simulation seems to many iterations, then it will simply give up and report oscillation") — a different engine, see §5 |
| Does HACER's single pass match the reference for feedback? | sound in outcome, different in where it is caught | The reference rejects the *wire* at build time so a loop never exists in a built chip; HACER lets the canvas hold the loop and refuses the *step* (`simulationActions.ts:55-71`, "This simulation step had no effect"). Gates outside the loop are also not evaluated; the reference has no equivalent state, so no vector covers it — a UX difference, not an oracle divergence |
| `compiler.ts:139` ignores a part reading its own output (`p !== i`) | unverified against the reference: Appendix A calls `Not(in=loop1,out=loop1)` invalid; the reference's `wireOutPin`/`wireInPin` path was not traced for the self-loop case | Needs one test: compile `Not(in=x, out=x)` and expect a cycle error |

### 3.2 Phase 0.6 — DFF, clock, tick/tock (the headline finding)

| Claim | Verdict | Ground truth |
|---|---|---|
| §0.6.1 "DFF … On rising clock edge: output takes the input value" | **unsound (N2T)** | Appendix A §A.7: "During the first phase of the time unit (tick), the inputs of each sequential chip … are read and affect the chip's internal state … During the second phase (tock), the outputs of the chip are set to the new values. Hence … its output pins stabilize to new values only at tocks." Reference `dff.ts`: `tick()` reads `in` into internal `t`; `tock()` writes `t` to `out`. Oracle `Bit.cmp`: row `3+` (after `tick` with in=1, load=1) has `out=0`; row `4` (after `tock`) has `out=1` |
| §0.6.3 "tick — … apply rising-edge state changes; tock — … apply falling-edge state changes"; `onClockEdge(edge: 'rising' \| 'falling')` | **unsound (N2T)**: this is a two-edge model; the reference is sample-on-tick / commit-on-tock with one internal state | Same sources; `chip.ts:747-756` — a `ClockedChip` calls `tick()` on HIGH and `tock()` on LOW, nothing else. `chiptst.ts:104-111`: a script `tick` is `chip.eval()` **then** `clock.tick()`; `tock` likewise. A rising-edge-commit DFF fails `Bit.cmp` at row `3+` |
| §0.6.1 "Clock … tick (0→1) and tock (1→0)" | sound | `clock.ts:63-75`: `tick` asserts LOW→HIGH; `tock` HIGH→LOW and `ticks += 1` |
| §0.6.1 "Deterministic ordering: clock edge effects apply simultaneously to all clocked components" | sound in intent; the mechanism is that `tick` only reads and `tock` only writes, so order among clocked parts cannot matter | `dff.ts` |
| How a chip with feedback through a DFF (Bit: `Mux → DFF → Mux`) is scheduled | **missing from the plan**; today's compiler would reject `Bit.hdl` as a cycle | Appendix A: a loop "through a clocked pin" is allowed. Reference `chip.ts:614-618, 675-679`: an edge into a `clockedPins` pin is not a dependency; `builder.ts:242-246` infers a composite chip's clocked pins as those with no in→out path (`isClockedPin`), so clockedness propagates upward (book: "checked recursively"). HACER: `src/core/hdl/types.ts:30` reserves `clocked?: string[]`; `compiler.ts` step 4 cuts nothing |
| Oracle `time` column (`output-list time%S1.4.1`) and `N` / `N+` values | missing from the plan and the engine | `clock.ts:88`: `${ticks}${HIGH ? "+" : ""}`. `engine.ts:90-95` emits only `lastOutputs[col] ?? inputs[col]`; `tstParser.ts:274-282` rejects `tick`/`tock`/`repeat`/`while` (#207) |
| The chip model can host a DFF | **unsound as it stands**: `BuiltinEvalFn` is a pure function and `compileHDL` caches one closure per *definition* (`evaluateChip.ts:12`, `WeakMap`) — two `DFF` parts, or two instances of one chip, have nowhere to keep separate state | Reference: one `Chip` object tree per instantiation (`chip.ts:483` `this.parts.push(part)`) with per-instance pins; `Register`/`PC` keep `bits` on the instance |
| §0.6.2 "RAM16K: <50MB memory via sparse storage … <1MB for typical test runs" | **hand-wavy**: the number is right and the reasoning misplaced — a dense `Uint16Array(16384)` is 32 KB, smaller than a `Map` with a few hundred entries; the real cost is a *hierarchical* RAM16K = 16 384 × 16 = 262 144 DFF instances plus mux/dmux trees per `eval` | The reference ships RAM chips as builtins (`builtins/sequential/ram.tsx`) and uses them as parts; a policy for substituting a builtin for a user chip used as a part is the actual scaling decision |
| §0.6 exit "Clock signals propagate deterministically" | hand-wavy wording: in HDL the clock is not a signal on any pin (a DFF has `in`/`out` only); it is global state | `clock.ts` singleton; Appendix A "CLOCKED pin" declares dependence, it does not wire a clock |

### 3.3 Phase 0.7 — the Hack computer

| Claim | Verdict | Ground truth |
|---|---|---|
| Memory map 0x0000–0x3FFF RAM16K, 0x4000–0x5FFF Screen (8K words, 256×512 px), 0x6000 Keyboard; CPU pins `inM[16], instruction[16], reset → outM[16], writeM, addressM[15], pc[15]` | sound | `../web-ide/projects/src/project_05/` fixtures and the CPU builtin's pin lists (`computer.tsx:248-252`) |
| §0.7.5 "Reset (set PC to 0, clear registers)" | **unsound at chip level**: `reset` resets PC only | `ComputerAdd.cmp` row 7: `reset=1` → `PC=0`, `DRegister` stays 5. (A GUI "reset everything" button is a different, legitimate action — the roadmap conflates the two) |
| Project 5 vectors run on a pure-function evaluator | **unsound as it stands**: the official scripts read and write *internal part state* by name | `03_computer.ts`: `output-list … ARegister[0] DRegister[0] PC[] RAM16K[0]`, `set RAM16K[0] 0`, `ROM32K load Add.hack`. `engine.ts:90-95` can only see chip-level pins. Named, addressable part instances (and memory cells) are a prerequisite for the 0.7 oracle, not a UI nicety |
| "Project 4 test programs … tested by running them on the Computer chip" | sound as a design choice; note the reference tests Project 4 in the CPU emulator, and Project 5's `ComputerAdd/Max/Rect` are the hardware-simulator vectors | `03_computer.ts` (`repeat 63 { tick, tock, output; }` for Rect) |
| "<200ms per instruction cycle" | hand-wavy: unmeasured, and at 5 instructions/s a `Fill`-class loop is not interactive unless lower chips run as builtins | No benchmark in repo |

## 4. #190 — "one engine": lower the canvas onto `compileHDL`

Both schedulers today are the same algorithm — a static topological order of parts/gates over
signal reads and writes, one pass, cycle → refuse (`compiler.ts` step 4; `topologicalEval.ts:68-124`).
For combinational Project 1 that matches the reference (`sortParts`, `chip.ts:500-544`), so lowering
preserves semantics **today**. It preserves them in 0.6 only if the single engine gains, before the
lowering: (a) per-instance state (a chip *instance* tree, not a cached closure per definition);
(b) clocked-pin declaration (`CLOCKED`) and inference (no in→out path) with dependency edges cut at
clocked inputs; (c) `tick` = eval then sample, `tock` = commit then eval, with the `N`/`N+` time
counter; (d) named part addressing for `output-list`/`set`/`load` on internals. Verdict on #190:
**sound and necessary** (implementing (a)–(d) twice is the risk), with the order reversed — the
instance model is the ADR's first decision, the lowering its consequence. One difference to settle
in the spike: `compileHDL` errors on an unconnected part input (`compiler.ts:119-123`) while the
canvas reads a missing input as 0 (`topologicalEval.ts:152`); the reference's behaviour for an
unwired input pin was **not verified** this session.

## 5. Below the NAND (`docs/north-star.md`)

The NAND is where N2T's abstraction bottoms out on purpose: Boolean, zero delay, two values, no
metastability. "Extending downward" is three different engines, and only the honest one at each
tier is real:

1. **Gate level with delays (DD).** Event-driven, unit or inertial delay, at least a third value
   (X) and an oscillation cap. This is what makes a cross-coupled-NAND SR latch and a NAND-built
   master–slave DFF *behave* rather than be rejected (Logisim: "the AND gate will briefly see two
   1 inputs, and it will emit a 1 briefly"; DigitalJS: `propagation: 1` per cell, 3-valued vectors).
   The oracle for this tier already exists: a DFF built from NANDs must pass the same `DFF`/`Bit`
   vectors, through the delay engine, that the builtin passes through the N2T engine.
2. **Switch level (PHY, digital).** Transistors as bidirectional switches with strengths, node
   states 0/1/X, stored charge (Bryant 1984; MOSSIM; COSMOS). A CMOS NAND is two parallel pMOS
   pull-ups and two series nMOS pull-downs; at this tier the simulator *derives* NAND behaviour
   from four switches, and can show pass-transistor logic and bus contention. `unverified`: the
   papers' text was not readable this session; the model summary is from their abstracts.
3. **Circuit level (PHY, analog).** SPICE-class transient analysis with device models from a PDK;
   the only tier where propagation delay, setup/hold and noise margins are physical quantities.

**What would be fake:** transistor glyphs wired to a Boolean truth table; a "propagation delay"
number with no delay model behind it; "setup/hold analysis" in a zero-delay engine; calling tier 1
"physics". The roadmap's Phase 2 "Timing Analysis" (§1) sits at tier 1 at best. Current practice
(2026) makes tier 3 reachable for real: Tiny Tapeout fabricates hobby designs on open PDKs
(sky130, IHP sg13g2) through Yosys/OpenLane, from Verilog or a Wokwi schematic — the honest end of
"below the NAND" is a netlist that could be taped out, not a prettier gate.

## 6. Current practice, 2025–2026, for the same problems

- **Cycle-based, 2-state simulation is the production norm for RTL** (Verilator: "mostly a
  two-state simulator"; delays ignored without `--timing`). N2T's engine is a cycle-based
  simulator with a two-phase clock — a respectable, not a toy, model.
- **Event-driven with delays is the teaching norm for feedback** (Logisim, DigitalJS). Both refuse
  to *pretend*: oscillation is reported, not resolved.
- **AI-assisted hardware design is judged by simulation against a reference** (VerilogEval v2,
  Aug 2024: generated RTL passes or fails an iverilog testbench). That is the shape of ADR-0018 §3
  — the oracle is the grader, for humans and agents alike.

## 7. Proposals (queued in `docs/harness/fidelity-inbox.md`; nothing filed)

- **FID-001** (#139 spine) — Adopt the reference clock contract for 0.6: tick samples, tock
  commits; `N`/`N+` time; `Bit`/`Register`/`PC`/`RAM8` vectors as the exit test. Rewrites §0.6.1/§0.6.3.
- **FID-002** (#140 core) — Chip instance model before "one engine": per-instance state, `CLOCKED`
  declaration + inference, edges cut at clocked pins, named part addressing. Input to #190's ADR.
- **FID-003** (#139 spine) — Roadmap corrections: drop the convergence fallback (§0.5.6), the
  rising/falling-edge API (§0.6), "reset clears registers" (§0.7.5); state that combinational loops
  are rejected by design and that DFF-from-NAND belongs to the delay engine.
- **FID-004** (#147 horizon) — "Below the NAND" as three engine tiers, first step a delay-model
  engine whose acceptance is a NAND-built DFF passing the builtin's vectors.
- **FID-005** (#139 spine) — Honest scale budgets for 0.6/0.7: builtin-substitution policy for
  hierarchical RAM, measured budgets from a fixture, and a Project-5 exit tied to the
  `ComputerAdd/Max/Rect` vectors plus an interactive `Fill`.

## 8. Could not verify (say so, do not fill)

- The reference's behaviour for an **unwired part input pin** (0? error?) — not traced.
- Whether the reference rejects a **direct self-loop** (`Not(in=x,out=x)`) on the `wireOutPin`
  path — Appendix A says invalid; the code path was not traced.
- The **switch-level model details** (strengths, charge sharing) — citations verified, PDF text
  not extractable; do not treat §5 tier 2 as checked.
- Every **performance number** in the roadmap — no benchmark exists to check against.
- **Appendix B** (test scripting language) was not fetched; `time` format is taken from the
  reference code and the official `.cmp` files, which are the oracle anyway.
- Web search was unavailable in this session (budget exhausted); current-practice sources are
  direct fetches of known URLs, so the survey is narrower than the brief asks for. A later digest
  should widen it.
