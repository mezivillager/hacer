# Issue form and labels

What a task must contain before an agent may pick it up, and the labels that say where it stands.
Moved from the research-era design (2026-10-02, #280); the pick order is `docs/portfolio.md`, the
loop and every other knob are `docs/harness/README.md`, the computation is `scripts/backlog.logic.mjs`.

## Hierarchy

One *epic* per portfolio row, *task* sub-issues under it (`gh issue create --parent`), dependencies
through `--blocked-by`. Issue types are not available on a user-owned repo, so kinds are labels.

## Labels

| Group | Values |
|---|---|
| project | `project:<slug>`, one per portfolio row in `docs/portfolio.md` |
| state | `agent-ready` · `in-progress` · `needs-human` (absent = still being shaped; "blocked" is computed from `blockedBy`, not labelled) |
| risk | `risk:0` docs/tests/deps · `risk:1` pure logic under conformance · `risk:2` store/UI/architecture/harness |
| kind | `bug` · `research` · `epic` (default = task); `idea`, `fidelity`, `lineage:correction` per `docs/portfolio.md` |
| severity | `sev:critical` · `sev:high` (bugs only) |
| misc | `bot-filed` · `overturned` · `critical` (browser QA, ADR-0016) · `size-override` (human-applied) |

Size is not a label; the `pr-hygiene` check measures it. The vocabulary's origin is
`docs/decisions/0013-backlog-in-github-issues-and-portfolio.md` (Decision 1).

## "Ready" is computed

`node scripts/backlog.mjs ready` decides, first match wins: a claim ref (`claimed`, `stale-claim`) ·
author not on the allowlist (`author`) · `in-progress` · `needs-human` · no `agent-ready` or no
portfolio row (`unshaped`) · an open `blockedBy` (`blocked:#n`). Otherwise the task is pickable.

**Security boundary.** The repo is public and agents hold the owner's GitHub identity, so:
- agents read issue bodies and comments only from allowlisted authors (`DEFAULT_ALLOWLIST`, `BACKLOG_ALLOWLIST`);
- anything triaged from outside content is filed `needs-human`, never `agent-ready`;
- review threads are resolved only when the reviewer is allowlisted;
- `bot-filed` issues never become `agent-ready` without the owner.

Labels are applied by whoever holds the owner's identity, agents included, so these are conventions
enforced by the skills and visible in the audit trail, not access controls.

## The agent-ready issue form

1. **Goal** — one sentence, user-visible outcome.
2. **Acceptance criteria** — as *named tests or scenario ids to add*, not prose.
3. **Verification command** — the exact command whose exit code proves it.
4. **In scope / out of scope.**
5. **Files likely touched.** Run `node scripts/blast-radius.mjs` on them before `agent-ready` is applied (`docs/harness/README.md`).
6. **Risk** label; **blocked-by**.
7. A `surfaces` task also names the **scenario ids** it covers and the **drivers** it adds
   (`hdl` / `mcp` / `svg2d` / `cli`), and links its sibling issues for the other non-3D surfaces
   (`docs/portfolio.md` "Hand in hand", #259).
8. Optional (#469): **Introduced by:** the decision (`ADR-NNNN`, `R<n>` or `P-<n>`) a defect traces to;
   **Decisions:** the decision ids the issue exists to carry out, mirroring the PR body's `Decisions:`
   line (`docs/harness/implementer-brief.md`).

Well-scoped, self-contained, reproduction-bearing issues merge markedly more often. An issue whose
estimate exceeds the PR budget is split into sub-issues before it is ready.

## Bot issue contract

Executable repro or no issue · fingerprint in an HTML comment, searched against open and closed ·
at most 3 per run · at most 10 open `bot-filed` issues, overflow into one rolling issue · never
`agent-ready` without the owner.
