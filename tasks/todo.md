# Current focus

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
