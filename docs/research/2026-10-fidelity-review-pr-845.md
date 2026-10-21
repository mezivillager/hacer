# Fidelity review — PR #845: `compileSpec` refuses a spec whose registered part does not compile

- **Date:** 2026-10-21 · **Artifact:** PR #845 at `f8cbef0c` (#821, FID-018; amends ADR-0020 §1.11
  rules 2 and 3) · **Policy:** ADR-0018 §2
- **Domain:** HDL semantics. The question is when, and with what message, a chip is refused when a
  part below it does not build. Frame: the nand2tetris model. No timing or physics claim is made.

## Ground truth used

| Source | What it says |
|---|---|
| Web IDE at `91ef428`, `simulator/src/chip/builder.ts` | `loadChip` (`:43-76`) returns the builtin for any builtin name (`:48`). Otherwise it reads `${dir}/${name}.hdl` and builds it with the same `dir` and `fs` (`:52-62`), and turns a failed build into an `Err` that keeps the inner message (`:63-64`). `wireParts` then discards that message, refusing the parent with `Undefined chip name: ${part.name}` at the part's span (`:261-264`). `build` refuses a file whose `CHIP` name is not its file name with `Wrong chip name` (`:229-231`). The internal-pin and width checks run after every part has loaded (`:280-288`). The first error ends the build. |
| Web IDE, `components/src/stores/chip.store.ts:378-394` | The chip page compiles through `parse`. On an `Err` it sets the error status and marks the chip invalid, and `replaceChip`, the first evaluation, is never reached. |
| Vectors | None reaches this. A `.tst` loads one chip that builds. `src/core/hdl/acceptanceParity.test.ts` has no row with a registered user part, and is unchanged on the branch (verifier). |
| Book | Not read for this question. Appendix A §3 on lookup order is FID-026's. |

## Measurements

**Reference.** The web IDE's builder ran under tsx on Node 22.19 against an in-memory filesystem that
counts reads, one process per shape. Every refusal came from `parse`, with 0 evaluations.

**HACER.** A tsx probe ran at head `f8cbef0c` against hand-built registries over the builtins. The
lookup and pin rows were also run on `main` `d0350825`. Fixtures are #821's: `Foo` = `Not(in=a, out=out)`,
the renamed `Foo` has `IN b`, `Inn` = `Foo(a=x, out=y)`, and `Outer` = `Inn(x=a, y=o)`. HACER line
numbers below are at head.

