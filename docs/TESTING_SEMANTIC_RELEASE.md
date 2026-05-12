# Testing Semantic Release

**Last Updated:** 2026-05-12  
**Current package version:** 2.0.0  
**Status:** semantic-release is already installed and active.

This document is for validating the current release setup after release-related changes. It is not a first-release checklist.

## Current Setup

- Config: `.releaserc.json`
- Workflow: `.github/workflows/release.yml`
- Runtime: Node 22
- Branches: `main`, `beta`, `alpha`
- Release token: repository secret `RELEASE_TOKEN`
- Published output: GitHub release, git tag, `CHANGELOG.md`, `package.json`, `pnpm-lock.yaml`
- npm publish: disabled

## Local Checks

Run these before changing release configuration:

```bash
pnpm run lint
pnpm run test:run
pnpm run build
pnpm exec semantic-release --dry-run
```

Dry-run requires enough git history and tags for semantic-release to analyze commits. In a shallow checkout, fetch tags first:

```bash
git fetch --tags
```

## Commitlint Checks

```bash
echo "feat: add new gate type" | pnpm exec commitlint
echo "invalid message" | pnpm exec commitlint
```

The first command should pass. The second should fail.

## GitHub Verification

After a release-capable commit reaches `main`, verify:

- The Release workflow ran successfully.
- The release job used Node 22.
- `CHANGELOG.md` has a new generated section.
- `package.json` version changed according to conventional commit rules.
- A `vX.Y.Z` tag exists.
- A GitHub release exists for that tag.
- The release commit message contains `[skip ci]`.

## Version Rules

| Commit | Release |
|--------|---------|
| `feat:` | minor |
| `fix:` | patch |
| `perf:` | patch |
| `revert:` | patch |
| `feat!:` or `BREAKING CHANGE:` | major |
| `docs:`, `test:`, `chore:`, `ci:`, `build:`, `refactor:`, `style:` | no release |

## Troubleshooting

If release fails:

- Confirm `RELEASE_TOKEN` exists and has repository write permissions.
- Confirm the workflow checkout step used `secrets.RELEASE_TOKEN`.
- Confirm the commit is on `main`, `beta`, or `alpha`.
- Confirm there is a releasable conventional commit since the previous tag.
- Review the semantic-release step logs for the plugin that failed.

## Optional Prerelease Channels

The config supports `beta` and `alpha` prerelease branches. Do not create or document a broader branch strategy until the project has a real prerelease need.
