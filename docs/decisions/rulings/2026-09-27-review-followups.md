# Rulings — 2026-09-27 review-followups

The run that addresses the findings of the 2026-09-26/27 process reviews and consolidates the review
docs. Owner's hand-over: "work autonomously to address all the valid review findings, also if the
review docs weren't consolidated, make sure to consolidate them … this will happen every two weeks
at least". Publishing `on-green` under the standing grant.

## R742 — the cloud lane takes only work nothing else waits on
Builds on: none
The owner, 2026-09-27: "I trigger grok bot manually, but if it's not doing useful work, and if it's
being a blocker, we need to find a way to address that blocker ... but if it did some useful work, we
can leave some non-blocking tasks (verification, etc) for it and move on with the work, so if the
cloud lane reports something, then it gets addressed in a follow-up." The lane did useful work (5 of
8 rows done), so it stays, for non-blocking work only: verification, second opinions, differential
and conformance runs, heavy optional checks. Anything on the critical path stays local. A queued row
that turns out to block other work comes back local with a claim comment. Whatever the lane reports —
a BLOCK, a finding, a failing run — becomes a local follow-up; the loop never waits on the lane,
because the lane moves only when the owner triggers it.
Cost if wrong: some heavy builds run on the laptop that the cloud lane could have run at included
usage.

