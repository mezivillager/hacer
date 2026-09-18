# Failure ledger

One line per thing that went wrong in the loop. The **second** time the same thing appears, it
becomes a mechanism — a lint, a test, a hook, a check — and the row links to it. Only what cannot be
mechanised goes into `AGENTS.md`, under its line budget.

Format: `date · what went wrong · which layer should have caught it · mechanised? (link or "no")`

| Date | What went wrong | Should have been caught by | Mechanised? |
|---|---|---|---|
| 2026-09-18 | Four statements in the workspace `CLAUDE.md` were stale for months (HDL pipeline "not wired", `gateLogic.ts`, Stryker, E2E in the DoD); every session started from a wrong picture | a does-this-path-exist check on cited files (#153) | no — #153 |
| 2026-09-18 | The `main-rules` ruleset could only be merged through by admin bypass (1 approval a solo owner cannot give; `required_deployments` and `code_scanning` rules no PR could satisfy); AGENTS.md claimed CI was required — it was not | nothing; a settings audit | yes — ADR-0013; ruleset rewritten, bypass removed after #234 |
| 2026-09-18 | First research draft kept the owner as the merge bottleneck and proposed label gates the owner's own identity defeats | an adversarial review before acting | yes — every research deliverable gets a fresh-context adversarial review + fact-check |
| 2026-09-18 | Research draft rested a goal-post exit test on a `lint:docs` capability that does not exist (it only rejects absolute paths) | fact-check | yes — reviews; the capability itself is #153 |
| 2026-09-18 | Tracer PR #238: the pre-commit `tsc -b` makes a compile-broken "red" commit impossible; the builder committed the test file from a green tree instead | `ha-prompt-it` should say how to write a red that compiles | no — fix in v2 (#154): red = test + a compiling stub that fails, never `--no-verify` |
| 2026-09-18 | `pnpm install` in every worktree prints `husky: command not found` (husky is not a devDependency; hooks still run via `core.hooksPath`) | the worktree script (#157) | no — #157 |
