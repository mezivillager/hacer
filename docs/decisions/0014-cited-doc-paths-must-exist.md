# 0014. Paths cited in agent entry docs must exist

- **Status:** Accepted
- **Date:** 2026-09-18
- **Deciders:** Repo owner (issue #153, sub-issue #241)
- **Phase:** Phase 0.5

## Context
`REPO_MAP.md` is the first structural doc an agent reads, and 66 of its path citations pointed at
files that do not exist — planned Phase 5+ layout (`src/api/`, `src/plugins/`), a deleted module
(`src/simulation/gateLogic.ts`), and shorthands that only work for a human who already knows the
tree. Each one sends an agent's `grep`/`Read` nowhere and costs a turn. ADR-0010 made doc paths
portable; nothing made them real.

## Decision
1. **Every repo-relative path cited in `REPO_MAP.md` and `AGENTS.md` exists.** A citation is a
   backticked token that looks like a path, or a markdown link target. Planned files are described
   without a path ("no files yet") or the line is removed — a path is never invented.
2. **Enforced by `pnpm run lint:docs`** (`scripts/check-doc-paths.mjs`, pre-commit on staged docs
   and CI on all), printing one greppable `DEAD PATH <file>:<line> <path>` per hit. The logic is a
   pure function in `scripts/hooks/docPathExists.logic.mjs` with an injected `exists()`, unit-tested
   on a fake filesystem, mirroring ADR-0010's split.
3. **Scope is an opt-in file list** (`PATH_EXISTENCE_FILES` in the script). A doc is added once its
   citations are green, so the check is never red on `main`: `AGENTS.md` with the check itself,
   `REPO_MAP.md` with the PR that fixes its citations.
4. **Deliberately ignored:** fenced code blocks (tree diagrams and samples are illustrations, not
   citations), globs, `<placeholders>`, URLs, `@/` alias specifiers, `~`/absolute paths, and `../`
   sibling-repo paths (the ADR-0010 convention).
5. **Per-line escape hatch:** `<!-- allow-missing-path -->`, mirroring `<!-- allow-abs-path -->`,
   for a doc that must name a path ahead of its file.

## Consequences
- `REPO_MAP.md` documents what exists; forward-looking layout lives in `docs/roadmap/phases/`.
- Shorthand citations (`BusJoiner3D.tsx`, `busPlacementActions/`) become full paths, so they grep.
- Fenced tree diagrams are not checked; keeping the "Current Structure" tree honest is still manual.
- Opting in another doc means fixing its citations first; the marker is the pressure valve.

## Affected living docs
`REPO_MAP.md`, `AGENTS.md` (§3 Step 2b), `.cursor/rules/021-no-absolute-paths-in-docs.mdc`,
`.github/workflows/ci.yml` — updated alongside this ADR.

## Links
- [[0010-no-absolute-paths-in-docs]]
- Issue #153 · sub-issue #241
