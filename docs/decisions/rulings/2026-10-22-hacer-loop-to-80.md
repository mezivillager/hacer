# Rulings — 2026-10-22 hacer-loop-to-80

The coordinator loop run of 2026-10-22 from 08:35Z. Owner's hand-over: "extension should be back up,
continue the loop until we reach 80% weekly usage". Weekly usage was 70% at the start (08:34Z); the
meter resets on 2026-10-23T03:00Z. Publishing `on-green` under the standing grant. Subagents on Opus
and Sonnet, three at a time, two while the laptop is hot (R866). The run held the retro and the
process review that were due, shaped and built the foundation issues that had nothing pickable
ahead of them, and decided two inbox review issues (R844).

## R880 — the run stops at weekly_all 80% or at the weekly reset (2026-10-23T03:00Z), whichever comes first; no new chain at 77% or above, and the records PR starts at 78%
Builds on: R852, R741
Coordinator, 2026-10-22T08:36Z. The owner: "continue the loop until we reach 80% weekly usage". The
meter read 70% at 08:34Z with the reset 18.5 hours away. After the reset the meter starts again near
0, so 80% names this week's budget, not next week's; a usage ceiling ends a run and a reset is not
permission to continue (R741). The margins copy R852's.
Cost if wrong: if the owner meant to keep going into next week, the run stops at the reset and he
restarts it with one line.

