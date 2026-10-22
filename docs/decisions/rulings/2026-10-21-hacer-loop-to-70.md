# Rulings — 2026-10-21 hacer-loop-to-70

The coordinator loop run of 2026-10-21 from 14:30Z. Owner's hand-over: "run the loop until weekly
usage reaches 70%". Weekly usage was 35% at the start (14:17Z); the meter resets on
2026-10-23T03:00Z. Publishing `on-green` under the standing grant. Subagents on Opus and Sonnet, two
at a time until the owner raised the cap to three (R866). The run built the core fidelity chain,
decided the inbox panel's review issues (R844) and built the differential harness (#338, R875).

## R852 — the run ends when weekly_all reaches 70%; no new chain starts at 67% or above, and the records PR starts at 68%
Builds on: R843, R741
Coordinator, 2026-10-21T14:30Z. The owner: "run the loop until weekly usage reaches 70%". weekly_all
read 35% at 14:17Z (resets 2026-10-23T03:00Z), so there are 35 points. A build chain (Opus builder,
Opus verifier, fidelity review) costs about 2-3 points and a close about one, so the same
three-point margin as R843 lets in-flight chains finish and the records merge before 70%. If the
meter reaches 70% with an agent in flight, it finishes its step, nothing new is dispatched, and an
unmerged PR is left open with its state recorded. A reset is not permission to continue (R741).
Cost if wrong: if the owner wanted the run to the line, it stops up to three points early, as the
last run did (17% of 20%).

## R853 — the order: the core issues run as one serial chain, #813 → (#816 ‖ #811) → #814; #812, the inbox reviews and the retro fill the second slot; #338 and #257 wait
Builds on: R742, R849, R782, R798
Coordinator, 2026-10-21T14:30Z. `backlog.mjs ready` offers #338, #257, #813, #814, #811, #816, #812
and 16 review issues. #338 is the cloud lane (R742). #257's QA verdict needs a browser driven
against a PR preview (R849). #813 and #816 both edit `compiler.ts` and `compiler.test.ts`; #813 and
#814 both edit `fromLegacyCircuit.ts` and ADR-0020; #811 pins each reader's exact message, which
#813 changes and #814's parse codes change. Parallel builds of those would each go green alone and
break `main` together, so they run in that order; #816 and #811 share no file and no message. Cap:
two subagents at once (R782/R798; the owner has not said "bed"); a `run-reviews` launch is a
background process, not a subagent, and at most one runs at a time.
Cost if wrong: the core chain takes longer than two parallel core lanes would; about one build's
worth of wall time.

## R854 — every core PR in this run gets a fidelity review before merge, after its verifier, and the fidelity digest runs once after the last core merge, not after each
Builds on: ADR-0018 §2, ADR-0018 §5
Coordinator, 2026-10-21T14:30Z. #813, #816 and #814 change what
`compileHDL`/`compileSpec`/`parseSpec` accept or say, which is ADR-0018 §2's "changes semantics
under `src/core/**`". #811 adds tests and data only. The verifier and the fidelity reviewer run one
after the other when the other slot is busy, so the cap holds. One digest covers the three merges,
because it re-checks the roadmap against current practice, and three runs over the same roadmap
would repeat each other.
Cost if wrong: a roadmap drift the first merge caused is found a few hours later, at the run's last
core merge.

## R855 — the core order is written as GitHub blocked-by links, not only in this run's files, and parallel coordinators get an HRN entry rather than a mid-run change
Builds on: R853
Amends: R853
Coordinator, 2026-10-21T14:27Z. Amends R853's mechanism. The owner asked whether another session can
run the loop beside this one "to clear the queue faster". A claim is an exclusive
`refs/heads/claim/<n>` ref, so two coordinators never pick the same issue, but R853's order lived
only here, so a second coordinator's `backlog ready` would have offered #816 and #811 while #813 is
in flight. `backlog.mjs` reads GitHub's `blockedBy`, so #816 and #811 are now blocked by #813 and
#814 by both; the links clear themselves as each closes. The other gaps are not fixed mid-run:
ruling ids are staged in the run dir and taken from `next-id` only at close, so two runs both stage
from R852; the session record is one file per date; the two-agent cap is per session while the heat
is per laptop; and two `inbox.mjs queue` runs at once could both file a review. They go to
`harness-inbox.md` as one HRN entry in the records PR, for the panel.
Cost if wrong: a second coordinator started before that lands collides at its close on ruling ids or
the session record; the fix is renumbering in its records PR.

