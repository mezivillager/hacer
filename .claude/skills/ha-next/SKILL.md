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

Also surface **open claims** and any `docs/harness/sessions/*-handoff.md` files: read the latest
claim comment on each claimed issue (format in §2). A claim with `intent: paused:…` and no open PR,
or `in-progress` with no PR and no push for a long stretch, is **stale or paused** — do not treat it
as an active build; either resume it, follow the handoff, or release it (see
`docs/harness/sessions/COORDINATOR-HANDOFF.md`). Until `scripts/agent-orient` (#156) prints this in
one screen, the commands above are the orient.

If Mezi said "what can you do next?" rather than "do it": present the pick and **stop**. If he
said "work it" / "pick it up" / "next N": continue.

## 2. Claim
**Do not claim** while blocked on metering, auth, owner input, or any pause that means no builder
will start soon. Claim when you are about to build (or immediately dispatch a builder). A metering
or cost pause happens *before* claim, or the claim is released until the pause lifts.

```bash
git push origin HEAD:refs/heads/claim/<n>            # atomic: a second creation is rejected
gh issue edit <n> --add-label in-progress
gh issue comment <n> --body "$(cat <<'EOF'
Claimed by: <coordinator-id>   # e.g. claude-local / grok-bot / cursor-cloud
Intent: building | paused:<reason> | handing-off
Session/run: <id>
Branch: <type>/<n>-<topic>     # omit until known
Handoff: <path or none>        # required when intent is paused:* or handing-off
EOF
)"
```
If the claim ref already exists, someone else has it: take the next pick.

When intent changes (build starts, pause, handoff), **post a new claim comment** with the same
fields — do not leave a stale `building` comment on an idle claim. Full convention:
`docs/harness/sessions/COORDINATOR-HANDOFF.md`.

## 3. Build — `ha-prompt-it`, tier Light unless the issue says otherwise
Follow `docs/harness/implementer-brief.md` exactly: own worktree, red commit (tests + compiling
stub), green commits, definition of done, PR with `Fixes #<n>`, labels. The issue body is the spec —
no `docs/specs/` file at Light tier. Delegating the build to a subagent is fine (give it the brief and
the issue number); verifying it yourself is not — step 4 is always a *different* context.

## 4. Verify
Dispatch a **fresh-context** agent with `docs/harness/verifier-brief.md` and the PR number. It posts
one verdict comment. `BLOCK` → fix in the same branch, push, re-run the verifier. Nits → file the
ones worth keeping as follow-up issues (`--parent` the epic, depth 1, ≤ 3).

**Fidelity review (ADR-0018).** If the PR changes semantics under `src/core/**` or
`src/simulation/**` (evaluator, HDL compiler, test engine, builtins, clocking), also dispatch a
fresh-context `hacer-fidelity` agent with `docs/harness/fidelity-brief.md` and the PR number. Its
comment is advisory unless it reports an oracle divergence (a `sev:critical` bug). Its proposals go
to `docs/harness/fidelity-inbox.md` for the owner; it files no issues. After a qualifying merge,
dispatch `docs/harness/routines/fidelity-digest.md` once.

## 5. Merge on green + PASS
```bash
gh pr checks <pr>                          # ci must be green; the ruleset enforces it
gh pr merge <pr> --rebase --auto           # merges when checks pass; never --admin
git push origin --delete claim/<n>         # release the claim
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
