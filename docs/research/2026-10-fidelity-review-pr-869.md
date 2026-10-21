# Fidelity review: PR #869, strict acceptance on the grading path (#840, FID-021)

- **Date:** 2026-10-22 · **Artifact:** PR #869 at head `23587532`, on `origin/main` `0105dbd1`
- **Question:** does `hacer test` (and `hacer run-tst`, the MCP `hacer_hdl` tool) now accept exactly
  the HDL the reference builds, refusing with the reference's cause, and where does it still differ?
- **Verdict:** sound for acceptance. Hand-wavy on cause order for a shape with two errors (FID-031).

## Domain and frame
HDL semantics in the nand2tetris model: which source text is a chip and which is refused, and the
first error a learner sees. Nothing here touches timing or device physics.

## Ground truth used
1. **The reference builder**, web IDE at `91ef428` (`../web-ide/simulator/src/chip/builder.ts`):
   - `wireParts` (`:256-290`) runs each part through `wirePart`. Only after every part does it run
     `validateInternalPins` and `validateWireWidths`.
   - `wirePart` (`:323-361`) runs `checkLoops` over the part. Then each wire goes through
     `validateWire` and `createConnection` in order, and last comes `chip.wire`, which raises
     `Sub-bus index out of range` (`../web-ide/simulator/src/chip/chip.ts:277`).
   - `validateInputSource` (`:475-489`) gives `Cannot use output pin as input`, then
     `Internal pins (in this case: <name>) cannot be subscripted or indexed`, or, for a constant,
     `Constant bus cannot be subscripted or indexed`.
   - `validateOutputWire` (`:416-461`) checks a write to a chip IN or a constant, then a double
     write of an OUT, then an internal subscript, then an internal defined twice.
2. **The reference grammar:** `identifier := (letter) (alnum)*`
   (`../web-ide/simulator/src/languages/grammars/hdl.ohm:3`). It overrides the base grammar's
   identifier, which allows `_`, `.` and `$` (`base.ohm:56`).
3. **Upstream `main`**, fetched 2026-10-22 from raw.githubusercontent.com/nand2tetris/web-ide. It has the
   same `validateInputSource`, the same internal-subscript check in `validateOutputWire`, the same
   call order, and the same identifier, `Wire` and `WireSide` rules.
4. **The book, Appendix A.** The copy is the one courses.cs.washington.edu hosts for CSE 390b (20sp),
   fetched 2026-10-22, pages 283–286. Its edition was not checked.
   - §A.2: "Names of chips and pins may be any sequence of letters and digits not starting with a digit."
   - §A.5.2: "Each input pin of a part may be fed by one of the following sources: an input pin
     of the chip, an internal pin, one of the constants true and false." No chip output is listed.
   - §A.5.3: "An internal pin (like v above) may not be subscripted."
   - The book and the reference agree on all three causes.
5. **The official vectors**, `conformance/vectors/01/*.tst|.cmp`, and the corpus
   `conformance/acceptance/hdl-shapes.json`.

## How it was measured
- A throwaway worktree of the PR head, Node 22.
- Each probe went through `testChip` with a script that only loads and evaluates, as the corpus's
  `graded` reader does, and also through `compileHDL` with the app registry.
- The same text went through the reference's `HDL.parse` and `build`, under tsx.
- Project 1 solutions ran through `testChip` with the official `.tst`/`.cmp`.
- `gradingRefusal.test.ts` and `acceptanceParity.test.ts` pass at head: 2 files, 402 tests.

## Verdicts

