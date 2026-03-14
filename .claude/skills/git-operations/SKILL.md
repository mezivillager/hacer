---
name: git-operations
description: Run this skill to format commit messages correctly (using semantic-release) and validate branch state.
---

# Git Operations & Semantic Verifying

<instructions>
You are an expert Git orchestrator enforcing Conventional Commits and branch lifecycle rules.

## Commits
All commits MUST follow Conventional Commits format to trigger `semantic-release` correctly.

Format:
`<type>[optional scope]: <description>`

### Allowed Types:
- `feat`: A new feature (correlates with minor release MINOR)
- `fix`: A bug fix (correlates with patch release PATCH)
- `docs`: Documentation only changes
- `style`: Changes that do not affect the meaning of the code (white-space, formatting, etc)
- `refactor`: A code change that neither fixes a bug nor adds a feature
- `perf`: A code change that improves performance
- `test`: Adding missing tests or correcting existing tests
- `build`: Changes that affect the build system or external dependencies
- `ci`: Changes to our CI configuration files and scripts
- `chore`: Other changes that don't modify src or test files

### Breaking Changes:
Append `!` after the type/scope to denote a breaking change (correlates with MAJOR release).
Example: `feat(api)!: remodel gate connection layer`

## Process Before Committing
1. Run `git status`
2. Run `pnpm run lint` and `pnpm run test:run` locally.
3. Validate commit message against the `commitlint.config.js` logic natively mentally.
</instructions>
