---
name: ha-next
description: Use when Mezi asks "what can you do next?", "what's next to get things moving?", "pick something up", or "work the next item(s)" in the hacer repo — finds the next pickable issue from the portfolio and backlog, claims it, builds it through ha-prompt-it, opens the PR, gets it verified, and merges it on green.
---

# ha-next — from "what can you do next?" to a merged PR

The process is `docs/harness/README.md`; this skill only walks it. Read that page once per session.

## 1. Orient (read-only, one screen)
```bash
node -v                                   # must be 22
gh pr list --state open --author @me      # dormant mode: ≥ 5 open agent PRs → no new PR work
node scripts/backlog.mjs projects
node scripts/backlog.mjs ready
git ls-remote origin 'refs/heads/claim/*' # open claims (holder is in the issue's claim comment)
ls docs/harness/sessions/*-handoff.md 2>/dev/null   # foreign / paused coordinator state
```
Show the top pick with its *why* (portfolio row, why it is pickable, what it is blocked by if
anything) and the next two. If nothing is pickable, say what would unblock the closest one
(`needs-human`, a blocker, unshaped) and stop — that is the answer, not a failure.

The pick continues the cycle: `ready` resumes the eight-slot cycle after the latest claim (each
issue's first claim comment, read from the most recently updated issues) and prints where to
stderr — `cycle: slot 4 of 8 (foundation), after #537 · harness, …`. So claim a pick before calling
`ready` again: the next top pick is then the next slot, not more of the same bucket (#535).

Also surface **open claims** and any `docs/harness/sessions/*-handoff.md` files: read the latest
claim comment on each claimed issue (format in §2). `ready` never offers a claimed issue: it prints
`claimed`, or `stale-claim` under the 48 h rule in §2. A stale or `paused:…` claim is not an active
build — resume it, follow the handoff, or release it (see
`docs/harness/sessions/COORDINATOR-HANDOFF.md`). Until `scripts/agent-orient` (#156) prints this in
one screen, the commands above are the orient.

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
Follow `docs/harness/implementer-brief.md` exactly: own worktree, red commit (tests + compiling
stub), green commits, definition of done, PR with `Fixes #<n>`, labels. The issue body is the spec —
no `docs/specs/` file at Light tier. Delegating the build to a subagent is fine (give it the brief and
the issue number); verifying it yourself is not — step 4 is always a *different* context.

## 4. Verify
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
to `docs/harness/fidelity-inbox.md` for the owner; it files no issues. After a qualifying merge,
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
the `harness` epic). Then report: PR, evidence, follow-ups filed, ledger line.

## "Queue up: …"
Shape the idea into issues in the form (`docs/research/2026-09-18-agent-readiness/WORK-SYSTEM.md`
§2): goal, acceptance criteria as tests, verification command, scope, files, risk, blocked-by.
`agent-ready` only if risk:0/1 and the criteria are unambiguous; otherwise `needs-human` with your
recommended answer. Split anything over the budget before it is ready. An epic or ADR in `spine`,
`surfaces` or `horizon` gets a fidelity verdict comment (`hacer-fidelity`, ADR-0018 §2) before
sub-issues are shaped from it; an approved `fidelity-inbox.md` entry is filed here, labelled
`fidelity`, by you — never by the fidelity agent.
