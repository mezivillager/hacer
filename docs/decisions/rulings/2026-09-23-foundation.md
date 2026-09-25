# Rulings — 2026-09-23 foundation

Imported by #466 on 2026-09-25 from the coordinator's run directory `2026-09-23-hacer-foundation`; wording unchanged except machine paths. `Builds on: unknown` marks a ruling nobody has annotated; a restated ruling carries a new id and `Amends:` the original.

## R301 — The spikes run before the ADR
Builds on: unknown
#327 is not blocked by #328 or #210 in GitHub, but the
plan's rule 6 is "a throwaway spike before each wide change; the list of what broke becomes the
issue list". Fixing the `layout`/`route`/`describeScene` contracts before the importer hard cases
and a measured headless placement are known would be exactly the mistake the rule exists to stop.
Cost if wrong: the ADR starts a few hours later than it could have.

## R302 — #351 gets a second verification pass rather than a coordinator merge
Builds on: unknown
I wrote the fix
myself after the BLOCK, so merging on my own reading would make the author the reviewer on a PR
that changes the verification gate. Opus, per the tier the PR itself sets for `risk:2`-class
harness work. Cost if wrong: one verifier run (~150k tokens).

## R303 — Both spike notes stay local; their findings go to GitHub as issues and ADR input
Builds on: unknown
The
notes cite a throwaway worktree and hand-built fixtures; committing them would put unreproducible
paths in a public repo. Filed instead: #355, #356, #357 (engine defects) and a decision list on
#327. Cost if wrong: the raw measurements live only in `~/.claude/runs/` — the ADR quotes the
numbers that matter, so a lost note costs re-measurement, not a decision.

## R304 — #356 carries a plan amendment, not just a fix
Builds on: unknown
The spike showed `topologicalEval`
traces junctions by array position, so the legacy evaluator is wrong for a branch-first junction.
REPORT §6 N.2 makes "evaluation parity with the legacy engine" the importer's acceptance test —
which a *correct* importer would now fail. The amendment (parity against a structurally traced
legacy evaluation) is in #356's acceptance criteria so it lands with the fix rather than as a
separate doc PR. Cost if wrong: the ADR restates it anyway; a duplicated sentence.

## R305 — Layout: roll our own, and the sidecar ships in v1 of the spec
Builds on: unknown
Both spikes measured
stability under edit and it is the deciding criterion for a read-only view. elkjs moves 23/54
parts on a one-part edit and changes completely under input permutation; a hand-rolled layered
placer moved none, 120-350x faster, 886 B against 439 KB min+gzip. The two spikes disagreed
(16/16 moved vs 0/16) and the disagreement located the cause: the barycentre **ordering** step,
which buys crossings 43->8. Recorded as a recommendation on #327, not a decision — the ADR
decides. Cost if wrong: a dependency we declined is added later, which is cheaper than removing
one we adopted.

## R306 — The ADR (#358) gets its adversarial review before any Phase N work starts
Builds on: unknown
#327's own
acceptance criteria require it and the ADR is `Proposed` until it passes; the ADR agent filed it
as #359 itself. The review is briefed to attack the author's own stated weakest decision
(`order: 'id'` — stability measured exhaustively, readability not at all) and the new `aliases`
syntax, and to flag any evidence-free decision that is **not reversible**. Cost if wrong: one
review run; the cost of skipping it is a wrong contract under months of work.

## R307 — The ADR's two new hard preconditions are accepted as plan amendments
Builds on: unknown
(a) A corpus of
**real v1 documents must be captured and committed before `serialize.ts` is deleted** — no saved
circuit file exists anywhere in the repo, so the legacy format's real shape is currently
unrecorded and would be unrecoverable. (b) **#355 and #357 block N.2/N.3** — #355 is exactly the
dissolved-joiner shape and #357 is the only way to express one capability row. Both are stronger
than what REPORT §6 said; neither was in the plan. Cost if wrong: one extra capture PR before the
deletion, which is cheap insurance against an irreversible step.

## R308 — #360 (the ratchet) is verified on Opus, not Sonnet
Builds on: unknown
#351 would tier a `risk:1`
non-engine PR to Sonnet, but #351 has not merged, so the policy in force is still Opus for
`risk:1`. Dispatching Sonnet here would repeat exactly the #320 mistake this run is trying to
mechanise away — verifying a tier below the rule and nobody noticing. Cost if wrong: one Opus
verifier run instead of a Sonnet one.