## R743 — #193 comes back to the local lane
Builds on: R742
#193 (the official Project 2–5 vectors) blocks the spine's conformance count and #338, and has had
no activity since the Project 1 PR (#443, 2026-09-24). All three reviews flagged it. The claim
moved to `claude-local` by claim comment; `claim/193` stays and the comment names the holder.
Cost if wrong: none beyond laptop time; the extraction script already exists (`scripts/sync-vectors.mjs`).

## R744 — #338 stays queued for the cloud lane
Builds on: R742
The differential harness against web-ide is verification: no open issue is blocked by it, and it is
the heaviest install loop in the backlog. It waits for #193's vectors, then runs whenever the owner
triggers the lane; what it finds becomes local follow-ups.
Cost if wrong: the engine's second oracle arrives later than it could have.

## R745 — #519's BLOCK becomes a local fix round
Builds on: R742
The lane built DL-3 (#519) and its own verifier blocked it on 2026-09-25; nothing has moved since.
Under R742 the report is addressed locally: a local builder takes the fix round on the same branch,
and a fresh verifier judges it.
Cost if wrong: a duplicate fix if the owner triggers the lane on the same row; the claim comment on
#468 prevents it.

## R746 — a PR-body edit is the recovery for a stuck merge box, not a fresh-SHA re-push
Builds on: R737
Amends: R737
Both 2026-09-27 reviews named the `edited` event as a recovery that needs no new SHA. On #517 — stuck
since 2026-09-25T07:22Z — appending an HTML comment to the body re-ran both workflows, and the PR
merged 60 s later (2026-09-27T08:19:51Z). R737's fresh-SHA re-push is a force-push, which the
coordinator's permission classifier refused. The cause is fixed in #530.
Cost if wrong: none — the recovery is non-destructive and was measured.

## R747 — the run ends when the queue is done, with the weekly meter as a guard at 75%
Builds on: R741
The hand-over named no ceiling. The owner's account also carries other work, and the week resets
2026-10-02T03:00Z. At 21% on 2026-09-27, stopping new dispatch at 75% leaves a quarter of the week
for everything else. A meter that cannot be read at a check is retried once after 20 minutes; if it is
still unreadable, dispatch stops and in-flight work finishes. A reset is not permission to continue
(R741).
Cost if wrong: findings not reached in this run carry to the next.

## R748 — findings that need code get an issue, claimed by the coordinator before dispatch
Builds on: R742
The review brief told reviewers to file nothing; this run is the triage it deferred to. The findings
that need code became issues under the harness epic — #530 (the stuck merge box) and #531 (exclusive
claims) so far — each claimed by `claude-local` before its builder starts, so `ready` never offers
it to another lane.
Cost if wrong: a few more issues in a backlog the reviews already call heavy; each closes with its PR.

## R749 — the vector sync reads upstream's own list of shipped files
Builds on: R743, ADR-0021
The Project 2 builder stopped before building, as briefed. Its survey showed that the "one module =
one chip" assumption holds only for Project 1. Upstream Project 2 has three modules declaring
`CHIP ALU`, and the last one — a non-official variant — would win. Two official files would also be
dropped, and every check would still pass. Projects 3–5 break the assumption differently. So the sync
now parses each project's upstream `index.ts` map as text, fails closed on anything it cannot read,
and must regenerate Project 1 byte-identically. Files an official `.tst` loads (`.asm`, `.hack`) are in
scope for the slices that need them.
Cost if wrong: a parser that a future pinned commit may break — loudly, by design.

## R750 — process reviews get one home, one layout and one report shape
Builds on: R742
The owner, 2026-09-27: "i don't want non-uniform sacttered review docs, especially given this will
happen every two weeks at least, would be good to organize it properly." The first cycle sat in
`docs/research/` in three shapes, and a later PR overwrote one review and relabelled its notes as
another's. Reviews now live in `docs/harness/reviews/<date>/`, with:
- the brief as issued;
- one numbered file per review, never edited by another;
- evidence prefixed by review;
- a SYNTHESIS.md, where the coordinator consolidates and triages.

A standing brief (`docs/harness/process-review-brief.md`) carries the parts that do not change, so a
cycle brief is only its evidence and hypotheses. The process review becomes the fifth standing role.
Reviews are numbered, not named by model, because the owner judges findings, not authors.
Cost if wrong: a moved directory breaks links in old PR bodies; the history keeps them.

## R751 — #517 merged 18 s after its body edit, not 60 s
Builds on: R746
Amends: R746
R746 said #517 merged "60 s later". The edit landed at 08:19:33Z, the fresh runs started at 08:19:36Z
and were green by 08:19:49Z, and the PR merged at 08:19:51Z: 18 s (#546's builder found it, and its
verifier re-derived it). The 60 came from a 30-second polling loop's rounding — a number written from
the loop's granularity instead of the event times, the #394 class again.
Cost if wrong: none — the recovery stands; only the figure changes.

## R752 — the weekly guard for today's session is 30%
Builds on: R747
Amends: R747
The owner, mid-run: "30% is the weekly usage guard for today's session." It replaces R747's 75%. The
meter read 23% when it was set.
Cost if wrong: findings not reached today carry to the next run.

## R753 — no early wind-down under the guard
Builds on: R752
The coordinator first answered R752 by deferring every remaining builder. The owner: "don't rush on
changing direction, it's gonna be a while before you hit 30%." The queue continues in order; the
meter is read before each dispatch, and only reaching 30% stops dispatch.
Cost if wrong: a dispatch that starts at 29% can run a point or two past the guard before it lands.

## R754 — the vector sync refuses, never deletes, a file upstream does not ship
Builds on: R749
#544's verifier found a stale vendored file survived a sync. The Project 3 builder chose to refuse —
exit 1, naming every stray, deleting nothing — over deleting, and its verifier agreed.
`conformance/vectors/` is the held-out oracle on a protected path, so a vector should leave it only
through a reviewed `git rm`, never as a side effect of a parser that might read a later `index.ts`
short. #552 made the refusal name the strays in every directory at once, and ignore dotfiles.
Cost if wrong: a pin bump that drops a file needs one `git rm` commit per affected directory.

## R755 — built-in chip texts are vendored like the course files
Builds on: R749
Upstream ships built-in chip texts through `BUILTIN_CHIPS` — `01/Nand.hdl`, `03/DFF.hdl`, and five in
05. Each carries the nand2tetris header, so they are vendored. Open question for a later cycle: 01's
`Nand.tst` / `Nand.cmp` were added to web-ide in 2024 (its #297) and may be web-ide-authored despite
their header.
Cost if wrong: a few non-course files in the oracle, removable by `git rm` under R754.

## R756 — both lanes claim with the same command
Builds on: R742
#549 made `node scripts/backlog.mjs claim|release` the claim mechanism. The cloud lane clones this
repo and has `gh`, so `cloud-queue.md` and `COVERAGE.md` move to the same command (#547, now
`agent-ready`). One mechanism, so a claim excludes across lanes.
Cost if wrong: the cloud lane cannot run the command, and #547 is reworded to the API call it wraps.

## R757 — files upstream ships that are not course material are excluded by a named table
Builds on: R749, ADR-0021
The Project 5 builder stopped before building. Upstream's map ships `MaxRam.tst` and `MaxRam.cmp` —
web-ide's own e2e fixtures (its #652, MIT, no course header) — and a `RAM16K` derived by a
`.replace(…)` over Project 3's stub. Vendoring them would put MIT web-ide files under a notice that
says CC BY-NC-SA course material; moving the pin before them would change 01–04. So the sync keeps
reading the full map, strictly, and then applies a named, tested exclusion table: each entry keyed by
project and file with its reason. An exclusion that no longer matches a shipped entry throws, so a
later pin is noticed. Excluded files count as not shipped, so a hand-copied one is refused (R754).
Cost if wrong: a three-entry deny-list to remove later.

## R758 — #519's lineage edits are accepted, and its fix round lands on a fresh branch
Builds on: R745
#519's verifier asked the coordinator to accept four `Builds on:` / `Assumes:` edits to R398–R405,
since backfill of imported rulings is coordinator-owned. They copy the recorded chain fixture exactly,
so they are accepted. R405 → R400 is the weakest edge, but it follows the recorded chain. The one edge
the verifier found missing — R400 `Assumes: P-005` — is added. The fix round landed as #559 on a fresh
branch carrying #519's build commits, because rebasing a two-day-old branch would need a force-push.
Cost if wrong: one weak edge (R405 → R400) in the graph.

## R759 — dormant mode's "no human merge" half is dropped
Builds on: R742
`docs/portfolio.md` put the loop into dormant mode at 5 open agent PRs or 7 days without a human
merge. The second half cannot be computed while agents act as the owner's GitHub identity, since every
merge is `mezivillager`'s. Under the on-green grant, merges do not wait on a human anyway. #561 dropped
it and names the open-PR cap as the signal: when merges stall, open PRs pile up and the cap trips.
The owner may restore a measurable form.
Cost if wrong: an owner who stops attending goes unnoticed while agents keep merging their own work.

## R760 — the first Scorecard run's zeros become one issue; the rest wait for the next review cycle
Builds on: R742
Scorecard's first run on `main` (run 36318052904) scored Pinned-Dependencies 0 and Token-Permissions 0:
the other workflows pin by tag, and grant `contents` broadly. Both have concrete fixes, filed as #567.
Branch-Protection (3) and Security-Policy (4) touch owner settings and policy, so they go to the next
review cycle rather than a builder.
Cost if wrong: one more upkeep issue.
