# Failure ledger

One line per thing that went wrong in the loop.

| Id | Date | What went wrong | Should have been caught by | Mechanised? | Decision |
|---|---|---|---|---|---|
| L001 | 2026-09-18 | Four statements in the workspace `CLAUDE.md` were stale for months | a does-this-path-exist check on cited files (#153) | no — #153 | — |
| L002 | 2026-09-18 | The `main-rules` ruleset could only be merged through by admin bypass | nothing; a settings audit | yes — `scripts/audit-rulesets.mjs` | R12 |
| L003 | 2026-09-19 | A guard checked its verdict but not its own input | the guard's own test | partly — input check landed, the verdict check has not | ADR-0019, P-3 |
| L004 | 2026-09-20 | A row whose cell escapes a pipe: `a \| b` | review | **yes** — bold, still yes | — |
| L005 | 2026-09-21 | A row that says none of the three words | review | n/a | — |
