---
name: ha-next
description: Use when Mezi asks "what can you do next?", "what's next to get things moving?", "pick something up", or "work the next item(s)" in the hacer repo — finds the next pickable issue from the portfolio and backlog, claims it, builds it through ha-prompt-it, opens the PR, gets it verified, and merges it on green.
---

# ha-next — from "what can you do next?" to a merged PR

The process is `docs/harness/README.md`; this skill only walks it. Read that page once per session.

## 1. Orient (one screen)
```bash
node -v                                   # must be 22
gh pr list --state open --author @me      # dormant mode: ≥ 5 open agent PRs → no new PR work
node scripts/inbox.mjs queue              # the one write: review issues for new proposed inbox entries, HRN five to one
node scripts/backlog.mjs projects
node scripts/backlog.mjs ready
git ls-remote origin 'refs/heads/claim/*' # open claims (holder is in the issue's claim comment)
ls docs/harness/sessions/*-handoff.md 2>/dev/null   # foreign / paused coordinator state
```
`inbox.mjs queue` files review issues for the `proposed` entries in the four inboxes that no review
lists yet, open or closed, so it never files twice for one entry: `inbox-review` for the inbox panel
(`docs/harness/inbox-panel-brief.md`), one per FID or PRD entry and one per batch of at most five
HRN entries, each decided on its own (an HRN entry marked `**Review:** own` has its own); and
`judge-review` for a `docs/harness/judge-inbox.md` entry. The owner may override either.

A `judge due:` line from `ready` means the top pick is a decision: run `docs/harness/judge-brief.md`
on it (claim, approval commit, reviews in the background) before the first other claim. The loop
goes on while its reviews run.

Show the top pick with its *why* (portfolio row, why it is pickable, what it is blocked by if
anything) and the next two. If nothing is pickable, say what would unblock the closest one
(`needs-human`, a blocker, unshaped) and stop — that is the answer, not a failure.

