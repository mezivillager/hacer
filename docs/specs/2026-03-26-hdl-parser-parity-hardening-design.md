# HDL Parser Parity Hardening Design

Date: 2026-03-26
Status: Drafted and approved in design chat (pending review loop)
Scope: Phase 0.5 HDL parser hardening

## Problem Statement

The current HDL parser improvements added two high-value diagnostics:

- Explicit unsupported `CLOCKED` section diagnostics in Phase 0.5 scope.
- Descending sub-bus range validation (for example `in[8..0]`).

Follow-up findings raised two additional goals:

- Keep parser behavior lean and strict (avoid over-engineered recovery framework).
- Reach fixture parity with existing TST/CMP patterns by adding canonical Project 1 HDL fixture coverage.

## Goals

1. Preserve strict parsing semantics: invalid HDL must still fail.
2. Keep parser implementation lean and maintainable.
3. Preserve explicit, actionable diagnostics for known edge cases.
4. Add canonical Project 1 HDL fixture module and fixture-loop parser coverage.

## Non-Goals

- No semantic simulation changes.
- No runtime execution changes.
- No broad parser architecture rewrite.
- No permissive parsing fallback that accepts malformed HDL.

## Decision Summary

Use a lean strategy:

- Keep fail-fast as the default parser behavior.
- Keep targeted hardening already implemented (`CLOCKED`, descending range checks).
- Add fixture parity coverage using a dedicated fixture corpus module.
- Consolidate existing inline Project 1 HDL fixture strings from tests into the canonical fixture module to avoid fixture drift.
- Do not implement micro-recovery by default; only allow optional, tiny `PARTS`-local recovery if it remains trivial and well tested.

## Architecture and Boundaries

### Parser Boundaries

Primary file: `src/core/hdl/parser.ts`.

- Public API remains unchanged: `parseHDL(source): HDLParseResult`.
- Existing discriminated result contract remains unchanged.
- Tokenizer behavior remains unchanged unless required for correctness.

### Diagnostics Boundaries

- `CLOCKED` remains explicitly unsupported in Phase 0.5.
- Sub-bus `start..end` must satisfy `start <= end`.
- Errors remain structured (`line`, `column`, `message`).

### Fixture Boundaries

Proposed fixture file: `src/core/hdl/project1HdlFixtures.ts`.

- Export a canonical map for all Project 1 HDL sources.
- Keep fixture consumption test-only.
- Migrate existing inline Project 1 fixture constants from `src/core/hdl/parser.test.ts` into this module so there is a single source of truth.

## Data and Control Flow

1. Tokenize source as today.
2. Parse declarations and sections as today.
3. On known constraints:
   - Emit explicit unsupported diagnostics for `CLOCKED`.
   - Emit explicit range diagnostics for descending slices.
4. Return parse failure for any syntax errors.
5. In tests, iterate canonical fixture map and assert parser success for each fixture.

## Error Handling Policy

- Strict by default: malformed HDL returns failure.
- No silent correction of user input.
- Optional micro-recovery policy:
- Default plan is fully fail-fast; ship this unless a concrete usability gap is proven.
  - If a malformed part declaration is encountered, parser may skip to the next semicolon and continue parsing subsequent parts.
  - This micro-recovery is only acceptable if implemented with one small helper and no broad synchronization framework.
   - Micro-recovery must not mask structural errors (for example missing `}`) and must be covered by a guard test.
  - If helper complexity reduces readability, drop micro-recovery and stay fully fail-fast.

## Testing Plan

Primary file: `src/core/hdl/parser.test.ts`.

1. Retain and validate targeted tests:
   - Unsupported `CLOCKED` diagnostics (assert exact diagnostic string, not only substring presence).
   - Descending sub-bus range rejection.
2. Add fixture-driven tests using `project1HdlFixtures`:
   - Assert expected fixture count.
   - Assert each fixture parses successfully.
   - Remove redundant inline fixture declarations once migration is complete.
3. If micro-recovery is implemented:
   - Add one malformed `PARTS` test to verify one-entry skip behavior.
   - Add one structural-error test to ensure no masking (for example missing closing brace still fails clearly).

## Verification Gates

Required before completion:

- `pnpm run lint`
- `pnpm run test:run`
- `pnpm run build`
- `pnpm run test:e2e:store`

Recommended focused run during development:

- `pnpm run test:run -- src/core/hdl/parser.test.ts`

## Acceptance Criteria

- Parser remains strict and lean.
- No public API contract changes for `parseHDL`.
- `CLOCKED` and descending-range diagnostics remain explicit.
- Fixture parity module exists and is validated by tests.
- Full verification gates pass.

## Risks and Mitigations

- Risk: Recovery logic complexity creeps in.
  - Mitigation: constrain to optional, tiny, part-level skip only.
- Risk: Fixture drift over time.
  - Mitigation: exact fixture count assertion in test suite.
- Risk: Regressions in existing parsing behavior.
  - Mitigation: keep existing unit tests and full CI-equivalent verification gates.
