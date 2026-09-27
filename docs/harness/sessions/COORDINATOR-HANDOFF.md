# Coordinator handoff — multi-coordinator claims and pauses

The harness loop is **coordinator-agnostic for product work**: portfolio, Issues, `claim/<n>`
refs, PRs, verifier comments, and `ledger.md` are the source of truth. Chat memory is not.

**Coordinator meta-state** (who holds a claim, why a claim is idle, a metering pause, a foreign
coordinator trial) is *not* recoverable from those alone unless it is written down. This page is
that convention.

## When to write a handoff

Write `docs/harness/sessions/YYYY-MM-DD-<coordinator-id>-handoff.md` when any of these hold:

- a coordinator that is **not** the usual local Claude run claims work or pauses mid-loop
- a claim will sit **idle** (no builder starting soon) for any reason
- you need another coordinator to resume, amend, or unwind without guessing

Link that path from the issue’s claim comment (`Handoff:` field). Date session records in
`sessions/YYYY-MM-DD.md` stay for owner/session narrative; handoffs are for **cross-coordinator**
continuity. “What to do next” for product picks still lives in `docs/portfolio.md` and GitHub
Issues — never only in a handoff.

## Claim comment fields (required)

Claim with `node scripts/backlog.mjs claim <n> --by <coordinator-id> --session <id>`: it creates
`claim/<n>` through GitHub's create-ref API, which refuses a ref that exists (a second claimant exits
1 naming the holder), then posts the first claim comment and labels the issue `in-progress`. The
holder is the `Claimed by` of the latest claim comment. Every claim comment (and every update
comment) uses:

```text
Claimed by: <coordinator-id>   # e.g. claude-local / grok-bot / cursor-cloud
Intent: building | paused:<reason> | handing-off
Session/run: <id>
Branch: <type>/<n>-<topic>     # omit until known
Handoff: <path or none>        # required when intent is paused:* or handing-off
```

`ha-next` §2 repeats this. Post a **new** comment when intent or holder changes — a claim comment
naming a new holder is how a claim changes hands; do not edit history as the only signal.

## Do not claim across a pause (prefer)

If you are blocked on metering, spend certainty, auth, or owner input and no builder will start
soon: **do not claim yet**, or **release** the claim until the pause lifts. Idle `in-progress`
claims look like active work and steal picks from `ha-next`.

If a claim must stay (e.g. you already claimed, then a pause landed): set
`Intent: paused:<reason>`, write a handoff, and keep a short TTL in the handoff (“release by
&lt;date&gt; if still idle”).

## Stale claims (orient)

`node scripts/backlog.mjs ready` reads every `claim/*` ref: an issue holding one prints `claimed`,
labelled `in-progress` or not, and never as a pick. It prints `stale-claim` (and `projects` names it
on its row) when no open PR carries the issue and the latest claim comment is more than 48 h old — or
there is none. A claim with `Intent: paused:…` and no open PR is idle before then; read its handoff.

Then: resume, follow the handoff, or release. The holder releases with
`node scripts/backlog.mjs release <n> --by <holder>`, which deletes the ref and removes
`in-progress`. Anyone else can release only a stale claim:
`node scripts/backlog.mjs release <n> --by <you> --force-stale --reason "<why>"` also comments whose
claim it was and why it was released.

## Handoff template

```markdown
# Handoff — <coordinator-id> (<date>)

**Status:** active | paused | done | discard
**Audience:** the next coordinator (and the owner)

## Claims held
| Issue | Claim ref | Intent | Notes |
|---|---|---|---|
| #N | claim/N | paused:metering | … |

## What was done
- …

## What was not done
- …

## How to resume
1. …

## How to unwind
- [ ] delete claim refs …
- [ ] remove `in-progress` …
- [ ] comment on issues …
- [ ] mark this handoff superseded
```

## Related

- Loop map: `docs/harness/README.md`
- Pick skill: `.claude/skills/ha-next/SKILL.md`
- Cursor / cloud builder notes: `docs/harness/cursor-lane.md`
- Claude → Grok Bot cloud queue: `docs/harness/cloud-queue.md` (live inbox: `docs/harness/sessions/cloud-queue-inbox.md`)
- Orient script (not finished): #156
