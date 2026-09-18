# Portfolio — the priority projects, in order

**Edit this file to change what agents work on.** Rows are the priority projects; each maps to an
epic issue whose sub-issues are the tasks. Tasks live in GitHub Issues, never here (ADR-0013). The
pick rule below decides what "next" means; `scripts/backlog.mjs ready` computes it.

| # | slug | Project | Epic | Lane | Progress is… |
|---|------|---------|------|------|--------------|
| 1 | harness | Autonomous-run improvements & agent-readiness — *also the queue for maintaining and improving this process itself* | [#138](https://github.com/mezivillager/hacer/issues/138) | enabler | G0 + G1 exit tests pass (`docs/research/2026-09-18-agent-readiness/REPORT.md` §4) |
| 2 | spine | nand2tetris alignment 0.5 → 0.7 | [#139](https://github.com/mezivillager/hacer/issues/139) | spine | conformance pass count for the current phase |
| 3 | core | Headless core | [#140](https://github.com/mezivillager/hacer/issues/140) | enabler | `vitest --project node` green; `hacer test` passes Project-1 vectors |
| 4 | verify | QA service | [#141](https://github.com/mezivillager/hacer/issues/141) | enabler | capability matrix generated; differential job green |
| 5 | surfaces | Renderer surfaces: CLI/HDL · MCP · 2D | [#142](https://github.com/mezivillager/hacer/issues/142) | enabler | scenarios pass through ≥3 headless drivers |
| 6 | 3d | 3D surface sustainability | [#143](https://github.com/mezivillager/hacer/issues/143) | enabler | scene-graph coverage; draw-call budget held |
| 7 | polish | UI polish | [#144](https://github.com/mezivillager/hacer/issues/144) | taste | batches the owner approved |
| 8 | bugs | Bugs | [#145](https://github.com/mezivillager/hacer/issues/145) | upkeep | no `sev:high` open > 7 days |
| 9 | upkeep | Maintenance & documentation | [#146](https://github.com/mezivillager/hacer/issues/146) | upkeep | 0 stale dependabot PRs; 0 dead doc paths |
| 10 | horizon | Beyond nand2tetris (research notes only) | [#147](https://github.com/mezivillager/hacer/issues/147) | research | one open note at a time |

## Pick rule

1. Any open `sev:critical` bug.
2. Until the `harness` epic's G0 and G1 exit tests pass: `harness` tasks only (the foundation slice —
   short, strictly first).
3. Afterwards rotate **2 spine : 2 enabler : 1 upkeep**. An enabler task (`core`, `verify`,
   `surfaces`, `3d`) is eligible only when an open `spine` task is blocked by it — pull, don't push.
4. `polish` and `horizon` are picked only when the owner asks, or in dormant mode (`horizon` only).

A task is **pickable** when it is open, labelled `agent-ready`, not `in-progress`, every issue it is
blocked by is closed, and its author is on the allowlist (the owner and the owner's bot identities).

## Dormant mode

At 5 open agent PRs, or 7 days without a human merge: no new PR-producing work; only `horizon`
notes and issue shaping. Scheduled jobs stand down.

## Where the rest of the process lives

Labels, the issue form, the agent loop, PR budget, checks and merge tiers:
`docs/research/2026-09-18-agent-readiness/WORK-SYSTEM.md` (to be superseded by `docs/harness/README.md`).
