# Implementer brief — one issue, one PR

Given to a builder agent (or followed by a session) for a single `agent-ready` issue. Replace
`<n>` with the issue number. The issue body is the spec; this brief is the mechanics.

## Ground rules
- Work only in a worktree you create: `git fetch origin && git worktree add ../hacer-wt-<topic> -b <type>/<n>-<topic> origin/main`, then `rm -rf node_modules && pnpm install --frozen-lockfile` and check `ls node_modules/.pnpm/@babel+helper-compilation-targets@*/node_modules/` lists `browserslist lru-cache semver`. Never edit the `main` checkout. `node -v` first; if not 22: `export NVM_DIR="$HOME/.nvm"; . "$NVM_DIR/nvm.sh"; nvm use 22`.
- Read `AGENTS.md`, `.claude/CONSTITUTION.md` and `.claude/skills/hacer-patterns/SKILL.md` before writing code. Strict TypeScript, no `any`, no `@ts-ignore`; one component per file; no manual memoisation; Zustand only through `circuitActions`; pure logic in `src/core` / `src/simulation` with no React, no store mutation, no `notify`; errors as data.
- **Scope is the issue's acceptance criteria — nothing else.** Something adjacent that needs fixing becomes a follow-up issue, filed by you, linked from the PR.
- **Budget:** ≤ 400 reviewable changed lines (tests, lockfile, fixtures, generated files excluded); aim for ≤ 200. If the criteria cannot fit, split the issue into sub-issues (`gh issue create --parent <n>`) and deliver the first.

## TDD, the way the hooks allow it
1. Baseline: run the relevant suite once and note the count.
2. **Red commit:** the tests *and* the smallest compiling stub that makes them fail (an exported function that returns a sentinel or throws `not implemented`). The pre-commit hook runs `tsc -b`, so a red that does not compile cannot be committed — and `--no-verify` is never used. Commit as `test(<scope>): …`.
3. **Green commit(s):** the implementation, `feat(<scope>): …` / `fix(<scope>): …`. Test files do not change after red; if an assertion looks wrong, stop and say so on the issue.
4. Conventional commits; **no AI attribution trailers**.

## Definition of done (all exit 0, run in the worktree, pasted into the PR body)
`pnpm run lint` · `pnpm run test:run` · `pnpm run build` · `pnpm run lint:docs` · the issue's verification command.

## Deliver
- `git push -u origin <branch>`; `gh pr create` with: `Fixes #<n>` (or `Part of #<n>` when the issue has more slices), what/why in ≤ 10 lines, any deviation from the issue with the reason, the definition-of-done results, and labels `project:<slug>` + `risk:<tier>`.
- Do **not** merge, and do **not** keep watching CI after the PR is open — report and stop (a watcher costs tokens and adds nothing; the coordinator merges on green). Report: PR URL, reviewable line count (`git diff --numstat origin/main...HEAD`), test names added, and every open question — flag what you could not verify rather than guessing.

## Blocked exit
If the issue is ambiguous, impossible as written, or needs a harness change: label it `needs-human`, write the question **and your recommended answer** on the issue, release the claim, and stop. That is a good outcome, not a failure.
