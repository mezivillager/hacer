# 0015. Releases tag and publish; they no longer commit to `main`

- **Status:** Accepted
- **Date:** 2026-09-18
- **Deciders:** Repo owner (delegated to the tracer-bullet run; ruling R64)
- **Phase:** Phase 0.5

## Context
ADR-0013 made the `main-rules` ruleset bind everyone: no bypass actors, changes only through a
pull request with green required checks. semantic-release's `@semantic-release/git` plugin pushed
a `chore(release): x.y.z` commit (CHANGELOG.md, package.json, pnpm-lock.yaml) straight to `main`
after every release, so every release run since the bypass was removed failed with
`GH013: Changes must be made through a pull request` — five failures on 2026-09-18 before this
was noticed. Tags and GitHub Releases are not covered by the ruleset (it matches `refs/heads/main`
only).

## Decision
Remove `@semantic-release/git` and `@semantic-release/changelog` from `.releaserc.json`. A release
is now: analyze commits since the last tag → create the tag → publish a GitHub Release with the
generated notes. Nothing is committed to `main`. `@semantic-release/npm` keeps `npmPublish: false`
(it only computes the version). `package.json`'s `version` field is no longer bumped on `main`; the
tag is the version of record.

## Consequences
- `CHANGELOG.md` stops growing; release notes live on the GitHub Releases page. The file stays as
  a dated history with a header pointing there (updated here).
- No `[skip ci]` release commits; every commit on `main` is a PR.
- If an in-repo changelog is wanted later, the release workflow can open a PR for it (a
  `harness` task), or a GitHub App with a bypass grant can push it — rejected for now as more
  moving parts than a static site needs.
- Pending releases: the next successful run will release everything since `v2.11.0`.

## Affected living docs
`CHANGELOG.md` (header note) · `docs/decisions/README.md` (index). `AGENTS.md` does not mention the release mechanics.

## Links
- [[0013]] · `.github/workflows/release.yml` (unchanged) · `.releaserc.json`
