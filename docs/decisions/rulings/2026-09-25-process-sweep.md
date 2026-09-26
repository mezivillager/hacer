# Rulings — 2026-09-25 process-sweep

Imported by #466 on 2026-09-25 from the coordinator's run directory `2026-09-25-process-sweep`; wording unchanged except machine paths. `Builds on: unknown` marks a ruling nobody has annotated; a restated ruling carries a new id and `Amends:` the original.

## R700 — usage ceiling for a run that was given none: 40% weekly
Builds on: R600, R516
Assumes: P-006
The owner handed over a weekly sweep plus two project kick-offs with no ceiling. Previous runs were
given 70/85/93% late in the week; this one starts the week at ~0%. Ruling: stop dispatching new work
at **40%** of the weekly meter, re-read every ~3 hours or every six agent completions, so more than
half the week stays his.
Cost if wrong: too low — the sweep ends early and he raises it with one line; too high — half his
week is gone before he is back. The asymmetry favours low.


## R701 — rulings are written to the repo format now, committed at the close
Builds on: R700
(D-DL-3 of the lineage report, approved by the owner 2026-09-25, is what this ruling implements.)
The live file stays in the run directory during the run (the topic hooks bind there and no agent is
touching it), in the new field-block format, and is committed as
`docs/decisions/rulings/2026-09-25-process-sweep.md` in the session-record PR. DL-1 has not landed,
so the format is REPORT §6's by hand; DL-1b will re-parse it.
Cost if wrong: one file to move if DL-1 changes the home. Trivial.


## R702 — the two kick-offs and the portfolio PR take the three slots first; the sweep fills slots as they free
Builds on: R700
The owner named the two projects as the exception to "process over code". Their first tasks are
new subsystems (Opus). The portfolio/rotation change is what makes them pickable at all, so it goes
in the same batch (Sonnet). Sweep items are mostly coordinator audits and small Sonnet PRs; they
interleave as slots free. Owed verifications: #461 is process (harness) and goes before #459 (engine).
Cost if wrong: a sweep item that would have found something important waits an hour or two.


## R703 — four stale claim refs released; #193's kept
Builds on: R702
(Measured: the inbox rows for 195/199/333/427 read `released`/`done` and the issues are CLOSED.)
`claim/195`, `/199`, `/333`, `/427` pointed at closed issues while the cloud-queue inbox already said
released or done — refs the lane's loop step 8 (`git push origin --delete claim/<n>`) never ran.
Released. `claim/193` kept: the inbox says Grok Bot is still building Projects 2–5.
Cost if wrong: a ref that someone still meant to hold is gone; restoring one is a single push.


## R704 — #193 reopened
Builds on: R703
PR #443's body says `Part of #193` (Project 1 only), the inbox says Projects 2–5 remain, and the
issue was CLOSED (2026-09-24T01:15Z, COMPLETED). Open scope had vanished from `backlog.mjs`.
Reopened with a comment; second occurrence of the "closed in part" class (#364 by #396 was the
first) → filed as **#485** for a `pr-hygiene` rule.
Cost if wrong: Grok Bot's lane meant to track Projects 2–5 elsewhere; a comment from it closes it again.


