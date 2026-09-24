# Cloud queue — Claude enqueues, Grok Bot runs the cloud-heavy rows

Local Claude coordinates most of the loop on the Mac. Grok Bot coordinates **queued
cloud-heavy** work so those runs do not burn the laptop: Cursor Cloud Agent builds, long
browser QA / Playwright-heavy checks, and large install / build / test loops.

This is not a second picker for ordinary local work. Product order still comes from
`docs/portfolio.md` and GitHub Issues. `ha-next` keeps picking local work. It does not take
a row that is sitting in this queue.

The door this page relies on is the one that worked in the 2026-09-23 trial with **on-demand
disabled**: Grok Bot launches Cursor Cloud Agents. That trial is **done**. Its handoff is
evidence, not a live claim list — do not revive anything from it.

## Roles

| Who | Owns | Does not |
|---|---|---|
| Local Claude | Orient, most picks, local implement and verify, writing queue rows, claim hygiene for its own work | Launch Cursor Cloud Agents when that door requires on-demand on Claude’s path |
| Grok Bot | Rows marked for it: meter Spending, launch Cloud Agents, fresh-context verify, merge on green + PASS when that is the standing grant, release the claim, mark the row done | Re-pick Claude’s local work, or invent a second claim that overlaps one already held |

One coordinator of record per issue. The other does not start a builder on it.

## Uniqueness — no double builders

For every queued issue, all of these are true at once:

- **One GitHub issue.**
- **One** `claim/<n>` ref, or an explicit handoff of a claim that already exists. Never a second ref.
- **One Cloud Agent id**, recorded on the issue once a builder is launched.
- **One coordinator of record** (the latest claim comment).

`ha-next` must not steal queued work. At orient, read `docs/harness/sessions/cloud-queue-inbox.md`
and skip every issue whose row is not `done`. Do not claim it, build it, or release it to “free”
it for a local pick. A row Claude left unclaimed on purpose is still queued.

## Queue contract

**Standing inbox:** `docs/harness/sessions/cloud-queue-inbox.md`. Append a row. Do not invent
rows, and do not backfill closed work.

**Optional per-batch handoff:** `docs/harness/sessions/YYYY-MM-DD-cloud-queue-handoff.md` when
Claude pauses mid-batch. Link that path from the claim comment’s `Handoff:` field. Use the
template in `docs/harness/sessions/COORDINATOR-HANDOFF.md`. The inbox stays the list of rows;
the dated file is only the pause note.

Inbox columns (minimum):

| Column | What to write |
|---|---|
| Issue | `#n` only. One row per issue. |
| Why cloud | Which bucket in **What belongs in the queue** below. |
| Success criteria | The outcome that marks the row done (usually the issue’s acceptance criteria, plus PR merged or an explicit stop). |
| Claim status | `unclaimed`, or `claim/<n>` plus who holds it. |
| Queued by | `claude-local` (or another coordinator id if one is ever used). |
| Status | `queued` / `claimed-by-grok` / `building` / `pr` / `done` / `blocked` |
| Cloud agent id | Empty until launch. Then the id, once. |
| Notes | Handoff path, stop reason, or `Grok Bot please claim as grok-bot`. |

Claude enqueues by appending the row and then either:

1. **Park a claim it already holds or is about to hold.** Post the claim comment in the next
   section with `Intent: handing-off` or `Intent: paused:cloud-queue`, and set `Handoff:` to
   the inbox or the dated handoff. Label `in-progress` only when the `claim/<n>` ref exists.
2. **Leave it unclaimed.** Say so in Notes: `Grok Bot please claim as grok-bot`. Do not add
   `in-progress`. Grok Bot creates `claim/<n>` when it takes the row, then takes the Spending
   before-shot. If that shot says stop, release the claim and set Status to `blocked`. Do not
   leave `in-progress` on a row that will not launch.

Move Status yourself as the row advances. Do not leave `building` on a row whose agent has
already opened a PR (`pr`) or whose claim was released after merge (`done`).

## Claim comment fields

Same fields as `docs/harness/sessions/COORDINATOR-HANDOFF.md`. Post a **new** comment when
intent changes. Do not edit an old comment as the only signal.

```text
Claimed by: claude-local | grok-bot
Intent: handing-off | paused:cloud-queue | building
Session/run: <id>
Branch: <omit until known>
Handoff: docs/harness/sessions/cloud-queue-inbox.md
```

