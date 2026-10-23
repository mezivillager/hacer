# Rulings — 2026-10-22 hacer-loop-to-97

The coordinator loop run of 2026-10-22 from 21:16Z, the third loop run of the day. Owner's hand-over: "run
the loop until usage reaches 97%". Weekly usage was 89% at the start (21:15Z); the meter resets on
2026-10-23T03:00Z. Publishing `on-green` under the standing grant. The run judged JDG-005 to JDG-008 of
the judge queue, built and merged #907 (`sev:critical`), #977 and #801, and kept the retro that was due.
It started no new chain once the meter read 93% and nothing more could start, and the session paused at
22:29Z. On resuming on 2026-10-23 the owner gave two directions, which are R903 to R905.

## R896 — the run stops at weekly 97% or the 2026-10-23T03:00Z reset, whichever comes first; no new chain at 94% or above; the records start at 95%
Builds on: R890
Coordinator, 2026-10-22T21:16Z; the owner: "run the loop until usage reaches 97%". The meter read 89% at
21:15:02Z (status line capture, R891), with the reset 5 h 45 min away. The margins copy R890's. At 97% the
account sits 3 points from its hard limit, where a turn fails; the records must land before then, hence
95%.
Cost if wrong: the run stops a little short of the owner's line.

## R897 — the sev:critical build #907 takes a slot beside the judge queue instead of waiting for all six judge reviews
Builds on: R889
Coordinator, 2026-10-22T21:16Z. Pick rule 0 puts `judge-review` issues first and rule 1 any open
`sev:critical` bug. With three slots and a due retro, the first two slots go to the retro and a judge
chain. The third goes to #907, the grading defect the judge made `agent-ready` (JDG-001), rather than a
second judge chain. None of JDG-005..010 gates #907, and a judge chain is two serial steps that fill one
slot at a time anyway.
Cost if wrong: the last judge decisions land about one chain later.

