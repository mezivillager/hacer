# Continual refinement: keeping the harness improving without letting it bloat

**Question (#271):** what do practitioners do to keep an agent harness improving from practice,
without each lesson adding weight, and what cadence should HACER run? **Method:** primary sources
fetched on 2026-10-15, quoted where the wording matters; a secondary source is named as one. The
answer is built into `docs/harness/retro-brief.md` and `docs/harness/README.md` § *How this process
changes*; the first run's output is in `docs/harness/harness-inbox.md`.

## 1. What practitioners do

### 1.1 Turn each failure into a mechanism, not a paragraph

- Mitchell Hashimoto's step "Engineer the Harness": when an agent makes a mistake, "you take
  the time to engineer a solution such that the agent never makes that mistake again". He uses two
  fixes. A simple mistake gets a line in `AGENTS.md`, and "each line in that file is based on a bad
  agent behavior". A harder one gets "actual, programmed tools", such as screenshot scripts and
  filtered test runs. [S1]
- OpenAI's Codex team, as summarised by Birgitta Böckeler, enforced its architecture "by custom
  linters and structural tests". It also ran a recurring "garbage collection" process that looks for
  drift and has agents propose fixes. OpenAI's own post returned HTTP 403 when fetched, so this rests
  on the secondary account. [S2, S3]
- Anthropic's Claude Code guide says the same about instruction files. A rule that must hold "every
  time with zero exceptions" belongs in a hook, because file instructions "are advisory" and "hooks
  are deterministic". For an over-long file: "If Claude already does something correctly without the
  instruction, delete it or convert it to a hook." [S4]
- HumanLayer: "Never send an LLM to do a linter's job." This is a practitioner's rule of thumb. [S5]

HACER already has this rule. `docs/harness/ledger.md` says the second occurrence of a failure
"becomes a mechanism", and only what cannot be mechanised goes into `AGENTS.md`. What it lacks is a
step that checks the rule was applied. L042 records the cost of that gap: one cause recurred six
times over four days because "the ledger rule … was not applied".

### 1.2 Keep a failure record, and review it on a schedule

- Google's SRE book says: "An unreviewed postmortem might as well never have existed." It calls for
  "regular review sessions for postmortems", and shares one postmortem a month across the
  organisation. Blameless review is "a tenet of SRE culture". [S6]
- Anthropic's evals guide builds the regression suite from the failure record: "20-50 simple tasks
  drawn from real failures is a great start". Regression evals should hold "a nearly 100% pass rate".
  [S7]

The ledger is HACER's failure record. Nobody reviews it as a whole: each row is written once, by the
coordinator that hit the failure. Rows marked `partly` or `no` stay that way unless a later failure
happens to touch them. L055 says of itself "it is due a mechanism", and nothing was filed (§4).

### 1.3 Test the instructions, not only their text

- Anthropic's skill-creator update added a benchmark mode. It runs "A/B comparisons: two skill
  versions, or skill vs. no skill". It also warns that "a skill that worked well last month might
  behave differently today". [S8]
- The same post: "Capability uplift skills may become less necessary as models improve. Evals tell
  you when that's happened." [S8]

HACER pins the text of its briefs and agent files (`scripts/skills.logic.mjs`, #299, #391). A pin
proves that a rule is still written down. It does not prove that the rule changes what an agent
does. The only behavioural test of a brief here is `docs/harness/model-tiering.md`'s verifier
replay: two PRs, scored on the defect. **Evidence is thin:** no brief or skill has a with/without
comparison, so nobody can say which rules are load-bearing.

### 1.4 Stress-test the harness: remove components and see what breaks

- Anthropic's harness-design post: "every component in a harness encodes an assumption about what the
  model can't do on its own". Those assumptions "are worth stress testing" and "can quickly go stale
  as models improve". The author dropped context resets once Opus 4.5 no longer needed them. A
  wholesale simplification did not match performance, so he switched to "removing one component at a
  time and reviewing what impact it had". He advises that "when a new model lands, it is generally
  good practice to re-examine a harness". [S9]
- "Building effective agents" gives the rule behind this: "consider adding complexity only when it
  demonstrably improves outcomes". [S10]

So pruning is one component at a time, against a measured outcome, and it is due again whenever the
model changes. HACER has no prune step. Every component added since 2026-09-18 is still in place.

### 1.5 Budget the always-loaded text, and prune by deletion, not by rewriting

- Claude Code's guide gives a test for each line: "Would removing this cause Claude to make
  mistakes?" If not, cut it. Its warning: "Bloated CLAUDE.md files cause Claude to ignore your actual
  instructions!" It also says to "prune it regularly". [S4]
- HumanLayer reports a consensus that under 300 lines "is best". It also says frontier models follow
  "~ 150-200 instructions with reasonable consistency". Both are practitioner claims, and neither has
  been measured here. [S5]
- **A counterweight:** the ACE paper names two failure modes of self-editing contexts. "Brevity bias"
  drops domain insights in favour of concise summaries. "Context collapse" is "where iterative
  rewriting erodes details over time". Its fix is "structured, incremental updates". [S11]

Taken together: keep the always-loaded files under a budget, and cut whole rules that fail the
removal test. Do not rewrite rules into shorter summaries. HACER already budgets `AGENTS.md` at 120
lines (`scripts/hooks/docLineBudget.logic.mjs`). The briefs have no budget, and the ledger is
append-only by design, which matches ACE's advice.

## 2. Where the evidence is thin

- **Cadence numbers are choices, not findings.** No source measures how often an agent harness should
  be retrospected. SRE's reviews are scheduled, and Anthropic's re-examination is triggered by a new
  model. "Every 5 merged PRs" (#271) and "quarterly" are HACER's own starting values, to be tuned
  from the run log.
- **The OpenAI account is second-hand** (403 on fetch, 2026-10-15).
- **No controlled study** shows that a retro role improves an agent loop. Every source reports its
  own practice.
- **Line budgets** rest on practitioner consensus. The 150–200 instruction figure is one blog's
  claim.

## 3. What HACER has, and the gap

| Practice | HACER today | Gap the retro role closes |
|---|---|---|
| failure → mechanism (1.1) | ledger rule; `ha-next` §6 one-line retro per PR | nobody checks the rule fired: L055 is unfiled, L042 recurred six times |
| reviewed failure record (1.2) | ledger rows, session records' "What recurred" | no scheduled review; the records' recurrences often never reach the ledger |
| instruction evals (1.3) | text pins (`skills.logic.mjs`); one verifier replay | out of scope here; the role can propose a replay when a rule's value is disputed |
| stress-test / prune (1.4) | none | a quarterly prune, plus one after a model change (README) |
| budgets (1.5) | `AGENTS.md` ≤ 120 lines | the role proposes cuts; it never rewrites a rule shorter |
| measuring the loop | four numbers in README § *What to measure*; Mission Control `metrics.flow` | the first run found two of the four have no source (HRN-005) |

## 4. The refined cadence for HACER

| When | What | Who | Writes |
|---|---|---|---|
| every merged PR | one ledger line if anything was wrong or slow | coordinator (`ha-next` §6) | `ledger.md` |
| after every 5 merged PRs, or a week after the last run once `main` has moved | the retro: measure the window, find recurrences, propose | retro role (`retro-brief.md`) | `harness-inbox.md` |
| at least fortnightly | the process review: is the flow moving the platform forward? | process reviewers (`process-review-brief.md`) | `reviews/<date>/` |
| quarterly, and when the default model changes | prune: delete one component on a branch, see what breaks, keep the deletion if nothing does | the retro run that falls first in the quarter proposes it; the owner approves | `harness-inbox.md`, then a PR |

The four are nested. Each step reads what the one above it wrote. Only the owner turns a proposal
into policy, through the inbox, and an ADR records a policy that outlives a run. The first run (in
`harness-inbox.md`) already questions its own cadence: five PRs is two to seven retros per run at
the measured rate (HRN-009).

## Sources (all fetched 2026-10-15)

- [S1] Mitchell Hashimoto, "My AI Adoption Journey", 2026-02-05 — https://mitchellh.com/writing/my-ai-adoption-journey
- [S2] Ryan Lopopolo (OpenAI), "Harness engineering: leveraging Codex in an agent-first world", 2026-02-11 — https://openai.com/index/harness-engineering/ (403 on fetch; not read directly)
- [S3] Birgitta Böckeler, "Harness engineering for coding agent users", martinfowler.com, 2026-04-02 — https://martinfowler.com/articles/exploring-gen-ai/harness-engineering.html
- [S4] Anthropic, "Best practices for Claude Code" — https://code.claude.com/docs/en/best-practices
- [S5] HumanLayer, "Writing a good CLAUDE.md", 2025-11-25 — https://www.humanlayer.dev/blog/writing-a-good-claude-md
- [S6] Google, *Site Reliability Engineering*, ch. 15 "Postmortem Culture: Learning from Failure" — https://sre.google/sre-book/postmortem-culture/
- [S7] Anthropic, "Demystifying evals for AI agents", 2026-01-09 — https://www.anthropic.com/engineering/demystifying-evals-for-ai-agents
- [S8] Anthropic, "Improving skill-creator: Test, measure, and refine Agent Skills", 2026-03-03 — https://claude.com/blog/improving-skill-creator-test-measure-and-refine-agent-skills
- [S9] Prithvi Rajasekaran (Anthropic), "Harness design for long-running application development", 2026-03-24 — https://www.anthropic.com/engineering/harness-design-long-running-apps
- [S10] Erik Schluntz and Barry Zhang (Anthropic), "Building effective agents", 2024-12-19 — https://www.anthropic.com/engineering/building-effective-agents
- [S11] Q. Zhang et al., "Agentic Context Engineering: Evolving Contexts for Self-Improving Language Models", arXiv:2510.04618 (v3, 2026-03-29) — https://arxiv.org/abs/2510.04618