| # | Claim (issue #840 / PR #869) | Verdict | Evidence |
|---|---|---|---|
| 1 | Grading runs where `testChip` and `loadChipTest` parse the `.hdl`, so `test`, `run-tst` and `hacer_hdl` share it | sound | `testChip.ts:98-105` at head. The only production callers are `src/cli/runCli.ts:42,66`, `src/mcp/server.ts:66` and `src/scenarios/drivers/core.ts:83` |
| 2 | `compileHDL`, `evaluateChip`, `compileSpec` and the test lab are unchanged, and the cache needs no key | sound | None of them is in the diff. The check reads the AST before compilation |
| 3 | A part input bound to a chip OUT, whole or sliced, gets `Cannot use output pin as input` | sound | `builder.ts:476-477`, §A.5.2. Or8Way plus `Not(in=out, out=spare)` gives `Line 13:` on both sides. `Not(in=o[1], …)` gives `Line 5:` on both |
| 4 | A subscripted internal, read or written, gets `Internal pins (in this case: <name>) …` | sound | `builder.ts:432-439, 478-486`, §A.5.3. A write of `t[0]` gives `Line 12:` on both. `Not(in=x[0], out=o)` gives `Line 4:` on both, where `compileHDL` alone says undriven |
| 5 | A `_` in a chip, pin, part or signal name is refused, naming it and the rule | sound, wording HACER's | `hdl.ohm:3` and §A.2 agree. The reference gives a position error (`Line 6: expected ")"` for `o_1`). The issue asks for the name and the rule. A `_` in the chip name or an IN/OUT name gets no `Line N:`, where the reference gives lines 1 and 2 |
| 6 | The reference's cause comes before HACER's out-of-range, width and undriven checks | sound for one error; **hand-wavy** for two | The five wrong-cause corpus shapes and `x[0]` get the reference's sentence. With an earlier per-part cause the check does not model, grading names the later one. See "Where it still differs" and FID-031 |
| 7 | Where the reference refuses something else first, the check returns nothing and `compileHDL` names it (unknown part, self-use, looping wire, unknown pin, write to a chip IN or a constant) | sound | 7 probes, including a loop or self-use followed by a chip-OUT read. `compileHDL` refuses every one, in HACER's words (#820's scope) |
| 8 | "The check refuses three shapes, in the reference's order" | hand-wavy | It holds only up to the first per-part cause the check does not model. The PR's Known limit names the double binding. The family is wider: an OUT written twice, an internal written twice, a sub-bus out of range |
| 9 | Each refusal carries its part's `Line N:`, as #820's errors do | sound, for one-line parts | For a part over several lines the reference cites the wire's line (6) and grading the part's (5). This is #820's recorded known difference |
| 10 | No shape the reference accepts is refused | sound | See the acceptance sweep below |
| 11 | No shape the reference refuses for one of the three causes passes grading | sound on everything measured | The 18 builder-cause and 2 `_` corpus shapes, 7 cause probes, and 2 refused-by-both Project 1 variants |
| 12 | `scenarioToHdl` emits HDL the reference builds | sound | All four `SCENARIOS` at head build in the reference, for example `Nand(a=g0a, b=g0b, out=g0out, out=g0); Nand(a=g0, b=g1b, out=g1out);` |
| 13 | ADR-0020 §1.11.5 records the decision | sound, incomplete | It names the two builder causes. The `_` rule, also enforced on this path, is not in the bullet |

## Acceptance sweep: shapes the reference builds
- **The corpus, 177 shapes.** The PR's "refuses nothing else" test is green at head.
- **Nine probes.**
  - A part output bound to a chip OUT and to an internal.
  - Part-output slices to internals.
  - `false` on a 16-bit pin and `true`/`false` on part-pin bit ranges.
  - Chip-OUT slices written.
  - Whole 16-bit internal buses.
  - Comments containing `_`, and a part written over several lines.
  - A one-bit IN read as `a[0]`.
  - Mixed-case names with digits.
  - An unused internal.
  - None is refused.
- **Twenty Project 1 solutions in styles the shipped sources lack**, covering all 15 chips and 5
  variants:
  - Nand-only gates.
  - Parts split over lines, and several parts on one line.
  - `sel` broadcast with `Or16(a=false, b[0]=sel, …, b[15]=sel)`.
  - Whole internal buses through `Mux16`/`Mux4Way16`, and `sel=sel[0..1]`.
  - `sel[1]=false` on a part pin.
  - A decoded `Mux4Way16` with `Mux16(a=false, …)`.
  - Unused output slices, and fan-out to an unused internal.
  - The reference builds all 20. `hacer test` passes all 20 with the official vectors, from 2/2 to
    16/16.
