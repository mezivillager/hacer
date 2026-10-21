# Fidelity review — PR #826: a part cycle through the registry is refused at compile time

- **Date:** 2026-10-21 · **Artifact:** PR #826 at `2a375768` (#816, FID-014; folds in #825) · **Policy:** ADR-0018 §2
- **Domain:** HDL semantics: how a part name resolves to a chip, and what a chip built from itself
  through another chip means. Frame: the nand2tetris model. No timing or physics claim is made.

## Ground truth used

| Source | What it says |
|---|---|
| Web IDE at `91ef428`, `simulator/src/chip/builder.ts` | `loadChip` returns the builtin when `hasBuiltinChip(name) \|\| fs === undefined` (`:48`), else reads `${dir}/${name}.hdl` (`:52`) and builds it with the same `dir` and `fs`. `wireParts` loads each part (`:261-262`) before its only self check, `Cannot use chip ${partChip.name} to implement itself` (`:270`). There is no visited set. |
| Web IDE, `simulator/src/chip/builtins/index.ts` | `REGISTRY` (`:68`) holds 43 names; `hasBuiltinChip` is `REGISTRY.has(name)` (`:127`). |
| Book, Appendix A §3 "Loading Chips into the Simulator" | HUJI course copy, `https://www.cs.huji.ac.il/course/2002/nand2tet/docs/appendix_A.pdf`, fetched 2026-10-21: "if <chip name>.hdl exists in the current directory then load it (and all its descendents) into the simulator else if <chip name>.hdl exists in the simulator's BuiltIn chips directory then load it … else issue an error message." Also: "the user can still force the simulator to use its built-in version instead, by simply moving the Xxx.hdl file out from the current directory." It says nothing about a chip that reaches itself. This is an early draft, not the 2nd edition. |
| Vectors | No `.tst`/`.cmp` reaches this: a test loads one chip, and both lookup orders give the same outputs when every user part is correct and acyclic. |

**The book and the web IDE disagree on lookup order.** The book looks in the current directory
first, then the builtins. The web IDE looks up builtins first, and a file is never read for any of
its 43 builtin names. The vectors cannot decide between them. HACER has both views:
`src/simulation/topologicalEval.ts:314` is builtins-first, and `src/core/testing/testChip.ts:123`
is own-first. #206 chooses between them.

## Measurements

**Reference.** The web IDE's builder ran under tsx on Node 22.19 against an in-memory filesystem
that counts reads. Each shape ran in its own process, with a 10 s watchdog inside `readFile`.

| shape (files in the directory; top chip first) | reference |
|---|---|
| `A`↔`B`; `A`→`B`→`C`→`A`; `Top` over `A`↔`B`; `Top` over an `A` that uses `A` | never settles: 32,121–34,536 reads and 208–227 MB of heap in 10 s |
| `A`↔`B` with a 256 MB heap and no watchdog | V8 `JavaScript heap out of memory` after 20 s, exit 134. It never returns a result. |
| `Not.hdl` (uses `And`) beside `And.hdl` (uses `Not`), each as top | both accepted with 0 reads: `Not` = ¬in, `And` = a∧b |
| `Not.hdl` (uses `X`) beside `X.hdl` (uses `Not`), each as top | both accepted: `Not` = ¬in (1 read), `X` = ¬a |
| `HalfAdder.hdl` (uses `FullAdder`) beside `FullAdder.hdl` (uses `HalfAdder`) | accepted with 0 reads; 1+1 gives `sum=0 carry=1` |
| `Top` with `Foo` (unknown) and then `A` (`A`↔`B`) | `Line 1: Undefined chip name: Foo` |
| `Top` with `A` (`A`↔`B`) and then `Foo` | never settles |
| `loadChip` for each of the 43 builtin names, with a non-HDL file of that name present | all 43 resolve to the builtin, with 0 reads |

**HACER.** The same shapes ran as a throwaway vitest probe at head, and again with `main`'s
`compiler.ts` (`723ece5a`), under `combineRegistries(builtins, user)` and `combineRegistries(user, builtins)`.

