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
