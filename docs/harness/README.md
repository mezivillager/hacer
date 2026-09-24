# The harness — how work gets chosen, built, verified and merged

This directory *is* the process. Everything an agent follows lives here or is linked from here, and
it is changed the same way as anything else: an issue under the `harness` epic, a small PR, a
merge. If a step below is wrong, fix it here — not in a chat.

## The loop, end to end

```
  docs/portfolio.md ──► GitHub Issues ──► backlog.mjs ready ──► claim ──► ha-prompt-it (Light)
   (order, pick rule)    (epics → tasks)   (what is pickable)              issue = spec
                                                                            red → green → DoD
                                                                                 │
  ledger.md ◄── retro ◄── merge on green + PASS ◄── verifier (fresh context) ◄── PR (one sub-issue,
                                                                                 ≤ 400 reviewable lines)
```

| Step | Where the knob lives | What you can adjust |
|---|---|---|
| Which projects, in what order, how picks rotate | `docs/portfolio.md` | row order, the six-slot cycle (`foundation → foundation → harness → foundation → spine → aux`), the foundation gate, the hand-in-hand rule, dormant-mode caps — *amended 2026-09-18 (#259): was the 2:2:1 ratio; amended 2026-09-21 (#330) while the foundation plan (#318) runs: was `surfaces → harness → spine → aux → surfaces → harness`* |
| What a task must contain before an agent may take it | `WORK-SYSTEM.md` §2 (issue form) and the labels | acceptance criteria as tests, verification command, risk |
| Who may author pickable tasks | `scripts/backlog.mjs` allowlist (`BACKLOG_ALLOWLIST`) | the identities agents trust on a public repo |
| How a task is built | `.claude/skills/ha-prompt-it/SKILL.md` + `implementer-brief.md` · agent `.claude/agents/hacer-builder.md` | tiers, TDD mechanics, worktree rules |
| How a PR is judged | `verifier-brief.md` | what blocks, what is a nit, what must be tried |
| What must be green | `main-rules` ruleset (required checks `ci`, `pr-hygiene`, `browser-qa`, 0 approvals, no bypass) + `docs/harness/implementer-brief.md` definition of done — when one of them will not go green, read *When a required check is stuck* below | add a required check here after it is green on its own PR |
| PR size and shape | ADR-0013 (400 reviewable lines, one sub-issue per PR) — enforced by the `pr-hygiene` check (`scripts/pr-hygiene.logic.mjs`, which also carries the layer-ratchet growth rule — row below). Two exemptions — *amended 2026-09-21 (#326)*: a **deletion-only** PR is outside the budget ("refactor deletion prs can be any size they need to be"), where deletion-only means it deletes more than it adds and adds at most 5 lines to a file, 20 in all and 5% of what it deletes — the fix-ups a removal forces, since the check sees counts, never the diff; and **research evidence** (`docs/research/*/evidence/`) is excluded, while the report beside it counts. Both reasons print in the check's output; the linked-issue rule is unaffected | the budget numbers, `FIXUP_MAX_*` |
| Which layer may import what | `.dependency-cruiser.cjs` (import direction, cycles, engine packages, `src/` → `e2e/`) and `eslint.config.js` → "the engine layer" (`console.*`, DOM globals — globals are not dependencies, so no import graph can see them). Today's violations are recorded in `.dependency-cruiser-known-violations.json` and `eslint-suppressions.json`; a **new** one fails. Checked by `pnpm run lint:layers`, which `pnpm run lint` runs, so it is in the definition of done and in CI. After fixing one, `pnpm run lint:layers:shrink` drops it from the baseline for good — the baseline only ever shrinks, so a fixed violation cannot be re-added, and a stale ESLint suppression fails the lint until it is pruned. The line it prints is the foundation plan's one tracked metric (#329, 2026-09-23: 16 production edges · 8 test-only · 10 cycle edges in 3 cycles · 35 engine globals). Arming a *new* rule is the one thing shrink-only cannot do, so it needs the full `depcruise … --baseline` write — which also absorbs anything else broken at that moment, silently, in a file nobody line-reviews. `pr-hygiene`'s **`ratchet`** rule is what catches that (#406): it reads the baseline at the PR's merge base and at the head and fails any row that arrives under a rule name the PR does not **newly declare in `.dependency-cruiser.cjs`**, naming it. Every verdict is a **set** difference — the row count judges nothing, so fixing one violation while absorbing another still fails (#432; it used to warn, which is the ordinary shape of a refactor moving files between layers). Growth under a rule name that config declares for the first time in the same PR, with nothing removed, passes (#404's real 34 → 77 is a test — and #404 edited the config, as any real arming must); rows leaving *and* arriving under newly declared names warns, because a rule **renamed** there to carry its old rows looks exactly like an arming in the baseline. Deriving "a new rule is being armed" from the baseline *rows* instead was the round-2 hole (#432): `engine-no-ui-packages` sits in the config with 0 of 72 rows, so a real `zustand` import under `src/core/` plus the documented baseline write read `PASS ratchet=armed` with no config edit, no declaration and nothing reviewable, and an invented rule name passed the same way — a hole that widened as the ratchet shrank. The residual that remains cannot be closed in the baseline: a rule *declared* in the config in the same PR — renamed, copied, or widened to cover the edge — reads `armed` or `swapped`, and the fence on it is that the declaration is an added line in a reviewed file. `Baseline-growth: <rule>: <from> → <to> — <why>` in the PR body turns a fail into a warn, on the record: it has to **name every row** it excuses (prose only — a line in a fenced code block is an example, not a claim), and `ratchet=absorbed` stays on the `HYGIENE:` line either way. **One caveat, and it is where a reader trips:** `pr-hygiene.yml` runs on `pull_request_target`, so GitHub always uses `main`'s copy — the rule never checks the PR that changes it, and a change to it takes effect for every PR the moment it lands (§ *When a required check is stuck*, *One gap*). `eslint-suppressions.json` has the same hole and no guard yet (#429) | the rules themselves — widen one only with a measurement, and narrow any rule that fires on legitimate code rather than suppressing it case by case |
| Which PRs get a browser run, and which suites | ADR-0016 (critical = the PR changes the UI: `src/components`, `src/App.tsx`, `src/gates`, `src/nodes`, `src/store`, `src/utils`, `src/styles`, `index.html`, `e2e`, `playwright.config.ts`, later `src/surfaces`; or the `critical` / `sev:*` labels on the PR or an issue it links) — the `browser-qa` check (`scripts/browser-qa.logic.mjs`) runs `@store` only, cloud only, never a local gate; `@ui` (3D) runs only by hand via `e2e.yml`; locally, only suites that do not mount the 3D canvas — *amended 2026-09-19 (#282): was `src/store/actions` only, plus `@ui` on canvas paths* | the critical paths (`CRITICAL_PATHS`) |
| What the human still does | `WORK-SYSTEM.md` §7 (merge tiers) | opt a tier into auto-merge |
| What went wrong, and whether it was mechanised | `ledger.md` | second occurrence → a lint, test or hook |

## When a required check is stuck

`gh pr checks` reports everything green, `gh pr view <n> --json mergeStateStatus` says `BLOCKED`,
and nothing on the PR explains it. Two things look like that and only one is a fault.

**Not a signal:** `gh api repos/mezivillager/hacer/commits/<sha>/status` returning `pending`. That
endpoint reports *legacy commit statuses*, which this repo never posts — it answers
`state=pending total_count=0` on every commit, merged ones included. Read the check runs instead.

**The fault (#295):** a `cancelled` check run under a required context.

```sh
gh api repos/mezivillager/hacer/commits/<sha>/check-runs --jq \
  '.check_runs[] | select(.name=="ci" or .name=="pr-hygiene" or .name=="browser-qa")
   | "\(.name) \(.conclusion) \(.started_at)"'
```

GitHub judges a required context by the **newest** check run carrying that name, so a single
`cancelled` run blocks the merge although an older run of the same context succeeded.

Recovery, on the same SHA, with no new commit and no force-push:

```sh
gh run list -R mezivillager/hacer --branch <branch> --json databaseId,name,conclusion
gh run rerun <id> -R mezivillager/hacer      # one cancelled run, then wait for it
```

Re-run them **one at a time**: the re-runs join the same concurrency group, and before #295 they
cancelled each other exactly as the originals had — that is what the second round of `cancelled`
runs on #360 was. `gh pr update-branch --rebase` also clears it, but usually no-ops (`PR branch
already up-to-date`), since an agent's branch is normally current with `main`.

**Why it happens, and what now stops it.** GitHub sends one webhook action *per label*, so
`gh pr edit --add-label a,b` on a fresh PR delivers `opened`, `labeled`, `labeled` within seconds;
every workflow listing `labeled` starts a run per action. `.github/workflows/pr-hygiene.yml` and
`.github/workflows/browser-qa.yml` now set `cancel-in-progress: false`, so a run that has started
always finishes — GitHub still keeps only one *pending* run per group, and a pending run creates no
job and therefore no check run. `scripts/required-checks.logic.mjs` fails the unit suite if either
is turned back on. Both workflows genuinely need the `labeled` trigger, so narrowing `types:`
was not an option: `size-override` and `dependencies` change the `pr-hygiene` verdict (#360's
`pr-hygiene` went red, then green when `size-override` was applied) and `critical` / `sev:*`
change `browser-qa`'s.

**One gap.** `pr-hygiene.yml` runs on `pull_request_target`, so GitHub always uses **`main`'s** copy
of it. A PR that changes that file cannot test its own change; the change takes effect for every PR
the moment it lands on `main`. Use the recovery above on any PR opened before it landed.

## The five sentences it answers

| You say | What happens |
|---|---|
| "list the priority projects" | `node scripts/backlog.mjs projects` — rows in portfolio order with open / ready / in-progress / needs-human counts and the next pick |
| "what's open in *surfaces*?" | `gh issue view <epic#>` or `backlog.mjs tasks <slug>` (#149 follow-up) |
| "what can you do next?" | the **`ha-next`** skill: `backlog.mjs ready`, present the top pick with its why, claim it, build it through `ha-prompt-it`, PR, verifier, merge |
| "work the next N" | locally: `/autonomous` over `ha-next` N times; in the cloud: N `claude --cloud` sessions, one issue each |
| "queue up: …" | triage: shape the idea into issues in the form, split to fit the budget, `agent-ready` only if risk:0/1 and the criteria are unambiguous; otherwise `needs-human` — *one exception:* product-role polish issues may be `agent-ready` at `risk:2` when the fix is concrete (owner's ruling on #269; `product-brief.md`) |

## Standing roles

Four fresh-context roles judge work; none of them builds it, and none decides strategy for the owner.

| Role | Judges | Brief | Writes |
|---|---|---|---|
| **verifier** (code) | a PR against its issue and the code | `verifier-brief.md` · agent `.claude/agents/hacer-verifier.md` | one verdict comment |
| **QA** (browser) | a critical PR's changed flow, in a browser against the preview | `qa-brief.md` (#257, in flight) | one QA verdict |
| **fidelity** (engineering truth) | an epic, ADR, spec or semantic PR against physics, digital logic and the domain's oracle | `fidelity-brief.md` · ADR-0018 · agent `.claude/agents/hacer-fidelity.md` | one verdict comment; proposals queued in `fidelity-inbox.md` for the owner's approval, never filed as issues |
| **product** (usability & design) | the app's screens and flows, from the cloud UI tour (`.github/workflows/ui-tour.yml`) and the code, or one UI-facing PR or issue | `product-brief.md` · agent `.claude/agents/hacer-product.md` | at most five `project:polish` issues per review under #144, filed directly (owner, 2026-09-19); strategy proposals queued in `product-inbox.md` for the owner's approval |

## Rules that are conventions, not controls (yet)

Agents act under the owner's GitHub identity, so every label an agent respects is one an agent could
also apply. The ruleset (required `ci`, no bypass) is the only hard control today. A separate bot
identity (harness epic) turns labels into controls. Until then: the allowlist in `backlog.mjs` reads
issue bodies and comments only from trusted authors, `bot-filed` issues are never `agent-ready`
without the owner, and anything shaped from outside content is `needs-human`.

## Cloud sessions and routines

They clone this repo and nothing else. Anything the loop needs must be in here — which is why
`ha-prompt-it`, the North Star and these briefs moved in. `/autonomous` (the local queue driver) is
a personal skill and is *not* available there; in the cloud, one session = one issue.

## Measurement rules

Set 2026-09-21, after a lane run exited 0 while `verdict=PASS` and its only act had been deleting a
file, and a separate run reported `UNPARSED` for a run that never reached a model at all — both
caught by looking, not by the exit code. Applies to every number this harness reports about itself.

- **exit 0 is not acceptance** — acceptance is the coordinator's decision about a result.
- **Unknown cost stays unknown** — `0` is only known when the basis is measured or included.
- **Failed attempts stay in the denominator** — cost per accepted task counts every attempt.
- **Record the model a run resolved to**, not only the one requested.
- **A successful demo is not qualification** — label a smoke test as a smoke test.
- **Never rank lanes by the harness's own dollar figure** — it prices every model at Anthropic's
  rates (evidence: `docs/harness/cursor-lane.md`).

## Budgets (cost limits)

Set 2026-09-19 at the owner's request ("we need to setup reasonable limit, especially for claude"; "subagents should be mainly opus for significant difficulty work, and sonnet only if it's routine and easy work").
Change them here, in a PR, like any other knob.

| Limit | Value | Where it is enforced |
|---|---|---|
| Coordinator model | the owner's choice per session — **Opus** typically, **Fable** for harder work | set by the owner when starting a session; not configured here |
| Default subagent model | **Opus** (`CLAUDE_CODE_SUBAGENT_MODEL=opus`) — significant work: features, fixes, design, fidelity, and verification of `risk:2` or engine changes | `.claude/settings.json` `env` |
| Sonnet for | routine, easy work: docs-only edits and their review, mechanical changes, issue/label housekeeping, gardening — **and verifying any PR that is not `risk:2` and touches neither `src/core/` nor `src/simulation/`** (`model-tiering.md` §2) | an explicit `model: sonnet` per dispatch (or agent `model:` frontmatter) |
| Concurrent subagents per session | **4** (`CLAUDE_CODE_MAX_CONCURRENT_SUBAGENTS=4`; default is 20) | `.claude/settings.json` `env` |
| Subagent tokens per coordinator run | stop dispatching new work and report at **~2M** (summed from task notifications), unless the owner asked for a longer run | the coordinator (`ha-next`, `/autonomous`) |
| Agents after their PR | report and **stop** — never keep watching CI | `implementer-brief.md` |
| Cloud routines | **Sonnet** for routine runs (spikes, gardening), Opus when the run does significant work; one-off or at most weekly, change-triggered; at most **1** recurring routine until #255 reports | routine config |
| Cursor second opinion (local `cursor-agent`) | advisory, never a gate; standard `composer-2.5`, one run per PR head on `risk:1`/`risk:2` or `src/core`, `src/simulation`, `.github/workflows`, `scripts` changes; read-only config and 15-min timeout from `cursor-lane.md` §1. Bugbot is **not** used (owner, 2026-09-19: usage-based, not cost-effective) | the coordinator (wrapper: #296) |
| Cursor daily ration | **6M tokens a local day** (12M burst ceiling), ≈17 measured reviews; the lane is skipped with exit 7 when the day is spent or included usage is unconfirmed — the policy, its arithmetic and the dashboard re-read are in `usage-rationing.md` | `scripts/lane-budget.mjs`, run by `scripts/second-opinion.mjs` before every lane run (#302) |

Which tier each role gets, the replay that decided it, and what would change it: `model-tiering.md`
(#255). It **refines the two rows above, and on one point overrides them**: verification is tiered by
the PR, not by the word "significant" — `risk:2` and engine changes on Opus, everything else on
Sonnet. Where the table above and `model-tiering.md` disagree about verification, `model-tiering.md`
is the one to follow.

Account-level caps only the owner can set: Claude **extra usage** (claude.ai → Settings → Usage) and
Cursor **on-demand spend limit** (cursor.com dashboard → Spending). Recommended values are in #255.

**Reading Claude's own meters is not a matter of looking at the page.** A JSON endpoint behind
Settings → Usage returns the session, weekly-all and premium-tier percentages as numbers; the recipe,
the field to read (`limits`), and why it needs a real browser session are in `usage-rationing.md`.
Read it before dispatching a batch of agents — the meter does not move linearly with tokens.

## What to measure (four numbers)

Median reviewable lines per PR · the owner's minutes per merged PR · escaped defects, found after
the gates passed (each adds a test at the layer that missed it) · **tokens per merged PR**, summed
from the subagent usage reports of every agent that touched it. The conformance pass count is
already a gate. The first three come from `WORK-SYSTEM.md` §9; the fourth was added by #255 —
the first reading is ~1.4M subagent tokens for 8 verified PRs (~175k each) on the first execution
run. `scripts/agent-orient` (#156) prints all four once it exists; until then the coordinator
reports the number when it reports the run.

## Multiple coordinators and paused claims

The loop does not assume a single chat. **Product progress** is in portfolio, Issues, claim refs,
PRs, and `ledger.md`. **Who is coordinating, and why a claim is idle**, is not — unless written down.

- Claim comments name `Claimed by`, `Intent` (`building` | `paused:<reason>` | `handing-off`), and
  an optional `Handoff:` path — see `sessions/COORDINATOR-HANDOFF.md` and `ha-next` §2.
- Prefer **not claiming** while blocked on metering or other pauses that delay the builder; release
  or mark `paused:` if a claim already exists.
- At orient, list open `claim/*` refs and any `sessions/*-handoff.md` (until #156 prints them).

## Files

- `README.md` — this page.
- `COVERAGE.md` — one owner per rule: which file states each standing rule, and why the rest link to it.
- `ledger.md` — failures and what they became.
- `implementer-brief.md` — the brief a builder agent receives for one issue.
- `verifier-brief.md` — the brief a fresh-context verifier receives for one PR.
- `fidelity-brief.md` — the brief the fidelity role receives for one epic, ADR, spec or semantic PR.
- `fidelity-inbox.md` — proposals from fidelity reviews, waiting for the owner's approval.
- `routines/fidelity-digest.md` — the change-triggered re-check of the roadmap (ADR-0018 §5).
- `product-brief.md` — the brief the product role receives for a usability and design review.
- `product-inbox.md` — product-strategy proposals from product reviews, waiting for the owner's approval.
- `model-tiering.md` — which model tier each role gets, measured by replaying the verifier brief.
- `cursor-lane.md` — what Cursor can carry: the local `cursor-agent` second opinion (verified read-only setup, trial, budget) and keep/skip verdicts for the rest.
- `usage-rationing.md` — the Cursor lane's daily token ration, how a run is measured, and the dashboard reading the "Included" guard rests on (`cursor-usage.json`).
- `../research/2026-09-18-agent-readiness/` — why the process looks like this.
- `sessions/` — dated session records: the goal, the owner's rulings, what was built, the state at close, how to resume. Start with the latest one when picking the work back up.
- `sessions/COORDINATOR-HANDOFF.md` — claim-comment fields, when to write a `*-handoff.md`, and how a second coordinator resumes or releases idle claims. Product “what’s next” still comes from `docs/portfolio.md` and Issues; handoffs carry **coordinator meta-state** only.
- `cloud-queue.md` — standing Claude → Grok Bot queue for cloud-heavy work (Cloud Agent builds, long browser QA, large install/build/test). Local Claude enqueues; Grok Bot runs those rows. Not a second picker for ordinary local work.
- `sessions/cloud-queue-inbox.md` — the live inbox for that queue. Append rows; do not invent state.