## R856 — PR #818 merges on its PASS and the mixed fidelity verdict; the one unsound edge goes to the panel as FID-025 rather than being folded into #818
Builds on: ADR-0018 §2, R854
Coordinator, 2026-10-21T15:25Z. The fidelity reviewer ran the reference and found the new message
and `bindUnconnectedInputs` true wherever no connection names a pin (0 mismatches on 4,500 vectors).
The exception is a pin whose only bindings are out of range: HACER already refuses it for range, and
the new message adds advice that does not work there. The verdict is advisory unless it reports an
oracle divergence, and it reports none. Folding a fix into #818 would change a PASSed head and need
a fresh verifier (verifier-brief.md), and FID-025 asks a question the panel should decide: drop the
cascade, or keep it with a bare message.
Cost if wrong: until FID-025 is built, a learner who writes an out-of-range slice as a pin's only
binding sees a second, misleading line beside the correct range refusal.

## R857 — #825 (the ADR line #816's builder could not write) is folded into PR #826 before its verifier, not built as its own PR
Builds on: R853
Coordinator, 2026-10-21T15:48Z. #825 is one paragraph of ADR-0020 §1.11 rule 4 that records #816's
refusal. As its own PR it would edit ADR-0020 while #814 and #821 also edit it, adding one more
serial link to the core chain. Folded before the verifier dispatch, it is reviewed with the code it
describes, and the coordinator who wrote it does not verify it.
Cost if wrong: the verifier reads one paragraph outside #816's own scope; if it objects, the commit
is reverted and #825 is built alone.

## R858 — PR #837 merges by squash outside `merge-on-green.mjs`, after the same freshness steps the script takes
Builds on: R785
Coordinator, 2026-10-21T16:31Z. `implementer-brief.md`'s test-only rule says the PR "lands as one
`test(<scope>): …` commit with the red recorded in its message". #837's branch has four commits, and
one of them (`a227f2b4`) fails three tests on purpose, which is how the red was shown.
`merge-on-green.mjs` always rebase-merges (`--rebase`, line 143), so it would put that failing
commit on `main`. R785's reason for the script is freshness: never merge on a stale green. So the
coordinator takes the script's steps by hand: GitHub's update-branch with `REBASE` (the script's own
mutation), a wait for every check on the new head, then `gh pr merge --squash --match-head-commit
<new head>`, keeping GitHub's default body, which lists the commits and their red counts.
Cost if wrong: one merge that did not go through the script; if a check is skipped by mistake,
`main` takes an unverified head. The mechanism (a `--squash` flag in `merge-on-green` for test-only
PRs) belongs in an HRN entry in the records PR.

## R859 — #837 is re-opened as #841, one commit with the same tree, after GitHub refused the squash (amends R858)
Builds on: R790, R858
Amends: R858
Coordinator, 2026-10-21T16:36Z. The ruleset allows only rebase merges, whatever the repository flag
says, so R858's squash was refused after every check had passed. R790 already re-opens a branch
whose shape a rebase merge cannot take from a clean cherry-pick. Here the squash of the rebased head
`68faf6ba` onto the same parent `ea87683c` gives tree `8d525080`, identical to the verified head's,
so the verifier's PASS carries over with that identity stated on #841, and nothing is re-reviewed.
Cost if wrong: if tree identity is not accepted as carrying a PASS, #841 needs a fresh verifier
(about 200k tokens) before it merges.

