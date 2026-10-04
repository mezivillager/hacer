# Premises

A **premise** is a fact a decision rests on, with a command that checks it. A decision names the
premises it rests on in `Assumes:`; `node scripts/lineage.mjs parse` reads each row here as a `P-<n>`
node (schema: [README.md](README.md#lineage)). `node scripts/lineage.mjs verify` runs each **Verify**
command and matches its stdout against **Expect**: exact text, a `/regex/` or `^anchored$` pattern, or
a semver range (a version must satisfy it; a range must be a subset: `<19.2` holds `<19.3`,
`>=19 <19.4` does not). A command that fails, times out or prints nothing is **unverifiable**, never
expired; P-005's check fails unless `pnpm install` exits 0 or refuses a peer (`ERR_PNPM_PEER_DEP_ISSUES`),
so a registry outage is not an expiry. A `manual` Verify cell is reported **manual** and not run; a
command whose text names `gh` is **skipped** with no token (a `scripts/premises/checks.mjs` command that calls `gh`
carries it in its name; the weekly workflow sets `GITHUB_TOKEN`). Neither counts as failed, expired
or holding. `--strict` exits 1 only on an expired premise; `--for #<issue>` checks the premises that
issue's decisions rest on; `--file` opens or updates one `project:lineage` issue per expired premise,
titled `Premise expired: P-nnn — …`. The **Status** column is as recorded; `verify` never rewrites it.

| Id | Premise | Verify | Expect | Recorded | Status |
|---|---|---|---|---|---|
| P-001 | R3F's peer range excludes React 19.3 | `npm view @react-three/fiber peerDependencies.react` | `<19.3` | 2026-09-21 (#342) | **expired 2026-09-22** |
| P-002 | `fast-check` is not a dependency | `node scripts/premises/checks.mjs fast-check` | absent | 2026-09-23 (#355) | holds |
| P-003 | `main-rules` requires exactly `ci`, `pr-hygiene`, `browser-qa` | `node scripts/premises/checks.mjs gh-main-rules` | those three | 2026-09-24 (R517) | holds |
| P-004 | GitHub answers 422 for a bogus ref on `/commits/{ref}` | `node scripts/premises/checks.mjs gh-bogus-ref` | 422 | 2026-09-24 (#432) | holds |
| P-005 | `pnpm install` only warns on a peer violation | `node scripts/premises/checks.mjs peer-install` | exit 0 | 2026-09-24 (#455) | holds |
| P-006 | the weekly Claude meter's `resets_at` is 2026-09-25T03:00:00Z | manual — read `seven_day.resets_at` from the usage endpoint in an authenticated browser tab (`docs/harness/usage-rationing.md`) | `2026-09-25T03:00:00Z` | 2026-09-25 (R700) | holds — R700 wrongly inferred the reset had already happened (R711) |
| P-007 | merged PRs without a `## Verifier verdict:` comment exist in the last 60 (27 on 2026-09-25; the window moves) | `gh pr list --state merged --limit 60 --json comments --jq '[.[]\|select(([.comments[].body]\|map(select(test("Verifier verdict")))\|length)==0)]\|length'` | `^[1-9][0-9]*$` | 2026-09-25 (R705) | holds |
| P-008 | `main-rules`' `require_extra_approval_for_unattributed_changes` gates only pull requests Copilot opens under its own app identity (GitHub docs, "Available rules for rulesets"), not commits the owner's account authors and commits — so it neither caused nor prevents the stuck merge box on this repo | `gh api repos/mezivillager/hacer/rulesets/13907542 --jq '.rules[]\|select(.type=="pull_request").parameters.require_extra_approval_for_unattributed_changes'` | `true` | 2026-09-27 (#537) | holds — inert here (`docs/harness/reviews/2026-09-26/reviews/1.md` F9) |
