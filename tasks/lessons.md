# Lessons Learned

Capture patterns and mistakes here after any correction. Review at session start.

See [lessons.md.template](./lessons.md.template) for the entry format.

## Entries

<!-- Add entries below -->

### 2026-03-15 - Verify Exact PR Context Before Comment Analysis

- Situation: User asked for comments on the new PR, but analysis initially referenced an older PR context.
- Mistake: Reviewed stale PR discussion instead of first confirming the exact target PR number/link.
- Rule: When user asks about PR comments, always fetch and analyze the explicitly provided PR URL/number first, then summarize only that PR's unresolved comments.
- Prevention checklist:
  - Parse PR URL/number from the latest user message.
  - Fetch that PR directly before any historical PR references.
  - Confirm source PR number in the first summary line.

### [2026-03-15] - Prefer migration over deprecation suppression

**What happened**: I initially silenced a TypeScript deprecation (`ignoreDeprecations`) instead of implementing the underlying config migration.
**Rule**: Do not use deprecation suppression as the primary fix when a concrete migration path is available; implement the real migration first, then validate.
**Context**: TypeScript config in [tsconfig.base.json](../tsconfig.base.json)


### [2026-03-26] - Verify implementation files are committed with their tests

**What happened**: Parser tests were committed while the corresponding parser implementation remained unstaged in the working tree.
**Rule**: Before marking a parser/task change complete, run `git status --short` and ensure implementation + tests for the same behavior are staged and committed together.
**Context**: HDL parser parity hardening follow-up in `src/core/hdl/parser.ts` and `src/core/hdl/parser.test.ts`

### [2026-03-26] - Keep HACER capability-first, not curriculum-clone

**What happened**: Ticket framing and analysis leaned toward reproducing web-ide curriculum runtime behavior instead of HACER's stated goal (platform capability parity plus beyond).
**Rule**: Treat nand2tetris artifacts primarily as compatibility and validation fixtures unless the user explicitly requests curriculum-specific UX/features.
**Context**: Phase 0.5 docs and ticket language around P05-07/P05-19/P05-21/P05-22.

### [2026-03-29] - Use non-HTML reporter for Playwright in terminal flows

**What happened**: Running Playwright with HTML reporter can keep the terminal open on failures and block iterative debugging loops.
**Rule**: When running Playwright from terminal-driven agent workflows, use a non-HTML reporter (for example `--reporter=line`) unless the user explicitly asks for HTML reports.
**Context**: P05-09 execution flow and store E2E verification commands.

### [2026-04-17] - Strip incompatible CSS-in-JS systems before installing the replacement

**What happened**: A prior incremental Ant Design \u2192 Tailwind/shadcn migration plan (deleted in `4d691ab`) failed because the two styling systems produce visual conflicts when both render to the same screen.
**Rule**: When migrating between visually-incompatible CSS systems (Ant Design \u2194 Tailwind, styled-components \u2194 emotion, etc.), strip the old system fully BEFORE installing the new one. Accept an interim WIP state where the app is unstyled but functionally driveable.
**Context**: `docs/specs/2026-04-17-design-system-migration-design.md` \u00a72 (Phase A).

### [2026-04-17] - THREE.Color.setStyle does not parse OKLch reliably in three@0.183

**What happened**: Routing OKLch CSS variables through THREE.Color (`useThemeColor` hook) produced near-white sRGB output regardless of the OKLch lightness input. Result: dark-mode scene background and grid lines rendered as light when computed in JS, despite the CSS variable resolving correctly to dark in browser.
**Rule**: For tokens consumed by THREE.js materials, use **HEX** (not OKLch) in the CSS variable. The browser parses OKLch correctly for CSS rendering; THREE doesn't. If a token needs both browser and JS consumption, define hex \u2014 the browser parses hex equally well.
**Context**: `src/styles/globals.css` `--canvas-bg` and `--canvas-grid` tokens; fix in commit `012b8dd`.

### [2026-04-17] - shadcn CLI reads tsconfig paths from the top-level tsconfig only

**What happened**: `pnpm dlx shadcn add button` interpreted the `@` alias literally and dropped files into a `./@/components/ui-kit/` directory because shadcn doesn't follow TypeScript project references; HACER's `paths` map lived in `tsconfig.base.json`.
**Rule**: Mirror the `@/*` path in the top-level `tsconfig.json` when using shadcn CLI in projects that use TS project references.
**Context**: `tsconfig.json` patch in commit `598640a` (Phase C-3a).

### [2026-04-17] - Use --use-angle=swiftshader for headless Chromium WebGL in Playwright

**What happened**: `--use-gl=desktop` Chromium flag produced "BindToCurrentSequence failed" in headless mode on macOS, blocking R3F-dependent E2E specs (`__SCENE_READY__` never resolves).
**Rule**: For Playwright + headless Chromium + WebGL, use `--use-angle=swiftshader --enable-unsafe-swiftshader --enable-webgl --ignore-gpu-blocklist`. Software-rendered but reliable across machines.
**Context**: `playwright.config.ts` patch in commit `55b12d0` (Phase E).

