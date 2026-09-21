# Model tiering by role — what each tier catches, and what it costs

Research note for #255, 2026-09-21. The rule it sets: **a role's tier is bought with a measurement,
not with a price list.** Where a tier below Opus is asserted rather than measured, this note says so.

The first execution run spent ~1.4M subagent tokens on 8 verified PRs at one tier: builders
150–270k each, verifiers 110–190k each. The question is not whether a cheaper tier is cheaper.

## 1. The measurement (2026-09-21)

`verifier-brief.md` was replayed on Sonnet and on Haiku 4.5 against two already-merged PRs, at the
exact commit the original verifier reviewed: #238 at `4fd5238`, which carried a real defect, and
#245 at `697dbb0`, which was clean. Neither replay agent was allowed to read the existing verdicts.

| Replay | #238 @ `4fd5238` (defective) | #245 @ `697dbb0` (clean) | Tokens, both PRs |
|---|---|---|---|
| Opus-class (the recorded verdicts) | BLOCK — stale pin state in `scratchCopy`, with a repro | PASS | 110–190k per PR (run average) |
| **Sonnet** | BLOCK — the same defect, found with its own repro, plus three findings the original verdict did not raise (no ceiling on a caller-supplied `maxInputBits`; a `NaN` budget silently disables it; the PR body's own DoD table came from later commits) | PASS — criteria cited, three nits each probed | **239,831** |
| **Haiku 4.5** | BLOCK — but it **missed the defect**: it marked the broken criterion ("evaluates on a scratch copy, no mutation") *satisfied*, citing `src/simulation/truthTable.test.ts:195`. It blocked instead on a 5 s timeout in `src/components/ui/CompactToolbar.test.tsx`, a file the PR does not touch | PASS — thinner; self-disclosed "reviewed only 2 files; 202-line test file spot-checked only" | **89,198** |

**Verdict-letter agreement is not evidence of verification quality.** On the letters alone Haiku
scored 2/2 against the recorded verdicts. On the substance it missed the only real defect in the
pair and raised a false blocker from a failure the Sonnet replay did not see at the same commit
(126 files, 1621 passed, 0 failed). A tiering decision taken from letters would have been exactly
backwards.

The deciding capability is running the repro, not reading the diff. Both real blockers this harness
has caught were found by running something — the `scratchCopy` repro on #238, a `planReady` call on
#294 — and the non-Claude second opinion, which cannot run commands, caught **0 of 2**
(`cursor-lane.md` §1.4). Haiku *could* run commands and still missed it: the capability is
necessary, not sufficient.

## 1a. What happened when Sonnet verified live (2026-09-21)

The replay in §1 hid the verdicts but could not hide that later commits existed. These four are the
stronger evidence: real PRs, no known answer, nobody had reviewed them first.

| PR | Verdict | What it found |
|---|---|---|
| #312 | BLOCK | the new e2e specs failed in CI `browser-qa` — which the builder could not run locally and does not watch. The only layer that could see it was a verifier reading the PR's own CI logs. **This was a `src/simulation` change**, and it is why that path is a candidate to move later rather than never |
| #319 | BLOCK | a killed lane run recorded zero usage, so the ration could be evaded by killing runs; and a future-dated reading never went stale |
| #320 | BLOCK | every fetch failure was reported as a timeout; and an allowlist entry was equivalent to arbitrary shell |
| #324 | PASS | re-derived the 66/68 = 134 file split independently (zero overlap, zero gap), reran the suite at both `origin/main` and the PR head, and triggered both new throw sites by hand. It also flagged, unprompted, that the tier table assigned this PR to Opus |

None of these is a verdict letter matching a known answer. Each is a defect found, or an invariant
re-derived, by an agent that could not look the answer up.

**The honest limit.** Every one is `risk:1`. There is no live Sonnet `risk:2` verdict, which is why
`risk:2` and the engine stay on Opus. And a tier that passes four times is not proven — §2's row
names what would move it back, and the ledger is where an overturned verdict gets recorded.

## 2. The assignment

| Role | Tier | Evidence | What would change it |
|---|---|---|---|
| coordinator | Opus — the owner's choice per session (`README.md` Budgets) | it decides what every other agent does; one wrong dispatch wastes a whole builder run (150–270k) | unmeasured — a replay of one `ha-next` pick that chose the same issue and wrote the same prompt |
| builder, `risk:1`/`risk:2` | Opus | §1 replayed the verifier, not the builder; the owner's Budgets ruling (2026-09-19) already puts significant work on Opus | a Sonnet builder replay landing the same diff on a merged `risk:1` PR and passing a fresh Opus verifier |
| builder, `risk:0` (docs, mechanical) | Sonnet | Sonnet ran the full definition of done unaided in both replays, and reproduced #245's own negative test | a Sonnet `risk:0` PR blocked for something a careful reading pass should have caught |
| verifier, `risk:2`, or any `src/core` / `src/simulation` change | Opus | the engine is where a missed defect is least recoverable, and Sonnet's one positive on engine code (#312) is a single data point | three live `risk:2` pairs where a Sonnet verdict and an Opus second pass agree |
| verifier, `risk:0` / `risk:1` elsewhere | **Sonnet** (owner's call, 2026-09-21) | §1's replay plus **four live outings** (§1a): three blocks with defects nobody knew were there, one pass with an independently re-derived invariant | one `overturned` Sonnet verdict — a PASS whose defect a later pass finds, or a BLOCK that does not survive |
| QA (browser) | Opus | the brief is still in flight (#257); no replay is possible until it exists | a QA replay once the brief lands |
| product | Opus (pinned in `.claude/agents/hacer-product.md`) | judgment over screenshots and code; unmeasured | a replay against a past review's filed issues |
| fidelity | Opus (pinned in `.claude/agents/hacer-fidelity.md`) | the highest-consequence verdict here, and Haiku's failure mode — a broken criterion marked satisfied, with a citation — is precisely what a fidelity verdict must never do | a replay on an artifact with a known unsound claim |
| triage — draft the issue | Sonnet | shaping prose into the issue form is mechanical | — |
| triage — the `agent-ready` call | Opus | README's "queue up" row already needs judgment at `risk:2` | — |
| docs gardening | Sonnet; Haiku only where a command's exit code *is* the verdict | Budgets already assigns gardening to Sonnet; Haiku did reproduce #245's negative test correctly | if a sweep's result is decidable by a script, mechanise it instead (the ledger's standing rule) |
| retro (a ledger row) | Sonnet | summarising what happened into one row is mechanical | the row implies a mechanism change → Opus writes it |
| research | Opus | two of the first research drafts were wrong at Opus-class and only a fresh-context fact-check caught them (`ledger.md`, 2026-09-18) | — |

Every tier keeps the fresh-context adversarial review; cheaper is never a reason to skip it.

## 3. Open and free models — the four lanes #255 asked about

| Lane | Ruling |
|---|---|
| dead-path / format checks | **No model at all.** These are already deterministic scripts — `scripts/check-doc-paths.mjs`, `scripts/pr-hygiene.logic.mjs`, `scripts/skills.logic.mjs` — which are free, repeatable and never confidently wrong. The ledger's rule is that the second occurrence becomes a lint, a test or a hook, not a cheaper reviewer. |
| docs-only verification | **Sonnet** (§2). Haiku passed #245 too, but disclosed that it read 2 files. |
| issue triage drafts | **Sonnet** drafts; Opus makes the `agent-ready` call. Haiku's failure mode writes an acceptance criterion that reads satisfied and is not — the same defect, one step earlier and harder to catch. |
| a first pass before the paid verifier | **Advisory, never a gate** — unchanged from `cursor-lane.md` §1.6. Measured: 0 of 2 real blockers from a reviewer that cannot run commands. A first pass that cannot run the repro buys latency, not signal. |
| local (Ollama-class) or free hosted models | **Unverified — not tried.** §1 sets the bar: a candidate must drive the whole loop (worktree, `pnpm install --frozen-lockfile`, the suite, throwaway tests) and still reproduce #238's defect. Evaluate any candidate by replaying this same pair, and score it on the defect, never on the verdict letter. |

## 4. Cost

List prices per million tokens (input / output): Opus 5 $5 / $25, Sonnet 5 $2 / $10, Haiku 4.5
$1 / $5 — cached 2026-06-24; re-check before quoting them anywhere that matters. Sonnet reviewed
both PRs for 239,831 tokens where an Opus verifier spent 110–190k on one, so a `risk:0` Sonnet
verdict costs roughly a third of an Opus one: a similar token count at 40% of the per-token price.
Haiku was 89,198 for the pair — about a fifth of the price for a third of the tokens — and did not
do the job. For scale, an Opus builder on a scripts-and-tests PR the same day used 191,755 tokens.

**Tokens per merged PR** is now the fourth metric (`README.md`): sum the usage reports of every
agent that touched the PR. These totals are whole-run self-reports and are not split into input,
output and cache reads, so they are token-count ratios, not a measured bill.

## 5. Limits, and what could not be verified

- **n = 2 PRs**, one defective and one clean, one replay per tier and no repeats — so nothing here
  carries a variance estimate. A single Sonnet success is why the `risk:1`/`risk:2` verifier does
  not move.
- The Sonnet replay could see from `git log` that two commits followed `4fd5238`, a weak hint that
  the PR was later fixed. It did not read them; a cleaner replay hides history past the commit.
- Haiku's blocker may be environmental: three agents and a `pnpm install` were running on the
  laptop, and a 5 s UI-test timeout under load is the likely cause. Either reading is a finding — a
  verifier that cannot tell "my machine is loaded" from "this code is broken" blocks the wrong
  thing — but the missed defect stands on its own either way.
- No builder was replayed at any tier. Every builder row is inference from the verifier measurement
  plus the Budgets ruling, not a measurement.
- `scripts/agent-orient` (#156) does not exist yet, so the fourth metric is specified in `README.md`
  and must be printed there when that script is built.
- The replay notes live in the coordinator's run directory, outside this repo; this note is the
  record of what they said.
