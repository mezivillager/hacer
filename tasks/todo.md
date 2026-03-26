# Current focus

**Phase 0.5 ticket progress:** check off tickets in [`docs/plans/phase-0.5-tickets-CHECKLIST.md`](../docs/plans/phase-0.5-tickets-CHECKLIST.md) when merged + CI gates pass.

## In Progress: P05-06 CMP parser (2026-03-26)

- [x] Create failing tests for CMP parsing and row comparison in `src/core/testing/nand2tetris/cmpParser.test.ts`
- [x] Add self-contained Project 1 CMP fixture corpus (all 16 files) for parser coverage
- [x] Implement `parseCmp` and `compareCmpRow` in `src/core/testing/nand2tetris/cmpParser.ts`
- [x] Ensure compatibility with P05-05 execution order (`src/core/testing/nand2tetris/` may not exist)
- [x] Run verification: `pnpm run test:run -- --run src/core/testing/nand2tetris/cmpParser.test.ts`
- [x] Run completion gates: `pnpm run lint && pnpm run test:run && pnpm run build && pnpm run test:e2e:store`

### Review (P05-06)

- Added strict `.cmp` parser with deterministic malformed-row errors and Project-1 numeric parsing heuristic.
- Added `compareCmpRow` first-mismatch reporting with optional caller row index.
- Added local fixture corpus with all 16 Project 1 `.cmp` tables curated from canonical web-ide sources.
- Verified:
	- `pnpm exec vitest run src/core/testing/nand2tetris/cmpParser.test.ts` (29 passed)
	- `pnpm run lint` (pass)
	- `pnpm run test:run` (pass)
	- `pnpm run build` (pass)
	- `pnpm run test:e2e:store` (81 passed)

---

## Done: P05-03 Topological sort simulation (2026-03-23)

- `src/simulation/topologicalEval.ts` — Kahn sort, `evaluateCircuit`, `getSignalSourceValue`
- `simulationTick` → `evaluateCircuit`; cycles set `lastSimulationError` + `message.error`
- Plan: `docs/plans/2026-03-23-topological-sort-eval.md` (success criteria checked)

---

# Task: Replace Deprecated TypeScript baseUrl Usage (historical)

## Plan

- [x] Remove temporary deprecation suppression and deprecated option
- [x] Migrate alias path targets to explicit relative mappings
- [x] Validate diagnostics and TypeScript compilation
- [x] Document lesson from user correction

## Progress Notes

- Removed `ignoreDeprecations` and `baseUrl` from TypeScript base config.
- Updated all `paths` targets from `src/*` style to `./src/*` style.
- Verified no diagnostics remain in tsconfig files.
- Ran typecheck to confirm project config remains valid.

## Review (on completion)

- What was done: Migrated tsconfig alias configuration away from deprecated `baseUrl` and removed suppression.
- What was verified: `get_errors` reports no issues for tsconfig files; `npm run typecheck` completed without reported TypeScript errors.
- Any follow-ups: Consider running full lint and tests as part of broader PR verification.

---

# Task: P05-05 TST Parser (in progress)

## Plan

- [x] Create `src/core/testing/nand2tetris/` module scaffold and parser types
- [x] Write RED tests for Project 1 command parsing and output-list formatting
- [x] Implement `parseTST` tokenizer + parser for P05-05 scope
- [x] Add all 16 Project 1 `.tst` fixture coverage
- [x] Run verification gates (`lint`, `test:run`, `build`, `test:e2e:store`)

## Review (on completion)

- What was done: Added TST parser module with typed AST/result model, Project 1 command parsing, output-list format decoding, strict set-value parsing, and explicit unsupported-command diagnostics for deferred syntax.
- What was verified: `pnpm exec vitest run src/core/testing/nand2tetris/tstParser.test.ts`, `pnpm run lint`, `pnpm run test:run`, `pnpm run build`, and `pnpm run test:e2e:store` all passed.
- Any follow-ups: P05-17 test execution engine can now consume `TSTScript` command streams directly; Phase 0.6 can extend parser for `repeat`/`while`/clock commands.