`Handoff:` may instead be the dated `docs/harness/sessions/YYYY-MM-DD-cloud-queue-handoff.md`
for this batch. It is required for `handing-off` and for `paused:*`.

When Claude hands off a claim it holds: set `Intent: handing-off` or `paused:cloud-queue`,
set `Handoff:`, and stop. Grok Bot then posts a new comment that takes the build:

```text
Claimed by: grok-bot
Intent: building
Session/run: <cloud-agent-id once launched, or the Grok run id until then>
Branch: <type>/<n>-<topic>
Handoff: docs/harness/sessions/cloud-queue-inbox.md
```

Put the Cloud Agent id in that comment as soon as it exists (Session/run, and the inbox
column). One id per issue.

## What belongs in the queue

- Browser QA and other Playwright-heavy checks.
- A large install, build, or test loop that should run in the cloud.
- Parallel Cloud Agent implements when the Mac should stay free.

## What stays local

- Quick docs and small fixes.
- The `cursor-agent` second opinion (`docs/harness/cursor-lane.md` §1).
- Anything that needs the Mac only: local UI that cannot run on the cloud VM, or secrets
  that must not be pasted into an issue, a prompt, or this repo.

If a row does not fit **What belongs**, do not enqueue it.

## Metering (required before each cloud batch)

The owner prefers **plan spend %**, not dollars.

Before launching any Cloud Agent in the batch:

1. Read Spending. Record a before-shot: **Cursor Models**, **Other Models**, and **Grok Bot
   weekly**, each as a percent, plus the date.
2. Confirm **on-demand is disabled**. Leave it disabled.
3. If this run would require on-demand, or would hit the spend cap, **stop and report**. Do
   not enable on-demand. Set the row to `blocked` and say why in Notes.

Pools:

- The Grok Bot **weekly** meter is not the Cursor **monthly** pools.
- Cloud Agents count as **Cursor** usage (typically **Other Models**).
- There is no personal Spending-% API on a normal plan. Use the Spending UI for before and
  after. Optional: `GET /v1/agents/{id}/usage` for **that agent’s tokens only**. Do not treat
  its dollar figure as the plan percent. Do not write API keys into the repo, the inbox, or
  an issue.

After the batch, record the after-shot the same way and the delta in the short report.

## Loop for Grok Bot on a queued row

Follow `docs/harness/implementer-brief.md` for the builder and `docs/harness/verifier-brief.md`
for the fresh-context verify, the same as any other issue. This queue only changes who
launches the builder and where the row is tracked.

1. **Orient** the inbox. Take a row that is `queued` or handed off to you. Skip `done`.
2. **Claim or update.** Unclaimed → create `claim/<n>`, comment `Claimed by: grok-bot`. Held
   by Claude with `handing-off` or `paused:cloud-queue` → post the `Intent: building` update.
   Do not create a second claim. Set Status to `claimed-by-grok`.
3. **Spending before-shot.** If you must stop, release the claim if you just created it, set
   Status to `blocked`, report, and do not launch.
4. **Launch one Cloud Agent.** Record its id on the issue and in the inbox. Status `building`.
   The agent gets the issue and `docs/harness/implementer-brief.md`. It opens the PR and stops.
5. **Await the PR.** Status `pr`. Fix labels and body the way the brief says (`Fixes #<n>` or
   `Part of #<n>`).
6. **Fresh-context verify** with `docs/harness/verifier-brief.md`. You do not verify a PR you
   built in the same context. Post the verdict in its exact format — the `## Verifier verdict:
   PASS | BLOCK` heading and `Verified on:` line, never a paraphrase — because that heading is
   what a verdict collector counts.
7. **Merge on green + PASS** when that is the standing grant for this coordinator. If it is
   not, stop after the verdict and report.
8. **Release the claim** (`git push origin --delete claim/<n>`, remove `in-progress`).
9. **Mark the inbox row `done`.**
10. **After-shot and a short report:** PR URL, agent id, Spending percents before and after,
    verifier result. No dollars as the spend signal.

## Pointers

- Claim fields and handoff template: `docs/harness/sessions/COORDINATOR-HANDOFF.md`
- Optional external coordinator and Cloud Agents (research note): `docs/harness/cursor-lane.md` §2.1
- Closed trial, evidence only: `docs/harness/sessions/2026-09-23-grok-bot-cloud-trial-handoff.md`
- Live inbox: `docs/harness/sessions/cloud-queue-inbox.md`
