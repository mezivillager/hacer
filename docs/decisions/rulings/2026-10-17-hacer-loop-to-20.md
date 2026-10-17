# Rulings — 2026-10-17 hacer-loop-to-20

The coordinator loop run of 2026-10-17 from 17:28Z. Owner's hand-over: "Ok now you can run the loop
until usage reaches 20%". Weekly usage was 13% at the start; the meter resets on 2026-10-23T03:00Z.
Publishing `on-green` under the standing grant. Subagents on Opus and Sonnet, two at a time (R782,
R798). The run also built the inbox panel the owner asked for (#778, R844).

## R843 — the run stops at weekly usage 20%: no new Opus chain from 17%, and the records PR starts at 18%
Builds on: R834, R741
The owner: "Ok now you can run the loop until usage reaches 20%". Weekly usage read 13% between 17:20Z
and 17:28Z, so the run had about 7 points. The last runs used about 3 points an hour with two agents,
and a close costs about one, so starting the close at 18% leaves room to merge it before 20%. As R741
ruled, a reset is not permission to continue.
Cost if wrong: if the owner meant to stop at exactly 20% with nothing in flight, it is the same
moment; if he meant "around 20%", the run stops at most a point early.

## R844 — the inbox panel: the loop picks a review issue per proposal, Opus and Grok review it, and a fresh Opus panel decides for the owner
Builds on: none
Amends: ADR-0018 §4
The owner asked for it in chat: "a reviewer agent does a multi-agent review of opus and grok against
each one and decline or accept based on the review result ... so those don't wait for me/human";
"the reviews would get queued up like any other task and the looper picks them up at a reasonable
pace"; "no such thing as split verdict, the reviewer agent can weigh in and decide which one is more
reasonable and can decide, nothing waits for me". The panel's approval stands in for the owner's. The
three inbox files' headers change with ADR-0018 §4. The shape (#778):
- Each `proposed` entry gets a review issue labelled `inbox-review`, `agent-ready`, `risk:0` and
  `project:upkeep`. `upkeep` is in the aux slot, so a review comes about once in eight picks while
  the other buckets are full, and more often when they are empty. `core` (an enabler, picked only
  while it blocks an open task) and `surfaces` (outside the cycle) would never pick them.
- The review runs on a local-only commit that sets the entry to `approved`, so `multi-review`'s
  question, whether anything should stop the change, is the accept-or-decline question.
  `docs/north-star.md` is the binding spec.
- The coordinator, not the panel agent, launches `run-reviews` in the background, because a subagent
  cannot wait 45 minutes on a background job.
- If a reviewer is unavailable, the task is retried at its next pick; nothing is decided on one model.
- An approved entry is filed `agent-ready` at any risk, because the panel's approval is the owner's.
  Building it still needs the builder, the fresh verifier and, where it applies, the fidelity review.

Cost if wrong: the panel approves a proposal the owner would have declined. He can override any
status, and the build gates still apply. Grok on Cursor counts against Cursor's included usage, and
an Opus verify reviewer costs about one verifier per entry.

## R845 — the first pair is #778 (Opus builder) and a check of #175 against its criteria (Sonnet); #338, #257 and #269 wait
Builds on: R742
`backlog.mjs ready` offered four tasks. #338 is the cloud lane (R742). #257 and #269 each delivered PR
1, and what is left of each needs cloud browser runs at `risk:2`, more than this run's budget. #175's
blockers #357 and #374 are closed and #377 delivered C5 and C11, so it is a check, not a build. #778 is
the owner's own request, so it takes the first build slot.
Cost if wrong: #257 and #269 wait one more run.

## R846 — #184 is `agent-ready` with one added criterion, and takes #175's freed slot
Builds on: R845
With #175 closed, `ready` offered only #338 (cloud lane) and #257 and #269 (waiting, R845), and the
panel's review issues would not exist until #778 merged. #184 is in the foundation bucket at
`risk:1`, and its criteria were clear apart from "no behaviour change". Measured: the three modules
import no React or Three, they have 26 importers, and the store's import from `components/scene` is a
recorded layer violation. The added criterion is that `lint:layers` passes and the baseline entries
the move fixes are removed (issuecomment-6237856536). An Opus builder, and a Sonnet verifier since no
path is under `src/core` or `src/simulation` (L070). Superseded 31 minutes later by R848.
Cost if wrong: a 26-file import move that conflicts with another PR in flight; the only one open was
#514, which touches the lineage scripts.

## R847 — PR #780 takes `size-override` rather than a split
Builds on: R784, R812
It has 468 reviewable lines, over the 400 budget. The builder offered to move 78 doc lines out, but the
doc edits are the policy itself (the panel decides, the owner may override). They have to land with
the script, or the inboxes would say the owner approves while the loop files review tasks. This
follows #700's precedent (R812).
Cost if wrong: the verifier reads about 70 lines more than the budget assumes.

## R848 — #184 goes back on hold and PR #781 closes unmerged (supersedes R846)
Builds on: R845
Amends: R846
The builder pointed at #379. Reading #184's comments then showed the 2026-09-23 backlog sweep's hold:
`agent-ready` stays off until #379 (N.4) lands, "restored by #379, not by a reviewer", because
`src/layout` would pre-empt where `layout` lives. R846 had read the issue body only. The hold is
restated on #184 (issuecomment-6238341578). The work is kept on the branch
`refactor/184-layout-module` at `2e8d21c5`: 33 importers rewritten and 10 baseline rows removed.
Nothing merged.
Cost if wrong: none in code. One Opus builder run (about 158k tokens) is already spent, and the branch
may need re-pointing when #379 names the module.

## R849 — #269 PR 2, the first product review, takes the free slot; R845's reason to wait does not hold for it
Builds on: ADR-0016
Amends: R845
R845 held #269 for "cloud browser runs". PR 2's browser run is `ui-tour.yml`, a `workflow_dispatch`
job on GitHub Actions that had never run, and the review reads its screenshots and snapshots, so
nothing renders on this laptop (ADR-0016). Weekly usage read 14% at 18:15Z, against 13% at the start,
so the budget allowed an Opus product review. #257 still waits: its QA verdict needs a browser driven
against a PR preview.
Cost if wrong: one Opus review, and up to five `polish` issues the owner might not have wanted. He
ruled on 2026-09-19 that UI polish issues are filed without his approval.

## R850 — #801 (autosave never read back) stays `sev:high`, not `sev:critical`
Builds on: none
The product review flagged it "suspected sev:critical", and the coordinator confirmed the defect:
`AUTOSAVE_KEY` is written every 2 s (`autosave.ts:17`) and read outside tests only to keep it out of
the Library list (`persistenceActions.ts:215`), so a reload loses an unsaved circuit. The portfolio's
example of critical is a defect that corrupts evaluation (`docs/portfolio.md:78`). This one loses
unsaved work while saving to the Library still works, so it is high: it takes its normal slot
(`project:polish`, `risk:2`) instead of jumping the queue.
Cost if wrong: a user loses an unsaved circuit on reload for as long as #801 waits. The owner can apply
`sev:critical`, and it is then picked first.

## R851 — an approved fidelity entry is filed in the bucket its work belongs to, not its target epic's `core`; #811 moves to `project:verify`
Builds on: R844
Amends: R844
The FID-008 panel filed #811 under `project:core`, as the panel brief's §3 item 5 said, and pointed
out that `core` is an enabler bucket: such an issue is never picked until it blocks an open task, so
"nothing waits" would not hold for it. A reader-parity corpus is verification work, and `verify` is in
the aux rotation. The brief takes the same fix, a one-line amendment to §3 item 5 in the run's records
PR (`docs/harness/inbox-panel-brief.md`).
Cost if wrong: #811 competes with verify tasks a little earlier than the core plan intended. The epic
link (`--parent 140`) is unchanged.