## R881 — #257 (browser QA agent) is passed over again; it goes to the owner's list
Builds on: R875
Coordinator, 2026-10-22T08:36Z. R875's reasons, re-checked. `backlog.mjs ready` names it as the only
shaped pick. Its fourth criterion is a first QA run recorded on a real critical PR, driven in a
browser from a cloud session or Actions, never the laptop; its third makes merge require the QA
verdict. Cloud routines cannot clone the repo (GitHub is not connected to the Claude account, per the
schedule tool's setup note), and an Actions run would need an API secret only the owner can add. A
build would put a merge gate in place that nothing can satisfy.
Cost if wrong: #257 waits for the owner to connect GitHub or add a secret; nothing else depends on it.

## R882 — six foundation issues are shaped and labelled `agent-ready` under "Queue up", and three new ones are filed
Builds on: R878
Coordinator, about 09:15Z on 2026-10-22 (the log's stamp for it was an estimate; the shaper had
returned before the second process reviewer was dispatched). `ha-next`'s "Queue up" rule for
`risk:0` and `risk:1`. With only #257 pickable, a read-only Opus shaper measured and drafted the
issue form for each. Labelled `agent-ready`: #379 (retitled N.4a: first layout, synchronous,
barycentre and `order: 'id'`, the four ADR-0020 §2 preconditions as named tests), #878 (pins wider
than `MAX_PIN_WIDTH` = 32 refused; the web IDE reads widths modulo 65536, recorded as an ADR-0020
§1.11 rule 5 divergence; closes the duplicate #453), #339 (narrowed to the function-length
ratchet), #773 (importer path blow-up, four shapes under 100 ms), #599 (a bare output-list name gets
the pin's width) and #613 (`risk:0`, one layer-baseline row). Filed: #940 (N.4b, `previous` and
hints, blocked by #379, `agent-ready`) and #941 (the `risk:1` slice of #151, `agent-ready`). #942
(the refactor-PR test rule, tuned to fail 1 of the 10 refactor PRs instead of 7) is filed without
`agent-ready`, blocked by #941. Every seed is under the blast-radius threshold (largest:
`src/core/chips/types.ts`, 14), and no issue's comments hold it (L072). Two design calls inside the
drafts: N.4a is synchronous (amending `docs/research/2026-09-18-agent-readiness/REPORT.md` §4 and
#327, which said asynchronous because of the rejected elkjs), and #379's "rasterise and let the
product role judge" moves to a follow-up research task after N.4b.
Cost if wrong: a shaper's gap-filling decision in a layout or acceptance contract is built before an
owner or panel sees it; each still gets a fresh verifier, and a fidelity review where ADR-0018 §2
applies.

## R883 — the digest's engine-path value difference for a pin name shared by IN and OUT is queued as FID-034, not filed as a bug
Builds on: R854
Coordinator, about 09:28Z on 2026-10-22, when the fidelity digest returned. `compileHDL`,
`compileSpec` and `evaluateChip` read `OUT a` as `IN a` (1 where the web IDE gives 0) for
`CHIP Foo { IN a, b; OUT a, out; ... }`, but grading refuses that chip, and no learner path reaches
the engine with user HDL yet (#206, #386). FID-017 and FID-028 were handled the same way.
Cost if wrong: a value difference on a path no learner uses waits for the panel instead of a
`sev:critical` fix; when #206 wires user HDL in, it becomes shipped behaviour and must be fixed
first.

## R884 — the process reviewers' ceilings move earlier (reviewer 1 to 10:50Z, reviewer 2 to 11:10Z); the synthesis may fall to the next run
Builds on: R880
Coordinator, 2026-10-22T09:30Z. The meter read 73% at 09:24Z, 3 points in 50 minutes, so the
original ceilings (11:20Z, 11:45Z) would have run past 80%. `backlog.mjs ready` prints
`process review open:` until the cycle finishes, so the next run picks it up. Both reviewers
finished in about 20 minutes, well inside the new ceilings, and the synthesis ran in this run (R885).
Cost if wrong: two shorter reviews; findings they would have reached in the last half hour wait for
the next cycle.

## R885 — triage of process review cycle 2026-10-22 (reviews 1 and 2): what is carried, filed or put to the owner
Builds on: R844, R881
Coordinator, 2026-10-22T09:33Z; `docs/harness/reviews/README.md` step 3, and the findings in
`docs/harness/reviews/2026-10-22/SYNTHESIS.md`. Decisions:
- **S1, filed `agent-ready` as #949 (harness, `risk:1`):** when a `foundation` or `spine` slot has
  nothing pickable, `ready` and `next` print `shape due: #n` for the oldest open unshaped issue of
  that project whose blockers are all closed, and `ha-next` §1 dispatches a read-only shaper on that
  line instead of stopping (both reviews' F1; measured: N.4 sat unblocked 7 days, and the
  2026-10-21 run closed dry with 82 unshaped).
- **S2, carried:** the verifier gate enforced only by memory (review 1 F3) by HRN-021 (#933); the
  fidelity rule versus practice (both F4) by HRN-023 (#935), and the four PRs with no fidelity read
  by the digest (#922, issuecomment-6337349284); red commits on `main` (review 2 F9) by HRN-019
  (#929); verifiers judging one defect class two ways (review 1 F8) by HRN-024 (#936).
- **S3, filed as #950 (mission-control, `risk:1`), not `agent-ready`:** Mission Control's
  conformance metric reads a pass count (the scenario suite's) instead of `runner: null` (review 1
  F9, review 2 F7). The staged decision was `agent-ready` if its seeds were under the threshold;
  `mission-control/src/snapshot.ts` has 21 direct production importers, over the threshold of 20,
  so the filing leaves it for a ruling.
- **S4, filed `agent-ready` as #951 (harness, `risk:1`):** `pr-hygiene` treats
  `docs/harness/reviews/*/evidence/` as evidence, as it does `docs/research/*/evidence/`, so a
  reviewer's raw output does not crowd the 400-line budget; and the standing brief's §2 drops the
  cloud lane it no longer has (the brief writer's findings).
- **S5, in the records PR:** ledger rows L069, L070 and L071 get their mechanisms (review 1 F10,
  review 2 F8, C11).
- **To the owner, with recommendations and the default taken if he says nothing (no change):**
  - #907 and the `bot-filed` rule (both F2/F5: a bug the loop measured from its own code is not
    outside content; recommend the panel or the coordinator may make it `agent-ready`).
  - The inbox treadmill and the panel's cost (both F3/F6: recommend one panel per run for HRN
    entries and a cap on harness builds while product work is pickable).
  - The loop never starting itself and #257's four deferrals (both F6/F7, review 2 F5: recommend
    connecting GitHub to the Claude account, which unblocks cloud routines and #257).
  - The spine's three gates (review 1 F2: recommend pulling Project 2 forward under
    `project:foundation`, after a fidelity verdict on epic #139, which the next run can dispatch).
  - #801 (`sev:high` data loss filed under polish, review 1 F11: recommend moving it to bugs).

Cost if wrong: three small harness and mission-control issues are filed on the coordinator's triage
alone, two of them `agent-ready`; the owner items stay at their defaults until he answers.

## R886 — PR #956 (#599) merges without a separate fidelity review
Builds on: R854
Amends: R854
Coordinator, 2026-10-22T10:32Z. Amends R854 for #956, as R871–R879 did. It changes test-engine
output: a bare `output-list` name now prints at the pin's width. The Opus verifier ran the web IDE's
`ChipTest` at `91ef428` on nine shapes against `hacer run-tst` at the head and at the base. Seven
were byte-identical at the head (one at the base): the issue's Not16 script with and without `load`,
a mixed `%D` and bare list on Mux16, all-1-bit Xor, Mux4Way16 with a bare 2-bit `sel`, DMux4Way, and
two `output-list`s in one script. The two that differ are out of the issue's scope and print as they
did before: an internal wire (already #620) and the `time` column (Phase 0.6). The re-recorded
characterization golden only gains the new field.
Cost if wrong: a bare-name shape the nine did not cover prints differently from the reference;
HRN-023 (#935) is deciding whether such waivers belong in ADR-0018.

## R887 — PR #957 (#878) merges without a separate fidelity review
Builds on: R854
Amends: R854
Coordinator, 2026-10-22T11:05Z. Amends R854 for #957, as R886 did. It refuses an HDL pin wider than
`MAX_PIN_WIDTH` (32), where the web IDE reads a declared width modulo 65536. That is a divergence the
PR itself records in ADR-0020 §1.11 rule 5. The builder re-measured the five new corpus rows on the web
IDE at `91ef428`, and the Opus verifier ran the whole acceptance corpus there: 182 of 182 rows agree on
verdict and message. It also ran five shapes the PR does not record (`IN a[17]` whole and sliced,
`a[65536]`, `a[65537]`, `OUT out[40]` writing `out[35]`): every difference is a refusal over 32 bits,
apart from an older message difference on `a[17]` used whole. All 38 vendored `.hdl` files and the 15
Project-1 sources read the same at base and head.
Cost if wrong: an HDL file with a pin of 33 to 65535 bits that the web IDE accepts is refused by HACER
with a message naming the pin and the limit; no value changes.
