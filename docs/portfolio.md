# Portfolio — the priority projects, in order

**Edit this file to change what agents work on.** Rows are the priority projects; each maps to an
epic issue whose sub-issues are the tasks. Tasks live in GitHub Issues, never here (ADR-0013). The
pick rule below decides what "next" means; `scripts/backlog.mjs ready` computes it.

| # | slug | Project | Epic | Lane | Progress is… |
|---|------|---------|------|------|--------------|
| 1 | harness | Autonomous-run improvements & agent-readiness — *also the queue for maintaining and improving this process itself* | [#138](https://github.com/mezivillager/hacer/issues/138) | process | G0 + G1 exit tests pass (`docs/research/2026-09-18-agent-readiness/REPORT.md` §4) |
| 2 | surfaces | Renderer surfaces: CLI/HDL · MCP · 2D | [#142](https://github.com/mezivillager/hacer/issues/142) | feature | scenarios pass through ≥3 headless drivers |
| 3 | pubdocs | Public documentation for platform consumers (API · MCP · CLI · HDL · plugins) | [#260](https://github.com/mezivillager/hacer/issues/260) | feature | every shipped surface capability has its `docs/public/` page |
| 4 | core | Headless core | [#140](https://github.com/mezivillager/hacer/issues/140) | enabler | `vitest --project node` green; `hacer test` passes Project-1 vectors |
| 5 | verify | QA service | [#141](https://github.com/mezivillager/hacer/issues/141) | aux | capability matrix generated; differential job green |
| 6 | spine | nand2tetris alignment 0.5 → 0.7 | [#139](https://github.com/mezivillager/hacer/issues/139) | feature | conformance pass count for the current phase |
| 7 | 3d | 3D surface sustainability | [#143](https://github.com/mezivillager/hacer/issues/143) | enabler | scene-graph coverage; draw-call budget held |
| 8 | polish | UI polish | [#144](https://github.com/mezivillager/hacer/issues/144) | taste | batches the owner approved |
| 9 | bugs | Bugs | [#145](https://github.com/mezivillager/hacer/issues/145) | aux | no `sev:high` open > 7 days |
| 10 | upkeep | Maintenance & documentation | [#146](https://github.com/mezivillager/hacer/issues/146) | aux | 0 stale dependabot PRs; 0 dead doc paths |
| 11 | horizon | Beyond nand2tetris (research notes only) | [#147](https://github.com/mezivillager/hacer/issues/147) | research | one open note at a time |

## Pick rule

1. Any open `sev:critical` bug.
2. Otherwise a six-slot cycle, half features and half process/auxiliary — the owner (2026-09-18):
   "when I say the non-3d surfaces catching up as a priority, I meant feature-wise; the process
   ironing and other auxiliary items are of equal priority."

   `surfaces → harness → spine → aux → surfaces → harness` (then repeat)

   - a `surfaces` slot takes the oldest pickable `surfaces` **or** `pubdocs` task, so docs and
     surfaces alternate naturally;
   - `aux` takes `verify → upkeep → bugs` in turn;
   - a slot whose bucket has nothing pickable is skipped;
   - an enabler (`core`, `3d`) is pulled, never pushed: eligible only while it blocks an open task of
     one of the buckets above, and it takes a slot of that bucket;
   - inside a slot, `research` tasks of `surfaces` and `core` come first (design first, below), then
     the oldest issue.
3. `polish` and `horizon` are picked only when the owner asks, or in dormant mode (`horizon` only).

A task is **pickable** when it is open, labelled `agent-ready`, not `in-progress`, every issue it is
blocked by is closed, and its author is on the allowlist (the owner and the owner's bot identities).

## Hand in hand

The owner (2026-09-18): "priority is for other surfaces (2d, hdl and mcp) to catch up with 3d, and
note the non-3d surfaces have to grow hand in hand."

- A `surfaces` task is `agent-ready` only if its body names the scenario ids it covers and the
  drivers it adds (`hdl` / `mcp` / `svg2d` / `cli`).
- A capability landing on one non-3D surface has sibling issues for the others, linked with
  `blocked-by` or `Part of`.
- A surface capability is not done until its `docs/public/` page exists or is updated in the same
  PR, or a linked `pubdocs` sub-issue blocks the surface epic's exit.

**Design first.** The owner: "that will mean a whole lot of core refactoring … lots of architectural
decisions and designing." The `surfaces` row therefore starts with the architecture ADRs #188, #189,
#190, #209 and #210 — research tasks at the Full tier, each an ADR the owner reviews. The core
enablers (#178, #179, #180–#187) are pulled by those ADRs; surface code lands only after its ADR is
accepted, and with its scenario ids and drivers named.

## Dormant mode

At 5 open agent PRs, or 7 days without a human merge: no new PR-producing work; only `horizon`
notes and issue shaping. Scheduled jobs stand down.

## Commands

- `node scripts/backlog.mjs ready` — pickable tasks in pick order, then every other open task with its one-word reason (`--json` for the array).
- `node scripts/backlog.mjs projects` — one line per row above: open · ready · in-progress · needs-human · next pick.
- The rule is pure logic in `scripts/backlog.logic.mjs` (`PICK_ROTATION` and `AUX_ROTATION` mirror the cycle above; a test keeps them in step with this file), tested against a recorded `gh issue list` fixture; `tasks`, `next` and `claim` follow in [#149](https://github.com/mezivillager/hacer/issues/149).

## Where the rest of the process lives

Labels, the issue form, the agent loop, PR budget, checks and merge tiers:
`docs/research/2026-09-18-agent-readiness/WORK-SYSTEM.md` (to be superseded by `docs/harness/README.md`).
