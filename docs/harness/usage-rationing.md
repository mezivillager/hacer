# Usage rationing — the Cursor lane's daily ration

Set 2026-09-21 at the owner's request: *"my plan for cursor usage is to ration our usage equally
across all days, so we don't consume it all in some days and then have days where we can't use it at
all."* Use the included capacity more — but evenly. `scripts/lane-budget.logic.mjs` is this same
policy as code, checked before every lane run.

**Why it exists:** that morning an unrationed research burst spent about **17M tokens in 40
minutes** — **49 reviews' worth, three days of even use** at the measured 347,838 per review — and
nothing would have said so until the lane stopped working. The ration makes that visible in advance.

## The ration, in tokens

Read in a browser on 2026-09-21: **Cursor** (`cursor.com/dashboard/usage`, Pro+) reports **tokens per
event**, every row typed "Included in Pro Plus", with an on-demand total of **zero**, and publishes
**no weekly quota meter and no dollar pool** — so "% of weekly" has no denominator and we do not
invent one. Observed: **43.6M included tokens over Sep 15–21**.

| Knob | Value | Where |
|---|---|---|
| Daily ration | **6,000,000 tokens** (43.6M ÷ 7 ≈ 6.23M, rounded down) | `DEFAULT_DAY_TOKENS` |
| Configurable | `HACER_LANE_DAY_TOKENS=<tokens>` | env, read by both runners |
| Burst ceiling | **12,000,000 tokens** — any configured budget above it is clamped, so one day can never eat three | `BURST_CEILING_TOKENS` |
| One review | **347,838 tokens** (measured on #305: ≈$0.10 at list price, 170 s, 84% cache reads) | `MEASURED_REVIEW_TOKENS` |

6M ÷ 348K is about **17 reviews a day**: the ration spreads usage, it does not starve the lane.

**Unused ration does not roll over.** Each local day starts at zero against its own 6M; the pool
resets on Cursor's schedule, not ours, so an idle Tuesday buys nothing on Wednesday. Day boundaries
are the machine's local midnight, never UTC.

## How a run is measured

Every `scripts/second-opinion.mjs` run appends one JSON row to
`<git-common-dir>/hacer-lane-runs/second-opinion.jsonl` (worktrees share it, so every worktree's runs
count against the same day). The day is the sum of what each row was **charged**:

- **A run that never reached a model is free.** It still writes a row — one whose usage is zero, not
  (as the issue put it) no row at all — marked `usageSource: "none"`, and is charged nothing.
- **A killed run is not free. Unknown is never zero.** Usage is reported *only* in the CLI's final
  `result` frame, so a run killed on the 15-minute timeout generated and was paid for while nothing
  measured it; its row records `usageSource: "estimated"` and `chargedTokens: 347838` with the
  reason, and its dollar column stays `null`. Without this, every timeout drained the pool invisibly.
- The filter is therefore **what the run was charged**, never the exit code — exit 6 also covers a
  `git status` check that failed long after the model was paid.
- **Spend is keyed on the *requested* model.** `resolvedModel` is `null` for this lane (the real
  `result` frame carries no model id under `model`, `modelId` or `selectedModel`), so the report says
  `keyed on the requested id` rather than pretending an id was confirmed.
- A malformed line is skipped and counted, never fatal: the file is append-only and a killed run can
  leave half a line behind.

**Dollars are a comparison column, never a bill.** `costOf()` prices the measured 4-tuple against the
checked-in rate card in `scripts/second-opinion.logic.mjs` (`MODEL_RATES`, from `cursor-lane.md`
§1.3). Every figure is **list price, not a bill**, and every line that prints one says so: not the
limit, not what Cursor charges, and the pool's size is unpublished. Per the measurement rules in
`README.md`, an unpriced row stays unpriced rather than counting as free.

## The hard guard: the "Included" label

The ration alone cannot tell included usage from on-demand billing — only the dashboard's `Type`
column can. So the last reading is checked in at `docs/harness/cursor-usage.json`:

```json
{ "readAt": "2026-09-21", "includedTokens": 43600000, "onDemandUsd": 0 }
```

The lane refuses when that reading shows **any on-demand usage** (it stops until the owner clears it
— never a silent spill into billing), when it is **missing or more than 7 days old**
(`OBSERVATION_MAX_AGE_DAYS`), and when it is **dated more than a day in the future** — a mistyped
year would otherwise give a negative age that never trips the staleness limit, leaving the guard
permanently vacuous. An unconfirmed guard is not a guard.

**Re-reading it.** No supported API exposes these numbers, so this is by hand or with a browser: open
`cursor.com/dashboard/usage` over the last 7 days; note the included token total and confirm every
row's `Type` reads "Included in Pro Plus"; note the on-demand total (Spending → on-demand, `0` when
none); update `docs/harness/cursor-usage.json` and commit.

## When the ration is spent

`node scripts/lane-budget.mjs` prints the state at any time and exits **7** when one more run does
not fit; `second-opinion.mjs` runs the same check before it fetches or spawns anything, and exits
**7** with the reason. **Exit 7 is a skip, not a failure**: the coordinator drops the second opinion
for that PR and proceeds without it — the lane was always advisory (`cursor-lane.md` §1.6). It never
falls back to another model, another provider, or anything that bills. Changing a number here is a
PR, like every other knob in `README.md`.
