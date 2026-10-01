# Fidelity review: the `BUILTIN` form without `PARTS:` (PR #643, issue #632)

**Date:** 2026-10-02 · **Role:** `hacer-fidelity` (`docs/harness/fidelity-brief.md`, ADR-0018) ·
**Artifact:** PR #643 at `761ead1` (`src/core/hdl/parser.ts`), closing #632 · **Domain:** HDL
semantics, nand2tetris frame (**N2T**). No timing or physics claim is involved.

**Question:** does HACER's HDL grammar now agree with the nand2tetris reference where it must, and
where it is a deliberate superset, is that stated and harmless?

## Ground truth used

| Source | Where (read or fetched 2026-10-02) |
|---|---|
| Web IDE grammar (current reference simulator) | `../web-ide/simulator/src/languages/grammars/hdl.ohm:6,9,13,14` (web-ide `91ef428`, 2026-02-27): `ChipBody = InList? OutList? PartList ClockedList?`, `PartList = BuiltinPart \| Parts`, `BuiltinPart = "BUILTIN" Semi` |
| Web IDE builder | `../web-ide/simulator/src/chip/builder.ts:233-234`: a `BUILTIN` body loads `getBuiltinChip(<the chip's own name>)` |
| Web IDE shipped builtin files | `../web-ide/projects/src/project_01/00_nand.ts:13-14` (`PARTS:` then `BUILTIN Nand;`), `project_03/00_dff.ts:14-16` (`PARTS: BUILTIN DFF; CLOCKED in;`), five more in `project_05/`. Its own grammar rejects these; the IDE never parses them: its builtin toggle rewrites the text to `PARTS:\n\tBUILTIN <Name>;` for display (`../web-ide/components/src/stores/chip.store.ts:55-57`) and loads the builtin by name (`:543-545`) |
| Book, Appendix A (HDL) | HUJI course copy, `https://www.cs.huji.ac.il/course/2002/nand2tet/docs/appendix_A.pdf`: "the HDL body of a built-in chip has the following format: `BUILTIN <Java class name>;` … Normally, this class will have the same name as that of the chip"; examples `CHIP Register { IN …; OUT …; BUILTIN Register; CLOCKED in, load; }` and `CHIP DFF { … BUILTIN DFF; CLOCKED in,out; }`. An early draft, not the 2nd edition |
| Java Hardware Simulator 2.5 | `github.com/nand2tetris/nand2tetris_simulator` (last commit `327b7e4`, 2015-02-26): `GateClass.java:187-195` takes `BUILTIN` or `PARTS` after `OUT`; `BuiltInGateClass.java:37-40` requires a class name ("Missing java class name"); `CompositeGateClass.java:123-124` requires an identifier after `PARTS:` ("A GateClass name is expected"). `InstallDir/builtInChips/{Nand,Xor,DFF}.hdl` are all `BUILTIN <Name>;` with no `PARTS:` |
| HACER's refusal | `src/core/testing/testChip.ts:52-58` at `761ead1` (R771): only a primitive may be `BUILTIN`, and only as itself |

## Which reference accepts which form

| form | book / Java HS 2.5 | web IDE | HACER at `761ead1` |
|---|---|---|---|
| `BUILTIN;` | rejects (`BuiltInGateClass.java:40`, read, not run) | accepts | builtin = the chip's own name |
| `BUILTIN <Name>;` | accepts; the name is the implementing class | rejects (`expected ";"`, verifier's ohm-js run) | builtin = `<Name>` |
| `PARTS: BUILTIN <Name>;` | rejects (`CompositeGateClass.java:124`, read, not run) | rejects (`expected "("`) | builtin = `<Name>` (unchanged) |

No reference parser accepts all three, and none accepts the form both the web IDE's project files and
HACER's vendored `conformance/vectors/01/Nand.hdl:13-14` ship. HACER's grammar is the union.

## Verdicts

| Claim | Verdict | Source |
|---|---|---|
| A bare `BUILTIN;` after IN/OUT parses, with builtin = the chip's own name | sound (N2T) | `hdl.ohm:13`, `builder.ts:233-234`; `parser.ts:344,410-415` |
| `BUILTIN <Name>;` without `PARTS:` parses as that builtin | sound (N2T): the book's and the Java simulator's form, not a HACER invention | Appendix A, "`BUILTIN <Java class name>;`"; `GateClass.java:187-189` |
| The PR's and #632's premise correction: "the reference form … also has no name" | unsound as a statement about nand2tetris: true of the web IDE grammar only; the book and the Java simulator name the class. No code consequence: the PR accepts both | Appendix A; `builtInChips/Nand.hdl` |
| `PARTS: BUILTIN <Name>;` stays accepted | sound as a superset: needed to parse the course files HACER vendors; both reference parsers reject it, the web IDE never parses it | `00_nand.ts:13-14`, `chip.store.ts:55-57,543-545` |
| The superset is harmless | sound for `hacer test` / `hacer_hdl`: every builtin form either names a primitive as itself, which all three references mean by it, or is refused (R771). Elsewhere `parseHDL` reads only in-repo sources (`evaluateChip.ts:42`, `engine.ts:56`, `implementationSources.ts:44`, `scenarios/drivers/core.ts:57`), and each new spelling yields an AST the old `PARTS: BUILTIN X;` already produced | `testChip.ts:52-58,137` |
| No HDL that parsed before changes meaning | sound: the new branch is taken only on a `BUILTIN` token where `parsePartsDecl` failed `expect('PARTS')` | `parser.ts:343-344` |
| The superset is stated | hand-wavy: stated only in the PR body, the #632 comment and the docstring at `parser.ts:409`, which calls it "the reference grammar's `BUILTIN;`" while also taking a name that grammar rejects. No committed document lists the accepted forms; the public HDL reference is #263, still open | FID-006 |

**Oracle divergence:** none. The change is parser-only, and the verifier's run on #643 is green
(3065 tests, `runCli` Nand 4/4 in all three forms). Nothing here is `sev:critical`.

## Left for Phase 0.6

All three references put `CLOCKED` after the builtin (`hdl.ohm:6`; Appendix A's `DFF`/`Register`;
`00_dff.ts:15-16`). HACER fails `CLOCKED` after every builtin form with `Expected '}' but got
'CLOCKED'` (`parser.ts:349`; reproduced by #643's verifier), the Phase 0.5 scope. When Project 3 opens it must follow all three spellings, or a vendored `DFF.hdl`
fails to parse. FID-007.

## Current practice

Not surveyed: no tool outside the nand2tetris family defines this syntax, and the question is
compatibility with that family's own parsers, which are read above.

## Could not verify

- The 2nd-edition book's (2021) Appendix A text and the Java tools in today's `nand2tetris.zip`;
  the 2002 HUJI draft and the 2015 open-source simulator stand in for them.
- The Java rejections were read from the source, not run.
