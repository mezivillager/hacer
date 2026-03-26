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
