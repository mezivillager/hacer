# Current focus

**Phase 0.5 ticket progress:** check off tickets in [`docs/plans/phase-0.5-tickets-CHECKLIST.md`](../docs/plans/phase-0.5-tickets-CHECKLIST.md) when merged + CI gates pass.

## In Progress: HDL parser parity hardening (2026-03-26)

- [x] Add RED tests for explicit unsupported `CLOCKED` diagnostics
- [x] Add RED tests for invalid sub-bus range handling (`start > end`)
- [x] Implement parser updates in `src/core/hdl/parser.ts`
- [x] Run focused verification: `pnpm run test:run -- src/core/hdl/parser.test.ts`
- [x] Run completion gates: `pnpm run lint && pnpm run test:run && pnpm run build && pnpm run test:e2e:store`
- [x] Add canonical Project 1 HDL fixture corpus in `src/core/hdl/project1HdlFixtures.ts`
- [x] Refactor `src/core/hdl/parser.test.ts` to consume canonical fixture map (remove duplicated inline fixture bodies)
- [x] Tighten diagnostic contracts with exact message assertions for `CLOCKED` and descending sub-bus ranges
- [x] Add strictness guard test for missing closing brace behavior
- [x] Re-run verification gates: focused HDL tests, lint, typecheck, full unit tests, build, and store E2E

### Review (HDL parser parity hardening)

- Added explicit unsupported `CLOCKED` diagnostics in the HDL parser to avoid generic token mismatch errors.
- Added validation for descending sub-bus ranges (`start > end`) with a specific range error message.
- Added targeted parser tests covering both behaviors.
- Added canonical Project 1 HDL fixtures module (`project1HdlFixtures`) with all 16 chips.
- Removed duplicated Project 1 fixture bodies from `parser.test.ts` by importing the canonical fixture map.
- Hardened parser diagnostics tests to assert exact messages for `CLOCKED` and descending range errors.
- Verified (2026-03-26):
	- `pnpm run test:run -- --run src/core/hdl/parser.test.ts` (pass: 69 files, 1081 tests)
	- `pnpm run lint` (pass)
	- `pnpm run typecheck` (pass)
	- `pnpm run test:run` (pass: 69 files, 1081 tests)
	- `pnpm run build` (pass; Vite build complete)
	- `pnpm run test:e2e:store` (pass: 81 passed)

## In Progress: P05-06 CMP parser (2026-03-26)

- [x] Create failing tests for CMP parsing and row comparison in `src/core/testing/cmpParser.test.ts`
- [x] Add self-contained Project 1 CMP fixture corpus (all 16 files) for parser coverage
- [x] Implement `parseCmp` and `compareCmpRow` in `src/core/testing/cmpParser.ts`
- [x] Ensure compatibility with P05-05 execution order
- [x] Run verification: `pnpm run test:run -- --run src/core/testing/cmpParser.test.ts`
- [x] Run completion gates: `pnpm run lint && pnpm run test:run && pnpm run build && pnpm run test:e2e:store`
- [x] Address PR review: structured result pattern, strict numeric validation, barrel exports, license header
- [x] Address PR review: rename `nand2tetris/` folder to generic `testing/` path

### Review (P05-06)

- Added strict `.cmp` parser with structured `{ success, errors }` result pattern (aligned with `parseTST`/`parseHDL`).
- Added `compareCmpRow` first-mismatch reporting with optional caller row index.
- Added local fixture corpus with all 16 Project 1 `.cmp` tables curated from canonical web-ide sources.
- Re-exported CMP types and functions from `src/core/testing/index.ts` barrel.
- Refactored: moved all testing utilities from `src/core/testing/nand2tetris/` to `src/core/testing/`.
- Verified:
	- `pnpm exec vitest run src/core/testing/cmpParser.test.ts`
	- `pnpm run lint` (pass)
	- `pnpm run test:run` (pass)
	- `pnpm run build` (pass)
	- `pnpm run test:e2e:store` (pass)

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

- [x] Create `src/core/testing/` module scaffold and parser types
- [x] Write RED tests for Project 1 command parsing and output-list formatting
- [x] Implement `parseTST` tokenizer + parser for P05-05 scope
- [x] Add all 16 Project 1 `.tst` fixture coverage
- [x] Run verification gates (`lint`, `test:run`, `build`, `test:e2e:store`)

## Review (on completion)

- What was done: Added TST parser module with typed AST/result model, Project 1 command parsing, output-list format decoding, strict set-value parsing, and explicit unsupported-command diagnostics for deferred syntax.
- What was verified: `pnpm exec vitest run src/core/testing/tstParser.test.ts`, `pnpm run lint`, `pnpm run test:run`, `pnpm run build`, and `pnpm run test:e2e:store` all passed.
- Any follow-ups: P05-17 test execution engine can now consume `TSTScript` command streams directly; Phase 0.6 can extend parser for `repeat`/`while`/clock commands.
