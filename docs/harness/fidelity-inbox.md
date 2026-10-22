# Fidelity inbox — proposals the inbox panel decides

The fidelity role (`fidelity-brief.md`, ADR-0018) never files an issue for a proposal. It queues
the proposal here, in the issue form. **The inbox panel decides each `proposed` entry
(`inbox-panel-brief.md`): `node scripts/inbox.mjs queue` files a review issue for it, Opus and Grok
review it, and the panel sets `approved`, `declined (<reason>)` or `deferred (<until>)`. The owner
may override any status at any time, by editing it or by saying "approve FID-00N".** Only an
approved entry is filed — by the panel, never by the fidelity agent — as an issue labelled
`fidelity` under the target epic, and the entry then records the issue number. Declined entries
stay, so the same proposal is not made twice.

## Entry format

```markdown
### FID-NNN · <one-line proposal>
- **Date:** YYYY-MM-DD · **Target epic:** #139 spine | #142 surfaces | #147 horizon | #140 core
- **Status:** proposed | approved | declined (<reason>) | deferred (<until>) | filed (#n)
- **Why:** <the finding, with its source — file:line, book section, URL and fetch date>
- **Review note:** docs/research/<note>.md

**Draft issue body**
## Goal
## Acceptance criteria
## Verification command
## Blocked by
```

Ids are sequential and never reused. Target epics: `#139` spine, `#142` surfaces, `#147` horizon,
`#140` core. An entry's draft body follows the agent-ready issue form in
`docs/harness/issue-form.md` so filing it is a copy, not a rewrite.

## Queue

