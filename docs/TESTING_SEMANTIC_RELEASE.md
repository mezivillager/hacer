# Testing Semantic Release Setup

This document provides guidance for testing the semantic release setup after this PR is merged.

## Pre-Merge Testing

The following has been verified locally:

✅ **Commitlint Validation**
- Valid commit messages are accepted
- Invalid commit messages are rejected
- Husky commit-msg hook is properly configured

✅ **Semantic Release Configuration**
- `.releaserc.json` is valid and all plugins load correctly
- Dry-run executes without errors
- Correct release rules are configured

✅ **Build and Tests**
- All 873 unit tests pass
- Build completes successfully
- Linting passes with no errors

✅ **Security**
- CodeQL scan found 0 vulnerabilities

## Post-Merge Testing

After this PR is merged to `main`, the semantic release workflow will run automatically. Here's what to expect:

### Expected Behavior on First Merge

1. **Workflow Trigger**: The Release workflow should trigger automatically when merged to main
2. **Test Phase**: Runs lint, unit tests, and build
3. **Release Analysis**: Semantic-release will analyze commits since last release (or from beginning)
4. **Version Calculation**: Based on conventional commits:
   - This PR has a `feat:` commit, which should trigger a **minor** version bump
   - Expected first version: **1.0.0** (starting from 0.0.0)
5. **CHANGELOG Generation**: Should create/update CHANGELOG.md with all changes
6. **Git Tag**: Creates tag `v1.0.0`
7. **GitHub Release**: Creates a GitHub release with auto-generated notes
8. **Commit**: Commits updated package.json and CHANGELOG.md with `[skip ci]`

### How to Verify

1. **Check GitHub Actions**:
   - Go to: `https://github.com/mezivillager/hacer/actions/workflows/release.yml`
   - Verify the workflow runs successfully
   - Check the logs to see semantic-release output

2. **Verify Git Tag**:
   ```bash
   git fetch --tags
   git tag -l
   # Should show: v1.0.0 (or the calculated version)
   ```

3. **Verify GitHub Release**:
   - Go to: `https://github.com/mezivillager/hacer/releases`
   - Should see a new release (e.g., v1.0.0)
   - Release notes should contain the changes

4. **Verify CHANGELOG**:
   - Check `CHANGELOG.md` in the repo
   - Should contain the new version section with changes

5. **Verify package.json**:
   - Version number should be updated from 0.0.0 to the new version

### Testing Subsequent Releases

After the first release, test different commit types:

1. **Feature Release (Minor Bump)**:
   ```bash
   git commit -m "feat: add new gate type"
   # Should bump: 1.0.0 → 1.1.0
   ```

2. **Bug Fix (Patch Bump)**:
   ```bash
   git commit -m "fix: resolve wire rendering issue"
   # Should bump: 1.1.0 → 1.1.1
   ```

3. **Breaking Change (Major Bump)**:
   ```bash
   git commit -m "feat!: redesign state API

   BREAKING CHANGE: The store API has been completely redesigned."
   # Should bump: 1.1.1 → 2.0.0
   ```

4. **No Release (Internal Changes)**:
   ```bash
   git commit -m "docs: update README"
   git commit -m "test: add more test coverage"
   git commit -m "chore: update dependencies"
   # Should NOT trigger a release
   ```

### Troubleshooting

If the release doesn't work as expected:

1. **Check Workflow Permissions**:
   - Go to Repository Settings → Actions → General
   - Ensure "Read and write permissions" is enabled for GITHUB_TOKEN

2. **Check Branch Protection**:
   - Semantic-release needs to push commits back to main
   - Ensure the workflow has permission to bypass branch protection

3. **Check Logs**:
   - Review the GitHub Actions logs for error messages
   - Look for semantic-release debug output

4. **Manual Trigger**:
   - You can manually trigger the workflow from the Actions tab
   - Use "Run workflow" button on the Release workflow page

## Beta/Alpha Release Testing (Optional)

To test pre-releases:

1. Create a `beta` branch:
   ```bash
   git checkout -b beta
   git commit -m "feat: beta feature"
   git push origin beta
   # Should create: 1.1.0-beta.1
   ```

2. Create an `alpha` branch:
   ```bash
   git checkout -b alpha
   git commit -m "feat: alpha feature"
   git push origin alpha
   # Should create: 1.1.0-alpha.1
   ```

## Reference

- [Semantic Release Docs](https://semantic-release.gitbook.io/)
- [Conventional Commits](https://www.conventionalcommits.org/)
- [Project Documentation](./semantic-release.md)