The pick continues the cycle: `ready` resumes the eight-slot cycle after the latest claim (each
issue's first claim comment, read from the most recently updated issues) and prints where to
stderr — `cycle: slot 4 of 8 (foundation), after #537 · harness, …`. So claim a pick before calling
`ready` again: the next top pick is then the next slot, not more of the same bucket (#535).

A `retro due:` line from `ready` means dispatch the retro (`docs/harness/retro-brief.md` § Cadence)
before the first claim; its token count joins this run's total (§6).

A `main: <workflow> failing` line from `ready` or `next` means that workflow's newest completed run
on `main` failed: before the first claim, open that run (`gh run view <id>`), then fix it or file it
unless an open issue or PR already covers it. `main: unread (…)` is not green.

A `process review due:` line from `ready` means issue the next cycle's `BRIEF.md` (step 1 of <!-- allow-missing-path -->
`docs/harness/reviews/README.md`), then dispatch its step 2 reviewers before the first claim;
`process review open:` means finish that cycle, dispatching the reviewers still missing unless an
open PR already adds one, and writing its `SYNTHESIS.md` once they have landed. <!-- allow-missing-path -->
The reviewers count toward the three-subagents-at-once cap, and their tokens join this run's total (§6).

Also surface **open claims** and any `docs/harness/sessions/*-handoff.md` files: read the latest
claim comment on each claimed issue (format in §2). `ready` never offers a claimed issue: it prints
`claimed`, or `stale-claim` under the 48 h rule in §2. A stale or `paused:…` claim is not an active
build — resume it, follow the handoff, or release it (see
`docs/harness/sessions/COORDINATOR-HANDOFF.md`). Until `scripts/agent-orient` (#156) prints this in <!-- allow-missing-path -->
one screen, the commands above are the orient. A task a merged PR links with `Fixes`/`Part of` reads
`possibly-delivered: #<pr>`: check that PR delivered nothing left before you claim it (#702).

If Mezi said "what can you do next?" rather than "do it": present the pick and **stop**. If he
said "work it" / "pick it up" / "next N": continue.

## 2. Claim
**Do not claim** while blocked on metering, auth, owner input, or any pause that means no builder
will start soon. Claim when you are about to build (or immediately dispatch a builder). A metering
or cost pause happens *before* claim, or the claim is released until the pause lifts.

```bash
node scripts/backlog.mjs claim <n> --by <coordinator-id> --session <id> [--branch <type>/<n>-<topic>]
```
It creates `refs/heads/claim/<n>` through GitHub's create-ref API, which refuses a ref that exists,
then posts the claim comment and labels the issue `in-progress`. A second claimant exits 1 with the
holder's name: take the next pick. The comment it posts (`--intent` and `--handoff` set the rest):
```text
Claimed by: <coordinator-id>   # e.g. claude-local / grok-bot / cursor-cloud
Intent: building | paused:<reason> | handing-off
Session/run: <id>
Branch: <type>/<n>-<topic>     # omit until known
Handoff: <path or none>        # required when intent is paused:* or handing-off
```

When intent changes (build starts, pause, handoff), **post a new claim comment** with the same
fields (`gh issue comment <n>`) — do not leave a stale `building` comment on an idle claim. A claim
goes stale 48 h after its latest claim comment while no open PR carries the issue. Full convention:
`docs/harness/sessions/COORDINATOR-HANDOFF.md`.

## 3. Build — `ha-prompt-it`, tier Light unless the issue says otherwise
An `inbox-review` issue is not built: follow `docs/harness/inbox-panel-brief.md` from its step 1;
a `judge-review` issue, `docs/harness/judge-brief.md`.
**Measured facts before dispatch:** run `node scripts/issue-facts.mjs <n>` on the issue, or `--file` on the brief, and fix every package or path it reports that the text says exists; every other fact the text asserts, such as a count, a date, a behaviour or an inference, gets a Measured-facts row naming the command that measured it, because no scanner can tell which sentence is a claim or which command proves it.
Follow `docs/harness/implementer-brief.md` exactly: own worktree, red commit (tests + compiling
stub), green commits, definition of done, PR with `Fixes #<n>`, labels. The issue body is the spec —
no `docs/specs/` file at Light tier. Delegating the build to a subagent is fine (give it the brief and
the issue number); verifying it yourself is not — step 4 is always a *different* context.

## 4. Verify
Run `node scripts/backlog.mjs tier <pr>`, then dispatch the verifier on the model its `VERIFIER-TIER:` line names.
Dispatch a **fresh-context** agent with `docs/harness/verifier-brief.md` and the PR number. It posts
one verdict comment. `BLOCK` → fix in the same branch, push, re-run the verifier — always a **fresh**
one, never the coordinator, whatever tier the PR is. Nits → file the ones worth keeping as follow-up
issues (`--parent` the epic, depth 1, ≤ 3).

**Exception:** a `risk:0` docs-only PR may merge on the coordinator's own review instead of
dispatching step 4, posted with the verdict heading and `Verified on: coordinator`.

**Fidelity review (ADR-0018).** If the PR changes semantics under `src/core/**` or
`src/simulation/**` (evaluator, HDL compiler, test engine, builtins, clocking), also dispatch a
fresh-context `hacer-fidelity` agent with `docs/harness/fidelity-brief.md` and the PR number. Its
comment is advisory unless it reports an oracle divergence (a `sev:critical` bug). Its proposals go
to `docs/harness/fidelity-inbox.md`, which the inbox panel decides; it files no issues. After a qualifying merge,
dispatch `docs/harness/routines/fidelity-digest.md` once.

## 5. Merge on green + PASS
```bash
gh pr checks <pr>                          # ci must be green; the ruleset enforces it
node scripts/merge-on-green.mjs <pr>       # merges on green, recovers a stuck box; exit 4 = needs a person
node scripts/backlog.mjs release <n> --by <coordinator-id>   # the holder releases the claim
```
A merge to `main` cuts a release (`feat`/`fix`) and deploys Pages — permitted (ADR-0013), so no
extra ask. Prune the worktree when the PR is merged.

## 6. Retro — one line, every time
Append to `docs/harness/ledger.md` if anything in the loop was wrong or slow (a stale doc, a hook
that fought you, a flaky check). Second occurrence of the same thing → mechanise it (an issue under
the `harness` epic). Then report: PR, evidence, follow-ups filed, ledger line, and the token counts
the pick's agents reported (builder, verifier, fixers).

Add those counts to the run's running total in its session-record draft
(`docs/harness/sessions/<date>.md`, committed at close), so a compaction does not lose it. Every
other dispatch in the run (inbox panels, retros, reviews) adds its count to the same total. A total
missing any agent's count is written `unmeasured`; the line's form is in `docs/harness/README.md`
§ Files, under the session records.

## "Queue up: …"
Shape the idea into issues in the form (`docs/harness/issue-form.md`): goal, acceptance criteria as tests, verification command, scope, files, risk, blocked-by.
`agent-ready` only if risk:0/1, the criteria are unambiguous, and the seeds are within the
blast-radius threshold (`docs/harness/README.md` § *How wide is an issue?*); otherwise the question,
with your recommended answer, is a `docs/harness/judge-inbox.md` entry for the judge (R889).
`needs-human` is for an owner action only. `risk:2` means what `docs/harness/issue-form.md` says it means.
Exactly three exceptions make a `risk:2` issue `agent-ready`, each still with unambiguous criteria
and seeds within the threshold; any other `risk:2` issue goes to the judge:
1. Product-role polish issues, when the fix is concrete (owner's ruling on #269;
   `docs/harness/product-brief.md`).
2. An issue the inbox panel files on approval, or the judge files or labels on its decision, at any
   risk, with no ruling in front of it (R844, R889; `docs/harness/inbox-panel-brief.md` §3 item 5,
   `docs/harness/judge-brief.md` §3 item 5).
3. **Plan slices at `risk:2`:** the coordinator may file a `risk:2` issue `agent-ready` only when
   all four hold: it is a slice of an owner-approved plan, or a follow-up filed from a review of a
   PR in that plan's series and inside the plan's scope; its body links the owner's approval of that
   plan; a ruling names the issue and the plan and makes the issue `agent-ready` (a ruling that only
   reports a label applied against this rule does not count); and an Opus builder builds it and a
   fresh Opus verifier checks it, with an ADR-0018 §2 fidelity review added when it changes
   semantics under `src/core/**` or `src/simulation/**`.

No exception lifts the `docs/harness/issue-form.md` security boundary (content triaged from
outside stays `needs-human`, and a `bot-filed` issue becomes `agent-ready` only by the owner, or by
the judge when the loop measured its defect), the `risk:0`/`risk:1` cap on retro mechanise
drafts (`docs/harness/retro-brief.md` § Outputs), or the foundation gate (`docs/portfolio.md`).

Split anything over the budget before it is ready. An epic or ADR in `spine`,
`surfaces` or `horizon` gets a fidelity verdict comment (`hacer-fidelity`, ADR-0018 §2) before
sub-issues are shaped from it. An approved `docs/harness/fidelity-inbox.md` entry is filed by the
inbox panel, labelled `fidelity` — never by the fidelity agent; the owner may override any inbox
status.