## R309 — The ratchet's globals half is ESLint, not dependency-cruiser, and that is right
Builds on: unknown
`console.*` and DOM globals are globals, not dependencies, so dependency-cruiser physically
cannot see them. ESLint's **native** bulk suppressions shrink the same way rather than inventing
a parallel mechanism. The verifier is asked to check the one thing that makes or breaks it:
whether a new violation can be absorbed by regenerating the suppression file, and whether that
regeneration is gated. Cost if wrong: the globals half is advisory rather than a ratchet, and the
33 `console.*` calls in `wiringScheme` can grow — they are slated for deletion anyway (#332).

## R310 — The `fast-check` deviation on #355 is accepted
Builds on: unknown
The issue said `fast-check` was already
a dependency; the builder found it is in neither `package.json` nor the lockfile and substituted
an exhaustive permutation sweep plus a seeded sample, citing AGENTS.md §1.0 ("trust the code over
the ticket"). That is the right call: adding a dependency is #198's job, and an exhaustive sweep
over 24 orderings is *stronger* than sampling that space. **My error, not the builder's** — I
wrote "fast-check is already a dependency" into #355's criteria from the testing audit's
recommendation rather than from the manifest. #198 is where it lands. Cost if wrong: the property
test is ported when #198 adds the library.

## R311 — Same-slice-twice is a compile error, not last-wins
Builds on: unknown
Two parts driving one bit is a
short circuit rather than a value; last-wins would preserve exactly the part-order dependence
#355 removes; and the reference simulator rejects it too. The verifier is asked the one question
that could overturn it: does anything that compiles today now fail? Cost if wrong: a chip that
used to compile stops, which the Project-1 corpus and the verifier's repo search would catch.

## R312 — ADR-0020 goes back for one revision round rather than being accepted or rewritten
Builds on: unknown
The
review's verdict was `sound with corrections` and it confirmed the spine explicitly, so the
document is not restarted. But two of its findings are structural, not polish: (a) **`aliases`
exists only because the ADR models connectivity as part-attached `conns` with no `nets` member**,
which is the opposite of the circuit-json/DigitalJS shape the same ADR says it adopts — with a
driver→sinks net list a pass-through is an ordinary net and the construct is unnecessary; and
(b) the review found a **third layout option the ADR never considered**, `layout(doc, surface,
{ previous })` — pure, barycentre on first layout, then keep the relative order of placed parts
and insert only new ones — which would get crossings *and* stability with no user action and no
import moment. The reviser is told the review is evidence, not orders, and to argue back where it
is wrong. Cost if wrong: one more ADR round before Phase N starts; the alternative is a schema
v1 carrying a construct invented to work around a modelling choice.

## R313 — The `order: 'id'` question is settled by measurement, now, while the spikes' throwaway
Builds on: unknown
code still exists.** The review's sharpest process point: the ADR's named settling experiment
(rasterise and judge by eye) is not the cheapest, because S328's crossing counter and S210's
pluggable comparator already exist and two numbers on the **real** 48/192-part fixtures settle it
in minutes. It also caught the ADR quoting S328's 16/16 while suppressing S210's own barycentre
stability figure (41-100%), and the 43->8 crossing evidence coming from a deliberately tangled
synthetic graph while the real fixture reports `crossings=0`. Both worktrees verified present
before dispatch. Cost if wrong: minutes, and the numbers are then in the ADR rather than a
judgement call.

## R314 — #362 merged on a PASS; its top nit filed as #363 rather than fixed in place
Builds on: unknown
The
verifier found `compileHDL` over-approximates edges because reads and writes are tracked per
signal rather than per bit, so after the fix a part reading `t[1]` takes an edge from the `t[0]`
writer — which can produce a **spurious combinational cycle** on disjoint slices. It did not
block, and I agree: it swept all 24 orderings and found the affected chip already failed to
compile in 12 of them at `main`, so its acceptance was itself order-dependent. #362 traded a
silent wrong answer for a loud wrong diagnosis, which is the right direction — but the diagnosis
is still wrong, hence #363. Cost if wrong: a legitimate chip using disjoint slices across a
feedback path cannot compile until #363 lands; none exists in the repo today.

## R315 — Built `~/.local/bin/gh-merge-on-green` after my own recovery made things worse
Builds on: unknown
The
#295 stuck-checks bug hit every PR this run. I reran all cancelled runs in a batch and turned one
cancellation into three: each rerun contends with its sibling under the same `concurrency` group.
The tool waits for every run to complete, refuses when something genuinely failed, then reruns
**one** cancelled run at a time. The owner granted tool/skill changes in the ha workspace for
exactly this. Cost if wrong: a coordinator watches merges by hand, as before.

## R316 — The 3-agent cap is NOT overridden
Builds on: unknown
It is in `ha/.claude/settings.local.json` because
the owner said "at most 4 parallel agents locally to avoid local resource burden, since its intel
i7 machine and I need the resource for other works", then lowered it to 3 himself. That is his
machine's budget, not a tool constraint blocking me, and his permission to override tooling does
not extend to spending his CPU. Cost if wrong: the run is slower than it could be, which is the
cheap direction.

## R317 — ADR-0020 reverted to `Proposed` and given a focused delta review
Builds on: unknown
The reviser flipped
it to `Accepted` and said so plainly, offering to revert. Four decisions changed **after** the
#359 review — the `nets` model replacing `aliases`, `layout({previous})` as the default, the gate
rule, and the importer's both-drivers rule — so nobody but their author has read them. The second
pass reviews **only those four**, because a full third review would cost the plan more than it
buys. Cost if wrong: one more review round on the foundation contract.

## R318 — The measurement overturned the ADR's own headline decision, which is why it was worth
Builds on: unknown
running.** `order: 'id'` cost 2-3x the crossings on real fixtures (Parity5 50 vs 0; 906 nodes
42696 vs 13475), and its claimed 100% stability was an artifact of the append convention -
70% on a mid-list insert, *below* barycentre's 91-95%. The ADR had quoted one spike's figure and
suppressed the other's. `layout(doc, surface, {previous})` - the option the first review invented
and the ADR never considered - is byte-identical to barycentre on first layout and at least as
stable on every edit shape. Cost if wrong: the drift over many successive edits (1650 -> 2384 over
ten additions) is the open question, and the delta review is asked what happens over a hundred.

## R319 — #295's cause was understated on the issue, and the fix is demonstrated rather than
Builds on: unknown
argued.** GitHub sends **one webhook action per label**, so `gh pr create` + `gh pr edit
--add-label a,b` delivers `opened`, `labeled`, `labeled` in about two seconds; both `pr-hygiene`
and `browser-qa` list `labeled` in `types:` while `ci.yml` does not, which is exactly why `ci`
never stuck. GitHub judges a required context by the **newest** check run with that name, so one
late cancellation blocks a PR whose checks all passed. `cancel-in-progress: false` is cheap
because a run cancelled while still *pending* creates no job and no check run — the queue still
collapses to one pending run per group. Rejected alternatives with evidence: narrowing `types:`
(labels genuinely change both verdicts — #360's `pr-hygiene` went failure → success with only a
`labeled size-override` in between), and a per-action concurrency group (two labels in one
`gh pr edit` are two `labeled` actions a second apart and share any action-keyed group).
**The PR is its own A/B**: `browser-qa` runs the branch's fixed file, `pr-hygiene` runs `main`'s
unfixed one, same PR and same seconds — 3 runs/0 cancelled against 3 runs/1 cancelled, and
`CLEAN` with no manual rerun. Cost if wrong: one extra workflow run per PR (~8-13s).

## R320 — My own recovery advice was wrong and is now corrected in the repo
Builds on: unknown
Re-running all
cancelled runs at once re-creates the problem; the builder measured #360's attempt-2 runs
cancelling each other, which matches what I did to #362 (1 cancelled → 3). The repo now carries
the recovery under "When a required check is stuck", and `gh-merge-on-green` reruns one at a
time. The combined-status `pending` I kept quoting is also a red herring — `commits/<sha>/status`
is legacy statuses with `total_count=0` on every commit here.

## R321 — The missing tamper sticky comment on a `.github/workflows/**` PR is not a regression
Builds on: unknown
#151 (the tamper flag) is still open and unbuilt, so there is nothing to post. Nothing filed; the
verifier is asked to confirm rather than assume.

## R322 — ADR-0020 is accepted after corrections, with no third review round
Builds on: unknown
Verdict
`accept with corrections`; the seven fixes are text-level. A third round would cost the plan more
than it buys, and the review said so itself. Cost if wrong: an error in the foundation contract
survives to the spike that tests it.

## R323 — The ADR's §1.8 justification was false and is being replaced, but its decision stands
Builds on: unknown
The review measured `Not(in=a, in=b, out=out)` — the exact importer shape — compiling and
silently evaluating last-binding-wins at `main` **with #362 merged**. #362 refuses two part
*outputs* on one bit; this is one part *input pin* bound twice, which `drivenRanges` never sees.
Filed as **#367** (the input-side twin of #355). The ADR keeps "both drivers" on the honest
ground — a multi-driven pin's legacy value is undefined, not last — and makes its claim
conditional on #367 rather than asserting a refusal that does not happen. Cost if wrong: the
importer relies on a check that does not exist, which is exactly what #367 closes.

## R324 — #365's PR overstated its repro, and I corrected the record before merging
Builds on: unknown
The
verifier could not reproduce the wrong values through real store actions:
`completeJunctionWiring` copies the trunk's source into every branch, so the wires a junction
lists share a `from` and `wireIds[0]` is harmless. The wrong values need a junction-endpoint
wire, which serialization permits and no store action writes. The fix is right and wanted — the
importer will read documents of that shape — but a claim the next reader cannot reproduce does
not belong in the repo, and #310's measurement-honesty rule is explicit. Test title and comment
corrected; PASS stands. Cost if wrong: none; the tests are unchanged in what they assert.

## R325 — #364 raised to `sev:high`
Builds on: unknown
The same verifier found `signalActions.ts:61`, where
`removeJunction` deletes `wireIds.slice(1)` — on a branch-first junction that deletes **the trunk
and keeps a branch**. That is data loss, not geometry, so #364 is no longer a cosmetic cleanup.
Cost if wrong: it is one label and a test.

## R326 — #366 merged on a PASS that answered the one question that could have sunk it
Builds on: unknown
With
`cancel-in-progress: false`, could a *stale* run from an earlier commit finish last and become
the deciding check run? **No**, for two measured reasons: check runs partition strictly by head
SHA (on `feat/231-verifier-tier`, three heads carry disjoint check-run sets), and within a group
the runs serialise strictly — this PR's browser-qa runs are 00:33:22→31, 00:33:34→45,
00:33:48→55, each starting only after the previous completed. The A/B held on re-derivation:
browser-qa 5 runs / 5 success / **0 cancelled** against pr-hygiene 5 / 4 / 1, same PR. Two
corrections to the builder: `ci.yml` has **no `concurrency:` block at all**, which is the
stronger reason `ci` never stuck; and the test count in the PR body was stale (2120, not 2112).
Cost if wrong: PRs queue a little longer — the verifier notes the real cost is one extra run per
*burst* rather than per PR, and ~4 min of added latency on a Playwright run.

## R327 — Two doors left open by #366, both filed rather than fixed in it
Builds on: unknown
**#368**: a manual
`browser-qa` dispatch posts a check run under a required context name **and keys into a different
concurrency group**, so it is not serialised against the PR's own runs — the exact precondition
#295 needed, reachable by hand. The workflow's own comment claims a dispatch does not post a PR
check; run 35347165462 did. **#369**: the new guard misses three spellings of the flag
(`${{ … }}`, quoted `"true"`, `True`) — 6 mutations caught, 3 escaped. Not blocking, because the
blind spot **fails closed for the merge gate**: it can only let through a config that makes PRs
stick, never one that lets a bad PR merge. Cost if wrong: #295's symptom returns through a door
nobody is watching, which is why #368 is `risk:1` and not `risk:0`.

## R328 — ADR-0020 is Accepted (PR #358), after three passes: a review, a revision, and a delta
Builds on: unknown
review.** Two of the three rounds changed a decision, which is the argument for having run them.
The first review invented `layout(doc, surface, {previous})`, which the ADR had not considered
and which then won on measurement. The delta review measured that §1.8's justification was false
against the merged engine. Neither would have surfaced from re-reading the document. Cost if
wrong: the contract is now the thing Phase N is built against, and correcting it later is
expensive — which is exactly why it got three passes and a spike first.

## R329 — Deviations by the corrections agent, all accepted
Builds on: unknown
It argued back on three of my seven
instructions and was right on each: the index row already read `Accepted` so no README edit was
needed; a bare "any capability it names" gate clause would have made #172 gate the switch on
drill-down, which the legacy app does not have, contradicting clause (a) — so a bundled row gates
only on the capabilities the legacy app actually has; and it kept `compileSpec`'s rule
load-bearing today rather than merely making the old sentence conditional. It also rebased onto
`origin/main` and force-pushed with `--force-with-lease` (disjoint file sets). Cost if wrong:
none observed; each deviation is recorded on the PR.

## R330 — #370 (#357) merges before #375 (#367); #375 is not verified until after the rebase
Builds on: unknown
Both rewrite the same region of `src/core/hdl/compiler.ts`: #370 splits `HDLConnection` into
internal/external sides with slices on each, #375 adds `claimBits` and turns `connectedInputs`
into a per-pin range map. #370 is larger and older, so rebasing it onto #375 is the expensive
direction. #375's builder anticipated the collision, left the disjoint case as `it.todo` naming
#357, built the overlap rule per-bit so it survives, and posted its assumption to #357 — the
reconciliation is one known line plus turning the "pin is connected" check into a **coverage**
check now that a pin can be partially bound. Cost if wrong: a rebase either way; verifying #375
now would spend a verifier on code about to change.

## R331 — #321 and #332 are done as one deletion PR
Builds on: unknown
They overlap (both delete
`e2e/helpers/waits/render.waits.ts`, which #321 removes with the tracker and #332 counts among
the 43 caller-less exports), and #344's deletion-only exemption makes the combined size
irrelevant — which also makes this **the first live exercise of that exemption**, still unproven.
Cost if wrong: one large deletion PR is harder to review than two, mitigated because a deletion
PR adds no behaviour and the verifier checks the same property either way.

## R332 — #370 merged: the literal-widening change is correct, and the verifier proved it from the
Builds on: unknown
specification rather than from plausibility.** `true` now widens to the width of the side it
binds, which silently changed `Not16(in=true)` from 65534 to 0. The verifier found
`TRUE_BUS = new ConstantBus("true", 0xffff)` in the reference simulator and a reference test
commented *"From figure A2.2, page 287, 2nd edition"* asserting
`in[0..1]=true, in[3..5]=six(110), in[7]=true` → `0b10110011`, then **reproduced that figure
through HACER's compiler**. The old value was wrong; nothing in the repo used a literal on a wide
pin. Cost if wrong: an engine semantic changes under everyone — which is why it was checked
against the specification and not waved through as "probably right".

## R333 — Both of #370's self-assessments were honest, and that is worth recording because a PR
Builds on: unknown
absolving itself is the claim least likely to be checked.** It said #371 (external-side slices
unchecked) was pre-existing: the verifier ran `Not(in=a[99])` on a 4-bit `a` at `origin/main` and
it already compiled and evaluated to 0. It said it had not created #363: the verifier ran the
claimed repro at `origin/main`, where part-pin slices do not even parse, and got the same cyclic
error. Both stand. Cost if wrong: none — verified.

## R334 — Two nits folded rather than filed
Builds on: unknown
`compiler.ts:78` (a signal written only through
external slices gets no inferred width, so later connections are unchecked) went into **#371**,
same root and the verifier suggested folding. `Not16(in=a, in[0]=b)` compiling order-dependently
— a whole-pin binding overlapping a sliced one, newly expressible via #370 — went into **#367**,
because it is that issue's defect class reached through new syntax, and the rebase agent is
briefed to catch it. Cost if wrong: two issues carry a little more scope than they were filed
with, which is cheaper than two more issues to triage.

## R335 — #364 reopened, scoped to one line
Builds on: unknown
The sweep closed it as hand-editing geometry and
flagged, itself, that `signalActions.ts:61` is different: `removeJunction` deletes
`wireIds.slice(1)`, so on a branch-first junction it deletes **the trunk and keeps a branch**.
The sweep carried it as an acceptance criterion on #376 — but **#376 is `needs-human`**, waiting
on the owner for real save files, so a correctness fix inside it waits on the owner too. It is
also reachable through ordinary use: `removeWire` on a trunk leaves `wireIds` branch-first
(measured on #365), and removing the junction then deletes the wrong wire. The five geometry
readers stay closed. Cost if wrong: one small issue that the canvas deletion would have removed
anyway.

## R336 — #376 keeps `needs-human`, and it blocks nothing today
Builds on: unknown
It asks the owner one
question — are there real saved circuits to capture before `serialize.ts` is deleted? — and the
deletion is Phase C, far off. It carries ADR §7.2's exit clause, so it cannot deadlock if the
answer is "none". Surfaced in the end-of-run review rather than as an interrupt, per the owner's
standing rule. Cost if wrong: the corpus is captured a few days later.

## R337 — #387 is verified on Sonnet, which is the correct tier under the policy in force
Builds on: unknown
The
merged table already assigns `risk:0` docs-only verification to Sonnet; #351 (which would extend
that to `risk:1`) is still open. The brief points the tier at the part that actually carries
risk: **19 issues were closed**, and a wrongly-closed issue is work that silently disappears.
Cost if wrong: a Sonnet verifier misses a bad close, which the committed table makes recoverable.

## R338 — #375's partially-bound-pin decision follows from evidence, not preference, and the
Builds on: unknown
verifier is asked to check all three legs.** A partially bound pin compiles with unbound bits
reading 0; only a pin no binding lands on is "not connected". The grounds: #370 already ships
`Or8Way(in[0]=a, in[1]=b)` with bits 2..7 reading 0 **and a test asserting it**, so deciding
otherwise would silently change merged behaviour; the reference simulator has **no connectedness
pass at all**, only `checkMultipleAssignments`; and TECS figure A2.2 is itself a partially bound
pin with zero gaps. The second leg is the one most likely to be wrong by assertion, so the
verifier checks it directly. Cost if wrong: valid HDL is rejected, which the Project-1 corpus
would catch.

## R339 — The rebase cost exactly the one line its author predicted
Builds on: unknown
#375 was written against a
base #370 then rewrote; rather than guess, its builder left the disjoint case as `it.todo`, built
the overlap rule per-bit, and posted the assumption to #357. The reconciliation was
`claimBits(…, 0, inPin.width - 1)` → `…, conn.internalSlice?.start ?? 0, conn.internalSlice?.end
?? inPin.width - 1`, plus absorbing a rename. **This is the cheapest collision in the run**, and
it was cheap because the first builder wrote down what it was assuming instead of racing. Worth
keeping as practice: when two agents must touch one file, the second states its assumption on the
first's issue.

## R340 — Usage read at 02:00Z: `weekly_all` 63%, `weekly_scoped` 60%, session 22%
Builds on: unknown
Seven points
from the owner's 70% stop. Read from the JSON endpoint (#348), not estimated. Plan from here:
let the three running agents finish, dispatch **one** more item (#351's third pass — the only
open PR whose fixes nobody has read), then wrap up. New work stops now; the remaining budget
goes to finishing what is in flight and writing the record. Cost if wrong: the run stops a point
or two short, which is the cheap direction — and the queue is in a state another session can
pick up, which is the whole point of the sweep and the Phase N filing.

## R341 — #351 gets a third pass rather than a merge on my own reading
Builds on: unknown
It has been open since
2026-09-21, is CLEAN with every check green, and both BLOCK rounds were addressed — **but the
round-2 fixes are mine and nobody has read them.** That is the exact pattern that failed twice on
this same PR: I reintroduced the two-clause ambiguity in a sibling file, and I claimed #320 had
no second pass when it did. A focused delta review of just the round-2 changes, as with the ADR.
Cost if wrong: one small review run on a PR that changes the verification gate itself.

## R342 — #387 merged on a Sonnet PASS, and the work is a data point for #351
Builds on: unknown
The brief pointed
the tier at the part that carried risk — 19 issue closes, where a wrong one silently deletes
work — and the verifier checked **all 19 individually rather than sampling**, read all 14 Phase N
bodies (six were asked for), recounted the 127 rows directly, and reconciled `backlog.mjs ready`
against the PR's claim, correctly attributing the +1 to my own #364 reopen. It also caught a
third close reason not in the authorised two (#213 as a literal duplicate of #168 — sound, filed
as a nit) and confirmed #223, the one "router" bug among the closes, is rendering-only because
evaluation reads the `wires` array and not geometry. That is the standard #351 claims Sonnet
meets at `risk:0`. Cost if wrong: it did not re-verify all 89 "keep" justifications, which is the
right thing to skip — a wrong *keep* leaves work in the backlog, a wrong *close* removes it.

## R343 — #375 merged; its verification found something about the *reference* implementation
Builds on: unknown
The verifier attacked both directions: 13 legal shapes (adjacent groups, whole pin written as a
range, `in[0]`/`in[0..0]` on a 1-bit pin, overlapping **output** slices which are fan-out and
correctly not caught, two parts each with a pin named `in`, nested HDL) all compile and evaluate
to values identical to `origin/main`; 11 overlap shapes all caught with the right first shared
bit in both orderings. It also swept `ha/` exhaustively for a part pin bound twice — 68 sites,
all disjoint, all in tests. **And it found that web-ide's own `checkMultipleAssignments` is
order-dependent (`builder.ts:166-168`) and misses `Not16(in[0]=b, in=a)`, which HACER now
catches.** The reference is the oracle for #338's differential harness, so that is worth knowing
before it is built: the two engines will legitimately disagree here, and HACER is right.
Cost if wrong: none — it is recorded, not acted on.

## R344 — The double-error diagnostic is accepted with a follow-up (#390)
Builds on: unknown
`compileHDL`
accumulates rather than failing fast, so an out-of-range binding produces errors about bits that
do not exist — `Not16(in[16]=a, in[16]=b)` reports a clash on "bit 16" of a 16-bit pin. Both
messages are true, the root cause is first in the array, and it is unreachable from valid HDL.
Not worth blocking a correct fix; worth fixing before someone reads a diagnostic naming a bit
that cannot exist. Filed with the partially-out-of-range case, which is the one most likely to be
handled inconsistently, and cross-linked to #371 — same family, opposite sides of the connection.

## R345 — Two things in my #321/#332 brief were wrong, and the builder was right to say so
Builds on: unknown
(a) I briefed that deleting `renderTracking` would shrink the layer-ratchet baseline. It did not —
34 → 34 — because `circuitStore.ts → renderTracking` was never a dependency-cruiser violation:
`src/utils` is not one of the three layers, and the `src-no-e2e` row on `circuitStore.ts` is its
`e2e/types/globals` import (#185). I inferred the violation from the issue's text rather than
from the baseline file. (b) The ESLint half *did* shrink, 35 → 8 suppressed engine globals. Same
authorship rule as R310: **a criterion naming a measured fact is checked against the artefact
before it is written.** Cost if wrong: a builder chases a number that was never there.

## R346 — The audit's dead-export count was wrong, and the method is why
Builds on: unknown
46 of 116, not 43 of
96. The audit used a text search, which read `setInputValue`'s own body — it calls
`window.__CIRCUIT_ACTIONS__.setInputValue` — as a caller of itself. The builder re-derived with a
TypeScript AST walk plus a resolved import graph, treating a barrel re-export as a conduit rather
than a caller. The verifier is asked to invert that concern: the same dynamic property access
that fooled the text method could make a *live* symbol look dead to an AST walk. Cost if wrong:
something reachable only through `window.__*` is deleted, which the Playwright `--list` count and
the spec-name search are the checks against.

## R347 — The deletion-only exemption did not apply on its first live run, and #389 is the right
Builds on: unknown
response.** #388 is 535 deletions and 194 additions — the additions being the no-dead-export
guard **#332 itself required**. `pr-hygiene` refused the exemption by name. The gap is real: the
normal shape of good deletion work is *delete the dead thing and install the mechanism that stops
it returning*, so an exemption fitting only guard-less deletions rewards the weaker PR. I ruled
against widening the per-file fix-up cap (it exists so a "deletion" cannot smuggle in behaviour,
and #344's verifier proved the ceiling is 20 lines) and for either a net-negative threshold or a
declared `adds-guard` allowance. `size-override` was correct here — the alternative was stranding
a correct PR — but an override used because the rule does not fit the work is a signal about the
rule. Cost if wrong: deletion PRs keep needing a manual override until #389 lands.

## R348 — #351 merged after three review rounds, and the third was worth running
Builds on: unknown
Every one of
the five round-2 findings was re-derived rather than read: the reviewer traced #312's shape
(`risk:1` + `src/simulation`) through **all five surfaces that state the tier rule** and
confirmed each sends it to Opus; it checked the API for #320's coordinator PASS at
`11:43:02Z` and that it names no model; and it ran **10 mutations** against the live brief and
the real test. Caught: both round-2 exploits plus two of its own. Escaped: 4, all one class —
leave the pinned sentence byte-identical and change something *around* it (reverse an unpinned
tie-break so engine PRs route to Sonnet, redefine "touching", relocate the sentence into
"optional extras", strike it through and supersede it). That is the accepted limit of a
`present`-phrase check, and it is why **#391's cross-file agreement check is worth more than any
additional phrase** — it catches divergence rather than absence. It also confirmed the evidence
section no longer overstates: nowhere is "four live outings" claimed for the lowered row.
Cost if wrong: a Sonnet verdict is overturned, which is the documented trip-wire.

## R349 — The ledger's own rule was applied to the ledger: #391 filed
Builds on: unknown
`.claude/agents/*.md` is
the one surface no invariant covers, and the same tier-rule defect appeared there **twice** —
round 1 reintroduced the ambiguity in the agent description in the same commit that fixed the
brief, and round 2 was the same class again. The ledger recorded occurrence 1 as "a rule of
authorship", which was honest then; but the standing rule is that the **second** occurrence
becomes a mechanism, and this is it. The issue's load-bearing criterion is not "pin more
phrases" — it is that the tier sentence in the agent definition and in the brief must be **the
same sentence**, because the defect was divergence between twins, and pinning each separately
would not have caught it. Cost if wrong: one more invariant to maintain.

## R350 — My #389 recommendation was wrong; corrected on the issue
Builds on: unknown
The exemption runs on the
**reviewable bucket only** (`pr-hygiene.logic.mjs:48` classes all of `e2e/` as test), so #388's
real split is 194 added / 347 deleted, not the 535/194 I quoted from the whole diff. The
net-negative threshold I proposed fails on those numbers: `194 ≤ max(20, 0.2 × 347 = 69)` is
false — it would not have exempted the very PR that prompted the issue. Exempting `scripts/`
(option 2) is worse than the problem: that directory holds the machinery judging every PR. Option
1 — a declared bounded allowance naming the guard — stands. **This is the third time today I
wrote a criterion from prose rather than from the artefact** (after `fast-check` on #355 and the
layer-ratchet premise on #332). The rule is written down; I need to apply it to my own comments,
not only to issue bodies. Cost if wrong: someone implements a rule that does not fix the case.

## R351 — #392 filed for a mechanism gap, not a typo
Builds on: unknown
`docs/testing/standards.md` still teaches
`e2e/scenarios/` and `waitForSceneStable`, both deleted in #388. The TDD template that *mirrors*
it was caught because it is a `.ts` file; the prescriptive document was not, because
`docPathExists.logic.mjs:24-29` scopes the check to five named files. The check that exists to
prevent drift misses the file class most likely to contain it. The issue asks for `docs/**`
coverage with a **shrink-only baseline using the repo's existing mechanism**, and draws the line
at history: `docs/research/**` and `docs/harness/sessions/**` are records of what was true on a
date, so a dated record naming a deleted path is correct, not drift. Cost if wrong: a baseline of
pre-existing violations to absorb.

## R352 — The run continues at 64%, because 70% is the stop condition the owner set
Builds on: unknown
The
foundation milestone landing (ADR accepted, backlog swept, Phase N filed) is a natural place to
stop, which is exactly why it is worth naming that it is not the *stated* one. Six points remain
and the queue still holds real work. Dispatched the three that unblock the most: #363 (blocks
#372, #377, #378), #181 (blocks #377) and #364 (document data loss). Cost if wrong: the run ends
a point or two over, on a weekly budget that resets Friday.

## R353 — #394 filed: the coordinator's own error class, with no mechanism
Builds on: unknown
Four times today I
wrote a measured fact into an issue, a brief or a review comment from prose rather than from the
artefact — `fast-check` on #355, the layer-ratchet premise on #332, the threshold on #389, and
four errors in the session-record brief (eleven merges not ten, #367 attributed to the spikes,
#361 omitted, an impossible split repeated from a PR body). Each was caught by a builder, a
verifier or the record agent, which is the system working — but the ledger's rule is that a
second occurrence becomes a mechanism, and this is the fourth with none. The issue asks the real
question rather than apologising: **can a claim in an issue body be checked the way a claim in
code is, and what does it cost to try?** It names the most mechanical target (a dependency or
version asserted in issue text that is absent from the manifest) and accepts an argued "no
mechanism is possible" as an outcome. Cost if wrong: a check nobody needed; the alternative is a
discipline that has now failed four times in one day.

## R354 — #364's fix shares the feed-wire rule rather than duplicating it, and that is the right
Builds on: unknown
call.** The builder exported `findJunctionFeedWire` from `src/simulation/topologicalEval.ts` and
imported it into `signalActions.ts` — one definition, no drift. It checked the layer ratchet
rather than assuming: 34 known / 0 new, because the forbidden directions are `engine→state`,
`engine→ui`, `state→ui`, `state→3D`, `src→e2e` and cycles, so `state→engine` is allowed and
`simulationActions.ts` already imports that module. The verifier is asked to confirm that from
`.dependency-cruiser.cjs` itself **and** to answer the question the ratchet cannot: whether the
evaluator is the right *home* for a rule about document structure. Cost if wrong: a shared
function lives one module away from where it belongs, which is cheaper than two copies drifting.

## R355 — The bug was worse than filed: it lost two wires, not one
Builds on: unknown
`removeJunction` kept `b1`
and deleted both `trunk'` **and** `b2`. #364 was filed off the #365 verifier's reading of the
line; the builder measured it. The verifier is asked to confirm the count, because it changes how
bad the defect was and the record should be right.

## R356 — #395 filed by the builder: a second document-mutating reader, same class
Builds on: unknown
`junctionUtils.ts:44` `computeJunctionRelocations` reads `wireIds[0]` and, when that wire has no
corners, pushes the junction into `removals` — so `removeJunction` then deletes it and its
branches. Reachable the same way. Correctly filed rather than folded in: #364 was reopened
**scoped to one line** precisely so it would not sprawl, and a second call site deserves its own
red test. The verifier is asked whether that separation is honest or an evasion. Cost if wrong:
one more small PR.

## R357 — #363's builder derived the case the issue lacked, and it is the one that matters
Builds on: unknown
The
issue's `F2` and its comment's chain are **single-bit** only. The builder built a bus joiner with
wide ranges and slices on *both* sides — which it identifies as **ADR-0020 §1.2's importer
shape** — and measured it as a spurious cycle in all 24 orderings before, `out=0xa5` in all 24
after. If that identification holds, the fix was validated against the thing that will actually
consume it (#377, the legacy importer), not just against the reported symptom. The verifier is
asked to check the claim against the ADR. Cost if wrong: the fix is still correct for the
reported cases; the extra confidence is what would be lost.

## R358 — #396 BLOCKED and sent back; the finding reaches beyond it
Builds on: unknown
`findJunctionFeedWire`
(added by #365) is structural **only for a branch whose `from` is the junction**, and no store
action writes that shape — `completeJunctionWiring` copies the trunk's source into every branch.
For app-written documents the rule degenerates to "first listed wire in `state.wires` order",
i.e. exactly what `wireIds[0]` already was. The verifier measured it: same reproduction with
gesture-shaped branches gives survivors `[branch1]` at `main` **and** at the PR head. **The data
loss is still there for real documents**, and B-009's new "Fixed / measured end to end through
the real actions" is false in the repo right now. Sent back with two honest outcomes — find a
rule that works for the shape the app writes (possibly a stored `trunkWireId`, a data-model
change), or scope the PR to imported documents, correct B-009, and file the reachable case. Told
plainly that B is not a failure but the accurate version of the same work. Cost if wrong: one
more round on a bug that destroys user data, which is the right thing to spend a round on.

## R359 — The same class of overstatement has now happened three times in one day, all on the same
Builds on: unknown
bug family.** #365's PR claimed a repro through real store actions that its verifier could not
reproduce (corrected before merge). #396's B-009 entry claimed an end-to-end fix that its
verifier measured as no change. And #395's suggested fix would have inherited the hole silently.
The common cause is **a test whose setup no store action can produce, read as evidence about the
app**. Commented on #365 and #395 so the next reader of either has the finding. This belongs in
the session record's lessons: a fixture built by hand is testing the importer's world, not the
app's, and the test must say which. Cost if wrong: none — the correction stands on measurement.

## R360 — #181 closed the audit's 7-file cycle, measured: ratchet 34 → 29
Builds on: unknown
Production edges
16→14, cycle edges 10→7, `engine-no-state` 11→9, `no-circular` 10→7, 0 new. The builder
**checked the baseline file rather than inferring** — the discipline I failed at on #332 — and
named the five removed rows exactly. This is the first structural improvement to the foundation
audit's own headline numbers. Cost if wrong: the verifier re-derives it from a fresh cruise,
which is what it is asked to do.

## R361 — The issue's verification command never tested what it claimed, and the builder proved
Builds on: unknown
it.** `node -e "import('./src/core/serialization/index.ts')"` fails **identically on
`origin/main`** with `ERR_MODULE_NOT_FOUND`: Node resolves neither the repo's extensionless
relative imports nor the `@/` alias. So the command that was supposed to demonstrate "no store
coupling" would have passed or failed for reasons unrelated to the coupling. Filed as **#401**.
This is a *fifth* instance of my own error class (#394) — a criterion written from plausibility
rather than from running it — and the first one that was in the issue seed rather than in
something I wrote today. The verifier is asked whether the substitute (mocked store modules plus
a source scan) really proves absence of a runtime import, or only that the mocks were not hit.
Cost if wrong: the property is asserted by a weaker test than it appears.

## R362 — Removing the long cycle exposed a pre-existing inner one, fixed in-PR with a 10-line
Builds on: unknown
module.** `autosave.ts → persistenceActions.ts` became visible as a *new* ratchet violation only
once the outer cycle went. The builder added `storageKeys.ts` to break it. The verifier is asked
to confirm it was pre-existing and that 10 lines is the minimal fix — a small module added to
satisfy a ratchet is either exactly right or a symptom, and the difference matters. Cost if
wrong: a file exists that should have been a different change.

## R363 — #398 merged on the strongest verification of the run
Builds on: unknown
The verifier did not sample the
fix's behaviour, it **differentially tested it**: 20,000 generated chips compared against an
independently built bit-level graph — accepted 13,827, cycle-rejects 1,948, **MISSED-CYCLES=0,
OVERSTRICT=0, REORDER-REJECT=0, REORDER-WRONG=0**. That is the right instrument for a change
that *removes* dependency edges, where the dangerous failure is a real cycle going undetected and
no amount of hand-written cases can bound it. It also ran the builder's F2 oracle 120 orderings
deep after noticing `out=0` is a weak discriminator, and proved #362's property tests untouched
by hash-matching the first 634 lines of the test file. Cost if wrong: none — this is the closest
the run came to proof rather than evidence.

## R364 — The importer-shape claim holds in substance, with one attribution corrected
Builds on: unknown
ADR-0020
§1.2 does dissolve joiners by rewriting producers to write the slice (C5, C10), and §10 names
#363 as breaking "every dissolved joiner (1.2)" — so the fix was validated against the construct
that will consume it. But the **part-pin-slice half** of the builder's derived case comes from
§10/#357 (C9/C11), not §1.2 itself. The builder over-attributed; the verifier caught it and filed
it as a nit rather than a blocker, correctly. Cost if wrong: a sentence in a PR body credits the
wrong ADR section.

## R365 — #397 confirmed pre-existing and correctly out of scope
Builds on: unknown
`And(a=w, b=a, out=w)`
compiles and yields `out=1` at the merge base, identical at head; `compiler.ts:322`'s self-skip is
untouched and the diff only adds `|| !overlaps(...)` beside it. It is an **under**-approximation
while #363 was an over-approximation — the opposite defect in the same code, which is exactly why
it was tempting to fold in and right not to. Cost if wrong: a stale-value read stays until #397
lands; it has been there all along.

## R366 — #396 took Option B, and proved Option A unavailable rather than declaring it
Builds on: unknown
Trunk
and branch share one `from` (`wiringActions.ts:859`), and a branch's segments are the trunk's
prefix plus its tail, so it passes *through* the junction identically — no endpoint and no
geometric discriminator exists. `junction.trunkWireId` is the only honest signal, `removeWire`
invalidates it in exactly the repro, and in every other gesture case it agrees with the rule
already there — so it would buy no outcome change while adding a persisted field and a migration
to a model ADR-0020 §6/§7.5b deletes. **An impossibility argument with a measurement behind it is
worth more than a fix**, because the next person will otherwise try the same thing. Cost if
wrong: a discriminator exists and the PR settled for less — which is exactly what the resumed
verifier is asked to check first.

## R367 — The defect was reframed, and the reframing is the most useful output of the round
Builds on: unknown
In
gesture documents **every listed wire is complete**, so `removeJunction` loses valid wires
*whichever* one it keeps. That makes it a **contract change**, not a trunk-picking fix — the
operation as specified destroys data regardless of which wire it selects. #403 carries it with
three options and acceptance criteria. Cost if wrong: #403 is scoped around the wrong question,
which the verifier is asked to judge.

## R368 — B-009 moved back out of Resolved to "Partly fixed", and the claim is now reproducible
Builds on: unknown
rather than asserted.** Separate *Fixed for* / *NOT fixed for* rows, the measurement,
reachability (`applyJunctionRelocations` ← gate/node drag, no UI caller), correction dated and
owned — plus **two characterization tests pinning the gesture shape in-repo**. That is the right
answer to R359's pattern: the fix for "a claim the next reader cannot reproduce" is a test, not
better prose. The verifier is asked to confirm the characterization test genuinely fails if the
limit is fixed; one that passes either way pins nothing.

## R369 — Declining my rule-move nit was right, and it came with numbers
Builds on: unknown
Both alternative homes
— `src/core/document/junctions.ts → src/store/types.ts` and `topologicalEval.ts →
src/store/documentJunctions.ts` — give **1 new `engine-no-state` violation** under
`pnpm run lint:layers`. The current home is the only zero-new one; the real fix is moving document
types below both layers, which is #318's work. **A builder that measures my suggestion and
declines it with the number is doing the job right**, and this is the second time today
(the first was `fast-check` on #355). Cost if wrong: the rule sits one module from where it
belongs until the type move.

## R370 — Resumed the original verifier rather than dispatching a fresh one
Builds on: unknown
It raised the
finding, so it is the right reviewer for whether the finding was addressed, and resuming costs a
fraction of a fresh context re-deriving the whole thing. The fresh-context rule exists so a
verifier has not seen the builder's reasoning — it does not require a *new* verifier for a
re-check of its own blocker. Cost if wrong: a verifier anchored on its first reading; mitigated
because its first reading was the correct one.

## R371 — #399 BLOCKED on a fourth path the PR did not enumerate; I ruled restore-the-warning over
Builds on: unknown
fail-loud.** `deserialize.ts:228-229` replaced main's `try/catch` with a `null` return covering
only the unknown-chip case, so `cloneVec3(s.position)` now escapes the reader. Measured: a gate
missing `position` beside a good `And` gives `ok=true, 1 gate, warning` at main and
**`ok=false, 0 gates, error`** at head — reachable from `importCircuitJSON` with any user file.
The verifier stated the fair counter-argument (fail-loud beats a misdiagnosed silent drop) and
left the decision open. **Ruled: restore.** A person importing a file with one malformed gate
should not lose the whole circuit, and #181's own criterion was that user-visible behaviour is
unchanged — this PR moves *where* warnings are produced, not *what* a user gets. The builder is
told it may argue back with evidence rather than silently comply. Cost if wrong: a malformed
entry is dropped with a warning instead of refusing the file, which is recoverable and visible.

## R372 — "Enumerate the paths" is the actual lesson, not "fix this path"
Builds on: unknown
The PR listed three
user-visible paths and the verifier found a fourth by reading the code rather than the list. The
fix brief asks for **every** way a single entry can fail, and for the PR to say which produce a
per-entry warning and which are fatal to the document, and where the line is drawn. A
behaviour-preservation claim is only as good as the enumeration behind it. Cost if wrong: a fifth
path exists; the enumeration makes it findable rather than invisible.

## R373 — The headless test is weaker than it looks, and #401 now says so
Builds on: unknown
The `vi.mock`
tripwire catches a **direct** store import but a **transitive** one passes: the verifier made
`src/core/buses/busPins.ts` import `@/store/actions/junctionUtils` and `deserialize.test.ts`
stayed green at 6 passed while `lint:layers` reported `1 new engine-no-state`. The regex scan also
misses `import 'x'`, `export … from` and dynamic `import()`, and is non-transitive. **The ratchet
is the load-bearing proof of no-store-coupling; the Vitest file uniquely proves headless
*execution*.** Both are needed and neither substitutes for the other. Cost if wrong: someone
trusts the mock test alone and a transitive coupling returns — which is exactly what #336's
builder was separately briefed to demonstrate against.

## R374 — #396 merged after a PASS on re-review; I fixed an overstated comment first rather than
Builds on: unknown
filing it.** The import-site comment claimed "there is nowhere to put it that the layer ratchet
allows". The verifier measured `src/utils/junctionTopology.ts` at **0 new**, and noted
`src/utils/wireSharing.ts` already imports `Wire`/`JunctionNode` and holds "wires passing through
a junction". Declining the move stays right — `src/utils` is **unclassified** by the ratchet, not
blessed — but unclassified and disallowed are different claims and only one was measured. The
comment now states exactly what was tested. Also corrected B-009's reachability row, which missed
`busActions.ts:268` (bus-component recalculation), so `removeJunction` has **three** entry points,
not two. Cost if wrong: a rebase and one CI cycle — cheaper than leaving a false claim in the
code on the same day I have been enforcing that rule against everyone else.

## R375 — The characterization test was proved to bite, by mutation
Builds on: unknown
The verifier changed
`removeJunction` to #403's own option 2 and the test failed (`expected [Array(3)] to deeply equal
['wire-…']`), along with five others. It noted honestly that the *red-first process* is
unverifiable after the fact, but the property that matters — the test cannot pass either way — is
verified directly. That is the right standard for a characterization test, and it is the answer
to R359's pattern. Cost if wrong: none; this is proof, not inference.

## R376 — Three measurements folded into #403 that change what it must decide
Builds on: unknown
(a) A naive
option 2 also deletes a feed wire whose `to` **is** the junction — survivors `[]` on the
junction-endpoint test — so option 2 needs a stated endpoint policy or it trades a
gesture-document bug for an imported-document one. (b) #396's "undisturbed fan-out must not
regress" test does not survive option 2 either, so it pins the current *contract* rather than an
invariant and must be named in #403's acceptance. (c) Reachability is three entry points.
Cost if wrong: #403 is decided against an incomplete picture, which is exactly what these three
prevent.

## R377 — My state file said the ratchet was 34 → 29 on `main`. It is not, and #336's builder
Builds on: unknown
caught it.** #399's verifier re-derived 34 → 29 from fresh cruises **at both ends of PR #399** —
which is still **blocked and unmerged**. So the reduction lives on a branch; `origin/main` is at
34. I wrote "the audit's headline number moved for the first time" about a PR that had not
landed. **Sixth instance of my own error class (#394)**, and the first where the artefact I
should have read was the one I had just been told about. The builder read
`.dependency-cruiser-known-violations.json` rather than trusting my brief, which is the third time
today a builder has corrected me by reading. Cost if wrong: the metric's history is misrecorded,
which matters because it is the plan's one tracked number.

## R378 — 34 → 77 is a new rule being armed, not a regression, and the reporting needs to say so
Builds on: unknown
`core-through-index` records today's 43 existing deep imports as known so new ones fail. The
mechanism is right, but the printed metric is a **single total with no per-rule breakdown**, so a
jump from 34 to 77 on a rule addition will be read as things getting worse. The verifier is asked
to recommend a restatement rather than block on it. Cost if wrong: the one tracked metric becomes
uninterpretable at exactly the moment more rules are added — which the plan intends.

## R379 — The `--baseline` full run is the ratchet's one widening path, and it is the thing to
Builds on: unknown
check.** Arming a new rule needs a full baseline write, which `shrink-only` by definition cannot
do; the builder scoped that command to the rule-adding commit and named it in the config header.
That is the right shape, but a documented escape hatch is only as good as its fence — the
verifier is asked to judge whether it can be reached casually. Cost if wrong: the ratchet can be
reset by anyone who reads the header, and the guard silently stops guarding.

## R380 — #399's builder found an error in its own enumeration and filed it rather than fixing
Builds on: unknown
it.** It had claimed a no-`id` entry always warns; re-measured, a no-`id` but otherwise valid gate
**loads** as `id: undefined`, identically on `main`. It hardened only what the PR owns —
`DeserializeWarning`'s declared `gateId: string` now reports `"(unidentified)"` instead of
`undefined`, with no toast text change — and filed the behaviour change as **#405**. That is the
discipline the whole run has been circling: the temptation is to quietly correct a thing you
noticed while you were in there, and the cost is a PR whose diff no longer matches its claim.
Cost if wrong: `"(unidentified)"` is itself a small behaviour change inside the PR's ownership —
which is exactly what the resumed verifier is asked to judge.

## R381 — "Enumerate the paths" produced a checkable artefact, not a longer list
Builds on: unknown
The builder
enumerated ten (5 per-entry, 5 fatal) **and** claimed the fatal regions are byte-identical to
`main`, with `git diff` touching only the `createBusPins` import path and one re-indent — so the
`main` column is true by construction rather than by inspection. That is the difference between
an enumeration and an argument. The verifier is asked to check that diff claim first, because it
is what makes the rest trustworthy, and to hunt an eleventh path — an enumeration is only worth
what an attempt to break it says. Cost if wrong: the diff claim is overstated and the `main`
column is inspection after all, which downgrades but does not invalidate the work.

## R382 — Resumed #399's verifier as well (second time this pattern)
Builds on: unknown
It found the fourth path,
so it is the right judge of whether the enumeration is now complete, and its probe harness
already exists. Same reasoning as R370: the fresh-context rule exists so a verifier has not seen
the builder's reasoning — it does not demand a *new* verifier for a re-check of its own blocker.
Cost if wrong: anchoring on its first reading; mitigated because that reading found a real
defect nobody else had.

## R383 — #404 merged, and the verifier corrected my own framing again
Builds on: unknown
I said the printed
metric was "a single total with no per-rule breakdown" (R378). It **does** carry `by rule: …`
(`layer-ratchet.logic.mjs:101-104`), so my premise was half wrong. The real staleness is
`docs/harness/README.md:27`, which still states the tracked metric as "16 production edges · 8
test-only · 10 cycle edges in 3 cycles · 35 engine globals" — now 42 / 25 / 10 / 8 after #404 and
#388. **Seventh instance of my error class**, and this one I could have checked by running the
command I was reasoning about. Cost if wrong: a recommendation aimed at the wrong file.

## R384 — #406 filed: the ratchet can be reset by a documented command and nothing detects it
Builds on: unknown
Measured, not inferred: with one new violation `lint:layers` exits 1, then `depcruise --baseline`
exits 0, the baseline becomes 78 rows, the edge is absorbed, lint is green. There is no check on
baseline *growth*, no CODEOWNERS, and `.gitattributes` marks the 737-line file
`linguist-generated` so **nobody line-reviews it in a PR**. The only fence is prose. The full
`--baseline` cannot simply be removed — arming a new rule requires it — so the fix is to make
growth legal **only when the rule-name set changed in the same commit**. This is the guard the
whole refactor leans on; a guard that can be reset without detection is a guard until someone is
in a hurry. Cost if wrong: one more check to maintain, against the plan's one tracked metric
being silently resettable.

## R385 — Three escapes from the headless test, all contrived, none worth blocking
Builds on: unknown
A dynamic
`import()` whose specifier is a template literal or a built-up variable (dependency-cruiser
cannot see these either); `(globalThis as …)['document']`; and `const { document: d } =
globalThis`. The verifier checked the other guards too: ESLint exits 0 on the mutated file
(`no-restricted-globals` sees a property, not a global) and the ratchet reports `0 new` — so
these slip all three layers. The boundary is "no obfuscation", not sandboxing, and that is the
right boundary for a guard whose job is catching accidents. **Caught:** literal dynamic import,
side-effect import, `export … from`, a re-export chain through a module index,
`globalThis.document.title`, `window['document']`, a type-only package import, the `@store/`
alias, and `node:fs`. Cost if wrong: a deliberate obfuscation reaches the engine — which the
ratchet's import rules would still catch for a real module, just not for a global.

## R386 — #399 blocked a second time, on a regression the *fix* introduced, and I had flagged the
Builds on: unknown
exact risk and let it through.** R380 said: *"`(unidentified)` is itself a small behaviour change
inside the PR's ownership — which is exactly what the resumed verifier is asked to judge."* It
was. The stand-in changed the **pruning key**, not only the warning field:
`deserialize.ts:295` guards on `gateId !== UNIDENTIFIED_GATE` and `gateIdOf` demands a
**string** id, so a gate with a JSON **number** id that lands in the catch is never recorded as
skipped and its wire survives dangling. Measured: `{id: 7, no position}` + a good gate + a wire
to id 7 → **main prunes (0 wires), head does not (1 wire)**. That dangling state is what PR #107
added pruning to prevent. The PR body called the path "unchanged, and covered by a test" — the
test uses string ids only. **The lesson is not "the verifier caught it" but that I named the risk
and still let it pass on the author's assurance.** Cost if wrong: a dangling wire drives 0 into
downstream inputs on any imported document with numeric ids.

## R387 — The verifier's ownership split is the right one and worth keeping as a rule
Builds on: unknown
The
*warning field* is this PR's to define — it introduces the `gateId: string` contract, so
`undefined` there is a defect it would be creating, and no message template interpolates the id,
so no toast text changes. The *pruning key* is a different concern that never needed the stand-in,
and the guard was not load-bearing (`Set<string>` swallowed `undefined` on main for years).
**"Does this PR own this concern?" is a sharper question than "is this change small?"** Cost if
wrong: none — the split is measured on both sides.

## R388 — The enumeration has a third column: accepted silently
Builds on: unknown
Per-entry warning and
fatal-to-document were the two the PR named; the verifier measured three shapes identical on both
sides that are neither — non-numeric `position` coords load a gate at `x: 'left'`, `id: 7` loads
with a number in a `string` field, and duplicate ids both load then raise a simulator
"Combinational cycle" before the success toast. Pre-existing, so they go to **#405**, but the
PR's table becomes three columns: a two-column table of a three-column space is a false picture
even when every row in it is right. Cost if wrong: #405 carries scope that could have been three
separate issues.

## R389 — Three rounds on #399, each finding a real defect, is the process working rather than
Builds on: unknown
thrashing.** Round 1: a fourth unenumerated path (a gate missing `position` cost the whole
circuit). Round 2: the fix's own regression. Round 3 is a one-line key change plus prose. Every
round's finding was measured against `main`, not argued. The alternative — merging after round 1
— would have shipped the dangling-wire regression into the importer's foundation. Cost of the
rounds: roughly one builder and one verifier each; cost of skipping them: a silent data defect in
the path #377 depends on.

## R390 — The semantic merge conflict is fixed in #399, not left to ride
Builds on: unknown
#404 armed
`core-through-index`; #399 added `src/core/buses/busPins.ts` imported directly by three files
outside `src/core`. Both green alone, **3 new violations merged**, `gh pr view` reporting
`MERGEABLE` throughout because the conflict is semantic rather than textual. Fixing it costs a
rebase and a re-derivation of the ratchet numbers; leaving it reds `main` and hands the next
person a semantic conflict to diagnose from a red CI. The two reviews' load-bearing claims — the
behaviour enumeration, the pruning key, the byte-identical fatal regions — are about
`deserialize.ts` and do not move when an index re-export is added. The builder was told to **stop
and say so** if the rebase disturbs any of them rather than resolving silently. Cost if wrong: a
third re-derivation of measurements that were already made twice.

## R391 — The builder asked instead of acting, and that was right
Builds on: unknown
It found the conflict, ruled
on it provisionally, stated the cost of being wrong ("one red CI run and a round trip"), named
the fix, and handed the call up. That is the correct shape for a decision whose cost lands
outside the PR — it invalidates two reviews' measurements — and it is the opposite of the
failure mode this run has mostly been correcting. Worth keeping: **a builder may rule on what is
inside its PR; a choice that spends someone else's work goes up.**

## R392 — #407 filed: green alone, red merged, undetected — a class, not an incident
Builds on: unknown
The
foundation plan is about to run many parallel PRs against a **growing** set of ratchet rules, and
every new rule creates this hazard: a PR predating the rule can add code the rule forbids, and
both sides stay green until they meet. The issue deliberately asks the diagnostic question first
— **which required checks evaluate the merge result and which the PR head?** `ci` is
`pull_request` (sees the merge commit); `pr-hygiene` and `browser-qa` are `pull_request_target`
(see the head). If `ci` already covers it, the gap is only that nobody looks until after merge
and the fix is far smaller than a new check. Recorded as the **second occurrence** of the family
*the loop's checks did not see the state that actually ships* — the first was #295, required
checks judged on cancelled runs. Cost if wrong: a check that duplicates what `ci` already does,
which the first acceptance criterion is designed to prevent.

## R393 — The rebase preserved two reviews' findings by proving the base files are the same blob,
Builds on: unknown
not by re-running them.** Every file the measurements rested on — `deserialize.ts`,
`serialization/index.ts`, `serialization.test.ts`, `persistenceActions.ts`, the old
`busPins.ts` — is byte-identical at `f306a50` and `c5d43df`, so every `main` column in the body
still holds without re-probing. **That is the cheap, correct way to carry a measurement across a
rebase**, and it is checkable in seconds rather than re-derived in an hour. Worth keeping as
practice: when a rebase threatens a prior measurement, compare the blobs the measurement depended
on before assuming it must be redone. Cost if wrong: the claim is false and two reviews need
re-deriving — which is exactly what the resumed verifier is asked to check first.

## R394 — `createBusPins` went to `@/simulation`, argued from what the function is
Builds on: unknown
Not from
which move was fewer lines: it is a bus operation; `src/core/index.ts`'s own header already says
"bus operations live in `@/simulation`"; `busOps`/`busLogic` are already there; and
`core/hdl/compiler.ts` on `main` already imports `@/simulation/busOps`, so the edge direction is
established rather than invented. The ratchet agrees — head 72 against base 77, the same −5 rows,
`core-through-index` 43 on both sides — and the trial merge is green. Cost if wrong: a function
sits in the wrong module, visible at the front door where it is cheap to move again.

## R395 — Four rounds on #399, and the count is not the story
Builds on: unknown
Round 1 found an unenumerated
path that cost a whole circuit; round 2 found a regression the round-1 fix introduced; round 3
fixed the pruning key; round 4 fixed a cross-PR conflict that would have redded `main`. Every
round was triggered by a **measurement against `main`**, never by an opinion. Two of the four
findings were defects the PR itself created while fixing something else — which is the argument
for re-verifying a fix rather than trusting that a blocker was addressed. Cost of four rounds:
about four builder-verifier pairs. Cost of stopping at round 1: a dangling-wire defect in the
path #377's importer is built on, plus a red `main`.

## R396 — #399 PASSED and merged after four rounds. The verifier said the enumeration is complete,
Builds on: unknown
plainly, which is as valuable as a block.** It probed ~30 documents across three rounds, added
nine id shapes in the third, and every one landed in the column the body predicts. It also
probed the new predicate's edges and found the builder got them right: `id: 0`, `id: ''` and
`id: false` all prune under `rawId !== undefined && rawId !== null`, where a truthiness check
would have silently dropped `0` and `''` — both legal JSON ids. And **deleting the
`UNIDENTIFIED_GATE` guard beat hardening it**: a gate genuinely named `"(unidentified)"` now
prunes normally, closing its own round-2 nit with one fewer branch rather than a Symbol.
Cost if wrong: none — it is the fourth independent pass over the same code.

## R397 — One nit folded into #405 that reads like a regression and is not
Builds on: unknown
A gate whose `id` is
`null` or absent **and** which fails is still not recorded as skipped, so a wire with
`entityId: null` survives where `main` dropped it (0 vs 1). But `main` only "worked" by
`undefined` matching `undefined` in the `Set` — meaning **two id-less gates would collapse to one
key**. So it is the same id-less-gate hole #405 already owns, seen from the pruning side, not a
thing to revert. Cost if wrong: #405 carries one more criterion than it was filed with.

## R398 — #342 dispatched with "verify the premise first, and close the issue if it has moved."
Builds on: unknown
Assumes: P-001
It was written on 2026-09-21 from a research note; several issues today have had stated facts
that no longer held. The builder checks four things live — R3F's peer range, npm's `react`
`latest`, the lockfile and the manifest — and if the range has widened, **closing #342 with that
evidence is the correct outcome rather than pinning anything**. This is #394's discipline applied
before work starts rather than after a builder trips on it. Cost if wrong: a few minutes of
checking against a pin nobody needed.

## R399 — #342 closed, not built: its premise expired 36 hours after it was filed, and the builder
Builds on: R398
checked before acting.** Upstream moved on 2026-09-22 — pmndrs/react-three-fiber#3916 merged at
17:05Z, #3915 closed, v9.8.0 shipped at 19:46Z with "R3F is now compatible with React 19.3.0" —
so `peerDependencies.react` is now `>=19 <19.4`. The issue's **own lift condition** (`npm view
@react-three/fiber peerDependencies.react` includes 19.3) was already satisfied before the PR
would have opened, so pinning would have merged a guard whose documented removal condition was
met, then held HACER back from a release upstream supports. This is the instruction working:
**"verify the premise first, and close the issue if it has moved"** is now worth more than the
work it replaced.

## R400 — The real risk is bump *ordering*, not a version hold, and it survives the premise
Builds on: R399
expiring.** The lockfile still resolves R3F **9.5.0** (peer `>=19 <19.3`) while `react@latest` is
**19.3.0**, and `.github/dependabot.yml` has **no `groups:`** — so the weekly run opens react,
react-dom and @react-three/fiber as three PRs. Merge the React pair first and the repo lands
exactly the unsupported combination; `strict-peer-dependencies` is unset (pnpm 10 defaults
`false`), so it is a warning and lint/test/build stay green; no agent renders 3D, so it surfaces
first in a user's browser. Filed by the builder as **#408** and dispatched. Cost if wrong: one
`groups:` entry that was not needed.

## R401 — The builder filed #408 beyond a literal "stop", and that was right
Builds on: unknown
My instruction was
to stop if the premise had moved. It stopped building, then filed the residual it had measured
rather than discarding it, and flagged the deviation as cheap to reverse. **Stopping work is not
the same as discarding a finding** — the instruction was about not pinning a version, not about
going quiet. Worth keeping: an agent told to stop should still hand over what it learned.

## R402 — The ledger row is owed and goes with #408's PR
Builds on: unknown
Fourth occurrence today of the class
the session record's §7 already names — a criterion asserted from prose or a research note rather
than re-checked against the artefact — and it exposes a specific gap: **nothing in the loop
re-checks an issue's premise at dispatch time.** #394 owns the class; the row points there. The
builder was right that it needs a PR and right not to open one just for a row. Cost if wrong: the
row lands a few hours later than the finding.

## R403 — The criterion I carried forward from #342 was built on a false premise, and the builder
Builds on: unknown
disproved it rather than half-building it.** "Surface `pnpm install --frozen-lockfile`'s peer
warnings in CI" cannot work: `--frozen-lockfile` emits **no peer warning at all**, even with a
real mismatch already in the lockfile ("Lockfile is up to date, resolution step is skipped", exit
0), because peer checking is a **resolution-step** concern and CI never resolves. Measured
against a real `fiber@9.5.0 + react@19.3.0` tree, where a *resolving* install does warn. The only
routes left are a from-scratch re-resolve (~22 s, and it validates a graph the lockfile does not
pin) or a hand-written lockfile walker — neither cheap-and-correct. **The escape clause I wrote
in ("if it is not cheap, say why and do not build it") is what made the honest answer
available.** Cost if wrong: a gap stays documented rather than papered over with a check that
passes for the wrong reason.

## R404 — `strict-peer-dependencies` declined, and the usual objection turned out false
Builds on: unknown
A full
fresh resolution with it on **exits 0** — this tree has zero peer issues — so "it would break
every loose peer" is not true here. It was declined for a better reason: it is **inert where it
matters** (CI's `--frozen-lockfile` skips resolution, exit 0 against a mismatched lockfile) and
would fire only in Dependabot's own lockfile generation, converting a visible bad PR into a
failed update job with **no PR and no notification**. That last step is reasoned rather than
measured, and the verifier is asked to judge it. The builder also flagged that the clean-tree
result **expires**. Cost if wrong: a setting that would have caught the case at resolve time
stays off.

## R405 — #409 is the first PR tiered under #351's new rule
Builds on: R400
`risk:0`, no `src/` code, 23
reviewable lines → **Sonnet**, with a `Verified on:` line required of the verdict. Both halves of
today's tiering change are now live and exercised: the tier itself, and the attribution that made
the evidence for it auditable. Cost if wrong: one overturned Sonnet verdict, which is the
documented trip-wire that moves the rule back.

## R406 — Two disclosed limitations left as in-PR notes, and the verifier is asked whether that is
Builds on: unknown
right.** (a) Grouping fixes the *ordering* hazard but not the *no-upstream-release-yet* one: if
React ships a minor R3F's range excludes and there is no R3F release that week, the group PR
contains React alone and the mismatch still lands — which is precisely what the declined CI check
would have covered. (b) No test pins the group, because `scripts/` has no check over `.github/`
config. The builder judged both as notes rather than issues and said so; I would rather a
verifier ruled on that than accept it by default. Cost if wrong: a real residual lives in a PR
body where nobody will find it.

## R407 — #409's Sonnet verifier did more than the builder on two checks, which is the evidence
Builds on: unknown
#351's tier change needed.** The builder grepped `three:` peers on the **3 direct packages**; the
verifier grepped **all 24 declarations across the full lockfile** and found zero upper bounds
anywhere — a stronger basis for excluding `three` than the PR had. It confirmed security updates
disabled by hitting the API rather than quoting the builder. It **reproduced the no-peer-warning
result independently**, building its own mismatched tree (react 19.3.0 × fiber 9.5.0) rather than
trusting the PR text. And it ran `strict-peer-dependencies` against the real **906-package**
tree — stronger than the check the PR itself ran. This is the second Sonnet verdict since the
tier changed and the first under the new rule; both were evidence-grade. Cost if wrong: the
documented trip-wire is one overturned Sonnet verdict.

## R408 — A number in the ledger is wrong and I will correct it
Builds on: unknown
The row says #342's premise
"expired **36 hours** after the issue was written". Measured: #342 created 2026-09-21T12:46:27Z,
R3F 9.8.0 published 2026-09-22T19:43:58Z — **~31 hours**. I wrote "36" into the dispatch brief
from memory and the builder carried it into the ledger. **Eighth instance of my own error class
(#394), and the most ironic: it is in the ledger row about that very class.** Correcting it in
the wrap-up PR rather than leaving it, for the same reason I have enforced all day — a false
number in the repo is worse than none, and this one sits in the record of not doing that. Cost if
wrong: a one-word docs change.
