# Fidelity review: the spine epic #139 and the Phase 0.6 plan #177, before Project 2 is built

- **Date:** 2026-10-23 · **Role:** `hacer-fidelity` (`docs/harness/fidelity-brief.md`, ADR-0018) ·
  **Issue:** #982 · **Decisions:** JDG-004 (#970), R895
- **Artifacts:** #139's body; #177's body and its two comments; the Project 2 parts of
  `docs/roadmap/phases/phase-0.6-arithmetic-sequential.md`. Project 3's claims cite
  `docs/research/2026-09-fidelity-review-roadmap.md` §3.2 rather than redo it.
- **Base:** `origin/main` `100e3993` (the two later commits touch only the store's autosave). Web IDE at
  `91ef428` (`../web-ide`) and at the differential's pin `52611ad`, with identical results on both.
- **Stopping condition:** every claim below has a verdict, the three questions in #982 have answers,
  and each slice has a ruling.
- **Verdict:** mixed. #139 is sound on headless-first and hand-wavy on its metric. #177 is sound on
  its blockers and on #357, and hand-wavy on the sidecar binding and on what Project 2 needs. The
  page's Project 2 chip list is sound, but two of its lines are stale.
  **Two shipped divergences from the oracle block the slices whatever the builtins do.** They are
  reported to the coordinator with a repro and not filed (D1, D2).

## Domain and frame
The domain is combinational arithmetic, HDL part resolution and `.tst`/`.cmp` grading. Every verdict
uses the **N2T** frame (zero delay, two values). Project 2 has no clock, and none of its six scripts
uses `repeat`, `while`, `tick` or `tock` (0 hits in `conformance/vectors/02/*.tst`). A 16-bit ripple
carry has 16 gate delays in the digital-design frame. No artifact here claims timing, so no physics
verdict is owed.

## Ground truth used
1. **The oracle.** The vendored `conformance/vectors/02/` holds 17 files: 5 stub `.hdl`, 6 `.tst`
   and 6 `.cmp`. `ALU-basic.tst:11` loads `ALU.hdl`. HACER's engine is `src/core/testing/`.
2. **The reference simulator**, read-only:
   - `../web-ide/simulator/src/chip/builtins/arithmetic/` holds the builtins:
     `half_adder.ts:12`, `full_adder.ts:19`, `add_16.ts:9` and `inc16.ts:10`. In `alu.tsx:41-81`,
     `ALU` calls `cpu/alu.ts:253`.
   - `REGISTRY` and `hasBuiltinChip` are at `builtins/index.ts:68-129`.
   - `chip/builder.ts` gives the part lookup in `loadChip` (`:43-76`; `:48` checks the builtin
     first). It wires parts at `:262`, and a `BUILTIN` body runs at `:233-235`.
   - The test grammar is `languages/grammars/tst.ohm:9-10`. `test/builder.ts:131-135` handles step
     ends. `output.ts:54-64` writes the header and `compare.ts:35` compares lines.
3. **The legacy desktop simulator**, from a source mirror of v2.5.7 (github.com/chuckb/nand2tetris at
   `8766852`, read through the GitHub API on 2026-10-23):
   - `BuiltInChipsSource/ALU.java` calls `Hack/Utilities/Definitions.java:426-447`
     (`computeALU`).
   - `Hack/Gates/GatesManager.java:167-181` (`getHDLFileName`) gives its part lookup.
4. **The book.** `ALU.hdl`'s header states the bitwise definition (`if (zx == 1) sets x = 0` …).
   ADR-0020 §1.11 rule 4 quotes Appendix A §3's lookup order: the working directory first, then the
   builtins.
5. **HACER on `main`**, read as code: `src/core/testing/testChip.ts`, `engine.ts` and
   `tstParser.ts`; `src/core/chips/appRegistry.ts` and `referenceBuiltins.test.ts`;
   `src/core/spec/parseSpec.ts` and `types.ts`. ADR-0020 §1.3, §1.11 rules 4–5 and §6 row 14.

## How it was measured
- The reference ran from a scratch copy of `simulator/src`, bundled with esbuild, against
  `ohm-js@17.5.0`, `@davidsouther/jiffies@2.2.5` and `rxjs@7.8.2`. Nothing was built into either repo.
  Parts resolve as the differential resolves them (`builder.parse`, no file system), except for the
  precedence probe, which gives the builder an in-memory file system.
- HACER's `testChip`, `runCli run-tst`, `runTest` and `parseSpec` ran from a scratch esbuild bundle of
  `src/` at the base.
- Three HDL sets were run on all six scripts:
  - the course stubs;
  - course-shaped solutions that use Project 2 parts;
  - the same five chips built from Project 1 chips only, so that they grade on today's registry.
- The comparison of the reference's `.out` with HACER's is the differential's own rule
  (`conformance/differential/harness.ts:78-87`), applied by hand.

## Measured results

| Case | Reference | HACER `testChip` | Differential rule |
|---|---|---|---|
| Builtin as the chip under test, all 6 scripts | 6/6 pass | — | — |
| Stub `.hdl`, all 6 scripts | 6/6 fail | 5 fail, `ALU`: parse error | 5 `rejected`, `ALU`: error |
| Course shape (Project 2 parts) | 6/6 pass | HalfAdder fail (D1); the other 5 `Unknown chip-part` or a parse error | — |
| Project 1 parts only | 6/6 pass | FullAdder, Add16, Inc16, ALU-basic pass; **HalfAdder fail (D1); ALU parse error (D2)** | 5 AGREE, ALU error |
| Course shape, earlier Project 2 chips given as HDL parts | — | FullAdder 8/8, Add16 6/6, Inc16 4/4, ALU-basic 36/36 | — |

- **Precedence, measured in the reference.** An in-memory directory held a deliberately wrong
  `HalfAdder.hdl`, which fails `HalfAdder.tst`. A FullAdder that uses `HalfAdder` parts beside it
  **passes**, because the builtin wins. The same wrong body under `MyHA`, which no builtin has,
  makes the FullAdder **fail**, so the file is read only for a name the builtins lack. With no
  `MyHA.hdl` present the build fails with `Line 2: Undefined chip name: MyHA`.
- **The reference's ALU builtin.** `alu()` (`cpu/alu.ts:253-316`) is a table of the 18 Hack
  operations. Any other control word falls through to `o = 0`.
  - Over all 64 control words and a 64 × 64 input grid, it differs from the bitwise definition
    `alua()` (`:318`), which `REGISTRY` does not use, on **36 of 64 control words**.
  - It differs on none of the 18 documented ones. The other 10 undocumented words compute 0
    anyway.
  - Inside the reference itself, at x=17, y=3, the course `ALU.hdl` and the builtin `ALU` disagree
    on 36 of 64 words too. For example, at `zx=1, no=1` the HDL gives 65535 and the builtin gives 0.
  - `ALU.tst` and `ALU-basic.tst` exercise only the 18 documented words, 36 rows each.
- **The spec path with the default registry.** `parseSpec` on a course-shaped FullAdder reports
  `unknown-chip: Unknown chip "HalfAdder"`, and on Inc16 `Unknown chip "Add16"`.

## D1, D2: shipped behaviour that diverges from the oracle (reported, not filed)
- **D1. `hacer test` cannot pass HalfAdder on its official files.**
  - `HalfAdder.cmp`'s header is `| a | b |sum|car|`: the reference cuts a header name to its
    column's width (`output.ts:60-61`) and compares text lines (`compare.ts:35`).
  - `runTest` binds each `.cmp` column by its header text (`src/core/testing/engine.ts:166`,
    `values[c.name] ?? 0`), so `car` binds to nothing and reads 0.
  - A correct HalfAdder (`Xor` + `And`) fails at row 4: `car: expected 1, got 0`. The reference
    passes it, and the differential **agrees**, because HACER's printed `.out` is the `.cmp`. So two
    HACER paths disagree.
  - Rows 1–3 pass only because the carry is 0 there.
  - Other vendored headers that name no output-list column: `05/CPU.cmp` and `05/CPU-external.cmp`
    (`addre`, `DRegiste`), and `05/Computer{Add,Max,Rect}.cmp` (`ARegister`, `DRegister`). These are
    Project 5 and were not run.
- **D2. `02/ALU.tst` does not parse.**
  - `ALU.tst:11:1: 'set' must end with ','` comes from `src/core/testing/tstParser.ts:393`. Lines 11
    and 194 end a `set` with `;`.
  - The reference lets any command end with `,`, `;` or `!` (`tst.ohm:9-10`). A `;` only marks the
    step's end (`test/builder.ts:131-135`).
  - With those two lines re-terminated in a scratch copy, a Project-1-only ALU passes `ALU.tst`
    36/36 on HACER.
  - #207's body lists this case under Out and attributes it to #177, but no issue carries it.

## Verdicts: #139 (spine epic)

| Claim | Verdict | Source |
|---|---|---|
| "Progress is: Conformance pass count for the current phase" | **hand-wavy:** nothing measures it, and its unit and scope are unstated | Mission Control has no runner (`scripts/mission-control/collect.logic.test.mjs:710`, #950, #194). Project 2 is 6 scripts over 5 chips. "Current phase" is 0.5 (`.cursorrules:13`), while R895 runs Project 2 beside it (#983). D1 makes `testChip` and the differential count HalfAdder differently |
| "Headless first: kernel + scenario + CLI/HDL binding land before the 3D binding" | sound | The oracle is headless: the web IDE's grader runs the same builder with no view (`../web-ide/cli/src/grading.ts`), and ADR-0018 §3 makes the oracle the grader. #984 and #985 follow it: scenarios plus the core, CLI and MCP drivers, with no view |

## Verdicts: #177 (Phase 0.6 plan)

| Claim | Verdict | Source |
|---|---|---|
| The C9 blocker is ADR-0020 §9, accepted 2026-09-23 (one evaluator: `compileHDL` and the registry), implemented by #378 | sound | ADR-0020's status line; §9 absorbs #190; #378 closed 2026-10-15 |
| "Clock/DFF work is … only [waiting] on that implementation" | **hand-wavy** (§3.2) | #378 is done. Yet `src/core/chips/evaluateChip.ts:38` still caches one evaluator per definition, so two DFF parts have nowhere to keep state. That is FID-002's instance model, which the owner deferred on 2026-09-19, and R895 keeps Project 3 under the phase rule |
| AC1: sub-issues for Project 2 conformance red, the five chips, #207's `repeat`/`while`/`tick`/`tock`, and DFF onward | **hand-wavy** for Project 2 | #984 and #985 carry the five chips, and JDG-004 folded the red into #984's first commit. #207's commands appear in no Project 2 script. What Project 2 does need, no sub-issue carries: D2's separator and D1's column binding |
| AC2: each sub-issue is spec text plus a `.tst`/`.cmp` binding in the sidecar (§1.3); no canvas gesture | **hand-wavy** on the binding; sound on the gesture | The sidecar's `tests` field (`src/core/spec/types.ts:49-52, 66`) has no reader outside tests, and §6 row 14's "sidecar's test binding" is unbuilt, so a binding there is a test nothing runs. A course-shaped FullAdder fails `parseSpec` (`unknown-chip`) while the builtins stay off the app registry. The binding that runs is the scenario (`src/scenarios/project1.ts`). The headless gesture rule is R895's |
| AC3: #357 is a precondition, since a slice on a part pin is legal and needed from Project 2 | sound | #357 closed 2026-09-23. `out[15]=ng, out[0..7]=lo` and `b[k]=s<k>` grade 36/36 (ALU-basic), and `Add16(a=in, b[0]=true, out=out)` grades 4/4 (Inc16). The reference builds both (`hdl.ohm:17-19`) |
| AC4: the ladder does not supersede the 0.5 spine; each sub-issue names its §6 row | sound under R895 | Both slices name row 14 and cover its CLI half, with no rendered view, as they say. R895 is the exception, and #983 records it |
| Blocked by #193 and #378 | sound | Both closed (2026-09-27, 2026-10-15); `02/` holds the vectors |
| Comment, 2026-09-23: a clocked part needs a narrow exemption from the self-edge rule | sound (N2T, Project 3) | §3.2's feedback-through-DFF row; Appendix A allows a loop "through a clocked pin" |
| Comment FID-007: `CLOCKED` after the builtin forms | not re-reviewed | Project 3; the panel approved it on #783 |

## Verdicts: Project 2 parts of the phase-0.6 page

| Claim (line) | Verdict | Source |
|---|---|---|
| L12: Projects 2–3 completed "using either the 3D circuit designer or the HDL text editor" | **unsound (stale)** | ADR-0020: spec-only writes, read-only projections. The spec editor is #386 (open), and R895 makes Project 2 headless |
| L17: all five Project 2 chips "completable and verified" | sound as the exit | "Verified" means six scripts, since `ALU-basic.tst:11` loads `ALU.hdl` |
| L24-32: the five pin lists | sound | They match the reference builtins and the stubs. #984 and #985 restate them |
| L135 / T6-DATA: fixture packs for Projects 2–3 | sound, done | #193 vendored them; `02/` has 17 files |
| L141: the Project 2 builtins are the five | sound | `builtins/index.ts:91-95`. `ALUNoStat` is also there, and no course file or vector uses it |
| L144: "All builtins registered in ChipRegistry and available via builtin toggle (from Phase 0.5)" | **unsound as it stands** | No builtin toggle exists in `src` (no `useBuiltin` or `toggleBuiltin`; the web IDE's is `web/src/pages/chip.tsx:216-225`). R895 keeps the builtins off the app registry (Q2) |
| An ALU builtin's semantics (the page is silent) | **hand-wavy** | The two official simulators disagree on 36 of 64 control words (see Q1) |
| L159: Stream C depends on Phase 0.5's chip registry | sound | `src/core/chips/registry.ts`; the grading path uses it |
| L168: T6-BUILT2 "12h" | unverified | An estimate with no measurement |
| L192: all Project 2 and 3 scripts pass at 100% | sound as the gate | Today 4 of the 6 Project 2 scripts pass `testChip` on Project-1-only HDL. The other two fail on D1 and D2, not on missing builtins |
| Project 3 (§0.6.1–0.6.3, the 9-chip table) | per §3.2: DFF on the rising edge and the two-edge API unsound; clock sound; instance model unsound as it stands (`evaluateChip.ts:38`); the sparse-memory reasoning hand-wavy | FID-001, FID-002 and FID-005 stay deferred and are not re-queued. "9 total" heads an 8-row table |

## The three questions
1. **Which builtins the grading path needs.**
   - For the course solutions: HalfAdder (in FullAdder and Add16), FullAdder (in Add16), Add16 (in
     Inc16 and ALU) and Inc16 (in some ALU solutions). In the web IDE all five resolve to the
     builtin, beside a file of the same name too (measured above).
   - No Project 2 vector uses ALU as a part (CPU first does, in Project 5). It is still registered,
     so that the 21 names are the web IDE's.
   - #984's three plus #985's two are therefore the right split. The chip under test stays the
     file's own (`testChip.ts:132`), and `PRIMITIVES` (`:53`) must not gain these names, so
     `BUILTIN HalfAdder;` stays refused as a stand-in.
   - Semantics:
     - The adders and Inc16 are unambiguous (`add_16.ts:3-5`).
     - **ALU must be the book's bitwise definition**, as `ALU.hdl`'s header and the desktop
       simulator's `computeALU` give it, not the web IDE's 18-word table. A builtin that stands in
       for a learner's chip has to compute what a correct HDL of that chip computes.
     - The vectors cannot tell the two apart, so a test must pin all 64 words, and the divergence
       from the web IDE must be recorded.
   - Out of scope: a part named after no builtin is read from the directory in the web IDE
     (`MyHA`). HACER's grading path has no directory, so it is `Unknown chip-part`.
2. **The app registry, the 27 names, and spec documents.**
   - **Keep them off `getBuiltinChipRegistry()` in both slices. R895's bound stands.** No vector
     needs them there.
   - Joining would add five chips to the legacy 3D toolbar (`src/components/ui/CompactToolbar.tsx:217`),
     to the engine view (`src/simulation/topologicalEval.ts:314`) and to the spec path's default
     (`src/core/spec/parseSpec.ts:298`). That is the 3D reach R895 excludes.
   - `referenceBuiltins.test.ts` then passes unedited, still with 27 names.
   - The split is real, though. From #984 on, grading resolves 16 + n builtins and the app 16, so
     the same HDL grades green and fails `unknown-chip` on the spec path.
   - ADR-0020 §1.11 rule 4 says "On the grading path a part under one of the 27 is
     `Unknown chip-part` until HACER has that builtin", and that sentence becomes false for these
     five. So each slice amends that bullet to name both sets, and adds a test that pins the grading
     registry's names against the 43. That way the boundary moves visibly on that path, as FID-026
     intended.
   - The two sets have to become one, or be a stated rule, before #206 registers user chips. After
     that, a user `HalfAdder` would feed the app while grading uses the builtin. **FID-035** covers
     this.
   - **A Project 2 spec document with a sidecar test binding is not owed now.** Nothing reads the
     sidecar's `tests` field, so the binding would never run, and the documents would not parse on
     the default registry. It is owed together with row 14's sidecar runner and the registry join.
     **FID-036** proposes amending #177's AC2 to say so.
3. **Six scripts over five chips.**
   - `ALU-basic.tst` loads `ALU.hdl` and compares with `ALU-basic.cmp`, so its scenario is chip
     `ALU` with `ALU.hdl`'s source.
   - `testChip` accepts it, because its `load` check compares the loaded chip, not the script's
     name (`testChip.ts:115`). ALU-basic graded 36/36.
   - The harness pairs a vector by chip (`harness.test.ts`, `vector(chip, …)` reads `${chip}.tst`),
     which would drop ALU-basic and label both verdicts `ALU`. The vector needs a script id.
   - ALU-basic ignores `zr` and `ng`, so ALU is green only when `ALU.tst` passes too, and that
     waits on D2.

## Slice rulings
- `#984: revise:` keep the builtins off the app registry, as filed. Add these to the red contract:
  - (a) D1's fix: bind `.cmp` columns to the output list by position, since the reference compares
    text. Otherwise #984 is blocked by the coordinator's issue for D1.
  - (b) a test pinning the grading path's builtin names (16 + 3) against the reference's 43.
  - (c) ADR-0020 §1.11 rule 4's grading-path bullet, amended to name both sets.
  - (d) a test that `BUILTIN HalfAdder;` in `HalfAdder.hdl` is still refused as a stand-in.
- `#985: revise:` add these to the red contract:
  - (a) D2's fix: any command may end with `,`, `;` or `!`, as `tst.ohm` allows; `ALU.tst` parses.
  - (b) the ALU builtin is the bitwise definition, pinned over all 64 control words against HACER's
    ALU HDL, and ADR-0020 §1.11 rule 5 records the web IDE builtin's 36-word difference.
  - (c) the differential's vectors are keyed by script, so `ALU` and `ALU-basic` get their own
    verdicts.
  - (d) #984's name pin extended to 16 + 5.

## Current practice
- nand2tetris.org/software (fetched 2026-10-23) says: "We recommend using the new IDE"; "The desktop
  version is provided mainly for backward compatibility."
- **The two official simulators disagree on both points this review turns on, and no vector decides
  either.**
  - The web IDE (release 2026.19.0, the differential's pin, 2026-05-16) looks builtins up first and
    uses the 18-word ALU table.
  - The desktop simulator looks in the working directory first (`getHDLFileName`), as the book does,
    and its ALU is the bitwise one (`computeALU`).
- For the lookup order, HACER's grading path has no directory, so it gets the web IDE's result. For
  ALU semantics, the book's definition and the desktop tool agree, and the vectors are silent.
- CVDP (NVIDIA, arXiv:2506.14074, submitted 2025-06-17) evaluates LLM and agent RTL "using
  open-source tools". The Si2 page for CVDP 1.1.0 (released 2026-06-08, fetched 2026-10-23) names
  cocotb, Yosys and Icarus Verilog.
  - In that practice, a pass has to come from the simulator comparing every column.
  - D1 is a column nothing compares, and its row 1–3 passes are vacuous. That is the kind of green
    such a harness exists to rule out (this review's reading, not CVDP's words).

## Proposals (`docs/harness/fidelity-inbox.md`; nothing filed)
- **FID-035** (#140): before #206 registers user chips, reconcile the grading path's builtin set
  with the app registry's, or state the split as an ADR rule with a test.
- **FID-036** (#139): Project 2's plan text matches what runs:
  - #177's AC2 names the scenario as Project 2's binding until §6 row 14's sidecar runner exists,
    and it names D1 and D2;
  - the page's L12 and L144 are restated, and so is the ALU's semantics.

## Could not verify
- Appendix A in the 2nd edition. The lookup order is the early-draft copy that ADR-0020 rule 4
  cites.
- The desktop simulator's behaviour: read from a third-party mirror of the 2.5.7 source, not run.
- D1's Project 5 headers (`addre`, `DRegiste`, `ARegister`). They were listed but not run, since
  Project 5 is out of scope.
- Whether a learner-facing `hacer test` of HalfAdder has already shipped a false fail. There are no
  usage logs.
- `vectors/03/` contents against §0.6.3's "all 14 chips": Project 3 was not checked.