## R860 — PR #843 (#836) merges without a fidelity review
Builds on: R854
Amends: R854
Coordinator, 2026-10-21T17:02Z. Amends R854 for #843. R854 gives every core PR in this run a
fidelity review because each changes what the readers accept or say. #843 changes neither: it
changes what the registry-cycle walk keys on, so that it terminates on a registry that returns a
fresh object per `get`. Its verifier compared the new walk with the old on 4,000 random compiles
under both registry orders and found the same result every time, and the PR makes no claim about the
reference. A fidelity reviewer would re-check #826's claims, which #826's own fidelity review
already did.
Cost if wrong: a semantic change in the walk that no fidelity reviewer saw; the corpus (#841) and
#826's tests would still catch a changed verdict on any shape they hold.

## R861 — a `run-reviews` launch now takes one of the two agent slots
Builds on: R853
Amends: R853
Coordinator, 2026-10-21T17:12Z. Amends R853's cap. R853 counted a `run-reviews` launch as a
background process, not a subagent. But its Opus reviewer runs tests in its own worktree, like a
verifier. The #842 verifier measured load averages of 45 to 130 on this six-core laptop, and
`uptime` read 16 / 67 / 51 at 17:12Z, with other sessions' processes (a `codex` run, headless
Chromium) adding to it. The owner's thermal rule is two agents when the laptop is hot. So from now
on, at most two of {subagent, `run-reviews`} run at once.
Cost if wrong: the inbox reviews move about a third slower, a few review chains fewer by the run's
end.

## R862 — PR #860 (#823) merges without a fidelity review
Builds on: R854
Amends: R854
Coordinator, 2026-10-21T19:49Z. Amends R854 for #860. The change adds one refusal to `printSpec`,
HACER's own exporter, which has no counterpart in the reference: the reference reads HDL and never
prints a document. The case it guards, ExportGap, came from #753's fidelity review, which ran the
reference on it, and #860's verifier measured the same values (`0,2,1,3` unguarded against legacy's
`0,2,0,2`/`0,0,1,1`) and found the guard never fires on 300 parsed documents. A fidelity reviewer
would re-run what produced the entry.
Cost if wrong: an export refusal that a fidelity reviewer would have found too broad or too narrow;
the parity tests in `fromLegacyCircuit.parity.test.ts` pin both sides of it.

## R863 — PR #863 (#855) merges without a fidelity review
Builds on: R854
Amends: R854
Coordinator, 2026-10-21T20:19Z. Amends R854 for #863, as R862 did for #860. The change refuses a
hand-built document whose chip-OUT sink sits on a net named for something else. Neither `parseSpec`
nor the importer builds that shape: the verifier scanned 6,332 importer documents and 2,532 parsed
ones and found none newly refused, with compiled and refused counts unchanged. The spec document is
HACER's own format, with no counterpart in the reference, so there is no oracle claim to check.
Cost if wrong: a refusal a fidelity reviewer would have shaped differently, for documents nothing
builds today.

## R864 — PR #865 (#844) merges without a separate fidelity review
Builds on: R854
Amends: R854
Coordinator, 2026-10-21T20:49Z. Amends R854 for #865. The change is to the text the `nand2tetris`
dialect prints, and its only fidelity question is whether the reference builds that text and
computes the same values. The builder ran the reference on all 12 printed forms, and the verifier
re-ran it independently on 16, including 17, 20, 31 and 32 bits, the split and three `CHIP Or16`
widths, with every vector agreeing; the panel on #793 had measured the reference for the same shapes
before filing. A fidelity reviewer would run the same check a third time.
Cost if wrong: a reference behaviour on a shape none of the three runs covered; the 11,440-document
sweep bounds the window arithmetic, not the reference.

## R865 — an approved inbox entry whose work is on the owner's machine outside the repo is filed `needs-human`, not `agent-ready`
Builds on: R844
Amends: R844
Coordinator, 2026-10-21T21:08Z. Amends R844's filing rule for such entries. HRN-008 proposes a link
in the parent workspace's `.claude/` folder, on the owner's laptop, outside every repository. R844
files an approved entry `agent-ready` at any risk, but an agent writing persistent configuration on
the owner's machine is an action the owner takes or authorises, and the panel's approval stands in
for the owner on the entry, not on his machine. So the panel files the owner's step as
`needs-human`, with the command, the undo and the check, and any in-repo part as its own
`agent-ready` issue.
Cost if wrong: one owner action waits for him that an agent could have done in a minute; the role
files keep running through the hand-the-file fallback until then.