- **Two refused-by-both variants.** An `Or8Way` reading bits of an internal it built with
  `out[0..7]=w` gets `Line 8: Internal pins (in this case: w) …`. A `Mux` with
  `And(a=out, …)` gets `Line 11: Cannot use output pin as input`. Message and line are identical on
  both sides.

## Where it still differs
**Cause order with two errors (FID-031).** Each row gives the reference's first error, then grading's
first error. Both sides refuse every row, and `compileHDL` refuses each earlier cause on its own.
- An in-pin bound twice, then a chip-OUT read in a later part: `Line 4: Cannot write to pin in multiple times`; `Line 5: Cannot use output pin as input`.
- The same two in one part, `And(a=a, a=b, b=o, out=p)`: `Line 5: Cannot write to pin a multiple times`; `Line 5: Cannot use output pin as input`.
- An OUT written twice, then a read of it: `Line 5: Cannot write to pin o multiple times`; `Line 6: Cannot use output pin as input`.
- An internal written twice, then a subscript of it: `Line 5: Internal pin t already defined`; `Line 6: Internal pins (in this case: t) …`.
- `a[3]` of a one-bit IN, then a chip-OUT read: `Line 4: Sub-bus index out of range (a has width 1)`; `Line 5: Cannot use output pin as input`.
- `in[2]=a` on a one-bit part pin, then a chip-OUT read: `Line 4: Sub-bus index out of range (in has width 1)`; `Line 5: Cannot use output pin as input`.

This is the inverse of FID-021's wrong-cause problem, and it is milder. A learner who fixes the
cause grading names still gets a refusal, never a green the reference would refuse.

**Recorded elsewhere, unchanged here.**
- `true[0..3]` is a parse error in HACER, where the reference says `Constant bus cannot be subscripted or indexed` (#725).
- `True` gets HACER's undriven message, where the reference says `The constant bus true must be in lower-case` (corpus `literal-capitalised`).
- Line numbers on multi-line parts are #820's.

**Outside #840, noted, not proposed.**
- The book writes a built-in body as `BUILTIN <name>;` (§A.6). The reference grammar takes only a
  bare `BUILTIN;` (`hdl.ohm`, `BuiltinPart`).
  - `CHIP Nand { … BUILTIN Nand; }` gives `Line 4: expected ";"` in the reference.
  - The web IDE's own shipped `PARTS: BUILTIN Nand;` text
    (`../web-ide/projects/src/project_01/00_nand.ts:14`) gives `expected "("`.
  - HACER's grading accepts both forms, for a primitive as itself only.
  - No vector decides between the book and the reference here. It concerns only the given
    primitives, not graded student work.
- Conversely, the reference builds a bare `BUILTIN;` in `And.hdl` as the builtin And
  (`builder.ts:233-235`). HACER refuses it by policy (`builtinStandIn`), deliberately stricter.

## Current practice
- The web IDE's own grader (`../web-ide/cli/src/grading.ts`) runs each `.hdl` through
  `simulator/src/projects/runner.ts`, which parses with the same grammar and calls the same `build`
  (`runner.ts:14, 55, 66`). "Grade only what the builder builds" is the reference's own practice, and
  #869 brings `hacer test` to it.
- The same grader can run the Java simulator as a shadow (`grading.ts:47-48`, `JavaRunner`), a
  second oracle beside the first. That is a precedent if HACER ever wants its grading cross-checked
  against more than one reference.
- Upstream `main`, fetched 2026-10-22, has the checks this review measured.

## Proposals
- FID-031: grading defers to `compileHDL` at the first per-part cause the reference raises before a
  chip-OUT read or subscript (a double binding, an OUT or internal written twice, an out-of-range
  sub-bus), so a two-error shape names the reference's first cause.

## Could not verify
- Appendix A's edition. The copy has 1st-edition page numbers. The 2nd edition's wording on names
  and subscripts was not fetched.
- The Java Hardware Simulator's identifier rule, which the reference's shadow mode would run. It was
  not fetched.
- Grading of a chip whose parts are user chips: there is no runtime registry yet (#816). Every
  non-Project-1 part is refused as unknown today, so the check's deferral there was not exercised
  against a part that would build.
- The canvas and the store's test lab were not rendered or run. "Unchanged" is inferred from the diff.
