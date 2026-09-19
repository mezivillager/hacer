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
| Which projects, in what order, how picks rotate | `docs/portfolio.md` | row order, the six-slot cycle (`surfaces → harness → spine → aux → surfaces → harness`), the hand-in-hand rule, dormant-mode caps — *amended 2026-09-18 (#259): was the 2:2:1 ratio* |
| What a task must contain before an agent may take it | `WORK-SYSTEM.md` §2 (issue form) and the labels | acceptance criteria as tests, verification command, risk |
| Who may author pickable tasks | `scripts/backlog.mjs` allowlist (`BACKLOG_ALLOWLIST`) | the identities agents trust on a public repo |
| How a task is built | `.claude/skills/ha-prompt-it/SKILL.md` + `implementer-brief.md` | tiers, TDD mechanics, worktree rules |
| How a PR is judged | `verifier-brief.md` | what blocks, what is a nit, what must be tried |
| What must be green | `main-rules` ruleset (required check `ci`, 0 approvals, no bypass) + `AGENTS.md` definition of done | add a required check here after it is green on its own PR |
| PR size and shape | ADR-0013 (400 reviewable lines, one sub-issue per PR) — enforced by the `pr-hygiene` check (`scripts/pr-hygiene.logic.mjs`) | the budget numbers |
| Which PRs get a browser run, and which suites | ADR-0016 (critical = the PR changes the UI: `src/components`, `src/App.tsx`, `src/gates`, `src/nodes`, `src/store`, `src/utils`, `src/styles`, `index.html`, `e2e`, `playwright.config.ts`, later `src/surfaces`; or the `critical` / `sev:*` labels on the PR or an issue it links) — the `browser-qa` check (`scripts/browser-qa.logic.mjs`) runs `@store` only, cloud only, never a local gate; `@ui` (3D) runs only by hand via `e2e.yml`; locally, only suites that do not mount the 3D canvas — *amended 2026-09-19 (#282): was `src/store/actions` only, plus `@ui` on canvas paths* | the critical paths (`CRITICAL_PATHS`) |
| What the human still does | `WORK-SYSTEM.md` §7 (merge tiers) | opt a tier into auto-merge |
| What went wrong, and whether it was mechanised | `ledger.md` | second occurrence → a lint, test or hook |

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
| **verifier** (code) | a PR against its issue and the code | `verifier-brief.md` | one verdict comment |
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

## Budgets (cost limits)

Set 2026-09-19 at the owner's request ("we need to setup reasonable limit, especially for claude"; "subagents should be mainly opus for significant difficulty work, and sonnet only if it's routine and easy work").
Change them here, in a PR, like any other knob.

| Limit | Value | Where it is enforced |
|---|---|---|
| Coordinator model | the owner's choice per session — **Opus** typically, **Fable** for harder work | set by the owner when starting a session; not configured here |
| Default subagent model | **Opus** (`CLAUDE_CODE_SUBAGENT_MODEL=opus`) — significant work: features, fixes, design, verification of code, fidelity | `.claude/settings.json` `env` |
| Sonnet only for | routine, easy work: docs-only edits and their review, mechanical changes, issue/label housekeeping, gardening | an explicit `model: sonnet` per dispatch (or agent `model:` frontmatter) |
| Concurrent subagents per session | **4** (`CLAUDE_CODE_MAX_CONCURRENT_SUBAGENTS=4`; default is 20) | `.claude/settings.json` `env` |
| Subagent tokens per coordinator run | stop dispatching new work and report at **~2M** (summed from task notifications), unless the owner asked for a longer run | the coordinator (`ha-next`, `/autonomous`) |
| Agents after their PR | report and **stop** — never keep watching CI | `implementer-brief.md` |
| Cloud routines | **Sonnet** for routine runs (spikes, gardening), Opus when the run does significant work; one-off or at most weekly, change-triggered; at most **1** recurring routine until #255 reports | routine config |
| Cursor second opinion (local `cursor-agent`) | advisory, never a gate; standard `composer-2.5`, one run per PR head on `risk:1`/`risk:2` or `src/core`, `src/simulation`, `.github/workflows`, `scripts` changes; read-only config and 15-min timeout from `cursor-lane.md` §1. Bugbot is **not** used (owner, 2026-09-19: usage-based, not cost-effective) | the coordinator (wrapper: #296) |

Account-level caps only the owner can set: Claude **extra usage** (claude.ai → Settings → Usage) and
Cursor **on-demand spend limit** (cursor.com dashboard → Spending). Recommended values are in #255.

## Files

- `README.md` — this page.
- `ledger.md` — failures and what they became.
- `implementer-brief.md` — the brief a builder agent receives for one issue.
- `verifier-brief.md` — the brief a fresh-context verifier receives for one PR.
- `fidelity-brief.md` — the brief the fidelity role receives for one epic, ADR, spec or semantic PR.
- `fidelity-inbox.md` — proposals from fidelity reviews, waiting for the owner's approval.
- `routines/fidelity-digest.md` — the change-triggered re-check of the roadmap (ADR-0018 §5).
- `product-brief.md` — the brief the product role receives for a usability and design review.
- `product-inbox.md` — product-strategy proposals from product reviews, waiting for the owner's approval.
- `cursor-lane.md` — what Cursor can carry: the local `cursor-agent` second opinion (verified read-only setup, trial, budget) and keep/skip verdicts for the rest.
- `../research/2026-09-18-agent-readiness/` — why the process looks like this.
- `sessions/` — dated session records: the goal, the owner's rulings, what was built, the state at close, how to resume. Start with the latest one when picking the work back up.
