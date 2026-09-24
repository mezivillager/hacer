# Coverage — one owner per rule

Every standing rule for how work gets built, judged and merged has exactly one file that states it
in full. Every other site either says nothing about it or points here — or, for the definition of
done, straight at its owner. Update this map in the same PR that moves a rule; it is a symptom that
`ledger.md` exists to catch when it drifts.

## Map

| Rule | Owner | Notes |
|---|---|---|
| **Definition of done** — five commands, all exit 0 | `docs/harness/implementer-brief.md` § Definition of done | `lint` · `test:run` · `build` · `lint:docs` · the issue's verification command |
| **TDD order** — a red commit is the tests *and* the smallest compiling stub | `docs/harness/implementer-brief.md` § TDD, the way the hooks allow it | pre-commit runs `tsc -b`; a red that does not compile cannot be committed, and `--no-verify` is never used |
| **PR size budget** — ≤ 400 reviewable lines (warn at 200), one sub-issue per PR | `docs/decisions/0013-backlog-in-github-issues-and-portfolio.md` (Decision 3) | enforced by `scripts/pr-hygiene.logic.mjs` |
| **Labels & the agent-ready issue form** | `docs/research/2026-09-18-agent-readiness/WORK-SYSTEM.md` §2 (The agent-ready issue form) | the label vocabulary itself is `docs/decisions/0013-backlog-in-github-issues-and-portfolio.md` (Decision 1) |
| **Blast radius before `agent-ready`** | `docs/harness/README.md` § How wide is an issue? | the number and its evidence live beside `AGENT_READY_PRODUCTION_IMPORTER_THRESHOLD` in `scripts/blast-radius.logic.mjs` |
| **Publish grant** — when an agent may merge | `docs/decisions/0013-backlog-in-github-issues-and-portfolio.md` (Decision 4) | merge-on-green only; the fuller push / PR / release / deploy grant is workspace-level, outside this repo (`../CLAUDE.md`) |
| **Model tiers & cost budgets** | `docs/harness/README.md` § Budgets (cost limits) | self-contained; values are mirrored into `.claude/settings.json` env, not restated in prose elsewhere |
| **Browser-QA scope** — which PRs get a browser run, which suites, where | `docs/decisions/0016-browser-qa-in-the-cloud.md` | amended 2026-09-19 (#282); `docs/harness/README.md`'s knob table paraphrases it (see below) |
| **Worker-role rule** — four fresh-context judge roles; none builds, none decides strategy | `docs/harness/README.md` § Standing roles | |
| **Claim refs** — `refs/heads/claim/<issue#>`, atomic, then label `in-progress` | `docs/research/2026-09-18-agent-readiness/WORK-SYSTEM.md` §4 (The loop an agent follows for every task) | implemented in `.claude/skills/ha-next/SKILL.md` |
| **Never commit to `main`** | `.cursor/rules/020-git-worktree-no-main.mdc` | worktrees live outside the repo as `hacer-wt-<topic>` siblings |

## Deliberate duplication, and why

- **PR size numbers** (400 reviewable lines, warn at 200) are stated once in ADR-0013 and restated
  in `implementer-brief.md` and `verifier-brief.md`. Each brief is read standalone, in a fresh
  context, mid-task — sending the builder or verifier to a fourth file for a number it needs on
  every PR would cost a turn for nothing; the ADR stays the source of truth for *why* it is 400.
- **"Do not commit to `main`"** appears as a one-line consequence in `AGENTS.md` and
  `.github/copilot-instructions.md`, each citing `.cursor/rules/020-git-worktree-no-main.mdc` for
  the mechanics rather than restating them. Every entry doc a session might open first states the
  consequence, so silence is never mistaken for permission, then defers to one file for the "how."
- **Browser-QA's scope** gets a compressed one-line paraphrase in `docs/harness/README.md`'s knob
  table next to its ADR-0016 citation. The table's whole job is a scannable index; a bare citation
  with no content would send a reader into the ADR just to learn which knob it even is.
- **The definition of done's individual check names** appear a second time in
  `verifier-brief.md`'s PASS/BLOCK output template (`DoD: lint ✔/✘ test:run ✔/✘ build ✔/✘
  lint:docs ✔/✘`). That is a report format the verifier fills in with ticks, not a claim about what
  the rule is — it does not need a link, because it never asserts the list on its own authority.
- **TDD's one-liner** ("Red → Green → Refactor") is repeated in `.cursorrules` and
  `.claude/CONSTITUTION.md` alongside the precise "red commit = compiling stub" mechanic owned
  solely by `implementer-brief.md`. The one-liner is the universal law every doc's audience needs on
  first read; the compiling-stub enforcement detail is specific to the harness's pre-commit hook and
  only the builder needs it.