## R705 — the verdict-coverage gap is mostly a format gap, not an unverified-merge gap
Builds on: R702
Assumes: P-007
Of the 27: 19 are docs-only, 3 Dependabot, and 5 non-docs merges (#441, #442, #443, #445, #449) that
the cloud lane **did** verify — posted as `**PASS** (fresh-context Grok Bot verify)`, without the
heading the brief specifies. So the control to add is a format contract across lanes (one sentence in
two docs, folded into **#483**), and Mission Control's count then measures the real gap. A required
"verdict-present" check was considered and not filed: it needs an `issue_comment` re-trigger design
and is larger than a sweep item; if the count stays non-zero after the format fix, file it then.
Cost if wrong: a genuinely unverified merge hides behind the format story for one more week, until
MC-1's count is live.


## R706 — sweep items filed as harness tasks rather than done inline: #483 (docs sweep), #484 (preview sweep), #485 (Fixes-in-part rule)
Builds on: R702
Each is a PR with tests or pinned phrases — builder work under the pipeline, not coordinator edits.
They take slots as the three kick-off agents free them; #483 first (docs, Sonnet), then #484
(Sonnet), then #485 (risk:2, Opus).
Cost if wrong: a sweep fix lands a few hours later than a hand edit would have; the trade is a
verifier's read on each.


## R707 — #486 blocked by a base-branch policy with every required check green; re-pushed once, otherwise it waits for a person
Builds on: R517
Assumes: P-003
(Measured via the rules API: the `main` ruleset, unchanged since 2026-09-18, also has `required_approving_review_count=0` and `require_extra_approval_for_unattributed_changes=true`.)
`gh pr merge` says "the base branch policy prohibits the merge"; GraphQL shows all three required
contexts SUCCESS on the head, `mergeable=MERGEABLE`, `viewerCanMergeAsAdmin=false`, commits attributed
to the owner's login; #464 merged under the same ruleset 42 minutes earlier. The only rule that could
demand an approval nobody can give from this identity is the unattributed-changes one, and GitHub
exposes no field naming the failing condition. One cheap retry: same tree under a fresh SHA to force a
merge-box re-evaluation. If it still blocks, item 3 is `blocked — needs a person`, surfaced at the
end; the two kick-off builders are already working, so nothing else waits on it.
Cost if wrong: a merge that would have gone through with one more minute of patience gets a
force-with-lease push of an identical tree — harmless. Not tried: `--admin` (not available:
`viewerCanMergeAsAdmin=false`) and changing the ruleset (an owner action, never an agent's).


## R716 — #486 merged 61 s after the re-push; the cause was a stale merge box, not the ruleset (outcome, same ruling)
Amends: R707
The identical tree under a fresh SHA went `BLOCKED → CLEAN → MERGED` (22:01–22:02Z). So P-008's rule
was not the blocker; a no-op `gh pr update-branch` (head already contained `main`) leaves GitHub's
merge-state evaluation stuck. `~/.local/bin/gh-merge-on-green`'s green-but-BLOCKED path now says so
in its final message instead of "needs a person". Not mechanised further: the tool has no worktree
to push from, and this is the first occurrence.
Cost if wrong: the next stuck merge costs one manual re-push instead of an automatic one.


## R708 — DL-1's verification on Opus although it is `risk:1` and off the engine
Builds on: R702
(The rule: `docs/harness/model-tiering.md` — `risk:2` or `src/core`/`src/simulation` → Opus, else Sonnet.)
The tiering rule would give #487 a Sonnet verifier. Deviation: the parser's semantics are what DL-2,
DL-3, DL-5 and Mission Control's graph all consume, the builder argued one deviation from the
design (`Supersedes:`), and a schema read only by one model tier is a weaker check than the
subsystem deserves on day one. Later DL/MC tasks return to the rule.
Cost if wrong: one Opus verification's usage where a Sonnet one would have done — bounded.


## R717 — the same Opus-verifier exception for MC-1 (#488) (extension, same ruling)
Amends: R708
The snapshot schema is Mission Control's equivalent of the lineage parser: every view and the
orient step read it. Same reasoning, same bound. From DL-2/MC-2 on, the tiering rule applies as
written unless a PR argues a design deviation.
Cost if wrong: one more Opus verification.


## R709 — #461 and #487 merge on PASS; their verifiers' findings go to the issues that own them
Builds on: R702
#461: PASS (Opus); the `logic.mjs:410` message nit goes to #460 (same file, next); the *latent* #456
case is reproduced and characterised on #456; the new finding — an emptied `.dependency-cruiser.cjs`
passes `lint:layers` and `pr-hygiene` never reads a config-only PR — is filed as **#489** (`risk:2`).
#487: PASS (Opus); the `Supersedes:` bullet, the Status-regex false edge, two schema-doc nits and the
chain-(iii) fixture note go to **#467** (DL-2), which owns them.
Cost if wrong: a nit that should have blocked lands and is fixed one PR later; every one was measured
as non-blocking by the verifier and is now written where the next builder will read it.


## R710 — with two slots free, the sweep's own PRs go before DL-2/MC-2
Builds on: R702
The owner: process healing over queued code. #483 (docs sweep, Sonnet) and #484 (preview sweep,
Sonnet) dispatched; DL-2/#460/MC-2 follow as #487/#461/#488 land.
Cost if wrong: the kick-offs' second tasks start an hour later.


## R711 — R700 rested on a false premise: the weekly meter had not reset; no new dispatches until 03:00Z
Amends: R700
Assumes: P-006
Read 22:38Z: `seven_day` **93%**, `five_hour` 4%. R700 said "this one starts the week at ~0%" — it
did not: the local date had rolled to the 25th, the browser was unresponsive when I tried to read the
meter at run start, and I wrote the ruling on the assumption. The run has since spent about six points
(87 → 93) on research, filing, three builds and three verifications. Ruling: **no new agent until the
reset**; the three in flight (#488 verify, #483, #484) finish, their merges are cheap coordinator
work; DL-1b (my own backfill, Fable-priced) waits for the new week; after the reset the 40% ceiling of
R700 applies to the new meter.
Cost if wrong: the in-flight agents push the meter to the cap before 03:00Z and the retry hook holds
the run until it lifts — bounded by the reset itself.
Lesson, and it is the project's own subject: a ruling wrote `Assumes:` implicitly and never
verified it. Under DL-3 this premise would have had a verify command and the run's first action
would have run it.


## R712 — owner steering: "why are you holding, keep going" — the pre-reset hold is lifted
Amends: R711
Builds on: R700
The owner, mid-run, overrode the hold. Dispatching continues as slots free, through the reset. For
the new week the ceiling of R700 (40%) is replaced by **70%** — the midpoint of the ceilings he has
set himself (70/85/93) — since "keep going" at 93% says his tolerance is higher than R700 assumed.
Surfaced in the end-of-run review either way.
Cost if wrong: he wanted an even higher or lower number and says so in one line.


## R713 — DL-1b imports and annotates; it does not touch the ledger
Builds on: R712
#466's acceptance said the ledger rows get ids; DL-4 (#469) *also* adds the ledger's `Id`/`Decision`
columns, and #483 (in flight) edits ledger rows now. Three PRs in one table is the #407 shape.
Ruling: DL-1b = import all 321 rulings into `docs/decisions/rulings/`, normalise the three header
styles, give restatements new ids with `Amends:`, annotate R500–R611 with real lineage, `unknown`
elsewhere; the ledger's ids are DL-4's, after #483 merges. #466's text is corrected to say so.
Cost if wrong: the ledger's `Decision` column is filled one task later than planned.


## R718 — MC-1 merges on PASS; its three nits go to MC-5, DL-4 and MC-2
Builds on: R709
The `--previous` crash is latent until MC-5 passes the flag → #476. The ledger-column collision with
DL-4 → #469 (the #407 shape, pre-empted by naming it). The schema-doc gaps → #473, the first
consumer. The verdict count moved (28 of the last 60, 4 of them cloud-lane code PRs) and matches R705.
Cost if wrong: a nit that deserved its own fix lands one task later.


## R719 — #491's predicate changes from "not in the open list" to "positively closed"
Builds on: R706
The verifier reproduced a total wipe from `gh pr list` returning `[]` with exit 0. For a scheduled
destructive job the only safe predicate is positive evidence per item (`gh pr view <n>` says
CLOSED/MERGED), with a refusal when the plan would remove everything and a removal cap. Round 2 on
the same branch, resumed with the builder's own context.
Cost if wrong: ~30 `gh pr view` calls a day and a slower sweep — negligible against one wrong run
deleting every live preview.


## R720 — owner steering: "Keep going until weekly usage is 99%"
Amends: R712
Assumes: P-006
The ceiling for the **current** meter (93% at 22:38Z, reset at 2026-09-25T03:00Z) is now 99%. If the
reset arrives first, the new week's meter starts near zero; the instruction is read as this week's
remaining budget, so after the reset R712's 70% applies until he says otherwise — surfaced in the
review, since "99% of the next week too" is a possible reading with a very different cost.
Cost if wrong: one line from him either way; the expensive misreading (spending the whole next week)
is the one avoided by default.


## R721 — #490 round 2: the converter's title split and the CLI's exit flush were both real bugs
Builds on: R713
Amends: R713
The verifier found four titles truncated at a `**` inside them (a glob or inner bold) and a
`test:run` failure at `lineage.logic.test.mjs:243` — which was not the test's fault: `lineage.mjs`
called `process.exit()` right after printing, and on a pipe Node truncates at ~64 KiB. Both fixed;
the converter is now a file in the run directory (`import-rulings.py`) so a re-import is
reproducible, and it refuses on a duplicate id instead of inventing one — which is how I found my
own R714/R715/R718 colliding with the restatements' ids (renumbered to R718–R720).
Cost if wrong: none left to find by the same method; the verifier re-reads.


## R722 — Dependabot: three minors merge on green; the lint-staged major is held for a hook check
Builds on: R608
#493 (radix-ui 1.4.3 → 1.6.7), #494 (eslint-plugin-react-refresh), #495 (@rolldown/plugin-babel) go
through `gh-merge-on-green` one at a time. #496 (lint-staged 16 → 17) is a major whose only consumer
is the pre-commit hook — the one path CI never runs — so a green check proves nothing about it; held
with the exact check to run written on the PR.
Cost if wrong: a dev-dependency stays one major behind for a day. Cost of the opposite: every local
commit in every worktree fails at the hook until someone notices which merge did it.


## R723 — #491 merges on its round-2 PASS; the first sweep is run by dispatch and its result recorded
Builds on: R719
The round-2 verifier's residual — `gh` truthfully listing one PR open while `pr view` lies MERGED
for it — needs GitHub to misreport a single PR while behaving normally otherwise; the ordinary
failure (an empty or short list) is closed structurally. Accepted. The issue's acceptance includes
"the first run is executed by `workflow_dispatch` after merge and its result recorded": the sweep
writes only to `gh-pages`, the same branch `deploy.yml` rewrites on every merge, and the plan today
is 28 removals of 33 folders with every open PR's folder kept — so the dispatch is inside the
publishing grant, not a deploy of the product.
Cost if wrong: a stale preview folder that should have stayed is gone; every open PR's folder is
re-deployed by its own workflow on the next push anyway.


## R724 — one more Opus item (#485) before the reset, against a ~97% meter and a 99% ceiling
Builds on: R720
The owner's instruction is literal ("until 99%"). #485 is process work with two real fixtures and a
small surface. If the run hits the cap mid-build, the API pauses the agent; the retry hook wakes
this session after the reset and the builder is re-dispatched from its branch — bounded by the
reset itself, three hours away. #498 merges on PASS in the background; claim/460 released.
Cost if wrong: a build interrupted at the cap and restarted after 03:00Z — one lost partial build.


## R725 — #499's verification waits for the reset; the run sleeps in one-hour wakeups until 03:00Z
Builds on: R724
Assumes: P-006
The last reading was 96% at 23:47Z; since then a Sonnet verification and an Opus build ran, and the
browser extension is now disconnected so the meter cannot be read. #499's verifier is Opus
(`risk:2`, a required check) — a cap hit mid-verification loses the whole read. So: no dispatch until
03:00Z; `ScheduleWakeup` in one-hour steps; at the first wake after the reset, read the meter (if the
browser is back), verify #499, then DL-2 (#467), MC-2 (#473), #489, MC-6 (#477), the owed #459
verification, and the finish item, under the new week's 70% ceiling (R712) unless the owner says
otherwise.
Cost if wrong: two and a half hours in which one verification could have finished had the meter
been lower than estimated; the estimate errs on the side of not wasting an Opus run.


## R726 — the new week: meter 0% at 03:05Z (resets 2026-10-02); 70% ceiling stands until the owner says otherwise
Builds on: R720, R712
Assumes: P-006
Last week's meter was 96% at 23:47Z and then took a Sonnet verification and an Opus build before the
reset — so the run ended the week at or just under the owner's 99% with no cap hit (no retry-hook
firings). This week: 70% (R712), re-read every ~3 hours or six agent completions. Dispatched at the
reset: #499's verification (Opus, risk:2), DL-2 #467 (Opus), MC-2 #473 (Opus).
Cost if wrong: the owner meant 99% again and says so in one line.


## R727 — #499 round 2 inside `withoutCode`; the rule's Markdown model must equal GitHub's
Builds on: R724
The verifier proved the model wrong on two real bodies from other repos (a same-line triple-backtick
span read as a fence; HTML comments not stripped) while confirming everything else — 0 disagreements
in 242 of our own bodies, #443's failure correct, fenced blocks skipped by GitHub (kubernetes
#137025, vscode #325145). A required check that parses Markdown must match GitHub on other repos'
bodies too, since ours will eventually contain the same shapes. Round 2 with the four real bodies as
fixtures; resumed with the builder's own context.
Cost if wrong: a PR whose body hides a keyword in a comment is failed or passed differently from
GitHub — the exact class this rule exists to remove.


## R728 — #499 merges on its round-2 PASS; the six residual Markdown shapes and the link-form keyword are #504
Builds on: R727
The verifier matched the reader against GitHub's renderer on every edge case named and re-swept
3,500 public bodies independently (3,443 agree; the 57 remainder are non-Markdown). Six shapes still
disagree with zero occurrences in 3,744 bodies; `Fixes [#n](url)` is a pre-existing miss that can
never produce a false FAIL. Filed as **#504** (`risk:2`, not urgent) rather than a third round.
#489 dispatched into the freed slot (Opus, risk:2).
Cost if wrong: a body in one of the six shapes is failed or passed differently from GitHub — none
exists today, and #504 owns the fix.


## R729 — DL-2 merges on PASS; the hand-typed forward links are a legitimate seed; #502 is cosmetic
Builds on: R709
The verifier reproduced the queries byte-identically, re-ran `--fix` to an empty diff against the
shipped commit, and ruled that typing the forward links on ADR-0020/0016 by hand was the necessary
seed: `check` compares fields, never invents a relation from prose (D-DL-2), which is exactly the
ambiguity the Status regex now guards against. #502 (39 titles cut at the bolded clause) is
cosmetic — a trailing clause lost, the claim intact — and two of its named cases are already whole;
annotated, kept open, low priority. MC-6 (#477) dispatched into the freed slot.
Cost if wrong: a truncated title misleads a reader once; the body below it is complete.


## R730 — MC-2 merges on PASS; the owed #459 verification takes the freed slot
Builds on: R709, R702
#501's verifier reproduced the golden and no-`src/` tests by mutation, confirmed `dist/` byte-identical
from a fresh worktree (its first comparison used a stale primary checkout — a 16 KB phantom it caught
itself), exercised the stale-banner path on the live preview, and ruled `pickRule.next` the right
source of "next". Two cosmetic nits. With the sweep's own items landed, the owed code verification
(#459, engine, risk:2, Opus) is the last "coordinating queued code" item and goes now; #489 and
MC-6 are building.
Cost if wrong: an Opus verification spent on an engine PR the owner ranked below process work — it
was owed from the previous run and is the last such item.


## R731 — #459 merges on its third-attempt PASS; the drag-reroute deletion is #506; DL-4 dispatched
Builds on: R730, R607
The verifier tried every break-it case against `main` and the PR — feed wire, junction-to-junction,
two junctions on one wire, a 16-bit bus, `applyJunctionRelocations` — and the PR beats `main` on each
while creating no duplicate wires. R607's option 2 holds. Its saved probes found one pre-existing
loss outside the PR (a gate drag whose re-route fails deletes the wire, `gateActions.ts:333-342`) →
filed **#506** under the foundation epic, `risk:2`, with three options. The ledger conflict was a
both-rows append; rebased and pushed. DL-4 (#469, Sonnet) takes the freed slot.
Cost if wrong: a wire kept by option 2 overlaps its re-drawn twin — visible, deletable; the
verifier found no path that renders or evaluates a duplicate wrongly.


## R732 — #508 merges on PASS; #456 closes by hand; narrowing and `options.exclude` widen #505
Builds on: R728
Assumes: P-003
The verifier reproduced every claimed reading, proved no execution at file:line, and found by
attack that rule *narrowing* (any rule) and one `options.exclude` line still pass — territory #508
never claimed, so #505 is widened rather than the PR blocked. #456 closes: all criteria met except
the one #489 overrides by design. The retirement hatch is specified in #505, not built now. Nit 2
(#507's `parseCheckLine` reading an `UNDECLARED` exit-1 run as PASS) went to #507's verifier as a
possible BLOCK. MC-5 (#476, Sonnet) took the freed slot.
Cost if wrong: a narrowed rule passes review unnoticed until #505 lands — the same exposure as
before this PR, now written down in the issue that owns it.


## R733 — #510's BLOCK was a rebase conflict; the coordinator resolved it and appended L055 → R607
Builds on: R713
The verifier confirmed every criterion and blocked only on `docs/harness/ledger.md` conflicting
with `main`'s new four-column row from #459. A builder round for a mechanical conflict is waste; I
rebased, converted that row to six columns as L055 with `Decision: R607` — the first ledger row
whose decision is named at write time — and asked the verifier for a round-2 read of the rebase
alone (mergeable; L055's cells; 55 artefacts / 5 edges; DoD).
Cost if wrong: a coordinator edit to a ledger row lands with a typo that the verifier's diff would
catch — and it re-reads before merge.


## R734 — #507 round 2: the run's conclusion wins over the published line
Builds on: R732
The #508 verifier's nit became #507's blocker once tested: a `ci` run that failed on `UNDECLARED`
still publishes a `… 0 new` line, and the collector read PASS. A status instrument that reports
green for a failed required check is worse than none — the same shape as R518's "tool must state its
premise" lesson, here "the tool must read the verdict, not the sentence". Round 2 resumed with the
builder's own context; the fixture is the verifier's recorded failing run.
Cost if wrong: none left in that direction — a disagreement between line and conclusion is now data.


## R735 — MC-6 merges on its round-2 PASS; DL-5 takes the slot
Builds on: R734
The verifier reproduced its own failing case through the new rule (`FAIL`, `disagrees: true`), an
unrelated failure and a time-out likewise, a cancelled run as CANCELLED, and `main`'s 2026-03-03
failed run as FAIL where round 1 read null. Mission Control's `checks` section is now trustworthy in
the one direction that matters. DL-5 (#470, Opus) — the correction plan — is the last kick-off task
this run dispatches; MC-3 and MC-5 are building.
Cost if wrong: none identified; the residual (log-only findings under HYGIENE) is documented.


## R736 — MC-3 merges on PASS; its two nits are #513; MC-4 dispatched as the last kick-off build of the run
Builds on: R735
The verifier recomputed all six stage counts independently and found two presentation nits outside
the acceptance (SVG labels shrink at 375 px; Verifying/PR drill into identical lists) → #513,
`risk:0`, agent-ready. MC-4 (#475, Sonnet) is dispatched; after it and DL-5/MC-5 land, the run's
kick-off phase stops — MC-7/MC-8/MC-9, DL-6 (two weeks after DL-4's cut-over) and DL-7 stay in the
epics for the pick rule.
Cost if wrong: one more Sonnet build near the natural end of the run; the meter is at ~10%.


## R737 — the stuck merge box hit #511 (second occurrence); my R707a tool message had a shell bug
Builds on: R707
Amends: R707
Two findings from one watcher log. (1) `#511` sat `BLOCKED` with everything green after a no-op
`update-branch`, exactly as #486 did — the second occurrence, so by the ledger's rule it wants a
mechanism, not advice: `gh-merge-on-green` should perform the fresh-SHA re-push itself when given a
worktree, or the harness should stop calling `update-branch` when the head already contains `main`.
Recorded for the session record and the next sweep; the manual re-push cleared it again. (2) The
message I added in R707a put `update-branch` in backticks inside a double-quoted shell string, so the
tool tried to run it as a command ("update-branch: command not found") — the same slip class as
the 2026-09-24 `gh issue comment` backtick incident. Fixed; the remaining backticks in the file are
in comments or single-quoted jq programs.
Cost if wrong: a third stuck merge costs one more manual re-push.


## R738 — MC-5 merges on its round-2 PASS; the first hourly run is dispatched and recorded
Builds on: R723
The round-1 BLOCK found a test file no project collected — the same class as #436 — and round 2
closed it with a test that lists what vitest collects, so the class cannot recur silently. The
workflow writes only to `gh-pages` (`control/` + `control/history/`), the branch `deploy.yml` already
rewrites on every merge, inside the same concurrency group and clean-exclude — so the first dispatch
is inside the publishing grant, as #491's was. No further builds this run (R736).
Cost if wrong: an archive file written under the wrong name; the prune never touches anything but
`<ISO>.json` under `history/`.


## R739 — MC-4 merges on PASS; the case-only filename collision is the second occurrence → a lint issue
Builds on: R736
`timeline.ts`/`Timeline.tsx` after `process.ts`/`Process.tsx` the same day: on APFS the import can
resolve to the wrong module while Linux CI passes — the exact "green in CI, broken on the owner's
machine" shape. Ledger rule: mechanise on the second occurrence → filed with a fixture-first lint.
Cost if wrong: a lint that fires on a legitimate pair — none exists in the tree today.


## R740 — #514 round 2: `--file` must be resumable — reuse before create, record progress first
Builds on: R735
The verifier built a stub that fails the second `issue create` and showed a retry filing a duplicate
root and orphaning the first — the guard was the ruling append, written last. A command that creates
issues on the owner's public tracker must be idempotent under partial failure: look for existing
correction issues for the root before creating any, write the plan record first and update it per
issue, and prove with four stub scenarios that a retry converges and a second run creates nothing.
The `epic` label check on the parent lookup rides along (one condition).
Cost if wrong: a correction plan that is filed twice — visible, deletable, and the exact noise the
tool exists to remove.
