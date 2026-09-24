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