| shape | head, builtins-first | head, own-first | main (both views) |
|---|---|---|---|
| `A`↔`B` | `Chip "A" uses itself through "B"` | same | compiles; depth error at `B` |
| `A`→`B`→`C`→`A` | `… through "B" → "C"` | same | compiles; depth error at `C` |
| `Top` over `A`↔`B` | `Chip "A" uses itself through "B"` | same | compiles; depth error at `A` |
| `Top` over an `A` that uses `A` | `Chip "A" cannot use itself as a part` | same | compiles; the same message at evaluation |
| `Not`/`And` pair | compiles: ¬in, a∧b | refused, naming `Not` and `And` | builtins-first right; own-first depth error |
| `Not`/`X` pair | compiles: ¬in, ¬a | refused, naming both | builtins-first right; own-first depth error |
| `HalfAdder`/`FullAdder` pair | **refused**: `Chip "HalfAdder" uses itself through "FullAdder"` | refused | compiles; depth error at `FullAdder` |
| `Foo` first or `A` first | `Unknown chip-part: "Foo"` | same | same |

## Verdicts

| Claim (PR #826 body, #816, ADR-0020 §1.11 rule 4) | Verdict | Source |
|---|---|---|
| The reference never settles on a chip that reaches itself through another chip | sound | measured above; `builder.ts:48-52, 261-262` load and build each part before the check at `:270`, with no visited set |
| Before this PR, such a chip compiled and its first evaluation threw `max recursion depth 100 exceeded` | sound | `main` probe column |
| The reference looks up builtins first, so the `Not`/`And` pair (and `Not`/`X`) builds there | sound, for all 43 of its builtin names | `builder.ts:48`, `index.ts:127`; 0 reads across 43 names |
| Builtins-first compiles the `Not.hdl`/`And.hdl` pair, as the reference does | sound for that pair. As a statement about builtins-first in general it is **hand-wavy**: HACER's builtins are the 16 Project 1 chips, so 27 reference builtin names resolve to user chips. The `HalfAdder`/`FullAdder` pair is accepted by the reference and refused at head | probe; `src/core/chips/appRegistry.ts:10`; FID-026 |
| Own-first refuses the pair | sound as code. That is the book's lookup order, under which the pair is a real cycle. Neither the book nor the web IDE gives a verdict for it | Appendix A §3; probe |
| The refusal names every chip on the cycle in order, starting from the compiled chip | sound; there is no reference wording to match, because the reference never finishes. The wording is FID-015's (#820) | probe; `compiler.ts:193` |
| A one-chip cycle below the root gets the self-reference message | sound as code. The reference never settles on it. The reference's own `to implement itself` fires only when the part's name is a builtin (`:48` before `:270`) | probe |
| The walk refuses nothing the reference accepts | sound for names that are builtins on both sides: every acceptance by the reference completes a finite DFS, so it has no cycle. **Unsound** for the 27 names that are builtins only in the reference (`HalfAdder`/`FullAdder`) | above |
| `compileSpec` refuses `'circuit'` cycles the same way | sound by analogy. The reference has no `'circuit'` chips, and each shape's HDL equivalent never settles there | `compileSpec.ts:177` |
| ADR §1.11 rule 4: "the lookup order (#206) decides whether … `Not` … `And` … is a cycle" | sound but incomplete: HACER's builtin set decides too | FID-026 |
| The walk terminates "on any registry" and never throws | hand-wavy: it holds for a registry whose `get` keeps object identity. Verifier nit 1, issuecomment-6320423980; not re-probed here | `compiler.ts:167-186` |
| A 30,000-chip chain walks in 264 ms | unverified here; the verifier measured 20,000 chips in 146 ms | issuecomment-6320423980 |

**Oracle divergence in shipped behaviour:** none. The `HalfAdder`/`FullAdder` refusal needs two user
chips in one builtins-first registry. Nothing builds that today: the user registry is empty (#206),
and `testChip` registers only the file's own chip.

## Current practice

There was no survey. The question is internal to the nand2tetris model, and its two references are
quoted above.

## Proposals

- **FID-026**: builtins-first matches the reference only over HACER's builtin names. #206 states what
  a part named after one of the reference's other 27 builtins resolves to, and a test pins the
  boundary.

## Could not verify

- What the Java Hardware Simulator does on a user-chip cycle under the book's own-first order. It was
  not run, and the book is silent.
- The book's 2nd edition text: only the HUJI early-draft copy was read.
- How the web IDE's browser filesystem adapters behave on a cycle (UI freeze, or tab out of memory).
  Only Node with an in-memory adapter was measured.
- The verifier's identity-free registry hang (nit 1) and the walk timings were not re-run.
