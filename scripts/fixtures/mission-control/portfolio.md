# Portfolio — the priority projects, in order

**Edit this file to change what agents work on.** Rows are the priority projects; each maps to an
epic issue whose sub-issues are the tasks. Tasks live in GitHub Issues, never here (ADR-0013). The
pick rule below decides what "next" means; `scripts/backlog.mjs ready` computes it.

| # | slug | Project | Epic | Lane | Progress is… |
|---|------|---------|------|------|--------------|
| 1 | foundation | Foundation plan: guards, the read-only pipeline, removals (`docs/research/2026-09-21-foundation-audit/REPORT.md`) | [#318](https://github.com/mezivillager/hacer/issues/318) | feature | the plan's phase exits (§6); `CircuitState` and `junction` gone from `src/` |
| 2 | harness | Autonomous-run improvements & agent-readiness — *also the queue for maintaining and improving this process itself* | [#138](https://github.com/mezivillager/hacer/issues/138) | process | G0 + G1 exit tests pass (`docs/research/2026-09-18-agent-readiness/REPORT.md` §4) |
| 3 | surfaces | Renderer surfaces: CLI/HDL · MCP · 2D | [#142](https://github.com/mezivillager/hacer/issues/142) | feature | scenarios pass through ≥3 headless drivers |
| 4 | pubdocs | Public documentation for platform consumers (API · MCP · CLI · HDL · plugins) | [#260](https://github.com/mezivillager/hacer/issues/260) | feature | every shipped surface capability has its `docs/public/` page |
| 5 | core | Headless core | [#140](https://github.com/mezivillager/hacer/issues/140) | enabler | `vitest --project node` green; `hacer test` passes Project-1 vectors |
| 6 | verify | QA service | [#141](https://github.com/mezivillager/hacer/issues/141) | aux | capability matrix generated; differential job green |
| 7 | spine | nand2tetris alignment 0.5 → 0.7 | [#139](https://github.com/mezivillager/hacer/issues/139) | feature | conformance pass count for the current phase |
| 8 | 3d | 3D surface sustainability | [#143](https://github.com/mezivillager/hacer/issues/143) | enabler | scene-graph coverage; draw-call budget held |
| 9 | polish | UI polish | [#144](https://github.com/mezivillager/hacer/issues/144) | taste | batches the owner approved |
| 10 | bugs | Bugs | [#145](https://github.com/mezivillager/hacer/issues/145) | aux | no `sev:high` open > 7 days |
| 11 | upkeep | Maintenance & documentation | [#146](https://github.com/mezivillager/hacer/issues/146) | aux | 0 stale dependabot PRs; 0 dead doc paths |
| 12 | horizon | Beyond nand2tetris (research notes only) | [#147](https://github.com/mezivillager/hacer/issues/147) | research | one open note at a time |

## Pick rule

1. Any open `sev:critical` bug.
2. Otherwise a six-slot cycle — **amended 2026-09-21 (#330), in force while the foundation plan
   (#318) runs.** The owner: "we shouldn't build more on a wrong foundation that would crumble soon,
   so we have to fix the foundation first, and have to keep maintaining the foundation … process
   ironing prs can go hand in hand with that."

   `foundation → foundation → harness → foundation → spine → aux` (then repeat)

   - `aux` takes `verify → upkeep → bugs` in turn;
   - a slot whose bucket has nothing pickable is skipped;
   - an enabler (`core`, `3d`) is pulled, never pushed: eligible only while it blocks an open task of
     one of the buckets above, and it takes a slot of that bucket;
   - inside a slot, `research` tasks of `foundation`, `surfaces` and `core` come first (design first,
     below), then the oldest issue;
   - `surfaces` and `pubdocs` are **outside** the amended cycle, so their tasks report `on-request`
     until the plan pulls one forward with `project:foundation` (the gate, below). They are not
     cancelled: the plan's Phase 0.6 *is* the surfaces work, and a `surfaces` slot takes the oldest
     pickable `surfaces` **or** `pubdocs` task again as soon as the amendment lifts.

   It lifts when the default renderer switches (plan §6 phase C), and the cycle goes back to
   `surfaces → harness → spine → aux → surfaces → harness` — set 2026-09-18, when the owner said
   "the process ironing and other auxiliary items are of equal priority."
3. `polish` and `horizon` are picked only when the owner asks, or in dormant mode (`horizon` only).

A task is **pickable** when it is open, labelled `agent-ready`, not `in-progress`, every issue it is
blocked by is closed, its author is on the allowlist (the owner and the owner's bot identities), and
the gate below does not hold it.

## The foundation gate

While the amendment runs. `docs/research/2026-09-21-foundation-audit/REPORT.md` §7 is the
specification; these three rules are what `scripts/backlog.logic.mjs` computes.

- **Pulling an issue forward is one label.** An issue carrying `project:foundation` files under the
  foundation row whatever else it carries — GitHub lists labels in creation order, which is an
  accident, so the row is chosen explicitly. The enablers the plan pulls forward keep their original
  `project:` label as well, so their epic's progress and the hand-in-hand rule still count them.
- **`risk:2` waits, and says so.** A `risk:2` task outside `foundation` and `harness` is held and
  `ready` prints `foundation-gate` as its reason: that label already marks the store, UI, R3F and
  architecture paths this plan is replacing and the ADR (#327) will redefine, so the safe-to-proceed
  test is a filter over it, not a second label. A `sev:critical` bug is never held — a defect that
  corrupts evaluation is still fixed, in the evaluation layer, as #312 was.
- **New work on hand editing stops.** Wire drawing, junction placement, dragging, previews, and
  polish or fixes whose only beneficiary is that machinery: not `agent-ready` while the plan runs.
  All of it is `risk:2` store/UI/R3F work, so the same filter holds it with the same stated reason.
  Since [ADR-0020](decisions/0020-spec-only-writes-read-only-projections.md) those capabilities are
  **non-goals, not deferred work** (its §6), so the sweep (#340) closes them rather than holding
  them. Hand editing is reopenable only as alternative C of that ADR: a command writing a layout
  hint, never a new gesture state machine.

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
decisions and designing." The `surfaces` row therefore starts with the architecture ADRs #209 and
#210 — research tasks at the Full tier, each an ADR the owner reviews. The core enablers (#178,
#179, #180–#187) are pulled by those ADRs; surface code lands only after its ADR is accepted, and
with its scenario ids and drivers named. `foundation` is design-first for the same reason: its ADR
(#327) led its own slot, ahead of the plan's code, and
[ADR-0020](decisions/0020-spec-only-writes-read-only-projections.md) is its output — **it absorbs
#188, #189 and #190, and re-points #217**, so those three no longer gate the `surfaces` row.

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
