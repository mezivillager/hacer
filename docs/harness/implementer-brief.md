# Implementer brief — one issue, one PR

Given to a builder agent (or followed by a session) for a single `agent-ready` issue. Replace
`<n>` with the issue number. The issue body is the spec; this brief is the mechanics.

## Claim
Claim before building: `node scripts/backlog.mjs claim <n> --by <id> --session <run> --branch <type>/<n>-<topic>`. It creates `refs/heads/claim/<n>` exclusively — a second claimant exits 1 naming the holder — then posts the claim comment (`Claimed by` / `Intent` / `Session/run` / `Branch`) and labels the issue `in-progress`.
A claim with no open PR reads `stale-claim` 48 h after its latest claim comment; release your own with `node scripts/backlog.mjs release <n> --by <id>`.
Claim comment fields and the handoff convention: `docs/harness/sessions/COORDINATOR-HANDOFF.md`.

## Ground rules
- Work only in a worktree you create: `bash scripts/wt-new <type>/<n>-<topic>` — fetches, branches from `origin/main` (never a stale base), installs with `--frozen-lockfile`, and verifies the @babel helper symlinks and a chosen command before it says ready (#157); run `bash scripts/wt-new --refresh` from inside it later if you suspect `origin/main` moved mid-task. Falls back to `git fetch origin && git worktree add ../hacer-wt-<topic> -b <type>/<n>-<topic> origin/main && rm -rf node_modules && pnpm install --frozen-lockfile` only if the script itself is unavailable. Never edit the `main` checkout. `node -v` first, in every command; if not 22: `export NVM_DIR="$HOME/.nvm"; . "$NVM_DIR/nvm.sh"; nvm use 22`.
- Read `AGENTS.md`, `.claude/CONSTITUTION.md` and `.claude/skills/hacer-patterns/SKILL.md` before writing code. Strict TypeScript, no `any`, no `@ts-ignore`; one component per file; no manual memoisation; Zustand only through `circuitActions`; pure logic in `src/core` / `src/simulation` with no React, no store mutation, no `notify`; errors as data.
- **Scope is the issue's acceptance criteria — nothing else.** Something adjacent that needs fixing becomes a follow-up issue, filed by you, linked from the PR.
- **Model:** the coordinator dispatches `risk:0` docs-only or mechanical work on **Sonnet**, and `risk:1` / `risk:2` on **Opus** — the measurement and what would change it: `model-tiering.md`. **Name the model you ran on in the PR body**, always: nothing else records it, and a tier claim nobody can attribute later is not evidence.
- **Budget:** ≤ 400 reviewable changed lines (tests, lockfile, fixtures, generated files excluded); aim for ≤ 200. If the criteria cannot fit, split the issue into sub-issues (`gh issue create --parent <n>`) and deliver the first.
- **Commit type is process vs product, not `feat`/`fix` by habit.** Process-only work — the harness (`docs/harness/`), CI workflows (`.github/`), scripts that only serve the loop (`scripts/`), and docs — commits `chore(<scope>): …` or `docs(<scope>): …`, never `feat`/`fix`. `src/`, `mission-control/` app features, and the vendored conformance vectors (`conformance/vectors/`) are product and keep `feat`/`fix`. Every `feat`/`fix` merge cuts an app release (ADR-0013): 48 releases in eight days, 31 minors, none of them a product change (`docs/harness/reviews/2026-09-26/SYNTHESIS.md` S12).
- **You are a delegated worker on an approved, bounded task:** do not re-plan, do not ask whether to
  proceed, do not stop at a design for the same scope; missing authority is stop-and-report.
- **Reuse first:** name what already exists to reuse before writing new code — this repo first
  (`REPO_MAP.md`, `HACER_LLM_GUIDE.md`), then `../web-ide/`, then the ecosystem; a duplicate needs a
  stated reason.

## TDD, the way the hooks allow it
1. Baseline: run the relevant suite once and note the count.
2. **Red commit:** the tests *and* the smallest compiling stub that makes them fail (an exported function that returns a sentinel or throws `not implemented`). The pre-commit hook runs `tsc -b`, so a red that does not compile cannot be committed — and `--no-verify` is never used. Commit as `test(<scope>): …`.
   - **Property tests:** record the failure count the red commit saw (e.g. `105/400`), so a later generator gone vacuous shows up as a changed number, not a silent pass.
   - **Test-only issues:** when the deliverable is the test itself, the red demonstration lives on the PR branch or behind a test-only fault, never as a production change that reaches `main`; the PR lands as one `test(<scope>): …` commit with the red recorded in its message, and `fix:` stays for bugs that shipped.
3. **Green commit(s):** the implementation, `feat(<scope>): …` / `fix(<scope>): …`. Test files do not change after red; if an assertion looks wrong, stop and say so on the issue.
4. Conventional commits; **no AI attribution trailers**.

## Definition of done (all exit 0, run in the worktree, pasted into the PR body)
`pnpm run lint` · `pnpm run test:run` · `pnpm run build` · `pnpm run lint:docs` · the issue's verification command.
A verification command names a behaviour, not an exact new file path — if the issue cites a file that doesn't match what you wrote (this repo's `<x>.logic.test.mjs` convention, say), run the equivalent test for that behaviour and note the mismatch in the PR.

## Deliver
- `git push -u origin <branch>`; `gh pr create` with: `Fixes #<n>` (or `Part of #<n>` when the issue has more slices), what/why in ≤ 10 lines, a `Decisions:` line (the decision ids this PR implements — `ADR-NNNN`, `R<n>` or `P-<n>`, comma-separated — or `none`; schema and the `implements` edge it writes: `docs/decisions/README.md` § Lineage), any deviation from the issue with the reason, the definition-of-done results, and labels `project:<slug>` + `risk:<tier>`.
- **`Fixes` only when the whole issue is done; otherwise `Part of`** — GitHub closes an issue on the keyword alone, even in "this does not close #n", and `pr-hygiene` fails a closing keyword beside an in-part phrase (#485).
- Do **not** merge, and do **not** keep watching CI after the PR is open — report and stop (a watcher costs tokens and adds nothing; the coordinator merges on green). Report: PR URL, reviewable line count (`git diff --numstat origin/main...HEAD`), test names added, and every open question — flag what you could not verify rather than guessing.

## Blocked exit
If the issue is ambiguous, impossible as written, or needs a harness change: label it `needs-human`, write the question **and your recommended answer** on the issue, release the claim, and stop. That is a good outcome, not a failure.