## R898 — #801 moves to the bugs row, pulled forward with `project:foundation`, as a bounded exception to ADR-0020 §7
Builds on: R850
Amends: R850
Judge, 2026-10-22, decision JDG-005 on #971 (issuecomment-6351965527); recorded by the coordinator; amends
R850's slot sentence. #801 (`sev:high`) is the autosave that is written but never read back on boot. It
loses `project:polish` and gains `project:bugs` and `project:foundation`, and its parent moves to #145.
`sev:high` stands. R850 expected it to take "its normal slot", but under polish that slot exists only on
request, so R850's premise never held. The fix is limited to the legacy boot read through
`deserializeCircuit`, with no refactor of legacy persistence or serialization. It is an exception to
ADR-0020 §7's "legacy code gets no new work" and foundation working rule 1 for #801 alone. It is deleted
with `serialize.ts` at ADR-0020 §7.5d, and N.7 (#382) still owns row 16.
Cost if wrong: one fix lands in legacy code the plan removes; it repairs a shipped capability that loses
users' circuits today.

## R899 — PR #987 (#907) merges without a separate fidelity review
Builds on: R854
Amends: R854
Coordinator, 2026-10-22T21:50Z; amends R854 for #987, as R886 and R887 did. It refuses, on the grading
path, a part that reads none of the bits of a name it writes, with the web IDE's `Line N: Looping wire
<name>`. The Opus verifier ran 25 shapes through the web IDE at `91ef428` and again through the
differential harness's build at `52611ad`, which gave identical output, and through HACER at head and
base. 13 shapes changed, and every one now matches the reference's exact sentence and line; none moved
away from it. `compileHDL` is unchanged on all 25, and `test:differential` passes 27 of 27. Every
remaining difference is a refusal on both sides, worded `Cyclic part dependency` where the reference says
`Looping wire` (overlapping or unsliced loops, out of #907's scope).
Cost if wrong: a loop shape outside the 25 grades differently from the reference; the overlap wording is
owed to the next fidelity digest.

## R900 — the free slot builds #801 before JDG-008..010 are judged
Builds on: R897
Coordinator, 2026-10-22T21:52Z; like R897. The meter read 91% at 21:43Z, against R896's no-new-chain line
at 94%. About three judge chains fit, or two plus one build. JDG-008 (#950's blast radius), JDG-009
(recommended defer: no shared temp directory exists) and JDG-010 (a gate rule for #942, which waits on
#941 anyway) gate nothing that is pickable now. #801 loses users' unsaved circuits on every reload, and
JDG-005 has just made it the first build pick. JDG-006 and JDG-007 continue.
Cost if wrong: up to three decisions wait one run; none of them blocks a build today.

## R901 — the queue-up rule's third `risk:2` exception counts a plan the inbox panel or the judge approved
Builds on: R889
Judge, 2026-10-22, decision JDG-007 on #973 (issuecomment-6352286317); recorded by the coordinator; widens
#893's exception 3 under R844 and R889. In both copies of the rule (`.claude/skills/ha-next/SKILL.md`,
`docs/harness/README.md`), condition 1 becomes "a plan approved by the owner, or by the inbox panel or the
judge on his behalf". Condition 2 becomes "links that approval": the owner's own words, or the panel's or
the judge's decision comment on the review issue that approved the plan. ADR-0013 Decision 1 records it and
adds the judge to exception 2. The #833 panel had narrowed the rule to the owner's own approval before R889
existed; R889 now makes the judge's approval the owner's. Built by #992.
Cost if wrong: a `risk:2` slice of a panel- or judge-approved plan becomes `agent-ready` without a judge
review of its own; each still gets an Opus builder, a fresh Opus verifier and, on the engine, a fidelity
review.

## R902 — `differential` becomes a required check on `main`; the ruleset change is the owner's hand
Builds on: R889
Judge, 2026-10-22, decision JDG-006 on #972 (issuecomment-6352371400); recorded by the coordinator; amends
`docs/harness/README.md` "What must be green". Since `74ee3461` (2026-10-22T05:01Z), all 73 CI runs carried
the job and all passed on their first attempt. It averages 32-35 s and runs in parallel with `ci`, which
averages 181 s. A failing check outside the required list only adds a note in `merge-on-green`. #993
(`needs-human`) gives the owner the `gh api` step, the UI path, the check and the undo. #994
(`agent-ready`, blocked by #993) brings `REQUIRED_CONTEXTS`, P-003, a `DIFFERENTIAL:` check line and the
docs in line, so the repository never names a required check the ruleset lacks.
Cost if wrong: a red `differential` blocks merges; a PR can fix a failure inside the job, since
`pull_request` runs the PR's own workflow and harness.

## R903 — supersedes R894: the loop starts only when the owner starts it; no recurring or self-starting routine
Builds on: R889
Amends: R894
Owner, 2026-10-23T09:25Z; overrides the judge's JDG-003 decision under R889, which keeps the owner's
override. The owner: "I want to always start the loop, since I know where usage percentage is at and how
much usage the loop can spend ... I need the usage for other purposes and can't have a loop spending
usage without my knowledge." Every coordinator run is started by the owner with a usage line. #981 (the
weekly cloud routine) is closed as not planned. #980 (the one-off cloud probe) stays open, but it may run
only inside a run the owner started, within that run's usage line, and only for #257's cloud browser QA;
it creates no recurring routine. JDG-003's status records the override.
Cost if wrong: no work happens between owner-started runs, as before R894; the owner controls every
percent of usage the loop spends.

## R904 — browser QA is non-blocking: non-3D QA runs locally, and 3D QA goes to a grok-bot queue that files bugs
Builds on: R889
Owner, 2026-10-23T09:31Z; re-scopes #257 and amends ADR-0016's local-browser rule for non-3D surfaces;
supersedes R903's purpose for #980. The owner: "any non-3d browser qaing can be done locally, using
playwright or claude in chrome, whichever is efficient and less taxing on my machine ... regarding 3d
browser qaing, we can have a queue for grok bot to pickup qaing work (but the qa should be non-blocking,
grok just does the qa in its remote machine and files the bugs it finds, and those go in a follow-up pr)."
So:
- QA never gates a merge, and #257's "merge requires both" criterion is dropped.
- Non-3D QA, of any page that mounts no 3D canvas (Mission Control `/control/`, `docs/public`, a future 2D
  view), runs on the laptop with Playwright or Claude in Chrome, whichever is lighter.
- 3D QA is queued for the grok bot. It runs the flow on its own remote machine and files each bug it finds
  under the bot issue contract, and the fix comes in a follow-up PR.
- #257's 3D run no longer needs a Claude cloud session, so #980 (the cloud probe) is closed as not planned
  and its block on #257 removed.

Cost if wrong: a 3D defect reaches `main` and is caught after the merge; the follow-up PR fixes it, as the
owner chose.

## R905 — supersedes R904 in part: non-3D browser QA blocks a merge when the PR needs it; only 3D QA is non-blocking
Builds on: R904
Amends: R904
Owner, 2026-10-23T09:33Z; corrects R904. The owner: "I said 3d browser qa shouldn't block a merge, non-3d
browser qa however should block a merge if the pr does need it." A PR that changes a page or flow with no
3D canvas, and that needs a browser check, merges only after a local QA verdict (Playwright or Claude in
Chrome, whichever is lighter) passes. 3D QA stays non-blocking: the grok bot runs it from its queue on its
own remote machine, files the bugs it finds, and the fixes come in follow-up PRs. #257 is shaped to that
split.
Cost if wrong: a UI PR waits for a local browser pass that a code verifier alone might have covered.
