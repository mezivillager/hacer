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
- **Status:** proposed
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
- **Status:** proposed
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
- **Status:** proposed
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
- **Status:** proposed
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
- **Status:** proposed
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
- **Status:** proposed
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
- **Status:** proposed
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
- **Status:** proposed
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
- **Status:** proposed
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