| Shape | Reference | HACER head |
|---|---|---|
| Renamed pin | `Line 1: Undefined chip name: Inn`. `Inn` alone: `Line 1: Undefined pin name: a` | `p1 Outer › Inn: Part "Foo" has no pin "a"`, plus `p1 Outer › Inn: Part "Foo" input pin "b" is not connected: …` |
| Missing part (no `Foo`) | `Line 1: Undefined chip name: Inn`. `Inn` alone: `Undefined chip name: Foo` | `p1 Outer › Inn: Unknown chip-part: "Foo"` |
| Undriven (`Bad` = `Not(in=t, out=out)`) | `Line 1: Undefined chip name: Bad`. `Bad` alone: `Undefined internal pin name: t` | `p1 Outer › Bad: Signal "t" is read but nothing drives it` |
| Two levels, `Outer` → `Mid` → `Inn` | `Line 1: Undefined chip name: Mid` | `p1 Outer › Mid › Inn: Part "Foo" has no pin "a"`, plus its sibling |
| `Inn` does not parse | `Line 1: Undefined chip name: Inn` | `p1 Outer › Inn: Expected ')' but got 'out'` |
| `Inn` fails, and `Baz` under it fails too | `Line 1: Undefined chip name: Inn`: one error | three: two under `Outer › Inn`, and `Outer › Inn › Baz: Signal "t" is read by part "Not" but no part produces it` |
| `Outer` reads an undriven `t` after the broken `Inn` | `Line 1: Undefined chip name: Inn` | only `Signal "t" is read but nothing drives it` |
| `Outer` has `Not(in=a, out=a)` after the broken `Inn` | `Line 1: Undefined chip name: Inn` | only `p2 Chip input "a" is written by p2.out` |
| The same `Not` before the broken `Inn` | `Line 1: Looping wire a` | not run |
| `Outer` binds `Inn(q=a, …)`, and `Inn` is broken | `Line 1: Undefined chip name: Inn` | only `p1 Inn has no pin "q"` |
| `'hdl'` `Outer` over the broken `Inn` | as the renamed-pin row | `compileHDL` succeeds. The first `evaluateChip` throws `evaluateChip: chip "Inn" failed to compile: …` |
| `'circuit'` `Outer` through `evaluateChip` | — | `evaluateChip: chip "Outer" failed to compile: Outer › Inn: …` |
| `FullAdder` over a broken user `HalfAdder` (`Not(in=q, out=carry)`) | accepted with 0 reads, using the builtin `HalfAdder`. 1+1+1 gives `sum=1 carry=1` | **refused**: `p1 FullAdder › HalfAdder: Signal "q" is read by part "Not" but no part produces it`. `main` accepts it |
| `Outer` over a broken user `Not`, under `combineRegistries(user, builtins)` | accepted with 0 reads, using the builtin `Not` | **refused**: `p1 Outer › Not: …`. `main` accepts it |
| A non-HDL `Not.hdl` beside an `Outer` that uses `Not` | accepted with 0 reads | — |
| `Foo.hdl` holds `CHIP Bar` | `Line 1: Undefined chip name: Foo`. `Foo` alone: `Line 1: Wrong chip name` | a registered `Foo` whose source is `CHIP Bar` is accepted, and `o` = ¬`a`. Same on `main` |
| A registered `'hdl'` `Foo` that declares `IN a` over the source `IN b` | cannot be written: the reference reads a chip's pins from its source | accepted. `o` = 1 for `a` = 0 and for `a` = 1, because `b` is never driven. Same on `main` |

## Verdicts

