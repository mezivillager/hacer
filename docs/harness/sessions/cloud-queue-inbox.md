# Cloud queue inbox

Live list of cloud-heavy rows for Grok Bot. Process: `docs/harness/cloud-queue.md`.

Append a row when you enqueue. Do not invent state. Do not backfill closed trials or issues
that are not actually queued. An empty table means the queue is empty.

| Issue | Why cloud | Success criteria | Claim status | Queued by | Status | Cloud agent id | Notes |
|---|---|---|---|---|---|---|---|
| [#193](https://github.com/mezivillager/hacer/issues/193) | Large install/build loop: clone `nand2tetris/web-ide` at a pinned commit and extract the Project 1–5 `.hdl`/`.tst`/`.cmp` content (they are TS string modules upstream) into `conformance/vectors/`. Not a laptop job, and the result is a protected held-out oracle. | `ls conformance/vectors/01 \| wc -l` non-zero; LICENSE notice records the licence **and the pinned web-ide commit**; Project 1 lands in its own PR; PR merged. | claimed-by-grok-bot | claude-local | building | bc-6de621f1-8e3c-50c5-9115-64ca2687696e | Grok Bot please claim as `grok-bot`. **Read the 2026-09-23 comment first** — the issue as filed reads `../web-ide`, a sibling checkout that does not exist on a cloud VM; clone the public repo instead. Blocks #338. P1 done via [PR #443](https://github.com/mezivillager/hacer/pull/443); issue open for Projects 2–5. |
| [#338](https://github.com/mezivillager/hacer/issues/338) | The heaviest install/build loop in the backlog: clone + `npm install` a three-package foreign workspace, `tsc --build simulator` (emits despite 4 upstream type errors), pin `@davidsouther/jiffies` to **2.2.5**, then run HACER's engine and the reference side by side. | `pnpm run test:differential` exits 0; one CI job; vendored artefact never imported by `src/`; a disagreement is reported as chip/line/expected/actual. | unclaimed | claude-local | queued | | Grok Bot please claim as `grok-bot`. **Blocked by #193 — do not start until #193 fully closes.** [PR #443](https://github.com/mezivillager/hacer/pull/443) alone does not unblock it. Same `../web-ide` correction applies (2026-09-23 comment). |
| [#199](https://github.com/mezivillager/hacer/issues/199) | Fuzzing is pure compute and embarrassingly parallel — grammar-based and mutated HDL inputs, run at volume. Self-contained. | The parser returns diagnostics and never throws on any generated input; spans stay in range; **the generator is shown failing against a deliberately broken parser** before a green run is trusted. | released | claude-local | awaiting-claude-verify | bc-9878dded-2e89-59b3-9a71-83e34d10257b | Grok Bot please claim as `grok-bot`. **Read the 2026-09-23 comment**: `fast-check` is *not* a dependency and must not be added (that is #198's call) — hand-roll the mutation with a seeded PRNG, as `compiler.test.ts` does. Verify: **local Claude** (`src/core/hdl`, engine). Builder claim released. [PR #444](https://github.com/mezivillager/hacer/pull/444) open (`test/199-hdl-parser-fuzz`). Verify handoff to local Claude (`src/core/hdl`). Grok Bot will not merge. |
| [#427](https://github.com/mezivillager/hacer/issues/427) | A TypeScript **major** across the whole project: `tsc -b`, 140 test files, and likely several iterations on new type errors. The build/test-loop bucket, and fully self-contained. | All five definition-of-done commands exit 0 on 6.0.3 — **or** the bump is declined with the specific errors. The layer ratchet's count is unchanged and its baseline is **not** regenerated. | claimed-by-grok-bot | claude-local | done | bc-e7a1f6f4-f504-5091-ad08-8b33c8da25ac | Grok Bot please claim as `grok-bot`. Works from Dependabot PR #415 or a fresh branch. Declining with evidence is a good outcome. Verify: Grok Bot (no `src/` change if it is a clean bump; if it forces engine edits, hand back to local Claude). [PR #441](https://github.com/mezivillager/hacer/pull/441) merged (TypeScript ~6.0.3, no `src/` changes). |
| [#195](https://github.com/mezivillager/hacer/issues/195) | Mechanical lift of `e2e/scenarios` into `src/scenarios` with core and store drivers — touches many files, no judgment calls, no Mac-only resource. | The scenario module exists with both drivers; `pnpm exec vitest run src/scenarios` exits 0; nothing under `e2e/` still owns scenario logic. | released | claude-local | done | bc-5bb0afa6-713e-55b3-b63b-f0b184f6a03c | Grok Bot please claim as `grok-bot`. Note #332 deleted `e2e/scenarios` as dead code on 2026-09-23 — **recover it from history** (`git log --diff-filter=D`), do not rewrite it from scratch. Verify: Grok Bot. Claim released. [PR #442](https://github.com/mezivillager/hacer/pull/442) rebase-merged (scenarios module under `src/scenarios`, core NAND/compileHDL driver only). |
| [#333](https://github.com/mezivillager/hacer/issues/333) | Self-contained script plus unit tests, and it wants running over the whole import graph repeatedly to tune the threshold — cheap in the cloud, slow on the laptop. | `scripts/blast-radius.mjs` runs and its logic is unit-tested; the triage rule is in `docs/harness/README.md`; the threshold's evidence is recorded beside the constant. | released | claude-local | done | bc-13c35a23-5181-5655-9b07-8a8f6a9c6b67 | Grok Bot please claim as `grok-bot`. Verify: Grok Bot. Claim released. [PR #445](https://github.com/mezivillager/hacer/pull/445) rebase-merged (blast-radius script). |

**Spending before-shot 2026-09-24 ~03:54 EAT:** Cursor Models 5% / Other Models 94% / Grok Bot weekly 5% (Pro+ reset Oct 19).

## Why this lane exists: access, not efficiency

**Grok Bot can launch Cursor Cloud Agents on Cursor's *included* usage. Local Claude cannot reach
that door at all** — a cloud run initiated from this side would come off separate, metered capacity.
So the value here is **access arbitrage**, not cost saving, and the objective is **utilisation**, not
efficiency.

That inverts the usual reasoning. Included pools reset monthly, and capacity not used before the
reset is simply lost. So:

- **Token cost per unit of work is the wrong metric for this lane.** The 2026-09-23 trial charged
  ~5.24M tokens for 140 changed lines across 2 files. Measured as efficiency that looks terrible;
  measured against a pool that would otherwise expire unused, it is close to irrelevant.
- **The queue should be as wide as the door allows**, not as narrow as prudence would suggest for
  metered spend. A row costing nothing until it launches is worth enqueueing on the chance Grok Bot
  gets to it.
- **The real constraints are not money.** They are: which pool actually pays (below); Grok Bot's own
  weekly meter; and whether the work is cloud-*viable* at all.

## Cloud-viable means self-contained

A Cursor Cloud Agent clones **`mezivillager/hacer` alone**. It does not get the owner's workspace.
So a row is only viable if it needs nothing outside this repo and the public internet. Two rows
below were written against `../web-ide`, a sibling checkout, and would have failed on a missing
directory — their issues now say clone the public repo at a pinned commit.

Before enqueueing, check: no sibling checkout, no local secret, no browser the cloud VM lacks, and
no premise that has expired. **Re-run the issue's own verification command** — three issues queued
here needed a correction first (#193, #338, #199), which is the gap #394 owns.

## Which pool pays — still unanswered, and now it matters more

The trial's numbers do not reconcile. **Other Models 84% → 84%** (unchanged) while the usage API
reported **$8.26** charged; **Cursor Models 3% → 4%**; **Grok Bot weekly 2% → 3%**.
`cloud-queue.md` asserts Cloud Agents count as Other Models — the one pool that did not move.

This decides how wide to open the tap:

- If **Cursor Models** pays, it sat at **4%** — roughly a whole monthly pool unused, expiring
  **Oct 19**. Queue aggressively.
- If **Other Models** pays, it sat at **84%** with the same reset — thin headroom, and
  `cloud-queue.md` §Metering's stop-and-report gate is load-bearing.

**So the next batch records all three meters, before and after, with nothing else running.**
Whichever moves is the pool that pays. That single measurement is worth more than any row below.

## Who verifies what

`cloud-queue.md` has Grok Bot do the fresh-context verify on its own rows. That is right for most
work and wrong for one class: **`docs/harness/model-tiering.md` (merged 2026-09-23) puts `risk:2`
and any `src/core` / `src/simulation` change on Opus**, and a Cursor Cloud Agent verifier is not
that tier.

The division that keeps both rules intact: **cloud builds; engine and `risk:2` rows come back to
local Claude to verify.** Cheap capacity goes to volume, the expensive judgment stays where the
tier rule put it. Rows below say which applies.
