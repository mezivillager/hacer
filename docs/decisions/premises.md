# Premises

A **premise** is a fact a decision rests on, with a command that checks it. A decision names the
premises it rests on in `Assumes:`; `node scripts/lineage.mjs parse` reads each row here as a `P-<n>`
node (schema: [README.md](README.md#lineage)). Running **Verify** and comparing its output with
**Expect** is `lineage verify` (#468); until then this table is data, and each status is as of the
day it was recorded.

| Id | Premise | Verify | Expect | Recorded | Status |
|---|---|---|---|---|---|
| P-001 | R3F's peer range excludes React 19.3 | `npm view @react-three/fiber peerDependencies.react` | `<19.3` | 2026-09-21 (#342) | **expired 2026-09-22** |
| P-002 | `fast-check` is not a dependency | `node -e …lockfile…` | absent | 2026-09-23 (#355) | holds |
| P-003 | `main-rules` requires exactly `ci`, `pr-hygiene`, `browser-qa` | `gh api …/rulesets/13907542` | those three | 2026-09-24 (R517) | holds |
| P-004 | GitHub answers 422 for a bogus ref on `/commits/{ref}` | `gh api …` | 422 | 2026-09-24 (#432) | holds |
| P-005 | `pnpm install` only warns on a peer violation | `pnpm install` on a fixture | exit 0 | 2026-09-24 (#455) | holds |
| P-006 | the weekly Claude meter's `resets_at` is 2026-09-25T03:00:00Z | manual — read `seven_day.resets_at` from the usage endpoint in an authenticated browser tab (`docs/harness/usage-rationing.md`) | `2026-09-25T03:00:00Z` | 2026-09-25 (R700) | holds — R700 wrongly inferred the reset had already happened (R711) |
| P-007 | merged PRs without a `## Verifier verdict:` comment exist in the last 60 (27 on 2026-09-25; the window moves) | `gh pr list --state merged --limit 60 --json comments --jq '[.[]|select(([.comments[].body]|map(select(test("Verifier verdict")))|length)==0)]|length'` | `^[1-9][0-9]*$` | 2026-09-25 (R705) | holds |