| Claim (PR #845 body, ADR-0020 §1.11 rules 2–3, #821's Why) | Verdict | Source |
|---|---|---|
| "The reference refuses the parent at build time too" | **sound**. All five failing shapes are refused by `parse` with 0 evaluations, and the web IDE's chip page shows the error before any evaluation. HACER's `compileSpec` is build time for a direct caller, such as an agent. Its one production caller, `evaluateChip`, compiles and evaluates in one call, so on that path the PR changes the message, not when it arrives | runs above; `chip.store.ts:378-394`; `evaluateChip.ts:48` |
| "but replaces the inner error with `Undefined chip name: Inn`" (`builder.ts:261-264`) | **sound**, and two points are missing. At depth, the reference names the parent's direct part (`Mid`), never the chip that failed. It also gives the same text for a part with no file as for one that does not build | two-level and missing-part rows |
| `loadChip` builds every non-builtin part recursively (`:43-76`) | **sound** | `:52-62`; 1–3 file reads per shape |
| The chain is flat, `Outer › Mid › Inn: <message>`, and carries the `partId` of the spec's part that begins it | **sound**. It is a superset of the reference. The reference's span is that same part (`Inn(x=a, y=o)`, characters 33–47 of `Outer`), so HACER's `partId` and the reference's `Line N` point at the same part | spans in the runs |
| The inner message is kept verbatim | **sound** as code: the PR's test at `compileSpec.nesting.test.ts:121` asserts equality with `Inn`'s own diagnostics. The kept message is HACER's (`Part "Foo" has no pin "a"`), not the reference's (`Undefined pin name: a`). That wording is FID-015's (#820) | renamed-pin row |
| "A builtin ends a branch" | **sound** over HACER's 16 builtin names, under a builtins-first registry. The reference ends a branch on a builtin's *name*, before any read (`:48`). HACER ends it on a definition of type `'builtin'`. Where a registry resolves the name to a user chip (one of the 27 names that are builtins only in the reference, or a user-first view), the check now refuses chips the reference builds on its builtin. Not reachable today | lookup rows; FID-026; FID-027 |
| `compileHDL` alone checks only a chip's direct parts, so an `'hdl'` chip over a broken part is refused at its first evaluation, without a chain | **sound** as HACER's behaviour. Against the reference it is a divergence: the reference refuses an `.hdl` parent at build. #821 puts it out of scope, and no learner reaches it, because `testChip` registers only the file's own chip | `'hdl'` `Outer` row; #821 Scope |
| Each definition is compiled once, and named by its first chain in part order | **sound**. It changes no verdict. The reference rebuilds each instance and stops at the first failing part in part order, which is the part HACER's first diagnostic names | read counts; `compiler.ts:170-196` |
| Cache rule 3: an evaluated `Outer` refuses with a fresh `compileSpec`'s text | **sound** in the reference's frame. The reference has no cache: the chip page rebuilds from files on every compile (`chip.store.ts:378-380`). The recording view (`evaluateChip.ts:26-41`) notes every `get` and `has`, and the compile path makes no `list()` read. The verifier's cache probes were not re-run | code read; `evaluateChip.test.ts:109` |
| #821 / FID-018: "only the timing diverges" | **hand-wavy**. Acceptance agrees in every shape run on both sides that resolves each name to the same chip: 9 refusals and the passing fixture. Two more differences go unrecorded: (a) when `Outer` has an error of its own beside a broken part, the reference reports the broken part if it comes first in part order, or before its end-of-build checks, while HACER reports only `Outer`'s own error; (b) the reference reports one error, HACER reports every one. Neither is in ADR-0020 rule 2, and no vector reaches either | `Outer`-own rows; `builder.ts:261-288` |
| A registered part that does not compile is refused | **sound** for parts whose definition agrees with its source. A definition whose declared name or pins differ from its source passes both halves of the check: the parent is checked against the declared pins (`compiler.ts:247, 275-276, 350`), and the part's body against its source. It evaluates silently. The reference cannot hold such a chip. Pre-existing on `main` | last two rows; FID-028 |

**Oracle divergence in shipped behaviour:** none. Every divergent row needs a user chip in the
registry. The user registry is empty (#206), `testChip` registers only the file's own chip, and the
production builders of definitions (`hdlChipDefinition`, `compiler.ts:31-38`, and `compileSpec`'s
`chip`) take the name and pins from the source.

## Current practice

Both tools were fetched on 2026-10-21. Each refuses at elaboration, before any simulation, and names
one level, not a chain.

- **Yosys** `hierarchy -check`, `passes/hierarchy/hierarchy.cc:424` on `main` (file last changed
  2026-10-15): "Module `%s' referenced in module `%s' in cell `%s' is not part of the design."
  It names the module, its parent and the instance.
- **Verilator**, `src/V3LinkCells.cpp:305-325` on `master` (file last changed 2026-09-27): an
  unresolved module's file is read on demand. `V3Error::abortIfErrors()` stops on that file's own
  parse errors, which are reported at their own location. A module still unresolved gets
  `Can't resolve module reference: '<name>'` at the instance.

HACER's flat chain names more than either tool, or the web IDE. Its timing matches all three.

## Proposals

- **FID-027**: amends FID-026. Since #821, the lookup order also decides whether `compileSpec` refuses.
  A broken user `HalfAdder` now refuses a `FullAdder` that the reference builds on its builtin.
- **FID-028**: a registered definition must agree with its source. The part check and `evaluateChip`
  refuse a definition whose name or pins differ from its HDL's or its document's, as the reference's
  `Wrong chip name` does for the name.

Not proposed: rows (a) and (b) of the hand-wavy verdict. Both sides refuse in every such shape, so
acceptance is unchanged. Which refusal a learner sees first is message selection, next to #820's
wording. #820 (FID-015) or a later ADR-0020 edit can record them.

## Could not verify

- The web IDE in a browser. Only the builder under Node with an in-memory filesystem was run, and the
  status text the chip page shows was read from `chip.store.ts`, not observed.
- The book's text on a chip whose part does not load. It was not read.
- The verifier's cache-exactness and per-tick timing probes were not re-run. Rule 3's exactness rests
  on the code read and the PR's test.
- The `'circuit'` form of FID-028's mismatch (declared pins against the document's `ins`/`outs`).
  Only the `'hdl'` form and the name were measured.
- Whether the reference's verdict on the lookup rows matches the Java Hardware Simulator, which
  follows the book's own-first order. FID-026 records that the two disagree.
