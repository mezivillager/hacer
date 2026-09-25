# Premises

A **premise** is a fact a decision rests on, with a command that checks it. A decision names the
premises it rests on in `Assumes:`; `node scripts/lineage.mjs parse` reads each row here as a `P-<n>`
node (schema: [README.md](README.md#lineage)). `node scripts/lineage.mjs verify` runs each **Verify**
command and compares its stdout with **Expect**: exact text, a `/regex/` or `^anchored$` pattern, or
a semver range (a version must satisfy it; a range must be a subset — `<19.2` holds `<19.3`, and
`>=19 <19.4` does not).

A command that fails, times out, or prints nothing is **unverifiable**, never expired. So is a non-zero
`pnpm install` unless its output contains `ERR_PNPM_PEER_DEP_ISSUES` (that signal can still expire). A Verify cell that starts with
`manual` is not a command: it is reported **manual**, not run, and it counts as neither a failure,
nor expired, nor holding (P-006 needs an authenticated browser tab). A Verify command whose text
contains the word `gh` (P-007) is **skipped** the same way when no `GITHUB_TOKEN`, `GH_TOKEN`, or
`gh auth token` is available. The weekly workflow (`.github/workflows/lineage-verify.yml`) sets
`GITHUB_TOKEN`, so that command runs there.
`--strict` exits 1 only when something is expired. `--for #<issue>` checks the premises that issue's
decisions rest on. `--file` opens or updates one `project:lineage` issue per expired premise
(`Premise expired: P-nnn — …`), matched on that title so a later run edits it.

The **Status** column is what was recorded when the row was written. `verify` does not rewrite it.

| Id | Premise | Verify | Expect | Recorded | Status |
|---|---|---|---|---|---|
| P-001 | R3F's peer range excludes React 19.3 | `npm view @react-three/fiber peerDependencies.react` | `<19.3` | 2026-09-21 (#342) | **expired 2026-09-22** |
| P-002 | `fast-check` is not a dependency | `node scripts/premises/checks.mjs fast-check` | absent | 2026-09-23 (#355) | holds |
| P-003 | `main-rules` requires exactly `ci`, `pr-hygiene`, `browser-qa` | `node scripts/premises/checks.mjs main-rules` | those three | 2026-09-24 (R517) | holds |
| P-004 | GitHub answers 422 for a bogus ref on `/commits/{ref}` | `node scripts/premises/checks.mjs bogus-ref` | 422 | 2026-09-24 (#432) | holds |
| P-005 | `pnpm install` only warns on a peer violation | `node scripts/premises/checks.mjs peer-install` | exit 0 | 2026-09-24 (#455) | holds |
| P-006 | the weekly Claude meter's `resets_at` is 2026-09-25T03:00:00Z | manual — read `seven_day.resets_at` from the usage endpoint in an authenticated browser tab (`docs/harness/usage-rationing.md`) | `2026-09-25T03:00:00Z` | 2026-09-25 (R700) | holds — R700 wrongly inferred the reset had already happened (R711) |
| P-007 | merged PRs without a `## Verifier verdict:` comment exist in the last 60 (27 on 2026-09-25; the window moves) | `gh pr list --state merged --limit 60 --json comments --jq '[.[]\|select(([.comments[].body]\|map(select(test("Verifier verdict")))\|length)==0)]\|length'` | `^[1-9][0-9]*$` | 2026-09-25 (R705) | holds |
