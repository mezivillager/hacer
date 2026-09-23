# Cloud queue inbox

Live list of cloud-heavy rows for Grok Bot. Process: `docs/harness/cloud-queue.md`.

Append a row when you enqueue. Do not invent state. Do not backfill closed trials or issues
that are not actually queued. An empty table means the queue is empty.

| Issue | Why cloud | Success criteria | Claim status | Queued by | Status | Cloud agent id | Notes |
|---|---|---|---|---|---|---|---|
| [#193](https://github.com/mezivillager/hacer/issues/193) | Large install/build loop: clone `nand2tetris/web-ide` at a pinned commit and extract the Project 1–5 `.hdl`/`.tst`/`.cmp` content (they are TS string modules upstream) into `conformance/vectors/`. Not a laptop job, and the result is a protected held-out oracle. | `ls conformance/vectors/01 \| wc -l` non-zero; LICENSE notice records the licence **and the pinned web-ide commit**; Project 1 lands in its own PR; PR merged. | unclaimed | claude-local | queued | | Grok Bot please claim as `grok-bot`. **Read the 2026-09-23 comment first** — the issue as filed reads `../web-ide`, a sibling checkout that does not exist on a cloud VM; clone the public repo instead. Blocks #338. |
| [#338](https://github.com/mezivillager/hacer/issues/338) | The heaviest install/build loop in the backlog: clone + `npm install` a three-package foreign workspace, `tsc --build simulator` (emits despite 4 upstream type errors), pin `@davidsouther/jiffies` to **2.2.5**, then run HACER's engine and the reference side by side. | `pnpm run test:differential` exits 0; one CI job; vendored artefact never imported by `src/`; a disagreement is reported as chip/line/expected/actual. | unclaimed | claude-local | queued | | Grok Bot please claim as `grok-bot`. **Blocked by #193 — do not start until it merges.** Same `../web-ide` correction applies (2026-09-23 comment). |

## Metering question this batch should settle

The 2026-09-23 Grok Bot trial left the cost attribution unresolved, and the protocol in
`cloud-queue.md` depends on it. Its own numbers: **Other Models 84% → 84%** (unchanged) while the
usage API reported **$8.26** charged; **Cursor Models 3% → 4%**; **Grok Bot weekly 2% → 3%**. The
process page asserts Cloud Agents count as Other Models — but Other Models is the one pool that did
not move.

So when this batch runs, take the before- and after-shots **at a moment nothing else is running**,
and record all three meters. Whichever moves is the pool that pays. That matters concretely:
**Other Models sat at 84% with the monthly reset on Oct 19** — if that is the pool, headroom is thin
and `cloud-queue.md` §Metering's "stop and report" gate is load-bearing; if it is not, the gate is
reading the wrong number.

Also worth a line in the report: the trial's two rows were small docs edits — the class
`cloud-queue.md` explicitly files under **What stays local** — and charged ~5.24M tokens between
them. These two rows are the first test of the bucket the queue actually exists for, so their
cost per unit of work is the number that decides whether this lane is worth keeping.
