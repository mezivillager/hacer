# Fidelity review — PR #862: compile errors use the reference's words and carry the part's line

- **Date:** 2026-10-21 · **Artifact:** PR #862 at `9c457be0` (#820, FID-015) · **Policy:** ADR-0018 §2
- **Domain:** HDL semantics, the diagnostics half. The question is whether each refusal's words and
  `Line N:` match what the reference prints for the same text. Frame: the nand2tetris model. No
  timing or physics claim is made, and no verdict (accept or refuse) changes.

## Ground truth used

| Source | What it says |
|---|---|
| Web IDE at `91ef428`, `simulator/src/languages/base.ts:70-79` | `createError(description, span)` prefixes `Line ${span.line}: ` when the span has a line, and nothing otherwise. |
| `simulator/src/languages/hdl.ts` (`Part` attribute) and `grammars/hdl.ohm` | A part's span is `Part = Name "(" Wires ")" Semi`, so it starts at the part's name. A wire side's span is the pin's own text. |
| `simulator/src/chip/builder.ts` | Self-reference `Cannot use chip ${name} to implement itself` at `part.span` (`:267-270`). Unknown part at `part.span` (`:264`). `Looping wire ${pin}` at `part.span` (`:318`). Every wire-level error is at the pin's span (`:345-352, 379, 437, 453, 465, 469, 477`). Width errors are at the left pin's line, after all parts (`:507-526`). The first error ends the build. |
| `simulator/src/chip/chip.ts:626, 687` | `Circular pin dependency` is raised while a part is wired, in source order, at the wire that closes the loop. |
| `conformance/acceptance/hdl-shapes.json` (#811) | The reference's message for 177 one-line shapes. |
| Vectors | None reaches this: every `.tst` loads a chip that builds. |

## Measurements

**Reference.** The web IDE's builder ran under tsx on Node 22.19, with ohm-js 17.2.1 and jiffies 2.2.5,
on a copy of `91ef428`'s `simulator/src`. Chips with parts in other files used an in-memory filesystem.

**HACER.** A tsx probe ran `compileHDL`, `runTest` and `runCli` (`hacer test` against the vendored
Project 1 vectors) at head `9c457be0`. The chip under test was registered ahead of the builtins.

Each shape has `IN` on line 2, `OUT` on line 3, `PARTS:` on line 4 and parts from line 5, unless noted.

| Shape | Reference | HACER at head |
|---|---|---|
| Issue's `Not`: blank line 4, part on line 6 | `Line 6: Cannot use chip Not to implement itself` | the same, through `compileHDL`, `runTest` and `hacer test` (`ERROR Not: Line 6: …`) |
| Same, CRLF line endings | `Line 6: …` | `Line 6: …` |
| Self part across lines 5–7 | `Line 5: …` | `Line 5: …` |
| Self part after a two-line block comment | `Line 7: …` | `Line 7: …` |
| `And` whose second part, on line 6, is `And` | `Line 6: Cannot use chip And to implement itself` | the same |
| Non-builtin `Foo` uses `Foo`, no files | `Line 5: Undefined chip name: Foo` | `Line 5: Cannot use chip Foo to implement itself` |
| Same, with `Foo.hdl` in the folder | did not finish in 60 s (CPU-bound: `loadChip` rebuilds `Foo` forever) | as above |
| Unknown part, one line / across lines | `Line 5: Undefined chip name: Bogus`, both | `Line 5: Unknown chip-part: "Bogus"`, both |
| Missing pin, one line / pin on line 6 | `Line 5:` / `Line 6: Undefined pin name: x` | `Line 5: Part "Not" has no pin "x"` / `Line 5:`. A second error follows: `in` is not connected |
| `a[2]` on a 1-bit `a`, one line / pin on line 6 | `Line 5:` / `Line 6: Sub-bus index out of range (a has width 1)` | `Line 5:` / `Line 5: Part "Not" pin "in" is wired to "a[2]": sub-bus index out of range ("a" has width 1)` |
| Same, after a line comment, part on line 6 | `Line 6:` | `Line 6:` |
| Unconnected `b` on line 5 | **accepts** (reads `b` as 0) | `Line 5: Part "Nand" input pin "b" is not connected: …` |
| Second driver of `o` on line 6 / its `out=o` on line 7 | `Line 6:` / `Line 7: Cannot write to pin o multiple times` | `Line 6: Signal "o" is driven by more than one part`, both |
| Three drivers, lines 5–7 | `Line 6:` | `Line 6:`, once |
| Internal `t` driven on lines 5 and 6 | `Line 6: Internal pin t already defined` | `Line 6: Signal "t" is driven by more than one part` |
| `in` bound twice / output to chip input / output to `true` | `Line 5:` each | `Line 5:` each, HACER's words |
| 2-bit `a` into `in`, one line / pin on line 6 | `Line 5:` / `Line 6: Different bus widths: in(1) and a(2)` | `Line 5:` / `Line 5:` |
| Undefined `t` read on lines 5 and 6 | `Line 5: Undefined internal pin name: t`, once | two messages, `Line 5:` and `Line 6:` |
| Unknown part on line 5, missing pin on line 7 | `Line 5:` only | `Line 5:` only: `compileHDL` returns after part resolution (`compiler.ts:240`) |
| `And(a=a, b=t, out=t);` on line 5 (the PR's no-line test) | `Line 5: Looping wire t` | `Cyclic part dependency: … through "t"`, **no line** |
| `Nand(a=a, b=y, out=x);` 5, `Not(in=x, out=y);` 6 | `Line 6: Circular pin dependency` | `Cyclic part dependency: … through "y" → "x"`, **no line** |
| `BUILTIN;` for a name that is not a builtin | `Chip Foo not in builtin registry`, no line | `Builtin chip "Foo" not found in registry`, no line |
| `Outer` (part on line 6) over `Inn` whose `Nand` binds `c` on line 5 | `Line 6: Undefined chip name: Inn` | `Outer › Inn: Line 5: Part "Nand" has no pin "c"` |
| `Outer` uses `A`; `A` uses `B`; `B` uses `A`, all in files | did not finish in 60 s | `Line 5: Cannot use chip A to implement itself through B` |

**Corpus.** Over the 75 shapes both tools refuse with a reference message, 4 HACER messages now equal
the reference's: `self-part`, `self-part-second`, `self-part-alias-name`, `buffer-named-like-chip`.
All 73 HACER messages that carry a line carry the reference's (all line 1). The other 2 are
`looping-wire` (`Line 1: Looping wire t`) and `loop-across-parts` (`Line 1: Circular pin dependency`).
HACER gives both no line.

## Verdicts

| Claim (PR #862 body, #820's acceptance criteria) | Verdict | Source |
|---|---|---|
| The self-reference refusal is the reference's sentence, name unquoted | **sound**. It matches byte for byte in all six self-reference runs and in the three corpus cells. The reference prints it only for a chip named after one of its builtins. For any other name it says `Undefined chip name`, or never finishes when the file is present, so HACER's sentence there has no reference text to match | runs; `builder.ts:48, 262-270` |
| A part's line is the line of its name token, the reference's `part.span` | **sound**. A part across lines, after a block comment, after a line comment, and with CRLF line endings: the same line on both sides | runs; `parser.ts:482`; `hdl.ohm` `Part` |
| The prefix is `createError`'s `Line N: ` form | **sound** | `base.ts:70-79`; every run |
| Every error a part causes carries that part's line, in the field and the prefix | **sound** for a part written on one line. Fifteen error kinds off line 1, and 73 corpus cells, give the reference's line | runs; corpus |
| For a part written across several lines, the reference gives the pin's line (known difference) | **sound** as stated. Missing pin, out-of-range slice and width mismatch differ by one line, and a second driver by one. A test pins it (`compiler.test.ts:1123`) | multi-line rows |
| Errors with no part get no line, "as `createError` omits the line when there is no span", including the combinational-cycle refusal | **unsound for the cycle**. The reference has a span for both cycle refusals: `Looping wire` at the part (`builder.ts:318`), `Circular pin dependency` at the closing wire (`chip.ts:626, 687`). The PR's own no-line shape (`compiler.test.ts:1150`, `engine.test.ts:178`) is the corpus's `looping-wire`, where the reference prints `Line 1: Looping wire t`. Sound for the builtin-not-found refusals. → FID-030 | cycle rows; corpus |
| The self-reference refusal takes the line of the part that names the chip | **sound** | `And` row |
| HACER reports every error, joined by `; `, each with its own line | **sound** within a stage: two slices on lines 5 and 6, two readers of an undefined `t`. **hand-wavy** as "every": an unknown part ends the compile before any wiring check (`compiler.ts:240`). It predates the PR, and the reference stops at its first error anyway | two-failing row |
| `pushOnce` reports a clash on several lines once, on the second part's line | **sound**: the reference's first error is at the second driver too | three-driver row |
| `hacer test` prints `ERROR Not: Line 6: Cannot use chip Not to implement itself`, the reference's message | **sound** | `runCli` run at head |
| A failing part chip is named by the chain: `Outer › Inn: Line 5: …` | **sound** as HACER's chosen form (#821, FID-018). It is not the reference's text, and the PR does not say it is. The reference names only `Inn`, at `Outer`'s line 6. HACER's `Line 5` is a line of `Inn`'s source, and `Outer`'s line appears nowhere | nested row |
| #816's registry cycle begins with the reference's sentence, then lists the chips | **sound** as an extension. The reference has no text to match, because it never finishes on a file cycle. The line is `Outer`'s part that starts the cycle, the reference's `part.span` convention | registry-cycle row |
| 80 corpus cells change, and 4 now equal the reference exactly | **sound** | corpus run |
| The UI's status line shows the reference's words and line | **sound** as wiring (`testActions.ts:103` prints `result.error`). **Unreachable today**: the UI's two implementation sources, `builtin` and `hdl-from-nand`, only hold chips that compile (`implementationSources.ts:22-62`) | code read |

**Oracle divergence in shipped behaviour:** none. No verdict changes, and every vector loads a chip that
builds. The differences above are in message text and line. The unconnected-input refusal, where the
reference accepts, predates this PR and is #813's.

## Current practice

Fetched 2026-10-21.

- **The web IDE upstream.** `main` at `6a81b5dd` (2026-10-21) has `simulator/src/chip/builder.ts`,
  `chip.ts` and `languages/hdl.ts` byte-identical to `91ef428`. `base.ts` differs only in
  `makeParser`, not in `createError`. The reference's words and spans measured here are current.
- **Yosys** `check`, `passes/cmds/check.cc:405-479` on `main` (file last changed 2026-10-14). A
  logic loop is reported as `found logic loop in module …`, followed by every cell on the loop with
  its `source:` location and every public wire with its own. A loop report carries locations.

## Proposals

- **FID-030**: the combinational-cycle refusal carries a line. It takes the line of the part that
  reads its own output (the reference's `Looping wire`). Otherwise it takes the line of the first part,
  in source order, that closes a cycle with the parts before it (`Circular pin dependency`).

Not proposed:
- The pin's own line for a part written across several lines. #820 recorded it as a known difference,
  and the inbox panel on #788 chose that over building it.
- `Outer`'s line beside the chain. The chain form is FID-018's, and HACER's message already names more
  than the reference's.
- The stage-limited "every error". Acceptance is unchanged, and it is message selection, as #845's
  review left it.

## Could not verify

- The web IDE in a browser. Only the builder under Node was run, with an in-memory filesystem.
- What the reference eventually prints on a file cycle or a non-builtin self-reference. Both ran
  CPU-bound for 60 s with no output, and were stopped.
- The MCP test tool's output. It goes through `runTest`, which was run; the tool itself was not.
- Line endings other than LF and CRLF (a lone CR).
- The book's text on compile messages. It was not read: the reference simulator is the tool the
  course recommends, and only its words are at issue.
