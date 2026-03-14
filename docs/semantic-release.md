# Semantic Release Guide

This document explains how automated versioning and releases work in HACER using semantic-release.

## Overview

HACER uses [semantic-release](https://github.com/semantic-release/semantic-release) to automate the version management and package publishing process. It analyzes commit messages following the [Conventional Commits](https://www.conventionalcommits.org/) specification to determine version bumps and generate changelogs automatically.

## How It Works

### 1. Commit Messages Drive Versioning

When you commit code with a conventional commit message, semantic-release analyzes it to determine the next version:

| Commit Type | Version Bump | Example |
|-------------|--------------|---------|
| `feat:` | Minor (0.x.0) | `feat: add wire color customization` → 1.1.0 |
| `fix:` | Patch (0.0.x) | `fix: resolve gate deletion bug` → 1.0.1 |
| `perf:` | Patch (0.0.x) | `perf: optimize simulation performance` → 1.0.1 |
| `revert:` | Patch (0.0.x) | `revert: undo previous change` → 1.0.1 |
| `BREAKING CHANGE:` or `!` | Major (x.0.0) | `feat!: redesign state API` → 2.0.0 |
| `docs:`, `style:`, `refactor:`, `test:`, `build:`, `ci:`, `chore:` | No release | Internal changes only |

### 2. Automatic Release Process

The release workflow (`.github/workflows/release.yml`) runs automatically when changes are pushed to `main`, `beta`, or `alpha`:

1. **Run Tests**: Ensures code quality (lint, unit tests, build)
2. **Analyze Commits**: Determines the next version based on commit messages since the last release
3. **Generate Changelog**: Creates/updates `CHANGELOG.md` with all changes
4. **Update Version**: Bumps version in `package.json` (and updates `pnpm-lock.yaml` if needed)
5. **Create Git Tag**: Tags the release commit (e.g., `v1.2.0`)
6. **Create GitHub Release**: Creates a release on GitHub with auto-generated release notes
7. **Commit Changes**: Commits the updated files with `[skip ci]` in the message; the workflow includes a condition to skip when the commit message contains `[skip ci]` to avoid re-running on release commits

### 3. Branch Configuration

semantic-release supports multiple release channels:

| Branch | Release Type | Version Example |
|--------|--------------|-----------------|
| `main` | Stable releases | 1.0.0, 1.1.0, 2.0.0 |
| `beta` | Pre-releases | 1.1.0-beta.1, 1.1.0-beta.2 |
| `alpha` | Pre-releases | 1.1.0-alpha.1, 1.1.0-alpha.2 |

## Configuration Files

### `.releaserc.json`

Main configuration file that defines:
- Which branches trigger releases
- Which plugins to use and their order
- Release rules for different commit types
- Changelog formatting
- Git and GitHub release settings

### `commitlint.config.js`

Validates commit messages to ensure they follow the conventional commits format. This runs automatically in the `commit-msg` git hook.

### `.github/workflows/release.yml`

GitHub Actions workflow that runs the release process on pushes to `main`, `beta`, or `alpha` branches.

### RELEASE_TOKEN (required for branch protection)

If `main` has branch protection (e.g. "Require a pull request before merging"), the default `GITHUB_TOKEN` cannot push. Use a Personal Access Token (PAT) stored as `RELEASE_TOKEN`. The workflow uses `GITHUB_TOKEN` for checkout and install, then configures the git remote with `RELEASE_TOKEN` only before the release step—this avoids exposing the long-lived PAT to dependency install scripts.

1. **Create a PAT**: GitHub → Settings → Developer settings → Personal access tokens → Tokens (classic)
   - **Note**: `hacer-release` (or similar)
   - **Expiration**: 90 days or no expiration
   - **Scopes**: `repo` (full control of private repositories)

2. **Add repository secret**: Repository → Settings → Secrets and variables → Actions → New repository secret
   - **Name**: `RELEASE_TOKEN`
   - **Value**: paste the PAT

3. **Rotate periodically**: If the PAT expires, create a new one and update the secret.

## Commit Message Format

### Basic Format

```
<type>(<scope>): <subject>

<body>

<footer>
```

### Examples

#### Feature (Minor Release)
```bash
git commit -m "feat: add multiplexer gate type"
# Results in version bump from 1.0.0 → 1.1.0
```

#### Bug Fix (Patch Release)
```bash
git commit -m "fix: correct XOR gate logic calculation"
# Results in version bump from 1.0.0 → 1.0.1
```

#### Breaking Change (Major Release)
```bash
git commit -m "feat!: redesign state management architecture

BREAKING CHANGE: The store API has been completely redesigned.
Migration guide available at docs/migration.md"
# Results in version bump from 1.0.0 → 2.0.0
```

#### With Scope
```bash
git commit -m "feat(gates): add support for custom gate colors"
git commit -m "fix(simulation): prevent infinite loop in cyclic circuits"
git commit -m "docs(readme): update installation instructions"
```

#### No Release
```bash
git commit -m "chore: update development dependencies"
# No version bump, no release
```

## Validation

### Pre-commit Validation

The project uses Husky hooks to validate commit messages before they're committed:

1. **commit-msg hook**: Runs `commitlint` to ensure the message follows conventional commits
2. **pre-commit hook**: Runs linters and tests

If your commit message doesn't follow the format, you'll see an error:

```bash
$ git commit -m "invalid message"
⧗   input: invalid message
✖   subject may not be empty [subject-empty]
✖   type may not be empty [type-empty]

✖   found 2 problems, 0 warnings
```

### Testing Commits Locally

Test if a commit message is valid:

```bash
echo "feat: add new feature" | pnpm exec commitlint
# ✔ Valid

echo "invalid message" | pnpm exec commitlint
# ✖ Invalid
```

## Release Workflow

### Typical Development Flow

1. Create a feature branch from `main`:
   ```bash
   git checkout -b feat/my-feature
   ```

2. Make changes and commit using conventional commits:
   ```bash
   git commit -m "feat: add new gate type"
   git commit -m "test: add unit tests for new gate"
   git commit -m "docs: update gate documentation"
   ```

3. Push and create a pull request to `main`

4. After PR is merged to `main`, the release workflow automatically:
   - Analyzes all commits since the last release
   - Determines the next version (based on feat/fix/BREAKING)
   - Updates CHANGELOG.md
   - Creates a git tag
   - Creates a GitHub release

### Manual Release (Emergency)

If you need to trigger a release manually:

1. Go to **Actions** → **Release** workflow in GitHub
2. Click **Run workflow**
3. Select the branch and click **Run workflow**

## Changelog

The `CHANGELOG.md` file is automatically generated and maintained by semantic-release. It includes:

- **Version number and date** for each release
- **Changes grouped by type**: Features, Bug Fixes, Performance, Documentation, etc.
- **Commit links** to GitHub for each change
- **Breaking changes** highlighted prominently

### Example Changelog Entry

```markdown
## [1.2.0](https://github.com/mezivillager/hacer/compare/v1.1.0...v1.2.0) (2024-03-11)

### Features

* add wire color customization ([abc123](https://github.com/mezivillager/hacer/commit/abc123))
* support for multiplexer gates ([def456](https://github.com/mezivillager/hacer/commit/def456))

### Bug Fixes

* resolve gate deletion memory leak ([ghi789](https://github.com/mezivillager/hacer/commit/ghi789))
```

## Best Practices

### DO ✅

- **Use conventional commit format** for all commits
- **Include scope** when relevant: `feat(gates):`, `fix(simulation):`
- **Write clear, descriptive subjects** (50 chars or less)
- **Document breaking changes** in the commit body with `BREAKING CHANGE:`
- **Group related changes** in a single commit when appropriate
- **Use `chore:` for internal changes** that don't affect users

### DON'T ❌

- Don't use vague subjects: ~~`fix: bug`~~ → Use: `fix: prevent crash when deleting connected gate`
- Don't mix multiple types in one commit: ~~`feat/fix: add gates and fix bugs`~~
- Don't forget the colon: ~~`feat add feature`~~ → Use: `feat: add feature`
- Don't use uppercase in subject: ~~`Feat: Add Feature`~~ → Use: `feat: add feature`
- Don't commit directly to main (use PRs)

## Troubleshooting

### "No release will be made"

If semantic-release doesn't create a release, check:
- Are you on the `main` branch?
- Are there any releasable commits (feat, fix, etc.) since the last release?
- Do all commits follow conventional commit format?
- Check the release workflow logs for details

### "Commit message validation failed"

If commitlint rejects your message:
1. Check the format: `<type>: <subject>`
2. Use a valid type: feat, fix, docs, style, refactor, perf, test, build, ci, chore
3. Don't use uppercase in the subject
4. Keep the subject under 100 characters

### "Release workflow failed"

Check the GitHub Actions logs:
1. Go to **Actions** tab
2. Click on the failed **Release** workflow
3. Review the logs for each step
4. Common issues:
   - Tests failed
   - Build failed
   - **Protected branch**: `GH006: Protected branch update failed` — add `RELEASE_TOKEN` (see [RELEASE_TOKEN setup](#release_token-required-for-branch-protection) in Configuration Files above)

## Resources

- [Conventional Commits Specification](https://www.conventionalcommits.org/)
- [semantic-release Documentation](https://semantic-release.gitbook.io/)
- [Commitlint Documentation](https://commitlint.js.org/)
- [CONTRIBUTING.md](../CONTRIBUTING.md) - Full contribution guide

## Version History

Semantic release was added to the project before the first automated release. The first automated release will be determined based on the conventional commit messages in the git history.
