# 0010. No machine-specific absolute paths in documentation

- **Status:** Accepted
- **Date:** 2026-09-17
- **Deciders:** Repo owner
- **Phase:** Phase 0.5

## Context
The parent workspace directory was renamed from `slow/` to `ha/`. Three docs had hardcoded the old
absolute location, so all three silently became wrong; PR #132 repaired the text but not the cause.
An absolute path such as `/Users/villager/Documents/codelab/ha/hacer` is true on exactly one machine: <!-- allow-abs-path -->
it is useless to any other contributor or agent, and it breaks again on the next rename.

A survey of `main` found exactly two such paths in docs we author. The other five occurrences live in
vendored trees (`.claude/skills/`, `.cursor/`) that `scripts/sync-superpowers.sh` overwrites from
upstream, so editing them would be reverted on the next sync — and would then fail CI permanently.

## Decision
1. **Documentation uses repo-relative paths.** Workspace siblings are referenced as
   `../web-ide/…`; shell snippets say "from the repo root" instead of `cd`-ing to a fixed location.
2. **The rule is mechanically enforced**, not merely documented: `scripts/check-doc-paths.mjs`
   fails the commit (`.husky/pre-commit`, staged docs only) and fails CI (every tracked doc).
   Detection is a pure function in `scripts/hooks/docPaths.logic.mjs`, unit-tested in
   `docPaths.logic.test.mjs` — the same tested-logic split already used by the docs-sync Stop hook.
3. **Portable `~/` roots stay legal** (`~/.claude`, `~/.config`, `~/.cursor`, `~/.local`, `~/.ssh`),
   because those resolve identically on every machine and our own docs legitimately cite them.
4. **Vendored trees are exempt**, mirroring what `sync-superpowers.sh` overwrites; the two skills it
   preserves (`hacer-patterns/`, `docs-sync/`) are ours and remain checked.
5. **A per-line escape hatch exists** (`<!-- allow-abs-path -->`) for the rare doc that must quote a
   real path, so the guard never forces a doc to lie.

## Consequences
- Docs survive workspace renames; a whole class of rot is closed rather than repaired case by case.
- Pre-commit is now blocking for docs, which is stricter than `scripts/check-test-files.sh`
  (warn-only). A blocked commit prints the offending `file:line:col` and the fix.
- The exemption list is coupled to `sync-superpowers.sh`; if that script's `--exclude` set changes,
  `OWNED_SKILLS` in `docPaths.logic.mjs` must change with it.

## Affected living docs
`.cursor/rules/021-no-absolute-paths-in-docs.mdc`, `AGENTS.md`, `.husky/pre-commit`,
`.github/workflows/ci.yml`, `package.json` — updated alongside this ADR.

## Links
- [[0002-commit-and-worktree-conventions]]