### FID-001 · Adopt the reference clock contract for Phase 0.6: tick samples, tock commits
- **Date:** 2026-09-18 · **Target epic:** #139 spine
- **Status:** deferred (owner, 2026-09-19: "they need to wait until other surfaces have caught up first" — revisit when the surfaces epic #142 exits)
- **Why:** `docs/roadmap/phases/phase-0.6-arithmetic-sequential.md` §0.6.1 says a DFF's output changes on the rising edge and §0.6.3 applies state changes on both edges. The book's Appendix A §A.7 says outputs "stabilize to new values only at tocks"; the reference `../web-ide/simulator/src/chip/builtins/sequential/dff.ts` reads `in` on `tick()` and writes `out` on `tock()`; official `Bit.cmp` row `3+` has `out=0` after tick and row `4` has `out=1` after tock. A rising-edge DFF fails the oracle at its first sequential row.
- **Review note:** docs/research/2026-09-fidelity-review-roadmap.md §3.2

**Draft issue body**
## Goal
Phase 0.6's clock model is the reference's: `tick` = evaluate, then every clocked part samples its inputs into internal state; `tock` = every clocked part commits state to its outputs, the time counter increments, then evaluate; the `.cmp` `time` column reads `N` after tock and `N+` after tick.
## Acceptance criteria
- Rewrite §0.6.1 and §0.6.3 to the two-phase sample/commit model; remove `onClockEdge(edge: 'rising' | 'falling')`.
- Tests named in the phase page: `DFF`, `Bit`, `Register`, `PC`, `RAM8` official vectors pass through `runTest`, including the `time` column.
## Verification command
`pnpm exec vitest run src/core/testing` (once #207 lands the parser constructs)
## Blocked by
#190 (one engine ADR), FID-002

### FID-002 · A chip *instance* model with clocked pins, before the one-engine lowering (#190)
- **Date:** 2026-09-18 · **Target epic:** #140 core
- **Status:** deferred (owner, 2026-09-19: "they need to wait until other surfaces have caught up first" — revisit when the surfaces epic #142 exits)
- **Why:** `src/core/chips/types.ts:7` makes a builtin a pure function and `src/core/chips/evaluateChip.ts:12` caches one compiled closure per *definition*; two DFF parts have nowhere to keep separate state. `src/core/hdl/compiler.ts` step 4 rejects `Bit.hdl`'s `Mux → DFF → Mux` loop as a cycle, while Appendix A allows a loop "through a clocked pin" and the reference cuts dependency edges at clocked inputs (`../web-ide/simulator/src/chip/chip.ts:614-618, 675-679`) and infers a composite's clocked pins as those with no in→out path (`../web-ide/simulator/src/chip/builder.ts:242-246`). Project 5 vectors also address internal parts by name (`ARegister[0]`, `RAM16K[0]`, `ROM32K load`).
- **Review note:** docs/research/2026-09-fidelity-review-roadmap.md §3.2, §3.3, §4

**Draft issue body**
## Goal
#190's ADR decides the instance model first: a compiled chip is instantiated into a part tree with per-instance state; `CLOCKED` is parsed (`src/core/hdl/types.ts:30`) and inferred; both schedulers cut edges at clocked inputs; internal parts are addressable by name for `output-list`, `set` and `load`.
## Acceptance criteria
- ADR names the instance model, the clocked-pin rule (declared for builtins, inferred for composites), and the addressing scheme; the spike compiles `Bit.hdl` and `PC.hdl` without a cycle error.
- Test: `compileHDL` of a chip with a loop through a DFF succeeds; the same loop through a `Not` fails.
## Verification command
`pnpm exec vitest run src/core/hdl src/core/chips`
## Blocked by
—

### FID-003 · Roadmap corrections where the text contradicts the oracle or the code
- **Date:** 2026-09-18 · **Target epic:** #139 spine
- **Status:** deferred (owner, 2026-09-19: "they need to wait until other surfaces have caught up first" — revisit when the surfaces epic #142 exits)
- **Why:** (1) `phase-0.5` §0.5.6 promises a "multi-pass convergence" fallback that would accept combinational loops Appendix A rejects ("to avoid uncontrolled data races") and the code refuses (`src/simulation/topologicalEval.ts:117-123`); (2) `phase-0.7` §0.7.5 says reset "clear[s] registers" while `ComputerAdd.cmp` row 7 shows `PC=0` and `DRegister=5` after `reset=1`; (3) `vision.md` lists "Propagation delays and setup/hold times" under a zero-delay model ("The operation of combinational chips is instantaneous").
- **Review note:** docs/research/2026-09-fidelity-review-roadmap.md §1, §3.1, §3.3

**Draft issue body**
## Goal
The phase pages state what the N2T engine does and does not do: combinational loops are rejected by design; a DFF built from NANDs, delays and setup/hold belong to a separate delay-model engine (FID-004); chip-level `reset` resets PC only.
## Acceptance criteria
- §0.5.6 fallback sentence removed; §0.7.5 reset wording corrected; `vision.md` Phase 2 timing bullet moved under the horizon engine with a pointer.
- `implementation.md` stale rows (Stryker, scheduled E2E, unchecked compiler/engine boxes) reconciled or the file demoted per ADR-0013 / #148.
## Verification command
`pnpm run lint:docs`
## Blocked by
—

### FID-004 · "Below the NAND" as three engine tiers; first step a delay-model engine
- **Date:** 2026-09-18 · **Target epic:** #147 horizon
- **Status:** deferred (owner, 2026-09-19: "they need to wait until other surfaces have caught up first" — revisit when the surfaces epic #142 exits)
- **Why:** `docs/north-star.md` names transistors and device physics as the direction with no model behind it. Three honest tiers exist — gate level with delays and X (Logisim, DigitalJS), switch level (Bryant 1984), circuit level (SPICE-class) — and each has a test that separates real from fake. The first tier already has an oracle: a NAND-built master–slave DFF must pass the builtin DFF's `.cmp` vectors through the delay engine.
- **Review note:** docs/research/2026-09-fidelity-review-roadmap.md §5

**Draft issue body**
## Goal
A research note (no product code) that defines the three tiers, what each can show honestly, what would be fake at each, and the acceptance test for tier 1: an SR latch from two NANDs holds state and a NAND-built DFF passes `DFF.cmp`/`Bit.cmp` through an event-driven unit-delay engine with 0/1/X and an oscillation cap.
## Acceptance criteria
- Note under `docs/research/` with cited sources for each tier (switch-level papers read, not recalled).
- A proposed engine-mode seam that leaves the N2T engine untouched.
## Verification command
`pnpm run lint:docs`
## Blocked by
FID-002

### FID-005 · Honest scale and performance budgets for 0.6/0.7
- **Date:** 2026-09-18 · **Target epic:** #139 spine
- **Status:** deferred (owner, 2026-09-19: "they need to wait until other surfaces have caught up first" — revisit when the surfaces epic #142 exits)
- **Why:** `phase-0.6` §0.6.2 justifies a sparse `Map` with "<50MB" when a dense `Uint16Array(16384)` is 32 KB; the real cost is a hierarchical RAM16K of 262 144 DFF instances per eval, which the reference avoids by shipping RAM chips as builtins. `phase-0.7`'s "<200ms per instruction" and `vision.md`'s "<16ms for 1000 gates" have no benchmark in the repo.
- **Review note:** docs/research/2026-09-fidelity-review-roadmap.md §1, §3.2, §3.3

**Draft issue body**
## Goal
Budgets are measured, and scale comes from a stated builtin-substitution policy (a user chip used as a part may run as its builtin, as the reference does), not from sparse storage.
## Acceptance criteria
- A benchmark fixture (1000-gate Project-1 netlist; `RAM8` through `RAM16K` hierarchical vs builtin) with numbers recorded in the phase page.
- §0.6.2 rewritten around the substitution policy; §0.7 exit tied to `ComputerAdd/Max/Rect` vectors plus an interactive `Fill` run.
## Verification command
`pnpm exec vitest run src/simulation src/core/testing`
## Blocked by
FID-002

### FID-006 · The public HDL reference lists the three accepted builtin forms and who accepts each
- **Date:** 2026-10-02 · **Target epic:** #142 surfaces
- **Status:** filed (#263)
- **Why:** after #643 HACER accepts `BUILTIN;`, `BUILTIN <Name>;` and `PARTS: BUILTIN <Name>;`. Each matches a different nand2tetris parser and no reference parser accepts all three: the web IDE grammar takes only `BUILTIN;` (`../web-ide/simulator/src/languages/grammars/hdl.ohm:13`); the book's Appendix A and the Java simulator take only `BUILTIN <Java class name>;` (HUJI copy of Appendix A, fetched 2026-10-02; `nand2tetris_simulator` `BuiltInGateClass.java:37-40`); the course files ship `PARTS: BUILTIN <Name>;` (`../web-ide/projects/src/project_01/00_nand.ts:13-14`), which neither parses. The superset is stated only in PR #643's body and a docstring (`src/core/hdl/parser.ts:409`) that calls it "the reference grammar's". A student or agent checking a file against HACER cannot tell which forms are portable.
- **Review note:** docs/research/2026-10-fidelity-review-builtin-form.md

**Draft issue body**
## Goal
The HDL reference (#263) states each accepted builtin form, which nand2tetris tool accepts it, and that `hacer test` / `hacer_hdl` run a `BUILTIN` only for a primitive named as itself (R771).
## Acceptance criteria
- `docs/public/hdl-reference.md` has a builtin section with the three forms, a column for the web IDE, the book/Java simulator and HACER, and the R771 rule with its primitive list
- the `parseBuiltinDecl` docstring no longer calls the named form the reference grammar's
## Verification command
`pnpm run lint:docs`
## Blocked by
#263 (the reference page itself); fold into it if it is still open.

### FID-007 · Phase 0.6 accepts `CLOCKED` after all three builtin forms
- **Date:** 2026-10-02 · **Target epic:** #139 spine
- **Status:** filed (#177)
- **Why:** every reference puts `CLOCKED` after the builtin: web IDE `ChipBody = InList? OutList? PartList ClockedList?` (`hdl.ohm:6`); Appendix A's `CHIP DFF { … BUILTIN DFF; CLOCKED in,out; }` (HUJI copy, fetched 2026-10-02); the course file `PARTS: BUILTIN DFF; CLOCKED in;` (`../web-ide/projects/src/project_03/00_dff.ts:14-16`). HACER fails `CLOCKED` after every builtin form today with `Expected '}' but got 'CLOCKED'` (the `expect('RBRACE')` at `src/core/hdl/parser.ts:349` at `761ead1`; reproduced by #643's verifier), which is Phase 0.5 scope. The Project 3 work under #177 has to cover all three, or the vendored `conformance/vectors/03/DFF.hdl` and the web IDE's `BUILTIN; CLOCKED in;` fail to parse.
- **Review note:** docs/research/2026-10-fidelity-review-builtin-form.md

**Draft issue body**
## Goal
The HDL parser reads a `CLOCKED` pin list after `BUILTIN;`, `BUILTIN <Name>;` and `PARTS: BUILTIN <Name>;`, and records the clocked pins on the chip.
## Acceptance criteria
- `CHIP DFF { IN in; OUT out; BUILTIN; CLOCKED in; }`, `… BUILTIN DFF; CLOCKED in; }` and `… PARTS: BUILTIN DFF; CLOCKED in; }` parse to the same AST
- the vendored `conformance/vectors/03/DFF.hdl` (`PARTS: BUILTIN DFF; CLOCKED in;`) parses
- `CLOCKED` after a `PARTS:` list of parts follows `hdl.ohm:6`, which allows it there too
## Verification command
`pnpm exec vitest run src/core/hdl`
## Blocked by
#177 shaping (the clocked chip), the one-engine work it waits on.

### FID-008 · An acceptance-parity corpus: each HDL shape carries the reference's verdict and is asserted against HACER's readers
- **Date:** 2026-10-15 · **Target epic:** #140 core
- **Status:** filed (#811)
- **Why:** HACER and the reference builder disagree on which HDL they accept, in both directions, and no test records which disagreements are intended. #725's review ran 26 shapes through the reference builder (`../web-ide/simulator/src/chip/builder.ts`), `compileHDL` and `parseSpec`. HACER accepts internal slice writes and reads and a part reading a chip OUT (`builder.ts:436, 477, 483` refuse them). It refuses an unconnected part input the reference reads as 0, and a slice followed by a whole binding the reference accepts. Later reviews added seeds:
  - #740's 31 shapes, including the `XOr` alias the reference accepts (an intended divergence) and which error comes first;
  - #732's identifier rows: `_` in a name, Unicode letters, and a buffer named like the exported chip;
  - #747's verifier's 117 slice probes, each with the reference's verdict and message (issuecomment-6190087365). `hacer test` still accepts 9 of the 70 the reference refuses.
- **Review note:** PR #725 issuecomment-6184961559, with seeds from PR #740 issuecomment-6188266196, PR #732 issuecomment-6186263400 and PR #747 issuecomment-6190213877. The probes were throwaway; the comments hold the tables.

**Draft issue body**
## Goal
One committed corpus says, for every HDL shape the fidelity reviews measured, what the reference builder does (accept or refuse, and its message) and what `parseHDL`, `compileHDL` and `parseSpec` do. Each divergence is named as intended (#722's superset, the ADR-0020 §1.10.3 tag scan, the stricter slice-then-whole rule) or as a bug with its issue.
## Acceptance criteria
- A data file of shapes, each with the reference's recorded verdict and message, seeded from the tables in the #725, #740 and #732 reviews and from #747's 117 slice probes
- A test asserts each HACER reader's verdict per shape. A divergence passes only when its row names it as intended or links an open issue, so a change on either side fails the test
- The 9 slice shapes `hacer test` still accepts start as recorded expected failures
## Verification command
`pnpm exec vitest run --project node src/core`
## Blocked by
—

### FID-009 · Literals become sources: a constant driver kind for `true` and `false`
- **Date:** 2026-10-15 · **Target epic:** #140 core
- **Status:** filed (#814)
- **Why:** literals are driverless nets keyed `true`/`false` (ADR-0020 §1.10.9, `src/core/spec/parseSpec.ts`), while ADR-0020 §1 reserves `driver: null` for an unfinished circuit. Appendix A lists the constants among the *sources* of a part input. Every consumer of the document must special-case the two ids, and no type records that. §1.10.9 leaves the question open, and adopting it later is a v1 → v2 migration.
- **Review note:** PR #725 issuecomment-6184961559

**Draft issue body**
## Goal
ADR-0020 §1 decides whether `Ref` gains a constant driver kind, so that `driver: null` means only "unfinished" and `out=true` is an ordinary two-driver clash.
## Acceptance criteria
- An ADR-0020 §1 amendment records the decision and, if it is adopted, the v1 → v2 migration and its fixture
- If adopted: `parseSpec` gives the `true`/`false` nets a constant driver, a part output bound to a literal is a `multiple-drivers` clash, and the v1 fixture still reads through the migration
## Verification command
`pnpm exec vitest run --project node src/core/spec`
## Blocked by
—

### FID-010 · `compileHDL` refuses a part that writes a chip input, and a chip built from itself
- **Date:** 2026-10-15 · **Target epic:** #140 core
- **Status:** filed (#378), closed by PR #740
- **Why:** #725's review found both accepted by `compileHDL` and refused by the reference (`builder.ts:465`, `:270`). At `main`, a chip writing its own input passed the official `conformance/vectors/01/And.tst` vectors, a defect in shipped grading. #378's shaper put both into its PR 1 (R825). PR #740's review found both refusals match the reference on every shape where it gives a verdict.
- **Review note:** PR #725 issuecomment-6184961559; PR #740 issuecomment-6188266196

Filed as part of #378; the issue holds the criteria.

### FID-011 · Name the unconnected-input divergence where the learner meets it, and offer to bind unwired inputs to `false`
- **Date:** 2026-10-15 · **Target epic:** #142 surfaces
- **Status:** filed (#813)
- **Why:** the reference builds `Nand(a=a, out=out)` and reads `b` as 0. M. Armbrust's *HDL Survival Guide*, "Unconnected Pins" (mirror at phoenix.goucher.edu/~jillz/cs220/hdlSurvivalGuide.pdf, fetched 2026-10-15), says "The Hardware Simulator does not consider unconnected pins to be errors". `compileHDL` refuses it (`Part "Nand" input pin "b" is not connected`), and ADR-0020 §1.1 states that refusal as a fact, not a decision (#725's review).
  - #377's importer makes the divergence visible (R826 ruling 2). Before it, the canvas and the reference both read 0; after it, HACER alone refuses.
  - #743's review measured 161 of 700 generated documents refused only for unconnected inputs. 141 of them build in the reference, which equals legacy on all 1,684 of their vectors.
  - Rulings 2 and 3 are asymmetric: a wire from nothing becomes `false` and compiles, while no wire at all is refused.
  - Current practice reports the case rather than assuming 0 (Yosys `check`, Verilator 5.052 `PINMISSING`), and Yosys `setundef -undriven -zero` ties such inputs to 0 explicitly.
- **Review note:** PR #743 issuecomment-6189952616; PR #725 issuecomment-6184961559; re-measured in PR #740 issuecomment-6188266196

**Draft issue body**
## Goal
The refusal stays (ADR-0020 §1.1). A learner who meets it learns that the official simulator reads the pin as 0, and has one step to make HACER do the same explicitly.
## Acceptance criteria
- The `unconnected-input` note and #386's import surface say that the nand2tetris simulator reads an unconnected input as 0 and HACER refuses it
- One action binds every unwired part input of a document to `false`, turning ruling 2's shape into ruling 3's; a test shows the bound document compiles and evaluates as legacy did
- ADR-0020 §1.1 records the refusal as a decision and names this divergence
## Verification command
`pnpm exec vitest run --project node src/core/spec`
## Blocked by
#386 for the surface half.

### FID-012 · The HDL parser reads optional `IN` and `OUT` lists, as the reference does
- **Date:** 2026-10-15 · **Target epic:** #140 core
- **Status:** filed (#742)
- **Why:** `src/core/hdl/parser.ts:353` and `:356` call `parseInDecl`/`parseOutDecl` unconditionally. The reference grammar has `ChipBody = InList? OutList? …` (`../web-ide/simulator/src/languages/grammars/hdl.ohm:6`) and refuses only an empty list. So the official `conformance/vectors/05/Computer.hdl`, which has no `OUT`, is refused, and so is `printSpec`'s own output for a chip with no inputs. #725's review found the `OUT` half and #732's the `IN` half, folding both into one item. #377 PR 1's builder filed #742 as a bug in shipped behaviour; R828 pins the export path's refusal to it.
- **Review note:** PR #725 issuecomment-6184961559; PR #732 issuecomment-6186263400

Filed as #742; the issue holds the body.

### FID-013 · #722 gains the constructs the export prints that the reference refuses
- **Date:** 2026-10-15 · **Target epic:** #140 core
- **Status:** filed (#722)
- **Why:** the reviews found more HDL that HACER's export can print and the web IDE refuses than #722's three constructs:
  - a pass-through buffer named like the exported chip: `CHIP Or` exports `Or(a=a, b=a, out=copy)`, refused as `Cannot use chip Or to implement itself` (#732);
  - `_` in identifiers, against `identifier := letter alnum*` (`hdl.ohm:3`) and Appendix A §2 (#732);
  - an OUT alias, better exported as a second output binding on its root's driver, with the review's 99 reference-refused exports as fixtures (#741);
  - the empty part `Name();`, which an unwired gate imports as, against `hdl.ohm:15-16` (#743).
- **Review note:** PR #732 issuecomment-6186263400; PR #741 issuecomment-6188405900; PR #743 issuecomment-6189952616

Added to #722 during the run: rows 4–5, the #741 addendum and the empty-part row.

### FID-014 · Name a part cycle at compile time once user HDL is registered at runtime
- **Date:** 2026-10-15 · **Target epic:** #140 core
- **Status:** filed (#816)
- **Why:** a chip that uses itself through another (`A` uses `B`, `B` uses `A`) compiles in HACER, then throws `max recursion depth 100 exceeded at chip "B"` at its first evaluation. The reference never settles: more than 40,000 file reads in 15 s before the probe was killed. A learner cannot reach it today, because `src/core/testing/testChip.ts` registers only the file's own chip over the builtins. It becomes reachable when #206 registers user HDL at runtime.
- **Review note:** PR #740 issuecomment-6188266196

**Draft issue body**
## Goal
A part cycle through registered chips is refused at compile time, naming its path, for example `Chip "A" uses itself through "B"`.
## Acceptance criteria
- `compileHDL`, and `compileSpec` for a `'circuit'` chip, refuse a chip whose parts reach it again through the registry, naming each chip on the path
- Tests: `A` → `B` → `A` and a three-chip cycle are refused by name at compile time; a Not.hdl using `And` beside an And.hdl using `Not` still resolves to the builtins and compiles
## Verification command
`pnpm exec vitest run --project node src/core/hdl src/core/chips`
## Blocked by
#206

### FID-015 · Learner-facing compile errors use the reference's words and carry the line
- **Date:** 2026-10-15 · **Target epic:** #140 core
- **Status:** filed (#820)
- **Why:** HACER says `Chip "Not" cannot use itself as a part` where the reference says `Cannot use chip Not to implement itself`, so a learner searching for the reference's phrase finds nothing. Every compile error reaches a test report as `evaluateChip: chip "And" failed to compile: …` with no line, where the reference prints `Line N:`. #747's review found the new slice messages carry the reference's signal name and width (55 of 56 on the HDL path), with the same prefix and no line.
- **Review note:** PR #740 issuecomment-6188266196; PR #747 issuecomment-6190213877

**Draft issue body**
## Goal
A learner who moves between HACER and the web IDE recognises each compile error.
## Acceptance criteria
- The self-reference refusal reads `Chip "X" cannot be used to implement itself`
- `hacer test` and `runTest` print a compile error without the `evaluateChip: chip "X" failed to compile:` prefix, and with `Line N:` for the part that caused it
- Tests pin both against the reference's wording for the same HDL
## Verification command
`pnpm exec vitest run --project node src/core src/cli`
## Blocked by
—

### FID-016 · `compileSpec` re-checks the wire shape, follows `undriven` through an alias, and names its engine dependence
- **Date:** 2026-10-15 · **Target epic:** #140 core
- **Status:** filed (#378), closed by PR #744
- **Why:** #741's review proposed four changes. `compileSpec` should re-run ADR-0020 §1.10.6's wire-shape rule over a document built without a parse, before #377's importer builds one. `undriven` should name the signal the learner bound, not the alias root. A refusal should carry only error diagnostics, without the parse's "is dropped". And §1.11.5 should name `compileSpec`'s dependence on the engine accepting a part that reads a chip OUT. #378 PR 3 took all four into its scope; ADR-0020 §1.11.1, §1.11.2 and §1.11.5 record them.
- **Review note:** PR #741 issuecomment-6188405900

Filed as part of #378; the issue holds the criteria.

### FID-017 · Out-of-range slices are refused on the HDL and spec paths, as the reference refuses them
- **Date:** 2026-10-15 · **Target epic:** #140 core
- **Status:** filed (#371), closed by PR #747
- **Why:** #744's review measured that the reference refuses every out-of-range slice at build time (`Sub-bus index out of range`, `chip.ts:270-278`), while HACER accepted them on both paths, so an `Or8Way` reading `in[8]` passed the official `conformance/vectors/01/Or8Way.tst` vectors through `hacer test`. It proposed refusing an out-of-range `wire` on the spec path, extending #371 with the grading repro, the write side and the partial slice, and an owner ruling on `sev:critical`. The coordinator ruled it not `sev:critical` and built #371 at once with the spec path in scope (R829, surfaced for the owner). PR #747's review found the new refusals cover all 56 of the reference's out-of-range refusals on the HDL path, and all 14 `wire` forms on the spec path.
- **Review note:** PR #744 issuecomment-6189447396; PR #747 issuecomment-6190213877

Filed as part of #371; the issue holds the criteria.

### FID-018 · `compileSpec` refuses a spec whose registered part does not compile, naming the chain
- **Date:** 2026-10-15 · **Target epic:** #140 core
- **Status:** filed (#821)
- **Why:** when a registered `Inn` stops compiling because its part `Foo` changed, `compileSpec(Outer)` still returns `success: true`. The refusal arrives only at the first evaluation or test run, as `evaluateChip: chip "Inn" failed to compile: …`, and does not name `Outer` or the part that led to `Inn`. The reference refuses `Outer` at build time (`Undefined chip name: Inn`, `builder.ts:262-264`), though it drops the inner error. HACER's message says more; only the timing diverges.
- **Review note:** PR #744 issuecomment-6189447396

**Draft issue body**
## Goal
A spec whose registered part does not compile under the same registry is refused when the spec is compiled, naming the chain.
## Acceptance criteria
- `compileSpec` compiles each registered part under the registry it is given, and refuses with `Outer › Inn: <inner message>` when one fails
- Tests: the review's renamed-pin, missing-part and undriven-signal cases are refused at `compileSpec`, naming the chain; a part that compiles is unaffected, and the cache rule (R827) still holds
## Verification command
`pnpm exec vitest run --project node src/core/spec src/core/chips`
## Blocked by
—

### FID-019 · `printSpec` refuses a document in which a driverless net shares its id with a driven net
- **Date:** 2026-10-15 · **Target epic:** #140 core
- **Status:** filed (#823)
- **Why:** R826 ruling 1 repeats a net id on a chip OUT with two drivers. When one of them is a floating source (`FloatingBesideInput`), the nand2tetris dialect prints `Or(a=a, b=a, out=out);` and the hacer dialect `wire out = a;`. `parseSpec(printSpec(doc, { sidecar }))` then gives no diagnostic and compiles `out=a`; only the sidecar's note survives. `compileSpec` refuses the document itself (`Net id "out" names more than one net`). It is unreachable today, because `fromLegacyCircuit` has no caller outside tests. The guard belongs where both dialects are printed, before #382 saves documents or #386 exports them.
- **Review note:** PR #743 issuecomment-6189952616, confirming the re-verifier's nit in issuecomment-6189654080

**Draft issue body**
## Goal
Neither dialect prints a document whose text would read back as a different circuit.
## Acceptance criteria
- `printSpec` refuses, in both dialects, a document in which a `driver: null` net shares its id with a driven net, and names that net
- The hacer-dialect round trip of `FloatingBesideInput` is pinned beside `src/core/spec/fromLegacyCircuit.parity.test.ts`
## Verification command
`pnpm exec vitest run --project node src/core/spec`
## Blocked by
—

### FID-020 · #338 lists the narrow-first multi-driven OUT as an expected disagreement
- **Date:** 2026-10-15 · **Target epic:** #140 core
- **Status:** declined (inbox panel, #791: already carried by #811's corpus, which pins both part orders as intended under R343; #338's official-vector run never meets the shape)
- **Why:** the reference accepts `Not(in=a, out=out[0]); Not16(in=b, out=out);` and evaluates it in part order (`out=65535` for `a=0, b=0`), but refuses the parts the other way round. `checkMultipleAssignments` (`builder.ts:157-167`) never checks a whole write after a sliced one. This is R343's known order dependence, on the output side, reached through the importer. HACER refuses both orders, which is right, so #338's differential harness will report the case as a disagreement. The same review asked that R826 ruling 1 say "every HACER evaluator", and the rulings file says so.
- **Review note:** PR #743 issuecomment-6189952616

**Draft issue body**
## Goal
The differential harness classes this case as a reference defect, not a HACER bug.
## Acceptance criteria
- #338's expected-disagreement list names the narrow-first multi-driven OUT, with R343 and `builder.ts:157-167` as the reason
- A harness test feeds both part orders and expects the reference to accept one and refuse the other, while HACER refuses both
## Verification command
`pnpm run test:differential`
## Blocked by
#338

### FID-021 · A strict acceptance mode for the grading path
- **Date:** 2026-10-15 · **Target epic:** #140 core
- **Status:** filed (#840)
- **Why:** after #747, `hacer test` refuses all 56 out-of-range slice shapes the reference refuses, but it still accepts 9 shapes the reference refuses for another reason: 7 subscripts of an internal signal (`Internal pins … cannot be subscripted or indexed`, `builder.ts:436, 483`) and 2 reads of a chip OUT (`Cannot use output pin as input`, `:477`).
  - End to end, an `Or8Way` with `Not(in=out, out=spare)` added, or with an internal `t[0]`, passes the official vectors 5/5 through `hacer test`, while the reference refuses to build it.
  - #722 only makes the export honest about these constructs, and FID-008 would only label them. Nothing decides what grading does with them.
  - For 5 shapes HACER's message names an out-of-range index where the reference names the earlier cause, so a learner who fixes the index lands on a shape the reference still refuses.
- **Review note:** PR #747 issuecomment-6190213877

**Draft issue body**
## Goal
`hacer test`, `runTest` and `testChip` grade only HDL the reference builds, while the spec and canvas paths keep the superset and #722 lowers it on export.
## Acceptance criteria
- In grading mode, a subscript of an internal signal and a read of a chip OUT are refused with the reference's cause, checked before the width check
- A test per row of the review's end-to-end table: the control passes, and each of its two PASS rows becomes a refusal
- The 9 probes `hacer test` accepts today are refused in grading mode and still accepted by `compileSpec`
## Verification command
`pnpm exec vitest run --project node src/core/testing src/core/hdl`
## Blocked by
—

### FID-022 · The `nand2tetris` dialect prints one sliced buffer per alias run, not one `Or` per bit
- **Date:** 2026-10-16 · **Target epic:** #140 core
- **Status:** filed (#844)
- **Why:** since PR #753, IN bits that reach an OUT through buses are the commonest line in the export, and the per-bit desugar (`src/core/spec/printSpec.ts:39-48`) prints each bit as its own `Or`.
  - C5's `wire out = a;` prints as four `Or` lines, and so does `bus-endpoints`. A byte swap into an OUT prints 16 lines where the hacer dialect has two `wire`s.
  - Over the review's 3,759 valued exports, buffers are 6,336 of the 12,597 statements under `PARTS:`, against 4,075 `wire` lines in the hacer dialect, and 703 documents print more buffers than wires.
  - One buffer per run would serve: `Or16(a[0..7]=x[8..15], b[0..7]=x[8..15], out[0..7]=y[0..7])` builds in the reference and in HACER, and both evaluate it correctly (6 of 6 vectors each).
  - The values are sound; the text is not what a learner would write. #743's review named the shape and left it to #374's design. It belongs next to #722.
- **Review note:** PR #753 issuecomment-6205099371, proposal 1

**Draft issue body**
## Goal
The `nand2tetris` dialect lowers each alias run to one sliced buffer, so the export reads as HDL a learner would write.
## Acceptance criteria
- `printSpec(doc, { dialect: 'nand2tetris' })` prints one buffer per contiguous run of an alias, for example `Or16(a[0..7]=x[8..15], b[0..7]=x[8..15], out[0..7]=y[0..7])` for half of a byte swap into an OUT
- Tests: C5, `bus-endpoints` and a byte swap print the run form, read back through `parseHDL` → `compileHDL`, and evaluate as before on every vector; the reference's verdict for the same three is recorded beside them
## Verification command
`pnpm exec vitest run --project node src/core/spec`
## Blocked by
—

### FID-023 · Amend FID-019: pin the disjoint-bit export gap, and make the import's consumers compile before they print or save
- **Date:** 2026-10-16 · **Target epic:** #140 core
- **Status:** filed (#823), criterion 1 landed with #860 (PR #911 issuecomment-6332719109)
- **Why:** PR #753's fidelity review confirmed both of its verifiers' export-gap nit on the reference, and widened it.
  - ExportGap, a chip OUT fed on disjoint bits by two drivers, prints `Or(a=a, b=a, out=o[0]); Or(a=b, b=b, out=o[1]);`. The reference builds it and gives `o = 0, 2, 1, 3` for `(a, b)` = `00, 01, 10, 11`, and HACER's export path gives the same. Legacy gives `b<<1` or `a`, by wire order, and `compileSpec` refuses the document (`Net id "o[0]" names more than one net`).
  - ExportGapParts, the same shape through two `Not`s, gives `o = 3` at `a = b = 0`, where legacy gives 2 or 1.
  - The reference builds 340 of the review's 1,450 multi-driven imports. 324 also build through HACER's export path, and in 6 of them some vector's value is one that no wire order gives.
  - All 324 carry the driverless twin that FID-019's predicate names (`src/core/spec/fromLegacyCircuit.ts:241-243`), so FID-019 closes the gap by construction; until it lands, only convention does. Not `sev:critical`: nothing outside the tests calls the importer.
  - The convention is now posted where the importer's first consumers will read it: "an import that `compileSpec` refuses must be compiled before it is printed or saved", on #382 (issuecomment-6205116155) and #386 (issuecomment-6205116646).
- **Review note:** PR #753 issuecomment-6205099371, proposal 2

**Draft issue body**
## Goal
FID-019's guard covers PR #753's disjoint-bit case, and the importer's first consumers refuse what `compileSpec` refuses.
## Acceptance criteria
- FID-019's criteria gain one row: ExportGap is pinned beside `FloatingBesideInput`, and `printSpec` refuses it in both dialects, naming the net
- #382 and #386 each carry, in their bodies, "an import is compiled with `compileSpec` before it is printed or saved, and its diagnostics are shown when it is refused"
## Verification command
`pnpm exec vitest run --project node src/core/spec`
## Blocked by
—

### FID-024 · ADR-0020 §10 records R837's loop granularity and names where it overapproximates
- **Date:** 2026-10-16 · **Target epic:** #140 core
- **Status:** filed (#846)
- **Why:** the reference checks loops per part and per signal name. `sortParts` (`../web-ide/simulator/src/chip/chip.ts:500-543`) walks from a part to the names it writes, `partToOuts` and `insToPart` are keyed by pin name, and `checkLoops` (`builder.ts:292-318`) refuses a part that reads a name it writes.
  - The import gives every read run of a producer its own name, so the reference's graph on the export is the bit graph through wires and buses, contracted per part: PR #753's `partCycle`. All 2,040 of the review's R837 documents build in the reference and agree on every vector, and all 1,214 real cycles are refused.
  - A part that reads bits of its own output without a loop through its bits (SelfReadNot16, where `o = a` through a bitwise `Not16`) is refused by HACER, the reference and legacy alike. That is nand2tetris-sound and an overapproximation in the digital-design frame: Verilator 5.052's UNOPTFLAT and Yosys's `check -force-detailed-loop-check` analyse loops per bit.
  - This run's records PR added the granularity sentence to ADR-0020 §10, citing R837. Approving keeps it and adds the overapproximation; declining removes the sentence.
- **Review note:** PR #753 issuecomment-6205099371, proposal 3

**Draft issue body**
## Goal
ADR-0020 §10 states the loop granularity N.2's parity uses and where it differs from a per-bit synthesis view.
## Acceptance criteria
- §10 says a loop counts when it closes in the part graph traced per bit through wires and bus components, with parts opaque, and that this is the reference's `sortParts`/`checkLoops` granularity (present since this run's records PR)
- §10 names the overapproximation, with SelfReadNot16 as its example, and L-001 in `docs/development/observed-bugs.md` cites §10
## Verification command
`pnpm run lint:docs`
## Blocked by
—

### FID-025 · The not-connected refusal fires only for a pin no connection names, so a pin bound only out of range gets the reference's one refusal
- **Date:** 2026-10-21 · **Target epic:** #140 core
- **Status:** filed (#882)
- **Why:** PR #818 (#813, FID-011) makes `compileHDL`'s unconnected-input refusal say `the nand2tetris simulator reads it as 0; bind in=false to do the same`. That is true wherever no connection names the pin. The review ran 600 documents through the web IDE at `91ef428` and found 0 mismatches on 4,500 vectors. One case is different: a pin whose only bindings are out of range.
  - `Not16(in[16]=a, out=o)` is refused by the reference once: `Line 1: Sub-bus index out of range (in has width 16)` (`../web-ide/simulator/src/chip/chip.ts:270-278`). The reference never treats `in` as unconnected.
  - HACER also prints `input pin "in" is not connected: …; bind in=false to do the same`, because `coversAnyBit` counts only in-range bits (`src/core/hdl/compiler.ts:92-93, 290`). #367 pinned this cascade at `src/core/hdl/compiler.test.ts:618-627`, before the message made a claim about the reference.
  - The advice fails there. With `in=false` added, the HDL path is still refused for range, and the spec path is refused as `p1 pin "in" is bound by both "a" and "false"`.
  - `bindUnconnectedInputs` keys on net sinks by pin name, so it returns `bound: []`. The ADR's "binds every such pin" therefore does not hold for this pin, and the two functions disagree only on this edge.
- **Review note:** docs/research/2026-10-fidelity-review-pr-818.md

**Draft issue body**
## Goal
`compileHDL` and `bindUnconnectedInputs` agree on which part inputs are unconnected. The refusal that names the reference's 0 and advises `bind X=false` is printed only where the reference reads 0 and the advice works.
## Acceptance criteria
- `compileHDL` reports `Part "P" input pin "X" is not connected: …` only for an input pin that no connection names. A pin whose every binding is refused as out of range gets only that refusal.
- `Not16(in[16]=a, out=o)` gives exactly `['Part "Not16" pin "in[16]" is out of range; "in" has width 16']`. That is one refusal, as the reference gives, and the expectation at `src/core/hdl/compiler.test.ts:618-627` changes to match. `And(a=a, out=out)` at `:631-640` is unchanged.
- One test asserts that the pins `compileHDL` calls not connected equal `bindUnconnectedInputs(…).bound`. It covers #813's seeded unwired corpus (`src/core/spec/fromLegacyCircuit.parity.test.ts`) and `Not16(in[16]=a, out=o)`.
- If the panel keeps the cascade instead, that pin's message is the bare `Part "Not16" input pin "in" is not connected`, with no claim about the reference and no advice.
## Verification command
`pnpm exec vitest run --project node src/core/hdl src/core/spec src/cli`
## Blocked by
#813 (PR #818). It edits the same strings as FID-015 (#820), so whichever lands second rebases.

### FID-026 · Builtins-first matches the reference only over HACER's builtin names: #206 states what a part named after one of the reference's other 27 builtins resolves to
- **Date:** 2026-10-21 · **Target epic:** #140 core
- **Status:** filed (#901)
- **Why:** PR #826 (#816) refuses a part cycle through the registry, and says that builtins-first (`src/simulation/topologicalEval.ts:314`) compiles the user `Not`/`And` pair "as the reference does". That holds for the pair. It does not hold in general.
  - The web IDE resolves every name in its 43-name `REGISTRY` to the builtin before it reads any file (`../web-ide/simulator/src/chip/builder.ts:48`, `builtins/index.ts:68, 127`). Measured at `91ef428`: all 43 names resolve with 0 reads, even with a file of that name present. So in the reference a user chip is never a part under those names.
  - HACER's builtins are the 16 Project 1 chips (`src/core/chips/appRegistry.ts:10`). The other 27 reference names resolve to user chips under builtins-first: `Add16 ALU ALUNoStat ARegister Bit Computer CPU DFF DRegister FullAdder HalfAdder Inc16 Keyboard Memory Nand16 PC RAM16K RAM4K RAM512 RAM64 RAM8 Register ROM32K Screen XOr Xor16 XOr16`.
  - Measured: take a user `HalfAdder` that uses `FullAdder`, beside a user `FullAdder` that uses `HalfAdder`. The reference accepts it with its builtin `FullAdder`, and 1+1 gives `sum=0 carry=1`. HACER at PR #826's head refuses it with `Chip "HalfAdder" uses itself through "FullAdder"`. On `main` it compiled and threw the depth error.
  - Not reachable today, because the user registry is empty (#206). Once user chips are registered, the same split decides values as well as cycles: a learner's wrong `HalfAdder` would feed a `FullAdder` that the reference builds on the builtin.
  - The book's Appendix A §3 (HUJI copy, fetched 2026-10-21) gives the opposite order: "if <chip name>.hdl exists in the current directory then load it … else if … BuiltIn …". The book and the web IDE disagree, and no vector decides between them. ADR-0020 §1.11 rule 4 says only that "the lookup order (#206) decides".
- **Review note:** docs/research/2026-10-fidelity-review-pr-826.md

**Draft issue body**
## Goal
Before user chips are registered at runtime, it is stated and pinned what a part resolves to when its name is a builtin in the reference but not in HACER, and which lookup order (the book's or the web IDE's) the runtime registry follows.
## Acceptance criteria
- #206's shaped spec, or ADR-0020 §1.11 rule 4, names the order the runtime registry uses. It cites the book's own-first order (Appendix A §3) and the web IDE's builtins-first order (`builder.ts:48`). It states that builtins-first matches the reference only over HACER's builtin names.
- For the 27 names that are builtins only in the reference, it picks one of three: refuse a user chip under such a name as a part, with a message that names the reference builtin; or resolve the name to the user chip and list that as an expected disagreement; or resolve it to a HACER builtin once one exists.
- A test pins the user `HalfAdder`/`FullAdder` pair under the chosen rule.
- A test lists the names that are builtins in the reference but not in HACER, from a committed copy of the 43 names. A phase 0.6 builtin then visibly moves the boundary.
## Verification command
`pnpm exec vitest run --project node src/core/chips src/core/hdl`
## Blocked by
#206 (shaping). PR #826 must merge first; this entry adds tests next to the ones it adds.

### FID-027 · Amend FID-026: since #821 the lookup order also decides whether `compileSpec` refuses, so its pinned test adds a broken part under a reference builtin name
- **Date:** 2026-10-21 · **Target epic:** #140 core
- **Status:** filed (#901)
- **Why:** PR #845 (#821) makes `compileSpec` compile every definition its parts reach, and refuse when one fails. It ends a branch at a definition of type `'builtin'`. The reference ends one at a builtin *name*, before reading any file (`../web-ide/simulator/src/chip/builder.ts:48`). So FID-026's split now decides refusals too, not only values and cycles.
  - Measured at `91ef428`: a `FullAdder` file over two `HalfAdder` parts, beside a broken `HalfAdder` file (`Not(in=q, out=carry)`), is accepted with 0 reads. It uses the builtin `HalfAdder`, and 1+1+1 gives `sum=1 carry=1`.
  - At PR #845's head `f8cbef0c`, `compileSpec` refuses the same `FullAdder` over that user `HalfAdder`: `FullAdder › HalfAdder: Signal "q" is read by part "Not" but no part produces it`. `main` `d0350825` accepts it at compile.
  - The same happens inside HACER's own builtin names whenever the registry puts user chips first. Under `combineRegistries(user, builtins)`, an `Outer` over a broken user `Not` is refused as `Outer › Not: …`, and the reference builds it on its builtin `Not`. `combineRegistries(shadow, base)` is the shape that #821's cache test uses.
  - Not reachable today: the user registry is empty (#206).
- **Review note:** docs/research/2026-10-fidelity-review-pr-845.md

**Draft issue body**
## Goal
FID-026's lookup rule is pinned for refusals as well as values. A learner's broken chip refuses a parent exactly where the chosen rule says that parent uses it.
## Acceptance criteria
- FID-026's pinned tests gain two shapes under the chosen rule:
  - a `FullAdder` over a broken user `HalfAdder`;
  - an `Outer` over a broken user `Not`, in the registry view that #206's runtime caller passes to `compileSpec`.
- Each shape is either accepted on the builtin, as the reference does, or refused with the `›` chain.
- If the rule refuses where the reference builds on its builtin, ADR-0020 §1.11 rule 2 lists that as an expected disagreement and names the rule.
## Verification command
`pnpm exec vitest run --project node src/core/spec src/core/chips`
## Blocked by
FID-026's decision, and #206 (shaping). #821 (PR #845) must merge first.

### FID-028 · A registered definition must agree with its source: refuse one whose name or pins differ from its HDL's or its document's
- **Date:** 2026-10-21 · **Target epic:** #140 core
- **Status:** filed (#903)
- **Why:** PR #845 refuses a spec whose registered part does not compile. It checks the parent against the part's *declared* pins (`src/core/hdl/compiler.ts:247, 275-276, 350` at `f8cbef0c`), and the part's body against its *source*. Nothing checks that the two agree.
  - Measured at head and on `main`: a hand-built `'hdl'` `Foo` declares `IN a` over the source `CHIP Foo { IN b; OUT out; PARTS: Not(in=b, out=out); }`. `Outer` = `Foo(a=a, out=o)` is accepted, and gives `o = 1` for `a` = 0 and for `a` = 1, because `b` is never driven.
  - A registered `Foo` whose source says `CHIP Bar` is accepted too, and evaluates as `Bar`.
  - The reference cannot hold either chip. Its pins are read from the source. A `Foo` file holding `CHIP Bar` is refused, `Line 1: Wrong chip name` (`../web-ide/simulator/src/chip/builder.ts:229-231`), so its parent gets `Undefined chip name: Foo`.
  - The production builders take the name and pins from the source (`hdlChipDefinition`, `compiler.ts:31-38`, and `compileSpec`'s `chip`). Hand-built definitions do not: they are routine in tests (#821's own case in `src/core/chips/evaluateChip.test.ts`), and an agent can register one through the core API. Not reachable by a learner today (#206).
- **Review note:** docs/research/2026-10-fidelity-review-pr-845.md

**Draft issue body**
## Goal
A registered definition is refused, with a message that names both sides, when its name, inputs or outputs differ from those of the source it carries. The refusal comes from `compileSpec`'s part check and from `evaluateChip`, so no chip evaluates against pins its body does not have.
## Acceptance criteria
- An `'hdl'` definition is refused when its `name` differs from its source's `CHIP` name, or its `inputs` or `outputs` (names, order-free, and widths) differ from the source's `IN`/`OUT`. `compileSpec` refuses it through the part check, in rule 2's `›` chain form, and never throws. `evaluateChip` refuses it before it evaluates.
- A `'circuit'` definition is first measured against its document's `name`, `ins` and `outs`, and gets the same refusal if it disagrees.
- Tests: `Outer` over a `Foo` that declares `IN a` over `IN b` is refused. `Outer` over a `Foo` registered from a `CHIP Bar` source is refused. Every definition built by `hdlChipDefinition` or returned as `compileSpec`'s `chip` is unaffected, with the existing suites green.
- ADR-0020 §1.11 rule 2 records the check, and cites the reference's `Wrong chip name`.
## Verification command
`pnpm exec vitest run --project node src/core/spec src/core/chips src/core/hdl`
## Blocked by
#821 (PR #845): this extends its part check.

### FID-029 · A literal on a part pin wider than 16 bits: decide all ones or the reference's 16, pin it, and record it
- **Date:** 2026-10-21 · **Target epic:** #140 core
- **Status:** filed (#905)
- **Why:** PR #853 (#814) writes "`true` is every bit of the pin it feeds" into ADR-0020 §1.10.9 and says the reference models the constants "the same way". Measured at `91ef428` and at the PR's head `876964a0`, they agree on every pin up to 16 bits, and differ above that.
  - The reference's `TRUE_BUS` is a 16-bit `ConstantBus` holding `0xffff`, `super(name, 16 /* TODO: get high bit index */)` (`../web-ide/simulator/src/chip/chip.ts:180`, `:201`). A user chip `W32` with `IN a[32]`, bound `W32(a=true, …)`, reads `0x0000ffff`: low half 65535, high half 0.
  - HACER reads all 32 bits as ones, through `compileSpec` and the HDL engine alike: `maskForWidth` (`src/simulation/busOps.ts:8-12`, `src/core/hdl/compiler.ts:458-459`).
  - No vector reaches it (every official chip is at most 16 bits), no test pins it, and nothing records it. It predates #853. Not reachable by a learner today: the user registry is empty (#206). It becomes reachable with any wide user chip, the kind of custom architecture the North Star names.
- **Review note:** docs/research/2026-10-fidelity-review-pr-853.md

**Draft issue body**
## Goal
A literal on a part pin wider than 16 bits has one decided value, which is pinned by a test and recorded in ADR-0020 §1.10.9, with the reference's behaviour named beside it.
## Acceptance criteria
- ADR-0020 §1.10.9 states the value of `true` on a pin wider than 16 bits.
  - It is either every bit (HACER today) or the low 16 (the reference).
  - If HACER keeps every bit, the section names the reference's 16-bit `ConstantBus` (`chip.ts:180`) as an intended difference.
- A test in `src/core` pins the decision through both readers:
  - `W32(a=true, lo=lo, hi=hi)` over a registered `W32` with `IN a[32]` and outputs its two 16-bit halves;
  - run through `compileSpec` and through `compileHDL`;
  - asserting the decided `hi`.
- A sliced 16-bit literal (`b[3..5]=true`) and `And16(b=true)` keep their present values, which equal the reference's.
## Verification command
`pnpm exec vitest run --project node src/core/spec src/core/hdl`
## Blocked by
#814 (PR #853), which adds the §1.10.9 text this amends.

### FID-030 · The combinational-cycle refusal carries a line, as the reference's `Looping wire` and `Circular pin dependency` do
- **Date:** 2026-10-21 · **Target epic:** #140 core
- **Status:** filed (#906)
- **Why:** #820 (PR #862) gives the cycle refusal no line, as an error no part caused, "as `createError` omits the line when there is no span". The reference has a span for both of its cycle refusals. Measured on the web IDE at `91ef428` under tsx; upstream `main` `6a81b5dd` has the same builder and chip sources (fetched 2026-10-21):
  - `And(a=a, b=t, out=t);` on line 5 gives `Line 5: Looping wire t`, at the part's span (`../web-ide/simulator/src/chip/builder.ts:318`). It is the shape of PR #862's own no-line tests (`src/core/hdl/compiler.test.ts:1150`, `src/core/testing/engine.test.ts:178` at `9c457be0`).
  - `Nand(a=a, b=y, out=x);` on line 5 and `Not(in=x, out=y);` on line 6 give `Line 6: Circular pin dependency`. The reference wires parts in source order and raises it at the wire that closes the loop (`../web-ide/simulator/src/chip/chip.ts:626, 687`).
  - #811's corpus records both with `Line 1:` (`looping-wire`, `loop-across-parts` in `conformance/acceptance/hdl-shapes.json`). At PR #862's head, HACER gives both `Cyclic part dependency: … through …` with no line (`src/core/hdl/compiler.ts:449`). They are the only refusals in the corpus where the reference's message has a line and HACER's does not.
  - #820's Goal: "Every compile error a test report shows gives the line the web IDE gives."
- **Review note:** docs/research/2026-10-fidelity-review-pr-862.md

**Draft issue body**
## Goal
A combinational-cycle refusal carries the line of the part the reference blames, in `HDLCompileError.line` and as the `Line N: ` prefix. With it, every compile refusal a test report shows has the web IDE's line for a part written on one line.
## Acceptance criteria
- The refusal takes the line of the first part, in source order, that closes a cycle with the parts before it. A part that reads a signal it also writes is that part (the reference's `Looping wire`).
- The wording stays HACER's, `Cyclic part dependency: … through …`. Only the line and the prefix are added. A part with no source line, as a spec lowers it, still gets neither.
- For a part written across several lines, the line is the line of the part's name. This is #820's known difference, unchanged.
- Tests:
  - the `looping-wire` shape with its part on line 5 gives line 5;
  - a two-part cycle on lines 5 and 6 gives line 6;
  - the no-line tests at `src/core/hdl/compiler.test.ts:1150` and `src/core/testing/engine.test.ts:178` keep only the refusals no part causes (builtin not found, not a builtin);
  - `src/core/hdl/acceptanceParity.test.ts:140-141` take the `Line 1: ` prefix.
## Verification command
`pnpm exec vitest run --project node src/core/hdl src/core/testing`
## Blocked by
#820 (PR #862), which adds the line and the prefix this extends.

### FID-031 · Grading names the reference's first cause when an earlier part or wire has a per-part cause the check does not model
- **Date:** 2026-10-22 · **Target epic:** #140 core
- **Status:** filed (#909)
- **Why:** #840 (PR #869) refuses a chip-OUT read and a subscripted internal pin with the reference's sentence, and leaves a cause to `compileHDL` when the reference would stop on an unknown part, the chip as its own part, a looping wire, an unknown pin, or a write to a chip IN or a constant. It does not stop for the other per-part causes the reference raises while it wires a part (`../web-ide/simulator/src/chip/builder.ts:323-361`). Then a later part's chip-OUT read or subscript is named instead of the earlier cause. Measured at PR #869's head `23587532` against the web IDE at `91ef428` under tsx, 2026-10-22:
  - `Not(in=a, in=b, out=o);` then `Not(in=o, out=p);`: the reference gives `Line 4: Cannot write to pin in multiple times` (`builder.ts:395`), and grading gives `Line 5: Cannot use output pin as input`.
  - In one part, `And(a=a, a=b, b=o, out=p);`: the reference gives the double binding of `a`, and grading gives the chip-OUT read.
  - An OUT written by two parts before a read of it: `Cannot write to pin o multiple times` (`:427`) against the chip-OUT read.
  - An internal written twice before a subscript of it: `Internal pin t already defined` (`:451-454`) against the subscript.
  - `Not(in=a[3], out=o);` with a one-bit `a`, and `Not(in[2]=a, out=o);`, each before a chip-OUT read: `Sub-bus index out of range` (`../web-ide/simulator/src/chip/chip.ts:277`) against the chip-OUT read.
  - Both sides refuse every one of these, and `compileHDL` refuses each earlier cause alone (`bound by more than one connection`, `driven by more than one part`, `sub-bus index out of range`). Only the cause and the line a learner sees first differ. #840's goal is the reference's cause, and #820's is the web IDE's line.
- **Review note:** docs/research/2026-10-fidelity-review-pr-869.md

**Draft issue body**
## Goal
On the grading path, a shape with two refusable causes reports the cause the reference reports first. When the reference would stop earlier on a per-part cause that `compileHDL` also refuses, `gradingRefusal` stops there and leaves it to `compileHDL`, as it already does for an unknown pin.
## Acceptance criteria
- `gradingRefusal` returns null at the first wire, in part and wire order, where the reference raises one of these:
  - a part pin, or a bit of it, bound twice;
  - a chip OUT bit written twice;
  - an internal pin written twice;
  - a sub-bus index outside a chip pin's or a part pin's width.
- Tests: the six shapes above give `compileHDL`'s refusal of the earlier cause on its line. Each of the six shapes with its first cause removed still gives the chip-OUT or subscript sentence.
- A test shows that `compileHDL` refuses each deferred cause on its own, so deferring never accepts a shape the reference refuses.
- The corpus `grading` cells are unchanged.
## Verification command
`pnpm exec vitest run --project node src/core/testing src/core/hdl`
## Blocked by
#840 (PR #869), which adds the check this extends.

### FID-032 · A `BUILTIN` body declares the builtin's own pins: refuse a source whose `IN` or `OUT` differ from the builtin it names
- **Date:** 2026-10-22 · **Target epic:** #140 core
- **Status:** filed (#919)
- **Why:** #903 (PR #910) refuses a definition whose name or pins differ from its source's, and leaves `BUILTIN` bodies out. ADR-0020 §1.11 rule 2 says such a body "is compared with its source only, not with the builtin's own pins, which the web IDE takes (`../web-ide/simulator/src/chip/builder.ts:233-235`)". The #849 panel sent that gap to a separate entry. Measured on `main` `33ae5ec7` with a throwaway vitest probe, and on the web IDE at `91ef428` under tsx, 2026-10-22:
  - `CHIP Foo { IN a; OUT out; BUILTIN Not; }`, built by `hdlChipDefinition` and registered, passes #910's check, because its declared pins are its source's. `Outer` = `Foo(a=a, out=o)` is accepted by `compileHDL` and by `compileSpec`, and gives `o = 1` for `a` = 0 and for `a` = 1. The passthrough hands the source's inputs to the builtin's `evaluate` (`src/core/hdl/compiler.ts:254-261`), and `Not` reads `in`, which nothing binds.
  - `CHIP Foo { IN a; OUT o; BUILTIN Nand; }` evaluates to `{ out: 1 }`, a pin `Foo` does not declare. `Outer` = `Foo(a=a, o=o)` is accepted on both paths and gives `o = 0` for both inputs.
  - The control, `CHIP Foo { IN in; OUT out; BUILTIN Not; }`, gives `o = ¬a`.
  - The web IDE cannot hold either chip. Its grammar takes only `BUILTIN;` (`hdl.ohm:13`). A `BUILTIN` body returns the builtin named by the `CHIP` name, with the builtin's pins (`builder.ts:233-235`). `CHIP Nand { IN x, y; OUT out; BUILTIN; }` builds with `a[1], b[1], out[1]`, and so does `CHIP Nand { IN a[2], b; OUT out; BUILTIN; }`. `CHIP Foo { IN a; OUT out; BUILTIN; }` is refused (`Chip Foo not in builtin registry`), and a parent of it gets `Undefined chip name: Foo`.
  - On the grading path, R771 lets only a primitive be `BUILTIN`, and only as itself (`src/core/testing/testChip.ts:56-58`), so the stand-in is refused there. The file's own chip keeps the source's pins (`testChip.ts:85-90`). `CHIP Nand { IN x, y; OUT out; BUILTIN; }` against a test over `a`, `b` and `out` reports `output-list names pin "a", but chip Nand has no such pin`, where the web IDE runs the same test on its builtin's pins. `IN a[2], b` passes in both.
  - Not reachable by a learner on the core path today: the user registry is empty (#206). An agent can register such a definition through the core API now.
- **Review note:** PR #911 issuecomment-6332719109 (the fidelity digest of 2026-10-22)

**Draft issue body**
## Goal
A definition whose source has a `BUILTIN` body declares the pins of the builtin it names, or it is refused with a message that names both sides. No chip evaluates through a builtin against pins the builtin does not have.
## Acceptance criteria
- The source check (`sourceDisagreements`, `src/core/hdl/compiler.ts`) compares a `BUILTIN` body's `IN` and `OUT`, as name→width maps, with the pins of the builtin it names. A mismatch reads in #903's form, for example `Foo declares IN a, but builtin Not declares IN in`.
- `compileSpec`'s part check refuses it in rule 2's `›` chain, `evaluateChip` refuses it as a `ChipCompileError`, and `compileHDL` of the `BUILTIN` chip refuses it. None of them throws.
- On the grading path, a primitive's `BUILTIN` file whose pins differ from the builtin's either takes the builtin's pins, as the web IDE does, or gets the same refusal, with ADR-0020 §1.11 rule 2 listing the web IDE's reading as an expected disagreement. A test pins the choice.
- Tests:
  - the two mismatched `Foo` shapes above are refused through `compileSpec`, `evaluateChip` and `compileHDL`;
  - `CHIP Nand { IN x, y; OUT out; BUILTIN; }` and `CHIP Nand { IN a[2], b; OUT out; BUILTIN; }` through `testChip`, under the chosen rule;
  - the control `Foo`, every Project 1 builtin, and a primitive's `BUILTIN;` file whose pins match are unaffected, and the existing suites stay green.
- ADR-0020 §1.11 rule 2's `BUILTIN` sentence is replaced by the check.
## Verification command
`pnpm exec vitest run --project node src/core/spec src/core/chips src/core/hdl src/core/testing`
## Blocked by
—