## R866 — the cap is three at once, from the owner's word, and drops to two while the laptop is hot (supersedes R861's two)
Builds on: R782, R798, R777
Amends: R861
Owner, 2026-10-21T21:49Z, recorded by the coordinator. The owner: "you can raise the number of
parallel agents to 3". That is the ceiling his standing instruction allowed after bed. R861's
counting stays: a `run-reviews` launch is one of the three. "Hot" is judged from `uptime` as R780
did: while the 5-minute load average is above 12 (twice the six cores), no third agent starts. It
read 17.99 / 11.16 / 7.60 at 21:49Z.
Cost if wrong: the laptop runs hotter for longer; a test that times out under load (#861) shows up
more often in local runs, and CI stays the gate.

## R867 — PR #876 (#868) merges without a fidelity review
Builds on: R854
Amends: R854
Coordinator, 2026-10-21T22:21Z. Amends R854 for #876. The change makes `testChip` return an error
report instead of throwing on a chip the registry refuses; it changes no verdict, only that a
refusal is reported rather than crashing `hacer run-tst`, MCP `hacer_hdl` and the scenario driver.
The reference's own cause for the shape (`Looping wire a`) is recorded in the corpus as an inherited
divergence.
Cost if wrong: none in verdicts; a reporting choice (the `Invalid chip` prefix dropped) that a
fidelity reviewer might have worded otherwise.

## R868 — the product (PRD) entries' reviews run Opus read-only, not in verify mode
Builds on: R844, ADR-0016
Coordinator, 2026-10-21T22:34Z. Amends `docs/harness/inbox-panel-brief.md` §2's Opus (verify) for
PRD entries. PRD-001's panel reported that its Opus reviewer, in verify mode with a worktree of its
own, ran three headless browser runs on the laptop that mounted the 3D canvas, which ADR-0016 bars
on this laptop. A PRD entry's evidence is screenshots and component code, and the verify reviewer's
instinct on a UI claim is to render it. The launcher takes `--models opus:read-only,grok`, so the
reviewer can read and cannot run anything; the panel still re-checks every claim it relies on.
Cost if wrong: the Opus reviewer cannot probe a PRD claim by running a test; a wrong claim then
rests on the panel's own reading and the tour artifact.

## R869 — PR #885 (#882) merges without a separate fidelity review
Builds on: R854
Amends: R854
Coordinator, 2026-10-22T00:10Z. Amends R854 for #885. Its one claim about the reference, that
`Not16(in[16]=a, out=o)` gets a single range refusal there, was measured by the fidelity review of
#818 that produced FID-025 and again by the #827 panel, which ran the reference builder at
`91ef428`; the verifier confirmed the mixed in-range/out-of-range and unbound-beside cases.
Cost if wrong: a not-connected edge a fidelity reviewer would have found; the corpus (#841) pins
every recorded shape's verdict.

## R870 — the process review that `ready` now reports due is not started in this run
Builds on: R852
Coordinator, 2026-10-22T02:47Z. #902 (#895) made `ready` print `process review due: 26 days since
2026-09-26`. A cycle is two fresh Opus reviewers plus a synthesis, a few points of weekly usage, and
the run has about 7 points before R852's no-new-chain line at 67%; those go to #901 (core, in build)
and its verify and fidelity review, #903 after it, the last inbox reviews, and the records PR at
68%. The next run's first pick sees the line.
Cost if wrong: the process review slips by one run (days), in a month that already ran a retro
(#824) and eight retro HRN entries through the panel.

## R871 — PR #904 (#901) merges without a separate fidelity review
Builds on: R854
Amends: R854
Coordinator, 2026-10-22T03:13Z. Amends R854 for #904, as R860-R869 did for others. It changes no
evaluation: seven tests pin today's behaviour and ADR-0020 §1.11 rules 2, 4 and 5 describe it. Its
claims about the reference (the web IDE resolves its 43 `REGISTRY` names before reading any file;
the 27 names; the book's own-first order) were measured by the #839 panel running the web IDE's
builder (0 reads for all 43) and re-checked by the #848 panel at `91ef428`; the Opus verifier
re-derived the 43 and 27 lists and confirmed the rule 2 correction against #820's `f632948d`. A
fidelity reviewer would run the same checks a third time.
Cost if wrong: ADR prose that names a reference behaviour imprecisely; no verdict changes.

## R872 — PR #908 (#906) merges without a separate fidelity review
Builds on: R854
Amends: R854
Coordinator, 2026-10-22T03:55Z. Amends R854 for #908. It changes only the line a cycle refusal
carries, not whether a chip is refused. The reference's lines were measured twice by running the web
IDE builder at `91ef428`: by the #867 panel on its shapes, and by the Opus verifier on A, B, C, K, W
and J plus eight shapes of its own. Every shape agrees except W and the multi-line J, which the
issue names as known differences. A fidelity reviewer would run the same builder a third time.
Cost if wrong: a learner sees a different line from the web IDE on some shape no run covered; no
verdict changes.

## R873 — PR #910 (#903) merges without a separate fidelity review; the run's fidelity digest covers the batch
Builds on: R854
Amends: R854
Coordinator, 2026-10-22T04:09Z. Amends R854 for #910. It adds a refusal for a registered definition
whose name or pins differ from its source, a shape the reference cannot hold at all: it reads pins
from the source and refuses a misnamed file (`Line 1: Wrong chip name`, `Undefined chip name`,
`Undefined pin name`), measured by the #849 panel at `91ef428`. The verifier found the ADR text
matches the panel's decision and the lines it cites, and that none of 93 builder-made definitions
(builtins, Project 1, conformance files) is newly refused. The digest after the last core merge
(queue item 10) re-reads every core change of the run against the reference.
Cost if wrong: a refusal message a fidelity reviewer would have worded closer to the reference's.

## R874 — PR #911 (#909) merges without a separate fidelity review; the run's fidelity digest covers the batch
Builds on: R854
Amends: R854
Coordinator, 2026-10-22T04:15Z. Amends R854 for #911. The change only removes grading refusals, so
that `compileHDL` names the cause the reference names first. Its reference claims were measured
twice by running the web IDE's `parse` at `91ef428`: by the #874 panel on 35 shapes, and by the Opus
verifier on A1-A6 and S6/S10/S11, plus 16 shapes of its own and a seeded fuzz of 2,500 chips. No
shape the reference refuses now passes grading, and none regresses.
Cost if wrong: a learner sees HACER's wording of the first cause where a reviewer would have matched
the reference's sentence; no verdict changes.

## R875 — the pick rule's #257 (browser QA agent) is passed over this run; #338 (differential harness) is taken instead
Builds on: R742, R849
Amends: R853
Coordinator, 2026-10-22T04:22Z. `backlog.mjs next` names #257 (harness, risk:2). Its last criterion
is a first QA run recorded on a real critical PR, driven in a browser by a cloud session or Actions
("never the laptop for 3D"), and its third makes merge require a QA verdict as well as the code
verifier. This run is laptop-only and has about 5 points of weekly usage left, so a build could
deliver the brief but not the recorded run, leaving a merge gate half in place. #338 is the next
pickable item: Node-only, headless, runnable on the laptop, and it builds the strong oracle (HACER's
engine beside the reference on the official vectors) that this run's fidelity work keeps reaching
for. The builder stops and reports a split if the PR would need a size override.
Cost if wrong: #257 waits one more run; #338's chain may not finish before 70% and is then left as
an open PR for the next run.

## R876 — PR #914 (#905) merges without a separate fidelity review
Builds on: R854
Amends: R854
Coordinator, 2026-10-22T04:40Z. Amends R854 for #914; the run's digest had already run. Its one
claim about the reference is that the web IDE reads each windowed export as HACER's value. The
builder measured that by running the web IDE at `91ef428` on three shapes, and the Opus verifier ran
the PR's own export text through it in 14 shapes, including 32-bit, 17-bit, offset-slice and
two-wide-pin cases: every export reads as HACER's value. The verifier also found no narrow print
changed over 15 Project 1 sources and 400 generated documents in both dialects. The value itself
(every bit) was decided by the #859 panel.
Cost if wrong: an export a reviewer would have windowed differently; the one known gap (a sliced
wide `true` on a part the registry lacks) is filed as a follow-up.
