# Failure ledger

Fixture: three real rows of `docs/harness/ledger.md`, shortened, in the shape #469 gives it — an `Id`
in file order and a `Decision` column, `—` where no decision is known.

| Id | Date | What went wrong | Should have been caught by | Mechanised? | Decision |
|---|---|---|---|---|---|
| L001 | 2026-09-18 | Four statements in the workspace `CLAUDE.md` were stale for months | a does-this-path-exist check on cited files (#153) | no — #153 | — |
| L006 | 2026-09-18 | `pnpm install` in every worktree prints `husky: command not found` | the worktree script (#157) | yes — #157 | — |
| L048 | 2026-09-23 | #342's criteria rested on an upstream fact that expired ~31 hours after the issue was written | nothing re-checks an issue's premise at dispatch time | no — #394 owns the class | P-001 |
