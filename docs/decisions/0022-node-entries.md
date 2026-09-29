# 0022. Node entries build together, beside the app

- **Status:** Accepted
- **Date:** 2026-09-29
- **Builds on:** R766, ADR-0020 §4
- **Deciders:** implementation of [#208](https://github.com/mezivillager/hacer/issues/208)
- **Phase:** Phase 0.5

## Context

R766 gave the `hacer` CLI its own Node build: `vite.cli.config.ts` and `tsconfig.cli.json` build
`src/cli` into `dist/cli`, after the app build, and `pnpm run build` stays the site's alone. It was a
ruling because there was one Node program, and it asked for an ADR once a second one arrived. The
MCP stdio server (`src/mcp`) is that second one. Unlike the CLI, it imports packages: the MCP SDK.

## Reuse considered

| Candidate | Licence | Verdict | Date |
|-----------|---------|---------|------|
| One Vite SSR build with an input per entry (R766's config, widened) | MIT | adopt | 2026-09-29 |
| A second Vite config for the MCP server | MIT | reject: two configs to keep in step for one output shape | 2026-09-29 |
| `hacer mcp` as a CLI subcommand, one entry | — | reject: the bin would load the SDK, and the CLI stays package-free | 2026-09-29 |
| `tsx` or Node's type stripping, no build | MIT / — | reject: neither resolves the `@/` alias without more tooling | 2026-09-29 |

## Decision

1. **One build, one entry per Node program.** `vite.cli.config.ts` is an SSR build whose inputs are
   `src/cli/index.ts` (`index.js`, the `hacer` bin) and `src/mcp/index.ts` (`mcp.js`, the MCP stdio
   server), both in `dist/cli`, with the engine they share split into `dist/cli/assets/`. The name
   `build:cli` stays: tests and the bin path already read it. A third Node program adds an input here.
2. **Packages stay external.** An entry loads its packages from the repo's `node_modules`, so a copy
   built outside the repo cannot resolve them; tests that spawn one build it under
   `node_modules/.tmp`, never into `dist/`.
3. **One type project and one test project for Node programs.** `tsconfig.cli.json` includes every
   Node program and the scenario drivers that reach them (Node's types, no DOM), `tsconfig.app.json`
   excludes them, and their directories are in Vitest's `node` project (`vite.config.ts`).
4. **`.mcp.json` rebuilds, then serves.** It runs `pnpm --silent run mcp`: `build:cli` with its output
   sent to stderr, then `node dist/cli/mcp.js`. A fresh worktree has no `dist/`, and a stale one would
   serve old engine code, so the build runs on every start. stdout carries only the protocol.

## Consequences

- The app build and the site are unchanged; `pnpm run build` still builds neither Node entry.
- Every `build:cli` also builds the MCP server, a second or so.
- Starting the MCP server needs `pnpm` and Node 22 on the host's `PATH`, and a session opened in the
  repo root, where `.mcp.json` lives.
- The MCP tool itself is disposable (ADR-0020 §4). This build shape is not: a generated tool surface
  ships through the same entry.

## Affected living docs

`docs/testing/vitest-projects.md` lists `src/cli` and `src/mcp` among the `node` project's
directories. `REPO_MAP.md` does not list `src/cli` either; both wait for its next reconcile.
README, roadmap, `.cursorrules` and `HACER_LLM_GUIDE.md` unchanged.

## Links

R766 (`docs/decisions/rulings/2026-09-29-hacer-loop-60.md`), [ADR-0020](0020-spec-only-writes-read-only-projections.md) §4,
`vite.cli.config.ts`, `tsconfig.cli.json`, `.mcp.json`, `src/mcp/`
