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

Every claim comment (and every update comment) uses:

```text
Claimed by: <coordinator-id>   # e.g. claude-local / grok-bot / cursor-cloud
Intent: building | paused:<reason> | handing-off
Session/run: <id>
Branch: <type>/<n>-<topic>     # omit until known
Handoff: <path or none>        # required when intent is paused:* or handing-off
```

`ha-next` §2 repeats this. Post a **new** comment when intent changes; do not edit history as the
only signal.

## Do not claim across a pause (prefer)

If you are blocked on metering, spend certainty, auth, or owner input and no builder will start
soon: **do not claim yet**, or **release** the claim until the pause lifts. Idle `in-progress`
claims look like active work and steal picks from `ha-next`.

If a claim must stay (e.g. you already claimed, then a pause landed): set
`Intent: paused:<reason>`, write a handoff, and keep a short TTL in the handoff (“release by
&lt;date&gt; if still idle”).

## Stale claims (orient)

At orient, list `refs/heads/claim/*` and read each issue’s latest claim comment. Treat as stale or
paused when:

- `Intent: paused:…` and there is no open PR, or
- `in-progress`, no open PR, and no branch push for a long stretch (use judgment; when unsure, ask
  or follow the handoff)

Then: resume, follow the handoff, or release (`git push origin --delete claim/<n>`, remove
`in-progress`, comment that the claim was released and why).

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
