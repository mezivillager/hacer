# Rulings — 2026-10-23 hacer-loop-to-12

The coordinator loop run of 2026-10-23 from 20:06Z, the first run started under R903 (the owner starts every
run). Owner's hand-over: "run the loop until weekly usage hits 12%". Weekly usage was 3% at the start
(20:05Z); the meter resets on 2026-10-30T03:00Z. Publishing `on-green` under the standing grant. The run
judged JDG-009 to JDG-012 of the judge queue, took the fidelity verdict on the spine epic and the Phase 0.6
plan (#982), fixed the two oracle divergences that verdict found, built both Project 2 slices (#984, #985),
and built the layout, harness, Mission Control and autosave items the earlier runs had left agent-ready.

## R906 — the run stops at weekly 12%; no new chain at 10% or above; the records start at 11%
Builds on: R896
Coordinator, 2026-10-23T20:06Z; the owner: "run the loop until weekly usage hits 12%". The meter read 3% at
20:05:17Z (status line capture, R891), with the week resetting 2026-10-30T03:00Z. The margins scale R896's
to a 9-point run.
Cost if wrong: the run stops a point early or late.

## R907 — PR #995 (#801) merges on its Opus PASS and a green ui-tour run, without inspecting step 19's screenshot
Builds on: R905
Coordinator, 2026-10-23T20:06Z; under R905. The verifier passed #995 and left one criterion unproven:
ui-tour step 19, the restored circuit after a reload. The ui-tour workflow (run 39864984066 on the PR's
head `4eed8c52`) finished `success`. Its log does not print the step's content, and reading
`19-after-reload.json` means downloading the artifact. ui-tour mounts the 3D canvas, and R905 makes 3D QA
non-blocking.
Cost if wrong: a restore that the jsdom tests pass but the real canvas shows wrongly is caught after the
merge, as R905 accepts for 3D.

## R908 — a refactor PR may add or generalise assertions in existing tests, but never lose one
Builds on: R889
Judge, 2026-10-23T20:45Z, decision JDG-010 on #976 (issuecomment-6374369586); recorded by the coordinator;
mechanises the foundation audit's `docs/research/2026-09-21-foundation-audit/REPORT.md` §5 rule 4, whose
literal wording "a refactor PR does not modify existing test files" it supersedes. `pr-hygiene` fails a
`refactor` PR on a net loss of `expect(` in an existing test file, unless the PR re-adds the lost assertion
verbatim in another of its test files, and on a test file removed while its subject stays. It warns on each
removed assertion line the PR does not re-add verbatim anywhere, and the verifier treats each such warning
as a stop: it shows the line was generalised or moved, or blocks. Over the twelve merged refactor PRs the
move-aware fail fails none, and the warning names #50, #706, #710 and #721. Built by #942, which waits on
#941; `docs/research/2026-09-21-foundation-audit/REPORT.md` is not edited.
Cost if wrong: a refactor that rewrites an assertion in place passes on a verifier's reading of a warning.

## R909 — amends R898: the legacy-code exception also covers #1003's cycle report; the other two autosave gaps are declined
Builds on: R898
Amends: R898
Judge, 2026-10-23T21:35Z, decision JDG-012 on #1012 (issuecomment-6375173170); recorded by the coordinator;
amends R898. #1003 is narrowed to one deferred cycle report inside `restoreAutosave`, built from the cycle
its own tick stored and raised through the boot announcer, with no other legacy persistence or
serialization work. The exception goes with `autosave.ts` at ADR-0020 §7.5d; `deserialize` survives per
§7.6. An all-dropped slot is declined until something registers chips into the user chip registry at
runtime (#206, or any production `getUserChipRegistry().register` call) before §7.5d; the non-object
slot's wording is declined.
Cost if wrong: one more small change in legacy code the plan removes; a user who restores a circuit with a
cycle learns of it instead of seeing a silent failure.

## R910 — #257 is passed over this run until it is reshaped to R904 and R905
Builds on: R905
Coordinator, 2026-10-23T21:36Z. `backlog.mjs next` names #257, the browser QA agent. Its body still
describes the pre-R904 design: QA gating every critical merge, run from a Claude cloud session. The
owner's R904 and R905 changed both, and the changes are recorded only in two comments. A builder working
from that body would build to the stale criteria. The next pick, #942 (`risk:1`, unblocked by #941), is
taken instead. #257 goes to a read-only shaper at the next run's orient, so its body states R905's split
as criteria: non-3D QA local and blocking where a PR needs it; 3D QA non-blocking through a grok-bot queue
that files bugs.
Cost if wrong: #257 waits one more run.

## R911 — PR #1016 (#1006) merges without a separate fidelity review
Builds on: R854
Amends: R854
Coordinator, 2026-10-23T21:45Z; amends R854 for #1016, as R899 did. It binds `.cmp` columns to the output
list by position, as the reference compares output text. The Opus verifier ran the web IDE at `91ef428` on
seven shapes: HalfAdder correct and with a broken carry, FullAdder correct and broken, Add16 correct and
broken, and the builtin CPU's headers. Every verdict and failing row matches HACER at the head, and rows
count the same on both sides. All 16 Project 1 vectors grade identically at base and head, correct and
with And/Or swapped. Two differences remain, neither reachable by a vendored file: HACER never grades a
`.cmp` header, so a mislabelled header passes where the reference fails; and a `.cmp` shorter than the
output list passes in HACER (older; count mismatch is out of scope). Both are filed as a follow-up.
Cost if wrong: a user-written `.cmp` with a wrong header passes in HACER.

## R912 — PR #1019 (#1007) merges without a separate fidelity review
Builds on: R854
Amends: R854
Coordinator, 2026-10-23T22:15Z; amends R854 for #1019, as R911 did. It accepts `,`, `;` or `!` after any
test-script command, and makes `!` end the run, as the reference's grammar and builder do. The Opus
verifier ran the web IDE's grader at `52611ad` on nine scripts, whose reference files are identical at
`91ef428`: the unedited `02/ALU.tst` with an ALU built from Project 1 parts, `;` throughout, `!`
mid-script, `eval!`, two `!`s, `!` on the last command, `!` then a second `output-list`, and `!` then an
unknown command. Seven match HACER byte for byte. One differs by an extra header line, already #1017, and
one, an unknown command, is refused on both sides. Parsing every vendored `.tst` changes only `02/ALU.tst`,
from refused to parsed. The merge with #1016 is clean, and `src/core/testing` passes 277 tests on it.
Cost if wrong: a test script whose endings the nine shapes do not cover is read differently from the
reference.

## R913 — PR #1027 (#984) merges without a separate fidelity review
Builds on: R854
Amends: R854
Coordinator, 2026-10-23T23:05Z; amends R854 for #1027, as R911 and R912 did. It adds HalfAdder, FullAdder
and Add16 as builtins on the grading path only, under R895. The Opus verifier ran the web IDE's grader at
`52611ad`, scored as its `runner.ts` scores, on eight cases: course-shaped HDL, one broken HDL per chip, a
chip used inside its own definition, a correct FullAdder beside a broken `HalfAdder.hdl` (the builtin wins
in both), Inc16 over Add16, and bare `BUILTIN;` bodies. Verdicts, failing rows and values match
`hacer test` in every case but the last, which HACER's grading refuses as a stand-in by its own decided
rule, while `run-tst` reads it as the reference does. The app registry and the 3D toolbar are unchanged.
Cost if wrong: a Project 2 HDL shape outside the eight grades differently from the reference.

## R914 — PR #1028 (#985) merges without a separate fidelity review
Builds on: R854
Amends: R854
Coordinator, 2026-10-23T23:46Z; amends R854 for #1028, as R911 to R913 did. It adds Inc16 and the ALU as
builtins on the grading path only, under R895; the ALU computes the book's bitwise definition. The Opus
verifier built the web IDE at `52611ad` and ran its grader on twelve cases: the PR's and its own
course-shaped Inc16 and ALU, Inc16 adding 0, and ALUs with a wrong `zr`, a `no` and an `nx` that never
negate, each on `ALU.tst` and `ALU-basic.tst` where they apply. Verdicts and first failing rows match
`hacer test`, and all twelve `.out` files are byte-identical. It re-measured the recorded divergence: the
web IDE's 18-word table differs from the bitwise definition on 36 of 64 control words and on none of the 18
documented ones, and its own bitwise `alua()` differs on none. No official vector reaches the divergence.
Cost if wrong: an ALU HDL using an undocumented control word through a part grades differently from the web
IDE, as ADR-0020 §1.11 rule 5 already records.

## R915 — #978 is taken ahead of #930 in the aux slot
Builds on: R893
Coordinator, 2026-10-23T23:47Z; under R893. `backlog.mjs next` names #930, the per-entry inbox review of
HRN-020. #978 builds R893's HRN batches, and its own text turns #930 into one batch for whichever of
HRN-020, -021, -022, -025, -026 and -027 are still `proposed` once it merges, closing #933, #934, #937, #938
and #939. Its text still lets the loop decide any of them under R844 before then, but one batched panel
replaces up to six per-entry panels at about 144k subagent tokens each (R893's measure).
Cost if wrong: HRN-020 waits one build longer.

## R916 — PR #1030's three verifier nits are not filed
Builds on: R909
Coordinator, 2026-10-24T00:12Z; under R909. The fresh Opus verifier passed #1030 (issuecomment-6377324067)
with three nits: two error toasts when `restoreAutosave` is called without `announce` (no production caller
does), `if (cycle)` not checking `cycle.type` (the only variant today), and `src/main.test.tsx` mocking the
restore so the boot test never reaches the report (its own jsdom boot probe showed both toasts, the error
in front). R909 bounds the legacy-code exception to the cycle report itself, with no other legacy
persistence work, and `src/store/actions/persistenceActions/autosave.ts` goes at ADR-0020 §7.5d.
Cost if wrong: a future caller without `announce` shows a doubled error until §7.5d removes the file.

## R917 — the open HRN reviews become two batches, #930 and #939
Builds on: R893
Coordinator, 2026-10-24T00:27Z; under R893, after #978 merged as PR #1031. #978's after-merge step names
six entries for #930, one over R893's limit of five. #930 becomes the batch for HRN-020, 021, 022, 025 and
026, and #933, #934, #937 and #938 close as covered. #939 becomes the second batch, for HRN-027 to HRN-030,
and #989, #990 and #991 close as covered, which #978's text did not name but R893's rule gives:
`queueReviews` groups the same four the same way. #935 (HRN-023) and #936 (HRN-024) keep their own reviews
(`Review: own`). Bodies are `reviewIssue`'s own batch form on main `b3325642`; all nine entries were
`proposed`.
Cost if wrong: one batch panel decides four entries that per-entry panels would have weighed separately;
any entry can be reopened alone by setting it back to `proposed`.
